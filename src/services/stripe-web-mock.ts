import React from 'react';

export const useStripe = () => {
  return {
    initPaymentSheet: async (params: any) => {
      console.log('[Web Mock] initPaymentSheet', params);
      return { error: null };
    },
    presentPaymentSheet: async () => {
      console.log('[Web Mock] presentPaymentSheet');
      // Simulate a successful payment on web mock
      return { error: null };
    },
  };
};

export const initPaymentSheet = async (params: any) => {
  console.log('[Web Mock] Direct initPaymentSheet', params);
  return { error: null };
};

export const presentPaymentSheet = async () => {
  console.log('[Web Mock] Direct presentPaymentSheet');
  return { error: null };
};

export const StripeProvider = ({ children }: any) => {
  return children;
};

export default {
  useStripe,
  initPaymentSheet,
  presentPaymentSheet,
  StripeProvider,
};
