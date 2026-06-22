import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Mail, MessageCircle, User, Gamepad2 } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const roles = ['Tank', 'Roam', 'Jungle', 'Mid', 'Gold', 'EXP'];
const experienceLevels = ['Beginner (< 1000 matches)', 'Intermediate (1000-3000 matches)', 'Advanced (3000-5000 matches)', 'Expert (5000+ matches)'];

export const JoinUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    game_name: '',
    preferred_role: '',
    experience: '',
    discord_username: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await axios.post(`${API}/applications`, formData);
      setSubmitted(true);
      setFormData({
        name: '',
        email: '',
        game_name: '',
        preferred_role: '',
        experience: '',
        discord_username: '',
        reason: '',
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-darknet-bg py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-heading text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase mb-4 neon-glow-blue"
            data-testid="join-title"
          >
            Join NECROLINK
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-body text-lg text-text-secondary tracking-wide"
          >
            Apply to become part of our elite MLBB clan
          </motion.p>
        </div>

        {/* Requirements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-darknet-surface border border-neon-purple/50 p-8 mb-8 border-glow-purple"
          data-testid="requirements-section"
        >
          <h2 className="font-heading text-2xl font-bold text-neon-purple uppercase tracking-tight mb-4">
            Requirements
          </h2>
          <ul className="space-y-2 font-body text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-neon-blue mt-1">•</span>
              <span>Active Mobile Legends player with at least 1000 matches</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neon-blue mt-1">•</span>
              <span>Good understanding of game mechanics and team play</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neon-blue mt-1">•</span>
              <span>Respectful attitude and team-oriented mindset</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neon-blue mt-1">•</span>
              <span>Available for weekly training sessions and events</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neon-blue mt-1">•</span>
              <span>Discord for communication (optional but recommended)</span>
            </li>
          </ul>
        </motion.div>

        {/* Application Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-darknet-surface border border-neon-blue/50 p-8 border-glow-blue"
        >
          <h2 className="font-heading text-2xl font-bold text-neon-blue uppercase tracking-tight mb-6" data-testid="application-form-title">
            Application Form
          </h2>

          {submitted && (
            <div className="bg-neon-blue/10 border border-neon-blue p-4 mb-6" data-testid="success-message">
              <p className="font-body text-sm text-neon-blue">
                Application submitted successfully! We'll review your application and get back to you soon.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-neon-red/10 border border-neon-red p-4 mb-6" data-testid="error-message">
              <p className="font-body text-sm text-neon-red">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block font-body text-sm text-text-secondary mb-2 uppercase tracking-wider">
                <User className="w-4 h-4 inline mr-2" />
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                data-testid="input-name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full bg-darknet-terminal border border-border-DEFAULT px-4 py-3 font-body text-white focus:border-neon-blue focus:outline-none transition-colors"
                placeholder="Enter your full name"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block font-body text-sm text-text-secondary mb-2 uppercase tracking-wider">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                data-testid="input-email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full bg-darknet-terminal border border-border-DEFAULT px-4 py-3 font-body text-white focus:border-neon-blue focus:outline-none transition-colors"
                placeholder="your.email@example.com"
              />
            </div>

            {/* Game Name */}
            <div>
              <label htmlFor="game_name" className="block font-body text-sm text-text-secondary mb-2 uppercase tracking-wider">
                <Gamepad2 className="w-4 h-4 inline mr-2" />
                In-Game Name (IGN) *
              </label>
              <input
                type="text"
                id="game_name"
                name="game_name"
                data-testid="input-game-name"
                value={formData.game_name}
                onChange={handleChange}
                required
                className="w-full bg-darknet-terminal border border-border-DEFAULT px-4 py-3 font-body text-white focus:border-neon-blue focus:outline-none transition-colors"
                placeholder="Your MLBB username"
              />
            </div>

            {/* Preferred Role */}
            <div>
              <label htmlFor="preferred_role" className="block font-body text-sm text-text-secondary mb-2 uppercase tracking-wider">
                Preferred Role *
              </label>
              <select
                id="preferred_role"
                name="preferred_role"
                data-testid="select-role"
                value={formData.preferred_role}
                onChange={handleChange}
                required
                className="w-full bg-darknet-terminal border border-border-DEFAULT px-4 py-3 font-body text-white focus:border-neon-blue focus:outline-none transition-colors"
              >
                <option value="">Select your preferred role</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            {/* Experience Level */}
            <div>
              <label htmlFor="experience" className="block font-body text-sm text-text-secondary mb-2 uppercase tracking-wider">
                Experience Level *
              </label>
              <select
                id="experience"
                name="experience"
                data-testid="select-experience"
                value={formData.experience}
                onChange={handleChange}
                required
                className="w-full bg-darknet-terminal border border-border-DEFAULT px-4 py-3 font-body text-white focus:border-neon-blue focus:outline-none transition-colors"
              >
                <option value="">Select your experience level</option>
                {experienceLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            {/* Discord Username */}
            <div>
              <label htmlFor="discord_username" className="block font-body text-sm text-text-secondary mb-2 uppercase tracking-wider">
                <MessageCircle className="w-4 h-4 inline mr-2" />
                Discord Username (Optional)
              </label>
              <input
                type="text"
                id="discord_username"
                name="discord_username"
                data-testid="input-discord"
                value={formData.discord_username}
                onChange={handleChange}
                className="w-full bg-darknet-terminal border border-border-DEFAULT px-4 py-3 font-body text-white focus:border-neon-blue focus:outline-none transition-colors"
                placeholder="username#1234"
              />
            </div>

            {/* Why Join */}
            <div>
              <label htmlFor="reason" className="block font-body text-sm text-text-secondary mb-2 uppercase tracking-wider">
                Why do you want to join NECROLINK? *
              </label>
              <textarea
                id="reason"
                name="reason"
                data-testid="textarea-reason"
                value={formData.reason}
                onChange={handleChange}
                required
                rows={5}
                className="w-full bg-darknet-terminal border border-border-DEFAULT px-4 py-3 font-body text-white focus:border-neon-blue focus:outline-none transition-colors resize-none"
                placeholder="Tell us about your goals, playstyle, and what you can bring to the team..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              data-testid="submit-application-btn"
              disabled={submitting}
              className="w-full px-8 py-4 bg-neon-red border-2 border-neon-red text-white font-heading text-lg tracking-wider uppercase hover:shadow-[0_0_30px_rgba(255,0,60,0.8)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                'Submitting...'
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Application
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <p className="font-body text-sm text-text-muted mb-2">Have questions? Reach out to us:</p>
          <div className="flex flex-wrap justify-center gap-4">
            <span className="font-body text-sm text-neon-blue">darknet@mlbb.com</span>
            <span className="text-text-muted">|</span>
            <span className="font-body text-sm text-neon-purple">Discord: NECROLINK_Official</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};