import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Award, Crown } from 'lucide-react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TABS = [
  { id: 'top_wins', label: 'Top Players', icon: Trophy, color: 'text-neon-blue', stat: 'wins' },
  { id: 'top_mvp', label: 'MVP Rankings', icon: Star, color: 'text-neon-purple', stat: 'mvp_count' },
  { id: 'top_points', label: 'Most Active', icon: Award, color: 'text-neon-red', stat: 'points' },
  { id: 'tournament_winners', label: 'Tournament Winners', icon: Crown, color: 'text-yellow-400', stat: null },
];

export const Leaderboard = () => {
  const [data, setData] = useState({ top_wins: [], top_mvp: [], top_points: [], tournament_winners: [] });
  const [activeTab, setActiveTab] = useState('top_wins');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API}/leaderboard`);
        setData(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const activeTabConfig = TABS.find((t) => t.id === activeTab);
  const list = data[activeTab] || [];

  return (
    <div className="min-h-screen bg-darknet-bg py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-darknet-terminal border-2 border-neon-purple flex items-center justify-center border-glow-purple">
              <Trophy className="w-8 h-8 text-neon-purple" />
            </div>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase mb-4 neon-glow-purple" data-testid="leaderboard-title">
            Leaderboard
          </h1>
          <p className="font-body text-lg text-text-secondary tracking-wide">The best of NECROLINK</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} data-testid={`leaderboard-tab-${tab.id}`}
                className={`flex items-center gap-2 px-4 py-2 font-body text-xs uppercase tracking-wider border transition-all ${
                  activeTab === tab.id ? `bg-neon-purple/20 border-neon-purple ${tab.color}` : 'border-border-DEFAULT text-text-secondary hover:border-neon-purple/50'
                }`}>
                <Icon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p className="text-center font-body text-text-muted">Loading leaderboard...</p>
        ) : list.length === 0 ? (
          <p className="text-center font-body text-text-muted" data-testid="no-leaderboard-data">No data yet for this category.</p>
        ) : activeTab === 'tournament_winners' ? (
          <div className="space-y-3" data-testid="tournament-winners-list">
            {list.map((tw, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-darknet-surface border border-border-DEFAULT p-4">
                <h3 className="font-heading text-base font-bold text-white uppercase mb-2 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-400" /> {tw.tournament}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {tw.winners.slice(0, 3).map((w, idx) => (
                    <div key={idx} className={`px-3 py-2 border ${idx === 0 ? 'border-yellow-400 text-yellow-400' : idx === 1 ? 'border-text-secondary text-text-secondary' : 'border-orange-400 text-orange-400'}`}>
                      <p className="font-body text-[10px] uppercase tracking-wider">{idx === 0 ? '🥇 Champion' : idx === 1 ? '🥈 Runner-up' : '🥉 Third'}</p>
                      <p className="font-heading text-sm font-bold">{w}</p>
                    </div>
                  ))}
                </div>
                {tw.end_date && <p className="font-body text-[10px] text-text-muted mt-2">{new Date(tw.end_date).toLocaleDateString()}</p>}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-2" data-testid={`leaderboard-list-${activeTab}`}>
            {list.map((member, i) => (
              <motion.div key={member.game_name} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className={`bg-darknet-surface border ${i < 3 ? 'border-neon-purple/40' : 'border-border-DEFAULT'} p-4 flex items-center gap-4`}>
                <div className={`font-heading text-3xl font-black w-12 text-center ${
                  i === 0 ? 'text-yellow-400' : i === 1 ? 'text-text-secondary' : i === 2 ? 'text-orange-400' : 'text-text-muted'
                }`}>
                  #{i + 1}
                </div>
                <div className="w-12 h-12 border border-neon-purple bg-darknet-terminal overflow-hidden flex-shrink-0">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-heading text-neon-purple">{(member.name || '?').slice(0, 1)}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/members/${member.game_name}`} className="font-heading text-base font-bold text-white uppercase hover:text-neon-blue transition-colors block truncate">
                    {member.name}
                  </Link>
                  <p className="font-body text-xs text-text-muted truncate">{member.game_name} • {member.role} • {member.rank}</p>
                </div>
                <div className="text-right">
                  <p className={`font-heading text-2xl font-bold ${activeTabConfig.color}`}>
                    {(member[activeTabConfig.stat] || 0).toLocaleString()}
                  </p>
                  <p className="font-body text-[10px] uppercase tracking-wider text-text-muted">{activeTabConfig.stat.replace('_', ' ')}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
