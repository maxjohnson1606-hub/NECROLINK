import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, UserPlus } from 'lucide-react';

export const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    game_name: '',
    preferred_role: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let result;
    if (isLogin) {
      result = await login(formData.email, formData.password);
    } else {
      result = await register(
        formData.email,
        formData.password,
        formData.name,
        formData.game_name,
        formData.preferred_role
      );
    }

    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-darknet-bg flex items-center justify-center py-16 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-darknet-surface border border-neon-blue/50 p-8 border-glow-blue">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-heading text-3xl font-black text-neon-blue uppercase tracking-tight mb-2" data-testid="login-title">
              {isLogin ? 'Login' : 'Register'}
            </h1>
            <p className="font-body text-sm text-text-secondary">
              {isLogin ? 'Access your Dark_Net account' : 'Create a new account'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-neon-red/10 border border-neon-red p-3 mb-6" data-testid="error-message">
              <p className="font-body text-sm text-neon-red">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label htmlFor="name" className="block font-body text-xs text-text-secondary mb-2 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    data-testid="register-name"
                    value={formData.name}
                    onChange={handleChange}
                    required={!isLogin}
                    className="w-full bg-darknet-terminal border border-border-DEFAULT px-4 py-2 font-body text-white text-sm focus:border-neon-blue focus:outline-none"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label htmlFor="game_name" className="block font-body text-xs text-text-secondary mb-2 uppercase tracking-wider">
                    In-Game Name
                  </label>
                  <input
                    type="text"
                    id="game_name"
                    name="game_name"
                    data-testid="register-game-name"
                    value={formData.game_name}
                    onChange={handleChange}
                    className="w-full bg-darknet-terminal border border-border-DEFAULT px-4 py-2 font-body text-white text-sm focus:border-neon-blue focus:outline-none"
                    placeholder="Your MLBB IGN"
                  />
                </div>

                <div>
                  <label htmlFor="preferred_role" className="block font-body text-xs text-text-secondary mb-2 uppercase tracking-wider">
                    Preferred Role
                  </label>
                  <select
                    id="preferred_role"
                    name="preferred_role"
                    data-testid="register-role"
                    value={formData.preferred_role}
                    onChange={handleChange}
                    className="w-full bg-darknet-terminal border border-border-DEFAULT px-4 py-2 font-body text-white text-sm focus:border-neon-blue focus:outline-none"
                  >
                    <option value="">Select role</option>
                    <option value="Tank">Tank</option>
                    <option value="Roam">Roam</option>
                    <option value="Jungle">Jungle</option>
                    <option value="Mid">Mid</option>
                    <option value="Gold">Gold</option>
                    <option value="EXP">EXP</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block font-body text-xs text-text-secondary mb-2 uppercase tracking-wider">
                <Mail className="w-3 h-3 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                data-testid="login-email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full bg-darknet-terminal border border-border-DEFAULT px-4 py-2 font-body text-white text-sm focus:border-neon-blue focus:outline-none"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block font-body text-xs text-text-secondary mb-2 uppercase tracking-wider">
                <Lock className="w-3 h-3 inline mr-1" />
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                data-testid="login-password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full bg-darknet-terminal border border-border-DEFAULT px-4 py-2 font-body text-white text-sm focus:border-neon-blue focus:outline-none"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              data-testid="submit-login-btn"
              disabled={loading}
              className="w-full px-6 py-3 bg-neon-red border-2 border-neon-red text-white font-heading text-sm tracking-wider uppercase hover:shadow-[0_0_20px_rgba(255,0,60,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                'Processing...'
              ) : isLogin ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Login
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Register
                </>
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              data-testid="toggle-auth-mode"
              className="font-body text-sm text-neon-blue hover:text-neon-purple transition-colors"
            >
              {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
            </button>
          </div>

          {/* Back to Home */}
          <div className="mt-4 text-center">
            <Link to="/" className="font-body text-xs text-text-muted hover:text-neon-blue transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};