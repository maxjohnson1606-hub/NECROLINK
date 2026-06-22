import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Crown, UserCog, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROLE_CONFIG = {
  Owner: { icon: Crown, color: 'text-neon-red', border: 'border-neon-red', glow: 'border-glow-red' },
  Admin: { icon: Shield, color: 'text-neon-purple', border: 'border-neon-purple', glow: 'border-glow-purple' },
  Moderator: { icon: UserCog, color: 'text-neon-blue', border: 'border-neon-blue', glow: 'border-glow-blue' },
  'Event Manager': { icon: Calendar, color: 'text-yellow-400', border: 'border-yellow-400', glow: '' },
};

export const Staff = () => {
  const [staff, setStaff] = useState({ Owner: [], Admin: [], Moderator: [], 'Event Manager': [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API}/staff`);
        setStaff(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const StaffCard = ({ member, index, config }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-darknet-surface border ${config.border} p-5 ${config.glow}`}
      data-testid={`staff-${member.game_name}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-16 h-16 border-2 ${config.border} bg-darknet-terminal overflow-hidden flex-shrink-0`}>
          {member.avatar_url ? (
            <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-heading font-black text-xl text-text-muted">
              {(member.name || '?').slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link to={`/members/${member.game_name}`} className="font-heading text-base font-bold text-white uppercase hover:text-neon-blue block truncate">
            {member.name}
          </Link>
          <p className="font-body text-xs text-text-muted truncate">{member.game_name}</p>
          <p className={`font-body text-[10px] uppercase tracking-wider ${config.color} mt-1`}>{member.role} • {member.rank}</p>
        </div>
      </div>
      {member.bio && <p className="font-body text-xs text-text-secondary leading-relaxed line-clamp-3">{member.bio}</p>}
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-darknet-bg py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-darknet-terminal border-2 border-neon-red flex items-center justify-center border-glow-red">
              <Shield className="w-8 h-8 text-neon-red" />
            </div>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase mb-4 neon-glow-red" data-testid="staff-title">
            Staff Team
          </h1>
          <p className="font-body text-lg text-text-secondary tracking-wide">The leaders who keep NECROLINK running</p>
        </div>

        {loading ? (
          <p className="text-center font-body text-text-muted">Loading staff...</p>
        ) : (
          <div className="space-y-12">
            {Object.entries(staff).map(([role, members]) => {
              if (!members.length) return null;
              const config = ROLE_CONFIG[role] || ROLE_CONFIG.Moderator;
              const Icon = config.icon;
              return (
                <section key={role} data-testid={`staff-section-${role.toLowerCase().replace(' ', '-')}`}>
                  <h2 className={`font-heading text-2xl font-bold ${config.color} uppercase tracking-tight mb-4 flex items-center gap-3`}>
                    <Icon className="w-6 h-6" /> {role} ({members.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {members.map((m, i) => <StaffCard key={m.game_name} member={m} index={i} config={config} />)}
                  </div>
                </section>
              );
            })}

            {Object.values(staff).every((arr) => arr.length === 0) && (
              <p className="text-center font-body text-text-muted" data-testid="no-staff">No staff members configured yet. Admins can mark members as staff in the dashboard.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
