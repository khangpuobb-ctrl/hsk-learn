import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export function useProgress() {
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProgress = useCallback(async () => {
    // Only fetch if authenticated
    if (!localStorage.getItem('token')) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/api/progress');
      setProgressData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch progress');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSrs = useCallback(async (vocabId, quality) => {
    try {
      const result = await api.post('/api/progress/update', { vocab_id: vocabId, quality });
      // Refresh local progress stats after update
      fetchProgress();
      return result;
    } catch (err) {
      console.error('Failed to update SRS progress:', err);
      throw err;
    }
  }, [fetchProgress]);

  useEffect(() => {
    fetchProgress();
    
    // Listen for custom auth-change events to fetch/clear data
    const handleAuthChange = () => {
      if (localStorage.getItem('token')) {
        fetchProgress();
      } else {
        setProgressData(null);
      }
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, [fetchProgress]);

  return {
    progressData,
    loading,
    error,
    refreshProgress: fetchProgress,
    updateSrs,
  };
}
