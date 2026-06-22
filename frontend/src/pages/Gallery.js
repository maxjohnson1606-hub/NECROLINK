import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, X } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'match', label: 'Match Screenshots' },
  { value: 'mvp', label: 'MVP Moments' },
  { value: 'team', label: 'Team Highlights' },
  { value: 'event', label: 'Event Memories' },
];

const CATEGORY_COLORS = {
  match: 'border-neon-blue text-neon-blue',
  mvp: 'border-neon-red text-neon-red',
  team: 'border-neon-purple text-neon-purple',
  event: 'border-yellow-400 text-yellow-400',
};

export const Gallery = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    try {
      const { data } = await axios.get(`${API}/gallery`);
      setItems(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = filter === 'all' ? items : items.filter((i) => i.category === filter);

  return (
    <div className="min-h-screen bg-darknet-bg py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-darknet-terminal border-2 border-neon-purple flex items-center justify-center border-glow-purple">
              <ImageIcon className="w-8 h-8 text-neon-purple" />
            </div>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase mb-4 neon-glow-purple" data-testid="gallery-title">
            Gallery
          </h1>
          <p className="font-body text-lg text-text-secondary tracking-wide">
            Match screenshots, MVP moments, and team memories
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              data-testid={`gallery-filter-${cat.value}`}
              className={`px-4 py-2 font-body text-xs uppercase tracking-wider border transition-all ${
                filter === cat.value
                  ? 'bg-neon-purple/20 border-neon-purple text-neon-purple'
                  : 'border-border-DEFAULT text-text-secondary hover:border-neon-purple/50 hover:text-neon-purple'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center font-body text-text-muted">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-body text-text-muted" data-testid="no-gallery">No images in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setLightbox(item)}
                className="group relative aspect-square bg-darknet-surface border border-border-DEFAULT overflow-hidden cursor-pointer hover:border-neon-purple/60 transition-all"
                data-testid={`gallery-item-${item.id}`}
              >
                <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  <span className={`self-start px-2 py-0.5 text-[9px] font-body uppercase tracking-[0.2em] border bg-black/60 mb-1 ${CATEGORY_COLORS[item.category] || ''}`}>
                    {item.category}
                  </span>
                  <h3 className="font-heading text-xs font-bold text-white uppercase truncate">{item.title}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4" onClick={() => setLightbox(null)} data-testid="gallery-lightbox">
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white hover:text-neon-red" data-testid="close-lightbox">
            <X className="w-8 h-8" />
          </button>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.image_url} alt={lightbox.title} className="w-full max-h-[80vh] object-contain border border-neon-purple/50" />
            <div className="mt-4 text-center">
              <h3 className="font-heading text-xl font-bold text-neon-purple uppercase">{lightbox.title}</h3>
              {lightbox.description && <p className="font-body text-sm text-text-secondary mt-1">{lightbox.description}</p>}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
