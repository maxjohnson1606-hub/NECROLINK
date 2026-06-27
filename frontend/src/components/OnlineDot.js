import React from 'react';

/**
 * A pulsing green dot indicating online status.
 * size: 'sm' | 'md' | 'lg'
 * showLabel: show "Online" text beside it
 */
export const OnlineDot = ({ size = 'sm', showLabel = false, className = '' }) => {
  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="relative inline-flex">
        <span className={`${sizes[size]} rounded-full bg-green-400`} />
        <span className={`${sizes[size]} rounded-full bg-green-400 absolute inset-0 animate-ping opacity-60`} />
      </span>
      {showLabel && (
        <span className="font-body text-[10px] text-green-400 uppercase tracking-wider">Online</span>
      )}
    </span>
  );
};

/**
 * Online count badge pill — e.g. "3 online"
 */
export const OnlineCountBadge = ({ count, className = '' }) => {
  if (count === 0) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-400/10 border border-green-400/30 rounded-full ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      <span className="font-body text-[11px] text-green-400 font-medium">
        {count} online
      </span>
    </span>
  );
};
