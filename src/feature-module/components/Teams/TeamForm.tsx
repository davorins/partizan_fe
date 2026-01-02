// components/Teams/TeamForm.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Alert,
  Space,
  Spin,
  Row,
  Col,
} from 'antd';
import {
  SaveOutlined,
  ArrowLeftOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { InternalTeamFormData } from '../../../types/teamTypes';
import { useAuth } from '../../../context/AuthContext';
import { all_routes } from '../../router/all_routes';

const { Option } = Select;
const { TextArea } = Input;

interface Metadata {
  years: number[];
  grades: string[];
  tryoutSeasons: string[];
}

interface Coach {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
}

interface Player {
  _id: string;
  fullName: string;
  gender: string;
  grade: string;
  schoolName: string;
  dob?: string;
  age?: number;
}

const TeamForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableCoaches, setAvailableCoaches] = useState<Coach[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [metadata, setMetadata] = useState<Metadata>({
    years: [],
    grades: [],
    tryoutSeasons: [],
  });
  const [currentTeamData, setCurrentTeamData] = useState<any>(null);
  const { getAuthToken } = useAuth();

  const isEdit = Boolean(id);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchFormData();
  }, [id]);

  const fetchFormData = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();

      // Fetch metadata
      const metadataResponse = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/internal-teams/metadata`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (metadataResponse.ok) {
        const metadataData = await metadataResponse.json();
        setMetadata(metadataData);
      }

      // Fetch available coaches
      const coachesResponse = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/coaches`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (coachesResponse.ok) {
        const coaches = await coachesResponse.json();
        setAvailableCoaches(coaches);
      }

      // If editing, fetch team data
      if (isEdit) {
        const teamResponse = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/internal-teams/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (teamResponse.ok) {
          const team = await teamResponse.json();
          setCurrentTeamData(team);
          form.setFieldsValue({
            name: team.name,
            year: team.year,
            grade: team.grade,
            gender: team.gender,
            coachIds: team.coachIds?.map((c: any) => c._id),
            playerIds: team.playerIds?.map((p: any) => p._id),
            tryoutSeason: team.tryoutSeason,
            tryoutYear: team.tryoutYear,
            notes: team.notes,
          });

          // Load available players for the existing tryout criteria
          loadAvailablePlayers(
            team.tryoutSeason,
            team.tryoutYear,
            team.grade,
            team.gender
          );
        } else {
          throw new Error('Failed to fetch team data');
        }
      } else {
        // Set default values for new team
        form.setFieldsValue({
          year: currentYear,
          tryoutYear: currentYear,
          gender: 'Male',
          tryoutSeason: 'Basketball Select Tryout',
        });

        // Load players for default values
        setTimeout(() => {
          handleTryoutChange();
        }, 100);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: InternalTeamFormData) => {
    try {
      setSubmitting(true);
      setError(null);

      const token = await getAuthToken();
      const url = isEdit
        ? `${process.env.REACT_APP_API_BASE_URL}/internal-teams/${id}`
        : `${process.env.REACT_APP_API_BASE_URL}/internal-teams`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save team');
      }

      navigate(all_routes.teams);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save team');
    } finally {
      setSubmitting(false);
    }
  };

  // Load available players when tryout season/year or grade/gender changes
  const loadAvailablePlayers = async (
    tryoutSeason: string,
    tryoutYear: number,
    grade: string,
    gender: string
  ) => {
    try {
      setPlayersLoading(true);
      const token = await getAuthToken();
      const queryParams = new URLSearchParams({
        season: tryoutSeason,
        year: tryoutYear.toString(),
        ...(grade && { grade }),
        ...(gender && { gender }),
      });

      console.log('Loading players with params:', queryParams.toString());

      const playersResponse = await fetch(
        `${process.env.REACT_APP_API_BASE_URL}/internal-teams/available-players?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (playersResponse.ok) {
        const players = await playersResponse.json();
        console.log(`Loaded ${players.length} players`);

        // If editing, include current team players even if they don't match current filters
        if (isEdit && currentTeamData?.playerIds) {
          const currentPlayerIds = currentTeamData.playerIds.map(
            (p: any) => p._id
          );
          const currentPlayersInList = players.filter((p: Player) =>
            currentPlayerIds.includes(p._id)
          );
          const missingPlayers = currentTeamData.playerIds.filter(
            (p: any) => !players.some((ap: Player) => ap._id === p._id)
          );

          // Combine available players with current team players
          const allPlayers = [...players, ...missingPlayers];
          setAvailablePlayers(allPlayers);
        } else {
          setAvailablePlayers(players);
        }
      } else {
        console.error('Failed to load players:', playersResponse.status);
        // If editing and fetch fails, at least show current players
        if (isEdit && currentTeamData?.playerIds) {
          setAvailablePlayers(currentTeamData.playerIds);
        }
      }
    } catch (err) {
      console.error('Failed to load available players:', err);
      // If editing and fetch fails, at least show current players
      if (isEdit && currentTeamData?.playerIds) {
        setAvailablePlayers(currentTeamData.playerIds);
      }
    } finally {
      setPlayersLoading(false);
    }
  };

  // Handle tryout season/year changes
  const handleTryoutChange = () => {
    if (isEdit) return; // Disabled for edit mode

    const tryoutSeason = form.getFieldValue('tryoutSeason');
    const tryoutYear = form.getFieldValue('tryoutYear');
    const grade = form.getFieldValue('grade');
    const gender = form.getFieldValue('gender');

    console.log('Tryout change:', { tryoutSeason, tryoutYear, grade, gender });

    if (tryoutSeason && tryoutYear) {
      loadAvailablePlayers(tryoutSeason, tryoutYear, grade, gender);
    }
  };

  // Handle grade/gender changes
  const handleGradeChange = (grade: string) => {
    if (isEdit) return; // Disabled for edit mode
    handleTryoutChange();
  };

  const handleGenderChange = (gender: string) => {
    if (isEdit) return; // Disabled for edit mode
    handleTryoutChange();
  };

  // Custom filter function for Select component
  const filterOption = (
    input: string,
    option?: { children: string; value: string | number }
  ) => {
    if (!option?.children) return false;
    return option.children
      .toString()
      .toLowerCase()
      .includes(input.toLowerCase());
  };

  if (loading) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <div id='global-loader'>
            <div className='page-loader'></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <div className='card'>
          <div className='card-header'>
            <Space>
              <Link to={all_routes.teams}>
                <Button type='text' icon={<ArrowLeftOutlined />}>
                  Back to Teams
                </Button>
              </Link>
              <h4 className='mb-0'>
                {isEdit ? 'Edit Team' : 'Create New Team from Tryouts'}
              </h4>
            </Space>
          </div>

          <div className='card-body'>
            {error && (
              <Alert
                message='Error'
                description={error}
                type='error'
                showIcon
                closable
                onClose={() => setError(null)}
                className='mb-3'
              />
            )}

            <Form form={form} layout='vertical' onFinish={handleSubmit}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label='Team Name'
                    name='name'
                    rules={[
                      { required: true, message: 'Please enter team name' },
                    ]}
                    help="Enter the base team name (e.g., 'Partizan'). The year will be added automatically in displays."
                  >
                    <Input placeholder='Enter team name (e.g., Partizan)' />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    label='Team Year'
                    name='year'
                    rules={[{ required: true, message: 'Please select year' }]}
                    help='This year will be displayed with the team name'
                  >
                    <Select
                      placeholder='Select year'
                      disabled={isEdit} // Disable in edit mode
                    >
                      {(metadata.years || []).map((year: number) => (
                        <Option key={year} value={year}>
                          {year}
                        </Option>
                      ))}
                      {!metadata.years.includes(currentYear) && (
                        <Option value={currentYear}>{currentYear}</Option>
                      )}
                      <Option value={currentYear + 1}>{currentYear + 1}</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item
                    label='Team Grade'
                    name='grade'
                    rules={[{ required: true, message: 'Please select grade' }]}
                  >
                    <Select
                      placeholder='Select grade'
                      onChange={handleGradeChange}
                      disabled={isEdit} // Disable in edit mode
                    >
                      {(metadata.grades || []).map((grade: string) => (
                        <Option key={grade} value={grade}>
                          {grade}
                        </Option>
                      ))}
                      <Option value='K'>Kindergarten</Option>
                      <Option value='1'>1st</Option>
                      <Option value='2'>2nd</Option>
                      <Option value='3'>3rd</Option>
                      <Option value='4'>4th</Option>
                      <Option value='5'>5th</Option>
                      <Option value='6'>6th</Option>
                      <Option value='7'>7th</Option>
                      <Option value='8'>8th</Option>
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={6}>
                  <Form.Item
                    label='Team Gender'
                    name='gender'
                    rules={[
                      { required: true, message: 'Please select gender' },
                    ]}
                  >
                    <Select
                      placeholder='Select gender'
                      onChange={handleGenderChange}
                      disabled={isEdit} // Disable in edit mode
                    >
                      <Option value='Male'>Male</Option>
                      <Option value='Female'>Female</Option>
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={6}>
                  <Form.Item
                    label='Tryout Season'
                    name='tryoutSeason'
                    rules={[
                      {
                        required: true,
                        message: 'Please select tryout season',
                      },
                    ]}
                  >
                    <Select
                      placeholder='Select tryout season'
                      onChange={handleTryoutChange}
                      disabled={isEdit} // Disable in edit mode
                    >
                      {(metadata.tryoutSeasons || []).map((season: string) => (
                        <Option key={season} value={season}>
                          {season}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={6}>
                  <Form.Item
                    label='Tryout Year'
                    name='tryoutYear'
                    rules={[
                      { required: true, message: 'Please select tryout year' },
                    ]}
                  >
                    <Select
                      placeholder='Select tryout year'
                      onChange={handleTryoutChange}
                      disabled={isEdit} // Disable in edit mode
                    >
                      {(metadata.years || []).map((year: number) => (
                        <Option key={year} value={year}>
                          {year}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label='Coaches' name='coachIds'>
                    <Select
                      mode='multiple'
                      placeholder='Select coaches'
                      optionFilterProp='children'
                      filterOption={filterOption}
                    >
                      {availableCoaches.map((coach) => (
                        <Option key={coach._id} value={coach._id}>
                          <Space>
                            <UserOutlined />
                            {coach.fullName} ({coach.email})
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    label='Players'
                    name='playerIds'
                    help={
                      isEdit
                        ? 'Manage players on this team'
                        : 'Select players who successfully completed the selected tryout'
                    }
                  >
                    <Select
                      mode='multiple'
                      placeholder={
                        playersLoading
                          ? 'Loading players...'
                          : isEdit
                          ? 'Select players for this team'
                          : 'Select players from tryouts'
                      }
                      optionFilterProp='children'
                      showSearch
                      filterOption={filterOption}
                      loading={playersLoading}
                    >
                      {availablePlayers.map((player) => (
                        <Option key={player._id} value={player._id}>
                          <Space>
                            <UserOutlined />
                            {player.fullName} - Grade {player.grade} -{' '}
                            {player.schoolName}
                            {player.gender && ` - ${player.gender}`}
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label='Notes' name='notes'>
                <TextArea
                  placeholder='Add any notes about this team...'
                  rows={3}
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type='primary'
                    htmlType='submit'
                    icon={<SaveOutlined />}
                    loading={submitting}
                    size='large'
                    className='btn btn-primary d-flex align-items-center mb-2'
                  >
                    {isEdit ? 'Update Team' : 'Create Team'}
                  </Button>
                  <Link to={all_routes.teams}>
                    <Button
                      className='btn btn-secondary d-flex align-items-center mb-2'
                      size='large'
                    >
                      Cancel
                    </Button>
                  </Link>
                </Space>
              </Form.Item>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamForm;
