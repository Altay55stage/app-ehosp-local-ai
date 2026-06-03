import './global.css';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import RootNavigator from './src/navigation/RootNavigator';
import * as FileSystem from 'expo-file-system';

// ── Error Logger ──────────────────────────────────────────────────
const LOG_PATH = FileSystem.documentDirectory + 'error_log.txt';

const saveErrorLog = async (title: string, error: any) => {
  const timestamp = new Date().toLocaleString();
  const message = error?.message || String(error);
  const stack = error?.stack || '';
  const entry = `[${timestamp}] ${title}\n${message}\n${stack}\n\n---\n\n`;
  try {
    const info = await FileSystem.getInfoAsync(LOG_PATH);
    if (info.exists) {
      const existing = await FileSystem.readAsStringAsync(LOG_PATH);
      await FileSystem.writeAsStringAsync(LOG_PATH, existing + entry);
    } else {
      await FileSystem.writeAsStringAsync(LOG_PATH, entry);
    }
  } catch {}
};

// Capture les erreurs JS non catchées (via le handler global RN)
const globalHandler = (global as any)?.ErrorUtils?.setGlobalHandler;
if (globalHandler) {
  (global as any).ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    saveErrorLog(`FATAL: ${isFatal ? 'Yes' : 'No'}`, error);
  });
}

// Capture console.error
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const errObj = args.find((a) => a instanceof Error);
  if (errObj) saveErrorLog('ConsoleError', errObj);
  originalConsoleError(...args);
};

// Capture unhandled promise rejections
const tracking = (global as any).tracking;
if (tracking) {
  // web only — skipped on native
}

// ── App ───────────────────────────────────────────────────────────
export default function App() {
  useEffect(() => {
    saveErrorLog('APP_START', { message: 'Application started' });
  }, []);

  return (
    <Provider store={store}>
      <RootNavigator />
      <StatusBar style="light" />
    </Provider>
  );
}
