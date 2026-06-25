import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, Shield, Users, Trash2, AlertCircle, Lock } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

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
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const MessageBubble = ({ msg, currentUser, onDelete, isStaff }) => {
  const isOwn = msg.user_id === currentUser?.id || msg.user_name === currentUser?.name;
  const badge = ROLE_BADGES[msg.user_role] || ROLE_BADGES.member;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'owner';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 group ${isOwn ? 'flex-row-reverse' : ''}`}
    >
      <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center text-xs font-bold border ${
        isOwn ? 'bg-neon-blue/20 border-neon-blue text-neon-blue' : 'bg-darknet-surface border-border-DEFAULT text-text-muted'
      }`}>
        {(msg.user_name || '?')[0].toUpperCase()}
      </div>
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        <div className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className={`font-body text-xs font-bold ${ROLE_COLORS[msg.user_role] || 'text-text-secondary'}`}>
            {msg.user_name}
          </span>
          <span className={`px-1.5 py-0.5 text-[9px] font-body uppercase border rounded-sm ${badge.cls}`}>
            {badge.label}
          </span>
          <span className="font-body text-[10px] text-text-muted">{formatTime(msg.created_at)}</span>
          {isAdmin && (
            <button
              onClick={() => onDelete(msg)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-neon-red"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className={`px-3 py-2 font-body text-sm leading-relaxed break-words ${
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
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const isStaff = user?.role === 'admin' || user?.role === 'owner';

  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/chat/messages?channel=${channel}&limit=80`, { withCredentials: true });
      setMessages(data);
      setError('');
    } catch (e) {
      if (e.response?.status === 403) {
        setError('Staff channel is restricted to staff members only.');
      }
    } finally {
      setLoading(false);
    }
  }, [channel]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const { data } = await axios.post(`${API}/chat/messages`, { channel, message: input.trim() }, { withCredentials: true });
      setMessages(prev => [...prev, data]);
      setInput('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (msg) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await axios.delete(`${API}/chat/messages/${msg._id || msg.id || '0'}`, { withCredentials: true });
      setMessages(prev => prev.filter(m => m !== msg));
    } catch {
      fetchMessages();
    }
  };

  const groupedMessages = () => {
    const groups = [];
    let lastDate = null;
    messages.forEach((msg) => {
      const d = formatDate(msg.created_at);
      if (d !== lastDate) {
        groups.push({ type: 'date', label: d });
        lastDate = d;
      }
      groups.push({ type: 'message', data: msg });
    });
    return groups;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-darknet-bg flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Lock className="w-12 h-12 text-neon-purple mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-black text-neon-purple uppercase mb-3">Members Only</h1>
          <p className="font-body text-text-secondary mb-6">You must be logged in to access the clan chat.</p>
          <a href="/login" className="px-6 py-3 bg-neon-red border border-neon-red text-white font-body text-sm uppercase tracking-wider">
            Login to Chat
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darknet-bg flex flex-col">
      <div className="max-w-4xl w-full mx-auto flex flex-col flex-1 py-6 px-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="font-heading text-3xl font-black text-neon-purple uppercase tracking-tight mb-1 flex items-center gap-3">
            <MessageCircle className="w-7 h-7" /> Clan Chat
          </h1>
          <p className="font-body text-xs text-text-muted">Real-time communication for NECROLINK members</p>
        </div>

        {/* Channel Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setChannel('members')}
            className={`flex items-center gap-2 px-4 py-2 font-body text-xs uppercase tracking-wider border transition-all ${
              channel === 'members'
                ? 'bg-neon-blue/10 border-neon-blue text-neon-blue'
                : 'border-border-DEFAULT text-text-muted hover:text-neon-blue hover:border-neon-blue/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Members Chat
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
              <Shield className="w-3.5 h-3.5" /> Staff Chat
            </button>
          )}
        </div>

        {/* Chat Window */}
        <div className={`flex flex-col flex-1 border ${channel === 'staff' ? 'border-neon-red/30' : 'border-neon-blue/30'} bg-darknet-terminal`}
          style={{ minHeight: 0, height: 'calc(100vh - 320px)' }}>

          {/* Channel Banner */}
          <div className={`px-4 py-2 flex items-center gap-2 border-b text-xs font-body uppercase tracking-wider ${
            channel === 'staff'
              ? 'border-neon-red/30 bg-neon-red/5 text-neon-red'
              : 'border-neon-blue/30 bg-neon-blue/5 text-neon-blue'
          }`}>
            {channel === 'staff' ? <Shield className="w-3 h-3" /> : <Users className="w-3 h-3" />}
            {channel === 'staff' ? 'Staff Only — Restricted Channel' : 'Members Chat — All NECROLINK Members'}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="font-body text-xs text-text-muted">Loading messages...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 text-neon-red mx-auto mb-2" />
                  <p className="font-body text-sm text-neon-red">{error}</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageCircle className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-30" />
                  <p className="font-body text-sm text-text-muted">No messages yet. Be the first to say something!</p>
                </div>
              </div>
            ) : (
              <AnimatePresence>
                {groupedMessages().map((item, i) =>
                  item.type === 'date' ? (
                    <div key={`date-${i}`} className="flex items-center gap-3 py-1">
                      <div className="flex-1 h-px bg-border-DEFAULT" />
                      <span className="font-body text-[10px] text-text-muted uppercase tracking-wider">{item.label}</span>
                      <div className="flex-1 h-px bg-border-DEFAULT" />
                    </div>
                  ) : (
                    <MessageBubble
                      key={`${item.data.user_id}-${item.data.created_at}-${i}`}
                      msg={item.data}
                      currentUser={user}
                      onDelete={handleDelete}
                      isStaff={isStaff}
                    />
                  )
                )}
              </AnimatePresence>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className={`flex gap-2 p-3 border-t ${channel === 'staff' ? 'border-neon-red/30' : 'border-neon-blue/30'}`}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              maxLength={500}
              placeholder={`Message ${channel === 'staff' ? '#staff-only' : '#members'}...`}
              disabled={!!error}
              autoComplete="off"
              className={`flex-1 bg-darknet-bg border px-4 py-2.5 font-body text-sm text-white focus:outline-none transition-colors placeholder:text-text-muted/50 disabled:opacity-40 ${
                channel === 'staff' ? 'border-neon-red/40 focus:border-neon-red' : 'border-border-DEFAULT focus:border-neon-blue'
              }`}
            />
            <div className="flex items-center gap-2">
              <span className="font-body text-[10px] text-text-muted">{input.length}/500</span>
              <button
                type="submit"
                disabled={!input.trim() || sending || !!error}
                className={`flex items-center gap-2 px-4 py-2.5 border font-body text-xs uppercase tracking-wider transition-all disabled:opacity-40 ${
                  channel === 'staff'
                    ? 'bg-neon-red/10 border-neon-red text-neon-red hover:bg-neon-red/20'
                    : 'bg-neon-blue/10 border-neon-blue text-neon-blue hover:bg-neon-blue/20'
                }`}
              >
                {sending ? (
                  <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Send
              </button>
            </div>
          </form>
        </div>

        <p className="font-body text-[10px] text-text-muted mt-2 text-center">
          Chat refreshes every 3 seconds • {isStaff ? 'You can delete messages as staff' : 'Be respectful'}
        </p>
      </div>
    </div>
  );
};
