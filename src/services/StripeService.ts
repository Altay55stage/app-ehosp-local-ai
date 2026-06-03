import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';

export class StripeService {
  /**
   * Initialise le PaymentSheet de Stripe.
   * Note: Dans une app réelle, le 'paymentIntent' doit être créé côté serveur.
   */
  static async initializePaymentSheet(amount: number) {
    try {
      // ÉTAPE 1: Appel fictif à votre backend pour obtenir les secrets
      // const { paymentIntent, ephemeralKey, customer } = await fetchPaymentParams(amount);
      
      const mockParams = {
        paymentIntent: 'pi_test_mock_secret',
        ephemeralKey: 'ek_test_mock_secret',
        customer: 'cus_test_mock',
        publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
      };

      const { error } = await initPaymentSheet({
        merchantDisplayName: 'eHosp Premium',
        customerId: mockParams.customer,
        customerEphemeralKeySecret: mockParams.ephemeralKey,
        paymentIntentClientSecret: mockParams.paymentIntent,
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          name: 'Patient eHosp',
        },
        applePay: {
          merchantCountryCode: 'FR',
        },
        googlePay: {
          merchantCountryCode: 'FR',
          testEnv: true,
          currencyCode: 'eur',
        },
      });

      if (error) {
        console.error("Stripe Init Error:", error);
        return false;
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  /**
   * Affiche le tunnel de paiement
   */
  static async openPaymentSheet() {
    const { error } = await presentPaymentSheet();

    if (error) {
      if (error.code === 'Canceled') return 'canceled';
      return 'error';
    } else {
      return 'success';
    }
  }
}
