import React, { useState, useEffect, useCallback } from 'react';
import {
  OverlayTrigger,
  Tooltip,
  Button,
  Badge,
  Alert,
  Card,
  Tab,
  Nav,
} from 'react-bootstrap';
import {
  SeasonEvent,
  RegistrationFormConfig as RegistrationFormConfigType,
  PricingPackage,
  TournamentSpecificConfig,
  TryoutSpecificConfig,
} from '../../types/registration-types';
import RegistrationFormConfig from './RegistrationFormConfig';
import TryoutFormConfig from './TryoutFormConfig';
import SeasonEventManager from './SeasonEventManager';
import TournamentFormConfig from './TournamentFormConfig';
import FormPreview from './FormPreview';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { debounce } from '../../utils/debounce';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const RegistrationFormManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'forms' | 'tournaments' | 'tryouts' | 'seasons' | 'preview'
  >('forms');
  const [seasonEvents, setSeasonEvents] = useState<SeasonEvent[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<SeasonEvent | null>(
    null
  );
  const [formConfigs, setFormConfigs] = useState<
    Record<string, RegistrationFormConfigType>
  >({});
  const [tournamentConfigs, setTournamentConfigs] = useState<
    Record<string, TournamentSpecificConfig>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadedCount, setLoadedCount] = useState(0);
  const [selectedTournamentKey, setSelectedTournamentKey] = useState<
    string | null
  >(null);
  const [tryoutConfigs, setTryoutConfigs] = useState<
    Record<string, TryoutSpecificConfig>
  >({});
  const [selectedTryoutKey, setSelectedTryoutKey] = useState<string | null>(
    null
  );
  const [previewType, setPreviewType] = useState<
    'training' | 'tournament' | 'tryout'
  >('training');

  useEffect(() => {
    loadSeasonEvents();
    loadFormConfigs();
    loadTournamentConfigs();
    loadTryoutConfigs();
  }, []);

  // Track when all three loads are complete
  useEffect(() => {
    if (loadedCount >= 4) {
      setIsLoading(false);
      console.log('✅ All data loaded, loading complete');
    }
  }, [loadedCount]);

  const loadSeasonEvents = async () => {
    try {
      console.log('📅 Loading season events...');
      const response = await fetch(`${API_BASE_URL}/admin/season-events`);
      if (response.ok) {
        const events = await response.json();
        console.log('✅ Season events loaded:', events);
        setSeasonEvents(events);
        if (events.length > 0 && !selectedSeason) {
          setSelectedSeason(events[0]);
        }
      } else {
        throw new Error('Failed to load season events');
      }
    } catch (error) {
      console.error('❌ Error loading season events:', error);
      setError('Error loading season events');
    } finally {
      setLoadedCount((prev) => prev + 1);
    }
  };

  const loadFormConfigs = async () => {
    try {
      console.log('⚙️ Loading form configs...');
      const response = await fetch(`${API_BASE_URL}/admin/form-configs`);
      if (response.ok) {
        const configs = await response.json();
        console.log('✅ Form configs loaded - FULL ANALYSIS:', {
          rawResponse: configs,
          keys: Object.keys(configs),
          firstKey: Object.keys(configs)[0],
          firstConfig: configs[Object.keys(configs)[0]],
        });

        setFormConfigs(configs);
      } else {
        throw new Error('Failed to load form configs');
      }
    } catch (error) {
      console.error('❌ Error loading form configs:', error);
      setError('Error loading form configs');
    } finally {
      setLoadedCount((prev) => prev + 1);
    }
  };

  const loadTournamentConfigs = async () => {
    try {
      console.log('🏀 Loading tournament configs...');
      const response = await fetch(`${API_BASE_URL}/admin/tournament-configs`);
      if (response.ok) {
        const configs = await response.json();
        console.log('✅ Tournament configs loaded:', configs);

        // Ensure all configs have ageGroups
        const validatedConfigs = configs.map(
          (config: TournamentSpecificConfig) => ({
            ...config,
            ageGroups: config.ageGroups || [],
          })
        );

        // Convert array to object with tournamentName as key
        const configMap: Record<string, TournamentSpecificConfig> = {};
        validatedConfigs.forEach((config: TournamentSpecificConfig) => {
          configMap[config.tournamentName] = config;
        });

        setTournamentConfigs(configMap);

        // Select the first tournament if available
        const firstKey = Object.keys(configMap)[0];
        if (firstKey) {
          setSelectedTournamentKey(firstKey);
        }
      } else {
        console.log('⚠️ No tournament configs found');
      }
    } catch (error) {
      console.error('❌ Error loading tournament configs:', error);
    } finally {
      setLoadedCount((prev) => prev + 1);
    }
  };

  const getFormKey = (season: string, year: number) => `${season}-${year}`;

  const handleConfigUpdate = useCallback(
    (updatedConfig: RegistrationFormConfigType) => {
      if (!selectedSeason) return;

      const key = getFormKey(selectedSeason.season, selectedSeason.year);

      console.log('🔄 Config update received in manager:', {
        key,
        selectedSeason,
        updatedConfig,
        packages: updatedConfig.pricing.packages,
        packagesCount: updatedConfig.pricing.packages.length,
        currentConfig: formConfigs[key],
      });

      // Update local state immediately
      setFormConfigs((prev) => ({
        ...prev,
        [key]: updatedConfig,
      }));

      // Save to backend
      saveFormConfig(selectedSeason, updatedConfig);
    },
    [selectedSeason, formConfigs]
  );

  const handleTournamentConfigUpdate = useCallback(
    async (updatedConfig: TournamentSpecificConfig, originalName?: string) => {
      const key = updatedConfig.tournamentName;

      console.log('🏀 Tournament config update received:', {
        key,
        updatedConfig,
        originalName,
      });

      try {
        // Save to backend immediately
        const cleanConfig = {
          ...updatedConfig,
          originalTournamentName: originalName,
        };

        const response = await fetch(
          `${API_BASE_URL}/admin/tournament-configs`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(cleanConfig),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to save tournament configuration: ${errorText}`
          );
        }

        const savedConfig = await response.json();
        console.log('✅ Tournament config saved successfully:', savedConfig);

        // Update local state
        setTournamentConfigs((prev) => ({
          ...prev,
          [key]: savedConfig,
        }));

        setSuccessMessage('Tournament configuration saved successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (error) {
        console.error('❌ Error saving tournament config:', error);
        setError('Error saving tournament config: ' + (error as Error).message);
        throw error; // Re-throw so the component knows save failed
      }
    },
    []
  );

  const saveFormConfig = useCallback(
    debounce(
      async (seasonEvent: SeasonEvent, config: RegistrationFormConfigType) => {
        try {
          console.log('💾 Saving form config:', {
            seasonEvent,
            config,
            packages: config.pricing.packages,
          });

          const payload = {
            season: seasonEvent.season,
            year: seasonEvent.year,
            config: {
              ...config,
              pricing: {
                basePrice: config.pricing.basePrice,
                packages: config.pricing.packages.map((pkg) => ({
                  id: pkg.id,
                  name: pkg.name,
                  price: pkg.price,
                  description: pkg.description,
                })),
              },
            },
          };

          const response = await fetch(`${API_BASE_URL}/admin/form-configs`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to save form configuration: ${errorText}`);
          }

          const savedConfig = await response.json();
          console.log('✅ Form config saved successfully:', {
            savedConfig,
            packages: savedConfig.pricing?.packages,
          });

          setSuccessMessage('Form configuration saved successfully!');
          setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error) {
          console.error('❌ Error saving form config:', error);
          setError('Error saving form config: ' + (error as Error).message);
        }
      },
      1000
    ),
    []
  );

  const saveTournamentConfig = useCallback(
    debounce(async (config: TournamentSpecificConfig) => {
      try {
        console.log('🏀 Saving tournament config:', config);

        const cleanConfig = {
          tournamentName: config.tournamentName,
          tournamentYear: config.tournamentYear,
          displayName: config.displayName,
          registrationDeadline: config.registrationDeadline,
          tournamentDates: config.tournamentDates,
          locations: config.locations,
          divisions: config.divisions,
          requiresRoster: config.requiresRoster,
          requiresInsurance: config.requiresInsurance,
          paymentDeadline: config.paymentDeadline,
          refundPolicy: config.refundPolicy,
          rulesDocumentUrl: config.rulesDocumentUrl,
          scheduleDocumentUrl: config.scheduleDocumentUrl,
          tournamentFee: config.tournamentFee,
          isActive: config.isActive,
        };

        const response = await fetch(
          `${API_BASE_URL}/admin/tournament-configs`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify(cleanConfig),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to save tournament configuration: ${errorText}`
          );
        }

        const savedConfig = await response.json();
        console.log('✅ Tournament config saved successfully:', savedConfig);

        setSuccessMessage('Tournament configuration saved successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (error) {
        console.error('❌ Error saving tournament config:', error);
        setError('Error saving tournament config: ' + (error as Error).message);
      }
    }, 1000),
    []
  );

  // Tryout loading function
  const loadTryoutConfigs = async () => {
    try {
      console.log('🏀 Loading tryout configs...');
      const response = await fetch(`${API_BASE_URL}/admin/tryout-configs`);
      if (response.ok) {
        const configs = await response.json();
        console.log('✅ Tryout configs loaded:', configs);

        // Convert array to object with tryoutName as key
        const configMap: Record<string, TryoutSpecificConfig> = {};
        configs.forEach((config: TryoutSpecificConfig) => {
          configMap[config.tryoutName] = config;
        });

        setTryoutConfigs(configMap);

        // Select the first tryout if available
        const firstKey = Object.keys(configMap)[0];
        if (firstKey) {
          setSelectedTryoutKey(firstKey);
        }
      } else {
        console.log('⚠️ No tryout configs found');
      }
    } catch (error) {
      console.error('❌ Error loading tryout configs:', error);
    } finally {
      setLoadedCount((prev) => prev + 1);
    }
  };

  // Tryout config update handler
  const handleTryoutConfigUpdate = useCallback(
    async (updatedConfig: TryoutSpecificConfig, originalName?: string) => {
      const key = updatedConfig.tryoutName;

      console.log('🎯 Tryout config update received:', {
        key,
        updatedConfig,
        originalName,
      });

      try {
        const cleanConfig = {
          ...updatedConfig,
          originalTryoutName: originalName,
        };

        const response = await fetch(`${API_BASE_URL}/admin/tryout-configs`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(cleanConfig),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to save tryout configuration: ${errorText}`);
        }

        const savedConfig = await response.json();
        console.log('✅ Tryout config saved successfully:', savedConfig);

        // Update local state
        setTryoutConfigs((prev) => ({
          ...prev,
          [key]: savedConfig,
        }));

        setSuccessMessage('Tryout configuration saved successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (error) {
        console.error('❌ Error saving tryout config:', error);
        setError('Error saving tryout config: ' + (error as Error).message);
        throw error;
      }
    },
    []
  );

  // Tryout save function
  const saveTryoutConfig = useCallback(
    debounce(async (config: TryoutSpecificConfig) => {
      try {
        console.log('🎯 Saving tryout config:', config);

        const cleanConfig = {
          tryoutName: config.tryoutName,
          tryoutYear: config.tryoutYear,
          displayName: config.displayName,
          registrationDeadline: config.registrationDeadline,
          tryoutDates: config.tryoutDates,
          locations: config.locations,
          divisions: config.divisions,
          ageGroups: config.ageGroups,
          requiresPayment: config.requiresPayment,
          requiresRoster: config.requiresRoster,
          requiresInsurance: config.requiresInsurance,
          paymentDeadline: config.paymentDeadline,
          refundPolicy: config.refundPolicy,
          tryoutFee: config.tryoutFee,
          isActive: config.isActive,
        };

        const response = await fetch(`${API_BASE_URL}/admin/tryout-configs`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(cleanConfig),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to save tryout configuration: ${errorText}`);
        }

        const savedConfig = await response.json();
        console.log('✅ Tryout config saved successfully:', savedConfig);

        setSuccessMessage('Tryout configuration saved successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (error) {
        console.error('❌ Error saving tryout config:', error);
        setError('Error saving tryout config: ' + (error as Error).message);
      }
    }, 1000),
    []
  );

  const createNewSeason = async (newSeason: Omit<SeasonEvent, 'eventId'>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/season-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newSeason),
      });

      if (response.ok) {
        const createdSeason = await response.json();
        setSeasonEvents((prev) => [...prev, createdSeason]);
        setSelectedSeason(createdSeason);
        setSuccessMessage('Season event created successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
        return true;
      }
    } catch (error) {
      setError('Error creating season');
    }
    return false;
  };

  const handleSeasonSelect = (season: SeasonEvent) => {
    const key = getFormKey(season.season, season.year);
    console.log('🎯 Selecting season:', {
      season,
      key,
      availableConfigs: Object.keys(formConfigs),
      configForThisSeason: formConfigs[key],
      tournamentConfigForThisSeason: tournamentConfigs[key],
    });

    setSelectedSeason(season);
  };

  const refreshAllData = () => {
    console.log('🔄 Refreshing all data...');
    loadSeasonEvents();
    loadFormConfigs();
    loadTournamentConfigs();
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className='registration-form-manager'>
      {error && (
        <Alert variant='danger' onClose={() => setError(null)} dismissible>
          <i className='ti ti-alert-circle me-2'></i>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert
          variant='success'
          onClose={() => setSuccessMessage(null)}
          dismissible
        >
          <i className='ti ti-check me-2'></i>
          {successMessage}
        </Alert>
      )}

      <Card>
        <Card.Header>
          <div className='d-flex justify-content-between align-items-center'>
            <h3 className='mb-0'>Registration Form Manager</h3>
            <div className='d-flex align-items-center'>
              <OverlayTrigger
                overlay={<Tooltip id='tooltip-top'>Refresh Data</Tooltip>}
              >
                <Button
                  variant='outline-light'
                  className='bg-white btn-icon me-2'
                  onClick={refreshAllData}
                >
                  <i className='ti ti-refresh' />
                </Button>
              </OverlayTrigger>
              <Button
                variant='outline-info'
                className='bg-white btn-icon'
                onClick={() => {
                  console.log('🔍 Current state:', {
                    seasonEvents,
                    selectedSeason,
                    formConfigs,
                    tournamentConfigs,
                    selectedConfig: selectedSeason
                      ? formConfigs[
                          getFormKey(selectedSeason.season, selectedSeason.year)
                        ]
                      : null,
                    selectedTournamentConfig: selectedSeason
                      ? tournamentConfigs[
                          getFormKey(selectedSeason.season, selectedSeason.year)
                        ]
                      : null,
                  });
                }}
              >
                <i className='ti ti-info-circle' />
              </Button>
            </div>
          </div>
        </Card.Header>

        {/* Navigation Tabs */}
        <Card.Header className='bg-light'>
          <Nav
            variant='tabs'
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k as any)}
          >
            <Nav.Item>
              <Nav.Link eventKey='forms'>
                <i className='ti ti-settings me-2'></i>
                Training Configuration
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey='tournaments'>
                <i className='ti ti-trophy me-2'></i>
                Tournament Configuration
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey='tryouts'>
                <i className='ti ti-target-arrow me-2'></i>
                Tryout Configuration
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey='seasons'>
                <i className='ti ti-calendar me-2'></i>
                Season Events
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey='preview'>
                <i className='ti ti-eye me-2'></i>
                Preview
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Card.Header>

        <Card.Body>
          <Tab.Content>
            {/* Training Configuration Tab */}
            <Tab.Pane active={activeTab === 'forms'}>
              <div className='row'>
                <div className='col-md-3'>
                  <Card>
                    <Card.Header>
                      <h5 className='card-title mb-0'>Select Season</h5>
                    </Card.Header>
                    <Card.Body>
                      <div className='list-group'>
                        {seasonEvents.map((season) => {
                          const key = getFormKey(season.season, season.year);
                          const config = formConfigs[key];
                          const tournamentConfig = tournamentConfigs[key];

                          return (
                            <button
                              key={key}
                              className={`list-group-item list-group-item-action ${
                                selectedSeason?.season === season.season &&
                                selectedSeason?.year === season.year
                                  ? 'active'
                                  : ''
                              }`}
                              onClick={() => handleSeasonSelect(season)}
                            >
                              <div className='d-flex w-100 justify-content-between'>
                                <h6 className='text-black mb-1'>
                                  {season.season}
                                </h6>
                                <small className='text-black'>
                                  {season.year}
                                </small>
                              </div>
                              <div className='d-flex flex-column gap-1 mt-1'>
                                <div className='d-flex justify-content-between align-items-center'>
                                  {config?.isActive ? (
                                    <Badge bg='success'>Training Active</Badge>
                                  ) : (
                                    <Badge bg='secondary'>
                                      Training Inactive
                                    </Badge>
                                  )}
                                  {config?.pricing?.packages?.length > 0 && (
                                    <small className='text-muted'>
                                      {config.pricing.packages.length} packages
                                    </small>
                                  )}
                                </div>
                                {tournamentConfig && (
                                  <div className='d-flex justify-content-between align-items-center'>
                                    <Badge bg='info'>
                                      Has Tournament Config
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </Card.Body>
                  </Card>
                </div>

                <div className='col-md-9'>
                  {selectedSeason ? (
                    <RegistrationFormConfig
                      seasonEvent={selectedSeason}
                      onConfigUpdate={handleConfigUpdate}
                      initialConfig={
                        formConfigs[
                          getFormKey(selectedSeason.season, selectedSeason.year)
                        ] || {
                          isActive: false,
                          requiresPayment: true,
                          requiresQualification: false,
                          pricing: {
                            basePrice: 0,
                            packages: [],
                          },
                        }
                      }
                    />
                  ) : (
                    <Card>
                      <Card.Body className='text-center p-5'>
                        <i className='ti ti-calendar-off fs-1 text-muted mb-3'></i>
                        <h5>No Season Selected</h5>
                        <p className='text-muted'>
                          Please select a season to configure training forms.
                        </p>
                      </Card.Body>
                    </Card>
                  )}
                </div>
              </div>
            </Tab.Pane>

            {/* Tournament Configuration Tab */}
            <Tab.Pane active={activeTab === 'tournaments'}>
              <div className='row'>
                <div className='col-md-3'>
                  <Card>
                    <Card.Header>
                      <div className='d-flex justify-content-between align-items-center'>
                        <h5 className='card-title mb-0'>Tournaments</h5>
                        <button
                          className='btn btn-sm btn-primary'
                          onClick={() => {
                            const newTournamentKey = `new-tournament-${Date.now()}`;
                            const newTournamentConfig: TournamentSpecificConfig =
                              {
                                tournamentName: '',
                                tournamentYear: new Date().getFullYear(),
                                displayName: '',
                                registrationDeadline: '',
                                tournamentDates: [],
                                locations: [],
                                divisions: ['Gold', 'Silver'],
                                ageGroups: [], // Add this
                                requiresRoster: true,
                                requiresInsurance: true,
                                paymentDeadline: '',
                                refundPolicy:
                                  'No refunds after registration deadline',
                                rulesDocumentUrl: '',
                                scheduleDocumentUrl: '',
                                tournamentFee: 425,
                                isActive: false,
                              };

                            setTournamentConfigs((prev) => ({
                              ...prev,
                              [newTournamentKey]: newTournamentConfig,
                            }));
                            setSelectedTournamentKey(newTournamentKey);
                          }}
                        >
                          <i className='ti ti-plus me-1'></i>
                          New
                        </button>
                      </div>
                    </Card.Header>
                    <Card.Body>
                      {Object.keys(tournamentConfigs).length === 0 ? (
                        <div className='text-center text-muted py-4'>
                          <i className='ti ti-trophy-off fs-4 mb-2'></i>
                          <p>No tournaments created yet</p>
                          <small>Create your first tournament</small>
                        </div>
                      ) : (
                        <div className='list-group'>
                          {Object.entries(tournamentConfigs).map(
                            ([key, config]) => (
                              <button
                                key={key}
                                className={`list-group-item list-group-item-action ${
                                  selectedTournamentKey === key ? 'active' : ''
                                }`}
                                onClick={() => setSelectedTournamentKey(key)}
                              >
                                <div className='d-flex w-100 justify-content-between'>
                                  <h6 className='text-black mb-1'>
                                    {config.tournamentName ||
                                      'Unnamed Tournament'}
                                  </h6>
                                  <small className='text-black'>
                                    {config.tournamentYear}
                                  </small>
                                </div>
                                <div className='d-flex flex-column gap-1 mt-1'>
                                  <div className='d-flex justify-content-between align-items-center'>
                                    {config.isActive ? (
                                      <Badge bg='success'>Active</Badge>
                                    ) : (
                                      <Badge bg='secondary'>Inactive</Badge>
                                    )}
                                    <small className='text-muted'>
                                      ${config.tournamentFee}
                                    </small>
                                  </div>
                                  {config.displayName && (
                                    <small className='text-muted'>
                                      {config.displayName}
                                    </small>
                                  )}
                                  {config.divisions?.length > 0 && (
                                    <small className='text-muted'>
                                      Divisions: {config.divisions.join(', ')}
                                    </small>
                                  )}
                                </div>
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </div>

                <div className='col-md-9'>
                  {selectedTournamentKey &&
                  tournamentConfigs[selectedTournamentKey] ? (
                    <TournamentFormConfig
                      onTournamentConfigUpdate={handleTournamentConfigUpdate}
                      initialTournamentConfig={
                        tournamentConfigs[selectedTournamentKey]
                      }
                      initialConfig={{
                        isActive: false,
                        requiresPayment: true,
                        requiresQualification: false,
                        pricing: {
                          basePrice:
                            tournamentConfigs[selectedTournamentKey]
                              .tournamentFee,
                          packages: [],
                        },
                      }}
                    />
                  ) : (
                    <Card>
                      <Card.Body className='text-center p-5'>
                        <i className='ti ti-trophy-off fs-1 text-muted mb-3'></i>
                        <h5>No Tournament Selected</h5>
                        <p className='text-muted'>
                          {Object.keys(tournamentConfigs).length === 0
                            ? 'Create a new tournament to get started'
                            : 'Select a tournament from the list to configure'}
                        </p>
                        {Object.keys(tournamentConfigs).length === 0 && (
                          <button
                            className='btn btn-primary mt-3'
                            onClick={() => {
                              const newTournamentKey = `new-tournament-${Date.now()}`;
                              const newTournamentConfig: TournamentSpecificConfig =
                                {
                                  tournamentName: '',
                                  tournamentYear: new Date().getFullYear(),
                                  displayName: '',
                                  registrationDeadline: '',
                                  tournamentDates: [],
                                  locations: [],
                                  divisions: ['Gold', 'Silver'],
                                  ageGroups: [], // Add this
                                  requiresRoster: true,
                                  requiresInsurance: true,
                                  paymentDeadline: '',
                                  refundPolicy:
                                    'No refunds after registration deadline',
                                  rulesDocumentUrl: '',
                                  scheduleDocumentUrl: '',
                                  tournamentFee: 425,
                                  isActive: false,
                                };

                              setTournamentConfigs((prev) => ({
                                ...prev,
                                [newTournamentKey]: newTournamentConfig,
                              }));
                              setSelectedTournamentKey(newTournamentKey);
                            }}
                          >
                            <i className='ti ti-plus me-2'></i>
                            Create First Tournament
                          </button>
                        )}
                      </Card.Body>
                    </Card>
                  )}
                </div>
              </div>
            </Tab.Pane>

            <Tab.Pane active={activeTab === 'tryouts'}>
              <div className='row'>
                <div className='col-md-3'>
                  <Card>
                    <Card.Header>
                      <div className='d-flex justify-content-between align-items-center'>
                        <h5 className='card-title mb-0'>Tryouts</h5>
                        <button
                          className='btn btn-sm btn-primary'
                          onClick={() => {
                            const newTryoutKey = `new-tryout-${Date.now()}`;
                            const newTryoutConfig: TryoutSpecificConfig = {
                              tryoutName: '',
                              tryoutYear: new Date().getFullYear(),
                              displayName: '',
                              registrationDeadline: '',
                              tryoutDates: [],
                              locations: [],
                              divisions: [],
                              ageGroups: [],
                              requiresPayment: true,
                              requiresRoster: false,
                              requiresInsurance: true,
                              paymentDeadline: '',
                              refundPolicy:
                                'No refunds after tryout registration deadline',
                              tryoutFee: 50,
                              isActive: false,
                            };

                            setTryoutConfigs((prev) => ({
                              ...prev,
                              [newTryoutKey]: newTryoutConfig,
                            }));
                            setSelectedTryoutKey(newTryoutKey);
                          }}
                        >
                          <i className='ti ti-plus me-1'></i>
                          New
                        </button>
                      </div>
                    </Card.Header>
                    <Card.Body>
                      {Object.keys(tryoutConfigs).length === 0 ? (
                        <div className='text-center text-muted py-4'>
                          <i className='ti ti-target-off fs-4 mb-2'></i>
                          <p>No tryouts created yet</p>
                          <small>Create your first tryout</small>
                        </div>
                      ) : (
                        <div className='list-group'>
                          {Object.entries(tryoutConfigs).map(
                            ([key, config]) => (
                              <button
                                key={key}
                                className={`list-group-item list-group-item-action ${
                                  selectedTryoutKey === key ? 'active' : ''
                                }`}
                                onClick={() => setSelectedTryoutKey(key)}
                              >
                                <div className='d-flex w-100 justify-content-between'>
                                  <h6 className='text-black mb-1'>
                                    {config.tryoutName || 'Unnamed Tryout'}
                                  </h6>
                                  <small className='text-black'>
                                    {config.tryoutYear}
                                  </small>
                                </div>
                                <div className='d-flex flex-column gap-1 mt-1'>
                                  <div className='d-flex justify-content-between align-items-center'>
                                    {config.isActive ? (
                                      <Badge bg='success'>Active</Badge>
                                    ) : (
                                      <Badge bg='secondary'>Inactive</Badge>
                                    )}
                                    <small className='text-muted'>
                                      ${config.tryoutFee}
                                    </small>
                                  </div>
                                  {config.displayName && (
                                    <small className='text-muted'>
                                      {config.displayName}
                                    </small>
                                  )}
                                </div>
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </div>

                <div className='col-md-9'>
                  {selectedTryoutKey && tryoutConfigs[selectedTryoutKey] ? (
                    <TryoutFormConfig
                      onTryoutConfigUpdate={handleTryoutConfigUpdate}
                      initialConfig={tryoutConfigs[selectedTryoutKey]}
                    />
                  ) : (
                    <Card>
                      <Card.Body className='text-center p-5'>
                        <i className='ti ti-target-off fs-1 text-muted mb-3'></i>
                        <h5>No Tryout Selected</h5>
                        <p className='text-muted'>
                          {Object.keys(tryoutConfigs).length === 0
                            ? 'Create a new tryout to get started'
                            : 'Select a tryout from the list to configure'}
                        </p>
                        {Object.keys(tryoutConfigs).length === 0 && (
                          <button
                            className='btn btn-primary mt-3'
                            onClick={() => {
                              const newTryoutKey = `new-tryout-${Date.now()}`;
                              const newTryoutConfig: TryoutSpecificConfig = {
                                tryoutName: '',
                                tryoutYear: new Date().getFullYear(),
                                displayName: '',
                                registrationDeadline: '',
                                tryoutDates: [],
                                locations: [],
                                divisions: [],
                                ageGroups: [],
                                requiresPayment: true,
                                requiresRoster: false,
                                requiresInsurance: true,
                                paymentDeadline: '',
                                refundPolicy:
                                  'No refunds after tryout registration deadline',
                                tryoutFee: 50,
                                isActive: false,
                              };

                              setTryoutConfigs((prev) => ({
                                ...prev,
                                [newTryoutKey]: newTryoutConfig,
                              }));
                              setSelectedTryoutKey(newTryoutKey);
                            }}
                          >
                            <i className='ti ti-plus me-2'></i>
                            Create First Tryout
                          </button>
                        )}
                      </Card.Body>
                    </Card>
                  )}
                </div>
              </div>
            </Tab.Pane>

            {/* Season Events Tab */}
            <Tab.Pane active={activeTab === 'seasons'}>
              <SeasonEventManager
                seasonEvents={seasonEvents}
                onSeasonCreate={createNewSeason}
                onSeasonUpdate={setSeasonEvents}
              />
            </Tab.Pane>

            {/* Preview Tab */}
            <Tab.Pane active={activeTab === 'preview'}>
              <div className='row'>
                <div className='col-md-3'>
                  <Card className='mb-3'>
                    <Card.Header>
                      <h5 className='card-title mb-0'>Preview Options</h5>
                    </Card.Header>
                    <Card.Body>
                      <div className='list-group'>
                        <button
                          className={`list-group-item list-group-item-action ${
                            previewType === 'training' ? 'active' : ''
                          } text-black`}
                          onClick={() => {
                            setPreviewType('training');
                            setSelectedTournamentKey(null);
                            setSelectedTryoutKey(null);
                          }}
                        >
                          <i className='ti ti-settings me-2'></i>
                          Training Form Preview
                        </button>
                        <button
                          className={`list-group-item list-group-item-action ${
                            previewType === 'tournament' ? 'active' : ''
                          } text-black`}
                          onClick={() => {
                            setPreviewType('tournament');
                            // Select the first tournament if none selected
                            if (
                              !selectedTournamentKey &&
                              Object.keys(tournamentConfigs).length > 0
                            ) {
                              setSelectedTournamentKey(
                                Object.keys(tournamentConfigs)[0]
                              );
                            }
                          }}
                        >
                          <i className='ti ti-trophy me-2'></i>
                          Tournament Form Preview
                        </button>
                        <button
                          className={`list-group-item list-group-item-action ${
                            previewType === 'tryout' ? 'active' : ''
                          } text-black`}
                          onClick={() => {
                            setPreviewType('tryout');
                            // Select the first tryout if none selected
                            if (
                              !selectedTryoutKey &&
                              Object.keys(tryoutConfigs).length > 0
                            ) {
                              setSelectedTryoutKey(
                                Object.keys(tryoutConfigs)[0]
                              );
                            }
                          }}
                        >
                          <i className='ti ti-target-arrow me-2'></i>
                          Tryout Form Preview
                        </button>
                      </div>
                    </Card.Body>
                  </Card>

                  {/* Tournament Selection for Preview */}
                  {previewType === 'tournament' && (
                    <Card className='mb-3'>
                      <Card.Header>
                        <h6 className='card-title mb-0'>Select Tournament</h6>
                      </Card.Header>
                      <Card.Body>
                        <div className='list-group'>
                          {Object.keys(tournamentConfigs).length === 0 ? (
                            <div className='text-center text-muted py-2'>
                              <small>No tournaments created yet</small>
                            </div>
                          ) : (
                            Object.entries(tournamentConfigs).map(
                              ([key, config]) => (
                                <button
                                  key={key}
                                  className={`list-group-item list-group-item-action ${
                                    selectedTournamentKey === key
                                      ? 'active'
                                      : ''
                                  } text-black`}
                                  onClick={() => setSelectedTournamentKey(key)}
                                >
                                  <div className='d-flex w-100 justify-content-between'>
                                    <span>{config.tournamentName}</span>
                                    <small>{config.tournamentYear}</small>
                                  </div>
                                </button>
                              )
                            )
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  )}

                  {/* Tryout Selection for Preview */}
                  {previewType === 'tryout' && (
                    <Card className='mb-3'>
                      <Card.Header>
                        <h6 className='card-title mb-0'>Select Tryout</h6>
                      </Card.Header>
                      <Card.Body>
                        <div className='list-group'>
                          {Object.keys(tryoutConfigs).length === 0 ? (
                            <div className='text-center text-muted py-2'>
                              <small>No tryouts created yet</small>
                            </div>
                          ) : (
                            Object.entries(tryoutConfigs).map(
                              ([key, config]) => (
                                <button
                                  key={key}
                                  className={`list-group-item list-group-item-action ${
                                    selectedTryoutKey === key ? 'active' : ''
                                  } text-black`}
                                  onClick={() => setSelectedTryoutKey(key)}
                                >
                                  <div className='d-flex w-100 justify-content-between'>
                                    <span>{config.tryoutName}</span>
                                    <small>{config.tryoutYear}</small>
                                  </div>
                                </button>
                              )
                            )
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  )}
                </div>

                <div className='col-md-9'>
                  {previewType === 'training' && selectedSeason ? (
                    <FormPreview
                      seasonEvent={selectedSeason}
                      formConfig={
                        formConfigs[
                          getFormKey(selectedSeason.season, selectedSeason.year)
                        ]
                      }
                      previewType='training'
                    />
                  ) : previewType === 'tournament' &&
                    selectedTournamentKey &&
                    tournamentConfigs[selectedTournamentKey] ? (
                    <FormPreview
                      tournamentConfig={
                        tournamentConfigs[selectedTournamentKey]
                      }
                      previewType='tournament'
                    />
                  ) : previewType === 'tryout' &&
                    selectedTryoutKey &&
                    tryoutConfigs[selectedTryoutKey] ? (
                    <FormPreview
                      tryoutConfig={tryoutConfigs[selectedTryoutKey]}
                      previewType='tryout'
                    />
                  ) : (
                    <Card>
                      <Card.Body className='text-center p-5'>
                        <i className='ti ti-eye-off fs-1 text-muted mb-3'></i>
                        <h5>Nothing to Preview</h5>
                        <p className='text-muted'>
                          {previewType === 'training'
                            ? 'Please select a season to preview training forms.'
                            : previewType === 'tournament'
                            ? 'Please select a tournament to preview.'
                            : 'Please select a tryout to preview.'}
                        </p>
                      </Card.Body>
                    </Card>
                  )}
                </div>
              </div>
            </Tab.Pane>
          </Tab.Content>
        </Card.Body>
      </Card>
    </div>
  );
};

export default RegistrationFormManager;
