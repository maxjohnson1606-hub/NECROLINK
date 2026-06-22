import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, Pin, ExternalLink, Calendar, Youtube, Instagram, Play, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = [
  { value: 'all', label: 'All News' },
  { value: 'patch_notes', label: 'Patch Notes' },
  { value: 'new_heroes', label: 'New Heroes' },
  { value: 'new_skins', label: 'New Skins' },
  { value: 'events', label: 'Events' },
  { value: 'esports', label: 'Esports' },
  { value: 'game_updates', label: 'Game Updates' },
];

const CATEGORY_COLORS = {
  patch_notes: 'border-neon-blue text-neon-blue',
  new_heroes: 'border-neon-purple text-neon-purple',
  new_skins: 'border-yellow-400 text-yellow-400',
  events: 'border-neon-red text-neon-red',
  esports: 'border-green-400 text-green-400',
  game_updates: 'border-orange-400 text-orange-400',
};

const NewsCard = ({ item, index, pinned = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className={`bg-darknet-surface border ${pinned ? 'border-neon-purple/60 border-glow-purple' : 'border-border-DEFAULT'} overflow-hidden hover:border-neon-blue/50 transition-all`}
    data-testid={`news-card-${item.id}`}
  >
    {item.image_url && (
      <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${item.image_url})` }} />
    )}
    <div className="p-5">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {item.is_pinned && (
          <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-body uppercase tracking-[0.2em] bg-neon-purple/20 border border-neon-purple text-neon-purple">
            <Pin className="w-3 h-3" /> Pinned
          </span>
        )}
        <span className={`px-2 py-0.5 text-[10px] font-body uppercase tracking-[0.2em] border ${CATEGORY_COLORS[item.category] || 'border-text-muted text-text-muted'}`}>
          {item.category.replace('_', ' ')}
        </span>
      </div>

      <h3 className="font-heading text-lg font-bold text-white uppercase mb-2 leading-tight">{item.title}</h3>
      <p className="font-body text-sm text-text-secondary leading-relaxed mb-4 line-clamp-4">{item.content}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-body text-xs text-text-muted">
          <Calendar className="w-3 h-3" />
          {new Date(item.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
        </div>
        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`news-source-${item.id}`}
            className="flex items-center gap-1 font-body text-xs text-neon-blue hover:text-neon-purple transition-colors"
          >
            Source <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  </motion.div>
);

const VideoCard = ({ video, index, onPlay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.04 }}
    onClick={() => onPlay(video)}
    className="bg-darknet-surface border border-neon-red/40 overflow-hidden hover:border-neon-red transition-all cursor-pointer group"
    data-testid={`yt-video-${video.video_id}`}
  >
    <div className="relative aspect-video bg-darknet-terminal overflow-hidden">
      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-neon-red/90 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Play className="w-6 h-6 text-white fill-white ml-0.5" />
        </div>
      </div>
      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 border border-neon-red text-neon-red text-[10px] font-body uppercase tracking-wider flex items-center gap-1">
        <Youtube className="w-3 h-3" /> Official
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

const VideoPlayerModal = ({ video, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4" onClick={onClose} data-testid="video-modal">
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
      <div className="aspect-video bg-black">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${video.video_id}?autoplay=1`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="bg-darknet-surface border border-neon-red/50 p-4 mt-2">
        <h3 className="font-heading text-lg font-bold text-white mb-1">{video.title}</h3>
        <a href={video.url} target="_blank" rel="noopener noreferrer" className="font-body text-xs text-neon-blue hover:text-neon-purple inline-flex items-center gap-1">
          Watch on YouTube <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </motion.div>
  </div>
);

export const News = () => {
  const [news, setNews] = useState([]);
  const [videos, setVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [playingVideo, setPlayingVideo] = useState(null);
  const [instagramInfo, setInstagramInfo] = useState(null);

  useEffect(() => {
    fetchNews();
  }, [selectedCategory]);

  useEffect(() => {
    fetchVideos();
    fetchInstagram();
  }, []);

  const fetchVideos = async () => {
    setVideosLoading(true);
    try {
      const { data } = await axios.get(`${API}/feeds/mlbb-videos`);
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setVideosLoading(false);
    }
  };

  const fetchInstagram = async () => {
    try {
      const { data } = await axios.get(`${API}/feeds/mlbb-instagram`);
      setInstagramInfo(data);
    } catch (error) {
      console.error('Error fetching instagram:', error);
    }
  };

  const fetchNews = async () => {
    setLoading(true);
    try {
      const url = selectedCategory === 'all' ? `${API}/news` : `${API}/news?category=${selectedCategory}`;
      const { data } = await axios.get(url);
      setNews(data);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const pinnedNews = news.filter((n) => n.is_pinned);
  const regularNews = news.filter((n) => !n.is_pinned);

  return (
    <div className="min-h-screen bg-darknet-bg py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-darknet-terminal border-2 border-neon-blue flex items-center justify-center border-glow-blue">
              <Newspaper className="w-8 h-8 text-neon-blue" />
            </div>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase mb-4 neon-glow-blue" data-testid="news-title">
            News & Updates
          </h1>
          <p className="font-body text-lg text-text-secondary tracking-wide">
            Latest MLBB news, official videos, and clan announcements
          </p>
        </div>

        {/* Latest MLBB Videos Section */}
        <section className="mb-12" data-testid="mlbb-videos-section">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Youtube className="w-7 h-7 text-neon-red" />
              <div>
                <h2 className="font-heading text-2xl font-bold text-neon-red uppercase tracking-tight">Latest MLBB Videos</h2>
                <p className="font-body text-xs text-text-muted">From the official Mobile Legends: Bang Bang channel</p>
              </div>
            </div>
            <button
              onClick={fetchVideos}
              disabled={videosLoading}
              data-testid="refresh-videos-btn"
              className="flex items-center gap-2 px-3 py-1.5 border border-neon-red/40 text-neon-red font-body text-xs uppercase tracking-wider hover:bg-neon-red/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${videosLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {videosLoading ? (
            <p className="font-body text-text-muted">Loading videos...</p>
          ) : videos.length === 0 ? (
            <p className="font-body text-text-muted" data-testid="no-videos">No videos available right now.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.slice(0, 8).map((video, i) => (
                <VideoCard key={video.video_id} video={video} index={i} onPlay={setPlayingVideo} />
              ))}
            </div>
          )}
        </section>

        {/* Instagram CTA */}
        {instagramInfo && (
          <section className="mb-12">
            <a
              href={instagramInfo.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="instagram-cta"
              className="block bg-gradient-to-r from-neon-purple/10 via-neon-red/10 to-neon-purple/10 border border-neon-purple/40 p-6 hover:border-neon-purple transition-all group"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-darknet-terminal border border-neon-purple flex items-center justify-center group-hover:border-glow-purple transition-all">
                    <Instagram className="w-7 h-7 text-neon-purple" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-neon-purple uppercase tracking-tight">{instagramInfo.handle}</h3>
                    <p className="font-body text-xs text-text-muted">Follow MLBB CIS on Instagram for breaking updates, screenshots & teasers</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-neon-purple/20 border border-neon-purple text-neon-purple font-body text-xs uppercase tracking-wider group-hover:bg-neon-purple/30">
                  View on Instagram <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            </a>
          </section>
        )}

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              data-testid={`category-${cat.value}`}
              className={`px-4 py-2 font-body text-xs uppercase tracking-wider border transition-all ${
                selectedCategory === cat.value
                  ? 'bg-neon-blue/20 border-neon-blue text-neon-blue'
                  : 'border-border-DEFAULT text-text-secondary hover:border-neon-blue/50 hover:text-neon-blue'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center font-body text-text-muted">Loading news...</p>
        ) : news.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-body text-text-muted" data-testid="no-news">No news articles in this category yet.</p>
          </div>
        ) : (
          <>
            {pinnedNews.length > 0 && (
              <section className="mb-10">
                <h2 className="font-heading text-xl font-bold text-neon-purple uppercase tracking-tight mb-4 flex items-center gap-2">
                  <Pin className="w-5 h-5" /> Pinned Announcements
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pinnedNews.map((item, i) => (
                    <NewsCard key={item.id} item={item} index={i} pinned />
                  ))}
                </div>
              </section>
            )}

            {regularNews.length > 0 && (
              <section>
                <h2 className="font-heading text-xl font-bold text-neon-blue uppercase tracking-tight mb-4">Clan News</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularNews.map((item, i) => (
                    <NewsCard key={item.id} item={item} index={i} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {playingVideo && <VideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} />}
    </div>
  );
};
