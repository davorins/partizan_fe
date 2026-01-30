import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import ParentSidebar from './parentSidebar';
import ParentBreadcrumb from './parentBreadcrumb';
import { useAuth } from '../../../../context/AuthContext';
import { all_routes } from '../../../router/all_routes';
import axios from 'axios';
import { formatDate } from '../../../../utils/dateFormatter';
import { formatPhoneNumber } from '../../../../utils/phone';
import { getCurrentYear } from '../../../../utils/season';

// Refund Modal Component
interface RefundModalProps {
  payment: {
    _id: string;
    amount: number;
    createdAt: string;
    cardBrand?: string;
    cardLastFour?: string;
    totalRefunded?: number;
  };
  maxRefundAmount: number;
  onRefundSubmit: (
    paymentId: string,
    amount: number,
    reason: string,
  ) => Promise<{ success: boolean } | void>;
  onClose: () => void;
}

const RefundModal: React.FC<RefundModalProps> = ({
  payment,
  maxRefundAmount,
  onRefundSubmit,
  onClose,
}) => {
  const [refundAmount, setRefundAmount] = useState<string>(
    maxRefundAmount.toFixed(2),
  );
  const [refundReason, setRefundReason] = useState<string>('Customer request');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const reasonOptions = [
    'Customer request',
    'Duplicate payment',
    'Service not provided',
    'Cancelled order',
    'Other',
  ];

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setRefundAmount(value);
      setError('');
    }
  };

  const handleAmountBlur = () => {
    if (refundAmount === '') {
      setRefundAmount('0.00');
      return;
    }

    let amount = parseFloat(refundAmount);
    if (isNaN(amount)) {
      amount = 0;
    }

    // Ensure amount is within bounds
    if (amount < 0) amount = 0;
    if (amount > maxRefundAmount) amount = maxRefundAmount;

    setRefundAmount(amount.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid refund amount');
      return;
    }

    if (amount > maxRefundAmount) {
      setError(`Refund amount cannot exceed $${maxRefundAmount.toFixed(2)}`);
      return;
    }

    const finalReason = refundReason === 'Other' ? customReason : refundReason;
    if (!finalReason.trim()) {
      setError('Please provide a refund reason');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('🔄 Submitting refund...');
      await onRefundSubmit(payment._id, amount, finalReason);
    } catch (error: any) {
      console.error('Refund error:', error);

      // Only show actual errors (not success cases)
      if (!error.message.includes('Refund has been initiated')) {
        let userMessage = error.message || 'Failed to process refund';

        // Make error messages more user-friendly
        if (userMessage.includes('already been refunded')) {
          userMessage = 'This payment has already been refunded.';
        } else if (userMessage.includes('not found')) {
          userMessage =
            'Payment not found. Please refresh the page and try again.';
        } else if (userMessage.includes('authentication')) {
          userMessage = 'Session expired. Please log in again.';
        }

        setError(userMessage);
      } else {
        // If it's a success message, just close the modal
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div
      className='modal fade show'
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className='modal-dialog modal-dialog-centered'>
        <div className='modal-content'>
          <div className='modal-header'>
            <h4 className='modal-title'>Process Refund</h4>
            <button
              type='button'
              className='btn-close custom-btn-close'
              onClick={onClose}
              disabled={isSubmitting}
              aria-label='Close'
            >
              <i className='ti ti-x' />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className='modal-body'>
              {/* Payment Information */}
              <div className='card mb-3'>
                <div className='card-body'>
                  <h6 className='card-title'>Payment Details</h6>
                  <div className='row'>
                    <div className='col-6'>
                      <small className='text-muted'>Original Amount</small>
                      <p className='mb-1'>{formatCurrency(payment.amount)}</p>
                    </div>
                    <div className='col-6'>
                      <small className='text-muted'>
                        Maximum Refund Available
                      </small>
                      <p className='mb-0 text-success fw-bold'>
                        {formatCurrency(maxRefundAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Refund Amount */}
              <div className='mb-3'>
                <label htmlFor='refundAmount' className='form-label'>
                  Refund Amount *
                </label>
                <div className='input-group'>
                  <span className='input-group-text'>$</span>
                  <input
                    type='text'
                    className='form-control'
                    id='refundAmount'
                    value={refundAmount}
                    onChange={handleAmountChange}
                    onBlur={handleAmountBlur}
                    disabled={isSubmitting}
                    placeholder='0.00'
                  />
                </div>
                <div className='form-text'>
                  Maximum refundable amount: {formatCurrency(maxRefundAmount)}
                </div>
              </div>

              {/* Refund Reason */}
              <div className='mb-3'>
                <label htmlFor='refundReason' className='form-label'>
                  Refund Reason *
                </label>
                <select
                  className='form-select'
                  id='refundReason'
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  disabled={isSubmitting}
                >
                  {reasonOptions.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Reason */}
              {refundReason === 'Other' && (
                <div className='mb-3'>
                  <label htmlFor='customReason' className='form-label'>
                    Please specify reason *
                  </label>
                  <textarea
                    className='form-control'
                    id='customReason'
                    rows={3}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    disabled={isSubmitting}
                    placeholder='Enter specific refund reason...'
                  />
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className='alert alert-danger mt-3'>
                  <i className='ti ti-alert-circle me-2'></i>
                  {error}
                </div>
              )}

              {/* Warning Message */}
              <div className='alert alert-warning mt-3'>
                <i className='ti ti-alert-triangle me-2'></i>
                <strong>Warning:</strong> This action cannot be undone. The
                refund will be processed immediately.
              </div>
            </div>

            <div className='modal-footer'>
              <button
                type='button'
                className='btn btn-light me-2'
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type='submit'
                className='btn btn-warning'
                disabled={isSubmitting || parseFloat(refundAmount) <= 0}
              >
                {isSubmitting ? (
                  <>
                    <span
                      className='spinner-border spinner-border-sm me-2'
                      role='status'
                    ></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className='ti ti-refund me-2'></i>
                    Process Refund
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

interface GuardianData {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  address:
    | string
    | {
        street: string;
        street2: string;
        city: string;
        state: string;
        zip: string;
      };
  relationship: string;
  avatar?: string;
  aauNumber: string;
  isPrimary?: boolean;
}

interface Player {
  _id: string;
  fullName: string;
  grade: string;
  aauNumber: string;
  status: string;
  imgSrc?: string;
  dob: string;
  gender?: string;
  seasons?: any[];
  season?: string;
  registrationYear?: number;
  registrationComplete?: boolean;
  paymentComplete?: boolean;
}

interface RefundData {
  _id: string;
  amount: number;
  reason: string;
  status: 'pending' | 'completed' | 'failed';
  requestedAt: string;
  processedAt?: string;
  notes?: string;
  refundId?: string;
}

interface PaymentData {
  _id: string;
  amount: number;
  createdAt: string;
  cardBrand?: string;
  cardLastFour?: string;
  receiptUrl?: string;
  playerIds?: string[];
  parentId?: string;
  refunds?: RefundData[];
  totalRefunded?: number;
  refundStatus?: 'none' | 'partial' | 'full' | 'requested' | 'processing';
  paymentId?: string;
}

// Fixed Parent interface with proper ID types
interface ParentWithStatus {
  _id: string;
  id?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  address?: any;
  aauNumber?: string;
  avatar?: string;
  players?: Player[];
  isCoach?: boolean;
  status?: string;
  additionalGuardians?: any[];
  role?: string;
}

interface RefundModalState {
  isOpen: boolean;
  payment: PaymentData | null;
  maxRefundAmount: number;
}

const ParentDetails = () => {
  const location = useLocation();
  const { parentId } = useParams<{ parentId?: string }>();
  const navigate = useNavigate();
  const { fetchParentData, user: authUser } = useAuth();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  const [parent, setParent] = useState<ParentWithStatus | null>(
    location.state?.parent || null,
  );
  const [players, setPlayers] = useState<Player[]>(
    location.state?.players || [],
  );
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [activeTab, setActiveTab] = useState('family');
  const [isLoading, setIsLoading] = useState(!location.state?.parent);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [refundModal, setRefundModal] = useState<RefundModalState>({
    isOpen: false,
    payment: null,
    maxRefundAmount: 0,
  });
  const prevParentIdRef = useRef<string | undefined>(undefined);

  // Get current user info from auth context - FIXED TYPE ISSUES
  const currentUser = authUser as ParentWithStatus | null;
  const isAdmin = currentUser?.role === 'admin';
  const isCoach = currentUser?.isCoach || currentUser?.role === 'coach';
  const currentUserId = currentUser?._id || currentUser?.id;

  // Helper function to calculate parent status based on player registrations
  const calculateParentStatus = (
    parentData: ParentWithStatus,
    playersData: Player[],
  ): string => {
    if (parentData.isCoach) return 'Active';

    const currentYear = getCurrentYear();

    console.log('Calculating parent status for:', parentData.fullName);
    console.log('Current year:', currentYear);
    console.log('Players data:', playersData);

    // Check if any player has seasons registered for current year
    const hasCurrentSeasonRegistration = playersData.some((player) => {
      // Check player seasons array first
      if (player.seasons && Array.isArray(player.seasons)) {
        const hasCurrentYearSeason = player.seasons.some(
          (season: any) => season.year === currentYear,
        );
        console.log(
          `Player ${player.fullName} has seasons:`,
          player.seasons,
          'Has current year:',
          hasCurrentYearSeason,
        );
        if (hasCurrentYearSeason) return true;
      }

      // Fallback: check player's direct season properties
      const hasDirectSeason =
        player.season && player.registrationYear === currentYear;
      console.log(
        `Player ${player.fullName} direct season:`,
        player.season,
        player.registrationYear,
        'Has current year:',
        hasDirectSeason,
      );
      return hasDirectSeason;
    });

    console.log(
      'Has current season registration:',
      hasCurrentSeasonRegistration,
    );

    if (hasCurrentSeasonRegistration) return 'Active';

    // Check for pending payments
    const hasPendingPayments = playersData.some(
      (player) => player.registrationComplete && !player.paymentComplete,
    );

    return hasPendingPayments ? 'Pending Payment' : 'Inactive';
  };

  useEffect(() => {
    if (!parentId || prevParentIdRef.current === parentId) return;

    const loadParentAndPayments = async () => {
      setIsLoading(true);
      try {
        // Load parent data
        const parentData = await fetchParentData(parentId);
        if (!parentData) throw new Error('Parent not found');

        const formattedParent = {
          ...parentData,
          avatar:
            parentData.avatar && !parentData.avatar.startsWith('http')
              ? `https://partizan-be.onrender.com${parentData.avatar}`
              : parentData.avatar,
        };

        // Format player data
        const formattedPlayers = (parentData.players || []).map((player) => ({
          ...player,
          imgSrc:
            player.avatar && !player.avatar.startsWith('http')
              ? `https://partizan-be.onrender.com${player.avatar}`
              : player.avatar,
        }));

        setPlayers(formattedPlayers);

        // Calculate status and set parent with status
        const parentStatus = calculateParentStatus(
          formattedParent,
          formattedPlayers,
        );
        const parentWithStatus = {
          ...formattedParent,
          status: parentStatus,
        };

        console.log('Final parent with status:', parentWithStatus);
        setParent(parentWithStatus);

        // Load payments
        await loadPayments(parentData._id);
      } catch (err) {
        console.error('Error loading data:', err);
        setPaymentError('Failed to load data. Please try again.');
        navigate(all_routes.parentList);
      } finally {
        setIsLoading(false);
      }
    };

    const loadPayments = async (parentId: string) => {
      setPaymentLoading(true);
      setPaymentError(null);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API_BASE_URL}/payment/parent/${parentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        console.log('Payments API response:', response.data);

        if (response.data && Array.isArray(response.data)) {
          setPayments(response.data);
        } else {
          console.error('Unexpected payment data format:', response.data);
          setPaymentError('Payment data format error');
        }
      } catch (err) {
        console.error('Payment load error:', err);
        setPaymentError('Failed to load payments. Please try again.');
      } finally {
        setPaymentLoading(false);
      }
    };

    loadParentAndPayments();
    prevParentIdRef.current = parentId;
  }, [parentId, fetchParentData, navigate, API_BASE_URL]);

  const calculateAge = (dob: string): string => {
    if (!dob) return 'N/A';
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
      return age.toString();
    } catch {
      return 'N/A';
    }
  };

  const handleViewPlayer = (player: Player) => {
    navigate(`${all_routes.playerDetail}/${player._id}`, {
      state: {
        player,
        guardians: parent
          ? [parent, ...(parent.additionalGuardians || [])]
          : [],
        siblings: players.filter((p) => p._id !== player._id),
      },
    });
  };

  const getDefaultAvatar = (gender?: string): string => {
    const baseUrl = 'https://partizan-be.onrender.com/uploads/avatars';
    return gender === 'Female' ? `${baseUrl}/girl.png` : `${baseUrl}/boy.png`;
  };

  const refreshPayments = async () => {
    if (parent && parent._id) {
      setPaymentLoading(true);
      setPaymentError(null);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API_BASE_URL}/payment/parent/${parent._id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.data && Array.isArray(response.data)) {
          setPayments(response.data);
        } else {
          setPaymentError('Received invalid payment data');
        }
      } catch (err) {
        console.error('Refresh error:', err);
        setPaymentError('Failed to refresh payments');
      } finally {
        setPaymentLoading(false);
      }
    }
  };

  // Refund submission handler
  const handleRefundSubmit = async (
    paymentMongoId: string,
    amount: number,
    reason: string,
  ) => {
    try {
      const token = localStorage.getItem('token');

      // Find the payment
      const payment = payments.find((p) => p._id === paymentMongoId);

      console.log('🔍 Payment found:', {
        mongoId: payment?._id,
        squareId: payment?.paymentId,
        amount: payment?.amount,
      });

      if (!payment) {
        throw new Error('Payment not found in local data');
      }

      if (!payment.paymentId) {
        throw new Error('No Square payment ID found for this payment');
      }

      console.log('📤 Sending refund request...');

      const response = await axios.post(
        `${API_BASE_URL}/payment/refund`,
        {
          paymentId: payment.paymentId,
          amount,
          reason,
          parentId: parent?._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      console.log('✅ Backend response:', response.data);

      if (response.data.success) {
        alert('✅ Refund processed successfully!');
        handleCloseRefundModal();

        setTimeout(() => {
          refreshPayments();
        }, 1000);

        return { success: true };
      } else {
        throw new Error(response.data.error || 'Refund failed');
      }
    } catch (error: any) {
      console.error('❌ Refund error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // FIXED ERROR HANDLING:
      let errorMessage = 'Failed to process refund request';

      if (error.response?.data?.error) {
        // Direct error message from backend
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        // Alternative error field
        errorMessage = error.response.data.message;
      } else if (error.message) {
        // Axios error message
        errorMessage = error.message;
      }

      console.error('Final error message:', errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Manual eligibility calculation as fallback
  const calculateEligibilityManually = (payment: PaymentData) => {
    const totalRefunded = payment.totalRefunded || 0;
    const availableForRefund = payment.amount - totalRefunded;

    const eligibility = {
      canRefund: availableForRefund > 0 && isAdmin, // Only admins can refund
      availableAmount: availableForRefund,
      originalAmount: payment.amount,
      alreadyRefunded: totalRefunded,
      refundStatus: payment.refundStatus || 'none',
      paymentId: payment._id,
      currency: 'USD',
      isManualCalculation: true, // Flag to indicate this is a fallback
    };

    console.log('Manual eligibility calculation:', eligibility);
    return eligibility;
  };

  // Enhanced function to check refund eligibility before processing
  const checkRefundEligibility = async (payment: PaymentData) => {
    try {
      const token = localStorage.getItem('token');

      // First, try the dedicated eligibility endpoint
      try {
        const response = await axios.get(
          `${API_BASE_URL}/payment/${payment._id}/refund-eligibility`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (response.data.success) {
          return response.data.eligibility;
        }
      } catch (endpointError: any) {
        // If endpoint doesn't exist (404), fall back to manual calculation
        if (endpointError.response?.status === 404) {
          console.log(
            'Eligibility endpoint not found, falling back to manual calculation',
          );
          return calculateEligibilityManually(payment);
        }
        throw endpointError;
      }

      throw new Error('Failed to check refund eligibility');
    } catch (error: any) {
      console.error('Eligibility check error:', error);

      // Fall back to manual calculation for any error
      return calculateEligibilityManually(payment);
    }
  };

  // Enhanced refund handler that opens the modal
  const handleRefundWithEligibilityCheck = async (payment: PaymentData) => {
    try {
      // Check user role first - ONLY ADMINS can process refunds
      if (!isAdmin) {
        alert(
          'Only administrators can process refunds. Please contact support.',
        );
        return;
      }

      // Get eligibility (will use fallback if endpoint missing)
      const eligibility = await checkRefundEligibility(payment);

      if (!eligibility.canRefund) {
        let message = 'This payment cannot be refunded.';
        if (eligibility.alreadyRefunded > 0) {
          message += ` Already refunded: $${eligibility.alreadyRefunded.toFixed(
            2,
          )}`;
        }
        if (eligibility.refundStatus && eligibility.refundStatus !== 'none') {
          message += ` Status: ${eligibility.refundStatus}`;
        }
        alert(message);
        return;
      }

      const availableAmount = eligibility.availableAmount;

      // Open the refund modal instead of using prompts
      setRefundModal({
        isOpen: true,
        payment: payment,
        maxRefundAmount: availableAmount,
      });
    } catch (error: any) {
      console.error('Refund processing error:', error);
      alert(`Refund Error: ${error.message}`);
    }
  };

  // Modal close handler
  const handleCloseRefundModal = () => {
    setRefundModal({
      isOpen: false,
      payment: null,
      maxRefundAmount: 0,
    });
  };

  // Update the getRefundableAmount function to be more robust
  const getRefundableAmount = (payment: PaymentData): number => {
    try {
      const totalRefunded = payment.totalRefunded || 0;
      const refundable = payment.amount - totalRefunded;
      return Math.max(0, refundable); // Ensure non-negative
    } catch (error) {
      console.error('Error calculating refundable amount:', error);
      return 0;
    }
  };

  // Enhanced function to determine if payment can be refunded
  const canRefundPayment = (payment: PaymentData): boolean => {
    const refundableAmount = getRefundableAmount(payment);
    const hasRefundStatus =
      payment.refundStatus && payment.refundStatus !== 'none';

    return refundableAmount > 0 && !hasRefundStatus && isAdmin;
  };

  // Update the refund status badge to be more informative
  const getRefundStatusBadge = (payment: PaymentData) => {
    if (!payment.refundStatus || payment.refundStatus === 'none') {
      const refundableAmount = getRefundableAmount(payment);
      if (refundableAmount > 0 && isAdmin) {
        return (
          <span className='badge badge-soft-success'>
            Refundable: ${refundableAmount.toFixed(2)}
          </span>
        );
      }
      return null;
    }

    const statusConfig = {
      requested: { class: 'badge-soft-warning', text: 'Refund Requested' },
      partial: { class: 'badge-soft-info', text: 'Partially Refunded' },
      full: { class: 'badge-soft-secondary', text: 'Fully Refunded' },
      processing: { class: 'badge-soft-primary', text: 'Processing Refund' },
    };

    const config =
      statusConfig[payment.refundStatus as keyof typeof statusConfig];
    if (!config) return null;

    return <span className={`badge ${config.class} ms-2`}>{config.text}</span>;
  };

  // Render refund history section
  const renderRefundHistory = () => {
    const allRefunds = payments
      .flatMap((payment) =>
        (payment.refunds || []).map((refund) => ({ ...refund, payment })),
      )
      .sort((a, b) => {
        const dateA = new Date(a.requestedAt).getTime();
        const dateB = new Date(b.requestedAt).getTime();
        return dateB - dateA; // Sort descending (newest first)
      });

    if (allRefunds.length === 0) return null;

    return (
      <div className='card mt-4'>
        <div className='card-header'>
          <h5 className='card-title mb-0'>Refund History</h5>
        </div>
        <div className='card-body'>
          <div className='table-responsive'>
            <table className='table table-sm'>
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Payment Date</th>
                </tr>
              </thead>
              <tbody>
                {allRefunds.map((refund, index) => (
                  <tr key={index}>
                    <td>${refund.amount.toFixed(2)}</td>
                    <td>
                      <span
                        className={`badge badge-soft-${
                          refund.status === 'completed'
                            ? 'success'
                            : refund.status === 'pending'
                              ? 'warning'
                              : 'danger'
                        }`}
                      >
                        {refund.status}
                      </span>
                    </td>
                    <td>{refund.reason}</td>
                    <td>{formatDate(refund.payment.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced payments table with better refund handling and role-based access
  const renderPaymentsTable = () => (
    <div className='table-responsive'>
      <table className='table table-hover'>
        <thead className='table-light'>
          <tr>
            <th>Amount</th>
            <th>Date</th>
            <th>Payment Method</th>
            <th>Refund Status</th>
            <th>Actions</th>
            <th>Receipt</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => {
            const refundableAmount = getRefundableAmount(payment);
            const canRefund = canRefundPayment(payment);

            return (
              <tr key={payment._id}>
                <td>
                  <div>
                    <span
                      className={
                        payment.totalRefunded && payment.totalRefunded > 0
                          ? 'text-decoration-line-through text-muted'
                          : ''
                      }
                    >
                      ${payment.amount.toFixed(2)}
                    </span>
                    {payment.totalRefunded && payment.totalRefunded > 0 && (
                      <div className='text-success'>
                        ${(payment.amount - payment.totalRefunded).toFixed(2)}{' '}
                        remaining
                      </div>
                    )}
                  </div>
                </td>
                <td>{formatDate(payment.createdAt)}</td>
                <td>
                  {payment.cardBrand && payment.cardBrand !== 'UNKNOWN'
                    ? `${payment.cardBrand} card`
                    : 'Card'}{' '}
                  {payment.cardLastFour && payment.cardLastFour !== '****'
                    ? `ending in ${payment.cardLastFour}`
                    : ''}
                </td>
                <td>{getRefundStatusBadge(payment)}</td>
                <td>
                  {canRefund && (
                    <button
                      className='btn btn-sm btn-outline-warning'
                      onClick={() => handleRefundWithEligibilityCheck(payment)}
                    >
                      Process Refund
                    </button>
                  )}
                  {!canRefund && refundableAmount === 0 && (
                    <span className='text-muted small'>
                      No refund available
                    </span>
                  )}
                </td>
                <td>
                  {payment.receiptUrl ? (
                    <a
                      href={payment.receiptUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='btn btn-sm btn-outline-primary'
                    >
                      View Receipt
                    </a>
                  ) : (
                    <span className='text-muted'>No receipt</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const mappedGuardians: GuardianData[] = parent?.additionalGuardians
    ? parent.additionalGuardians.map((guardian: any) => ({
        id: guardian._id || guardian.id,
        fullName: guardian.fullName,
        phone: guardian.phone,
        email: guardian.email,
        address: guardian.address,
        relationship: guardian.relationship || 'Guardian',
        avatar:
          guardian.avatar && !guardian.avatar.startsWith('http')
            ? `https://partizan-be.onrender.com${guardian.avatar}`
            : guardian.avatar ||
              'https://partizan-be.onrender.com/uploads/avatars/parents.png',
        aauNumber: guardian.aauNumber || 'Not Available',
        isPrimary: false,
      }))
    : [];

  if (isLoading) return <div className='loading-spinner'>Loading...</div>;
  if (!parent) return <div>No parent data found.</div>;

  return (
    <div className='page-wrapper'>
      <div className='content'>
        <div className='row'>
          <ParentBreadcrumb parent={parent} />
        </div>
        <div className='row'>
          <ParentSidebar parent={parent} />
          <div className='col-xxl-9 col-xl-8'>
            {/* Tab Navigation */}
            <div className='card mb-4'>
              <div className='card-header p-0 border-0'>
                <ul className='nav nav-tabs nav-justified' role='tablist'>
                  <li className='nav-item' role='presentation'>
                    <button
                      className={`nav-link ${
                        activeTab === 'family' ? 'active' : ''
                      }`}
                      onClick={() => setActiveTab('family')}
                    >
                      <i className='ti ti-users me-2'></i>
                      Family Information
                    </button>
                  </li>
                  <li className='nav-item' role='presentation'>
                    <button
                      className={`nav-link ${
                        activeTab === 'payments' ? 'active' : ''
                      } ${payments.length === 0 ? 'text-danger' : ''}`}
                      onClick={() => setActiveTab('payments')}
                    >
                      <i
                        className={`ti ti-credit-card me-2 ${
                          payments.length === 0 ? 'text-danger' : ''
                        }`}
                      ></i>
                      {payments.length === 0
                        ? 'No Payment History'
                        : 'Payment History'}
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            {/* Tab Content */}
            <div className='tab-content pt-0'>
              {/* Family Information Tab */}
              {activeTab === 'family' && (
                <div className='tab-pane fade show active'>
                  {/* Guardians Section */}
                  <div className='card mb-4'>
                    <div className='card-header'>
                      <h5 className='card-title mb-0'>Guardians Information</h5>
                    </div>
                    <div className='card-body'>
                      {/* Primary Parent */}
                      <div className='border rounded p-3 pb-0 mb-3'>
                        <div className='row'>
                          <div className='col-sm-6 col-lg-3'>
                            <div className='d-flex align-items-center mb-3'>
                              <span className='avatar avatar-lg flex-shrink-0'>
                                <img
                                  src={
                                    parent.avatar ||
                                    'https://partizan-be.onrender.com/uploads/avatars/parents.png'
                                  }
                                  className='img-fluid rounded'
                                  alt={`${parent.fullName} avatar`}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src =
                                      'https://partizan-be.onrender.com/uploads/avatars/parents.png';
                                  }}
                                />
                              </span>
                              <div className='ms-2 overflow-hidden'>
                                <h6 className='text-truncate'>
                                  {parent.fullName}
                                </h6>
                                <p>Primary Guardian</p>
                              </div>
                            </div>
                          </div>
                          <div className='col-sm-6 col-lg-3'>
                            <div className='mb-3'>
                              <p className='text-dark fw-medium mb-1'>
                                AAU Number
                              </p>
                              <p>{parent.aauNumber || 'Not Available'}</p>
                            </div>
                          </div>
                          <div className='col-sm-6 col-lg-3'>
                            <div className='mb-3'>
                              <p className='text-dark fw-medium mb-1'>Phone</p>
                              <p>
                                {parent.phone
                                  ? formatPhoneNumber(parent.phone)
                                  : 'N/A'}
                              </p>
                            </div>
                          </div>
                          <div className='col-sm-6 col-lg-3'>
                            <div className='mb-3 overflow-hidden me-3'>
                              <p className='text-dark fw-medium mb-1'>Email</p>
                              <p className='text-truncate'>
                                {parent.email || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Guardians */}
                      {mappedGuardians.length > 0 ? (
                        mappedGuardians.map((guardian) => (
                          <div
                            key={guardian.id}
                            className='border rounded p-3 pb-0 mb-3'
                          >
                            <div className='row'>
                              <div className='col-sm-6 col-lg-3'>
                                <div className='d-flex align-items-center mb-3'>
                                  <span className='avatar avatar-lg flex-shrink-0'>
                                    <img
                                      src={guardian.avatar}
                                      className='img-fluid rounded'
                                      alt={`${guardian.fullName} avatar`}
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.src =
                                          'https://partizan-be.onrender.com/uploads/avatars/parents.png';
                                      }}
                                    />
                                  </span>
                                  <div className='ms-2 overflow-hidden'>
                                    <h6 className='text-truncate'>
                                      {guardian.fullName}
                                    </h6>
                                    <p>{guardian.relationship}</p>
                                  </div>
                                </div>
                              </div>
                              <div className='col-sm-6 col-lg-3'>
                                <div className='mb-3'>
                                  <p className='text-dark fw-medium mb-1'>
                                    AAU Number
                                  </p>
                                  <p>{guardian.aauNumber}</p>
                                </div>
                              </div>
                              <div className='col-sm-6 col-lg-3'>
                                <div className='mb-3'>
                                  <p className='text-dark fw-medium mb-1'>
                                    Phone
                                  </p>
                                  <p>
                                    {guardian.phone
                                      ? formatPhoneNumber(guardian.phone)
                                      : 'N/A'}
                                  </p>
                                </div>
                              </div>
                              <div className='col-sm-6 col-lg-3'>
                                <div className='mb-3 overflow-hidden me-3'>
                                  <p className='text-dark fw-medium mb-1'>
                                    Email
                                  </p>
                                  <p className='text-truncate'>
                                    {guardian.email || 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className='text-muted'>
                          No additional guardians data available.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Players Section */}
                  <div className='card'>
                    <div className='card-header'>
                      <h5 className='card-title mb-0'>Players Information</h5>
                    </div>
                    <div className='card-body'>
                      {players.length > 0 ? (
                        players.map((player) => (
                          <div
                            key={player._id}
                            className='border rounded p-3 pb-0 mb-3'
                          >
                            <div className='row'>
                              <div className='col-sm-6 col-lg-3'>
                                <div className='d-flex align-items-center mb-3'>
                                  <span className='avatar avatar-lg flex-shrink-0'>
                                    <img
                                      src={
                                        player.imgSrc
                                          ? player.imgSrc.includes(
                                              'res.cloudinary.com',
                                            )
                                            ? `${player.imgSrc}?${Date.now()}`
                                            : player.imgSrc
                                          : getDefaultAvatar(player.gender)
                                      }
                                      className='img-fluid'
                                      alt={`${player.fullName} avatar`}
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.src = getDefaultAvatar(
                                          player.gender,
                                        );
                                      }}
                                    />
                                  </span>
                                  <div className='ms-2 overflow-hidden'>
                                    <h6 className='text-truncate'>
                                      {player.fullName}
                                    </h6>
                                  </div>
                                </div>
                              </div>
                              <div className='col-sm-6 col-lg-3'>
                                <div className='mb-3'>
                                  <p className='text-dark fw-medium mb-1'>
                                    Age
                                  </p>
                                  <p>{calculateAge(player.dob)}</p>
                                </div>
                              </div>
                              <div className='col-sm-6 col-lg-3'>
                                <div className='mb-3'>
                                  <p className='text-dark fw-medium mb-1'>
                                    AAU Number
                                  </p>
                                  <p>{player.aauNumber || 'N/A'}</p>
                                </div>
                              </div>
                              <div className='col-sm-6 col-lg-2'>
                                <div className='mb-3'>
                                  <p className='text-dark fw-medium mb-1'>
                                    Grade
                                  </p>
                                  <p>{player.grade || 'N/A'}</p>
                                </div>
                              </div>
                              <div className='col-sm-6 col-lg-1'>
                                <div className='d-flex align-items-center justify-content-end'>
                                  <button
                                    onClick={() => handleViewPlayer(player)}
                                    className='btn btn-primary btn-sm mb-3'
                                  >
                                    View
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className='text-muted'>No players data available.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <div className='tab-pane fade show active'>
                  <div className='card'>
                    <div className='card-header d-flex justify-content-between align-items-center'>
                      <h5 className='card-title mb-0'>Payment History</h5>
                      <button
                        className='btn btn-sm btn-outline-primary'
                        onClick={refreshPayments}
                        disabled={paymentLoading}
                      >
                        {paymentLoading ? 'Refreshing...' : 'Refresh Payments'}
                      </button>
                    </div>
                    <div className='card-body'>
                      {paymentLoading ? (
                        <div className='text-center'>
                          <div
                            className='spinner-border text-primary'
                            role='status'
                          >
                            <span className='visually-hidden'>Loading...</span>
                          </div>
                          <p>Loading payment history...</p>
                        </div>
                      ) : paymentError ? (
                        <div className='alert alert-danger'>
                          <i className='ti ti-alert-circle me-2'></i>
                          {paymentError}
                          <button
                            className='btn btn-sm btn-outline-primary ms-3'
                            onClick={refreshPayments}
                          >
                            Retry
                          </button>
                        </div>
                      ) : payments.length > 0 ? (
                        <>
                          {renderPaymentsTable()}
                          {renderRefundHistory()}
                        </>
                      ) : (
                        <div className='alert alert-info'>
                          <i className='ti ti-info-circle me-2'></i>
                          No payment records found. If you've made a payment
                          recently, it may take a few minutes to appear.
                          <button
                            className='btn btn-sm btn-outline-primary ms-3'
                            onClick={refreshPayments}
                          >
                            Refresh
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {refundModal.isOpen && refundModal.payment && (
        <RefundModal
          payment={refundModal.payment}
          maxRefundAmount={refundModal.maxRefundAmount}
          onRefundSubmit={handleRefundSubmit}
          onClose={handleCloseRefundModal}
        />
      )}
    </div>
  );
};

export default ParentDetails;
