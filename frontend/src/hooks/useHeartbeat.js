import { useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const INTERVAL_MS = 30_000;

/**
 * Sends a heartbeat every 30 seconds when the user is logged in.
 * Fires immediately on mount, then on each interval.
 */
export const useHeartbeat = () => {
  const { user } = useAuth();
  const timerRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const beat = () => {
      axios.post(`${API}/online/heartbeat`, {}, { withCredentials: true }).catch(() => {});
    };

    beat();
    timerRef.current = setInterval(beat, INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [user]);
};
