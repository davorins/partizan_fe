import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import { OverlayTrigger, Tooltip, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';

// Define the type for preferences
interface CommunicationPreferences {
  emailNotifications: boolean;
  newsUpdates: boolean;
  offersPromotions: boolean;
  marketingEmails: boolean;
  transactionalEmails: boolean;
  broadcastEmails: boolean;
}

// Define the type for the response from the API
interface PreferencesResponse {
  success: boolean;
  data: {
    preferences: CommunicationPreferences;
  };
}

const Notificationssettings = () => {
  const routes = all_routes;
  const { getAuthToken } = useAuth();
  const [preferences, setPreferences] = useState<CommunicationPreferences>({
    emailNotifications: true,
    newsUpdates: true,
    offersPromotions: true,
    marketingEmails: true,
    transactionalEmails: true,
    broadcastEmails: true,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const response = await axios.get<PreferencesResponse>(
        `${process.env.REACT_APP_API_BASE_URL}/communication-preferences`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success && response.data.data.preferences) {
        setPreferences(response.data.data.preferences);
      }
    } catch (err) {
      console.error('Error fetching preferences:', err);
      setError('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = async (
    key: keyof CommunicationPreferences,
    value: boolean
  ) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = await getAuthToken();
      const updatedPreferences = { ...preferences, [key]: value };

      const response = await axios.put<PreferencesResponse>(
        `${process.env.REACT_APP_API_BASE_URL}/communication-preferences`,
        { preferences: updatedPreferences },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setPreferences(updatedPreferences);
        setSuccess('Notification settings updated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError('Failed to update notification settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof CommunicationPreferences) => {
    handlePreferenceChange(key, !preferences[key]);
  };

  const getEmailDescription = (key: keyof CommunicationPreferences): string => {
    const descriptions: Record<keyof CommunicationPreferences, string> = {
      emailNotifications:
        'Receive email notifications for new direct messages, account activity, and important alerts.',
      newsUpdates:
        'Stay informed with the latest announcements, program updates, and news from Partizan.',
      offersPromotions:
        'Get notified about special deals, package pricing, discounts, and promotional offers.',
      marketingEmails:
        'Receive marketing communications about new programs, events, and opportunities.',
      transactionalEmails:
        'Receive transactional emails like payment receipts, registration confirmations, and important account updates.',
      broadcastEmails:
        'Receive broadcast emails sent to all users for general announcements.',
    };
    return descriptions[key];
  };

  if (loading) {
    return (
      <div className='page-wrapper'>
        <div className='content'>
          <div
            className='d-flex justify-content-center align-items-center'
            style={{ minHeight: '400px' }}
          >
            <Spinner animation='border' variant='primary' />
            <span className='ms-2'>Loading notification settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className='page-wrapper'>
        <div className='content'>
          <div className='d-md-flex d-block align-items-center justify-content-between border-bottom pb-3'>
            <div className='my-auto mb-2'>
              <h3 className='page-title mb-1'>General Settings</h3>
              <nav>
                <ol className='breadcrumb mb-0'>
                  <li className='breadcrumb-item'>
                    <Link to='index'>Dashboard</Link>
                  </li>
                  <li className='breadcrumb-item'>
                    <Link to='#'>Settings</Link>
                  </li>
                  <li className='breadcrumb-item active' aria-current='page'>
                    General Settings
                  </li>
                </ol>
              </nav>
            </div>
            <div className='d-flex my-xl-auto right-content align-items-center flex-wrap'>
              <div className='pe-1 mb-2'>
                <OverlayTrigger
                  placement='top'
                  overlay={<Tooltip id='tooltip-top'>Refresh</Tooltip>}
                >
                  <button
                    onClick={fetchPreferences}
                    className='btn btn-outline-light bg-white btn-icon me-1'
                    disabled={saving}
                  >
                    <i className='ti ti-refresh' />
                  </button>
                </OverlayTrigger>
              </div>
            </div>
          </div>

          {error && (
            <Alert
              variant='danger'
              onClose={() => setError(null)}
              dismissible
              className='mt-3'
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              variant='success'
              onClose={() => setSuccess(null)}
              dismissible
              className='mt-3'
            >
              {success}
            </Alert>
          )}

          <div className='row'>
            <div className='col-xxl-2 col-xl-3'>
              <div className='pt-3 d-flex flex-column list-group mb-4'>
                <Link
                  to={routes.profilesettings}
                  className='d-block rounded p-2'
                >
                  Profile Settings
                </Link>
                <Link
                  to={routes.securitysettings}
                  className='d-block rounded p-2'
                >
                  Security Settings
                </Link>
                <Link
                  to={routes.notificationssettings}
                  className='d-block rounded active p-2'
                >
                  Notifications
                </Link>
              </div>
            </div>
            <div className='col-xxl-10 col-xl-9'>
              <div className='flex-fill border-start ps-3'>
                <div className='d-flex align-items-center justify-content-between flex-wrap border-bottom mb-3 pt-3'>
                  <div className='mb-3'>
                    <h5>Email Communication Preferences</h5>
                    <p>
                      Control what types of emails you receive from Partizan.
                      You can update these preferences at any time.
                    </p>
                  </div>
                </div>

                <div className='d-block'>
                  <div className='card border-0 p-3 pb-0 mb-3 rounded'>
                    {/* Email Notifications */}
                    <div className='d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3'>
                      <div className='mb-3'>
                        <h6>Email Notifications</h6>
                        <p>{getEmailDescription('emailNotifications')}</p>
                      </div>
                      <div className='mb-3'>
                        <div className='form-check form-switch'>
                          <input
                            className='form-check-input'
                            type='checkbox'
                            checked={preferences.emailNotifications}
                            onChange={() => handleToggle('emailNotifications')}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </div>

                    {/* News and Updates */}
                    <div className='d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3'>
                      <div className='mb-3'>
                        <h6>News and Updates</h6>
                        <p>{getEmailDescription('newsUpdates')}</p>
                      </div>
                      <div className='mb-3'>
                        <div className='form-check form-switch'>
                          <input
                            className='form-check-input'
                            type='checkbox'
                            checked={preferences.newsUpdates}
                            onChange={() => handleToggle('newsUpdates')}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Offers & Promotions */}
                    <div className='d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3'>
                      <div className='mb-3'>
                        <h6>Offers &amp; Promotions</h6>
                        <p>{getEmailDescription('offersPromotions')}</p>
                      </div>
                      <div className='mb-3'>
                        <div className='form-check form-switch'>
                          <input
                            className='form-check-input'
                            type='checkbox'
                            checked={preferences.offersPromotions}
                            onChange={() => handleToggle('offersPromotions')}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Marketing Emails */}
                    <div className='d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3'>
                      <div className='mb-3'>
                        <h6>Marketing Communications</h6>
                        <p>{getEmailDescription('marketingEmails')}</p>
                      </div>
                      <div className='mb-3'>
                        <div className='form-check form-switch'>
                          <input
                            className='form-check-input'
                            type='checkbox'
                            checked={preferences.marketingEmails}
                            onChange={() => handleToggle('marketingEmails')}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Transactional Emails */}
                    <div className='d-flex justify-content-between align-items-center flex-wrap border-bottom mb-3'>
                      <div className='mb-3'>
                        <h6>Transactional Emails</h6>
                        <p>{getEmailDescription('transactionalEmails')}</p>
                      </div>
                      <div className='mb-3'>
                        <div className='form-check form-switch'>
                          <input
                            className='form-check-input'
                            type='checkbox'
                            checked={preferences.transactionalEmails}
                            onChange={() => handleToggle('transactionalEmails')}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Broadcast Emails */}
                    <div className='d-flex justify-content-between align-items-center flex-wrap mb-0'>
                      <div className='mb-3'>
                        <h6>Broadcast Emails</h6>
                        <p>{getEmailDescription('broadcastEmails')}</p>
                      </div>
                      <div className='mb-3'>
                        <div className='form-check form-switch'>
                          <input
                            className='form-check-input'
                            type='checkbox'
                            checked={preferences.broadcastEmails}
                            onChange={() => handleToggle('broadcastEmails')}
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className='alert alert-info mt-3'>
                    <div className='d-flex'>
                      <div className='me-3'>
                        <i className='ti ti-info-circle fs-4'></i>
                      </div>
                      <div>
                        <h6 className='alert-heading'>Important Information</h6>
                        <p className='mb-1'>
                          • Turning off certain email types may cause you to
                          miss important information
                        </p>
                        <p className='mb-1'>
                          • Transactional emails (like payment receipts) are
                          highly recommended to remain ON
                        </p>
                        <p className='mb-0'>
                          • Changes take effect immediately for future emails
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notificationssettings;
