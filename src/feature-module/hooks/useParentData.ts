// hooks/useParentData.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { transformParentData } from '../../utils/parentUtils';
import { Guardian, Parent } from '../../types/types';

export const useParentData = (
  seasonParam: string | null,
  yearParam: string | null
) => {
  const {
    parents = [],
    fetchParentsData,
    parent: currentUser,
    fetchAllParents,
    fetchAllGuardians,
  } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [allParents, setAllParents] = useState<Parent[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!currentUser) {
        setError('No user data found.');
        return;
      }

      const queryParams = new URLSearchParams();
      if (seasonParam) queryParams.append('season', seasonParam);
      if (yearParam) queryParams.append('year', yearParam);

      // Cache for 5 minutes (300000 ms)
      const shouldFetch = Date.now() - lastFetchTime > 300000;

      if (currentUser.role === 'admin') {
        if (shouldFetch) {
          const [parentsData, guardiansData] = await Promise.all([
            fetchAllParents(queryParams.toString()),
            fetchAllGuardians(queryParams.toString()),
          ]);
          setAllParents(parentsData || []);
          setGuardians(guardiansData || []);
          setLastFetchTime(Date.now());
        }
      } else {
        await fetchParentsData(currentUser._id);
        setGuardians([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [
    currentUser,
    seasonParam,
    yearParam,
    fetchAllParents,
    fetchAllGuardians,
    fetchParentsData,
    lastFetchTime,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const combinedData = useMemo(() => {
    if (!currentUser) return [];
    // Use allParents for admin, parents for regular users
    const parentsToUse = currentUser.role === 'admin' ? allParents : parents;
    return transformParentData(parentsToUse, guardians, currentUser);
  }, [allParents, parents, guardians, currentUser]);

  return {
    loading,
    error,
    combinedData,
    refresh: fetchData,
    rawParents: currentUser?.role === 'admin' ? allParents : parents,
    rawGuardians: guardians,
  };
};
