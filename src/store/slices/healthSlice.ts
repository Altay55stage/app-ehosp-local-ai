import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface MedicalProfile {
  name?: string;
  birthDate: string;
  gender: string;
  weight: string;
  height: string;
  allergies: string;
  chronicConditions: string;
  medications: string;
  birthCountry?: string;
  currentCountry?: string;
}

interface Vitals {
  heartRate: number | null;
  bloodPressure: string | null;
  lastUpdated: number | null;
}

interface HealthState {
  profile: MedicalProfile;
  vitals: Vitals;
}

const initialState: HealthState = {
  profile: {
    name: '',
    birthDate: '',
    gender: '',
    weight: '',
    height: '',
    allergies: '',
    chronicConditions: '',
    medications: '',
    birthCountry: '',
    currentCountry: '',
  },
  vitals: {
    heartRate: null,
    bloodPressure: null,
    lastUpdated: null,
  },
};

const healthSlice = createSlice({
  name: 'health',
  initialState,
  reducers: {
    updateProfile: (state, action: PayloadAction<Partial<MedicalProfile>>) => {
      state.profile = { ...state.profile, ...action.payload };
    },
    updateVitals: (state, action: PayloadAction<Partial<Vitals>>) => {
      state.vitals = { ...state.vitals, ...action.payload, lastUpdated: Date.now() };
    },
    clearProfile: (state) => {
      state.profile = initialState.profile;
    }
  },
});

export const { updateProfile, updateVitals, clearProfile } = healthSlice.actions;
export default healthSlice.reducer;
