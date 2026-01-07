// components/registration/RegistrationHub.tsx
import React, { useState, useEffect } from 'react';
import PlayerRegistrationForm from './PlayerRegistrationForm';
import TournamentRegistrationForm from './TournamentRegistrationForm';
import TrainingRegistrationForm from './TrainingRegistrationForm';
import TryoutRegistrationForm from './TryoutRegistrationForm';
import {
  RegistrationFormConfig,
  SeasonEvent,
  TournamentSpecificConfig,
  TryoutSpecificConfig,
} from '../../../types/registration-types';

interface RegistrationHubProps {
  playerConfig?: RegistrationFormConfig | null;
  trainingConfig?: RegistrationFormConfig | null;
  tournamentConfig?: RegistrationFormConfig | TournamentSpecificConfig | null;
  tryoutConfig?: RegistrationFormConfig | TryoutSpecificConfig | null;
  seasonEvent?: SeasonEvent;
  onRegistrationComplete?: () => void;
}

// Helper type guard functions
const isTournamentConfig = (
  config: any
): config is TournamentSpecificConfig => {
  return config && typeof config === 'object' && 'tournamentName' in config;
};

const isTryoutConfig = (config: any): config is TryoutSpecificConfig => {
  return config && typeof config === 'object' && 'tryoutName' in config;
};

const RegistrationHub: React.FC<RegistrationHubProps> = ({
  playerConfig,
  trainingConfig,
  tournamentConfig,
  tryoutConfig,
  seasonEvent,
  onRegistrationComplete,
}) => {
  const [activeForm, setActiveForm] = useState<
    'player' | 'tournament' | 'training' | 'tryout'
  >('player');

  // Determine display names based on config types
  const getDisplayName = (
    config:
      | RegistrationFormConfig
      | TournamentSpecificConfig
      | TryoutSpecificConfig
      | null
      | undefined
  ): string => {
    if (!config) return 'Registration';

    // If it's a tournament config
    if (isTournamentConfig(config)) {
      return (
        config.displayName || config.tournamentName || 'Tournament Registration'
      );
    }

    // If it's a tryout config
    if (isTryoutConfig(config)) {
      return config.displayName || config.tryoutName || 'Tryout Registration';
    }

    // If it's a regular training config with season event
    // Use eventId to get proper season name if available
    const registrationConfig = config as RegistrationFormConfig;

    // If we have a seasonEvent prop, use it for the display name
    if (seasonEvent) {
      return seasonEvent.season;
    }

    // Otherwise use the config's season field
    return registrationConfig.season || 'Registration';
  };

  // Get the proper season event for a config
  const getSeasonEventForConfig = (
    config:
      | RegistrationFormConfig
      | TournamentSpecificConfig
      | TryoutSpecificConfig
      | null
      | undefined
  ): SeasonEvent | undefined => {
    // If a seasonEvent prop is provided, use it
    if (seasonEvent) {
      return seasonEvent;
    }

    if (!config) return undefined;

    // Create a season event from the config
    if (isTournamentConfig(config)) {
      return {
        season: config.tournamentName,
        year: config.tournamentYear,
        eventId:
          config._id?.toString() || `tournament-${config.tournamentYear}`,
        registrationOpens: config.isActive ? new Date() : undefined,
      };
    }

    if (isTryoutConfig(config)) {
      return {
        season: config.tryoutName,
        year: config.tryoutYear,
        eventId: config._id?.toString() || `tryout-${config.tryoutYear}`,
        registrationOpens: config.isActive ? new Date() : undefined,
      };
    }

    const registrationConfig = config as RegistrationFormConfig;
    return {
      season: registrationConfig.season || 'Training',
      year: registrationConfig.year || new Date().getFullYear(),
      eventId:
        registrationConfig.eventId ||
        registrationConfig._id?.toString() ||
        'training-default',
      registrationOpens: registrationConfig.isActive ? new Date() : undefined,
    };
  };

  // Type-safe helper to get isActive
  const getIsActive = (
    config:
      | RegistrationFormConfig
      | TournamentSpecificConfig
      | TryoutSpecificConfig
      | null
      | undefined
  ): boolean => {
    if (!config) return false;
    return (config as any).isActive || false;
  };

  // Check if forms are active - only show if isActive is true
  const playerActive = getIsActive(playerConfig);
  const tournamentActive = getIsActive(tournamentConfig);
  const trainingActive = getIsActive(trainingConfig);
  const tryoutActive = getIsActive(tryoutConfig);

  console.log('RegistrationHub - Active forms:', {
    playerActive,
    tournamentActive,
    trainingActive,
    tryoutActive,
    playerConfig,
    tournamentConfig,
    trainingConfig,
    tryoutConfig,
    seasonEvent,
  });

  // Set initial active tab based on what's available
  useEffect(() => {
    // Priority: tournament > tryout > training > player
    if (tournamentActive && tournamentConfig) {
      setActiveForm('tournament');
    } else if (tryoutActive && tryoutConfig) {
      setActiveForm('tryout');
    } else if (trainingActive && trainingConfig) {
      setActiveForm('training');
    } else if (playerActive && playerConfig) {
      setActiveForm('player');
    }
  }, [
    playerActive,
    tournamentActive,
    trainingActive,
    tryoutActive,
    playerConfig,
    tournamentConfig,
    trainingConfig,
    tryoutConfig,
  ]);

  // If nothing is active, show a message
  if (!playerActive && !tournamentActive && !trainingActive && !tryoutActive) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <i className='ti ti-calendar-off fs-1 text-warning mb-3'></i>
          <h3>Registration Closed</h3>
          <p className='text-muted mb-4'>
            No registrations are currently available. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  // Get season events for each form type
  const tournamentSeasonEvent = tournamentConfig
    ? getSeasonEventForConfig(tournamentConfig)
    : undefined;
  const tryoutSeasonEvent = tryoutConfig
    ? getSeasonEventForConfig(tryoutConfig)
    : undefined;
  const trainingSeasonEvent = trainingConfig
    ? getSeasonEventForConfig(trainingConfig)
    : undefined;

  return (
    <div className='card'>
      {/* Tab Navigation */}
      <div className='card-header bg-light'>
        <div className='form-selector-tabs nav nav-tabs card-header-tabs'>
          {/* Tournament Registration Tab - ONLY if active */}
          {tournamentActive && tournamentConfig && (
            <li className='nav-item'>
              <button
                className={`nav-link ${
                  activeForm === 'tournament' ? 'active' : ''
                }`}
                onClick={() => setActiveForm('tournament')}
                type='button'
              >
                <i className='ti ti-trophy me-2'></i>
                {getDisplayName(tournamentConfig)}
              </button>
            </li>
          )}

          {/* Tryout Registration Tab - ONLY if active */}
          {tryoutActive && tryoutConfig && (
            <li className='nav-item'>
              <button
                className={`nav-link ${
                  activeForm === 'tryout' ? 'active' : ''
                }`}
                onClick={() => setActiveForm('tryout')}
                type='button'
              >
                <i className='ti ti-target-arrow me-2'></i>
                {getDisplayName(tryoutConfig)}
              </button>
            </li>
          )}

          {trainingActive && trainingConfig && (
            <li className='nav-item'>
              <button
                className={`nav-link ${
                  activeForm === 'training' ? 'active' : ''
                }`}
                onClick={() => setActiveForm('training')}
                type='button'
              >
                <i className='ti ti-info-circle me-2'></i>
                {getDisplayName(trainingConfig)}
              </button>
            </li>
          )}

          {playerActive && playerConfig && (
            <li className='nav-item'>
              <button
                className={`nav-link ${
                  activeForm === 'player' ? 'active' : ''
                }`}
                onClick={() => setActiveForm('player')}
                type='button'
              >
                <i className='ti ti-user-plus me-2'></i>
                Add Players to Account
              </button>
            </li>
          )}
        </div>
      </div>

      {/* Form Container */}
      <div className='card-body p-4'>
        {activeForm === 'tournament' &&
          tournamentActive &&
          tournamentConfig && (
            <div className='tab-content'>
              <div className='tab-pane fade show active'>
                <TournamentRegistrationForm
                  onSuccess={onRegistrationComplete}
                  formConfig={tournamentConfig as RegistrationFormConfig}
                  tournamentConfig={
                    tournamentConfig as TournamentSpecificConfig
                  }
                  seasonEvent={tournamentSeasonEvent}
                />
              </div>
            </div>
          )}

        {activeForm === 'tryout' && tryoutActive && tryoutConfig && (
          <div className='tab-content'>
            <div className='tab-pane fade show active'>
              <TryoutRegistrationForm
                onSuccess={onRegistrationComplete}
                formConfig={tryoutConfig as RegistrationFormConfig}
                tryoutConfig={tryoutConfig as TryoutSpecificConfig}
                seasonEvent={tryoutSeasonEvent}
              />
            </div>
          </div>
        )}

        {activeForm === 'training' && trainingActive && trainingConfig && (
          <div className='tab-content'>
            <div className='tab-pane fade show active'>
              <TrainingRegistrationForm
                onSuccess={onRegistrationComplete}
                formConfig={trainingConfig}
                seasonEvent={trainingSeasonEvent}
              />
            </div>
          </div>
        )}

        {activeForm === 'player' && playerActive && playerConfig && (
          <div className='tab-content'>
            <div className='tab-pane fade show active'>
              <PlayerRegistrationForm
                onSuccess={onRegistrationComplete}
                formConfig={playerConfig}
                seasonEvent={seasonEvent}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrationHub;
