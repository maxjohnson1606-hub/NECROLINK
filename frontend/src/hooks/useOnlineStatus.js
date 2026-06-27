import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const POLL_MS = 30_000;

/**
 * Polls /api/online/status every 30 seconds.
 * Returns { onlineUsers: [...], onlineCount: N, onlineNames: Set<string> }
 * onlineNames contains game_names and user_names for quick lookup.
 */
export const useOnlineStatus = () => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const timerRef = useRef(null);

  const fetch = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/online/status`);
      setOnlineUsers(data.online || []);
    } catch {
      // silent — not critical
    }
  }, []);

  useEffect(() => {
    fetch();
    timerRef.current = setInterval(fetch, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetch]);

  const onlineNames = new Set([
    ...onlineUsers.map(u => u.user_name?.toLowerCase()),
    ...onlineUsers.map(u => u.game_name?.toLowerCase()),
  ].filter(Boolean));

  return {
    onlineUsers,
    onlineCount: onlineUsers.length,
    onlineNames,
    isOnline: (name) => onlineNames.has(name?.toLowerCase()),
  };
};
