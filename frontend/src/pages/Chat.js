import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, Shield, Users, Trash2, AlertCircle, Lock, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROLE_COLORS = {
  owner: 'text-neon-red',
  admin: 'text-neon-purple',
  member: 'text-neon-blue',
};

const ROLE_BADGES = {
  owner: { label: 'Owner', cls: 'bg-neon-red/20 text-neon-red border-neon-red/40' },
  admin: { label: 'Admin', cls: 'bg-neon-purple/20 text-neon-purple border-neon-purple/40' },
  member: { label: 'Member', cls: 'bg-neon-blue/20 text-neon-blue border-neon-blue/40' },
};

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const MessageBubble = ({ msg, currentUser, onDelete }) => {
  const isOwn = msg.user_id === (currentUser?._id || currentUser?.id) || msg.user_name === currentUser?.name;
  const badge = ROLE_BADGES[msg.user_role] || ROLE_BADGES.member;
  const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'owner';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 group ${isOwn ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center text-xs font-bold border ${
        isOwn ? 'bg-neon-blue/20 border-neon-blue text-neon-blue' : 'bg-darknet-surface border-border-DEFAULT text-text-muted'
      }`}>
        {(msg.user_name || '?')[0].toUpperCase()}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className={`font-body text-xs font-bold ${ROLE_COLORS[msg.user_role] || 'text-text-secondary'}`}>
            {msg.user_name}
          </span>
          <span className={`px-1.5 py-0.5 text-[9px] font-body uppercase border rounded-sm ${badge.cls}`}>
            {badge.label}
          </span>
          <span className="font-body text-[10px] text-text-muted">{formatTime(msg.created_at)}</span>
          {isStaff && msg.id && (
            <button
              onClick={() => onDelete(msg)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-neon-red"
              title="Delete message"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className={`px-3 py-2 font-body text-sm leading-relaxed break-words max-w-full ${
          isOwn
            ? 'bg-neon-blue/10 border border-neon-blue/30 text-white'
            : 'bg-darknet-surface border border-border-DEFAULT text-text-secondary'
        }`}>
          {msg.message}
        </div>
      </div>
    </motion.div>
  );
};

export const Chat = () => {
  const { user } = useAuth();
  const [channel, setChannel] = useState('members');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlineNote, setOnlineNote] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);
  const isStaff = user?.role === 'admin' || user?.role === 'owner';

  const fetchMessages = useCallback(async (silent = false) => {
    try {
      const { data } = await axios.get(`${API}/chat/messages?channel=${channel}&limit=80`, { withCredentials: true });
      setMessages(data);
      setError('');
      if (!silent) setLoading(false);
    } catch (e) {
      if (e.response?.status === 403) {
        setError('Staff channel is restricted to staff members only.');
      } else if (e.response?.status === 401) {
        setError('Session expired. Please log in again.');
      }
      if (!silent) setLoading(false);
    }
  }, [channel]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setError('');
    fetchMessages(false);
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchMessages(true), 3000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const { data } = await axios.post(
        `${API}/chat/messages`,
        { channel, message: text },
        { withCredentials: true }
      );
      setMessages(prev => [...prev, data]);
      setInput('');
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 80);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send message. Try again.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (msg) => {
    if (!msg.id) return;
    if (!window.confirm('Delete this message?')) return;
    try {
      await axios.delete(`${API}/chat/messages/${msg.id}`, { withCredentials: true });
      setMessages(prev => prev.filter(m => m.id !== msg.id));
    } catch (err) {
      alert('Could not delete: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Group messages by date
  const grouped = (() => {
    const items = [];
    let lastDate = null;
    for (const msg of messages) {
      const d = formatDate(msg.created_at);
      if (d !== lastDate) {
        items.push({ type: 'date', label: d, key: `date-${d}` });
        lastDate = d;
      }
      items.push({ type: 'message', data: msg, key: `msg-${msg.id || msg.created_at}` });
    }
    return items;
  })();

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-darknet-bg flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 border border-neon-purple flex items-center justify-center mx-auto mb-5">
            <Lock className="w-8 h-8 text-neon-purple" />
          </div>
          <h1 className="font-heading text-2xl font-black text-neon-purple uppercase mb-3">Members Only</h1>
          <p className="font-body text-text-secondary mb-6 text-sm">
            You need to be logged in to access the NECROLINK clan chat.
          </p>
          <Link to="/login" className="inline-block px-8 py-3 bg-neon-red border border-neon-red text-white font-body text-sm uppercase tracking-wider hover:shadow-[0_0_20px_rgba(255,0,60,0.5)] transition-all">
            Login to Chat
          </Link>
        </div>
      </div>
    );
  }

  const isStaffChannel = channel === 'staff';

  return (
    <div className="min-h-screen bg-darknet-bg flex flex-col">
      <div className="max-w-4xl w-full mx-auto flex flex-col flex-1 py-6 px-4" style={{ maxHeight: 'calc(100vh - 80px)' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-black text-neon-purple uppercase tracking-tight flex items-center gap-2">
              <MessageCircle className="w-6 h-6" /> Clan Chat
            </h1>
            <p className="font-body text-xs text-text-muted">Real-time communication · auto-refreshes every 3s</p>
          </div>
          <button
            onClick={() => fetchMessages(false)}
            className="p-2 border border-border-DEFAULT text-text-muted hover:text-neon-blue hover:border-neon-blue transition-colors"
            title="Refresh now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Channel Tabs */}
        <div className="flex gap-2 mb-3 flex-shrink-0">
          <button
            onClick={() => setChannel('members')}
            className={`flex items-center gap-2 px-4 py-2 font-body text-xs uppercase tracking-wider border transition-all ${
              channel === 'members'
                ? 'bg-neon-blue/10 border-neon-blue text-neon-blue'
                : 'border-border-DEFAULT text-text-muted hover:text-neon-blue hover:border-neon-blue/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Members
          </button>
          {isStaff && (
            <button
              onClick={() => setChannel('staff')}
              className={`flex items-center gap-2 px-4 py-2 font-body text-xs uppercase tracking-wider border transition-all ${
                channel === 'staff'
                  ? 'bg-neon-red/10 border-neon-red text-neon-red'
                  : 'border-border-DEFAULT text-text-muted hover:text-neon-red hover:border-neon-red/50'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Staff Only
            </button>
          )}
        </div>

        {/* Chat Window */}
        <div
          className={`flex flex-col border flex-1 min-h-0 ${
            isStaffChannel ? 'border-neon-red/30' : 'border-neon-blue/20'
          } bg-darknet-terminal`}
        >
          {/* Channel Banner */}
          <div className={`flex-shrink-0 px-4 py-2 flex items-center gap-2 border-b text-xs font-body uppercase tracking-wider ${
            isStaffChannel
              ? 'border-neon-red/30 bg-neon-red/5 text-neon-red'
              : 'border-neon-blue/20 bg-neon-blue/5 text-neon-blue'
          }`}>
            {isStaffChannel ? <Shield className="w-3 h-3" /> : <Users className="w-3 h-3" />}
            {isStaffChannel ? '# staff-only — Restricted to Staff' : '# members — Open to all NECROLINK Members'}
            <span className="ml-auto text-text-muted font-body text-[10px] normal-case">{messages.length} messages</span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="font-body text-xs text-text-muted">Loading messages...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center p-4 border border-neon-red/30 bg-neon-red/5">
                  <AlertCircle className="w-6 h-6 text-neon-red mx-auto mb-2" />
                  <p className="font-body text-sm text-neon-red">{error}</p>
                </div>
              </div>
            ) : grouped.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <MessageCircle className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-20" />
                  <p className="font-body text-sm text-text-muted">No messages yet — say something!</p>
                </div>
              </div>
            ) : (
              grouped.map(item =>
                item.type === 'date' ? (
                  <div key={item.key} className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-border-DEFAULT opacity-40" />
                    <span className="font-body text-[10px] text-text-muted uppercase tracking-wider px-2">{item.label}</span>
                    <div className="flex-1 h-px bg-border-DEFAULT opacity-40" />
                  </div>
                ) : (
                  <MessageBubble
                    key={item.key}
                    msg={item.data}
                    currentUser={user}
                    onDelete={handleDelete}
                  />
                )
              )
            )}
            <div ref={bottomRef} />
          </div>

          {/* Error toast */}
          <AnimatePresence>
            {error && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex-shrink-0 px-4 py-2 bg-neon-red/10 border-t border-neon-red/30"
              >
                <p className="font-body text-xs text-neon-red">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input */}
          <form
            onSubmit={sendMessage}
            className={`flex-shrink-0 flex gap-2 p-3 border-t ${
              isStaffChannel ? 'border-neon-red/30' : 'border-neon-blue/20'
            }`}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              maxLength={500}
              placeholder={`Message ${isStaffChannel ? '#staff-only' : '#members'}...`}
              disabled={!!error && error.includes('restricted')}
              autoComplete="off"
              className={`flex-1 bg-darknet-bg border px-4 py-2.5 font-body text-sm text-white focus:outline-none transition-colors placeholder:text-text-muted/40 disabled:opacity-40 ${
                isStaffChannel
                  ? 'border-neon-red/40 focus:border-neon-red'
                  : 'border-border-DEFAULT focus:border-neon-blue'
              }`}
            />
            <span className="self-center font-body text-[10px] text-text-muted w-12 text-right">{input.length}/500</span>
            <button
              type="submit"
              disabled={!input.trim() || sending || (!!error && error.includes('restricted'))}
              className={`flex items-center gap-1.5 px-4 py-2.5 border font-body text-xs uppercase tracking-wider transition-all disabled:opacity-40 ${
                isStaffChannel
                  ? 'bg-neon-red/10 border-neon-red text-neon-red hover:bg-neon-red/20'
                  : 'bg-neon-blue/10 border-neon-blue text-neon-blue hover:bg-neon-blue/20'
              }`}
            >
              {sending ? (
                <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>

        <p className="font-body text-[10px] text-text-muted mt-2 text-center flex-shrink-0">
          {isStaff ? 'Hover over any message to delete it as staff' : 'Be respectful · Max 500 characters'}
        </p>
      </div>
    </div>
  );
};
