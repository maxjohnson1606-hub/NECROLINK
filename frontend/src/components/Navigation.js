import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, LogOut, LayoutDashboard, User as UserIcon, Search as SearchIcon, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { SearchModal } from './SearchModal';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LOGO_URL = '/assets/logo.png';

const navLinks = [
  { path: '/', label: 'Home', testId: 'nav-home' },
  { path: '/about', label: 'About', testId: 'nav-about' },
  { path: '/members', label: 'Members', testId: 'nav-members' },
  { path: '/staff', label: 'Staff', testId: 'nav-staff' },
  { path: '/events', label: 'Events', testId: 'nav-events' },
  { path: '/tournaments', label: 'Tournaments', testId: 'nav-tournaments' },
  { path: '/leaderboard', label: 'Leaderboard', testId: 'nav-leaderboard' },
  { path: '/news', label: 'News', testId: 'nav-news' },
  { path: '/gallery', label: 'Gallery', testId: 'nav-gallery' },
  { path: '/store', label: 'Store', testId: 'nav-store' },
];

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [discord, setDiscord] = useState(null);
  const { user, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    axios.get(`${API}/discord-settings`).then(({ data }) => setDiscord(data)).catch(() => {});
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-black/70 border-b border-border-DEFAULT">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center gap-3 group" data-testid="nav-logo">
              <img src={LOGO_URL} alt="NECROLINK" className="w-12 h-12 object-contain" />
              <div className="hidden sm:block">
                <div className="font-heading text-xl font-black text-neon-purple tracking-wider">NECROLINK</div>
                <div className="font-body text-xs text-text-muted tracking-[0.2em]">MLBB CLAN</div>
              </div>
            </Link>

            <div className="hidden xl:flex items-center gap-3">
              {navLinks.map((link) => (
                <Link key={link.path} to={link.path} data-testid={link.testId}
                  className={`font-body text-xs tracking-wider uppercase transition-colors ${
                    isActive(link.path) ? 'text-neon-blue' : 'text-text-secondary hover:text-neon-blue'
                  }`}>
                  {link.label}
                </Link>
              ))}

              {!user && (
                <Link to="/join" data-testid="nav-join"
                  className={`font-body text-xs tracking-wider uppercase transition-colors ${
                    isActive('/join') ? 'text-neon-blue' : 'text-text-secondary hover:text-neon-blue'
                  }`}>
                  Join Us
                </Link>
              )}

              <button onClick={() => setSearchOpen(true)} data-testid="nav-search-btn"
                className="p-2 border border-border-DEFAULT text-text-secondary hover:text-neon-blue hover:border-neon-blue transition-colors">
                <SearchIcon className="w-4 h-4" />
              </button>

              {discord?.enabled && discord.invite_url && (
                <a href={discord.invite_url} target="_blank" rel="noopener noreferrer" data-testid="nav-discord"
                  className="flex items-center gap-1 px-3 py-2 border border-indigo-500 text-indigo-400 font-body text-xs tracking-wider uppercase hover:bg-indigo-500/10 transition-colors">
                  <MessageCircle className="w-3 h-3" /> Discord
                </a>
              )}

              {user && (
                <Link to="/profile" data-testid="nav-profile"
                  className="flex items-center gap-1 px-2 py-1.5 border border-neon-blue/40 text-neon-blue font-body text-xs uppercase tracking-wider hover:bg-neon-blue/10 transition-colors">
                  <UserIcon className="w-3 h-3" /> Profile
                </Link>
              )}

              {user && (user.role === 'admin' || user.role === 'owner') && (
                <Link to="/admin" data-testid="nav-admin"
                  className="flex items-center gap-2 px-3 py-2 bg-neon-purple/10 border border-neon-purple text-neon-purple font-body text-xs tracking-wider uppercase hover:bg-neon-purple/20 transition-colors">
                  <LayoutDashboard className="w-3 h-3" /> {user.role === 'owner' ? 'Owner' : 'Admin'}
                </Link>
              )}

              {user ? (
                <button onClick={logout} data-testid="nav-logout"
                  className="flex items-center gap-2 px-3 py-2 bg-neon-red border border-neon-red text-white font-body text-xs tracking-wider uppercase hover:shadow-[0_0_20px_rgba(255,0,60,0.6)] transition-all">
                  <LogOut className="w-3 h-3" /> Logout
                </button>
              ) : (
                <Link to="/login" data-testid="nav-login"
                  className="px-4 py-2 bg-neon-red border border-neon-red text-white font-body text-xs tracking-wider uppercase hover:shadow-[0_0_20px_rgba(255,0,60,0.6)] transition-all">
                  Login
                </Link>
              )}
            </div>

            <div className="xl:hidden flex items-center gap-2">
              <button onClick={() => setSearchOpen(true)} data-testid="mobile-nav-search-btn" className="text-text-secondary">
                <SearchIcon className="w-5 h-5" />
              </button>
              <button onClick={() => setIsOpen(!isOpen)} data-testid="mobile-menu-toggle" className="text-neon-purple">
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="xl:hidden bg-darknet-surface border-t border-border-DEFAULT overflow-hidden">
              <div className="px-4 py-6 space-y-3">
                {navLinks.map((link) => (
                  <Link key={link.path} to={link.path} onClick={() => setIsOpen(false)} data-testid={`mobile-${link.testId}`}
                    className={`block font-body text-sm tracking-wider uppercase ${isActive(link.path) ? 'text-neon-blue' : 'text-text-secondary'}`}>
                    {link.label}
                  </Link>
                ))}
                {!user && (
                  <Link to="/join" onClick={() => setIsOpen(false)} data-testid="mobile-nav-join"
                    className="block font-body text-sm tracking-wider uppercase text-text-secondary">
                    Join Us
                  </Link>
                )}
                {discord?.enabled && discord.invite_url && (
                  <a href={discord.invite_url} target="_blank" rel="noopener noreferrer" data-testid="mobile-nav-discord"
                    className="block px-4 py-2 border border-indigo-500 text-indigo-400 font-body text-xs tracking-wider uppercase">
                    Discord
                  </a>
                )}
                {user && (
                  <Link to="/profile" onClick={() => setIsOpen(false)} data-testid="mobile-nav-profile"
                    className="block px-4 py-2 border border-neon-blue text-neon-blue font-body text-xs uppercase tracking-wider">
                    My Profile
                  </Link>
                )}
                {user && (user.role === 'admin' || user.role === 'owner') && (
                  <Link to="/admin" onClick={() => setIsOpen(false)} data-testid="mobile-nav-admin"
                    className="block px-4 py-2 bg-neon-purple/10 border border-neon-purple text-neon-purple font-body text-xs tracking-wider uppercase">
                    {user.role === 'owner' ? 'Owner' : 'Admin'} Dashboard
                  </Link>
                )}
                {user ? (
                  <button onClick={() => { logout(); setIsOpen(false); }} data-testid="mobile-nav-logout"
                    className="w-full px-4 py-2 bg-neon-red border border-neon-red text-white font-body text-xs tracking-wider uppercase">
                    Logout
                  </button>
                ) : (
                  <Link to="/login" onClick={() => setIsOpen(false)} data-testid="mobile-nav-login"
                    className="block px-4 py-2 bg-neon-red border border-neon-red text-white font-body text-xs tracking-wider uppercase text-center">
                    Login
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
