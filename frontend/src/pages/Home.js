import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy, Users, Calendar, Star, Eye, UserCheck,
  Newspaper, Youtube, Play, ChevronRight, Pin, ExternalLink
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORY_STYLES = {
  patch_notes:    { text: 'text-neon-blue',   border: 'border-neon-blue' },
  new_heroes:     { text: 'text-neon-purple', border: 'border-neon-purple' },
  hero_revamps:   { text: 'text-cyan-400',    border: 'border-cyan-400' },
  new_skins:      { text: 'text-yellow-400',  border: 'border-yellow-400' },
  events:         { text: 'text-neon-red',    border: 'border-neon-red' },
  tournaments:    { text: 'text-orange-400',  border: 'border-orange-400' },
  mlbb_esports:   { text: 'text-green-400',   border: 'border-green-400' },
  collaborations: { text: 'text-pink-400',    border: 'border-pink-400' },
  game_updates:   { text: 'text-indigo-400',  border: 'border-indigo-400' },
  community_news: { text: 'text-teal-400',    border: 'border-teal-400' },
};

const getCategoryStyle = (cat) => CATEGORY_STYLES[cat] || { text: 'text-text-muted', border: 'border-text-muted' };
const getCategoryLabel = (val) => (val || '').replace(/_/g, ' ');

// ─── Mini News Card for homepage ──────────────────────────────────────────────
const MiniNewsCard = ({ item, index }) => {
  const style = getCategoryStyle(item.category);
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07 }}
      className="flex gap-4 p-4 bg-darknet-terminal border border-border-DEFAULT hover:border-neon-blue/40 transition-all group"
    >
      {item.image_url && (
        <div
          className="w-20 h-16 flex-shrink-0 bg-cover bg-center border border-border-DEFAULT"
          style={{ backgroundImage: `url(${item.image_url})` }}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {item.is_pinned && <Pin className="w-3 h-3 text-neon-purple flex-shrink-0" />}
          <span className={`text-[9px] font-body uppercase tracking-[0.15em] ${style.text}`}>
            {getCategoryLabel(item.category)}
          </span>
        </div>
        <h4 className="font-heading text-sm font-bold text-white uppercase leading-tight line-clamp-2 group-hover:text-neon-blue transition-colors">
          {item.title}
        </h4>
        <p className="font-body text-[10px] text-text-muted mt-1">
          {new Date(item.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
        </p>
      </div>
      {item.source_url && (
        <a href={item.source_url} target="_blank" rel="noopener noreferrer"
          className="flex-shrink-0 self-center text-text-muted hover:text-neon-blue transition-colors">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </motion.div>
  );
};

// ─── Latest Video Card for homepage ──────────────────────────────────────────
const LatestVideoCard = ({ video, onPlay }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    onClick={() => onPlay(video)}
    className="cursor-pointer group border border-neon-red/40 overflow-hidden hover:border-neon-red transition-all bg-darknet-terminal"
  >
    <div className="relative aspect-video overflow-hidden">
      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-neon-red/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,0,60,0.6)]">
          <Play className="w-6 h-6 text-white fill-white ml-0.5" />
        </div>
      </div>
      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 border border-neon-red text-neon-red text-[10px] font-body uppercase tracking-wider flex items-center gap-1">
        <Youtube className="w-3 h-3" /> Official MLBB
      </div>
    </div>
    <div className="p-4">
      <h4 className="font-heading text-base font-bold text-white line-clamp-2 mb-1">{video.title}</h4>
      <p className="font-body text-xs text-text-muted">
        {video.published ? new Date(video.published).toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'Mobile Legends: Bang Bang'}
      </p>
    </div>
  </motion.div>
);

// ─── Featured News Banner ─────────────────────────────────────────────────────
const FeaturedBanner = ({ item }) => {
  const style = getCategoryStyle(item.category);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden border border-neon-purple/50 group"
      style={{ minHeight: 200 }}
    >
      {item.image_url && (
        <div
          className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700"
          style={{ backgroundImage: `url(${item.image_url})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-transparent" />
      <div className="relative z-10 p-5 flex flex-col justify-center h-full" style={{ minHeight: 200 }}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {item.is_featured && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-body uppercase tracking-widest bg-yellow-400/20 border border-yellow-400 text-yellow-400">
              <Star className="w-2.5 h-2.5" /> Featured
            </span>
          )}
          {item.is_pinned && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-body uppercase tracking-widest bg-neon-purple/20 border border-neon-purple text-neon-purple">
              <Pin className="w-2.5 h-2.5" /> Pinned
            </span>
          )}
          <span className={`text-[9px] font-body uppercase tracking-widest ${style.text}`}>
            {getCategoryLabel(item.category)}
          </span>
        </div>
        <h3 className="font-heading text-xl font-black text-white uppercase leading-tight mb-2">{item.title}</h3>
        <p className="font-body text-xs text-text-secondary line-clamp-2">{item.content}</p>
      </div>
    </motion.div>
  );
};

// ─── Video Player Modal ───────────────────────────────────────────────────────
const VideoPlayerModal = ({ video, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4" onClick={onClose}>
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
      <div className="aspect-video bg-black">
        <iframe className="w-full h-full"
          src={`https://www.youtube.com/embed/${video.video_id}?autoplay=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen />
      </div>
      <div className="bg-darknet-surface border border-neon-red/50 p-3 flex items-center justify-between gap-3">
        <h3 className="font-heading text-sm font-bold text-white truncate flex-1">{video.title}</h3>
        <div className="flex gap-2">
          <a href={video.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 bg-neon-red text-white font-body text-xs uppercase tracking-wider">
            <Youtube className="w-3 h-3" /> YouTube
          </a>
          <button onClick={onClose} className="px-3 py-1.5 border border-border-DEFAULT text-text-muted font-body text-xs uppercase hover:text-white">
            Close
          </button>
        </div>
      </div>
    </motion.div>
  </div>
);

// ─── Home Page ────────────────────────────────────────────────────────────────
export const Home = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [mom, setMom] = useState(null);
  const [stats, setStats] = useState(null);
  const [latestNews, setLatestNews] = useState([]);
  const [featuredNews, setFeaturedNews] = useState([]);
  const [latestVideo, setLatestVideo] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);

  useEffect(() => {
    if (!sessionStorage.getItem('necrolink_visit_tracked')) {
      axios.post(`${API}/visit`).catch(() => {});
      sessionStorage.setItem('necrolink_visit_tracked', '1');
    }
    fetchAnnouncements();
    fetchMemberOfMonth();
    fetchVisitStats();
    fetchLatestNews();
    fetchFeaturedNews();
    fetchLatestVideo();
  }, []);

  const fetchAnnouncements = async () => {
    try { const { data } = await axios.get(`${API}/announcements`); setAnnouncements(data); }
    catch { /* silent */ }
  };

  const fetchMemberOfMonth = async () => {
    try { const { data } = await axios.get(`${API}/member-of-month`); setMom(data); }
    catch { setMom(null); }
  };

  const fetchVisitStats = async () => {
    try { const { data } = await axios.get(`${API}/visit-stats`); setStats(data); }
    catch { setStats(null); }
  };

  const fetchLatestNews = async () => {
    try { const { data } = await axios.get(`${API}/news/latest?limit=5`); setLatestNews(data); }
    catch { setLatestNews([]); }
  };

  const fetchFeaturedNews = async () => {
    try { const { data } = await axios.get(`${API}/news/featured?limit=3`); setFeaturedNews(data); }
    catch { setFeaturedNews([]); }
  };

  const fetchLatestVideo = async () => {
    try {
      const { data } = await axios.get(`${API}/feeds/mlbb-videos`);
      if (data.videos && data.videos.length > 0) setLatestVideo(data.videos[0]);
    } catch { /* silent */ }
  };

  return (
    <div className="min-h-screen bg-darknet-bg">
      {/* ── Hero Banner ── */}
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

      {/* ── Visitor Stats ── */}
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

      {/* ── Featured News + Latest MLBB Video ── */}
      {(featuredNews.length > 0 || latestVideo) && (
        <section className="py-14 px-4" data-testid="featured-news-section">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white uppercase tracking-tight flex items-center gap-3">
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                Featured
              </h2>
              <Link to="/news" className="flex items-center gap-1 font-body text-xs text-neon-blue hover:text-neon-purple transition-colors uppercase tracking-wider">
                All News <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Featured news banners */}
              {featuredNews.length > 0 && (
                <div className="lg:col-span-2 space-y-4">
                  {featuredNews.map((item, i) => (
                    <FeaturedBanner key={item.id || i} item={item} />
                  ))}
                </div>
              )}
              {/* Latest MLBB Video */}
              {latestVideo && (
                <div className={featuredNews.length === 0 ? 'lg:col-span-3 max-w-lg' : 'lg:col-span-1'}>
                  <p className="font-body text-[10px] uppercase tracking-widest text-neon-red mb-2 flex items-center gap-1">
                    <Youtube className="w-3 h-3" /> Latest Official Video
                  </p>
                  <LatestVideoCard video={latestVideo} onPlay={setPlayingVideo} />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Latest News Feed ── */}
      {latestNews.length > 0 && (
        <section className="py-14 px-4 bg-darknet-surface" data-testid="latest-news-section">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-neon-blue uppercase tracking-tight flex items-center gap-3">
                <Newspaper className="w-6 h-6" />
                Latest News
              </h2>
              <Link to="/news" className="flex items-center gap-1 font-body text-xs text-neon-blue hover:text-neon-purple transition-colors uppercase tracking-wider">
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {latestNews.map((item, i) => (
                <MiniNewsCard key={item.id || i} item={item} index={i} />
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link to="/news"
                className="inline-flex items-center gap-2 px-6 py-3 border border-neon-blue text-neon-blue font-body text-xs uppercase tracking-wider hover:bg-neon-blue/10 transition-colors">
                <Newspaper className="w-4 h-4" /> Visit News Center
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Member of the Month ── */}
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

      {/* ── Features Section ── */}
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

      {/* ── Announcements ── */}
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

      {/* ── CTA ── */}
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

      {/* ── Video Modal ── */}
      {playingVideo && <VideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} />}
    </div>
  );
};
