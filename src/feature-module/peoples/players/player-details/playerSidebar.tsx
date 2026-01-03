import React from 'react';
import { Link } from 'react-router-dom';
import { all_routes } from '../../../router/all_routes';
import { useAuth } from '../../../../context/AuthContext';
import { formatDate } from '../../../../utils/dateFormatter';
import { isPlayerActive } from '../../../../utils/season';
import { formatPhoneNumber } from '../../../../utils/phone';
import { Player, Guardian } from '../../../../types/playerTypes';

interface PlayerSidebarProps {
  player: Player;
  guardians: Guardian[];
  token?: string | null;
  primaryParent: Guardian | null;
  siblings: Player[];
  sharedData?: {
    familyGuardians: Guardian[];
    familyAddress?:
      | string
      | {
          street: string;
          street2?: string;
          city: string;
          state: string;
          zip: string;
        };
  };
}

// Define the season type locally for safety
interface PlayerSeason {
  season: string;
  year: number;
  tryoutId?: string;
  registrationDate?: string | Date;
  paymentComplete?: boolean;
  paymentStatus?: 'paid' | 'pending' | 'failed' | 'refunded';
  paymentId?: string;
  amountPaid?: number;
  cardLast4?: string;
  cardBrand?: string;
  paymentDate?: string | Date;
}

const PlayerSidebar: React.FC<PlayerSidebarProps> = ({
  player,
  guardians,
  primaryParent,
  siblings,
  sharedData = {
    familyGuardians: guardians,
    familyAddress: primaryParent?.address,
  },
}) => {
  const { user } = useAuth();

  if (!player) {
    return <div>No player data found.</div>;
  }

  // Format date of birth without timezone issues
  const formatPlayerDob = (): string => {
    if (!player.dob) return 'N/A';

    try {
      // If it's an ISO string (from MongoDB), extract just YYYY-MM-DD
      if (typeof player.dob === 'string') {
        const [datePart] = player.dob.split('T');
        return formatDate(datePart); // Will format as MM/DD/YYYY
      }

      // If it's a Date object (shouldn't happen with MongoDB data)
      if (player.dob instanceof Date) {
        return formatDate(player.dob);
      }

      return 'N/A';
    } catch (error) {
      console.error('Error formatting date of birth:', error);
      return 'N/A';
    }
  };

  // Helper functions
  const getDisplayName = () => player.fullName || player.name || 'N/A';
  const getJoinDate = () => {
    if (player.DateofJoin) return player.DateofJoin;
    if (player.createdAt) return player.createdAt;
    return undefined;
  };

  const formatGrade = (grade?: string | number) => {
    if (!grade) return 'N/A';

    const gradeNum =
      typeof grade === 'string' ? parseInt(grade.replace(/\D/g, '')) : grade;

    if (isNaN(gradeNum)) return grade.toString();

    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = gradeNum % 100;
    return `${gradeNum}${
      suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]
    } Grade`;
  };

  // UPDATED: Enhanced player status function that checks seasons data
  const getPlayerStatus = (
    playerData: Player
  ): 'Active' | 'Inactive' | 'Pending Payment' => {
    // First, check if we have seasons data
    const playerWithSeasons = playerData as any;
    if (playerWithSeasons.seasons && Array.isArray(playerWithSeasons.seasons)) {
      const seasons = playerWithSeasons.seasons as PlayerSeason[];

      // Check if player has any paid seasons
      const hasPaidSeasons = seasons.some(
        (season) =>
          season.paymentStatus === 'paid' || season.paymentComplete === true
      );

      // Check if player has any pending payments
      const hasPendingPayments = seasons.some(
        (season) =>
          season.paymentStatus === 'pending' || season.paymentComplete === false
      );

      // If player has at least one paid season, they are active
      if (hasPaidSeasons) {
        return 'Active';
      }

      // If player has pending payments but no paid seasons
      if (hasPendingPayments) {
        return 'Pending Payment';
      }

      // If no seasons have payment info, fall back to other methods
    }

    // Fallback to original logic for players without seasons data
    const { registrationComplete, paymentComplete } = playerData;

    // If properties don't exist, try to determine status from other fields
    if (
      typeof registrationComplete === 'undefined' ||
      typeof paymentComplete === 'undefined'
    ) {
      // Fallback to checking season/registration year if available
      if (playerData.season && playerData.registrationYear !== undefined) {
        const active = isPlayerActive({
          season: playerData.season,
          registrationYear: playerData.registrationYear,
        });
        return active ? 'Active' : 'Inactive';
      }
      return 'Inactive';
    }

    if (registrationComplete && paymentComplete) {
      return 'Active';
    }
    if (registrationComplete && !paymentComplete) {
      return 'Pending Payment';
    }
    return 'Inactive';
  };

  const shouldShowSiblings = siblings?.length > 0 && user?.role !== 'admin';

  // Get all seasons/events for the player with type safety
  const getPlayerSeasons = (): PlayerSeason[] => {
    const playerWithSeasons = player as any; // Type assertion to bypass TypeScript
    if (playerWithSeasons.seasons && Array.isArray(playerWithSeasons.seasons)) {
      return playerWithSeasons.seasons as PlayerSeason[];
    }
    return [];
  };

  // Get payment status for a season with fallbacks
  const getSeasonPaymentStatus = (season: PlayerSeason): string => {
    if (season.paymentStatus) return season.paymentStatus;
    if (season.paymentComplete) return 'paid';
    return 'pending';
  };

  // Get payment status for the main player with fallbacks
  const getPlayerPaymentStatus = (): string => {
    const playerWithPayment = player as any; // Type assertion
    if (playerWithPayment.paymentStatus) return playerWithPayment.paymentStatus;
    if (player.paymentComplete) return 'paid';
    return 'pending';
  };

  // Group seasons by year for better organization
  const groupSeasonsByYear = () => {
    const seasons = getPlayerSeasons();
    const grouped: { [year: number]: PlayerSeason[] } = {};

    seasons.forEach((season) => {
      const year = season.year || player.registrationYear;
      if (year) {
        if (!grouped[year]) {
          grouped[year] = [];
        }
        grouped[year].push(season);
      }
    });

    return grouped;
  };

  const seasonsByYear = groupSeasonsByYear();
  const hasSeasons = getPlayerSeasons().length > 0;

  const getDisplayParent = () => {
    // If primary parent is provided and has data, use it
    if (primaryParent && (primaryParent.phone || primaryParent.email)) {
      return primaryParent;
    }

    // Otherwise try to find a guardian with contact info
    const guardianWithContact = guardians.find((g) => g.phone || g.email);
    return guardianWithContact || null;
  };

  const displayParent = getDisplayParent();

  return (
    <div className='col-xxl-3 col-xl-4 theiaStickySidebar'>
      <div className='stickybar pb-4'>
        <div className='card border-white'>
          <div className='card-header'>
            <div className='d-flex align-items-center flex-wrap row-gap-3'>
              <div className='d-flex align-items-center justify-content-center avatar avatar-xxl border border-dashed me-2 flex-shrink-0 text-dark frames'>
                <img
                  src={
                    player.avatar && player.avatar.trim() !== ''
                      ? player.avatar.includes('res.cloudinary.com')
                        ? `${player.avatar}?${Date.now()}` // Add timestamp to prevent caching
                        : player.avatar.startsWith('/')
                        ? `https://partizan-be.onrender.com${player.avatar}`
                        : player.avatar
                      : player.gender === 'Female'
                      ? 'https://partizan-be.onrender.com/uploads/avatars/girl.png'
                      : 'https://partizan-be.onrender.com/uploads/avatars/boy.png'
                  }
                  className='img-fluid rounded-circle'
                  alt={`${player.fullName || player.name || 'Player'} avatar`}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src =
                      player.gender === 'Female'
                        ? 'https://partizan-be.onrender.com/uploads/avatars/girl.png'
                        : 'https://partizan-be.onrender.com/uploads/avatars/boy.png';
                  }}
                />
              </div>
              <div className='overflow-hidden'>
                <span
                  className={`badge badge-soft-${
                    getPlayerStatus(player) === 'Active'
                      ? 'success'
                      : getPlayerStatus(player) === 'Pending Payment'
                      ? 'warning'
                      : 'danger'
                  } d-inline-flex align-items-center mb-1`}
                >
                  <i
                    className={`ti ti-circle-filled fs-5 me-1 ${
                      getPlayerStatus(player) === 'Active'
                        ? 'text-success'
                        : getPlayerStatus(player) === 'Pending Payment'
                        ? 'text-warning'
                        : 'text-danger'
                    }`}
                  />
                  {getPlayerStatus(player)}
                </span>
                <h5 className='mb-1 text-truncate'>{getDisplayName()}</h5>
                <p className='mb-1'>
                  Member since:{' '}
                  {getJoinDate() ? formatDate(getJoinDate()) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className='card-body'>
            <h5 className='mb-3'>Basic Information</h5>
            <dl className='row mb-0'>
              <dt className='col-6 fw-medium text-dark mb-3'>Date Of Birth</dt>
              <dd className='col-6 mb-3'>{formatPlayerDob()}</dd>

              <dt className='col-6 fw-medium text-dark mb-3'>Gender</dt>
              <dd className='col-6 mb-3'>{player.gender || 'N/A'}</dd>

              <dt className='col-6 fw-medium text-dark mb-3'>School</dt>
              <dd className='col-6 mb-3'>
                {player.section || player.schoolName || 'N/A'}
              </dd>

              <dt className='col-6 fw-medium text-dark mb-3'>Grade</dt>
              <dd className='col-6 mb-3'>
                {formatGrade(player.grade || player.class)}
              </dd>

              <dt className='col-6 fw-medium text-dark mb-3'>AAU Number</dt>
              <dd className='col-6 mb-3'>{player.aauNumber || 'N/A'}</dd>

              {/* Seasons/Events Information */}
              <dt className='col-12 fw-medium text-dark mb-2 mt-3'>
                Seasons & Events
              </dt>
              <dd className='col-12 mb-3'>
                {hasSeasons ? (
                  <div className='seasons-list'>
                    {Object.entries(seasonsByYear).map(([year, seasons]) => (
                      <div key={year} className='season-year-group mb-3'>
                        <h6 className='text-dark fw-medium mb-2'>
                          {year} Season
                        </h6>
                        {seasons.map((season, index) => {
                          const paymentStatus = getSeasonPaymentStatus(season);
                          const isPaid = paymentStatus === 'paid';

                          return (
                            <div
                              key={index}
                              className='season-item mb-2 p-2 bg-light rounded'
                            >
                              <div className='d-flex justify-content-between align-items-start'>
                                <div>
                                  <strong>{season.season}</strong>
                                  {season.tryoutId && (
                                    <div className='text-muted small'>
                                      ID: {season.tryoutId}
                                    </div>
                                  )}
                                  {season.registrationDate && (
                                    <div className='text-muted small'>
                                      Registered:{' '}
                                      {formatDate(season.registrationDate)}
                                    </div>
                                  )}
                                </div>
                                <span
                                  className={`badge badge-soft-${
                                    isPaid ? 'success' : 'warning'
                                  }`}
                                >
                                  {isPaid ? 'Paid' : 'Pending'}
                                </span>
                              </div>
                              {season.amountPaid && (
                                <div className='text-muted small mt-1'>
                                  Amount: ${season.amountPaid}
                                  {season.cardBrand && season.cardLast4 && (
                                    <span className='ms-2'>
                                      {season.cardBrand} •••• {season.cardLast4}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ) : player.season || player.registrationYear ? (
                  // Fallback to single season if no seasons array
                  <div className='single-season'>
                    <div className='d-flex justify-content-between align-items-center'>
                      <span>
                        {player.season ? `${player.season}` : 'Season'} /{' '}
                        {player.registrationYear
                          ? `${player.registrationYear}`
                          : 'Year'}
                      </span>
                      <span
                        className={`badge badge-soft-${
                          getPlayerPaymentStatus() === 'paid'
                            ? 'success'
                            : 'warning'
                        }`}
                      >
                        {getPlayerPaymentStatus() === 'paid'
                          ? 'Paid'
                          : 'Pending'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className='text-muted'>No season data available</span>
                )}
              </dd>
            </dl>
          </div>
        </div>

        {/* Rest of the component remains the same */}
        <div className='card border-white'>
          <div className='card-body'>
            <h5 className='mb-3'>Primary Contact Info</h5>
            {displayParent ? (
              <>
                <div className='d-flex align-items-center mb-3'>
                  <span className='avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default'>
                    <i className='ti ti-phone' />
                  </span>
                  <div>
                    <span className='text-dark fw-medium mb-1'>
                      Phone Number
                    </span>
                    <p>
                      {displayParent.phone
                        ? formatPhoneNumber(displayParent.phone)
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className='d-flex align-items-center mb-3'>
                  <span className='avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default'>
                    <i className='ti ti-mail' />
                  </span>
                  <div>
                    <span className='text-dark fw-medium mb-1'>
                      Email Address
                    </span>
                    <p>{displayParent.email || 'N/A'}</p>
                  </div>
                </div>

                {displayParent.relationship && (
                  <div className='d-flex align-items-center mb-3'>
                    <span className='avatar avatar-md bg-light-300 rounded me-2 flex-shrink-0 text-default'>
                      <i className='ti ti-users' />
                    </span>
                    <div>
                      <span className='text-dark fw-medium mb-1'>
                        Relationship
                      </span>
                      <p>{displayParent.relationship}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className='text-muted'>No contact information available</p>
            )}
            <hr className='my-3' />
          </div>
        </div>

        {shouldShowSiblings && (
          <div className='card border-white'>
            <div className='card-body'>
              <h5 className='mb-3'>Sibling Information</h5>
              <div className='d-flex align-items-center bg-light-300 rounded p-3 mb-3'>
                <div className='ms-2'>
                  <ul>
                    {siblings.map((sibling) => {
                      const siblingId = sibling.id || sibling._id;
                      if (!siblingId) {
                        console.error('Sibling has no ID:', sibling);
                        return null;
                      }

                      return (
                        <li key={siblingId}>
                          <div className='d-flex align-items-center flex-wrap row-gap-3 mb-3'>
                            <div className='d-flex align-items-center justify-content-center avatar avatar-xxl'>
                              <span className='avatar avatar-lg'>
                                <img
                                  src={
                                    sibling.avatar &&
                                    sibling.avatar.trim() !== ''
                                      ? sibling.avatar.includes(
                                          'res.cloudinary.com'
                                        )
                                        ? `${sibling.avatar}?${Date.now()}`
                                        : sibling.avatar.startsWith('/')
                                        ? `https://partizan-be.onrender.com${sibling.avatar}`
                                        : sibling.avatar
                                      : sibling.gender === 'Female'
                                      ? 'https://partizan-be.onrender.com/uploads/avatars/girl.png'
                                      : 'https://partizan-be.onrender.com/uploads/avatars/boy.png'
                                  }
                                  className='img-fluid rounded-circle'
                                  alt={`${
                                    sibling.fullName ||
                                    sibling.name ||
                                    'Sibling'
                                  } avatar`}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src =
                                      sibling.gender === 'Female'
                                        ? 'https://partizan-be.onrender.com/uploads/avatars/girl.png'
                                        : 'https://partizan-be.onrender.com/uploads/avatars/boy.png';
                                  }}
                                />
                              </span>
                            </div>
                            <div className='overflow-hidden'>
                              <Link
                                to={`${all_routes.playerDetail}/${siblingId}`}
                                state={{
                                  player: {
                                    ...sibling,
                                    _id: siblingId,
                                    playerId: siblingId,
                                  },
                                  siblings: siblings
                                    .filter(
                                      (s) => (s.id || s._id) !== siblingId
                                    )
                                    .concat([player]),
                                  sharedData: sharedData,
                                }}
                                className='text-dark mb-0'
                              >
                                <h5>
                                  {sibling.fullName ||
                                    sibling.name ||
                                    'Sibling'}
                                </h5>
                              </Link>

                              <p>
                                {formatGrade(sibling.grade || sibling.class)}
                              </p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerSidebar;
