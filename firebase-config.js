/* ==========================================================================
   SMART UPLI HUB - FIREBASE CONFIGURATION & INITIALIZATION
   ========================================================================== */

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDrJ0MM4hjF3GfJADJxp6QSRC1iO7qIZvg",
    authDomain: "smartupli.firebaseapp.com",
    databaseURL: "https://smartupli-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "smartupli",
    storageBucket: "smartupli.firebasestorage.app",
    messagingSenderId: "1077469915508",
    appId: "1:1077469915508:web:9c81a102a11a62dc146421",
    measurementId: "G-GHHX7MS098"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firestore & Storage instances (global)
const db = firebase.firestore();
const storage = firebase.storage();

// Feature Flags & Timeouts
const USE_FIREBASE_STORAGE = false; // Set to true after enabling Storage in Firebase Console and configuring CORS
if (storage) {
    try {
        storage.setMaxUploadRetryTime(2000); // 2s max upload retry
        storage.setMaxOperationRetryTime(2000); // 2s max operation retry
    } catch (e) {
        console.warn("Could not set storage retry times:", e);
    }
}

// Enable Firestore offline persistence (works even without internet)
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
    if (err.code === 'failed-precondition') {
        console.warn("Firestore persistence: Multiple tabs open.");
    } else if (err.code === 'unimplemented') {
        console.warn("Firestore persistence: Browser not supported.");
    }
});

console.log("✅ Firebase initialized — Project: smartupli");
