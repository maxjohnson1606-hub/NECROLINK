import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Menu, X, LogOut, LayoutDashboard, User as UserIcon,
  Search as SearchIcon, MessageCircle, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { SearchModal } from './SearchModal';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = '/assets/logo.png';

// Primary links always visible in the top bar
const PRIMARY_LINKS = [
  { path: '/', label: 'Home', testId: 'nav-home' },
  { path: '/events', label: 'Events', testId: 'nav-events' },
  { path: '/members', label: 'Members', testId: 'nav-members' },
  { path: '/news', label: 'News', testId: 'nav-news' },
  { path: '/store', label: 'Store', testId: 'nav-store' },
];

// Secondary links inside the "More" dropdown
const MORE_LINKS = [
  { path: '/about', label: 'About', testId: 'nav-about' },
  { path: '/staff', label: 'Staff', testId: 'nav-staff' },
  { path: '/tournaments', label: 'Tournaments', testId: 'nav-tournaments' },
  { path: '/leaderboard', label: 'Leaderboard', testId: 'nav-leaderboard' },
  { path: '/gallery', label: 'Gallery', testId: 'nav-gallery' },
  { path: '/join', label: 'Join Us', testId: 'nav-join' },
];

// All links for mobile menu
const ALL_LINKS = [...PRIMARY_LINKS, ...MORE_LINKS];

export const Navigation = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [discord, setDiscord] = useState(null);
  const { user, logout } = useAuth();
  const location = useLocation();
  const moreRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/discord-settings`).then(({ data }) => setDiscord(data)).catch(() => {});
  }, []);

  // Close "More" when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); setMoreOpen(false); }, [location.pathname]);

  const isActive = (path) => location.pathname === path;
  const isMoreActive = MORE_LINKS.some(l => isActive(l.path));

  return (
    <>
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-black/80 border-b border-border-DEFAULT">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0" data-testid="nav-logo">
              <img src={LOGO_URL} alt="NECROLINK" className="w-10 h-10 object-contain" />
              <div className="hidden sm:block">
                <div className="font-heading text-lg font-black text-neon-purple tracking-wider leading-tight">NECROLINK</div>
                <div className="font-body text-[10px] text-text-muted tracking-[0.2em]">MLBB CLAN</div>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {PRIMARY_LINKS.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  data-testid={link.testId}
                  className={`px-3 py-2 font-body text-xs tracking-wider uppercase transition-colors rounded-sm ${
                    isActive(link.path)
                      ? 'text-neon-blue bg-neon-blue/10'
                      : 'text-text-secondary hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* More dropdown */}
              <div className="relative" ref={moreRef}>
                <button
                  onClick={() => setMoreOpen(o => !o)}
                  className={`flex items-center gap-1 px-3 py-2 font-body text-xs tracking-wider uppercase transition-colors rounded-sm ${
                    isMoreActive ? 'text-neon-blue bg-neon-blue/10' : 'text-text-secondary hover:text-white hover:bg-white/5'
                  }`}
                >
                  More <ChevronDown className={`w-3 h-3 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {moreOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-1 w-44 bg-darknet-surface border border-border-DEFAULT shadow-xl z-50"
                    >
                      {MORE_LINKS.map((link) => (
                        <Link
                          key={link.path}
                          to={link.path}
                          data-testid={link.testId}
                          className={`block px-4 py-2.5 font-body text-xs uppercase tracking-wider transition-colors border-b border-border-DEFAULT last:border-0 ${
                            isActive(link.path)
                              ? 'text-neon-blue bg-neon-blue/10'
                              : 'text-text-secondary hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right-side actions */}
            <div className="hidden lg:flex items-center gap-2">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                data-testid="nav-search-btn"
                className="p-2 text-text-secondary hover:text-white transition-colors"
                title="Search"
              >
                <SearchIcon className="w-4 h-4" />
              </button>

              {/* Discord */}
              {discord?.enabled && discord.invite_url && (
                <a
                  href={discord.invite_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="nav-discord"
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-indigo-500/50 text-indigo-400 font-body text-xs uppercase hover:bg-indigo-500/10 transition-colors"
                >
                  <MessageCircle className="w-3 h-3" /> Discord
                </a>
              )}

              {/* Logged-out */}
              {!user && (
                <Link
                  to="/login"
                  data-testid="nav-login"
                  className="px-4 py-2 bg-neon-red border border-neon-red text-white font-body text-xs uppercase tracking-wider hover:shadow-[0_0_16px_rgba(255,0,60,0.5)] transition-all"
                >
                  Login
                </Link>
              )}

              {/* Logged-in actions */}
              {user && (
                <div className="flex items-center gap-2">
                  {/* Chat */}
                  <Link
                    to="/chat"
                    data-testid="nav-chat"
                    className={`flex items-center gap-1.5 px-3 py-1.5 border font-body text-xs uppercase tracking-wider transition-colors ${
                      isActive('/chat') ? 'border-neon-blue bg-neon-blue/10 text-neon-blue' : 'border-border-DEFAULT text-text-secondary hover:text-neon-blue hover:border-neon-blue/50'
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Chat
                  </Link>

                  {/* Profile */}
                  <Link
                    to="/profile"
                    data-testid="nav-profile"
                    className={`flex items-center gap-1.5 px-3 py-1.5 border font-body text-xs uppercase tracking-wider transition-colors ${
                      isActive('/profile') ? 'border-neon-blue bg-neon-blue/10 text-neon-blue' : 'border-border-DEFAULT text-text-secondary hover:text-white'
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">Profile</span>
                  </Link>

                  {/* Admin/Owner dashboard */}
                  {(user.role === 'admin' || user.role === 'owner') && (
                    <Link
                      to="/admin"
                      data-testid="nav-admin"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-purple/10 border border-neon-purple text-neon-purple font-body text-xs uppercase tracking-wider hover:bg-neon-purple/20 transition-colors"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span className="hidden xl:inline">{user.role === 'owner' ? 'Owner' : 'Admin'}</span>
                    </Link>
                  )}

                  {/* Logout */}
                  <button
                    onClick={logout}
                    data-testid="nav-logout"
                    className="p-2 text-text-muted hover:text-neon-red transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Mobile: search + hamburger */}
            <div className="lg:hidden flex items-center gap-3">
              <button
                onClick={() => setSearchOpen(true)}
                data-testid="mobile-nav-search-btn"
                className="text-text-secondary hover:text-white transition-colors"
              >
                <SearchIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setMenuOpen(o => !o)}
                data-testid="mobile-menu-toggle"
                className="text-neon-purple"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden bg-darknet-surface border-t border-border-DEFAULT overflow-hidden"
            >
              <div className="px-4 py-4">
                {/* Nav links in 2-col grid */}
                <div className="grid grid-cols-2 gap-1 mb-4">
                  {ALL_LINKS.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMenuOpen(false)}
                      data-testid={`mobile-${link.testId}`}
                      className={`px-3 py-2.5 font-body text-xs tracking-wider uppercase text-center border transition-colors ${
                        isActive(link.path)
                          ? 'border-neon-blue text-neon-blue bg-neon-blue/10'
                          : 'border-border-DEFAULT text-text-secondary hover:text-white'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                <div className="border-t border-border-DEFAULT pt-4 space-y-2">
                  {/* Discord */}
                  {discord?.enabled && discord.invite_url && (
                    <a
                      href={discord.invite_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="mobile-nav-discord"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 border border-indigo-500/50 text-indigo-400 font-body text-xs uppercase"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Discord
                    </a>
                  )}

                  {user ? (
                    <>
                      <Link
                        to="/chat"
                        onClick={() => setMenuOpen(false)}
                        data-testid="mobile-nav-chat"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 border border-neon-blue/40 text-neon-blue font-body text-xs uppercase"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Clan Chat
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setMenuOpen(false)}
                        data-testid="mobile-nav-profile"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 border border-border-DEFAULT text-text-secondary font-body text-xs uppercase"
                      >
                        <UserIcon className="w-3.5 h-3.5" /> My Profile
                      </Link>
                      {(user.role === 'admin' || user.role === 'owner') && (
                        <Link
                          to="/admin"
                          onClick={() => setMenuOpen(false)}
                          data-testid="mobile-nav-admin"
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-neon-purple/10 border border-neon-purple text-neon-purple font-body text-xs uppercase"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5" /> {user.role === 'owner' ? 'Owner' : 'Admin'} Dashboard
                        </Link>
                      )}
                      <button
                        onClick={() => { logout(); setMenuOpen(false); }}
                        data-testid="mobile-nav-logout"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-neon-red/10 border border-neon-red text-neon-red font-body text-xs uppercase"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Logout
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => setMenuOpen(false)}
                      data-testid="mobile-nav-login"
                      className="flex items-center justify-center px-4 py-2.5 bg-neon-red border border-neon-red text-white font-body text-xs uppercase"
                    >
                      Login
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
