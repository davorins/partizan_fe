import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import GuardianRegistrationModule from '../../components/registration-modules/GuardianRegistrationModule';
import TermsAndConditionsModule from '../../components/registration-modules/TermsAndConditionsModule';
import SimplePlayerFormModule from '../../components/registration-modules/SimplePlayerFormModule';
import AccountCreationModule from '../../components/registration-modules/AccountCreationModule';
import EmailVerificationStep from '../../auth/emailVerification/emailVerificationStep';
import StepIndicator from '../../../components/common/StepIndicator';
import { Guardian, Address, Player } from '../../../types/registration-types';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { all_routes } from '../../router/all_routes';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
  tempAccount?: {
    email: string;
    password: string;
  };
}

const Register = () => {
  const navigate = useNavigate();
  const routes = all_routes;
  const {
    createTempAccount,
    register,
    sendVerificationEmail,
    isEmailVerified,
    checkVerificationStatus,
    refreshAuthData,
  } = useAuth();

  const currentYear = new Date().getFullYear();

  type RegistrationStep =
    | 'account'
    | 'verifyEmail'
    | 'guardian'
    | 'players'
    | 'review'
    | 'success';

  const [currentStep, setCurrentStep] = useState<RegistrationStep>('account');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCompletedUserRegistration, setHasCompletedUserRegistration] =
    useState(false);
  const [registrationCompleted, setRegistrationCompleted] = useState(false);
  const [registrationTimestamp, setRegistrationTimestamp] =
    useState<string>('');
  const [showPlayerChoice, setShowPlayerChoice] = useState(false); // ✅ Moved to top level

  // Form data states
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });

  const [guardianData, setGuardianData] = useState<Guardian>({
    fullName: '',
    relationship: '',
    phone: '',
    email: '',
    address: { street: '', street2: '', city: '', state: '', zip: '' },
    isCoach: false,
    aauNumber: '',
  });

  const [players, setPlayers] = useState<Player[]>([]);
  const [localSavedPlayers, setLocalSavedPlayers] = useState<Player[]>([]);

  // Define all steps
  const steps = useMemo(
    () => [
      { id: 'account', label: 'Account', number: 1, icon: 'ti ti-user-plus' },
      {
        id: 'verifyEmail',
        label: 'Verify Email',
        number: 2,
        icon: 'ti ti-mail-check',
      },
      {
        id: 'guardian',
        label: 'Guardian Info',
        number: 3,
        icon: 'ti ti-user-shield',
      },
      { id: 'players', label: 'Player Info', number: 4, icon: 'ti ti-users' },
      { id: 'review', label: 'Review', number: 5, icon: 'ti ti-checklist' },
    ],
    []
  );

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  // Helper function to create a new player
  const createNewPlayer = (): Player => ({
    fullName: '',
    gender: '',
    dob: '',
    schoolName: '',
    healthConcerns: '',
    aauNumber: '',
    registrationYear: currentYear,
    season: 'Partizan Team',
    grade: '',
  });

  // Handle step navigation
  const handleStepClick = (stepId: string) => {
    const stepIndex = steps.findIndex((step) => step.id === stepId);
    const currentIndex = steps.findIndex((step) => step.id === currentStep);

    // Only allow navigation to completed or current steps
    if (stepIndex <= currentIndex) {
      setCurrentStep(stepId as RegistrationStep);
    }
  };

  // Handle account creation
  const handleAccountCreated = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    setIsProcessing(true);
    setFormError(null);

    try {
      localStorage.setItem('pendingEmail', email);
      await createTempAccount(email, password);
      setFormData((prev) => ({
        ...prev,
        email,
        password,
        tempAccount: { email, password },
      }));
      setIsVerificationSent(true);
      setCurrentStep('verifyEmail');
    } catch (error: any) {
      let errorMessage = 'Failed to create account';
      if (error.message?.includes('network') || error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error: Please check your connection.';
      } else if (error.message?.includes('already exists')) {
        errorMessage = 'Email already registered. Please sign in.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      setFormError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle verification completion
  const handleVerified = () => {
    setCurrentStep('guardian');
    setShowPlayerChoice(false); // Reset player choice
  };

  // Handle back navigation
  const handleBack = () => {
    switch (currentStep) {
      case 'verifyEmail':
        setCurrentStep('account');
        break;
      case 'guardian':
        setShowPlayerChoice(false); // Hide player choice when going back
        setCurrentStep('verifyEmail');
        break;
      case 'players':
        setCurrentStep('guardian');
        break;
      case 'review':
        setCurrentStep('players');
        break;
    }
  };

  // Handle guardian complete
  const handleGuardianComplete = () => {
    // Validate guardian data
    if (!guardianData.fullName.trim()) {
      setFormError('Full name is required');
      return;
    }

    if (!guardianData.relationship.trim()) {
      setFormError('Relationship is required');
      return;
    }

    if (!guardianData.phone.trim()) {
      setFormError('Phone number is required');
      return;
    }

    const phoneDigits = guardianData.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setFormError('Please enter a valid 10-digit phone number');
      return;
    }

    setFormError(null); // Clear any previous errors

    // Show player choice screen
    setShowPlayerChoice(true);
  };

  // Handle players change
  const handlePlayersChange = (updatedPlayers: Player[]) => {
    setPlayers(updatedPlayers);
  };

  // Handle players complete
  const handlePlayersComplete = () => {
    setCurrentStep('review');
  };

  // Handle skip players
  const handleSkipPlayers = () => {
    setShowPlayerChoice(false);
    setCurrentStep('review');
  };

  // Handle add players
  const handleAddPlayers = () => {
    setShowPlayerChoice(false);
    setCurrentStep('players');
    if (players.length === 0) {
      setPlayers([createNewPlayer()]);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agreeToTerms) {
      setFormError('Please agree to the terms and conditions');
      window.scrollTo(0, 0);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const addressString = `${guardianData.address.street}${
        guardianData.address.street2 ? ', ' + guardianData.address.street2 : ''
      }, ${guardianData.address.city}, ${guardianData.address.state} ${
        guardianData.address.zip
      }`;

      console.log('🚀 Starting final registration process...');

      // Register the parent with all information
      const registeredParent = await register(
        formData.email.trim(),
        formData.password.trim(),
        guardianData.fullName.trim(),
        guardianData.phone.replace(/\D/g, ''),
        addressString,
        guardianData.relationship.trim(),
        guardianData.isCoach,
        guardianData.aauNumber || '',
        formData.agreeToTerms
      );

      console.log('✅ Parent registered successfully:', registeredParent._id);

      // Register players if any were added during registration
      if (players.length > 0) {
        console.log(`🎯 Registering ${players.length} players...`);
        await registerPlayers(players, registeredParent._id);
        console.log('✅ All players registered successfully');
      } else {
        console.log('ℹ️ No players to register');
      }

      // Clear temporary data
      localStorage.removeItem('pendingEmail');

      // Refresh auth data
      await refreshAuthData();

      // Set success state
      setRegistrationTimestamp(new Date().toLocaleString());
      setRegistrationCompleted(true);
      setCurrentStep('success');

      console.log('🎉 Registration completed successfully!');
    } catch (error: any) {
      console.error('❌ Registration Error:', error);

      let errorMessage = 'Registration failed. Please try again.';
      let errorType = 'general';

      if (error instanceof Error) {
        errorMessage = error.message;

        if (error.message.toLowerCase().includes('email')) {
          errorType = 'email';
          errorMessage =
            'The email address is already registered. Please use a different email or sign in.';
        }
      }

      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const registerPlayers = async (players: Player[], parentId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('🔐 Using token for player registration');
      console.log('👨‍👧‍👦 Registering players for parent:', parentId);

      // Register each player one by one
      for (const player of players) {
        console.log('📝 Registering player:', player.fullName);

        // Validate required fields
        if (
          !player.fullName ||
          !player.gender ||
          !player.dob ||
          !player.schoolName
        ) {
          console.error('❌ Missing required fields for player:', player);
          throw new Error(
            `Missing required fields for player: ${player.fullName}`
          );
        }

        const playerData = {
          fullName: player.fullName.trim(),
          gender: player.gender,
          dob: player.dob,
          schoolName: player.schoolName.trim(),
          healthConcerns: player.healthConcerns || '',
          aauNumber: player.aauNumber || '',
          registrationYear: currentYear,
          season: 'Partizan Team',
          parentId: parentId,
          grade: player.grade || '',
          isGradeOverridden: player.isGradeOverridden || false,
          skipSeasonRegistration: true,
        };

        console.log('📤 Sending player data:', playerData);

        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL}/players/register`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(playerData),
          }
        );

        const responseData = await response.json();
        console.log('📥 Player registration response:', responseData);

        if (!response.ok) {
          throw new Error(
            responseData.error ||
              `Failed to register player: ${player.fullName}`
          );
        }

        console.log('✅ Player registered successfully:', player.fullName);
      }

      console.log('🎉 All players registered successfully!');
    } catch (error) {
      console.error('❌ Error in registerPlayers:', error);
      throw error;
    }
  };

  // Handle complete registration
  const handleComplete = () => {
    navigate(routes.adminDashboard);
  };

  // Handle add more players
  const handleAddMorePlayers = () => {
    setCurrentStep('players');
  };

  // Render steps
  const renderStepContent = () => {
    switch (currentStep) {
      case 'account':
        return <AccountCreationModule onComplete={handleAccountCreated} />;

      case 'verifyEmail':
        return (
          <EmailVerificationStep
            email={formData.email || localStorage.getItem('pendingEmail') || ''}
            onVerified={handleVerified}
            onBack={handleBack}
            isVerificationSent={isVerificationSent}
          />
        );

      case 'guardian':
        // Player choice screen
        if (showPlayerChoice) {
          return (
            <div className='card mb-4'>
              <div className='card-header bg-light'>
                <div className='d-flex align-items-center'>
                  <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                    <i className='ti ti-users fs-16' />
                  </span>
                  <h4 className='text-dark'>Add Players Now?</h4>
                </div>
              </div>
              <div className='card-body'>
                <div className='text-center py-4'>
                  <div className='mb-4'>
                    <i className='ti ti-user-question fs-1 text-primary mb-3'></i>
                    <h3>Would you like to add players to your account?</h3>
                    <p className='text-muted'>
                      You can add players now or add them later from your
                      dashboard.
                    </p>
                  </div>

                  <div className='row'>
                    <div className='col-md-6 mb-3'>
                      <div className='card h-100 border-success border-2'>
                        <div className='card-body text-center d-flex flex-column'>
                          <div className='mb-3'>
                            <i className='ti ti-user-plus fs-1 text-success'></i>
                          </div>
                          <h4 className='text-success'>Add Players Now</h4>
                          <p className='text-muted small'>
                            Add player information now to save time for future
                            registrations
                          </p>
                          <div className='mt-auto'>
                            <button
                              type='button'
                              className='btn btn-success w-100'
                              onClick={handleAddPlayers}
                            >
                              <i className='ti ti-plus me-2'></i>
                              Add Players Now
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className='col-md-6 mb-3'>
                      <div className='card h-100 border-primary border-2'>
                        <div className='card-body text-center d-flex flex-column'>
                          <div className='mb-3'>
                            <i className='ti ti-clock fs-1 text-primary'></i>
                          </div>
                          <h4 className='text-primary'>Add Later</h4>
                          <p className='text-muted small'>
                            Skip for now and add players from your dashboard
                            later
                          </p>
                          <div className='d-flex justify-content-end'>
                            <button
                              type='button'
                              className='btn btn-outline-primary w-100'
                              onClick={handleSkipPlayers}
                            >
                              <i className='ti ti-arrow-right me-2'></i>
                              Continue to Review
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // Guardian information screen
        return (
          <div className='card mb-4'>
            <div className='card-header bg-light'>
              <div className='d-flex align-items-center'>
                <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                  <i className='ti ti-user-shield fs-16' />
                </span>
                <h4 className='text-dark'>Guardian Information</h4>
              </div>
            </div>
            <div className='card-body'>
              <GuardianRegistrationModule
                guardian={guardianData}
                onGuardianChange={setGuardianData}
                isAdditional={false}
              />
              <div className='d-flex justify-content-end mt-4'>
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={handleGuardianComplete}
                >
                  Continue
                  <i className='ti ti-arrow-right ms-2'></i>
                </button>
              </div>
            </div>
          </div>
        );

      case 'players':
        return (
          <div className='card mb-4'>
            <div className='card-header bg-light'>
              <div className='d-flex align-items-center'>
                <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                  <i className='ti ti-users fs-16' />
                </span>
                <h4 className='text-dark'>Player Registration (Optional)</h4>
              </div>
            </div>
            <div className='card-body'>
              <p className='text-muted mb-4'>
                You can register players now or add them later from your
                dashboard. Adding players now will pre-fill their information
                for future registrations.
              </p>

              <SimplePlayerFormModule
                players={players}
                onPlayersChange={handlePlayersChange}
                registrationYear={currentYear}
                season='Partizan Team'
                onValidationChange={(isValid) => {
                  // Store validation state if needed
                  console.log('Players validation:', isValid);
                }}
                maxPlayers={10}
              />

              <div className='d-flex justify-content-end mt-4'>
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={() => {
                    // Validate before proceeding
                    if (players.length === 0) {
                      // No players is okay - just go to review
                      setCurrentStep('review');
                    } else {
                      // Check if all players are valid
                      const allPlayersValid = players.every(
                        (p) =>
                          p.fullName?.trim() &&
                          p.gender &&
                          p.dob &&
                          p.schoolName?.trim() &&
                          p.grade
                      );

                      if (allPlayersValid) {
                        setCurrentStep('review');
                      } else {
                        setFormError(
                          'Please complete all required player information'
                        );
                        window.scrollTo(0, 0);
                      }
                    }
                  }}
                >
                  Continue to Review
                  <i className='ti ti-arrow-right ms-2'></i>
                </button>
              </div>
            </div>
          </div>
        );

      case 'review':
        return (
          <form onSubmit={handleSubmit}>
            <div className='card mb-4'>
              <div className='card-header bg-light'>
                <div className='d-flex align-items-center'>
                  <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                    <i className='ti ti-checklist fs-16' />
                  </span>
                  <h4 className='text-dark'>Review Information</h4>
                </div>
              </div>
              <div className='card-body'>
                <div className='row'>
                  <div className='col-md-6'>
                    <h5>Account Information</h5>
                    <p>
                      <strong>Email:</strong> {formData.email}
                    </p>
                  </div>
                  <div className='col-md-6'>
                    <h5>Guardian Information</h5>
                    <strong>Name:</strong> {guardianData.fullName}
                    <br />
                    <strong>Relationship:</strong> {guardianData.relationship}
                    <br />
                    <strong>Phone:</strong> {guardianData.phone}
                    <br />
                    <strong>Email:</strong> {guardianData.email}
                    <br />
                    <strong>Address:</strong> {guardianData.address.street}
                    {guardianData.address.street2
                      ? `, ${guardianData.address.street2}`
                      : ''}
                    , {guardianData.address.city}, {guardianData.address.state}{' '}
                    {guardianData.address.zip}
                    <br />
                    <br />
                    {guardianData.isCoach && (
                      <p>
                        <strong>AAU Number:</strong> {guardianData.aauNumber}
                      </p>
                    )}
                  </div>
                </div>

                {players.length > 0 && (
                  <div className='mt-4'>
                    <h5>Players ({players.length})</h5>
                    {players.map((player, index) => (
                      <div key={index} className='border rounded p-3 mb-2'>
                        <p className='mb-1'>
                          <strong>{player.fullName || 'Not provided'}</strong>
                        </p>
                        <p className='mb-1 text-muted'>
                          Grade: {player.grade || 'Not provided'}
                        </p>
                        <p className='mb-0 text-muted'>
                          DOB: {player.dob || 'Not provided'}
                        </p>
                        <p className='mb-0 text-muted'>
                          Gender: {player.gender || 'Not provided'}
                        </p>
                        <p className='mb-0 text-muted'>
                          School: {player.schoolName || 'Not provided'}
                        </p>
                        {player.healthConcerns && (
                          <p className='mb-0 text-muted'>
                            Health Concerns: {player.healthConcerns}
                          </p>
                        )}
                        {player.aauNumber && (
                          <p className='mb-0 text-muted'>
                            AAU Number: {player.aauNumber}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <TermsAndConditionsModule
                  agreeToTerms={formData.agreeToTerms}
                  onAgreeToTermsChange={(agree) =>
                    setFormData((prev) => ({ ...prev, agreeToTerms: agree }))
                  }
                  validationError={formError || undefined}
                  waiverModalId='waiver'
                />

                <div className='d-flex justify-content-end mt-4'>
                  <button
                    type='submit'
                    className='btn btn-success'
                    disabled={isSubmitting || !formData.agreeToTerms}
                  >
                    {isSubmitting ? (
                      <>
                        <span className='spinner-border spinner-border-sm me-2'></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className='ti ti-check me-2'></i>
                        Complete Registration
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        );

      case 'success':
        return (
          <div className='card border-0 shadow-sm'>
            <div className='card-header'>
              <h4 className='mb-0'>🎉 Registration Complete!</h4>
            </div>
            <div className='card-body'>
              <div className='text-center py-4'>
                <i className='ti ti-circle-check fs-1 text-success mb-3'></i>
                <h3>Welcome to Partizan Basketball!</h3>

                {/* ADD THIS: Welcome email confirmation message */}
                <div className='alert alert-success mb-3'>
                  <div className='d-flex align-items-center'>
                    <i className='ti ti-mail-check fs-4 me-3'></i>
                    <div>
                      <h5 className='mb-1'>Welcome Email Sent!</h5>
                      <p className='mb-0'>
                        A welcome email has been sent to{' '}
                        <strong>{formData.email}</strong>
                      </p>
                      <small className='text-muted'>
                        Please check your inbox (and spam folder) for account
                        details.
                      </small>
                    </div>
                  </div>
                </div>

                <p className='text-muted'>
                  Your account has been created successfully.
                  {players.length > 0
                    ? ` ${players.length} player${
                        players.length > 1 ? 's have' : ' has'
                      } been added to your account.`
                    : ' You can add players later from your dashboard.'}
                </p>
              </div>

              <div className='receipt-card mb-4'>
                <div className='card border'>
                  <div className='card-header bg-light'>
                    <div className='d-flex justify-content-between align-items-center'>
                      <h5 className='mb-0'>Registration Details</h5>
                      <div className='badge bg-success'>
                        <i className='ti ti-mail me-1'></i>
                        Email Sent
                      </div>
                    </div>
                  </div>
                  <div className='card-body'>
                    <div className='row mb-3'>
                      <div className='col-md-6'>
                        <p className='mb-1'>
                          <strong>Registration Date:</strong>
                        </p>
                        <p>{registrationTimestamp}</p>
                      </div>
                      <div className='col-md-6'>
                        <p className='mb-1'>
                          <strong>Account Email:</strong>
                        </p>
                        <p>
                          {formData.email}
                          <span className='ms-2 badge bg-success'>
                            <i className='ti ti-check me-1'></i>
                            Verified
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className='mb-3'>
                      <p className='mb-1'>
                        <strong>Guardian:</strong>
                      </p>
                      <p>{guardianData.fullName}</p>
                    </div>

                    {players.length > 0 && (
                      <div className='mb-3'>
                        <p className='mb-1'>
                          <strong>Players Registered:</strong>
                        </p>
                        <ul className='list-group'>
                          {players.map((player, index) => (
                            <li
                              key={index}
                              className='list-group-item d-flex justify-content-between'
                            >
                              <div>
                                <strong>{player.fullName}</strong>
                                <span className='text-muted small'>
                                  {player.grade} Grade • {player.gender} •{' '}
                                  {player.schoolName || 'School not specified'}
                                </span>
                              </div>
                              <span className='badge bg-success'>Added</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className='mb-3'>
                      <p className='mb-1'>
                        <strong>Next Steps:</strong>
                      </p>
                      <div className='alert alert-info'>
                        <ul className='mb-0'>
                          <li>
                            <i className='ti ti-mail text-primary me-2'></i>
                            <strong>Check your email</strong> - You should
                            receive a welcome email shortly
                          </li>
                          <li className='mt-2'>
                            <i className='ti ti-calendar text-primary me-2'></i>
                            <strong>Explore your dashboard</strong> - Access all
                            features from your account dashboard
                          </li>
                          {players.length === 0 && (
                            <li className='mt-2'>
                              <i className='ti ti-user-plus text-primary me-2'></i>
                              <strong>Add players</strong> - You can add players
                              to your account at any time
                            </li>
                          )}
                          <li className='mt-2'>
                            <i className='ti ti-bell-ringing text-primary me-2'></i>
                            <strong>Get notified</strong> - We'll notify you
                            about upcoming registrations
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className='d-flex justify-content-between'>
                {players.length === 0 ? (
                  <button
                    type='button'
                    className='btn btn-outline-primary'
                    onClick={handleAddMorePlayers}
                  >
                    <i className='ti ti-plus me-2'></i>
                    Add Players Now
                  </button>
                ) : (
                  <button
                    type='button'
                    className='btn btn-outline-primary'
                    onClick={handleAddMorePlayers}
                  >
                    <i className='ti ti-plus me-2'></i>
                    Add More Players
                  </button>
                )}
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={handleComplete}
                >
                  <i className='ti ti-home me-2'></i>
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Show loading state
  if (isProcessing || isLoadingUserData) {
    return (
      <div className='container-fuild'>
        <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
          <div className='row justify-content-center align-items-center vh-100'>
            <LoadingSpinner />
            <p className='mt-3 text-muted'>Loading registration...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className='container-fuild'>
        <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
          <div className='row'>
            <div className='col-lg-6'>
              <div className='d-lg-flex align-items-center justify-content-center bg-light-300 d-lg-block d-none flex-wrap vh-100 overflowy-auto bg-01'>
                <div>
                  <ImageWithBasePath
                    src='assets/img/authentication/authentication.png'
                    alt='Img'
                  />
                </div>
              </div>
            </div>
            <div className='col-lg-6 col-md-12 col-sm-12'>
              <div className='row justify-content-center align-items-center vh-100 overflow-auto flex-wrap'>
                <div className='col-md-10 mx-auto p-4'>
                  <div className='mx-auto mb-4 text-center'>
                    <ImageWithBasePath
                      src='assets/img/logo.png'
                      className='img-fluid'
                      alt='Logo'
                    />
                  </div>

                  <div className='form-header text-center mb-4'>
                    <h2 className='mt-3'>Create Your Account</h2>
                    <p>
                      {currentStep === 'success'
                        ? 'Welcome to Partizan Basketball!'
                        : 'Register to join Partizan Basketball. Players can be added now or later.'}
                    </p>
                  </div>

                  {/* Step Indicator - Only show for non-success steps */}
                  {currentStep !== 'success' && (
                    <StepIndicator
                      steps={steps}
                      currentStep={currentStep}
                      className='mb-4'
                    />
                  )}

                  {/* Main Form Content */}
                  <div className='form-content'>
                    {formError && (
                      <div className='alert alert-danger mb-4'>
                        <i className='ti ti-alert-circle me-2'></i>
                        {formError}
                        {formError.includes('already registered') && (
                          <div className='mt-2'>
                            <Link
                              to={routes.login}
                              className='btn btn-sm btn-outline-primary'
                            >
                              Sign In Instead
                            </Link>
                          </div>
                        )}
                      </div>
                    )}

                    <div className='step-content'>{renderStepContent()}</div>
                  </div>

                  {currentStep !== 'success' &&
                    currentStep !== 'verifyEmail' &&
                    currentStep !== 'account' && (
                      <div className='text-center mt-4'>
                        <h6 className='fw-normal text-dark mb-0'>
                          Already have an account?
                          <Link to={routes.login} className='hover-a'>
                            {' '}
                            Sign In
                          </Link>
                        </h6>
                      </div>
                    )}

                  <div className='mt-5 text-center'>
                    <p className='mb-0'>
                      © {currentYear} Partizan by{' '}
                      <a href='https://rainbootsmarketing.com/'>Rainboots</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;
