import { Platform } from 'react-native';

// Clés publiques RevenueCat (à configurer sur le dashboard RevenueCat)
const APIKeys = {
  apple: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY || "appl_placeholder_key",
  google: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY || "goog_placeholder_key"
};

export class PurchasesService {
  static async initialize(userId: string) {
    console.log("RevenueCat Initialize (Mock) for user:", userId);
  }

  static async getOfferings() {
    return [
      { identifier: 'monthly', packageType: 'MONTHLY', product: { title: 'Premium Mensuel', priceString: '9.99€' } },
      { identifier: 'yearly', packageType: 'ANNUAL', product: { title: 'Premium Annuel', priceString: '79.99€' } }
    ];
  }

  static async purchasePackage(pack: any) {
    console.log("Simulating purchase for:", pack.identifier);
    return new Promise(resolve => setTimeout(() => resolve(true), 1500));
  }

  static async checkSubscriptionStatus() {
    return false;
  }

  static async restorePurchases() {
    return new Promise(resolve => setTimeout(() => resolve(true), 1500));
  }
}
