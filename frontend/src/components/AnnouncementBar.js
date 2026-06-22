import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Megaphone } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COLOR_MAP = {
  purple: { bg: 'bg-neon-purple/20', border: 'border-neon-purple', text: 'text-neon-purple' },
  blue: { bg: 'bg-neon-blue/20', border: 'border-neon-blue', text: 'text-neon-blue' },
  red: { bg: 'bg-neon-red/20', border: 'border-neon-red', text: 'text-neon-red' },
};

export const AnnouncementBar = () => {
  const [bar, setBar] = useState(null);

  useEffect(() => {
    const fetchBar = async () => {
      try {
        const { data } = await axios.get(`${API}/announcement-bar`);
        if (data && data.is_active && data.text) setBar(data);
        else setBar(null);
      } catch (e) {
        setBar(null);
      }
    };
    fetchBar();
    const interval = setInterval(fetchBar, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!bar) return null;
  const colors = COLOR_MAP[bar.color] || COLOR_MAP.purple;

  return (
    <div
      className={`${colors.bg} ${colors.border} border-b py-2 overflow-hidden relative`}
      data-testid="announcement-bar"
    >
      <div className="flex items-center gap-3 max-w-7xl mx-auto px-4">
        <Megaphone className={`w-4 h-4 ${colors.text} flex-shrink-0`} />
        <div className="overflow-hidden flex-1">
          <div className="whitespace-nowrap animate-[scroll_30s_linear_infinite]">
            <span className={`${colors.text} font-body text-sm tracking-wide inline-block pr-12`}>
              {bar.text}
            </span>
            <span className={`${colors.text} font-body text-sm tracking-wide inline-block pr-12`}>
              {bar.text}
            </span>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};
