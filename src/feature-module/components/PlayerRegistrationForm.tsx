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
import { Link, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  PaymentForm as SquarePaymentForm,
  PaymentFormProps as SquarePaymentFormProps,
} from 'react-square-web-payments-sdk';
import axios from 'axios';
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
import { useTryoutEvent } from '../../context/TryoutEventContext';
import HomeModals from '../pages/homeModals';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDate, storeDateAsUTC } from '../../utils/dateFormatter';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

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
  paymentId?: string;
  paymentMethod?: string;
  amountPaid?: number;
  cardLast4?: string;
  cardBrand?: string;
}

interface Player {
  _id?: string;
  fullName: string;
  gender: string;
  dob: string;
  schoolName: string;
  healthConcerns?: string;
  aauNumber?: string;
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

interface PlayerRegistrationFormProps {
  isExistingUser?: boolean;
  onSuccess?: () => void;
  existingPlayers?: Player[];
  skipToPayment?: boolean;
  tryoutEvent?: {
    // Make tryoutEvent optional
    season: string;
    year: number;
    tryoutId?: string;
  };
  playerId?: string;
}

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

const formatPhoneNumber = (value: string): string => {
  const cleaned = ('' + value).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
  return match
    ? !match[2]
      ? match[1]
      : `(${match[1]}) ${match[2]}${match[3] ? '-' + match[3] : ''}`
    : value;
};

const validateAddress = (address: Address): boolean => {
  return !!address.street && !!address.city && !!address.state && !!address.zip;
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

const PlayerRegistrationForm: React.FC<PlayerRegistrationFormProps> = ({
  isExistingUser = false,
  onSuccess,
  existingPlayers = [],
  skipToPayment = false,
  tryoutEvent: propTryoutEvent,
  playerId,
}) => {
  const { parent, isAuthenticated } = useAuth();
  const { tryoutEvent: contextTryoutEvent } = useTryoutEvent(); // Use context
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(
    skipToPayment && isExistingUser ? 2 : 1
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [additionalGuardian, setAdditionalGuardian] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isProcessingRegistration, setIsProcessingRegistration] =
    useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [players, setPlayers] = useState<Player[]>(existingPlayers);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState('1');
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const paymentFormRef = useRef<PaymentFormMethods>(null);

  // Use context tryoutEvent if prop is not provided
  const tryoutEvent = propTryoutEvent || contextTryoutEvent;

  const memoizedEvent = useMemo(
    () => ({
      season: tryoutEvent.season,
      year: tryoutEvent.year,
      tryoutId: tryoutEvent.tryoutId,
    }),
    [tryoutEvent.season, tryoutEvent.year, tryoutEvent.tryoutId]
  );

  const initialFormData: FormData = {
    email: isExistingUser ? parent?.email || '' : '',
    fullName: isExistingUser ? parent?.fullName || '' : '',
    relationship: isExistingUser ? parent?.relationship || '' : '',
    phone: isExistingUser ? parent?.phone || '' : '',
    address: isExistingUser
      ? typeof parent?.address === 'string'
        ? parseAddress(parent.address)
        : parent?.address || {
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
    isCoach: isExistingUser ? parent?.isCoach ?? false : false,
    aauNumber: isExistingUser ? parent?.aauNumber || '' : '',
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
      amount: 450,
      amountInCents: 45000,
      playerCount: 1,
      perPlayerAmount: 450,
      breakdown: {
        basePrice: 450,
        subtotal: 450,
        total: 450,
      },
    },
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [customerEmail, setCustomerEmail] = useState(
    parent?.email || formData.email || ''
  );
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

  const normalizePlayerSeasons = (player: Player): Player => ({
    ...player,
    seasons:
      player.seasons?.map((s) => ({
        ...s,
        tryoutId: s.tryoutId ?? '',
      })) ?? [],
  });

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
              (s.tryoutId === memoizedEvent.tryoutId || !memoizedEvent.tryoutId)
          );
          return matchingSeason?.paymentStatus === 'paid' || false;
        });
    },
    [
      memoizedEvent.season,
      memoizedEvent.year,
      memoizedEvent.tryoutId,
      selectedPlayerIds,
    ]
  );

  const calculateTotalAmount = (packageType: string = selectedPackage) => {
    const basePrice = packageType === '1' ? 450 : 600;
    return basePrice * formData.players.length;
  };

  const calculatePayments = (
    playerCount: number,
    packageType: string = selectedPackage
  ) => {
    const perPlayerAmount = packageType === '1' ? 450 : 600;
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
    updatedPlayers[index] = {
      ...updatedPlayers[index],
      dob: isoString,
    };
    setFormData({ ...formData, players: updatedPlayers });
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
    } else if (name === 'agreeToTerms') {
      setFormData({ ...formData, agreeToTerms: checked });
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
          : formData.players.length + 1,
        selectedPackage
      ),
    });
  };

  const removePlayer = (index: number) => {
    const updatedPlayers = [...formData.players];
    updatedPlayers.splice(index, 1);
    setFormData({
      ...formData,
      players: updatedPlayers,
      payment: calculatePayments(
        isExistingUser ? selectedPlayerIds.length : updatedPlayers.length,
        selectedPackage
      ),
    });
    if (updatedPlayers.every((p) => p._id)) {
      setShowNewPlayerForm(false);
    }
  };

  const handlePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds((prev) => {
      const newSelectedIds = prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId];

      setFormData((prev) => ({
        ...prev,
        payment: calculatePayments(
          newSelectedIds.length + prev.players.filter((p) => !p._id).length,
          selectedPackage
        ),
      }));

      return newSelectedIds;
    });
  };

  const handlePackageChange = (packageType: string) => {
    setSelectedPackage(packageType);
    setFormData((prev) => ({
      ...prev,
      payment: calculatePayments(
        isExistingUser ? selectedPlayerIds.length : prev.players.length,
        packageType
      ),
    }));
  };

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      payment: calculatePayments(
        isExistingUser ? selectedPlayerIds.length : prev.players.length,
        selectedPackage
      ),
    }));
  }, [
    selectedPlayerIds.length,
    formData.players.length,
    isExistingUser,
    selectedPackage,
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchPlayerData = async () => {
      setIsLoading(true);
      try {
        if (playerId) {
          const localPlayer = players.find((p) => p._id === playerId);
          if (localPlayer) {
            const normalizedPlayer = normalizePlayerSeasons(localPlayer);
            setFormData((prev) => ({
              ...prev,
              players: [
                {
                  ...normalizedPlayer,
                  registrationYear: memoizedEvent.year,
                  season: memoizedEvent.season,
                  seasons: normalizedPlayer.seasons,
                },
              ],
              payment: calculatePayments(1, selectedPackage),
            }));
            setSelectedPlayerIds([playerId]);
            const hasPaidSeason = checkAllPlayersPaid([normalizedPlayer]);
            setCurrentStep(hasPaidSeason ? 3 : skipToPayment ? 2 : 1);
            setIsSubmitted(hasPaidSeason);
            return;
          }

          const token = localStorage.getItem('token');
          const response = await axios.get<Player>(
            `${API_BASE_URL}/players/${playerId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const existingPlayer = normalizePlayerSeasons(response.data);
          setFormData((prev) => ({
            ...prev,
            players: [
              {
                ...existingPlayer,
                registrationYear: memoizedEvent.year,
                season: memoizedEvent.season,
                seasons: existingPlayer.seasons,
              },
            ],
            payment: calculatePayments(1, selectedPackage),
          }));
          setSelectedPlayerIds([playerId]);
          const hasPaidSeason = checkAllPlayersPaid([existingPlayer]);
          setCurrentStep(hasPaidSeason ? 3 : skipToPayment ? 2 : 1);
          setIsSubmitted(hasPaidSeason);
        } else {
          const token = localStorage.getItem('token');
          const response = await axios.get<Player[]>(
            `${API_BASE_URL}/players/by-parent/${parent?._id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const fetchedPlayers = response.data.map(normalizePlayerSeasons);
          setPlayers(fetchedPlayers);

          const eventPlayers = fetchedPlayers.filter((p) =>
            p.seasons?.some(
              (s) =>
                s.season === memoizedEvent.season &&
                s.year === memoizedEvent.year &&
                (s.tryoutId === memoizedEvent.tryoutId ||
                  !memoizedEvent.tryoutId)
            )
          );

          const unpaidEventPlayers = eventPlayers.filter((p) => {
            const matchingSeason = p.seasons?.find(
              (s) =>
                s.season === memoizedEvent.season &&
                s.year === memoizedEvent.year &&
                (s.tryoutId === memoizedEvent.tryoutId ||
                  !memoizedEvent.tryoutId)
            );
            return matchingSeason?.paymentStatus !== 'paid';
          });

          setSelectedPlayerIds(unpaidEventPlayers.map((p) => p._id!));
          setFormData((prev) => ({
            ...prev,
            players: eventPlayers.map((p) => ({
              ...p,
              registrationYear: memoizedEvent.year,
              season: memoizedEvent.season,
            })),
            payment: calculatePayments(
              unpaidEventPlayers.length,
              selectedPackage
            ),
          }));

          const allPaid = checkAllPlayersPaid(eventPlayers);
          if (eventPlayers.length > 0 && allPaid) {
            setCurrentStep(3);
            setIsSubmitted(true);
          } else if (skipToPayment && unpaidEventPlayers.length > 0) {
            setCurrentStep(2);
          }
        }
      } catch (error) {
        console.error('Error fetching player data:', error);
        setValidationErrors({ general: 'Failed to load player data' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayerData();
  }, [
    isAuthenticated,
    navigate,
    playerId,
    parent,
    memoizedEvent,
    skipToPayment,
    selectedPackage,
  ]);

  const handleRegistrationSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessingRegistration(true);
    setPaymentError(null);
    setValidationErrors({});

    try {
      const errors: Record<string, string> = {};

      if (isExistingUser) {
        if (
          selectedPlayerIds.length === 0 &&
          !formData.players.some((p) => !p._id)
        ) {
          errors.players =
            'Please select at least one existing player or add a new player';
        }
      }

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
            errors[`${playerPrefix}Dob`] = 'Please enter a valid date of birth';
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

      if (!formData.agreeToTerms) {
        errors.agreeToTerms = 'You must agree to the terms and conditions';
      }

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setIsProcessingRegistration(false);
        return;
      }

      const yearAsNumber = Number(memoizedEvent.year);
      if (isNaN(yearAsNumber)) {
        throw new Error(`Invalid year value: ${memoizedEvent.year}`);
      }

      const registeredPlayers: Player[] = [];

      if (isExistingUser) {
        for (const playerId of selectedPlayerIds) {
          const player = players.find((p) => p._id === playerId);
          if (!player) continue;

          const isAlreadyRegistered = player.seasons?.some(
            (s) =>
              s.season === memoizedEvent.season &&
              s.year === memoizedEvent.year &&
              (s.tryoutId === memoizedEvent.tryoutId || !memoizedEvent.tryoutId)
          );

          if (isAlreadyRegistered) {
            registeredPlayers.push(player);
            continue;
          }

          const response = await axios.patch(
            `${API_BASE_URL}/players/${playerId}/season`,
            {
              season: memoizedEvent.season,
              year: yearAsNumber,
              tryoutId: memoizedEvent.tryoutId || '', // Fallback to ''
              paymentStatus: 'pending',
            },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            }
          );

          registeredPlayers.push(response.data.player);
        }

        for (const player of formData.players.filter((p) => !p._id)) {
          const requestBody = {
            ...player,
            year: yearAsNumber,
            parentId: parent?._id,
            tryoutId: memoizedEvent.tryoutId || '', // Fallback to ''
            season: memoizedEvent.season,
            seasons: [
              {
                season: memoizedEvent.season,
                year: yearAsNumber,
                tryoutId: memoizedEvent.tryoutId || '', // Fallback to ''
                paymentStatus: 'pending',
                registrationDate: new Date(),
              },
            ],
          };

          const response = await axios.post(
            `${API_BASE_URL}/players/register`,
            requestBody,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            }
          );

          registeredPlayers.push(response.data);
        }

        setFormData((prev) => ({
          ...prev,
          players: registeredPlayers.map((p) => ({
            ...p,
            registrationYear: yearAsNumber,
            season: memoizedEvent.season,
          })),
          payment: calculatePayments(registeredPlayers.length, selectedPackage),
        }));

        setSelectedPlayerIds(registeredPlayers.map((p) => p._id!));

        const unpaidPlayers = registeredPlayers.filter((p) => {
          const matchingSeason = p.seasons?.find(
            (s) =>
              s.season === memoizedEvent.season &&
              s.year === memoizedEvent.year &&
              (s.tryoutId === memoizedEvent.tryoutId || !memoizedEvent.tryoutId)
          );
          return matchingSeason?.paymentStatus !== 'paid';
        });

        setCurrentStep(unpaidPlayers.length > 0 ? 2 : 3);
        if (unpaidPlayers.length === 0) {
          setIsSubmitted(true);
        }
      } else {
        setPaymentError('Registration is only available for logged-in users.');
        setIsProcessingRegistration(false);
        return;
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

      const playersToPay = formData.players.filter(
        (p) =>
          (!p._id || selectedPlayerIds.includes(p._id!)) &&
          !p.seasons?.some(
            (s) =>
              s.season === memoizedEvent.season &&
              s.year === memoizedEvent.year &&
              (s.tryoutId === memoizedEvent.tryoutId ||
                !memoizedEvent.tryoutId) &&
              s.paymentStatus === 'paid'
          )
      );

      const paymentData = {
        token,
        sourceId: token,
        amount: formData.payment.amountInCents,
        currency: 'USD',
        email: customerEmail,
        players: playersToPay.map((player) => ({
          playerId: player._id,
          season: memoizedEvent.season,
          year: Number(memoizedEvent.year),
          tryoutId: memoizedEvent.tryoutId || '', // Fallback to ''
        })),
        cardDetails: {
          last_4: cardDetails?.last4 || '',
          card_brand: cardDetails?.brand || '',
          exp_month: cardDetails?.expMonth || '',
          exp_year: cardDetails?.expYear || '',
        },
      };

      const response = await axios.post(
        `${API_BASE_URL}/payments/process`,
        paymentData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      setFormData((prev) => ({
        ...prev,
        players: prev.players.map((p) => {
          const updatedPlayer = response.data.players.find(
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
      if (onSuccess) onSuccess();
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
    if (isLoading) {
      return (
        <div className='text-center py-4'>
          <LoadingSpinner />
          <p>Loading player information...</p>
        </div>
      );
    }

    return (
      <div className='card'>
        <div className='card-header bg-light'>
          <h4>Register for {memoizedEvent.season}</h4>
        </div>
        <div className='card-body'>
          <form onSubmit={handleRegistrationSubmit}>
            {isExistingUser && players.length > 0 && (
              <div className='mb-4'>
                <h5>Select Players</h5>
                <p>
                  Choose which players to register for the{' '}
                  {memoizedEvent.season} event:
                </p>

                {players.map((player) => {
                  const matchingSeason = player.seasons?.find(
                    (s) =>
                      s.season === memoizedEvent.season &&
                      s.year === memoizedEvent.year &&
                      (s.tryoutId === memoizedEvent.tryoutId ||
                        !memoizedEvent.tryoutId)
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
                            Not Registered
                          </span>
                        )}
                      </label>
                    </div>
                  );
                })}
                {validationErrors.players && (
                  <div className='alert alert-danger mb-3'>
                    {validationErrors.players}
                  </div>
                )}
              </div>
            )}

            {showNewPlayerForm && (
              <div className='card'>
                <div className='card-header bg-light'>
                  <h4>New Player Information</h4>
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
                            disabled={!!player._id}
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
                            disabled={!!player._id}
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
                            disabled={!!player._id}
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
                            disabled={!!player._id}
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
                            disabled={!!player._id}
                          >
                            <option value=''>Select Grade</option>
                            {[...Array(12)].map((_, i) => (
                              <option key={i + 1} value={`${i + 1}`}>
                                {i + 1}
                                {i === 0
                                  ? 'st'
                                  : i === 1
                                  ? 'nd'
                                  : i === 2
                                  ? 'rd'
                                  : 'th'}{' '}
                                Grade
                              </option>
                            ))}
                          </select>
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
            )}

            <div className='card'>
              <div className='card-header bg-light'>
                <h4>Terms and Conditions</h4>
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
                    ? 'Complete Registration'
                    : 'Complete Registration'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderPaymentStep = () => {
    // Filter players that need payment
    const eventPlayers = formData.players.filter(
      (p) =>
        (!p._id || selectedPlayerIds.includes(p._id!)) &&
        !p.seasons?.some(
          (s) =>
            s.season === memoizedEvent.season &&
            s.year === memoizedEvent.year &&
            (s.tryoutId === memoizedEvent.tryoutId ||
              !memoizedEvent.tryoutId) &&
            s.paymentStatus === 'paid'
        )
    );

    const playerCount = eventPlayers.length;
    const totalAmount = formData.payment.amount;

    const allPaid = checkAllPlayersPaid(formData.players);

    if (allPaid && selectedPlayerIds.length > 0) {
      setCurrentStep(3);
      setIsSubmitted(true);
      return null;
    }

    if (playerCount === 0) {
      setCurrentStep(1);
      return null;
    }

    const isFallTraining = memoizedEvent.season === 'Fall Training';

    return (
      <>
        <div className='alert alert-success mb-4'>
          <h4>Complete Your Payment</h4>
          <p className='mb-0'>
            Please complete your payment below to finalize registration for the{' '}
            {memoizedEvent.season}.
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
                  Fee ({playerCount} player{playerCount !== 1 ? 's' : ''}):
                </h5>
                {isFallTraining ? (
                  <>
                    <div className='d-flex gap-4'>
                      <div className='form-check'>
                        <input
                          className='form-check-input'
                          type='radio'
                          name='trainingPackage'
                          id='package1'
                          value='1'
                          checked={selectedPackage === '1'}
                          onChange={() => handlePackageChange('1')}
                        />
                        <label className='form-check-label' htmlFor='package1'>
                          <strong>2 Times/Week</strong> - $450
                        </label>
                      </div>
                      <div className='form-check'>
                        <input
                          className='form-check-input'
                          type='radio'
                          name='trainingPackage'
                          id='package2'
                          value='2'
                          checked={selectedPackage === '2'}
                          onChange={() => handlePackageChange('2')}
                        />
                        <label className='form-check-label' htmlFor='package2'>
                          <strong>3 Times/Week</strong> - $600
                        </label>
                      </div>
                    </div>
                    <p className='text-muted mt-2'>
                      Total: ${totalAmount} ({playerCount} × $
                      {formData.payment.perPlayerAmount})
                    </p>
                  </>
                ) : (
                  <p className='text-muted'>Total: $20 ({playerCount} × $20)</p>
                )}
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
          <h3>Thank you for registering!</h3>
          <p className='lead'>
            Registration successful for {formData.players.length} player
            {formData.players.length !== 1 ? 's' : ''}
          </p>
          <div className='confirmation-details mt-4'>
            <p>
              <strong>Email for receipt:</strong> {customerEmail}
            </p>
            <p>
              <strong>Package:</strong>{' '}
              {selectedPackage === '1' ? '2 Times/Week' : '3 Times/Week'}
            </p>
            <p>
              <strong>Price per player:</strong> $
              {selectedPackage === '1' ? '450' : '600'}
            </p>
            <p>
              <strong>Number of players:</strong> {formData.players.length}
            </p>
            <p>
              <strong>Total amount:</strong> $
              {(selectedPackage === '1' ? 450 : 600) * formData.players.length}
            </p>
          </div>
          <button
            className='btn btn-primary mt-4'
            onClick={() => {
              if (onSuccess) onSuccess();
              else navigate('/dashboard');
            }}
          >
            Done
          </button>
        </div>
      ) : (
        <>
          <h3 className='mb-3'>
            🏀 Ready to Ball This {memoizedEvent.season}?
          </h3>
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
              <span className='step-title'>Registration</span>
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

export default PlayerRegistrationForm;
