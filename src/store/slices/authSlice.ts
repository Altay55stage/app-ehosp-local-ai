import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthUser {
  uid: string;
  email: string | null;
  role?: 'patient' | 'doctor' | 'admin';
  status?: 'pending' | 'approved' | 'rejected';
  socialSecurityNumber?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isBiometricVerified: boolean;
  hasAcceptedConsent: boolean;
  hasCompletedQuestionnaire: boolean;
  activeProfileId: string | null;
  subscriptionStatus: 'free' | 'premium';
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isBiometricVerified: false,
  hasAcceptedConsent: false,
  hasCompletedQuestionnaire: false,
  activeProfileId: null,
  subscriptionStatus: process.env.EXPO_PUBLIC_ALL_FREE === 'true' ? 'premium' : 'free',
  loading: false,
};


const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<AuthUser | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setUserRole: (state, action: PayloadAction<'patient' | 'doctor' | 'admin'>) => {
      if (!state.user) return;
      state.user.role = action.payload;
    },
    setUserStatus: (state, action: PayloadAction<'pending' | 'approved' | 'rejected'>) => {
      if (!state.user) return;
      state.user.status = action.payload;
    },
    setUserSSN: (state, action: PayloadAction<string | null>) => {
      if (!state.user) return;
      state.user.socialSecurityNumber = action.payload;
    },
    setBiometricVerified: (state, action: PayloadAction<boolean>) => {
      state.isBiometricVerified = action.payload;
    },
    setActiveProfileId: (state, action: PayloadAction<string | null>) => {
      state.activeProfileId = action.payload;
    },
    setHasAcceptedConsent: (state, action: PayloadAction<boolean>) => {
      state.hasAcceptedConsent = action.payload;
    },
    setHasCompletedQuestionnaire: (state, action: PayloadAction<boolean>) => {
      state.hasCompletedQuestionnaire = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setSubscriptionStatus: (state, action: PayloadAction<'free' | 'premium'>) => {
      state.subscriptionStatus = action.payload;
    },
    logout: (state) => {

      state.user = null;
      state.isAuthenticated = false;
      state.isBiometricVerified = false;
      state.hasAcceptedConsent = false;
      state.hasCompletedQuestionnaire = false;
      state.activeProfileId = null;
    },
  },
});

export const {
  setUser,
  setUserRole,
  setUserStatus,
  setUserSSN,
  setBiometricVerified,
  setActiveProfileId,
  setHasAcceptedConsent,
  setHasCompletedQuestionnaire,
  setLoading,
  setSubscriptionStatus,
  logout,
} = authSlice.actions;

export default authSlice.reducer;
