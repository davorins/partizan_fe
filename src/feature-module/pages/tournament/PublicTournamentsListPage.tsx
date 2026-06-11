// feature-module/pages/tournament/PublicTournamentsListPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Badge,
  Avatar,
  Statistic,
  Divider,
  Empty,
  Spin,
  Pagination,
  Tooltip,
  Grid,
  Alert,
  Dropdown,
  Menu,
} from 'antd';
import {
  TrophyOutlined,
  CalendarOutlined,
  TeamOutlined,
  SearchOutlined,
  FilterOutlined,
  FireOutlined,
  CrownOutlined,
  ClockCircleOutlined,
  StarOutlined,
  EyeOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  EnvironmentOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import './PublicTournamentsListPage.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;
const { useBreakpoint } = Grid;

interface Tournament {
  _id: string;
  name: string;
  description: string;
  year: number;
  startDate: string;
  endDate: string;
  status: string;
  levelOfCompetition: string;
  sex: string;
  format: string;
  teamCount: number;
  maxTeams?: number;
  minTeams?: number;
}

interface Filters {
  status: string;
  year: string;
  format: string;
  levelOfCompetition: string;
  sex: string;
  search: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const PublicTournamentsListPage: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    status: '',
    year: '',
    format: '',
    levelOfCompetition: '',
    sex: '',
    search: '',
    page: 1,
    limit: 12,
    sortBy: 'startDate',
    sortOrder: 'desc',
  });

  const screens = useBreakpoint();

  const API_URL =
    process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchTournaments();
  }, [filters]);

  const fetchTournaments = async () => {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(
        `${API_URL}/tournaments/public?${queryParams}`,
      );
      const data = await response.json();

      if (data.success) {
        const tournamentsData = data.tournaments || data.data || [];
        setTournaments(tournamentsData);
        setTotal(data.total || data.count || tournamentsData.length);
      } else {
        setTournaments([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      setTournaments([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value, page: 1 });
  };

  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      year: '',
      format: '',
      levelOfCompetition: '',
      sex: '',
      search: '',
      page: 1,
      limit: 12,
      sortBy: 'startDate',
      sortOrder: 'desc',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'success';
      case 'open':
        return 'processing';
      case 'completed':
        return 'default';
      case 'draft':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'LIVE';
      case 'open':
        return 'OPEN';
      case 'completed':
        return 'COMPLETED';
      case 'draft':
        return 'DRAFT';
      default:
        return status.toUpperCase();
    }
  };

  const getFormatTag = (format: string) => {
    switch (format) {
      case 'single-elimination':
        return {
          color: 'red',
          text: 'Single Elimination',
          icon: <FireOutlined />,
        };
      case 'double-elimination':
        return {
          color: 'orange',
          text: 'Double Elimination',
          icon: <FireOutlined />,
        };
      case 'round-robin':
        return { color: 'blue', text: 'Round Robin', icon: <TeamOutlined /> };
      default:
        return {
          color: 'default',
          text: format.replace('-', ' '),
          icon: <TrophyOutlined />,
        };
    }
  };

  const getLevelTag = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'gold':
        return { color: 'gold', text: 'Gold', icon: <CrownOutlined /> };
      case 'silver':
        return { color: 'default', text: 'Silver', icon: <StarOutlined /> };
      default:
        return { color: 'blue', text: level, icon: <StarOutlined /> };
    }
  };

  const calculateTournamentDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const sortMenu = (
    <Menu className='white-dropdown-menu'>
      <Menu.Item
        key='date-desc'
        onClick={() => handleFilterChange('sortBy', 'startDate')}
      >
        <SortDescendingOutlined /> Newest First
      </Menu.Item>
      <Menu.Item
        key='date-asc'
        onClick={() => handleFilterChange('sortBy', 'startDate')}
      >
        <SortAscendingOutlined /> Oldest First
      </Menu.Item>
      <Menu.Item
        key='popularity'
        onClick={() => handleFilterChange('sortBy', 'teamCount')}
      >
        <TeamOutlined /> Most Popular
      </Menu.Item>
      <Menu.Item
        key='name'
        onClick={() => handleFilterChange('sortBy', 'name')}
      >
        <SortAscendingOutlined /> Name (A-Z)
      </Menu.Item>
    </Menu>
  );

  if (loading && tournaments.length === 0) {
    return (
      <div className='tournaments-white-root'>
        <div className='tournaments-white-bg' />
        <div className='tournaments-white-orb tournaments-white-orb-1' />
        <div className='tournaments-white-orb tournaments-white-orb-2' />
        <div className='tournaments-white-orb tournaments-white-orb-3' />
        <div className='tournaments-white-loading'>
          <div className='white-card-loading'>
            <Spin size='large' />
            <Title level={4}>Loading Tournaments</Title>
            <Text>Fetching tournament data...</Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='tournaments-white-root'>
      {/* Background orbs */}
      <div className='tournaments-white-bg' />
      <div className='tournaments-white-orb tournaments-white-orb-1' />
      <div className='tournaments-white-orb tournaments-white-orb-2' />
      <div className='tournaments-white-orb tournaments-white-orb-3' />

      <div className='tournaments-white-wrap'>
        {/* Page Header - White styled */}
        <div className='white-header-card'>
          <Row gutter={[32, 32]} align='middle'>
            <Col xs={24} md={16}>
              <Space direction='vertical' size='middle'>
                <Title level={1} className='white-header-title'>
                  <TrophyOutlined className='header-icon-white' />
                  Tournament Hub
                </Title>
                <Paragraph className='white-header-subtitle'>
                  Discover and join exciting tournaments. Find the perfect
                  competition for your team.
                </Paragraph>
              </Space>
            </Col>
            <Col xs={24} md={8}>
              <div className='white-stats-badge'>
                <Statistic
                  title={
                    <span className='stat-title-white'>Active Tournaments</span>
                  }
                  value={
                    tournaments.filter(
                      (t) =>
                        t.status === 'ongoing' ||
                        t.status === 'open' ||
                        t.status === 'draft',
                    ).length
                  }
                  valueStyle={{ color: '#594230', fontSize: 32 }}
                  prefix={<TeamOutlined />}
                />
              </div>
            </Col>
          </Row>
        </div>

        {/* Filters Section - White styled */}
        <div className='white-filters-card'>
          <Row gutter={[16, 16]} align='middle'>
            <Col xs={24} md={8}>
              <Search
                placeholder='Search tournaments...'
                enterButton={<SearchOutlined />}
                size='large'
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                onSearch={handleSearch}
                allowClear
                className='white-search'
              />
            </Col>
            <Col xs={24} md={16}>
              <Space wrap>
                <Select
                  placeholder='Status'
                  style={{ width: 140 }}
                  value={filters.status || undefined}
                  onChange={(value) => handleFilterChange('status', value)}
                  allowClear
                  size='large'
                  className='white-select'
                  dropdownClassName='white-dropdown'
                >
                  <Option value='open'>Registration Open</Option>
                  <Option value='ongoing'>Live Tournaments</Option>
                  <Option value='completed'>Completed</Option>
                  <Option value='draft'>Draft</Option>
                </Select>

                <Select
                  placeholder='Format'
                  style={{ width: 160 }}
                  value={filters.format || undefined}
                  onChange={(value) => handleFilterChange('format', value)}
                  allowClear
                  size='large'
                  className='white-select'
                  dropdownClassName='white-dropdown'
                >
                  <Option value='single-elimination'>Single Elimination</Option>
                  <Option value='double-elimination'>Double Elimination</Option>
                  <Option value='round-robin'>Round Robin</Option>
                </Select>

                <Select
                  placeholder='Level'
                  style={{ width: 120 }}
                  value={filters.levelOfCompetition || undefined}
                  onChange={(value) =>
                    handleFilterChange('levelOfCompetition', value)
                  }
                  allowClear
                  size='large'
                  className='white-select'
                  dropdownClassName='white-dropdown'
                >
                  <Option value='gold'>Gold</Option>
                  <Option value='silver'>Silver</Option>
                </Select>

                <Select
                  placeholder='Gender'
                  style={{ width: 120 }}
                  value={filters.sex || undefined}
                  onChange={(value) => handleFilterChange('sex', value)}
                  allowClear
                  size='large'
                  className='white-select'
                  dropdownClassName='white-dropdown'
                >
                  <Option value='male'>Male</Option>
                  <Option value='female'>Female</Option>
                  <Option value='mixed'>Mixed</Option>
                </Select>

                <Dropdown overlay={sortMenu} placement='bottomRight'>
                  <Button
                    icon={<FilterOutlined />}
                    size='large'
                    className='white-btn-outline'
                  >
                    Sort
                  </Button>
                </Dropdown>

                <Button
                  onClick={clearFilters}
                  size='large'
                  className='white-btn-secondary'
                >
                  Clear Filters
                </Button>
              </Space>
            </Col>
          </Row>

          {/* Active Filters */}
          {(filters.status ||
            filters.format ||
            filters.levelOfCompetition ||
            filters.sex ||
            filters.search) && (
            <div style={{ marginTop: 16 }}>
              <Space wrap>
                <Text className='filter-label-white'>Active filters:</Text>
                {filters.status && (
                  <Tag
                    closable
                    onClose={() => handleFilterChange('status', '')}
                    className='white-tag'
                  >
                    Status: {filters.status}
                  </Tag>
                )}
                {filters.format && (
                  <Tag
                    closable
                    onClose={() => handleFilterChange('format', '')}
                    className='white-tag'
                  >
                    Format: {filters.format}
                  </Tag>
                )}
                {filters.levelOfCompetition && (
                  <Tag
                    closable
                    onClose={() => handleFilterChange('levelOfCompetition', '')}
                    className='white-tag'
                  >
                    Level: {filters.levelOfCompetition}
                  </Tag>
                )}
                {filters.sex && (
                  <Tag
                    closable
                    onClose={() => handleFilterChange('sex', '')}
                    className='white-tag'
                  >
                    Gender: {filters.sex}
                  </Tag>
                )}
                {filters.search && (
                  <Tag
                    closable
                    onClose={() => handleFilterChange('search', '')}
                    className='white-tag'
                  >
                    Search: {filters.search}
                  </Tag>
                )}
              </Space>
            </div>
          )}
        </div>

        {/* Tournaments Grid */}
        {tournaments.length > 0 ? (
          <>
            <Row gutter={[24, 24]}>
              {tournaments.map((tournament) => {
                const formatBadge = getFormatTag(tournament.format);
                const levelBadge = getLevelTag(tournament.levelOfCompetition);
                const tournamentDurationDays = calculateTournamentDuration(
                  tournament.startDate,
                  tournament.endDate,
                );

                return (
                  <Col xs={24} sm={12} lg={8} xl={6} key={tournament._id}>
                    <Link
                      to={`/tournaments/${tournament._id}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <div className='white-tournament-card'>
                        <div className='tournament-white-card-cover'>
                          <TrophyOutlined className='cover-icon-white' />
                          <div className='status-white-badge'>
                            <Badge
                              status={getStatusColor(tournament.status) as any}
                              text={getStatusText(tournament.status)}
                            />
                          </div>
                        </div>
                        <div className='tournament-white-card-content'>
                          <div className='card-white-header'>
                            <Title level={5} className='tournament-white-title'>
                              {tournament.name}
                            </Title>
                            <Text className='tournament-white-year'>
                              {tournament.year}
                            </Text>
                          </div>

                          {/* Tournament Tags */}
                          <Space wrap style={{ marginBottom: 16 }}>
                            <Tag
                              color={formatBadge.color}
                              icon={formatBadge.icon}
                              className='white-tag'
                            >
                              {formatBadge.text}
                            </Tag>
                            <Tag
                              color={levelBadge.color}
                              icon={levelBadge.icon}
                              className='white-tag'
                            >
                              {levelBadge.text}
                            </Tag>
                            <Tag color='cyan' className='white-tag'>
                              {tournament.sex}
                            </Tag>
                          </Space>

                          {/* Tournament Stats */}
                          <div className='stats-white-list'>
                            <div className='stat-white-row'>
                              <Space>
                                <TeamOutlined className='stat-icon-white-success' />
                                <Text className='stat-white-label'>Teams</Text>
                              </Space>
                              <Text strong className='stat-white-value'>
                                {tournament.teamCount}
                              </Text>
                            </div>

                            <div className='stat-white-row'>
                              <Space>
                                <CalendarOutlined className='stat-icon-white-primary' />
                                <Text className='stat-white-label'>
                                  Tournament
                                </Text>
                              </Space>
                              <Text strong className='stat-white-value'>
                                {tournamentDurationDays} days
                              </Text>
                            </div>

                            <div className='stat-white-row'>
                              <Space>
                                <ClockCircleOutlined className='stat-icon-white-purple' />
                                <Text className='stat-white-label'>
                                  Matches
                                </Text>
                              </Space>
                              <Text strong className='stat-white-value'>
                                40 mins
                              </Text>
                            </div>

                            <div className='stat-white-row'>
                              <Space>
                                <CalendarOutlined className='stat-icon-white-orange' />
                                <Text className='stat-white-label'>Dates</Text>
                              </Space>
                              <div className='date-white-range'>
                                <div>{formatDate(tournament.startDate)}</div>
                                <div>{formatDate(tournament.endDate)}</div>
                              </div>
                            </div>
                          </div>

                          <Divider className='card-white-divider' />

                          <Button
                            type='primary'
                            block
                            icon={<EyeOutlined />}
                            className='white-btn-primary view-white-btn'
                          >
                            View Tournament
                          </Button>
                        </div>
                      </div>
                    </Link>
                  </Col>
                );
              })}
            </Row>

            {/* Pagination */}
            {total > filters.limit && (
              <div className='pagination-white-wrapper'>
                <Pagination
                  current={filters.page}
                  total={total}
                  pageSize={filters.limit}
                  onChange={(page) => handleFilterChange('page', page)}
                  showSizeChanger
                  onShowSizeChange={(current, size) =>
                    handleFilterChange('limit', size)
                  }
                  showTotal={(total, range) =>
                    `${range[0]}-${range[1]} of ${total} tournaments`
                  }
                  className='white-pagination'
                />
              </div>
            )}
          </>
        ) : (
          <div className='white-empty-card'>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Title level={4}>No tournaments found</Title>
                  <Text>
                    {filters.search || filters.status || filters.format
                      ? 'Try adjusting your filters or search terms'
                      : 'No tournaments are currently available'}
                  </Text>
                </div>
              }
            />
            {(filters.search || filters.status || filters.format) && (
              <Button
                type='primary'
                onClick={clearFilters}
                className='white-btn-primary'
                style={{ marginTop: 16 }}
              >
                Clear All Filters
              </Button>
            )}
          </div>
        )}

        {/* Stats Footer */}
        {tournaments.length > 0 && (
          <div className='white-footer-stats'>
            <Row gutter={[32, 32]}>
              <Col xs={24} md={8}>
                <Statistic
                  title={
                    <span className='footer-stat-title-white'>
                      Total Tournaments
                    </span>
                  }
                  value={total}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#594230' }}
                />
              </Col>
              <Col xs={24} md={8}>
                <Statistic
                  title={
                    <span className='footer-stat-title-white'>
                      Active Tournaments
                    </span>
                  }
                  value={
                    tournaments.filter(
                      (t) => t.status === 'ongoing' || t.status === 'open',
                    ).length
                  }
                  prefix={<FireOutlined />}
                  valueStyle={{ color: '#10b981' }}
                />
              </Col>
              <Col xs={24} md={8}>
                <Statistic
                  title={
                    <span className='footer-stat-title-white'>
                      Total Teams (Page)
                    </span>
                  }
                  value={tournaments.reduce((sum, t) => sum + t.teamCount, 0)}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#8b5cf6' }}
                />
              </Col>
            </Row>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicTournamentsListPage;
