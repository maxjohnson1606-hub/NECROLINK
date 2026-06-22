import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Trophy, Users, Calendar } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Home = () => {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data } = await axios.get(`${API}/announcements`);
      setAnnouncements(data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  return (
    <div className="min-h-screen bg-darknet-bg">
      {/* Hero Banner */}
      <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden" data-testid="hero-section">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/17195067/pexels-photo-17195067.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)',
          }}
        />
        <div className="absolute inset-0 bg-black/80" />
        
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-6 flex justify-center">
              <div className="w-24 h-24 bg-darknet-terminal border-2 border-neon-blue flex items-center justify-center border-glow-blue animate-float">
                <Zap className="w-12 h-12 text-neon-blue" />
              </div>
            </div>
            
            <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter uppercase mb-6 neon-glow-blue" data-testid="hero-title">
              DARK_NET
            </h1>
            
            <p className="font-body text-xl md:text-2xl text-neon-purple mb-4 tracking-wider neon-glow-purple">
              Mobile Legends: Bang Bang Elite Clan
            </p>
            
            <p className="font-body text-lg md:text-xl text-text-secondary mb-8 tracking-wide">
              Connected by Skill. United by Victory.
            </p>
            
            <Link
              to="/join"
              data-testid="join-darknet-btn"
              className="inline-block px-8 py-4 bg-neon-red border-2 border-neon-red text-white font-heading text-lg tracking-wider uppercase hover:shadow-[0_0_30px_rgba(255,0,60,0.8)] transition-all"
            >
              Join Dark_Net
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-darknet-surface border border-neon-blue/50 p-8 border-glow-blue"
              data-testid="feature-tournaments"
            >
              <Trophy className="w-12 h-12 text-neon-blue mb-4" />
              <h3 className="font-heading text-xl font-bold text-neon-blue uppercase mb-2">Tournaments</h3>
              <p className="font-body text-sm text-text-secondary leading-relaxed">
                Compete in weekly tournaments and climb the ranks. Prove your skills against the best.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-darknet-surface border border-neon-purple/50 p-8 border-glow-purple"
              data-testid="feature-community"
            >
              <Users className="w-12 h-12 text-neon-purple mb-4" />
              <h3 className="font-heading text-xl font-bold text-neon-purple uppercase mb-2">Elite Team</h3>
              <p className="font-body text-sm text-text-secondary leading-relaxed">
                Join a community of skilled players. Train together, strategize, and dominate.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-darknet-surface border border-neon-red/50 p-8 border-glow-red"
              data-testid="feature-events"
            >
              <Calendar className="w-12 h-12 text-neon-red mb-4" />
              <h3 className="font-heading text-xl font-bold text-neon-red uppercase mb-2">Events</h3>
              <p className="font-body text-sm text-text-secondary leading-relaxed">
                Regular squad training, custom matches, and community celebrations. Never a dull moment.
              </p>
            </motion.div>
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
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-darknet-terminal border border-border-DEFAULT p-6"
                  data-testid={`announcement-${index}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 text-xs font-body uppercase tracking-[0.2em] border border-neon-purple text-neon-purple">
                          {announcement.type}
                        </span>
                        <h3 className="font-heading text-lg font-bold text-white uppercase">{announcement.title}</h3>
                      </div>
                      <p className="font-body text-sm text-text-secondary leading-relaxed">{announcement.content}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white uppercase tracking-tight mb-4">
            Ready to Join the Elite?
          </h2>
          <p className="font-body text-lg text-text-secondary mb-8 leading-relaxed">
            We're looking for dedicated, skilled players who value teamwork and improvement.
          </p>
          <Link
            to="/join"
            data-testid="cta-join-btn"
            className="inline-block px-10 py-4 bg-neon-red border-2 border-neon-red text-white font-heading text-lg tracking-wider uppercase hover:shadow-[0_0_30px_rgba(255,0,60,0.8)] transition-all"
          >
            Apply Now
          </Link>
        </div>
      </section>
    </div>
  );
};