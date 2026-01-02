import React, {
  useState,
  ChangeEvent,
  FormEvent,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  PaymentForm as SquarePaymentForm,
  PaymentFormProps as SquarePaymentFormProps,
} from 'react-square-web-payments-sdk';
import {
  validateEmail,
  validateRequired,
  validateName,
  validateDateOfBirth,
  validateState,
  validateZipCode,
  validateGrade,
  validatePhoneNumber,
} from '../../utils/validation';
import { useAuth } from '../../context/AuthContext';
import HomeModals from '../pages/homeModals';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, storeDateAsUTC } from '../../utils/dateFormatter';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// PROD
const appId = 'sq0idp-jUCxKnO_i8i7vccQjVj_0g';
const locationId = 'L26Q50FWRCQW5';

// QA
//const appId = 'sandbox-sq0idb-I4PAJ1f1XKYqYSwLovq0xQ';
//const locationId = 'LCW4GM814GWXK';

interface SeasonRegistration {
  season: string;
  year: number;
  tryoutId?: string;
  registrationDate?: Date;
  paymentComplete?: boolean;
  paymentStatus?: string;
  amountPaid?: number;
  paymentId?: string;
  paymentMethod?: string;
  cardLast4?: string;
  cardBrand?: string;
}

interface Player {
  _id?: string;
  fullName: string;
  gender: string;
  dob: string;
  schoolName: string;
  healthConcerns: string;
  aauNumber: string;
  registrationYear: number;
  season: string;
  grade: string;
  paymentComplete?: boolean;
  paymentStatus?: string;
  seasons?: SeasonRegistration[];
}

interface Address {
  street: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
}

interface Guardian {
  fullName: string;
  relationship: string;
  phone: string;
  email: string;
  address: Address;
  isCoach: boolean;
  aauNumber: string;
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
  fullName: string;
  relationship: string;
  phone: string;
  address: Address;
  isCoach: boolean;
  aauNumber: string;
  players: Player[];
  agreeToTerms: boolean;
  additionalGuardians: Guardian[];
  payment: {
    amount: number;
    amountInCents: number;
    playerCount: number;
    perPlayerAmount: number;
    token?: string;
    breakdown: {
      basePrice: number;
      subtotal: number;
      total: number;
    };
  };
}

interface RegistrationFormProps {
  isExistingUser?: boolean;
  onSuccess?: () => void;
  existingPlayers?: Player[];
  skipToPayment?: boolean;
  tryoutEvent: {
    season: string;
    year: number;
    tryoutId: string;
  };
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const parseAddress = (fullAddress: string): Address => {
  const patternWithUnit =
    /^(\d+\s[\w\s.]+?)\s*(?:,?\s*(apt|apartment|suite|ste|unit|building|bldg|floor|fl|room|rm|department|dept|lot|#)\.?\s*([\w\s-]+?)\s*)?,\s*([^,]+?)\s*,\s*([a-zA-Z]{2,})\s*(\d{5}(?:-\d{4})?)$/i;
  const matchWithUnit = fullAddress.match(patternWithUnit);

  if (matchWithUnit) {
    return {
      street: matchWithUnit[1].trim(),
      street2:
        matchWithUnit[2] && matchWithUnit[3]
          ? `${matchWithUnit[2].trim()} ${matchWithUnit[3].trim()}`.replace(
              /\s+/g,
              ' '
            )
          : '',
      city: matchWithUnit[4].trim(),
      state: normalizeState(matchWithUnit[5].trim()),
      zip: matchWithUnit[6].trim(),
    };
  }

  const fallbackPattern =
    /^([^,]+?)\s*,\s*([^,]+?)\s*,\s*([a-zA-Z]{2,})\s*(\d{5}(?:-\d{4})?)$/i;
  const fallbackMatch = fullAddress.match(fallbackPattern);

  if (fallbackMatch) {
    return {
      street: fallbackMatch[1].trim(),
      street2: '',
      city: fallbackMatch[2].trim(),
      state: normalizeState(fallbackMatch[3].trim()),
      zip: fallbackMatch[4].trim(),
    };
  }

  return {
    street: fullAddress,
    street2: '',
    city: '',
    state: '',
    zip: '',
  };
};

const normalizeState = (stateInput: string): string => {
  const stateMap: Record<string, string> = {
    alabama: 'AL',
    alaska: 'AK',
    arizona: 'AZ',
    arkansas: 'AR',
    california: 'CA',
    colorado: 'CO',
    connecticut: 'CT',
    delaware: 'DE',
    florida: 'FL',
    georgia: 'GA',
    hawaii: 'HI',
    idaho: 'ID',
    illinois: 'IL',
    indiana: 'IN',
    iowa: 'IA',
    kansas: 'KS',
    kentucky: 'KY',
    louisiana: 'LA',
    maine: 'ME',
    maryland: 'MD',
    massachusetts: 'MA',
    michigan: 'MI',
    minnesota: 'MN',
    mississippi: 'MS',
    missouri: 'MO',
    montana: 'MT',
    nebraska: 'NE',
    nevada: 'NV',
    'new hampshire': 'NH',
    'new jersey': 'NJ',
    'new mexico': 'NM',
    'new york': 'NY',
    'north carolina': 'NC',
    'north dakota': 'ND',
    ohio: 'OH',
    oklahoma: 'OK',
    oregon: 'OR',
    pennsylvania: 'PA',
    'rhode island': 'RI',
    'south carolina': 'SC',
    'south dakota': 'SD',
    tennessee: 'TN',
    texas: 'TX',
    utah: 'UT',
    vermont: 'VT',
    virginia: 'VA',
    washington: 'WA',
    'west virginia': 'WV',
    wisconsin: 'WI',
    wyoming: 'WY',
  };

  const normalizedInput = stateInput.toLowerCase().trim();
  if (/^[A-Z]{2}$/.test(stateInput)) return stateInput;
  if (/^[a-zA-Z]{2}$/.test(stateInput)) return stateInput.toUpperCase();
  return stateMap[normalizedInput] || stateInput;
};

const validateAddress = (address: Address): boolean => {
  return !!address.street && !!address.city && !!address.state && !!address.zip;
};

const formatPhoneNumber = (value: string): string => {
  const cleaned = ('' + value).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
  return match
    ? !match[2]
      ? match[1]
      : `(${match[1]}) ${match[2]}${match[3] ? '-' + match[3] : ''}`
    : value;
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

const RegistrationForm: React.FC<RegistrationFormProps> = ({
  isExistingUser = false,
  onSuccess,
  existingPlayers = [],
  skipToPayment = false,
  tryoutEvent,
}) => {
  const { parent: currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(
    skipToPayment && isExistingUser ? 2 : 1
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [additionalGuardian, setAdditionalGuardian] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isProcessingRegistration, setIsProcessingRegistration] =
    useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [existingPlayersState, setExistingPlayersState] =
    useState<Player[]>(existingPlayers);
  const [isExistingRegistration, setIsExistingRegistration] = useState(false);
  const [isLoading, setIsLoading] = useState(!isExistingUser);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);

  // Store successful payment data
  const [successData, setSuccessData] = useState<{
    playerCount: number;
    totalAmount: number;
    customerEmail: string;
  } | null>(null);

  const memoizedEvent = useMemo(
    () => ({
      season: tryoutEvent.season,
      year: tryoutEvent.year,
      tryoutId: tryoutEvent.tryoutId,
    }),
    [tryoutEvent.season, tryoutEvent.year, tryoutEvent.tryoutId]
  );

  const initialFormData: FormData = {
    email: isExistingUser ? currentUser?.email || '' : '',
    password: '',
    confirmPassword: '',
    fullName: isExistingUser ? currentUser?.fullName || '' : '',
    relationship: isExistingUser ? currentUser?.relationship || '' : '',
    phone: isExistingUser ? currentUser?.phone || '' : '',
    address: isExistingUser
      ? typeof currentUser?.address === 'string'
        ? parseAddress(currentUser.address)
        : currentUser?.address || {
            street: '',
            street2: '',
            city: '',
            state: '',
            zip: '',
          }
      : {
          street: '',
          street2: '',
          city: '',
          state: '',
          zip: '',
        },
    isCoach: isExistingUser ? currentUser?.isCoach ?? false : false,
    aauNumber: isExistingUser ? currentUser?.aauNumber || '' : '',
    players: isExistingUser
      ? []
      : [
          {
            fullName: '',
            gender: '',
            dob: '',
            schoolName: '',
            healthConcerns: '',
            aauNumber: '',
            registrationYear: tryoutEvent.year,
            season: tryoutEvent.season,
            grade: '',
          },
        ],
    agreeToTerms: false,
    additionalGuardians: [],
    payment: {
      amount: 0,
      amountInCents: 0,
      playerCount: 0,
      perPlayerAmount: 1050,
      breakdown: {
        basePrice: 0,
        subtotal: 0,
        total: 0,
      },
    },
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [customerEmail, setCustomerEmail] = useState(
    currentUser?.email || formData.email || ''
  );

  const checkAllPlayersPaid = useCallback(
    (players: Player[]): boolean => {
      if (!players.length || !selectedPlayerIds.length) return false;

      return players
        .filter((p) => selectedPlayerIds.includes(p._id!))
        .every((player) => {
          const matchingSeason = player.seasons?.find(
            (s) =>
              s.season === memoizedEvent.season &&
              s.year === memoizedEvent.year &&
              s.tryoutId === memoizedEvent.tryoutId
          );

          return matchingSeason?.paymentStatus === 'paid';
        });
    },
    [
      memoizedEvent.season,
      memoizedEvent.year,
      memoizedEvent.tryoutId,
      selectedPlayerIds,
    ]
  );

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

  useEffect(() => {
    if (!isExistingUser || !currentUser?._id) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchExistingPlayers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `${API_BASE_URL}/players/by-parent/${currentUser._id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const players: Player[] = await response.json();
        if (!isMounted) return;

        setExistingPlayersState(players);

        // Filter players who qualified for the team (attended tryouts)
        const qualifiedPlayers = players.filter((p) =>
          p.seasons?.some(
            (s) =>
              s.season === 'Basketball Select Tryout' &&
              s.year === memoizedEvent.year &&
              s.tryoutId === 'basketballselect-tryout'
          )
        );

        // Automatically select unpaid qualified players
        const unpaidQualifiedPlayerIds = qualifiedPlayers
          .filter((p) => {
            const matchingSeason = p.seasons?.find(
              (s) =>
                s.season === memoizedEvent.season &&
                s.year === memoizedEvent.year &&
                s.tryoutId === memoizedEvent.tryoutId
            );
            return !matchingSeason || matchingSeason.paymentStatus !== 'paid';
          })
          .map((p) => p._id!);

        setSelectedPlayerIds(unpaidQualifiedPlayerIds);

        // Update formData.players with qualified players
        setFormData((prev) => ({
          ...prev,
          players: qualifiedPlayers.map((p) => ({
            _id: p._id,
            fullName: p.fullName,
            gender: p.gender,
            dob: p.dob,
            schoolName: p.schoolName,
            grade: p.grade,
            healthConcerns: p.healthConcerns || '',
            aauNumber: p.aauNumber || '',
            registrationYear: memoizedEvent.year,
            season: memoizedEvent.season,
            seasons: p.seasons,
            paymentComplete: p.paymentComplete,
            paymentStatus: p.paymentStatus,
          })),
          payment: calculatePayments(unpaidQualifiedPlayerIds.length),
        }));

        // Check if any qualified players are already paid
        const paidPlayers = qualifiedPlayers.filter((p) => {
          const matchingSeason = p.seasons?.find(
            (s) =>
              s.season === memoizedEvent.season &&
              s.year === memoizedEvent.year &&
              s.tryoutId === memoizedEvent.tryoutId
          );
          return matchingSeason?.paymentStatus === 'paid';
        });

        if (
          paidPlayers.length > 0 &&
          paidPlayers.length === qualifiedPlayers.length
        ) {
          setCurrentStep(3);
          setIsSubmitted(true);
          setSuccessData({
            playerCount: paidPlayers.length,
            totalAmount: paidPlayers.length * 1050,
            customerEmail: currentUser?.email || customerEmail,
          });
        } else if (skipToPayment && qualifiedPlayers.length > 0) {
          setCurrentStep(2);
        } else {
          setCurrentStep(1);
        }
      } catch (error) {
        console.error('Failed to fetch players:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchExistingPlayers();

    return () => {
      isMounted = false;
    };
  }, [isExistingUser, currentUser?._id, memoizedEvent, skipToPayment]);

  const [additionalGuardianData, setAdditionalGuardianData] =
    useState<Guardian>({
      fullName: '',
      relationship: '',
      phone: '',
      email: '',
      address: { street: '', street2: '', city: '', state: '', zip: '' },
      isCoach: false,
      aauNumber: '',
    });

  const calculateTotalAmount = () => {
    return 1050 * selectedPlayerIds.length;
  };

  const calculatePayments = (playerCount: number) => {
    const perPlayerAmount = 1050;
    const basePrice = perPlayerAmount * playerCount;

    return {
      amount: basePrice,
      amountInCents: basePrice * 100,
      playerCount: playerCount,
      perPlayerAmount,
      breakdown: {
        basePrice,
        subtotal: basePrice,
        total: basePrice,
      },
    };
  };

  useEffect(() => {
    console.log(
      'Updating payment based on selectedPlayerIds:',
      selectedPlayerIds
    );
    setFormData((prev) => ({
      ...prev,
      payment: calculatePayments(selectedPlayerIds.length),
    }));
  }, [selectedPlayerIds]);

  useEffect(() => {
    console.log('=== DEBUG STATE ===');
    console.log('isSubmitted:', isSubmitted);
    console.log('currentStep:', currentStep);
    console.log('successData:', successData);
    console.log('selectedPlayerIds:', selectedPlayerIds);
    console.log('selectedPlayerIds length:', selectedPlayerIds.length);
    console.log('formData.payment:', formData.payment);
    console.log('==================');
  }, [
    isSubmitted,
    currentStep,
    successData,
    selectedPlayerIds,
    formData.payment,
  ]);

  const handlePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds((prev) => {
      const newSelectedIds = prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId];
      console.log('handlePlayerSelection - newSelectedIds:', newSelectedIds);
      return newSelectedIds;
    });
  };

  const handleRegistrationSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessingRegistration(true);
    setPaymentError(null);

    console.log(
      'handleRegistrationSubmit - selectedPlayerIds:',
      selectedPlayerIds
    );

    try {
      const errors: Record<string, string> = {};

      // Validate player selection for existing users
      if (isExistingUser && selectedPlayerIds.length === 0) {
        errors.players =
          'Please select at least one player to register for the Basketball Select Team';
      }

      if (Object.keys(errors).length > 0) {
        setIsProcessingRegistration(false);
        return;
      }

      const yearAsNumber = Number(tryoutEvent.year);
      if (isNaN(yearAsNumber)) {
        throw new Error(`Invalid year value: ${tryoutEvent.year}`);
      }

      if (isExistingUser) {
        const registeredPlayers: Player[] = [];

        // Process selected qualified players
        for (const playerId of selectedPlayerIds) {
          const player = existingPlayersState.find((p) => p._id === playerId);
          if (!player) continue;

          const isAlreadyRegistered = player.seasons?.some(
            (s) =>
              s.season === memoizedEvent.season &&
              s.year === memoizedEvent.year &&
              s.tryoutId === memoizedEvent.tryoutId
          );

          if (isAlreadyRegistered) {
            // Player is already registered, ensure Registration document exists
            await fetch(`${API_BASE_URL}/registrations/ensure`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
              body: JSON.stringify({
                playerId: player._id,
                season: memoizedEvent.season,
                year: yearAsNumber,
                tryoutId: memoizedEvent.tryoutId,
                parentId: currentUser?._id,
              }),
            });
            continue;
          }

          // Register player for Basketball Select Team
          const response = await fetch(
            `${API_BASE_URL}/players/${playerId}/season`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
              body: JSON.stringify({
                season: memoizedEvent.season,
                year: yearAsNumber,
                tryoutId: memoizedEvent.tryoutId,
                paymentStatus: 'pending',
                paymentComplete: false,
                registrationDate: new Date(),
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Player season update error:', errorData);
            throw new Error(
              errorData.message ||
                `Failed to register player ${player.fullName} for the team`
            );
          }

          const updatedPlayer = await response.json();
          registeredPlayers.push(updatedPlayer.player || updatedPlayer);
        }

        // Refresh existingPlayersState
        const playersResponse = await fetch(
          `${API_BASE_URL}/players/by-parent/${currentUser?._id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );
        if (playersResponse.ok) {
          const updatedPlayers: Player[] = await playersResponse.json();
          setExistingPlayersState(updatedPlayers);
        }

        // Update formData with registered players
        setFormData((prev) => {
          const updatedPlayers = [
            ...prev.players.filter((p) => p._id), // Keep existing players
            ...registeredPlayers.map((p) => ({
              _id: p._id,
              fullName: p.fullName,
              gender: p.gender,
              dob: p.dob,
              schoolName: p.schoolName,
              grade: p.grade,
              healthConcerns: p.healthConcerns || '',
              aauNumber: p.aauNumber || '',
              registrationYear: yearAsNumber,
              season: memoizedEvent.season,
              seasons: p.seasons || [
                {
                  season: memoizedEvent.season,
                  year: yearAsNumber,
                  tryoutId: memoizedEvent.tryoutId,
                  paymentStatus: 'pending',
                  paymentComplete: false,
                  registrationDate: new Date(),
                },
              ],
              paymentComplete: p.paymentComplete || false,
              paymentStatus: p.paymentStatus || 'pending',
            })),
          ];

          return {
            ...prev,
            players: updatedPlayers,
            payment: calculatePayments(selectedPlayerIds.length),
          };
        });

        setCurrentStep(2);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setPaymentError(
        error instanceof Error
          ? error.message
          : 'Registration failed. Please try again.'
      );
    } finally {
      setIsProcessingRegistration(false);
    }
  };

  const handleCardTokenized = async (tokenResult: any) => {
    setIsProcessing(true);
    setPaymentError(null);

    try {
      if (tokenResult.status !== 'OK') {
        throw new Error(tokenResult.errors?.[0]?.message || 'Payment failed');
      }

      const token = tokenResult.token;
      const cardDetails = tokenResult.details?.card;

      // Store the actual data before payment processing
      const actualPlayerCount = selectedPlayerIds.length;
      const actualAmount = formData.payment.amount;

      // Log initial state for debugging
      console.log('Before payment processing:', {
        selectedPlayerIds,
        actualPlayerCount,
        actualAmount,
        customerEmail,
      });

      if (actualPlayerCount === 0) {
        // Fetch recent registrations to recover player data
        const recentRegistrationsResponse = await fetch(
          `${API_BASE_URL}/registrations/by-parent/${currentUser?._id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );
        if (recentRegistrationsResponse.ok) {
          const registrations = await recentRegistrationsResponse.json();
          const relevantRegistrations = registrations.filter(
            (reg: any) =>
              reg.season === memoizedEvent.season &&
              reg.year === memoizedEvent.year &&
              reg.tryoutId === memoizedEvent.tryoutId &&
              reg.paymentComplete
          );
          if (relevantRegistrations.length > 0) {
            const recoveredPlayerIds = relevantRegistrations.map(
              (reg: any) => reg.player
            );
            setSelectedPlayerIds(recoveredPlayerIds);
            setFormData((prev) => ({
              ...prev,
              payment: calculatePayments(recoveredPlayerIds.length),
            }));
            console.log('Recovered player IDs:', recoveredPlayerIds);
          }
        }
      }

      const paymentData = {
        token: token,
        sourceId: token,
        amount:
          formData.payment.amountInCents || selectedPlayerIds.length * 105000,
        currency: 'USD',
        email: customerEmail,
        players: selectedPlayerIds.map((playerId) => ({
          playerId: playerId,
          season: tryoutEvent.season,
          year: Number(tryoutEvent.year),
          tryoutId: tryoutEvent.tryoutId,
        })),
        cardDetails: {
          last_4: cardDetails?.last4 || '',
          card_brand: cardDetails?.brand || '',
          exp_month: cardDetails?.expMonth || '',
          exp_year: cardDetails?.expYear || '',
        },
      };

      const response = await fetch(`${API_BASE_URL}/payments/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment processing failed');
      }

      const result = await response.json();
      console.log('Payment API response:', JSON.stringify(result, null, 2));

      // Extract player count and amount from the API response, with fallbacks
      const paidPlayers = Array.isArray(result.players) ? result.players : [];
      const paidPlayerCount =
        paidPlayers.length || selectedPlayerIds.length || 1;
      const paidAmount = result.amount
        ? result.amount / 100
        : (selectedPlayerIds.length || 1) * 1050;
      const paidEmail = result.email || customerEmail;

      // Log extracted values for debugging
      console.log('Extracted values:', {
        paidPlayers,
        paidPlayerCount,
        paidAmount,
        paidEmail,
      });

      // Store success data
      setSuccessData({
        playerCount: paidPlayerCount,
        totalAmount: paidAmount,
        customerEmail: paidEmail,
      });

      console.log('Success data set:', {
        playerCount: paidPlayerCount,
        totalAmount: paidAmount,
        customerEmail: paidEmail,
      });

      // Update formData with the paid players
      setFormData((prev) => ({
        ...prev,
        players: prev.players.map((p) => {
          const updatedPlayer = paidPlayers.find((up: any) => up._id === p._id);
          return updatedPlayer
            ? {
                ...p,
                seasons: updatedPlayer.seasons || p.seasons,
                paymentComplete:
                  updatedPlayer.paymentComplete ?? p.paymentComplete,
                paymentStatus: updatedPlayer.paymentStatus ?? p.paymentStatus,
              }
            : p;
        }),
        payment: {
          ...prev.payment,
          playerCount: paidPlayerCount,
          amount: paidAmount,
          amountInCents: paidAmount * 100,
        },
      }));

      // Update existingPlayersState to reflect payment status
      setExistingPlayersState((prev) =>
        prev.map((p) => {
          const updatedPlayer = paidPlayers.find((up: any) => up._id === p._id);
          return updatedPlayer
            ? {
                ...p,
                seasons: updatedPlayer.seasons || p.seasons,
                paymentComplete:
                  updatedPlayer.paymentComplete ?? p.paymentComplete,
                paymentStatus: updatedPlayer.paymentStatus ?? p.paymentStatus,
              }
            : p;
        })
      );

      // Move to confirmation step
      setIsSubmitted(true);
      setCurrentStep(3);
      console.log('Final state - isSubmitted:', true, 'currentStep:', 3);
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError(
        error instanceof Error ? error.message : 'Payment processing failed'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const renderRegistrationStep = () => {
    if (isLoading && isExistingUser) {
      return (
        <div className='text-center py-4'>
          <LoadingSpinner />
          <p>Loading player information...</p>
        </div>
      );
    }

    if (isExistingUser && existingPlayersState.length > 0) {
      const qualifiedPlayers = existingPlayersState.filter((player) =>
        player.seasons?.some(
          (s) =>
            s.season === 'Basketball Select Tryout' &&
            s.year === memoizedEvent.year &&
            s.tryoutId === 'basketballselect-tryout'
        )
      );

      return (
        <div className='card'>
          <div className='card-header bg-light'>
            <h4>🏀 Congratulations! You Made the Team!</h4>
          </div>
          <div className='card-body'>
            <div className='alert alert-success mb-4'>
              <p className='mb-3'>
                We're excited to welcome you to the Partizan Basketball Team!
                Your hard work and dedication during tryouts have earned you a
                spot on our roster, and we can't wait to see you compete this
                season.
              </p>
              <p>
                ✨ Being part of Partizan means joining a community that values
                growth, teamwork, and excellence—on and off the court. Alongside
                league play, you'll also have access to specialized training
                sessions designed to sharpen your skills and elevate your game.
              </p>
              <p>
                More details about team schedules, practices, and next steps
                will be shared soon. For now—celebrate this achievement and get
                ready for an incredible season ahead!
              </p>
            </div>

            <form onSubmit={handleRegistrationSubmit}>
              <div className='mb-4'>
                <h5>Select Players for Basketball Select Team</h5>
                <p>
                  Choose which qualified players you want to register for the{' '}
                  <strong>Basketball Select Team</strong>:
                </p>

                {qualifiedPlayers.map((player) => {
                  const matchingSeason = player.seasons?.find(
                    (s) =>
                      s.season === memoizedEvent.season &&
                      s.year === memoizedEvent.year &&
                      s.tryoutId === memoizedEvent.tryoutId
                  );
                  const isRegistered = !!matchingSeason;
                  const isPaid = matchingSeason?.paymentStatus === 'paid';
                  const isSelected = selectedPlayerIds.includes(player._id!);

                  return (
                    <div
                      key={player._id}
                      className='mb-3 p-3 border rounded'
                      style={{ padding: '10px' }}
                    >
                      <div className='form-check d-flex align-items-center'>
                        <input
                          type='checkbox'
                          className='form-check-input me-2'
                          id={`player-${player._id}`}
                          checked={isSelected}
                          onChange={() => handlePlayerSelection(player._id!)}
                          disabled={isPaid}
                        />
                        <label
                          className='form-check-label d-flex justify-content-between align-items-center w-100'
                          htmlFor={`player-${player._id}`}
                        >
                          <div>
                            <span className='h6'>
                              {player.fullName} (Grade: {player.grade})
                            </span>
                            {isPaid ? (
                              <span className='badge bg-success ms-2'>
                                ✅ Registered & Paid
                              </span>
                            ) : isRegistered ? (
                              <span className='badge bg-warning ms-2'>
                                ⏳ Registered, Awaiting Payment
                              </span>
                            ) : (
                              <span className='badge bg-primary ms-2'>
                                🏀 Qualified - Ready to Register
                              </span>
                            )}
                          </div>
                          {!isPaid && (
                            <div className='text-end ms-auto'>
                              <div className='h6 text-primary'>$1050</div>
                              <div className='text-muted small'>Team Fee</div>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  );
                })}

                {qualifiedPlayers.length === 0 && (
                  <div className='alert alert-info'>
                    <p>
                      No qualified players found. If you believe this is an
                      error, please contact us.
                    </p>
                  </div>
                )}
              </div>

              {selectedPlayerIds.length > 0 && (
                <div className='card bg-light'>
                  <div className='card-body'>
                    <h6>Payment Summary</h6>
                    <p>
                      <strong>Selected Players:</strong>{' '}
                      {selectedPlayerIds.length}
                    </p>
                    <p>
                      <strong>Fee per Player:</strong> $1050
                    </p>
                    <p className='h5 text-primary'>
                      <strong>Total Amount:</strong> ${formData.payment.amount}
                    </p>
                  </div>
                </div>
              )}

              <div className='d-grid mt-4'>
                <button
                  type='submit'
                  className='btn btn-primary btn-lg'
                  disabled={
                    isProcessingRegistration || selectedPlayerIds.length === 0
                  }
                >
                  {isProcessingRegistration ? (
                    <>
                      <span className='spinner-border spinner-border-sm me-2'></span>
                      Processing Registration...
                    </>
                  ) : selectedPlayerIds.length > 0 ? (
                    `Continue to Payment - $${formData.payment.amount}`
                  ) : (
                    'Select Players to Continue'
                  )}
                </button>
                {selectedPlayerIds.length === 0 && (
                  <div className='text-danger small mt-2'>
                    Please select at least one player to continue
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      );
    }

    // For new users (shouldn't happen in this flow, but keeping as fallback)
    return (
      <div className='card'>
        <div className='card-header bg-light'>
          <h4>Basketball Select Team Registration</h4>
        </div>
        <div className='card-body'>
          <div className='alert alert-info'>
            <p>
              This registration is for players who have qualified through
              tryouts.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderPaymentStep = () => {
    const playerCount = selectedPlayerIds.length;
    const totalAmount = formData.payment.amount;

    if (playerCount === 0) {
      setCurrentStep(1);
      return null;
    }

    return (
      <>
        <div className='alert alert-success mb-4'>
          <h4>Complete Your Basketball Select Team Payment</h4>
          <p className='mb-0'>
            Almost there! Complete your payment to secure {playerCount} spot
            {playerCount !== 1 ? 's' : ''} on the team.
          </p>
        </div>

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
                <h5>Team Registration Fee</h5>
                <div className='card bg-light'>
                  <div className='card-body'>
                    <p>
                      <strong>Players Selected:</strong> {playerCount}
                    </p>
                    <p>
                      <strong>Fee per Player:</strong> $1050
                    </p>
                    <p className='h5 text-primary'>
                      <strong>Total Amount:</strong> ${totalAmount}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className='mb-3'>
              <label className='form-label'>Email for Receipt</label>
              <input
                type='email'
                className='form-control'
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
              />
              {!customerEmail && (
                <div className='text-danger small'>
                  Email is required for your receipt
                </div>
              )}
            </div>

            <div className='payment-form-container'>
              {!isSubmitted ? (
                <PaymentForm
                  applicationId={appId}
                  locationId={locationId}
                  cardTokenizeResponseReceived={handleCardTokenized}
                  createPaymentRequest={() => ({
                    countryCode: 'US',
                    currencyCode: 'USD',
                    total: {
                      amount: String(calculateTotalAmount() / 100),
                      label: 'Total',
                    },
                    buyerEmailAddress: customerEmail,
                  })}
                >
                  <CreditCard />
                </PaymentForm>
              ) : null}
              <HomeModals />
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className='content content-two'>
      {isSubmitted ? (
        <div className='card-header text-center'>
          <h3>🎉 Welcome to Partizan!</h3>
          <p className='lead'>
            Registration successful for{' '}
            {successData?.playerCount ||
              formData.payment.playerCount ||
              selectedPlayerIds.length ||
              1}{' '}
            player
            {(successData?.playerCount ||
              formData.payment.playerCount ||
              selectedPlayerIds.length ||
              1) !== 1
              ? 's'
              : ''}{' '}
            for the <strong>Basketball Select Team</strong>
          </p>
          <div className='confirmation-details mt-4'>
            <p>
              <strong>Email for receipt:</strong>{' '}
              {successData?.customerEmail || customerEmail}
            </p>
            <p>
              <strong>Team Fee per player:</strong> $1050
            </p>
            <p>
              <strong>Number of players:</strong>{' '}
              {successData?.playerCount ||
                formData.payment.playerCount ||
                selectedPlayerIds.length ||
                1}
            </p>
            <p>
              <strong>Total amount:</strong> $
              {successData?.totalAmount ||
                formData.payment.amount ||
                (selectedPlayerIds.length || 1) * 1050}
            </p>
          </div>
          <div className='alert alert-success mt-4'>
            <h5>Next Steps:</h5>
            <p className='mb-0'>
              You will receive a welcome email with team details, practice
              schedules, and coach information shortly. Welcome to the Bothell
              Select Team!
            </p>
          </div>
        </div>
      ) : (
        <>
          <h3 className='mb-3'>🏀 Basketball Select Team Registration</h3>
          <div className='progress mb-4' style={{ height: '10px' }}>
            <div
              className='progress-bar bg-success'
              role='progressbar'
              style={{ width: `${(currentStep / 2) * 100}%` }}
              aria-valuenow={currentStep}
              aria-valuemin={1}
              aria-valuemax={2}
            ></div>
          </div>

          <div className='d-flex justify-content-between mb-4'>
            <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
              <span className='step-title'>Team Registration</span>
            </div>
            <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
              <span className='step-title'>Payment</span>
            </div>
          </div>

          {currentStep === 1 && renderRegistrationStep()}
          {currentStep === 2 && renderPaymentStep()}
        </>
      )}
    </div>
  );
};

export default RegistrationForm;
