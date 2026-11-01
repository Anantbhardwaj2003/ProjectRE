import { useState } from 'react';
import { Building2, Heart, User, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PostPropertyModal from './PostPropertyModal';

interface HeaderProps {
  onPostPropertyClick?: () => void;
}

export default function Header({ onPostPropertyClick }: HeaderProps = {}) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [internalModalOpen, setInternalModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handlePostClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (onPostPropertyClick) {
      onPostPropertyClick();
    } else {
      setInternalModalOpen(true);
    }
  };

  return (
    <header className="relative w-full border-b border-white/10 bg-transparent">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <Building2 className="h-8 w-8 text-white" />
          <span className="text-xl font-bold tracking-tight text-white">EstateSync</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">For Buyers</Link>
          <a href="#" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">For Tenants</a>
          <a href="#" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">For Owners</a>
          <a href="#" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Projects</a>
        </nav>

        <div className="flex items-center gap-3 sm:gap-4">
          {user ? (
            <>
              <span className="text-xs sm:text-sm font-medium text-gray-200">
                Welcome, {user}
              </span>
              <button 
                onClick={handleLogout}
                className="flex items-center justify-center h-8 w-8 rounded-full text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button className="hidden sm:flex items-center gap-2 rounded-full p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
                <Heart className="h-5 w-5" />
              </button>
              <div className="h-6 w-px bg-gray-800 hidden sm:block"></div>
              <Link to="/login" className="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                <User className="h-5 w-5" />
                <span>Login</span>
              </Link>
            </>
          )}
          
          {/* Hide Post Property button if logged in as 'user'; show if 'post_property' or unauthenticated */}
          {role !== 'user' && (
            <button 
              type="button"
              onClick={handlePostClick}
              className="rounded-md bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-200 active:scale-95 transition-all cursor-pointer"
            >
              Post Property
            </button>
          )}
        </div>
      </div>

      {/* Post Property Modal Form (Internal Fallback) */}
      {!onPostPropertyClick && (
        <PostPropertyModal 
          isOpen={internalModalOpen} 
          onClose={() => setInternalModalOpen(false)} 
        />
      )}
    </header>
  );
}
