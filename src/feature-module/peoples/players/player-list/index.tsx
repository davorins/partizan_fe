// PlayerList.tsx
import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { Table, Alert } from 'antd';
import { PlayerListHeader } from '../../../components/Headers/PlayerListHeader';
import { PlayerFilters } from '../../../components/Filters/PlayerFilters';
import { PlayerSortOptions } from '../../../components/Filters/PlayerSortOptions';
import {
  getPlayerTableColumns,
  PlayerTableSkeleton,
} from '../../../components/Tables/PlayerTableColumns';
import { usePlayerData } from '../../../hooks/usePlayerData';
import { usePlayerActions } from '../../../hooks/usePlayerActions';
import {
  filterPlayerData,
  sortPlayerData,
} from '../../../../utils/playerUtils';
import {
  PlayerFilterParams,
  PlayerTableData,
  PlayerSortOrder,
} from '../../../../types/playerTypes';
import PredefinedDateRanges from '../../../../core/common/datePicker';
import { useAuth } from '../../../../context/AuthContext';
import { all_routes } from '../../../router/all_routes';
import { Moment } from 'moment';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';
import { debounce } from 'lodash';

const PlayerList = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);
  const { currentUser } = useAuth();

  // Extract params once at component mount
  const seasonParam = useMemo(() => searchParams.get('season'), [searchParams]);
  const yearParam = useMemo(() => searchParams.get('year'), [searchParams]);

  // Use the original usePlayerData hook
  const {
    loading,
    error,
    playerData,
    priorityData,
    remainingData,
    isPriorityData,
    refresh,
  } = usePlayerData(seasonParam, yearParam);

  const { handlePlayerClick } = usePlayerActions();

  // Filter states
  const [filters, setFilters] = useState<PlayerFilterParams>(() => ({
    nameFilter: '',
    genderFilter: null,
    gradeFilter: null,
    ageFilter: null,
    statusFilter: null,
    dateRange: null,
    seasonParam,
    yearParam,
    schoolFilter: null,
  }));

  // Set 'recent' as default sort order
  const [sortOrder, setSortOrder] = useState<PlayerSortOrder>('recent');
  const [tableLoading, setTableLoading] = useState(false);

  // Original pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  // Error handling state
  const [apiError, setApiError] = useState<string | null>(null);

  // Debounced filter handler
  const debouncedFilterChange = useMemo(
    () =>
      debounce((newFilters: Partial<PlayerFilterParams>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setPagination((prev) => ({ ...prev, current: 1 }));
      }, 300),
    []
  );

  // Memoized filtered and sorted data (using ALL playerData for pagination)
  const filteredPlayers = useMemo(
    () => filterPlayerData(playerData, filters),
    [playerData, filters]
  );

  const sortedPlayers = useMemo(
    () => sortPlayerData(filteredPlayers, sortOrder),
    [filteredPlayers, sortOrder]
  );

  const dataSource = useMemo(
    () => (sortOrder ? sortedPlayers : filteredPlayers),
    [sortOrder, sortedPlayers, filteredPlayers]
  );

  // Memoized columns with loading state
  const columns = useMemo(
    () =>
      getPlayerTableColumns({
        handlePlayerClick,
        location,
        loading: loading && playerData.length === 0,
      }),
    [handlePlayerClick, location, loading, playerData.length]
  );

  // Handle filter changes
  const handleFilterChange = useCallback(
    (newFilters: Partial<PlayerFilterParams>) => {
      debouncedFilterChange(newFilters);
    },
    [debouncedFilterChange]
  );

  const handleResetFilters = useCallback(() => {
    setFilters({
      nameFilter: '',
      genderFilter: null,
      gradeFilter: null,
      ageFilter: null,
      statusFilter: null,
      dateRange: null,
      seasonParam,
      yearParam,
      schoolFilter: null,
    });
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, [seasonParam, yearParam]);

  const handleDateRangeChange = useCallback(
    (range: [Moment, Moment] | null) => {
      handleFilterChange({ dateRange: range });
    },
    [handleFilterChange]
  );

  // Update filters when URL params change
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      seasonParam,
      yearParam,
    }));
  }, [seasonParam, yearParam]);

  // Handle pagination changes (ORIGINAL LOGIC)
  const handleTableChange = useCallback((newPagination: any) => {
    setTableLoading(true);
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
    // Small delay to ensure spinner is visible
    setTimeout(() => setTableLoading(false), 100);
  }, []);

  // Handle API errors and retry logic
  useEffect(() => {
    if (error) {
      setApiError(error);
      const timer = setTimeout(() => setApiError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      debouncedFilterChange.cancel();
    };
  }, [debouncedFilterChange]);

  // Show loading spinner only on initial load
  if (loading && playerData.length === 0) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <div className='card'>
            <div className='card-body'>
              <div className='text-center p-4'>
                <LoadingSpinner />
                <p className='mt-3 text-muted'>Loading players...</p>
                <div
                  className='progress mt-2'
                  style={{ width: '200px', margin: '0 auto' }}
                >
                  <div
                    className='progress-bar progress-bar-striped progress-bar-animated'
                    style={{ width: '100%' }}
                  >
                    Loading...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (apiError && playerData.length === 0) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <div className='alert alert-danger'>
            <h4>Error Loading Data</h4>
            <p>{apiError}</p>
            <p>
              Please try refreshing the page or contact support if the problem
              persists.
            </p>
            <button
              className='btn btn-primary'
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <PlayerListHeader
          seasonParam={seasonParam}
          yearParam={yearParam}
          playerData={dataSource}
          onRefresh={refresh}
        />

        <div className='card'>
          <div className='card-header d-flex align-items-center justify-content-between flex-wrap pb-0'>
            <h4 className='mb-3'>Players List</h4>

            <div className='d-flex align-items-center flex-wrap'>
              {currentUser?.role === 'admin' && (
                <>
                  <div className='input-icon-start mb-3 me-2 position-relative'>
                    <PredefinedDateRanges
                      onDateChange={handleDateRangeChange}
                    />
                  </div>

                  <div className='dropdown mb-3 me-2'>
                    <Link
                      to='#'
                      className='btn btn-outline-light bg-white dropdown-toggle'
                      data-bs-toggle='dropdown'
                      data-bs-auto-close='outside'
                    >
                      <i className='ti ti-filter me-2' />
                      Filter
                    </Link>
                    <div
                      className='dropdown-menu drop-width'
                      ref={dropdownMenuRef}
                    >
                      <PlayerFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onReset={handleResetFilters}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className='d-flex align-items-center bg-white border rounded-2 p-1 mb-3 me-2'>
                <Link
                  to={all_routes.playerList}
                  className='active btn btn-icon btn-sm me-1 primary-hover'
                >
                  <i className='ti ti-list-tree' />
                </Link>
                <Link
                  to={all_routes.playerGrid}
                  className='btn btn-icon btn-sm bg-light primary-hover'
                >
                  <i className='ti ti-grid-dots' />
                </Link>
              </div>

              {currentUser?.role === 'admin' && (
                <div className='dropdown mb-3'>
                  <Link
                    to='#'
                    className='btn btn-outline-light bg-white dropdown-toggle'
                    data-bs-toggle='dropdown'
                  >
                    <i className='ti ti-sort-ascending-2 me-2' />
                    {sortOrder === 'asc'
                      ? 'A-Z'
                      : sortOrder === 'desc'
                      ? 'Z-A'
                      : sortOrder === 'recent'
                      ? 'Most Recent'
                      : sortOrder === 'recentlyUpdated'
                      ? 'Recently Updated'
                      : sortOrder === 'recentlyAdded'
                      ? 'Recently Added'
                      : sortOrder === 'recentlyViewed'
                      ? 'Recently Viewed'
                      : 'Most Recent'}
                  </Link>
                  <PlayerSortOptions
                    sortOrder={sortOrder}
                    onSortChange={setSortOrder}
                  />
                </div>
              )}
            </div>
          </div>

          <div className='card-body p-0 py-3'>
            {/* Loading indicators */}
            {loading && (
              <div className='alert alert-info mb-3'>
                <i className='ti ti-loader me-2'></i>
                Loading players... Please wait.
              </div>
            )}

            {isPriorityData && remainingData.length > 0 && (
              <div className='alert alert-info mb-3'>
                <i className='ti ti-info-circle me-2'></i>
                Showing active players first. Loading all players...
              </div>
            )}

            {/* Show skeleton loader during initial load */}
            {loading && playerData.length === 0 ? (
              <PlayerTableSkeleton rows={10} />
            ) : (
              <>
                <Table
                  dataSource={dataSource}
                  columns={columns}
                  rowKey='id'
                  pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: dataSource.length,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'], // Original page sizes
                    showTotal: (total, range) =>
                      `Showing ${range[0]}-${range[1]} of ${total} players`,
                  }}
                  onChange={handleTableChange}
                  loading={tableLoading}
                  scroll={{ x: true }}
                />

                {dataSource.length > 0 &&
                  !dataSource.some(
                    (player: PlayerTableData) => player.parents?.length > 0
                  ) && (
                    <div className='alert alert-warning mt-3'>
                      No parent emails available for the selected players.
                    </div>
                  )}
              </>
            )}

            {/* Error alert */}
            {apiError && (
              <Alert
                message='Error'
                description={apiError}
                type='error'
                showIcon
                closable
                onClose={() => setApiError(null)}
                className='mt-3'
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PlayerList);
