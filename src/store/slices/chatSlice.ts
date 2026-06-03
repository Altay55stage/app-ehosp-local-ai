import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
  agent?: string;
  urgencyScore?: number;
  xaiExplanation?: string;
  sources?: string;
  imageUrl?: string;
  imageBase64?: string;
}

export interface SessionMetadata {
  id: string;
  title: string;
  timestamp: number;
}

interface ChatState {
  messages: Message[];
  loading: boolean;
  currentUrgencyScore: number;
  sessions: SessionMetadata[];
  activeSessionId: string | null;
}

const initialState: ChatState = {
  messages: [],
  loading: false,
  currentUrgencyScore: 1,
  sessions: [],
  activeSessionId: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setSessions: (state, action: PayloadAction<SessionMetadata[]>) => {
      state.sessions = action.payload;
    },
    setActiveSessionId: (state, action: PayloadAction<string | null>) => {
      state.activeSessionId = action.payload;
    },
    addSession: (state, action: PayloadAction<SessionMetadata>) => {
      state.sessions.unshift(action.payload);
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setUrgencyScore: (state, action: PayloadAction<number>) => {
      state.currentUrgencyScore = action.payload;
    },
    clearMessages: (state) => {
      state.messages = [];
    }
  },
});

export const { addMessage, setLoading, setUrgencyScore, clearMessages, setSessions, setActiveSessionId, addSession } = chatSlice.actions;
export default chatSlice.reducer;
