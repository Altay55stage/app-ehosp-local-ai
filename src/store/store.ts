import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import healthReducer from './slices/healthSlice';
import familyReducer from './slices/familySlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    health: healthReducer,
    family: familyReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
