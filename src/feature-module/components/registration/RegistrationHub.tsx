import React, { useState, useEffect } from 'react';
import PlayerRegistrationForm from './PlayerRegistrationForm';
import TournamentRegistrationForm from './TournamentRegistrationForm';
import TrainingRegistrationForm from './TrainingRegistrationForm';
import TryoutRegistrationForm from './TryoutRegistrationForm'; // Add this import
import {
  RegistrationFormConfig,
  SeasonEvent,
  TournamentSpecificConfig,
  TryoutSpecificConfig,
} from '../../../types/registration-types';

interface RegistrationHubProps {
  playerConfig?: RegistrationFormConfig | null;
  trainingConfig?: RegistrationFormConfig | null;
  tournamentConfig?: RegistrationFormConfig | null;
  tryoutConfig?: RegistrationFormConfig | TryoutSpecificConfig | null;
  seasonEvent?: SeasonEvent;
  onRegistrationComplete?: () => void;
}

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

  // Check if forms are active - only show if isActive is true
  const playerActive = playerConfig?.isActive || false;
  const tournamentActive = tournamentConfig?.isActive || false;
  const trainingActive = trainingConfig?.isActive || false;
  const tryoutActive = tryoutConfig?.isActive || false;

  console.log('RegistrationHub - Active forms:', {
    playerActive,
    tournamentActive,
    trainingActive,
    tryoutActive,
    playerConfig,
    tournamentConfig,
    trainingConfig,
    tryoutConfig,
  });

  // Set initial active tab based on what's available
  useEffect(() => {
    // Priority: tournament > tryout > training > player
    if (tournamentActive) {
      setActiveForm('tournament');
    } else if (tryoutActive) {
      setActiveForm('tryout');
    } else if (trainingActive) {
      setActiveForm('training');
    } else if (playerActive) {
      setActiveForm('player');
    }
  }, [playerActive, tournamentActive, trainingActive, tryoutActive]);

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
                {tournamentConfig.tournamentName || 'Tournament Registration'}
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
                {/* Access tryoutName property safely */}
                {(tryoutConfig as any).tryoutName || 'Tryout Registration'}
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
                {trainingConfig.season || 'Training Registration'}
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
                  formConfig={tournamentConfig}
                  tournamentConfig={tournamentConfig}
                  seasonEvent={
                    seasonEvent || {
                      season: tournamentConfig.tournamentName || 'Tournament',
                      year: tournamentConfig.tournamentYear || 2025,
                      eventId: tournamentConfig._id || 'tournament-2025',
                    }
                  }
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
                seasonEvent={
                  seasonEvent || {
                    season: (tryoutConfig as any).tryoutName || 'Tryout',
                    year: (tryoutConfig as any).tryoutYear || 2025,
                    eventId: (tryoutConfig as any)._id || 'tryout-2025',
                  }
                }
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
                seasonEvent={
                  seasonEvent || {
                    season: trainingConfig.season || 'Training',
                    year: trainingConfig.year || 2025,
                    eventId: trainingConfig._id || 'training-2025',
                  }
                }
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
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrationHub;
