// components/ParentList.tsx
import React, {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Table, Alert } from 'antd';
import { ParentListHeader } from '../../../components/Headers/ParentListHeader';
import { ParentFilters } from '../../../components/Filters/ParentFilters';
import { ParentSortOptions } from '../../../components/Filters/ParentSortOptions';
import {
  getParentTableColumns,
  ParentTableSkeleton,
} from '../../../components/Tables/ParentTableColumns';
import { useParentData } from '../../../hooks/useParentData';
import { useParentActions } from '../../../hooks/useParentActions';
import {
  filterParentData,
  sortParentData,
} from '../../../../utils/parentUtils';
import { ParentFilterParams } from '../../../../types/parentTypes';
import PredefinedDateRanges from '../../../../core/common/datePicker';
import { useAuth } from '../../../../context/AuthContext';
import { all_routes } from '../../../router/all_routes';
import LoadingSpinner from '../../../../components/common/LoadingSpinner';
import { debounce } from 'lodash';

const ParentList = () => {
  const [searchParams] = useSearchParams();
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null);
  const { currentUser } = useAuth();

  // Get URL params
  const seasonParam = useMemo(() => searchParams.get('season'), [searchParams]);
  const yearParam = useMemo(() => searchParams.get('year'), [searchParams]);

  // State management
  const [filters, setFilters] = useState<ParentFilterParams>({
    nameFilter: '',
    emailFilter: '',
    phoneFilter: '',
    statusFilter: null,
    roleFilter: null,
    dateRange: null,
  });

  const [sortOrder, setSortOrder] = useState<
    'asc' | 'desc' | 'recentlyViewed' | 'recentlyAdded' | null
  >(null);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  const [tableLoading, setTableLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Data fetching
  const {
    loading,
    error,
    combinedData: parentData,
    refresh,
  } = useParentData(seasonParam, yearParam);

  const { handleParentClick } = useParentActions();

  // Debounced filter changes
  const debouncedFilterChange = useMemo(
    () =>
      debounce((newFilters: Partial<ParentFilterParams>) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
        setPagination((prev) => ({ ...prev, current: 1 }));
      }, 300),
    []
  );

  // Memoized data transformations
  const filteredParents = useMemo(() => {
    return filterParentData(parentData, filters, currentUser?.role || 'user');
  }, [parentData, filters, currentUser?.role]);

  const sortedParents = useMemo(() => {
    return sortParentData(filteredParents, sortOrder);
  }, [filteredParents, sortOrder]);

  const columns = useMemo(() => {
    return getParentTableColumns({
      handleParentClick,
      currentUserRole: currentUser?.role,
      loading: loading && parentData.length === 0,
    });
  }, [handleParentClick, currentUser?.role, loading, parentData.length]);

  // Handlers
  const handleFilterChange = useCallback(
    (newFilters: Partial<ParentFilterParams>) => {
      debouncedFilterChange(newFilters);
    },
    [debouncedFilterChange]
  );

  const handleResetFilters = useCallback(() => {
    setFilters({
      nameFilter: '',
      emailFilter: '',
      phoneFilter: '',
      statusFilter: null,
      roleFilter: null,
      dateRange: null,
    });
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, []);

  const handleDateRangeChange = useCallback(
    (range: any) => {
      handleFilterChange({ dateRange: range });
    },
    [handleFilterChange]
  );

  const handleTableChange = useCallback((newPagination: any) => {
    setTableLoading(true);
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
    // Small delay to ensure spinner is visible
    setTimeout(() => setTableLoading(false), 100);
  }, []);

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

  // Show loading spinner only on initial load
  if (loading && parentData.length === 0) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <div className='card'>
            <div className='card-body'>
              <div className='text-center p-4'>
                <LoadingSpinner />
                <p className='mt-3 text-muted'>
                  Loading parents and guardians...
                </p>
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

  if (apiError && parentData.length === 0) {
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
        <ParentListHeader
          seasonParam={seasonParam}
          yearParam={yearParam}
          parentData={sortOrder ? sortedParents : filteredParents}
          onRefresh={refresh}
        />
        <div className='card'>
          <div className='card-header d-flex align-items-center justify-content-between flex-wrap pb-0'>
            <h4 className='mb-3'>Parents & Guardians List</h4>
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
                      <ParentFilters
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
                  to={all_routes.parentList}
                  className='active btn btn-icon btn-sm me-1 primary-hover'
                >
                  <i className='ti ti-list-tree' />
                </Link>
                <Link
                  to={all_routes.parentGrid}
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
                      : sortOrder === 'recentlyAdded'
                      ? 'Recently Added'
                      : sortOrder === 'recentlyViewed'
                      ? 'Recently Viewed'
                      : 'Sort by'}
                  </Link>
                  <ParentSortOptions
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
                Loading parents and guardians... Please wait.
              </div>
            )}

            {/* Show skeleton loader during initial load */}
            {loading && parentData.length === 0 ? (
              <ParentTableSkeleton rows={10} />
            ) : (
              <>
                <Table
                  columns={columns}
                  dataSource={sortOrder ? sortedParents : filteredParents}
                  rowKey='_id'
                  pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: filteredParents.length,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    showTotal: (total, range) =>
                      `Showing ${range[0]}-${range[1]} of ${total} parents & guardians`,
                  }}
                  onChange={handleTableChange}
                  loading={tableLoading}
                  scroll={{ x: true }}
                />
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

export default ParentList;
