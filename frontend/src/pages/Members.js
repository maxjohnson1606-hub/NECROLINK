import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Award, Zap } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const roleColors = {
  Tank: 'border-neon-blue text-neon-blue',
  Roam: 'border-neon-purple text-neon-purple',
  Jungle: 'border-neon-red text-neon-red',
  Mid: 'border-yellow-400 text-yellow-400',
  Gold: 'border-green-400 text-green-400',
  EXP: 'border-orange-400 text-orange-400',
};

export const Members = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data } = await axios.get(`${API}/members`);
      setMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const leaders = members.filter(m => m.is_leader);
  const coLeaders = members.filter(m => m.is_co_leader && !m.is_leader);
  const regularMembers = members.filter(m => !m.is_leader && !m.is_co_leader);

  const MemberCard = ({ member, index }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-darknet-surface border border-border-DEFAULT p-6 hover:border-neon-blue/50 transition-all"
      data-testid={`member-card-${member.game_name}`}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-20 h-20 border-2 border-neon-blue flex-shrink-0 overflow-hidden">
          {member.avatar_url ? (
            <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-darknet-terminal flex items-center justify-center">
              <Zap className="w-8 h-8 text-neon-blue" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h3 className="font-heading text-lg font-bold text-white uppercase mb-1">{member.name}</h3>
          <p className="font-body text-sm text-neon-blue mb-2">{member.game_name}</p>
          
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`px-2 py-1 text-xs font-body uppercase tracking-wider border ${roleColors[member.role] || 'border-text-muted text-text-muted'}`}>
              {member.role}
            </span>
            <span className="px-2 py-1 text-xs font-body uppercase tracking-wider border border-neon-purple text-neon-purple">
              {member.rank}
            </span>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mb-3">
            <div>
              <p className="font-body text-xs text-text-muted">Wins</p>
              <p className="font-body text-base font-bold text-neon-blue">{member.wins || 0}</p>
            </div>
            <div>
              <p className="font-body text-xs text-text-muted">MVP</p>
              <p className="font-body text-base font-bold text-neon-purple">{member.mvp_count || 0}</p>
            </div>
          </div>

          {/* Achievements */}
          {member.achievements && member.achievements.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {member.achievements.map((achievement, idx) => (
                <div key={idx} className="flex items-center gap-1 text-xs font-body text-text-secondary">
                  <Award className="w-3 h-3 text-neon-red" />
                  <span>{achievement}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-darknet-bg flex items-center justify-center">
        <div className="text-neon-blue font-body text-xl">Loading members...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darknet-bg py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase mb-4 neon-glow-blue" data-testid="members-title">
            Our Warriors
          </h1>
          <p className="font-body text-lg text-text-secondary tracking-wide">
            Meet the elite players of Dark_Net
          </p>
        </div>

        {/* Leaders */}
        {leaders.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="w-6 h-6 text-neon-red" />
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-neon-red uppercase tracking-tight" data-testid="leaders-section">
                Leader
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {leaders.map((member, index) => (
                <MemberCard key={member.game_name} member={member} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* Co-Leaders */}
        {coLeaders.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="w-6 h-6 text-neon-purple" />
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-neon-purple uppercase tracking-tight" data-testid="co-leaders-section">
                Co-Leaders
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {coLeaders.map((member, index) => (
                <MemberCard key={member.game_name} member={member} index={index} />
              ))}
            </div>
          </section>
        )}

        {/* Regular Members */}
        {regularMembers.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-6 h-6 text-neon-blue" />
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-neon-blue uppercase tracking-tight" data-testid="members-section">
                Members
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {regularMembers.map((member, index) => (
                <MemberCard key={member.game_name} member={member} index={index} />
              ))}
            </div>
          </section>
        )}

        {members.length === 0 && (
          <div className="text-center py-12">
            <p className="font-body text-text-muted" data-testid="no-members">No members to display yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};