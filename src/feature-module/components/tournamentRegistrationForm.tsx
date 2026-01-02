import React, {
  useState,
  ChangeEvent,
  FormEvent,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  PaymentForm as SquarePaymentForm,
  PaymentFormProps as SquarePaymentFormProps,
} from 'react-square-web-payments-sdk';
import type { TokenResult } from '@square/web-payments-sdk-types';
import {
  validateEmail,
  validateRequired,
  validateName,
  validatePhoneNumber,
} from '../../utils/validation';
import { useAuth } from '../../context/AuthContext';
import HomeModals from '../pages/homeModals';
import { useTournamentEvent } from '../../context/TournamentEventContext';
import ImageWithBasePath from '../../core/common/imageWithBasePath';

// Square QA
// const appId = 'sandbox-sq0idb-I4PAJ1f1XKYqYSwLovq0xQ';
// const locationId = 'LCW4GM814GWXK';

// Square Production
const appId = 'sq0idp-jUCxKnO_i8i7vccQjVj_0g';
const locationId = 'L26Q50FWRCQW5';

interface TournamentRegistration {
  tournament: string;
  year: number;
  registrationDate?: Date;
  paymentComplete?: boolean;
  paymentStatus?: string;
  amountPaid?: number;
  paymentId?: string;
  paymentMethod?: string;
  cardLast4?: string;
  cardBrand?: string;
  levelOfCompetition?: 'Gold' | 'Silver';
}

interface Team {
  _id?: string;
  name: string;
  grade: string;
  sex: 'Male' | 'Female';
  levelOfCompetition: 'Gold' | 'Silver';
  registrationYear: number;
  tournament: string;
  coachIds?: string[];
  paymentComplete?: boolean;
  paymentStatus?: string;
  tournaments?: TournamentRegistration[];
  isActive?: boolean;
}

interface PaymentFormMethods {
  tokenize: () => Promise<{
    token: string;
    details?: {
      card: {
        last_4: string;
        card_brand: string;
        exp_month: string;
        exp_year: string;
      };
    };
  }>;
}

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  aauNumber: string;
  isCoach: boolean;
  relationship: string;
  teams: Team[];
  agreeToTerms: boolean;
  payment: {
    amount: number;
    amountInCents: number;
    breakdown: {
      basePrice: number;
      subtotal: number;
      total: number;
    };
  };
  address: {
    street: string;
    street2: string;
    city: string;
    state: string;
    zip: string;
  };
}

interface TournamentRegistrationFormProps {
  isExistingUser?: boolean;
  onSuccess?: () => void;
  existingTeams?: Team[];
  skipToPayment?: boolean;
  returningFromRegistration?: boolean;
}

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

const formatPhoneNumber = (value: string): string => {
  const cleaned = ('' + value).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
  return match
    ? !match[2]
      ? match[1]
      : `(${match[1]}) ${match[2]}${match[3] ? '-' + match[3] : ''}`
    : value;
};

const validateTeam = (team: Team): boolean => {
  return (
    !!team.name?.trim() &&
    !!team.grade?.trim() &&
    ['Male', 'Female'].includes(team.sex) &&
    ['Gold', 'Silver'].includes(team.levelOfCompetition)
  );
};

const PaymentForm = forwardRef<PaymentFormMethods, SquarePaymentFormProps>(
  (props, ref) => {
    const paymentFormRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      tokenize: async () => {
        if (!paymentFormRef.current) {
          throw new Error('Payment form not initialized');
        }
        const result = await paymentFormRef.current.tokenize();
        if (result.status === 'OK') {
          return {
            token: result.token,
            details: {
              card: {
                last_4: result.details?.card?.last4 || '',
                card_brand: result.details?.card?.brand || '',
                exp_month: result.details?.card?.expMonth || '',
                exp_year: result.details?.card?.expYear || '',
              },
            },
          };
        }
        throw new Error(result.errors?.[0]?.message || 'Tokenization failed');
      },
    }));

    return (
      <SquarePaymentForm {...props} ref={paymentFormRef}>
        {props.children}
      </SquarePaymentForm>
    );
  }
);

PaymentForm.displayName = 'PaymentForm';

const TournamentRegistrationForm: React.FC<TournamentRegistrationFormProps> = ({
  isExistingUser = false,
  onSuccess,
  existingTeams = [],
  skipToPayment = false,
}) => {
  const { parent: currentUser, isAuthenticated } = useAuth();
  const { tournamentEvent } = useTournamentEvent();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(
    skipToPayment && isExistingUser ? 2 : 1
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isProcessingRegistration, setIsProcessingRegistration] =
    useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [existingTeamsState, setExistingTeamsState] =
    useState<Team[]>(existingTeams);
  const [isLoading, setIsLoading] = useState(isExistingUser);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [teamExistsWarning, setTeamExistsWarning] = useState<string | null>(
    null
  );
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [tournamentError, setTournamentError] = useState<string | null>(null);
  const [showWelcomeBackPrompt, setShowWelcomeBackPrompt] = useState(false);
  const [hasCheckedPaidRegistrations, setHasCheckedPaidRegistrations] =
    useState(false);
  const [teamsToRegister, setTeamsToRegister] = useState<Team[]>([]);

  const isAdmin = isExistingUser && currentUser?.role === 'admin';

  const handleHomeClick = () => {
    navigate('/');
  };

  const memoizedTournamentEvent = useMemo(
    () => ({
      tournament: tournamentEvent?.tournament || '',
      year: tournamentEvent?.year || new Date().getFullYear(),
      tournamentId: tournamentEvent?.tournamentId || '',
    }),
    [
      tournamentEvent?.tournament,
      tournamentEvent?.year,
      tournamentEvent?.tournamentId,
    ]
  );

  useEffect(() => {
    if (!memoizedTournamentEvent.tournament || !memoizedTournamentEvent.year) {
      setTournamentError(
        'Tournament information is missing. Please try again later.'
      );
    } else {
      setTournamentError(null);
    }
  }, [memoizedTournamentEvent]);

  const initialFormData: FormData = {
    email: isExistingUser ? currentUser?.email || '' : '',
    password: '',
    confirmPassword: '',
    firstName: isExistingUser ? currentUser?.fullName?.split(' ')[0] || '' : '',
    lastName: isExistingUser
      ? currentUser?.fullName?.split(' ').slice(1).join(' ') || ''
      : '',
    phone: isExistingUser ? currentUser?.phone || '' : '',
    aauNumber: isExistingUser ? currentUser?.aauNumber || '' : '',
    isCoach: false,
    relationship: 'Parent',
    teams: [],
    agreeToTerms: false,
    payment: {
      amount: 425,
      amountInCents: 42500,
      breakdown: {
        basePrice: 425,
        subtotal: 425,
        total: 425,
      },
    },
    address: {
      street: '',
      street2: '',
      city: '',
      state: '',
      zip: '',
    },
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [customerEmail, setCustomerEmail] = useState(
    currentUser?.email || formData.email || ''
  );

  // Fix: Auto-add initial team for new users
  useEffect(() => {
    // Only run for new users (not existing users) and when formData is initialized
    if (
      !isExistingUser &&
      formData.teams.length === 0 &&
      memoizedTournamentEvent.tournament
    ) {
      console.log('Adding initial team for new user');
      setFormData((prev) => ({
        ...prev,
        teams: [
          {
            name: '',
            grade: '',
            sex: 'Male',
            levelOfCompetition: 'Gold',
            registrationYear: memoizedTournamentEvent.year,
            tournament: memoizedTournamentEvent.tournament,
            coachIds: [],
          },
        ],
      }));
    }
  }, [
    isExistingUser,
    memoizedTournamentEvent.tournament,
    memoizedTournamentEvent.year,
    formData.teams.length,
  ]);

  type PasswordField = 'password' | 'confirmPassword';

  const [passwordVisibility, setPasswordVisibility] = useState({
    password: false,
    confirmPassword: false,
  });

  const togglePasswordVisibility = (field: PasswordField) => {
    setPasswordVisibility((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };

  // Registration check function with payment status
  const checkExistingRegistration = useCallback(
    async (teamId: string) => {
      if (!isExistingUser || !currentUser?._id)
        return { isRegistered: false, isPaid: false };

      try {
        const response = await fetch(
          `${API_BASE_URL}/registrations/check/${
            currentUser._id
          }/${teamId}/${encodeURIComponent(
            memoizedTournamentEvent.tournament
          )}/${memoizedTournamentEvent.year}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (!response.ok) {
          console.error(
            'Registration check failed:',
            response.status,
            await response.text()
          );
          return { isRegistered: false, isPaid: false };
        }

        const data = await response.json();
        console.log('Registration check result for team', teamId, ':', data);

        return {
          isRegistered: data.isRegistered === true,
          isPaid: data.isPaid === true,
        };
      } catch (error) {
        console.error('Error checking registration:', error);
        return { isRegistered: false, isPaid: false };
      }
    },
    [
      isExistingUser,
      currentUser?._id,
      memoizedTournamentEvent.tournament,
      memoizedTournamentEvent.year,
    ]
  );

  useEffect(() => {
    if (!isExistingUser || !currentUser?._id) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const checkForUnpaidRegistrations = async () => {
      try {
        setIsLoading(true);
        const endpoint = isAdmin
          ? `${API_BASE_URL}/teams/all`
          : `${API_BASE_URL}/teams/by-coach/${currentUser._id}`;
        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const teams: Team[] = await response.json();
        if (!isMounted) return;

        setExistingTeamsState(teams);
        console.log('Fetched teams:', teams);

        // Check for unpaid registrations
        let foundUnpaidRegistration = false;
        const paidTeams: Team[] = [];
        const unpaidTeams: Team[] = [];

        for (const team of teams) {
          try {
            const { isRegistered, isPaid } = await checkExistingRegistration(
              team._id!
            );

            if (isRegistered && isPaid) {
              paidTeams.push({
                ...team,
                paymentComplete: true,
                paymentStatus: 'paid',
              });
            } else if (isRegistered && !isPaid) {
              unpaidTeams.push({
                ...team,
                paymentComplete: false,
                paymentStatus: 'pending',
              });
              foundUnpaidRegistration = true;
            }
          } catch (error) {
            console.warn(
              `Error checking registration for team ${team._id}:`,
              error
            );
          }
        }

        // If there are any unpaid registrations, go to payment step
        if (foundUnpaidRegistration) {
          setSelectedTeamIds(unpaidTeams.map((team) => team._id!));
          setFormData((prev) => ({
            ...prev,
            teams: unpaidTeams,
          }));
          setCurrentStep(2);
          setShowWelcomeBackPrompt(true);
        }
        // If all teams are paid AND we have skipToPayment flag, show confirmation
        else if (skipToPayment && paidTeams.length > 0) {
          setSelectedTeamIds(paidTeams.map((team) => team._id!));
          setFormData((prev) => ({
            ...prev,
            teams: paidTeams,
          }));
          setCurrentStep(3);
          setIsSubmitted(true);
        }
        // Otherwise, stay on registration step
        else {
          setCurrentStep(1);
        }

        setHasCheckedPaidRegistrations(true);
      } catch (error) {
        console.error('Failed to fetch teams:', error);
        if (isMounted) {
          setIsLoading(false);
          setCurrentStep(1);
          setHasCheckedPaidRegistrations(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (memoizedTournamentEvent.tournament && memoizedTournamentEvent.year) {
      checkForUnpaidRegistrations();
    } else {
      setIsLoading(false);
      setTournamentError(
        'Tournament information is missing. Please try again later.'
      );
      setCurrentStep(1);
      setHasCheckedPaidRegistrations(true);
    }

    return () => {
      isMounted = false;
    };
  }, [
    isExistingUser,
    isAdmin,
    currentUser?._id,
    memoizedTournamentEvent,
    skipToPayment,
    checkExistingRegistration,
  ]);

  // Safety check: if we're on step 2 but the registration is already paid, redirect to confirmation
  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (
        selectedTeamIds.length > 0 &&
        currentStep === 2 &&
        hasCheckedPaidRegistrations
      ) {
        try {
          let allPaid = true;
          for (const teamId of selectedTeamIds) {
            const { isRegistered, isPaid } = await checkExistingRegistration(
              teamId
            );
            if (!isRegistered || !isPaid) {
              allPaid = false;
              break;
            }
          }

          if (allPaid) {
            console.log(
              'All registrations already paid, redirecting to confirmation'
            );
            setCurrentStep(3);
            setIsSubmitted(true);

            // Update form data to reflect paid status
            setFormData((prev) => ({
              ...prev,
              teams: prev.teams.map((team) => ({
                ...team,
                paymentComplete: true,
                paymentStatus: 'paid',
              })),
            }));
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      }
    };

    checkPaymentStatus();
  }, [
    selectedTeamIds,
    currentStep,
    hasCheckedPaidRegistrations,
    checkExistingRegistration,
  ]);

  useEffect(() => {
    if (isExistingUser && !isLoading && currentStep === 1 && !tournamentError) {
      // Ensure the form is visible after loading completes
    }
  }, [isExistingUser, isLoading, currentStep, tournamentError]);

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Handle team field changes for multiple teams
  const handleTeamChange = (
    index: number,
    field: keyof Team,
    value: string
  ) => {
    setFormData((prev) => {
      const updatedTeams = [...prev.teams];
      updatedTeams[index] = {
        ...updatedTeams[index],
        [field]: value,
      };
      return {
        ...prev,
        teams: updatedTeams,
      };
    });
  };

  // Add a new team to the form
  const addNewTeam = () => {
    setFormData((prev) => ({
      ...prev,
      teams: [
        ...prev.teams,
        {
          name: '',
          grade: '',
          sex: 'Male',
          levelOfCompetition: 'Gold',
          registrationYear: memoizedTournamentEvent.year,
          tournament: memoizedTournamentEvent.tournament,
          coachIds: isExistingUser ? [currentUser?._id || ''] : [],
        },
      ],
    }));
  };

  // Remove a team from the form
  const removeTeam = (index: number) => {
    if (formData.teams.length > 1) {
      setFormData((prev) => ({
        ...prev,
        teams: prev.teams.filter((_, i) => i !== index),
      }));
    }
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const target = e.target as HTMLInputElement;

    if (name === 'email') {
      setFormData({
        ...formData,
        email: value.toLowerCase().trim(),
      });
      setCustomerEmail(value.toLowerCase().trim());
    } else if (name === 'isCoach') {
      setFormData({
        ...formData,
        isCoach: target.checked,
        relationship: target.checked ? 'Coach' : 'Parent',
        aauNumber: target.checked ? formData.aauNumber : '',
      });
    } else if (name.startsWith('address.')) {
      const field = name.split('.')[1] as keyof FormData['address'];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [field]: value,
        },
      });
    } else if (name === 'phone') {
      setFormData({
        ...formData,
        phone: formatPhoneNumber(value),
      });
    } else if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: target.checked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  // Handle multiple team selections
  const handleTeamSelection = async (teamId: string, isSelected: boolean) => {
    console.log('Team selection:', { teamId, isSelected, type: typeof teamId });

    // Validate teamId first
    if (!teamId || teamId === 'undefined' || typeof teamId !== 'string') {
      console.error('Invalid team ID in handleTeamSelection:', teamId);
      setPaymentError('Invalid team selection. Please try again.');
      return;
    }

    // Validate MongoDB ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(teamId)) {
      console.error('Invalid team ID format:', teamId);
      setPaymentError('Invalid team ID format. Please contact support.');
      return;
    }

    const { isRegistered, isPaid } = await checkExistingRegistration(teamId);

    if (isRegistered && isPaid) {
      setIsAlreadyRegistered(true);
      setPaymentError(
        'You have already registered and paid for this team in the tournament.'
      );
      return;
    }

    if (isSelected) {
      // Add team to selected teams
      setSelectedTeamIds((prev) => {
        if (prev.includes(teamId)) {
          console.log('Team already selected:', teamId);
          return prev;
        }
        const newIds = [...prev, teamId];
        console.log('Adding team ID:', teamId, 'New selected IDs:', newIds);
        return newIds;
      });

      const selectedTeam = existingTeamsState.find((t) => t._id === teamId);
      if (selectedTeam && selectedTeam._id) {
        console.log('Found selected team:', selectedTeam.name);

        // Update teamsToRegister
        setTeamsToRegister((prev) => [
          ...prev,
          {
            ...selectedTeam,
            registrationYear: memoizedTournamentEvent.year,
            tournament: memoizedTournamentEvent.tournament,
          },
        ]);

        // Update formData.teams - replace or add
        setFormData((prev) => {
          // Check if team already exists in formData
          const existingTeamIndex = prev.teams.findIndex(
            (t) => t._id === teamId
          );

          if (existingTeamIndex >= 0) {
            // Update existing team
            const newTeams = [...prev.teams];
            newTeams[existingTeamIndex] = {
              ...selectedTeam,
              registrationYear: memoizedTournamentEvent.year,
              tournament: memoizedTournamentEvent.tournament,
            };

            console.log('Updated existing team in formData');
            return {
              ...prev,
              teams: newTeams,
            };
          } else {
            // Add new team
            console.log('Adding new team to formData');
            return {
              ...prev,
              teams: [
                ...prev.teams,
                {
                  ...selectedTeam,
                  registrationYear: memoizedTournamentEvent.year,
                  tournament: memoizedTournamentEvent.tournament,
                },
              ],
            };
          }
        });
      } else {
        console.error('Selected team not found or has no ID:', {
          teamId,
          selectedTeam,
        });
        setPaymentError('Selected team not found. Please try again.');
      }
    } else {
      // Remove team from selected teams
      setSelectedTeamIds((prev) => {
        const newIds = prev.filter((id) => id !== teamId);
        console.log('Removing team ID:', teamId, 'New selected IDs:', newIds);
        return newIds;
      });
      setTeamsToRegister((prev) => prev.filter((team) => team._id !== teamId));

      // Remove from formData.teams
      setFormData((prev) => ({
        ...prev,
        teams: prev.teams.filter((team) => team._id !== teamId),
      }));
    }

    setTeamExistsWarning(null);
    setIsAlreadyRegistered(false);
    setShowWelcomeBackPrompt(false);
  };

  const handleRegistrationSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessingRegistration(true);
    setPaymentError(null);
    setValidationErrors({});

    if (!memoizedTournamentEvent.tournament || !memoizedTournamentEvent.year) {
      setPaymentError(
        'Tournament information is missing. Please try again later.'
      );
      setIsProcessingRegistration(false);
      return;
    }

    const fetchWithTimeout = async (
      url: string,
      options: RequestInit,
      timeout = 10000
    ) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(id);
        return response;
      } catch (error) {
        clearTimeout(id);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timed out. Please try again later.');
        }
        throw error;
      }
    };

    try {
      const errors: Record<string, string> = {};

      // Only validate account information for NEW users
      if (!isExistingUser) {
        try {
          const emailCheckResponse = await fetchWithTimeout(
            `${API_BASE_URL}/check-email`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: formData.email }),
            },
            5000
          );

          if (emailCheckResponse.ok) {
            const result = await emailCheckResponse.json();
            if (!result.available) {
              errors.email = result.message || 'Email already registered';
            }
          } else {
            const errorData = await emailCheckResponse.json();
            errors.email =
              errorData.message || 'Failed to check email availability';
          }
        } catch (error) {
          console.warn('Email check failed:', error);
          errors.email =
            'Unable to verify email availability. Please try again.';
        }

        if (!validateEmail(formData.email)) {
          errors.email = 'Please enter a valid email address';
        }

        if (
          !validateRequired(formData.password) ||
          formData.password.length < 6
        ) {
          errors.password = 'Password must be at least 6 characters long';
        }

        if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = 'Passwords do not match';
        }

        if (!validateName(formData.firstName)) {
          errors.firstName = 'Please enter a valid first name';
        }

        if (!validateName(formData.lastName)) {
          errors.lastName = 'Please enter a valid last name';
        }

        if (!validatePhoneNumber(formData.phone)) {
          errors.phone = 'Please enter a valid 10-digit phone number';
        }

        if (formData.isCoach && !validateRequired(formData.aauNumber)) {
          errors.aauNumber = 'AAU Number is required for coaches';
        }

        // Only validate address for NEW users
        if (
          !validateRequired(formData.address.street) ||
          formData.address.street.length < 5
        ) {
          errors.addressStreet = 'Street address must be at least 5 characters';
        }
        if (!validateRequired(formData.address.city)) {
          errors.addressCity = 'City is required';
        }
        if (
          !validateRequired(formData.address.state) ||
          !/^[A-Z]{2}$/.test(formData.address.state)
        ) {
          errors.addressState =
            'Please enter a valid 2-letter state code (e.g., WA)';
        }
        if (
          !validateRequired(formData.address.zip) ||
          !/^\d{5}(-\d{4})?$/.test(formData.address.zip)
        ) {
          errors.addressZip = 'Please enter a valid ZIP code';
        }
      }

      // Validate each team
      formData.teams.forEach((team, index) => {
        if (!validateTeam(team)) {
          errors[`teamName-${index}`] = `Team ${
            index + 1
          } has incomplete information`;
        }
      });

      // Always validate terms agreement (for both new and existing users)
      if (!formData.agreeToTerms) {
        errors.agreeToTerms = 'You must agree to the terms and conditions';
      }

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);

        // Filter errors to only show relevant ones in paymentError
        const relevantErrors = isExistingUser
          ? Object.entries(errors)
              .filter(([key]) => key.includes('team') || key === 'agreeToTerms')
              .map(([, value]) => value)
          : Object.values(errors);

        if (relevantErrors.length > 0) {
          setPaymentError(relevantErrors.join('; '));
        }

        setIsProcessingRegistration(false);
        return;
      }

      // For existing users with selected teams, check each one
      if (isExistingUser && teamsToRegister.length > 0) {
        for (const team of teamsToRegister) {
          if (team._id) {
            const { isRegistered, isPaid } = await checkExistingRegistration(
              team._id
            );
            if (isRegistered && isPaid) {
              setPaymentError(
                'You have already registered and paid for one or more selected teams.'
              );
              setIsProcessingRegistration(false);
              return;
            }
          }
        }
      }

      const yearAsNumber = Number(memoizedTournamentEvent.year);
      if (isNaN(yearAsNumber)) {
        throw new Error(`Invalid year value: ${memoizedTournamentEvent.year}`);
      }

      // Check if this is an existing user with existing teams selected
      const isRegisteringExistingTeams =
        isExistingUser && teamsToRegister.length > 0;

      // Check if we have any new teams (teams without IDs) that need to be created
      const hasNewTeams = formData.teams.some((team) => !team._id);

      if (isRegisteringExistingTeams) {
        console.log('Registering existing teams for tournament:', {
          teamCount: teamsToRegister.length,
          teamIds: teamsToRegister.map((t) => t._id),
          tournament: memoizedTournamentEvent.tournament,
          year: yearAsNumber,
        });

        // Register multiple existing teams for the tournament
        const registrationPromises = teamsToRegister.map(async (team) => {
          if (!team._id) {
            throw new Error('Team ID is missing for an existing team');
          }

          const requestBody = {
            teamId: team._id,
            tournament: memoizedTournamentEvent.tournament,
            year: yearAsNumber,
            levelOfCompetition: team.levelOfCompetition,
            isAdmin,
          };

          console.log('Registering existing team for tournament:', requestBody);

          const response = await fetchWithTimeout(
            `${API_BASE_URL}/teams/register-tournament`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
              body: JSON.stringify(requestBody),
            },
            10000
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.message ||
                `Team registration failed: ${response.status}`
            );
          }

          return response.json();
        });

        const results = await Promise.all(registrationPromises);
        const updatedTeams = results.filter(Boolean).map((r) => r.team || r);

        // Update formData with the registered teams
        setFormData((prev) => ({
          ...prev,
          teams: updatedTeams,
        }));

        console.log('Existing teams registered for tournament:', {
          count: updatedTeams.length,
          teams: updatedTeams.map((t) => ({ id: t._id, name: t.name })),
        });

        setCurrentStep(2);
      } else {
        // This handles both new users AND existing users creating new teams
        console.log('Creating new teams or registering new user:', {
          isExistingUser,
          hasNewTeams,
          teamCount: formData.teams.length,
          tournament: memoizedTournamentEvent.tournament,
          year: yearAsNumber,
        });

        const registrationData = {
          email: formData.email,
          fullName: isExistingUser
            ? currentUser?.fullName
            : `${formData.firstName} ${formData.lastName}`,
          phone: formData.phone,
          isCoach: formData.isCoach,
          aauNumber: formData.isCoach ? formData.aauNumber : '',
          relationship: formData.relationship,
          teams: formData.teams.map((team) => ({
            name: team.name,
            grade: team.grade,
            sex: team.sex,
            levelOfCompetition: team.levelOfCompetition,
            ...(team._id ? { _id: team._id } : {}),
          })),
          agreeToTerms: formData.agreeToTerms,
          tournament: memoizedTournamentEvent.tournament,
          tournamentName: memoizedTournamentEvent.tournament,
          year: yearAsNumber,
          isAdmin,
          ...(isExistingUser
            ? {}
            : {
                password: formData.password,
                address: {
                  street: formData.address.street,
                  street2: formData.address.street2,
                  city: formData.address.city,
                  state: formData.address.state.toUpperCase(),
                  zip: formData.address.zip,
                },
              }),
        };

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (isExistingUser) {
          const token = localStorage.getItem('token');
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        }

        console.log('Sending registration request:', {
          endpoint: `${API_BASE_URL}/register/tournament-team-multiple`,
          headers: Object.keys(headers),
          hasAuthToken: !!headers['Authorization'],
          data: {
            ...registrationData,
            teams: registrationData.teams.map((t) => ({
              name: t.name,
              hasId: !!t._id,
            })),
          },
        });

        const response = await fetchWithTimeout(
          `${API_BASE_URL}/register/tournament-team-multiple`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(registrationData),
          },
          15000
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Registration failed:', {
            status: response.status,
            errorData,
          });

          if (response.status === 400) {
            if (errorData.error?.includes('Duplicate registration')) {
              setPaymentError(
                'You have already registered one or more teams for the tournament.'
              );
            } else if (errorData.error?.includes('Validation failed')) {
              // Filter backend validation errors for existing users
              const backendErrors = isExistingUser
                ? errorData.details
                    ?.filter(
                      (e: any) =>
                        e.path.includes('team') ||
                        e.path.includes('tournament') ||
                        e.path.includes('year') ||
                        e.path.includes('agreeToTerms')
                    )
                    .map((e: any) => e.msg) || []
                : errorData.details?.map((e: any) => e.msg) || [];

              setPaymentError(
                backendErrors.length > 0
                  ? backendErrors.join('; ')
                  : 'Validation failed. Please check your input.'
              );
            } else {
              setPaymentError(errorData.message || 'Registration failed');
            }
            setIsProcessingRegistration(false);
            return;
          }
          throw new Error(
            errorData.message || `Registration failed: ${response.status}`
          );
        }

        const responseData = await response.json();
        console.log('Registration response:', {
          hasToken: !!responseData.token,
          hasParentId: !!responseData.parent?.id,
          teamCount: responseData.teams?.length,
          teams: responseData.teams?.map((t: Team) => ({
            id: t._id,
            name: t.name,
          })),
        });

        if (responseData.token && responseData.parent?.id) {
          // Save auth data if provided (for new users)
          localStorage.setItem('token', responseData.token);
          localStorage.setItem('parentId', responseData.parent.id);
          localStorage.setItem('userEmail', formData.email);
        }

        if (responseData.teams && responseData.teams.length > 0) {
          console.log('Registration response teams:', {
            rawResponseTeams: responseData.teams,
            firstTeam: responseData.teams[0],
            firstTeamId: responseData.teams[0]?._id,
            firstTeamIdType: typeof responseData.teams[0]?._id,
          });

          // Update formData with the newly created/registered teams
          const updatedTeams = responseData.teams.map((team: Team) => {
            console.log('Processing team from response:', {
              name: team.name,
              _id: team._id,
              _idType: typeof team._id,
              isValidId: team._id && /^[0-9a-fA-F]{24}$/.test(team._id),
            });

            return {
              ...team,
              _id: team._id, // Make sure _id is included
              registrationYear: memoizedTournamentEvent.year,
              tournament: memoizedTournamentEvent.tournament,
            };
          });

          setFormData((prev) => ({
            ...prev,
            teams: updatedTeams,
          }));

          // Set selected team IDs for payment step
          const validTeamIds = updatedTeams
            .map((team: Team) => team._id)
            .filter(
              (id: string | undefined): id is string =>
                id !== undefined && /^[0-9a-fA-F]{24}$/.test(id)
            );

          console.log('Valid team IDs for payment:', {
            validTeamIds,
            updatedTeams: updatedTeams.map((t: Team) => ({
              name: t.name,
              id: t._id,
            })),
          });

          setSelectedTeamIds(validTeamIds);
          setCurrentStep(2);
        } else {
          console.warn(
            'No teams returned from registration, but request succeeded:',
            responseData
          );
          // If we get here but no teams, still proceed to payment step if we have teams in formData
          if (
            formData.teams.length > 0 &&
            formData.teams.every((team) => team._id)
          ) {
            // All teams already have IDs, proceed to payment
            const validTeamIds = formData.teams
              .map((team) => team._id!)
              .filter((id) => /^[0-9a-fA-F]{24}$/.test(id));

            setSelectedTeamIds(validTeamIds);
            setCurrentStep(2);
          } else {
            throw new Error(
              'Teams were not created properly. Please try again.'
            );
          }
        }
      }
    } catch (error) {
      console.error('Registration error:', {
        message: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });

      let errorMessage;
      if (error instanceof Error) {
        if (error.message.includes('timed out')) {
          errorMessage =
            'Server is taking too long to respond. Please try again later.';
        } else if (error.message.includes('404')) {
          errorMessage =
            'Registration endpoint not found. Please contact support.';
        } else if (error.message.includes('Email already registered')) {
          errorMessage =
            'This email is already registered. Please use a different email or log in.';
        } else if (error.message.includes('Validation failed')) {
          // Check if it's a server-side validation error for fields that shouldn't be validated
          if (
            (isExistingUser && error.message.includes('email')) ||
            error.message.includes('password') ||
            error.message.includes('address')
          ) {
            errorMessage =
              'Server error: Unexpected validation errors for existing user. Please contact support.';
          } else {
            errorMessage = 'Validation failed. Please check your input.';
          }
        } else if (error.message.includes('Team ID is missing')) {
          errorMessage =
            'One or more selected teams are missing IDs. Please try selecting teams again.';
        } else {
          errorMessage =
            error.message ||
            'Registration failed due to a server error. Please try again later.';
        }
      } else {
        errorMessage =
          'Registration failed due to a server error. Please try again later.';
      }

      setPaymentError(errorMessage);
    } finally {
      setIsProcessingRegistration(false);
    }
  };

  // Update payment amount based on number of teams
  const calculateTotalAmount = () => {
    const baseAmount = 425;
    const teamCount = formData.teams.filter(validateTeam).length;
    return baseAmount * teamCount;
  };

  const handleCardTokenized = async (
    tokenResult: TokenResult,
    verifiedBuyer?: any
  ) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      console.log('=== PAYMENT PROCESSING STARTED ===');

      if (tokenResult.status !== 'OK') {
        if ('errors' in tokenResult) {
          throw new Error(tokenResult.errors?.[0]?.message || 'Payment failed');
        } else {
          throw new Error('Payment failed');
        }
      }

      if (!tokenResult.token) {
        throw new Error('No payment token received');
      }

      const token = tokenResult.token;
      const cardDetails = tokenResult.details?.card;
      const totalAmount = calculateTotalAmount();

      console.log('Payment attempt details:', {
        customerEmail,
        totalAmount,
        tournament: memoizedTournamentEvent.tournament,
        year: memoizedTournamentEvent.year,
        selectedTeamIds,
        formDataTeams: formData.teams.map((t) => ({
          id: t._id,
          name: t.name,
          hasValidId: t._id && /^[0-9a-fA-F]{24}$/.test(t._id),
        })),
      });

      // Get valid teams from formData.teams (not selectedTeamIds)
      const validTeams = formData.teams.filter((team: Team) => {
        const isValid = validateTeam(team);
        const hasValidId = team._id && /^[0-9a-fA-F]{24}$/.test(team._id);

        if (!hasValidId) {
          console.error('Team has invalid or missing ID:', {
            name: team.name,
            id: team._id,
            isValid: isValid,
          });
        }
        return isValid && hasValidId;
      });

      console.log('Valid teams for payment:', {
        totalTeamsInForm: formData.teams.length,
        validTeamsCount: validTeams.length,
        validTeams: validTeams.map((t: Team) => ({
          id: t._id,
          name: t.name,
          hasMongoId: t._id && /^[0-9a-fA-F]{24}$/.test(t._id),
        })),
        invalidTeams: formData.teams.filter(
          (t: Team) =>
            !validateTeam(t) || !t._id || !/^[0-9a-fA-F]{24}$/.test(t._id)
        ),
      });

      if (validTeams.length === 0) {
        // 🚨 Check if we need to complete registration first
        if (formData.teams.some(validateTeam)) {
          throw new Error(
            'One or more teams have invalid IDs. Please complete registration first and try again.'
          );
        }
        throw new Error(
          'No valid teams found for payment. Please make sure all teams are properly registered.'
        );
      }

      const validTeamIds = validTeams
        .map((team: Team) => team._id)
        .filter(
          (id: string | undefined): id is string =>
            id !== undefined && /^[0-9a-fA-F]{24}$/.test(id)
        );

      const paymentData = {
        token,
        sourceId: token,
        amount: totalAmount * 100, // Convert to cents
        email: customerEmail,
        teamIds: validTeamIds,
        tournament: memoizedTournamentEvent.tournament,
        year: Number(memoizedTournamentEvent.year),
        cardDetails: {
          last_4: cardDetails?.last4 || '',
          card_brand: cardDetails?.brand || '',
          exp_month: cardDetails?.expMonth || '',
          exp_year: cardDetails?.expYear || '',
        },
        isAdmin,
      };

      console.log('Sending payment data to server:', {
        ...paymentData,
        amountInDollars: paymentData.amount / 100,
        teamCount: validTeamIds.length,
        teamIds: validTeamIds,
        allTeamIdsValid: validTeamIds.every((id) =>
          /^[0-9a-fA-F]{24}$/.test(id)
        ),
      });

      // Get token for authorization
      const authToken = localStorage.getItem('token');
      if (!authToken) {
        throw new Error('You are not logged in. Please log in and try again.');
      }

      console.log(
        'Making API request to:',
        `${API_BASE_URL}/payments/tournament-teams`
      );

      const response = await fetch(
        `${API_BASE_URL}/payments/tournament-teams`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(paymentData),
        }
      );

      const responseText = await response.text();
      console.log('Raw server response:', responseText);

      interface PaymentResponse {
        success: boolean;
        paymentId?: string;
        squarePaymentId?: string;
        teams?: Team[];
        payment?: {
          paymentId: string;
          amountPaid: number;
          receiptUrl: string;
          status: string;
        };
        message?: string;
        error?: string;
        details?: Array<{ msg: string }>;
        invalidTeams?: string[];
      }

      let result: PaymentResponse;
      try {
        result = JSON.parse(responseText) as PaymentResponse;
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error(
          `Server returned invalid JSON: ${responseText.substring(0, 200)}...`
        );
      }

      console.log('Parsed server response:', {
        success: result.success,
        message: result.message,
        error: result.error,
        teamCount: result.teams?.length,
        invalidTeams: result.invalidTeams,
      });

      if (!response.ok) {
        console.error('Server error response:', {
          status: response.status,
          statusText: response.statusText,
          result,
        });

        let errorMessage = 'Payment processing failed.';

        if (result?.error === 'No teams processed' && result.invalidTeams) {
          errorMessage = `Payment failed: Could not process teams. Invalid team IDs: ${result.invalidTeams.join(
            ', '
          )}`;
        } else if (result?.error === 'Team not found or unauthorized') {
          errorMessage =
            'One or more teams were not found or you are not authorized to pay for them.';
        } else if (result?.error === 'Parent not found') {
          errorMessage = 'Your account was not found. Please log in again.';
        } else if (result?.error === 'Square configuration missing') {
          errorMessage =
            'Payment system configuration error. Please contact support.';
        } else if (result?.message) {
          errorMessage = result.message;
        } else if (result?.error) {
          errorMessage = result.error;
        } else {
          errorMessage = `Payment failed: ${response.status} ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      if (!result.success) {
        throw new Error(
          result.message || 'Payment processing failed on the server.'
        );
      }

      // Check if we got team data back
      if (!result.teams || result.teams.length === 0) {
        console.warn(
          'No team data returned from server, but payment succeeded:',
          result
        );
        // Payment succeeded but no team data - still show success
        setIsSubmitted(true);
        setCurrentStep(3);

        // Show success message even without team details
        setPaymentError(null);
        if (onSuccess) {
          onSuccess();
        }
        return;
      }

      console.log('Payment successful! Teams updated:', {
        teamsReturned: result.teams.length,
        teamNames: result.teams.map((t) => t.name),
      });

      // Update form data with newly paid teams
      const updatedTeams = result.teams.map((team) => ({
        ...team,
        paymentComplete: true,
        paymentStatus: 'paid',
      }));

      // Update the teams in formData
      const updatedFormTeams = formData.teams.map((formTeam) => {
        const updatedTeam = updatedTeams.find((t) => t._id === formTeam._id);
        return updatedTeam ? { ...formTeam, ...updatedTeam } : formTeam;
      });

      setFormData((prev) => ({
        ...prev,
        teams: updatedFormTeams,
      }));

      // Clear selected team IDs since payment is complete
      setSelectedTeamIds([]);

      // Go to confirmation step
      setIsSubmitted(true);
      setCurrentStep(3);
      setPaymentError(null);

      console.log(
        'Payment completed successfully! Redirecting to confirmation.'
      );

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Payment processing error:', {
        message: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      let errorMessage = 'Payment processing failed. Please try again.';

      if (error instanceof Error) {
        if (error.message.includes('Team not found or unauthorized')) {
          errorMessage =
            'Team not found or you are not authorized to pay for this team.';
        } else if (
          error.message.includes('Square location ID not configured')
        ) {
          errorMessage =
            'Payment system configuration error. Please contact support.';
        } else if (error.message.includes('Parent not found')) {
          errorMessage = 'Your account was not found. Please log in again.';
        } else if (error.message.includes('No valid teams found')) {
          errorMessage =
            'No valid teams found. Please make sure all teams are properly registered before payment.';
        } else if (error.message.includes('invalid IDs')) {
          errorMessage =
            'One or more teams have invalid IDs. Please complete registration first and try again.';
        } else if (error.message.includes('not logged in')) {
          errorMessage = 'You are not logged in. Please log in and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      setPaymentError(errorMessage);

      // Optionally reset to step 1 if there's a critical error
      if (
        errorMessage.includes('not logged in') ||
        errorMessage.includes('account was not found') ||
        errorMessage.includes('complete registration first')
      ) {
        setTimeout(() => {
          if (errorMessage.includes('complete registration first')) {
            setCurrentStep(1);
          } else {
            navigate('/login');
          }
        }, 3000);
      }
    } finally {
      setIsProcessing(false);
      console.log('=== PAYMENT PROCESSING COMPLETED ===');
    }
  };

  const renderRegistrationStep = () => {
    if (tournamentError) {
      return (
        <div className='alert alert-danger'>
          <h4>Error</h4>
          <p>{tournamentError}</p>
          <button className='btn btn-primary' onClick={() => navigate('/')}>
            Return to Home
          </button>
        </div>
      );
    }

    if (isAlreadyRegistered) {
      return (
        <div className='alert alert-success'>
          <h4>🎉 Team Already Registered!</h4>
          <p>
            You have successfully registered{' '}
            {formData.teams.length === 1 ? (
              <>
                <strong>{formData.teams[0].name}</strong> for the{' '}
                <strong>
                  {memoizedTournamentEvent.tournament}{' '}
                  {memoizedTournamentEvent.year}
                </strong>
              </>
            ) : (
              <>
                <strong>{formData.teams.length} teams</strong> for the{' '}
                <strong>
                  {memoizedTournamentEvent.tournament}{' '}
                  {memoizedTournamentEvent.year}
                </strong>
              </>
            )}
            .
          </p>

          <div className='confirmation-details mt-3 bg-light p-3 rounded'>
            <h5 className='mb-3'>Registration Details:</h5>
            {formData.teams.map((team, index) => (
              <div key={index} className='mb-3 pb-3 border-bottom'>
                <h6>Team {index + 1}</h6>
                <p>
                  <strong>Team:</strong> {team.name}
                </p>
                <p>
                  <strong>Grade:</strong> {team.grade}
                </p>
                <p>
                  <strong>Gender:</strong> {team.sex}
                </p>
                <p>
                  <strong>Level:</strong> {team.levelOfCompetition}
                </p>
              </div>
            ))}
            <p>
              <strong>Tournament:</strong> {memoizedTournamentEvent.tournament}
            </p>
            <p>
              <strong>Year:</strong> {memoizedTournamentEvent.year}
            </p>
            <p>
              <strong>Total Registration Fee:</strong> ${calculateTotalAmount()}
              {formData.teams.length > 1 &&
                ` (${formData.teams.length} teams × $425)`}
            </p>
          </div>

          <div className='mt-4'>
            <button
              className='btn btn-primary me-3'
              onClick={() => {
                setSelectedTeamIds([]);
                setIsAlreadyRegistered(false);
                setFormData((prev) => ({
                  ...prev,
                  teams: [
                    {
                      name: '',
                      grade: '',
                      sex: 'Male',
                      levelOfCompetition: 'Gold',
                      registrationYear: memoizedTournamentEvent.year,
                      tournament: memoizedTournamentEvent.tournament,
                      coachIds: isExistingUser ? [currentUser?._id || ''] : [],
                    },
                  ],
                }));
              }}
            >
              Register {formData.teams.length > 1 ? 'More' : 'Another'} Team(s)
            </button>
            <button
              className='btn btn-outline-secondary'
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }

    // Filter validation errors to only show relevant ones
    const getRelevantErrors = (): string[] => {
      const errors: string[] = [];

      // Always show team-related errors
      formData.teams.forEach((_, index) => {
        if (validationErrors[`teamName-${index}`])
          errors.push(validationErrors[`teamName-${index}`]);
        if (validationErrors[`teamGrade-${index}`])
          errors.push(validationErrors[`teamGrade-${index}`]);
        if (validationErrors[`teamSex-${index}`])
          errors.push(validationErrors[`teamSex-${index}`]);
        if (validationErrors[`teamLevel-${index}`])
          errors.push(validationErrors[`teamLevel-${index}`]);
      });

      if (validationErrors.agreeToTerms)
        errors.push(validationErrors.agreeToTerms);

      // Only show account/address errors for new users
      if (!isExistingUser) {
        if (validationErrors.email) errors.push(validationErrors.email);
        if (validationErrors.password) errors.push(validationErrors.password);
        if (validationErrors.confirmPassword)
          errors.push(validationErrors.confirmPassword);
        if (validationErrors.firstName) errors.push(validationErrors.firstName);
        if (validationErrors.lastName) errors.push(validationErrors.lastName);
        if (validationErrors.phone) errors.push(validationErrors.phone);
        if (validationErrors.aauNumber) errors.push(validationErrors.aauNumber);
        if (validationErrors.addressStreet)
          errors.push(validationErrors.addressStreet);
        if (validationErrors.addressCity)
          errors.push(validationErrors.addressCity);
        if (validationErrors.addressState)
          errors.push(validationErrors.addressState);
        if (validationErrors.addressZip)
          errors.push(validationErrors.addressZip);
      }

      return errors;
    };

    const relevantErrors = getRelevantErrors();

    return (
      <form onSubmit={handleRegistrationSubmit}>
        {/* Team Selection for Existing Users with Teams */}
        {isExistingUser && existingTeamsState.length > 0 && (
          <div className='card mb-4'>
            <div className='card-header bg-light'>
              <h4>Select Teams to Register</h4>
            </div>
            <div className='card-body'>
              <p>
                Choose which teams to register for the{' '}
                {memoizedTournamentEvent.tournament}:
                {showWelcomeBackPrompt && (
                  <span className='text-warning ms-2'>
                    ⬅ You have an incomplete registration - complete payment
                    above
                  </span>
                )}
              </p>

              {existingTeamsState.map((team) => {
                if (!team._id || !/^[0-9a-fA-F]{24}$/.test(team._id)) {
                  console.warn('Skipping team without valid MongoDB ID:', {
                    name: team.name,
                    id: team._id,
                    idType: typeof team._id,
                  });
                  return null;
                }

                const isSelected = selectedTeamIds.includes(team._id);

                return (
                  <div key={team._id} className='form-check mb-3'>
                    <input
                      type='checkbox'
                      className='form-check-input'
                      id={`team-${team._id}`}
                      checked={isSelected}
                      onChange={(e) => {
                        console.log('Team checkbox changed:', {
                          teamId: team._id,
                          teamName: team.name,
                          checked: e.target.checked,
                        });
                        handleTeamSelection(team._id!, e.target.checked);
                      }}
                    />
                    <label
                      className='form-check-label d-flex align-items-center'
                      htmlFor={`team-${team._id}`}
                    >
                      <span>
                        {team.name} ({team.grade} Grade, {team.sex},{' '}
                        {team.levelOfCompetition})
                      </span>
                    </label>
                  </div>
                );
              })}

              <div className='form-check mb-3'>
                <input
                  type='checkbox'
                  className='form-check-input'
                  id='new-teams'
                  checked={
                    formData.teams.length === 0 ||
                    formData.teams.every(
                      (team) =>
                        !team._id || !team.name || team.name.trim() === ''
                    )
                  }
                  onChange={() => {
                    setSelectedTeamIds([]);
                    setTeamsToRegister([]);
                    setFormData((prev) => ({
                      ...prev,
                      teams: [
                        {
                          name: '',
                          grade: '',
                          sex: 'Male',
                          levelOfCompetition: 'Gold',
                          registrationYear: memoizedTournamentEvent.year,
                          tournament: memoizedTournamentEvent.tournament,
                          coachIds: isExistingUser
                            ? [currentUser?._id || '']
                            : [],
                        },
                      ],
                    }));
                    setTeamExistsWarning(null);
                    setIsAlreadyRegistered(false);
                    setShowWelcomeBackPrompt(false);
                  }}
                />
                <label className='form-check-label' htmlFor='new-teams'>
                  Create new team(s)
                </label>
              </div>

              {selectedTeamIds.length > 0 && (
                <div className='alert alert-info mt-3'>
                  <strong>Selected {selectedTeamIds.length} team(s):</strong>{' '}
                  {selectedTeamIds.length} × $425 = $
                  {selectedTeamIds.length * 425}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message for Existing Users with No Teams */}
        {isExistingUser && existingTeamsState.length === 0 && (
          <div className='card mb-4'>
            <div className='card-header bg-light'>
              <h4>Create New Team(s)</h4>
            </div>
            <div className='card-body'>
              <p className='text-muted'>
                You don't have any teams yet. Create new team(s) to register for
                the tournament.
              </p>
              <p>
                Since you're already registered, you only need to provide team
                information to register for the tournament.
              </p>
            </div>
          </div>
        )}

        {/* Only show Account Information for NEW users */}
        {!isExistingUser && (
          <>
            <div className='card mb-4'>
              <div className='card-header bg-light'>
                <div className='d-flex align-items-center'>
                  <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                    <i className='ti ti-user-shield fs-16' />
                  </span>
                  <h4 className='text-dark'>Account Information</h4>
                </div>
              </div>
              <div className='card-body pb-1'>
                <div className='row'>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>First Name</label>
                      <input
                        type='text'
                        name='firstName'
                        className={`form-control ${
                          validationErrors.firstName ? 'is-invalid' : ''
                        }`}
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                      />
                      {validationErrors.firstName && (
                        <div className='invalid-feedback'>
                          {validationErrors.firstName}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>Last Name</label>
                      <input
                        type='text'
                        name='lastName'
                        className={`form-control ${
                          validationErrors.lastName ? 'is-invalid' : ''
                        }`}
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                      />
                      {validationErrors.lastName && (
                        <div className='invalid-feedback'>
                          {validationErrors.lastName}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='col-md-12'>
                    <div className='mb-3'>
                      <label className='form-label'>Email (Username)</label>
                      <input
                        type='email'
                        name='email'
                        className={`form-control ${
                          validationErrors.email ? 'is-invalid' : ''
                        }`}
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                      {validationErrors.email && (
                        <div className='invalid-feedback'>
                          {validationErrors.email}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>Phone Number</label>
                      <input
                        type='text'
                        name='phone'
                        className={`form-control ${
                          validationErrors.phone ? 'is-invalid' : ''
                        }`}
                        value={formData.phone}
                        onChange={handleChange}
                        maxLength={14}
                        required
                      />
                      {validationErrors.phone && (
                        <div className='invalid-feedback'>
                          {validationErrors.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>
                        AAU Number {formData.isCoach ? '' : '(Optional)'}
                      </label>
                      <input
                        type='text'
                        name='aauNumber'
                        className={`form-control ${
                          validationErrors.aauNumber ? 'is-invalid' : ''
                        }`}
                        value={formData.aauNumber}
                        onChange={handleChange}
                        required={formData.isCoach}
                      />
                      {validationErrors.aauNumber && (
                        <div className='invalid-feedback'>
                          {validationErrors.aauNumber}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='col-md-12'>
                    <div className='mb-3'>
                      <label className='form-label'>
                        <input
                          type='checkbox'
                          name='isCoach'
                          checked={formData.isCoach}
                          onChange={handleChange}
                        />{' '}
                        I am the coach of these teams
                      </label>
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>Password</label>
                      <div className='pass-group'>
                        <input
                          type={
                            passwordVisibility.password ? 'text' : 'password'
                          }
                          name='password'
                          className={`form-control ${
                            validationErrors.password ? 'is-invalid' : ''
                          }`}
                          value={formData.password}
                          onChange={handleChange}
                          required
                          minLength={6}
                        />
                        <span
                          className={`ti toggle-passwords ${
                            passwordVisibility.password
                              ? 'ti-eye'
                              : 'ti-eye-off'
                          }`}
                          onClick={() => togglePasswordVisibility('password')}
                        ></span>
                      </div>
                      {validationErrors.password && (
                        <div className='invalid-feedback'>
                          {validationErrors.password}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>Confirm Password</label>
                      <div className='pass-group'>
                        <input
                          type={
                            passwordVisibility.confirmPassword
                              ? 'text'
                              : 'password'
                          }
                          name='confirmPassword'
                          className={`form-control ${
                            validationErrors.confirmPassword ? 'is-invalid' : ''
                          }`}
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required
                        />
                        <span
                          className={`ti toggle-password ${
                            passwordVisibility.confirmPassword
                              ? 'ti-eye'
                              : 'ti-eye-off'
                          }`}
                          onClick={() =>
                            togglePasswordVisibility('confirmPassword')
                          }
                        />
                      </div>
                      {validationErrors.confirmPassword && (
                        <div className='invalid-feedback'>
                          {validationErrors.confirmPassword}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className='card mb-4'>
              <div className='card-header bg-light'>
                <div className='d-flex align-items-center'>
                  <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                    <i className='ti ti-home fs-16' />
                  </span>
                  <h4 className='text-dark'>Address Information</h4>
                </div>
              </div>
              <div className='card-body pb-1'>
                <div className='row'>
                  <div className='col-md-12'>
                    <div className='mb-3'>
                      <label className='form-label'>Street Address</label>
                      <input
                        type='text'
                        name='address.street'
                        className={`form-control ${
                          validationErrors.addressStreet ? 'is-invalid' : ''
                        }`}
                        value={formData.address.street}
                        onChange={handleChange}
                        required
                      />
                      {validationErrors.addressStreet && (
                        <div className='invalid-feedback'>
                          {validationErrors.addressStreet}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='col-md-12'>
                    <div className='mb-3'>
                      <label className='form-label'>
                        Street Address 2 (Optional)
                      </label>
                      <input
                        type='text'
                        name='address.street2'
                        className='form-control'
                        value={formData.address.street2}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>City</label>
                      <input
                        type='text'
                        name='address.city'
                        className={`form-control ${
                          validationErrors.addressCity ? 'is-invalid' : ''
                        }`}
                        value={formData.address.city}
                        onChange={handleChange}
                        required
                      />
                      {validationErrors.addressCity && (
                        <div className='invalid-feedback'>
                          {validationErrors.addressCity}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='col-md-3'>
                    <div className='mb-3'>
                      <label className='form-label'>State</label>
                      <select
                        name='address.state'
                        className={`form-control ${
                          validationErrors.addressState ? 'is-invalid' : ''
                        }`}
                        value={formData.address.state}
                        onChange={handleChange}
                        required
                      >
                        <option value=''>Select State</option>
                        {[
                          'AL',
                          'AK',
                          'AZ',
                          'AR',
                          'CA',
                          'CO',
                          'CT',
                          'DE',
                          'FL',
                          'GA',
                          'HI',
                          'ID',
                          'IL',
                          'IN',
                          'IA',
                          'KS',
                          'KY',
                          'LA',
                          'ME',
                          'MD',
                          'MA',
                          'MI',
                          'MN',
                          'MS',
                          'MO',
                          'MT',
                          'NE',
                          'NV',
                          'NH',
                          'NJ',
                          'NM',
                          'NY',
                          'NC',
                          'ND',
                          'OH',
                          'OK',
                          'OR',
                          'PA',
                          'RI',
                          'SC',
                          'SD',
                          'TN',
                          'TX',
                          'UT',
                          'VT',
                          'VA',
                          'WA',
                          'WV',
                          'WI',
                          'WY',
                        ].map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                      {validationErrors.addressState && (
                        <div className='invalid-feedback'>
                          {validationErrors.addressState}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='col-md-3'>
                    <div className='mb-3'>
                      <label className='form-label'>ZIP Code</label>
                      <input
                        type='text'
                        name='address.zip'
                        className={`form-control ${
                          validationErrors.addressZip ? 'is-invalid' : ''
                        }`}
                        value={formData.address.zip}
                        onChange={handleChange}
                        required
                      />
                      {validationErrors.addressZip && (
                        <div className='invalid-feedback'>
                          {validationErrors.addressZip}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Team Information Section - Always shown */}
        <div className='card mb-4'>
          <div className='card-header bg-light d-flex justify-content-between align-items-center'>
            <div className='d-flex align-items-center'>
              <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                <i className='ti ti-shirt-sport fs-16' />
              </span>
              <h4 className='text-dark mb-0'>Team Information</h4>
            </div>
            <button
              type='button'
              className='btn btn-sm btn-outline-primary'
              onClick={addNewTeam}
            >
              + Add Another Team
            </button>
          </div>
          <div className='card-body pb-1'>
            {/* FIXED: Show message and button if no teams exist */}
            {formData.teams.length === 0 ? (
              <div className='text-center py-4'>
                <p className='text-muted mb-3'>
                  <i className='ti ti-info-circle me-1'></i>
                  Start by adding your first team:
                </p>
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={addNewTeam}
                >
                  <i className='ti ti-plus me-1'></i>
                  Add First Team
                </button>
              </div>
            ) : (
              <>
                {formData.teams.map((team, index) => (
                  <div
                    key={index}
                    className='team-section mb-4 pb-4 border-bottom'
                  >
                    <div className='d-flex justify-content-between align-items-center mb-3'>
                      <h5>Team {index + 1}</h5>
                      {formData.teams.length > 1 && (
                        <button
                          type='button'
                          className='btn btn-sm btn-outline-danger'
                          onClick={() => removeTeam(index)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className='row'>
                      <div className='col-md-12'>
                        <div className='mb-3'>
                          <label className='form-label'>Team Name</label>
                          <input
                            type='text'
                            className={`form-control ${
                              validationErrors[`teamName-${index}`]
                                ? 'is-invalid'
                                : ''
                            }`}
                            value={team.name}
                            onChange={(e) =>
                              handleTeamChange(index, 'name', e.target.value)
                            }
                            required
                            disabled={
                              isExistingUser && selectedTeamIds.length > 0
                            }
                          />
                          {validationErrors[`teamName-${index}`] && (
                            <div className='invalid-feedback'>
                              {validationErrors[`teamName-${index}`]}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className='col-md-6'>
                        <div className='mb-3'>
                          <label className='form-label'>Grade</label>
                          <select
                            className={`form-control ${
                              validationErrors[`teamGrade-${index}`]
                                ? 'is-invalid'
                                : ''
                            }`}
                            value={team.grade}
                            onChange={(e) =>
                              handleTeamChange(index, 'grade', e.target.value)
                            }
                            required
                            disabled={
                              isExistingUser && selectedTeamIds.length > 0
                            }
                          >
                            <option value=''>Select Grade</option>
                            <option value='PK'>Pre-Kindergarten</option>
                            <option value='K'>Kindergarten</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(
                              (grade) => (
                                <option key={grade} value={grade.toString()}>
                                  {grade} Grade
                                </option>
                              )
                            )}
                          </select>
                          {validationErrors[`teamGrade-${index}`] && (
                            <div className='invalid-feedback'>
                              {validationErrors[`teamGrade-${index}`]}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className='col-md-6'>
                        <div className='mb-3'>
                          <label className='form-label'>Team Gender</label>
                          <select
                            className={`form-control ${
                              validationErrors[`teamSex-${index}`]
                                ? 'is-invalid'
                                : ''
                            }`}
                            value={team.sex}
                            onChange={(e) =>
                              handleTeamChange(index, 'sex', e.target.value)
                            }
                            required
                            disabled={
                              isExistingUser && selectedTeamIds.length > 0
                            }
                          >
                            <option value='Male'>Male</option>
                            <option value='Female'>Female</option>
                          </select>
                          {validationErrors[`teamSex-${index}`] && (
                            <div className='invalid-feedback'>
                              {validationErrors[`teamSex-${index}`]}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className='col-md-12'>
                        <div className='mb-3'>
                          <label className='form-label'>
                            Level of Competition
                          </label>
                          <select
                            className={`form-control ${
                              validationErrors[`teamLevel-${index}`]
                                ? 'is-invalid'
                                : ''
                            }`}
                            value={team.levelOfCompetition}
                            onChange={(e) =>
                              handleTeamChange(
                                index,
                                'levelOfCompetition',
                                e.target.value
                              )
                            }
                            required
                            disabled={
                              isExistingUser && selectedTeamIds.length > 0
                            }
                          >
                            <option value='Gold'>Gold (Competitive)</option>
                            <option value='Silver'>
                              Silver (Recreational)
                            </option>
                          </select>
                          {validationErrors[`teamLevel-${index}`] && (
                            <div className='invalid-feedback'>
                              {validationErrors[`teamLevel-${index}`]}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className='mt-3'>
                  <p className='text-muted'>
                    <strong>Total Fee:</strong> ${calculateTotalAmount()}{' '}
                    {formData.teams.length > 0 &&
                      formData.teams.filter(validateTeam).length > 0 &&
                      `(${
                        formData.teams.filter(validateTeam).length
                      } valid team${
                        formData.teams.filter(validateTeam).length > 1
                          ? 's'
                          : ''
                      } × $425)`}
                  </p>
                  {formData.teams.length > 0 &&
                    formData.teams.some((team) => !validateTeam(team)) && (
                      <div className='alert alert-warning mt-2'>
                        <small>
                          <i className='ti ti-alert-triangle me-1'></i>
                          {
                            formData.teams.filter((team) => !validateTeam(team))
                              .length
                          }{' '}
                          team(s) have incomplete information. Only teams with
                          all required fields will be registered.
                        </small>
                      </div>
                    )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Terms and Conditions - Always shown */}
        <div className='card mb-4'>
          <div className='card-header bg-light'>
            <div className='d-flex align-items-center'>
              <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                <i className='ti ti-file-text fs-16' />
              </span>
              <h4 className='text-dark'>Terms and Conditions</h4>
            </div>
          </div>
          <div className='card-body pb-1'>
            <div className='row'>
              <div className='col-md-12'>
                <div className='mb-3'>
                  <label className='form-label'>
                    <input
                      type='checkbox'
                      name='agreeToTerms'
                      checked={formData.agreeToTerms}
                      onChange={handleChange}
                      required
                    />{' '}
                    By checking this box, you agree to the terms and conditions
                    outlined in the{' '}
                    <Link
                      to='#'
                      data-bs-toggle='modal'
                      data-bs-target='#tournament-waiver'
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Waiver
                    </Link>
                  </label>
                  {validationErrors.agreeToTerms && (
                    <div className='invalid-feedback d-block'>
                      {validationErrors.agreeToTerms}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Show only relevant errors */}
        {relevantErrors.length > 0 && (
          <div className='alert alert-danger mb-3'>
            <h5>Please fix the following errors:</h5>
            <ul className='mb-0'>
              {relevantErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Show payment error if it exists and is relevant */}
        {paymentError && relevantErrors.length === 0 && (
          <div className='alert alert-danger mb-3'>
            <h5>Error:</h5>
            <p className='mb-0'>{paymentError}</p>
          </div>
        )}

        <div className='card'>
          <div className='row d-flex align-items-center'>
            <button
              type='submit'
              className='btn btn-primary'
              disabled={
                isProcessingRegistration ||
                isAlreadyRegistered ||
                !!tournamentError ||
                formData.teams.length === 0 ||
                formData.teams.some((team) => !validateTeam(team))
              }
            >
              {isProcessingRegistration
                ? 'Registering...'
                : `Register ${
                    formData.teams.filter(validateTeam).length
                  } Valid Team(s) & Continue to Payment`}
            </button>
          </div>
        </div>
      </form>
    );
  };

  const renderPaymentStep = () => {
    if (tournamentError) {
      return (
        <div className='alert alert-danger'>
          <h4>Error</h4>
          <p>{tournamentError}</p>
          <button className='btn btn-primary' onClick={() => navigate('/')}>
            Return to Home
          </button>
        </div>
      );
    }

    // If somehow we're still on step 2 but should be on step 3, return null
    if (isSubmitted && currentStep === 3) {
      return null;
    }

    const totalAmount = calculateTotalAmount();

    return (
      <>
        {/* Show welcome back prompt only if we detected an unpaid registration */}
        {showWelcomeBackPrompt && (
          <div className='alert alert-info mb-4'>
            <h4>👋 Welcome Back!</h4>
            <p className='mb-0'>
              We noticed you previously registered{' '}
              {formData.teams.length === 1 ? (
                <>
                  <strong>{formData.teams[0].name}</strong> for the{' '}
                  <strong>{memoizedTournamentEvent.tournament}</strong>{' '}
                  tournament
                </>
              ) : (
                <>
                  <strong>{formData.teams.length} teams</strong> for the{' '}
                  <strong>{memoizedTournamentEvent.tournament}</strong>{' '}
                  tournament
                </>
              )}
              but haven't completed payment yet. Please complete your payment
              below to finalize your registration.
            </p>
            <div className='mt-2'>
              <button
                className='btn btn-outline-secondary btn-sm'
                onClick={() => {
                  setShowWelcomeBackPrompt(false);
                  setCurrentStep(1);
                }}
              >
                Register different team(s) instead
              </button>
            </div>
          </div>
        )}

        {/* Show regular message if not coming back from registration */}
        {!showWelcomeBackPrompt && (
          <div className='alert alert-success mb-4'>
            <h4>Complete Your Tournament Payment</h4>
            <p className='mb-0'>
              Please complete your payment below to finalize registration for
              the {memoizedTournamentEvent.tournament} Tournament.
            </p>
          </div>
        )}

        {/* Payment form content remains the same */}
        <div className='card'>
          <div className='card-header bg-light'>
            <div className='d-flex align-items-center'>
              <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                <i className='ti ti-credit-card fs-16' />
              </span>
              <h4 className='text-dark'>Payment Information</h4>
            </div>
          </div>
          <div className='card-body'>
            {paymentError && (
              <div className='alert alert-danger mb-3'>
                <h5>Payment Error:</h5>
                <p className='mb-0'>{paymentError}</p>
              </div>
            )}

            <div className='row mb-4'>
              <div className='col-12 mb-4'>
                <h5>Tournament Fee:</h5>
                <p className='text-muted'>
                  Total: ${totalAmount} ({formData.teams.length} team
                  {formData.teams.length > 1 ? 's' : ''} × $425)
                </p>
                <div className='teams-info bg-light p-3 rounded'>
                  <h6>Team Details:</h6>
                  {formData.teams.map((team, index) => (
                    <div key={index} className='mb-3 pb-3 border-bottom'>
                      <h6>Team {index + 1}</h6>
                      <p className='mb-1'>
                        <strong>Team:</strong> {team.name}
                      </p>
                      <p className='mb-1'>
                        <strong>Grade:</strong> {team.grade}
                      </p>
                      <p className='mb-1'>
                        <strong>Gender:</strong> {team.sex}
                      </p>
                      <p className='mb-0'>
                        <strong>Level:</strong> {team.levelOfCompetition}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className='mb-3'>
              <label className='form-label'>Email for Receipt</label>
              <input
                type='email'
                className={`form-control ${!customerEmail && 'is-invalid'}`}
                value={customerEmail}
                onChange={(e) =>
                  setCustomerEmail(e.target.value.toLowerCase().trim())
                }
                required
              />
              {!customerEmail && (
                <div className='invalid-feedback'>
                  Email is required for your receipt
                </div>
              )}
            </div>

            <div className='payment-form-container'>
              <PaymentForm
                applicationId={appId}
                locationId={locationId}
                cardTokenizeResponseReceived={handleCardTokenized}
                createPaymentRequest={() => ({
                  countryCode: 'US',
                  currencyCode: 'USD',
                  total: {
                    amount: totalAmount.toString(),
                    label: 'Total',
                  },
                  buyerEmailAddress: customerEmail,
                })}
              >
                <CreditCard />
              </PaymentForm>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className='container-fuild'>
      <div className='login-wrapper w-100 overflow-hidden position-relative flex-wrap d-block vh-100'>
        <div className='row'>
          <div className='col-lg-6'>
            <div className='d-lg-flex align-items-center justify-content-center bg-light-300 d-lg-block d-none flex-wrap vh-100 overflowy-auto bg-01'>
              <div className='text-center'>
                <div>
                  <ImageWithBasePath
                    src='assets/img/waStateBasketballChampionshipLogo.png'
                    alt='Img'
                  />
                </div>
                <HomeModals />
              </div>
            </div>
          </div>

          <div className='col-lg-6 col-md-12 col-sm-12'>
            <div className='row justify-content-center align-items-center vh-100 overflow-auto flex-wrap'>
              <div className='tournament-registration-page'>
                <div className='mx-auto p-4'>
                  {isSubmitted && currentStep === 3 ? (
                    <div className='text-center'>
                      <h1 className='mb-4'>🎉 Thank you for registering!</h1>
                      <p className='lead'>
                        Tournament registration successful for{' '}
                        {formData.teams.length} team
                        {formData.teams.length > 1 ? 's' : ''}
                      </p>

                      {/* Show paid teams */}
                      {formData.teams.filter((team) => team.paymentComplete)
                        .length > 0 && (
                        <div className='confirmation-details mt-4 p-4 bg-light rounded'>
                          <h5 className='mb-3 text-success'>
                            ✅ Paid & Confirmed Teams (
                            {
                              formData.teams.filter(
                                (team) => team.paymentComplete
                              ).length
                            }
                            )
                          </h5>
                          {formData.teams
                            .filter((team) => team.paymentComplete)
                            .map((team, index) => (
                              <div
                                key={`paid-${index}`}
                                className='mb-3 pb-3 border-bottom'
                              >
                                <div className='d-flex justify-content-between align-items-center'>
                                  <h6 className='mb-0'>
                                    Team {index + 1}: {team.name}
                                  </h6>
                                  <span className='badge bg-success'>PAID</span>
                                </div>
                                <div className='row mt-2'>
                                  <div className='col-md-6'>
                                    <p className='mb-1'>
                                      <strong>Grade:</strong> {team.grade}
                                    </p>
                                    <p className='mb-1'>
                                      <strong>Gender:</strong> {team.sex}
                                    </p>
                                  </div>
                                  <div className='col-md-6'>
                                    <p className='mb-1'>
                                      <strong>Level:</strong>{' '}
                                      {team.levelOfCompetition}
                                    </p>
                                    <p className='mb-1'>
                                      <strong>Fee:</strong> $425
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Show pending payment teams */}
                      {formData.teams.filter((team) => !team.paymentComplete)
                        .length > 0 && (
                        <div className='confirmation-details mt-4 p-4 bg-warning-subtle rounded'>
                          <h5 className='mb-3 text-warning'>
                            ⚠️ Teams Pending Payment (
                            {
                              formData.teams.filter(
                                (team) => !team.paymentComplete
                              ).length
                            }
                            )
                          </h5>
                          {formData.teams
                            .filter((team) => !team.paymentComplete)
                            .map((team, index) => (
                              <div
                                key={`pending-${index}`}
                                className='mb-3 pb-3 border-bottom'
                              >
                                <div className='d-flex justify-content-between align-items-center'>
                                  <h6 className='mb-0'>
                                    Team {index + 1}: {team.name}
                                  </h6>
                                  <span className='badge bg-warning'>
                                    PENDING PAYMENT
                                  </span>
                                </div>
                                <div className='row mt-2'>
                                  <div className='col-md-6'>
                                    <p className='mb-1'>
                                      <strong>Grade:</strong> {team.grade}
                                    </p>
                                    <p className='mb-1'>
                                      <strong>Gender:</strong> {team.sex}
                                    </p>
                                  </div>
                                  <div className='col-md-6'>
                                    <p className='mb-1'>
                                      <strong>Level:</strong>{' '}
                                      {team.levelOfCompetition}
                                    </p>
                                    <p className='mb-1'>
                                      <strong>Fee:</strong> $425
                                    </p>
                                  </div>
                                </div>
                                <div className='mt-2'>
                                  <button
                                    className='btn btn-sm btn-warning'
                                    onClick={() => {
                                      // Go back to payment step for this specific team
                                      setFormData((prev) => ({
                                        ...prev,
                                        teams: [team], // Set only this team for payment
                                      }));
                                      setSelectedTeamIds([team._id!]);
                                      setCurrentStep(2);
                                      setIsSubmitted(false);
                                    }}
                                  >
                                    Complete Payment for this Team
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Summary */}
                      <div className='summary-details mt-4 p-4 bg-info-subtle rounded'>
                        <h5 className='mb-3'>📊 Registration Summary</h5>
                        <div className='row'>
                          <div className='col-md-6'>
                            <p>
                              <strong>Total Teams Registered:</strong>{' '}
                              {formData.teams.length}
                            </p>
                            <p>
                              <strong>Paid Teams:</strong>{' '}
                              {
                                formData.teams.filter(
                                  (team) => team.paymentComplete
                                ).length
                              }
                            </p>
                            <p>
                              <strong>Pending Payment:</strong>{' '}
                              {
                                formData.teams.filter(
                                  (team) => !team.paymentComplete
                                ).length
                              }
                            </p>
                          </div>
                          <div className='col-md-6'>
                            <p>
                              <strong>Total Amount Paid:</strong> $
                              {formData.teams.filter(
                                (team) => team.paymentComplete
                              ).length * 425}
                            </p>
                            <p>
                              <strong>Pending Amount:</strong> $
                              {formData.teams.filter(
                                (team) => !team.paymentComplete
                              ).length * 425}
                            </p>
                            <p>
                              <strong>Tournament:</strong>{' '}
                              {memoizedTournamentEvent.tournament}
                            </p>
                            <p>
                              <strong>Year:</strong>{' '}
                              {memoizedTournamentEvent.year}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className='mt-5'>
                        <button
                          className='btn btn-primary me-3'
                          onClick={() => {
                            // Reset to add more teams
                            setSelectedTeamIds([]);
                            setIsSubmitted(false);
                            setCurrentStep(1);
                            setFormData((prev) => ({
                              ...prev,
                              teams: [
                                {
                                  name: '',
                                  grade: '',
                                  sex: 'Male',
                                  levelOfCompetition: 'Gold',
                                  registrationYear:
                                    memoizedTournamentEvent.year,
                                  tournament:
                                    memoizedTournamentEvent.tournament,
                                  coachIds: isExistingUser
                                    ? [currentUser?._id || '']
                                    : [],
                                },
                              ],
                            }));
                          }}
                        >
                          + Register Additional Team(s)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className='p-4 mb-4'>
                        <h3 className='text-dark mb-3'>
                          Partizan Tournament Registration
                        </h3>
                        <p className='lead text-muted mb-4'>
                          Register your team(s) for our competitive basketball
                          tournament!
                        </p>
                        <div className='text-start'>
                          <h5 className='mb-3'>Tournament Features:</h5>
                          <ul className='list-unstyled'>
                            <li className='mb-2'>
                              ✅ Competitive divisions for all skill levels
                            </li>
                            <li className='mb-2'>
                              ✅ Professional coaching and officiating
                            </li>
                            <li className='mb-2'>✅ Top-quality facilities</li>
                            <li className='mb-2'>✅ Team registration</li>
                            <li className='mb-2'>
                              ✅ Awards and recognition for winners
                            </li>
                            <li className='mb-2'>
                              ✅ Safe and organized environment
                            </li>
                          </ul>
                        </div>
                        <div className='mt-4'>
                          <h5 className='mb-3'>
                            Registration Fee: $425 per team
                          </h5>
                          <p className='text-muted'>
                            Includes tournament participation for entire team.
                          </p>
                        </div>
                      </div>
                      {/* STATUS BAR - HIDE ONLY ON CONFIRMATION STEP */}
                      {currentStep !== 3 && (
                        <div className='card mb-4'>
                          <div className='card-body text-center'>
                            <h1 className='mb-3'>🏀 Team Registration</h1>

                            <div
                              className='progress mb-4'
                              style={{ height: '10px' }}
                            >
                              <div
                                className='progress-bar bg-success'
                                role='progressbar'
                                style={{ width: `${(currentStep / 3) * 100}%` }}
                                aria-valuenow={currentStep}
                                aria-valuemin={1}
                                aria-valuemax={3}
                              ></div>
                            </div>

                            <div className='d-flex justify-content-between mb-4'>
                              <div
                                className={`step ${
                                  currentStep >= 1 ? 'active' : ''
                                }`}
                              >
                                <span className='step-title'>Registration</span>
                              </div>
                              <div
                                className={`step ${
                                  currentStep >= 2 ? 'active' : ''
                                }`}
                              >
                                <span className='step-title'>Payment</span>
                              </div>
                              <div
                                className={`step ${
                                  currentStep >= 3 ? 'active' : ''
                                }`}
                              >
                                <span className='step-title'>Confirmation</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {currentStep === 1 && renderRegistrationStep()}
                      {currentStep === 2 && renderPaymentStep()}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentRegistrationForm;
