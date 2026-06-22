import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, X, User, Calendar, Newspaper, ShoppingBag } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const SearchModal = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ members: [], events: [], news: [], products: [] });
  const [searching, setSearching] = useState(false);

  const runSearch = useCallback(async (q) => {
    if (q.length < 2) {
      setResults({ members: [], events: [], news: [], products: [] });
      return;
    }
    setSearching(true);
    try {
      const { data } = await axios.get(`${API}/search?q=${encodeURIComponent(q)}`);
      setResults(data);
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(id);
  }, [query, runSearch]);

  useEffect(() => {
    if (!open) { setQuery(''); setResults({ members: [], events: [], news: [], products: [] }); }
  }, [open]);

  if (!open) return null;

  const total = results.members.length + results.events.length + results.news.length + results.products.length;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/80 backdrop-blur-sm pt-20 px-4" onClick={onClose} data-testid="search-modal">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="bg-darknet-surface border border-neon-blue/60 border-glow-blue">
          <div className="flex items-center gap-3 p-4 border-b border-border-DEFAULT">
            <SearchIcon className="w-5 h-5 text-neon-blue" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members, events, news, products..."
              data-testid="search-input"
              className="flex-1 bg-transparent font-body text-base text-white focus:outline-none placeholder:text-text-muted"
            />
            <button onClick={onClose} data-testid="close-search" className="text-text-secondary hover:text-neon-red">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-4">
            {query.length < 2 ? (
              <p className="font-body text-text-muted text-sm text-center py-8">Type at least 2 characters to search...</p>
            ) : searching ? (
              <p className="font-body text-text-muted text-sm text-center py-8">Searching...</p>
            ) : total === 0 ? (
              <p className="font-body text-text-muted text-sm text-center py-8" data-testid="no-search-results">No results found for &quot;{query}&quot;</p>
            ) : (
              <div className="space-y-4">
                {results.members.length > 0 && (
                  <SearchSection title="Members" icon={User} items={results.members} render={(m) => (
                    <Link to={`/members/${m.game_name}`} key={m.game_name} onClick={onClose} data-testid={`search-member-${m.game_name}`}
                      className="block px-3 py-2 hover:bg-neon-blue/10 border border-border-DEFAULT">
                      <p className="font-heading text-sm text-white">{m.name}</p>
                      <p className="font-body text-xs text-text-muted">{m.game_name} • {m.role} • {m.rank}</p>
                    </Link>
                  )} />
                )}
                {results.events.length > 0 && (
                  <SearchSection title="Events" icon={Calendar} items={results.events} render={(e) => (
                    <Link to="/events" key={e.id} onClick={onClose} data-testid={`search-event-${e.id}`}
                      className="block px-3 py-2 hover:bg-neon-blue/10 border border-border-DEFAULT">
                      <p className="font-heading text-sm text-white">{e.title}</p>
                      <p className="font-body text-xs text-text-muted">{e.category}</p>
                    </Link>
                  )} />
                )}
                {results.news.length > 0 && (
                  <SearchSection title="News" icon={Newspaper} items={results.news} render={(n) => (
                    <Link to="/news" key={n.id} onClick={onClose} data-testid={`search-news-${n.id}`}
                      className="block px-3 py-2 hover:bg-neon-blue/10 border border-border-DEFAULT">
                      <p className="font-heading text-sm text-white">{n.title}</p>
                      <p className="font-body text-xs text-text-muted">{n.category.replace('_', ' ')}</p>
                    </Link>
                  )} />
                )}
                {results.products.length > 0 && (
                  <SearchSection title="Products" icon={ShoppingBag} items={results.products} render={(p) => (
                    <Link to="/store" key={p.id} onClick={onClose} data-testid={`search-product-${p.id}`}
                      className="block px-3 py-2 hover:bg-neon-blue/10 border border-border-DEFAULT">
                      <p className="font-heading text-sm text-white">{p.name}</p>
                      <p className="font-body text-xs text-text-muted">${p.price} • {p.category}</p>
                    </Link>
                  )} />
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const SearchSection = ({ title, icon: Icon, items, render }) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-3 h-3 text-neon-purple" />
      <h3 className="font-heading text-xs uppercase tracking-[0.2em] text-neon-purple">{title} ({items.length})</h3>
    </div>
    <div className="space-y-1">{items.map(render)}</div>
  </div>
);
