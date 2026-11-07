import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type UserRole = 'user' | 'post_property';

interface AuthContextType {
  user: string | null;
  role: UserRole | null;
  contactId: number | null;
  contactMobile: string | null;
  isLoadingAuth: boolean;
  login: (name: string, contactId?: number | null, mobile?: string | null, role?: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Utility to completely delete legacy plain-text cookies (ensuring only the secure 'session' cookie remains)
function purgePlainTextCookies() {
  if (typeof document === 'undefined') return;

  const legacyCookieNames = [
    'estatesync_user',
    'estatesync_role',
    'estatesync_contact_id',
    'estatesync_mobile'
  ];

  const paths = ['/', '/api', ''];
  const host = window.location.hostname;
  const domains = ['', host, `.${host}`];

  for (const name of legacyCookieNames) {
    for (const path of paths) {
      for (const domain of domains) {
        const domainStr = domain ? `; domain=${domain}` : '';
        const pathStr = path ? `; path=${path}` : '; path=/';
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT${pathStr}${domainStr}; SameSite=Lax`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT${pathStr}${domainStr}`;
      }
    }
  }

  // Also purge any legacy localStorage tokens
  try {
    localStorage.removeItem('estatesync_user');
    localStorage.removeItem('estatesync_role');
    localStorage.removeItem('estatesync_contactId');
    localStorage.removeItem('estatesync_contactMobile');
  } catch {
    // Ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Pure in-memory React state (no plain-text cookies, no localStorage)
  const [user, setUser] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [contactId, setContactId] = useState<number | null>(null);
  const [contactMobile, setContactMobile] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  // On mount and refresh, purge plain-text cookies and check the secure HttpOnly 'session' cookie
  useEffect(() => {
    let isMounted = true;
    purgePlainTextCookies();

    const checkServerSession = async () => {
      try {
        let res = await fetch('/api/v1/auth/session', {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });

        if (!res.ok && (res.status === 404 || res.status === 502)) {
          res = await fetch('http://127.0.0.1:5000/api/v1/auth/session', {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
          });
        }

        if (res.ok) {
          const data = await res.json();
          if (data && data.authenticated && data.user && isMounted) {
            setUser(data.user);
            setRole((data.role === 'post_property' || data.role === 'user') ? data.role : 'user');
            if (data.contact_id) setContactId(Number(data.contact_id));
            if (data.mobile_number) setContactMobile(data.mobile_number);
          }
        }
      } catch (err) {
        console.warn('Session verification error:', err);
      } finally {
        if (isMounted) {
          setIsLoadingAuth(false);
          purgePlainTextCookies();
        }
      }
    };

    checkServerSession();
    return () => { isMounted = false; };
  }, []);

  const login = (
    name: string, 
    id: number | null = null, 
    mobile: string | null = null,
    userRole: UserRole = 'user'
  ) => {
    setUser(name);
    setRole(userRole);
    setContactId(id);
    setContactMobile(mobile);

    // Keep cookies clean of plain-text values
    purgePlainTextCookies();

    // Establish the single, secure, HttpOnly 'session' cookie on the server
    try {
      fetch('/api/v1/auth/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: name,
          contact_id: id,
          mobile_number: mobile,
          role: userRole
        })
      }).then(() => {
        purgePlainTextCookies();
      }).catch(() => {});
    } catch {
      // Ignore
    }
  };

  const logout = () => {
    setUser(null);
    setRole(null);
    setContactId(null);
    setContactMobile(null);

    purgePlainTextCookies();

    // Invalidate the secure 'session' cookie on the server
    try {
      fetch('/api/v1/auth/session', {
        method: 'DELETE',
        credentials: 'include'
      }).then(() => {
        purgePlainTextCookies();
      }).catch(() => {});
    } catch {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, contactId, contactMobile, isLoadingAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
