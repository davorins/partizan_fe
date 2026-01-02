import React, { useState, useEffect, useRef } from 'react';
import {
  RegistrationFormConfig,
  TryoutSpecificConfig,
} from '../../types/registration-types';

interface TryoutFormConfigProps {
  onTryoutConfigUpdate: (
    config: TryoutSpecificConfig,
    originalName?: string
  ) => void;
  initialConfig?: TryoutSpecificConfig;
  isEditing?: boolean;
}

const TryoutFormConfig: React.FC<TryoutFormConfigProps> = ({
  onTryoutConfigUpdate,
  initialConfig,
  isEditing = false,
}) => {
  const [tryoutConfig, setTryoutConfig] = useState<TryoutSpecificConfig>(
    () =>
      initialConfig || {
        tryoutName: '',
        tryoutYear: new Date().getFullYear(),
        displayName: '',
        registrationDeadline: '',
        tryoutDates: [],
        locations: [],
        divisions: [],
        ageGroups: [],
        requiresPayment: true,
        requiresRoster: false,
        requiresInsurance: true,
        paymentDeadline: '',
        refundPolicy: 'No refunds after tryout registration deadline',
        tryoutFee: 50,
        isActive: false,
      }
  );

  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [originalTryoutName, setOriginalTryoutName] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'success' | 'error'
  >('idle');
  const [hasChanges, setHasChanges] = useState(false);
  const initialConfigRef = useRef<TryoutSpecificConfig | null>(null);

  useEffect(() => {
    if (initialConfig) {
      setTryoutConfig(initialConfig);
      setOriginalTryoutName(initialConfig.tryoutName || '');
      initialConfigRef.current = JSON.parse(JSON.stringify(initialConfig));
    }
  }, [initialConfig]);

  // Track changes
  useEffect(() => {
    if (!initialConfigRef.current) return;

    const currentConfigStr = JSON.stringify(tryoutConfig);
    const initialConfigStr = JSON.stringify(initialConfigRef.current);

    setHasChanges(currentConfigStr !== initialConfigStr);
  }, [tryoutConfig]);

  const updateTryoutConfig = (updates: Partial<TryoutSpecificConfig>) => {
    setTryoutConfig((prev) => ({ ...prev, ...updates }));

    if (updates.tryoutName !== undefined) {
      setNameError('');
    }
  };

  const validateTryoutName = (name: string): boolean => {
    if (!name.trim()) {
      setNameError('Tryout name is required');
      return false;
    }
    if (name.length < 3) {
      setNameError('Tryout name must be at least 3 characters');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleTryoutNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    validateTryoutName(newName);
    updateTryoutConfig({ tryoutName: newName });
  };

  const addDate = () => {
    if (newDate) {
      updateTryoutConfig({
        tryoutDates: [...tryoutConfig.tryoutDates, newDate],
      });
      setNewDate('');
    }
  };

  const removeDate = (index: number) => {
    const dates = [...tryoutConfig.tryoutDates];
    dates.splice(index, 1);
    updateTryoutConfig({ tryoutDates: dates });
  };

  const addLocation = () => {
    if (newLocation) {
      updateTryoutConfig({
        locations: [...tryoutConfig.locations, newLocation],
      });
      setNewLocation('');
    }
  };

  const removeLocation = (index: number) => {
    const locations = [...tryoutConfig.locations];
    locations.splice(index, 1);
    updateTryoutConfig({ locations });
  };

  const handleSave = async () => {
    // Validate required fields
    if (!validateTryoutName(tryoutConfig.tryoutName)) {
      return;
    }

    if (!tryoutConfig.tryoutYear) {
      alert('Tryout year is required');
      return;
    }

    if (tryoutConfig.tryoutFee === undefined || tryoutConfig.tryoutFee < 0) {
      alert('Tryout fee must be a positive number');
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      await onTryoutConfigUpdate(tryoutConfig, originalTryoutName);
      setSaveStatus('success');
      setHasChanges(false);
      initialConfigRef.current = JSON.parse(JSON.stringify(tryoutConfig));

      // Reset success status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      setSaveStatus('error');
      console.error('Error saving tryout config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (initialConfigRef.current) {
      setTryoutConfig(JSON.parse(JSON.stringify(initialConfigRef.current)));
    }
    setHasChanges(false);
    setNameError('');
  };

  return (
    <div className='tryout-form-config'>
      <div className='d-flex justify-content-between align-items-center mb-4'>
        <h4>
          Tryout Configuration
          {tryoutConfig.tryoutName && `: ${tryoutConfig.tryoutName}`}
          {!tryoutConfig.tryoutName && ' (New Tryout)'}
        </h4>
        <div className='d-flex align-items-center gap-2'>
          <div className='form-check form-switch me-3'>
            <input
              className='form-check-input'
              type='checkbox'
              checked={tryoutConfig.isActive}
              onChange={(e) =>
                updateTryoutConfig({ isActive: e.target.checked })
              }
              style={{ transform: 'scale(1.5)' }}
            />
            <label className='form-check-label fw-bold'>
              {tryoutConfig.isActive ? 'Tryout Active' : 'Tryout Inactive'}
            </label>
          </div>

          {/* Save Status Indicator */}
          {saveStatus === 'success' && (
            <span className='text-success'>
              <i className='ti ti-circle-check me-1'></i>
              Saved successfully!
            </span>
          )}
          {saveStatus === 'error' && (
            <span className='text-danger'>
              <i className='ti ti-alert-circle me-1'></i>
              Error saving
            </span>
          )}
        </div>
      </div>

      {/* Save/Cancel Buttons */}
      <div className='card mb-4'>
        <div className='card-body'>
          <div className='d-flex justify-content-between align-items-center'>
            <div>
              {hasChanges && (
                <span className='text-warning'>
                  <i className='ti ti-alert-circle me-1'></i>
                  You have unsaved changes
                </span>
              )}
            </div>
            <div className='d-flex gap-2'>
              {hasChanges && (
                <button
                  className='btn btn-outline-secondary'
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              )}
              <button
                className='btn btn-primary'
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
              >
                {isSaving ? (
                  <>
                    <span className='spinner-border spinner-border-sm me-2'></span>
                    Saving...
                  </>
                ) : isEditing ? (
                  <>
                    <i className='ti ti-device-floppy me-2'></i>
                    Update Tryout
                  </>
                ) : (
                  <>
                    <i className='ti ti-plus me-2'></i>
                    Create Tryout
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tryout Information Card */}
      <div className='card mb-4'>
        <div className='card-header'>
          <h5>Basic Tryout Information</h5>
        </div>
        <div className='card-body'>
          <div className='row'>
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Tryout Name *</label>
                <input
                  type='text'
                  className={`form-control ${nameError ? 'is-invalid' : ''}`}
                  value={tryoutConfig.tryoutName}
                  onChange={handleTryoutNameChange}
                  onBlur={(e) => validateTryoutName(e.target.value)}
                  placeholder='e.g., Spring Tryouts 2025, Fall Season Tryouts'
                />
                {nameError ? (
                  <div className='invalid-feedback'>{nameError}</div>
                ) : (
                  <small className='form-text text-muted'>
                    Unique name for this tryout. Cannot be changed after
                    creation.
                  </small>
                )}
              </div>
            </div>
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Tryout Year *</label>
                <input
                  type='number'
                  className='form-control'
                  value={tryoutConfig.tryoutYear}
                  onChange={(e) =>
                    updateTryoutConfig({
                      tryoutYear:
                        parseInt(e.target.value) || new Date().getFullYear(),
                    })
                  }
                  min='2024'
                  max='2030'
                />
                <small className='form-text text-muted'>
                  Year the tryout will take place
                </small>
              </div>
            </div>
          </div>

          <div className='row'>
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Display Name (Optional)</label>
                <input
                  type='text'
                  className='form-control'
                  value={tryoutConfig.displayName || ''}
                  onChange={(e) =>
                    updateTryoutConfig({
                      displayName: e.target.value,
                    })
                  }
                  placeholder='e.g., Partizan Spring Tryouts'
                />
                <small className='form-text text-muted'>
                  User-friendly name shown to registrants
                </small>
              </div>
            </div>
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Tryout Fee *</label>
                <div className='input-group'>
                  <span className='input-group-text'>$</span>
                  <input
                    type='number'
                    className='form-control'
                    value={tryoutConfig.tryoutFee}
                    onChange={(e) =>
                      updateTryoutConfig({
                        tryoutFee: Number(e.target.value) || 50,
                      })
                    }
                    min='0'
                    step='1'
                  />
                </div>
                <small className='form-text text-muted'>Price per player</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tryout Schedule */}
      <div className='row mb-4'>
        <div className='col-md-6'>
          <div className='card'>
            <div className='card-header'>
              <h5>Schedule</h5>
            </div>
            <div className='card-body'>
              <div className='mb-3'>
                <label className='form-label'>Registration Deadline</label>
                <input
                  type='date'
                  className='form-control'
                  value={tryoutConfig.registrationDeadline || ''}
                  onChange={(e) =>
                    updateTryoutConfig({
                      registrationDeadline: e.target.value,
                    })
                  }
                />
                <small className='form-text text-muted'>
                  Last day to register for tryouts
                </small>
              </div>

              <div className='mb-3'>
                <label className='form-label'>Payment Deadline</label>
                <input
                  type='date'
                  className='form-control'
                  value={tryoutConfig.paymentDeadline || ''}
                  onChange={(e) =>
                    updateTryoutConfig({
                      paymentDeadline: e.target.value,
                    })
                  }
                />
                <small className='form-text text-muted'>
                  Last day to complete payment
                </small>
              </div>
            </div>
          </div>
        </div>

        <div className='col-md-6'>
          <div className='card h-100'>
            <div className='card-header'>
              <h5>Requirements</h5>
            </div>
            <div className='card-body'>
              <div className='form-check form-switch mb-3'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  checked={tryoutConfig.requiresRoster || false}
                  onChange={(e) =>
                    updateTryoutConfig({
                      requiresRoster: e.target.checked,
                    })
                  }
                />
                <label className='form-check-label'>Requires Roster Info</label>
                <small className='form-text text-muted d-block'>
                  Players must provide roster information
                </small>
              </div>

              <div className='form-check form-switch mb-3'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  checked={tryoutConfig.requiresInsurance || false}
                  onChange={(e) =>
                    updateTryoutConfig({
                      requiresInsurance: e.target.checked,
                    })
                  }
                />
                <label className='form-check-label'>Requires Insurance</label>
                <small className='form-text text-muted d-block'>
                  Players must provide proof of insurance
                </small>
              </div>

              <div className='mb-3'>
                <label className='form-label'>Refund Policy</label>
                <textarea
                  className='form-control'
                  rows={3}
                  value={tryoutConfig.refundPolicy}
                  onChange={(e) =>
                    updateTryoutConfig({
                      refundPolicy: e.target.value,
                    })
                  }
                  placeholder='Enter refund policy details...'
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tryout Details */}
      <div className='row mb-4'>
        <div className='col-md-6'>
          <div className='card h-100'>
            <div className='card-header'>
              <h6 className='mb-0'>Tryout Dates</h6>
            </div>
            <div className='card-body'>
              <div className='input-group mb-3'>
                <input
                  type='date'
                  className='form-control'
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  placeholder='Add tryout date'
                />
                <button
                  className='btn btn-outline-primary'
                  type='button'
                  onClick={addDate}
                >
                  Add
                </button>
              </div>

              {tryoutConfig.tryoutDates.length > 0 ? (
                <div className='list-group'>
                  {tryoutConfig.tryoutDates.map((date, index) => (
                    <div
                      key={index}
                      className='list-group-item d-flex justify-content-between align-items-center'
                    >
                      <span>{new Date(date).toLocaleDateString()}</span>
                      <button
                        className='btn btn-sm btn-outline-danger'
                        onClick={() => removeDate(index)}
                      >
                        <i className='ti ti-trash'></i>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-muted small mb-0'>No dates added yet</p>
              )}
            </div>
          </div>
        </div>

        <div className='col-md-6'>
          <div className='card h-100'>
            <div className='card-header'>
              <h6 className='mb-0'>Locations</h6>
            </div>
            <div className='card-body'>
              <div className='input-group mb-3'>
                <input
                  type='text'
                  className='form-control'
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder='Add location (e.g., Bothell High School Gym)'
                />
                <button
                  className='btn btn-outline-primary'
                  type='button'
                  onClick={addLocation}
                >
                  Add
                </button>
              </div>

              {tryoutConfig.locations.length > 0 ? (
                <div className='list-group'>
                  {tryoutConfig.locations.map((location, index) => (
                    <div
                      key={index}
                      className='list-group-item d-flex justify-content-between align-items-center'
                    >
                      <span>{location}</span>
                      <button
                        className='btn btn-sm btn-outline-danger'
                        onClick={() => removeLocation(index)}
                      >
                        <i className='ti ti-trash'></i>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className='text-muted small mb-0'>No locations added yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Configuration */}
      <div className='card'>
        <div className='card-header'>
          <h5>Payment Configuration</h5>
        </div>
        <div className='card-body'>
          <div className='row'>
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Tryout Fee (per player) *</label>
                <div className='input-group'>
                  <span className='input-group-text'>$</span>
                  <input
                    type='number'
                    className='form-control'
                    value={tryoutConfig.tryoutFee}
                    onChange={(e) =>
                      updateTryoutConfig({
                        tryoutFee: Number(e.target.value) || 50,
                      })
                    }
                    min='0'
                    step='1'
                  />
                </div>
                <small className='form-text text-muted'>
                  Per player tryout fee. This will be used for payment
                  calculations.
                </small>
              </div>
            </div>
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>Requires Payment</label>
                <div className='form-check form-switch mt-2'>
                  <input
                    className='form-check-input'
                    type='checkbox'
                    checked={tryoutConfig.requiresPayment}
                    onChange={(e) =>
                      updateTryoutConfig({
                        requiresPayment: e.target.checked,
                      })
                    }
                    style={{ transform: 'scale(1.2)' }}
                  />
                  <label className='form-check-label fw-bold'>
                    {tryoutConfig.requiresPayment
                      ? 'Payment Required'
                      : 'Free Tryout'}
                  </label>
                  <small className='form-text text-muted d-block'>
                    {tryoutConfig.requiresPayment
                      ? 'Players must complete payment to register for tryout'
                      : 'No payment required for this tryout'}
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TryoutFormConfig;
