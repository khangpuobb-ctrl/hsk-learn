import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, Menu, X, LogOut, Award, BookOpen, Layers, CheckSquare, BarChart2 } from 'lucide-react';
import { api } from '../lib/api';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });

  const navigate = useNavigate();
  const location = useLocation();

  // Handle dark mode side-effects
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sync user state on auth events
  useEffect(() => {
    const handleAuth = () => {
      try {
        setUser(JSON.parse(localStorage.getItem('user')));
      } catch {
        setUser(null);
      }
    };
    window.addEventListener('auth-change', handleAuth);
    return () => window.removeEventListener('auth-change', handleAuth);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      console.error('Logout request failed:', e);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/login');
  };

  const navLinks = [
    { to: '/', label: 'Trang chủ', icon: Layers },
    { to: '/flashcard', label: 'Flashcard', icon: Award },
    { to: '/reading', label: 'Bài đọc', icon: BookOpen },
    { to: '/quiz', label: 'Làm Quiz', icon: CheckSquare },
    { to: '/dashboard', label: 'Thống kê', icon: BarChart2 },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-navy text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 text-xl font-bold tracking-wider hover:opacity-90">
              <span className="text-gold font-serif">汉</span>
              <span>HSK</span>
              <span className="text-gold font-light">Bilingual</span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex space-x-1 items-center">
            {user && navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-navy-light text-gold border-b-2 border-gold rounded-b-none'
                      : 'hover:bg-navy-light hover:text-slate-200 text-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-3">
            {/* Dark Mode Switcher */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-navy-light text-slate-300 hover:text-white transition-colors"
              title="Đổi giao diện"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5 text-gold" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Auth Buttons */}
            {user ? (
              <div className="hidden md:flex items-center space-x-4">
                <span className="text-slate-300 text-sm">
                  Xin chào, <span className="font-semibold text-white">{user.display_name}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium bg-gold hover:bg-gold-dark text-navy-dark transition-all font-semibold"
              >
                Đăng nhập
              </Link>
            )}

            {/* Mobile Menu Button */}
            <div className="flex md:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md hover:bg-navy-light text-slate-300 hover:text-white"
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && user && (
        <div className="md:hidden bg-navy-dark border-t border-navy-light">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium ${
                    active ? 'bg-navy-light text-gold' : 'text-slate-300 hover:bg-navy-light'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
          {/* User profile row in mobile drawer */}
          <div className="pt-4 pb-3 border-t border-navy-light px-5 flex items-center justify-between">
            <div>
              <div className="text-base font-medium text-white">{user.display_name}</div>
              <div className="text-sm font-medium text-slate-400">{user.email}</div>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                handleLogout();
              }}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-950"
            >
              <LogOut className="h-4.5 w-4.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
