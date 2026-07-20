// --- GOOGLE APPS SCRIPT WEB APP URL (PILIHAN) ---
// Letakkan URL Web App Google Apps Script anda di sini jika ingin menggunakan
// Google Sheets (sebagai database) & Google Drive (sebagai storan fail PDF).
// Contoh: const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/.../exec";
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxoG76mTacW6KQ-UQN_pSf1jzBvn95meCQfppKBc7Qq_gEpuEj9Iz1WFF7CXlxlTTRhqw/exec";

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

// Feature Flags
const USE_FIREBASE_STORAGE = false; // Set to false to remain on Spark Free plan without upgrading billing
const USE_FIRESTORE = false;        // Set to false to completely deactivate Firestore Database (uses Google Sheets only)

// Firestore & Storage instances (global)
let db;
const storage = firebase.storage();

if (USE_FIRESTORE) {
    db = firebase.firestore();
    
    // Enable Firestore offline persistence (works even without internet)
    db.enablePersistence({ synchronizeTabs: true }).catch(err => {
        if (err.code === 'failed-precondition') {
            console.warn("Firestore persistence: Multiple tabs open.");
        } else if (err.code === 'unimplemented') {
            console.warn("Firestore persistence: Browser not supported.");
        }
    });
} else {
    // Mock db to bypass all Firestore operations and prevent any crashes/logs
    db = {
        collection: function() {
            return {
                doc: function() {
                    return {
                        set: async function() { return {}; },
                        get: async function() { return { exists: false, data: function() { return null; } }; },
                        delete: async function() { return {}; },
                        onSnapshot: function(cb) { return function unsubscribe() {}; }
                    };
                },
                add: async function() { return {}; },
                get: async function() { return { empty: true, docs: [] }; },
                onSnapshot: function(cb) { return function unsubscribe() {}; },
                orderBy: function() {
                    return {
                        limit: function() {
                            return {
                                onSnapshot: function(cb) { return function unsubscribe() {}; }
                            };
                        },
                        onSnapshot: function(cb) { return function unsubscribe() {}; }
                    };
                }
            };
        }
    };
    console.log("ℹ️ Firestore is deactivated (using Google Sheets mode only)");
}

if (storage) {
    try {
        storage.setMaxUploadRetryTime(60000); // 60s max upload retry
        storage.setMaxOperationRetryTime(30000); // 30s max operation retry
    } catch (e) {
        console.warn("Could not set storage retry times:", e);
    }
}

console.log("✅ Firebase initialized — Project: myinternms");
