import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface FamilyMember {
  id: string;
  name: string;
  relation: string; // ex: Fils, Fille, Conjoint, Père, Mère
  age: string;
  chronicConditions: string;
  allergies: string;
}

interface FamilyState {
  members: FamilyMember[];
  geneticAnalysisResult: string | null;
}

const initialState: FamilyState = {
  members: [],
  geneticAnalysisResult: null,
};

const familySlice = createSlice({
  name: 'family',
  initialState,
  reducers: {
    addMember: (state, action: PayloadAction<FamilyMember>) => {
      state.members.push(action.payload);
    },
    removeMember: (state, action: PayloadAction<string>) => {
      state.members = state.members.filter(m => m.id !== action.payload);
    },
    setGeneticAnalysisResult: (state, action: PayloadAction<string>) => {
      state.geneticAnalysisResult = action.payload;
    }
  },
});

export const { addMember, removeMember, setGeneticAnalysisResult } = familySlice.actions;
export default familySlice.reducer;
