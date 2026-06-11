// Firebase Admin SDK bootstrap for HOMY Phase 8 push notifications.
//
// Initialises the Admin SDK once on first import. The service account
// JSON is loaded from the FIREBASE_SERVICE_ACCOUNT env var (the full
// JSON string, set in Railway → Variables) — keeping it out of git.
// In dev without the env var set, the module exports nulls and the
// /api/notify-message endpoint reports the disabled state instead of
// crashing.

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';

let app = null;
let messaging = null;
let firestore = null;

function bootstrap() {
  if (app) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return;
  let credentials;
  try {
    credentials = JSON.parse(raw);
  } catch (err) {
    console.error('FIREBASE_SERVICE_ACCOUNT is not valid JSON:', err.message);
    return;
  }
  if (getApps().length === 0) {
    app = initializeApp({
      credential: cert(credentials),
      projectId: credentials.project_id,
    });
  } else {
    app = getApps()[0];
  }
  messaging = getMessaging(app);
  firestore = getFirestore(app);
}

bootstrap();

export function isAdminReady() {
  return Boolean(messaging && firestore);
}

export function getAdminMessaging() {
  bootstrap();
  return messaging;
}

export function getAdminFirestore() {
  bootstrap();
  return firestore;
}
