import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type UserRole = 'user' | 'post_property';

interface AuthContextType {
  user: string | null;
  role: UserRole | null;
  contactId: number | null;
  contactMobile: string | null;
  login: (name: string, contactId?: number | null, mobile?: string | null, role?: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [contactId, setContactId] = useState<number | null>(null);
  const [contactMobile, setContactMobile] = useState<string | null>(null);

  const login = (
    name: string, 
    id: number | null = null, 
    mobile: string | null = null,
    userRole: UserRole = 'user'
  ) => {
    setUser(name);
    setRole(userRole);
    if (id !== null) setContactId(id);
    if (mobile !== null) setContactMobile(mobile);
  };

  const logout = () => {
    setUser(null);
    setRole(null);
    setContactId(null);
    setContactMobile(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, contactId, contactMobile, login, logout }}>
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