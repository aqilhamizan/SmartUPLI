/* ==========================================================================
   MY INTERNMS HUB - FIREBASE CONFIGURATION & INITIALIZATION
   ========================================================================== */

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAxorKsLZxypigNSOkFIqdiZoyQy1a4RCI",
    authDomain: "myinternms.firebaseapp.com",
    projectId: "myinternms",
    storageBucket: "myinternms.firebasestorage.app",
    messagingSenderId: "664284023119",
    appId: "1:664284023119:web:e4d0328fcb9cbb3a821d3a",
    measurementId: "G-5DM634B73N"
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

console.log("✅ Firebase initialized — Project: myinternms");
