import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, FileText, Megaphone, Plus, Trash2, CheckCircle, XCircle,
  Calendar, Newspaper, ShoppingBag, BarChart3, Edit, Upload, Package, Pin,
  Image as ImageIcon, UserCog, Shield
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

const NEWS_CATEGORIES = ['patch_notes', 'new_heroes', 'new_skins', 'events', 'esports', 'game_updates'];
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
  const initialForm = { title: '', content: '', category: 'patch_notes', image_url: '', source_url: '', is_pinned: false, is_published: true };
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
      is_pinned: item.is_pinned, is_published: item.is_published
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

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 font-body text-xs text-text-secondary cursor-pointer">
              <input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} data-testid="news-pinned-checkbox" />
              Pin Article
            </label>
            <label className="flex items-center gap-2 font-body text-xs text-text-secondary cursor-pointer">
              <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} data-testid="news-published-checkbox" />
              Published
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
  const initialForm = { name: '', description: '', price: 0, category: 'jersey', section: 'merchandise', image_url: '', is_active: true, stock: '' };
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
const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get(`${API}/users`, { withCredentials: true });
      setUsers(data);
    } catch (e) { console.error(e); }
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

  const deleteUser = async (id) => {
    if (!window.confirm('Permanently delete this user?')) return;
    try {
      await axios.delete(`${API}/users/${id}`, { withCredentials: true });
      fetchUsers();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div data-testid="users-tab-content">
      <h2 className="font-heading text-xl font-bold text-neon-red uppercase mb-6 flex items-center gap-2">
        <Shield className="w-5 h-5" /> User Management ({users.length})
      </h2>
      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="bg-darknet-surface border border-border-DEFAULT p-4 flex items-center justify-between gap-3" data-testid={`admin-user-${u.id}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-heading text-sm font-bold text-white uppercase">{u.name || 'Unnamed'}</h3>
                <span className={`px-2 py-0.5 text-[10px] font-body uppercase tracking-wider border ${
                  u.role === 'owner' ? 'border-neon-red text-neon-red' :
                  u.role === 'admin' ? 'border-neon-purple text-neon-purple' :
                  'border-neon-blue text-neon-blue'
                }`}>{u.role}</span>
              </div>
              <p className="font-body text-xs text-text-secondary">{u.email}</p>
              {u.game_name && <p className="font-body text-[10px] text-text-muted">IGN: {u.game_name}</p>}
            </div>
            {u.id !== currentUser?._id && (
              <div className="flex items-center gap-2">
                <select
                  value={u.role}
                  onChange={(e) => updateRole(u.id, e.target.value)}
                  data-testid={`role-select-${u.id}`}
                  className="bg-darknet-terminal border border-border-DEFAULT px-2 py-1 font-body text-xs text-white focus:border-neon-blue focus:outline-none"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
                <button onClick={() => deleteUser(u.id)} data-testid={`delete-user-${u.id}`} className="p-2 text-neon-red hover:bg-neon-red/10">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// =============== MAIN DASHBOARD ===============
export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${API}/stats`, { withCredentials: true });
      setStats(data);
    } catch (e) { console.error(e); }
  };

  const tabs = [
    { id: 'stats', label: 'Overview', icon: BarChart3 },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'registrations', label: 'Registrations', icon: Users },
    { id: 'news', label: 'News', icon: Newspaper },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
    { id: 'products', label: 'Products', icon: ShoppingBag },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'applications', label: 'Applications', icon: FileText },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    ...(user?.role === 'owner' ? [{ id: 'users', label: 'Users', icon: UserCog }] : []),
  ];

  const statCards = stats ? [
    { label: 'Pending Apps', value: stats.pending_applications, color: 'text-neon-blue', testId: 'stat-pending-apps' },
    { label: 'Upcoming Events', value: stats.upcoming_events, color: 'text-neon-purple', testId: 'stat-upcoming-events' },
    { label: 'Ongoing Events', value: stats.ongoing_events, color: 'text-neon-red', testId: 'stat-ongoing-events' },
    { label: 'Pending Regs', value: stats.pending_registrations, color: 'text-yellow-400', testId: 'stat-pending-regs' },
    { label: 'Pending Orders', value: stats.pending_orders, color: 'text-orange-400', testId: 'stat-pending-orders' },
    { label: 'Total Members', value: stats.members, color: 'text-neon-blue', testId: 'stat-members' },
    { label: 'News Articles', value: stats.news_articles, color: 'text-neon-purple', testId: 'stat-news' },
    { label: 'Active Products', value: stats.products, color: 'text-neon-red', testId: 'stat-products' },
  ] : [];

  return (
    <div className="min-h-screen bg-darknet-bg py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-neon-purple uppercase tracking-tight mb-1" data-testid="admin-dashboard-title">
            Admin Dashboard
          </h1>
          <p className="font-body text-sm text-text-secondary">Welcome back, {user?.name}</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-border-DEFAULT pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-${tab.id === 'stats' ? 'overview' : tab.id}`}
                className={`flex items-center gap-2 px-3 py-2 font-body text-xs uppercase tracking-wider transition-colors ${
                  activeTab === tab.id
                    ? 'text-neon-blue border-b-2 border-neon-blue'
                    : 'text-text-muted hover:text-neon-blue'
                }`}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'stats' && stats && (
            <div data-testid="stats-tab-content">
              <h2 className="font-heading text-xl font-bold text-neon-blue uppercase mb-6">Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statCards.map((card) => (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-darknet-surface border border-border-DEFAULT p-4"
                    data-testid={card.testId}
                  >
                    <p className={`font-heading text-3xl font-bold ${card.color}`}>{card.value}</p>
                    <p className="font-body text-[10px] text-text-muted uppercase tracking-wider mt-1">{card.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'events' && <EventsTab />}
          {activeTab === 'registrations' && <RegistrationsTab />}
          {activeTab === 'news' && <NewsTab />}
          {activeTab === 'gallery' && <GalleryTab />}
          {activeTab === 'products' && <ProductsTab />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'applications' && <ApplicationsTab />}
          {activeTab === 'announcements' && <AnnouncementsTab />}
          {activeTab === 'users' && user?.role === 'owner' && <UsersTab />}
        </div>
      </div>
    </div>
  );
};
