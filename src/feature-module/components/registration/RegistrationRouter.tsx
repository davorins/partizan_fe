import React, { useEffect } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import RegistrationWizard from './RegistrationWizard';
import { useTryoutEvent } from '../../../context/TryoutEventContext';
import { useTournamentEvent } from '../../../context/TournamentEventContext';
import {
  RegistrationWizardProps,
  RegistrationFormConfig,
} from '../../../types/registration-types';
import { useFormConfig } from '../../hooks/useFormConfig';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

// Helper function to get default config
const getDefaultFormConfig = (
  registrationType?: string
): RegistrationFormConfig => {
  const basePrice = registrationType === 'tryout' ? 50 : 100;
  return {
    isActive: true,
    requiresPayment: true,
    requiresQualification: false,
    pricing: {
      basePrice,
      packages: [],
    },
  };
};

const TryoutRegistrationPage: React.FC = () => {
  const { tryoutEvent } = useTryoutEvent();

  const eventData: RegistrationWizardProps['eventData'] = tryoutEvent
    ? {
        season: tryoutEvent.season,
        year: tryoutEvent.year,
        eventId: tryoutEvent.tryoutId,
        tryoutId: tryoutEvent.tryoutId,
      }
    : {
        season: 'Basketball',
        year: new Date().getFullYear(),
        eventId: 'default-tryout',
      };

  const { formConfig, isLoading, error } = useFormConfig(
    eventData.season!,
    eventData.year,
    'tryout'
  );

  // Debug logging
  useEffect(() => {
    console.log('🔄 TryoutRegistrationPage - formConfig state:', {
      formConfig,
      isLoading,
      error,
      season: eventData.season,
      year: eventData.year,
    });
  }, [formConfig, isLoading, error, eventData.season, eventData.year]);

  if (isLoading) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <LoadingSpinner />
          <p className='mt-3'>Loading registration form...</p>
        </div>
      </div>
    );
  }

  // Use admin config if available, otherwise use defaults
  const effectiveConfig: RegistrationFormConfig = formConfig
    ? {
        ...formConfig,
        // Ensure packages array exists
        pricing: {
          basePrice: formConfig.pricing?.basePrice || 50,
          packages: formConfig.pricing?.packages || [],
        },
      }
    : getDefaultFormConfig('tryout');

  console.log('🎯 Effective config for tryout:', {
    effectiveConfig,
    isActive: effectiveConfig.isActive,
    packageCount: effectiveConfig.pricing.packages.length,
  });

  // Check if form is active
  if (!effectiveConfig.isActive) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <i className='ti ti-calendar-off fs-1 text-muted mb-3'></i>
          <h4>Registration Closed</h4>
          <p className='text-muted'>
            Registration for this season is currently not available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RegistrationWizard
      registrationType='tryout'
      eventData={eventData}
      formConfig={effectiveConfig}
      onSuccess={() => console.log('Tryout registration successful')}
    />
  );
};

const TournamentRegistrationPage: React.FC = () => {
  const { tournamentEvent } = useTournamentEvent();
  const eventData: RegistrationWizardProps['eventData'] = tournamentEvent
    ? {
        // For tournaments, use the tournament name as the "season" for form config lookup
        season: tournamentEvent.tournament,
        year: tournamentEvent.year,
        tournamentId: tournamentEvent.tournamentId,
        eventId: tournamentEvent.tournamentId,
        tournament: tournamentEvent.tournament,
      }
    : {
        season: 'Basketball Tournament',
        year: new Date().getFullYear(),
        eventId: 'default-tournament',
        tournament: 'Default Tournament',
      };

  const { formConfig, isLoading, error } = useFormConfig(
    eventData.season!,
    eventData.year,
    'tournament'
  );

  useEffect(() => {
    console.log('🔄 TournamentRegistrationPage - formConfig state:', {
      formConfig,
      isLoading,
      error,
      season: eventData.season,
      year: eventData.year,
    });
  }, [formConfig, isLoading, error, eventData.season, eventData.year]);

  if (isLoading) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <LoadingSpinner />
          <p className='mt-3'>Loading registration form...</p>
        </div>
      </div>
    );
  }

  // Use admin config if available, otherwise use defaults
  const effectiveConfig: RegistrationFormConfig = formConfig
    ? {
        ...formConfig,
        pricing: {
          basePrice: formConfig.pricing?.basePrice || 100,
          packages: formConfig.pricing?.packages || [],
        },
      }
    : getDefaultFormConfig('tournament');

  // Check if form is active
  if (!effectiveConfig.isActive) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <i className='ti ti-calendar-off fs-1 text-muted mb-3'></i>
          <h4>Registration Closed</h4>
          <p className='text-muted'>
            Registration for this tournament is currently not available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RegistrationWizard
      registrationType='tournament'
      eventData={eventData}
      formConfig={effectiveConfig}
      onSuccess={() => console.log('Tournament registration successful')}
    />
  );
};

const TeamRegistrationPage: React.FC = () => {
  const { tryoutEvent } = useTryoutEvent();

  const eventData: RegistrationWizardProps['eventData'] = tryoutEvent
    ? {
        season: tryoutEvent.season,
        year: tryoutEvent.year,
        eventId: tryoutEvent.tryoutId,
        tryoutId: tryoutEvent.tryoutId,
      }
    : {
        season: 'Basketball Team',
        year: new Date().getFullYear(),
        eventId: 'default-team',
      };

  const { formConfig, isLoading, error } = useFormConfig(
    eventData.season!,
    eventData.year,
    'team'
  );

  useEffect(() => {
    console.log('🔄 TeamRegistrationPage - formConfig state:', {
      formConfig,
      isLoading,
      error,
      season: eventData.season,
      year: eventData.year,
    });
  }, [formConfig, isLoading, error, eventData.season, eventData.year]);

  if (isLoading) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <LoadingSpinner />
          <p className='mt-3'>Loading registration form...</p>
        </div>
      </div>
    );
  }

  // Use admin config if available, otherwise use defaults
  const effectiveConfig: RegistrationFormConfig = formConfig
    ? {
        ...formConfig,
        pricing: {
          basePrice: formConfig.pricing?.basePrice || 150,
          packages: formConfig.pricing?.packages || [],
        },
      }
    : getDefaultFormConfig('team');

  // Check if form is active
  if (!effectiveConfig.isActive) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <i className='ti ti-calendar-off fs-1 text-muted mb-3'></i>
          <h4>Registration Closed</h4>
          <p className='text-muted'>
            Team registration is currently not available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RegistrationWizard
      registrationType='team'
      eventData={eventData}
      formConfig={effectiveConfig}
      onSuccess={() => console.log('Team registration successful')}
    />
  );
};

const TrainingRegistrationPage: React.FC = () => {
  const { tryoutEvent } = useTryoutEvent();

  const eventData: RegistrationWizardProps['eventData'] = tryoutEvent
    ? {
        season: tryoutEvent.season,
        year: tryoutEvent.year,
        eventId: tryoutEvent.tryoutId,
        tryoutId: tryoutEvent.tryoutId,
      }
    : {
        season: 'Basketball Training',
        year: new Date().getFullYear(),
        eventId: 'default-training',
      };

  const { formConfig, isLoading, error } = useFormConfig(
    eventData.season!,
    eventData.year,
    'training'
  );

  useEffect(() => {
    console.log('🔄 TrainingRegistrationPage - formConfig state:', {
      formConfig,
      isLoading,
      error,
      season: eventData.season,
      year: eventData.year,
    });
  }, [formConfig, isLoading, error, eventData.season, eventData.year]);

  if (isLoading) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <LoadingSpinner />
          <p className='mt-3'>Loading registration form...</p>
        </div>
      </div>
    );
  }

  // Use admin config if available, otherwise use defaults
  const effectiveConfig: RegistrationFormConfig = formConfig
    ? {
        ...formConfig,
        pricing: {
          basePrice: formConfig.pricing?.basePrice || 75,
          packages: formConfig.pricing?.packages || [],
        },
      }
    : getDefaultFormConfig('training');

  // Check if form is active
  if (!effectiveConfig.isActive) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <i className='ti ti-calendar-off fs-1 text-muted mb-3'></i>
          <h4>Registration Closed</h4>
          <p className='text-muted'>
            Training registration is currently not available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RegistrationWizard
      registrationType='training'
      eventData={eventData}
      formConfig={effectiveConfig}
      onSuccess={() => console.log('Training registration successful')}
    />
  );
};

const GenericRegistrationPage: React.FC = () => {
  const { registrationType } = useParams();

  // Map unsupported types to supported ones
  const mapRegistrationType = (
    type: string
  ): 'player' | 'tournament' | 'training' => {
    switch (type) {
      case 'tryout':
      case 'team':
        return 'tournament'; // Map tryout and team to tournament form
      case 'player':
      case 'tournament':
      case 'training':
        return type;
      default:
        return 'player';
    }
  };

  const effectiveType = mapRegistrationType(registrationType || 'player');

  const eventData = {
    season: `Basketball ${
      effectiveType.charAt(0).toUpperCase() + effectiveType.slice(1)
    }`,
    year: new Date().getFullYear(),
    eventId: `default-${effectiveType}`,
  };

  const { formConfig, isLoading, error } = useFormConfig(
    eventData.season,
    eventData.year,
    effectiveType
  );

  useEffect(() => {
    console.log('🔄 GenericRegistrationPage - formConfig state:', {
      formConfig,
      isLoading,
      error,
      season: eventData.season,
      year: eventData.year,
      originalType: registrationType,
      mappedType: effectiveType,
    });
  }, [
    formConfig,
    isLoading,
    error,
    eventData.season,
    eventData.year,
    registrationType,
    effectiveType,
  ]);

  if (isLoading) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <LoadingSpinner />
          <p className='mt-3'>Loading registration form...</p>
        </div>
      </div>
    );
  }

  // Use admin config if available, otherwise use defaults
  const effectiveConfig: RegistrationFormConfig = formConfig
    ? {
        ...formConfig,
        pricing: {
          basePrice:
            formConfig.pricing?.basePrice ||
            getDefaultFormConfig(effectiveType).pricing.basePrice,
          packages: formConfig.pricing?.packages || [],
        },
      }
    : getDefaultFormConfig(effectiveType);

  // Check if form is active
  if (!effectiveConfig.isActive) {
    return (
      <div className='card'>
        <div className='card-body text-center p-5'>
          <i className='ti ti-calendar-off fs-1 text-muted mb-3'></i>
          <h4>Registration Closed</h4>
          <p className='text-muted'>
            {effectiveType.charAt(0).toUpperCase() + effectiveType.slice(1)}{' '}
            registration is currently not available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <RegistrationWizard
      registrationType={effectiveType}
      eventData={eventData}
      formConfig={effectiveConfig}
      onSuccess={() => console.log(`${effectiveType} registration successful`)}
    />
  );
};

const RegistrationRouter: React.FC = () => {
  return (
    <Routes>
      <Route path='/tryout' element={<TryoutRegistrationPage />} />
      <Route path='/tournament' element={<TournamentRegistrationPage />} />
      <Route path='/team' element={<TeamRegistrationPage />} />
      <Route path='/training' element={<TrainingRegistrationPage />} />
      <Route path='/:registrationType' element={<GenericRegistrationPage />} />
    </Routes>
  );
};

export default RegistrationRouter;
