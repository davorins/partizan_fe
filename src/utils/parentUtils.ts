// parentUtils.ts
import moment, { Moment } from 'moment';
import { Player, Parent, Guardian, TableRecord } from '../types/types';
import { getCurrentSeason, getCurrentYear } from '../utils/season';

interface ExtendedTableRecord extends TableRecord {
  type: 'parent' | 'guardian' | 'coach';
  status: 'Active' | 'Inactive' | 'Pending Payment';
  paymentStatus?: 'paid' | 'notPaid' | null;
  DateofJoin: string;
  imgSrc: string;
  canView: boolean;
  parentId?: string;
  aauNumber?: string;
  createdAt: string;
  players?: Player[];
  isCoach?: boolean;
}

// NEW: Helper to check if player is registered for current season (regardless of payment)
const isPlayerRegisteredForCurrentSeason = (player: Player): boolean => {
  const currentSeason = getCurrentSeason();
  const currentYear = getCurrentYear();

  console.log(
    'Checking player:',
    player.fullName,
    'for season:',
    currentSeason,
    currentYear
  );

  // First check the seasons array
  if (player.seasons && Array.isArray(player.seasons)) {
    const hasCurrentSeason = player.seasons.some(
      (season: any) => season.year === currentYear
    );
    console.log(
      'Player seasons:',
      player.seasons,
      'Has current season:',
      hasCurrentSeason
    );
    if (hasCurrentSeason) return true;
  }

  // Fallback to direct properties
  const hasDirectSeason =
    player.season && player.registrationYear === currentYear;
  console.log(
    'Direct season check:',
    player.season,
    player.registrationYear,
    'Result:',
    hasDirectSeason
  );

  return !!hasDirectSeason;
};

// UPDATED: Helper to get parent/guardian status based on registration only
const getParentStatus = (
  parent: Parent | Guardian
): 'Active' | 'Inactive' | 'Pending Payment' => {
  if (parent.isCoach) return 'Active';

  console.log('Checking parent status for:', parent.fullName);
  console.log('Parent players:', parent.players);

  const hasCurrentSeasonPlayers = parent.players?.some(
    isPlayerRegisteredForCurrentSeason
  );

  console.log('Has current season players:', hasCurrentSeasonPlayers);

  // For parent/guardian, we don't check their own season/registrationYear since those properties don't exist
  // We only check their players' registrations

  const isActive = !!hasCurrentSeasonPlayers;
  console.log('Final status - Active:', isActive);

  if (isActive) return 'Active';

  // Only show "Pending Payment" if registered but not paid (optional - remove if you only want Active/Inactive)
  const hasPendingPayments = parent.players?.some(
    (player) => player.registrationComplete && !player.paymentComplete
  );

  return hasPendingPayments ? 'Pending Payment' : 'Inactive';
};

// Helper to get payment status for a parent/guardian
const getPaymentStatus = (
  parent: Parent | Guardian
): 'paid' | 'notPaid' | null => {
  if (!parent.players || parent.players.length === 0) return null;

  const anyPaid = parent.players.some((player) => player.paymentComplete);
  return anyPaid ? 'paid' : 'notPaid';
};

// Rest of the file remains the same...
export const transformParentData = (
  parents: Parent[],
  guardians: Guardian[],
  currentUser: Parent | null
): ExtendedTableRecord[] => {
  if (!currentUser) return [];

  const getSafeDate = (date: string | undefined): string => {
    return date || new Date().toISOString();
  };

  if (currentUser.role === 'user') {
    return [
      {
        _id: currentUser._id,
        fullName: currentUser.fullName,
        email: currentUser.email,
        phone: currentUser.phone,
        address: currentUser.address,
        role: currentUser.role,
        type: 'parent',
        status: getParentStatus(currentUser),
        paymentStatus: getPaymentStatus(currentUser),
        DateofJoin: getSafeDate(currentUser.createdAt),
        imgSrc: currentUser.avatar || '',
        aauNumber: currentUser.aauNumber || 'N/A',
        canView: true,
        createdAt: getSafeDate(currentUser.createdAt),
        players: currentUser.players || [],
        isCoach: currentUser.isCoach,
      },
    ];
  }

  const processedParentIds = new Set<string>();

  const parentRecords: ExtendedTableRecord[] = parents.map((parent) => {
    processedParentIds.add(parent._id);
    return {
      _id: parent._id,
      fullName: parent.fullName,
      email: parent.email,
      phone: parent.phone,
      address: parent.address,
      role: parent.role,
      type: parent.isCoach ? 'coach' : 'parent',
      status: getParentStatus(parent),
      paymentStatus: getPaymentStatus(parent),
      DateofJoin: getSafeDate(parent.createdAt),
      imgSrc: parent.avatar || '',
      aauNumber: parent.aauNumber || 'N/A',
      canView: true,
      createdAt: getSafeDate(parent.createdAt),
      players: parent.players || [],
      isCoach: parent.isCoach,
    };
  });

  const guardianRecords: ExtendedTableRecord[] = (guardians || [])
    .filter(
      (guardian) => !processedParentIds.has(guardian._id || guardian.id || '')
    )
    .flatMap((guardian) => {
      const guardianId = guardian._id || guardian.id || '';
      const guardianStatus = getParentStatus(guardian);
      const guardianPaymentStatus = getPaymentStatus(guardian);

      const mainGuardian: ExtendedTableRecord = {
        _id: guardianId,
        fullName: guardian.fullName,
        email: guardian.email,
        phone: guardian.phone,
        address: guardian.address,
        role: 'guardian',
        type: 'guardian',
        status: guardianStatus,
        paymentStatus: guardianPaymentStatus,
        DateofJoin: getSafeDate(guardian.createdAt as string | undefined),
        imgSrc: '',
        aauNumber: guardian.aauNumber || 'N/A',
        canView: true,
        createdAt: getSafeDate(guardian.createdAt as string | undefined),
        players: guardian.players || [],
        isCoach: guardian.isCoach,
      };

      // Additional guardians from parent
      const parentWithAdditional = parents.find((p) => p._id === guardianId);
      const additionalFromParent =
        parentWithAdditional?.additionalGuardians || [];

      const additionalGuardians: ExtendedTableRecord[] =
        additionalFromParent.map((g, index) => ({
          _id: g.id || `${guardianId}-${index}`,
          fullName: g.fullName,
          email: g.email,
          phone: g.phone,
          address: g.address,
          role: 'guardian',
          type: 'guardian',
          status: getParentStatus(g),
          paymentStatus: getPaymentStatus(g),
          DateofJoin: getSafeDate(g.createdAt as string | undefined),
          imgSrc: '',
          aauNumber: g.aauNumber || 'N/A',
          parentId: guardianId,
          canView: true,
          createdAt: getSafeDate(g.createdAt as string | undefined),
          players: g.players || [],
          isCoach: g.isCoach,
        }));

      return [mainGuardian, ...additionalGuardians];
    });

  return [...parentRecords, ...guardianRecords];
};

// Rest of filterParentData and sortParentData functions remain unchanged...
export const filterParentData = (
  data: ExtendedTableRecord[],
  filters: {
    nameFilter: string;
    emailFilter: string;
    phoneFilter: string;
    statusFilter: string | null;
    roleFilter: string | null;
    paymentStatusFilter?: 'paid' | 'notPaid' | null;
    dateRange: [Moment, Moment] | null;
  },
  currentUserRole: string
): ExtendedTableRecord[] => {
  const seenIds = new Set<string>();

  return data.filter((item) => {
    const recordKey = `${item._id}-${item.type}`;

    if (seenIds.has(recordKey)) {
      return false;
    }
    seenIds.add(recordKey);

    if (currentUserRole === 'user' && !item.canView) {
      return false;
    }

    if (
      filters.nameFilter &&
      !item.fullName.toLowerCase().includes(filters.nameFilter.toLowerCase())
    ) {
      return false;
    }

    if (
      filters.emailFilter &&
      !(
        item.email?.toLowerCase().includes(filters.emailFilter.toLowerCase()) ??
        true
      )
    ) {
      return false;
    }

    if (
      filters.phoneFilter &&
      !(
        item.phone
          ?.replace(/\D/g, '')
          .includes(filters.phoneFilter.replace(/\D/g, '')) ?? true
      )
    ) {
      return false;
    }

    if (
      filters.statusFilter &&
      item.status?.toLowerCase() !== filters.statusFilter.toLowerCase()
    ) {
      return false;
    }

    if (filters.roleFilter) {
      if (filters.roleFilter === 'parent' && item.type !== 'parent') {
        return false;
      }
      if (filters.roleFilter === 'guardian' && item.type !== 'guardian') {
        return false;
      }
      if (filters.roleFilter === 'coach') {
        if (item.role !== 'coach' && !item.isCoach) {
          return false;
        }
      } else if (
        filters.roleFilter !== 'parent' &&
        filters.roleFilter !== 'guardian' &&
        item.role !== filters.roleFilter
      ) {
        return false;
      }
    }

    // New paymentStatus filter
    if (
      filters.paymentStatusFilter !== undefined &&
      filters.paymentStatusFilter !== null &&
      item.paymentStatus !== filters.paymentStatusFilter
    ) {
      return false;
    }

    if (filters.dateRange) {
      const [start, end] = filters.dateRange;
      const itemDate = moment(item.DateofJoin);
      if (!itemDate.isBetween(start, end, undefined, '[]')) {
        return false;
      }
    }

    return true;
  });
};

// Sort function (unchanged)
export const sortParentData = (
  data: ExtendedTableRecord[],
  sortOrder: 'asc' | 'desc' | 'recentlyViewed' | 'recentlyAdded' | null
): ExtendedTableRecord[] => {
  if (!sortOrder) return data;

  return [...data].sort((a, b) => {
    if (sortOrder === 'asc') return a.fullName.localeCompare(b.fullName);
    if (sortOrder === 'desc') return b.fullName.localeCompare(a.fullName);
    if (sortOrder === 'recentlyAdded') {
      return (
        new Date(b.DateofJoin).getTime() - new Date(a.DateofJoin).getTime()
      );
    }
    if (sortOrder === 'recentlyViewed') {
      const recentlyViewed = JSON.parse(
        localStorage.getItem('recentlyViewed') || '[]'
      );
      return recentlyViewed.indexOf(b._id) - recentlyViewed.indexOf(a._id);
    }
    return 0;
  });
};
