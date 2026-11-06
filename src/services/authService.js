// AI-assisted: see docs/AI_LOG.md #5
import {
  onAuthStateChanged,
  signInAnonymously,
} from 'firebase/auth';
import { auth } from '../config/firebase';

export function signInDriverAnonymously() {
  return signInAnonymously(auth);
}

export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}
