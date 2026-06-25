import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Mail, Lock, UserPlus, Eye, EyeOff, Gamepad2, ChevronDown, Shield } from 'lucide-react';

const ROLES = ['Tank', 'Roam', 'Jungle', 'Mid', 'Gold', 'EXP'];

const InputField = ({ label, icon: Icon, type = 'text', name, value, onChange, placeholder, required, min, children }) => {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label className="block font-body text-xs text-text-secondary mb-1.5 uppercase tracking-wider">
        {Icon && <Icon className="w-3 h-3 inline mr-1" />}
        {label}
      </label>
      <div className="relative">
        <input
          type={isPassword ? (showPw ? 'text' : 'password') : type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          minLength={min}
          placeholder={placeholder}
          autoComplete={isPassword ? (name === 'confirm_password' ? 'new-password' : name === 'new_password' ? 'new-password' : 'current-password') : name === 'email' ? 'email' : 'off'}
          className="w-full bg-darknet-terminal border border-border-DEFAULT px-4 py-2.5 pr-10 font-body text-white text-sm focus:border-neon-blue focus:outline-none focus:shadow-[0_0_8px_rgba(0,229,255,0.2)] transition-all placeholder:text-text-muted/50"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPw(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-neon-blue transition-colors"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

const PasswordStrength = ({ password }) => {
  if (!password) return null;
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['border-neon-red text-neon-red', 'border-yellow-400 text-yellow-400', 'border-neon-blue text-neon-blue', 'border-neon-blue text-neon-blue'];
  const widths = ['w-1/4', 'w-2/4', 'w-3/4', 'w-full'];
  const barColors = ['bg-neon-red', 'bg-yellow-400', 'bg-neon-blue', 'bg-neon-blue'];
  return (
    <div className="mt-1.5 space-y-1">
      <div className="h-1 bg-darknet-terminal rounded-full overflow-hidden">
        <div className={`h-full ${widths[strength - 1] || 'w-0'} ${barColors[strength - 1] || ''} transition-all duration-300`} />
      </div>
      {strength > 0 && (
        <p className={`font-body text-[10px] uppercase tracking-wider ${colors[strength - 1]}`}>
          {labels[strength - 1]}
        </p>
      )}
    </div>
  );
};

export const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirm_password: '',
    name: '',
    game_name: '',
    preferred_role: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isLogin) {
      if (!formData.name.trim()) { setError('Full name is required'); return; }
      if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return; }
      if (formData.password !== formData.confirm_password) { setError('Passwords do not match'); return; }
    }

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

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({ email: '', password: '', confirm_password: '', name: '', game_name: '', preferred_role: '' });
  };

  return (
    <div className="min-h-screen bg-darknet-bg flex items-center justify-center py-16 px-4 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(0,229,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Mode toggle pills */}
        <div className="flex mb-6 bg-darknet-surface border border-border-DEFAULT p-1">
          <button
            onClick={() => isLogin || switchMode()}
            className={`flex-1 flex items-center justify-center gap-2 py-2 font-body text-xs uppercase tracking-wider transition-all ${
              isLogin ? 'bg-neon-blue text-darknet-bg font-bold' : 'text-text-muted hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Login
          </button>
          <button
            onClick={() => !isLogin || switchMode()}
            className={`flex-1 flex items-center justify-center gap-2 py-2 font-body text-xs uppercase tracking-wider transition-all ${
              !isLogin ? 'bg-neon-purple text-white font-bold' : 'text-text-muted hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Register
          </button>
        </div>

        <div className={`bg-darknet-surface border p-8 ${isLogin ? 'border-neon-blue/40 border-glow-blue' : 'border-neon-purple/40'}`}>
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-14 h-14 border-2 mb-4 ${isLogin ? 'border-neon-blue text-neon-blue' : 'border-neon-purple text-neon-purple'}`}>
              {isLogin ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
            </div>
            <h1 className={`font-heading text-2xl font-black uppercase tracking-tight mb-1 ${isLogin ? 'text-neon-blue' : 'text-neon-purple'}`}>
              {isLogin ? 'Welcome Back' : 'Join NECROLINK'}
            </h1>
            <p className="font-body text-xs text-text-muted">
              {isLogin ? 'Access your NECROLINK account' : 'Create your account and join the clan'}
            </p>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-neon-red/10 border border-neon-red p-3 mb-5"
              >
                <p className="font-body text-sm text-neon-red">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="register-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <InputField label="Full Name *" icon={null} name="name" value={formData.name} onChange={handleChange} placeholder="Your full name" required />
                  <InputField label="In-Game Name (IGN)" icon={Gamepad2} name="game_name" value={formData.game_name} onChange={handleChange} placeholder="Your MLBB username" />

                  {/* Role dropdown */}
                  <div className="relative">
                    <label className="block font-body text-xs text-text-secondary mb-1.5 uppercase tracking-wider">Preferred Role</label>
                    <button
                      type="button"
                      onClick={() => setShowRoleDropdown(s => !s)}
                      className="w-full flex items-center justify-between bg-darknet-terminal border border-border-DEFAULT px-4 py-2.5 font-body text-sm text-left focus:border-neon-blue focus:outline-none transition-colors"
                    >
                      <span className={formData.preferred_role ? 'text-white' : 'text-text-muted/50'}>
                        {formData.preferred_role || 'Select your role...'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${showRoleDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showRoleDropdown && (
                      <div className="absolute z-50 w-full bg-darknet-surface border border-neon-blue/50 mt-1 shadow-xl">
                        {ROLES.map(r => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => { setFormData({ ...formData, preferred_role: r }); setShowRoleDropdown(false); }}
                            className="w-full text-left px-4 py-2.5 font-body text-sm text-text-secondary hover:text-neon-blue hover:bg-neon-blue/10 transition-colors border-b border-border-DEFAULT last:border-b-0"
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <InputField label="Email Address" icon={Mail} type="email" name="email" value={formData.email} onChange={handleChange} placeholder="your@email.com" required />

            <div>
              <InputField label="Password" icon={Lock} type="password" name="password" value={formData.password} onChange={handleChange} placeholder={isLogin ? "Enter your password" : "Min. 6 characters"} required min={6} />
              {!isLogin && <PasswordStrength password={formData.password} />}
            </div>

            {!isLogin && (
              <InputField label="Confirm Password" icon={Lock} type="password" name="confirm_password" value={formData.confirm_password} onChange={handleChange} placeholder="Re-enter your password" required />
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full px-6 py-3 border-2 text-white font-heading text-sm tracking-wider uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 ${
                isLogin
                  ? 'bg-neon-blue border-neon-blue text-darknet-bg hover:shadow-[0_0_20px_rgba(0,229,255,0.5)]'
                  : 'bg-neon-red border-neon-red hover:shadow-[0_0_20px_rgba(255,0,60,0.6)]'
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : isLogin ? (
                <><LogIn className="w-4 h-4" /> Login</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Create Account</>
              )}
            </button>
          </form>

          {/* Default credentials hint for demo */}
          {isLogin && (
            <div className="mt-5 p-3 bg-neon-blue/5 border border-neon-blue/20">
              <p className="font-body text-[10px] text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Demo Accounts
              </p>
              <div className="space-y-1">
                <p className="font-mono text-[10px] text-neon-red">owner@necrolink.com / Owner2024!</p>
                <p className="font-mono text-[10px] text-neon-purple">admin@necrolink.com / Necrolink2024!</p>
              </div>
            </div>
          )}

          <div className="mt-5 text-center">
            <Link to="/" className="font-body text-xs text-text-muted hover:text-neon-blue transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
