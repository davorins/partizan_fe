// hooks/useAllParents.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { message } from 'antd';
import {
  getParentStatusFromEvents,
  getPaymentStatusFromEvents,
} from '../../utils/statusUtils';
import { SeasonEvent } from '../../context/SeasonEventsContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const useAllParents = (
  filters: any = {},
  activeEvents: SeasonEvent[] = [],
) => {
  const [allParents, setAllParents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalParents, setTotalParents] = useState(0);
  const [isEnriching, setIsEnriching] = useState(false);

  const prevActiveEventsRef = useRef<string>('');

  // ─── Helper: Fetch full parent data with players ───
  const fetchFullParentData = useCallback(
    async (parentId: string): Promise<any> => {
      const token = localStorage.getItem('token');
      if (!token) return null;

      try {
        const response = await axios.get(`${API_BASE_URL}/parent/${parentId}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
        return response.data;
      } catch (err: any) {
        console.warn(`⚠️ Failed to fetch parent ${parentId}:`, err.message);
        return null;
      }
    },
    [],
  );

  // ─── Helper: Enrich parent with player data ───
  const enrichParentWithPlayers = useCallback(
    async (parent: any): Promise<any> => {
      const fullData = await fetchFullParentData(parent._id);

      if (fullData) {
        return {
          ...parent,
          players: fullData.players || [],
          additionalGuardians: fullData.additionalGuardians || [],
        };
      }

      // Fallback: return parent with empty players
      return {
        ...parent,
        players: [],
        additionalGuardians: parent.additionalGuardians || [],
      };
    },
    [fetchFullParentData],
  );

  // ─── Helper: Enrich all parents with player data ───
  const enrichAllParents = useCallback(
    async (parents: any[]): Promise<any[]> => {
      if (!parents.length) return parents;

      console.log(`🔄 Enriching ${parents.length} parents with player data...`);
      setIsEnriching(true);

      // Process in batches of 5 to avoid rate limiting
      const batchSize = 5;
      const enrichedParents: any[] = [];

      for (let i = 0; i < parents.length; i += batchSize) {
        const batch = parents.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map((parent) => enrichParentWithPlayers(parent)),
        );
        enrichedParents.push(...batchResults);

        console.log(
          `✅ Enriched ${Math.min(i + batchSize, parents.length)}/${parents.length} parents`,
        );
      }

      console.log(`✅ Finished enriching ${enrichedParents.length} parents`);
      setIsEnriching(false);
      return enrichedParents;
    },
    [enrichParentWithPlayers],
  );

  const fetchAllParents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token');

      const params: any = { ...filters };

      // 1. Fetch total count
      const countResponse = await axios.get(`${API_BASE_URL}/parents`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { ...params, limit: 1 },
      });

      const total = countResponse.data.pagination?.total || 0;
      setTotalParents(total);

      // 2. Fetch all parents (lightweight, without players)
      const limit = Math.min(total, 500);
      const requests = [];

      for (let i = 0; i < limit; i += 50) {
        requests.push(
          axios.get(`${API_BASE_URL}/parents`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { ...params, page: Math.floor(i / 50) + 1, limit: 50 },
          }),
        );
      }

      const responses = await Promise.all(requests);

      let allParentsData: any[] = [];
      responses.forEach((response) => {
        if (response.data.data) {
          allParentsData = [...allParentsData, ...response.data.data];
        }
      });

      console.log(`📦 Fetched ${allParentsData.length} parents from API`);

      // 3. Enrich each parent with full player data
      const enrichedParents = await enrichAllParents(allParentsData);

      // 4. Compute status and flatten data
      const flattenedData: any[] = [];

      enrichedParents.forEach((parent: any) => {
        // DEBUG: Log what we have
        console.log(`🔍 Parent: ${parent.fullName}`, {
          playersCount: parent.players?.length || 0,
          playerSeasons: parent.players?.map((p: any) => ({
            name: p.fullName,
            seasons: p.seasons,
            paymentComplete: p.paymentComplete,
          })),
        });

        // Compute status using the SAME logic as sidebar
        const status = getParentStatusFromEvents(parent, activeEvents);
        const paymentStatus = getPaymentStatusFromEvents(parent, activeEvents);

        console.log(`📊 ${parent.fullName} computed status:`, status);

        // Push parent
        flattenedData.push({
          ...parent,
          _id: parent._id,
          id: parent._id,
          fullName: parent.fullName || '',
          email: parent.email || '',
          phone: parent.phone || '',
          status, // ✅ Correctly computed
          paymentStatus,
          type: parent.isCoach ? 'coach' : 'parent',
          isCoach: parent.isCoach || false,
          players: parent.players || [],
          address: parent.address || {},
          aauNumber: parent.aauNumber || '',
          avatar: parent.avatar || '',
          imgSrc: parent.avatar || '',
          relationship:
            parent.relationship || (parent.isCoach ? 'Coach' : 'Parent'),
          DateofJoin: parent.createdAt || new Date().toISOString(),
          createdAt: parent.createdAt,
          updatedAt: parent.updatedAt,
          canView: true,
          parentId: null,
        });

        // Push guardians
        if (parent.additionalGuardians?.length > 0) {
          parent.additionalGuardians.forEach((guardian: any, index: number) => {
            const guardianWithPlayers = {
              ...guardian,
              players: parent.players || [],
              isCoach: guardian.isCoach || false,
            };
            const guardianStatus = getParentStatusFromEvents(
              guardianWithPlayers,
              activeEvents,
            );
            const guardianPaymentStatus = getPaymentStatusFromEvents(
              guardianWithPlayers,
              activeEvents,
            );

            flattenedData.push({
              _id: guardian._id || `${parent._id}_guardian_${index}`,
              id: guardian._id || `${parent._id}_guardian_${index}`,
              parentId: parent._id,
              parentName: parent.fullName,
              parentEmail: parent.email,
              fullName: guardian.fullName || '',
              email: guardian.email || '',
              phone: guardian.phone || '',
              status: guardianStatus,
              paymentStatus: guardianPaymentStatus,
              type: 'guardian',
              isCoach: guardian.isCoach || false,
              players: parent.players || [],
              address: guardian.address || parent.address || {},
              aauNumber: guardian.aauNumber || '',
              avatar: guardian.avatar || '',
              imgSrc: guardian.avatar || '',
              relationship: guardian.relationship || 'Guardian',
              DateofJoin:
                guardian.createdAt ||
                parent.createdAt ||
                new Date().toISOString(),
              createdAt: guardian.createdAt || parent.createdAt,
              updatedAt: guardian.updatedAt || parent.updatedAt,
              canView: true,
            });
          });
        }
      });

      console.log(
        `📊 Flattened ${flattenedData.length} records (parents + guardians)`,
      );
      setAllParents(flattenedData);
    } catch (err: any) {
      console.error('❌ Error fetching all parents:', err);
      setError(err.message || 'Failed to fetch data');
      message.error('Failed to load all parents');
    } finally {
      setLoading(false);
    }
  }, [filters, activeEvents, enrichAllParents]);

  // Re-fetch when activeEvents changes
  useEffect(() => {
    const eventsKey = JSON.stringify(activeEvents);
    if (prevActiveEventsRef.current !== eventsKey) {
      prevActiveEventsRef.current = eventsKey;
      fetchAllParents();
    }
  }, [activeEvents, fetchAllParents]);

  // Initial fetch
  useEffect(() => {
    if (activeEvents.length > 0 || !prevActiveEventsRef.current) {
      fetchAllParents();
    }
  }, [fetchAllParents, activeEvents]);

  const refresh = useCallback(() => {
    fetchAllParents();
  }, [fetchAllParents]);

  return {
    data: allParents,
    loading: loading || isEnriching,
    error,
    total: allParents.length,
    parentTotal: totalParents,
    refresh,
  };
};
