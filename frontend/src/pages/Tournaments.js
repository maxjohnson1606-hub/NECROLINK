import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, Users, ChevronRight, X } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Bracket = ({ bracket }) => {
  if (!bracket?.rounds) return <p className="font-body text-text-muted text-sm">Bracket not finalized yet.</p>;
  return (
    <div className="flex gap-4 overflow-x-auto pb-4" data-testid="bracket-view">
      {bracket.rounds.map((round, ri) => (
        <div key={ri} className="flex-shrink-0 min-w-[200px]">
          <h4 className="font-heading text-xs uppercase tracking-[0.2em] text-neon-purple mb-3 text-center">{round.name}</h4>
          <div className="space-y-3">
            {round.matches.map((m, mi) => (
              <div key={mi} className="bg-darknet-terminal border border-border-DEFAULT p-3" data-testid={`bracket-match-${ri}-${mi}`}>
                <div className={`flex justify-between items-center font-body text-xs py-1 ${m.winner === m.team1 ? 'text-neon-blue font-bold' : 'text-text-secondary'}`}>
                  <span className="truncate">{m.team1}</span>
                  <span>{m.score1 ?? '-'}</span>
                </div>
                <div className="h-px bg-border-DEFAULT my-1" />
                <div className={`flex justify-between items-center font-body text-xs py-1 ${m.winner === m.team2 ? 'text-neon-blue font-bold' : 'text-text-secondary'}`}>
                  <span className="truncate">{m.team2}</span>
                  <span>{m.score2 ?? '-'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const TournamentDetail = ({ tournament, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={onClose} data-testid="tournament-modal">
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-darknet-surface border border-neon-purple max-w-4xl w-full max-h-[90vh] overflow-y-auto border-glow-purple" onClick={(e) => e.stopPropagation()}>
      {tournament.banner_url && (
        <div className="h-48 bg-cover bg-center relative" style={{ backgroundImage: `url(${tournament.banner_url})` }}>
          <div className="absolute inset-0 bg-black/60" />
          <button onClick={onClose} className="absolute top-3 right-3 p-2 bg-black/80 text-white hover:text-neon-red" data-testid="close-tournament-modal">
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-4">
            <span className={`px-2 py-0.5 text-[10px] font-body uppercase tracking-wider border bg-black/70 mb-2 inline-block ${
              tournament.status === 'ongoing' ? 'border-neon-red text-neon-red' :
              tournament.status === 'upcoming' ? 'border-neon-blue text-neon-blue' :
              'border-text-muted text-text-muted'
            }`}>{tournament.status}</span>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-white uppercase tracking-tight">{tournament.name}</h2>
          </div>
        </div>
      )}
      <div className="p-6 space-y-4">
        <p className="font-body text-sm text-text-secondary leading-relaxed">{tournament.description}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-darknet-terminal border border-border-DEFAULT p-3">
            <p className="font-body text-[10px] uppercase tracking-wider text-text-muted">Start</p>
            <p className="font-body text-xs text-neon-blue">{new Date(tournament.start_date).toLocaleDateString()}</p>
          </div>
          {tournament.end_date && (
            <div className="bg-darknet-terminal border border-border-DEFAULT p-3">
              <p className="font-body text-[10px] uppercase tracking-wider text-text-muted">End</p>
              <p className="font-body text-xs text-neon-blue">{new Date(tournament.end_date).toLocaleDateString()}</p>
            </div>
          )}
          {tournament.prize_pool && (
            <div className="bg-darknet-terminal border border-border-DEFAULT p-3">
              <p className="font-body text-[10px] uppercase tracking-wider text-text-muted">Prize</p>
              <p className="font-body text-xs text-neon-red">{tournament.prize_pool}</p>
            </div>
          )}
          <div className="bg-darknet-terminal border border-border-DEFAULT p-3">
            <p className="font-body text-[10px] uppercase tracking-wider text-text-muted">Max Teams</p>
            <p className="font-body text-xs text-neon-purple">{tournament.max_teams}</p>
          </div>
        </div>

        {tournament.rules && (
          <div>
            <h3 className="font-heading text-sm uppercase tracking-wider text-neon-blue mb-2">Rules</h3>
            <p className="font-body text-xs text-text-secondary leading-relaxed whitespace-pre-line">{tournament.rules}</p>
          </div>
        )}

        {tournament.winners && tournament.winners.length > 0 && (
          <div>
            <h3 className="font-heading text-sm uppercase tracking-wider text-neon-red mb-2 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Winners
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {tournament.winners.slice(0, 3).map((w, i) => (
                <div key={i} className={`bg-darknet-terminal border p-2 text-center ${
                  i === 0 ? 'border-yellow-400' : i === 1 ? 'border-text-secondary' : 'border-orange-400'
                }`}>
                  <p className="font-heading text-[10px] uppercase tracking-wider text-text-muted">
                    {i === 0 ? '1st' : i === 1 ? '2nd' : '3rd'}
                  </p>
                  <p className="font-body text-xs text-white">{w}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="font-heading text-sm uppercase tracking-wider text-neon-purple mb-2">Bracket</h3>
          <Bracket bracket={tournament.bracket} />
        </div>
      </div>
    </motion.div>
  </div>
);

const TournamentCard = ({ t, index, onView }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="bg-darknet-surface border border-border-DEFAULT overflow-hidden hover:border-neon-purple/60 transition-all"
    data-testid={`tournament-card-${t.id}`}
  >
    {t.banner_url && (
      <div className="h-40 bg-cover bg-center relative" style={{ backgroundImage: `url(${t.banner_url})` }}>
        <div className="absolute inset-0 bg-black/40" />
        <div className={`absolute top-3 left-3 px-2 py-1 text-xs font-body uppercase tracking-wider border bg-black/70 ${
          t.status === 'ongoing' ? 'border-neon-red text-neon-red' :
          t.status === 'upcoming' ? 'border-neon-blue text-neon-blue' :
          'border-text-muted text-text-muted'
        }`}>{t.status}</div>
      </div>
    )}
    <div className="p-5">
      <h3 className="font-heading text-lg font-bold text-white uppercase mb-2 leading-tight">{t.name}</h3>
      <p className="font-body text-sm text-text-secondary leading-relaxed mb-3 line-clamp-2">{t.description}</p>
      <div className="space-y-1 mb-4">
        <div className="flex items-center gap-2 font-body text-xs text-text-secondary">
          <Calendar className="w-3 h-3 text-neon-blue" />
          {new Date(t.start_date).toLocaleDateString()}
        </div>
        {t.prize_pool && (
          <div className="flex items-center gap-2 font-body text-xs text-neon-red">
            <Trophy className="w-3 h-3" /> {t.prize_pool}
          </div>
        )}
        <div className="flex items-center gap-2 font-body text-xs text-text-secondary">
          <Users className="w-3 h-3 text-neon-purple" /> {t.max_teams} teams max
        </div>
      </div>
      <button onClick={() => onView(t)} data-testid={`view-tournament-${t.id}`}
        className="w-full px-4 py-2 bg-neon-purple/10 border border-neon-purple text-neon-purple font-body text-xs uppercase tracking-wider hover:bg-neon-purple/20 flex items-center justify-center gap-2">
        View Bracket <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  </motion.div>
);

export const Tournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchTournaments(); }, []);

  const fetchTournaments = async () => {
    try {
      const { data } = await axios.get(`${API}/tournaments`);
      setTournaments(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = filter === 'all' ? tournaments : tournaments.filter((t) => t.status === filter);

  return (
    <div className="min-h-screen bg-darknet-bg py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-darknet-terminal border-2 border-neon-red flex items-center justify-center border-glow-red">
              <Trophy className="w-8 h-8 text-neon-red" />
            </div>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter uppercase mb-4 neon-glow-red" data-testid="tournaments-title">
            Tournaments
          </h1>
          <p className="font-body text-lg text-text-secondary tracking-wide">Compete. Conquer. Claim glory.</p>
        </div>

        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {['all', 'upcoming', 'ongoing', 'completed'].map((s) => (
            <button key={s} onClick={() => setFilter(s)} data-testid={`tournament-filter-${s}`}
              className={`px-4 py-2 font-body text-xs uppercase tracking-wider border transition-all ${
                filter === s ? 'bg-neon-purple/20 border-neon-purple text-neon-purple' : 'border-border-DEFAULT text-text-secondary hover:border-neon-purple/50'
              }`}>
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center font-body text-text-muted">Loading tournaments...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center font-body text-text-muted" data-testid="no-tournaments">No tournaments in this category yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((t, i) => <TournamentCard key={t.id} t={t} index={i} onView={setSelected} />)}
          </div>
        )}
      </div>

      {selected && <TournamentDetail tournament={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};
