// PlayerRegistrationModule.tsx - FULL UPDATED VERSION
import React, { useState, useEffect, useCallback } from 'react';
import { Player } from '../../../types/registration-types';
import { calculateGradeFromDOB } from '../../../utils/registration-utils';
import SchoolAutocomplete from '../../../components/SchoolAutocomplete';
import { RegistrationFormConfig } from '../../../types/registration-types';
import axios from 'axios';

interface PlayerRegistrationModuleProps {
  players: Player[];
  onPlayersChange: (players: Player[]) => void;
  registrationYear: number;
  season: string;
  isExistingUser?: boolean;
  existingPlayers?: Player[];
  paidPlayers?: Player[];
  onValidationChange?: (isValid: boolean) => void;
  showCheckboxes?: boolean;
  selectedPlayerIds?: string[];
  onPlayerSelection?: (playerId: string) => void;
  onPaymentCalculation?: (playerCount: number) => void;
  onComplete?: () => void;
  onBack?: () => void;
  parentId?: string;
  authToken?: string;
  maxPlayers?: number;
  allowMultiple?: boolean;
  // NEW PROP: Determine if this is for payment or basic registration
  requiresPayment?: boolean;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const isSamePlayer = (player1: Player, player2: Player): boolean => {
  return (
    player1.fullName?.trim().toLowerCase() ===
      player2.fullName?.trim().toLowerCase() &&
    player1.dob === player2.dob &&
    player1.gender === player2.gender
  );
};

// Custom debounce hook
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const PlayerRegistrationModule: React.FC<PlayerRegistrationModuleProps> = ({
  players,
  onPlayersChange,
  registrationYear,
  season,
  isExistingUser = false,
  existingPlayers = [],
  paidPlayers = [],
  onValidationChange,
  showCheckboxes = false,
  selectedPlayerIds = [],
  onPlayerSelection,
  onPaymentCalculation,
  onComplete,
  onBack,
  parentId,
  authToken,
  maxPlayers = 10,
  allowMultiple = true,
  requiresPayment = true,
}) => {
  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [hasSavedPlayers, setHasSavedPlayers] = useState(false);

  // Use debounced players to prevent excessive validation
  const debouncedPlayers = useDebounce(players, 500);

  // Separate paid and unpaid players for better UX
  const allExistingPlayers = useCallback(() => {
    return [...(existingPlayers || []), ...(paidPlayers || [])];
  }, [existingPlayers, paidPlayers]);

  const unpaidExistingPlayers = useCallback(() => {
    return existingPlayers.filter(
      (player) =>
        !paidPlayers.some((paidPlayer) => paidPlayer._id === player._id)
    );
  }, [existingPlayers, paidPlayers]);

  const savePlayersToBackend = async (
    playersToSave: Player[]
  ): Promise<boolean> => {
    if (!parentId || !authToken) {
      console.error('Missing parentId or authToken for saving players');
      setSaveErrors({ general: 'Authentication required. Please try again.' });
      return false;
    }

    // Duplicate prevention
    if (hasSavedPlayers) {
      console.log('ℹ️ Players already saved, skipping duplicate save');
      return true;
    }

    try {
      console.log('💾 Starting player save process...', {
        playerCount: playersToSave.length,
        parentId,
        season,
        registrationYear,
        requiresPayment, // Log whether payment is required
      });

      const savedPlayers: Player[] = [];

      // Duplicate detection
      const newPlayersToSave = playersToSave.filter((p) => {
        // Skip if already has an ID (already exists in DB)
        if (p._id) {
          console.log(
            'ℹ️ Skipping player with existing ID:',
            p._id,
            p.fullName
          );
          return false;
        }

        // Enhanced duplicate check - check against ALL existing players (paid + unpaid)
        const allExisting = [...existingPlayers, ...paidPlayers];
        const isDuplicate = allExisting.some((existing) =>
          isSamePlayer(existing, p)
        );

        if (isDuplicate) {
          console.log('⚠️ Skipping duplicate player:', {
            name: p.fullName,
            dob: p.dob,
            gender: p.gender,
          });
          return false;
        }

        return true;
      });

      console.log('🔍 Filtered new players to save:', newPlayersToSave.length);

      // If no new players to save, return success
      if (newPlayersToSave.length === 0) {
        console.log('ℹ️ No new players to save');
        setHasSavedPlayers(true);
        return true;
      }

      // Rest of your save logic...
      for (const player of newPlayersToSave) {
        // Enhanced validation
        if (
          !player.fullName?.trim() ||
          !player.gender ||
          !player.dob ||
          !player.schoolName?.trim()
        ) {
          console.error('❌ Player missing required fields:', player);
          setSaveErrors((prev) => ({
            ...prev,
            [player.fullName]: 'Missing required fields',
          }));
          continue;
        }

        console.log('🆕 Creating new player:', {
          fullName: player.fullName,
          parentId,
          season,
          year: registrationYear,
          requiresPayment, // Log payment requirement
        });

        const playerData = {
          fullName: player.fullName.trim(),
          gender: player.gender,
          dob: player.dob,
          schoolName: player.schoolName.trim(),
          healthConcerns: player.healthConcerns || '',
          aauNumber: player.aauNumber || '',
          registrationYear: registrationYear,
          season: season,
          parentId: parentId,
          grade: player.grade || '',
          isGradeOverridden: player.isGradeOverridden || false,
          skipSeasonRegistration: !requiresPayment,
        };

        const response = await axios.post(
          `${API_BASE_URL}/players/register`,
          playerData,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log('✅ Player saved successfully:', {
          response: response.data,
          skipSeasonRegistration: !requiresPayment,
        });

        // Handle duplicate response from backend
        if (
          response.data.error &&
          response.data.error.includes('already exists')
        ) {
          console.log(
            '⚠️ Backend detected duplicate, skipping:',
            player.fullName
          );
          // You might want to update the player with the existing ID
          if (response.data.duplicatePlayerId) {
            const updatedPlayer = {
              ...player,
              _id: response.data.duplicatePlayerId,
            };
            savedPlayers.push(updatedPlayer);
          }
          continue;
        }

        const savedPlayer = response.data.player || response.data;
        savedPlayers.push(savedPlayer);
      }

      // Rest of your update logic...
      // After collecting all savedPlayers
      if (savedPlayers.length > 0) {
        const finalPlayers: Player[] = [];

        players.forEach((originalPlayer) => {
          if (originalPlayer._id) {
            finalPlayers.push(originalPlayer);
          } else {
            const saved = savedPlayers.find(
              (s) =>
                s.fullName.trim().toLowerCase() ===
                  originalPlayer.fullName.trim().toLowerCase() &&
                s.dob === originalPlayer.dob &&
                s.gender === originalPlayer.gender
            );
            if (saved) {
              finalPlayers.push(saved);
            } else {
              finalPlayers.push(originalPlayer); // fallback
            }
          }
        });

        console.log('FINAL PLAYERS LIST TO SEND TO PARENT:', {
          finalPlayers,
          requiresPayment,
          seasonAdded: requiresPayment ? 'yes' : 'no',
        });
        onPlayersChange(finalPlayers);
        setHasSavedPlayers(true);
        return true;
      }

      setSaveErrors({});
      return true;
    } catch (error: any) {
      console.error('❌ Error saving players:', error);

      // Enhanced error handling for duplicates
      if (
        error.response?.data?.error?.includes('already exists') ||
        error.response?.data?.error?.includes('duplicate')
      ) {
        const duplicateId = error.response.data.duplicatePlayerId;

        // If we have a duplicate ID, we can update the player locally
        if (duplicateId) {
          const playerName =
            error.response.data.error.match(/Player "([^"]+)"/)?.[1];
          console.log('🔄 Handling duplicate player:', playerName, duplicateId);

          // Update the local player with the existing ID
          const updatedPlayers = players.map((p) =>
            p.fullName === playerName ? { ...p, _id: duplicateId } : p
          );
          onPlayersChange(updatedPlayers);

          setSaveErrors({
            general: `Player "${playerName}" already exists in your account. They have been added to your selection.`,
          });
          return true; // Consider this a success since we handled it
        }

        setSaveErrors({
          general:
            'A player with this information already exists. Please check your player list.',
        });
      } else if (error.response?.status === 409) {
        setSaveErrors({
          general:
            'This player appears to already exist in the system. Please check your existing players list.',
        });
      } else {
        setSaveErrors({
          general:
            error.response?.data?.error ||
            'Failed to save players. Please try again.',
        });
      }
      return false;
    }
  };

  // Check if all existing players are paid
  const allExistingPlayersPaid = useCallback(() => {
    return unpaidExistingPlayers().length === 0 && existingPlayers.length > 0;
  }, [unpaidExistingPlayers, existingPlayers]);

  // Check if we have any unpaid players
  const hasUnpaidPlayers = useCallback(() => {
    return unpaidExistingPlayers().length > 0;
  }, [unpaidExistingPlayers]);

  // Check if we have any paid players
  const hasPaidPlayers = useCallback(() => {
    return paidPlayers.length > 0;
  }, [paidPlayers]);

  // Initialize with new player form if all existing players are paid
  useEffect(() => {
    if (isExistingUser && allExistingPlayersPaid() && players.length === 0) {
      console.log('🎯 All existing players are paid, showing new player form');
      const initialPlayer: Player = {
        fullName: '',
        gender: '',
        dob: '',
        schoolName: '',
        healthConcerns: '',
        aauNumber: '',
        registrationYear,
        season,
        grade: '',
      };
      onPlayersChange([initialPlayer]);
      setShowNewPlayerForm(true);
      onPaymentCalculation?.(1);
    }
  }, [
    isExistingUser,
    allExistingPlayersPaid,
    players.length,
    onPlayersChange,
    onPaymentCalculation,
    registrationYear,
    season,
  ]);

  // Validation function with proper dependencies
  const validateAllPlayers = useCallback(() => {
    console.log('🔍 Running player validation...');
    const errors: Record<string, string> = {};

    // Check if we have any players to process at all
    const hasSelectedUnpaidPlayers = selectedPlayerIds.length > 0;
    const hasNewPlayers = players.some((p) => !p._id && p.fullName?.trim());
    const hasPlayersToProcess = hasSelectedUnpaidPlayers || hasNewPlayers;

    if (!hasPlayersToProcess) {
      errors.general =
        'Please select at least one player or add a new player to continue.';
      setValidationErrors(errors);
      onValidationChange?.(false);
      return false;
    }

    // Validate new players (players without _id)
    let hasValidNewPlayers = true;

    players.forEach((player, index) => {
      // Only validate new players (without _id)
      if (!player._id) {
        if (!player.fullName?.trim()) {
          errors[`player${index}FullName`] = 'Full name is required';
          hasValidNewPlayers = false;
        }
        if (!player.gender) {
          errors[`player${index}Gender`] = 'Gender is required';
          hasValidNewPlayers = false;
        }
        if (!player.dob) {
          errors[`player${index}Dob`] = 'Date of birth is required';
          hasValidNewPlayers = false;
        }
        if (!player.schoolName?.trim()) {
          errors[`player${index}School`] = 'School name is required';
          hasValidNewPlayers = false;
        }
        if (!player.grade) {
          errors[`player${index}Grade`] = 'Grade is required';
          hasValidNewPlayers = false;
        }
      }
    });

    // If we have new players but they're not valid, show error
    if (hasNewPlayers && !hasValidNewPlayers) {
      errors.general =
        'Please complete all required information for new players.';
    }

    setValidationErrors(errors);

    // Form is valid if:
    // - We have players to process AND
    // - If we have new players, they must all be valid
    const formIsValid =
      hasPlayersToProcess && (!hasNewPlayers || hasValidNewPlayers);

    console.log('🔍 Enhanced player validation result:', {
      isValid: formIsValid,
      hasSelectedUnpaidPlayers,
      hasNewPlayers,
      hasValidNewPlayers,
      hasPlayersToProcess,
      errorCount: Object.keys(errors).length,
    });

    onValidationChange?.(formIsValid);
    return formIsValid;
  }, [players, selectedPlayerIds, onValidationChange]);

  // useEffect - only runs when debouncedPlayers changes
  useEffect(() => {
    if (debouncedPlayers.length > 0 || selectedPlayerIds.length > 0) {
      validateAllPlayers();
    }
  }, [debouncedPlayers, selectedPlayerIds]); // Remove validateAllPlayers from dependencies

  const addPlayer = () => {
    const newPlayer: Player = {
      fullName: '',
      gender: '',
      dob: '',
      schoolName: '',
      healthConcerns: '',
      aauNumber: '',
      registrationYear,
      season,
      grade: '',
    };
    const updatedPlayers = [...players, newPlayer];
    onPlayersChange(updatedPlayers);
    onPaymentCalculation?.(
      updatedPlayers.filter((p) => !p._id || selectedPlayerIds.includes(p._id!))
        .length
    );
    setShowNewPlayerForm(true);
  };

  const removePlayer = (index: number) => {
    const updatedPlayers = [...players];
    const removedPlayer = updatedPlayers[index];
    updatedPlayers.splice(index, 1);
    onPlayersChange(updatedPlayers);

    if (removedPlayer._id && onPlayerSelection) {
      onPlayerSelection(removedPlayer._id);
    }

    const effectivePlayerCount = updatedPlayers.filter(
      (p) => !p._id || selectedPlayerIds.includes(p._id!)
    ).length;
    onPaymentCalculation?.(effectivePlayerCount);

    if (updatedPlayers.every((p) => p._id)) {
      setShowNewPlayerForm(false);
    }
  };

  const handlePlayerChange = (
    index: number,
    field: keyof Player,
    value: string
  ) => {
    const updatedPlayers = [...players];
    const updatedPlayer = { ...updatedPlayers[index], [field]: value };

    if (field === 'dob' && !updatedPlayer.isGradeOverridden) {
      // Ensure date is in YYYY-MM-DD format for consistent parsing
      const dob = value;

      // Validate date format
      if (dob && dob.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const calculatedGrade = calculateGradeFromDOB(dob, registrationYear);
        console.log('📊 Grade calculation for player:', {
          name: updatedPlayer.fullName,
          dob,
          registrationYear,
          calculatedGrade,
        });

        updatedPlayer.grade = calculatedGrade;

        // Also check if the calculated grade matches the current grade
        if (
          updatedPlayers[index].grade &&
          updatedPlayers[index].grade !== calculatedGrade
        ) {
          console.warn('⚠️ Grade mismatch detected:', {
            previous: updatedPlayers[index].grade,
            calculated: calculatedGrade,
            dob,
          });
        }
      }
    }

    updatedPlayers[index] = updatedPlayer;
    onPlayersChange(updatedPlayers);
  };

  const handleGradeOverride = (index: number) => {
    const updatedPlayers = [...players];
    updatedPlayers[index] = {
      ...updatedPlayers[index],
      isGradeOverridden: true,
    };
    onPlayersChange(updatedPlayers);
  };

  const handlePlayerSelection = (playerId: string) => {
    // Only allow selection if payment is required
    if (!requiresPayment) {
      return;
    }

    if (onPlayerSelection) {
      onPlayerSelection(playerId);

      const isSelected = selectedPlayerIds.includes(playerId);
      const player = unpaidExistingPlayers().find((p) => p._id === playerId);

      if (player) {
        if (isSelected) {
          const updatedPlayers = players.filter(
            (p: Player) => !(p._id && p._id === playerId)
          );
          onPlayersChange(updatedPlayers);
          const effectivePlayerCount = updatedPlayers.filter(
            (p) =>
              !p._id ||
              selectedPlayerIds.filter((id) => id !== playerId).includes(p._id!)
          ).length;
          onPaymentCalculation?.(effectivePlayerCount);
        } else {
          // Add to selected players
          const playerAlreadyInList = players.some(
            (p: Player) => p._id === playerId
          );
          if (!playerAlreadyInList) {
            const playerWithSeason: Player = {
              ...player,
              registrationYear,
              season,
            };
            const updatedPlayers = [...players, playerWithSeason];
            onPlayersChange(updatedPlayers);
          }
          const effectivePlayerCount = players.filter(
            (p) => !p._id || [...selectedPlayerIds, playerId].includes(p._id!)
          ).length;
          onPaymentCalculation?.(effectivePlayerCount);
        }
      }
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSaveErrors({});

    const isValid = validateAllPlayers();

    if (!isValid) {
      setIsSubmitting(false);
      window.scrollTo(0, 0);
      return;
    }

    try {
      // Only save BRAND NEW players (no _id), not existing players
      const brandNewPlayers = players.filter((p) => !p._id);

      console.log('🔍 Players to process:', {
        total: players.length,
        brandNew: brandNewPlayers.length,
        existing: players.filter((p) => p._id).length,
        hasSavedPlayers,
      });

      // Only save if we have new players AND haven't saved them yet
      if (brandNewPlayers.length > 0 && !hasSavedPlayers) {
        console.log(
          '💾 Saving brand new players to backend...',
          brandNewPlayers.length
        );
        const saveSuccess = await savePlayersToBackend(brandNewPlayers);

        if (!saveSuccess) {
          setIsSubmitting(false);
          window.scrollTo(0, 0);
          return;
        }

        // Set the flag immediately after successful save
        setHasSavedPlayers(true);
      } else if (hasSavedPlayers) {
        console.log('ℹ️ Players already saved, skipping duplicate save');
      } else {
        console.log(
          'ℹ️ No new players to save, only existing players selected'
        );
      }

      console.log(
        '✅ Player selection/save completed, proceeding to next step'
      );
      onComplete?.();
    } catch (error) {
      console.error('Error submitting player form:', error);
      setSaveErrors({
        general: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render player list with better UX
  const renderPlayerList = () => {
    if (
      !isExistingUser ||
      (allExistingPlayers().length === 0 && !showCheckboxes)
    ) {
      return null;
    }

    return (
      <div className='card mb-4'>
        <div className='card-header bg-light'>
          <div className='d-flex align-items-center'>
            <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
              <i className='ti ti-users fs-16' />
            </span>
            <h4 className='text-dark'>Your Players</h4>
          </div>
        </div>
        <div className='card-body'>
          {/* Paid Players Section - Only show when requiresPayment is true */}
          {hasPaidPlayers() && requiresPayment && (
            <div className='mb-4'>
              <h6 className='text-success mb-3'>
                <i className='ti ti-circle-check me-2'></i>
                Already Registered & Paid
              </h6>
              {paidPlayers.map((player) => (
                <div
                  key={player._id}
                  className='d-flex justify-content-between align-items-center p-3 border rounded mb-2 bg-light'
                >
                  <div>
                    <strong>{player.fullName}</strong>
                    <span className='text-muted ms-2'>
                      - {player.grade} Grade
                    </span>
                  </div>
                  <span className='badge bg-success'>
                    <i className='ti ti-check me-1'></i>Paid
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Unpaid Players Section - Only show checkboxes when requiresPayment is true */}
          {hasUnpaidPlayers() && (
            <div className='mb-4'>
              <h6 className='text-warning mb-3'>
                <i className='ti ti-alert-circle me-2'></i>
                {requiresPayment
                  ? 'Select Players to Register'
                  : 'Your Registered Players'}
              </h6>
              {unpaidExistingPlayers().map((player) => {
                // Only show checkboxes when payment is required
                if (requiresPayment) {
                  const isSelected = selectedPlayerIds.includes(player._id!);
                  return (
                    <div
                      key={player._id}
                      className={`d-flex justify-content-between align-items-center p-3 border rounded mb-2 ${
                        isSelected ? 'border-primary bg-light' : ''
                      }`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handlePlayerSelection(player._id!)}
                    >
                      <div className='d-flex align-items-center'>
                        <input
                          type='checkbox'
                          className='form-check-input me-3'
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ transform: 'scale(1.2)' }}
                        />
                        <div>
                          <strong>{player.fullName}</strong>
                          <span className='text-muted ms-2'>
                            - {player.grade} Grade
                          </span>
                        </div>
                      </div>
                      <span className='badge bg-warning text-dark'>
                        <i className='ti ti-clock me-1'></i>
                        {requiresPayment
                          ? 'Payment Pending'
                          : 'Registration Pending'}
                      </span>
                    </div>
                  );
                } else {
                  // When no payment required, just show player info without checkbox
                  return (
                    <div
                      key={player._id}
                      className='d-flex justify-content-between align-items-center p-3 border rounded mb-2'
                    >
                      <div>
                        <strong>{player.fullName}</strong>
                        <span className='text-muted ms-2'>
                          - {player.grade} Grade
                        </span>
                      </div>
                      <span className='badge bg-info'>
                        <i className='ti ti-user me-1'></i>
                        Registered
                      </span>
                    </div>
                  );
                }
              })}
            </div>
          )}

          {/* Add Player Button - Show regardless of payment requirement */}
          {(hasUnpaidPlayers() || allExistingPlayers().length === 0) &&
            !showNewPlayerForm && (
              <div className='text-center mt-4'>
                <button
                  type='button'
                  className='btn btn-outline-primary'
                  onClick={addPlayer}
                >
                  <i className='ti ti-plus me-2'></i>
                  {requiresPayment ? 'Add Additional Player' : 'Add New Player'}
                </button>
              </div>
            )}

          {/* Show new player form automatically if all existing players are paid */}
          {allExistingPlayersPaid() && !showNewPlayerForm && (
            <div className='text-center mt-4'>
              <button
                type='button'
                className='btn btn-primary'
                onClick={addPlayer}
              >
                <i className='ti ti-plus me-2'></i>
                Register New Player
              </button>
              <p className='text-muted mt-2 small'>
                All your current players are registered and paid. Add a new
                player to register them for this season.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderUniversalCTA = () => {
    const hasSelectedUnpaidPlayers = selectedPlayerIds.length > 0;
    const hasNewPlayers = players.some((p) => !p._id && p.fullName?.trim());
    const hasPlayersToProcess = hasSelectedUnpaidPlayers || hasNewPlayers;

    // Enhanced validation: Check if new players are actually valid (have required fields)
    const areNewPlayersValid = players
      .filter((p) => !p._id)
      .every(
        (player) =>
          player.fullName?.trim() &&
          player.gender &&
          player.dob &&
          player.schoolName?.trim() &&
          player.grade
      );

    // For existing unpaid players, we just need at least one selected
    const areSelectedPlayersValid = hasSelectedUnpaidPlayers;

    // For new players, we need all of them to be valid
    const isNewPlayersSectionValid = hasNewPlayers ? areNewPlayersValid : true;

    // Overall form is valid if:
    // - We have players to process AND
    // - If we have new players, they must all be valid AND
    // - If we only have selected players, that's automatically valid
    const isFormValid = hasPlayersToProcess && isNewPlayersSectionValid;

    const totalPlayersNeedingPayment = requiresPayment
      ? selectedPlayerIds.length + players.filter((p) => !p._id).length
      : 0;

    // Determine button text and icon based on whether payment is required
    const buttonText = requiresPayment
      ? 'Continue to Payment'
      : 'Complete Registration';
    const buttonIcon = requiresPayment ? 'ti ti-credit-card' : 'ti ti-check';

    const readyText = requiresPayment
      ? 'Ready to Make Payment'
      : 'Ready to Complete Registration';

    const statusText = requiresPayment
      ? 'ready for payment'
      : 'ready for registration';

    // NEW LOGIC: Don't show CTA when:
    // 1. No payment required AND
    // 2. No new players added AND
    // 3. No existing players selected
    if (!requiresPayment && !hasNewPlayers && !hasSelectedUnpaidPlayers) {
      return null; // Don't show any CTA section
    }

    // Always render the CTA card, but control button state
    return (
      <div className='card mt-4'>
        <div className='card-body'>
          <div className='d-flex justify-content-between align-items-center'>
            <div>
              <h5 className='mb-1'>{readyText}</h5>
              <p className='text-muted mb-0'>
                {isFormValid ? (
                  <>
                    {totalPlayersNeedingPayment} player
                    {totalPlayersNeedingPayment !== 1 ? 's' : ''} {statusText}
                    {hasSelectedUnpaidPlayers &&
                      hasNewPlayers &&
                      ' (selected existing + new players)'}
                    {hasSelectedUnpaidPlayers &&
                      !hasNewPlayers &&
                      ' (selected existing players)'}
                    {!hasSelectedUnpaidPlayers &&
                      hasNewPlayers &&
                      ' (new players)'}
                  </>
                ) : (
                  'Select players or add new players to continue'
                )}
              </p>
              {!isFormValid && (
                <p className='text-warning small mb-0 mt-1'>
                  <i className='ti ti-alert-triangle me-1'></i>
                  {hasNewPlayers && !areNewPlayersValid
                    ? 'Complete all required information for new players'
                    : 'Select at least one player or add a new player'}
                </p>
              )}
            </div>
            <button
              type='button'
              className={`btn btn-lg ${
                isFormValid ? 'btn-primary' : 'btn-secondary'
              }`}
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? (
                <>
                  <span className='spinner-border spinner-border-sm me-2'></span>
                  Processing...
                </>
              ) : (
                <>
                  <i className={`${buttonIcon} me-2`}></i>
                  {buttonText}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render new player form
  const renderNewPlayerForm = () => {
    if (!showNewPlayerForm && players.filter((p) => !p._id).length === 0) {
      return null;
    }

    const newPlayers = players.filter((p) => !p._id);

    return (
      <div className='card'>
        <div className='card-header bg-light'>
          <div className='d-flex align-items-center justify-content-between'>
            <div className='d-flex align-items-center'>
              <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                <i className='ti ti-user-plus fs-16' />
              </span>
              <h4 className='text-dark'>
                {newPlayers.length > 1
                  ? 'New Players Information'
                  : 'New Player Information'}
              </h4>
            </div>
            {newPlayers.length > 0 && (
              <button
                type='button'
                className='btn btn-sm btn-outline-danger'
                onClick={() => {
                  setShowNewPlayerForm(false);
                  // Remove all new players
                  const updatedPlayers = players.filter((p) => p._id);
                  onPlayersChange(updatedPlayers);
                  onPaymentCalculation?.(selectedPlayerIds.length);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
        <div className='card-body'>
          <div className='mb-4'>
            <h5>
              Register New Player{newPlayers.length > 1 ? 's' : ''} for {season}
            </h5>
            <p className='text-muted'>
              Add information for the new player
              {newPlayers.length > 1 ? 's' : ''} you'd like to register.
            </p>
          </div>

          {newPlayers.map((player, index) => {
            const actualIndex = players.findIndex((p) => p === player);
            return (
              <div
                key={`new-${actualIndex}`}
                className='player-form-section mb-4 border-bottom pb-4'
              >
                {newPlayers.length > 1 && (
                  <div className='d-flex justify-content-between align-items-center mb-3'>
                    <h6 className='text-primary'>New Player {index + 1}</h6>
                    <button
                      type='button'
                      className='btn btn-sm btn-outline-danger'
                      onClick={() => removePlayer(actualIndex)}
                    >
                      Remove Player
                    </button>
                  </div>
                )}

                <div className='row'>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>Full Name</label>
                      <input
                        type='text'
                        className={`form-control ${
                          validationErrors[`player${actualIndex}FullName`]
                            ? 'is-invalid'
                            : ''
                        }`}
                        value={player.fullName}
                        onChange={(e) =>
                          handlePlayerChange(
                            actualIndex,
                            'fullName',
                            e.target.value
                          )
                        }
                        required
                      />
                      {validationErrors[`player${actualIndex}FullName`] && (
                        <div className='invalid-feedback'>
                          {validationErrors[`player${actualIndex}FullName`]}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>Gender</label>
                      <select
                        className={`form-control ${
                          validationErrors[`player${actualIndex}Gender`]
                            ? 'is-invalid'
                            : ''
                        }`}
                        value={player.gender}
                        onChange={(e) =>
                          handlePlayerChange(
                            actualIndex,
                            'gender',
                            e.target.value
                          )
                        }
                        required
                      >
                        <option value=''>Select Gender</option>
                        <option value='Male'>Male</option>
                        <option value='Female'>Female</option>
                      </select>
                      {validationErrors[`player${actualIndex}Gender`] && (
                        <div className='invalid-feedback'>
                          {validationErrors[`player${actualIndex}Gender`]}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>Date of Birth</label>
                      <input
                        type='date'
                        className={`form-control ${
                          validationErrors[`player${actualIndex}Dob`]
                            ? 'is-invalid'
                            : ''
                        }`}
                        value={player.dob}
                        onChange={(e) =>
                          handlePlayerChange(actualIndex, 'dob', e.target.value)
                        }
                        required
                      />
                      {validationErrors[`player${actualIndex}Dob`] && (
                        <div className='invalid-feedback'>
                          {validationErrors[`player${actualIndex}Dob`]}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>School Name</label>
                      <SchoolAutocomplete
                        value={player.schoolName}
                        onChange={(val) =>
                          handlePlayerChange(actualIndex, 'schoolName', val)
                        }
                      />
                      {validationErrors[`player${actualIndex}School`] && (
                        <div className='invalid-feedback'>
                          {validationErrors[`player${actualIndex}School`]}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>Grade</label>
                      <select
                        className={`form-control ${
                          validationErrors[`player${actualIndex}Grade`]
                            ? 'is-invalid'
                            : ''
                        }`}
                        value={player.grade}
                        onChange={(e) =>
                          handlePlayerChange(
                            actualIndex,
                            'grade',
                            e.target.value
                          )
                        }
                        required
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
                      {player.dob && !player.isGradeOverridden && (
                        <div className='text-muted small mt-1'>
                          Auto-calculated: {player.grade} Grade
                          <button
                            type='button'
                            className='btn btn-link btn-sm p-0 ms-2'
                            onClick={() => handleGradeOverride(actualIndex)}
                          >
                            Adjust Grade
                          </button>
                        </div>
                      )}
                      {validationErrors[`player${actualIndex}Grade`] && (
                        <div className='invalid-feedback'>
                          {validationErrors[`player${actualIndex}Grade`]}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>Health Concerns</label>
                      <input
                        type='text'
                        className='form-control'
                        value={player.healthConcerns}
                        onChange={(e) =>
                          handlePlayerChange(
                            actualIndex,
                            'healthConcerns',
                            e.target.value
                          )
                        }
                        placeholder='Any allergies, medications, or health conditions'
                      />
                    </div>
                  </div>
                  <div className='col-md-6'>
                    <div className='mb-3'>
                      <label className='form-label'>AAU Number</label>
                      <input
                        type='text'
                        className='form-control'
                        value={player.aauNumber}
                        onChange={(e) =>
                          handlePlayerChange(
                            actualIndex,
                            'aauNumber',
                            e.target.value
                          )
                        }
                        placeholder='If applicable'
                      />
                    </div>
                  </div>
                </div>

                {/* Add another player button for new players only */}
                {index === newPlayers.length - 1 && (
                  <div className='mt-3'>
                    <button
                      type='button'
                      className='btn btn-outline-primary'
                      onClick={addPlayer}
                    >
                      <i className='ti ti-plus me-2'></i>
                      Add Another Player
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Validation summary */}
          {Object.keys(validationErrors).length > 0 && (
            <div className='alert alert-warning mt-3'>
              <i className='ti ti-alert-triangle me-2'></i>
              Please complete all required player information to continue.
            </div>
          )}
        </div>
      </div>
    );
  };

  // For new users (non-existing users)
  if (!isExistingUser) {
    return (
      <div>
        <div className='card'>
          <div className='card-header bg-light'>
            <div className='d-flex align-items-center'>
              <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
                <i className='ti ti-shirt-sport fs-16' />
              </span>
              <h4 className='text-dark'>Player Information</h4>
            </div>
          </div>
          <div className='card-body'>
            <div className='mb-4'>
              <h5>Register Players for {season}</h5>
              <p className='text-muted'>
                Add information for each player you'd like to register.
              </p>
            </div>

            {renderNewPlayerForm()}

            {!showNewPlayerForm && players.length === 0 && (
              <div className='text-center'>
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={addPlayer}
                >
                  <i className='ti ti-plus me-2'></i>
                  Add Player
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CTA for new users when they have players */}
        {players.length > 0 && (
          <div className='card mt-4'>
            <div className='card-body'>
              <div className='d-flex justify-content-between align-items-center'>
                <div>
                  <h5 className='mb-1'>
                    {requiresPayment
                      ? 'Ready to Make Payment'
                      : 'Ready to Complete Registration'}
                  </h5>
                  <p className='text-muted mb-0'>
                    {players.length} player{players.length !== 1 ? 's' : ''}{' '}
                    added
                  </p>
                  {players.some(
                    (p) =>
                      !p.fullName?.trim() ||
                      !p.gender ||
                      !p.dob ||
                      !p.schoolName?.trim() ||
                      !p.grade
                  ) && (
                    <p className='text-warning small mb-0 mt-1'>
                      <i className='ti ti-alert-triangle me-1'></i>
                      Complete all required information for players
                    </p>
                  )}
                </div>
                <button
                  type='button'
                  className={`btn btn-lg ${
                    players.length > 0 &&
                    players.every(
                      (p) =>
                        p.fullName?.trim() &&
                        p.gender &&
                        p.dob &&
                        p.schoolName?.trim() &&
                        p.grade
                    )
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }`}
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting ||
                    players.length === 0 ||
                    !players.every(
                      (p) =>
                        p.fullName?.trim() &&
                        p.gender &&
                        p.dob &&
                        p.schoolName?.trim() &&
                        p.grade
                    )
                  }
                >
                  {isSubmitting ? (
                    <>
                      <span className='spinner-border spinner-border-sm me-2'></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i
                        className={`${
                          requiresPayment ? 'ti ti-credit-card' : 'ti ti-check'
                        } me-2`}
                      ></i>
                      {requiresPayment
                        ? 'Continue to Payment'
                        : 'Complete Registration'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // For existing users with the new UX
  return (
    <div>
      {saveErrors.general && (
        <div className='alert alert-danger mb-4'>
          <i className='ti ti-alert-circle me-2'></i>
          {saveErrors.general}
        </div>
      )}

      {/* Player List Section */}
      {renderPlayerList()}

      {/* New Player Form Section */}
      {renderNewPlayerForm()}

      {/* Universal CTA - appears for both selected unpaid players AND new players */}
      {renderUniversalCTA()}

      {/* Show validation error if no players selected/added */}
      {requiresPayment &&
        !hasUnpaidPlayers() &&
        !showNewPlayerForm &&
        selectedPlayerIds.length === 0 && (
          <div className='alert alert-info text-center'>
            <i className='ti ti-info-circle me-2'></i>
            Please select existing players to register or add new players to
            continue.
          </div>
        )}
    </div>
  );
};

export default PlayerRegistrationModule;
