import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Trophy, Users, X, Filter } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EVENT_CATEGORIES = [
  'All',
  'Friday Night Clash',
  'Sunday Championship',
  'Rank Push Night',
  'Birthday Parties',
  'Voice Chat Hangouts',
  'Giveaways',
  'Last Survivor Challenge',
  'King of the Lane',
  'Mystery Hero Challenge',
  'Speedrun Victory Challenge',
  'NECROLINK Dark Cup',
  'Halloween Events',
  'Winter Tournament',
  'New Year Tournament',
];

const CountdownTimer = ({ targetDate, status }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculate = () => {
      const target = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const diff = target - now;
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    };
    setTimeLeft(calculate());
    const id = setInterval(() => setTimeLeft(calculate()), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (status === 'ongoing') {
    return (
      <div className="flex items-center gap-2" data-testid="ongoing-badge">
        <div className="w-2 h-2 rounded-full bg-neon-red animate-pulse" />
        <span className="font-body text-xs uppercase tracking-wider text-neon-red font-bold">Live Now</span>
      </div>
    );
  }
  if (status === 'completed') {
    return <span className="font-body text-xs uppercase tracking-wider text-text-muted">Completed</span>;
  }

  return (
    <div className="grid grid-cols-4 gap-2" data-testid="countdown">
      {[
        { label: 'Days', value: timeLeft.days },
        { label: 'Hours', value: timeLeft.hours },
        { label: 'Min', value: timeLeft.minutes },
        { label: 'Sec', value: timeLeft.seconds },
      ].map((item, i) => (
        <div key={i} className="text-center bg-darknet-terminal border border-neon-blue/30 px-2 py-2">
          <div className="font-heading text-xl font-bold text-neon-blue">{String(item.value).padStart(2, '0')}</div>
          <div className="font-body text-[10px] text-text-muted uppercase tracking-wider">{item.label}</div>
        </div>
      ))}
    </div>
  );
};

const RegistrationModal = ({ event, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ name: '', email: '', game_name: '', discord_username: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await axios.post(`${API}/event-registrations`, { ...formData, event_id: event.id });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to register');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" data-testid="registration-modal">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-darknet-surface border border-neon-purple p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border-glow-purple">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-neon-purple uppercase mb-1" data-testid="modal-title">Register</h2>
            <p className="font-body text-sm text-text-secondary">{event.title}</p>
          </div>
          <button onClick={onClose} data-testid="close-modal-btn" className="text-text-secondary hover:text-neon-red transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="bg-neon-red/10 border border-neon-red p-3 mb-4 font-body text-xs text-neon-red">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            data-testid="reg-name"
            placeholder="Full Name *"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none"
          />
          <input
            type="email"
            data-testid="reg-email"
            placeholder="Email *"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none"
          />
          <input
            type="text"
            data-testid="reg-game-name"
            placeholder="In-Game Name *"
            required
            value={formData.game_name}
            onChange={(e) => setFormData({ ...formData, game_name: e.target.value })}
            className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none"
          />
          <input
            type="text"
            data-testid="reg-discord"
            placeholder="Discord Username (optional)"
            value={formData.discord_username}
            onChange={(e) => setFormData({ ...formData, discord_username: e.target.value })}
            className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none"
          />
          <textarea
            data-testid="reg-notes"
            placeholder="Notes (optional)"
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none resize-none"
          />

          <button
            type="submit"
            data-testid="submit-registration-btn"
            disabled={submitting}
            className="w-full px-4 py-3 bg-neon-red border border-neon-red text-white font-heading text-sm tracking-wider uppercase hover:shadow-[0_0_20px_rgba(255,0,60,0.6)] transition-all disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Register Now'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const EventCard = ({ event, onRegister, index }) => {
  const date = new Date(event.event_date);
  const statusColors = {
    upcoming: 'border-neon-blue/50 text-neon-blue',
    ongoing: 'border-neon-red/50 text-neon-red',
    completed: 'border-text-muted text-text-muted',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-darknet-surface border border-border-DEFAULT overflow-hidden hover:border-neon-purple/50 transition-all"
      data-testid={`event-card-${event.id}`}
    >
      {event.banner_url && (
        <div className="h-40 bg-cover bg-center relative" style={{ backgroundImage: `url(${event.banner_url})` }}>
          <div className="absolute inset-0 bg-black/40" />
          <div className={`absolute top-3 left-3 px-2 py-1 text-xs font-body uppercase tracking-wider border bg-black/70 ${statusColors[event.status]}`}>
            {event.status}
          </div>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 text-[10px] font-body uppercase tracking-[0.2em] border border-neon-purple text-neon-purple">
            {event.category}
          </span>
        </div>
        <h3 className="font-heading text-lg font-bold text-white uppercase mb-2">{event.title}</h3>
        <p className="font-body text-sm text-text-secondary leading-relaxed mb-4 line-clamp-3">{event.description}</p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 font-body text-xs text-text-secondary">
            <Calendar className="w-3 h-3 text-neon-blue" />
            {date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
          <div className="flex items-center gap-2 font-body text-xs text-text-secondary">
            <MapPin className="w-3 h-3 text-neon-blue" />
            {event.location}
          </div>
          {event.prize_pool && (
            <div className="flex items-center gap-2 font-body text-xs text-neon-red">
              <Trophy className="w-3 h-3" />
              {event.prize_pool}
            </div>
          )}
          {event.max_participants && (
            <div className="flex items-center gap-2 font-body text-xs text-text-secondary">
              <Users className="w-3 h-3 text-neon-blue" />
              Max {event.max_participants} participants
            </div>
          )}
        </div>

        <div className="mb-4">
          <CountdownTimer targetDate={event.event_date} status={event.status} />
        </div>

        {event.status !== 'completed' && (
          <button
            onClick={() => onRegister(event)}
            data-testid={`register-event-${event.id}`}
            className="w-full px-4 py-2 bg-neon-purple border border-neon-purple text-white font-body text-xs uppercase tracking-wider hover:shadow-[0_0_15px_rgba(176,38,255,0.6)] transition-all"
          >
            Register Now
          </button>
        )}
      </div>
    </motion.div>
  );
};

export const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data } = await axios.get(`${API}/events`);
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    const catMatch = categoryFilter === 'All' || e.category === categoryFilter;
    const statMatch = statusFilter === 'all' || e.status === statusFilter;
    return catMatch && statMatch;
  });

  const ongoingEvents = filteredEvents.filter((e) => e.status === 'ongoing');
  const upcomingEvents = filteredEvents.filter((e) => e.status === 'upcoming');
  const completedEvents = filteredEvents.filter((e) => e.status === 'completed');

  // Calendar grouping (events by date)
  const eventsByDate = {};
  events.forEach((e) => {
    const dateKey = new Date(e.event_date).toDateString();
    if (!eventsByDate[dateKey]) eventsByDate[dateKey] = [];
    eventsByDate[dateKey].push(e);
  });

  const upcomingDates = Object.keys(eventsByDate)
    .filter((d) => new Date(d) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a) - new Date(b))
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-darknet-bg py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase mb-4 neon-glow-purple" data-testid="events-title">
            Events
          </h1>
          <p className="font-body text-lg text-text-secondary tracking-wide">
            Join the action. Compete. Conquer.
          </p>
        </div>

        {successMessage && (
          <div className="bg-neon-blue/10 border border-neon-blue p-4 mb-6 max-w-2xl mx-auto" data-testid="reg-success">
            <p className="font-body text-sm text-neon-blue">{successMessage}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-darknet-surface border border-border-DEFAULT p-4 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Filter className="w-4 h-4 text-neon-blue" />
            <span className="font-body text-xs uppercase tracking-wider text-text-secondary">Filter Events</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-body text-xs text-text-muted mb-2 block uppercase tracking-wider">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                data-testid="category-filter"
                className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none"
              >
                {EVENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-body text-xs text-text-muted mb-2 block uppercase tracking-wider">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                data-testid="status-filter"
                className="w-full bg-darknet-terminal border border-border-DEFAULT px-3 py-2 font-body text-sm text-white focus:border-neon-blue focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Calendar Section */}
        {upcomingDates.length > 0 && (
          <div className="bg-darknet-surface border border-neon-blue/30 p-6 mb-8" data-testid="event-calendar">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-neon-blue" />
              <h2 className="font-heading text-lg font-bold text-neon-blue uppercase tracking-tight">Upcoming Schedule</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {upcomingDates.map((dateKey) => {
                const date = new Date(dateKey);
                return (
                  <div key={dateKey} className="bg-darknet-terminal border border-border-DEFAULT p-3" data-testid={`calendar-date-${dateKey}`}>
                    <div className="font-body text-[10px] uppercase tracking-[0.2em] text-text-muted mb-1">
                      {date.toLocaleString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="font-heading text-2xl font-bold text-neon-purple">
                      {date.getDate()}
                    </div>
                    <div className="font-body text-xs text-text-secondary mb-2">
                      {date.toLocaleString('en-US', { month: 'short' })}
                    </div>
                    {eventsByDate[dateKey].map((e) => (
                      <div key={e.id} className="font-body text-[10px] text-neon-blue truncate" title={e.title}>
                        • {e.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center font-body text-text-muted">Loading events...</p>
        ) : (
          <>
            {ongoingEvents.length > 0 && (
              <section className="mb-10">
                <h2 className="font-heading text-2xl font-bold text-neon-red uppercase tracking-tight mb-4 flex items-center gap-2" data-testid="ongoing-section">
                  <Clock className="w-5 h-5" /> Ongoing Now
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ongoingEvents.map((event, i) => (
                    <EventCard key={event.id} event={event} index={i} onRegister={setSelectedEvent} />
                  ))}
                </div>
              </section>
            )}

            {upcomingEvents.length > 0 && (
              <section className="mb-10">
                <h2 className="font-heading text-2xl font-bold text-neon-blue uppercase tracking-tight mb-4 flex items-center gap-2" data-testid="upcoming-section">
                  <Calendar className="w-5 h-5" /> Upcoming Events
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingEvents.map((event, i) => (
                    <EventCard key={event.id} event={event} index={i} onRegister={setSelectedEvent} />
                  ))}
                </div>
              </section>
            )}

            {completedEvents.length > 0 && (
              <section>
                <h2 className="font-heading text-2xl font-bold text-text-muted uppercase tracking-tight mb-4 flex items-center gap-2" data-testid="completed-section">
                  <Trophy className="w-5 h-5" /> Completed Events
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedEvents.map((event, i) => (
                    <EventCard key={event.id} event={event} index={i} onRegister={setSelectedEvent} />
                  ))}
                </div>
              </section>
            )}

            {filteredEvents.length === 0 && (
              <div className="text-center py-12">
                <p className="font-body text-text-muted" data-testid="no-events">No events found matching your filters.</p>
              </div>
            )}
          </>
        )}
      </div>

      {selectedEvent && (
        <RegistrationModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSuccess={() => {
            setSuccessMessage(`Registration submitted for "${selectedEvent.title}"! We'll review and confirm soon.`);
            setTimeout(() => setSuccessMessage(''), 5000);
          }}
        />
      )}
    </div>
  );
};
