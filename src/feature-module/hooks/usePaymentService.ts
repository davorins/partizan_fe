import { useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import {
  PaymentSystem,
  PaymentConfiguration,
  ApiResponse,
} from '../../types/payment';

interface UsePaymentServiceReturn {
  getPaymentService: (
    organizationId: string,
    paymentSystem?: PaymentSystem,
  ) => Promise<any>;
  getActiveConfigurations: (
    organizationId: string,
  ) => Promise<PaymentConfiguration[]>;
  testConfiguration: (configId: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

const usePaymentService = (): UsePaymentServiceReturn => {
  const { getAuthToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPaymentService = useCallback(
    async (organizationId: string, paymentSystem?: PaymentSystem) => {
      try {
        setLoading(true);
        setError(null);

        const token = await getAuthToken();
        const endpoint = paymentSystem
          ? `${process.env.REACT_APP_API_BASE_URL}/payments/service/${organizationId}/${paymentSystem}`
          : `${process.env.REACT_APP_API_BASE_URL}/payments/service/${organizationId}`;

        const response = await axios.get<ApiResponse<any>>(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.success) {
          return response.data.data;
        } else {
          throw new Error(
            response.data.error || 'Failed to get payment service',
          );
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || err.message;
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [getAuthToken],
  );

  const getActiveConfigurations = useCallback(
    async (organizationId: string): Promise<PaymentConfiguration[]> => {
      try {
        setLoading(true);
        setError(null);

        const token = await getAuthToken();
        const response = await axios.get<ApiResponse<PaymentConfiguration[]>>(
          `${process.env.REACT_APP_API_BASE_URL}/payment-configuration/organization/${organizationId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (response.data.success && response.data.data) {
          return response.data.data;
        } else {
          throw new Error(
            response.data.error || 'Failed to get configurations',
          );
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || err.message;
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [getAuthToken],
  );

  const testConfiguration = useCallback(
    async (configId: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const token = await getAuthToken();
        const response = await axios.post<ApiResponse<any>>(
          `${process.env.REACT_APP_API_BASE_URL}/payment-configuration/${configId}/test`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );

        return response.data.success || false;
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || err.message;
        setError(errorMsg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [getAuthToken],
  );

  return {
    getPaymentService,
    getActiveConfigurations,
    testConfiguration,
    loading,
    error,
  };
};

export default usePaymentService;
