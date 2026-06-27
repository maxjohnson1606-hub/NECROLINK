import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, FileText, Megaphone, Plus, Trash2, CheckCircle, XCircle,
  Calendar, Newspaper, ShoppingBag, BarChart3, Edit, Upload, Package, Pin,
  Image as ImageIcon, UserCog, Shield, Key, X, Save, AlertTriangle,
  MessageCircle, RefreshCw, Search
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EVENT_CATEGORIES = [
  'Friday Night Clash', 'Sunday Championship', 'Rank Push Night', 'Birthday Parties',
  'Voice Chat Hangouts', 'Giveaways', 'Last Survivor Challenge', 'King of the Lane',
  'Mystery Hero Challenge', 'Speedrun Victory Challenge', 'NECROLINK Dark Cup',
  'Halloween Events', 'Winter Tournament', 'New Year Tournament',
];

const NEWS_CATEGORIES = [
  'patch_notes', 'new_heroes', 'hero_revamps', 'new_skins',
  'events', 'tournaments', 'mlbb_esports', 'collaborations',
  'game_updates', 'community_news'
];
const PRODUCT_CATEGORIES = {
  merchandise: ['jersey', 'hoodie', 'tshirt', 'mousepad', 'sticker', 'keychain'],
  topup: ['diamonds', 'weekly_pass', 'starlight', 'event_pass'],
};

// Image upload component
const ImageUploader = ({ value, onChange, testId }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large (max 5MB)');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await axios.post(`${API}/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onChange(`${process.env.REACT_APP_BACKEND_URL}${data.url}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Image URL (paste or upload)"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          data-testid={`${testId}-url`}
          className="flex-1 bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-xs text-white focus:border-neon-blue focus:outline-none"
        />
        <label className="px-3 py-2 bg-neon-purple/20 border border-neon-purple text-neon-purple font-body text-xs uppercase cursor-pointer hover:bg-neon-purple/30 flex items-center gap-1">
          <Upload className="w-3 h-3" />
          {uploading ? '...' : 'Upload'}
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" data-testid={`${testId}-file`} />
        </label>
      </div>
      {error && <p className="font-body text-xs text-neon-red">{error}</p>}
      {value && <img src={value} alt="Preview" className="h-20 object-contain border border-border-DEFAULT" />}
    </div>
  );
};

// =============== EVENTS TAB ===============
const EventsTab = () => {
  const [events, setEvents] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const initialForm = {
    title: '', description: '', category: EVENT_CATEGORIES[0],
    event_date: '', location: 'Online', banner_url: '', status: 'upcoming',
    max_participants: '', prize_pool: ''
  };
  const [form, setForm] = useState(initialForm);

  const fetchEvents = async () => {
    try {
      const { data } = await axios.get(`${API}/events`);
      setEvents(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        max_participants: form.max_participants ? parseInt(form.max_participants) : null,
        event_date: new Date(form.event_date).toISOString(),
      };
      if (editing) {
        await axios.put(`${API}/events/${editing}`, payload, { withCredentials: true });
      } else {
        await axios.post(`${API}/events`, payload, { withCredentials: true });
      }
      setForm(initialForm);
      setEditing(null);
      setShowForm(false);
      fetchEvents();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleEdit = (event) => {
    setForm({
      title: event.title,
      description: event.description,
      category: event.category,
      event_date: new Date(event.event_date).toISOString().slice(0, 16),
      location: event.location,
      banner_url: event.banner_url || '',
      status: event.status,
      max_participants: event.max_participants || '',
      prize_pool: event.prize_pool || '',
    });
    setEditing(event.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    await axios.delete(`${API}/events/${id}`, { withCredentials: true });
    fetchEvents();
  };

  return (
    <div data-testid="events-tab-content">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-xl font-bold text-neon-purple uppercase">Events ({events.length})</h2>
        <button
          onClick={() => { setShowForm(!showForm); setEditing(null); setForm(initialForm); }}
          data-testid="new-event-btn"
          className="flex items-center gap-2 px-4 py-2 bg-neon-purple border border-neon-purple text-white font-body text-xs uppercase tracking-wider hover:shadow-[0_0_15px_rgba(176,38,255,0.5)]"
        >
          <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'New Event'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-darknet-surface border border-neon-purple/50 p-5 mb-6 space-y-3" data-testid="event-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" placeholder="Title *" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              data-testid="event-title-input"
              className="bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              data-testid="event-category-select"
              className="bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none">
              {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="datetime-local" required value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              data-testid="event-date-input"
              className="bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none" />
            <input type="text" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none" />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              data-testid="event-status-select"
              className="bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none">
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
            <input type="number" placeholder="Max Participants" value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: e.target.value })}
              className="bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none" />
            <input type="text" placeholder="Prize Pool" value={form.prize_pool} onChange={(e) => setForm({ ...form, prize_pool: e.target.value })}
              className="bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none md:col-span-2" />
          </div>
          <textarea placeholder="Description *" required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            data-testid="event-description-input"
            className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none resize-none" />

          <div>
            <label className="font-body text-xs text-text-muted mb-1 block uppercase tracking-wider">Banner Image</label>
            <ImageUploader value={form.banner_url} onChange={(url) => setForm({ ...form, banner_url: url })} testId="event-banner" />
          </div>

          <button type="submit" data-testid="save-event-btn" className="px-6 py-2 bg-neon-red border border-neon-red text-white font-body text-xs uppercase tracking-wider hover:shadow-[0_0_15px_rgba(255,0,60,0.5)]">
            {editing ? 'Update Event' : 'Create Event'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="bg-darknet-surface border border-border-DEFAULT p-4 flex items-center justify-between gap-3" data-testid={`admin-event-${event.id}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`px-2 py-0.5 text-[10px] font-body uppercase tracking-wider border ${
                  event.status === 'ongoing' ? 'border-neon-red text-neon-red' :
                  event.status === 'upcoming' ? 'border-neon-blue text-neon-blue' :
                  'border-text-muted text-text-muted'
                }`}>{event.status}</span>
                <span className="font-body text-[10px] text-text-muted">{event.category}</span>
              </div>
              <h3 className="font-heading text-sm font-bold text-white uppercase">{event.title}</h3>
              <p className="font-body text-xs text-text-muted">{new Date(event.event_date).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(event)} data-testid={`edit-event-${event.id}`} className="p-2 text-neon-blue hover:bg-neon-blue/10">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(event.id)} data-testid={`delete-event-${event.id}`} className="p-2 text-neon-red hover:bg-neon-red/10">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============== NEWS TAB ===============
const NewsTab = () => {
  const [news, setNews] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const initialForm = { title: '', content: '', category: 'patch_notes', image_url: '', source_url: '', is_pinned: false, is_featured: false, is_published: true };
  const [form, setForm] = useState(initialForm);

  const fetchNews = async () => {
    const { data } = await axios.get(`${API}/news`);
    setNews(data);
  };
  useEffect(() => { fetchNews(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) await axios.put(`${API}/news/${editing}`, form, { withCredentials: true });
      else await axios.post(`${API}/news`, form, { withCredentials: true });
      setForm(initialForm);
      setEditing(null);
      setShowForm(false);
      fetchNews();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleEdit = (item) => {
    setForm({
      title: item.title, content: item.content, category: item.category,
      image_url: item.image_url || '', source_url: item.source_url || '',
      is_pinned: item.is_pinned, is_featured: item.is_featured || false, is_published: item.is_published
    });
    setEditing(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this article?')) return;
    await axios.delete(`${API}/news/${id}`, { withCredentials: true });
    fetchNews();
  };

  return (
    <div data-testid="news-tab-content">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-xl font-bold text-neon-blue uppercase">News ({news.length})</h2>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(initialForm); }}
          data-testid="new-news-btn"
          className="flex items-center gap-2 px-4 py-2 bg-neon-blue border border-neon-blue text-darknet-terminal font-body text-xs uppercase tracking-wider hover:shadow-[0_0_15px_rgba(0,229,255,0.5)]">
          <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'New Article'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-darknet-surface border border-neon-blue/50 p-5 mb-6 space-y-3" data-testid="news-form">
          <input type="text" placeholder="Title *" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            data-testid="news-title-input"
            className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none" />
          <textarea placeholder="Content *" required rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
            data-testid="news-content-input"
            className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none resize-none" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              data-testid="news-category-select"
              className="bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none">
              {NEWS_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
            <input type="url" placeholder="Source URL (optional)" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })}
              className="bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none" />
          </div>

          <div>
            <label className="font-body text-xs text-text-muted mb-1 block uppercase tracking-wider">Article Image</label>
            <ImageUploader value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} testId="news-image" />
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 font-body text-xs text-text-secondary cursor-pointer">
              <input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} data-testid="news-pinned-checkbox" />
              📌 Pin Article
            </label>
            <label className="flex items-center gap-2 font-body text-xs text-text-secondary cursor-pointer">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} data-testid="news-featured-checkbox" />
              ⭐ Feature on Homepage
            </label>
            <label className="flex items-center gap-2 font-body text-xs text-text-secondary cursor-pointer">
              <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} data-testid="news-published-checkbox" />
              ✅ Published
            </label>
          </div>

          <button type="submit" data-testid="save-news-btn" className="px-6 py-2 bg-neon-red border border-neon-red text-white font-body text-xs uppercase tracking-wider">
            {editing ? 'Update Article' : 'Create Article'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {news.map((item) => (
          <div key={item.id} className="bg-darknet-surface border border-border-DEFAULT p-4 flex items-center justify-between gap-3" data-testid={`admin-news-${item.id}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {item.is_pinned && <Pin className="w-3 h-3 text-neon-purple" />}
                <span className="font-body text-[10px] text-text-muted uppercase">{item.category.replace('_', ' ')}</span>
              </div>
              <h3 className="font-heading text-sm font-bold text-white uppercase">{item.title}</h3>
              <p className="font-body text-xs text-text-muted line-clamp-1">{item.content}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(item)} data-testid={`edit-news-${item.id}`} className="p-2 text-neon-blue hover:bg-neon-blue/10"><Edit className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(item.id)} data-testid={`delete-news-${item.id}`} className="p-2 text-neon-red hover:bg-neon-red/10"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============== PRODUCTS TAB ===============
const ProductsTab = () => {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const initialForm = { name: '', description: '', price: 0, category: 'diamonds', section: 'topup', image_url: '', is_active: true, stock: '' };
  const [form, setForm] = useState(initialForm);

  const fetchProducts = async () => {
    const { data } = await axios.get(`${API}/products`);
    setProducts(data);
  };
  useEffect(() => { fetchProducts(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, price: parseFloat(form.price), stock: form.stock ? parseInt(form.stock) : null };
      if (editing) await axios.put(`${API}/products/${editing}`, payload, { withCredentials: true });
      else await axios.post(`${API}/products`, payload, { withCredentials: true });
      setForm(initialForm);
      setEditing(null);
      setShowForm(false);
      fetchProducts();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleEdit = (p) => {
    setForm({
      name: p.name, description: p.description, price: p.price, category: p.category,
      section: p.section, image_url: p.image_url || '', is_active: p.is_active, stock: p.stock || ''
    });
    setEditing(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await axios.delete(`${API}/products/${id}`, { withCredentials: true });
    fetchProducts();
  };

  return (
    <div data-testid="products-tab-content">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-xl font-bold text-neon-red uppercase">Products ({products.length})</h2>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(initialForm); }}
          data-testid="new-product-btn"
          className="flex items-center gap-2 px-4 py-2 bg-neon-red border border-neon-red text-white font-body text-xs uppercase tracking-wider hover:shadow-[0_0_15px_rgba(255,0,60,0.5)]">
          <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'New Product'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-darknet-surface border border-neon-red/50 p-5 mb-6 space-y-3" data-testid="product-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" placeholder="Product Name *" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="product-name-input"
              className="bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none" />
            <input type="number" step="0.01" placeholder="Price *" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
              data-testid="product-price-input"
              className="bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none" />
            <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value, category: PRODUCT_CATEGORIES[e.target.value][0] })}
              data-testid="product-section-select"
              className="bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none">
              <option value="merchandise">Merchandise</option>
              <option value="topup">MLBB Top-Up</option>
            </select>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              data-testid="product-category-select"
              className="bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none">
              {PRODUCT_CATEGORIES[form.section].map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
            <input type="number" placeholder="Stock (optional)" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none md:col-span-2" />
          </div>
          <textarea placeholder="Description *" required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            data-testid="product-description-input"
            className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none resize-none" />

          <div>
            <label className="font-body text-xs text-text-muted mb-1 block uppercase tracking-wider">Product Image</label>
            <ImageUploader value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} testId="product-image" />
          </div>

          <label className="flex items-center gap-2 font-body text-xs text-text-secondary cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} data-testid="product-active-checkbox" />
            Active (visible in store)
          </label>

          <button type="submit" data-testid="save-product-btn" className="px-6 py-2 bg-neon-purple border border-neon-purple text-white font-body text-xs uppercase tracking-wider">
            {editing ? 'Update Product' : 'Create Product'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {products.map((p) => (
          <div key={p.id} className="bg-darknet-surface border border-border-DEFAULT p-4 flex items-center justify-between gap-3" data-testid={`admin-product-${p.id}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-[10px] font-body uppercase border border-neon-blue text-neon-blue">{p.section}</span>
                <span className="font-body text-[10px] text-text-muted">{p.category.replace('_', ' ')}</span>
              </div>
              <h3 className="font-heading text-sm font-bold text-white uppercase">{p.name}</h3>
              <p className="font-body text-xs text-neon-blue">${p.price} {p.stock !== null && `• Stock: ${p.stock}`}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleEdit(p)} data-testid={`edit-product-${p.id}`} className="p-2 text-neon-blue hover:bg-neon-blue/10"><Edit className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(p.id)} data-testid={`delete-product-${p.id}`} className="p-2 text-neon-red hover:bg-neon-red/10"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============== ORDERS TAB ===============
const OrdersTab = () => {
  const [orders, setOrders] = useState([]);

  const fetchOrders = async () => {
    const { data } = await axios.get(`${API}/orders`, { withCredentials: true });
    setOrders(data);
  };
  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (id, status) => {
    await axios.patch(`${API}/orders/${id}/status?status=${status}`, {}, { withCredentials: true });
    fetchOrders();
  };

  return (
    <div data-testid="orders-tab-content">
      <h2 className="font-heading text-xl font-bold text-neon-blue uppercase mb-6">Orders ({orders.length})</h2>
      <div className="space-y-3">
        {orders.length === 0 ? (
          <p className="font-body text-text-muted">No orders yet.</p>
        ) : orders.map((o) => (
          <div key={o.id} className="bg-darknet-surface border border-border-DEFAULT p-4" data-testid={`admin-order-${o.id}`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-heading text-sm font-bold text-white uppercase">{o.product_name}</h3>
                <p className="font-body text-xs text-neon-blue">${o.total_price} ({o.quantity}x ${o.unit_price})</p>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-body uppercase tracking-wider border ${
                o.status === 'pending' ? 'border-yellow-400 text-yellow-400' :
                o.status === 'completed' ? 'border-neon-blue text-neon-blue' :
                'border-neon-red text-neon-red'
              }`}>{o.status}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-body text-xs text-text-secondary mb-2">
              <p><span className="text-neon-purple">Customer:</span> {o.customer_name} ({o.customer_email})</p>
              {o.customer_phone && <p><span className="text-neon-purple">Phone:</span> {o.customer_phone}</p>}
              {o.game_id && <p><span className="text-neon-purple">Game ID:</span> {o.game_id} ({o.server_id})</p>}
            </div>
            {o.notes && <p className="font-body text-xs text-text-secondary mb-2"><span className="text-neon-purple">Notes:</span> {o.notes}</p>}
            {o.status === 'pending' && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => updateStatus(o.id, 'completed')} data-testid={`complete-order-${o.id}`} className="px-3 py-1 bg-neon-blue/10 border border-neon-blue text-neon-blue font-body text-xs uppercase">Complete</button>
                <button onClick={() => updateStatus(o.id, 'cancelled')} data-testid={`cancel-order-${o.id}`} className="px-3 py-1 bg-neon-red/10 border border-neon-red text-neon-red font-body text-xs uppercase">Cancel</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// =============== REGISTRATIONS TAB ===============
const RegistrationsTab = () => {
  const [regs, setRegs] = useState([]);
  const [events, setEvents] = useState([]);

  const fetchData = async () => {
    const [r, e] = await Promise.all([
      axios.get(`${API}/event-registrations`, { withCredentials: true }),
      axios.get(`${API}/events`),
    ]);
    setRegs(r.data);
    setEvents(e.data);
  };
  useEffect(() => { fetchData(); }, []);

  const getEventTitle = (id) => events.find((e) => e.id === id)?.title || 'Unknown';

  const updateStatus = async (id, status) => {
    await axios.patch(`${API}/event-registrations/${id}/status?status=${status}`, {}, { withCredentials: true });
    fetchData();
  };

  return (
    <div data-testid="registrations-tab-content">
      <h2 className="font-heading text-xl font-bold text-neon-purple uppercase mb-6">Event Registrations ({regs.length})</h2>
      <div className="space-y-3">
        {regs.length === 0 ? (
          <p className="font-body text-text-muted">No registrations yet.</p>
        ) : regs.map((r) => (
          <div key={r.id} className="bg-darknet-surface border border-border-DEFAULT p-4" data-testid={`admin-reg-${r.id}`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-heading text-sm font-bold text-white uppercase">{r.name}</h3>
                <p className="font-body text-xs text-neon-blue">Event: {getEventTitle(r.event_id)}</p>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-body uppercase tracking-wider border ${
                r.status === 'pending' ? 'border-yellow-400 text-yellow-400' :
                r.status === 'approved' ? 'border-neon-blue text-neon-blue' :
                'border-neon-red text-neon-red'
              }`}>{r.status}</span>
            </div>
            <p className="font-body text-xs text-text-secondary">{r.email} • IGN: {r.game_name}</p>
            {r.notes && <p className="font-body text-xs text-text-muted mt-1">&quot;{r.notes}&quot;</p>}
            {r.status === 'pending' && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => updateStatus(r.id, 'approved')} data-testid={`approve-reg-${r.id}`} className="px-3 py-1 bg-neon-blue/10 border border-neon-blue text-neon-blue font-body text-xs uppercase">Approve</button>
                <button onClick={() => updateStatus(r.id, 'rejected')} data-testid={`reject-reg-${r.id}`} className="px-3 py-1 bg-neon-red/10 border border-neon-red text-neon-red font-body text-xs uppercase">Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// =============== APPLICATIONS TAB ===============
const ApplicationsTab = () => {
  const [applications, setApplications] = useState([]);

  const fetchApps = async () => {
    const { data } = await axios.get(`${API}/applications`, { withCredentials: true });
    setApplications(data);
  };
  useEffect(() => { fetchApps(); }, []);

  const updateStatus = async (email, status) => {
    await axios.patch(`${API}/applications/${email}/status?status=${status}`, {}, { withCredentials: true });
    fetchApps();
  };

  return (
    <div data-testid="applications-tab-content">
      <h2 className="font-heading text-xl font-bold text-neon-blue uppercase mb-6">Applications ({applications.length})</h2>
      <div className="space-y-3">
        {applications.length === 0 ? (
          <p className="font-body text-text-muted" data-testid="no-applications">No applications yet.</p>
        ) : applications.map((app, idx) => (
          <div key={idx} className="bg-darknet-surface border border-border-DEFAULT p-4" data-testid={`application-${idx}`}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-heading text-sm font-bold text-white uppercase">{app.name}</h3>
              <span className={`px-2 py-0.5 text-[10px] font-body uppercase tracking-wider border ${
                app.status === 'pending' ? 'border-yellow-400 text-yellow-400' :
                app.status === 'approved' ? 'border-neon-blue text-neon-blue' :
                'border-neon-red text-neon-red'
              }`}>{app.status}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 font-body text-xs text-text-secondary mb-2">
              <p><span className="text-neon-purple">Email:</span> {app.email}</p>
              <p><span className="text-neon-purple">IGN:</span> {app.game_name}</p>
              <p><span className="text-neon-purple">Role:</span> {app.preferred_role}</p>
              <p><span className="text-neon-purple">Exp:</span> {app.experience}</p>
            </div>
            <p className="font-body text-xs text-text-secondary"><span className="text-neon-purple">Reason:</span> {app.reason}</p>
            {app.status === 'pending' && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => updateStatus(app.email, 'approved')} data-testid={`approve-app-${idx}`} className="px-3 py-1 bg-neon-blue/10 border border-neon-blue text-neon-blue font-body text-xs uppercase flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approve</button>
                <button onClick={() => updateStatus(app.email, 'rejected')} data-testid={`reject-app-${idx}`} className="px-3 py-1 bg-neon-red/10 border border-neon-red text-neon-red font-body text-xs uppercase flex items-center gap-1"><XCircle className="w-3 h-3" /> Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// =============== ANNOUNCEMENTS TAB ===============
const AnnouncementsTab = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', type: 'general' });

  const fetchData = async () => {
    const { data } = await axios.get(`${API}/announcements`);
    setAnnouncements(data);
  };
  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post(`${API}/announcements`, form, { withCredentials: true });
    setForm({ title: '', content: '', type: 'general' });
    fetchData();
  };

  const handleDelete = async (title) => {
    await axios.delete(`${API}/announcements/${title}`, { withCredentials: true });
    fetchData();
  };

  return (
    <div data-testid="announcements-tab-content">
      <h2 className="font-heading text-xl font-bold text-neon-purple uppercase mb-6">Announcements</h2>

      <form onSubmit={handleSubmit} className="bg-darknet-surface border border-neon-purple/50 p-5 mb-6 space-y-3">
        <input type="text" required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          data-testid="announcement-title"
          className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none" />
        <textarea required placeholder="Content" rows={3} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
          data-testid="announcement-content"
          className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none resize-none" />
        <div className="flex gap-3">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            data-testid="announcement-type"
            className="bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none">
            <option value="general">General</option>
            <option value="event">Event</option>
            <option value="recruitment">Recruitment</option>
            <option value="tournament">Tournament</option>
          </select>
          <button type="submit" data-testid="create-announcement-btn" className="px-6 py-2 bg-neon-purple border border-neon-purple text-white font-body text-xs uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4" /> Post
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {announcements.map((a, idx) => (
          <div key={idx} className="bg-darknet-surface border border-border-DEFAULT p-4 flex justify-between items-start" data-testid={`announcement-item-${idx}`}>
            <div>
              <h3 className="font-heading text-sm font-bold text-white uppercase">{a.title}</h3>
              <p className="font-body text-xs text-text-secondary">{a.content}</p>
            </div>
            <button onClick={() => handleDelete(a.title)} data-testid={`delete-announcement-${idx}`} className="p-2 text-neon-red hover:bg-neon-red/10"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============== MAIN DASHBOARD ===============

// =============== GALLERY TAB ===============
const GalleryTab = () => {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const initialForm = { title: '', description: '', image_url: '', category: 'match' };
  const [form, setForm] = useState(initialForm);

  const fetchGallery = async () => {
    const { data } = await axios.get(`${API}/gallery`);
    setItems(data);
  };
  useEffect(() => { fetchGallery(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/gallery`, form, { withCredentials: true });
      setForm(initialForm);
      setShowForm(false);
      fetchGallery();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this image?')) return;
    await axios.delete(`${API}/gallery/${id}`, { withCredentials: true });
    fetchGallery();
  };

  return (
    <div data-testid="gallery-tab-content">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-xl font-bold text-neon-purple uppercase">Gallery ({items.length})</h2>
        <button onClick={() => setShowForm(!showForm)} data-testid="new-gallery-btn"
          className="flex items-center gap-2 px-4 py-2 bg-neon-purple border border-neon-purple text-white font-body text-xs uppercase tracking-wider">
          <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'Add Image'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-darknet-surface border border-neon-purple/50 p-5 mb-6 space-y-3" data-testid="gallery-form">
          <input type="text" placeholder="Title *" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            data-testid="gallery-title-input"
            className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none" />
          <textarea placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none resize-none" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            data-testid="gallery-category-select"
            className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none">
            <option value="match">Match Screenshot</option>
            <option value="mvp">MVP Moment</option>
            <option value="team">Team Highlight</option>
            <option value="event">Event Memory</option>
          </select>
          <div>
            <label className="font-body text-xs text-text-muted mb-1 block uppercase tracking-wider">Image *</label>
            <ImageUploader value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} testId="gallery-image" />
          </div>
          <button type="submit" data-testid="save-gallery-btn" className="px-6 py-2 bg-neon-red border border-neon-red text-white font-body text-xs uppercase tracking-wider">
            Add to Gallery
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((item) => (
          <div key={item.id} className="bg-darknet-surface border border-border-DEFAULT relative group" data-testid={`admin-gallery-${item.id}`}>
            <img src={item.image_url} alt={item.title} className="w-full aspect-square object-cover" />
            <div className="p-2">
              <p className="font-body text-xs text-white truncate">{item.title}</p>
              <p className="font-body text-[10px] text-text-muted uppercase">{item.category}</p>
            </div>
            <button onClick={() => handleDelete(item.id)} data-testid={`delete-gallery-${item.id}`}
              className="absolute top-1 right-1 p-1 bg-black/70 text-neon-red opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============== USERS TAB (OWNER ONLY) ===============
const ALL_PERMISSIONS = [
  { key: 'manage_applications', label: 'Manage Applications', desc: 'Review and approve/reject join requests' },
  { key: 'manage_events', label: 'Manage Events', desc: 'Create, edit, and delete clan events' },
  { key: 'manage_registrations', label: 'Manage Registrations', desc: 'Approve event registrations' },
  { key: 'manage_news', label: 'Manage News', desc: 'Write and publish news articles' },
  { key: 'manage_gallery', label: 'Manage Gallery', desc: 'Upload and manage gallery images' },
  { key: 'manage_products', label: 'Manage Products', desc: 'Add and manage store products' },
  { key: 'manage_orders', label: 'Manage Orders', desc: 'Process and fulfill orders' },
  { key: 'manage_announcements', label: 'Manage Announcements', desc: 'Post clan announcements' },
  { key: 'manage_members', label: 'Manage Members', desc: 'Edit member profiles and ranks' },
  { key: 'moderate_chat', label: 'Moderate Chat', desc: 'Delete chat messages, access staff chat' },
];

const PermissionsModal = ({ user: targetUser, onClose, onSave }) => {
  const defaultPerms = ALL_PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.key]: true }), {});
  const [perms, setPerms] = useState({ ...defaultPerms, ...(targetUser.permissions || {}) });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const toggle = (key) => setPerms(p => ({ ...p, [key]: !p[key] }));
  const setAll = (val) => setPerms(ALL_PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.key]: val }), {}));

  const save = async () => {
    setSaving(true);
    try {
      await axios.patch(`${API}/users/${targetUser.id}/permissions`, perms, { withCredentials: true });
      setMsg('Permissions saved!');
      onSave(targetUser.id, perms);
      setTimeout(onClose, 1200);
    } catch (err) {
      setMsg('Error: ' + (err.response?.data?.detail || err.message));
    } finally { setSaving(false); }
  };

  const enabledCount = Object.values(perms).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-darknet-bg border border-neon-purple/50 w-full max-w-lg shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neon-purple/30 bg-neon-purple/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-neon-purple/20 border border-neon-purple flex items-center justify-center">
              <Key className="w-4 h-4 text-neon-purple" />
            </div>
            <div>
              <p className="font-heading text-sm font-bold text-neon-purple uppercase">Admin Privileges</p>
              <p className="font-body text-xs text-text-muted">{targetUser.name} · {enabledCount}/{ALL_PERMISSIONS.length} enabled</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-2 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="font-body text-xs text-text-muted uppercase tracking-wider">Toggle permissions for this admin</p>
            <div className="flex gap-2">
              <button onClick={() => setAll(true)} className="font-body text-[10px] text-neon-blue hover:underline uppercase">All On</button>
              <span className="text-border-DEFAULT">|</span>
              <button onClick={() => setAll(false)} className="font-body text-[10px] text-neon-red hover:underline uppercase">All Off</button>
            </div>
          </div>
          {ALL_PERMISSIONS.map((p) => (
            <label key={p.key} className={`flex items-start gap-3 p-3 cursor-pointer border transition-all ${
              perms[p.key] ? 'border-neon-purple/40 bg-neon-purple/5' : 'border-border-DEFAULT bg-darknet-surface opacity-60'
            }`}>
              <div className="mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={!!perms[p.key]}
                  onChange={() => toggle(p.key)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 border flex items-center justify-center transition-all ${
                  perms[p.key] ? 'bg-neon-purple border-neon-purple' : 'border-border-DEFAULT bg-darknet-terminal'
                }`}>
                  {perms[p.key] && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-body text-xs font-bold uppercase tracking-wider ${perms[p.key] ? 'text-white' : 'text-text-muted'}`}>
                  {p.label}
                </p>
                <p className="font-body text-[10px] text-text-muted mt-0.5">{p.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-neon-purple/30 flex items-center justify-between gap-3">
          {msg ? (
            <p className={`font-body text-xs ${msg.startsWith('Error') ? 'text-neon-red' : 'text-neon-blue'}`}>{msg}</p>
          ) : (
            <p className="font-body text-[10px] text-text-muted">
              <AlertTriangle className="w-3 h-3 inline mr-1 text-yellow-400" />
              Changes apply immediately on next login
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 border border-border-DEFAULT text-text-muted font-body text-xs uppercase hover:text-white transition-colors">
              Cancel
            </button>
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-neon-purple/10 border border-neon-purple text-neon-purple font-body text-xs uppercase tracking-wider hover:bg-neon-purple/20 disabled:opacity-50 transition-all">
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Privileges'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permTarget, setPermTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get(`${API}/users`, { withCredentials: true });
      setUsers(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchUsers(); }, []);

  const updateRole = async (id, role) => {
    try {
      await axios.patch(`${API}/users/${id}/role`, { role }, { withCredentials: true });
      fetchUsers();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message));
    }
  };

  const deleteUser = async (id, name) => {
    if (!window.confirm(`Permanently delete ${name}? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/users/${id}`, { withCredentials: true });
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handlePermsSave = (id, newPerms) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, permissions: newPerms } : u));
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const roleCount = { owner: 0, admin: 0, member: 0 };
  users.forEach(u => { if (roleCount[u.role] !== undefined) roleCount[u.role]++; });

  return (
    <div data-testid="users-tab-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-heading text-xl font-bold text-neon-red uppercase flex items-center gap-2">
            <UserCog className="w-5 h-5" /> User Management
          </h2>
          <div className="flex gap-3 mt-1">
            {[['all', 'All', users.length], ['owner', 'Owners', roleCount.owner], ['admin', 'Admins', roleCount.admin], ['member', 'Members', roleCount.member]].map(([val, label, count]) => (
              <button key={val} onClick={() => setFilterRole(val)}
                className={`font-body text-[10px] uppercase tracking-wider transition-colors ${filterRole === val ? 'text-neon-red' : 'text-text-muted hover:text-white'}`}>
                {label} <span className="opacity-70">({count})</span>
              </button>
            ))}
          </div>
        </div>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-64 bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-xs text-white focus:border-neon-red focus:outline-none placeholder:text-text-muted/50"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-darknet-surface border border-border-DEFAULT animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const isMe = u.id === currentUser?._id || u.id === currentUser?.id;
            const permCount = u.permissions ? Object.values(u.permissions).filter(Boolean).length : 0;
            return (
              <motion.div
                key={u.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border p-4 transition-all ${
                  u.role === 'owner' ? 'border-neon-red/40 bg-neon-red/5' :
                  u.role === 'admin' ? 'border-neon-purple/30 bg-neon-purple/5' :
                  'border-border-DEFAULT bg-darknet-surface'
                }`}
                data-testid={`admin-user-${u.id}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Avatar & Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 flex items-center justify-center text-sm font-bold border flex-shrink-0 ${
                      u.role === 'owner' ? 'bg-neon-red/20 border-neon-red text-neon-red' :
                      u.role === 'admin' ? 'bg-neon-purple/20 border-neon-purple text-neon-purple' :
                      'bg-neon-blue/20 border-neon-blue text-neon-blue'
                    }`}>
                      {(u.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-heading text-sm font-bold text-white uppercase truncate">{u.name || 'Unnamed'}</h3>
                        <span className={`px-2 py-0.5 text-[9px] font-body uppercase tracking-wider border flex-shrink-0 ${
                          u.role === 'owner' ? 'border-neon-red text-neon-red bg-neon-red/10' :
                          u.role === 'admin' ? 'border-neon-purple text-neon-purple bg-neon-purple/10' :
                          'border-neon-blue text-neon-blue bg-neon-blue/10'
                        }`}>{u.role}</span>
                        {isMe && <span className="px-2 py-0.5 text-[9px] font-body uppercase tracking-wider border border-yellow-400 text-yellow-400 bg-yellow-400/10">You</span>}
                      </div>
                      <p className="font-body text-xs text-text-secondary truncate">{u.email}</p>
                      {u.game_name && <p className="font-body text-[10px] text-text-muted">IGN: {u.game_name}</p>}
                      {u.role === 'admin' && (
                        <p className="font-body text-[10px] text-neon-purple/70 mt-0.5">
                          {u.permissions ? `${permCount}/${ALL_PERMISSIONS.length} privileges enabled` : 'Full access (default)'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!isMe && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Permissions editor — only for admins */}
                      {u.role === 'admin' && (
                        <button
                          onClick={() => setPermTarget(u)}
                          title="Edit admin privileges"
                          className="flex items-center gap-1.5 px-3 py-2 border border-neon-purple/50 text-neon-purple font-body text-xs uppercase hover:bg-neon-purple/10 transition-colors"
                        >
                          <Key className="w-3.5 h-3.5" /> Privileges
                        </button>
                      )}
                      <select
                        value={u.role}
                        onChange={(e) => updateRole(u.id, e.target.value)}
                        data-testid={`role-select-${u.id}`}
                        className="bg-darknet-terminal border border-border-DEFAULT px-2 py-2 font-body text-xs text-white focus:border-neon-blue focus:outline-none"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </select>
                      <button
                        onClick={() => deleteUser(u.id, u.name)}
                        data-testid={`delete-user-${u.id}`}
                        title="Delete user"
                        className="p-2 border border-neon-red/30 text-neon-red hover:bg-neon-red/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-30" />
              <p className="font-body text-sm text-text-muted">No users found</p>
            </div>
          )}
        </div>
      )}

      {/* Permissions Modal */}
      <AnimatePresence>
        {permTarget && (
          <PermissionsModal
            user={permTarget}
            onClose={() => setPermTarget(null)}
            onSave={handlePermsSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// =============== SETTINGS TAB (OWNER ONLY) ===============
const SettingsTab = () => {
  const [discord, setDiscord] = useState({ invite_url: '', server_id: '', enabled: false });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    axios.get(`${API}/discord-settings`).then(r => setDiscord(r.data)).catch(() => {});
  }, []);

  const saveDiscord = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${API}/discord-settings`, discord, { withCredentials: true });
      setMsg('Discord settings saved!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg('Error: ' + (err.response?.data?.detail || err.message));
    } finally { setSaving(false); }
  };

  return (
    <div data-testid="settings-tab-content" className="space-y-6">
      <div className="bg-darknet-surface border border-neon-purple/50 p-6">
        <h2 className="font-heading text-lg font-bold text-neon-purple uppercase mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4" /> Discord Integration
        </h2>
        {msg && <div className={`p-3 mb-4 font-body text-sm border ${msg.startsWith('Error') ? 'border-neon-red text-neon-red bg-neon-red/10' : 'border-neon-blue text-neon-blue bg-neon-blue/10'}`}>{msg}</div>}
        <form onSubmit={saveDiscord} className="space-y-3">
          <div>
            <label className="font-body text-xs text-text-muted mb-1 block uppercase tracking-wider">Discord Invite URL</label>
            <input type="url" value={discord.invite_url} onChange={(e) => setDiscord({ ...discord, invite_url: e.target.value })}
              placeholder="https://discord.gg/yourclan"
              className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none" />
          </div>
          <div>
            <label className="font-body text-xs text-text-muted mb-1 block uppercase tracking-wider">Discord Server ID</label>
            <input type="text" value={discord.server_id} onChange={(e) => setDiscord({ ...discord, server_id: e.target.value })}
              placeholder="Your Discord server ID"
              className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none" />
          </div>
          <label className="flex items-center gap-2 font-body text-xs text-text-secondary cursor-pointer">
            <input type="checkbox" checked={discord.enabled} onChange={(e) => setDiscord({ ...discord, enabled: e.target.checked })} />
            Show Discord widget on homepage
          </label>
          <button type="submit" disabled={saving} className="px-6 py-2 bg-neon-purple border border-neon-purple text-white font-body text-xs uppercase tracking-wider disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Discord Settings'}
          </button>
        </form>
      </div>

      <div className="bg-darknet-surface border border-neon-red/30 p-6">
        <h2 className="font-heading text-lg font-bold text-neon-red uppercase mb-3 flex items-center gap-2">
          <UserCog className="w-4 h-4" /> Owner Info
        </h2>
        <div className="space-y-2 font-body text-sm text-text-secondary">
          <p>You have <span className="text-neon-red font-bold">Owner</span> privileges — the highest access level.</p>
          <p>Owner-only capabilities:</p>
          <ul className="list-disc list-inside space-y-1 text-xs text-text-muted ml-2">
            <li>Promote/demote members to Admin or Owner</li>
            <li>Delete user accounts</li>
            <li>Access the Users tab</li>
            <li>Configure site settings</li>
            <li>Set Discord integration</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// =============== CHAT MANAGEMENT TAB ===============
const ROLE_BADGE_COLORS = {
  owner: 'bg-neon-red/20 text-neon-red border-neon-red/40',
  admin: 'bg-neon-purple/20 text-neon-purple border-neon-purple/40',
  member: 'bg-neon-blue/20 text-neon-blue border-neon-blue/40',
};

const ChatManagementTab = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState('all');
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');
  const [deleting, setDeleting] = useState(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/chat/all?limit=150`, { withCredentials: true });
      setMessages(data);
    } catch (e) {
      setMsg('Failed to load messages: ' + (e.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const handleDelete = async (m) => {
    if (!m.id || !window.confirm(`Delete message from ${m.user_name}?`)) return;
    setDeleting(m.id);
    try {
      await axios.delete(`${API}/chat/messages/${m.id}`, { withCredentials: true });
      setMessages(prev => prev.filter(x => x.id !== m.id));
      setMsg('Message deleted.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg('Error: ' + (e.response?.data?.detail || e.message));
    } finally {
      setDeleting(null); }
  };

  const handleClear = async (channel) => {
    const label = channel === 'all' ? 'ALL channels' : `#${channel}`;
    if (!window.confirm(`Clear all messages in ${label}? This cannot be undone.`)) return;
    try {
      const { data } = await axios.delete(`${API}/chat/clear/${channel}`, { withCredentials: true });
      setMsg(data.message);
      setTimeout(() => setMsg(''), 4000);
      fetchMessages();
    } catch (e) {
      setMsg('Error: ' + (e.response?.data?.detail || e.message));
    }
  };

  const filtered = messages.filter(m => {
    const chanOk = filterChannel === 'all' || m.channel === filterChannel;
    const searchOk = !search || m.message?.toLowerCase().includes(search.toLowerCase()) || m.user_name?.toLowerCase().includes(search.toLowerCase());
    return chanOk && searchOk;
  });

  const memberCount = messages.filter(m => m.channel === 'members').length;
  const staffCount = messages.filter(m => m.channel === 'staff').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-bold text-neon-blue uppercase flex items-center gap-2">
          <MessageCircle className="w-5 h-5" /> Chat Management
        </h2>
        <button onClick={fetchMessages} className="flex items-center gap-1.5 px-3 py-1.5 border border-border-DEFAULT text-text-muted hover:text-neon-blue hover:border-neon-blue font-body text-xs uppercase transition-colors">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Messages', value: messages.length, color: 'text-neon-blue', border: 'border-neon-blue/30' },
          { label: '#members', value: memberCount, color: 'text-neon-blue', border: 'border-neon-blue/30' },
          { label: '#staff-only', value: staffCount, color: 'text-neon-red', border: 'border-neon-red/30' },
        ].map(s => (
          <div key={s.label} className={`bg-darknet-surface border ${s.border} p-4 text-center`}>
            <p className={`font-heading text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="font-body text-[10px] text-text-muted uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {msg && (
        <div className={`p-3 font-body text-xs border ${msg.startsWith('Error') ? 'border-neon-red text-neon-red bg-neon-red/10' : 'border-neon-blue text-neon-blue bg-neon-blue/10'}`}>
          {msg}
        </div>
      )}

      {/* Filters + Clear Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-1">
          {['all', 'members', 'staff'].map(c => (
            <button key={c} onClick={() => setFilterChannel(c)}
              className={`px-3 py-1.5 font-body text-xs uppercase tracking-wider border transition-colors ${filterChannel === c ? 'border-neon-blue text-neon-blue bg-neon-blue/10' : 'border-border-DEFAULT text-text-muted hover:text-white'}`}>
              {c === 'all' ? 'All' : `#${c}`}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search messages or usernames..."
            className="w-full pl-8 pr-3 py-1.5 bg-darknet-terminal border border-border-DEFAULT text-white font-body text-xs focus:border-neon-blue focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          <button onClick={() => handleClear('members')}
            className="px-3 py-1.5 border border-neon-blue/40 text-neon-blue font-body text-xs uppercase hover:bg-neon-blue/10 transition-colors">
            Clear #members
          </button>
          <button onClick={() => handleClear('staff')}
            className="px-3 py-1.5 border border-neon-red/40 text-neon-red font-body text-xs uppercase hover:bg-neon-red/10 transition-colors">
            Clear #staff
          </button>
          <button onClick={() => handleClear('all')}
            className="px-3 py-1.5 bg-neon-red/10 border border-neon-red text-neon-red font-body text-xs uppercase font-bold hover:bg-neon-red/20 transition-colors">
            Clear All
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="bg-darknet-terminal border border-border-DEFAULT">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 font-body text-sm text-text-muted">
            {search || filterChannel !== 'all' ? 'No messages match your filter.' : 'No messages yet.'}
          </div>
        ) : (
          <div className="divide-y divide-border-DEFAULT max-h-[600px] overflow-y-auto">
            {filtered.map(m => (
              <div key={m.id || m.created_at} className="flex items-start gap-3 p-3 hover:bg-white/[0.02] group">
                {/* Channel badge */}
                <span className={`flex-shrink-0 mt-0.5 px-1.5 py-0.5 text-[9px] font-body uppercase border rounded-sm ${m.channel === 'staff' ? 'border-neon-red/40 text-neon-red bg-neon-red/10' : 'border-neon-blue/40 text-neon-blue bg-neon-blue/10'}`}>
                  {m.channel}
                </span>
                {/* Role badge */}
                <span className={`flex-shrink-0 mt-0.5 px-1.5 py-0.5 text-[9px] font-body uppercase border rounded-sm ${ROLE_BADGE_COLORS[m.user_role] || 'border-border-DEFAULT text-text-muted'}`}>
                  {m.user_role}
                </span>
                {/* Author */}
                <span className="flex-shrink-0 font-body text-xs font-bold text-white w-24 truncate mt-0.5">{m.user_name}</span>
                {/* Message */}
                <span className="flex-1 font-body text-xs text-text-secondary break-words">{m.message}</span>
                {/* Time */}
                <span className="flex-shrink-0 font-body text-[10px] text-text-muted mt-0.5">
                  {m.created_at ? new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
                {/* Delete */}
                <button
                  onClick={() => handleDelete(m)}
                  disabled={deleting === m.id}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-neon-red disabled:opacity-30"
                  title="Delete message"
                >
                  {deleting === m.id
                    ? <div className="w-3.5 h-3.5 border border-neon-red border-t-transparent rounded-full animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="font-body text-[10px] text-text-muted">
        Showing {filtered.length} of {messages.length} messages · Newest messages appear at the top · Hover to reveal delete button
      </p>
    </div>
  );
};

// =============== MAIN DASHBOARD ===============
export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${API}/stats`, { withCredentials: true });
      setStats(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const isOwner = user?.role === 'owner';
  const perms = user?.permissions || null;

  // For owner: always all tabs. For admin: filter by permissions (null = full access by default)
  const hasPerm = (key) => isOwner || !perms || perms[key] !== false;

  const allTabs = [
    { id: 'stats', label: 'Overview', icon: BarChart3, perm: null },
    { id: 'applications', label: 'Applications', icon: FileText, badge: stats?.pending_applications, perm: 'manage_applications' },
    { id: 'events', label: 'Events', icon: Calendar, perm: 'manage_events' },
    { id: 'registrations', label: 'Registrations', icon: Users, badge: stats?.pending_registrations, perm: 'manage_registrations' },
    { id: 'news', label: 'News', icon: Newspaper, perm: 'manage_news' },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon, perm: 'manage_gallery' },
    { id: 'products', label: 'Products', icon: ShoppingBag, perm: 'manage_products' },
    { id: 'orders', label: 'Orders', icon: Package, badge: stats?.pending_orders, perm: 'manage_orders' },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, perm: 'manage_announcements' },
    { id: 'chat', label: 'Chat', icon: MessageCircle, perm: 'moderate_chat' },
    ...(isOwner ? [
      { id: 'users', label: 'Users', icon: UserCog, badge: stats?.users, perm: null },
      { id: 'settings', label: 'Settings', icon: Shield, perm: null },
    ] : []),
  ];

  const tabs = allTabs.filter(t => t.perm === null || hasPerm(t.perm));

  const statCards = stats ? [
    { label: 'Total Members', value: stats.members, color: 'text-neon-blue', border: 'border-neon-blue/30', bg: 'bg-neon-blue/5', tab: 'users', testId: 'stat-members' },
    { label: 'Pending Apps', value: stats.pending_applications, color: 'text-yellow-400', border: 'border-yellow-400/30', bg: 'bg-yellow-400/5', tab: 'applications', testId: 'stat-pending-apps' },
    { label: 'Upcoming Events', value: stats.upcoming_events, color: 'text-neon-purple', border: 'border-neon-purple/30', bg: 'bg-neon-purple/5', tab: 'events', testId: 'stat-upcoming-events' },
    { label: 'Ongoing Events', value: stats.ongoing_events, color: 'text-neon-red', border: 'border-neon-red/30', bg: 'bg-neon-red/5', tab: 'events', testId: 'stat-ongoing-events' },
    { label: 'Pending Regs', value: stats.pending_registrations, color: 'text-orange-400', border: 'border-orange-400/30', bg: 'bg-orange-400/5', tab: 'registrations', testId: 'stat-pending-regs' },
    { label: 'Pending Orders', value: stats.pending_orders, color: 'text-neon-red', border: 'border-neon-red/30', bg: 'bg-neon-red/5', tab: 'orders', testId: 'stat-pending-orders' },
    { label: 'News Articles', value: stats.news_articles, color: 'text-neon-purple', border: 'border-neon-purple/30', bg: 'bg-neon-purple/5', tab: 'news', testId: 'stat-news' },
    { label: 'Active Products', value: stats.products, color: 'text-neon-blue', border: 'border-neon-blue/30', bg: 'bg-neon-blue/5', tab: 'products', testId: 'stat-products' },
  ] : [];

  const roleBadge = user?.role === 'owner'
    ? { label: 'Owner', cls: 'border-neon-red text-neon-red bg-neon-red/10' }
    : { label: 'Admin', cls: 'border-neon-purple text-neon-purple bg-neon-purple/10' };

  return (
    <div className="min-h-screen bg-darknet-bg py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-heading text-3xl sm:text-4xl font-black text-neon-purple uppercase tracking-tight" data-testid="admin-dashboard-title">
                {isOwner ? 'Owner' : 'Admin'} Dashboard
              </h1>
              <span className={`px-2 py-0.5 text-[10px] font-body uppercase tracking-widest border ${roleBadge.cls}`}>
                {roleBadge.label}
              </span>
            </div>
            <p className="font-body text-sm text-text-secondary">Welcome back, <span className="text-white">{user?.name}</span></p>
          </div>
          {stats && (
            <div className="flex gap-3 text-center">
              <div className="bg-darknet-surface border border-border-DEFAULT px-4 py-2">
                <p className="font-heading text-xl font-bold text-neon-blue">{stats.members}</p>
                <p className="font-body text-[10px] text-text-muted uppercase">Members</p>
              </div>
              <div className="bg-darknet-surface border border-border-DEFAULT px-4 py-2">
                <p className="font-heading text-xl font-bold text-yellow-400">{stats.pending_applications + stats.pending_registrations + stats.pending_orders}</p>
                <p className="font-body text-[10px] text-text-muted uppercase">Pending</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-6 border-b border-border-DEFAULT pb-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-${tab.id === 'stats' ? 'overview' : tab.id}`}
                className={`flex items-center gap-1.5 px-3 py-2 font-body text-xs uppercase tracking-wider transition-all whitespace-nowrap relative ${
                  activeTab === tab.id
                    ? 'text-neon-blue border-b-2 border-neon-blue -mb-0.5'
                    : 'text-text-muted hover:text-neon-blue'
                }`}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
                {tab.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[9px] bg-neon-red text-white rounded-full font-bold leading-none">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'stats' && (
            <div data-testid="stats-tab-content">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl font-bold text-neon-blue uppercase">Overview</h2>
                <button onClick={fetchStats} className="font-body text-xs text-text-muted hover:text-neon-blue uppercase tracking-wider">↻ Refresh</button>
              </div>
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-darknet-surface border border-border-DEFAULT p-4 animate-pulse h-20" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {statCards.map((card, i) => (
                      <motion.button
                        key={card.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => card.tab && setActiveTab(card.tab)}
                        className={`${card.bg} border ${card.border} p-4 text-left hover:border-opacity-70 transition-all cursor-pointer group`}
                        data-testid={card.testId}
                      >
                        <p className={`font-heading text-3xl font-bold ${card.color}`}>{card.value}</p>
                        <p className="font-body text-[10px] text-text-muted uppercase tracking-wider mt-1 group-hover:text-white transition-colors">{card.label}</p>
                      </motion.button>
                    ))}
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-darknet-surface border border-neon-purple/30 p-5">
                    <h3 className="font-heading text-sm font-bold text-neon-purple uppercase mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'New Event', tab: 'events', color: 'neon-purple' },
                        { label: 'New Article', tab: 'news', color: 'neon-blue' },
                        { label: 'Review Apps', tab: 'applications', color: 'yellow-400', count: stats?.pending_applications },
                        { label: 'Process Orders', tab: 'orders', color: 'neon-red', count: stats?.pending_orders },
                      ].map((a) => (
                        <button
                          key={a.label}
                          onClick={() => setActiveTab(a.tab)}
                          className={`flex items-center justify-between px-4 py-3 bg-darknet-terminal border border-border-DEFAULT hover:border-${a.color} font-body text-xs uppercase tracking-wider text-text-secondary hover:text-white transition-all`}
                        >
                          <span>{a.label}</span>
                          {a.count > 0 && <span className="px-1.5 py-0.5 bg-neon-red text-white text-[9px] rounded-full font-bold">{a.count}</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isOwner && (
                    <div className="mt-4 bg-neon-red/5 border border-neon-red/30 p-4">
                      <p className="font-body text-xs text-neon-red uppercase tracking-wider font-bold mb-2 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Owner Privileges Active
                      </p>
                      <p className="font-body text-xs text-text-muted">You can manage all users, change roles, and configure site settings.</p>
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => setActiveTab('users')} className="px-3 py-1.5 bg-neon-red/10 border border-neon-red text-neon-red font-body text-xs uppercase">
                          Manage Users ({stats?.users})
                        </button>
                        <button onClick={() => setActiveTab('settings')} className="px-3 py-1.5 bg-neon-purple/10 border border-neon-purple text-neon-purple font-body text-xs uppercase">
                          Site Settings
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {activeTab === 'applications' && <ApplicationsTab />}
          {activeTab === 'events' && <EventsTab />}
          {activeTab === 'registrations' && <RegistrationsTab />}
          {activeTab === 'news' && <NewsTab />}
          {activeTab === 'gallery' && <GalleryTab />}
          {activeTab === 'products' && <ProductsTab />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'announcements' && <AnnouncementsTab />}
          {activeTab === 'chat' && <ChatManagementTab />}
          {activeTab === 'users' && isOwner && <UsersTab />}
          {activeTab === 'settings' && isOwner && <SettingsTab />}
        </div>
      </div>
    </div>
  );
};
