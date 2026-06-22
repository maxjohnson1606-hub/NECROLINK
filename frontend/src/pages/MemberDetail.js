import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Trophy, Star, Award, Hash, Gamepad2, Calendar, Shield } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RANK_COLOR = {
  Owner: 'border-neon-red text-neon-red',
  Leader: 'border-neon-red text-neon-red',
  'Co-Leader': 'border-neon-purple text-neon-purple',
  Officer: 'border-neon-blue text-neon-blue',
  Elite: 'border-yellow-400 text-yellow-400',
  Veteran: 'border-orange-400 text-orange-400',
  Member: 'border-green-400 text-green-400',
  Recruit: 'border-text-muted text-text-muted',
};

const BADGE_COLOR = {
  'Tournament Champion': 'border-yellow-400 text-yellow-400 bg-yellow-400/10',
  'Event Winner': 'border-neon-blue text-neon-blue bg-neon-blue/10',
  'MVP': 'border-neon-purple text-neon-purple bg-neon-purple/10',
  'Community Helper': 'border-green-400 text-green-400 bg-green-400/10',
  'Veteran': 'border-orange-400 text-orange-400 bg-orange-400/10',
};

export const MemberDetail = () => {
  const { game_name } = useParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API}/members/${encodeURIComponent(game_name)}`);
        setMember(data);
      } catch (e) {
        if (e.response?.status === 404) setNotFound(true);
        console.error(e);
      } finally { setLoading(false); }
    })();
  }, [game_name]);

  if (loading) return <div className="min-h-screen bg-darknet-bg flex items-center justify-center"><p className="font-body text-text-muted">Loading...</p></div>;
  if (notFound || !member) return (
    <div className="min-h-screen bg-darknet-bg flex flex-col items-center justify-center gap-3">
      <p className="font-body text-text-muted" data-testid="member-not-found">Member not found.</p>
      <Link to="/members" className="px-4 py-2 border border-neon-blue text-neon-blue font-body text-xs uppercase">Back to Members</Link>
    </div>
  );

  const rankClass = RANK_COLOR[member.rank] || RANK_COLOR.Member;

  return (
    <div className="min-h-screen bg-darknet-bg py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to="/members" data-testid="back-to-members" className="inline-flex items-center gap-2 font-body text-xs uppercase text-text-secondary hover:text-neon-blue mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to Members
        </Link>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-darknet-surface border border-neon-purple/50 border-glow-purple p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-36 h-36 border-2 border-neon-purple bg-darknet-terminal overflow-hidden flex-shrink-0">
              {member.avatar_url ? (
                <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-heading text-4xl font-black text-neon-purple">
                  {(member.name || '?').slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-heading text-3xl md:text-4xl font-black text-neon-purple uppercase tracking-tight mb-1" data-testid="member-name">{member.name}</h1>
              <p className="font-body text-sm text-neon-blue mb-3" data-testid="member-game-name">{member.game_name}</p>

              <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-3">
                <span className={`px-2 py-1 text-[10px] font-body uppercase tracking-[0.2em] border ${rankClass}`} data-testid="member-rank">
                  <Shield className="w-3 h-3 inline mr-1" /> {member.rank}
                </span>
                <span className="px-2 py-1 text-[10px] font-body uppercase tracking-[0.2em] border border-text-muted text-text-secondary">
                  {member.role}
                </span>
                {member.is_staff && member.staff_role && (
                  <span className="px-2 py-1 text-[10px] font-body uppercase tracking-[0.2em] border border-neon-red text-neon-red">
                    Staff: {member.staff_role}
                  </span>
                )}
              </div>

              {member.bio && <p className="font-body text-sm text-text-secondary leading-relaxed">{member.bio}</p>}
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-darknet-surface border border-neon-blue/50 p-4 text-center" data-testid="stat-wins">
            <Trophy className="w-6 h-6 text-neon-blue mx-auto mb-1" />
            <p className="font-heading text-2xl font-bold text-neon-blue">{member.wins || 0}</p>
            <p className="font-body text-[10px] uppercase tracking-wider text-text-muted">Wins</p>
          </div>
          <div className="bg-darknet-surface border border-neon-purple/50 p-4 text-center" data-testid="stat-mvp">
            <Star className="w-6 h-6 text-neon-purple mx-auto mb-1" />
            <p className="font-heading text-2xl font-bold text-neon-purple">{member.mvp_count || 0}</p>
            <p className="font-body text-[10px] uppercase tracking-wider text-text-muted">MVPs</p>
          </div>
          <div className="bg-darknet-surface border border-neon-red/50 p-4 text-center" data-testid="stat-points">
            <Award className="w-6 h-6 text-neon-red mx-auto mb-1" />
            <p className="font-heading text-2xl font-bold text-neon-red">{member.points || 0}</p>
            <p className="font-body text-[10px] uppercase tracking-wider text-text-muted">Points</p>
          </div>
          <div className="bg-darknet-surface border border-yellow-400/50 p-4 text-center" data-testid="stat-badges">
            <Award className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
            <p className="font-heading text-2xl font-bold text-yellow-400">{(member.badges || []).length}</p>
            <p className="font-body text-[10px] uppercase tracking-wider text-text-muted">Badges</p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-darknet-surface border border-border-DEFAULT p-4">
            <h3 className="font-heading text-sm uppercase tracking-wider text-neon-blue mb-3">Player Info</h3>
            <div className="space-y-2">
              {member.mlbb_id && (
                <div className="flex items-center gap-2 font-body text-xs text-text-secondary">
                  <Hash className="w-3 h-3 text-neon-blue" /> MLBB ID: <span className="text-white">{member.mlbb_id}</span>
                </div>
              )}
              <div className="flex items-center gap-2 font-body text-xs text-text-secondary">
                <Gamepad2 className="w-3 h-3 text-neon-blue" /> Main Role: <span className="text-white">{member.role}</span>
              </div>
              {member.join_date && (
                <div className="flex items-center gap-2 font-body text-xs text-text-secondary">
                  <Calendar className="w-3 h-3 text-neon-blue" /> Joined: <span className="text-white">{new Date(member.join_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-darknet-surface border border-border-DEFAULT p-4">
            <h3 className="font-heading text-sm uppercase tracking-wider text-neon-purple mb-3">Main Heroes</h3>
            {member.main_heroes?.length ? (
              <div className="flex flex-wrap gap-2">
                {member.main_heroes.map((h, i) => (
                  <span key={i} className="px-2 py-1 text-xs font-body bg-neon-purple/10 border border-neon-purple text-neon-purple">{h}</span>
                ))}
              </div>
            ) : <p className="font-body text-xs text-text-muted">No heroes listed.</p>}
          </div>
        </div>

        {/* Badges */}
        {member.badges?.length > 0 && (
          <div className="bg-darknet-surface border border-border-DEFAULT p-4 mb-6">
            <h3 className="font-heading text-sm uppercase tracking-wider text-neon-purple mb-3 flex items-center gap-2">
              <Award className="w-4 h-4" /> Badges
            </h3>
            <div className="flex flex-wrap gap-2" data-testid="member-badges">
              {member.badges.map((badge, i) => (
                <span key={i} className={`px-3 py-1 text-xs font-body uppercase tracking-wider border ${BADGE_COLOR[badge] || 'border-text-muted text-text-secondary'}`}>
                  {badge}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        {member.achievements?.length > 0 && (
          <div className="bg-darknet-surface border border-border-DEFAULT p-4">
            <h3 className="font-heading text-sm uppercase tracking-wider text-neon-blue mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Achievements
            </h3>
            <ul className="space-y-2" data-testid="member-achievements">
              {member.achievements.map((ach, i) => (
                <li key={i} className="flex items-start gap-2 font-body text-sm text-text-secondary">
                  <span className="text-neon-red mt-1">•</span> {ach}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
