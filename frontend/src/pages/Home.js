import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Users, Calendar, Star, Eye, UserCheck } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Home = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [mom, setMom] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Track visit (one per session)
    if (!sessionStorage.getItem('necrolink_visit_tracked')) {
      axios.post(`${API}/visit`).catch(() => {});
      sessionStorage.setItem('necrolink_visit_tracked', '1');
    }
    fetchAnnouncements();
    fetchMemberOfMonth();
    fetchVisitStats();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data } = await axios.get(`${API}/announcements`);
      setAnnouncements(data);
    } catch (error) { console.error(error); }
  };

  const fetchMemberOfMonth = async () => {
    try {
      const { data } = await axios.get(`${API}/member-of-month`);
      setMom(data);
    } catch (e) { setMom(null); }
  };

  const fetchVisitStats = async () => {
    try {
      const { data } = await axios.get(`${API}/visit-stats`);
      setStats(data);
    } catch (e) { setStats(null); }
  };

  return (
    <div className="min-h-screen bg-darknet-bg">
      {/* Hero Banner */}
      <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.pexels.com/photos/17195067/pexels-photo-17195067.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)' }} />
        <div className="absolute inset-0 bg-black/80" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="mb-6 flex justify-center">
              <img
                src="https://customer-assets.emergentagent.com/job_voltage-victory/artifacts/rkylk165_ChatGPT%20Image%2021%20%D0%B8%D1%8E%D0%BD.%202026%20%D0%B3.%2C%2022_12_30.png"
                alt="NECROLINK"
                className="w-40 h-40 sm:w-52 sm:h-52 object-contain animate-float"
                data-testid="hero-logo"
              />
            </div>
            <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter uppercase mb-6 neon-glow-purple" data-testid="hero-title">
              NECROLINK
            </h1>
            <p className="font-body text-xl md:text-2xl text-neon-blue mb-4 tracking-wider neon-glow-blue">
              Mobile Legends: Bang Bang Elite Clan
            </p>
            <p className="font-body text-lg md:text-xl text-text-secondary mb-8 tracking-wide">
              Connected by Skill. United by Victory.
            </p>

            {user ? (
              <div className="flex flex-wrap gap-3 justify-center" data-testid="logged-in-cta">
                <Link to="/profile" data-testid="hero-profile-btn"
                  className="inline-block px-8 py-4 bg-neon-purple border-2 border-neon-purple text-white font-heading text-lg tracking-wider uppercase hover:shadow-[0_0_30px_rgba(176,38,255,0.7)] transition-all">
                  My Profile
                </Link>
                <Link to="/events" data-testid="hero-events-btn"
                  className="inline-block px-8 py-4 bg-darknet-terminal border-2 border-neon-blue text-neon-blue font-heading text-lg tracking-wider uppercase hover:bg-neon-blue/10 transition-all">
                  View Events
                </Link>
              </div>
            ) : (
              <Link to="/join" data-testid="join-darknet-btn"
                className="inline-block px-8 py-4 bg-neon-red border-2 border-neon-red text-white font-heading text-lg tracking-wider uppercase hover:shadow-[0_0_30px_rgba(255,0,60,0.8)] transition-all">
                Join NECROLINK
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* Visitor Stats Strip */}
      {stats && (
        <section className="py-6 px-4 bg-darknet-terminal border-y border-border-DEFAULT" data-testid="visit-stats">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <Eye className="w-5 h-5 text-neon-blue mx-auto mb-1" />
              <p className="font-heading text-xl font-bold text-neon-blue" data-testid="stat-total-visits">{stats.total_visits.toLocaleString()}</p>
              <p className="font-body text-[10px] uppercase tracking-wider text-text-muted">Total Visits</p>
            </div>
            <div>
              <UserCheck className="w-5 h-5 text-neon-purple mx-auto mb-1" />
              <p className="font-heading text-xl font-bold text-neon-purple" data-testid="stat-registered">{stats.registered_members}</p>
              <p className="font-body text-[10px] uppercase tracking-wider text-text-muted">Registered</p>
            </div>
            <div>
              <Users className="w-5 h-5 text-neon-red mx-auto mb-1" />
              <p className="font-heading text-xl font-bold text-neon-red" data-testid="stat-active-members">{stats.active_members}</p>
              <p className="font-body text-[10px] uppercase tracking-wider text-text-muted">Active Members</p>
            </div>
            <div>
              <Calendar className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <p className="font-heading text-xl font-bold text-yellow-400" data-testid="stat-total-events">{stats.total_events}</p>
              <p className="font-body text-[10px] uppercase tracking-wider text-text-muted">Events Hosted</p>
            </div>
          </div>
        </section>
      )}

      {/* Member of the Month */}
      {mom?.member && (
        <section className="py-12 px-4" data-testid="mom-section">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-neon-purple uppercase tracking-tight mb-6 text-center flex items-center justify-center gap-2">
              <Star className="w-6 h-6 fill-neon-purple" /> Member of the Month
            </h2>
            <Link to={`/members/${encodeURIComponent(mom.member.game_name)}`} className="block">
              <div className="bg-darknet-surface border border-neon-purple border-glow-purple p-6 flex flex-col md:flex-row items-center gap-6 hover:bg-neon-purple/5 transition-colors">
                <div className="w-28 h-28 border-2 border-neon-purple bg-darknet-terminal overflow-hidden flex-shrink-0">
                  {mom.member.avatar_url ? (
                    <img src={mom.member.avatar_url} alt={mom.member.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-heading text-3xl text-neon-purple">{(mom.member.name || '?').slice(0, 2).toUpperCase()}</div>
                  )}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <p className="font-body text-[10px] uppercase tracking-[0.2em] text-neon-purple mb-1">{mom.month}</p>
                  <h3 className="font-heading text-2xl font-bold text-white uppercase mb-1" data-testid="mom-name">{mom.member.name}</h3>
                  <p className="font-body text-sm text-text-secondary mb-2">{mom.member.role} • {mom.member.rank} • {mom.member.wins} Wins • {mom.member.mvp_count} MVPs</p>
                  {mom.reason && <p className="font-body text-sm text-text-secondary leading-relaxed italic">&quot;{mom.reason}&quot;</p>}
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Link to="/tournaments">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-darknet-surface border border-neon-blue/50 p-8 border-glow-blue hover:border-neon-blue transition-all cursor-pointer h-full" data-testid="feature-tournaments">
                <Trophy className="w-12 h-12 text-neon-blue mb-4" />
                <h3 className="font-heading text-xl font-bold text-neon-blue uppercase mb-2">Tournaments</h3>
                <p className="font-body text-sm text-text-secondary leading-relaxed">
                  Compete in weekly tournaments and climb the ranks.
                </p>
              </motion.div>
            </Link>
            <Link to="/leaderboard">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-darknet-surface border border-neon-purple/50 p-8 border-glow-purple hover:border-neon-purple transition-all cursor-pointer h-full" data-testid="feature-community">
                <Users className="w-12 h-12 text-neon-purple mb-4" />
                <h3 className="font-heading text-xl font-bold text-neon-purple uppercase mb-2">Leaderboard</h3>
                <p className="font-body text-sm text-text-secondary leading-relaxed">
                  See top players, MVP rankings, and tournament champions.
                </p>
              </motion.div>
            </Link>
            <Link to="/events">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="bg-darknet-surface border border-neon-red/50 p-8 border-glow-red hover:border-neon-red transition-all cursor-pointer h-full" data-testid="feature-events">
                <Calendar className="w-12 h-12 text-neon-red mb-4" />
                <h3 className="font-heading text-xl font-bold text-neon-red uppercase mb-2">Events</h3>
                <p className="font-body text-sm text-text-secondary leading-relaxed">
                  Regular squad training, custom matches, and celebrations.
                </p>
              </motion.div>
            </Link>
          </div>
        </div>
      </section>

      {/* Announcements Section */}
      <section className="py-16 px-4 bg-darknet-surface">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-neon-blue uppercase tracking-tight mb-8 text-center" data-testid="announcements-title">
            Latest Announcements
          </h2>
          <div className="space-y-6">
            {announcements.length === 0 ? (
              <p className="font-body text-text-muted text-center" data-testid="no-announcements">No announcements yet.</p>
            ) : (
              announcements.map((announcement, index) => (
                <motion.div key={index} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}
                  className="bg-darknet-terminal border border-border-DEFAULT p-6" data-testid={`announcement-${index}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 text-xs font-body uppercase tracking-[0.2em] border border-neon-purple text-neon-purple">
                      {announcement.type}
                    </span>
                    <h3 className="font-heading text-lg font-bold text-white uppercase">{announcement.title}</h3>
                  </div>
                  <p className="font-body text-sm text-text-secondary leading-relaxed">{announcement.content}</p>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section — hidden when logged in */}
      {!user && (
        <section className="py-20 px-4" data-testid="cta-section">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white uppercase tracking-tight mb-4">
              Ready to Join the Elite?
            </h2>
            <p className="font-body text-lg text-text-secondary mb-8 leading-relaxed">
              We&apos;re looking for dedicated, skilled players who value teamwork and improvement.
            </p>
            <Link to="/join" data-testid="cta-join-btn"
              className="inline-block px-10 py-4 bg-neon-red border-2 border-neon-red text-white font-heading text-lg tracking-wider uppercase hover:shadow-[0_0_30px_rgba(255,0,60,0.8)] transition-all">
              Apply Now
            </Link>
          </div>
        </section>
      )}
    </div>
  );
};
