import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, FileText, Calendar, ShoppingBag, Upload, Save, Gamepad2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROLES = ['', 'Tank', 'Roam', 'Jungle', 'Mid', 'Gold', 'EXP'];

export const Profile = () => {
  const { user, checkAuth } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [form, setForm] = useState({
    name: '', game_name: '', preferred_role: '', avatar_url: '', bio: ''
  });
  const [applications, setApplications] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        game_name: user.game_name || '',
        preferred_role: user.preferred_role || '',
        avatar_url: user.avatar_url || '',
        bio: user.bio || '',
      });
      fetchMyData();
    }
  }, [user]);

  const fetchMyData = async () => {
    try {
      const [apps, regs, ords] = await Promise.all([
        axios.get(`${API}/me/applications`, { withCredentials: true }),
        axios.get(`${API}/me/registrations`, { withCredentials: true }),
        axios.get(`${API}/me/orders`, { withCredentials: true }),
      ]);
      setApplications(apps.data);
      setRegistrations(regs.data);
      setOrders(ords.data);
    } catch (e) { console.error(e); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await axios.patch(`${API}/auth/profile`, form, { withCredentials: true });
      setMessage('Profile updated successfully!');
      await checkAuth();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large (max 5MB)');
      return;
    }
    setUploading(true);
    setError('');
    try {
      // Use a simple data URL approach for member avatars since /api/upload is admin-only
      const reader = new FileReader();
      reader.onload = (event) => {
        setForm({ ...form, avatar_url: event.target.result });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Upload failed');
      setUploading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'applications', label: 'My Applications', icon: FileText, count: applications.length },
    { id: 'registrations', label: 'My Events', icon: Calendar, count: registrations.length },
    { id: 'orders', label: 'My Orders', icon: ShoppingBag, count: orders.length },
  ];

  if (!user) return null;

  const initials = (user.name || user.email).slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-darknet-bg py-10 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-darknet-surface border border-neon-purple/50 p-6 mb-6 border-glow-purple flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-28 h-28 border-2 border-neon-purple bg-darknet-terminal flex items-center justify-center overflow-hidden" data-testid="profile-avatar">
            {form.avatar_url ? (
              <img src={form.avatar_url} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-heading text-3xl font-black text-neon-purple">{initials}</span>
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="font-heading text-3xl font-black text-neon-purple uppercase tracking-tight mb-1" data-testid="profile-name">
              {user.name || 'NECROLINK Member'}
            </h1>
            <p className="font-body text-sm text-text-secondary mb-2">{user.email}</p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <span className={`px-2 py-1 text-[10px] font-body uppercase tracking-[0.2em] border ${
                user.role === 'owner' ? 'border-neon-red text-neon-red' :
                user.role === 'admin' ? 'border-neon-purple text-neon-purple' :
                'border-neon-blue text-neon-blue'
              }`} data-testid="profile-role">
                {user.role}
              </span>
              {user.game_name && (
                <span className="px-2 py-1 text-[10px] font-body uppercase tracking-[0.2em] border border-text-muted text-text-secondary">
                  IGN: {user.game_name}
                </span>
              )}
              {user.preferred_role && (
                <span className="px-2 py-1 text-[10px] font-body uppercase tracking-[0.2em] border border-text-muted text-text-secondary">
                  {user.preferred_role}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-border-DEFAULT pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`profile-tab-${tab.id}`}
                className={`flex items-center gap-2 px-3 py-2 font-body text-xs uppercase tracking-wider transition-colors ${
                  activeTab === tab.id ? 'text-neon-blue border-b-2 border-neon-blue' : 'text-text-muted hover:text-neon-blue'
                }`}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-1.5 py-0.5 text-[9px] bg-neon-purple/20 border border-neon-purple text-neon-purple rounded-sm">{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid="profile-tab-content">
            {message && <div className="bg-neon-blue/10 border border-neon-blue p-3 mb-4 font-body text-sm text-neon-blue" data-testid="profile-success">{message}</div>}
            {error && <div className="bg-neon-red/10 border border-neon-red p-3 mb-4 font-body text-sm text-neon-red" data-testid="profile-error">{error}</div>}

            <form onSubmit={handleSave} className="bg-darknet-surface border border-neon-blue/50 p-6 space-y-4">
              <div>
                <label className="font-body text-xs text-text-muted mb-2 block uppercase tracking-wider">Avatar</label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Avatar URL (paste or upload)"
                    value={form.avatar_url}
                    onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                    data-testid="profile-avatar-url"
                    className="flex-1 bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none"
                  />
                  <label className="px-3 py-2 bg-neon-purple/20 border border-neon-purple text-neon-purple font-body text-xs uppercase cursor-pointer hover:bg-neon-purple/30 flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    {uploading ? '...' : 'Upload'}
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" data-testid="profile-avatar-file" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-xs text-text-muted mb-2 block uppercase tracking-wider">
                    <User className="w-3 h-3 inline mr-1" /> Display Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    data-testid="profile-name-input"
                    className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-body text-xs text-text-muted mb-2 block uppercase tracking-wider">
                    <Gamepad2 className="w-3 h-3 inline mr-1" /> In-Game Name
                  </label>
                  <input
                    type="text"
                    value={form.game_name}
                    onChange={(e) => setForm({ ...form, game_name: e.target.value })}
                    data-testid="profile-game-name-input"
                    className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="font-body text-xs text-text-muted mb-2 block uppercase tracking-wider">Preferred MLBB Role</label>
                  <select
                    value={form.preferred_role}
                    onChange={(e) => setForm({ ...form, preferred_role: e.target.value })}
                    data-testid="profile-role-select"
                    className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r || 'Select role'}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="font-body text-xs text-text-muted mb-2 block uppercase tracking-wider">Bio</label>
                  <textarea
                    rows={3}
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    data-testid="profile-bio-input"
                    placeholder="Tell us about yourself..."
                    className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none resize-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="font-body text-xs text-text-muted mb-2 block uppercase tracking-wider">
                    <Mail className="w-3 h-3 inline mr-1" /> Email (cannot be changed)
                  </label>
                  <input type="email" value={user.email} disabled
                    className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-text-muted opacity-60 cursor-not-allowed" />
                </div>
              </div>

              <button type="submit" disabled={saving} data-testid="save-profile-btn"
                className="px-6 py-3 bg-neon-purple border border-neon-purple text-white font-heading text-sm tracking-wider uppercase hover:shadow-[0_0_20px_rgba(176,38,255,0.6)] transition-all disabled:opacity-50 flex items-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </motion.div>
        )}

        {/* Applications tab */}
        {activeTab === 'applications' && (
          <div data-testid="my-applications-tab">
            {applications.length === 0 ? (
              <p className="font-body text-text-muted">You haven&apos;t submitted any applications yet.</p>
            ) : applications.map((app, i) => (
              <div key={i} className="bg-darknet-surface border border-border-DEFAULT p-4 mb-3" data-testid={`my-app-${i}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-heading text-sm font-bold text-white uppercase">Clan Application</h3>
                  <span className={`px-2 py-0.5 text-[10px] font-body uppercase tracking-wider border ${
                    app.status === 'pending' ? 'border-yellow-400 text-yellow-400' :
                    app.status === 'approved' ? 'border-neon-blue text-neon-blue' :
                    'border-neon-red text-neon-red'
                  }`}>{app.status}</span>
                </div>
                <p className="font-body text-xs text-text-secondary">IGN: {app.game_name} • Role: {app.preferred_role}</p>
                <p className="font-body text-xs text-text-muted mt-1">Submitted {new Date(app.submitted_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}

        {/* Registrations tab */}
        {activeTab === 'registrations' && (
          <div data-testid="my-registrations-tab">
            {registrations.length === 0 ? (
              <p className="font-body text-text-muted">You haven&apos;t registered for any events yet.</p>
            ) : registrations.map((r) => (
              <div key={r.id} className="bg-darknet-surface border border-border-DEFAULT p-4 mb-3" data-testid={`my-reg-${r.id}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-heading text-sm font-bold text-white uppercase">{r.game_name}</h3>
                  <span className={`px-2 py-0.5 text-[10px] font-body uppercase tracking-wider border ${
                    r.status === 'pending' ? 'border-yellow-400 text-yellow-400' :
                    r.status === 'approved' ? 'border-neon-blue text-neon-blue' :
                    'border-neon-red text-neon-red'
                  }`}>{r.status}</span>
                </div>
                <p className="font-body text-xs text-text-muted">Registered {new Date(r.registered_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}

        {/* Orders tab */}
        {activeTab === 'orders' && (
          <div data-testid="my-orders-tab">
            {orders.length === 0 ? (
              <p className="font-body text-text-muted">You haven&apos;t placed any orders yet.</p>
            ) : orders.map((o) => (
              <div key={o.id} className="bg-darknet-surface border border-border-DEFAULT p-4 mb-3" data-testid={`my-order-${o.id}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-heading text-sm font-bold text-white uppercase">{o.product_name}</h3>
                    <p className="font-body text-xs text-neon-blue">${o.total_price} ({o.quantity}x)</p>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-body uppercase tracking-wider border ${
                    o.status === 'pending' ? 'border-yellow-400 text-yellow-400' :
                    o.status === 'completed' ? 'border-neon-blue text-neon-blue' :
                    'border-neon-red text-neon-red'
                  }`}>{o.status}</span>
                </div>
                <p className="font-body text-xs text-text-muted">Placed {new Date(o.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
