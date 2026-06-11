import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface AutoPayPromptProps {
  paymentToken: string; // the same token used for the just-completed payment
  packageName: string;
  amountCents: number;
  playerIds: string[];
  season: string;
  year: number;
  eventId: string;
  onComplete: (autoPayEnabled: boolean) => void;
}

const AutoPayPrompt: React.FC<AutoPayPromptProps> = ({
  paymentToken,
  packageName,
  amountCents,
  playerIds,
  season,
  year,
  eventId,
  onComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnableAutoPay = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/subscriptions/save-card`,
        {
          token: paymentToken,
          plan: 'monthly-training',
          packageName,
          amountCents,
          playerIds,
          season,
          year,
          eventId,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      onComplete(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to enable auto-pay. You can set it up later from your account.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='card'>
      <div className='card-header bg-light'>
        <div className='d-flex align-items-center'>
          <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
            <i className='ti ti-refresh fs-16' />
          </span>
          <h4 className='text-dark mb-0'>Set Up Monthly Auto-Pay?</h4>
        </div>
      </div>
      <div className='card-body'>
        <p className='text-muted mb-4'>
          Skip the hassle of paying manually every month. We'll automatically
          charge your card on the same date each month.
        </p>

        <div
          className='card mb-4'
          style={{
            background: 'rgba(89, 66, 48, 0.08)',
            border: '1px solid rgba(89, 66, 48, 0.25)',
          }}
        >
          <div className='card-body py-3'>
            <div className='d-flex justify-content-between align-items-center'>
              <div>
                <p className='fw-bold mb-1'>{packageName}</p>
                <p className='text-muted small mb-0'>
                  Billed monthly · Cancel anytime from your account
                </p>
              </div>
              <div className='text-end'>
                <p className='h5 mb-0 fw-bold'>
                  ${(amountCents / 100).toFixed(2)}
                </p>
                <p className='text-muted small mb-0'>/month</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className='alert alert-warning mb-3'>
            <i className='ti ti-alert-triangle me-2'></i>
            {error}
          </div>
        )}

        <div className='d-flex flex-column gap-3'>
          <button
            type='button'
            className='btn btn-primary btn-lg'
            onClick={handleEnableAutoPay}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className='spinner-border spinner-border-sm me-2'></span>
                Setting up auto-pay...
              </>
            ) : (
              <>
                <i className='ti ti-check me-2'></i>
                Yes, enable monthly auto-pay
              </>
            )}
          </button>

          <button
            type='button'
            className='btn btn-outline-secondary'
            onClick={() => onComplete(false)}
            disabled={loading}
          >
            No thanks, I'll pay manually each month
          </button>
        </div>

        <p className='text-muted small text-center mt-3 mb-0'>
          <i className='ti ti-shield-check me-1'></i>
          Your card is securely stored by Clover. We never store your full card
          number.
        </p>
      </div>
    </div>
  );
};

export default AutoPayPrompt;
