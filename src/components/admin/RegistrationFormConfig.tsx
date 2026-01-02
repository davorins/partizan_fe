import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RegistrationFormConfig as RegistrationFormConfigType,
  SeasonEvent,
  PricingPackage,
} from '../../types/registration-types';

interface RegistrationFormConfigProps {
  seasonEvent: SeasonEvent;
  onConfigUpdate: (config: RegistrationFormConfigType) => void;
  initialConfig?: RegistrationFormConfigType;
}

const RegistrationFormConfig: React.FC<RegistrationFormConfigProps> = ({
  seasonEvent,
  onConfigUpdate,
  initialConfig,
}) => {
  const [config, setConfig] = useState<RegistrationFormConfigType>(
    initialConfig || {
      isActive: false,
      requiresPayment: true,
      requiresQualification: false,
      pricing: {
        basePrice: 0,
        packages: [],
      },
    }
  );

  const [newPackage, setNewPackage] = useState<Omit<PricingPackage, 'id'>>({
    name: '',
    price: 0,
    description: '',
  });

  // Debug: Log initial config
  useEffect(() => {
    console.log('🎯 RegistrationFormConfig mounted with:', {
      seasonEvent,
      initialConfig,
      currentConfig: config,
      packages: config.pricing.packages,
    });
  }, []);

  // Debug: Log when initialConfig changes
  useEffect(() => {
    if (initialConfig) {
      console.log('🔄 initialConfig changed:', {
        fromParent: initialConfig,
        currentState: config,
        packages: initialConfig.pricing?.packages,
        packagesCount: initialConfig.pricing?.packages?.length,
      });
    }
  }, [initialConfig]);

  const previousConfigRef = useRef<string>('');
  const isInitialMount = useRef(true);

  useEffect(() => {
    const currentConfigString = JSON.stringify(config);
    console.log('🔄 Config state changed:', {
      config,
      packages: config.pricing.packages,
      stringified: currentConfigString,
      previous: previousConfigRef.current,
      isInitial: isInitialMount.current,
    });

    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousConfigRef.current = currentConfigString;
      return;
    }

    if (previousConfigRef.current !== currentConfigString) {
      console.log('📤 Calling onConfigUpdate with:', {
        ...config,
        packages: config.pricing.packages,
      });
      previousConfigRef.current = currentConfigString;
      onConfigUpdate(config);
    }
  }, [config, onConfigUpdate]);

  useEffect(() => {
    if (
      initialConfig &&
      JSON.stringify(initialConfig) !== JSON.stringify(config)
    ) {
      console.log('📥 Updating from initialConfig:', {
        initialConfig,
        packages: initialConfig.pricing?.packages,
      });
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  const handleAddPackage = () => {
    if (newPackage.name && newPackage.price > 0) {
      const packageWithId: PricingPackage = {
        ...newPackage,
        id: Date.now().toString(),
      };

      console.log('➕ Adding package:', packageWithId);

      setConfig((prev) => {
        const newConfig = {
          ...prev,
          pricing: {
            ...prev.pricing,
            packages: [...prev.pricing.packages, packageWithId],
          },
        };
        console.log('🆕 New config after adding package:', {
          ...newConfig,
          packages: newConfig.pricing.packages,
        });
        return newConfig;
      });
      setNewPackage({ name: '', price: 0, description: '' });
    }
  };

  const handleRemovePackage = (packageId: string) => {
    console.log('🗑️ Removing package:', packageId);
    setConfig((prev) => {
      const newConfig = {
        ...prev,
        pricing: {
          ...prev.pricing,
          packages: prev.pricing.packages.filter((pkg) => pkg.id !== packageId),
        },
      };
      console.log('🆕 New config after removing package:', {
        ...newConfig,
        packages: newConfig.pricing.packages,
      });
      return newConfig;
    });
  };

  const handleMovePackage = (index: number, direction: 'up' | 'down') => {
    const packages = [...config.pricing.packages];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex >= 0 && newIndex < packages.length) {
      [packages[index], packages[newIndex]] = [
        packages[newIndex],
        packages[index],
      ];
      setConfig((prev) => {
        const newConfig = {
          ...prev,
          pricing: {
            ...prev.pricing,
            packages,
          },
        };
        console.log('🔄 Packages reordered:', newConfig.pricing.packages);
        return newConfig;
      });
    }
  };

  const updateConfig = (updates: Partial<RegistrationFormConfigType>) => {
    console.log('⚙️ Updating config:', updates);
    setConfig((prev) => {
      const newConfig = { ...prev, ...updates };
      console.log('🆕 Config after update:', {
        ...newConfig,
        packages: newConfig.pricing.packages,
      });
      return newConfig;
    });
  };

  return (
    <div className='card'>
      <div className='card-header'>
        <h4>
          Registration Form Configuration - {seasonEvent.season}{' '}
          {seasonEvent.year}
        </h4>
      </div>
      <div className='card-body'>
        {/* Enhanced Debug Info */}
        <div className='alert alert-info mb-3'>
          <div className='d-flex justify-content-between align-items-center'>
            <div>
              <strong>Debug Info:</strong>
              <span className='ms-2'>
                {config.pricing.packages.length} packages configured
              </span>
            </div>
            <button
              className='btn btn-sm btn-outline-info'
              onClick={() => {
                console.log('🐛 Current config state:', {
                  config,
                  packages: config.pricing.packages,
                  seasonEvent,
                  initialConfig,
                });
              }}
            >
              Log State
            </button>
          </div>
          {config.pricing.packages.length > 0 && (
            <div className='mt-2'>
              <small>
                Packages:{' '}
                {config.pricing.packages
                  .map((p) => `${p.name} ($${p.price})`)
                  .join(', ')}
              </small>
            </div>
          )}
        </div>

        {/* Status Indicators */}
        <div className='row mb-4'>
          <div className='col-md-4'>
            <div className='card border-0 bg-light'>
              <div className='card-body text-center'>
                <div
                  className={`fs-2 ${
                    config.isActive ? 'text-success' : 'text-secondary'
                  }`}
                >
                  <i className={`ti ti-${config.isActive ? 'check' : 'x'}`}></i>
                </div>
                <div>Form {config.isActive ? 'Active' : 'Inactive'}</div>
              </div>
            </div>
          </div>
          <div className='col-md-4'>
            <div className='card border-0 bg-light'>
              <div className='card-body text-center'>
                <div
                  className={`fs-2 ${
                    config.requiresPayment ? 'text-warning' : 'text-success'
                  }`}
                >
                  <i className='ti ti-currency-dollar'></i>
                </div>
                <div>
                  {config.requiresPayment ? 'Payment Required' : 'Free'}
                </div>
              </div>
            </div>
          </div>
          <div className='col-md-4'>
            <div className='card border-0 bg-light'>
              <div className='card-body text-center'>
                <div
                  className={`fs-2 ${
                    config.requiresQualification ? 'text-info' : 'text-success'
                  }`}
                >
                  <i
                    className={`ti ti-${
                      config.requiresQualification ? 'lock' : 'world'
                    }`}
                  ></i>
                </div>
                <div>
                  {config.requiresQualification
                    ? 'Qualified Only'
                    : 'Open to All'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='row'>
          <div className='col-md-6'>
            <div className='form-check form-switch mb-3'>
              <input
                className='form-check-input'
                type='checkbox'
                checked={config.isActive}
                onChange={(e) => updateConfig({ isActive: e.target.checked })}
                style={{ transform: 'scale(1.2)' }}
              />
              <label className='form-check-label fw-bold'>Form Active</label>
              <small className='form-text text-muted d-block'>
                When active, this form will be visible to users
              </small>
            </div>
          </div>
          <div className='col-md-6'>
            <div className='form-check form-switch mb-3'>
              <input
                className='form-check-input'
                type='checkbox'
                checked={config.requiresPayment}
                onChange={(e) =>
                  updateConfig({ requiresPayment: e.target.checked })
                }
                style={{ transform: 'scale(1.2)' }}
              />
              <label className='form-check-label fw-bold'>
                Requires Payment
              </label>
              <small className='form-text text-muted d-block'>
                Users must complete payment to register
              </small>
            </div>
          </div>
        </div>

        <div className='row'>
          <div className='col-md-6'>
            <div className='form-check form-switch mb-3'>
              <input
                className='form-check-input'
                type='checkbox'
                checked={config.requiresQualification}
                onChange={(e) =>
                  updateConfig({ requiresQualification: e.target.checked })
                }
                style={{ transform: 'scale(1.2)' }}
              />
              <label className='form-check-label fw-bold'>
                Requires Tryout Qualification
              </label>
              <small className='form-text text-muted d-block'>
                Only users who passed tryouts can register
              </small>
            </div>
          </div>
          <div className='col-md-6'>
            <div className='mb-3'>
              <label className='form-label fw-bold'>Base Price</label>
              <div className='input-group'>
                <span className='input-group-text'>$</span>
                <input
                  type='number'
                  className='form-control'
                  value={config.pricing.basePrice}
                  onChange={(e) =>
                    updateConfig({
                      pricing: {
                        ...config.pricing,
                        basePrice: Number(e.target.value),
                      },
                    })
                  }
                  min='0'
                  step='1'
                />
              </div>
              <small className='form-text text-muted'>
                Default price when no packages are selected
              </small>
            </div>
          </div>
        </div>

        {/* Pricing Packages */}
        <div className='card mt-4'>
          <div className='card-header'>
            <h5 className='mb-0'>Pricing Packages</h5>
            <small className='text-muted'>
              Create different pricing options for users to choose from
            </small>
          </div>
          <div className='card-body'>
            {/* Add New Package */}
            <div className='row g-3 mb-4 p-3 bg-light rounded'>
              <div className='col-md-3'>
                <label className='form-label'>Package Name *</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='e.g., 2x/Week, Basic, Premium'
                  value={newPackage.name}
                  onChange={(e) =>
                    setNewPackage((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className='col-md-2'>
                <label className='form-label'>Price *</label>
                <div className='input-group'>
                  <span className='input-group-text'>$</span>
                  <input
                    type='number'
                    className='form-control'
                    placeholder='0'
                    value={newPackage.price}
                    onChange={(e) =>
                      setNewPackage((prev) => ({
                        ...prev,
                        price: Number(e.target.value),
                      }))
                    }
                    min='0'
                    step='1'
                  />
                </div>
              </div>
              <div className='col-md-5'>
                <label className='form-label'>Description</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='e.g., Two training sessions per week'
                  value={newPackage.description}
                  onChange={(e) =>
                    setNewPackage((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
              <div className='col-md-2 d-flex align-items-end'>
                <button
                  type='button'
                  className='btn btn-primary w-100'
                  onClick={handleAddPackage}
                  disabled={!newPackage.name || newPackage.price <= 0}
                >
                  <i className='ti ti-plus me-1'></i>
                  Add Package
                </button>
              </div>
            </div>

            {/* Packages List */}
            {config.pricing.packages.length > 0 ? (
              <div className='packages-list'>
                <h6>Current Packages ({config.pricing.packages.length}):</h6>
                {config.pricing.packages.map((pkg, index) => (
                  <div key={pkg.id} className='card mb-2'>
                    <div className='card-body py-2'>
                      <div className='row align-items-center'>
                        <div className='col-md-1'>
                          <div className='btn-group btn-group-sm'>
                            <button
                              type='button'
                              className='btn btn-outline-secondary'
                              onClick={() => handleMovePackage(index, 'up')}
                              disabled={index === 0}
                            >
                              <i className='ti ti-arrow-up'></i>
                            </button>
                            <button
                              type='button'
                              className='btn btn-outline-secondary'
                              onClick={() => handleMovePackage(index, 'down')}
                              disabled={
                                index === config.pricing.packages.length - 1
                              }
                            >
                              <i className='ti ti-arrow-down'></i>
                            </button>
                          </div>
                        </div>
                        <div className='col-md-3'>
                          <strong>{pkg.name}</strong>
                        </div>
                        <div className='col-md-2'>
                          <span className='text-success fw-bold'>
                            ${pkg.price}
                          </span>
                        </div>
                        <div className='col-md-4'>
                          <small className='text-muted'>
                            {pkg.description}
                          </small>
                        </div>
                        <div className='col-md-2 text-end'>
                          <button
                            type='button'
                            className='btn btn-sm btn-outline-danger'
                            onClick={() => handleRemovePackage(pkg.id!)}
                          >
                            <i className='ti ti-trash'></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center p-4 text-muted'>
                <i className='ti ti-package-off fs-1 mb-2'></i>
                <p>No pricing packages created yet</p>
                <small>
                  Add packages to give users different pricing options
                </small>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationFormConfig;
