import React, { useState, useEffect } from 'react';
import { Guardian, Address } from '../../../types/registration-types';
import { parseAddress, formatAddress } from '../../../utils/registration-utils';
import { formatPhoneNumber, validatePhoneNumber } from '../../../utils/phone';

interface GuardianRegistrationModuleProps {
  guardian: Guardian;
  onGuardianChange: (guardian: Guardian) => void;
  parentAddress?: Address;
  isAdditional?: boolean;
  onValidationChange?: (isValid: boolean) => void;
  showUsePrimaryAddress?: boolean;
  errors?: Record<string, string>;
}

const GuardianRegistrationModule: React.FC<GuardianRegistrationModuleProps> = ({
  guardian,
  onGuardianChange,
  parentAddress,
  isAdditional = false,
  onValidationChange,
  showUsePrimaryAddress = false,
  errors = {},
}) => {
  const [useParentAddress, setUseParentAddress] = React.useState(
    guardian.usePrimaryAddress || false
  );
  const [addressInput, setAddressInput] = React.useState(
    formatAddress(guardian.address)
  );
  const [addressError, setAddressError] = React.useState<string>('');

  const relationshipOptions = [
    { value: '', label: 'Select Relationship' },
    { value: 'Mother', label: 'Mother' },
    { value: 'Father', label: 'Father' },
    { value: 'Guardian', label: 'Guardian' },
    { value: 'Parent/Guardian', label: 'Parent/Guardian' },
    { value: 'Other', label: 'Other' },
  ];

  // Enhanced address validation function
  const validateAddress = (
    address: Address
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!address.street?.trim()) {
      errors.push('Street address is required');
    }

    if (!address.city?.trim()) {
      errors.push('City is required');
    }

    if (!address.state?.trim()) {
      errors.push('State is required');
    } else if (!/^[A-Z]{2}$/.test(address.state)) {
      errors.push('State must be a valid 2-letter code (e.g., WA)');
    }

    if (!address.zip?.trim()) {
      errors.push('ZIP code is required');
    } else if (!/^\d{5}(-\d{4})?$/.test(address.zip)) {
      errors.push(
        'ZIP code must be in valid format (e.g., 98012 or 98012-1234)'
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // Enhanced address parsing with better validation
  const parseAndValidateAddress = (
    fullAddress: string
  ): { address: Address; isValid: boolean; errors: string[] } => {
    const parsedAddress = parseAddress(fullAddress);
    const validation = validateAddress(parsedAddress);

    return {
      address: parsedAddress,
      isValid: validation.isValid,
      errors: validation.errors,
    };
  };

  // Validate address whenever it changes
  useEffect(() => {
    const validation = validateAddress(guardian.address);
    onValidationChange?.(validation.isValid);
  }, [guardian.address, onValidationChange]);

  const handleChange = (field: keyof Guardian, value: any) => {
    const updatedGuardian = { ...guardian, [field]: value };
    onGuardianChange(updatedGuardian);
  };

  const handlePhoneChange = (value: string) => {
    // Format phone number as user types
    const formattedPhone = formatPhoneNumber(value);
    handleChange('phone', formattedPhone);
  };

  const handleAddressInputChange = (value: string) => {
    setAddressInput(value);
    setAddressError(''); // Clear error when user types
  };

  const handleAddressBlur = () => {
    if (!addressInput.trim()) {
      if (!isAdditional) {
        setAddressError('Address is required');
      }
      return;
    }

    const {
      address: parsedAddress,
      isValid,
      errors,
    } = parseAndValidateAddress(addressInput);
    console.log('🔍 Parsed and validated address:', {
      parsedAddress,
      isValid,
      errors,
    });

    if (!isValid) {
      setAddressError(
        errors[0] ||
          'Please enter a complete address in format: Street, City, State ZIP (e.g., 123 Main St, Seattle, WA 98101)'
      );
      return;
    }

    // Ensure state is uppercase
    const normalizedAddress = {
      ...parsedAddress,
      state: parsedAddress.state.toUpperCase(),
    };

    const updatedGuardian = { ...guardian, address: normalizedAddress };
    onGuardianChange(updatedGuardian);
    setAddressInput(formatAddress(normalizedAddress));
    setAddressError('');
  };

  const handleUseParentAddressChange = (checked: boolean) => {
    setUseParentAddress(checked);
    const updatedGuardian = {
      ...guardian,
      usePrimaryAddress: checked,
    };

    if (checked && parentAddress) {
      updatedGuardian.address = { ...parentAddress };
      setAddressInput(formatAddress(parentAddress));
      setAddressError('');
    }

    onGuardianChange(updatedGuardian);
  };

  React.useEffect(() => {
    if (useParentAddress && parentAddress) {
      const updatedGuardian = {
        ...guardian,
        address: { ...parentAddress },
        usePrimaryAddress: true,
      };
      onGuardianChange(updatedGuardian);
      setAddressInput(formatAddress(parentAddress));
      setAddressError('');
    }
  }, [useParentAddress, parentAddress]);

  React.useEffect(() => {
    setAddressInput(formatAddress(guardian.address));
  }, [guardian.address]);

  // Get error for specific field
  const getError = (fieldName: string): string | undefined => {
    return errors[fieldName];
  };

  return (
    <div className='card'>
      <div className='card-header bg-light'>
        <div className='d-flex align-items-center'>
          <span className='bg-white avatar avatar-sm me-2 text-gray-7 flex-shrink-0'>
            <i className='ti ti-user-shield fs-16' />
          </span>
          <h4 className='text-dark'>
            {isAdditional
              ? 'Additional Guardian Information'
              : 'Parent Information'}
          </h4>
        </div>
      </div>
      <div className='card-body pb-3'>
        <div className='row'>
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>
                Full Name{' '}
                {!isAdditional && <span className='text-danger'>*</span>}
              </label>
              <input
                type='text'
                className={`form-control ${
                  getError('fullName') ? 'is-invalid' : ''
                }`}
                value={guardian.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                required={!isAdditional}
                placeholder='Enter full name'
              />
              {getError('fullName') && (
                <div className='invalid-feedback'>{getError('fullName')}</div>
              )}
            </div>
          </div>
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>
                Relationship to Player{' '}
                {!isAdditional && <span className='text-danger'>*</span>}
              </label>
              <select
                className={`form-control ${
                  getError('relationship') ? 'is-invalid' : ''
                }`}
                value={guardian.relationship}
                onChange={(e) => handleChange('relationship', e.target.value)}
                required={!isAdditional}
              >
                {relationshipOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {getError('relationship') && (
                <div className='invalid-feedback'>
                  {getError('relationship')}
                </div>
              )}
            </div>
          </div>
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>
                Phone Number{' '}
                {!isAdditional && <span className='text-danger'>*</span>}
              </label>
              <input
                type='text'
                className={`form-control ${
                  getError('phone') ? 'is-invalid' : ''
                }`}
                value={guardian.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                maxLength={14}
                required={!isAdditional}
                placeholder='(555) 123-4567'
              />
              {getError('phone') && (
                <div className='invalid-feedback'>{getError('phone')}</div>
              )}
            </div>
          </div>
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>
                Email {!isAdditional && <span className='text-danger'>*</span>}
              </label>
              <input
                type='email'
                className={`form-control ${
                  getError('email') ? 'is-invalid' : ''
                }`}
                value={guardian.email}
                onChange={(e) =>
                  handleChange('email', e.target.value.toLowerCase())
                }
                required={!isAdditional}
                placeholder='email@example.com'
              />
              {getError('email') && (
                <div className='invalid-feedback'>{getError('email')}</div>
              )}
            </div>
          </div>

          {/* Address field - disabled when using parent address */}
          <div className='col-md-12'>
            <div className='mb-3'>
              <label className='form-label'>
                Address{' '}
                {isAdditional ? (
                  '(Optional)'
                ) : (
                  <span className='text-danger'>*</span>
                )}
              </label>
              <input
                type='text'
                className={`form-control ${
                  getError('address') || addressError ? 'is-invalid' : ''
                }`}
                value={addressInput}
                onChange={(e) => handleAddressInputChange(e.target.value)}
                onBlur={handleAddressBlur}
                disabled={useParentAddress && isAdditional}
                placeholder='Street, City, State ZIP (e.g., 123 Main St, Seattle, WA 98101)'
                required={!isAdditional}
              />
              {addressError && (
                <div className='invalid-feedback d-block'>{addressError}</div>
              )}
              {getError('address') && !addressError && (
                <div className='invalid-feedback'>{getError('address')}</div>
              )}

              {/* Show "Same as primary address" checkbox only for additional guardians */}
              {isAdditional && showUsePrimaryAddress && parentAddress && (
                <div className='col-md-12'>
                  <div className='mt-3 mb-3'>
                    <div className='form-check'>
                      <input
                        type='checkbox'
                        className='form-check-input'
                        checked={useParentAddress}
                        onChange={(e) =>
                          handleUseParentAddressChange(e.target.checked)
                        }
                        id={`use-parent-address-${guardian.email}`}
                      />
                      <label
                        className='form-check-label'
                        htmlFor={`use-parent-address-${guardian.email}`}
                      >
                        <strong>Same as Primary Guardian Address</strong>
                      </label>
                    </div>
                    {useParentAddress && (
                      <div className='p-0'>
                        <small className='text-muted'>
                          Using primary guardian's address:{' '}
                          {formatAddress(parentAddress)}
                        </small>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Address preview */}
              {guardian.address.street &&
                !useParentAddress &&
                !addressError && (
                  <div className='mt-2 small text-muted'>
                    {guardian.address.city ? (
                      <>
                        <div className='text-success'>
                          ✓ Valid address format
                        </div>
                        <div>
                          <strong>Street:</strong> {guardian.address.street}
                        </div>
                        {guardian.address.street2 && (
                          <div>
                            <strong>Unit:</strong> {guardian.address.street2}
                          </div>
                        )}
                        <div>
                          <strong>City:</strong> {guardian.address.city}
                        </div>
                        <div>
                          <strong>State:</strong> {guardian.address.state}
                        </div>
                        <div>
                          <strong>ZIP:</strong> {guardian.address.zip}
                        </div>
                      </>
                    ) : (
                      <div className='text-warning'>
                        Couldn't parse full address. Please use format: Street,
                        City, State ZIP (123 1st St., Bothell, WA 98021)
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>

          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label'>
                <input
                  type='checkbox'
                  checked={guardian.isCoach}
                  onChange={(e) => handleChange('isCoach', e.target.checked)}
                />{' '}
                {isAdditional
                  ? 'Is this guardian a coach?'
                  : 'Are you a coach?'}
              </label>
            </div>
          </div>

          {guardian.isCoach && (
            <div className='col-md-6'>
              <div className='mb-3'>
                <label className='form-label'>AAU Number</label>
                <input
                  type='text'
                  className={`form-control ${
                    getError('aauNumber') ? 'is-invalid' : ''
                  }`}
                  value={guardian.aauNumber}
                  onChange={(e) => handleChange('aauNumber', e.target.value)}
                  required={guardian.isCoach}
                  placeholder='AAU membership number'
                />
                {getError('aauNumber') && (
                  <div className='invalid-feedback'>
                    {getError('aauNumber')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuardianRegistrationModule;
