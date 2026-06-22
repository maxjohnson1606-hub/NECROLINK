import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, Pin, ExternalLink, Calendar } from 'lucide-react';
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

export const News = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchNews();
  }, [selectedCategory]);

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
            Latest MLBB news, patches, and clan announcements
          </p>
        </div>

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
                <h2 className="font-heading text-xl font-bold text-neon-blue uppercase tracking-tight mb-4">Latest Articles</h2>
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
    </div>
  );
};
