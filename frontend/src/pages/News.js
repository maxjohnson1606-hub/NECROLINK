import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Newspaper, Pin, ExternalLink, Calendar, Youtube, Instagram,
  Play, RefreshCw, Search, X, Star, Trophy, Swords, ChevronRight,
  Zap, Globe, Users
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = [
  { value: 'all', label: 'All News' },
  { value: 'patch_notes', label: 'Patch Notes' },
  { value: 'new_heroes', label: 'New Heroes' },
  { value: 'hero_revamps', label: 'Hero Revamps' },
  { value: 'new_skins', label: 'New Skins' },
  { value: 'events', label: 'Events' },
  { value: 'tournaments', label: 'Tournaments' },
  { value: 'mlbb_esports', label: 'MLBB Esports' },
  { value: 'collaborations', label: 'Collaborations' },
  { value: 'game_updates', label: 'Game Updates' },
  { value: 'community_news', label: 'Community News' },
];

const CATEGORY_STYLES = {
  patch_notes:    { border: 'border-neon-blue',   text: 'text-neon-blue',   bg: 'bg-neon-blue/10' },
  new_heroes:     { border: 'border-neon-purple', text: 'text-neon-purple', bg: 'bg-neon-purple/10' },
  hero_revamps:   { border: 'border-cyan-400',    text: 'text-cyan-400',    bg: 'bg-cyan-400/10' },
  new_skins:      { border: 'border-yellow-400',  text: 'text-yellow-400',  bg: 'bg-yellow-400/10' },
  events:         { border: 'border-neon-red',    text: 'text-neon-red',    bg: 'bg-neon-red/10' },
  tournaments:    { border: 'border-orange-400',  text: 'text-orange-400',  bg: 'bg-orange-400/10' },
  mlbb_esports:   { border: 'border-green-400',   text: 'text-green-400',   bg: 'bg-green-400/10' },
  collaborations: { border: 'border-pink-400',    text: 'text-pink-400',    bg: 'bg-pink-400/10' },
  game_updates:   { border: 'border-indigo-400',  text: 'text-indigo-400',  bg: 'bg-indigo-400/10' },
  community_news: { border: 'border-teal-400',    text: 'text-teal-400',    bg: 'bg-teal-400/10' },
};

const getCategoryStyle = (cat) => CATEGORY_STYLES[cat] || { border: 'border-text-muted', text: 'text-text-muted', bg: 'bg-white/5' };
const getCategoryLabel = (val) => CATEGORIES.find((c) => c.value === val)?.label || val.replace(/_/g, ' ');

// ─── Featured Card (hero-size, top of page) ──────────────────────────────────
const FeaturedCard = ({ item }) => {
  const style = getCategoryStyle(item.category);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden border border-neon-purple/60 group cursor-pointer"
      style={{ minHeight: 320 }}
    >
      {item.image_url ? (
        <div
          className="absolute inset-0 bg-cover bg-center scale-105 group-hover:scale-110 transition-transform duration-700"
          style={{ backgroundImage: `url(${item.image_url})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/20 via-darknet-terminal to-darknet-bg" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />

      <div className="relative z-10 p-6 md:p-8 h-full flex flex-col justify-end" style={{ minHeight: 320 }}>
        <div className="flex flex-wrap gap-2 mb-3">
          {item.is_pinned && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-body uppercase tracking-[0.2em] bg-neon-purple/30 border border-neon-purple text-neon-purple">
              <Pin className="w-3 h-3" /> Pinned
            </span>
          )}
          {item.is_featured && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-body uppercase tracking-[0.2em] bg-yellow-400/20 border border-yellow-400 text-yellow-400">
              <Star className="w-3 h-3" /> Featured
            </span>
          )}
          <span className={`px-2 py-0.5 text-[10px] font-body uppercase tracking-[0.2em] border ${style.border} ${style.text} ${style.bg}`}>
            {getCategoryLabel(item.category)}
          </span>
        </div>
        <h2 className="font-heading text-2xl md:text-3xl font-black text-white uppercase mb-3 leading-tight neon-glow-purple">
          {item.title}
        </h2>
        <p className="font-body text-sm text-text-secondary leading-relaxed mb-4 line-clamp-2">{item.content}</p>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 font-body text-xs text-text-muted">
            <Calendar className="w-3 h-3" />
            {new Date(item.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
          </div>
          {item.source_url && (
            <a href={item.source_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 border border-neon-blue text-neon-blue font-body text-xs uppercase tracking-wider hover:bg-neon-blue/10 transition-colors">
              Read More <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Standard News Card ───────────────────────────────────────────────────────
const NewsCard = ({ item, index, pinned = false }) => {
  const style = getCategoryStyle(item.category);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`bg-darknet-surface border ${pinned ? 'border-neon-purple/60' : 'border-border-DEFAULT'} overflow-hidden hover:border-neon-blue/50 transition-all group`}
      data-testid={`news-card-${item.id}`}
    >
      {item.image_url && (
        <div
          className="h-44 bg-cover bg-center group-hover:scale-105 transition-transform duration-500 overflow-hidden"
          style={{ backgroundImage: `url(${item.image_url})` }}
        />
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {item.is_pinned && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-body uppercase tracking-[0.2em] bg-neon-purple/20 border border-neon-purple text-neon-purple">
              <Pin className="w-3 h-3" /> Pinned
            </span>
          )}
          {item.is_featured && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-body uppercase tracking-[0.2em] bg-yellow-400/20 border border-yellow-400 text-yellow-400">
              <Star className="w-3 h-3" /> Featured
            </span>
          )}
          <span className={`px-2 py-0.5 text-[10px] font-body uppercase tracking-[0.2em] border ${style.border} ${style.text}`}>
            {getCategoryLabel(item.category)}
          </span>
        </div>
        <h3 className="font-heading text-base font-bold text-white uppercase mb-2 leading-tight">{item.title}</h3>
        <p className="font-body text-xs text-text-secondary leading-relaxed mb-4 line-clamp-3">{item.content}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-body text-xs text-text-muted">
            <Calendar className="w-3 h-3" />
            {new Date(item.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
          </div>
          {item.source_url && (
            <a href={item.source_url} target="_blank" rel="noopener noreferrer"
              data-testid={`news-source-${item.id}`}
              className="flex items-center gap-1 font-body text-xs text-neon-blue hover:text-neon-purple transition-colors">
              Source <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Video Card ───────────────────────────────────────────────────────────────
const VideoCard = ({ video, index, onPlay, badge = 'Official', badgeColor = 'neon-red' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.04 }}
    onClick={() => onPlay(video)}
    className={`bg-darknet-surface border border-${badgeColor}/40 overflow-hidden hover:border-${badgeColor} transition-all cursor-pointer group`}
    data-testid={`yt-video-${video.video_id}`}
  >
    <div className="relative aspect-video bg-darknet-terminal overflow-hidden">
      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
        <div className={`w-12 h-12 rounded-full bg-${badgeColor}/90 flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
        </div>
      </div>
      <div className={`absolute top-2 left-2 px-2 py-0.5 bg-black/80 border border-${badgeColor} text-${badgeColor} text-[10px] font-body uppercase tracking-wider flex items-center gap-1`}>
        <Youtube className="w-3 h-3" /> {badge}
      </div>
    </div>
    <div className="p-3">
      <h4 className="font-heading text-sm font-bold text-white line-clamp-2 mb-1">{video.title}</h4>
      <p className="font-body text-[10px] text-text-muted">
        {video.published ? new Date(video.published).toLocaleDateString('en-US', { dateStyle: 'medium' }) : ''}
      </p>
    </div>
  </motion.div>
);

// ─── Video Player Modal ───────────────────────────────────────────────────────
const VideoPlayerModal = ({ video, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
    onClick={onClose} data-testid="video-modal">
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
      <div className="aspect-video bg-black">
        <iframe className="w-full h-full"
          src={`https://www.youtube.com/embed/${video.video_id}?autoplay=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen />
      </div>
      <div className="bg-darknet-surface border border-neon-red/50 p-4 mt-2 flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-heading text-base font-bold text-white flex-1">{video.title}</h3>
        <div className="flex items-center gap-2">
          <a href={video.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-neon-red border border-neon-red text-white font-body text-xs uppercase tracking-wider hover:shadow-[0_0_15px_rgba(255,0,60,0.5)] transition-all"
            data-testid="open-on-youtube-btn">
            <Youtube className="w-4 h-4" /> Watch on YouTube
          </a>
          <button onClick={onClose} className="p-2 border border-border-DEFAULT text-text-muted hover:text-white hover:border-neon-red transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, iconColor, title, subtitle, channelUrl, channelLabel, onRefresh, refreshing }) => (
  <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
    <div className="flex items-center gap-3">
      <Icon className={`w-7 h-7 ${iconColor}`} />
      <div>
        <h2 className={`font-heading text-2xl font-bold ${iconColor} uppercase tracking-tight`}>{title}</h2>
        {subtitle && <p className="font-body text-xs text-text-muted">{subtitle}</p>}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {channelUrl && (
        <a href={channelUrl} target="_blank" rel="noopener noreferrer"
          className={`flex items-center gap-1 px-3 py-1.5 border ${iconColor.replace('text-', 'border-')}/40 ${iconColor} font-body text-xs uppercase tracking-wider hover:bg-white/5 transition-colors`}>
          <Globe className="w-3 h-3" /> {channelLabel || 'View Channel'}
        </a>
      )}
      {onRefresh && (
        <button onClick={onRefresh} disabled={refreshing}
          className={`flex items-center gap-2 px-3 py-1.5 border ${iconColor.replace('text-', 'border-')}/40 ${iconColor} font-body text-xs uppercase tracking-wider hover:bg-white/5 transition-colors disabled:opacity-50`}>
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      )}
    </div>
  </div>
);

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
const VideoSkeleton = () => (
  <div className="bg-darknet-surface border border-border-DEFAULT overflow-hidden animate-pulse">
    <div className="aspect-video bg-darknet-terminal" />
    <div className="p-3 space-y-2">
      <div className="h-3 bg-white/10 rounded w-3/4" />
      <div className="h-2 bg-white/5 rounded w-1/3" />
    </div>
  </div>
);

const NewsSkeleton = () => (
  <div className="bg-darknet-surface border border-border-DEFAULT overflow-hidden animate-pulse">
    <div className="h-44 bg-darknet-terminal" />
    <div className="p-5 space-y-3">
      <div className="h-3 bg-white/10 rounded w-1/4" />
      <div className="h-4 bg-white/10 rounded w-3/4" />
      <div className="h-3 bg-white/5 rounded w-full" />
      <div className="h-3 bg-white/5 rounded w-2/3" />
    </div>
  </div>
);

// ─── Main News Page ───────────────────────────────────────────────────────────
export const News = () => {
  const [news, setNews] = useState([]);
  const [featuredNews, setFeaturedNews] = useState([]);
  const [videos, setVideos] = useState([]);
  const [esportsVideos, setEsportsVideos] = useState([]);
  const [instagramInfo, setInstagramInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(true);
  const [esportsLoading, setEsportsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [playingVideo, setPlayingVideo] = useState(null);
  const searchDebounce = useRef(null);

  useEffect(() => {
    fetchVideos();
    fetchEsportsVideos();
    fetchInstagram();
    fetchFeaturedNews();
  }, []);

  useEffect(() => {
    fetchNews();
  }, [selectedCategory, searchQuery]);

  const handleSearchInput = (val) => {
    setSearchInput(val);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setSearchQuery(val);
    }, 400);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const fetchFeaturedNews = async () => {
    try {
      const { data } = await axios.get(`${API}/news/featured?limit=5`);
      setFeaturedNews(data);
    } catch { setFeaturedNews([]); }
  };

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (searchQuery.trim().length >= 2) params.set('search', searchQuery.trim());
      const { data } = await axios.get(`${API}/news?${params}`);
      setNews(data);
    } catch { setNews([]); }
    finally { setLoading(false); }
  }, [selectedCategory, searchQuery]);

  const fetchVideos = async () => {
    setVideosLoading(true);
    try {
      const { data } = await axios.get(`${API}/feeds/mlbb-videos`);
      setVideos(data.videos || []);
    } catch { setVideos([]); }
    finally { setVideosLoading(false); }
  };

  const fetchEsportsVideos = async () => {
    setEsportsLoading(true);
    try {
      const { data } = await axios.get(`${API}/feeds/mlbb-esports`);
      setEsportsVideos(data.videos || []);
    } catch { setEsportsVideos([]); }
    finally { setEsportsLoading(false); }
  };

  const fetchInstagram = async () => {
    try {
      const { data } = await axios.get(`${API}/feeds/mlbb-instagram`);
      setInstagramInfo(data);
    } catch { /* silent */ }
  };

  const pinnedNews = news.filter((n) => n.is_pinned && !n.is_featured);
  const regularNews = news.filter((n) => !n.is_pinned && !n.is_featured);
  const featuredInList = news.filter((n) => n.is_featured && !n.is_pinned);

  const isSearching = searchQuery.trim().length >= 2;

  return (
    <div className="min-h-screen bg-darknet-bg py-12 px-4">
      <div className="max-w-7xl mx-auto">

        {/* ── Page Header ── */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-darknet-terminal border-2 border-neon-blue flex items-center justify-center border-glow-blue">
              <Newspaper className="w-8 h-8 text-neon-blue" />
            </div>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase mb-4 neon-glow-blue" data-testid="news-title">
            MLBB News Center
          </h1>
          <p className="font-body text-lg text-text-secondary tracking-wide">
            Official news, hero updates, esports highlights & clan announcements
          </p>
        </div>

        {/* ── Search Bar ── */}
        <div className="mb-10 max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search news articles..."
              data-testid="news-search-input"
              className="w-full bg-darknet-surface border border-border-DEFAULT pl-10 pr-10 py-3 font-body text-sm text-white placeholder-text-muted focus:border-neon-blue focus:outline-none transition-colors"
            />
            {searchInput && (
              <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {isSearching && (
            <p className="font-body text-xs text-text-muted mt-2 text-center">
              Showing results for <span className="text-neon-blue">&quot;{searchQuery}&quot;</span>
            </p>
          )}
        </div>

        {/* ── Featured News (hidden during search) ── */}
        {!isSearching && featuredNews.length > 0 && (
          <section className="mb-12" data-testid="featured-section">
            <div className="flex items-center gap-3 mb-5">
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              <h2 className="font-heading text-2xl font-bold text-yellow-400 uppercase tracking-tight">Featured</h2>
            </div>
            {featuredNews.length === 1 ? (
              <FeaturedCard item={featuredNews[0]} />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="lg:col-span-1">
                  <FeaturedCard item={featuredNews[0]} />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {featuredNews.slice(1, 3).map((item, i) => (
                    <NewsCard key={item.id} item={item} index={i} />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Official MLBB Videos ── */}
        {!isSearching && (
          <section className="mb-12" data-testid="mlbb-videos-section">
            <SectionHeader
              icon={Youtube}
              iconColor="text-neon-red"
              title="Latest MLBB Videos"
              subtitle="From the official Mobile Legends: Bang Bang YouTube channel"
              channelUrl="https://www.youtube.com/channel/UCqmld-BIYME2i_ooRTo1EOg"
              channelLabel="Official Channel"
              onRefresh={fetchVideos}
              refreshing={videosLoading}
            />
            {videosLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <VideoSkeleton key={i} />)}
              </div>
            ) : videos.length === 0 ? (
              <div className="bg-darknet-surface border border-border-DEFAULT p-6 text-center">
                <p className="font-body text-sm text-text-muted" data-testid="no-videos">No videos available right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {videos.slice(0, 8).map((video, i) => (
                  <VideoCard key={video.video_id} video={video} index={i} onPlay={setPlayingVideo} badge="Official" badgeColor="neon-red" />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── MLBB Esports Videos ── */}
        {!isSearching && (
          <section className="mb-12" data-testid="mlbb-esports-section">
            <SectionHeader
              icon={Trophy}
              iconColor="text-green-400"
              title="MLBB Esports"
              subtitle="Official MLBB Esports highlights, matches & tournaments"
              channelUrl={`https://www.youtube.com/channel/UCLvkHEBRTJoME-PJIFKpqfw`}
              channelLabel="Esports Channel"
              onRefresh={fetchEsportsVideos}
              refreshing={esportsLoading}
            />
            {esportsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <VideoSkeleton key={i} />)}
              </div>
            ) : esportsVideos.length === 0 ? (
              <div className="bg-darknet-surface border border-border-DEFAULT p-6 text-center">
                <p className="font-body text-sm text-text-muted">No esports videos right now — check back soon.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {esportsVideos.slice(0, 8).map((video, i) => (
                  <VideoCard key={video.video_id} video={video} index={i} onPlay={setPlayingVideo} badge="Esports" badgeColor="green-400" />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Instagram CTA ── */}
        {!isSearching && instagramInfo && (
          <section className="mb-12">
            <a href={instagramInfo.profile_url} target="_blank" rel="noopener noreferrer"
              data-testid="instagram-cta"
              className="block bg-gradient-to-r from-neon-purple/10 via-neon-red/10 to-neon-purple/10 border border-neon-purple/40 p-6 hover:border-neon-purple transition-all group">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-darknet-terminal border border-neon-purple flex items-center justify-center group-hover:border-glow-purple transition-all">
                    <Instagram className="w-7 h-7 text-neon-purple" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-neon-purple uppercase tracking-tight">{instagramInfo.handle}</h3>
                    <p className="font-body text-xs text-text-muted">Follow MLBB on Instagram for breaking updates, screenshots &amp; teasers</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-neon-purple/20 border border-neon-purple text-neon-purple font-body text-xs uppercase tracking-wider group-hover:bg-neon-purple/30">
                  View on Instagram <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            </a>
          </section>
        )}

        {/* ── News Articles Section ── */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <Zap className="w-6 h-6 text-neon-blue" />
            <h2 className="font-heading text-2xl font-bold text-neon-blue uppercase tracking-tight">
              {isSearching ? 'Search Results' : 'News & Announcements'}
            </h2>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-8" data-testid="category-filters">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => { setSelectedCategory(cat.value); clearSearch(); }}
                data-testid={`category-${cat.value}`}
                className={`px-3 py-1.5 font-body text-xs uppercase tracking-wider border transition-all ${
                  selectedCategory === cat.value && !isSearching
                    ? 'bg-neon-blue/20 border-neon-blue text-neon-blue'
                    : 'border-border-DEFAULT text-text-secondary hover:border-neon-blue/50 hover:text-neon-blue'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <NewsSkeleton key={i} />)}
            </div>
          ) : news.length === 0 ? (
            <div className="text-center py-16 border border-border-DEFAULT bg-darknet-surface">
              <Newspaper className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <p className="font-heading text-lg text-text-muted uppercase" data-testid="no-news">
                {isSearching ? 'No articles match your search.' : 'No news articles in this category yet.'}
              </p>
              {isSearching && (
                <button onClick={clearSearch} className="mt-4 font-body text-xs text-neon-blue underline">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Pinned */}
              {pinnedNews.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-heading text-sm font-bold text-neon-purple uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Pin className="w-4 h-4" /> Pinned Announcements
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pinnedNews.map((item, i) => (
                      <NewsCard key={item.id} item={item} index={i} pinned />
                    ))}
                  </div>
                </div>
              )}

              {/* Featured in list (when filtering/searching) */}
              {featuredInList.length > 0 && (
                <div className="mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {featuredInList.map((item, i) => (
                      <NewsCard key={item.id} item={item} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* Regular articles */}
              {regularNews.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularNews.map((item, i) => (
                    <NewsCard key={item.id} item={item} index={i} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* ── Community CTA ── */}
        {!isSearching && (
          <div className="mt-16 border border-neon-blue/30 bg-darknet-surface p-8 text-center">
            <Users className="w-10 h-10 text-neon-blue mx-auto mb-3" />
            <h3 className="font-heading text-xl font-bold text-white uppercase mb-2">Stay Connected</h3>
            <p className="font-body text-sm text-text-secondary mb-4">
              Follow official MLBB channels for the latest hero reveals, patch notes and esports results.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <a href="https://www.youtube.com/channel/UCqmld-BIYME2i_ooRTo1EOg" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 border border-neon-red text-neon-red font-body text-xs uppercase tracking-wider hover:bg-neon-red/10 transition-colors">
                <Youtube className="w-4 h-4" /> MLBB YouTube
              </a>
              <a href="https://www.instagram.com/mobilelegendsgame/" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 border border-neon-purple text-neon-purple font-body text-xs uppercase tracking-wider hover:bg-neon-purple/10 transition-colors">
                <Instagram className="w-4 h-4" /> MLBB Instagram
              </a>
              <Link to="/news" className="flex items-center gap-2 px-4 py-2 border border-neon-blue text-neon-blue font-body text-xs uppercase tracking-wider hover:bg-neon-blue/10 transition-colors">
                <Newspaper className="w-4 h-4" /> All Articles
              </Link>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {playingVideo && <VideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} />}
      </AnimatePresence>
    </div>
  );
};
