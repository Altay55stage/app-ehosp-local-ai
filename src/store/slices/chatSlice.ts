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
  promptCount: number;
}

const initialState: ChatState = {
  messages: [],
  loading: false,
  currentUrgencyScore: 1,
  sessions: [],
  activeSessionId: null,
  promptCount: 0,
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
      const exists = state.sessions.find(s => s.id === action.payload.id);
      if (!exists) {
        state.sessions.unshift(action.payload);
      }
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    updateMessage: (state, action: PayloadAction<{ id: string; text: string }>) => {
      const index = state.messages.findIndex(m => m.id === action.payload.id);
      if (index !== -1) {
        state.messages[index].text = action.payload.text;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setUrgencyScore: (state, action: PayloadAction<number>) => {
      state.currentUrgencyScore = action.payload;
    },
    clearMessages: (state) => {
      state.messages = [];
      state.currentUrgencyScore = 1;
    },
    deleteSession: (state, action: PayloadAction<string>) => {
      state.sessions = state.sessions.filter(s => s.id !== action.payload);
      if (state.activeSessionId === action.payload) {
        state.activeSessionId = null;
        state.messages = [];
      }
    },
    setPromptCount: (state, action: PayloadAction<number>) => {
      state.promptCount = action.payload;
    },
    incrementPromptCount: (state) => {
      state.promptCount += 1;
    }
  },
});

export const { 
  addMessage, updateMessage, setLoading, setUrgencyScore, 
  clearMessages, setSessions, setActiveSessionId, addSession, 
  deleteSession, setPromptCount, incrementPromptCount 
} = chatSlice.actions;
export default chatSlice.reducer;
