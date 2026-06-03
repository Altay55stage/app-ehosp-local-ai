import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth as getFirebaseAuth, 
  initializeAuth as initializeFirebaseAuth, 
  // @ts-ignore
  getReactNativePersistence, 
  signInWithEmailAndPassword as firebaseSignIn, 
  createUserWithEmailAndPassword as firebaseCreateUser, 
  signOut as firebaseSignOut, 
  GoogleAuthProvider, 
  signInWithCredential,
  Auth
} from 'firebase/auth';
import { 
  getDatabase as getFirebaseDb, 
  ref as firebaseRef, 
  set as firebaseSet, 
  get as firebaseGet, 
  child as firebaseChild 
} from 'firebase/database';
import { 
  getFirestore as getFirebaseFirestore,
  collection as fbCollection,
  doc as fbDoc,
  setDoc as fbSetDoc,
  getDoc as fbGetDoc,
  updateDoc as fbUpdateDoc,
  query as fbQuery,
  where as fbWhere,
  getDocs as fbGetDocs,
  onSnapshot as fbOnSnapshot,
  Timestamp as fbTimestamp
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Load config
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
const IS_LOCAL_STORAGE = process.env.EXPO_PUBLIC_LOCAL_STORAGE === 'true';

console.log(`🔌 Storage Mode: ${IS_LOCAL_STORAGE ? '🔴 LOCAL SQLITE ON MAC (REST API)' : '☁️ CLOUD FIREBASE'}`);

// ─── LOCAL MOCK SERVICES (SQLite Bridge) ──────────────────────────────────────

let localUser: any = null;
const authListeners = new Set<(user: any) => void>();

// Load local user session from AsyncStorage on startup
if (IS_LOCAL_STORAGE) {
  ReactNativeAsyncStorage.getItem('ehosp_local_user').then(val => {
    if (val) {
      localUser = JSON.parse(val);
      authListeners.forEach(cb => cb(localUser));
    }
  }).catch(err => console.error("AsyncStorage user load failed:", err));
}

const mockAuth: any = {
  currentUser: null,
  onAuthStateChanged: (callback: (user: any) => void) => {
    authListeners.add(callback);
    // Immediately call with current value
    callback(localUser);
    return () => {
      authListeners.delete(callback);
    };
  }
};

// Sync currentUser to match localUser
Object.defineProperty(mockAuth, 'currentUser', {
  get: () => localUser,
  set: (val) => {
    localUser = val;
  }
});

async function localSignInWithEmailAndPassword(_authInstance: any, email: string, pass: string) {
  try {
    const res = await axios.post(`${BACKEND_URL}/api/auth/login`, { email, password: pass });
    const user = { uid: res.data.user.uid, email: res.data.user.email, role: res.data.user.role || 'patient' };
    localUser = user;
    await ReactNativeAsyncStorage.setItem('ehosp_local_user', JSON.stringify(user));
    authListeners.forEach(cb => cb(user));
    return { user };
  } catch (err: any) {
    const msg = err.response?.data?.error || "Connexion refusée par le serveur local.";
    throw new Error(msg);
  }
}

async function localCreateUserWithEmailAndPassword(_authInstance: any, email: string, pass: string) {
  try {
    const uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const res = await axios.post(`${BACKEND_URL}/api/auth/register`, { uid, email, password: pass });
    const user = { uid: res.data.user.uid, email: res.data.user.email, role: 'patient' };
    localUser = user;
    await ReactNativeAsyncStorage.setItem('ehosp_local_user', JSON.stringify(user));
    authListeners.forEach(cb => cb(user));
    return { user };
  } catch (err: any) {
    const msg = err.response?.data?.error || "Erreur lors de l'enregistrement local.";
    throw new Error(msg);
  }
}

async function localSignOut(_authInstance: any) {
  localUser = null;
  await ReactNativeAsyncStorage.removeItem('ehosp_local_user');
  authListeners.forEach(cb => cb(null));
}

// ─── Realtime Database wrappers (RTDB) ────────────────────────────────────────

function localRef(_db: any, path: string) {
  return { _type: 'rtdb_ref', path };
}

async function localSet(refObj: any, data: any) {
  if (!refObj || refObj._type !== 'rtdb_ref') return;
  const path = refObj.path;

  // Route session metadata
  // Format path: users/${uid}/profiles/${profileId}/sessions/${sessionId}/metadata
  if (path.includes('/sessions/') && path.endsWith('/metadata')) {
    const parts = path.split('/');
    const uid = parts[1];
    const profileId = parts[3];
    const sessionId = parts[5];
    await axios.post(`${BACKEND_URL}/api/sessions`, {
      id: sessionId,
      uid,
      profileId,
      title: data.title,
      timestamp: data.timestamp
    });
    return;
  }

  // Route session messages
  // Format path: users/${uid}/profiles/${profileId}/sessions/${sessionId}/messages/${msgId}
  if (path.includes('/sessions/') && path.includes('/messages/')) {
    const parts = path.split('/');
    const sessionId = parts[5];
    await axios.post(`${BACKEND_URL}/api/sessions/${sessionId}/messages`, data);
    return;
  }

  // Route questionnaire onboarding (profile specific or legacy)
  // Format path: users/${uid}/profiles/${profileId}/questionnaire OR users/${uid}/onboarding/questionnaire
  if (path.endsWith('/questionnaire')) {
    const parts = path.split('/');
    const uid = parts[1];
    const profileId = parts.includes('profiles') ? parts[parts.indexOf('profiles') + 1] : 'legacy';
    await ReactNativeAsyncStorage.setItem(`@questionnaire_${uid}_${profileId}`, JSON.stringify(data));
    return;
  }

  // Route consent onboarding
  if (path.includes('/onboarding/consent')) {
    const parts = path.split('/');
    const uid = parts.find((p, i) => parts[i - 1] === 'users');
    if (uid) {
      await ReactNativeAsyncStorage.setItem(`@consent_${uid}`, 'true');
    }
    return;
  }
}

async function localGet(refObj: any) {
  if (!refObj || refObj._type !== 'rtdb_ref') return { exists: () => false, val: () => null };
  const path = refObj.path;

  // Format path: users/${uid}/profiles/${profileId}/sessions
  if (path.includes('/profiles/') && path.endsWith('/sessions')) {
    const parts = path.split('/');
    const uid = parts[1];
    const profileId = parts[3];
    const res = await axios.get(`${BACKEND_URL}/api/sessions`, { params: { uid, profileId } });
    
    const sessionsObj: any = {};
    res.data.forEach((s: any) => {
      sessionsObj[s.id] = { metadata: s };
    });

    return {
      exists: () => res.data.length > 0,
      val: () => sessionsObj
    };
  }

  // Format path: users/${uid}/profiles/${profileId}/sessions/${sessionId}/messages
  if (path.includes('/sessions/') && path.endsWith('/messages')) {
    const parts = path.split('/');
    const sessionId = parts[5];
    const res = await axios.get(`${BACKEND_URL}/api/sessions/${sessionId}/messages`);
    
    const messagesObj: any = {};
    res.data.forEach((m: any) => {
      messagesObj[m.id] = m;
    });

    return {
      exists: () => res.data.length > 0,
      val: () => messagesObj
    };
  }

  // Format path: users/${uid}/profiles
  if (path.endsWith('/profiles')) {
    const parts = path.split('/');
    const uid = parts[1];
    const res = await axios.get(`${BACKEND_URL}/api/profiles`, { params: { uid } });
    
    const profilesObj: any = {};
    res.data.forEach((p: any) => {
      profilesObj[p.id] = p;
    });

    return {
      exists: () => res.data.length > 0,
      val: () => profilesObj
    };
  }

  // Format path: users/${uid}/profiles/${profileId}/questionnaire OR users/${uid}/onboarding/questionnaire
  if (path.endsWith('/questionnaire')) {
    const parts = path.split('/');
    const uid = parts[1];
    const profileId = parts.includes('profiles') ? parts[parts.indexOf('profiles') + 1] : 'legacy';
    const data = await ReactNativeAsyncStorage.getItem(`@questionnaire_${uid}_${profileId}`);
    const parsed = data ? JSON.parse(data) : null;
    return {
      exists: () => parsed !== null,
      val: () => parsed
    };
  }

  // Format path: users/${uid}/onboarding/consent
  if (path.includes('/onboarding/consent')) {
    const parts = path.split('/');
    const uid = parts.find((p, i) => parts[i - 1] === 'users');
    let accepted = false;
    if (uid) {
      const val = await ReactNativeAsyncStorage.getItem(`@consent_${uid}`);
      if (val === 'true') accepted = true;
    }
    return {
      exists: () => accepted,
      val: () => ({ accepted })
    };
  }

  return { exists: () => false, val: () => null };
}

function localChild(parentRef: any, path: string) {
  return { _type: 'rtdb_ref', path: `${parentRef.path}/${path}` };
}

// ─── Local Firestore Mock Implementations ────────────────────────────────────

export class LocalDocRef {
  _type = 'firestore_doc';
  collectionName: string;
  id: string;
  constructor(collectionName: string, id: string) {
    this.collectionName = collectionName;
    this.id = id;
  }
}

export class LocalColRef {
  _type = 'firestore_col';
  collectionName: string;
  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }
}

export function localCollection(_fs: any, path: string) {
  return new LocalColRef(path);
}

export function localDoc(_fs: any, colOrPath: string | LocalColRef, id?: string) {
  if (typeof colOrPath === 'string') {
    return new LocalDocRef(colOrPath, id || '');
  }
  return new LocalDocRef(colOrPath.collectionName, id || '');
}

export async function localGetDoc(docRef: LocalDocRef) {
  try {
    const res = await axios.get(`${BACKEND_URL}/api/${docRef.collectionName}/${docRef.id}`);
    return {
      exists: () => res.data !== null && !res.data.error,
      data: () => res.data
    };
  } catch {
    return { exists: () => false, data: () => null };
  }
}

export async function localSetDoc(docRef: LocalDocRef, data: any) {
  const payload = { id: docRef.id, ...data };
  await axios.post(`${BACKEND_URL}/api/${docRef.collectionName}`, payload);
}

export async function localUpdateDoc(docRef: LocalDocRef, data: any) {
  await axios.patch(`${BACKEND_URL}/api/${docRef.collectionName}/${docRef.id}`, data);
}

export function localQuery(colRef: LocalColRef, ...constraints: any[]) {
  return { colRef, constraints };
}

export function localWhere(field: string, op: string, value: any) {
  return { field, op, value };
}

export async function localGetDocs(queryObj: any) {
  const colRef = queryObj.colRef;
  const constraints = queryObj.constraints || [];
  
  const params: any = {};
  constraints.forEach((c: any) => {
    if (c.field) {
      params[c.field] = c.value;
    }
  });

  const res = await axios.get(`${BACKEND_URL}/api/${colRef.collectionName}`, { params });
  const docs = res.data.map((item: any) => ({
    id: item.id || item.uid,
    data: () => item
  }));

  return {
    docs,
    size: docs.length,
    forEach: (cb: (d: any) => void) => docs.forEach(cb)
  };
}

export function localOnSnapshot(docRefOrQuery: any, callback: (snapshot: any) => void) {
  if (docRefOrQuery._type === 'firestore_doc') {
    localGetDoc(docRefOrQuery).then(callback);
    const interval = setInterval(() => localGetDoc(docRefOrQuery).then(callback), 3000);
    return () => clearInterval(interval);
  } else {
    localGetDocs(docRefOrQuery).then(callback);
    const interval = setInterval(() => localGetDocs(docRefOrQuery).then(callback), 3000);
    return () => clearInterval(interval);
  }
}

export const localTimestamp = {
  now: () => ({ toMillis: () => Date.now() }),
  fromMillis: (m: number) => ({ toMillis: () => m })
};

// ─── EXPORTS ROUTING ─────────────────────────────────────────────────────────

const auth = IS_LOCAL_STORAGE ? mockAuth : (() => {
  try {
    return initializeFirebaseAuth(app, { persistence: getReactNativePersistence(ReactNativeAsyncStorage) });
  } catch {
    return getFirebaseAuth(app);
  }
})();

const db = IS_LOCAL_STORAGE ? {} : getFirebaseDb(app);
const firestore = IS_LOCAL_STORAGE ? {} : getFirebaseFirestore(app);
const storage = IS_LOCAL_STORAGE ? {} : getStorage(app);

// Authentication Functions
const signInWithEmailAndPassword = IS_LOCAL_STORAGE ? localSignInWithEmailAndPassword : firebaseSignIn;
const createUserWithEmailAndPassword = IS_LOCAL_STORAGE ? localCreateUserWithEmailAndPassword : firebaseCreateUser;
const signOut = IS_LOCAL_STORAGE ? localSignOut : firebaseSignOut;

// Database helper Functions
const ref = IS_LOCAL_STORAGE ? localRef : firebaseRef;
const set = IS_LOCAL_STORAGE ? localSet : firebaseSet;
const get = IS_LOCAL_STORAGE ? localGet : firebaseGet;
const child = IS_LOCAL_STORAGE ? localChild : firebaseChild;

// Firestore Functions
const collection = IS_LOCAL_STORAGE ? localCollection : fbCollection;
const doc = IS_LOCAL_STORAGE ? localDoc : fbDoc;
const setDoc = IS_LOCAL_STORAGE ? localSetDoc : fbSetDoc;
const getDoc = IS_LOCAL_STORAGE ? localGetDoc : fbGetDoc;
const updateDoc = IS_LOCAL_STORAGE ? localUpdateDoc : fbUpdateDoc;
const query = IS_LOCAL_STORAGE ? localQuery : fbQuery;
const where = IS_LOCAL_STORAGE ? localWhere : fbWhere;
const getDocs = IS_LOCAL_STORAGE ? localGetDocs : fbGetDocs;
const onSnapshot = IS_LOCAL_STORAGE ? localOnSnapshot : fbOnSnapshot;
const Timestamp = IS_LOCAL_STORAGE ? localTimestamp : fbTimestamp;

export { 
  app, 
  auth, 
  db,
  firestore,
  storage,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithCredential, 
  ref, 
  set, 
  get, 
  child,
  // Firestore exports
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  Timestamp
};
export { IS_LOCAL_STORAGE, BACKEND_URL };
