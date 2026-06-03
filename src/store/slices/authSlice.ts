import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthUser {
  uid: string;
  email: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isBiometricVerified: boolean;
  hasAcceptedConsent: boolean;
  hasCompletedQuestionnaire: boolean;
  activeProfileId: string | null;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isBiometricVerified: false,
  hasAcceptedConsent: false,
  hasCompletedQuestionnaire: false,
  activeProfileId: null,
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
  setBiometricVerified,
  setActiveProfileId,
  setHasAcceptedConsent,
  setHasCompletedQuestionnaire,
  setLoading,
  logout,
} = authSlice.actions;
export default authSlice.reducer;
