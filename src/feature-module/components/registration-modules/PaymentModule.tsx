import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useMemo,
} from 'react';
import {
  CreditCard,
  PaymentForm as SquarePaymentForm,
  PaymentFormProps as SquarePaymentFormProps,
} from 'react-square-web-payments-sdk';
import axios from 'axios';
import {
  Player,
  PaymentModuleProps,
  RegistrationFormConfig,
  PricingPackage,
  SeasonRegistration,
  TournamentSpecificConfig,
} from '../../../types/registration-types';

interface EnhancedPaymentModuleProps extends PaymentModuleProps {
  formConfig?: RegistrationFormConfig;
  playerCount?: number;
  selectedPackage?: PricingPackage | null;
  disabled?: boolean;
  players?: any[];
  eventData?: any;
  onPaymentComplete?: (successData: {
    success: boolean;
    paymentId: string;
    squarePaymentId: string;
    receiptUrl: string;
    players: any[];
    team?: any;
    teams?: any[];
    amount: number;
    email: string;
    playerCount: number;
    totalAmount: number;
  }) => void;
  savedUserData?: any;
  savedPlayers?: any[];
  pendingRegistrationId?: string | null;
  team?: any;
  teams?: any[];
  tournamentConfig?: any;
  registrationType?: 'tournament' | 'tryout' | 'training' | 'player';
  parentId?: string | null;
  user?: any;
  formData?: any;
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

// PROD
const appId = 'sq0idp-jUCxKnO_i8i7vccQjVj_0g';
const locationId = 'L26Q50FWRCQW5';

// QA
// const appId = 'sandbox-sq0idb-I4PAJ1f1XKYqYSwLovq0xQ';
// const locationId = 'L26Q50FWRCQW5';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const PaymentForm = forwardRef<PaymentFormMethods, SquarePaymentFormProps>(
  (props, ref) => {
    const paymentFormRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      tokenize: async () => {
        if (!paymentFormRef.current) {
          throw new Error('Payment form not initialized');
        }
        return new Promise((resolve, reject) => {
          paymentFormRef.current?.tokenize({
            onValidationErrors: (errors: any) => {
              reject(new Error('Card validation failed'));
            },
            onCardTokenized: (err: any, result: any) => {
              if (err) {
                reject(new Error(err.message || 'Tokenization failed'));
                return;
              }
              if (result.status === 'OK') {
                resolve({
                  token: result.token,
                  details: result.details
                    ? {
                        card: {
                          last_4: result.details.card?.last4 || '',
                          card_brand: result.details.card?.brand || '',
                          exp_month: result.details.card?.expMonth || '',
                          exp_year: result.details.card?.expYear || '',
                        },
                      }
                    : undefined,
                });
              } else {
                reject(
                  new Error(
                    result.errors?.[0]?.message || 'Tokenization failed'
                  )
                );
              }
            },
          });
        });
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

const PaymentModule: React.FC<EnhancedPaymentModuleProps> = ({
  amount,
  customerEmail,
  onPaymentSuccess,
  onPaymentError,
  description = 'Registration Fee',
  isProcessing = false,
  onComplete,
  onBack,
  formData,
  eventData,
  formConfig,
  playerCount = 1,
  selectedPackage = null,
  disabled = false,
  players = [],
  team = null,
  teams = [],
  onPaymentComplete,
  tournamentConfig,
  registrationType = 'player',
  parentId = null,
  user = null,
  savedUserData = null,
  savedPlayers = [],
  pendingRegistrationId = null,
}) => {
  const paymentFormRef = useRef<PaymentFormMethods>(null);
  const [calculatedAmount, setCalculatedAmount] = useState(amount);
  const [isPaying, setIsPaying] = useState(false);
  const [localCustomerEmail, setLocalCustomerEmail] = useState(
    customerEmail || ''
  );
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Refs to track previous values and prevent infinite loops
  const prevPlayersRef = useRef<any[]>();
  const prevFormDataPlayersRef = useRef<any[]>();
  const prevStateRef = useRef<any>();

  // Use direct props or formData props
  const effectivePlayers = React.useMemo(() => {
    console.log('🔄 PaymentModule: Processing players for:', {
      registrationType,
      playersPropCount: players?.length || 0,
      formDataPlayersCount: formData?.players?.length || 0,
      eventData,
    });

    // For tournament registration, we don't need players
    if (registrationType === 'tournament') {
      return [];
    }

    // SIMPLIFIED: Always use the players prop if provided
    if (players && players.length > 0) {
      console.log(
        '✅ Using direct players prop:',
        players.map((p: Player) => ({ id: p._id, name: p.fullName }))
      );
      return players;
    }

    // Fallback: Use formData.players
    if (formData?.players && formData.players.length > 0) {
      console.log(
        '✅ Using formData players:',
        formData.players.map((p: Player) => ({ id: p._id, name: p.fullName }))
      );
      return formData.players;
    }

    console.log('⚠️ No players found for registration');
    return [];
  }, [players, formData, registrationType, eventData]);

  // Handle teams for tournament registration
  const effectiveTeam = team || formData?.team || null;
  const effectiveTeams = teams.length > 0 ? teams : team ? [team] : [];

  const effectiveEventData = useMemo(() => {
    return (
      eventData ||
      formData?.eventData || {
        season: 'Basketball',
        year: new Date().getFullYear(),
        eventId: 'default-event',
      }
    );
  }, [eventData, formData]);

  // Calculate effective player/team count with useCallback to prevent recreation
  const getEffectiveRegistrationCount = useCallback((): number => {
    console.log('🔍 getEffectiveRegistrationCount called:', {
      registrationType,
      effectivePlayersCount: effectivePlayers.length,
      effectiveTeamsCount: effectiveTeams.length,
    });

    if (registrationType === 'tournament') {
      // For tournament, count teams
      return effectiveTeams.length;
    }

    if (registrationType === 'training') {
      // For training, count players who haven't paid for training
      const unpaidTrainingPlayers = effectivePlayers.filter(
        (player: Player) => {
          if (!player.seasons || player.seasons.length === 0) {
            console.log(
              `✅ Player ${player.fullName} has no seasons - needs payment`
            );
            return true;
          }

          // Check if player has already paid for training
          const hasPaidForTraining = player.seasons.some(
            (s: SeasonRegistration) => {
              const isTrainingSeason =
                s.season?.toLowerCase().includes('training') ||
                s.season === 'Basketball Training';
              const isSameYear = s.year === effectiveEventData?.year;
              const isPaid =
                s.paymentStatus === 'paid' || s.paymentComplete === true;

              return isTrainingSeason && isSameYear && isPaid;
            }
          );

          console.log(`📊 Player ${player.fullName} training payment status:`, {
            hasPaidForTraining,
            seasons: player.seasons.map((s) => ({
              season: s.season,
              year: s.year,
              paymentStatus: s.paymentStatus,
              isTraining: s.season?.toLowerCase().includes('training'),
            })),
          });

          return !hasPaidForTraining;
        }
      );

      return unpaidTrainingPlayers.length;
    }

    if (registrationType === 'tryout') {
      // For tryouts, we need to check against the specific tryout event
      const tryoutEventId = eventData?.eventId;
      const tryoutYear = eventData?.year;

      if (!tryoutEventId) {
        console.warn('⚠️ No tryout event ID found');
        // Fallback: count all players who aren't marked as paid
        const unpaidTryoutPlayers = effectivePlayers.filter(
          (player: Player) =>
            !player.paymentComplete || player.paymentStatus !== 'paid'
        );
        return unpaidTryoutPlayers.length;
      }

      // Filter players who haven't paid for THIS specific tryout
      const unpaidTryoutPlayers = effectivePlayers.filter((player: Player) => {
        // First check if player has seasons array
        if (!player.seasons || player.seasons.length === 0) {
          // No seasons at all - check top-level payment status
          console.log(
            `✅ Player ${player.fullName} has no seasons - checking payment status`
          );
          return !player.paymentComplete || player.paymentStatus !== 'paid';
        }

        // Check if player has already paid for this tryout
        const hasPaidForThisTryout = player.seasons?.some(
          (s: SeasonRegistration) =>
            s.tryoutId === tryoutEventId &&
            s.year === tryoutYear &&
            s.paymentStatus === 'paid'
        );

        console.log(`🔍 Player ${player.fullName} check:`, {
          hasPaidForThisTryout,
          tryoutEventId,
          tryoutYear,
          playerSeasons: player.seasons,
          topLevelPaymentComplete: player.paymentComplete,
          topLevelPaymentStatus: player.paymentStatus,
        });

        return !hasPaidForThisTryout;
      });

      console.log('🎯 Tryout registration count:', {
        totalPlayers: effectivePlayers.length,
        unpaidForThisTryout: unpaidTryoutPlayers.length,
        tryoutEventId,
        tryoutYear,
        unpaidPlayers: unpaidTryoutPlayers.map((p: Player) => ({
          name: p.fullName,
          seasons: p.seasons?.length || 0,
          paymentComplete: p.paymentComplete,
          paymentStatus: p.paymentStatus,
        })),
      });

      return unpaidTryoutPlayers.length;
    }

    // Default: count only unpaid players
    const unpaidPlayers = effectivePlayers.filter(
      (player: Player) =>
        !player.paymentComplete || player.paymentStatus !== 'paid'
    );

    return unpaidPlayers.length;
  }, [
    registrationType,
    effectiveTeams,
    effectivePlayers,
    eventData,
    effectiveEventData,
  ]);

  // Optimized debug useEffect - only log when values actually change
  useEffect(() => {
    const playersChanged =
      players !== prevPlayersRef.current ||
      formData?.players !== prevFormDataPlayersRef.current;

    if (playersChanged) {
      console.log('🔍 DEBUG PaymentModule Registration Analysis:', {
        registrationType,
        directPlayersCount: players?.length || 0,
        formDataPlayersCount: formData?.players?.length || 0,
        effectivePlayersCount: effectivePlayers.length,
        teamCount: effectiveTeams.length,
        effectiveRegistrationCount: getEffectiveRegistrationCount(),
      });

      prevPlayersRef.current = players;
      prevFormDataPlayersRef.current = formData?.players;
    }
  }, [
    players,
    formData?.players,
    effectivePlayers.length,
    getEffectiveRegistrationCount,
    registrationType,
    effectiveTeams,
  ]);

  // Calculate amount based on formConfig and selected package
  useEffect(() => {
    let newAmount = amount;

    if (formConfig) {
      const effectiveCount = getEffectiveRegistrationCount();

      if (registrationType === 'tournament') {
        // Tournament fee per team
        const tournamentFee =
          tournamentConfig?.tournamentFee ||
          formConfig.pricing.basePrice ||
          425;
        newAmount = tournamentFee * 100 * effectiveCount; // Convert to cents
        console.log('🏀 Tournament fee calculation:', {
          tournamentFee,
          teamCount: effectiveCount,
          calculated: newAmount,
        });
      } else {
        // Player/tryout/training registration
        if (selectedPackage) {
          // Use selected package price
          newAmount = selectedPackage.price * 100 * effectiveCount;
          console.log('📦 Using package price:', {
            packagePrice: selectedPackage.price,
            effectiveCount,
            calculated: newAmount,
          });
        } else {
          // Use base price
          newAmount = formConfig.pricing.basePrice * 100 * effectiveCount;
          console.log('🏷️ Using base price:', {
            basePrice: formConfig.pricing.basePrice,
            effectiveCount,
            calculated: newAmount,
          });
        }
      }
    }

    // Only update state if amount actually changed
    if (newAmount !== calculatedAmount) {
      console.log('🎯 Final calculated amount:', newAmount);
      setCalculatedAmount(newAmount);
    }
  }, [
    formConfig,
    selectedPackage,
    playerCount,
    amount,
    effectivePlayers.length,
    effectiveTeam,
    effectiveTeams,
    getEffectiveRegistrationCount,
    calculatedAmount,
    registrationType,
    tournamentConfig,
  ]);

  useEffect(() => {
    console.log('🔍 PaymentModule Debug - Full Data Analysis:', {
      // Registration info
      registrationType,
      eventData: effectiveEventData,

      // Player sources
      playersFromProps: players,
      playersFromPropsCount: players?.length || 0,
      formDataPlayers: formData?.players,
      formDataPlayersCount: formData?.players?.length || 0,
      savedUserDataPlayers: savedUserData?.players,
      savedUserDataPlayersCount: savedUserData?.players?.length || 0,

      // Calculated values
      effectivePlayers: effectivePlayers,
      effectivePlayersCount: effectivePlayers.length,
      effectiveRegistrationCount: getEffectiveRegistrationCount(),
      calculatedAmount,

      // User/authentication data
      parentId,
      savedUserData: !!savedUserData,
      user: !!user,
      formData: !!formData,
      hasToken: !!localStorage.getItem('token'),
      storedParentId: localStorage.getItem('parentId'),
    });

    // Log each player in effectivePlayers with their payment status
    console.log('🔍 Detailed effectivePlayers analysis:');
    effectivePlayers.forEach((player: Player, index: number) => {
      console.log(`  Player ${index + 1}:`, {
        id: player._id,
        name: player.fullName,
        paymentComplete: player.paymentComplete,
        paymentStatus: player.paymentStatus,
        seasons: player.seasons,
        hasSeasons: !!player.seasons,
        seasonCount: player.seasons?.length || 0,
      });
    });
  }, [
    registrationType,
    players,
    formData,
    savedUserData,
    effectivePlayers,
    calculatedAmount,
    parentId,
    user,
    effectiveEventData,
    getEffectiveRegistrationCount,
  ]);

  // Add this right after the effectivePlayers memo
  useEffect(() => {
    console.log('🔍 DEBUG effectivePlayers analysis:', {
      registrationType,
      playersProp: players,
      playersPropCount: players?.length || 0,
      playersPropHasIds: players?.filter((p: Player) => p._id).length || 0,
      formDataPlayers: formData?.players,
      formDataPlayersCount: formData?.players?.length || 0,
      effectivePlayers,
      effectivePlayersCount: effectivePlayers.length,
      effectivePlayersWithIds: effectivePlayers.filter((p: Player) => p._id)
        .length,

      // Check what's in the players array
      playersArrayDetails:
        players?.map((p: Player) => ({
          id: p._id,
          name: p.fullName,
          hasId: !!p._id,
        })) || [],
    });
  }, [players, formData, effectivePlayers, registrationType]);

  const handleCardTokenized = async (tokenResult: any) => {
    setIsPaying(true);
    setPaymentError(null);

    try {
      if (tokenResult.status !== 'OK') {
        throw new Error(tokenResult.errors?.[0]?.message || 'Payment failed');
      }

      const token = tokenResult.token;
      const cardDetails = tokenResult.details?.card;

      console.log('💳 Payment tokenized successfully:', {
        token: token.substring(0, 20) + '...',
        cardDetails,
        registrationType,
      });

      const last4 = cardDetails?.last4 || '';
      const brand = cardDetails?.brand || '';
      const expMonth = String(cardDetails?.expMonth || '');
      const expYear = String(cardDetails?.expYear || '');

      // Handle different registration types
      if (registrationType === 'tournament') {
        // TOURNAMENT REGISTRATION - TEAMS, NOT PLAYERS
        if (effectiveTeams.length === 0) {
          throw new Error('No teams found for tournament registration');
        }

        // Get tournament name from first team or config
        const firstTeam = effectiveTeams[0];
        const tournamentName =
          firstTeam.tournament ||
          tournamentConfig?.tournamentName ||
          'Tournament Registration';

        const tournamentYear =
          firstTeam.registrationYear ||
          tournamentConfig?.tournamentYear ||
          new Date().getFullYear();

        // CRITICAL FIX: Teams can be in different states:
        // 1. New teams without IDs (first-time registration)
        // 2. Existing teams with IDs (abandoned cart, now paying)
        // 3. Mix of both

        console.log('🔍 Team analysis for payment:', {
          totalTeams: effectiveTeams.length,
          teamsWithIds: effectiveTeams.filter((t) => t._id).length,
          teamsWithoutIds: effectiveTeams.filter((t) => !t._id).length,
          teams: effectiveTeams.map((t) => ({
            name: t.name,
            hasId: !!t._id,
            id: t._id,
            paymentStatus: t.paymentStatus,
            paymentComplete: t.paymentComplete,
          })),
        });

        // Get valid team IDs for payment (existing teams with proper IDs)
        const validTeamIds = effectiveTeams
          .filter((team: any) => {
            // Team must have an ID if it's an existing team
            if (team._id) {
              return /^[0-9a-fA-F]{24}$/.test(team._id);
            }
            return false;
          })
          .map((team: any) => team._id);

        console.log('📋 Teams ready for payment:', {
          validTeamIdsCount: validTeamIds.length,
          validTeamIds,
          totalTeams: effectiveTeams.length,
        });

        // If no valid teams with IDs, but we have teams in the form data,
        // this might be a new registration where teams haven't been saved yet
        if (validTeamIds.length === 0) {
          console.warn(
            '⚠️ No valid team IDs found. Teams may need to be saved first.'
          );

          // Check if this is a new registration (all teams have no IDs)
          const allNewTeams = effectiveTeams.every((team: any) => !team._id);

          if (allNewTeams) {
            // This is a new registration - we should save teams first
            // But we can't proceed without team IDs
            throw new Error(
              'Teams have not been saved to the system yet. Please go back and complete team registration before payment.'
            );
          } else {
            // Mixed state - some have IDs, some don't
            throw new Error(
              'Some teams are not properly registered. Please ensure all teams are saved before payment.'
            );
          }
        }

        const totalAmount =
          validTeamIds.length * (tournamentConfig?.tournamentFee || 425);

        // Create payment data
        const paymentData = {
          token,
          sourceId: token,
          amount: totalAmount * 100, // Convert to cents
          email: localCustomerEmail,
          teamIds: validTeamIds,
          tournament: tournamentName,
          year: Number(tournamentYear),
          cardDetails: {
            last_4: last4,
            card_brand: brand,
            exp_month: expMonth,
            exp_year: expYear,
          },
          isAdmin: false,
        };

        console.log('🏀 Processing tournament payment:', {
          endpoint: '/payments/tournament-teams',
          teamCount: validTeamIds.length,
          amount: paymentData.amount,
          tournament: paymentData.tournament,
          year: paymentData.year,
          teamIds: validTeamIds,
        });

        // Use the tournament-teams endpoint (handles multiple teams)
        const response = await axios.post(
          `${API_BASE_URL}/payments/tournament-teams`,
          paymentData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          }
        );

        console.log('✅ Tournament payment API response:', response.data);

        if (response.data.success) {
          const paymentResult = {
            ...response.data,
            token: token,
            calculatedAmount: paymentData.amount,
            receiptUrl: response.data.receiptUrl,
            squarePaymentId:
              response.data.squarePaymentId || response.data.paymentId,
            teams: response.data.teams || effectiveTeams.filter((t) => t._id), // Only teams with IDs
          };

          if (onPaymentSuccess) {
            onPaymentSuccess(paymentResult);
          }

          const successData = {
            success: true,
            paymentId: response.data.paymentId,
            squarePaymentId: response.data.squarePaymentId,
            receiptUrl: response.data.receiptUrl,
            players: [], // Empty for tournament
            teams: response.data.teams || effectiveTeams.filter((t) => t._id),
            amount: paymentData.amount,
            email: localCustomerEmail,
            playerCount: 0,
            teamCount: validTeamIds.length,
            totalAmount: totalAmount,
          };

          if (onPaymentComplete) {
            onPaymentComplete(successData);
          }

          if (onComplete) {
            onComplete(successData);
          }

          console.log('🎉 Tournament payment completed successfully!', {
            teamsPaid: validTeamIds.length,
            paymentId: response.data.paymentId,
          });
        } else {
          throw new Error(
            response.data.message || 'Tournament payment processing failed'
          );
        }
      } else {
        // PLAYER/TRYOUT/TRAINING REGISTRATION
        const playersToPay = effectivePlayers.filter((player: Player) => {
          if (registrationType === 'tryout') {
            // For tryouts, check for tryoutId specifically
            const isPaidForThisTryout = player.seasons?.some(
              (s: SeasonRegistration) =>
                s.tryoutId === effectiveEventData?.eventId &&
                s.year === effectiveEventData?.year &&
                s.paymentStatus === 'paid'
            );
            return !isPaidForThisTryout;
          } else if (registrationType === 'training') {
            // For training, ALWAYS check for "Basketball Training" season specifically
            // This ensures we don't confuse tournament payments with training payments
            const isPaidForTraining = player.seasons?.some(
              (s: SeasonRegistration) => {
                // Check if it's actually a training season (contains "training" or is exactly "Basketball Training")
                const isTrainingSeason =
                  s.season?.toLowerCase().includes('training') ||
                  s.season === 'Basketball Training';

                const isSameYear = s.year === effectiveEventData?.year;
                const isPaid =
                  s.paymentStatus === 'paid' || s.paymentComplete === true;

                // Debug logging
                if (isTrainingSeason && isSameYear) {
                  console.log(`🎯 Training check for ${player.fullName}:`, {
                    seasonInDB: s.season,
                    isTrainingSeason,
                    yearInDB: s.year,
                    currentYear: effectiveEventData?.year,
                    isPaid,
                    paymentStatus: s.paymentStatus,
                  });
                }

                return isTrainingSeason && isSameYear && isPaid;
              }
            );

            console.log(
              `📊 Player ${player.fullName} training payment eligibility:`,
              {
                isPaidForTraining,
                isEligibleForPayment: !isPaidForTraining,
                seasons: player.seasons?.map((s) => ({
                  season: s.season,
                  year: s.year,
                  paymentStatus: s.paymentStatus,
                  isTraining: s.season?.toLowerCase().includes('training'),
                })),
              }
            );

            return !isPaidForTraining;
          } else {
            // For regular player registration (non-training, non-tryout)
            const isPaidForThisSeason = player.seasons?.some(
              (s: SeasonRegistration) =>
                s.season === effectiveEventData?.season &&
                s.year === effectiveEventData?.year &&
                s.paymentStatus === 'paid'
            );
            return !isPaidForThisSeason;
          }
        });

        console.log('🎯 Players to pay:', {
          registrationType,
          totalPlayers: effectivePlayers.length,
          playersToPay: playersToPay.length,
          eventData: effectiveEventData,
          players: playersToPay.map((p: Player) => ({
            id: p._id,
            name: p.fullName,
            paid: p.paymentStatus,
            seasons: p.seasons,
          })),
        });

        if (playersToPay.length === 0) {
          // Provide more helpful error message
          throw new Error(`No players found that require payment for ${registrationType} registration. 
    Check if players are already registered for this ${
      registrationType === 'tryout' ? 'tryout' : 'season'
    }.`);
        }

        // Prepare payment data with STRING values
        const paymentData: any = {
          token,
          sourceId: token,
          amount: calculatedAmount,
          currency: 'USD',
          email: localCustomerEmail,
          parentId: parentId || savedUserData?._id || formData?.user?._id,
          // Card details as strings at root level
          cardLastFour: last4,
          cardBrand: brand,
          cardExpMonth: expMonth,
          cardExpYear: expYear,
          // Also include nested format for compatibility
          cardDetails: {
            last_4: last4,
            card_brand: brand,
            exp_month: expMonth,
            exp_year: expYear,
          },
        };

        let endpoint = 'process';

        if (registrationType === 'tryout') {
          endpoint = 'tryout';
          paymentData.players = playersToPay
            .filter((player: Player) => {
              if (!player._id) {
                console.error(
                  `❌ Tryout player "${player.fullName}" has no ID! Skipping.`
                );
                return false;
              }
              return true;
            })
            .map((player: Player) => ({
              playerId: player._id, // Now guaranteed to exist
              season: effectiveEventData?.season || 'Tryout',
              year: effectiveEventData?.year || new Date().getFullYear(),
              tryoutId: effectiveEventData?.eventId || '',
            }));

          console.log(
            '✅ Tryout payment players with IDs:',
            paymentData.players
          );
        } else {
          // For player, training, or any other type, use 'process' endpoint
          endpoint = 'process';
          paymentData.players = playersToPay
            .filter((player: Player) => {
              if (!player._id) {
                console.error(
                  `❌ Player "${player.fullName}" has no ID! Skipping.`
                );
                return false;
              }
              return true;
            })
            .map((player: Player) => ({
              playerId: player._id, // Now guaranteed to exist
              season:
                effectiveEventData?.season ||
                (registrationType === 'training' ? 'Training' : 'Basketball'),
              year: effectiveEventData?.year || new Date().getFullYear(),
              // For training, we might need a tryoutId if required by backend
              ...(registrationType === 'training' && {
                tryoutId: effectiveEventData?.eventId || 'training',
              }),
            }));
        }

        // CRITICAL: Check if we have any players after filtering
        if (paymentData.players.length === 0) {
          throw new Error(
            `No valid players with IDs found for ${registrationType} registration. ` +
              `Please ensure all players are properly saved.`
          );
        }

        console.log('👥 Processing player registration payment:', {
          registrationType,
          endpoint,
          playerCount: paymentData.players.length,
          amount: calculatedAmount,
          cardDetails: {
            cardLastFour: paymentData.cardLastFour,
            cardBrand: paymentData.cardBrand,
            cardExpMonth: paymentData.cardExpMonth,
            cardExpYear: paymentData.cardExpYear,
          },
        });

        const response = await axios.post(
          `${API_BASE_URL}/payments/${endpoint}`,
          paymentData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          }
        );

        console.log('✅ Payment API response:', response.data);

        if (response.data.success) {
          // Payment successful
          const paymentResult = {
            ...response.data,
            token: token,
            calculatedAmount,
            receiptUrl: response.data.receiptUrl,
            squarePaymentId:
              response.data.squarePaymentId || response.data.paymentId,
            players: response.data.players || [],
          };

          // Call the success callback with all payment data
          if (onPaymentSuccess) {
            onPaymentSuccess(paymentResult);
          }

          // Prepare success data for thank you page
          const successData = {
            success: true,
            paymentId: response.data.paymentId,
            squarePaymentId: response.data.squarePaymentId,
            receiptUrl: response.data.receiptUrl,
            players: response.data.players || [],
            amount: calculatedAmount,
            email: localCustomerEmail,
            playerCount: playersToPay.length,
            totalAmount: calculatedAmount / 100,
          };

          // Call the onPaymentComplete callback for thank you page
          if (onPaymentComplete) {
            onPaymentComplete(successData);
          }

          // Also call onComplete for backward compatibility
          if (onComplete) {
            onComplete(successData);
          }

          console.log('🎉 Player payment completed successfully!', {
            paymentId: response.data.paymentId,
            playersUpdated: response.data.players?.length || 0,
            successData,
          });
        } else {
          throw new Error(response.data.message || 'Payment processing failed');
        }
      }
    } catch (error: any) {
      console.error('❌ Payment processing error:', error);

      let errorMessage = 'Payment processing failed';

      if (error.response) {
        // Server responded with error status
        errorMessage =
          error.response.data?.message ||
          error.response.data?.error ||
          `Server error: ${error.response.status}`;
        console.error('Server error details:', error.response.data);

        // Handle specific Square errors
        if (error.response.data?.squareErrors) {
          const squareError = error.response.data.squareErrors[0];
          if (squareError) {
            errorMessage = `Payment declined: ${
              squareError.detail || squareError.code
            }`;
          }
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage =
          'No response from payment server. Please check your connection and try again.';
      } else {
        // Other errors
        errorMessage = error.message || 'Payment processing failed';
      }

      setPaymentError(errorMessage);
      if (onPaymentError) {
        onPaymentError(errorMessage);
      }
    } finally {
      setIsPaying(false);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!paymentFormRef.current) {
      const errorMsg = 'Payment form not initialized';
      setPaymentError(errorMsg);
      if (onPaymentError) {
        onPaymentError(errorMsg);
      }
      return;
    }

    if (!localCustomerEmail) {
      const errorMsg = 'Please enter an email address for your receipt';
      setPaymentError(errorMsg);
      if (onPaymentError) {
        onPaymentError(errorMsg);
      }
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(localCustomerEmail)) {
      const errorMsg = 'Please enter a valid email address';
      setPaymentError(errorMsg);
      if (onPaymentError) {
        onPaymentError(errorMsg);
      }
      return;
    }

    // Validate we have something to pay for based on registration type
    if (registrationType === 'tournament') {
      // Check for team IDs
      const teamsMissingIds = effectiveTeams.filter((team) => !team._id);
      if (teamsMissingIds.length > 0) {
        const errorMsg = `${teamsMissingIds.length} team(s) are missing IDs. Please save all teams before proceeding to payment.`;
        setPaymentError(errorMsg);
        if (onPaymentError) {
          onPaymentError(errorMsg);
        }
        return;
      }
    } else {
      // Player/tryout/training requires players
      if (!effectivePlayers || effectivePlayers.length === 0) {
        const errorMsg =
          'No players selected for registration. Please go back and select players to register.';
        setPaymentError(errorMsg);
        if (onPaymentError) {
          onPaymentError(errorMsg);
        }
        return;
      }
    }

    // Validate amount
    if (calculatedAmount <= 0) {
      const errorMsg = 'Invalid payment amount';
      setPaymentError(errorMsg);
      if (onPaymentError) {
        onPaymentError(errorMsg);
      }
      return;
    }

    try {
      setIsPaying(true);
      setPaymentError(null);

      console.log('🔄 Starting payment process...', { registrationType });
      const result = await paymentFormRef.current.tokenize();
      await handleCardTokenized(result);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Payment processing failed';
      console.error('❌ Payment submission error:', errorMsg);
      setPaymentError(errorMsg);
      if (onPaymentError) {
        onPaymentError(errorMsg);
      }
    } finally {
      setIsPaying(false);
    }
  };

  const getTotalAmount = () => {
    return calculatedAmount / 100;
  };

  const getPerRegistrationAmount = () => {
    if (registrationType === 'tournament') {
      return (
        tournamentConfig?.tournamentFee || formConfig?.pricing.basePrice || 425
      );
    }

    if (selectedPackage) {
      return selectedPackage.price;
    }
    return formConfig?.pricing.basePrice || 0;
  };

  // Check if payment can be processed
  const canProcessPayment = () => {
    if (isPaying || disabled || !localCustomerEmail) return false;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(localCustomerEmail)) return false;

    // Check if we have something to pay for based on registration type
    if (registrationType === 'tournament') {
      if (effectiveTeams.length === 0) return false;
    } else {
      if (!effectivePlayers || effectivePlayers.length === 0) return false;
    }

    // Check amount
    if (calculatedAmount <= 0) return false;

    return true;
  };

  // Render payment summary details
  const renderPaymentDetails = () => {
    // Tournament registration
    if (registrationType === 'tournament') {
      if (effectiveTeams.length === 0) {
        return (
          <div className='alert alert-warning'>
            <i className='ti ti-alert-triangle me-2'></i>
            <strong>No teams found for tournament registration.</strong> Please
            go back and create teams to register.
          </div>
        );
      }

      return (
        <div className='alert alert-info'>
          <h6>Tournament Registration</h6>
          {effectiveTeams.map((team, index) => (
            <div key={index} className='mb-2'>
              <p className='mb-1'>
                <strong>Team {index + 1}:</strong> {team.name}
              </p>
              <p className='mb-1'>
                <strong>Grade:</strong> {team.grade} •{' '}
                <strong>Division:</strong> {team.levelOfCompetition}
              </p>
              <p className='mb-0'>
                <strong>Tournament:</strong> {team.tournament}{' '}
                {team.registrationYear}
              </p>
            </div>
          ))}
        </div>
      );
    }

    // Player/tryout/training registration
    if (effectivePlayers.length === 0) {
      return (
        <div className='alert alert-warning'>
          <i className='ti ti-alert-triangle me-2'></i>
          <strong>No players found for registration.</strong> Please go back and
          select players to register.
        </div>
      );
    }

    const unpaidPlayers = effectivePlayers.filter(
      (player: Player) =>
        !player.paymentComplete || player.paymentStatus !== 'paid'
    );

    const paidPlayers = effectivePlayers.filter(
      (player: Player) =>
        player.paymentComplete || player.paymentStatus === 'paid'
    );
  };

  // Render registration type-specific description
  const getRegistrationDescription = () => {
    switch (registrationType) {
      case 'tournament':
        return `Tournament Team Registration`;
      case 'tryout':
        return `Tryout Registration`;
      case 'training':
        return `Training Registration`;
      default:
        return `Player Registration`;
    }
  };

  return (
    <div className='card'>
      <div className='card-header bg-light'>
        <div className='d-flex align-items-center'>
          <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
            <i className='ti ti-credit-card fs-16' />
          </span>
          <h4 className='text-dark'>{getRegistrationDescription()}</h4>
        </div>
      </div>
      <div className='card-body'>
        {/* Payment error message */}
        {paymentError && (
          <div className='alert alert-danger mb-4'>
            <i className='ti ti-alert-triangle me-2'></i>
            <strong>Payment Error:</strong> {paymentError}
          </div>
        )}

        {/* Disabled warning message */}
        {disabled && (
          <div className='alert alert-warning mb-4'>
            <i className='ti ti-lock me-2'></i>
            Please complete all required information to continue with payment.
          </div>
        )}

        <div className='row'>
          <div className='col-12 mb-4'>
            <h5 className='mb-3'>Payment Summary</h5>
            <div className='card bg-light'>
              <div className='card-body'>
                <p className='h5 mb-1'>
                  <strong>Description:</strong> {description}
                </p>
                <p className='h4 mb-1'>
                  <strong>Total Amount:</strong> ${getTotalAmount().toFixed(2)}
                </p>
                {registrationType === 'tournament' ? (
                  <p className='text-muted mb-0'>
                    For {effectiveTeams.length} team
                    {effectiveTeams.length !== 1 ? 's' : ''}
                    {` at $${getPerRegistrationAmount().toFixed(2)} per team`}
                  </p>
                ) : (
                  <p className='text-muted mb-0'>
                    For {getEffectiveRegistrationCount()} player
                    {getEffectiveRegistrationCount() !== 1 ? 's' : ''}
                    {selectedPackage ? ` (${selectedPackage.name})` : ''}
                    {` at $${getPerRegistrationAmount().toFixed(2)} per player`}
                  </p>
                )}
                {getEffectiveRegistrationCount() === 0 && (
                  <p className='text-warning mb-0'>
                    No {registrationType === 'tournament' ? 'teams' : 'players'}{' '}
                    selected for registration
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment details */}
        {renderPaymentDetails()}

        <div className='mb-3'>
          <label className='form-label'>Email for Receipt</label>
          <input
            type='email'
            className={`form-control ${
              !localCustomerEmail ? 'is-invalid' : ''
            }`}
            value={localCustomerEmail}
            onChange={(e) =>
              setLocalCustomerEmail(e.target.value.toLowerCase())
            }
            required
            disabled={disabled || isPaying}
            placeholder='Enter email for payment receipt'
          />
          {!localCustomerEmail && (
            <div className='text-danger small mt-1'>
              Email is required for your receipt
            </div>
          )}
        </div>

        <div
          className={`payment-form-container ${disabled ? 'opacity-50' : ''}`}
        >
          <PaymentForm
            applicationId={appId}
            locationId={locationId}
            cardTokenizeResponseReceived={handleCardTokenized}
            createPaymentRequest={() => ({
              countryCode: 'US',
              currencyCode: 'USD',
              total: {
                amount: getTotalAmount().toString(),
                label: 'Total',
              },
              buyerEmailAddress: localCustomerEmail,
            })}
            ref={paymentFormRef}
          >
            <CreditCard />
          </PaymentForm>
        </div>

        {/* Security notice */}
        <div className='mt-4 p-3 bg-light rounded small'>
          <i className='ti ti-shield-check me-2 text-success'></i>
          <strong>Secure Payment:</strong> Your payment information is encrypted
          and processed securely by Square.
        </div>
      </div>
    </div>
  );
};

export default PaymentModule;
