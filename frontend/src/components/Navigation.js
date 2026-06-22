import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, Zap, LogOut, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-black/60 border-b border-border-DEFAULT">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group" data-testid="nav-logo">
            <div className="w-12 h-12 bg-darknet-terminal border border-neon-blue flex items-center justify-center border-glow-blue">
              <Zap className="w-6 h-6 text-neon-blue" />
            </div>
            <div>
              <div className="font-heading text-xl font-black text-neon-blue tracking-wider">DARK_NET</div>
              <div className="font-body text-xs text-text-muted tracking-[0.2em]">MLBB CLAN</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              data-testid="nav-home"
              className={`font-body text-sm tracking-wider uppercase transition-colors ${
                isActive('/') ? 'text-neon-blue' : 'text-text-secondary hover:text-neon-blue'
              }`}
            >
              Home
            </Link>
            <Link
              to="/about"
              data-testid="nav-about"
              className={`font-body text-sm tracking-wider uppercase transition-colors ${
                isActive('/about') ? 'text-neon-blue' : 'text-text-secondary hover:text-neon-blue'
              }`}
            >
              About
            </Link>
            <Link
              to="/members"
              data-testid="nav-members"
              className={`font-body text-sm tracking-wider uppercase transition-colors ${
                isActive('/members') ? 'text-neon-blue' : 'text-text-secondary hover:text-neon-blue'
              }`}
            >
              Members
            </Link>
            <Link
              to="/join"
              data-testid="nav-join"
              className={`font-body text-sm tracking-wider uppercase transition-colors ${
                isActive('/join') ? 'text-neon-blue' : 'text-text-secondary hover:text-neon-blue'
              }`}
            >
              Join Us
            </Link>

            {user && user.role === 'admin' && (
              <Link
                to="/admin"
                data-testid="nav-admin"
                className="flex items-center gap-2 px-4 py-2 bg-neon-purple/10 border border-neon-purple text-neon-purple font-body text-sm tracking-wider uppercase hover:bg-neon-purple/20 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Admin
              </Link>
            )}

            {user ? (
              <button
                onClick={logout}
                data-testid="nav-logout"
                className="flex items-center gap-2 px-4 py-2 bg-neon-red border border-neon-red text-white font-body text-sm tracking-wider uppercase hover:shadow-[0_0_20px_rgba(255,0,60,0.6)] transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                data-testid="nav-login"
                className="px-6 py-2 bg-neon-red border border-neon-red text-white font-body text-sm tracking-wider uppercase hover:shadow-[0_0_20px_rgba(255,0,60,0.6)] transition-all"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            data-testid="mobile-menu-toggle"
            className="md:hidden text-neon-blue"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-darknet-surface border-t border-border-DEFAULT overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              <Link
                to="/"
                onClick={() => setIsOpen(false)}
                data-testid="mobile-nav-home"
                className={`block font-body text-sm tracking-wider uppercase ${
                  isActive('/') ? 'text-neon-blue' : 'text-text-secondary'
                }`}
              >
                Home
              </Link>
              <Link
                to="/about"
                onClick={() => setIsOpen(false)}
                data-testid="mobile-nav-about"
                className={`block font-body text-sm tracking-wider uppercase ${
                  isActive('/about') ? 'text-neon-blue' : 'text-text-secondary'
                }`}
              >
                About
              </Link>
              <Link
                to="/members"
                onClick={() => setIsOpen(false)}
                data-testid="mobile-nav-members"
                className={`block font-body text-sm tracking-wider uppercase ${
                  isActive('/members') ? 'text-neon-blue' : 'text-text-secondary'
                }`}
              >
                Members
              </Link>
              <Link
                to="/join"
                onClick={() => setIsOpen(false)}
                data-testid="mobile-nav-join"
                className={`block font-body text-sm tracking-wider uppercase ${
                  isActive('/join') ? 'text-neon-blue' : 'text-text-secondary'
                }`}
              >
                Join Us
              </Link>
              {user && user.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setIsOpen(false)}
                  data-testid="mobile-nav-admin"
                  className="block px-4 py-2 bg-neon-purple/10 border border-neon-purple text-neon-purple font-body text-sm tracking-wider uppercase"
                >
                  Admin Dashboard
                </Link>
              )}
              {user ? (
                <button
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                  }}
                  data-testid="mobile-nav-logout"
                  className="w-full px-4 py-2 bg-neon-red border border-neon-red text-white font-body text-sm tracking-wider uppercase"
                >
                  Logout
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  data-testid="mobile-nav-login"
                  className="block px-4 py-2 bg-neon-red border border-neon-red text-white font-body text-sm tracking-wider uppercase text-center"
                >
                  Login
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};