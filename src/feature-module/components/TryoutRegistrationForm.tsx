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
import {
  calculateGradeFromDOB,
  getOrdinalSuffix,
} from '../../utils/gradeUtils';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { number } from 'framer-motion';

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
  isGradeOverridden?: boolean;
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

interface TryoutRegistrationFormProps {
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

const TryoutRegistrationForm: React.FC<TryoutRegistrationFormProps> = ({
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

  const memoizedTryoutEvent = useMemo(
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
            isGradeOverridden: false,
          },
        ],
    agreeToTerms: false,
    additionalGuardians: [],
    payment: {
      amount: 20,
      amountInCents: 2000,
      playerCount: 1,
      perPlayerAmount: 20,
      breakdown: {
        basePrice: 20,
        subtotal: 20,
        total: 20,
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
              s.season === memoizedTryoutEvent.season &&
              s.year === memoizedTryoutEvent.year &&
              s.tryoutId === memoizedTryoutEvent.tryoutId
          );
          // Use season fields, fall back to top-level if undefined
          const isPaid = matchingSeason
            ? matchingSeason.paymentStatus === 'paid'
            : player.paymentStatus === 'paid';
          return isPaid;
        });
    },
    [
      memoizedTryoutEvent.season,
      memoizedTryoutEvent.year,
      memoizedTryoutEvent.tryoutId,
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

        // Filter players registered for the current tryout
        const tryoutPlayers = players.filter((p) =>
          p.seasons?.some(
            (s) =>
              s.season === memoizedTryoutEvent.season &&
              s.year === memoizedTryoutEvent.year &&
              s.tryoutId === memoizedTryoutEvent.tryoutId
          )
        );

        // Log player data for debugging
        players.forEach((p) => {
          const matchingSeason = p.seasons?.find(
            (s) =>
              s.season === memoizedTryoutEvent.season &&
              s.year === memoizedTryoutEvent.year &&
              s.tryoutId === memoizedTryoutEvent.tryoutId
          );
          console.log(`Player ${p.fullName}:`, {
            topLevelPaymentComplete: p.paymentComplete,
            topLevelPaymentStatus: p.paymentStatus,
            seasonPaymentStatus: matchingSeason?.paymentStatus,
            seasonPaymentComplete: matchingSeason?.paymentComplete,
          });
        });

        // Select unpaid players for the current tryout
        const unpaidTryoutPlayers = tryoutPlayers.filter((p) => {
          const matchingSeason = p.seasons?.find(
            (s) =>
              s.season === memoizedTryoutEvent.season &&
              s.year === memoizedTryoutEvent.year &&
              s.tryoutId === memoizedTryoutEvent.tryoutId
          );
          return matchingSeason?.paymentStatus !== 'paid';
        });

        const selectedIds = unpaidTryoutPlayers.map((p) => p._id!);
        setSelectedPlayerIds(selectedIds);

        // Update formData.players with the latest player data
        setFormData((prev) => ({
          ...prev,
          players: players.map((p) => {
            const hasMatchingSeason = p.seasons?.some(
              (s) =>
                s.season === memoizedTryoutEvent.season &&
                s.year === memoizedTryoutEvent.year &&
                s.tryoutId === memoizedTryoutEvent.tryoutId
            );
            return {
              _id: p._id,
              fullName: p.fullName,
              gender: p.gender,
              dob: p.dob,
              schoolName: p.schoolName,
              grade: p.grade,
              isGradeOverridden: p.isGradeOverridden || false,
              healthConcerns: p.healthConcerns || '',
              aauNumber: p.aauNumber || '',
              registrationYear: memoizedTryoutEvent.year,
              season: memoizedTryoutEvent.season,
              seasons: hasMatchingSeason
                ? p.seasons
                : [
                    ...(p.seasons || []),
                    {
                      season: memoizedTryoutEvent.season,
                      year: memoizedTryoutEvent.year,
                      tryoutId: memoizedTryoutEvent.tryoutId,
                      paymentStatus: 'pending',
                      paymentComplete: false,
                      registrationDate: new Date(),
                    },
                  ],
              paymentComplete: p.paymentComplete,
              paymentStatus: p.paymentStatus,
            };
          }),
          payment: calculatePayments(
            players.filter((p) => {
              const matchingSeason = p.seasons?.find(
                (s) =>
                  s.season === memoizedTryoutEvent.season &&
                  s.year === memoizedTryoutEvent.year &&
                  s.tryoutId === memoizedTryoutEvent.tryoutId
              );
              return (
                !matchingSeason || matchingSeason?.paymentStatus !== 'paid'
              );
            }).length
          ),
        }));

        // Log the initial state for debugging
        console.log('Initial state:', {
          tryoutPlayers,
          unpaidTryoutPlayers,
          selectedPlayerIds: selectedIds,
          formDataPlayers: tryoutPlayers.map((p) => ({
            fullName: p.fullName,
            seasons: p.seasons,
          })),
        });

        // Check if all registered players are paid
        const allRegistered = tryoutPlayers.length > 0;
        const allPaid = checkAllPlayersPaid(tryoutPlayers);

        if (allRegistered && allPaid && selectedIds.length > 0) {
          setCurrentStep(3);
          setIsSubmitted(true);
        } else if (skipToPayment && unpaidTryoutPlayers.length > 0) {
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
  }, [isExistingUser, currentUser?._id, memoizedTryoutEvent, skipToPayment]);

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

  const addPlayer = () => {
    setShowNewPlayerForm(true);
    setFormData({
      ...formData,
      players: [
        ...formData.players,
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
      payment: calculatePayments(
        isExistingUser
          ? selectedPlayerIds.length + 1
          : formData.players.length + 1
      ),
    });
  };

  const removePlayer = (index: number) => {
    const updatedPlayers = [...formData.players];
    updatedPlayers.splice(index, 1);
    setFormData({ ...formData, players: updatedPlayers });
    if (updatedPlayers.every((p) => p._id)) {
      setShowNewPlayerForm(false);
    }
  };

  const handleBlur = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'email' && !validateEmail(value)) {
      console.error('Please enter a valid email address.');
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (name === 'email') {
      setFormData({ ...formData, [name]: value.toLowerCase() });
      setCustomerEmail(value.toLowerCase());
    } else if (name === 'phone') {
      setFormData({ ...formData, [name]: formatPhoneNumber(value) });
    } else if (name === 'address') {
      const parsed = parseAddress(value);
      setFormData({ ...formData, address: parsed });
    } else if (name === 'isCoach') {
      setFormData({ ...formData, isCoach: checked });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
  };

  const handleAdditionalGuardianChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (name === 'email') {
      setAdditionalGuardianData({
        ...additionalGuardianData,
        [name]: value.toLowerCase(),
      });
    } else if (name === 'phone') {
      setAdditionalGuardianData({
        ...additionalGuardianData,
        [name]: formatPhoneNumber(value),
      });
    } else if (name === 'address') {
      const parsed = parseAddress(value);
      setAdditionalGuardianData({ ...additionalGuardianData, address: parsed });
    } else if (name === 'isCoach') {
      setAdditionalGuardianData({
        ...additionalGuardianData,
        isCoach: checked,
      });
    } else {
      setAdditionalGuardianData({
        ...additionalGuardianData,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
  };

  const handlePlayerChange = (
    index: number,
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const updatedPlayers = [...formData.players];
    updatedPlayers[index] = { ...updatedPlayers[index], [name]: value };
    setFormData({ ...formData, players: updatedPlayers });
  };

  const handlePlayerDobChange = (index: number, date: Date | null) => {
    if (!date) return;

    const isoString = storeDateAsUTC(date);
    const updatedPlayers = [...formData.players];

    // Only auto-calculate grade if not manually overridden
    if (!updatedPlayers[index].isGradeOverridden) {
      const calculatedGrade = calculateGradeFromDOB(date, tryoutEvent.year);
      updatedPlayers[index] = {
        ...updatedPlayers[index],
        dob: isoString,
        grade: calculatedGrade,
      };
    } else {
      updatedPlayers[index] = {
        ...updatedPlayers[index],
        dob: isoString,
      };
    }

    setFormData({ ...formData, players: updatedPlayers });
  };

  const handleGradeOverride = (index: number) => {
    const updatedPlayers = [...formData.players];
    updatedPlayers[index] = {
      ...updatedPlayers[index],
      isGradeOverridden: true,
    };
    setFormData({ ...formData, players: updatedPlayers });
  };

  const getLocalDateFromUTCString = (utcString: string): Date | null => {
    if (!utcString) return null;

    try {
      const date = new Date(utcString);
      if (isNaN(date.getTime())) return null;

      return new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate()
      );
    } catch {
      return null;
    }
  };

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const handlePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds((prev) => {
      const newSelectedIds = prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId];

      const totalPlayers =
        newSelectedIds.length + formData.players.filter((p) => !p._id).length;

      setFormData((prev) => ({
        ...prev,
        payment: calculatePayments(totalPlayers),
      }));

      return newSelectedIds;
    });
  };

  const calculatePayments = (playerCount: number) => {
    const perPlayerAmount = 20;
    const basePrice = perPlayerAmount * playerCount;

    return {
      amount: basePrice,
      amountInCents: basePrice * 100,
      playerCount,
      perPlayerAmount,
      breakdown: {
        basePrice,
        subtotal: basePrice,
        total: basePrice,
      },
    };
  };

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      payment: calculatePayments(
        isExistingUser ? selectedPlayerIds.length : prev.players.length
      ),
    }));
  }, [selectedPlayerIds.length, formData.players.length, isExistingUser]);

  const handleRegistrationSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessingRegistration(true);
    setPaymentError(null);
    setValidationErrors({});

    try {
      const errors: Record<string, string> = {};

      if (!isExistingUser) {
        // Existing validation for new users (unchanged)
        try {
          const emailCheckResponse = await fetch(
            `${API_BASE_URL}/check-email`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: formData.email }),
            }
          );

          if (!emailCheckResponse.ok) {
            const errorData = await emailCheckResponse.json();
            errors.email = errorData.message;
          }
        } catch (error) {
          console.error('Email check error:', error);
          errors.email = 'Failed to check email availability';
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

        if (!validateName(formData.fullName)) {
          errors.fullName =
            'Please enter a valid full name (minimum 2 characters)';
        }

        if (!validateRequired(formData.relationship)) {
          errors.relationship = 'Relationship to player is required';
        }

        if (!validatePhoneNumber(formData.phone)) {
          errors.phone = 'Please enter a valid 10-digit phone number';
        }

        if (!validateRequired(formData.address.street)) {
          errors.address = 'Street address is required';
        }

        if (!validateRequired(formData.address.city)) {
          errors.address = 'City is required';
        }

        if (!validateState(formData.address.state)) {
          errors.addressState = 'Please enter a valid 2-letter state code';
        }

        if (!validateZipCode(formData.address.zip)) {
          errors.addressZip = 'Please enter a valid ZIP code';
        }
      }

      // Validate player selection for existing users
      if (
        isExistingUser &&
        selectedPlayerIds.length === 0 &&
        !formData.players.some((p) => !p._id)
      ) {
        errors.players =
          'Please select at least one existing player or add a new player';
      }

      // Validate new players
      if (!isExistingUser || formData.players.some((p) => !p._id)) {
        formData.players.forEach((player, index) => {
          if (!player._id) {
            const playerPrefix = `player${index}`;

            if (!validateName(player.fullName)) {
              errors[`${playerPrefix}FullName`] =
                'Please enter a valid full name';
            }

            if (!validateRequired(player.gender)) {
              errors[`${playerPrefix}Gender`] = 'Gender is required';
            }

            if (!validateDateOfBirth(player.dob)) {
              errors[`${playerPrefix}Dob`] =
                'Please enter a valid date of birth';
            }

            if (!validateRequired(player.schoolName)) {
              errors[`${playerPrefix}School`] = 'School name is required';
            }

            if (!validateGrade(player.grade)) {
              errors[`${playerPrefix}Grade`] =
                'Please select a valid grade (1-12)';
            }
          }
        });
      }

      // Additional guardian validation (unchanged)
      if (additionalGuardian) {
        if (!validateName(additionalGuardianData.fullName)) {
          errors.additionalGuardianFullName =
            'Please enter a valid full name for additional guardian';
        }

        if (!validateRequired(additionalGuardianData.relationship)) {
          errors.additionalGuardianRelationship =
            'Relationship to player is required for additional guardian';
        }

        if (!validatePhoneNumber(additionalGuardianData.phone)) {
          errors.additionalGuardianPhone =
            'Please enter a valid phone number for additional guardian';
        }

        if (!validateEmail(additionalGuardianData.email)) {
          errors.additionalGuardianEmail =
            'Please enter a valid email for additional guardian';
        }

        if (
          JSON.stringify(additionalGuardianData.address) !==
          JSON.stringify(formData.address)
        ) {
          if (!validateRequired(additionalGuardianData.address.street)) {
            errors.additionalGuardianAddress =
              'Street address is required for additional guardian';
          }

          if (!validateRequired(additionalGuardianData.address.city)) {
            errors.additionalGuardianAddress =
              'City is required for additional guardian';
          }

          if (!validateState(additionalGuardianData.address.state)) {
            errors.additionalGuardianAddressState =
              'Please enter a valid 2-letter state code for additional guardian';
          }

          if (!validateZipCode(additionalGuardianData.address.zip)) {
            errors.additionalGuardianAddressZip =
              'Please enter a valid ZIP code for additional guardian';
          }
        }
      }

      if (!isExistingUser && !formData.agreeToTerms) {
        errors.agreeToTerms = 'You must agree to the terms and conditions';
      }

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setIsProcessingRegistration(false);
        return;
      }

      const yearAsNumber = Number(tryoutEvent.year);
      if (isNaN(yearAsNumber)) {
        throw new Error(`Invalid year value: ${tryoutEvent.year}`);
      }

      if (isExistingUser) {
        const registeredPlayers: Player[] = [];
        const existingRegisteredPlayers: Player[] = [];

        // Check for existing players already registered
        for (const player of formData.players.filter((p) => !p._id)) {
          const existingPlayer = existingPlayersState.find(
            (ep) =>
              ep.fullName.toLowerCase() === player.fullName.toLowerCase() &&
              ep.seasons?.some(
                (s) =>
                  s.season === memoizedTryoutEvent.season &&
                  s.year === memoizedTryoutEvent.year &&
                  s.tryoutId === memoizedTryoutEvent.tryoutId
              )
          );

          if (existingPlayer) {
            existingRegisteredPlayers.push(existingPlayer);
            continue; // Skip registration for already registered players
          }

          const requestBody = {
            ...player,
            year: yearAsNumber,
            parentId: currentUser?._id,
            tryoutId: memoizedTryoutEvent.tryoutId,
            season: memoizedTryoutEvent.season,
            seasons: [
              {
                season: memoizedTryoutEvent.season,
                year: yearAsNumber,
                tryoutId: memoizedTryoutEvent.tryoutId,
                paymentStatus: 'pending',
                paymentComplete: false,
                registrationDate: new Date(),
              },
            ],
          };
          console.log('Request body for /players/register:', requestBody);

          try {
            const response = await fetch(`${API_BASE_URL}/players/register`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
              body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error('Player registration error:', errorData);
              if (
                errorData.message?.includes(
                  'is already registered for this tryout'
                )
              ) {
                // Handle case where player is already registered
                const existingPlayer = existingPlayersState.find(
                  (ep) =>
                    ep.fullName.toLowerCase() === player.fullName.toLowerCase()
                );
                if (existingPlayer) {
                  existingRegisteredPlayers.push(existingPlayer);
                  continue;
                }
              }
              throw new Error(
                errorData.message ||
                  `Player ${player.fullName} registration failed`
              );
            }

            const newPlayer = await response.json();
            console.log('Player registration response:', newPlayer);
            registeredPlayers.push(newPlayer.player || newPlayer);
          } catch (error) {
            console.error('Registration attempt error:', error);
            if (
              error instanceof Error &&
              error.message.includes('is already registered for this tryout')
            ) {
              const existingPlayer = existingPlayersState.find(
                (ep) =>
                  ep.fullName.toLowerCase() === player.fullName.toLowerCase()
              );
              if (existingPlayer) {
                existingRegisteredPlayers.push(existingPlayer);
                continue;
              }
            }
            throw error;
          }
        }

        // Update formData with both new and existing registered players
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
              season: memoizedTryoutEvent.season,
              seasons: p.seasons || [
                {
                  season: memoizedTryoutEvent.season,
                  year: yearAsNumber,
                  tryoutId: memoizedTryoutEvent.tryoutId,
                  paymentStatus: 'pending',
                  paymentComplete: false,
                  registrationDate: new Date(),
                },
              ],
              paymentComplete: p.paymentComplete || false,
              paymentStatus: p.paymentStatus || 'pending',
            })),
            ...existingRegisteredPlayers.map((p) => ({
              _id: p._id,
              fullName: p.fullName,
              gender: p.gender,
              dob: p.dob,
              schoolName: p.schoolName,
              grade: p.grade,
              healthConcerns: p.healthConcerns || '',
              aauNumber: p.aauNumber || '',
              registrationYear: yearAsNumber,
              season: memoizedTryoutEvent.season,
              seasons: p.seasons,
              paymentComplete: p.paymentComplete || false,
              paymentStatus: p.paymentStatus || 'pending',
            })),
          ];

          const unpaidPlayers = updatedPlayers.filter((p) => {
            const matchingSeason = p.seasons?.find(
              (s) =>
                s.season === memoizedTryoutEvent.season &&
                s.year === memoizedTryoutEvent.year &&
                s.tryoutId === memoizedTryoutEvent.tryoutId
            );
            return !matchingSeason || matchingSeason.paymentStatus !== 'paid';
          });

          return {
            ...prev,
            players: updatedPlayers,
            payment: calculatePayments(unpaidPlayers.length),
          };
        });

        // Update selectedPlayerIds with both new and existing registered players
        setSelectedPlayerIds((prev) => {
          const updatedIds = [
            ...prev,
            ...registeredPlayers
              .filter((p) => p._id !== undefined)
              .map((p) => p._id as string),
            ...existingRegisteredPlayers
              .filter((p) => p._id !== undefined)
              .map((p) => p._id as string),
          ].filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates
          console.log('Updated selectedPlayerIds after registration:', {
            newPlayerIds: registeredPlayers.map((p) => ({
              _id: p._id,
              fullName: p.fullName,
            })),
            existingRegisteredPlayerIds: existingRegisteredPlayers.map((p) => ({
              _id: p._id,
              fullName: p.fullName,
            })),
            selectedPlayerIds: updatedIds,
            formDataPlayers: updatedIds.map((id) => {
              const player = [
                ...formData.players.filter((p) => p._id),
                ...registeredPlayers,
                ...existingRegisteredPlayers,
              ].find((p) => p._id === id);
              return {
                _id: player?._id,
                fullName: player?.fullName,
                seasons: player?.seasons,
              };
            }),
          });
          return updatedIds;
        });

        // Determine unpaid players for payment step
        const allPlayers = [
          ...formData.players.filter((p) => p._id),
          ...registeredPlayers,
          ...existingRegisteredPlayers,
        ];
        const unpaidPlayers = allPlayers.filter((p) => {
          const matchingSeason = p.seasons?.find(
            (s) =>
              s.season === memoizedTryoutEvent.season &&
              s.year === memoizedTryoutEvent.year &&
              s.tryoutId === memoizedTryoutEvent.tryoutId
          );
          return !matchingSeason || matchingSeason.paymentStatus !== 'paid';
        });

        console.log('Post-registration state:', {
          registeredPlayers: registeredPlayers.map((p) => ({
            _id: p._id,
            fullName: p.fullName,
            seasons: p.seasons,
            paymentStatus: p.paymentStatus,
            paymentComplete: p.paymentComplete,
          })),
          existingRegisteredPlayers: existingRegisteredPlayers.map((p) => ({
            _id: p._id,
            fullName: p.fullName,
            seasons: p.seasons,
            paymentStatus: p.paymentStatus,
            paymentComplete: p.paymentComplete,
          })),
          selectedPlayerIds,
          unpaidPlayers: unpaidPlayers.map((p) => ({
            _id: p._id,
            fullName: p.fullName,
            seasons: p.seasons,
          })),
          formDataPlayers: formData.players.map((p) => ({
            _id: p._id,
            fullName: p.fullName,
            seasons: p.seasons,
          })),
        });

        setCurrentStep(unpaidPlayers.length > 0 ? 2 : 3);
        if (unpaidPlayers.length === 0) {
          setIsSubmitted(true);
        }
      } else {
        const registrationData = {
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          relationship: formData.relationship,
          phone: formData.phone,
          address: formData.address,
          isCoach: formData.isCoach,
          aauNumber: formData.aauNumber,
          players: formData.players.map((player) => ({
            ...player,
            year: yearAsNumber,
            seasons: [
              {
                season: tryoutEvent.season,
                year: yearAsNumber,
                tryoutId: tryoutEvent.tryoutId,
                paymentStatus: 'pending',
              },
            ],
          })),
          agreeToTerms: formData.agreeToTerms,
          additionalGuardians: additionalGuardian
            ? [
                {
                  fullName: additionalGuardianData.fullName,
                  relationship: additionalGuardianData.relationship,
                  phone: additionalGuardianData.phone,
                  email: additionalGuardianData.email,
                  address: additionalGuardianData.address,
                  isCoach: additionalGuardianData.isCoach,
                  aauNumber: additionalGuardianData.isCoach
                    ? additionalGuardianData.aauNumber
                    : '',
                },
              ]
            : [],
        };

        const response = await fetch(
          `${API_BASE_URL}/register/basketball-camp`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationData),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Registration failed');
        }

        const responseData = await response.json();

        if (responseData.token && responseData.parent?.id) {
          localStorage.setItem('token', responseData.token);
          localStorage.setItem('parentId', responseData.parent.id);
          localStorage.setItem('userEmail', formData.email);

          const registeredPlayers = responseData.players || [];
          setFormData((prev) => ({
            ...prev,
            players: registeredPlayers.map((p: Player) => ({
              ...p,
              _id: p._id,
              parentId: responseData.parent.id,
              registrationYear: yearAsNumber,
              season: tryoutEvent.season,
              seasons: p.seasons,
            })),
            payment: calculatePayments(registeredPlayers.length),
          }));

          setSelectedPlayerIds(
            registeredPlayers
              .filter((p: Player) => p._id !== undefined)
              .map((p: Player) => p._id as string)
          );

          setCurrentStep(2);
        } else {
          throw new Error('Parent registration data missing from response');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setPaymentError(
        error instanceof Error
          ? error.message
          : 'Registration failed. Please check the year field and try again.'
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

      // Filter unpaid players for the current tryout
      const unpaidPlayers = formData.players.filter((p) =>
        p.seasons?.some(
          (s) =>
            s.season === tryoutEvent.season &&
            s.year === tryoutEvent.year &&
            s.tryoutId === tryoutEvent.tryoutId &&
            s.paymentStatus !== 'paid'
        )
      );

      const paymentData = {
        token,
        sourceId: token,
        amount: formData.payment.amountInCents,
        currency: 'USD',
        email: customerEmail,
        players: unpaidPlayers
          .filter((p) => p._id && selectedPlayerIds.includes(p._id))
          .map((player) => ({
            playerId: player._id,
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

      console.log('Payment data sent:', {
        paymentData: {
          ...paymentData,
          players: paymentData.players.map((p) => ({
            playerId: p.playerId,
            season: p.season,
            year: p.year,
            tryoutId: p.tryoutId,
          })),
        },
        selectedPlayerIds,
        unpaidPlayers: unpaidPlayers.map((p) => ({
          _id: p._id,
          fullName: p.fullName,
          seasons: p.seasons?.map((s) => ({
            season: s.season,
            year: s.year,
            tryoutId: s.tryoutId,
            paymentStatus: s.paymentStatus,
          })),
        })),
        formDataPlayers: formData.players.map((p) => ({
          _id: p._id,
          fullName: p.fullName,
          seasons: p.seasons?.map((s) => ({
            season: s.season,
            year: s.year,
            tryoutId: s.tryoutId,
            paymentStatus: s.paymentStatus,
          })),
        })),
      });

      if (paymentData.players.length === 0) {
        throw new Error(
          'No unpaid players selected for payment. Please ensure at least one player is registered and unpaid.'
        );
      }

      const response = await fetch(`${API_BASE_URL}/payments/tryout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Payment request failed:', errorData);
        throw new Error(errorData.message || 'Payment processing failed');
      }

      const result = await response.json();

      // Update the form data with the returned player data
      setFormData((prev) => ({
        ...prev,
        players: prev.players.map((p) => {
          const updatedPlayer = result.players.find(
            (up: any) => up._id === p._id
          );
          return updatedPlayer
            ? {
                ...p,
                seasons: updatedPlayer.seasons,
                paymentComplete: updatedPlayer.paymentComplete,
                paymentStatus: updatedPlayer.paymentStatus,
              }
            : p;
        }),
      }));

      setIsSubmitted(true);
      setCurrentStep(3);
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
          {currentUser?._id && (
            <button
              className='btn btn-secondary mt-3'
              onClick={() => {
                console.warn('Manual loading override triggered');
                setIsLoading(false);
                setFormData((prev) => ({
                  ...prev,
                  players: [
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
                }));
              }}
            >
              Continue Without Player Data
            </button>
          )}
        </div>
      );
    }

    if (isExistingUser && existingPlayersState.length > 0) {
      return (
        <div className='card'>
          <div className='card-header bg-light'>
            <h4>Register for {tryoutEvent.season}</h4>
          </div>
          <div className='card-body'>
            <form onSubmit={handleRegistrationSubmit}>
              <div className='mb-4'>
                <h5>Select Players</h5>
                <p>
                  Choose which players to register for the{' '}
                  {memoizedTryoutEvent.season} tryout:
                </p>

                {existingPlayersState.map((player) => {
                  const matchingSeason = player.seasons?.find(
                    (s) =>
                      s.season === memoizedTryoutEvent.season &&
                      s.year === memoizedTryoutEvent.year &&
                      s.tryoutId === memoizedTryoutEvent.tryoutId
                  );
                  const isRegistered = !!matchingSeason;
                  const isPaid = matchingSeason?.paymentStatus === 'paid';

                  return (
                    <div key={player._id} className='form-check mb-3'>
                      <input
                        type='checkbox'
                        className='form-check-input'
                        id={`player-${player._id}`}
                        checked={selectedPlayerIds.includes(player._id!)}
                        onChange={() => handlePlayerSelection(player._id!)}
                        disabled={isPaid}
                      />
                      <label
                        className='form-check-label d-flex align-items-center'
                        htmlFor={`player-${player._id}`}
                      >
                        <span>
                          {player.fullName} (Grade: {player.grade})
                        </span>
                        {isPaid ? (
                          <span className='badge bg-success ms-2'>
                            Registered & Paid
                          </span>
                        ) : isRegistered ? (
                          <span className='badge bg-info ms-2'>
                            Registered, Awaiting Payment
                          </span>
                        ) : (
                          <span className='badge bg-secondary ms-2'>
                            Not Paid
                          </span>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>

              {validationErrors.players && (
                <div className='alert alert-danger mb-3'>
                  {validationErrors.players}
                </div>
              )}

              <div className='card'>
                <div className='card-header bg-light'>
                  <div className='d-flex align-items-center'>
                    <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                      <i className='ti ti-shirt-sport fs-16' />
                    </span>
                    <h4 className='text-dark'>Player Information</h4>
                  </div>
                </div>
                <div className='card-body pb-1 mb-4'>
                  {formData.players.map((player, index) => (
                    <div key={index} className='row mb-4'>
                      <div className='col-md-6'>
                        <div className='mb-3'>
                          <label className='form-label'>Full Name</label>
                          <input
                            type='text'
                            name='fullName'
                            className={`form-control ${
                              validationErrors[`player${index}FullName`]
                                ? 'is-invalid'
                                : ''
                            }`}
                            value={player.fullName}
                            onChange={(e) => handlePlayerChange(index, e)}
                            required
                            disabled={!!player._id && isExistingUser}
                          />
                          {validationErrors[`player${index}FullName`] && (
                            <div className='invalid-feedback'>
                              {validationErrors[`player${index}FullName`]}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className='col-md-6'>
                        <div className='mb-3'>
                          <label className='form-label'>Gender</label>
                          <select
                            name='gender'
                            className={`form-control ${
                              validationErrors[`player${index}Gender`]
                                ? 'is-invalid'
                                : ''
                            }`}
                            value={player.gender}
                            onChange={(e) => handlePlayerChange(index, e)}
                            required
                            disabled={!!player._id && isExistingUser}
                          >
                            <option value=''>Select Gender</option>
                            <option value='Male'>Male</option>
                            <option value='Female'>Female</option>
                          </select>
                          {validationErrors[`player${index}Gender`] && (
                            <div className='invalid-feedback'>
                              {validationErrors[`player${index}Gender`]}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className='col-md-6'>
                        <div className='mb-3'>
                          <label className='form-label'>Date of Birth</label>
                          <DatePicker
                            selected={
                              player.dob
                                ? getLocalDateFromUTCString(player.dob)
                                : null
                            }
                            onChange={(date) =>
                              handlePlayerDobChange(index, date)
                            }
                            dateFormat='MM/dd/yyyy'
                            placeholderText='MM/DD/YYYY'
                            className={`form-control ${
                              validationErrors[`player${index}Dob`]
                                ? 'is-invalid'
                                : ''
                            }`}
                            showYearDropdown
                            dropdownMode='select'
                            maxDate={new Date()}
                            required
                            disabled={!!player._id && isExistingUser}
                          />
                          {validationErrors[`player${index}Dob`] && (
                            <div className='invalid-feedback'>
                              {validationErrors[`player${index}Dob`]}
                            </div>
                          )}
                          {player.dob &&
                            !validationErrors[`player${index}Dob`] && (
                              <div className='text-muted small mt-1'>
                                {formatDate(player.dob)}
                              </div>
                            )}
                        </div>
                      </div>
                      <div className='col-md-6'>
                        <div className='mb-3'>
                          <label className='form-label'>School Name</label>
                          <input
                            type='text'
                            name='schoolName'
                            className={`form-control ${
                              validationErrors[`player${index}School`]
                                ? 'is-invalid'
                                : ''
                            }`}
                            value={player.schoolName}
                            onChange={(e) => handlePlayerChange(index, e)}
                            required
                            disabled={!!player._id && isExistingUser}
                          />
                          {validationErrors[`player${index}School`] && (
                            <div className='invalid-feedback'>
                              {validationErrors[`player${index}School`]}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className='col-md-6'>
                        <div className='col-md-6'>
                          <div className='mb-3'>
                            <label className='form-label'>Grade</label>
                            <select
                              name='grade'
                              className={`form-control ${
                                validationErrors[`player${index}Grade`]
                                  ? 'is-invalid'
                                  : ''
                              }`}
                              value={player.grade}
                              onChange={(e) => handlePlayerChange(index, e)}
                              required
                              disabled={!!player._id && isExistingUser}
                            >
                              <option value=''>Select Grade</option>
                              <option value='PK'>Pre-Kindergarten</option>
                              <option value='K'>Kindergarten</option>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map(
                                (grade) => (
                                  <option key={grade} value={grade.toString()}>
                                    {grade}
                                    {getOrdinalSuffix(grade.toString())} Grade
                                  </option>
                                )
                              )}
                            </select>
                            {player.dob && !player.isGradeOverridden && (
                              <div className='text-muted small mt-1'>
                                Auto-calculated: {player.grade}
                                {getOrdinalSuffix(player.grade)} Grade
                                <button
                                  type='button'
                                  className='btn btn-link btn-sm p-0 ms-2'
                                  onClick={() => handleGradeOverride(index)}
                                >
                                  Adjust Grade
                                </button>
                              </div>
                            )}
                            {validationErrors[`player${index}Grade`] && (
                              <div className='invalid-feedback'>
                                {validationErrors[`player${index}Grade`]}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className='col-md-6'>
                        <div className='mb-3'>
                          <label className='form-label'>Health Concerns</label>
                          <input
                            type='text'
                            name='healthConcerns'
                            className='form-control'
                            value={player.healthConcerns}
                            onChange={(e) => handlePlayerChange(index, e)}
                          />
                        </div>
                      </div>
                      <div className='col-md-6'>
                        <div className='mb-3'>
                          <label className='form-label'>AAU Number</label>
                          <input
                            type='text'
                            name='aauNumber'
                            className='form-control'
                            value={player.aauNumber}
                            onChange={(e) => handlePlayerChange(index, e)}
                          />
                        </div>
                      </div>
                      {formData.players.length > 1 && (
                        <div className='col-md-12'>
                          <button
                            type='button'
                            className='btn btn-danger'
                            onClick={() => removePlayer(index)}
                          >
                            Remove Player
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    type='button'
                    className='btn btn-secondary'
                    onClick={addPlayer}
                  >
                    Register Additional Player
                  </button>
                </div>
              </div>

              <div className='d-grid'>
                <button
                  type='submit'
                  className='btn btn-primary'
                  disabled={isProcessingRegistration}
                >
                  {isProcessingRegistration ? (
                    <>
                      <span className='spinner-border spinner-border-sm me-2'></span>
                      Processing...
                    </>
                  ) : (
                    'Continue to Payment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={handleRegistrationSubmit}>
        {!isExistingUser && (
          <>
            <div className='card'>
              <div className='card-header bg-light'>
                <div className='d-flex align-items-center'>
                  <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                    <i className='ti ti-user-shield fs-16' />
                  </span>
                  <h4 className='text-dark'>Parent/Guardian Information</h4>
                </div>
              </div>
              <div className='card-body pb-1'>
                <div className='row'>
                  <div className='col-md-12'>
                    <div className='mb-3'>
                      <label className='form-label'>Email</label>
                      <input
                        type='email'
                        name='email'
                        className={`form-control ${
                          validationErrors.email ? 'is-invalid' : ''
                        }`}
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        required
                      />
                      {validationErrors.email && (
                        <div className='invalid-feedback'>
                          {validationErrors.email}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className='row'>
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
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>Full Name</label>
                      <input
                        type='text'
                        name='fullName'
                        className={`form-control ${
                          validationErrors.fullName ? 'is-invalid' : ''
                        }`}
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                      />
                      {validationErrors.fullName && (
                        <div className='invalid-feedback'>
                          {validationErrors.fullName}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>
                        Relationship to Player
                      </label>
                      <input
                        type='text'
                        name='relationship'
                        className={`form-control ${
                          validationErrors.relationship ? 'is-invalid' : ''
                        }`}
                        value={formData.relationship}
                        onChange={handleChange}
                        required
                      />
                      {validationErrors.relationship && (
                        <div className='invalid-feedback'>
                          {validationErrors.relationship}
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
                      <label className='form-label'>Address</label>
                      <input
                        type='text'
                        name='address'
                        className={`form-control ${
                          validationErrors.address ||
                          validationErrors.addressState ||
                          validationErrors.addressZip
                            ? 'is-invalid'
                            : ''
                        }`}
                        value={`${formData.address.street}${
                          formData.address.street2
                            ? ', ' + formData.address.street2
                            : ''
                        }${
                          formData.address.city
                            ? ', ' + formData.address.city
                            : ''
                        }${
                          formData.address.state
                            ? ', ' + formData.address.state
                            : ''
                        }${
                          formData.address.zip ? ' ' + formData.address.zip : ''
                        }`}
                        onChange={handleChange}
                        onBlur={(e) => {
                          const parsed = parseAddress(e.target.value);
                          setFormData({ ...formData, address: parsed });
                        }}
                        required
                      />
                      {formData.address.street && (
                        <div className='mt-2 small text-muted'>
                          {formData.address.city ? (
                            <>
                              <div className='text-success'>
                                ✓ Valid address format
                              </div>
                              <div>Street: {formData.address.street}</div>
                              {formData.address.street2 && (
                                <div>Unit: {formData.address.street2}</div>
                              )}
                              <div>City: {formData.address.city}</div>
                              <div>State: {formData.address.state}</div>
                              <div>ZIP: {formData.address.zip}</div>
                            </>
                          ) : (
                            <div className='text-warning'>
                              Couldn't parse full address. Please use format:
                              Street, City, State ZIP (123 1st St., Bothell, WA
                              98021)
                            </div>
                          )}
                        </div>
                      )}
                      {(validationErrors.address ||
                        validationErrors.addressState ||
                        validationErrors.addressZip) && (
                        <div className='invalid-feedback'>
                          {validationErrors.address ||
                            validationErrors.addressState ||
                            validationErrors.addressZip}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>
                        <input
                          type='checkbox'
                          name='isCoach'
                          checked={formData.isCoach}
                          onChange={handleChange}
                        />{' '}
                        Are you a coach?
                      </label>
                    </div>
                  </div>
                  {formData.isCoach && (
                    <div className='col-md-6'>
                      <div className='mb-3'>
                        <label className='form-label'>AAU Number</label>
                        <input
                          type='text'
                          name='aauNumber'
                          className='form-control'
                          value={formData.aauNumber}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  )}
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>
                        <input
                          type='checkbox'
                          checked={additionalGuardian}
                          onChange={(e) =>
                            setAdditionalGuardian(e.target.checked)
                          }
                        />{' '}
                        Add Additional Guardian
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {additionalGuardian && (
              <div className='card'>
                <div className='card-header bg-light'>
                  <div className='d-flex align-items-center'>
                    <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                      <i className='ti ti-user-shield fs-16' />
                    </span>
                    <h4 className='text-dark'>
                      Additional Guardian Information
                    </h4>
                  </div>
                </div>
                <div className='card-body pb-1'>
                  <div className='row'>
                    <div className='col-md-6'>
                      <div className='mb-3'>
                        <label className='form-label'>Full Name</label>
                        <input
                          type='text'
                          name='fullName'
                          className={`form-control ${
                            validationErrors.additionalGuardianFullName
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={additionalGuardianData.fullName}
                          onChange={handleAdditionalGuardianChange}
                          required
                        />
                        {validationErrors.additionalGuardianFullName && (
                          <div className='invalid-feedback'>
                            {validationErrors.additionalGuardianFullName}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className='col-md-6'>
                      <div className='mb-3'>
                        <label className='form-label'>
                          Relationship to Player
                        </label>
                        <input
                          type='text'
                          name='relationship'
                          className={`form-control ${
                            validationErrors.additionalGuardianRelationship
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={additionalGuardianData.relationship}
                          onChange={handleAdditionalGuardianChange}
                          required
                        />
                        {validationErrors.additionalGuardianRelationship && (
                          <div className='invalid-feedback'>
                            {validationErrors.additionalGuardianRelationship}
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
                            validationErrors.additionalGuardianPhone
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={additionalGuardianData.phone}
                          onChange={handleAdditionalGuardianChange}
                          maxLength={14}
                          required
                        />
                        {validationErrors.additionalGuardianPhone && (
                          <div className='invalid-feedback'>
                            {validationErrors.additionalGuardianPhone}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className='col-md-6'>
                      <div className='mb-3'>
                        <label className='form-label'>Email</label>
                        <input
                          type='email'
                          name='email'
                          className={`form-control ${
                            validationErrors.additionalGuardianEmail
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={additionalGuardianData.email}
                          onChange={handleAdditionalGuardianChange}
                          onBlur={handleBlur}
                          required
                        />
                        {validationErrors.additionalGuardianEmail && (
                          <div className='invalid-feedback'>
                            {validationErrors.additionalGuardianEmail}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className='col-md-6'>
                      <div className='mb-3'>
                        <label className='form-label'>
                          <input
                            type='checkbox'
                            checked={
                              JSON.stringify(additionalGuardianData.address) ===
                              JSON.stringify(formData.address)
                            }
                            onChange={(e) => {
                              const isSameAsParent = e.target.checked;
                              setAdditionalGuardianData({
                                ...additionalGuardianData,
                                address: isSameAsParent
                                  ? { ...formData.address }
                                  : {
                                      street: '',
                                      street2: '',
                                      city: '',
                                      state: '',
                                      zip: '',
                                    },
                              });
                            }}
                          />{' '}
                          Same as Parent Address
                        </label>
                      </div>
                    </div>
                    <div className='col-md-6'>
                      <div className='mb-3'>
                        <label className='form-label'>Address</label>
                        <input
                          type='text'
                          name='address'
                          className={`form-control ${
                            validationErrors.additionalGuardianAddress ||
                            validationErrors.additionalGuardianAddressState ||
                            validationErrors.additionalGuardianAddressZip
                              ? 'is-invalid'
                              : ''
                          }`}
                          value={`${additionalGuardianData.address.street}${
                            additionalGuardianData.address.street2
                              ? ', ' + additionalGuardianData.address.street2
                              : ''
                          }${
                            additionalGuardianData.address.city
                              ? ', ' + additionalGuardianData.address.city
                              : ''
                          }${
                            additionalGuardianData.address.state
                              ? ', ' + additionalGuardianData.address.state
                              : ''
                          }${
                            additionalGuardianData.address.zip
                              ? ' ' + additionalGuardianData.address.zip
                              : ''
                          }`}
                          onChange={handleAdditionalGuardianChange}
                          onBlur={(e) => {
                            const parsed = parseAddress(e.target.value);
                            setAdditionalGuardianData({
                              ...additionalGuardianData,
                              address: parsed,
                            });
                          }}
                          disabled={
                            JSON.stringify(additionalGuardianData.address) ===
                            JSON.stringify(formData.address)
                          }
                          required
                        />
                        {additionalGuardianData.address.street &&
                          JSON.stringify(additionalGuardianData.address) !==
                            JSON.stringify(formData.address) && (
                            <div className='mt-2 small'>
                              {validateAddress(
                                additionalGuardianData.address
                              ) ? (
                                <>
                                  <div className='text-success'>
                                    ✓ Valid address format
                                  </div>
                                  <div>
                                    Street:{' '}
                                    {additionalGuardianData.address.street}
                                  </div>
                                  {additionalGuardianData.address.street2 && (
                                    <div>
                                      Unit:{' '}
                                      {additionalGuardianData.address.street2}
                                    </div>
                                  )}
                                  <div>
                                    City:{' '}
                                    {additionalGuardianData.address.city || (
                                      <span className='text-danger'>
                                        Missing
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    State:{' '}
                                    {additionalGuardianData.address.state || (
                                      <span className='text-danger'>
                                        Missing
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    ZIP:{' '}
                                    {additionalGuardianData.address.zip || (
                                      <span className='text-danger'>
                                        Missing
                                      </span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className='text-danger'>
                                  ⚠ Incomplete address. Please use format:
                                  Street, City, State ZIP
                                  <div className='mt-1'>
                                    Example: 123 Main St, Seattle, WA 98101
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        {(validationErrors.additionalGuardianAddress ||
                          validationErrors.additionalGuardianAddressState ||
                          validationErrors.additionalGuardianAddressZip) && (
                          <div className='invalid-feedback'>
                            {validationErrors.additionalGuardianAddress ||
                              validationErrors.additionalGuardianAddressState ||
                              validationErrors.additionalGuardianAddressZip}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className='col-md-6'>
                      <div className='mb-3'>
                        <label className='form-label'>
                          <input
                            type='checkbox'
                            name='isCoach'
                            checked={additionalGuardianData.isCoach}
                            onChange={handleAdditionalGuardianChange}
                          />{' '}
                          Is this guardian a coach?
                        </label>
                      </div>
                    </div>
                    {additionalGuardianData.isCoach && (
                      <div className='col-md-6'>
                        <div className='mb-3'>
                          <label className='form-label'>
                            AAU Number (if coach)
                          </label>
                          <input
                            type='text'
                            name='aauNumber'
                            className='form-control'
                            value={additionalGuardianData.aauNumber}
                            onChange={handleAdditionalGuardianChange}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className='card'>
          <div className='card-header bg-light'>
            <div className='d-flex align-items-center'>
              <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                <i className='ti ti-shirt-sport fs-16' />
              </span>
              <h4 className='text-dark'>Player Information</h4>
            </div>
          </div>
          <div className='card-body pb-1 mb-4'>
            {formData.players.map((player, index) => (
              <div key={index} className='row mb-4'>
                <div className='col-md-6'>
                  <div className='mb-3'>
                    <label className='form-label'>Full Name</label>
                    <input
                      type='text'
                      name='fullName'
                      className={`form-control ${
                        validationErrors[`player${index}FullName`]
                          ? 'is-invalid'
                          : ''
                      }`}
                      value={player.fullName}
                      onChange={(e) => handlePlayerChange(index, e)}
                      required
                      disabled={!!player._id && isExistingUser}
                    />
                    {validationErrors[`player${index}FullName`] && (
                      <div className='invalid-feedback'>
                        {validationErrors[`player${index}FullName`]}
                      </div>
                    )}
                  </div>
                </div>
                <div className='col-md-6'>
                  <div className='mb-3'>
                    <label className='form-label'>Gender</label>
                    <select
                      name='gender'
                      className={`form-control ${
                        validationErrors[`player${index}Gender`]
                          ? 'is-invalid'
                          : ''
                      }`}
                      value={player.gender}
                      onChange={(e) => handlePlayerChange(index, e)}
                      required
                      disabled={!!player._id && isExistingUser}
                    >
                      <option value=''>Select Gender</option>
                      <option value='Male'>Male</option>
                      <option value='Female'>Female</option>
                    </select>
                    {validationErrors[`player${index}Gender`] && (
                      <div className='invalid-feedback'>
                        {validationErrors[`player${index}Gender`]}
                      </div>
                    )}
                  </div>
                </div>
                <div className='col-md-6'>
                  <div className='mb-3'>
                    <label className='form-label'>Date of Birth</label>
                    <DatePicker
                      selected={
                        player.dob
                          ? getLocalDateFromUTCString(player.dob)
                          : null
                      }
                      onChange={(date) => handlePlayerDobChange(index, date)}
                      dateFormat='MM/dd/yyyy'
                      placeholderText='MM/DD/YYYY'
                      className={`form-control ${
                        validationErrors[`player${index}Dob`]
                          ? 'is-invalid'
                          : ''
                      }`}
                      showYearDropdown
                      dropdownMode='select'
                      maxDate={new Date()}
                      required
                      disabled={!!player._id && isExistingUser}
                    />
                    {validationErrors[`player${index}Dob`] && (
                      <div className='invalid-feedback'>
                        {validationErrors[`player${index}Dob`]}
                      </div>
                    )}
                    {player.dob && !validationErrors[`player${index}Dob`] && (
                      <div className='text-muted small mt-1'>
                        {formatDate(player.dob)}
                      </div>
                    )}
                  </div>
                </div>
                <div className='col-md-6'>
                  <div className='mb-3'>
                    <label className='form-label'>School Name</label>
                    <input
                      type='text'
                      name='schoolName'
                      className={`form-control ${
                        validationErrors[`player${index}School`]
                          ? 'is-invalid'
                          : ''
                      }`}
                      value={player.schoolName}
                      onChange={(e) => handlePlayerChange(index, e)}
                      required
                      disabled={!!player._id && isExistingUser}
                    />
                    {validationErrors[`player${index}School`] && (
                      <div className='invalid-feedback'>
                        {validationErrors[`player${index}School`]}
                      </div>
                    )}
                  </div>
                </div>
                <div className='col-md-6'>
                  <div className='mb-3'>
                    <label className='form-label'>Grade</label>
                    <select
                      name='grade'
                      className={`form-control ${
                        validationErrors[`player${index}Grade`]
                          ? 'is-invalid'
                          : ''
                      }`}
                      value={player.grade}
                      onChange={(e) => handlePlayerChange(index, e)}
                      required
                      disabled={!!player._id && isExistingUser}
                    >
                      <option value=''>Select Grade</option>
                      <option value='PK'>Pre-Kindergarten</option>
                      <option value='K'>Kindergarten</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(
                        (grade) => (
                          <option key={grade} value={grade.toString()}>
                            {grade}
                            {getOrdinalSuffix(grade.toString())} Grade
                          </option>
                        )
                      )}
                    </select>
                    {player.dob && !player.isGradeOverridden && (
                      <div className='text-muted small mt-1'>
                        Auto-calculated: {player.grade}
                        {getOrdinalSuffix(player.grade)} Grade
                        <button
                          type='button'
                          className='btn btn-link btn-sm p-0 ms-2'
                          onClick={() => handleGradeOverride(index)}
                        >
                          Adjust Grade
                        </button>
                      </div>
                    )}
                    {validationErrors[`player${index}Grade`] && (
                      <div className='invalid-feedback'>
                        {validationErrors[`player${index}Grade`]}
                      </div>
                    )}
                  </div>
                </div>
                <div className='col-md-6'>
                  <div className='mb-3'>
                    <label className='form-label'>Health Concerns</label>
                    <input
                      type='text'
                      name='healthConcerns'
                      className='form-control'
                      value={player.healthConcerns}
                      onChange={(e) => handlePlayerChange(index, e)}
                    />
                  </div>
                </div>
                <div className='col-md-6'>
                  <div className='mb-3'>
                    <label className='form-label'>AAU Number</label>
                    <input
                      type='text'
                      name='aauNumber'
                      className='form-control'
                      value={player.aauNumber}
                      onChange={(e) => handlePlayerChange(index, e)}
                    />
                  </div>
                </div>
                {formData.players.length > 1 && (
                  <div className='col-md-12'>
                    <button
                      type='button'
                      className='btn btn-danger'
                      onClick={() => removePlayer(index)}
                    >
                      Remove Player
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button
              type='button'
              className='btn btn-secondary'
              onClick={addPlayer}
            >
              Register Additional Player
            </button>
          </div>
        </div>

        {!isExistingUser && (
          <div className='card'>
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
                      By checking this box, you agree to the terms and
                      conditions outlined in the{' '}
                      <Link
                        to='#'
                        data-bs-toggle='modal'
                        data-bs-target='#waiver'
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
        )}

        {paymentError && (
          <div className='alert alert-danger mb-3'>
            <h5>Please fix the following errors:</h5>
            <ul className='mb-0'>
              {paymentError.split('\n').map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className='card'>
          <div className='row d-flex align-items-center'>
            <button
              type='submit'
              className='btn btn-primary'
              disabled={isProcessingRegistration}
            >
              {isProcessingRegistration
                ? 'Registering...'
                : formData.players.length > 0
                ? 'Complete Tryout Registration'
                : 'Complete Registration'}
            </button>
          </div>
        </div>
      </form>
    );
  };

  const renderPaymentStep = () => {
    // Filter players that need payment (unpaid for the current tryout)
    const tryoutPlayers = formData.players.filter(
      (p) =>
        (!p._id || selectedPlayerIds.includes(p._id!)) &&
        !p.seasons?.some(
          (s) =>
            s.season === memoizedTryoutEvent.season &&
            s.year === memoizedTryoutEvent.year &&
            s.tryoutId === memoizedTryoutEvent.tryoutId &&
            s.paymentStatus === 'paid'
        )
    );

    const playerCount = tryoutPlayers.length;
    const totalAmount = playerCount * 20;

    // Check if all selected players are paid
    const allPaid = checkAllPlayersPaid(formData.players);

    // Log payment step data for debugging
    console.log('Payment step data:', {
      tryoutPlayers: tryoutPlayers.map((p) => ({
        fullName: p.fullName,
        seasons: p.seasons,
      })),
      playerCount,
      totalAmount,
      allPaid,
      selectedPlayerIds,
      formDataPlayers: formData.players.map((p) => ({
        fullName: p.fullName,
        seasons: p.seasons,
      })),
    });

    if (allPaid && selectedPlayerIds.length > 0) {
      setCurrentStep(3);
      setIsSubmitted(true);
      return null; // Will render confirmation step
    }

    if (playerCount === 0) {
      console.log(
        'No unpaid players selected, redirecting to registration step'
      );
      setCurrentStep(1);
      return null;
    }

    return (
      <>
        <div className='alert alert-success mb-4'>
          <h4>Complete Your Tryout Payment</h4>
          <p className='mb-0'>
            Please complete your payment below to finalize registration for the{' '}
            Partizan Tryout.
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
                <h5>
                  Tryout Fee ({playerCount} player{playerCount !== 1 ? 's' : ''}
                  ):
                </h5>
                <p className='text-muted'>
                  Total: ${totalAmount} ({playerCount} × $20)
                </p>
              </div>
            </div>

            <div className='mb-3'>
              <label className='form-label'>Email for Receipt</label>
              <input
                type='email'
                className={`form-control ${!customerEmail && 'is-invalid'}`}
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
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
                    amount: String(totalAmount),
                    label: 'Total',
                  },
                  buyerEmailAddress: customerEmail,
                })}
              >
                <CreditCard />
              </PaymentForm>
              <HomeModals />
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className='content content-two'>
      {isSubmitted && currentStep === 3 ? (
        <div className='card-header text-center'>
          <h3>Thank you for registering!</h3>
          <p className='lead'>
            Tryout registration successful for {formData.payment.playerCount}{' '}
            player
            {formData.payment.playerCount !== 1 ? 's' : ''}
          </p>
          <div className='confirmation-details mt-4'>
            <p>
              <strong>Email for receipt:</strong> {customerEmail}
            </p>
            <p>
              <strong>Fee per player:</strong> $20
            </p>
            <p>
              <strong>Number of players:</strong> {formData.payment.playerCount}
            </p>
            <p>
              <strong>Total amount:</strong> ${formData.payment.amount}
            </p>
          </div>
          <button
            className='btn btn-primary mt-4'
            onClick={() => {
              window.location.reload();
            }}
          >
            Done
          </button>
        </div>
      ) : (
        <>
          <h3 className='mb-3'>🏀 Ready for the Partizan Tryout?</h3>
          <div className='progress mb-4' style={{ height: '10px' }}>
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
            <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
              <span className='step-title'>Registration</span>
            </div>
            <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
              <span className='step-title'>Payment</span>
            </div>
            <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
              <span className='step-title'>Confirmation</span>
            </div>
          </div>

          {currentStep === 1 && renderRegistrationStep()}
          {currentStep === 2 && renderPaymentStep()}
        </>
      )}
    </div>
  );
};

export default TryoutRegistrationForm;
