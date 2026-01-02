import React, {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { all_routes } from '../../../router/all_routes';
import PredefinedDateRanges from '../../../../core/common/datePicker';
import { useAuth } from '../../../../context/AuthContext';
import { usePlayerData } from '../../../hooks/usePlayerData';
import { usePlayerActions } from '../../../hooks/usePlayerActions';
import {
  filterPlayerData,
  sortPlayerData,
  convertToPlayer,
} from '../../../../utils/playerUtils';
import {
  PlayerFilterParams,
  PlayerTableData,
  PlayerSortOrder,
} from '../../../../types/playerTypes';
import { PlayerListHeader } from '../../../components/Headers/PlayerListHeader';
import { PlayerFilters } from '../../../components/Filters/PlayerFilters';
import { PlayerSortOptions } from '../../../components/Filters/PlayerSortOptions';
import { Moment } from 'moment';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';
import { debounce } from 'lodash';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Helper function to get avatar URL - moved outside component
const getAvatarUrl = (
  avatar: string | undefined,
  gender: string | undefined
): string => {
  if (!avatar) {
    return gender === 'Female'
      ? 'https://bothell-select.onrender.com/uploads/avatars/girl.png'
      : 'https://bothell-select.onrender.com/uploads/avatars/boy.png';
  }

  if (avatar.includes('res.cloudinary.com')) {
    return `${avatar}${avatar.includes('?') ? '&' : '?'}${Date.now()}`;
  }

  if (avatar.startsWith('/uploads/')) {
    return `https://bothell-select.onrender.com${avatar}`;
  }

  return avatar;
};

const PlayerGrid = () => {
  const routes = all_routes;
  const location = useLocation();
  const navigate = useNavigate(); // Add navigate for better control
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);
  const { parent } = useAuth();

  // Filter states
  const [filters, setFilters] = useState<PlayerFilterParams>({
    nameFilter: '',
    genderFilter: null,
    gradeFilter: null,
    ageFilter: null,
    statusFilter: null,
    dateRange: null,
    seasonParam: null,
    yearParam: null,
    schoolFilter: null,
  });

  const seasonParam = filters.seasonParam || null;
  const yearParam = filters.yearParam || null;

  // Data management
  const { loading, error, playerData, refresh } = usePlayerData(
    seasonParam,
    yearParam
  );
  const { handlePlayerClick } = usePlayerActions();

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const playersPerPage = 12;
  const [sortOrder, setSortOrder] = useState<PlayerSortOrder>(null);

  // Error handling state
  const [apiError, setApiError] = useState<string | null>(null);

  // Debounced filter handler
  const debouncedFilterChange = useMemo(
    () =>
      debounce((newFilters: Partial<PlayerFilterParams>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setCurrentPage(1); // Reset to first page on filter change
      }, 300),
    []
  );

  // Memoized filtered and sorted data
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

  // Memoized players to display with pagination
  const playersToDisplay = useMemo(
    () => dataSource.slice(0, currentPage * playersPerPage),
    [dataSource, currentPage, playersPerPage]
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
      seasonParam: null,
      yearParam: null,
      schoolFilter: null,
    });
    setCurrentPage(1);
  }, []);

  const handleDateRangeChange = useCallback(
    (range: [Moment, Moment] | null) => {
      handleFilterChange({ dateRange: range });
    },
    [handleFilterChange]
  );

  const handleLoadMore = useCallback(() => {
    setCurrentPage((prevPage) => prevPage + 1);
  }, []);

  // FIXED: Enhanced player view handler to ensure seasons data is preserved
  const handlePlayerView = useCallback(
    (player: PlayerTableData) => {
      // Convert with full data preservation
      const playerForNavigation = convertToPlayer(player);

      // Ensure seasons data is preserved
      if (player.seasons && !playerForNavigation.seasons) {
        playerForNavigation.seasons = player.seasons;
      }

      // Store the full player data in session storage for the details page to access
      try {
        sessionStorage.setItem('currentPlayerData', JSON.stringify(player));
      } catch (error) {
        console.warn('Could not store player data in session storage:', error);
      }

      handlePlayerClick(playerForNavigation);
    },
    [handlePlayerClick]
  );

  // Handle API errors
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

  // Clear cached data on unmount for admin
  useEffect(() => {
    return () => {
      if (parent?.role === 'admin') {
        localStorage.removeItem('lastPlayerFetch');
      }
    };
  }, [parent]);

  if (loading && !apiError) {
    return <LoadingSpinner />;
  }

  if (apiError) {
    return (
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
    );
  }

  return (
    <div className='page-wrapper'>
      <div className='content content-two'>
        <PlayerListHeader
          seasonParam={seasonParam}
          yearParam={yearParam}
          playerData={dataSource}
          onRefresh={refresh}
        />

        <div className='bg-white p-3 border rounded-1 d-flex align-items-center justify-content-between flex-wrap mb-4 pb-0'>
          <h4 className='mb-3'>Players Grid</h4>
          <div className='d-flex align-items-center flex-wrap'>
            {parent?.role === 'admin' && (
              <div className='input-icon-start mb-3 me-2 position-relative'>
                <PredefinedDateRanges onDateChange={handleDateRangeChange} />
              </div>
            )}

            {parent?.role === 'admin' && (
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
                <div className='dropdown-menu drop-width' ref={dropdownMenuRef}>
                  <PlayerFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onReset={handleResetFilters}
                  />
                </div>
              </div>
            )}

            <div className='d-flex align-items-center bg-white border rounded-2 p-1 mb-3 me-2'>
              <Link
                to={routes.playerList}
                className='btn btn-icon btn-sm me-1 bg-light primary-hover'
                onClick={(e) => {
                  // Prevent any default behavior that might cause redirect issues
                  e.preventDefault();
                  navigate(routes.playerList, { replace: true });
                }}
              >
                <i className='ti ti-list-tree' />
              </Link>
              <Link
                to={routes.playerGrid}
                className='active btn btn-icon btn-sm primary-hover'
                onClick={(e) => {
                  e.preventDefault();
                  navigate(routes.playerGrid, { replace: true });
                }}
              >
                <i className='ti ti-grid-dots' />
              </Link>
            </div>

            {parent?.role === 'admin' && (
              <div className='dropdown mb-3'>
                <Link
                  to='#'
                  className='btn btn-outline-light bg-white dropdown-toggle'
                  data-bs-toggle='dropdown'
                >
                  <i className='ti ti-sort-ascending-2 me-2' />
                  Sort by A-Z
                </Link>
                <PlayerSortOptions
                  sortOrder={sortOrder}
                  onSortChange={setSortOrder}
                />
              </div>
            )}
          </div>
        </div>

        <div className='row'>
          {playersToDisplay.map((player) => (
            <div key={player.id} className='col-xxl-3 col-xl-4 col-md-6 d-flex'>
              <div className='card flex-fill'>
                <div className='card-header d-flex align-items-center justify-content-between'>
                  AAU Number: {player.aauNumber || 'No AAU Number'}
                  <div className='d-flex align-items-center'>
                    <span
                      className={`badge badge-soft-${
                        player.status === 'Active' ? 'success' : 'danger'
                      } d-inline-flex align-items-center me-1`}
                    >
                      <i className='ti ti-circle-filled fs-5 me-1' />
                      {player.status}
                    </span>
                    <div className='dropdown'>
                      <Link
                        to='#'
                        className='btn btn-white btn-icon btn-sm d-flex align-items-center justify-content-center rounded-circle p-0'
                        data-bs-toggle='dropdown'
                        aria-expanded='false'
                      >
                        <i className='ti ti-dots-vertical fs-14' />
                      </Link>
                      <ul className='dropdown-menu dropdown-menu-right p-3'>
                        <li>
                          <div
                            className='dropdown-item rounded-1 cursor-pointer'
                            onClick={() => handlePlayerView(player)}
                          >
                            <i className='ti ti-menu me-2' />
                            View
                          </div>
                        </li>
                        <li>
                          <Link
                            to={`${routes.editPlayer}/${player.id}`}
                            state={{
                              player: {
                                ...player,
                                playerId: player.id,
                                _id: player.id,
                                // Ensure seasons data is passed to edit page
                                seasons: player.seasons || [],
                              },
                              from: location.pathname,
                            }}
                            className='dropdown-item rounded-1'
                          >
                            <i className='ti ti-edit me-2' />
                            Edit
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className='card-body'>
                  <div className='bg-light-300 rounded-2 p-3 mb-3'>
                    <div className='d-flex align-items-center'>
                      <div
                        onClick={() => handlePlayerView(player)}
                        className='avatar avatar-lg flex-shrink-0 cursor-pointer'
                      >
                        <img
                          src={getAvatarUrl(player.imgSrc, player.gender)}
                          className='img-fluid rounded-circle'
                          alt={
                            player.name
                              ? `${player.name}'s profile picture`
                              : 'Player profile picture'
                          }
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = getAvatarUrl(undefined, player.gender);
                          }}
                        />
                      </div>
                      <div className='ms-2'>
                        <h5 className='mb-0'>
                          {/* FIXED: Use navigate instead of Link to ensure proper data passing */}
                          <span
                            className='text-primary cursor-pointer'
                            onClick={() => handlePlayerView(player)}
                            style={{
                              textDecoration: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {player.name}
                          </span>
                        </h5>
                        <p>
                          {player.class} grade, {player.section}
                        </p>
                        {/* Add seasons preview if available */}
                        {player.seasons && player.seasons.length > 0 && (
                          <small className='text-muted'>
                            {player.seasons.length} season
                            {player.seasons.length > 1 ? 's' : ''}
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {playersToDisplay.length < dataSource.length && (
            <div className='col-md-12 text-center'>
              <button className='btn btn-primary' onClick={handleLoadMore}>
                <i className='ti ti-loader-3 me-2' />
                Load More
              </button>
            </div>
          )}

          {playersToDisplay.length === 0 && (
            <div className='col-md-12 text-center'>
              <div className='alert alert-info'>
                <h5>No Players Found</h5>
                <p>Try adjusting your filters or search criteria.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(PlayerGrid);
