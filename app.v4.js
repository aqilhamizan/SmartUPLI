window.addEventListener('error', function(event) {
    const errorMsg = event.message || '';
    const url = event.filename || '';
    const lineNo = event.lineno || '';
    const colNo = event.colno || '';
    const stack = (event.error && event.error.stack) ? event.error.stack : '';
    
    const details = `Ralat Uncaught: ${errorMsg}\nFail: ${url}\nBaris: ${lineNo}:${colNo}\nStack: ${stack}`;
    console.error(details);
    
    alert("KOD CRASH:\n\n" + details);
    
    if (typeof db !== 'undefined' && db.collection) {
        db.collection("client_errors").add({
            message: errorMsg,
            file: url,
            line: lineNo,
            column: colNo,
            stack: stack,
            userAgent: navigator.userAgent,
            timestamp: new Date()
        }).catch(err => console.warn("Fail writing error to firestore:", err));
    }
});

window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason || '';
    const details = `Unhandled Rejection: ${reason.stack || reason}`;
    console.error(details);
    alert("PROMISE REJECTION CRASH:\n\n" + details);
    
    if (typeof db !== 'undefined' && db.collection) {
        db.collection("client_errors").add({
            message: "Unhandled Rejection: " + reason.toString(),
            stack: reason.stack || reason.toString(),
            userAgent: navigator.userAgent,
            timestamp: new Date()
        }).catch(err => console.warn("Fail writing rejection to firestore:", err));
    }
});

/* ==========================================================================
   MY INTERNMS HUB - APPLICATION SCRIPT (VANILLA JS)
   Logic: Role-Based Routing, Database Seeding, LocalStorage Sync, UI Updates
   ========================================================================== */


// --------------------------------------------------------------------------
// A. DATA SCHEMAS & DEFAULT DATABASE SEEDING
// --------------------------------------------------------------------------
const DOC_SCHEMAS = {
    "Kejuruteraan": {
        sebelum: [
            { id: "borang_pendaftaran_li", title: "Borang Pendaftaran Kursus LI (BP)", desc: "Borang pendaftaran LI fizikal (Pelajar tidak perlu muat naik. Hantar terus ke pejabat UPLI).", isPhysical: true },
            { id: "borang_jawapan", title: "Borang Jawapan", desc: "Borang jawapan rasmi dari organisasi/syarikat yang bersetuju menerima pelajar." },
            { id: "skop_kerja", title: "Senarai Skop Kerja", desc: "Skop kerja yang dipersetujui semasa latihan industri." }
        ],
        semasa: [
            { id: "lapor_diri", title: "Kad Pengesahan Lapor Diri", desc: "Kad pengesahan lapor diri di tempat latihan industri." },
            { id: "appendix_e2", title: "Appendix E2", desc: "Borang markah Proses Pemantauan semasa latihan industri (Kejuruteraan)." }
        ],
        selepas: [
            { id: "appendix_e1", title: "Appendix E1", desc: "Borang markah Penilaian Industri semasa latihan industri (Kejuruteraan)." },
            { id: "appendix_e3", title: "Appendix E3", desc: "Borang markah Penilaian dan Pembentangan Akhir LI (Kejuruteraan)." },
            { id: "weekly_reflections", title: "Weekly Reflections (20 muka surat)", desc: "Refleksi mingguan sepanjang latihan industri (jumlah 20 muka surat)." },
            { id: "slaid_pembentangan", title: "Slaid Pembentangan", desc: "Slaid untuk sesi pembentangan akhir." },
            { id: "laporan_akhir", title: "Laporan Akhir LI", desc: "Laporan Akhir Latihan Industri (LALI)." },
            { id: "screenshot_pes", title: "Screenshot Maklum Balas PES", desc: "Sila jawab soal selidik PES menggunakan pautan di bawah dan muat naik tangkapan skrin (screenshot) pengesahan selesai menjawab." },
            { id: "screenshot_maklum_balas", title: "Screenshot Maklum Balas Pelajar LI", desc: "Sila jawab soal selidik Maklum Balas Pelajar LI menggunakan pautan di bawah dan muat naik tangkapan skrin (screenshot) pengesahan selesai menjawab." },
            { id: "tamat_li", title: "Kad Pengesahan Tamat LI", desc: "Kad pengesahan yang membuktikan pelajar telah menamatkan latihan industri secara rasmi." }
        ]
    },
    "Bukan Kejuruteraan": {
        sebelum: [
            { id: "borang_pendaftaran_li", title: "Borang Pendaftaran Kursus LI (BP)", desc: "Borang pendaftaran LI fizikal (Pelajar tidak perlu muat naik. Hantar terus ke pejabat UPLI).", isPhysical: true },
            { id: "borang_jawapan", title: "Borang Jawapan", desc: "Borang jawapan rasmi dari organisasi/syarikat yang bersetuju menerima pelajar." },
            { id: "skop_kerja", title: "Senarai Skop Kerja", desc: "Skop kerja yang dipersetujui semasa latihan industri." }
        ],
        semasa: [
            { id: "lapor_diri", title: "Kad Pengesahan Lapor Diri", desc: "Kad pengesahan lapor diri di tempat latihan industri." },
            { id: "appendix_2", title: "Appendix 2", desc: "Borang markah Proses Pemantauan semasa latihan industri (Bukan Kejuruteraan)." }
        ],
        selepas: [
            { id: "appendix_1", title: "Appendix 1", desc: "Borang markah Penilaian Industri semasa latihan industri (Bukan Kejuruteraan)." },
            { id: "weekly_reflections", title: "Weekly Reflections (20 muka surat)", desc: "Refleksi mingguan sepanjang latihan (jumlah 20 muka surat)." },
            { id: "slaid_pembentangan", title: "Slaid Pembentangan", desc: "Slaid untuk sesi pembentangan akhir." },
            { id: "laporan_akhir", title: "Laporan Akhir LI", desc: "Laporan Akhir Latihan Industri (LALI)." },
            { id: "screenshot_pes", title: "Screenshot Maklum Balas PES", desc: "Sila jawab soal selidik PES menggunakan pautan di bawah dan muat naik tangkapan skrin (screenshot) pengesahan selesai menjawab." },
            { id: "screenshot_maklum_balas", title: "Screenshot Maklum Balas Pelajar LI", desc: "Sila jawab soal selidik Maklum Balas Pelajar LI menggunakan pautan di bawah dan muat naik tangkapan skrin (screenshot) pengesahan selesai menjawab." },
            { id: "tamat_li", title: "Kad Pengesahan Tamat LI", desc: "Kad pengesahan yang membuktikan pelajar telah menamatkan latihan industri secara rasmi." }
        ]
    }
};

function getStudentCategory(student) {
    if (!student) return "Bukan Kejuruteraan";
    const dept = (student.jabatan || "").toUpperCase();
    const classVal = (student.class || "").toUpperCase();
    const regNo = (student.regNo || "").toUpperCase();

    if (dept === "JKE" || dept === "JKM") {
        return "Kejuruteraan";
    }
    if (dept === "JP" || dept === "JPH") {
        return "Bukan Kejuruteraan";
    }
    if (dept === "JKA") {
        if (classVal.includes("DKA") || regNo.includes("DKA")) {
            return "Kejuruteraan";
        }
        if (classVal.includes("DUB") || classVal.includes("DBK") || regNo.includes("DUB") || regNo.includes("DBK")) {
            return "Bukan Kejuruteraan";
        }
    }
    if (classVal.includes("DKA") || regNo.includes("DKA")) {
        return "Kejuruteraan";
    }
    return "Bukan Kejuruteraan";
}

function getStudentDocsList(student) {
    const cat = getStudentCategory(student);
    const schema = DOC_SCHEMAS[cat];
    const list = [];
    schema.sebelum.forEach(d => list.push({ ...d, phase: "Sebelum LI" }));
    schema.semasa.forEach(d => list.push({ ...d, phase: "Semasa LI" }));
    schema.selepas.forEach(d => list.push({ ...d, phase: "Selepas LI" }));
    return list;
}

function getDocMetadata(docId, student) {
    const cat = getStudentCategory(student);
    const schema = DOC_SCHEMAS[cat];
    const all = [...schema.sebelum, ...schema.semasa, ...schema.selepas];
    return all.find(d => d.id === docId) || { id: docId, title: docId, desc: "" };
}

function getDocAcronym(docId, title) {
    if (docId === "borang_pendaftaran_li") return "BP";
    if (docId === "borang_jawapan") return "BJ";
    if (docId === "skop_kerja") return "SS";
    if (docId === "lapor_diri") return "KP";
    if (docId === "appendix_e2") return "E2";
    if (docId === "appendix_2") return "A2";
    if (docId === "appendix_e1") return "E1";
    if (docId === "appendix_1") return "A1";
    if (docId === "appendix_e3") return "E3";
    if (docId === "weekly_reflections") return "WR";
    if (docId === "slaid_pembentangan") return "SP";
    if (docId === "laporan_akhir") return "LA";
    if (docId === "screenshot_pes") return "PE";
    if (docId === "screenshot_maklum_balas") return "MB";
    if (docId === "tamat_li") return "PT";
    return (title || "").split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
}

function linkify(text) {
    if (!text) return "";
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlRegex, function(url) {
        return `<a href="${url}" target="_blank" style="color:var(--color-primary); font-weight:600; text-decoration:underline; word-break:break-all;">${url}</a>`;
    });
}

function resolveGoogleDriveUrl(doc) {
    if (doc && doc.fileId && doc.fileId !== "N/A" && (!doc.fileUrl || doc.fileUrl === "N/A" || doc.fileUrl.startsWith("N/A"))) {
        const isImage = doc.fileName && /\.(png|jpg|jpeg)$/i.test(doc.fileName);
        if (isImage) {
            doc.fileUrl = `https://drive.google.com/uc?export=download&id=${doc.fileId}`;
        } else {
            doc.fileUrl = `https://docs.google.com/viewer?embedded=true&url=https://drive.google.com/uc?export=download%26id=${doc.fileId}`;
        }
    }
}

function studentHasPenilai(student) {
    if (!student) return false;
    const cat = getStudentCategory(student);
    if (cat === "Kejuruteraan") return true;

    const classVal = (student.class || "").toUpperCase();
    const regNo = (student.regNo || "").toUpperCase();
    if (classVal.includes("DUB") || classVal.includes("DBK") || regNo.includes("DUB") || regNo.includes("DBK")) {
        return true;
    }
    return false;
}

const DEFAULT_ANNOUNCEMENTS = [
    {
        id: "ann_default_1",
        title: "Taklimat Khas Persediaan Latihan Industri",
        content: "Taklimat khas akan diadakan secara atas talian menerusi MS Teams pada jam 9:00 Pagi. Kehadiran adalah WAJIB bagi semua pelajar sesi 1:2026/2027.",
        date: "2026-07-10",
        category: "Akademik",
        updatedBy: "Dr. Hamzah bin Salleh",
        updatedAt: "2026-07-03 08:10"
    },
    {
        id: "ann_default_2",
        title: "Tarikh Akhir Serahan Borang Jawapan Organisasi",
        content: "Sila muat naik Borang Jawapan Organisasi yang telah lengkap ditandatangani oleh majikan ke dalam sistem My InternMS sebelum jam 5:00 Petang.",
        date: "2026-07-15",
        category: "Penting",
        updatedBy: "Dr. Hamzah bin Salleh",
        updatedAt: "2026-07-03 08:12"
    },
    {
        id: "ann_default_3",
        title: "Pendaftaran Sistem My InternMS Pelajar Baharu",
        content: "Sila pastikan maklumat profil peribadi dan nombor telefon yang dikemaskini adalah aktif untuk tujuan agihan pensyarah pemantau.",
        date: "2026-07-22",
        category: "Pendaftaran",
        updatedBy: "Dr. Hamzah bin Salleh",
        updatedAt: "2026-07-03 08:15"
    }
];

const DEFAULT_ADMINS = [
    {
        name: "Dr. Hamzah bin Salleh",
        email: "admin@polikk.edu.my",
        staffId: "STAFF123",
        role: "admin",
        status: "Aktif"
    }
];

const DEFAULT_LECTURERS = [
    {
        name: "Pn. Faridah binti Masri",
        email: "faridah@polikk.edu.my",
        dept: "JKA",
        role: "lecturer"
    },
    {
        name: "En. Mohd Rizwan bin Junaidi",
        email: "rizwan@polikk.edu.my",
        dept: "JKA",
        role: "lecturer"
    },
    {
        name: "Dr. Alice Wong Siew Ling",
        email: "alice@polikk.edu.my",
        dept: "JP",
        role: "lecturer"
    }
];

const DEFAULT_SESSIONS = [
    "Sesi 1:2026/2027"
];

const DEFAULT_STUDENTS = [];


const DEFAULT_LOGS = [
    { type: "info", text: "Sistem My InternMS berjaya dimulakan.", time: "2026-07-03 08:00" },
    { type: "success", text: "Pentadbir sistem utama Hamzah bin Salleh sedia.", time: "2026-07-03 08:05" }
];

// --------------------------------------------------------------------------
// A-2. FIREBASE FIRESTORE DATA LAYER (In-Memory Cache + Cloud Sync)
// Strategy: Load all data from Firestore into dbCache on startup.
//           get*() reads from dbCache (sync). save*() updates cache + Firestore (async).
// --------------------------------------------------------------------------

const dbCache = {
    admins: [], lecturers: [], students: [],
    logs: [], sessions: [], activeSession: "",
    rubriks: [], announcements: []
};

async function writeAnnouncementsToFirestore(data) {
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        await callGoogleScript("writeAnnouncements", { data });
        return;
    }
    try {
        await db.collection("settings").doc("announcements").set({
            list: data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.warn("FS writeAnnouncements:", e.message);
    }
}

// Loading overlay disabled — app loads silently
function showDBLoading(show) { /* disabled */ }

// Sanitize Firestore document ID
function sanitizeDocId(str) {
    return String(str).replace(/[/.#$\[\]]/g, "_");
}

// ---------- Firestore Write Helpers (fire-and-forget) ----------

async function writeAdminsToFirestore(data) {
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        await callGoogleScript("writeAdmins", { data });
        return;
    }
    try { await db.collection("settings").doc("admins").set({ list: data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
    catch (e) { console.warn("FS writeAdmins:", e.message); }
}

async function writeLecturersToFirestore(data) {
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        await callGoogleScript("writeLecturers", { data });
        return;
    }
    try { await db.collection("settings").doc("lecturers").set({ list: data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
    catch (e) { console.warn("FS writeLecturers:", e.message); }
}

async function writeStudentToFirestore(student) {
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        const students = getStudents();
        const existingIdx = students.findIndex(s => s.regNo === student.regNo);
        if (existingIdx !== -1) {
            students[existingIdx] = student;
        } else {
            students.push(student);
        }
        
        // Map local model keys to Google Sheets database column keys
        const mappedStudents = students.map(s => {
            const copy = { ...s };
            copy.dept = s.jabatan || "";
            copy.company = s.tempatLI || "";
            copy.paEmail = s.penasihatAkademik || "";
            copy.paName = s.penasihatAkademikName || "";
            copy.session = s.sesi || "";
            copy.sesi = s.sesi || "";
            return copy;
        });
        await callGoogleScript("writeStudents", { data: mappedStudents });
    }
    try {
        const s = JSON.parse(JSON.stringify(student));
        // Strip large base64 fileData — files now stored in Firebase Storage (fileUrl)
        if (s.documents) {
            Object.keys(s.documents).forEach(k => {
                if (s.documents[k] && s.documents[k].fileData) delete s.documents[k].fileData;
            });
        }
        // Strip large base64 profile pics
        if (s.profilePic && s.profilePic.startsWith("data:") && s.profilePic.length > 2000) delete s.profilePic;
        await db.collection("students").doc(sanitizeDocId(student.regNo)).set(s);
    } catch (e) { console.warn("FS writeStudent:", e.message); }
}

async function writeStudentsToFirestore(data) {
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        const mappedData = data.map(s => {
            const copy = { ...s };
            copy.dept = s.jabatan || "";
            copy.company = s.tempatLI || "";
            copy.paEmail = s.penasihatAkademik || "";
            copy.paName = s.penasihatAkademikName || "";
            copy.session = s.sesi || "";
            copy.sesi = s.sesi || "";
            return copy;
        });
        await callGoogleScript("writeStudents", { data: mappedData });
        return;
    }
    if (!data || data.length === 0) return;
    
    // Split into chunks of 400 to be safe (Firestore batch limit is 500)
    const chunkSize = 400;
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const batch = db.batch();
        chunk.forEach(student => {
            const s = JSON.parse(JSON.stringify(student));
            if (s.profilePic && s.profilePic.startsWith("data:") && s.profilePic.length > 2000) delete s.profilePic;
            const docRef = db.collection("students").doc(sanitizeDocId(student.regNo));
            batch.set(docRef, s);
        });
        try {
            await batch.commit();
            console.log(`Successfully committed batch of ${chunk.length} students.`);
        } catch (e) {
            console.error("Error committing batch:", e);
            throw e;
        }
    }
}

async function deleteStudentFromFirestore(regNo) {
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        // Google Sheets write is handled cleanly in batch by saveStudents()
        return;
    }
    try { await db.collection("students").doc(sanitizeDocId(regNo)).delete(); }
    catch (e) { console.warn("FS deleteStudent:", e.message); }
}

async function writeSettingsToFirestore(updates) {
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        await callGoogleScript("writeSettings", { data: updates });
        return;
    }
    try { await db.collection("settings").doc("global").set(updates, { merge: true }); }
    catch (e) { console.warn("FS writeSettings:", e.message); }
}

async function writeLogToFirestore(entry) {
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        await callGoogleScript("writeLog", { data: entry });
        return;
    }
    try { await db.collection("logs").add({ ...entry, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); }
    catch (e) { console.warn("FS writeLog:", e.message); }
}

async function writeRubriksToFirestore(data) {
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        await callGoogleScript("writeRubriks", { data });
        return;
    }
    try {
        const clean = data.map(r => {
            const c = JSON.parse(JSON.stringify(r));
            if (c.fileData && c.fileData.length > 1000) delete c.fileData;
            return c;
        });
        await db.collection("settings").doc("rubriks").set({ list: clean, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    } catch (e) { console.warn("FS writeRubriks:", e.message); }
}

// ---------- Normalize students cache (ensure required doc fields) ----------
function normalizeStudentsCache() {
    const OLD_DOC_IDS = ["resume", "reply_letter", "weekly_reports", "final_report", "completion_cert"];

    if (!dbCache.students) dbCache.students = [];
    if (!dbCache.lecturers) dbCache.lecturers = [];

    // Remove JTMK dept students in memory
    dbCache.students = dbCache.students.filter(s => s && s.jabatan !== "JTMK" && s.dept !== "JTMK");

    // Remove JTMK lecturers in memory
    dbCache.lecturers = dbCache.lecturers.filter(l => l && l.dept !== "JTMK");

    const fallbackSession = dbCache.activeSession || "Sesi 1:2026/2027";

    dbCache.students.forEach(s => {
        if (!s) return;

        // Map Google Sheet keys to local model keys if needed
        if (s.dept !== undefined && s.jabatan === undefined) {
            s.jabatan = s.dept;
        }
        if (s.company !== undefined && s.tempatLI === undefined) {
            s.tempatLI = s.company;
        }
        if (s.paEmail !== undefined && s.penasihatAkademik === undefined) {
            s.penasihatAkademik = s.paEmail;
        }
        if (s.paName !== undefined && s.penasihatAkademikName === undefined) {
            s.penasihatAkademikName = s.paName;
        }
        if (s.session !== undefined && (s.sesi === undefined || String(s.sesi).trim() === "")) {
            s.sesi = s.session;
        }

        // Normalize session (sesi)
        if (s.sesi) {
            let str = String(s.sesi).trim();
            str = str.replace(/\s*-\s*Fasa\s*\d+/gi, "").trim();
            str = str.replace(/^SESI/i, "Sesi");
            s.sesi = str;
        }

        if (!s.sesi || String(s.sesi).trim() === "") {
            s.sesi = fallbackSession;
        }

        // Normalize department (jabatan)
        if (s.jabatan) {
            const j = String(s.jabatan).toUpperCase().trim();
            if (j.includes("AWAM") || j === "CIVIL" || j.includes("JKA")) {
                s.jabatan = "JKA";
            } else if (j.includes("MEKANIKAL") || j === "MECHANICAL" || j.includes("JKM")) {
                s.jabatan = "JKM";
            } else if (j.includes("ELEKTRIK") || j === "ELECTRICAL" || j.includes("JKE")) {
                s.jabatan = "JKE";
            } else if (j.includes("PERDAGANGAN") || j.includes("COMMERCE") || j === "JP") {
                s.jabatan = "JP";
            } else if (j.includes("PELANCONGAN") || j.includes("HOSPITALITI") || j === "JPH") {
                s.jabatan = "JPH";
            }
        }
        
        // Auto-detect department from Registration Number / Course Code
        if (s.regNo) {
            const reg = String(s.regNo).toUpperCase();
            if (reg.includes("DKA") || reg.includes("DBK") || reg.includes("DUB")) {
                s.jabatan = "JKA";
            } else if (reg.includes("DEE") || reg.includes("DTK") || reg.includes("DEP")) {
                s.jabatan = "JKE";
            } else if (reg.includes("DKM") || reg.includes("DEM") || reg.includes("DTP")) {
                s.jabatan = "JKM";
            } else if (reg.includes("DPR") || reg.includes("DLS") || reg.includes("DAT")) {
                s.jabatan = "JP";
            } else if (reg.includes("DHR") || reg.includes("KOK") || reg.includes("DHM")) {
                s.jabatan = "JPH";
            }
        }

        if (!s.jabatan || String(s.jabatan).trim() === "") {
            s.jabatan = "JKA";
        }

        if (!s.documents) { s.documents = {}; }
        OLD_DOC_IDS.forEach(k => { if (s.documents[k] !== undefined) { delete s.documents[k]; } });
        const requiredDocs = getStudentDocsList(s);
        requiredDocs.forEach(d => {
            if (!s.documents[d.id]) {
                s.documents[d.id] = { status: "Belum Dihantar", fileName: "", fileSize: "", uploadDate: "", feedback: "", fileUrl: "" };
            }
        });
    });
}

// ---------- Auto-migrate legacy sessions (add Fasa 1 & Fasa 2) ----------
function autoMigrateSessions() {
    // Keep exact session strings from user uploads / database without forcing legacy suffixes
}

// ==========================================================================
// STALE-WHILE-REVALIDATE CONSTANTS
// ==========================================================================

/** Cache dianggap "segar" selama 5 minit. Fetch hanya berlaku jika lebih lama. */
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minit

/** Interval polling bila tab AKTIF (pengguna sedang guna app) */
const POLL_ACTIVE_MS  = 15 * 1000;   // 15 saat

/** Interval polling bila tab DI LATAR (pengguna tukar tab/minimize) */
const POLL_IDLE_MS    = 2 * 60 * 1000; // 2 minit

/** ID interval polling semasa (supaya boleh clear bila tukar mod) */
let _swrPollingInterval = null;

// ---------- initDatabase — Async, loads from Firestore ----------
// --- GOOGLE APPS SCRIPT HTTP HELPER ---
async function callGoogleScript(action, dataObj = {}) {
    if (!GOOGLE_SCRIPT_URL) return null;
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            mode: "cors",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({ action, ...dataObj })
        });
        const resJson = await response.json();
        if (resJson && resJson.success) {
            return resJson;
        } else {
            console.error("Google Script API Error:", resJson.error);
            return null;
        }
    } catch (e) {
        console.error("callGoogleScript failed:", e);
        return null;
    }
}

/**
 * Simpan semua data dari Google Sheets ke localStorage + dbCache.
 * Dipanggil oleh initDatabase dan swrRevalidate.
 */
function applyRemoteData(data) {
    if (!data) return false;

    if (data.students)      { dbCache.students      = data.students;      normalizeStudentsCache(); }
    if (data.lecturers)     { dbCache.lecturers     = data.lecturers; }
    if (data.admins)        { dbCache.admins        = data.admins; }
    if (data.rubriks)       { dbCache.rubriks       = data.rubriks; }
    if (data.announcements) { dbCache.announcements = data.announcements; }
    if (data.logs)          { dbCache.logs          = data.logs; }
    if (data.settings) {
        dbCache.settings = data.settings;
        dbCache.sessions = data.settings.sessions || DEFAULT_SESSIONS;
        // Preserve user's local active session choice in browser
        const localActive = localStorage.getItem("upli_active_session");
        if (localActive && localActive.trim()) {
            dbCache.activeSession = localActive.trim();
        } else if (data.settings.activeSession) {
            dbCache.activeSession = data.settings.activeSession;
        } else {
            dbCache.activeSession = "Sesi 1:2026/2027";
        }
        localStorage.setItem("upli_settings", JSON.stringify(dbCache.settings));
        applySystemBranding();
    }

    // Tulis ke localStorage sekaligus
    try {
        localStorage.setItem("upli_students",      JSON.stringify(dbCache.students));
        localStorage.setItem("upli_lecturers",     JSON.stringify(dbCache.lecturers));
        localStorage.setItem("upli_admins",        JSON.stringify(dbCache.admins));
        localStorage.setItem("upli_rubriks",       JSON.stringify(dbCache.rubriks));
        localStorage.setItem("upli_announcements", JSON.stringify(dbCache.announcements));
        localStorage.setItem("upli_sessions",      JSON.stringify(dbCache.sessions));
        localStorage.setItem("upli_active_session", dbCache.activeSession);
        localStorage.setItem("upli_logs",          JSON.stringify(dbCache.logs));
        // Tandakan masa cache terkini berhasil disimpan
        localStorage.setItem("upli_cache_ts",      String(Date.now()));
    } catch(e) { console.warn("localStorage write error:", e); }

    return true;
}

/**
 * Revalidasi secara senyap di latar belakang (Stale-While-Revalidate).
 * Papar data cache dulu, fetch terkini di bg, kemas kini UI secara halus.
 */
async function swrRevalidate() {
    if (!GOOGLE_SCRIPT_URL || !GOOGLE_SCRIPT_URL.trim()) return;

    const data = await callGoogleScript("syncData");
    if (!applyRemoteData(data)) return; // fetch gagal atau tiada data

    // Kemas kini UI dropdown senyap-senyap
    populateGlobalSessionSelect();
    if (typeof renderPortalAnnouncements === "function") renderPortalAnnouncements();

    // Kemas kini dashboard aktif jika pengguna sedang log masuk
    if (window.currentUser && window.currentRole && activeTab) {
        // Guna renderTabData sahaja (tiada skeleton, supaya tidak ganggu pengguna)
        try { renderTabData(activeTab); } catch(e) {}
    }

    console.log(`[SWR] ✅ Data dikemas kini senyap pada ${new Date().toLocaleTimeString('ms-MY')}`);
}

/**
 * Mulakan polling adaptif menggunakan Tab Visibility API.
 * - Tab aktif   → poll setiap POLL_ACTIVE_MS (15 saat)
 * - Tab di latar → poll setiap POLL_IDLE_MS (2 minit)
 */
function startAdaptivePolling() {
    if (!GOOGLE_SCRIPT_URL || !GOOGLE_SCRIPT_URL.trim()) return;

    function restartPolling(intervalMs) {
        if (_swrPollingInterval) clearInterval(_swrPollingInterval);
        _swrPollingInterval = setInterval(swrRevalidate, intervalMs);
        console.log(`[SWR] Polling dimulakan: setiap ${intervalMs / 1000}s`);
    }

    // Mulakan dengan mod aktif
    restartPolling(POLL_ACTIVE_MS);

    // Tukar kelajuan polling berdasarkan Tab Visibility
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            // Tab aktif semula — sync serta-merta, kemudian poll kerap
            swrRevalidate();
            restartPolling(POLL_ACTIVE_MS);
        } else {
            // Tab di latar — perlahan polling untuk jimat kuota
            restartPolling(POLL_IDLE_MS);
        }
    });
}

// --------------------------------------------------------------------------
// STALE-WHILE-REVALIDATE — initDatabase
// Langkah:
//   1. Papar data localStorage serta-merta (0ms, tiada delay)
//   2. Semak umur cache: jika segar (<5min) → skip fetch
//   3. Jika lapuk → fetch Google Sheets di latar belakang, kemas kini UI senyap
//   4. Mulakan adaptive polling (15s aktif / 2min latar)
// --------------------------------------------------------------------------
async function initDatabase() {
    // ── LANGKAH 1: Load localStorage serta-merta (sinkronus, 0ms) ──────────
    try {
        dbCache.admins        = JSON.parse(localStorage.getItem("upli_admins")        || JSON.stringify(DEFAULT_ADMINS));
        dbCache.lecturers     = JSON.parse(localStorage.getItem("upli_lecturers")     || JSON.stringify(DEFAULT_LECTURERS));
        dbCache.students      = JSON.parse(localStorage.getItem("upli_students")      || "[]");
        dbCache.sessions      = JSON.parse(localStorage.getItem("upli_sessions")      || JSON.stringify(DEFAULT_SESSIONS));
        dbCache.activeSession = localStorage.getItem("upli_active_session")           || "Sesi 1:2026/2027";
        dbCache.logs          = JSON.parse(localStorage.getItem("upli_logs")          || JSON.stringify(DEFAULT_LOGS));
        dbCache.rubriks       = JSON.parse(localStorage.getItem("upli_rubriks")       || "[]");
        dbCache.announcements = JSON.parse(localStorage.getItem("upli_announcements") || JSON.stringify(DEFAULT_ANNOUNCEMENTS));
        dbCache.settings      = JSON.parse(localStorage.getItem("upli_settings")      || "{}");
    } catch(e) { console.warn("Cache load error:", e); }
    applySystemBranding();

    // ── Google Sheets Mode ──────────────────────────────────────────────────
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {

        // ── LANGKAH 2: Semak umur cache ──────────────────────────────────────
        const lastSync   = parseInt(localStorage.getItem("upli_cache_ts") || "0");
        const cacheAge   = Date.now() - lastSync;
        const isFresh    = cacheAge < CACHE_TTL_MS && lastSync > 0;
        const hasStudents = dbCache.students && dbCache.students.length > 0;

        if (isFresh && hasStudents) {
            // ✅ Cache segar — guna terus, skip fetch untuk buka lebih laju
            console.log(`[SWR] ✅ Cache segar (${Math.round(cacheAge / 1000)}s lalu). Guna localStorage.`);
            autoMigrateSessions();
            startAdaptivePolling();
            return;
        }

        // ── LANGKAH 3: Cache lapuk atau kosong — fetch Google Sheets di latar ──
        console.log(`[SWR] ⏳ Cache lapuk atau kosong (${Math.round(cacheAge / 1000)}s). Fetch Google Sheets...`);
        try {
            const data = await callGoogleScript("init");
            if (applyRemoteData(data)) {
                // Kemas kini UI dropdown dan pengumuman
                populateGlobalSessionSelect();
                if (typeof renderPortalAnnouncements === "function") renderPortalAnnouncements();
                // Kemas kini dashboard jika pengguna sudah log masuk
                if (window.currentUser && activeTab) {
                    try { renderTabData(activeTab); } catch(e) {}
                }
                console.log(`[SWR] ✅ Fetch init berjaya. ${dbCache.students.length} pelajar dimuatkan.`);
            }
        } catch (e) {
            console.warn("[SWR] Google Script init gagal, guna cache:", e.message);
        }

        autoMigrateSessions();

        // ── LANGKAH 4: Mulakan adaptive polling ──────────────────────────────
        startAdaptivePolling();
        return;
    }

    // Then fetch from Firestore in parallel (background, non-blocking)
    try {
        const [settingsDoc, adminsDoc, lecturersDoc, rubriksDoc, announcementsDoc] = await Promise.all([
            db.collection("settings").doc("global").get(),
            db.collection("settings").doc("admins").get(),
            db.collection("settings").doc("lecturers").get(),
            db.collection("settings").doc("rubriks").get(),
            db.collection("settings").doc("announcements").get()
        ]);

        // Settings
        if (settingsDoc.exists) {
            const d = settingsDoc.data();
            dbCache.sessions = d.sessions || DEFAULT_SESSIONS;
            dbCache.activeSession = d.activeSession || "Sesi 1:2026/2027";
            dbCache.settings = d || {};
        } else {
            dbCache.sessions = DEFAULT_SESSIONS;
            dbCache.activeSession = "Sesi 1:2026/2027";
            dbCache.settings = { sessions: DEFAULT_SESSIONS, activeSession: "Sesi 1:2026/2027" };
            writeSettingsToFirestore({ sessions: DEFAULT_SESSIONS, activeSession: "Sesi 1:2026/2027" });
        }
        localStorage.setItem("upli_sessions", JSON.stringify(dbCache.sessions));
        localStorage.setItem("upli_active_session", dbCache.activeSession);
        localStorage.setItem("upli_settings", JSON.stringify(dbCache.settings));
        applySystemBranding();

        // Admins
        if (adminsDoc.exists && adminsDoc.data().list && adminsDoc.data().list.length > 0) {
            dbCache.admins = adminsDoc.data().list;
        } else {
            dbCache.admins = DEFAULT_ADMINS;
            writeAdminsToFirestore(DEFAULT_ADMINS);
        }
        localStorage.setItem("upli_admins", JSON.stringify(dbCache.admins));

        // Lecturers
        if (lecturersDoc.exists && lecturersDoc.data().list && lecturersDoc.data().list.length > 0) {
            dbCache.lecturers = lecturersDoc.data().list;
        } else {
            dbCache.lecturers = DEFAULT_LECTURERS;
            writeLecturersToFirestore(DEFAULT_LECTURERS);
        }
        localStorage.setItem("upli_lecturers", JSON.stringify(dbCache.lecturers));

        // Rubriks
        dbCache.rubriks = (rubriksDoc.exists && rubriksDoc.data().list) ? rubriksDoc.data().list : [];
        localStorage.setItem("upli_rubriks", JSON.stringify(dbCache.rubriks));

        // Announcements
        if (announcementsDoc.exists && announcementsDoc.data().list && announcementsDoc.data().list.length > 0) {
            dbCache.announcements = announcementsDoc.data().list;
        } else {
            dbCache.announcements = DEFAULT_ANNOUNCEMENTS;
            writeAnnouncementsToFirestore(DEFAULT_ANNOUNCEMENTS);
        }
        localStorage.setItem("upli_announcements", JSON.stringify(dbCache.announcements));

        // Logs (separate — has orderBy query)
        db.collection("logs").orderBy("createdAt", "desc").limit(50).get().then(logsSnap => {
            if (!logsSnap.empty) {
                dbCache.logs = logsSnap.docs.map(d => ({ type: d.data().type || "info", text: d.data().text || "", time: d.data().time || "" }));
                localStorage.setItem("upli_logs", JSON.stringify(dbCache.logs));
            }
        }).catch(() => {});

    } catch (err) {
        console.warn("Firebase initDatabase error (using cache):", err.message);
    }

    autoMigrateSessions();
    attachRealtimeListeners();
    attachGlobalStudentsRealtimeListener(); // Load students in background for public portal stats
    populateGlobalSessionSelect();

    // Re-render portal announcements after Firestore data is ready
    if (typeof renderPortalAnnouncements === "function") {
        renderPortalAnnouncements();
    }
}

let realtimeListenersAttached = false;
function attachRealtimeListeners() {
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") return;
    if (realtimeListenersAttached) return;

    // Helper to process document/collection snapshots
    function processSnapshot(snapshot, cacheKey, isCollection, processor) {
        if (snapshot.metadata.hasPendingWrites) return; // Ignore local writes to prevent UI jumping
        if (isCollection) {
            dbCache[cacheKey] = snapshot.empty ? [] : snapshot.docs.map(processor);
        } else {
            if (snapshot.exists) dbCache[cacheKey] = processor(snapshot);
        }
        try { localStorage.setItem(`upli_${cacheKey}`, JSON.stringify(dbCache[cacheKey])); } catch(e){}
        if (activeTab) renderTabData(activeTab);
    }

    let logsFirst = true;
    db.collection("logs").orderBy("createdAt", "desc").limit(50).onSnapshot(snapshot => {
        if (logsFirst) { logsFirst = false; return; }
        processSnapshot(snapshot, "logs", true, d => ({ type: d.data().type || "info", text: d.data().text || "", time: d.data().time || "" }));
    }, err => console.warn("Sync error logs:", err));

    let globalFirst = true;
    db.collection("settings").doc("global").onSnapshot(doc => {
        if (globalFirst) { globalFirst = false; return; }
        if (doc.metadata.hasPendingWrites || !doc.exists) return;
        const d = doc.data();
        dbCache.sessions = d.sessions || DEFAULT_SESSIONS;
        dbCache.activeSession = d.activeSession || "Sesi 1:2026/2027";
        autoMigrateSessions();
        try { localStorage.setItem("upli_sessions", JSON.stringify(dbCache.sessions)); } catch(e){}
        try { localStorage.setItem("upli_active_session", dbCache.activeSession); } catch(e){}
        if (activeTab) renderTabData(activeTab);
    }, err => console.warn("Sync error global:", err));

    ['admins', 'lecturers', 'rubriks', 'announcements'].forEach(key => {
        let first = true;
        db.collection("settings").doc(key).onSnapshot(doc => {
            if (first) { first = false; return; }
            processSnapshot(doc, key, false, d => d.data().list || []);
        }, err => console.warn(`Sync error ${key}:`, err));
    });
}

// ---------- Dynamic Role-Based Realtime Listeners ----------
let activeStudentListener = null;
function attachStudentRealtimeListener(regNo) {
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") return;
    if (activeStudentListener) return;
    activeStudentListener = db.collection("students").doc(sanitizeDocId(regNo))
        .onSnapshot(doc => {
            if (doc.metadata.hasPendingWrites) return;
            if (doc.exists) {
                dbCache.students = [doc.data()];
                normalizeStudentsCache();
                try { localStorage.setItem("upli_students", JSON.stringify(dbCache.students)); } catch(e){}
                if (activeTab) renderTabData(activeTab);
            }
        }, err => console.warn("Sync error single student:", err));
}

let activeGlobalStudentsListener = null;
function attachGlobalStudentsRealtimeListener() {
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") return;
    if (activeGlobalStudentsListener) return;

    // Use cached students immediately (no loading overlay) if available
    const cached = localStorage.getItem("upli_students");
    if (cached) {
        try {
            dbCache.students = JSON.parse(cached);
            normalizeStudentsCache();
        } catch(e) {}
    }

    db.collection("students").get().then(async snap => {
        if (snap.empty) {
            console.log("Firestore students collection is empty. Seeding from SEED_STUDENTS...");
            showDBLoading(true);
            try {
                if (typeof SEED_STUDENTS !== 'undefined' && SEED_STUDENTS.length > 0) {
                    const mergedStudents = [...DEFAULT_STUDENTS, ...SEED_STUDENTS];
                    await writeStudentsToFirestore(mergedStudents);
                    dbCache.students = mergedStudents;
                } else {
                    dbCache.students = DEFAULT_STUDENTS;
                }
            } catch (seedErr) {
                console.error("Failed to seed students:", seedErr);
                dbCache.students = DEFAULT_STUDENTS;
            } finally {
                showDBLoading(false);
            }
        } else {
            dbCache.students = snap.docs.map(doc => doc.data());
        }
        normalizeStudentsCache();
        try { localStorage.setItem("upli_students", JSON.stringify(dbCache.students)); } catch(e){}
        if (activeTab) renderTabData(activeTab);
        
        // Start listener after initial fetch
        activeGlobalStudentsListener = db.collection("students").onSnapshot(snapshot => {
            if (snapshot.metadata.hasPendingWrites) return;
            dbCache.students = snapshot.empty ? [] : snapshot.docs.map(doc => doc.data());
            normalizeStudentsCache();
            try { localStorage.setItem("upli_students", JSON.stringify(dbCache.students)); } catch(e){}
            if (activeTab) renderTabData(activeTab);
        }, err => console.warn("Sync error all students:", err));
    }).catch(err => {
        console.error("Failed to load global students:", err);
    });
}

window.refreshGlobalData = async function() {
    showDBLoading(true);
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        try {
            const data = await callGoogleScript("init");
            if (data) {
                dbCache.students = data.students || [];
                normalizeStudentsCache();
                dbCache.lecturers = data.lecturers || [];
                dbCache.admins = data.admins || [];
                dbCache.rubriks = data.rubriks || [];
                dbCache.announcements = data.announcements || [];
                dbCache.logs = data.logs || [];
                if (data.settings) {
                    dbCache.settings = data.settings || {};
                    dbCache.sessions = data.settings.sessions || DEFAULT_SESSIONS;
                    dbCache.activeSession = data.settings.activeSession || "Sesi 1:2026/2027";
                    localStorage.setItem("upli_settings", JSON.stringify(dbCache.settings));
                    applySystemBranding();
                }
                
                // Save to local cache
                localStorage.setItem("upli_students", JSON.stringify(dbCache.students));
                localStorage.setItem("upli_lecturers", JSON.stringify(dbCache.lecturers));
                localStorage.setItem("upli_admins", JSON.stringify(dbCache.admins));
                localStorage.setItem("upli_rubriks", JSON.stringify(dbCache.rubriks));
                localStorage.setItem("upli_announcements", JSON.stringify(dbCache.announcements));
                localStorage.setItem("upli_sessions", JSON.stringify(dbCache.sessions));
                localStorage.setItem("upli_active_session", dbCache.activeSession);
                localStorage.setItem("upli_logs", JSON.stringify(dbCache.logs));
                
                populateGlobalSessionSelect();
                if (typeof renderPortalAnnouncements === "function") {
                    renderPortalAnnouncements();
                }
                if (activeTab) renderTabData(activeTab);
                showDBLoading(false);
                showToast("Data terkini berjaya dimuat turun dari Google Sheets!", "success");
            } else {
                showDBLoading(false);
                showToast("Gagal menyambung ke Google Sheets.", "error");
            }
        } catch (e) {
            console.error("Failed to refresh Google Sheets:", e);
            showDBLoading(false);
            showToast("Gagal memuat turun data Google Sheets.", "error");
        }
        return;
    }

    db.collection("students").get().then(async snap => {
        if (snap.empty) {
            console.log("Firestore empty on refresh. Seeding from SEED_STUDENTS...");
            try {
                if (typeof SEED_STUDENTS !== 'undefined' && SEED_STUDENTS.length > 0) {
                    const mergedStudents = [...DEFAULT_STUDENTS, ...SEED_STUDENTS];
                    await writeStudentsToFirestore(mergedStudents);
                    dbCache.students = mergedStudents;
                } else {
                    dbCache.students = DEFAULT_STUDENTS;
                }
            } catch (seedErr) {
                console.error("Failed to seed students on refresh:", seedErr);
                dbCache.students = DEFAULT_STUDENTS;
            }
        } else {
            dbCache.students = snap.docs.map(doc => doc.data());
        }
        normalizeStudentsCache();
        try { localStorage.setItem("upli_students", JSON.stringify(dbCache.students)); } catch(e){}
        if (activeTab) renderTabData(activeTab);
        showDBLoading(false);
        showToast("Data terkini berjaya dimuat turun!", "success");
    }).catch(err => {
        console.error("Failed to refresh global data:", err);
        showDBLoading(false);
        showToast("Gagal memuat turun data terkini.", "error");
    });
};

// ---------- Sync Getters — read from in-memory cache ----------
function getAdmins() { return dbCache.admins; }
function saveAdmins(data) { dbCache.admins = data; writeAdminsToFirestore(data); }

function getLecturers() { return dbCache.lecturers; }
function saveLecturers(data) { dbCache.lecturers = data; writeLecturersToFirestore(data); }

function getStudents() { return dbCache.students; }
function saveStudents(data, modifiedRegNo = null) { 
    dbCache.students = data; 
    normalizeStudentsCache();
    try { localStorage.setItem("upli_students", JSON.stringify(dbCache.students)); } catch(e) {}
    
    if (modifiedRegNo === "none") {
        // Skip Firestore write (already handled via delete operations)
        return;
    }
    
    if (modifiedRegNo) {
        if (typeof modifiedRegNo === 'string') {
            const student = data.find(s => s.regNo === modifiedRegNo);
            if (student) writeStudentToFirestore(student);
        } else if (Array.isArray(modifiedRegNo)) {
            writeStudentsToFirestore(data);
        }
    } else {
        writeStudentsToFirestore(data); 
    }
}

function getSessions() { return dbCache.sessions; }
function saveSessions(data) { dbCache.sessions = data; writeSettingsToFirestore({ sessions: data }); }

/**
 * Semak secara strictly sama ada pelajar berdaftar di bawah sesi akademik pilihan.
 * Menghalang penggabungan data pelajar daripada sesi berbeza.
 */
function isStudentInSession(student, activeSession) {
    if (!student || !activeSession) return false;
    const sSesi = String(student.sesi || "").toUpperCase().trim();
    const target = String(activeSession || "").toUpperCase().trim();
    if (!sSesi || !target) return false;

    if (sSesi === target) return true;

    // Normalize potential legacy suffixes
    const cleanS1 = sSesi.replace(/\s*-\s*FASA\s*\d+/gi, "").trim();
    const cleanS2 = target.replace(/\s*-\s*FASA\s*\d+/gi, "").trim();

    return cleanS1 === cleanS2;
}

function getActiveSession() { return dbCache.activeSession; }
function saveActiveSession(val) { dbCache.activeSession = val; writeSettingsToFirestore({ activeSession: val }); }

function getLogs() { return dbCache.logs; }
function addLog(type, text) {
    const now = new Date();
    const formattedTime = now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, '0') + "-" +
        String(now.getDate()).padStart(2, '0') + " " +
        String(now.getHours()).padStart(2, '0') + ":" +
        String(now.getMinutes()).padStart(2, '0');
    const entry = { type, text, time: formattedTime };
    dbCache.logs.unshift(entry);
    dbCache.logs = dbCache.logs.slice(0, 50);
    writeLogToFirestore(entry);
}

function getRubriks() { return dbCache.rubriks; }
function saveRubriks(data) { dbCache.rubriks = data; writeRubriksToFirestore(data); }

function getAnnouncements() { return dbCache.announcements || []; }
function saveAnnouncements(data) {
    dbCache.announcements = data;
    writeAnnouncementsToFirestore(data);
    localStorage.setItem("upli_announcements", JSON.stringify(data));
}

// --------------------------------------------------------------------------
// A-3. FIRESTORE FILE STORAGE (Chunked base64 — no Firebase Storage needed)
// Firestore docs max = 1MB. Base64 adds ~33% overhead.
// Each chunk = 600KB raw → ~800KB base64 → safe within 1MB limit.
// --------------------------------------------------------------------------
const FS_CHUNK_SIZE = 900 * 1024; // 900KB raw per chunk (fewer Firestore writes)
let FS_MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB max per file (can be dynamically updated)

// In-memory file cache so we don't re-fetch on every preview
const fileCache = {};

async function saveFileToFirestore(regNo, docId, base64Data) {
    const fileId = `${sanitizeDocId(regNo)}_${docId}`;
    const totalSize = base64Data.length;
    const chunkCount = Math.ceil(totalSize / (FS_CHUNK_SIZE * 4 / 3)); // base64 chunks

    // Split base64 string into chunks
    const chunkSize = Math.ceil(totalSize / chunkCount);
    const chunks = [];
    for (let i = 0; i < totalSize; i += chunkSize) {
        chunks.push(base64Data.slice(i, i + chunkSize));
    }

    // Write all chunks in parallel
    await Promise.all(chunks.map((chunk, idx) =>
        db.collection("file_data").doc(`${fileId}_${idx}`).set({
            fileId, regNo: String(regNo), docId,
            chunkIndex: idx, totalChunks: chunks.length,
            data: chunk,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
    ));

    // Cache in memory for immediate display
    fileCache[fileId] = base64Data;
    return fileId;
}

async function loadFileFromFirestore(regNo, docId) {
    const fileId = `${sanitizeDocId(regNo)}_${docId}`;

    // 1. Try Google Apps Script if URL is present and we have a Google Drive fileId
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        let actualFileId = null;
        if (regNo === "admin") {
            const rubrik = dbCache.rubriks.find(r => r.id === docId);
            if (rubrik && rubrik.fileId && rubrik.fileId !== "N/A") actualFileId = rubrik.fileId;
        } else {
            const student = dbCache.students.find(s => s.regNo === regNo);
            if (student && student.documents && student.documents[docId]) {
                actualFileId = student.documents[docId].fileId;
            }
        }
        
        if (actualFileId && actualFileId !== "N/A") {
            if (fileCache[actualFileId]) return fileCache[actualFileId];
            try {
                const res = await callGoogleScript("getFile", { fileId: actualFileId });
                if (res && res.base64Data) {
                    fileCache[actualFileId] = res.base64Data;
                    return res.base64Data;
                }
            } catch (e) {
                console.warn("loadFileFromFirestore: Google Script getFile failed, falling back to Firestore", e);
            }
        }
    }

    // 2. Fallback / Standard: Query Firestore chunked storage
    if (fileCache[fileId]) return fileCache[fileId];

    try {
        // Load chunk 0 first to get totalChunks count
        const chunk0 = await db.collection("file_data").doc(`${fileId}_0`).get();
        if (chunk0.exists) {
            const { totalChunks } = chunk0.data();
            let chunks = [chunk0.data().data];

            if (totalChunks > 1) {
                const rest = await Promise.all(
                    Array.from({ length: totalChunks - 1 }, (_, i) =>
                        db.collection("file_data").doc(`${fileId}_${i + 1}`).get()
                    )
                );
                rest.forEach(doc => chunks.push(doc.data().data));
            }

            const base64Data = chunks.join('');
            fileCache[fileId] = base64Data; // Cache for future use
            return base64Data;
        }
    } catch (e) {
        console.warn("loadFileFromFirestore: Firestore fetch failed", e);
    }

    return null;
}

async function deleteFileFromFirestore(regNo, docId) {
    const fileId = `${sanitizeDocId(regNo)}_${docId}`;
    delete fileCache[fileId];
    // Try to delete up to 20 chunks
    const deletes = Array.from({ length: 20 }, (_, i) =>
        db.collection("file_data").doc(`${fileId}_${i}`).delete().catch(() => { })
    );
    await Promise.all(deletes);
}

// --------------------------------------------------------------------------
// B. RUNTIME STATE & CORE DOM SELECTORS
// --------------------------------------------------------------------------
let currentUser = null;
let currentRole = null; // "student", "lecturer", or "admin"
let activeTab = "";
let currentReviewContext = null; // { studentReg, docId } for review modal

// Tab Filtering States
let activeLecturerDept = "JKA";
let activeAdminDept = "JKA";
let activeAdminStudentDept = "JKA";
let activeAdminAssignDept = "JKA";
let activeAdminPADept = "JKA";
let adminDeptCharts = [];

// Elements - Views
const loginView = document.getElementById("portal-view");
const dashboardLayout = document.getElementById("dashboard-layout");
const sidebar = document.querySelector(".sidebar");

// Elements - Navigation
const sidebarToggle = document.getElementById("sidebar-toggle");
const navGroups = {
    student: document.getElementById("nav-student"),
    lecturer: document.getElementById("nav-lecturer"),
    admin: document.getElementById("nav-admin")
};
const userRoleBadge = document.getElementById("user-role-badge");
const sidebarUserName = document.getElementById("sidebar-user-name");
const sidebarUserSub = document.getElementById("sidebar-user-sub");
const sidebarUserAvatar = document.getElementById("user-avatar");
const headerUserRole = document.getElementById("header-user-role");
const headerUserAvatar = document.getElementById("header-avatar");
const currentTabTitle = document.getElementById("current-tab-title");
const logoutBtn = document.getElementById("logout-btn");
const timeDisplay = document.getElementById("current-time-display");

// Global Session Select Elements
const sessionSelectContainer = document.getElementById("session-select-container");
const globalSessionSelect = document.getElementById("global-session-select");

// Forms
const studentLoginForm = document.getElementById("student-login-form");
const lecturerLoginForm = document.getElementById("lecturer-login-form");
const adminLoginForm = document.getElementById("admin-login-form");
const registerAdminForm = document.getElementById("register-admin-form");

function updateUserAvatars(user) {
    if (currentRole === "student" && user && user.profilePic) {
        sidebarUserAvatar.style.backgroundImage = `url(${user.profilePic})`;
        sidebarUserAvatar.style.backgroundSize = "cover";
        sidebarUserAvatar.style.backgroundPosition = "center";
        sidebarUserAvatar.textContent = "";

        headerUserAvatar.style.backgroundImage = `url(${user.profilePic})`;
        headerUserAvatar.style.backgroundSize = "cover";
        headerUserAvatar.style.backgroundPosition = "center";
        headerUserAvatar.textContent = "";
    } else {
        sidebarUserAvatar.style.backgroundImage = "none";
        sidebarUserAvatar.textContent = getInitials(user ? user.name : "Pengguna");
        headerUserAvatar.style.backgroundImage = "none";
        headerUserAvatar.textContent = getInitials(user ? user.name : "Pengguna");
    }
}

// --------------------------------------------------------------------------
// C. UTILITY FUNCTIONS (TOASTS, DIALOGS, TIME)
// --------------------------------------------------------------------------
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let iconClass = "fa-solid fa-circle-info";
    if (type === "success") iconClass = "fa-solid fa-circle-check";
    if (type === "error") iconClass = "fa-solid fa-circle-exmark";

    toast.innerHTML = `
        <i class="${iconClass}"></i>
        <div class="toast-content">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "slideOut 0.25s forwards";
        setTimeout(() => toast.remove(), 250);
    }, 4000);
}

// Custom in-app confirmation dialog (replaces native browser confirm())
function showConfirm(message, onConfirm, title = "Pengesahan Diperlukan", confirmLabel = "Padam") {
    const overlay = document.getElementById("custom-confirm-overlay");
    const msgEl = document.getElementById("custom-confirm-message");
    const titleEl = document.getElementById("custom-confirm-title");
    const okBtn = document.getElementById("custom-confirm-ok");
    const cancelBtn = document.getElementById("custom-confirm-cancel");

    titleEl.textContent = title;
    msgEl.textContent = message;
    okBtn.textContent = confirmLabel;

    overlay.style.display = "flex";

    // Remove old listeners to prevent stacking
    const newOkBtn = okBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newOkBtn.textContent = confirmLabel;

    function closeModal() {
        overlay.style.display = "none";
    }

    newOkBtn.addEventListener("click", () => {
        closeModal();
        onConfirm();
    });

    newCancelBtn.addEventListener("click", closeModal);

    // Click outside overlay to cancel
    overlay.addEventListener("click", function outsideClick(e) {
        if (e.target === overlay) {
            closeModal();
            overlay.removeEventListener("click", outsideClick);
        }
    });
}

// Time display clock
const MALAY_DAYS_CLOCK = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
const MALAY_MONTHS_CLOCK = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];

function startClock() {
    const dateDisplay = document.getElementById("current-date-display");
    const portalDateDisplay = document.getElementById("portal-date-display");
    const portalTimeDisplay = document.getElementById("portal-time-display");
    const portalDayDisplay = document.getElementById("portal-day-display");
    const dashboardTimeDisplay = document.getElementById("dashboard-time-display");
    const dashboardDateDisplay = document.getElementById("dashboard-date-display");
    
    setInterval(() => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        
        if (typeof timeDisplay !== 'undefined' && timeDisplay) {
            timeDisplay.textContent = timeStr;
        }
        if (portalTimeDisplay) {
            portalTimeDisplay.textContent = timeStr;
        }
        if (dashboardTimeDisplay) {
            dashboardTimeDisplay.textContent = timeStr;
        }
        
        const dayName = MALAY_DAYS_CLOCK[now.getDay()];
        const dayNum = String(now.getDate()).padStart(2, '0');
        const monthName = MALAY_MONTHS_CLOCK[now.getMonth()];
        const yearNum = now.getFullYear();
        
        const fullDateStr = `${dayName}, ${dayNum} ${monthName} ${yearNum}`;
        const shortDateStr = `${dayNum}/${String(now.getMonth() + 1).padStart(2, '0')}/${yearNum}`;

        if (dateDisplay) {
            dateDisplay.textContent = shortDateStr;
        }
        if (portalDateDisplay) {
            portalDateDisplay.textContent = fullDateStr;
        }
        if (dashboardDateDisplay) {
            dashboardDateDisplay.textContent = fullDateStr;
        }
        if (portalDayDisplay) {
            portalDayDisplay.textContent = dayName;
        }
    }, 1000);
}

// Get user initials for avatars
function getInitials(name) {
    if (!name) return "U";
    return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

// Convert base64 Data URL to Blob URL to allow modern browsers to display PDFs in iframe/embed tags
let currentPreviewBlobUrls = [];
function clearPreviewBlobUrls() {
    currentPreviewBlobUrls.forEach(url => {
        try { URL.revokeObjectURL(url); } catch (e) { }
    });
    currentPreviewBlobUrls = [];
}

function dataURLtoBlobURL(dataURL) {
    try {
        if (!dataURL || !dataURL.startsWith("data:")) return dataURL;
        const parts = dataURL.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([uInt8Array], { type: contentType });
        const url = URL.createObjectURL(blob);
        currentPreviewBlobUrls.push(url);
        return url;
    } catch (e) {
        console.error("Error converting data URL to blob URL", e);
        return dataURL;
    }
}

// Toggle password visibility
document.querySelectorAll(".toggle-password").forEach(btn => {
    btn.addEventListener("click", function () {
        const input = this.previousElementSibling;
        const icon = this.querySelector("i");
        if (input.type === "password") {
            input.type = "text";
            icon.className = "fa-solid fa-eye-slash";
        } else {
            input.type = "password";
            icon.className = "fa-solid fa-eye";
        }
    });
});

// Toggle Sidebar for mobile view
sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
});

// Close sidebar on navigation item click (mobile)
document.addEventListener("click", (e) => {
    if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
            sidebar.classList.remove("active");
        }
    }
});

// --------------------------------------------------------------------------
// D. AUTHENTICATION & VIEWS CONTROL
// --------------------------------------------------------------------------

// Switch Login Roles Tabs
const loginTabButtons = document.querySelectorAll(".login-tabs .tab-btn");
const loginForms = document.querySelectorAll(".login-body .login-form");

loginTabButtons.forEach(btn => {
    btn.addEventListener("click", function () {
        loginTabButtons.forEach(b => b.classList.remove("active"));
        loginForms.forEach(f => f.classList.remove("active"));

        this.classList.add("active");
        const role = this.dataset.role;
        document.getElementById(`${role}-login-form`).classList.add("active");
    });
});


document.getElementById("link-to-login").addEventListener("click", (e) => {
    e.preventDefault();
    switchPortalTab('login');
});

// --- SUBMIT: Student Login ---
studentLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (dbCache.settings && dbCache.settings.maintenanceMode) {
        showToast("⚠️ Sistem sedang menjalani proses penyelenggaraan berjadual. Akses pelajar ditutup sementara.", "warning");
        return;
    }
    const regNo = document.getElementById("student-reg").value.trim().toUpperCase();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sedang log masuk...`;

    try {
        if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
            const student = dbCache.students.find(s => s.regNo === regNo);
            if (student) {
                loginUser(student, "student");
            } else {
                showToast("No. Pendaftaran tidak wujud dalam sistem! Sila hubungi Admin.", "error");
            }
            return;
        }

        const docSnap = await db.collection("students").doc(sanitizeDocId(regNo)).get();
        if (docSnap.exists) {
            dbCache.students = [docSnap.data()];
            normalizeStudentsCache();
            loginUser(dbCache.students[0], "student");
        } else {
            showToast("No. Pendaftaran tidak wujud dalam sistem! Sila hubungi Admin.", "error");
        }
    } catch (err) {
        console.error("Student login error:", err);
        showToast("Ralat menyambung ke pangkalan data. Sila cuba lagi.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});

// --- SUBMIT: Lecturer Login ---
const LECTURER_PASSWORD = "STAFF123";
lecturerLoginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (dbCache.settings && dbCache.settings.maintenanceMode) {
        showToast("⚠️ Sistem sedang menjalani proses penyelenggaraan berjadual. Akses pensyarah ditutup sementara.", "warning");
        return;
    }
    const email = document.getElementById("lecturer-email").value.trim().toLowerCase();
    const password = document.getElementById("lecturer-password").value.trim();

    if (!email.endsWith("@polikk.edu.my")) {
        showToast("Format emel salah! Mestilah berakhir dengan @polikk.edu.my", "error");
        return;
    }

    if (password !== LECTURER_PASSWORD) {
        showToast("Kata laluan salah! Sila cuba lagi.", "error");
        return;
    }

    const lecturers = getLecturers();
    let matchedLecturer = lecturers.find(l => l.email === email);

    if (!matchedLecturer) {
        const prefix = email.split('@')[0];
        const formattedName = prefix.split(/[._-]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

        matchedLecturer = {
            name: "Pensyarah " + formattedName,
            email: email,
            dept: "JKA",
            role: "lecturer"
        };
        lecturers.push(matchedLecturer);
        saveLecturers(lecturers);
        addLog("success", `Pensyarah mendaftar masuk kali pertama (Auto-Register): ${matchedLecturer.name} (${email})`);
    }

    loginUser(matchedLecturer, "lecturer");
});

// --- SUBMIT: Admin Login (Must be Registered) ---
adminLoginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("admin-email").value.trim().toLowerCase();
    const password = document.getElementById("admin-password").value.trim(); // password is staffId

    if (!email.endsWith("@polikk.edu.my")) {
        showToast("Format emel salah! Mestilah berakhir dengan @polikk.edu.my", "error");
        return;
    }

    const admins = getAdmins();
    const matchedAdmin = admins.find(a => a.email === email && String(a.staffId) === String(password));

    if (matchedAdmin) {
        loginUser(matchedAdmin, "admin");
    } else {
        showToast("Emel atau No ID Staf (kata laluan) adalah tidak tepat!", "error");
    }
});

// --- SUBMIT: Register Admin ---
registerAdminForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("reg-admin-name").value.trim();
    const email = document.getElementById("reg-admin-email").value.trim().toLowerCase();
    const id = document.getElementById("reg-admin-id").value.trim();

    if (!email.endsWith("@polikk.edu.my")) {
        showToast("Pendaftaran Gagal: Hanya emel @polikk.edu.my dibenarkan.", "error");
        return;
    }

    const admins = getAdmins();
    if (admins.some(a => a.email === email)) {
        showToast("Emel ini telah berdaftar sebagai Admin!", "error");
        return;
    }

    const newAdmin = {
        name,
        email,
        staffId: id,
        role: "admin",
        status: "Aktif"
    };

    admins.push(newAdmin);
    saveAdmins(admins);
    addLog("info", `Admin baharu didaftarkan: ${name} (${email})`);

    showToast("Akaun pentadbir (admin) berjaya didaftarkan!", "success");
    registerAdminForm.reset();

    switchPortalTab('login');

    loginTabButtons.forEach(b => b.classList.remove("active"));
    loginForms.forEach(f => f.classList.remove("active"));
    document.querySelector('.login-tabs [data-role="admin"]').classList.add("active");
    document.getElementById("admin-login-form").classList.add("active");
    document.getElementById("admin-email").value = email;
});

// --------------------------------------------------------------------------
// E. ROUTING & LOGIN SESSION & SESSION SELECTION DROPDOWN
// --------------------------------------------------------------------------
function loginUser(user, role) {
    currentUser = user;
    currentRole = role;
    
    // Save to sessionStorage — session ends when tab/app is closed
    sessionStorage.setItem('upli_user', JSON.stringify(user));
    sessionStorage.setItem('upli_role', role);

    showToast(`Log masuk berjaya sebagai ${user.name}`, "success");
    addLog("info", `${user.name} (${role.toUpperCase()}) log masuk.`);

    if (role === "student") {
        attachStudentRealtimeListener(user.regNo);
    } else {
        attachGlobalStudentsRealtimeListener();
    }

    // Setup Sidebar Details
    sidebarUserName.textContent = user.name;
    sidebarUserSub.textContent = role === "student" ? user.regNo : user.email;

    updateUserAvatars(user);

    let displayBadge = "Pelajar";
    if (role === "lecturer") displayBadge = "Pensyarah";
    if (role === "admin") displayBadge = "Admin UPLI";

    userRoleBadge.textContent = displayBadge;
    headerUserRole.textContent = displayBadge;

    // Reset inputs
    studentLoginForm.reset();
    lecturerLoginForm.reset();
    adminLoginForm.reset();

    // Global Session Dropdown logic: Show only for Lecturer and Admin
    const refreshBtn = document.getElementById("btn-refresh-global-data");
    if (role === "lecturer" || role === "admin") {
        populateGlobalSessionSelect();
        sessionSelectContainer.style.display = "flex";
        if (refreshBtn) refreshBtn.style.display = "inline-flex";
    } else {
        sessionSelectContainer.style.display = "none";
        if (refreshBtn) refreshBtn.style.display = "none";
    }

    // Show Nav Group for Role
    Object.keys(navGroups).forEach(g => {
        navGroups[g].style.display = g === role ? "flex" : "none";
    });

    // Show/Hide Developer Tab based on Admin role
    const devNavItem = document.getElementById("nav-item-admin-developer");
    if (role === "admin") {
        if (devNavItem) {
            devNavItem.style.display = "flex";
            populateDeveloperPanel();
        }
    } else {
        if (devNavItem) devNavItem.style.display = "none";
    }

    // Setup Navigation active link
    const savedDashboardTab = sessionStorage.getItem('upli_active_dashboard_tab');
    let targetTab = navGroups[role].querySelector(".nav-item").dataset.tab;
    
    if (savedDashboardTab && navGroups[role].querySelector(`.nav-item[data-tab="${savedDashboardTab}"]`)) {
        targetTab = savedDashboardTab;
    }

    navGroups[role].querySelectorAll(".nav-item").forEach(i => {
        if (i.dataset.tab === targetTab) i.classList.add("active");
        else i.classList.remove("active");
    });

    // Switch to main interface — explicitly set display to handle inline style override
    loginView.style.display = "none";          // Force hide (overrides inline style)
    loginView.classList.remove("active");
    dashboardLayout.classList.add("active");

    // Reset scroll position so header is visible
    window.scrollTo(0, 0);
    const mc = document.querySelector(".main-content");
    if (mc) mc.scrollTop = 0;

    switchTab(targetTab);
}

function populateGlobalSessionSelect() {
    const rawSessions = getSessions() || [];
    const students    = getStudents() || [];

    // Unique sessions directly from registered student records
    const studentSessions = [...new Set(students.map(st => (st.sesi || "").replace(/\s*-\s*Fasa\s*\d+/gi, "").trim()).filter(Boolean))];

    let cleanSessions = [];

    // 1. Add all registered sessions from dbCache.sessions
    rawSessions.forEach(s => {
        let trimmed = (s || "").replace(/\s*-\s*Fasa\s*\d+/gi, "").trim();
        if (!trimmed) return;
        if (trimmed.includes("2025/2026") && !studentSessions.includes(trimmed)) return;
        if (!cleanSessions.includes(trimmed)) cleanSessions.push(trimmed);
    });

    // 2. Add any sessions from student records that aren't listed yet
    studentSessions.forEach(s => {
        if (!cleanSessions.includes(s)) cleanSessions.push(s);
    });

    // Fallback if cleanSessions is empty
    if (cleanSessions.length === 0) {
        cleanSessions = ["Sesi 1:2026/2027"];
    }

    let active = (getActiveSession() || "").replace(/\s*-\s*Fasa\s*\d+/gi, "").trim();
    if (!active || !cleanSessions.includes(active)) {
        active = cleanSessions[0];
        saveActiveSession(active);
    }

    dbCache.sessions = cleanSessions;
    try { localStorage.setItem("upli_sessions", JSON.stringify(cleanSessions)); } catch(e) {}

    globalSessionSelect.innerHTML = "";
    const deleteSessionSelect = document.getElementById("admin-delete-session-select");
    if (deleteSessionSelect) deleteSessionSelect.innerHTML = "";

    const portalSessionSelect = document.getElementById("portal-session-select");
    if (portalSessionSelect) portalSessionSelect.innerHTML = "";

    cleanSessions.forEach(s => {
        const option = document.createElement("option");
        option.value = s;
        option.textContent = s;
        option.style.setProperty('color', '#000000', 'important');
        option.style.setProperty('background-color', '#ffffff', 'important');
        if (s === active) option.selected = true;
        
        globalSessionSelect.appendChild(option);

        if (deleteSessionSelect) {
            const delOpt = option.cloneNode(true);
            deleteSessionSelect.appendChild(delOpt);
        }

        if (portalSessionSelect) {
            const portOpt = option.cloneNode(true);
            portalSessionSelect.appendChild(portOpt);
        }
    });
}

// Watch global session dropdown change
globalSessionSelect.addEventListener("change", function () {
    const selectedSesi = this.value;
    saveActiveSession(selectedSesi);
    addLog("info", `Pertukaran paparan sesi akademik aktif ke: ${selectedSesi}`);
    showToast(`Paparan ditukar ke Sesi: ${selectedSesi}`, "info");

    const portalSessionSelect = document.getElementById("portal-session-select");
    if (portalSessionSelect) portalSessionSelect.value = selectedSesi;

    // Refresh current tab
    renderTabData(activeTab);
});

// Watch portal session dropdown change (public landing page)
document.addEventListener("DOMContentLoaded", () => {
    const portalSessionSelect = document.getElementById("portal-session-select");
    if (portalSessionSelect) {
        portalSessionSelect.addEventListener("change", function () {
            const selectedSesi = this.value;
            saveActiveSession(selectedSesi);
            if (globalSessionSelect) globalSessionSelect.value = selectedSesi;
            if (typeof renderPortalAnnouncements === "function") renderPortalAnnouncements();
            if (activeTab) renderTabData(activeTab);
        });
    }
});

logoutBtn.addEventListener("click", () => {
    // Clear localStorage on logout
    sessionStorage.removeItem('upli_user');
    sessionStorage.removeItem('upli_role');

    if (currentUser) {
        addLog("info", `${currentUser.name} log keluar.`);
        currentUser = null;
        currentRole = null;
    }

    // Unsubscribe listeners on logout
    if (activeGlobalStudentsListener) {
        try { activeGlobalStudentsListener(); } catch(e){}
        activeGlobalStudentsListener = null;
    }
    if (activeStudentListener) {
        try { activeStudentListener(); } catch(e){}
        activeStudentListener = null;
    }

    sessionStorage.removeItem('upli_active_dashboard_tab');
    sessionStorage.removeItem('upli_active_portal_tab');

    dashboardLayout.classList.remove("active");
    loginView.classList.add("active");
    loginView.style.display = "flex"; // Restore inline style to let CSS handle visibility
    switchPortalTab('dashboard');
    sessionSelectContainer.style.display = "none";
    applyDeptTheme(null); // Clear department theme on logout
    showToast("Anda telah log keluar dengan selamat.", "info");
    window.scrollTo(0, 0);
});



// --------------------------------------------------------------------------
// F. TAB ROUTING & RENDERING
// --------------------------------------------------------------------------

/* ==========================================================================
   SKELETON LOADING SYSTEM
   Shows premium shimmer placeholders instantly; replaced by real content.
   ========================================================================== */

/** Generate N skeleton table rows with given column count */
function skTableRows(count, cols) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `<div class="skeleton-table-row">`;
        // Avatar circle
        html += `<div class="skeleton sk-circle" style="width:36px;height:36px;flex-shrink:0;"></div>`;
        for (let c = 0; c < cols - 1; c++) {
            const widths = ['sk-w-75','sk-w-50','sk-w-60','sk-w-40','sk-w-75','sk-w-50'];
            html += `<div class="skeleton sk-h-sm ${widths[c % widths.length]}" style="flex:1;"></div>`;
        }
        html += `</div>`;
    }
    return html;
}

/** Generate N skeleton stat cards */
function skStatCards(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
        <div class="skeleton-stat-card">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                <div style="display:flex;flex-direction:column;gap:8px;flex:1;">
                    <div class="skeleton sk-h-xs sk-w-60"></div>
                    <div class="skeleton sk-h-2xl sk-w-40"></div>
                    <div class="skeleton sk-h-xs sk-w-75"></div>
                </div>
                <div class="skeleton sk-circle" style="width:52px;height:52px;flex-shrink:0;"></div>
            </div>
        </div>`;
    }
    return html;
}

/** Generate N skeleton student grid cards */
function skStudentCards(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
        <div class="skeleton-student-card">
            <div class="skeleton-student-card-header">
                <div class="skeleton sk-circle" style="width:44px;height:44px;flex-shrink:0;"></div>
                <div style="flex:1;display:flex;flex-direction:column;gap:7px;">
                    <div class="skeleton sk-h-sm sk-w-75"></div>
                    <div class="skeleton sk-h-xs sk-w-50"></div>
                </div>
            </div>
            <div class="skeleton sk-h-xs sk-w-60"></div>
            <div class="skeleton sk-h-xs sk-w-40"></div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
                ${Array(7).fill('<div class="skeleton" style="width:28px;height:22px;border-radius:6px;"></div>').join('')}
            </div>
        </div>`;
    }
    return html;
}

/** Generate skeleton for Student Dashboard */
function skStudentDashboard() {
    return `
    <div style="display:flex;flex-direction:column;gap:20px;padding:4px 0;">
        <!-- Welcome banner -->
        <div class="skeleton-card" style="flex-direction:row;align-items:center;gap:20px;">
            <div class="skeleton sk-circle" style="width:60px;height:60px;flex-shrink:0;"></div>
            <div style="flex:1;display:flex;flex-direction:column;gap:10px;">
                <div class="skeleton sk-h-lg sk-w-50"></div>
                <div class="skeleton sk-h-xs sk-w-75"></div>
            </div>
        </div>
        <!-- Stat cards -->
        <div class="skeleton-stats-row skeleton-stagger">${skStatCards(4)}</div>
        <!-- Progress bar -->
        <div class="skeleton-card" style="gap:14px;">
            <div class="skeleton sk-h-sm sk-w-40"></div>
            <div class="skeleton sk-h-xl sk-w-full" style="border-radius:20px;"></div>
            <div class="skeleton sk-h-xs sk-w-25"></div>
        </div>
        <!-- Info row -->
        <div class="skeleton-profile-row">
            <div class="skeleton-profile-col skeleton-card">
                <div class="skeleton sk-h-sm sk-w-60"></div>
                <div class="skeleton sk-h-md sk-w-75"></div>
                <div class="skeleton sk-h-sm sk-w-40"></div>
                <div class="skeleton sk-h-md sk-w-60"></div>
            </div>
            <div class="skeleton-profile-col skeleton-card">
                <div class="skeleton sk-h-sm sk-w-60"></div>
                <div class="skeleton sk-h-md sk-w-75"></div>
                <div class="skeleton sk-h-sm sk-w-40"></div>
                <div class="skeleton sk-h-md sk-w-60"></div>
            </div>
        </div>
    </div>`;
}

/** Generate skeleton for Student Documents tab */
function skStudentDocuments() {
    let phases = '';
    for (let p = 0; p < 3; p++) {
        phases += `
        <div class="skeleton-card" style="gap:14px;">
            <div class="skeleton sk-h-md sk-w-40"></div>
            ${Array(p === 0 ? 3 : p === 1 ? 2 : 4).fill(`
            <div style="display:flex;align-items:center;gap:14px;">
                <div class="skeleton sk-circle" style="width:32px;height:32px;flex-shrink:0;"></div>
                <div style="flex:1;display:flex;flex-direction:column;gap:7px;">
                    <div class="skeleton sk-h-sm sk-w-60"></div>
                    <div class="skeleton sk-h-xs sk-w-40"></div>
                </div>
                <div class="skeleton sk-h-xl" style="width:90px;border-radius:20px;"></div>
            </div>`).join('')}
        </div>`;
    }
    return `<div style="display:flex;flex-direction:column;gap:16px;padding:4px 0;">${phases}</div>`;
}

/** Generate skeleton for Lecturer Dashboard (table view) */
function skLecturerDashboard() {
    return `
    <div style="display:flex;flex-direction:column;gap:20px;padding:4px 0;">
        <div class="skeleton-stats-row skeleton-stagger" style="grid-template-columns:repeat(3,1fr);">${skStatCards(3)}</div>
        <div class="skeleton-table">
            <div class="skeleton-table-header">
                <div class="skeleton sk-h-md sk-w-40"></div>
                <div class="skeleton sk-h-md" style="width:180px;margin-left:auto;"></div>
            </div>
            ${skTableRows(6, 8)}
        </div>
    </div>`;
}

/** Generate skeleton for Lecturer Students grid */
function skLecturerStudents() {
    return `
    <div style="display:flex;flex-direction:column;gap:16px;padding:4px 0;">
        <div class="skeleton-card" style="flex-direction:row;align-items:center;gap:12px;">
            <div class="skeleton sk-h-xl" style="width:200px;border-radius:10px;"></div>
            <div class="skeleton sk-h-xl" style="width:120px;margin-left:auto;border-radius:10px;"></div>
        </div>
        <div class="skeleton-grid">${skStudentCards(6)}</div>
    </div>`;
}

/** Generate skeleton for Admin Dashboard */
function skAdminDashboard() {
    return `
    <div style="display:flex;flex-direction:column;gap:20px;padding:4px 0;">
        <div class="skeleton-stats-row skeleton-stagger">${skStatCards(4)}</div>
        <div class="skeleton-card" style="gap:14px;">
            <div class="skeleton sk-h-md sk-w-50"></div>
            <div class="skeleton sk-h-4xl sk-w-full" style="border-radius:12px;"></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;">
            ${Array(5).fill(`
            <div class="skeleton-card" style="gap:12px;">
                <div style="display:flex;gap:10px;align-items:center;">
                    <div class="skeleton sk-circle" style="width:42px;height:42px;flex-shrink:0;"></div>
                    <div style="flex:1;display:flex;flex-direction:column;gap:7px;">
                        <div class="skeleton sk-h-sm sk-w-60"></div>
                        <div class="skeleton sk-h-xs sk-w-40"></div>
                    </div>
                </div>
                <div class="skeleton sk-h-3xl sk-w-full" style="border-radius:10px;"></div>
                <div class="skeleton sk-h-xs sk-w-75"></div>
                <div class="skeleton sk-h-xs sk-w-50"></div>
            </div>`).join('')}
        </div>
    </div>`;
}

/** Generate skeleton for Admin Students table */
function skAdminTable() {
    return `
    <div style="display:flex;flex-direction:column;gap:16px;padding:4px 0;">
        <div class="skeleton-card" style="flex-direction:row;align-items:center;gap:12px;flex-wrap:wrap;">
            <div class="skeleton sk-h-xl" style="width:220px;border-radius:10px;"></div>
            <div class="skeleton sk-h-xl" style="width:160px;border-radius:10px;"></div>
            <div class="skeleton sk-h-xl" style="width:120px;margin-left:auto;border-radius:10px;"></div>
        </div>
        <div class="skeleton-table">
            <div class="skeleton-table-header">
                ${Array(5).fill('<div class="skeleton sk-h-sm" style="flex:1;"></div>').join('')}
            </div>
            ${skTableRows(8, 6)}
        </div>
    </div>`;
}

/**
 * Show skeleton for a given tab ID. Returns the skeleton element so it can
 * be removed after the real render completes.
 */
function showSkeletonForTab(tabId) {
    const section = document.getElementById(tabId);
    if (!section) return null;

    // Choose the right skeleton template
    let skHtml = '';
    if (tabId === 'student-dashboard')   skHtml = skStudentDashboard();
    if (tabId === 'student-documents')   skHtml = skStudentDocuments();
    if (tabId === 'lecturer-dashboard')  skHtml = skLecturerDashboard();
    if (tabId === 'lecturer-students')   skHtml = skLecturerStudents();
    if (tabId === 'lecturer-pa')         skHtml = skLecturerStudents();
    if (tabId === 'admin-dashboard')     skHtml = skAdminDashboard();
    if (tabId === 'admin-students')      skHtml = skAdminTable();
    if (tabId === 'admin-lecturers')     skHtml = skAdminTable();
    if (tabId === 'admin-pa')            skHtml = skAdminTable();
    if (tabId === 'admin-lecturer-list') skHtml = skAdminTable();
    if (!skHtml) return null; // No skeleton for this tab

    // Inject skeleton overlay on top of existing section content
    const overlay = document.createElement('div');
    overlay.className = 'skeleton-overlay';
    overlay.style.cssText = 'position:absolute;inset:0;z-index:10;overflow:auto;pointer-events:none;';
    overlay.innerHTML = skHtml;

    // Make parent position relative so overlay covers it
    const prevPosition = section.style.position;
    section.style.position = 'relative';
    section.appendChild(overlay);

    return { overlay, section, prevPosition };
}

/**
 * Remove a skeleton overlay with a smooth fade-out.
 */
function removeSkeletonOverlay(skHandle) {
    if (!skHandle || !skHandle.overlay) return;
    const { overlay, section, prevPosition } = skHandle;
    overlay.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    overlay.style.opacity    = '0';
    overlay.style.transform  = 'scale(0.99)';
    setTimeout(() => {
        overlay.remove();
        section.style.position = prevPosition || '';
    }, 320);
}

function switchTab(tabId) {
    activeTab = tabId;
    sessionStorage.setItem('upli_active_dashboard_tab', tabId);

    document.querySelectorAll(".tab-content").forEach(tab => {
        tab.classList.remove("active");
    });

    const targetSection = document.getElementById(tabId);
    if (targetSection) {
        targetSection.classList.add("active");
    }

    document.querySelectorAll(".nav-item").forEach(item => {
        if (item.dataset.tab === tabId) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    let title = "Dashboard";
    if (tabId === "student-dashboard") title = "Dashboard Pelajar";
    if (tabId === "student-documents") title = "Muat Naik & Status Dokumen";
    if (tabId === "lecturer-dashboard") title = "Ringkasan Dokumen Jabatan";
    if (tabId === "lecturer-students") title = "Senarai Pelajar Seliaan UPLI";
    if (tabId === "lecturer-pa") title = "Pelajar Di Bawah Jagaan PA";
    if (tabId === "admin-dashboard") title = "Statistik Keseluruhan Pelajar LI";
    if (tabId === "admin-students") title = "Pengurusan Data Pelajar";
    if (tabId === "admin-lecturers") title = "Agihan Pensyarah Pemantau / Penilai";
    if (tabId === "admin-pa") title = "Pengurusan Penasihat Akademik (PA)";
    if (tabId === "admin-lecturer-list") title = "Direktori Pensyarah POLIKK";
    if (tabId === "admin-announcements") title = "Pengurusan Makluman Penting";
    if (tabId === "admin-admins") title = "Pengurusan Pentadbir Sistem";
    if (tabId === "admin-rubrik") title = "Dokumen Rujukan";
    if (tabId === "rubrik-viewer") title = "Dokumen Rujukan";
    if (tabId === "admin-developer") title = "Panel Pembangun & Tetapan Sistem";

    currentTabTitle.textContent = title;

    // Show skeleton immediately, then render real content on next frame
    const skHandle = showSkeletonForTab(tabId);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            renderTabData(tabId);
            removeSkeletonOverlay(skHandle);
        });
    });
}

document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", function (e) {
        e.preventDefault();
        const tabId = this.dataset.tab;
        switchTab(tabId);

        if (window.innerWidth <= 768) {
            sidebar.classList.remove("active");
        }
    });
});

function renderTabData(tabId) {
    try {
        if (typeof updateAdminNotifications === "function") updateAdminNotifications();
        if (tabId === "student-dashboard") renderStudentDashboard();
        if (tabId === "student-documents") renderStudentDocuments();

        if (tabId === "lecturer-dashboard") renderLecturerDashboard();
        if (tabId === "lecturer-students") renderLecturerStudentsList();
        if (tabId === "lecturer-pa") renderLecturerPAStudentsTable();

        if (tabId === "admin-dashboard") renderAdminDashboard();
        if (tabId === "admin-students") renderAdminStudentsTable();
        if (tabId === "admin-lecturers") renderAdminLecturerAssignTable();
        if (tabId === "admin-pa") renderAdminPATable();
        if (tabId === "admin-lecturer-list") renderAdminLecturerList();
        if (tabId === "admin-announcements") renderAdminAnnouncements();
        if (tabId === "admin-admins") renderAdminAdminsTable();
        if (tabId === "admin-rubrik") renderAdminRubrik();
        if (tabId === "rubrik-viewer") renderRubrikViewer();
        if (tabId === "admin-developer") populateDeveloperPanel();
    } catch (renderErr) {
        console.error("[My InternMS] renderTabData error:", renderErr);
        // Show error message in the active tab section
        const section = document.getElementById(tabId);
        if (section) {
            section.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px;gap:16px;padding:40px;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem;color:var(--color-warning);"></i>
                    <h3 style="color:var(--text-primary);font-family:var(--font-display);">Ralat Paparan</h3>
                    <p style="color:var(--text-muted);font-size:0.9rem;text-align:center;max-width:400px;">Sistem menghadapi masalah memuatkan data. Cuba log keluar dan log masuk semula.</p>
                    <code style="background:rgba(244,63,94,0.1);color:var(--color-danger);padding:8px 14px;border-radius:8px;font-size:0.8rem;word-break:break-all;">${renderErr.message}</code>
                    <button class="btn btn-secondary" onclick="location.reload()" style="margin-top:8px;"><i class="fa-solid fa-rotate-right"></i> Muat Semula</button>
                </div>
            `;
        }
    }
}

// --------------------------------------------------------------------------
// G. STUDENT MODULE
// --------------------------------------------------------------------------
function renderStudentDashboard() {
    if (currentRole !== "student") return;

    const students = getStudents();
    const updatedUser = students.find(s => s.regNo === currentUser.regNo);
    if (updatedUser) currentUser = updatedUser;

    document.getElementById("student-welcome-name").textContent = currentUser.name;

    // Calculate document statistics
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    let missing = 0;
    const requiredDocs = getStudentDocsList(currentUser);
    const totalDocs = requiredDocs.length;

    requiredDocs.forEach(d => {
        const key = d.id;
        const doc = currentUser.documents[key];
        const status = doc ? doc.status : "Belum Dihantar";

        if (status === "Diterima") approved++;
        else if (status === "Dalam Semakan") pending++;
        else if (status === "Ditolak") rejected++;
        else missing++;
    });

    document.getElementById("student-stat-approved").textContent = approved;
    document.getElementById("student-stat-pending").textContent = pending;
    document.getElementById("student-stat-rejected").textContent = rejected;
    document.getElementById("student-stat-missing").textContent = missing;

    const progressPercent = (approved / totalDocs) * 100;
    const progressBar = document.getElementById("student-progress-bar");
    progressBar.style.width = `${progressPercent}%`;
    document.getElementById("student-progress-text").textContent = `${approved}/${totalDocs} Diluluskan`;

    // Render Sesi, Company & Monitors & Evaluators
    document.getElementById("student-session-display").textContent = currentUser.sesi || "Sesi 1:2026/2027";
    document.getElementById("student-tempat-li").textContent = currentUser.tempatLI || "Belum Ditentukan";

    const lecturers = getLecturers();
    const pemantau = lecturers.find(l => l.email === currentUser.pensyarahPemantau);
    const penilai = lecturers.find(l => l.email === currentUser.pensyarahPenilai);

    const pemantauNameEl = document.getElementById("student-pemantau-name");
    const pemantauEmailEl = document.getElementById("student-pemantau-email");
    const penilaiNameEl = document.getElementById("student-penilai-name");
    const penilaiEmailEl = document.getElementById("student-penilai-email");
    const penilaiRow = document.getElementById("student-penilai-row");

    if (pemantau) {
        pemantauNameEl.textContent = currentUser.pensyarahPemantauName || pemantau.name;
        pemantauEmailEl.textContent = pemantau.email;
    } else {
        pemantauNameEl.textContent = currentUser.pensyarahPemantauName || currentUser.pensyarahPemantau || "Belum Diagihkan";
        pemantauEmailEl.textContent = currentUser.pensyarahPemantau ? currentUser.pensyarahPemantau : "";
    }

    if (studentHasPenilai(currentUser)) {
        if (penilaiRow) penilaiRow.style.display = "flex";
        if (penilai) {
            penilaiNameEl.textContent = currentUser.pensyarahPenilaiName || penilai.name;
            penilaiEmailEl.textContent = penilai.email;
        } else {
            penilaiNameEl.textContent = currentUser.pensyarahPenilaiName || currentUser.pensyarahPenilai || "Belum Diagihkan";
            penilaiEmailEl.textContent = currentUser.pensyarahPenilai ? currentUser.pensyarahPenilai : "";
        }
    } else {
        if (penilaiRow) penilaiRow.style.display = "none";
    }

    // Render Personal Profile details
    const selfEmailInput = document.getElementById("profile-self-email");
    const selfPhoneInput = document.getElementById("profile-self-phone");
    const selfAvatarEl = document.getElementById("profile-card-avatar");

    if (selfEmailInput) selfEmailInput.value = currentUser.email || "";
    if (selfPhoneInput) selfPhoneInput.value = currentUser.phone || "";
    if (selfAvatarEl) {
        if (currentUser.profilePic) {
            selfAvatarEl.style.backgroundImage = `url(${currentUser.profilePic})`;
            selfAvatarEl.style.backgroundSize = "cover";
            selfAvatarEl.style.backgroundPosition = "center";
            selfAvatarEl.textContent = "";
        } else {
            selfAvatarEl.style.backgroundImage = "none";
            selfAvatarEl.textContent = getInitials(currentUser.name);
        }
    }

    // Update theme
    applyDeptTheme(currentUser.jabatan);
}

function renderStudentDocuments() {
    if (currentRole !== "student") return;

    const students = getStudents();
    const updatedUser = students.find(s => s.regNo === currentUser.regNo);
    if (updatedUser) currentUser = updatedUser;

    const container = document.getElementById("student-docs-container");
    container.innerHTML = "";

    // Group documents by phase
    const requiredDocs = getStudentDocsList(currentUser);
    const phases = {
        "Sebelum LI": [],
        "Semasa LI": [],
        "Selepas LI": []
    };

    requiredDocs.forEach(d => {
        if (phases[d.phase]) {
            phases[d.phase].push(d);
        }
    });

    let index = 1;

    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "30px";

    Object.keys(phases).forEach(phaseName => {
        const phaseDocs = phases[phaseName];
        if (phaseDocs.length === 0) return;

        const phaseSection = document.createElement("div");
        phaseSection.className = "phase-section";
        phaseSection.innerHTML = `
            <h3 style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; margin-bottom: 15px; color: var(--color-primary); display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                <i class="fa-solid fa-folder-open"></i> ${phaseName}
            </h3>
            <div class="document-list-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
            </div>
        `;

        const grid = phaseSection.querySelector(".document-list-grid");

        phaseDocs.forEach(d => {
            const key = d.id;
            const doc = currentUser.documents[key] || { status: "Belum Dihantar", fileName: "", fileSize: "", uploadDate: "", feedback: "" };
            const status = doc.status;

            let statusClass = "badge-muted";
            if (status === "Dalam Semakan") statusClass = "badge-warning";
            if (status === "Diterima") statusClass = "badge-success";
            if (status === "Ditolak") statusClass = "badge-danger";

            let statusText = status;
            if (d.isPhysical) {
                if (status === "Belum Dihantar") statusText = "Belum Dihantar Fizikal";
                if (status === "Ditolak") statusText = "Ditolak / Belum Lengkap";
                if (status === "Diterima") statusText = "Disahkan Diterima";
            }

            const card = document.createElement("div");
            card.className = "doc-card";
            card.style.margin = "0";

            let cardBody = `
                <div class="doc-card-header">
                    <span class="doc-number">${index++}</span>
                    <span class="badge ${statusClass}"><i class="fa-solid fa-circle"></i> ${statusText}</span>
                </div>
                <div class="doc-card-body">
                    <h4>${d.title}</h4>
                    <p>${d.desc}</p>
            `;

            if (status === "Ditolak" && doc.feedback) {
                cardBody += `
                    <div class="doc-feedback-box">
                        <span>Ulasan Pensyarah:</span>
                        <p>"${doc.feedback}"</p>
                    </div>
                `;
            }

            if (status !== "Belum Dihantar" && doc.fileName) {
                cardBody += `
                    <div class="uploaded-file-info" style="justify-content: space-between; gap: 10px;">
                        <div style="display:flex; align-items:center; gap:10px; min-width:0; flex-grow:1;">
                            <i class="fa-solid fa-file-pdf file-icon" style="flex-shrink:0;"></i>
                            <div class="file-meta-mini" style="min-width:0;">
                                <span class="file-name-mini" title="${doc.fileName}">${doc.fileName}</span>
                                <span class="file-size-mini">${doc.fileSize} • ${doc.uploadDate}</span>
                            </div>
                        </div>
                        <button class="btn btn-secondary btn-sm btn-icon" onclick="openDocumentViewer('${currentUser.regNo}', '${key}')" title="Lihat Dokumen" style="border-radius: 4px; padding: 6px 10px; flex-shrink:0;">
                            <i class="fa-solid fa-eye text-primary"></i> Papar
                        </button>
                    </div>
                `;
            }

            if (d.isPhysical) {
                if (status === "Belum Dihantar" || status === "Ditolak") {
                    cardBody += `
                        <div style="background: rgba(99,102,241,0.03); color: #6366f1; border: 1.5px dashed rgba(99,102,241,0.3); border-radius: 12px; padding: 20px 15px; text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center; justify-content: center;">
                            <i class="fa-solid fa-file-invoice" style="font-size: 1.8rem; color: #6366f1;"></i>
                            <span style="font-size: 0.8rem; font-weight: 700; color: #6366f1;">Hantar Secara Fizikal</span>
                            <span style="font-size: 0.75rem; color: var(--text-secondary); max-width: 250px; line-height: 1.4; margin:0;">
                                Sila serahkan Borang Pendaftaran Kursus LI (BP) fizikal anda ke pejabat UPLI untuk disahkan oleh Admin.
                            </span>
                        </div>
                    `;
                } else if (status === "Diterima") {
                    cardBody += `
                        <div style="background: rgba(16,185,129,0.03); color: var(--color-success); border: 1.5px dashed rgba(16,185,129,0.3); border-radius: 12px; padding: 20px 15px; text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center; justify-content: center;">
                            <i class="fa-solid fa-file-circle-check" style="font-size: 1.8rem; color: var(--color-success);"></i>
                            <span style="font-size: 0.8rem; font-weight: 700; color: var(--color-success);">Telah Disahkan Fizikal</span>
                            <span style="font-size: 0.75rem; color: var(--text-secondary); max-width: 250px; line-height: 1.4; margin:0;">
                                Dokumen fizikal telah berjaya diterima dan disahkan oleh pejabat UPLI.
                            </span>
                        </div>
                    `;
                }
            } else if (window.uploadProgress && window.uploadProgress[key] !== undefined) {
                const progressVal = window.uploadProgress[key];
                const progressText = typeof progressVal === 'number' ? `${progressVal}%` : progressVal;
                const widthPercent = typeof progressVal === 'number' ? `${progressVal}%` : '100%';
                cardBody += `
                    <div class="upload-progress-container" id="progress-container-${key}" style="margin-top: 15px; background: rgba(59, 130, 246, 0.05); border: 1px dashed #3b82f6; border-radius: 8px; padding: 15px; display: flex; flex-direction: column; gap: 8px; align-items: center; justify-content: center; text-align: center;">
                        <i class="fa-solid fa-spinner fa-spin text-accent" style="font-size: 1.5rem; color: #3b82f6;"></i>
                        <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);" id="progress-label-${key}">Muat Naik: ${progressText}</span>
                        <div style="width: 100%; height: 6px; background: rgba(0, 0, 0, 0.1); border-radius: 3px; overflow: hidden;">
                            <div id="progress-bar-${key}" style="width: ${widthPercent}; height: 100%; background: #3b82f6; transition: width 0.1s ease; border-radius: 3px;"></div>
                        </div>
                    </div>
                `;
            } else if (status === "Belum Dihantar" || status === "Ditolak") {
                // Check if BP (borang_pendaftaran_li) is approved
                const bpDoc = currentUser.documents["borang_pendaftaran_li"] || { status: "Belum Dihantar" };
                const isBpApproved = bpDoc.status === "Diterima";

                if (!isBpApproved) {
                    cardBody += `
                        <div style="background: rgba(220,38,38,0.03); border: 1.5px dashed rgba(220,38,38,0.2); border-radius: 12px; padding: 20px 15px; text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center; justify-content: center;">
                            <i class="fa-solid fa-lock" style="font-size: 1.8rem; color: #dc2626;"></i>
                            <span style="font-size: 0.8rem; font-weight: 700; color: #dc2626;">Muat Naik Dikunci</span>
                            <span style="font-size: 0.75rem; color: var(--text-secondary); max-width: 250px; line-height: 1.4; margin:0;">
                                Sila serahkan Borang Pendaftaran Kursus LI (BP) fizikal ke pejabat UPLI terlebih dahulu untuk membuka slot ini.
                            </span>
                        </div>
                    `;
                } else {
                    const pesDoc = currentUser.documents["screenshot_pes"] || { status: "Belum Dihantar" };
                    const mbDoc = currentUser.documents["screenshot_maklum_balas"] || { status: "Belum Dihantar" };
                    const isPesSubmitted = pesDoc.status === "Diterima" || pesDoc.status === "Dalam Semakan";
                    const isMbSubmitted = mbDoc.status === "Diterima" || mbDoc.status === "Dalam Semakan";
                    const isTamatUnlocked = isPesSubmitted && isMbSubmitted;

                    if (key === "tamat_li" && !isTamatUnlocked) {
                        cardBody += `
                            <div style="background: rgba(220,38,38,0.03); border: 1.5px dashed rgba(220,38,38,0.2); border-radius: 12px; padding: 20px 15px; text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center; justify-content: center;">
                                <i class="fa-solid fa-lock" style="font-size: 1.8rem; color: #dc2626;"></i>
                                <span style="font-size: 0.8rem; font-weight: 700; color: #dc2626;">Muat Naik Dikunci</span>
                                <span style="font-size: 0.75rem; color: var(--text-secondary); max-width: 250px; line-height: 1.4; margin:0;">
                                    Sila jawab maklum balas (PES & Pelajar LI) dan muat naik screenshot bukti selesai menjawab untuk membuka kunci dokumen ini.
                                </span>
                            </div>
                        `;
                    } else {
                        // Add survey instructions box if screenshot
                        if (key === "screenshot_pes" || key === "screenshot_maklum_balas") {
                            const settings = dbCache.settings || {};
                            const surveyText = key === "screenshot_pes" ? settings.linkPES : settings.linkMaklumBalas;
                            if (surveyText && surveyText.trim() !== "") {
                                cardBody += `
                                    <div class="survey-instructions-box" style="background: rgba(20,184,166,0.03); border: 1.5px solid rgba(20,184,166,0.15); border-radius: 10px; padding: 14px; font-size: 0.8rem; line-height: 1.5; color: var(--text-primary); text-align: left; margin-bottom: 15px; white-space: pre-wrap; word-break: break-word; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);">
                                        ${linkify(surveyText)}
                                    </div>
                                `;
                            } else {
                                cardBody += `
                                    <div style="margin-bottom: 15px; display: flex; align-items: center; gap: 8px; border-radius: 10px; padding: 12px; background: rgba(0,0,0,0.02); border: 1px dashed var(--border-color); color: var(--text-muted); font-size: 0.8rem; text-align: left; line-height: 1.4;">
                                        <i class="fa-solid fa-triangle-exclamation" style="color: var(--color-warning); flex-shrink:0;"></i>
                                        <span>Maklumat/pautan belum disediakan oleh pihak Admin.</span>
                                    </div>
                                `;
                            }
                        }

                        // slaid_pembentangan: PowerPoint or PDF only; others: PDF/PNG/JPG
                        const isSlaid = key === "slaid_pembentangan";
                        const isScreenshot = key === "screenshot_pes" || key === "screenshot_maklum_balas";
                        const acceptTypes = isSlaid ? ".ppt,.pptx,.pdf" : (isScreenshot ? ".png,.jpg,.jpeg" : ".pdf,.png,.jpg,.jpeg");
                        const constraintLabel = isSlaid
                            ? "PowerPoint (.ppt, .pptx) atau PDF sahaja (Maks: 10GB)"
                            : (isScreenshot ? "Tangkapan Skrin PNG, JPG, JPEG sahaja" : "PDF, PNG, JPG (Maks: 10GB)");
                        cardBody += `
                            <div class="upload-zone" onclick="triggerFileUpload('${key}')">
                                <i class="fa-solid fa-cloud-arrow-up"></i>
                                <span>Pilih Fail untuk Muat Naik</span>
                                <span class="file-constraint">${constraintLabel}</span>
                            </div>
                            <input type="file" id="file-input-${key}" style="display:none;" accept="${acceptTypes}" onchange="handleFileSelected(event, '${key}')">
                        `;
                    }
                }
            } else if (status === "Dalam Semakan") {
                cardBody += `
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <button class="btn btn-secondary btn-block btn-sm" disabled style="background: rgba(234,179,8,0.05); color: var(--color-primary); border-color: rgba(234,179,8,0.2);">
                            <i class="fa-solid fa-spinner fa-spin"></i> Menunggu Semakan
                        </button>
                        <button class="btn btn-danger btn-block btn-sm" onclick="cancelStudentDocumentSubmission('${key}')" style="background: #ffffff; color: #dc2626; border: 1.5px solid #dc2626; padding: 6px 10px; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='#ffffff'">
                            <i class="fa-solid fa-xmark"></i> Batal Penyerahan
                        </button>
                    </div>
                `;
            } else if (status === "Diterima") {
                cardBody += `
                    <button class="btn btn-secondary btn-block btn-sm" disabled style="background: rgba(16,185,129,0.05); color: var(--color-success); border-color: rgba(16,185,129,0.2);">
                        <i class="fa-solid fa-lock"></i> Dokumen Diluluskan
                    </button>
                `;
            }

            cardBody += `</div>`;
            card.innerHTML = cardBody;
            grid.appendChild(card);
        });

        container.appendChild(phaseSection);
    });

    // --- Hide download-all banner (admin-only feature, not shown to students) ---
    const banner = document.getElementById("download-all-docs-banner");
    if (banner) banner.style.display = "none";
}

window.cancelStudentDocumentSubmission = function(docId) {
    if (currentRole !== "student" || !currentUser) return;
    
    const docMeta = getDocMetadata(docId, currentUser);
    
    showConfirm(
        `Adakah anda pasti mahu membatalkan penyerahan untuk "${docMeta.title}"? Fail yang dimuat naik akan dipadamkan daripada pengkalan data.`,
        async function() {
            showDBLoading(true);
            try {
                // Delete from Firestore storage (chunks)
                await deleteFileFromFirestore(currentUser.regNo, docId);
                
                // Update local storage and Firestore doc
                const students = getStudents();
                const studentIdx = students.findIndex(s => s.regNo === currentUser.regNo);
                if (studentIdx !== -1) {
                    students[studentIdx].documents[docId] = {
                        status: "Belum Dihantar",
                        fileName: "",
                        fileSize: "",
                        uploadDate: "",
                        feedback: "",
                        fileData: ""
                    };
                    saveStudents(students, currentUser.regNo);
                    renderStudentDocuments();
                    showToast("Penyerahan dokumen berjaya dibatalkan.", "success");
                }
            } catch (err) {
                console.error("Error cancelling submission:", err);
                showToast("Gagal membatalkan penyerahan: " + err.message, "error");
            } finally {
                showDBLoading(false);
            }
        },
        "Batal Penyerahan",
        "Batal Hantar"
    );
};

// --------------------------------------------------------------------------
// Download all student documents as a ZIP file
// --------------------------------------------------------------------------
async function downloadAllStudentDocs() {
    if (!currentUser) return;

    const students = getStudents();
    const updatedUser = students.find(s => s.regNo === currentUser.regNo);
    if (updatedUser) currentUser = updatedUser;

    const requiredDocs = getStudentDocsList(currentUser);

    // Collect documents that have fileData
    const docsWithData = requiredDocs
        .map(d => ({
            meta: d,
            doc: (currentUser.documents || {})[d.id]
        }))
        .filter(item => item.doc && item.doc.fileData && item.doc.fileData.trim() !== "");

    if (docsWithData.length === 0) {
        showToast("Tiada fail dokumen yang telah dimuat naik untuk dimuat turun.", "warning");
        return;
    }

    const btnDl = document.getElementById("btn-download-all-docs");
    if (btnDl) {
        btnDl.disabled = true;
        btnDl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sedang Menyediakan ZIP...`;
    }

    try {
        const zip = new JSZip();

        // Folder name based on student name and regNo (sanitize for filesystem)
        const safeName = (currentUser.name || "Pelajar").replace(/[^a-zA-Z0-9_ ]/g, "_");
        const folderName = `${safeName}_${currentUser.regNo}`;
        const folder = zip.folder(folderName);

        // Add each document file to the ZIP
        docsWithData.forEach(item => {
            const { meta, doc } = item;

            // Extract base64 data (strip data URI prefix if present)
            let base64Data = doc.fileData;
            let fileExtension = "";

            if (base64Data.startsWith("data:")) {
                const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
                if (matches) {
                    const mime = matches[1];
                    base64Data = matches[2];
                    // Derive extension from mime
                    if (mime.includes("pdf")) fileExtension = ".pdf";
                    else if (mime.includes("png")) fileExtension = ".png";
                    else if (mime.includes("jpeg") || mime.includes("jpg")) fileExtension = ".jpg";
                    else fileExtension = "";
                }
            }

            // Use original fileName if available, fallback to doc title
            let fileName = doc.fileName || `${meta.title}${fileExtension}`;
            // Remove any path separators to keep it safe
            fileName = fileName.replace(/[\\/]/g, "_");

            folder.file(fileName, base64Data, { base64: true });
        });

        // Generate ZIP blob and trigger download
        const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
        saveAs(blob, `${folderName}.zip`);

        showToast(`Berjaya! ${docsWithData.length} fail dimuat turun dalam ${folderName}.zip`, "success");

    } catch (err) {
        console.error("ZIP Error:", err);
        showToast("Ralat semasa menjana fail ZIP. Sila cuba semula.", "error");
    } finally {
        if (btnDl) {
            btnDl.disabled = false;
            btnDl.innerHTML = `<i class="fa-solid fa-file-zipper"></i> Muat Turun Semua Dokumen (ZIP)`;
        }
    }
}

// --------------------------------------------------------------------------
// Download a specific student's documents as ZIP — ADMIN ONLY
// --------------------------------------------------------------------------
window.adminDownloadStudentDocs = async function (regNo) {
    if (currentRole !== "admin") {
        showToast("Hanya Admin yang dibenarkan untuk muat turun folder pelajar!", "error");
        return;
    }

    const students = getStudents();
    const student = students.find(s => s.regNo === regNo);
    if (!student) {
        showToast("Rekod pelajar tidak dijumpai!", "error");
        return;
    }

    const requiredDocs = getStudentDocsList(student);

    // Filter documents that have been uploaded
    const uploadedDocs = requiredDocs
        .map(d => ({ meta: d, doc: (student.documents || {})[d.id] }))
        .filter(item => item.doc && (item.doc.fileUrl || item.doc.fileRef || item.doc.fileData));

    if (uploadedDocs.length === 0) {
        showToast("Tiada fail dokumen yang tersimpan untuk pelajar ini.", "error");
        return;
    }

    // Disable the button to prevent double-click
    const btnEl = document.getElementById(`btn-admin-dl-${regNo}`);
    if (btnEl) {
        btnEl.disabled = true;
        btnEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    }

    try {
        showToast("Menjana fail ZIP... Memuat turun kandungan dari pangkalan data...", "info");
        const zip = new JSZip();

        // Folder name: StudentName_RegNo
        const safeName = (student.name || "Pelajar").replace(/[^a-zA-Z0-9_ ]/g, "_");
        const folderName = `${safeName}_${student.regNo}`;
        const folder = zip.folder(folderName);

        // Fetch all base64 contents in parallel
        await Promise.all(uploadedDocs.map(async (item) => {
            const { meta, doc } = item;
            let base64Data = doc.fileData;

            // If fileData is deleted but we have fileRef, load it from Firestore chunk storage
            if (!base64Data && doc.fileRef) {
                base64Data = await loadFileFromFirestore(regNo, meta.id);
            }

            // If it's stored as fileUrl (Firebase Storage)
            if (!base64Data && doc.fileUrl) {
                const response = await fetch(doc.fileUrl);
                const blob = await response.blob();
                base64Data = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }

            if (!base64Data) {
                console.warn(`Could not resolve file data for doc: ${meta.title}`);
                return;
            }

            // Parse base64
            let cleanBase64 = base64Data;
            let fileExtension = "";

            if (cleanBase64.startsWith("data:")) {
                const matches = cleanBase64.match(/^data:([^;]+);base64,(.+)$/);
                if (matches) {
                    const mime = matches[1];
                    cleanBase64 = matches[2];
                    if (mime.includes("pdf")) fileExtension = ".pdf";
                    else if (mime.includes("png")) fileExtension = ".png";
                    else if (mime.includes("jpeg") || mime.includes("jpg")) fileExtension = ".jpg";
                }
            }

            let fileName = doc.fileName || `${meta.title}${fileExtension}`;
            fileName = fileName.replace(/[\\/]/g, "_");
            folder.file(fileName, cleanBase64, { base64: true });
        }));

        const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
        saveAs(blob, `${folderName}.zip`);

        addLog("success", `Admin memuat turun folder dokumen pelajar: ${student.name} (${regNo}) — ${uploadedDocs.length} fail.`);
        showToast(`Berjaya! Folder ${folderName}.zip telah dimuat turun.`, "success");

    } catch (err) {
        console.error("ZIP Error:", err);
        showToast("Ralat semasa menjana fail ZIP. Sila cuba semula.", "error");
    } finally {
        if (btnEl) {
            btnEl.disabled = false;
            btnEl.innerHTML = `<i class="fa-solid fa-folder-arrow-down"></i>`;
        }
    }
};

// --------------------------------------------------------------------------
// H. LECTURER MODULE
// --------------------------------------------------------------------------

// Switch Lecturer Department Tabs
document.querySelectorAll("#lecturer-dashboard .dept-tab-btn").forEach(btn => {
    btn.addEventListener("click", function () {
        document.querySelectorAll("#lecturer-dashboard .dept-tab-btn").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        activeLecturerDept = this.dataset.dept;
        renderLecturerDashboard();
    });
});

function deptHasPenilai(dept) {
    return dept === "JKA" || dept === "JKE" || dept === "JKM";
}

function renderLecturerDashboard() {
    if (currentRole !== "lecturer") return;

    applyDeptTheme(activeLecturerDept);
    document.getElementById("lecturer-dept-table-title").textContent = `Senarai Pelajar Jabatan: ${activeLecturerDept}`;

    const students = getStudents();
    const lecturers = getLecturers();
    const activeSesi = getActiveSession();
    const searchQuery = document.getElementById("lecturer-dept-student-search").value.trim().toLowerCase();

    const tbody = document.getElementById("lecturer-dept-students-table-body");
    const tableEl = tbody.closest("table");
    const thead = tableEl.querySelector("thead");

    // FILTER: Filter students strictly by department AND active academic session AND search query
    const filteredStudents = students.filter(s =>
        s.jabatan === activeLecturerDept &&
        isStudentInSession(s, activeSesi) &&
        ((s.name || "").toLowerCase().includes(searchQuery) || (s.regNo || "").toLowerCase().includes(searchQuery))
    );

    // Set headers dynamically
    const hasPenilai = deptHasPenilai(activeLecturerDept);
    thead.innerHTML = `
        <tr>
            <th>Nama Pelajar</th>
            <th style="text-align: center;">No. Pendaftaran</th>
            <th>Penasihat Akademik</th>
            <th>Tempat Latihan Industri (LI)</th>
            <th>Bandar/Kawasan</th>
            <th>Pensyarah Pemantau</th>
            <th>Emel Pemantau</th>
            ${hasPenilai ? `
                <th>Pensyarah Penilai</th>
                <th>Emel Penilai</th>
            ` : ""}
            <th style="text-align: center;">Status Dokumen</th>
        </tr>
    `;

    if (filteredStudents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${hasPenilai ? 10 : 8}" style="text-align:center;" class="text-muted">Tiada rekod pelajar berdaftar di bawah jabatan ${activeLecturerDept} bagi sesi ${activeSesi}.</td></tr>`;
        return;
    }

    let rowsHtml = "";
    filteredStudents.forEach(s => {
        const pemantau = lecturers.find(l => l.email === s.pensyarahPemantau);
        const penilai = lecturers.find(l => l.email === s.pensyarahPenilai);
        const pemantauName = s.pensyarahPemantauName || (pemantau ? pemantau.name : (s.pensyarahPemantau || "Belum diagihkan"));
        const pemantauEmail = s.pensyarahPemantau || "Belum diagihkan";
        const penilaiName = s.pensyarahPenilaiName || (penilai ? penilai.name : (s.pensyarahPenilai || "Belum diagihkan"));
        const penilaiEmail = s.pensyarahPenilai || "Belum diagihkan";

        let docsVisual = "";
        const requiredDocs = getStudentDocsList(s);
        requiredDocs.forEach(d => {
            const key = d.id;
            const status = s.documents[key] ? s.documents[key].status : "Belum Dihantar";
            let c = "gray";
            if (status === "Dalam Semakan") c = "yellow";
            if (status === "Diterima") c = "green";
            if (status === "Ditolak") c = "red";

            docsVisual += `<span class="status-indicator-dot ${c}" title="${d.title}: ${status}" onclick="openDocumentReviewModal('${s.regNo}', '${key}')">${getDocAcronym(key, d.title)}</span>`;
        });

        rowsHtml += `
            <tr class="student-table-row" data-dept="${s.jabatan}">
                <td>
                    <div class="table-student-cell">
                        <div class="avatar mini-avatar">${getInitials(s.name)}</div>
                        <strong>${s.name}</strong>
                    </div>
                </td>
                <td style="text-align: center;"><code>${s.regNo}</code></td>
                <td><span style="font-size:0.85rem;">${s.penasihatAkademikName || (s.penasihatAkademik || 'Belum Diagihkan')}</span></td>
                <td>${s.tempatLI || 'Belum Ditentukan'}</td>
                <td>${s.daerah || '-'}</td>
                <td><span style="font-size:0.8rem;">${pemantauName}</span></td>
                <td><span style="font-size:0.8rem; color:var(--text-muted);">${pemantauEmail}</span></td>
                ${hasPenilai ? `
                    <td><span style="font-size:0.8rem;">${penilaiName}</span></td>
                    <td><span style="font-size:0.8rem; color:var(--text-muted);">${penilaiEmail}</span></td>
                ` : ""}
                <td>
                    <div class="doc-mini-status-grid" style="justify-content: center;">
                        ${docsVisual}
                    </div>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = rowsHtml;
}

document.getElementById("lecturer-dept-student-search").addEventListener("input", renderLecturerDashboard);

function renderLecturerStudentsList() {
    if (currentRole !== "lecturer") return;

    const students = getStudents();
    const activeSesi = getActiveSession();
    const searchQuery = document.getElementById("lecturer-my-student-search").value.trim().toLowerCase();

    const grid = document.getElementById("lecturer-my-students-grid");
    grid.innerHTML = "";

    // FILTER: Supervision tab only shows students of the active academic session where this lecturer is Pemantau OR Penilai
    const myStudents = students.filter(s =>
        s.sesi === activeSesi &&
        (s.pensyarahPemantau === currentUser.email || s.pensyarahPenilai === currentUser.email) &&
        ((s.name || "").toLowerCase().includes(searchQuery) || (s.regNo || "").toLowerCase().includes(searchQuery))
    );

    if (myStudents.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px;" class="card text-muted">Tiada rekod pelajar seliaan di bawah pemantauan/penilaian anda bagi sesi ${activeSesi}.</div>`;
        return;
    }

    myStudents.forEach(s => {
        const requiredDocs = getStudentDocsList(s);
        let approvedCount = 0;
        requiredDocs.forEach(d => {
            const status = s.documents[d.id] ? s.documents[d.id].status : "Belum Dihantar";
            if (status === "Diterima") approvedCount++;
        });
        const pct = Math.round((approvedCount / requiredDocs.length) * 100);

        let docStatusGridHTML = "";
        requiredDocs.forEach(d => {
            const key = d.id;
            const status = s.documents[key] ? s.documents[key].status : "Belum Dihantar";
            let color = "gray";
            let tooltip = `${d.title}: Belum Hantar`;

            if (status === "Dalam Semakan") { color = "yellow"; tooltip = `${d.title}: Semakan`; }
            if (status === "Diterima") { color = "green"; tooltip = `${d.title}: Diterima`; }
            if (status === "Ditolak") { color = "red"; tooltip = `${d.title}: Ditolak`; }

            const initialsDoc = getDocAcronym(key, d.title);
            docStatusGridHTML += `
                <div class="status-indicator-dot ${color}" title="${tooltip}" onclick="openDocumentReviewModal('${s.regNo}', '${key}')">
                    ${initialsDoc}
                </div>
            `;
        });

        const isPemantau = s.pensyarahPemantau === currentUser.email;
        const isPenilai = s.pensyarahPenilai === currentUser.email;
        let roleLabel = "";
        if (isPemantau && isPenilai) roleLabel = "Pemantau & Penilai";
        else if (isPemantau) roleLabel = "Pensyarah Pemantau";
        else if (isPenilai) roleLabel = "Pensyarah Penilai";

        // Lecturer marksheets upload buttons
        const isKejuruteraan = getStudentCategory(s) === "Kejuruteraan";
        const targetDocs = [];

        if (isKejuruteraan) {
            if (isPemantau) {
                targetDocs.push({ id: "appendix_e2", title: "Appendix E2 (Pemantau)" });
            }
            if (isPenilai) {
                targetDocs.push({ id: "appendix_e3", title: "Appendix E3 (Penilai)" });
            }
        } else {
            if (isPemantau) {
                targetDocs.push({ id: "appendix_2", title: "Appendix 2 (Pemantau)" });
            }
        }

        let uploadControlsHTML = "";
        targetDocs.forEach(td => {
            const hasDoc = s.documents[td.id] && (s.documents[td.id].fileUrl || s.documents[td.id].fileData);
            uploadControlsHTML += `
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; background:rgba(255,255,255,0.02); padding:6px 10px; border-radius:6px; border:1px solid var(--border-color); gap: 10px;">
                    <span style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">${td.title}</span>
                    <div style="display:flex; gap:6px; align-items:center;">
                        ${hasDoc ? `
                            <span class="badge badge-success" style="font-size:0.6rem; padding:2px 6px;">Selesai</span>
                            <a href="${s.documents[td.id].fileUrl || s.documents[td.id].fileData}" ${s.documents[td.id].fileUrl ? 'target="_blank"' : `download="${s.documents[td.id].fileName}"`} class="btn btn-sm btn-info" style="padding: 2px 6px; font-size: 0.65rem;" title="Muat Turun"><i class="fa-solid fa-download"></i></a>
                        ` : `
                            <span class="badge badge-secondary" style="font-size:0.6rem; padding:2px 6px; background:rgba(255,255,255,0.05); color:var(--text-muted);">Belum</span>
                        `}
                        <button class="btn btn-primary btn-sm" onclick="document.getElementById('lecturer-upload-${td.id}-${s.regNo}').click()" style="padding:2px 6px; font-size:0.65rem;" title="Upload Fail">
                            <i class="fa-solid fa-upload"></i>
                        </button>
                        <input type="file" id="lecturer-upload-${td.id}-${s.regNo}" style="display:none;" onchange="handleLecturerFileUpload('${s.regNo}', '${td.id}', this)">
                    </div>
                </div>
            `;
        });

        let avatarStyle = "";
        let avatarContent = getInitials(s.name);
        if (s.profilePic) {
            avatarStyle = `style="background-image: url(${s.profilePic}); background-size: cover; background-position: center;"`;
            avatarContent = "";
        }

        const card = document.createElement("div");
        card.className = "student-card";
        card.setAttribute("data-dept", s.jabatan);

        card.innerHTML = `
            <div class="student-card-header">
                <div class="avatar" ${avatarStyle}>${avatarContent}</div>
                <div>
                    <span class="role-badge" style="font-size:0.65rem; margin-bottom:4px; padding:2px 6px; display:inline-block;">${roleLabel}</span>
                    <h4>${s.name}</h4>
                    <p>No Pendaftaran: <code>${s.regNo}</code></p>
                    <p>Jabatan: ${s.jabatan}</p>
                    <p>No. Telefon: ${s.phone ? `<a href="tel:${s.phone}" style="color: var(--color-primary); font-weight: 600; text-decoration: none;"><i class="fa-solid fa-phone" style="color: var(--color-success); font-size: 0.7rem; margin-right: 4px;"></i>${s.phone}</a>` : `<span class="text-muted" style="font-style: italic;">Tiada Maklumat</span>`}</p>
                </div>
            </div>
            <div style="margin-bottom:12px; font-size:0.8rem; background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border:1px solid var(--border-color);">
                <span class="text-muted" style="font-size:0.7rem; display:block;">Tempat Latihan Industri (LI):</span>
                <strong><i class="fa-solid fa-building text-accent"></i> ${s.tempatLI || 'Belum Ditentukan'}</strong>
            </div>
            <div class="student-card-stats">
                <span>Dokumen Diluluskan:</span>
                <strong>${approvedCount}/${requiredDocs.length} (${pct}%)</strong>
            </div>
            <div style="margin-bottom:12px;">
                <p style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:6px;">Status Fail (Klik untuk semak):</p>
                <div class="doc-mini-status-grid">
                    ${docStatusGridHTML}
                </div>
            </div>
            <div style="margin-top:12px; border-top:1px solid var(--border-color); padding-top:12px;">
                <p style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:6px; font-weight:600;">Muat Naik Borang Markah:</p>
                ${uploadControlsHTML}
            </div>
        `;

        grid.appendChild(card);
    });
}

document.getElementById("lecturer-my-student-search").addEventListener("input", renderLecturerStudentsList);


// --------------------------------------------------------------------------
// I. REVIEW DRAWER / MODAL LOGIC
// --------------------------------------------------------------------------
const reviewModal = document.getElementById("document-detail-modal");
const closeReviewModalBtns = reviewModal.querySelectorAll(".close-modal-btn");
const reviewForm = document.getElementById("doc-review-form");
const viewBtnInReview = document.getElementById("doc-modal-view-btn");

window.openDocumentReviewModal = function (studentReg, docId) {
    const students = getStudents();
    const student = students.find(s => s.regNo === studentReg);
    if (!student) return;

    const doc = student.documents[docId] || { status: "Belum Dihantar", fileName: "", fileSize: "", uploadDate: "", feedback: "" };
    resolveGoogleDriveUrl(doc);
    const docMeta = getDocMetadata(docId, student);
    if (doc.status === "Belum Dihantar" && !docMeta.isPhysical) {
        showToast("Pelajar belum memuat naik fail dokumen ini!", "error");
        return;
    }

    currentReviewContext = { studentReg, docId };

    document.getElementById("doc-modal-student-name").textContent = student.name;
    document.getElementById("doc-modal-student-reg").textContent = student.regNo;
    document.getElementById("doc-modal-doc-type").textContent = docMeta.title;
    document.getElementById("doc-modal-file-name").textContent = doc.fileName || (docMeta.isPhysical ? "(Borang Fizikal)" : "");
    document.getElementById("doc-modal-file-size").textContent = doc.fileSize ? `${doc.fileSize} • Dimuat naik pada ${doc.uploadDate}` : (docMeta.isPhysical ? "Penyerahan fizikal ke pejabat UPLI" : "");

    const badgeEl = document.getElementById("doc-modal-current-status-badge");
    badgeEl.className = "badge " + (doc.status === "Diterima" ? "badge-success" : (doc.status === "Ditolak" ? "badge-danger" : "badge-warning"));
    badgeEl.textContent = doc.status;

    document.getElementById("doc-review-status").value = doc.status === "Diterima" ? "Diterima" : (doc.status === "Ditolak" ? "Ditolak" : "Diterima");
    document.getElementById("doc-review-feedback").value = doc.feedback || "";

    const dlLink = document.getElementById("doc-modal-download-link");
    const fileSource = doc.fileUrl || doc.fileData || "";
    if (docMeta.isPhysical) {
        dlLink.style.display = "none";
    } else {
        dlLink.style.display = "inline-flex";
        if (fileSource) {
            dlLink.href = fileSource;
            if (doc.fileUrl) {
                dlLink.removeAttribute("download");
                dlLink.setAttribute("target", "_blank");
            } else {
                dlLink.setAttribute("download", doc.fileName);
            }
        } else {
            dlLink.removeAttribute("download");
            dlLink.href = "#";
            dlLink.onclick = function (e) { e.preventDefault(); showToast("Fail dimuat turun (Simulasi)", "success"); };
        }
    }

    const submitBtn = document.getElementById("btn-submit-review");
    const statusSelect = document.getElementById("doc-review-status");
    const feedbackText = document.getElementById("doc-review-feedback");

    if (currentRole === "lecturer") {
        if (statusSelect) statusSelect.disabled = true;
        if (feedbackText) {
            feedbackText.disabled = true;
            feedbackText.placeholder = "Hanya Admin UPLI sahaja yang dibenarkan untuk menghantar keputusan dan memberikan ulasan.";
        }
        if (submitBtn) submitBtn.style.display = "none";
    } else {
        if (statusSelect) statusSelect.disabled = false;
        if (feedbackText) {
            feedbackText.disabled = false;
            feedbackText.placeholder = "Sila berikan ulasan jika dokumen ditolak, atau tinggalkan ulasan positif jika diluluskan...";
        }
        if (submitBtn) submitBtn.style.display = "block";
    }

    const previewBox = document.getElementById("doc-modal-preview-box");

    // Async helper to render preview after loading
    async function renderPreview() {
        if (docMeta.isPhysical) {
            previewBox.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px; text-align:center; background: rgba(99,102,241,0.02); border: 2px dashed var(--border-color); border-radius:12px; height:100%; min-height: 250px; width:100%;">
                    <i class="fa-solid fa-file-invoice text-accent" style="font-size: 4rem; margin-bottom: 16px;"></i>
                    <h3 style="font-size:1.15rem; font-weight:700; margin-bottom:8px; color:var(--text-primary);">Borang Fizikal Pejabat</h3>
                    <p style="font-size:0.85rem; color:var(--text-secondary); max-width: 320px; line-height: 1.5; margin:0;">
                        Dokumen ini dihantar secara fizikal ke pejabat UPLI oleh pelajar. Sila semak penerimaan fizikal borang dan ubah keputusan di sebelah kanan untuk kelulusan.
                    </p>
                </div>
            `;
            return;
        }

        // Load from Firestore file_data if needed
        if (!doc.fileUrl && !doc.fileData && doc.fileRef) {
            previewBox.innerHTML = `<div style="text-align:center; padding:20px;"><div style="width:32px;height:32px;border:3px solid rgba(99,102,241,0.2);border-top:3px solid #6366f1;border-radius:50%;animation:db-spin 0.8s linear infinite;margin:0 auto 10px;"></div><p style="font-size:0.8rem;color:var(--text-muted);">Memuatkan fail...</p></div>`;
            const loaded = await loadFileFromFirestore(studentReg, docId);
            if (loaded) doc.fileData = loaded;
        }

        previewBox.innerHTML = "";
        const fs = doc.fileUrl || doc.fileData || "";
        if (fs && fs.trim() !== "") {
            if (doc.fileUrl) {
                const isImage = doc.fileName && /\.(png|jpg|jpeg)$/i.test(doc.fileName);
                if (isImage) {
                    previewBox.innerHTML = `<img src="${doc.fileUrl}" alt="Fail Dokumen" style="max-width:100%; height:auto; border-radius:4px; box-shadow:0 2px 8px rgba(0,0,0,0.15);">`;
                } else {
                    previewBox.innerHTML = `<iframe src="${doc.fileUrl}" style="width:100%; height:350px; border:1px solid var(--border-color); border-radius:6px;"></iframe>`;
                }
            } else if (doc.fileData) {
                if (doc.fileData.startsWith("data:image/")) {
                    previewBox.innerHTML = `<img src="${doc.fileData}" alt="Fail Dokumen" style="max-width:100%; height:auto; border-radius:4px; box-shadow:0 2px 8px rgba(0,0,0,0.15);">`;
                } else if (doc.fileData.startsWith("data:application/pdf") || (doc.fileName && doc.fileName.toLowerCase().endsWith(".pdf"))) {
                    const blobUrl = dataURLtoBlobURL(doc.fileData);
                    previewBox.innerHTML = `<iframe src="${blobUrl}" style="width:100%; height:350px; border:1px solid var(--border-color); border-radius:6px; background:#fff;"></iframe>`;
                } else {
                    previewBox.innerHTML = `<div style="text-align:center; padding:20px;"><i class="fa-solid fa-file-invoice text-accent" style="font-size:3rem;"></i><p style="margin-top:8px;">Fail tidak dapat dipaparkan secara langsung.</p></div>`;
                }
            }
            // Also update download link now that fileData is loaded
            if (doc.fileData && !fileSource) {
                dlLink.href = doc.fileData;
                dlLink.setAttribute("download", doc.fileName);
            }
        }
    }
    renderPreview();

    viewBtnInReview.onclick = function () {
        openDocumentViewer(studentReg, docId);
    };

    reviewModal.classList.add("active");
};

closeReviewModalBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        reviewModal.classList.remove("active");
        currentReviewContext = null;
        clearPreviewBlobUrls();
    });
});

reviewForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (currentRole !== "admin") {
        showToast("Hanya Admin UPLI sahaja yang dibenarkan untuk menghantar keputusan semakan!", "error");
        return;
    }
    if (!currentReviewContext) return;

    const { studentReg, docId } = currentReviewContext;
    const status = document.getElementById("doc-review-status").value;
    const feedback = document.getElementById("doc-review-feedback").value.trim();

    const now = new Date();
    const formattedTime = now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, '0') + "-" +
        String(now.getDate()).padStart(2, '0') + " " +
        String(now.getHours()).padStart(2, '0') + ":" +
        String(now.getMinutes()).padStart(2, '0');

    const students = getStudents();
    const studentIdx = students.findIndex(s => s.regNo === studentReg);

    if (studentIdx !== -1) {
        if (!students[studentIdx].documents) {
            students[studentIdx].documents = {};
        }
        if (!students[studentIdx].documents[docId]) {
            students[studentIdx].documents[docId] = {
                status: "Belum Dihantar",
                fileName: "(Hantaran Fizikal)",
                fileSize: "-",
                uploadDate: formattedTime,
                feedback: ""
            };
        }
        students[studentIdx].documents[docId].status = status;
        students[studentIdx].documents[docId].feedback = feedback;

        saveStudents(students, studentReg);
        addLog("info", `Semakan [${status}] diberikan kepada ${students[studentIdx].name} bagi dokumen ${getDocMetadata(docId, students[studentIdx]).title}`);

        showToast("Semakan dokumen berjaya dikemas kini!", "success");
        reviewModal.classList.remove("active");
        currentReviewContext = null;

        if (currentRole === "lecturer") {
            renderLecturerDashboard();
            renderLecturerStudentsList();
        } else if (currentRole === "admin") {
            renderAdminDashboard();
            renderAdminStudentsTable();
        }
    }
});

// --------------------------------------------------------------------------
// J. PREMIUM DOCUMENT VIEWER MODAL LOGIC (SIMULATED RENDER)
// --------------------------------------------------------------------------
const viewerModal = document.getElementById("document-viewer-modal");
const closeViewerBtns = viewerModal.querySelectorAll(".close-viewer-btn");
const renderedView = document.getElementById("document-rendered-view");

window.openDocumentViewer = async function (studentReg, docId) {
    const students = getStudents();
    const student = students.find(s => s.regNo === studentReg);
    if (!student) return;

    const doc = student.documents[docId];
    if (doc) resolveGoogleDriveUrl(doc);
    if (!doc || doc.status === "Belum Dihantar") {
        showToast("Dokumen tidak wujud!", "error");
        return;
    }

    renderedView.innerHTML = `<div style="text-align:center; padding:40px;"><div style="width:40px;height:40px;border:3px solid rgba(99,102,241,0.2);border-top:3px solid #6366f1;border-radius:50%;animation:db-spin 0.8s linear infinite;margin:0 auto 12px;"></div><p style="font-size:0.85rem;color:var(--text-muted);">Memuatkan dokumen...</p></div>`;
    viewerModal.classList.add("active");

    // Load fileData from Firestore file_data collection if needed
    if (!doc.fileUrl && !doc.fileData && doc.fileRef) {
        const loaded = await loadFileFromFirestore(studentReg, docId);
        if (loaded) doc.fileData = loaded;
    }

    renderedView.innerHTML = "";

    // Priority 1: Show actual uploaded file (Firebase Storage URL or base64)
    const fileSource = doc.fileUrl || doc.fileData || "";
    if (fileSource && fileSource.trim() !== "") {
        const isImage = doc.fileName && /\.(png|jpg|jpeg)$/i.test(doc.fileName);
        const isPDF = doc.fileName && doc.fileName.toLowerCase().endsWith(".pdf");

        if (doc.fileUrl) {
            // Firebase Storage URL — embed directly
            if (isImage) {
                renderedView.innerHTML = `<img src="${doc.fileUrl}" style="max-width:100%; height:auto; box-shadow:0 0 10px rgba(0,0,0,0.1); border-radius:4px;" alt="Fail Pelajar">`;
            } else {
                renderedView.innerHTML = `
                    <div style="display:flex; flex-direction:column; align-items:center; gap:12px; width:100%;">
                        <div style="font-size:0.8rem; color:var(--text-muted); text-align:center;">
                            <i class="fa-solid fa-file-pdf" style="font-size:1.5rem; color:#ef4444; margin-bottom:4px;"></i><br>
                            ${doc.fileName}
                        </div>
                        <iframe src="${doc.fileUrl}" style="width:100%; height:600px; border:1px solid var(--border-color); border-radius:6px; background:#fff;"></iframe>
                        <a href="${doc.fileUrl}" target="_blank" class="btn btn-primary btn-sm" style="gap:6px;">
                            <i class="fa-solid fa-external-link-alt"></i> Buka dalam Tab Baharu
                        </a>
                    </div>
                `;
            }
        } else if (doc.fileData) {
            // Legacy base64
            if (doc.fileData.startsWith("data:image/")) {
                renderedView.innerHTML = `<img src="${doc.fileData}" style="max-width:100%; height:auto; box-shadow:0 0 10px rgba(0,0,0,0.1); border-radius:4px;" alt="Fail Pelajar">`;
            } else if (isPDF || doc.fileData.startsWith("data:application/pdf")) {
                const blobUrl = dataURLtoBlobURL(doc.fileData);
                renderedView.innerHTML = `
                    <div style="display:flex; flex-direction:column; align-items:center; gap:12px; width:100%;">
                        <div style="font-size:0.8rem; color:var(--text-muted); text-align:center;">
                            <i class="fa-solid fa-file-pdf" style="font-size:1.5rem; color:#ef4444; margin-bottom:4px;"></i><br>
                            ${doc.fileName}
                        </div>
                        <iframe src="${blobUrl}" style="width:100%; height:600px; border:1px solid var(--border-color); border-radius:6px; background:#fff;"></iframe>
                        <a href="${doc.fileData}" download="${doc.fileName}" class="btn btn-primary btn-sm" style="gap:6px;">
                            <i class="fa-solid fa-download"></i> Muat Turun PDF
                        </a>
                    </div>
                `;
            } else {
                renderedView.innerHTML = `
                    <div style="text-align:center; padding:40px 20px;">
                        <i class="fa-solid fa-file-arrow-down" style="font-size:3rem; color:var(--color-primary); margin-bottom:12px;"></i>
                        <h4 style="margin-bottom:6px;">${doc.fileName}</h4>
                        <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:20px;">Fail ini tidak boleh dipaparkan secara langsung.</p>
                        <a href="${doc.fileData}" download="${doc.fileName}" class="btn btn-primary" style="gap:6px;">
                            <i class="fa-solid fa-download"></i> Muat Turun Fail
                        </a>
                    </div>
                `;
            }
        }
    }
    else {
        let contentHTML = "";

        const letterheadHTML = `
            <div class="polikk-letterhead">
                <div class="letterhead-logo-sim">PKK</div>
                <div class="letterhead-text">
                    <h2>Politeknik Kota Kinabalu (POLIKK)</h2>
                    <p>Unit Perhubungan & Latihan Industri (UPLI) • Beg Berkunci No 1, 88450 Menggatal, Sabah</p>
                    <p>Tel: 088-499900 • Faks: 088-499960 • Portal: polikk.edu.my</p>
                </div>
            </div>
        `;

        const meta = getDocMetadata(docId, student);

        if (docId === "borang_jawapan") {
            contentHTML = `
                ${letterheadHTML}
                <div style="font-size:0.8rem; line-height:1.6; color:#0f172a; margin-top:20px;">
                    <p style="text-align:right;">Tarikh: ${doc.uploadDate || '18 Jun 2026'}</p>
                    <h3 style="text-align:center; font-family:'Outfit'; font-weight:800; text-transform:uppercase; margin-bottom:20px;">BORANG JAWAPAN PENERIMAAN LATIHAN INDUSTRI</h3>
                    <p>Kepada Unit UPLI POLIKK,</p>
                    <p>Syarikat kami bersetuju menerima pelajar berikut untuk menjalani Latihan Industri:</p>
                    <table style="width:100%; border-collapse:collapse; margin:16px 0; font-size:0.8rem;">
                        <tr><td style="padding:4px; font-weight:700; width:150px;">Nama Pelajar:</td><td style="padding:4px;">${student.name}</td></tr>
                        <tr><td style="padding:4px; font-weight:700;">No. Pendaftaran:</td><td style="padding:4px;">${student.regNo}</td></tr>
                        <tr><td style="padding:4px; font-weight:700;">Jabatan:</td><td style="padding:4px;">${student.jabatan}</td></tr>
                        <tr><td style="padding:4px; font-weight:700;">Tempat Latihan:</td><td style="padding:4px;">${student.tempatLI || 'Syarikat Industri'}</td></tr>
                    </table>
                    <br>
                    <p>Yang benar,<br><br><strong>(COP & TANDATANGAN ORGANISASI)</strong></p>
                </div>
            `;
        }
        else if (docId === "skop_kerja") {
            contentHTML = `
                ${letterheadHTML}
                <div style="font-size:0.8rem; line-height:1.6; color:#0f172a; margin-top:20px;">
                    <h3 style="text-align:center; font-family:'Outfit'; font-weight:800; text-transform:uppercase; margin-bottom:20px;">SENARAI SKOP KERJA LATIHAN INDUSTRI</h3>
                    <table style="width:100%; border-collapse:collapse; margin:16px 0; font-size:0.8rem;">
                        <tr><td style="padding:4px; font-weight:700; width:150px;">Nama Pelajar:</td><td style="padding:4px;">${student.name}</td></tr>
                        <tr><td style="padding:4px; font-weight:700;">Tempat Latihan:</td><td style="padding:4px;">${student.tempatLI || 'Syarikat Industri'}</td></tr>
                    </table>
                    <p><strong>Ringkasan Skop Kerja Tugasan Industri:</strong></p>
                    <ul style="padding-left:20px; font-size:0.8rem; margin-top:8px;">
                        <li>Melakukan analisis keperluan sistem dan reka bentuk pangkalan data.</li>
                        <li>Membangunkan modul aplikasi web menggunakan kerangka Javascript dan CSS.</li>
                        <li>Menguji kebolehgunaan aplikasi dan membaiki sebarang pepijat (debugging).</li>
                        <li>Menyusun laporan mingguan dan menyerahkannya kepada penyelia industri.</li>
                    </ul>
                </div>
            `;
        }
        else if (docId === "lapor_diri") {
            contentHTML = `
                ${letterheadHTML}
                <div style="font-size:0.8rem; line-height:1.6; color:#0f172a; margin-top:20px;">
                    <h3 style="text-align:center; font-family:'Outfit'; font-weight:800; text-transform:uppercase; margin-bottom:20px;">KAD PENGESAHAN LAPOR DIRI</h3>
                    <p>Adalah disahkan bahawa pelajar berikut telah melapor diri di organisasi kami:</p>
                    <table style="width:100%; border-collapse:collapse; margin:16px 0; font-size:0.8rem;">
                        <tr><td style="padding:4px; font-weight:700; width:150px;">Nama Pelajar:</td><td style="padding:4px;">${student.name}</td></tr>
                        <tr><td style="padding:4px; font-weight:700;">No. Pendaftaran:</td><td style="padding:4px;">${student.regNo}</td></tr>
                        <tr><td style="padding:4px; font-weight:700;">Tarikh Lapor Diri:</td><td style="padding:4px;">${doc.uploadDate || '20 Julai 2026'}</td></tr>
                        <tr><td style="padding:4px; font-weight:700;">Nama Penyelia:</td><td style="padding:4px;">Penyelia Industri Organisasi</td></tr>
                    </table>
                </div>
            `;
        }
        else if (docId === "weekly_reflections") {
            contentHTML = `
                ${letterheadHTML}
                <div style="text-align:center; margin-bottom:14px;">
                    <h3 style="font-family:'Outfit'; font-weight:800; text-transform:uppercase;">Refleksi Mingguan Latihan Industri (Weekly Reflections)</h3>
                    <p style="font-size:0.75rem; color:#475569;">Laporan Tugasan Ringkas Pelajar (Minima 20 Muka Surat) • Sesi: ${student.sesi}</p>
                </div>
                <div style="border:1px solid #cbd5e1; border-radius:6px; padding:20px; font-size:0.8rem; background:rgba(255,255,255,0.01);">
                    <p><strong>Refleksi Utama Pelajar:</strong></p>
                    <p style="margin-top:8px; line-height:1.6; color:#334155;">
                        Sepanjang 20 minggu menjalani Latihan Industri di <strong>${student.tempatLI || 'Syarikat Industri'}</strong>, saya telah berjaya meningkatkan kemahiran pengaturcaraan serta kemahiran komunikasi profesional. Laporan setebal 20 muka surat ini merangkumi keseluruhan refleksi mingguan saya bagi setiap tugasan teknikal yang telah diamanahkan kepada saya oleh penyelia industri.
                    </p>
                </div>
            `;
        }
        else if (docId === "laporan_akhir") {
            contentHTML = `
                <div style="display:flex; flex-direction:column; justify-content:space-between; align-items:center; height:850px; padding:30px 0; border:1px solid #e2e8f0; border-radius:4px; box-sizing:border-box;">
                    <div style="text-align:center; font-family:'Outfit';">
                        <h4 style="font-size:1.15rem; font-weight:800; text-transform:uppercase; color:#0f172a; letter-spacing:1px;">LAPORAN AKHIR LATIHAN INDUSTRI (UPLI)</h4>
                        <p style="font-size:0.75rem; color:#64748b; margin-top:4px;">KOD KURSUS: DUT50110 - INDUSTRIAL TRAINING REPORT</p>
                    </div>
                    
                    <div style="text-align:center; margin:60px 0;">
                        <div style="width:90px; height:90px; background:#0f172a; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:2.2rem; font-weight:800; margin:0 auto 20px auto;">PKK</div>
                        <h3 style="font-size:1.25rem; font-weight:800; text-transform:uppercase; width:450px; margin:0 auto; line-height:1.4;">${meta.title}</h3>
                        <p style="font-size:0.8rem; color:#475569; margin-top:8px; text-transform:uppercase;">Tempat Latihan: ${student.tempatLI || 'Syarikat Industri'}</p>
                    </div>
                    
                    <div style="text-align:center; line-height:1.8; font-size:0.85rem;">
                        <p>Disediakan Oleh:</p>
                        <h4 style="font-size:1.1rem; font-weight:800; text-transform:uppercase; border-bottom:1px solid #cbd5e1; padding-bottom:4px; width:300px; margin:0 auto;">${student.name}</h4>
                        <p style="font-size:0.75rem; color:#475569;">NO. PENDAFTARAN: ${student.regNo}</p>
                        <p style="font-size:0.75rem; color:#475569;">JABATAN: ${student.jabatan}</p>
                        <p style="font-size:0.75rem; color:#475569;">SESI: ${student.sesi}</p>
                    </div>
                    
                    <div style="text-align:center; font-size:0.75rem; color:#64748b;">
                        SESI PENILAIAN LATIHAN INDUSTRI POLIKK
                    </div>
                </div>
            `;
        }
        else {
            // Generic default document template
            contentHTML = `
                ${letterheadHTML}
                <div style="font-size:0.8rem; line-height:1.6; color:#0f172a; margin-top:20px; text-align:center;">
                    <i class="fa-solid fa-file-shield" style="font-size:3.5rem; color:var(--color-primary); margin-bottom:15px;"></i>
                    <h3 style="font-family:'Outfit'; font-weight:800; text-transform:uppercase; margin-bottom:8px;">${meta.title}</h3>
                    <p style="color:#64748b; max-width:400px; margin:0 auto 20px auto;">${meta.desc || 'Fail dokumen latihan industri rasmi yang dimuat naik oleh pelajar.'}</p>
                    
                    <div style="background:rgba(0,0,0,0.02); border:1px solid var(--border-color); border-radius:8px; padding:15px; max-width:450px; margin:0 auto; text-align:left;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.8rem;">
                            <tr><td style="padding:4px; font-weight:700; width:120px;">Pelajar:</td><td style="padding:4px;">${student.name}</td></tr>
                            <tr><td style="padding:4px; font-weight:700;">No. Matrik:</td><td style="padding:4px;">${student.regNo}</td></tr>
                            <tr><td style="padding:4px; font-weight:700;">Jabatan:</td><td style="padding:4px;">${student.jabatan}</td></tr>
                            <tr><td style="padding:4px; font-weight:700;">Fail Dokumen:</td><td style="padding:4px;"><code>${doc.fileName}</code></td></tr>
                            <tr><td style="padding:4px; font-weight:700;">Tarikh Hantar:</td><td style="padding:4px;">${doc.uploadDate}</td></tr>
                        </table>
                    </div>
                </div>
            `;
        }

        renderedView.innerHTML = contentHTML;
    }

    // Modal already opened at start (async loading pattern)
};

closeViewerBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        viewerModal.classList.remove("active");
        clearPreviewBlobUrls();
    });
});


// --------------------------------------------------------------------------
// K. ADMIN MODULE
// --------------------------------------------------------------------------

// Switch Admin Dashboard Department Tabs
document.querySelectorAll("#admin-dashboard-dept-tabs .dept-tab-btn").forEach(btn => {
    btn.addEventListener("click", function () {
        document.querySelectorAll("#admin-dashboard-dept-tabs .dept-tab-btn").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        activeAdminDept = this.dataset.dept;
        renderAdminDashboard();
    });
});

// Switch Admin Students Management Department Tabs
document.querySelectorAll("#admin-students-dept-tabs .dept-tab-btn").forEach(btn => {
    btn.addEventListener("click", function () {
        document.querySelectorAll("#admin-students-dept-tabs .dept-tab-btn").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        activeAdminStudentDept = this.dataset.dept;
        // Update import label to reflect new active dept
        const importLabel = document.getElementById("import-target-dept-label");
        if (importLabel) importLabel.textContent = activeAdminStudentDept;
        renderAdminStudentsTable();
    });
});

// Switch Admin Lecturer Assignment Department Tabs
document.querySelectorAll("#admin-assign-dept-tabs .dept-tab-btn").forEach(btn => {
    btn.addEventListener("click", function () {
        document.querySelectorAll("#admin-assign-dept-tabs .dept-tab-btn").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        activeAdminAssignDept = this.dataset.dept;
        renderAdminLecturerAssignTable();
    });
});

// Switch Admin PA Assignment Department Tabs
document.querySelectorAll("#admin-pa-dept-tabs .dept-tab-btn").forEach(btn => {
    btn.addEventListener("click", function () {
        document.querySelectorAll("#admin-pa-dept-tabs .dept-tab-btn").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        activeAdminPADept = this.dataset.dept;
        renderAdminPATable();
    });
});

function renderAdminDashboard() {
    if (currentRole !== "admin") return;

    // Destroy existing charts to prevent memory leaks and context conflicts
    if (window.adminDeptCharts && window.adminDeptCharts.length > 0) {
        window.adminDeptCharts.forEach(c => c.destroy());
    }
    window.adminDeptCharts = [];

    const students = getStudents();
    const admins = getAdmins();
    const activeSesi = getActiveSession();

    applyDeptTheme(activeAdminDept);

    // Filter students strictly by active session
    let currentSessionStudents = students.filter(s => isStudentInSession(s, activeSesi));

    // Total stats update (filtered by academic session for students)
    document.getElementById("admin-total-students").textContent = currentSessionStudents.length;
    document.getElementById("admin-total-admins").textContent = admins.length;

    // Count students with ALL documents "Diterima" (complete folder)
    const completeCount = currentSessionStudents.filter(s => {
        const requiredDocs = getStudentDocsList(s);
        return requiredDocs.length > 0 && requiredDocs.every(d => {
            const doc = s.documents[d.id];
            return doc && doc.status === "Diterima";
        });
    }).length;
    const completeEl = document.getElementById("admin-stat-complete");
    if (completeEl) completeEl.textContent = completeCount;

    // Count total documents with status "Dalam Semakan"
    let pendingCount = 0;
    currentSessionStudents.forEach(s => {
        const requiredDocs = getStudentDocsList(s);
        requiredDocs.forEach(d => {
            const doc = s.documents[d.id];
            if (doc && doc.status === "Dalam Semakan") {
                pendingCount++;
            }
        });
    });
    const pendingEl = document.getElementById("admin-stat-pending");
    if (pendingEl) pendingEl.textContent = pendingCount;

    // Setup department configs
    const depts = [
        {
            code: "JKA",
            name: "Jabatan Kejuruteraan Awam",
            icon: "fa-solid fa-mountain-city",
            color: "#6366f1",
            glow: "rgba(99, 102, 241, 0.1)",
            programs: ["DKA", "DUB", "DBK"]
        },
        {
            code: "JKE",
            name: "Jabatan Kejuruteraan Elektrik",
            icon: "fa-solid fa-bolt",
            color: "#f59e0b",
            glow: "rgba(245, 158, 11, 0.1)",
            programs: ["DEE", "DEP", "DTK"]
        },
        {
            code: "JKM",
            name: "Jabatan Kejuruteraan Mekanikal",
            icon: "fa-solid fa-gears",
            color: "#3b82f6",
            glow: "rgba(59, 130, 246, 0.1)",
            programs: ["DKM", "DTP", "DEM"]
        },
        {
            code: "JP",
            name: "Jabatan Perdagangan",
            icon: "fa-solid fa-chart-line",
            color: "#10b981",
            glow: "rgba(16, 185, 129, 0.1)",
            programs: ["DPR", "DLS", "DAT"]
        },
        {
            code: "JPH",
            name: "Jabatan Pelancongan & Hospitaliti",
            icon: "fa-solid fa-utensils",
            color: "#ec4899",
            glow: "rgba(236, 72, 153, 0.1)",
            programs: ["DHR", "DHM", "KOK"]
        }
    ];

    const grid = document.getElementById("admin-departments-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const DEPT_COLORS = {
        JKA: "#10b981",
        JKE: "#f43f5e",
        JKM: "#facc15",
        JP: "#3b82f6",
        JPH: "#8b5cf6"
    };
    const chartData = [];

    depts.forEach(d => {
        // Robust department matching by code, full name or program prefix
        const deptStudents = currentSessionStudents.filter(s => {
            const dept = (s.jabatan || "").toUpperCase().trim();
            if (dept === d.code) return true;
            if (d.code === "JKA" && (dept.includes("AWAM") || dept.includes("CIVIL") || dept.includes("JKA"))) return true;
            if (d.code === "JKE" && (dept.includes("ELEKTRIK") || dept.includes("ELECTRICAL") || dept.includes("JKE"))) return true;
            if (d.code === "JKM" && (dept.includes("MEKANIKAL") || dept.includes("MECHANICAL") || dept.includes("JKM"))) return true;
            if (d.code === "JP"  && (dept.includes("PERDAGANGAN") || dept === "JP")) return true;
            if (d.code === "JPH" && (dept.includes("HOSPITALITI") || dept.includes("PELANCONGAN") || dept === "JPH")) return true;
            const prog = getStudentProgram(s);
            return d.programs.includes(prog);
        });

        let deptCompleteCount = 0;
        deptStudents.forEach(s => {
            const requiredDocs = getStudentDocsList(s);
            const isComplete = requiredDocs.length > 0 && requiredDocs.every(doc => s.documents[doc.id] && s.documents[doc.id].status === "Diterima");
            if (isComplete) deptCompleteCount++;
        });

        const deptRate = deptStudents.length > 0 ? Math.round((deptCompleteCount / deptStudents.length) * 100) : 0;

        // Push data to chart dataset
        const deptColor = DEPT_COLORS[d.code] || d.color;
        chartData.push({
            code: d.code,
            name: d.name,
            color: deptColor,
            total: deptStudents.length,
            complete: deptCompleteCount,
            rate: deptRate
        });

        let programsHTML = "";
        d.programs.forEach(prog => {
            const progStudents = deptStudents.filter(s => getStudentProgram(s) === prog);
            let progCompleteCount = 0;
            progStudents.forEach(s => {
                const requiredDocs = getStudentDocsList(s);
                const isComplete = requiredDocs.length > 0 && requiredDocs.every(doc => s.documents[doc.id] && s.documents[doc.id].status === "Diterima");
                if (isComplete) progCompleteCount++;
            });

            programsHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; padding:8px 0; border-bottom:1px dashed var(--border-color);">
                    <span style="font-weight:700; color:var(--text-primary);">${prog}</span>
                    <span style="color:var(--text-secondary); font-size:0.8rem;">
                        <strong>${progStudents.length}</strong> Pelajar 
                        <span style="color:var(--color-success); font-weight:600; margin-left:4px;">(${progCompleteCount} Lengkap)</span>
                    </span>
                </div>
            `;
        });

        const card = document.createElement("div");
        card.className = `card dept-card-animated dept-card-${d.code}`;
        card.style.cssText = "padding:20px; transition:all 0.2s; border-radius:12px; display:flex; flex-direction:column; justify-content:space-between; min-height: 290px; border:none; background: var(--bg-card);";
        card.onmouseenter = () => { card.style.transform = "translateY(-5px)"; card.style.boxShadow = "0 10px 25px rgba(0,0,0,0.3)"; };
        card.onmouseleave = () => { card.style.transform = "translateY(0)"; card.style.boxShadow = ""; };

        card.innerHTML = `
            <div>
                <!-- Header -->
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
                    <div style="width:48px; height:48px; border-radius:10px; background:${d.glow}; color:${d.color}; display:flex; align-items:center; justify-content:center; font-size:1.4rem;">
                        <i class="${d.icon}"></i>
                    </div>
                    <div>
                        <h4 style="font-family:var(--font-display); font-size:1.05rem; font-weight:700; color:var(--text-primary); line-height:1.2;">${d.code}</h4>
                        <span style="font-size:0.75rem; color:var(--text-muted);">${d.name}</span>
                    </div>
                </div>

                <!-- Rate Donut Chart & Stats (Compact Layout) -->
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px; background: rgba(255,255,255,0.25); padding: 8px 12px; border-radius: 10px;">
                    <!-- Donut Chart Container -->
                    <div style="position: relative; width: 68px; height: 68px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <canvas id="card-donut-${d.code}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></canvas>
                        <div style="font-family: var(--font-display); font-size: 0.95rem; font-weight: 800; color: #0f172a; pointer-events: none; z-index: 2;">
                            ${deptRate}%
                        </div>
                    </div>
                    <!-- Stats Text -->
                    <div>
                        <span style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(15, 23, 42, 0.65);">Kadar Siap</span>
                        <h3 style="font-family: var(--font-display); font-size: 1.2rem; font-weight: 800; color: #0f172a; margin: 0;">${deptRate}%</h3>
                        <span style="font-size: 0.7rem; color: rgba(15, 23, 42, 0.65); font-weight: 600;">${deptCompleteCount} / ${deptStudents.length} Lengkap</span>
                    </div>
                </div>
                
                <!-- Programs List -->
                <div style="display:flex; flex-direction:column; gap:0;">
                    ${programsHTML}
                </div>
            </div>
        `;
        grid.appendChild(card);

        // Render compact donut chart inside the card
        const cardCanvas = document.getElementById(`card-donut-${d.code}`);
        if (cardCanvas) {
            const cardCtx = cardCanvas.getContext("2d");
            const completed = deptCompleteCount;
            const remaining = deptStudents.length > 0 ? (deptStudents.length - deptCompleteCount) : 1;
            
            const cardChart = new Chart(cardCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Lengkap', 'Belum Lengkap'],
                    datasets: [{
                        data: deptStudents.length > 0 ? [completed, remaining] : [0, 1],
                        backgroundColor: deptStudents.length > 0 ? ['#0f172a', 'rgba(15, 23, 42, 0.12)'] : ['rgba(15, 23, 42, 0.12)', 'rgba(15, 23, 42, 0.12)'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '72%',
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    }
                }
            });
            adminDeptCharts.push(cardChart);
        }
    });

    const cardGrid = document.getElementById("admin-departments-grid");
    if (cardGrid) cardGrid.style.display = "grid";
}


// --- CSV/Excel File Import Parser ---
const excelUploadZone = document.getElementById("excel-upload-zone");
const excelFileInput = document.getElementById("excel-file-input");

excelUploadZone.addEventListener("click", () => excelFileInput.click());

excelFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();

    reader.onload = function (evt) {
        try {
            let results = [];
            if (isExcel) {
                if (typeof XLSX === "undefined") {
                    throw new Error("Library parsing Excel (SheetJS) gagal dimuatkan. Sila pastikan anda mempunyai sambungan internet yang aktif atau tukar format fail anda kepada .csv!");
                }
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                results = parseExcelRows(rows);
            } else {
                const textContent = evt.target.result;
                results = parseCSV(textContent);
            }

            if (results.length === 0) {
                showToast("Muat naik Gagal: Format fail salah atau tiada data ditemui!", "error");
                return;
            }

            const students = getStudents();
            const activeSesi = getActiveSession();
            let countImported = 0;
            let countDuplicates = 0;

            const lecturers = getLecturers();
            const modifiedRegNos = [];

            results.forEach(s => {
                const dupIdx = students.findIndex(exist => exist.regNo === s.regNo);

                // Session resolution: Use Sesi column from CSV/Excel if exists, else fallback to active session dropdown
                const sessionValue = s.sesi || activeSesi;

                // Resolve lecturer names from database if empty in CSV
                let resolvedPemantauName = s.pensyarahPemantauName || "";
                if (!resolvedPemantauName && s.pensyarahPemantau) {
                    const found = lecturers.find(l => l.email === s.pensyarahPemantau);
                    if (found) resolvedPemantauName = found.name;
                }

                let resolvedPenilaiName = s.pensyarahPenilaiName || "";
                if (!resolvedPenilaiName && s.pensyarahPenilai) {
                    const found = lecturers.find(l => l.email === s.pensyarahPenilai);
                    if (found) resolvedPenilaiName = found.name;
                }

                let resolvedPenasihatName = s.penasihatAkademikName || "";
                if (!resolvedPenasihatName && s.penasihatAkademik) {
                    const found = lecturers.find(l => l.email === s.penasihatAkademik);
                    if (found) resolvedPenasihatName = found.name;
                }

                const studentObj = {
                    name: s.name,
                    regNo: s.regNo,
                    email: s.email || `${s.regNo.toLowerCase()}@student.com`,
                    class: s.class || "",
                    jabatan: s.jabatan || activeAdminStudentDept,
                    tempatLI: s.tempatLI || "Belum Ditentukan",
                    daerah: s.daerah || "",
                    pensyarahPemantau: s.pensyarahPemantau || "",
                    pensyarahPemantauName: resolvedPemantauName,
                    pensyarahPenilai: s.pensyarahPenilai || "",
                    pensyarahPenilaiName: resolvedPenilaiName,
                    penasihatAkademik: s.penasihatAkademik || "",
                    penasihatAkademikName: resolvedPenasihatName,
                    sesi: sessionValue,
                    role: "student",
                    documents: {}
                };

                // Build documents using the correct category-based schema
                const requiredDocs = getStudentDocsList(studentObj);
                requiredDocs.forEach(d => {
                    studentObj.documents[d.id] = {
                        status: "Belum Dihantar",
                        fileName: "",
                        fileSize: "",
                        uploadDate: "",
                        feedback: "",
                        fileData: ""
                    };
                });

                if (dupIdx === -1) {
                    students.push(studentObj);
                    modifiedRegNos.push(studentObj.regNo);
                    countImported++;
                } else {
                    const exist = students[dupIdx];
                    let isChanged = false;
                    
                    if (exist.name !== s.name) { exist.name = s.name; isChanged = true; }
                    
                    const targetTempat = s.tempatLI || exist.tempatLI;
                    if (exist.tempatLI !== targetTempat) { exist.tempatLI = targetTempat; isChanged = true; }
                    
                    const targetDaerah = s.daerah || exist.daerah;
                    if (exist.daerah !== targetDaerah) { exist.daerah = targetDaerah; isChanged = true; }
                    
                    const targetPemantau = s.pensyarahPemantau || exist.pensyarahPemantau;
                    if (exist.pensyarahPemantau !== targetPemantau) { exist.pensyarahPemantau = targetPemantau; isChanged = true; }
                    
                    const targetPemantauName = resolvedPemantauName || exist.pensyarahPemantauName;
                    if (exist.pensyarahPemantauName !== targetPemantauName) { exist.pensyarahPemantauName = targetPemantauName; isChanged = true; }
                    
                    const targetPenilai = s.pensyarahPenilai || exist.pensyarahPenilai;
                    if (exist.pensyarahPenilai !== targetPenilai) { exist.pensyarahPenilai = targetPenilai; isChanged = true; }
                    
                    const targetPenilaiName = resolvedPenilaiName || exist.pensyarahPenilaiName;
                    if (exist.pensyarahPenilaiName !== targetPenilaiName) { exist.pensyarahPenilaiName = targetPenilaiName; isChanged = true; }
                    
                    const targetPenasihat = s.penasihatAkademik || exist.penasihatAkademik;
                    if (exist.penasihatAkademik !== targetPenasihat) { exist.penasihatAkademik = targetPenasihat; isChanged = true; }
                    
                    const targetPenasihatName = resolvedPenasihatName || exist.penasihatAkademikName;
                    if (exist.penasihatAkademikName !== targetPenasihatName) { exist.penasihatAkademikName = targetPenasihatName; isChanged = true; }

                    const targetJabatan = s.jabatan || activeAdminStudentDept;
                    if (exist.jabatan !== targetJabatan) { exist.jabatan = targetJabatan; isChanged = true; }
                    
                    const targetEmail = s.email || exist.email;
                    if (exist.email !== targetEmail) { exist.email = targetEmail; isChanged = true; }
                    
                    if (exist.sesi !== sessionValue) { exist.sesi = sessionValue; isChanged = true; }
                    
                    if (isChanged) {
                        modifiedRegNos.push(exist.regNo);
                    }
                    countDuplicates++;
                }
            });

            saveStudents(students, modifiedRegNos);
            addLog("success", `Admin memuat naik fail Excel/CSV: ${countImported} pelajar baharu didaftarkan, ${countDuplicates} rekod dikemaskini.`);

            // ── SERTA-MERTA: Kemas kini dbCache & localStorage supaya paparan terus ada ──
            // (saveStudents sudah tulis ke dbCache, pastikan cache timestamp dikemas kini
            //  supaya SWR tahu ini adalah data "segar" dari sumber tempatan)
            try {
                localStorage.setItem("upli_students", JSON.stringify(dbCache.students));
                localStorage.setItem("upli_cache_ts", String(Date.now()));
            } catch(e) {}

            // ── Auto-sync sesi daripada fail CSV ke dropdown & sesi aktif ──────────────
            const csvSessions = [...new Set(results.map(r => r.sesi).filter(Boolean))];
            if (csvSessions.length > 0) {
                const targetSesi = csvSessions[0].trim();
                saveActiveSession(targetSesi);
            }
            populateGlobalSessionSelect();

            // ── Auto-switch ke tab jabatan yang betul ──────────────────────────────────
            let importedDept = activeAdminStudentDept;
            if (results.length > 0) {
                // Cuba dapat jabatan dari data import (utamakan column Jabatan, fallback ke regNo)
                const firstJabatan = (results.find(r => r.jabatan) || {}).jabatan || "";
                const firstReg     = String((results.find(r => r.regNo) || {}).regNo || "").toUpperCase();

                if (firstJabatan) {
                    const j = firstJabatan.toUpperCase().trim();
                    if (j === "JKA" || j.includes("AWAM")  || j.includes("CIVIL"))       importedDept = "JKA";
                    else if (j === "JKE" || j.includes("ELEKTRIK") || j.includes("ELECTRICAL")) importedDept = "JKE";
                    else if (j === "JKM" || j.includes("MEKANIKAL") || j.includes("MECHANICAL")) importedDept = "JKM";
                    else if (j === "JP"  || j.includes("PERDAGANGAN"))                    importedDept = "JP";
                    else if (j === "JPH" || j.includes("HOSPITALITI"))                   importedDept = "JPH";
                } else if (firstReg) {
                    if      (firstReg.match(/DKA|DBK|DUB/))  importedDept = "JKA";
                    else if (firstReg.match(/DEE|DTK|DEP/))  importedDept = "JKE";
                    else if (firstReg.match(/DKM|DEM|DTP/))  importedDept = "JKM";
                    else if (firstReg.match(/DPR|DLS|DAT/))  importedDept = "JP";
                    else if (firstReg.match(/DHR|KOK|DHM/))  importedDept = "JPH";
                }
            }

            // Tetapkan jabatan aktif & kemas kini butang tab
            activeAdminStudentDept = importedDept;
            document.querySelectorAll("#admin-students-dept-tabs .dept-tab-btn").forEach(b => {
                b.classList.toggle("active", b.dataset.dept === importedDept);
            });
            const importLabel = document.getElementById("import-target-dept-label");
            if (importLabel) importLabel.textContent = activeAdminStudentDept;

            // ── SERTA-MERTA: Render jadual pelajar dengan data baru (tiada delay) ──────
            // Guna requestAnimationFrame supaya DOM dikemas kini dulu, kemudian render
            showToast(`✅ ${countImported} pelajar didaftarkan, ${countDuplicates} dikemas kini — paparan dikemas kini!`, "success");
            requestAnimationFrame(() => {
                renderAdminStudentsTable();
                renderAdminDashboard();
                renderAdminLecturerAssignTable();
            });

        } catch (err) {
            console.error("Caught error during upload:", err);
            alert("Ralat memproses fail:\n\nMessage: " + err.message + "\n\nStack:\n" + err.stack);
            if (typeof db !== 'undefined' && db.collection) {
                db.collection("client_errors").add({
                    message: "Caught: " + err.message,
                    stack: err.stack || "",
                    userAgent: navigator.userAgent,
                    timestamp: new Date()
                }).catch(e => console.warn("Fail writing error to firestore:", e));
            }
            showToast("Ralat memproses fail: " + err.message, "error");
        }
    };

    if (isExcel) {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
});

// Helper to clean leading/trailing BOM and hidden control chars
function cleanVal(str) {
    if (!str) return "";
    return String(str)
        .replace(/^[\ufeff\u200b\u00a0\u202f\u2000-\u200a\u0000-\u001F]+/g, "")
        .replace(/[\ufeff\u200b\u00a0\u202f\u2000-\u200a\u0000-\u001F]+$/g, "")
        .trim();
}

// Helper to strip leading non-alphabetic garbage characters (e.g. from encoding mismatch)
function cleanStudentName(name) {
    const val = cleanVal(name);
    // Strip leading non-alphabetic characters (keep letters, numbers, and opening parenthesis)
    return val.replace(/^[^a-zA-Z0-9\(\s]+/g, "").trim();
}

// CSV parser helper (supporting 'Sesi' column, auto delimiter, BOM cleaning, and header fallback)
function parseCSV(text) {
    if (text.startsWith('\ufeff')) {
        text = text.substring(1);
    }

    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];

    // Detect delimiter: comma or semicolon
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    const delimiter = semiCount > commaCount ? ';' : ',';

    const rawFirstCols = firstLine.split(delimiter).map(h => cleanVal(h));

    // Detect if first line is a header row (require at least 2 keyword matches to prevent false positives)
    let isHeader = false;
    const headerKeywords = ['nama', 'name', 'pendaftaran', 'reg', 'id', 'matrik', 'kelas', 'class', 'jabatan', 'dept', 'tempat', 'li', 'company', 'syarikat', 'sesi', 'session'];
    let matchCount = 0;
    for (let col of rawFirstCols) {
        const cleaned = col.toLowerCase();
        if (headerKeywords.some(keyword => cleaned.includes(keyword))) {
            matchCount++;
        }
    }
    if (matchCount >= 2) {
        isHeader = true;
    }

    let headers = [];
    let startIndex = 0;

    if (isHeader) {
        headers = rawFirstCols.map(h => h.toLowerCase());
        startIndex = 1;
    } else {
        // Default fallback order if no header row exists
        headers = ['nama', 'pendaftaran', 'tempat', 'pemantau', 'penilai', 'jabatan', 'emel', 'kelas', 'sesi'];
        startIndex = 0;
    }

    // Find column indices
    let nameIdx = headers.findIndex(h => (h.includes('nama') || h.includes('name') || h.includes('pelajar') || h.includes('student')) && !h.includes('pemantau') && !h.includes('penilai') && !h.includes('pa') && !h.includes('penasihat') && !h.includes('syarikat') && !h.includes('organisasi'));
    if (nameIdx === -1) nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('name') || h.includes('full'));

    let regIdx = headers.findIndex(h => h.includes('pendaftaran') || h.includes('reg') || h.includes('matrik') || h.includes('nokp') || h.includes('nondp'));
    if (regIdx === -1) regIdx = headers.findIndex(h => h === 'id' || /\bid\b/.test(h) || h.includes('nombor') || h.includes('no_') || h.includes('no.') || h.includes('noma'));
    if (regIdx === -1) regIdx = headers.findIndex(h => /\bno\b/.test(h) && !h.includes('bil'));

    const tempatIdx = headers.findIndex(h => h.includes('tempat') || h === 'li' || h.includes('company') || h.includes('syarikat') || h.includes('organisasi') || h.includes('tempat li'));
    const daerahIdx = headers.findIndex(h => h.includes('daerah') || h.includes('district') || h.includes('kawasan'));

    // Find all columns containing 'pemantau'
    const pemantauCols = [];
    headers.forEach((h, idx) => {
        if (h.includes('pemantau')) pemantauCols.push({ name: h, index: idx });
    });
    let namePemantauIdx = -1;
    let emailPemantauIdx = -1;
    if (pemantauCols.length === 1) {
        emailPemantauIdx = pemantauCols[0].index;
    } else if (pemantauCols.length > 1) {
        const emailCol = pemantauCols.find(c => c.name.includes('email') || c.name.includes('emel'));
        if (emailCol) {
            emailPemantauIdx = emailCol.index;
            const nameCol = pemantauCols.find(c => c.index !== emailPemantauIdx);
            if (nameCol) namePemantauIdx = nameCol.index;
        } else {
            namePemantauIdx = pemantauCols[0].index;
            emailPemantauIdx = pemantauCols[1].index;
        }
    }

    // Find all columns containing 'penilai'
    const penilaiCols = [];
    headers.forEach((h, idx) => {
        if (h.includes('penilai')) penilaiCols.push({ name: h, index: idx });
    });
    let namePenilaiIdx = -1;
    let emailPenilaiIdx = -1;
    if (penilaiCols.length === 1) {
        emailPenilaiIdx = penilaiCols[0].index;
    } else if (penilaiCols.length > 1) {
        const emailCol = penilaiCols.find(c => c.name.includes('email') || c.name.includes('emel'));
        if (emailCol) {
            emailPenilaiIdx = emailCol.index;
            const nameCol = penilaiCols.find(c => c.index !== emailPenilaiIdx);
            if (nameCol) namePenilaiIdx = nameCol.index;
        } else {
            namePenilaiIdx = penilaiCols[0].index;
            emailPenilaiIdx = penilaiCols[1].index;
        }
    }

    const jabIdx = headers.findIndex(h => h.includes('jabatan') || h.includes('dept') || h.includes('department'));
    const emailIdx = headers.findIndex(h => h.includes('emel') || h.includes('email'));
    const sesiIdx = headers.findIndex(h => h.includes('sesi') || h.includes('session') || h.includes('cohort'));

    // Find all columns containing 'penasihat', 'penasehat', 'pa', 'advisor', or 'akademik'
    const paCols = [];
    headers.forEach((h, idx) => {
        if (h.includes('penasihat') || h.includes('penasehat') || h === 'pa' || /\bpa\b/.test(h) || h.includes('advisor') || h.includes('akademik')) paCols.push({ name: h, index: idx });
    });
    let namePaIdx = -1;
    let emailPaIdx = -1;
    if (paCols.length === 1) {
        emailPaIdx = paCols[0].index;
    } else if (paCols.length > 1) {
        const emailCol = paCols.find(c => c.name.includes('email') || c.name.includes('emel'));
        if (emailCol) {
            emailPaIdx = emailCol.index;
            const nameCol = paCols.find(c => c.index !== emailPaIdx);
            if (nameCol) namePaIdx = nameCol.index;
        } else {
            namePaIdx = paCols[0].index;
            emailPaIdx = paCols[1].index;
        }
    }

    const results = [];
    for (let i = startIndex; i < lines.length; i++) {
        const cols = lines[i].split(delimiter).map(c => cleanVal(c));
        if (cols.length === 0 || cols.every(c => c === "")) continue;

        let name = "";
        let regNo = "";
        let tempatLI = "";
        let daerah = "";
        let pensyarahPemantau = "";
        let pensyarahPemantauName = "";
        let pensyarahPenilai = "";
        let pensyarahPenilaiName = "";
        let penasihatAkademik = "";
        let penasihatAkademikName = "";
        let jabatan = "";
        let email = "";
        let classVal = "";
        let sesi = "";

        if (isHeader) {
            name = (nameIdx !== -1 && cols[nameIdx]) ? cleanStudentName(cols[nameIdx]) : "";
            regNo = (regIdx !== -1 && cols[regIdx]) ? cleanVal(cols[regIdx]).toUpperCase() : "";
            tempatLI = (tempatIdx !== -1 && cols[tempatIdx]) ? cleanVal(cols[tempatIdx]) : "";
            daerah = (daerahIdx !== -1 && cols[daerahIdx]) ? cleanVal(cols[daerahIdx]) : "";
            pensyarahPemantau = (emailPemantauIdx !== -1 && cols[emailPemantauIdx]) ? cleanVal(cols[emailPemantauIdx]).toLowerCase() : "";
            pensyarahPemantauName = (namePemantauIdx !== -1 && cols[namePemantauIdx]) ? cleanVal(cols[namePemantauIdx]) : "";
            pensyarahPenilai = (emailPenilaiIdx !== -1 && cols[emailPenilaiIdx]) ? cleanVal(cols[emailPenilaiIdx]).toLowerCase() : "";
            pensyarahPenilaiName = (namePenilaiIdx !== -1 && cols[namePenilaiIdx]) ? cleanVal(cols[namePenilaiIdx]) : "";
            penasihatAkademik = (emailPaIdx !== -1 && cols[emailPaIdx]) ? cleanVal(cols[emailPaIdx]).toLowerCase() : "";
            penasihatAkademikName = (namePaIdx !== -1 && cols[namePaIdx]) ? cleanVal(cols[namePaIdx]) : "";
            jabatan = (jabIdx !== -1 && cols[jabIdx]) ? cleanVal(cols[jabIdx]).toUpperCase() : "";
            email = (emailIdx !== -1 && cols[emailIdx]) ? cleanVal(cols[emailIdx]).toLowerCase() : "";
            sesi = (sesiIdx !== -1 && cols[sesiIdx]) ? cleanVal(cols[sesiIdx]) : "";
        } else {
            // Positional fallback order when no header is present
            name = cols[0] ? cleanStudentName(cols[0]) : "";
            regNo = cols[1] ? cleanVal(cols[1]).toUpperCase() : "";
            tempatLI = cols[2] ? cleanVal(cols[2]) : "";
            if (cols.length > 9) {
                pensyarahPemantauName = cols[3] ? cleanVal(cols[3]) : "";
                pensyarahPemantau = cols[4] ? cleanVal(cols[4]).toLowerCase() : "";
                pensyarahPenilaiName = cols[5] ? cleanVal(cols[5]) : "";
                pensyarahPenilai = cols[6] ? cleanVal(cols[6]).toLowerCase() : "";
                jabatan = cols[7] ? cleanVal(cols[7]).toUpperCase() : "";
                email = cols[8] ? cleanVal(cols[8]).toLowerCase() : "";
                sesi = cols[9] ? cleanVal(cols[9]) : "";
            } else {
                pensyarahPemantau = cols[3] ? cleanVal(cols[3]).toLowerCase() : "";
                pensyarahPenilai = cols[4] ? cleanVal(cols[4]).toLowerCase() : "";
                jabatan = cols[5] ? cleanVal(cols[5]).toUpperCase() : "";
                email = cols[6] ? cleanVal(cols[6]).toLowerCase() : "";
                sesi = cols[8] ? cleanVal(cols[8]) : "";
            }
        }

        // Final fallback validation for critical missing fields
        if (!regNo) regNo = `REG-${Math.floor(Math.random() * 10000)}`;
        if (!name) name = `Pelajar ${i}`;
        if (!email) email = `${regNo.toLowerCase()}@student.com`;

        // If the email field doesn't look like an email (e.g. no @) but has value,
        // and the name field is empty, treat the email field as the name.
        if (pensyarahPemantau && !pensyarahPemantau.includes('@')) {
            if (!pensyarahPemantauName) {
                pensyarahPemantauName = (emailPemantauIdx !== -1 && cols[emailPemantauIdx]) ? cleanVal(cols[emailPemantauIdx]) : pensyarahPemantau;
            }
            pensyarahPemantau = "";
        }
        if (pensyarahPenilai && !pensyarahPenilai.includes('@')) {
            if (!pensyarahPenilaiName) {
                pensyarahPenilaiName = (emailPenilaiIdx !== -1 && cols[emailPenilaiIdx]) ? cleanVal(cols[emailPenilaiIdx]) : pensyarahPenilai;
            }
            pensyarahPenilai = "";
        }
        if (penasihatAkademik && !penasihatAkademik.includes('@')) {
            if (!penasihatAkademikName) {
                penasihatAkademikName = (emailPaIdx !== -1 && cols[emailPaIdx]) ? cleanVal(cols[emailPaIdx]) : penasihatAkademik;
            }
            penasihatAkademik = "";
        }

        // Auto-resolve lecturer emails from Lecturer Directory if only name was provided
        if (!pensyarahPemantau && pensyarahPemantauName) {
            pensyarahPemantau = resolveLecturerEmailByName(pensyarahPemantauName);
        }
        if (!pensyarahPenilai && pensyarahPenilaiName) {
            pensyarahPenilai = resolveLecturerEmailByName(pensyarahPenilaiName);
        }
        if (!penasihatAkademik && penasihatAkademikName) {
            penasihatAkademik = resolveLecturerEmailByName(penasihatAkademikName);
        }

        results.push({ name, regNo, tempatLI, daerah, pensyarahPemantau, pensyarahPemantauName, pensyarahPenilai, pensyarahPenilaiName, penasihatAkademik, penasihatAkademikName, jabatan, email, class: classVal, sesi });
    }
    return results;
}

// Excel row parser helper (using SheetJS 2D array)
function parseExcelRows(rows) {

    if (rows.length === 0) return [];

    // Clean rows of completely blank rows (all cells are empty/null)
    const cleanedRows = rows.filter(r => r && r.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ""));
    if (cleanedRows.length === 0) return [];

    const firstRow = Array.from(cleanedRows[0] || []).map(c => cleanVal(c));

    // Detect if first row is a header row (require at least 2 keyword matches to prevent false positives)
    let isHeader = false;
    const headerKeywords = ['nama', 'name', 'pendaftaran', 'reg', 'id', 'matrik', 'kelas', 'class', 'jabatan', 'dept', 'tempat', 'li', 'company', 'syarikat', 'sesi', 'session'];
    let matchCount = 0;
    for (let col of firstRow) {
        const cleaned = col.toLowerCase();
        if (headerKeywords.some(keyword => cleaned.includes(keyword))) {
            matchCount++;
        }
    }
    if (matchCount >= 2) {
        isHeader = true;
    }

    let headers = [];
    let startIndex = 0;

    if (isHeader) {
        headers = firstRow.map(h => h.toLowerCase());
        startIndex = 1;
    } else {
        // Fallback default header mapping
        headers = ['nama', 'pendaftaran', 'tempat', 'pemantau', 'penilai', 'jabatan', 'emel', 'kelas', 'sesi'];
        startIndex = 0;
    }

    // Find column indices
    let nameIdx = headers.findIndex(h => (h.includes('nama') || h.includes('name') || h.includes('pelajar') || h.includes('student')) && !h.includes('pemantau') && !h.includes('penilai') && !h.includes('pa') && !h.includes('penasihat') && !h.includes('syarikat') && !h.includes('organisasi'));
    if (nameIdx === -1) nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('name') || h.includes('full'));

    let regIdx = headers.findIndex(h => h.includes('pendaftaran') || h.includes('reg') || h.includes('matrik') || h.includes('nokp') || h.includes('nondp'));
    if (regIdx === -1) regIdx = headers.findIndex(h => h === 'id' || /\bid\b/.test(h) || h.includes('nombor') || h.includes('no_') || h.includes('no.') || h.includes('noma'));
    if (regIdx === -1) regIdx = headers.findIndex(h => /\bno\b/.test(h) && !h.includes('bil'));

    const tempatIdx = headers.findIndex(h => h.includes('tempat') || h === 'li' || h.includes('company') || h.includes('syarikat') || h.includes('organisasi') || h.includes('tempat li'));
    const daerahIdx = headers.findIndex(h => h.includes('daerah') || h.includes('district') || h.includes('kawasan'));

    // Find all columns containing 'pemantau'
    const pemantauCols = [];
    headers.forEach((h, idx) => {
        if (h.includes('pemantau')) pemantauCols.push({ name: h, index: idx });
    });
    let namePemantauIdx = -1;
    let emailPemantauIdx = -1;
    if (pemantauCols.length === 1) {
        emailPemantauIdx = pemantauCols[0].index;
    } else if (pemantauCols.length > 1) {
        const emailCol = pemantauCols.find(c => c.name.includes('email') || c.name.includes('emel'));
        if (emailCol) {
            emailPemantauIdx = emailCol.index;
            const nameCol = pemantauCols.find(c => c.index !== emailPemantauIdx);
            if (nameCol) namePemantauIdx = nameCol.index;
        } else {
            namePemantauIdx = pemantauCols[0].index;
            emailPemantauIdx = pemantauCols[1].index;
        }
    }

    // Find all columns containing 'penilai'
    const penilaiCols = [];
    headers.forEach((h, idx) => {
        if (h.includes('penilai')) penilaiCols.push({ name: h, index: idx });
    });
    let namePenilaiIdx = -1;
    let emailPenilaiIdx = -1;
    if (penilaiCols.length === 1) {
        emailPenilaiIdx = penilaiCols[0].index;
    } else if (penilaiCols.length > 1) {
        const emailCol = penilaiCols.find(c => c.name.includes('email') || c.name.includes('emel'));
        if (emailCol) {
            emailPenilaiIdx = emailCol.index;
            const nameCol = penilaiCols.find(c => c.index !== emailPenilaiIdx);
            if (nameCol) namePenilaiIdx = nameCol.index;
        } else {
            namePenilaiIdx = penilaiCols[0].index;
            emailPenilaiIdx = penilaiCols[1].index;
        }
    }

    const jabIdx = headers.findIndex(h => h.includes('jabatan') || h.includes('dept') || h.includes('department'));
    const emailIdx = headers.findIndex(h => h.includes('emel') || h.includes('email'));
    const sesiIdx = headers.findIndex(h => h.includes('sesi') || h.includes('session') || h.includes('cohort'));

    // Find all columns containing 'penasihat', 'penasehat', 'pa', 'advisor', or 'akademik'
    const paCols = [];
    headers.forEach((h, idx) => {
        if (h.includes('penasihat') || h.includes('penasehat') || h === 'pa' || /\bpa\b/.test(h) || h.includes('advisor') || h.includes('akademik')) paCols.push({ name: h, index: idx });
    });
    let namePaIdx = -1;
    let emailPaIdx = -1;
    if (paCols.length === 1) {
        emailPaIdx = paCols[0].index;
    } else if (paCols.length > 1) {
        const emailCol = paCols.find(c => c.name.includes('email') || c.name.includes('emel'));
        if (emailCol) {
            emailPaIdx = emailCol.index;
            const nameCol = paCols.find(c => c.index !== emailPaIdx);
            if (nameCol) namePaIdx = nameCol.index;
        } else {
            namePaIdx = paCols[0].index;
            emailPaIdx = paCols[1].index;
        }
    }

    const results = [];
    for (let i = startIndex; i < cleanedRows.length; i++) {
        const cols = Array.from(cleanedRows[i] || []).map(c => cleanVal(c));
        if (cols.length === 0 || cols.every(c => c === "")) continue;

        let name = "";
        let regNo = "";
        let tempatLI = "";
        let daerah = "";
        let pensyarahPemantau = "";
        let pensyarahPemantauName = "";
        let pensyarahPenilai = "";
        let pensyarahPenilaiName = "";
        let penasihatAkademik = "";
        let penasihatAkademikName = "";
        let jabatan = "";
        let email = "";
        let classVal = "";
        let sesi = "";

        if (isHeader) {
            name = (nameIdx !== -1 && cols[nameIdx]) ? cleanStudentName(cols[nameIdx]) : "";
            regNo = (regIdx !== -1 && cols[regIdx]) ? cleanVal(cols[regIdx]).toUpperCase() : "";
            tempatLI = (tempatIdx !== -1 && cols[tempatIdx]) ? cleanVal(cols[tempatIdx]) : "";
            daerah = (daerahIdx !== -1 && cols[daerahIdx]) ? cleanVal(cols[daerahIdx]) : "";
            pensyarahPemantau = (emailPemantauIdx !== -1 && cols[emailPemantauIdx]) ? cleanVal(cols[emailPemantauIdx]).toLowerCase() : "";
            pensyarahPemantauName = (namePemantauIdx !== -1 && cols[namePemantauIdx]) ? cleanVal(cols[namePemantauIdx]) : "";
            pensyarahPenilai = (emailPenilaiIdx !== -1 && cols[emailPenilaiIdx]) ? cleanVal(cols[emailPenilaiIdx]).toLowerCase() : "";
            pensyarahPenilaiName = (namePenilaiIdx !== -1 && cols[namePenilaiIdx]) ? cleanVal(cols[namePenilaiIdx]) : "";
            penasihatAkademik = (emailPaIdx !== -1 && cols[emailPaIdx]) ? cleanVal(cols[emailPaIdx]).toLowerCase() : "";
            penasihatAkademikName = (namePaIdx !== -1 && cols[namePaIdx]) ? cleanVal(cols[namePaIdx]) : "";
            jabatan = (jabIdx !== -1 && cols[jabIdx]) ? cleanVal(cols[jabIdx]).toUpperCase() : "";
            email = (emailIdx !== -1 && cols[emailIdx]) ? cleanVal(cols[emailIdx]).toLowerCase() : "";
            sesi = (sesiIdx !== -1 && cols[sesiIdx]) ? cleanVal(cols[sesiIdx]) : "";
        } else {
            // Positional fallback order when no header is present
            name = cols[0] ? cleanStudentName(cols[0]) : "";
            regNo = cols[1] ? cleanVal(cols[1]).toUpperCase() : "";
            tempatLI = cols[2] ? cleanVal(cols[2]) : "";
            if (cols.length > 9) {
                pensyarahPemantauName = cols[3] ? cleanVal(cols[3]) : "";
                pensyarahPemantau = cols[4] ? cleanVal(cols[4]).toLowerCase() : "";
                pensyarahPenilaiName = cols[5] ? cleanVal(cols[5]) : "";
                pensyarahPenilai = cols[6] ? cleanVal(cols[6]).toLowerCase() : "";
                jabatan = cols[7] ? cleanVal(cols[7]).toUpperCase() : "";
                email = cols[8] ? cleanVal(cols[8]).toLowerCase() : "";
                sesi = cols[9] ? cleanVal(cols[9]) : "";
            } else {
                pensyarahPemantau = cols[3] ? cleanVal(cols[3]).toLowerCase() : "";
                pensyarahPenilai = cols[4] ? cleanVal(cols[4]).toLowerCase() : "";
                jabatan = cols[5] ? cleanVal(cols[5]).toUpperCase() : "";
                email = cols[6] ? cleanVal(cols[6]).toLowerCase() : "";
                sesi = cols[8] ? cleanVal(cols[8]) : "";
            }
        }

        // Final fallback validation for critical missing fields
        if (!regNo) regNo = `REG-${Math.floor(Math.random() * 10000)}`;
        if (!name) name = `Pelajar ${i}`;
        if (!email) email = `${regNo.toLowerCase()}@student.com`;

        // If the email field doesn't look like an email (e.g. no @) but has value,
        // and the name field is empty, treat the email field as the name.
        if (pensyarahPemantau && !pensyarahPemantau.includes('@')) {
            if (!pensyarahPemantauName) {
                pensyarahPemantauName = (emailPemantauIdx !== -1 && cols[emailPemantauIdx]) ? cleanVal(cols[emailPemantauIdx]) : pensyarahPemantau;
            }
            pensyarahPemantau = "";
        }
        if (pensyarahPenilai && !pensyarahPenilai.includes('@')) {
            if (!pensyarahPenilaiName) {
                pensyarahPenilaiName = (emailPenilaiIdx !== -1 && cols[emailPenilaiIdx]) ? cleanVal(cols[emailPenilaiIdx]) : pensyarahPenilai;
            }
            pensyarahPenilai = "";
        }
        if (penasihatAkademik && !penasihatAkademik.includes('@')) {
            if (!penasihatAkademikName) {
                penasihatAkademikName = (emailPaIdx !== -1 && cols[emailPaIdx]) ? cleanVal(cols[emailPaIdx]) : penasihatAkademik;
            }
            penasihatAkademik = "";
        }

        // Auto-resolve lecturer emails from Lecturer Directory if only name was provided
        if (!pensyarahPemantau && pensyarahPemantauName) {
            pensyarahPemantau = resolveLecturerEmailByName(pensyarahPemantauName);
        }
        if (!pensyarahPenilai && pensyarahPenilaiName) {
            pensyarahPenilai = resolveLecturerEmailByName(pensyarahPenilaiName);
        }
        if (!penasihatAkademik && penasihatAkademikName) {
            penasihatAkademik = resolveLecturerEmailByName(penasihatAkademikName);
        }

        results.push({ name, regNo, tempatLI, daerah, pensyarahPemantau, pensyarahPemantauName, pensyarahPenilai, pensyarahPenilaiName, penasihatAkademik, penasihatAkademikName, jabatan, email, class: classVal, sesi });
    }
    return results;
}

// Add New Session Form Submit
const addSessionForm = document.getElementById("admin-add-session-form");
if (addSessionForm) {
    addSessionForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const newSessionName = document.getElementById("admin-new-session-name").value.trim();

        if (!newSessionName) {
            showToast("Sila masukkan nama Sesi Akademik!", "error");
            return;
        }

        const sessions = getSessions();
        if (sessions.includes(newSessionName)) {
            showToast(`Sesi Akademik "${newSessionName}" sudah berdaftar di dalam sistem!`, "error");
            return;
        }

        sessions.push(newSessionName);
        
        saveSessions(sessions);
        saveActiveSession(newSessionName); // Auto-set newly registered session as active
        addLog("success", `Admin mendaftarkan sesi akademik baharu: ${newSessionName}`);

        showToast(`Sesi "${newSessionName}" berjaya didaftarkan dan diaktifkan.`, "success");
        addSessionForm.reset();

        // Refresh all selects & views
        populateGlobalSessionSelect();
        renderAdminStudentsTable();
        renderAdminDashboard();
        renderAdminLecturerAssignTable();
    });
}

// Delete Session Form Submit
const deleteSessionForm = document.getElementById("admin-delete-session-form");
if (deleteSessionForm) {
    deleteSessionForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const sessionToDelete = document.getElementById("admin-delete-session-select").value;
        if (!sessionToDelete) return;

        const activeSesi = getActiveSession();
        if (sessionToDelete === activeSesi) {
            showToast("Gagal dipadam! Sesi yang sedang aktif tidak boleh dipadam.", "error");
            return;
        }

        const students = getStudents();
        const studentsInSession = students.filter(s => s.sesi === sessionToDelete);
        if (studentsInSession.length > 0) {
            showToast(`Gagal! Terdapat ${studentsInSession.length} rekod pelajar dalam sesi ini. Padam data pelajar tersebut di tab Pelajar terlebih dahulu.`, "error");
            return;
        }

        if (confirm(`Adakah anda pasti mahu memadam "${sessionToDelete}" daripada sistem? Tindakan ini tidak boleh dibatalkan.`)) {
            let sessions = getSessions();
            sessions = sessions.filter(s => s !== sessionToDelete);
            saveSessions(sessions);
            addLog("warning", `Admin memadam sesi akademik: ${sessionToDelete}`);
            showToast(`Sesi "${sessionToDelete}" telah dipadamkan.`, "success");
            populateGlobalSessionSelect();
        }
    });
}

// Render Admin Students Tab Table (with Department & Session Filtering & Checkbox Selections)
function renderAdminStudentsTable() {
    if (currentRole !== "admin") return;

    applyDeptTheme(activeAdminStudentDept);

    const activeSesi = getActiveSession();
    document.getElementById("admin-students-table-title").textContent = `Pelajar Berdaftar: ${activeAdminStudentDept} (${activeSesi})`;

    const students = getStudents();
    const searchVal = document.getElementById("admin-student-search-input").value.trim().toLowerCase();

    const tbody = document.getElementById("admin-students-table-body");
    let rowsHtml = "";

    // FILTER: Filter students strictly by department AND active session AND search query (Exclude PKLI students)
    const filteredStudents = students.filter(s =>
        !s.isPKLI &&
        (s.jabatan || "").toUpperCase().trim() === (activeAdminStudentDept || "").toUpperCase().trim() &&
        isStudentInSession(s, activeSesi) &&
        (
            (s.name || "").toLowerCase().includes(searchVal) ||
            (s.regNo || "").toLowerCase().includes(searchVal) ||
            (s.class || "").toLowerCase().includes(searchVal)
        )
    );

    if (filteredStudents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;" class="text-muted">Tiada rekod pelajar berdaftar ditemui bagi jabatan ${activeAdminStudentDept} untuk sesi ${activeSesi}.</td></tr>`;
        const selectAllCheck = document.getElementById("admin-student-select-all");
        if (selectAllCheck) selectAllCheck.checked = false;
        if (window.updateBulkCount) window.updateBulkCount();
        return;
    }

    filteredStudents.forEach(s => {
        const requiredDocs = getStudentDocsList(s);
        let approvedCount = 0;
        requiredDocs.forEach(d => {
            const status = (s.documents && s.documents[d.id]) ? s.documents[d.id].status : "Belum Dihantar";
            if (status === "Diterima") approvedCount++;
        });
        const pct = Math.round((approvedCount / requiredDocs.length) * 100);

        // Check if ALL required documents are fully approved ("Diterima")
        const allComplete = approvedCount === requiredDocs.length && requiredDocs.every(d => {
            const doc = s.documents ? s.documents[d.id] : null;
            return doc && doc.status === "Diterima";
        });

        let docsVisual = "";
        requiredDocs.forEach(d => {
            const key = d.id;
            const status = (s.documents && s.documents[key]) ? s.documents[key].status : "Belum Dihantar";
            let c = "gray";
            if (status === "Dalam Semakan") c = "yellow";
            if (status === "Diterima") c = "green";
            if (status === "Ditolak") c = "red";

            docsVisual += `<span class="status-indicator-dot ${c}" title="${d.title}: ${status}" onclick="openDocumentReviewModal('${s.regNo}', '${key}')">${getDocAcronym(key, d.title)}</span>`;
        });

        let avatarStyle = "";
        let avatarContent = getInitials(s.name);
        if (s.profilePic) {
            avatarStyle = `style="background-image: url(${s.profilePic}); background-size: cover; background-position: center;"`;
            avatarContent = "";
        }

        // Admin-only download button — only shown when folder is complete
        const downloadBtn = allComplete
            ? `<button id="btn-admin-dl-${s.regNo}" class="btn btn-sm" onclick="adminDownloadStudentDocs('${s.regNo}')" title="Muat Turun Folder Pelajar (ZIP)" style="background: linear-gradient(135deg, #059669, #047857); color:#fff; border:none; border-radius:6px; padding:5px 9px; font-size:0.75rem; cursor:pointer; transition:opacity 0.2s; display:flex; align-items:center; gap:5px; white-space:nowrap;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                <i class="fa-solid fa-folder-arrow-down"></i> Muat Turun
              </button>`
            : `<button class="btn btn-sm" disabled title="Dokumen belum lengkap — muat turun hanya tersedia apabila semua dokumen 'Diterima'" style="background:rgba(255,255,255,0.04); color:var(--text-muted); border:1px dashed var(--border-color); border-radius:6px; padding:5px 9px; font-size:0.75rem; cursor:not-allowed; display:flex; align-items:center; gap:5px; white-space:nowrap;">
                <i class="fa-solid fa-folder-arrow-down"></i> Belum Lengkap
              </button>`;

        rowsHtml += `
            <tr class="student-table-row" data-dept="${s.jabatan}">
                <td style="text-align: center;">
                    <input type="checkbox" class="student-select-checkbox" data-reg="${s.regNo}" onchange="updateBulkCount()">
                </td>
                <td>
                    <div class="table-student-cell">
                        <div class="avatar mini-avatar" ${avatarStyle}>${avatarContent}</div>
                        <div>
                            <strong>${s.name}</strong>
                        </div>
                    </div>
                </td>
                <td><code>${s.regNo}</code></td>
                <td><span style="font-size:0.85rem;">${s.penasihatAkademikName || (s.penasihatAkademik || 'Belum Diagihkan')}</span></td>
                <td><span style="font-size:0.85rem;" title="${s.tempatLI}">${s.tempatLI || 'Belum Diagihkan'}</span></td>
                <td><span style="font-size:0.85rem;">${s.daerah || '-'}</span></td>
                <td>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <div class="table-progress-mini">
                            <div class="progress-track-mini">
                                <div class="progress-fill-mini" style="width: ${pct}%"></div>
                            </div>
                            <span>${approvedCount}/${requiredDocs.length}</span>
                        </div>
                        <div class="doc-mini-status-grid" style="margin-top:2px;">
                            ${docsVisual}
                        </div>
                    </div>
                </td>
                <td>
                    <div style="display:flex; gap:5px; align-items:center;">
                        ${downloadBtn}
                        <button class="btn btn-secondary btn-sm" onclick="openEditStudentModal('${s.regNo}')">
                            <i class="fa-solid fa-user-pen text-primary"></i> Sunting
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="deleteStudent('${s.regNo}')">
                            <i class="fa-solid fa-trash text-danger"></i> Padam
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;

    const selectAllCheck = document.getElementById("admin-student-select-all");
    if (selectAllCheck) selectAllCheck.checked = false;
    if (window.updateBulkCount) window.updateBulkCount();
}

document.getElementById("admin-student-search-input").addEventListener("input", renderAdminStudentsTable);

window.deleteStudent = function (regNo) {
    showConfirm(
        `Padam pelajar ${regNo}? Ini akan memadamkan semua rekod dokumen mereka secara kekal.`,
        function () {
            const students = getStudents();
            const updated = students.filter(s => s.regNo !== regNo);
            deleteStudentFromFirestore(regNo);
            saveStudents(updated);
            try { localStorage.setItem("upli_cache_ts", String(Date.now())); } catch(e) {}
            addLog("danger", `Admin memadam maklumat pelajar: ${regNo}`);
            showToast("Maklumat pelajar berjaya dipadamkan.", "info");
            renderAdminStudentsTable();
            renderAdminDashboard();
            renderAdminLecturerAssignTable();
        },
        "Padam Rekod Pelajar"
    );
};

// Admin Assignment Tab (Tugasan Pemantau & Penilai mengikut Emel - Filtered by Session)
function renderAdminLecturerAssignTable() {
    if (currentRole !== "admin") return;

    applyDeptTheme(activeAdminAssignDept);

    const students = getStudents();
    const activeSesi = getActiveSession();
    const searchVal = document.getElementById("admin-assign-search-input").value.trim().toLowerCase();

    // Set dynamic table header
    const thead = document.getElementById("admin-lecturer-assign-table-header");
    const tbody = document.getElementById("admin-lecturer-assign-table-body");
    let rowsHtml = "";

    // JKA, JKE, JKM have 8 columns (Nama Pemantau, Email Pemantau, Nama Penilai, Email Penilai)
    // JP, JPH have 6 columns (Nama Pemantau, Email Pemantau, no Penilai)
    const isKejuruteraanTab = ["JKA", "JKE", "JKM"].includes(activeAdminAssignDept);

    if (isKejuruteraanTab) {
        thead.innerHTML = `
            <tr>
                <th>Pelajar &amp; No. Pendaftaran</th>
                <th>Tempat Latihan Industri</th>
                <th>Bandar/Kawasan</th>
                <th>Nama Pensyarah Pemantau</th>
                <th>Email Pensyarah Pemantau</th>
                <th>Nama Pensyarah Penilai</th>
                <th>Email Pensyarah Penilai</th>
                <th>Tindakan</th>
            </tr>
        `;
    } else {
        thead.innerHTML = `
            <tr>
                <th>Pelajar &amp; No. Pendaftaran</th>
                <th>Tempat Latihan Industri</th>
                <th>Bandar/Kawasan</th>
                <th>Nama Pensyarah Pemantau</th>
                <th>Email Pensyarah Pemantau</th>
                <th>Tindakan</th>
            </tr>
        `;
    }

    // FILTER: Filter assignment list by active academic session AND selected department tab!
    const filteredStudents = students.filter(s =>
        (s.sesi || "").toUpperCase().trim() === (activeSesi || "").toUpperCase().trim() &&
        (s.jabatan || "").toUpperCase().trim() === (activeAdminAssignDept || "").toUpperCase().trim() &&
        ((s.name || "").toLowerCase().includes(searchVal) || (s.regNo || "").toLowerCase().includes(searchVal))
    );

    if (filteredStudents.length === 0) {
        const colSpan = isKejuruteraanTab ? 8 : 6;
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;" class="text-muted">Tiada rekod pelajar ditemui bagi jabatan ${activeAdminAssignDept} untuk sesi ${activeSesi}.</td></tr>`;
        return;
    }

    filteredStudents.forEach(s => {
        const hasPenilai = studentHasPenilai(s) && isKejuruteraanTab;

        if (isKejuruteraanTab) {
            rowsHtml += `
                <tr class="student-table-row" data-dept="${s.jabatan}">
                    <td>
                        <strong>${s.name}</strong><br>
                        <code style="font-size:0.75rem;">${s.regNo}</code>
                    </td>
                    <td><span style="font-size:0.8rem;">${s.tempatLI || 'Belum Diagihkan'}</span></td>
                    <td><span style="font-size:0.8rem;">${s.daerah || '-'}</span></td>
                    <td>
                        <input type="text" id="assign-pemantau-name-${s.regNo}" value="${s.pensyarahPemantauName || ''}" placeholder="Nama Pemantau" style="padding: 6px 10px; font-size: 0.8rem; width: 100%;">
                    </td>
                    <td>
                        <input type="email" id="assign-pemantau-email-${s.regNo}" value="${s.pensyarahPemantau || ''}" placeholder="emel@polikk.edu.my" style="padding: 6px 10px; font-size: 0.8rem; width: 100%;">
                    </td>
                    <td>
                        ${hasPenilai ? `
                            <input type="text" id="assign-penilai-name-${s.regNo}" value="${s.pensyarahPenilaiName || ''}" placeholder="Nama Penilai" style="padding: 6px 10px; font-size: 0.8rem; width: 100%;">
                        ` : `
                            <input type="text" value="Tiada Penilai (Bukan Kejuruteraan)" disabled style="padding: 6px 10px; font-size: 0.8rem; width: 100%; background:rgba(255,255,255,0.05); color:var(--text-muted); border:1px dashed var(--border-color); border-radius:4px; text-align:center;">
                        `}
                    </td>
                    <td>
                        ${hasPenilai ? `
                            <input type="email" id="assign-penilai-email-${s.regNo}" value="${s.pensyarahPenilai || ''}" placeholder="emel@polikk.edu.my" style="padding: 6px 10px; font-size: 0.8rem; width: 100%;">
                        ` : `
                            <input type="text" value="Tiada Penilai (Bukan Kejuruteraan)" disabled style="padding: 6px 10px; font-size: 0.8rem; width: 100%; background:rgba(255,255,255,0.05); color:var(--text-muted); border:1px dashed var(--border-color); border-radius:4px; text-align:center;">
                        `}
                    </td>
                    <td style="white-space: nowrap;">
                        <button class="btn btn-primary btn-sm" onclick="saveAssignment('${s.regNo}')">
                            <i class="fa-solid fa-floppy-disk"></i> Simpan
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.regNo}')" style="margin-left: 5px;">
                            <i class="fa-solid fa-trash-can"></i> Padam
                        </button>
                    </td>
                </tr>
            `;
        } else {
            rowsHtml += `
                <tr>
                    <td>
                        <strong>${s.name}</strong><br>
                        <code style="font-size:0.75rem;">${s.regNo}</code>
                    </td>
                    <td><span style="font-size:0.8rem;">${s.tempatLI || 'Belum Diagihkan'}</span></td>
                    <td><span style="font-size:0.8rem;">${s.daerah || '-'}</span></td>
                    <td>
                        <input type="text" id="assign-pemantau-name-${s.regNo}" value="${s.pensyarahPemantauName || ''}" placeholder="Nama Pemantau" style="padding: 6px 10px; font-size: 0.8rem; width: 100%;">
                    </td>
                    <td>
                        <input type="email" id="assign-pemantau-email-${s.regNo}" value="${s.pensyarahPemantau || ''}" placeholder="emel@polikk.edu.my" style="padding: 6px 10px; font-size: 0.8rem; width: 100%;">
                    </td>
                    <td style="white-space: nowrap;">
                        <button class="btn btn-primary btn-sm" onclick="saveAssignment('${s.regNo}')">
                            <i class="fa-solid fa-floppy-disk"></i> Simpan
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.regNo}')" style="margin-left: 5px;">
                            <i class="fa-solid fa-trash-can"></i> Padam
                        </button>
                    </td>
                </tr>
            `;
        }
    });

    tbody.innerHTML = rowsHtml;
}

document.getElementById("admin-assign-search-input").addEventListener("input", renderAdminLecturerAssignTable);

// ============================================================
// PENASIHAT AKADEMIK (PA) MODULE
// ============================================================

function renderAdminPATable() {
    if (currentRole !== "admin") return;

    applyDeptTheme(activeAdminPADept);

    const activeSesi = getActiveSession();
    const students = getStudents();
    const lecturers = getLecturers();
    const searchVal = (document.getElementById("admin-pa-search-input")?.value || "").trim().toLowerCase();

    const tbody = document.getElementById("admin-pa-table-body");
    if (!tbody) return;

    // FILTER: Filter students by department AND active session AND search query
    const filteredStudents = students.filter(s =>
        s.jabatan === activeAdminPADept &&
        s.sesi === activeSesi &&
        ((s.name || "").toLowerCase().includes(searchVal) || (s.regNo || "").toLowerCase().includes(searchVal))
    );



    if (filteredStudents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;" class="text-muted">Tiada rekod pelajar ditemui bagi jabatan ${activeAdminPADept} untuk sesi ${activeSesi}.</td></tr>`;
        return;
    }

    // Pre-build options HTML without selection
    let lecturerOptionsHtml = `<option value="">-- Belum Diagihkan --</option>`;
    lecturers.forEach(l => {
        lecturerOptionsHtml += `<option value="${l.email}">${l.name} (${l.email})</option>`;
    });

    let rowsHtml = "";
    filteredStudents.forEach(s => {
        // Build this student's select options by injecting the 'selected' attribute into the pre-built template
        let selectOptions = lecturerOptionsHtml;
        if (s.penasihatAkademik) {
            const targetVal = `value="${s.penasihatAkademik}"`;
            selectOptions = lecturerOptionsHtml.replace(targetVal, `${targetVal} selected`);
        }

        rowsHtml += `
            <tr class="student-table-row" data-dept="${s.jabatan}">
                <td>
                    <strong>${s.name}</strong><br>
                    <code style="font-size:0.75rem;">${s.regNo}</code>
                </td>
                <td><span style="font-size:0.85rem;">${s.class || '-'}</span></td>
                <td><span style="font-size:0.8rem;">${s.tempatLI || 'Belum Diagihkan'}</span></td>
                <td>
                    <select id="assign-pa-${s.regNo}" style="padding: 6px 10px; font-size: 0.8rem; width: 100%; color:#000; background:#fff; border: 1px solid var(--border-color); border-radius: 4px;">
                        ${selectOptions}
                    </select>
                </td>
                <td style="white-space: nowrap;">
                    <button class="btn btn-primary btn-sm" onclick="savePAAssignment('${s.regNo}')">
                        <i class="fa-solid fa-floppy-disk"></i> Simpan
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;
}

// Save Individual PA Assignment
window.savePAAssignment = function (regNo) {
    const paSelect = document.getElementById(`assign-pa-${regNo}`);
    if (!paSelect) return;

    const paEmail = paSelect.value;
    const lecturers = getLecturers();
    const paLecturer = lecturers.find(l => l.email === paEmail);
    const paName = paLecturer ? paLecturer.name : "";

    const students = getStudents();
    const studentIdx = students.findIndex(s => s.regNo === regNo);

    if (studentIdx !== -1) {
        students[studentIdx].penasihatAkademik = paEmail;
        students[studentIdx].penasihatAkademikName = paName;

        saveStudents(students, regNo);
        addLog("info", `Admin mengagihkan Penasihat Akademik bagi pelajar ${regNo}: PA(${paName || 'Tiada'} - ${paEmail || 'Tiada'})`);
        showToast("Agihan Penasihat Akademik berjaya disimpan!", "success");

        renderAdminPATable();
        renderAdminStudentsTable();
        renderLecturerDashboard();
    }
};

// ============================================================
// ADMIN NOTIFICATION MODULE
// ============================================================
function getFriendlyDocName(docId) {
    const docs = {
        jawapan_penerimaan: "Borang Jawapan Penerimaan",
        skop_kerja: "Senarai Skop Kerja",
        kad_lapordiri: "Kad Lapor Diri",
        resume: "Resume Terkini",
        borang_penilaian: "Borang Penilaian Prestasi",
        laporan_akhir: "Laporan Akhir LI",
        appendix_e2: "Appendix E2 (Markah Pemantau)",
        appendix_e3: "Appendix E3 (Markah Penilai)"
    };
    return docs[docId] || docId.toUpperCase().replace("_", " ");
}

window.updateAdminNotifications = function () {
    const notifContainer = document.getElementById("admin-notification-container");
    if (!notifContainer) return;

    if (currentRole !== "admin" && currentRole !== "lecturer") {
        notifContainer.style.display = "none";
        return;
    }

    notifContainer.style.display = "flex";

    const students = getStudents();
    const activeSesi = getActiveSession();
    
    // Find all students of active session with documents "Dalam Semakan"
    const pendingReviews = [];
    students.forEach(s => {
        if (s.sesi === activeSesi && s.documents) {
            // For lecturers, only show notifications for their own PA students
            if (currentRole === "lecturer" && s.penasihatAkademik !== currentUser.email) {
                return;
            }

            Object.keys(s.documents).forEach(docKey => {
                const doc = s.documents[docKey];
                if (doc.status === "Dalam Semakan") {
                    pendingReviews.push({
                        regNo: s.regNo,
                        studentName: s.name,
                        class: s.class,
                        docKey: docKey,
                        time: doc.uploadDate || ""
                    });
                }
            });
        }
    });

    // Update badge count
    const badge = document.getElementById("admin-notification-count");
    if (badge) {
        if (pendingReviews.length > 0) {
            badge.textContent = pendingReviews.length;
            badge.style.display = "flex";
        } else {
            badge.style.display = "none";
        }
    }

    // Populate list
    const list = document.getElementById("admin-notification-list");
    if (list) {
        if (pendingReviews.length === 0) {
            list.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted);">Tiada notifikasi baharu.</div>`;
        } else {
            // Sort by time descending
            pendingReviews.sort((a,b) => (b.time || "").localeCompare(a.time || ""));
            let html = "";
            pendingReviews.forEach(item => {
                html += `
                    <div class="notification-item unread" style="padding: 12px 15px; border-bottom: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'" onclick="handleNotificationClick('${item.regNo}', '${item.docKey}', event)">
                        <div style="font-weight: 600; color: var(--color-accent); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.5px;">Dokumen Baharu</div>
                        <div style="font-size: 0.78rem; color: var(--text-primary); line-height: 1.4;">
                            <strong>${item.studentName} (${item.class || '-'})</strong> telah menghantar: <span style="font-weight:600; color: var(--color-success);">${getFriendlyDocName(item.docKey)}</span>
                        </div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">
                            <i class="fa-regular fa-clock"></i> ${item.time || 'Baru sahaja'}
                        </div>
                    </div>
                `;
            });
            list.innerHTML = html;
        }
    }
}

// Toggle Admin Notification Dropdown
window.toggleAdminNotificationDropdown = function (event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById("admin-notification-dropdown");
    if (dropdown) {
        const isHidden = dropdown.style.display === "none";
        dropdown.style.display = isHidden ? "block" : "none";
    }
};

// Handle Notification Click
window.handleNotificationClick = function (regNo, docKey, event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById("admin-notification-dropdown");
    if (dropdown) dropdown.style.display = "none";
    
    // Open the review modal
    if (typeof window.openDocumentReviewModal === "function") {
        window.openDocumentReviewModal(regNo, docKey);
    }
};

// Document click to close notification dropdown when clicking outside
document.addEventListener("click", function (event) {
    const dropdown = document.getElementById("admin-notification-dropdown");
    const container = document.getElementById("admin-notification-container");
    if (dropdown && container && !container.contains(event.target)) {
        dropdown.style.display = "none";
    }
});

// Render Lecturer PA Students Table
function renderLecturerPAStudentsTable() {
    if (currentRole !== "lecturer") return;

    const activeSesi = getActiveSession();
    const students = getStudents();
    const searchVal = (document.getElementById("lecturer-pa-student-search")?.value || "").trim().toLowerCase();

    const tbody = document.getElementById("lecturer-pa-students-table-body");
    if (!tbody) return;

    // FILTER: Students of active session where current lecturer is Penasihat Akademik (PA)
    const myPASudents = students.filter(s =>
        s.sesi === activeSesi &&
        s.penasihatAkademik === currentUser.email &&
        ((s.name || "").toLowerCase().includes(searchVal) || (s.regNo || "").toLowerCase().includes(searchVal))
    );

    if (myPASudents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;" class="text-muted">Tiada rekod pelajar di bawah jagaan PA anda bagi sesi ${activeSesi}.</td></tr>`;
        return;
    }

    let rowsHtml = "";
    myPASudents.forEach(s => {
        let docsVisual = "";
        const requiredDocs = getStudentDocsList(s);
        requiredDocs.forEach(d => {
            const key = d.id;
            const status = s.documents[key] ? s.documents[key].status : "Belum Dihantar";
            let c = "gray";
            if (status === "Dalam Semakan") c = "yellow";
            if (status === "Diterima") c = "green";
            if (status === "Ditolak") c = "red";

            docsVisual += `<span class="status-indicator-dot ${c}" title="${d.title}: ${status}" onclick="openDocumentReviewModal('${s.regNo}', '${key}')">${getDocAcronym(key, d.title)}</span>`;
        });

        rowsHtml += `
            <tr class="student-table-row" data-dept="${s.jabatan}">
                <td>
                    <div class="table-student-cell">
                        <div class="avatar mini-avatar">${getInitials(s.name)}</div>
                        <strong>${s.name}</strong>
                    </div>
                </td>
                <td style="text-align: center;"><code>${s.regNo}</code></td>
                <td>${s.tempatLI || 'Belum Ditentukan'}</td>
                <td>${s.daerah || '-'}</td>
                <td>
                    <div class="doc-mini-status-grid" style="justify-content: center;">
                        ${docsVisual}
                    </div>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = rowsHtml;
}

// Event Listeners for PA management search/inputs
document.getElementById("admin-pa-search-input")?.addEventListener("input", renderAdminPATable);
document.getElementById("lecturer-pa-student-search")?.addEventListener("input", renderLecturerPAStudentsTable);

// ============================================================
// LECTURER DIRECTORY MODULE
// ============================================================

function renderAdminLecturerList() {
    if (currentRole !== "admin") return;
    const lecturers = getLecturers();
    const tbody = document.getElementById("admin-lecturer-list-body");
    if (!tbody) return;
    const search = (document.getElementById("lecturer-list-search")?.value || "").toLowerCase();

    const filtered = lecturers.filter(l =>
        l.name.toLowerCase().includes(search) ||
        (l.email || "").toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;" class="text-muted">Tiada rekod pensyarah ditemui.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(l => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--color-primary),var(--color-secondary));display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i class="fa-solid fa-user" style="font-size:0.8rem;color:#fff;"></i>
                    </div>
                    <strong style="font-size:0.9rem;">${l.name}</strong>
                </div>
            </td>
            <td><code style="font-size:0.8rem;">${l.email || '<em>Tiada</em>'}</code></td>
            <td><span class="badge" style="background:rgba(var(--color-primary-rgb,59,130,246),0.12);color:var(--color-primary);padding:4px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">${l.dept || '-'}</span></td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deleteLecturerFromList('${l.email}')" style="padding:6px 12px;font-size:0.8rem;">
                    <i class="fa-solid fa-trash"></i> Padam
                </button>
            </td>
        </tr>
    `).join("");
}

document.getElementById("lecturer-list-search")?.addEventListener("input", renderAdminLecturerList);

// Add Lecturer Modal
const addLecturerModal = document.getElementById("add-lecturer-modal");
document.getElementById("btn-show-add-lecturer-modal")?.addEventListener("click", () => {
    addLecturerModal.classList.add("active");
    document.getElementById("modal-lecturer-name").value = "";
    document.getElementById("modal-lecturer-email").value = "";
});
document.getElementById("close-add-lecturer-modal")?.addEventListener("click", () => addLecturerModal.classList.remove("active"));
document.getElementById("cancel-add-lecturer")?.addEventListener("click", () => addLecturerModal.classList.remove("active"));

document.getElementById("add-lecturer-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("modal-lecturer-name").value.trim();
    const email = document.getElementById("modal-lecturer-email").value.trim().toLowerCase();
    const dept = document.getElementById("modal-lecturer-dept").value;

    if (!email.endsWith("@polikk.edu.my")) {
        showToast("Emel mestilah berakhir dengan @polikk.edu.my!", "error");
        return;
    }

    const lecturers = getLecturers();
    if (lecturers.some(l => l.email === email)) {
        showToast("Emel pensyarah ini telah berdaftar!", "error");
        return;
    }

    lecturers.push({ name, email, dept, role: "lecturer" });
    saveLecturers(lecturers);
    addLecturerModal.classList.remove("active");
    showToast(`Pensyarah ${name} berjaya ditambah ke direktori!`, "success");
    addLog("success", `Admin menambah pensyarah baharu: ${name} (${email}) - ${dept}`);
    renderAdminLecturerList();
});

window.deleteLecturerFromList = function(email) {
    if (!confirm(`Padam pensyarah dengan emel ${email} daripada direktori?`)) return;
    let lecturers = getLecturers();
    lecturers = lecturers.filter(l => l.email !== email);
    saveLecturers(lecturers);
    showToast("Rekod pensyarah berjaya dipadam.", "success");
    addLog("info", `Admin memadam pensyarah daripada direktori: ${email}`);
    renderAdminLecturerList();
};

/**
 * Resolve a lecturer's email from their name using the saved lecturer directory.
 * Used during CSV/Excel import when only a name is provided (no email column).
 * Matching is case-insensitive and partial (name must include the stored name or vice-versa).
 */
/**
 * Normalise a lecturer name for fuzzy matching:
 *  - Lowercase
 *  - Strip common titles: pn, en, dr, ts, prof, mdm, cik, tuan, haji, hajah, hj, hjh
 *  - Strip bin/binti/bt/b.
 *  - Remove punctuation and extra spaces
 *  - Return array of significant tokens (length >= 2)
 */
function normalizeLecturerNameTokens(name) {
    if (!name) return [];
    const STOP = new Set(["pn", "en", "dr", "ts", "prof", "mdm", "cik", "tuan",
                          "haji", "hajah", "hj", "hjh", "bin", "binti", "bt", "b"]);
    return name
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")  // strip punctuation
        .split(/\s+/)
        .map(t => t.trim())
        .filter(t => t.length >= 2 && !STOP.has(t));    // drop stop words & 1-char tokens
}

/**
 * Resolve a lecturer's email from their name using the saved lecturer directory.
 * Uses token-based fuzzy matching so it handles:
 *  - Missing/extra titles (Pn., En., Dr., Ts.)
 *  - bin/binti/bt variations
 *  - Partial names (as long as >= 2 significant tokens match)
 *  - Different capitalisation
 */
function resolveLecturerEmailByName(name) {
    if (!name) return "";
    const lecturers = getLecturers();
    const queryTokens = normalizeLecturerNameTokens(name);
    if (queryTokens.length === 0) return "";

    let bestMatch = null;
    let bestScore = 0;

    lecturers.forEach(l => {
        const dirTokens = normalizeLecturerNameTokens(l.name);
        if (dirTokens.length === 0) return;

        // Count how many query tokens appear in the directory entry
        const matchCount = queryTokens.filter(qt => dirTokens.some(dt => dt === qt || dt.startsWith(qt) || qt.startsWith(dt))).length;
        // Score = matched tokens / query tokens count
        // Add a tiny directory overlap weight to break ties
        const score = (matchCount / queryTokens.length) + (matchCount / dirTokens.length) * 0.01;

        if (score > bestScore) {
            bestScore = score;
            bestMatch = l;
        }
    });

    // Require at least 50% token overlap to accept the match
    return (bestScore >= 0.5 && bestMatch) ? bestMatch.email : "";
}


// ============================================================
// LECTURER CSV BULK IMPORT
// ============================================================

/** Parse a lecturer CSV text into an array of {name, email, dept} objects */
function parseLecturerCSV(text) {
    if (text.startsWith('\ufeff')) text = text.substring(1); // strip BOM
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];

    // Detect delimiter
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    const delim = semiCount > commaCount ? ';' : ',';

    const cols = firstLine.split(delim).map(h => cleanVal(h).toLowerCase());
    const nameIdx = cols.findIndex(h => h.includes('nama') || h.includes('name'));
    const emailIdx = cols.findIndex(h => h.includes('emel') || h.includes('email'));
    const deptIdx = cols.findIndex(h => h.includes('jabatan') || h.includes('dept'));

    const hasHeader = nameIdx !== -1 || emailIdx !== -1;
    const startIdx = hasHeader ? 1 : 0;

    const results = [];
    for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(delim).map(c => cleanVal(c));
        if (parts.every(p => p === "")) continue;

        const name  = cleanVal(parts[hasHeader ? nameIdx  : 0] || "");
        const email = cleanVal(parts[hasHeader ? emailIdx : 1] || "").toLowerCase();
        const dept  = cleanVal(parts[hasHeader ? deptIdx  : 2] || "").toUpperCase();

        if (!name && !email) continue;
        results.push({ name, email, dept: dept || "JKA", role: "lecturer" });
    }
    return results;
}

// File input handler — supports .csv, .xlsx, .xls
const lecturerCsvInput = document.getElementById("lecturer-csv-file-input");
lecturerCsvInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    const isCsv = file.name.endsWith(".csv");

    if (!isExcel && !isCsv) {
        showToast("Sila pilih fail .csv, .xlsx atau .xls sahaja!", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
        let parsed = [];

        try {
            if (isExcel) {
                if (typeof XLSX === "undefined") {
                    showToast("Library Excel (SheetJS) tidak dimuatkan. Sila guna format .csv!", "error");
                    return;
                }
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                // Find header row
                if (rows.length === 0) { showToast("Fail Excel kosong!", "error"); return; }
                const headers = Array.from(rows[0] || []).map(h => cleanVal(h).toLowerCase());
                const nameIdx  = headers.findIndex(h => h.includes("nama") || h.includes("name"));
                const emailIdx = headers.findIndex(h => h.includes("emel") || h.includes("email"));
                const deptIdx  = headers.findIndex(h => h.includes("jabatan") || h.includes("dept"));
                const hasHeader = nameIdx !== -1 || emailIdx !== -1;
                const startIdx = hasHeader ? 1 : 0;

                for (let i = startIdx; i < rows.length; i++) {
                    const row = Array.from(rows[i] || []).map(c => cleanVal(c));
                    if (row.every(c => c === "")) continue;
                    const name  = cleanVal(row[hasHeader ? nameIdx  : 0] || "");
                    const email = cleanVal(row[hasHeader ? emailIdx : 1] || "").toLowerCase();
                    const dept  = cleanVal(row[hasHeader ? deptIdx  : 2] || "").toUpperCase();
                    if (!name && !email) continue;
                    parsed.push({ name, email, dept: dept || "JKA", role: "lecturer" });
                }
            } else {
                parsed = parseLecturerCSV(evt.target.result);
            }
        } catch(err) {
            showToast("Ralat membaca fail: " + err.message, "error");
            return;
        }

        if (parsed.length === 0) {
            showToast("Tiada data pensyarah ditemui dalam fail.", "error");
            return;
        }

        const lecturers = getLecturers();
        let added = 0, skipped = 0, invalid = 0;

        parsed.forEach(p => {
            if (!p.email || !p.email.endsWith("@polikk.edu.my")) { invalid++; return; }
            if (lecturers.some(l => l.email === p.email)) { skipped++; return; }
            lecturers.push(p);
            added++;
        });

        if (added > 0) {
            saveLecturers(lecturers);
            addLog("success", `Admin import ${added} pensyarah baharu dari ${isExcel ? 'Excel' : 'CSV'}.`);
        }

        // Show result summary
        const resultDiv = document.getElementById("lecturer-csv-result");
        if (resultDiv) {
            resultDiv.style.display = "block";
            resultDiv.innerHTML = `
                <div style="display:flex; gap:10px; flex-wrap:wrap; padding:12px 16px; border-radius:10px; background:var(--bg-card); border:1px solid var(--border-color);">
                    <span style="display:inline-flex; align-items:center; gap:6px; color:#10b981; font-weight:600;">
                        <i class="fa-solid fa-circle-check"></i> ${added} berjaya ditambah
                    </span>
                    <span style="display:inline-flex; align-items:center; gap:6px; color:var(--text-muted);">
                        <i class="fa-solid fa-copy"></i> ${skipped} pendua dilangkau
                    </span>
                    ${invalid > 0 ? `<span style="display:inline-flex; align-items:center; gap:6px; color:#ef4444;">
                        <i class="fa-solid fa-triangle-exclamation"></i> ${invalid} emel tidak sah (bukan @polikk.edu.my)
                    </span>` : ""}
                </div>`;
        }

        showToast(`Import selesai: ${added} ditambah, ${skipped} dilangkau${invalid > 0 ? `, ${invalid} tidak sah` : ''}.`, added > 0 ? "success" : "warning");
        renderAdminLecturerList();
        lecturerCsvInput.value = ""; // reset input
    };

    if (isExcel) {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
});


// Drag & drop on upload zone
const lecturerUploadZone = document.getElementById("lecturer-csv-upload-zone");
lecturerUploadZone?.addEventListener("dragover", (e) => { e.preventDefault(); lecturerUploadZone.style.borderColor = "var(--color-primary)"; });
lecturerUploadZone?.addEventListener("dragleave", () => { lecturerUploadZone.style.borderColor = ""; });
lecturerUploadZone?.addEventListener("drop", (e) => {
    e.preventDefault();
    lecturerUploadZone.style.borderColor = "";
    const file = e.dataTransfer.files[0];
    if (file) {
        const dt = new DataTransfer();
        dt.items.add(file);
        lecturerCsvInput.files = dt.files;
        lecturerCsvInput.dispatchEvent(new Event("change"));
    }
});

// Template CSV download
document.getElementById("btn-download-lecturer-template")?.addEventListener("click", () => {
    const csvContent = "Nama,Emel,Jabatan\n" +
        "Pn. Faridah binti Masri,faridah@polikk.edu.my,JKA\n" +
        "En. Mohd Rizwan bin Junaidi,rizwan@polikk.edu.my,JKA\n" +
        "Dr. Alice Wong Siew Ling,alice@polikk.edu.my,JP\n";
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_pensyarah.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Template CSV berjaya dimuat turun!", "success");
});

window.saveAssignment = function (regNo) {
    const pemantauName = document.getElementById(`assign-pemantau-name-${regNo}`).value.trim();
    const pemantauEmail = document.getElementById(`assign-pemantau-email-${regNo}`).value.trim().toLowerCase();

    const penilaiNameEl = document.getElementById(`assign-penilai-name-${regNo}`);
    const penilaiEmailEl = document.getElementById(`assign-penilai-email-${regNo}`);

    const penilaiName = penilaiNameEl ? penilaiNameEl.value.trim() : "";
    const penilaiEmail = penilaiEmailEl ? penilaiEmailEl.value.trim().toLowerCase() : "";

    if (pemantauEmail && !pemantauEmail.endsWith("@polikk.edu.my")) {
        showToast("Emel Pemantau mestilah berakhir dengan @polikk.edu.my!", "error");
        return;
    }
    if (penilaiEmail && !penilaiEmail.endsWith("@polikk.edu.my")) {
        showToast("Emel Penilai mestilah berakhir dengan @polikk.edu.my!", "error");
        return;
    }

    const students = getStudents();
    const studentIdx = students.findIndex(s => s.regNo === regNo);

    if (studentIdx !== -1) {
        students[studentIdx].pensyarahPemantau = pemantauEmail;
        students[studentIdx].pensyarahPemantauName = pemantauName;
        students[studentIdx].pensyarahPenilai = penilaiEmail;
        students[studentIdx].pensyarahPenilaiName = penilaiName;

        saveStudents(students, regNo);
        addLog("info", `Admin mengemas kini agihan pensyarah bagi pelajar ${regNo}: Pemantau(${pemantauName} - ${pemantauEmail || 'Tiada'}), Penilai(${penilaiName} - ${penilaiEmail || 'Tiada'})`);
        showToast("Agihan pensyarah berjaya disimpan!", "success");

        const lecturers = getLecturers();

        if (pemantauEmail && !lecturers.some(l => l.email === pemantauEmail)) {
            const prefix = pemantauEmail.split('@')[0];
            const nameToSave = pemantauName || ("Pensyarah " + prefix.charAt(0).toUpperCase() + prefix.slice(1));
            lecturers.push({
                name: nameToSave,
                email: pemantauEmail,
                dept: students[studentIdx].jabatan,
                role: "lecturer"
            });
        }
        if (penilaiEmail && !lecturers.some(l => l.email === penilaiEmail)) {
            const prefix = penilaiEmail.split('@')[0];
            const nameToSave = penilaiName || ("Pensyarah " + prefix.charAt(0).toUpperCase() + prefix.slice(1));
            lecturers.push({
                name: nameToSave,
                email: penilaiEmail,
                dept: students[studentIdx].jabatan,
                role: "lecturer"
            });
        }
        saveLecturers(lecturers);

        renderAdminLecturerAssignTable();
    }
};

// Admin Management Tab (Add & Delete Admins)
const addAdminModal = document.getElementById("add-admin-modal");
const addAdminForm = document.getElementById("add-admin-form");

document.getElementById("btn-show-add-admin-modal").addEventListener("click", () => {
    addAdminModal.classList.add("active");
});

document.querySelectorAll("#add-admin-modal .close-modal-btn").forEach(btn => {
    btn.addEventListener("click", () => addAdminModal.classList.remove("active"));
});

addAdminForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("modal-admin-name").value.trim();
    const email = document.getElementById("modal-admin-email").value.trim().toLowerCase();
    const staffId = document.getElementById("modal-admin-id").value.trim();

    if (!email.endsWith("@polikk.edu.my")) {
        showToast("Ralat: Hanya emel @polikk.edu.my dibenarkan!", "error");
        return;
    }

    const admins = getAdmins();
    if (admins.some(a => a.email === email)) {
        showToast("Ralat: Emel admin ini telah berdaftar!", "error");
        return;
    }

    const newAdmin = {
        name,
        email,
        staffId,
        role: "admin",
        status: "Aktif"
    };

    admins.push(newAdmin);
    saveAdmins(admins);
    addLog("success", `Admin mendaftarkan admin baharu: ${name} (${email})`);

    showToast("Pentadbir sistem berjaya disimpan!", "success");
    addAdminForm.reset();
    addAdminModal.classList.remove("active");
    renderAdminAdminsTable();
    renderAdminDashboard();
});

function renderAdminAdminsTable() {
    if (currentRole !== "admin") return;

    const admins = getAdmins();
    const tbody = document.getElementById("admin-admins-table-body");
    let rowsHtml = "";
    admins.forEach(a => {
        const isCurrent = a.email === currentUser.email;
        rowsHtml += `
            <tr>
                <td>
                    <div class="table-student-cell">
                        <div class="avatar mini-avatar" style="background:linear-gradient(135deg, var(--color-accent), #4338ca);">${getInitials(a.name)}</div>
                        <strong>${a.name} ${isCurrent ? '<span class="text-accent" style="font-size:0.75rem;">(Anda)</span>' : ''}</strong>
                    </div>
                </td>
                <td><code>${a.email}</code></td>
                <td><code>${a.staffId}</code></td>
                <td><span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> ${a.status || 'Aktif'}</span></td>
                <td>
                    ${isCurrent ? '<span class="text-muted" style="font-size:0.8rem;">Aktif</span>' : `
                        <button class="btn btn-secondary btn-sm" onclick="deleteAdmin('${a.email}')">
                            <i class="fa-solid fa-trash text-danger"></i> Buang
                        </button>
                    `}
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = rowsHtml;
}

window.deleteAdmin = function (email) {
    showConfirm(
        `Adakah anda pasti mahu memadamkan pentadbir ${email}?`,
        function () {
            const admins = getAdmins();
            const updated = admins.filter(a => a.email !== email);
            saveAdmins(updated);
            addLog("danger", `Admin memadam maklumat pentadbir: ${email}`);
            showToast("Maklumat pentadbir berjaya dipadamkan.", "info");
            renderAdminAdminsTable();
            renderAdminDashboard();
        },
        "Padam Rekod Pentadbir"
    );
};

// ---------- Admin Pengurusan Makluman Handlers ----------
window.renderAdminAnnouncements = function () {
    if (currentRole !== "admin") return;

    const announcements = getAnnouncements();
    const countBadge = document.getElementById("admin-announcement-count-badge");
    if (countBadge) {
        countBadge.textContent = `${announcements.length} Makluman`;
    }

    const tbody = document.getElementById("admin-announcements-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    // Sort announcements by date descending (latest first for management)
    const sorted = [...announcements].sort((a, b) => b.date.localeCompare(a.date));

    if (sorted.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; padding:30px; color:var(--text-muted);">
                    <i class="fa-solid fa-bullhorn" style="font-size:2rem; margin-bottom:10px; display:block; opacity:0.5;"></i>
                    Tiada rekod makluman ditemui. Sila tambah makluman baharu di sebelah kiri.
                </td>
            </tr>
        `;
        return;
    }

    let rowsHtml = "";
    sorted.forEach(a => {
        let badgeClass = "badge-muted";
        if (a.category === "Makluman Pelajar" || a.category === "Penting") badgeClass = "badge-danger";
        else if (a.category === "Makluman Pensyarah" || a.category === "Pendaftaran") badgeClass = "badge-success";
        else if (a.category === "Makluman Umum" || a.category === "Akademik") badgeClass = "badge-warning";

        rowsHtml += `
            <tr>
                <td style="white-space: nowrap;">
                    <strong><code>${a.date}</code></strong>
                </td>
                <td>
                    <div style="font-weight:700; color:var(--text-primary); margin-bottom:4px;">${a.title}</div>
                    <span class="badge ${badgeClass}" style="font-size:0.65rem; padding:2px 8px;">${a.category}</span>
                </td>
                <td>
                    <span style="font-size:0.8rem; font-weight:600;">${a.updatedBy || 'Admin'}</span>
                    <div style="font-size:0.68rem; color:var(--text-muted); margin-top:2px;">${a.updatedAt || ''}</div>
                </td>
                <td style="white-space: nowrap;">
                    <button class="btn btn-secondary btn-sm" onclick="editAnnouncement('${a.id}')" style="margin-right:6px; padding:6px 10px; font-size:0.75rem;">
                        <i class="fa-solid fa-pen text-accent"></i> Edit
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="deleteAnnouncement('${a.id}')" style="padding:6px 10px; font-size:0.75rem;">
                        <i class="fa-solid fa-trash text-danger"></i> Padam
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = rowsHtml;
};

window.handleSaveAnnouncement = function (event) {
    event.preventDefault();
    if (currentRole !== "admin") return;

    const idInput = document.getElementById("announcement-id-input").value;
    const title = document.getElementById("announcement-title-input").value.trim();
    const date = document.getElementById("announcement-date-input").value;
    const category = document.getElementById("announcement-category-select").value;
    const content = document.getElementById("announcement-content-input").value.trim();

    if (!title || !date || !category || !content) {
        showToast("Sila lengkapkan semua medan.", "error");
        return;
    }

    const announcements = getAnnouncements();
    
    // Format timestamp: YYYY-MM-DD HH:MM
    const now = new Date();
    const nowStr = now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, '0') + "-" +
        String(now.getDate()).padStart(2, '0') + " " +
        String(now.getHours()).padStart(2, '0') + ":" +
        String(now.getMinutes()).padStart(2, '0');

    const authorName = currentUser ? (currentUser.name || "Admin UPLI") : "Admin UPLI";

    if (idInput) {
        // Edit mode
        const idx = announcements.findIndex(a => a.id === idInput);
        if (idx !== -1) {
            announcements[idx].title = title;
            announcements[idx].date = date;
            announcements[idx].category = category;
            announcements[idx].content = content;
            announcements[idx].updatedBy = authorName;
            announcements[idx].updatedAt = nowStr;

            saveAnnouncements(announcements);
            addLog("info", `Admin mengemaskini makluman: "${title}"`);
            showToast("Makluman berjaya dikemaskini.", "success");
        }
    } else {
        // Add new mode
        const newAnn = {
            id: "ann_" + Date.now(),
            title,
            date,
            category,
            content,
            updatedBy: authorName,
            updatedAt: nowStr
        };
        announcements.push(newAnn);
        saveAnnouncements(announcements);
        addLog("success", `Admin menambah makluman baharu: "${title}"`);
        showToast("Makluman baharu berjaya disimpan.", "success");
    }

    resetAnnouncementForm();
    renderAdminAnnouncements();
};

window.editAnnouncement = function (id) {
    if (currentRole !== "admin") return;
    const announcements = getAnnouncements();
    const ann = announcements.find(a => a.id === id);
    if (!ann) return;

    document.getElementById("announcement-id-input").value = ann.id;
    document.getElementById("announcement-title-input").value = ann.title;
    document.getElementById("announcement-date-input").value = ann.date;
    document.getElementById("announcement-category-select").value = ann.category;
    document.getElementById("announcement-content-input").value = ann.content;

    document.getElementById("admin-announcement-form-title").innerHTML = `<i class="fa-solid fa-pen-to-square text-accent"></i>Edit Makluman`;
    document.getElementById("btn-save-announcement-text").textContent = "Simpan Perubahan";
    document.getElementById("btn-cancel-announcement-edit").style.display = "inline-flex";

    // Scroll to the form card smoothly
    document.getElementById("admin-announcement-form").scrollIntoView({ behavior: 'smooth' });
};

window.resetAnnouncementForm = function () {
    document.getElementById("admin-announcement-form").reset();
    document.getElementById("announcement-id-input").value = "";
    document.getElementById("admin-announcement-form-title").innerHTML = `<i class="fa-solid fa-plus-circle text-primary"></i>Tambah Makluman Baharu`;
    document.getElementById("btn-save-announcement-text").textContent = "Simpan Makluman";
    document.getElementById("btn-cancel-announcement-edit").style.display = "none";
};

window.deleteAnnouncement = function (id) {
    if (currentRole !== "admin") return;
    const announcements = getAnnouncements();
    const ann = announcements.find(a => a.id === id);
    if (!ann) return;

    showConfirm(
        `Adakah anda pasti mahu memadam makluman: "${ann.title}"?`,
        function () {
            const updated = announcements.filter(a => a.id !== id);
            saveAnnouncements(updated);
            addLog("danger", `Admin memadam makluman: "${ann.title}"`);
            showToast("Makluman telah dipadamkan.", "info");
            renderAdminAnnouncements();
        },
        "Padam Makluman",
        "Ya, Padam"
    );
};

// Global handler — trigger file input click
window.triggerFileUpload = function (docId) {
    const input = document.getElementById(`file-input-${docId}`);
    if (input) input.click();
};

// Helper: save file document data to student record + Firestore
function saveDocumentToStudent(studentIdx, docId, docData, students) {
    students[studentIdx].documents[docId] = docData;
    saveStudents(students, students[studentIdx].regNo);
    currentUser = students[studentIdx];
    addLog("info", `Pelajar ${currentUser.name} memuat naik dokumen: ${getDocMetadata(docId, currentUser).title}`);
    showToast(`Fail "${docData.fileName}" berjaya dimuat naik untuk semakan.`, "success");
    renderStudentDocuments();
}

// Helper: upload file to Storage, fallback to base64 if unavailable
let storageFailedOnce = false;
try { storageFailedOnce = sessionStorage.getItem("upli_storage_failed") === "true"; } catch(e){}

// Helper: upload file to Storage, fallback to base64 if unavailable
async function uploadFileWithFallback(file, storagePath, onProgress) {
    if (storageFailedOnce) {
        console.warn("Bypassing Firebase Storage due to a previous failure. Using base64 fallback directly.");
        return { useBase64: true };
    }
    if (typeof USE_FIREBASE_STORAGE === 'undefined' || !USE_FIREBASE_STORAGE || typeof storage === 'undefined' || !storage) {
        console.warn("Firebase Storage is disabled or undefined, using base64 fallback.");
        return { useBase64: true };
    }
    try {
        const storageRef = storage.ref(storagePath);
        const uploadTask = storageRef.put(file);
        return new Promise((resolve) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                    console.log(`Upload Storage: ${pct}%`);
                    if (onProgress) onProgress(pct);
                },
                (error) => {
                    console.warn("Storage unavailable, using base64 fallback:", error.code);
                    storageFailedOnce = true;
                    try { sessionStorage.setItem("upli_storage_failed", "true"); } catch(e){}
                    resolve({ useBase64: true });
                },
                async () => {
                    try {
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                        resolve({ useBase64: false, downloadURL });
                    } catch (urlErr) {
                        console.warn("Failed to get download URL, using base64 fallback:", urlErr);
                        storageFailedOnce = true;
                        try { sessionStorage.setItem("upli_storage_failed", "true"); } catch(e){}
                        resolve({ useBase64: true });
                    }
                }
            );
        });
    } catch (err) {
        console.warn("Storage error, fallback:", err);
        storageFailedOnce = true;
        try { sessionStorage.setItem("upli_storage_failed", "true"); } catch(e){}
        return { useBase64: true };
    }
}

window.handleFileSelected = async function (event, docId) {
    const file = event.target.files[0];
    if (!file) return;

    // Size validation (Max 20MB)
    if (file.size > FS_MAX_FILE_SIZE) {
        showToast(`Fail terlalu besar! Had maksimum ialah ${FS_MAX_FILE_SIZE / 1024 / 1024}MB.`, "error");
        return;
    }

    // Format validation
    if (docId === "slaid_pembentangan") {
        const name = file.name.toLowerCase();
        if (!name.endsWith(".ppt") && !name.endsWith(".pptx") && !name.endsWith(".pdf")) {
            showToast("Hanya format PowerPoint (.ppt, .pptx) atau PDF dibenarkan!", "error");
            return;
        }
    } else if (docId === "screenshot_pes" || docId === "screenshot_maklum_balas") {
        const name = file.name.toLowerCase();
        if (!name.endsWith(".png") && !name.endsWith(".jpg") && !name.endsWith(".jpeg")) {
            showToast("Hanya tangkapan skrin (screenshot) berformat imej PNG, JPG, atau JPEG dibenarkan!", "error");
            return;
        }
    } else {
        const name = file.name.toLowerCase();
        if (!name.endsWith(".pdf") && !name.endsWith(".png") && !name.endsWith(".jpg") && !name.endsWith(".jpeg")) {
            showToast("Hanya fail PDF, PNG, atau JPG dibenarkan untuk dokumen ini!", "error");
            return;
        }
    }

    const now = new Date();
    const formattedTime = now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, '0') + "-" +
        String(now.getDate()).padStart(2, '0') + " " +
        String(now.getHours()).padStart(2, '0') + ":" +
        String(now.getMinutes()).padStart(2, '0');

    // Set global upload progress
    window.uploadProgress = window.uploadProgress || {};
    window.uploadProgress[docId] = 0;
    renderStudentDocuments();

    try {
        const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png)$/i.test(file.name);
        let finalFileName = file.name;

        if (isImage) {
            if (!finalFileName.toLowerCase().endsWith(".jpg") && !finalFileName.toLowerCase().endsWith(".jpeg")) {
                finalFileName = finalFileName.substring(0, finalFileName.lastIndexOf('.')) + ".jpg";
            }
        }

        const rawSizeKB = file.size / 1024;
        const sizeStr = rawSizeKB > 1000 ? (rawSizeKB / 1024).toFixed(1) + " MB" : Math.round(rawSizeKB) + " KB";

        if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
            window.uploadProgress[docId] = "Membaca Fail...";
            updateUploadProgressDOM(docId, "Membaca Fail...");
            let base64Data;
            if (isImage) {
                base64Data = await compressImage(file, 1000, 1000, 0.6);
            } else {
                base64Data = await readFileAsBase64(file);
            }
            
            if (base64Data.includes(";base64,")) {
                base64Data = base64Data.split(";base64,")[1];
            }

            window.uploadProgress[docId] = "Menyimpan ke Google Drive...";
            updateUploadProgressDOM(docId, "Menyimpan ke Google Drive...");

            const res = await callGoogleScript("uploadFile", {
                regNo: currentUser.regNo,
                docId: docId,
                fileName: finalFileName,
                base64Data: base64Data
            });

            if (res && res.fileId) {
                const students = getStudents();
                const studentIdx = students.findIndex(s => s.regNo === currentUser.regNo);
                if (studentIdx !== -1) {
                    const docData = {
                        status: "Dalam Semakan",
                        fileName: finalFileName,
                        fileSize: res.fileSize || sizeStr,
                        uploadDate: formattedTime,
                        fileId: res.fileId,
                        feedback: ""
                    };
                    window.uploadProgress[docId] = 100;
                    updateUploadProgressDOM(docId, 100);
                    saveDocumentToStudent(studentIdx, docId, docData, students);
                }
            } else {
                showToast("Gagal menyimpan dokumen ke Google Drive.", "error");
            }
            return;
        }

        window.uploadProgress[docId] = 30;
        updateUploadProgressDOM(docId, 30);

        const storagePath = `documents/${currentUser.regNo}/${docId}/${Date.now()}_${finalFileName}`;

        // Try Firebase Storage first (will fallback to base64 if false/disabled)
        const result = await uploadFileWithFallback(file, storagePath, (pct) => {
            const scaledPct = Math.round(30 + (pct * 0.6));
            window.uploadProgress[docId] = scaledPct;
            updateUploadProgressDOM(docId, scaledPct);
        });

        const students = getStudents();
        const studentIdx = students.findIndex(s => s.regNo === currentUser.regNo);
        if (studentIdx === -1) return;

        const docData = {
            status: "Dalam Semakan",
            fileName: finalFileName,
            fileSize: sizeStr,
            uploadDate: formattedTime,
            feedback: ""
        };

        if (!result.useBase64) {
            window.uploadProgress[docId] = 95;
            updateUploadProgressDOM(docId, 95);
            docData.fileUrl = result.downloadURL;
        } else {
            let base64Data;
            if (isImage) {
                window.uploadProgress[docId] = "Mengompresi Gambar...";
                updateUploadProgressDOM(docId, "Mengompresi Gambar...");
                base64Data = await compressImage(file, 1000, 1000, 0.6);
            } else {
                window.uploadProgress[docId] = "Membaca Fail...";
                updateUploadProgressDOM(docId, "Membaca Fail...");
                base64Data = await readFileAsBase64(file);
            }
            
            const b64SizeKB = (base64Data.length * 3 / 4) / 1024;
            docData.fileSize = b64SizeKB > 1000 ? (b64SizeKB / 1024).toFixed(1) + " MB" : Math.round(b64SizeKB) + " KB";

            window.uploadProgress[docId] = "Menyimpan ke DB...";
            updateUploadProgressDOM(docId, "Menyimpan ke DB...");
            const fileRef = await saveFileToFirestore(currentUser.regNo, docId, base64Data);
            docData.fileRef = fileRef;
            docData.fileData = base64Data;
        }

        window.uploadProgress[docId] = 100;
        updateUploadProgressDOM(docId, 100);

        saveDocumentToStudent(studentIdx, docId, docData, students);
        showToast(`Fail "${finalFileName}" berjaya dimuat naik.`, "success");
    } catch (uploadErr) {
        console.error("Gagal memuat naik dokumen:", uploadErr);
        showToast("Gagal memuat naik fail. Sila cuba lagi.", "error");
    } finally {
        delete window.uploadProgress[docId];
        renderStudentDocuments();
    }
};

function updateUploadProgressDOM(docId, val) {
    const label = document.getElementById(`progress-label-${docId}`);
    const bar = document.getElementById(`progress-bar-${docId}`);
    if (label) {
        const text = typeof val === 'number' ? `${val}%` : val;
        label.textContent = `Muat Naik: ${text}`;
    }
    if (bar) {
        const width = typeof val === 'number' ? `${val}%` : '100%';
        bar.style.width = width;
    }
}

// Image compression helper using HTML5 Canvas
function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl);
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
}

window.handleLecturerFileUpload = async function (regNo, docId, inputEl) {
    const file = inputEl.files[0];
    if (!file) return;

    if (file.size > FS_MAX_FILE_SIZE) {
        showToast(`Fail terlalu besar! Had ialah ${FS_MAX_FILE_SIZE / 1024 / 1024}MB.`, "error");
        return;
    }

    const now = new Date();
    const formattedTime = now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, '0') + "-" +
        String(now.getDate()).padStart(2, '0') + " " +
        String(now.getHours()).padStart(2, '0') + ":" +
        String(now.getMinutes()).padStart(2, '0');

    showToast(`Memproses fail...`, "info");

    try {
        const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png)$/i.test(file.name);
        let finalFileName = file.name;

        if (isImage) {
            if (!finalFileName.toLowerCase().endsWith(".jpg") && !finalFileName.toLowerCase().endsWith(".jpeg")) {
                finalFileName = finalFileName.substring(0, finalFileName.lastIndexOf('.')) + ".jpg";
            }
        }

        const rawSizeKB = file.size / 1024;
        const sizeStr = rawSizeKB > 1000 ? (rawSizeKB / 1024).toFixed(1) + " MB" : Math.round(rawSizeKB) + " KB";

        const storagePath = `lecturer_docs/${regNo}/${docId}/${Date.now()}_${finalFileName}`;
        const result = await uploadFileWithFallback(file, storagePath, null);

        const students = getStudents();
        const studentIdx = students.findIndex(s => s.regNo === regNo);
        if (studentIdx === -1) return;

        const docData = {
            status: "Diterima",
            fileName: finalFileName,
            fileSize: sizeStr,
            uploadDate: formattedTime,
            feedback: "Dimuat naik oleh Pensyarah Seliaan"
        };

        if (!result.useBase64) {
            docData.fileUrl = result.downloadURL;
        } else {
            showToast(`Menyimpan "${finalFileName}" ke pangkalan data...`, "info");
            
            let base64Data;
            if (isImage) {
                base64Data = await compressImage(file, 1000, 1000, 0.6);
            } else {
                base64Data = await readFileAsBase64(file);
            }
            
            const b64SizeKB = (base64Data.length * 3 / 4) / 1024;
            docData.fileSize = b64SizeKB > 1000 ? (b64SizeKB / 1024).toFixed(1) + " MB" : Math.round(b64SizeKB) + " KB";

            const fileRef = await saveFileToFirestore(regNo, docId, base64Data);
            docData.fileRef = fileRef;
            docData.fileData = base64Data;
        }

        students[studentIdx].documents[docId] = docData;
        saveStudents(students);
        addLog("info", `Pensyarah memuat naik borang markah (${docId}) bagi pelajar ${students[studentIdx].name} (${regNo})`);
        showToast(`Fail "${finalFileName}" berjaya dimuat naik dan diluluskan.`, "success");
        renderLecturerStudentsList();
    } catch (err) {
        console.error("Gagal memuat naik fail pensyarah:", err);
        showToast("Gagal memuat naik fail. Sila cuba lagi.", "error");
    }
};


// Bulk selection and actions binding
function setupBulkActionListeners() {
    const selectAllCheck = document.getElementById("admin-student-select-all");
    const bulkDeleteBtn  = document.getElementById("btn-bulk-delete");
    const bulkApproveBPBtn = document.getElementById("btn-bulk-approve-bp");
    const countDisplay   = document.getElementById("bulk-select-count");

    if (!selectAllCheck) return; // safeguard if elements are not in DOM

    // Select All checkbox change
    selectAllCheck.addEventListener("change", function () {
        const checkboxes = document.querySelectorAll(".student-select-checkbox");
        checkboxes.forEach(cb => cb.checked = this.checked);
        updateBulkCount();
    });

    // Update bulk action bar states
    window.updateBulkCount = function () {
        const checkboxes   = document.querySelectorAll(".student-select-checkbox");
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;

        countDisplay.textContent = `${checkedCount} pelajar dipilih`;

        // --- Bulk Delete button ---
        if (checkedCount > 0) {
            bulkDeleteBtn.disabled = false;
            bulkDeleteBtn.style.background   = "var(--color-danger)";
            bulkDeleteBtn.style.color        = "white";
            bulkDeleteBtn.style.borderColor  = "var(--color-danger)";
        } else {
            bulkDeleteBtn.disabled = true;
            bulkDeleteBtn.style.background   = "rgba(244,63,94,0.08)";
            bulkDeleteBtn.style.color        = "var(--color-danger)";
            bulkDeleteBtn.style.borderColor  = "rgba(244,63,94,0.15)";
        }

        // --- Bulk Approve BP button ---
        if (bulkApproveBPBtn) {
            if (checkedCount > 0) {
                bulkApproveBPBtn.disabled          = false;
                bulkApproveBPBtn.style.opacity     = "1";
                bulkApproveBPBtn.style.cursor      = "pointer";
                bulkApproveBPBtn.style.background  = "rgba(16,185,129,0.14)";
                bulkApproveBPBtn.style.borderColor = "rgba(16,185,129,0.4)";
            } else {
                bulkApproveBPBtn.disabled          = true;
                bulkApproveBPBtn.style.opacity     = "0.5";
                bulkApproveBPBtn.style.cursor      = "not-allowed";
                bulkApproveBPBtn.style.background  = "rgba(16,185,129,0.08)";
                bulkApproveBPBtn.style.borderColor = "rgba(16,185,129,0.2)";
            }
        }

        // --- Bulk Move to PKLI button ---
        const bulkMovePKLIBtn = document.getElementById("btn-bulk-move-pkli");
        if (bulkMovePKLIBtn) {
            if (checkedCount > 0) {
                bulkMovePKLIBtn.disabled          = false;
                bulkMovePKLIBtn.style.opacity     = "1";
                bulkMovePKLIBtn.style.cursor      = "pointer";
                bulkMovePKLIBtn.style.background  = "rgba(245,158,11,0.18)";
                bulkMovePKLIBtn.style.borderColor = "rgba(245,158,11,0.5)";
            } else {
                bulkMovePKLIBtn.disabled          = true;
                bulkMovePKLIBtn.style.opacity     = "0.5";
                bulkMovePKLIBtn.style.cursor      = "not-allowed";
                bulkMovePKLIBtn.style.background  = "rgba(245,158,11,0.1)";
                bulkMovePKLIBtn.style.borderColor = "rgba(245,158,11,0.3)";
            }
        }

        // Update Select All checkbox state
        if (checkboxes.length > 0 && checkedCount === checkboxes.length) {
            selectAllCheck.checked       = true;
            selectAllCheck.indeterminate = false;
        } else if (checkedCount > 0) {
            selectAllCheck.checked       = false;
            selectAllCheck.indeterminate = true;
        } else {
            selectAllCheck.checked       = false;
            selectAllCheck.indeterminate = false;
        }
    };

    // ── BULK DELETE ──────────────────────────────────────────────────────────
    bulkDeleteBtn.addEventListener("click", () => {
        const checkboxes = document.querySelectorAll(".student-select-checkbox:checked");
        const regs = Array.from(checkboxes).map(cb => cb.dataset.reg);

        if (regs.length === 0) return;

        showConfirm(
            `Adakah anda pasti mahu memadamkan ${regs.length} rekod pelajar yang dipilih secara pukal? Tindakan ini akan memadamkan fail dan maklumat mereka secara kekal.`,
            function () {
                const students = getStudents();
                const updated = students.filter(s => {
                    if (regs.includes(s.regNo)) {
                        deleteStudentFromFirestore(s.regNo);
                        return false;
                    }
                    return true;
                });
                saveStudents(updated);
                addLog("danger", `Admin memadam secara pukal ${regs.length} pelajar.`);
                showToast(`${regs.length} rekod pelajar berjaya dipadamkan secara pukal.`, "info");

                selectAllCheck.checked       = false;
                selectAllCheck.indeterminate = false;
                updateBulkCount();

                renderAdminStudentsTable();
                renderAdminDashboard();
                renderAdminLecturerAssignTable();
            },
            "Padam Pelajar Terpilih",
            "Ya, Padam Semuanya"
        );
    });

    // ── BULK APPROVE BORANG PENDAFTARAN LI (BP) ──────────────────────────────
    const headerBulkApproveBtn = document.getElementById("btn-header-bulk-approve-bp");

    if (bulkApproveBPBtn || headerBulkApproveBtn) {
        const bpModal        = document.getElementById("bulk-approve-bp-modal");
        const bpCancelBtn    = document.getElementById("btn-bulk-bp-cancel");
        const bpConfirmBtn   = document.getElementById("btn-bulk-bp-confirm");
        const bpSubtitle     = document.getElementById("bulk-bp-modal-subtitle");
        const bpChips        = document.getElementById("bulk-bp-student-chips");
        const bpFeedback     = document.getElementById("bulk-bp-feedback");
        const bpProgressWrap = document.getElementById("bulk-bp-progress-wrap");
        const bpProgressBar  = document.getElementById("bulk-bp-progress-bar");
        const bpProgressText = document.getElementById("bulk-bp-progress-text");

        const openBPModal = () => {
            const checkboxes = document.querySelectorAll(".student-select-checkbox:checked");
            const regs = Array.from(checkboxes).map(cb => cb.dataset.reg);

            if (regs.length === 0) {
                showToast("Sila tandakan sekurang-kurangnya 1 pelajar dalam jadual (gunakan checkbox) untuk mengesahkan BP!", "info");
                return;
            }

            const students = getStudents();

            // Build subtitle
            bpSubtitle.textContent = `${regs.length} pelajar dipilih untuk pengesahan Borang Pendaftaran LI (BP)`;

            // Build student chips
            bpChips.innerHTML = regs.map(reg => {
                const s = students.find(st => st.regNo === reg);
                const name = s ? s.name : reg;
                const bpStatus = s && s.documents && s.documents.borang_pendaftaran_li
                    ? s.documents.borang_pendaftaran_li.status : "Belum Dihantar";
                const statusColor = bpStatus === "Diterima" ? "#10b981"
                    : bpStatus === "Ditolak"  ? "#f43f5e" : "#64748b";
                return `
                <div style="display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:20px;background:rgba(255,255,255,0.05);border:1px solid var(--border-color);font-size:0.78rem;">
                    <div style="width:8px;height:8px;border-radius:50%;background:${statusColor};flex-shrink:0;"></div>
                    <span style="font-weight:600;color:var(--text-primary);white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis;" title="${name}">${name}</span>
                </div>`;
            }).join('');

            // Reset controls
            document.querySelector('input[name="bulk-bp-action"][value="Diterima"]').checked = true;
            bpFeedback.value       = "";
            bpProgressWrap.style.display = "none";
            bpProgressBar.style.width    = "0%";
            bpProgressText.textContent   = "0%";
            bpConfirmBtn.disabled        = false;
            bpConfirmBtn.innerHTML       = '<i class="fa-solid fa-clipboard-check"></i> Sahkan Sekarang';

            bpModal.style.display = "flex";
        };

        if (bulkApproveBPBtn)     bulkApproveBPBtn.addEventListener("click", openBPModal);
        if (headerBulkApproveBtn) headerBulkApproveBtn.addEventListener("click", openBPModal);

        // Close modal
        bpCancelBtn.addEventListener("click", () => {
            bpModal.style.display = "none";
        });
        bpModal.addEventListener("click", (e) => {
            if (e.target === bpModal) bpModal.style.display = "none";
        });

        // Confirm bulk approve
        bpConfirmBtn.addEventListener("click", async () => {
            const checkboxes = document.querySelectorAll(".student-select-checkbox:checked");
            const regs = Array.from(checkboxes).map(cb => cb.dataset.reg);
            if (regs.length === 0) return;

            const chosenStatus = document.querySelector('input[name="bulk-bp-action"]:checked').value;
            const feedback     = bpFeedback.value.trim();

            const now = new Date();
            const formattedTime = now.getFullYear() + "-" +
                String(now.getMonth() + 1).padStart(2, '0') + "-" +
                String(now.getDate()).padStart(2, '0') + " " +
                String(now.getHours()).padStart(2, '0') + ":" +
                String(now.getMinutes()).padStart(2, '0');

            // Show progress
            bpProgressWrap.style.display = "block";
            bpConfirmBtn.disabled        = true;
            bpConfirmBtn.innerHTML       = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';

            const students = getStudents();
            let processed  = 0;

            for (const reg of regs) {
                const idx = students.findIndex(s => s.regNo === reg);
                if (idx === -1) { processed++; continue; }

                // Ensure documents object exists
                if (!students[idx].documents) students[idx].documents = {};
                if (!students[idx].documents.borang_pendaftaran_li) {
                    students[idx].documents.borang_pendaftaran_li = {
                        status:     "Belum Dihantar",
                        fileName:   "(Borang Fizikal)",
                        fileSize:   "-",
                        uploadDate: formattedTime,
                        feedback:   "",
                        fileUrl:    ""
                    };
                }

                // Apply status & feedback
                students[idx].documents.borang_pendaftaran_li.status   = chosenStatus;
                students[idx].documents.borang_pendaftaran_li.feedback  = feedback ||
                    (chosenStatus === "Diterima"
                        ? `Borang Pendaftaran LI telah disahkan oleh Admin UPLI pada ${formattedTime}.`
                        : `Borang Pendaftaran LI ditolak oleh Admin UPLI pada ${formattedTime}.`);

                // Animate progress bar per student
                processed++;
                const pct = Math.round((processed / regs.length) * 100);
                bpProgressBar.style.width    = `${pct}%`;
                bpProgressText.textContent   = `${pct}%`;

                // Small delay for visual feedback (non-blocking)
                await new Promise(r => setTimeout(r, 120));
            }

            // Save all at once
            saveStudents(students, regs.length === 1 ? regs[0] : regs);
            addLog("info", `Admin mengesahkan BP [${chosenStatus}] secara pukal bagi ${regs.length} pelajar.`);

            // Completion state
            bpProgressBar.style.width  = "100%";
            bpProgressText.textContent = "100%";
            bpConfirmBtn.innerHTML     = '<i class="fa-solid fa-circle-check"></i> Selesai!';
            bpConfirmBtn.style.background = "linear-gradient(135deg,#059669,#047857)";

            showToast(
                `Berjaya! BP berstatus "${chosenStatus}" telah ditetapkan bagi ${regs.length} pelajar.`,
                chosenStatus === "Diterima" ? "success" : "info"
            );

            setTimeout(() => {
                bpModal.style.display = "none";
                // Reset button style
                bpConfirmBtn.style.background = "linear-gradient(135deg,#10b981,#059669)";

                // Deselect all
                document.querySelectorAll(".student-select-checkbox").forEach(cb => cb.checked = false);
                selectAllCheck.checked       = false;
                selectAllCheck.indeterminate = false;
                updateBulkCount();

                renderAdminStudentsTable();
                renderAdminDashboard();
                updatePKLICountBadge();
            }, 900);
        });
    }

    // ── BULK MOVE TO PKLI ───────────────────────────────────────────────────
    const bulkMovePKLIBtn = document.getElementById("btn-bulk-move-pkli");
    if (bulkMovePKLIBtn) {
        bulkMovePKLIBtn.addEventListener("click", () => {
            const checkboxes = document.querySelectorAll(".student-select-checkbox:checked");
            const regs = Array.from(checkboxes).map(cb => cb.dataset.reg);
            if (regs.length === 0) return;

            showConfirm(
                `Adakah anda pasti mahu memindahkan ${regs.length} pelajar yang dipilih ke Senarai PKLI (Penangguhan Kursus LI)?`,
                function () {
                    const students = getStudents();
                    regs.forEach(reg => {
                        const st = students.find(s => s.regNo === reg);
                        if (st) {
                            st.isPKLI = true;
                            st.statusLI = "PKLI";
                        }
                    });
                    saveStudents(students, regs.length === 1 ? regs[0] : regs);
                    addLog("warning", `Admin memindahkan ${regs.length} pelajar ke Senarai PKLI.`);
                    showToast(`Berjaya! ${regs.length} pelajar telah dipindahkan ke Senarai PKLI.`, "warning");

                    document.querySelectorAll(".student-select-checkbox").forEach(cb => cb.checked = false);
                    if (selectAllCheck) {
                        selectAllCheck.checked       = false;
                        selectAllCheck.indeterminate = false;
                    }
                    updateBulkCount();

                    renderAdminStudentsTable();
                    renderAdminDashboard();
                    updatePKLICountBadge();
                },
                "⚠️ Pindah ke PKLI",
                "Ya, Pindahkan"
            );
        });
    }

    // ── PKLI MODAL & LIST LISTENERS ─────────────────────────────────────────
    const btnViewPKLIList = document.getElementById("btn-view-pkli-list");
    const pkliModal       = document.getElementById("pkli-list-modal");
    const btnClosePKLI    = document.getElementById("btn-close-pkli-modal");
    const pkliSearchInput = document.getElementById("pkli-search-input");

    if (btnViewPKLIList && pkliModal) {
        btnViewPKLIList.addEventListener("click", () => {
            pkliModal.style.display = "flex";
            renderPKLITable();
        });
    }
    if (btnClosePKLI && pkliModal) {
        btnClosePKLI.addEventListener("click", () => {
            pkliModal.style.display = "none";
        });
    }
    if (pkliSearchInput) {
        pkliSearchInput.addEventListener("input", renderPKLITable);
    }
    updatePKLICountBadge();
}

// Render PKLI Table inside Modal
function renderPKLITable() {
    const tbody     = document.getElementById("pkli-table-body");
    const countEl   = document.getElementById("pkli-modal-count-text");
    const searchVal = (document.getElementById("pkli-search-input") ? document.getElementById("pkli-search-input").value : "").trim().toLowerCase();
    const students  = getStudents();

    const pkliStudents = students.filter(s =>
        Boolean(s.isPKLI) &&
        (
            (s.name || "").toLowerCase().includes(searchVal) ||
            (s.regNo || "").toLowerCase().includes(searchVal) ||
            (s.jabatan || "").toLowerCase().includes(searchVal) ||
            (s.tempatLI || "").toLowerCase().includes(searchVal)
        )
    );

    if (countEl) countEl.textContent = `${pkliStudents.length} Pelajar PKLI`;

    if (!tbody) return;

    if (pkliStudents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--text-muted);">Tiada pelajar di dalam Senarai PKLI.</td></tr>`;
        return;
    }

    let rowsHtml = "";
    pkliStudents.forEach(s => {
        rowsHtml += `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div class="avatar mini-avatar">${getInitials(s.name)}</div>
                        <strong>${s.name}</strong>
                    </div>
                </td>
                <td style="text-align:center;"><code>${s.regNo}</code></td>
                <td><span class="badge" style="background:rgba(99,102,241,0.1); color:#6366f1;">${s.jabatan || '-'}</span></td>
                <td><span style="font-size:0.8rem; color:var(--text-muted);">${s.sesi || '-'}</span></td>
                <td><span style="font-size:0.85rem;">${s.tempatLI || 'Belum Ditentukan'}</span></td>
                <td style="text-align:center;">
                    <button class="btn btn-sm" onclick="restoreFromPKLI('${s.regNo}')"
                        style="padding: 5px 12px; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); color: #059669; border-radius: 6px; font-weight: 600; font-size: 0.8rem; cursor: pointer; transition: all 0.2s;">
                        <i class="fa-solid fa-rotate-left"></i> Pulihkan
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = rowsHtml;
}

window.restoreFromPKLI = function(regNo) {
    const students = getStudents();
    const st = students.find(s => s.regNo === regNo);
    if (st) {
        st.isPKLI = false;
        st.statusLI = "Aktif";
        saveStudents(students, regNo);
        addLog("info", `Admin mengembalikan pelajar ${st.name} (${regNo}) dari Senarai PKLI ke senarai pelajar aktif.`);
        showToast(`Pelajar ${st.name} telah dikembalikan ke senarai pelajar aktif.`, "success");

        renderPKLITable();
        renderAdminStudentsTable();
        renderAdminDashboard();
        updatePKLICountBadge();
    }
};

function updatePKLICountBadge() {
    const students = getStudents();
    const pkliCount = students.filter(s => Boolean(s.isPKLI)).length;
    const badge = document.getElementById("pkli-count-badge");
    if (badge) badge.textContent = pkliCount;
}
window.updatePKLICountBadge = updatePKLICountBadge;

// Shared: Delete ALL students globally — used by both Pengurusan Pelajar & Pengurusan Pensyarah
function deleteAllStudentsGlobal() {
    const students = getStudents();
    const totalCount = students.length;

    if (totalCount === 0) {
        showToast("Tiada rekod pelajar untuk dipadamkan.", "info");
        return;
    }

    showConfirm(
        `⚠️ AMARAN KERAS: Adakah anda pasti mahu memadamkan KESEMUA ${totalCount} rekod pelajar merentas SEMUA jabatan dan semua sesi akademik? Tindakan ini TIDAK BOLEH DIUNDURKAN!`,
        function () {
            getStudents().forEach(s => deleteStudentFromFirestore(s.regNo));
            saveStudents([]);
            addLog("danger", `Admin memadam SEMUA ${totalCount} rekod pelajar merentas semua jabatan dan sesi.`);
            showToast(`Kesemua ${totalCount} rekod pelajar telah dipadamkan sepenuhnya.`, "info");

            renderAdminStudentsTable();
            renderAdminDashboard();
            renderAdminLecturerAssignTable();

            const selectAllCheck = document.getElementById("admin-student-select-all");
            if (selectAllCheck) {
                selectAllCheck.checked = false;
                selectAllCheck.indeterminate = false;
                if (window.updateBulkCount) updateBulkCount();
            }
        },
        "⚠️ Padam SEMUA Pelajar Seluruh Sistem",
        "Ya, Padam Semua Sepenuhnya"
    );
}

// Complete Reset of all student records and sessions across App, Google Sheets & Firestore
async function resetAllStudentsAndSessionsGlobal() {
    const defaultSesi = "Sesi 1:2026/2027";

    showConfirm(
        `⚠️ AMARAN KERAS: Adakah anda pasti mahu MENGESET SEMULA (RESET) KESEMUA data pelajar dan sesi akademik pada aplikasi dan Google Sheets? Tindakan ini akan memadamkan SEMUA rekod pelajar dan sesi secara kekal!`,
        async function () {
            // 1. Reset dbCache
            dbCache.students = [];
            dbCache.sessions = [defaultSesi];
            dbCache.activeSession = defaultSesi;

            // 2. Reset localStorage
            localStorage.setItem("upli_students", "[]");
            localStorage.setItem("upli_sessions", JSON.stringify([defaultSesi]));
            localStorage.setItem("upli_active_session", defaultSesi);
            localStorage.setItem("upli_cache_ts", String(Date.now()));

            // 3. Reset Google Sheets if configured
            if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
                try {
                    await callGoogleScript("writeStudents", { data: [] });
                    await callGoogleScript("writeSettings", { 
                        data: { 
                            sessions: [defaultSesi], 
                            activeSession: defaultSesi 
                        } 
                    });
                } catch (e) {
                    console.warn("Google Script reset error:", e);
                }
            }

            // 4. Reset Firestore collection
            try {
                const snap = await db.collection("students").get();
                if (!snap.empty) {
                    const batch = db.batch();
                    snap.docs.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                }
            } catch (e) {
                console.warn("Firestore student reset warning:", e);
            }

            // 5. Update UI
            populateGlobalSessionSelect();
            renderAdminStudentsTable();
            renderAdminDashboard();
            renderAdminLecturerAssignTable();

            const selectAllCheck = document.getElementById("admin-student-select-all");
            if (selectAllCheck) {
                selectAllCheck.checked = false;
                selectAllCheck.indeterminate = false;
                if (window.updateBulkCount) updateBulkCount();
            }

            addLog("danger", "Admin telah set semula (reset) KESEMUA data pelajar dan sesi pada aplikasi dan Google Sheets.");
            showToast("✅ Kesemua data pelajar dan sesi telah dipadam & di-reset secara kekal!", "success");
        },
        "⚠️ Reset SEMUA Data Pelajar & Sesi",
        "Ya, Reset Semua Sepenuhnya"
    );
}

window.resetAllStudentsAndSessionsGlobal = resetAllStudentsAndSessionsGlobal;

// Bind Padam/Reset Semua Pelajar button in Pengurusan Pensyarah tab
document.addEventListener("DOMContentLoaded", () => {
    const btnDeleteAllFromLecturers = document.getElementById("btn-delete-all-from-lecturers");
    if (btnDeleteAllFromLecturers) {
        btnDeleteAllFromLecturers.addEventListener("click", resetAllStudentsAndSessionsGlobal);
    }
});

// --------------------------------------------------------------------------
// L. LIGHT/DARK MODE & THEME & PROFILE MANAGEMENT
// --------------------------------------------------------------------------

// Theme Color dynamically based on Department
function applyDeptTheme(dept) {
    document.body.classList.remove("dept-theme-jka", "dept-theme-jke", "dept-theme-jkm", "dept-theme-jp", "dept-theme-jph");
    if (dept) {
        const lowerDept = dept.toLowerCase().trim();
        if (["jka", "jke", "jkm", "jp", "jph"].includes(lowerDept)) {
            document.body.classList.add(`dept-theme-${lowerDept}`);
        }
    }
}

// Light & Dark Mode Toggle
function initTheme() {
    const savedTheme = localStorage.getItem("upli_theme") || "light";
    const toggleBtn = document.getElementById("theme-toggle-btn");
    const portalToggleBtn = document.getElementById("portal-theme-toggle-btn");

    if (savedTheme === "light") {
        document.body.classList.add("light-mode");
        if (toggleBtn) {
            toggleBtn.innerHTML = `<i class="fa-solid fa-sun" style="color: #eab308; margin-right: 8px;"></i> Mod Cerah`;
        }
        if (portalToggleBtn) {
            portalToggleBtn.innerHTML = `<i class="fa-solid fa-sun" style="color: #eab308; margin-right: 8px;"></i> Mod Cerah`;
        }
    } else {
        document.body.classList.remove("light-mode");
        if (toggleBtn) {
            toggleBtn.innerHTML = `<i class="fa-solid fa-moon" style="margin-right: 8px;"></i> Mod Gelap`;
        }
        if (portalToggleBtn) {
            portalToggleBtn.innerHTML = `<i class="fa-solid fa-moon" style="margin-right: 8px;"></i> Mod Gelap`;
        }
    }
}

// Profile updates (Student)
function updateSelfProfile() {
    if (currentRole !== "student" || !currentUser) return;

    const email = document.getElementById("profile-self-email").value.trim();
    const phone = document.getElementById("profile-self-phone").value.trim();

    const students = getStudents();
    const idx = students.findIndex(s => s.regNo === currentUser.regNo);
    if (idx !== -1) {
        students[idx].email = email;
        students[idx].phone = phone;
        saveStudents(students, currentUser.regNo);

        currentUser.email = email;
        currentUser.phone = phone;

        showToast("Profil peribadi berjaya dikemas kini!", "success");
    }
}

// Profile picture upload parser (Base64)
let adminTempProfilePic = "";

function handleProfilePicUploaded(type, input) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
        showToast("Gagal: Saiz fail imej melebihi had 1MB!", "error");
        input.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const base64 = e.target.result;
        if (type === "self") {
            if (currentRole !== "student" || !currentUser) return;
            const students = getStudents();
            const idx = students.findIndex(s => s.regNo === currentUser.regNo);
            if (idx !== -1) {
                students[idx].profilePic = base64;
                saveStudents(students, currentUser.regNo);
                currentUser.profilePic = base64;

                // Update avatar visuals
                const selfAvatarEl = document.getElementById("profile-card-avatar");
                if (selfAvatarEl) {
                    selfAvatarEl.style.backgroundImage = `url(${base64})`;
                    selfAvatarEl.style.backgroundSize = "cover";
                    selfAvatarEl.style.backgroundPosition = "center";
                    selfAvatarEl.textContent = "";
                }
                updateUserAvatars(currentUser);
                showToast("Gambar profil berjaya dikemas kini!", "success");
            }
        } else if (type === "admin") {
            adminTempProfilePic = base64;
            const adminAvatarEl = document.getElementById("edit-student-modal-avatar");
            if (adminAvatarEl) {
                adminAvatarEl.style.backgroundImage = `url(${base64})`;
                adminAvatarEl.style.backgroundSize = "cover";
                adminAvatarEl.style.backgroundPosition = "center";
                adminAvatarEl.textContent = "";
            }
            showToast("Imej profil dipilih. Sila simpan untuk kemaskini.", "info");
        }
    };
    reader.readAsDataURL(file);
}

// Edit Student Modal (Admin)
function openEditStudentModal(regNo) {
    const students = getStudents();
    const student = students.find(s => s.regNo === regNo);
    if (!student) return;

    document.getElementById("edit-student-reg-hidden").value = student.regNo;
    document.getElementById("edit-student-name").value = student.name;
    document.getElementById("edit-student-email").value = student.email || "";
    document.getElementById("edit-student-phone").value = student.phone || "";
    document.getElementById("edit-student-tempat").value = student.tempatLI || "";
    document.getElementById("edit-student-daerah").value = student.daerah || "";
    document.getElementById("edit-student-jabatan").value = student.jabatan || "JKA";

    // Load academic sessions
    const sessions = getSessions();
    const sessionSelect = document.getElementById("edit-student-sesi");
    sessionSelect.innerHTML = "";
    sessions.forEach(sesi => {
        const opt = document.createElement("option");
        opt.value = sesi;
        opt.textContent = sesi;
        opt.style.setProperty('color', '#000000', 'important');
        opt.style.setProperty('background-color', '#ffffff', 'important');
        if (sesi === student.sesi) opt.selected = true;
        sessionSelect.appendChild(opt);
    });

    // Load lecturers for PA dropdown
    const lecturers = getLecturers();
    const paSelect = document.getElementById("edit-student-pa");
    if (paSelect) {
        paSelect.innerHTML = '<option value="">-- Belum Diagihkan --</option>';
        lecturers.forEach(l => {
            const opt = document.createElement("option");
            opt.value = l.email;
            opt.textContent = `${l.name} (${l.email})`;
            opt.style.setProperty('color', '#000000', 'important');
            opt.style.setProperty('background-color', '#ffffff', 'important');
            if (l.email === student.penasihatAkademik) opt.selected = true;
            paSelect.appendChild(opt);
        });
    }

    adminTempProfilePic = student.profilePic || "";

    const avatarEl = document.getElementById("edit-student-modal-avatar");
    if (avatarEl) {
        if (student.profilePic) {
            avatarEl.style.backgroundImage = `url(${student.profilePic})`;
            avatarEl.style.backgroundSize = "cover";
            avatarEl.style.backgroundPosition = "center";
            avatarEl.textContent = "";
        } else {
            avatarEl.style.backgroundImage = "none";
            avatarEl.textContent = getInitials(student.name);
        }
    }

    document.getElementById("edit-student-modal").classList.add("active");
}

function closeEditStudentModal() {
    document.getElementById("edit-student-modal").classList.remove("active");
}

// --------------------------------------------------------------------------
// M. INITIALIZATION & SETUP
// --------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    // ── STEP 1: Load cache from localStorage instantly (synchronous, zero delay) ──
    try {
        const ls = localStorage;
        dbCache.admins       = JSON.parse(ls.getItem("upli_admins")        || JSON.stringify(DEFAULT_ADMINS));
        dbCache.lecturers    = JSON.parse(ls.getItem("upli_lecturers")     || JSON.stringify(DEFAULT_LECTURERS));
        dbCache.students     = JSON.parse(ls.getItem("upli_students")      || "[]");
        normalizeStudentsCache();
        dbCache.sessions     = JSON.parse(ls.getItem("upli_sessions")      || JSON.stringify(DEFAULT_SESSIONS));
        dbCache.activeSession = ls.getItem("upli_active_session")          || "Sesi 1:2026/2027";
        dbCache.logs         = JSON.parse(ls.getItem("upli_logs")          || JSON.stringify(DEFAULT_LOGS));
        dbCache.rubriks      = JSON.parse(ls.getItem("upli_rubriks")       || "[]");
        dbCache.announcements= JSON.parse(ls.getItem("upli_announcements") || JSON.stringify(DEFAULT_ANNOUNCEMENTS));
    } catch(e) {}

    // ── STEP 2: Start UI immediately with cached data ──
    startClock();
    setupBulkActionListeners();
    initTheme();
    populateGlobalSessionSelect();

    // Restore session from sessionStorage if exists (cleared when app/tab is closed)
    const savedUser = sessionStorage.getItem("upli_user");
    const savedRole = sessionStorage.getItem("upli_role");
    if (savedUser && savedRole) {
        try {
            const userObj = JSON.parse(savedUser);
            const students = getStudents();
            let refreshedUser = userObj;
            if (savedRole === "student") {
                refreshedUser = students.find(s => s.regNo === userObj.regNo) || userObj;
            }
            loginUser(refreshedUser, savedRole);
        } catch (e) {
            console.error("Failed to restore session:", e);
            switchPortalTab('dashboard');
        }
    } else {
        // Also clear any old localStorage sessions from previous version
        localStorage.removeItem('upli_user');
        localStorage.removeItem('upli_role');
        const savedPortalTab = sessionStorage.getItem('upli_active_portal_tab') || 'dashboard';
        switchPortalTab(savedPortalTab);
    }

    // ── STEP 3: Stale-While-Revalidate — Sync di latar, UI sudah papar dari cache ──
    initDatabase();

    // ── STEP 4: Welcome Screen / Web Speech API / FOUC Prevent ──
    const welcomePlayed = sessionStorage.getItem("upli_welcome_played");
    const appContainer = document.getElementById("app");
    const welcomeOverlay = document.getElementById("welcome-overlay");

    if (!welcomePlayed && welcomeOverlay) {
        // Show Welcome Screen
        welcomeOverlay.style.display = "flex";
        welcomeOverlay.style.opacity = "1";
        
        document.getElementById("btn-start-experience").addEventListener("click", () => {
            sessionStorage.setItem("upli_welcome_played", "true");
            
            // Play welcome voice message
            const utterance = new SpeechSynthesisUtterance("Welcome to My Intern M S");
            utterance.lang = "en-US";
            utterance.rate = 0.95;
            window.speechSynthesis.speak(utterance);
            
            // Hide overlay and show app
            welcomeOverlay.style.opacity = "0";
            setTimeout(() => {
                welcomeOverlay.style.display = "none";
                if (appContainer) {
                    appContainer.style.visibility = "visible";
                    appContainer.style.opacity = "1";
                }
            }, 500);
        });
    } else {
        // Prevent FOUC: Show app container smoothly after routing is complete
        if (appContainer) {
            appContainer.style.visibility = "visible";
            appContainer.style.opacity = "1";
        }
    }

    // Theme toggle button click listener
    const toggleBtn = document.getElementById("theme-toggle-btn");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            const isLight = document.body.classList.toggle("light-mode");
            localStorage.setItem("upli_theme", isLight ? "light" : "dark");
            initTheme();
        });
    }

    const portalToggleBtn = document.getElementById("portal-theme-toggle-btn");
    if (portalToggleBtn) {
        portalToggleBtn.addEventListener("click", () => {
            const isLight = document.body.classList.toggle("light-mode");
            localStorage.setItem("upli_theme", isLight ? "light" : "dark");
            initTheme();
        });
    }


    // Edit Student Form Submit (Admin)
    const editForm = document.getElementById("edit-student-form");
    if (editForm) {
        editForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const regNo = document.getElementById("edit-student-reg-hidden").value;
            const name = document.getElementById("edit-student-name").value.trim();
            const email = document.getElementById("edit-student-email").value.trim();
            const phone = document.getElementById("edit-student-phone").value.trim();
            const tempat = document.getElementById("edit-student-tempat").value.trim();
            const daerah = document.getElementById("edit-student-daerah").value.trim();
            const jabatan = document.getElementById("edit-student-jabatan").value;
            const sesi = document.getElementById("edit-student-sesi").value;
            const paEmail = document.getElementById("edit-student-pa") ? document.getElementById("edit-student-pa").value : "";

            const students = getStudents();
            const idx = students.findIndex(s => s.regNo === regNo);
            if (idx !== -1) {
                students[idx].name = name;
                students[idx].email = email;
                students[idx].phone = phone;
                students[idx].tempatLI = tempat;
                students[idx].daerah = daerah;
                students[idx].jabatan = jabatan;
                students[idx].sesi = sesi;
                students[idx].profilePic = adminTempProfilePic;

                const lecturers = getLecturers();
                const paLecturer = lecturers.find(l => l.email === paEmail);
                students[idx].penasihatAkademik = paEmail;
                students[idx].penasihatAkademikName = paLecturer ? paLecturer.name : "";

                saveStudents(students, regNo);
                addLog("info", `Admin mengemaskini profil pelajar ${name} (${regNo})`);
                showToast(`Profil pelajar ${name} berjaya dikemas kini.`, "success");

                closeEditStudentModal();

                // Refresh views
                renderAdminStudentsTable();
                renderAdminDashboard();
                renderAdminLecturerAssignTable();
                if (typeof renderAdminPATable === "function") renderAdminPATable();
            }
        });
    }
});

// ==========================================================================
// Dokumen Rujukan MODULE
// ==========================================================================

// Note: getRubriks() and saveRubriks() are defined in the Firestore data layer (line ~444)
// and use dbCache for cloud sync. Do NOT redefine them here.

// --- File input: show selected filename on zone label ---
// --- File input: show selected filename on zone label ---
document.getElementById("rubrik-file-input").addEventListener("change", function () {
    const zone = document.getElementById("rubrik-upload-zone");
    const bulkList = document.getElementById("rubrik-bulk-list");
    const singleTitleGroup = document.getElementById("single-rubrik-title-group");
    const singleCategoryGroup = document.getElementById("single-rubrik-category-group");
    
    if (this.files && this.files.length > 0) {
        if (this.files.length === 1) {
            bulkList.style.display = "none";
            bulkList.innerHTML = "";
            if (singleTitleGroup) singleTitleGroup.style.display = "block";
            if (singleCategoryGroup) singleCategoryGroup.style.display = "block";
            
            const file = this.files[0];
            const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const titleInput = document.getElementById("rubrik-title-input");
            if (titleInput) titleInput.value = nameWithoutExt;
            
            zone.innerHTML = `
                <i class="fa-solid fa-file-pdf" style="font-size: 2rem; color: #ef4444;"></i>
                <span style="color: var(--color-success); font-weight: 600;">${file.name}</span>
                <span class="file-constraint">${(file.size / 1024 / 1024).toFixed(2)} MB — Sedia untuk dimuat naik</span>
            `;
        } else {
            if (singleTitleGroup) singleTitleGroup.style.display = "none";
            if (singleCategoryGroup) singleCategoryGroup.style.display = "none";
            bulkList.style.display = "flex";
            bulkList.innerHTML = `
                <h4 style="font-size: 0.9rem; font-weight: 600; color: var(--color-text-dark); margin: 0; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                    <i class="fa-solid fa-list-check text-primary"></i> Set Tajuk & Kategori Fail (${this.files.length} Fail Dipilih)
                </h4>
            `;
            
            zone.innerHTML = `
                <i class="fa-solid fa-file-pdf" style="font-size: 2rem; color: #ef4444;"></i>
                <span style="color: var(--color-success); font-weight: 600;">${this.files.length} Fail PDF Dipilih</span>
                <span class="file-constraint">Klik untuk menukar pemilihan fail</span>
            `;
            
            Array.from(this.files).forEach((file, idx) => {
                const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                const fileBox = document.createElement("div");
                fileBox.className = "bulk-file-item";
                fileBox.style.cssText = "padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; background-color: var(--bg-hover); display: flex; flex-direction: column; gap: 8px;";
                fileBox.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; font-weight: 600;">
                        <span style="word-break: break-all; color:#1e293b;"><i class="fa-solid fa-file-pdf text-danger"></i> ${file.name}</span>
                        <span style="color: #64748b; font-size: 0.7rem; min-width: 60px; text-align: right;">(${(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <label style="font-size: 0.7rem; font-weight: 600; color: #475569; display:block; margin-bottom: 3px;">Tajuk Fail</label>
                            <input type="text" class="bulk-title-input" data-index="${idx}" value="${nameWithoutExt}" 
                                style="padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.8rem; width: 100%; color:#000000 !important; background-color:#ffffff !important;" placeholder="Masukkan tajuk fail">
                        </div>
                        <div>
                            <label style="font-size: 0.7rem; font-weight: 600; color: #475569; display:block; margin-bottom: 3px;">Kategori</label>
                            <select class="bulk-category-select" data-index="${idx}" 
                                style="padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.8rem; width: 100%; color:#000000 !important; background-color:#ffffff !important;">
                                <option value="Kejuruteraan">Kejuruteraan (DKA / JKE / JKM)</option>
                                <option value="Bukan Kejuruteraan">Bukan Kejuruteraan (DBK / DUB / JP / JPH)</option>
                                <option value="Umum" selected>Umum (Semua Pelajar)</option>
                            </select>
                        </div>
                    </div>
                `;
                bulkList.appendChild(fileBox);
            });
        }
    } else {
        bulkList.style.display = "none";
        bulkList.innerHTML = "";
        if (singleTitleGroup) singleTitleGroup.style.display = "block";
        if (singleCategoryGroup) singleCategoryGroup.style.display = "block";
        zone.innerHTML = `
            <i class="fa-solid fa-file-pdf" style="font-size: 2rem; color: #ef4444;"></i>
            <span>Klik untuk pilih fail PDF Dokumen</span>
            <span class="file-constraint">Format: PDF sahaja (Maks: 20MB) (Boleh pilih berbilang fail)</span>
        `;
    }
});

// --- Handle Rubrik Upload (Admin only) ---
window.handleRubrikUpload = async function () {
    if (currentRole !== "admin") {
        showToast("Hanya Admin yang boleh memuat naik dokumen!", "error");
        return;
    }

    const fileInput = document.getElementById("rubrik-file-input");
    const btn = document.getElementById("btn-upload-rubrik");
    const files = fileInput.files;

    if (!files || files.length === 0) {
        showToast("Sila pilih fail PDF dokumen terlebih dahulu!", "error");
        return;
    }

    const isBulk = files.length > 1;
    const uploadTasks = [];

    if (!isBulk) {
        const titleInput = document.getElementById("rubrik-title-input");
        const categorySelect = document.getElementById("rubrik-category-select");
        const title = titleInput.value.trim();
        const category = categorySelect.value;
        const file = files[0];

        if (!title) {
            showToast("Sila masukkan tajuk dokumen terlebih dahulu!", "error");
            titleInput.focus();
            return;
        }
        if (!file.name.toLowerCase().endsWith(".pdf")) {
            showToast("Hanya fail PDF dibenarkan!", "error");
            return;
        }
        if (file.size > FS_MAX_FILE_SIZE) {
            showToast(`Fail melebihi had ${FS_MAX_FILE_SIZE / 1024 / 1024}MB!`, "error");
            return;
        }

        uploadTasks.push({ file, title, category });
    } else {
        const bulkTitleInputs = document.querySelectorAll(".bulk-title-input");
        const bulkCategorySelects = document.querySelectorAll(".bulk-category-select");

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const titleInput = Array.from(bulkTitleInputs).find(input => parseInt(input.dataset.index) === i);
            const categorySelect = Array.from(bulkCategorySelects).find(sel => parseInt(sel.dataset.index) === i);

            const title = titleInput ? titleInput.value.trim() : "";
            const category = categorySelect ? categorySelect.value : "Umum";

            if (!title) {
                showToast(`Sila masukkan tajuk dokumen bagi fail "${file.name}"!`, "error");
                if (titleInput) titleInput.focus();
                return;
            }
            if (!file.name.toLowerCase().endsWith(".pdf")) {
                showToast(`Gagal! Fail "${file.name}" bukan jenis PDF. Hanya fail PDF dibenarkan!`, "error");
                return;
            }
            if (file.size > FS_MAX_FILE_SIZE) {
                showToast(`Gagal! Fail "${file.name}" melebihi had saiz ${FS_MAX_FILE_SIZE / 1024 / 1024}MB!`, "error");
                return;
            }

            uploadTasks.push({ file, title, category });
        }
    }

    btn.disabled = true;
    const originalText = btn.innerHTML;

    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        try {
            for (let i = 0; i < uploadTasks.length; i++) {
                const task = uploadTasks[i];
                const currentNum = i + 1;
                const totalNum = uploadTasks.length;

                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> (${currentNum}/${totalNum}) Membaca ${task.file.name}...`;

                const rubrikId = "rubrik_" + (Date.now() + i);
                
                const base64Data = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        let b64 = e.target.result;
                        if (b64.includes(";base64,")) {
                            b64 = b64.split(";base64,")[1];
                        }
                        resolve(b64);
                    };
                    reader.onerror = (err) => reject(err);
                    reader.readAsDataURL(task.file);
                });

                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> (${currentNum}/${totalNum}) Menyimpan "${task.title}"...`;

                const res = await callGoogleScript("uploadFile", {
                    type: "rubrik",
                    rubrikId: rubrikId,
                    title: task.title,
                    category: task.category,
                    fileName: task.file.name,
                    uploadedBy: currentUser.name,
                    base64Data: base64Data
                });

                if (!res || !res.fileId) {
                    throw new Error(`Gagal menyimpan fail "${task.file.name}" ke Google Drive.`);
                }
            }

            showToast(`Berjaya! ${uploadTasks.length} dokumen telah dimuat naik.`, "success");

            // Reset UI
            fileInput.value = "";
            const titleInput = document.getElementById("rubrik-title-input");
            if (titleInput) titleInput.value = "";

            const zone = document.getElementById("rubrik-upload-zone");
            zone.innerHTML = `
                <i class="fa-solid fa-file-pdf" style="font-size: 2rem; color: #ef4444;"></i>
                <span>Klik untuk pilih fail PDF Dokumen</span>
                <span class="file-constraint">Format: PDF sahaja (Maks: 20MB) (Boleh pilih berbilang fail)</span>
            `;

            const bulkList = document.getElementById("rubrik-bulk-list");
            if (bulkList) {
                bulkList.style.display = "none";
                bulkList.innerHTML = "";
            }

            const singleTitleGroup = document.getElementById("single-rubrik-title-group");
            const singleCategoryGroup = document.getElementById("single-rubrik-category-group");
            if (singleTitleGroup) singleTitleGroup.style.display = "block";
            if (singleCategoryGroup) singleCategoryGroup.style.display = "block";

            // Sync
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mengemas kini...`;
            const syncRes = await callGoogleScript("syncData");
            if (syncRes) {
                dbCache.rubriks = syncRes.rubriks || [];
                localStorage.setItem("upli_rubriks", JSON.stringify(dbCache.rubriks));
            }

        } catch (err) {
            console.error("Gagal muat naik rubrik:", err);
            showToast("Ralat muat naik: " + err.message, "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Simpan & Muat Naik Dokumen`;
            renderAdminRubrik();
            renderAdminDashboard();
        }
        return;
    }

    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Membaca fail...`;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const base64Data = e.target.result;
            rubrik.fileData = base64Data;

            // Hitung bilangan chunks untuk paparan progress
            const totalSize = base64Data.length;
            const chunkSize = Math.ceil((900 * 1024 * 4 / 3)); // ~1.2MB base64 per chunk
            const totalChunks = Math.ceil(totalSize / chunkSize);

            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan chunk 1/${totalChunks}...`;

            // Tulis chunks satu per satu dengan update progress
            const fileId = `admin_${rubrikId}`;
            const chunks = [];
            for (let i = 0; i < totalSize; i += chunkSize) {
                chunks.push(base64Data.slice(i, i + chunkSize));
            }

            for (let idx = 0; idx < chunks.length; idx++) {
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan ${idx + 1}/${chunks.length}...`;
                await db.collection("file_data").doc(`${fileId}_${idx}`).set({
                    fileId,
                    regNo: "admin",
                    docId: rubrikId,
                    chunkIndex: idx,
                    totalChunks: chunks.length,
                    data: chunks[idx],
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            // Cache in memory
            const { fileCache } = window._fsCache || {};
            if (fileCache) fileCache[fileId] = base64Data;

            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan maklumat dokumen...`;

            const rubriks = getRubriks();
            rubriks.unshift(rubrik);
            saveRubriks(rubriks);

            addLog("success", `Admin memuat naik Dokumen Rujukan: "${title}" (${category}) — ${file.name}`);
            showToast(`Dokumen "${title}" berjaya dimuat naik!`, "success");

            titleInput.value = "";
            fileInput.value = "";
            document.getElementById("rubrik-upload-zone").innerHTML = `
                <i class="fa-solid fa-file-pdf" style="font-size: 2rem; color: #ef4444;"></i>
                <span>Klik untuk pilih fail PDF Dokumen</span>
                <span class="file-constraint">Format: PDF sahaja (Maks: 20MB)</span>
            `;
        } catch (err) {
            console.error("Upload rubrik gagal:", err);
            showToast("Ralat menyimpan dokumen. Sila cuba semula.", "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Simpan & Muat Naik Dokumen`;
            renderAdminRubrik();
            renderAdminDashboard();
        }
    };
    reader.onerror = () => {
        showToast("Ralat membaca fail.", "error");
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Simpan & Muat Naik Dokumen`;
    };
    reader.readAsDataURL(file);
};



// --- Admin: Render Rubrik Management List ---
function renderAdminRubrik() {
    if (currentRole !== "admin") return;

    const rubriks = getRubriks();
    const listEl = document.getElementById("admin-rubrik-list");
    const countBadge = document.getElementById("rubrik-count-badge");

    if (countBadge) countBadge.textContent = `${rubriks.length} Dokumen`;

    if (!listEl) return;
    listEl.innerHTML = "";

    if (rubriks.length === 0) {
        listEl.innerHTML = `
            <div style="text-align:center; padding: 32px 20px; color: var(--text-muted);">
                <i class="fa-solid fa-book-open" style="font-size: 2.5rem; margin-bottom: 10px; opacity: 0.4;"></i>
                <p style="font-size: 0.88rem;">Tiada dokumen dimuat naik lagi. Muat naik dokumen pertama anda di atas.</p>
            </div>`;
        return;
    }

    const catColors = {
        "Kejuruteraan": { color: "#818cf8", icon: "fa-compass-drafting", label: "Jabatan Kejuruteraan (JKA / JKE / JKM)" },
        "Bukan Kejuruteraan": { color: "#fbbf24", icon: "fa-chart-pie", label: "Jabatan Bukan Kejuruteraan (JP / JPH)" },
        "Umum": { color: "#34d399", icon: "fa-globe", label: "Umum (Semua Pelajar & Jabatan)" }
    };

    // Hint bar
    const hintBar = document.createElement("div");
    hintBar.style.cssText = "display:flex;align-items:center;gap:8px;padding:8px 14px;background:rgba(99,102,241,0.08);border:1px dashed rgba(99,102,241,0.3);border-radius:10px;margin-bottom:16px;font-size:0.78rem;color:var(--text-muted);";
    hintBar.innerHTML = `<i class="fa-solid fa-grip-vertical" style="color:#818cf8;"></i>&nbsp; Seret <b style="color:var(--text-secondary);">ikon pemegang</b> pada kad rubrik untuk menyusun semula urutan. Turutan baru disimpan secara automatik.`;
    listEl.appendChild(hintBar);

    const categories = ["Umum", "Kejuruteraan", "Bukan Kejuruteraan"];

    categories.forEach(category => {
        const filtered = rubriks.filter(r => r.category === category);
        if (filtered.length === 0) return;

        const cat = catColors[category] || catColors["Umum"];

        const sectionEl = document.createElement("div");
        sectionEl.className = "rubrik-category-section";
        sectionEl.style.cssText = "margin-top: 16px; margin-bottom: 8px; width: 100%;";

        const heading = document.createElement("h4");
        heading.style.cssText = "font-family: var(--font-display); font-size: 0.9rem; font-weight: 700; color: var(--text-muted); display: flex; align-items: center; gap: 8px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;";
        heading.innerHTML = `<i class="fa-solid ${cat.icon}" style="color: ${cat.color};"></i> ${cat.label}`;
        sectionEl.appendChild(heading);

        const container = document.createElement("div");
        container.className = "rubrik-sortable-container";
        container.dataset.category = category;
        container.style.cssText = "display: flex; flex-direction: column; gap: 12px; width: 100%;";

        let dragSrc = null;

        function saveCategoryOrder() {
            const newOrder = [...container.querySelectorAll(".rubrik-drag-card")].map(c => c.dataset.rubrikId);
            const allRubriks = getRubriks();
            const thisCatSorted = newOrder.map(id => allRubriks.find(x => x.id === id)).filter(Boolean);
            let thisCatIdx = 0;
            const globalOrder = allRubriks.map(x => {
                if (x.category === category) return thisCatSorted[thisCatIdx++];
                return x;
            });
            saveRubriks(globalOrder);
            addLog("info", `Admin menyusun semula dokumen kategori "${category}".`);
            showToast("Urutan dokumen berjaya dikemaskini!", "success");
        }

        filtered.forEach(r => {
            const card = document.createElement("div");
            card.className = "card rubrik-card rubrik-drag-card";
            card.draggable = true;
            card.dataset.rubrikId = r.id;
            card.style.cssText = "transition: opacity 0.2s, transform 0.15s, box-shadow 0.15s; cursor: default;";

            card.innerHTML = `
                <div class="rubrik-card-body" style="align-items:center;">
                    <div class="rubrik-drag-handle" title="Seret untuk susun semula" style="display:flex;align-items:center;padding:0 10px 0 4px;color:var(--text-muted);cursor:grab;font-size:1.15rem;flex-shrink:0;opacity:0.4;transition:opacity 0.15s,color 0.15s;">
                        <i class="fa-solid fa-grip-vertical"></i>
                    </div>
                    <div class="rubrik-card-info">
                        <div class="rubrik-card-icon">
                            <i class="fa-solid fa-file-pdf"></i>
                        </div>
                        <div class="rubrik-card-text">
                            <div class="rubrik-card-title">${r.title}</div>
                            <div class="rubrik-card-meta">
                                <span><i class="fa-solid fa-file-invoice"></i> ${r.fileName}</span>
                                <span><i class="fa-solid fa-weight-hanging"></i> ${r.fileSize}</span>
                                <span><i class="fa-regular fa-calendar"></i> ${r.uploadDate}</span>
                            </div>
                            <div class="rubrik-card-author">
                                <i class="fa-solid fa-user-shield" style="margin-right:4px;"></i>Dimuat naik oleh: ${r.uploadedBy || 'Admin'}
                            </div>
                        </div>
                    </div>
                    <div class="rubrik-card-actions">
                        <a href="#" onclick="event.preventDefault(); window.viewRubrik('${r.id}', '${r.title.replace(/'/g, "\\'")}'  )" class="btn btn-sm" style="background:linear-gradient(135deg,#6366f1,#4f46e5); color:#fff; border:none; border-radius:8px; padding:8px 16px; font-size:0.8rem; display:flex; align-items:center; gap:6px; text-decoration:none; white-space:nowrap;">
                            <i class="fa-solid fa-eye"></i> Papar
                        </a>
                        <a href="#" onclick="event.preventDefault(); window.downloadRubrik('${r.id}', '${r.fileName.replace(/'/g, "\\'")}'  )" class="btn btn-sm" style="background:linear-gradient(135deg,#059669,#047857); color:#fff; border:none; border-radius:8px; padding:8px 16px; font-size:0.8rem; display:flex; align-items:center; gap:6px; text-decoration:none; white-space:nowrap;">
                            <i class="fa-solid fa-download"></i> Muat Turun
                        </a>
                        <button class="btn btn-danger btn-sm" onclick="deleteRubrik('${r.id}')" style="padding:8px 14px; font-size:0.8rem; display:flex; align-items:center; gap:6px; white-space:nowrap; border-radius:8px;">
                            <i class="fa-solid fa-trash"></i> Padam
                        </button>
                    </div>
                </div>
            `;

            // Hover on grip handle
            const handle = card.querySelector(".rubrik-drag-handle");
            if (handle) {
                handle.addEventListener("mouseenter", () => { handle.style.opacity = "1"; handle.style.color = "#6366f1"; });
                handle.addEventListener("mouseleave", () => { handle.style.opacity = "0.4"; handle.style.color = ""; });
            }

            card.addEventListener("dragstart", function (e) {
                dragSrc = card;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", r.id);
                setTimeout(() => { card.style.opacity = "0.38"; card.style.transform = "scale(0.97)"; card.style.boxShadow = "none"; }, 0);
            });

            card.addEventListener("dragend", function () {
                card.style.opacity = "1";
                card.style.transform = "scale(1)";
                card.style.boxShadow = "";
                container.querySelectorAll(".rubrik-drag-card").forEach(c => { c.style.borderTop = ""; c.style.borderBottom = ""; });
                dragSrc = null;
                saveCategoryOrder();
            });

            card.addEventListener("dragover", function (e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (!dragSrc || dragSrc === card) return;
                const rect = card.getBoundingClientRect();
                container.querySelectorAll(".rubrik-drag-card").forEach(c => { c.style.borderTop = ""; c.style.borderBottom = ""; });
                if (e.clientY < rect.top + rect.height / 2) {
                    card.style.borderTop = "2px solid #6366f1";
                } else {
                    card.style.borderBottom = "2px solid #6366f1";
                }
            });

            card.addEventListener("dragleave", function () {
                card.style.borderTop = "";
                card.style.borderBottom = "";
            });

            card.addEventListener("drop", function (e) {
                e.preventDefault();
                card.style.borderTop = "";
                card.style.borderBottom = "";
                if (!dragSrc || dragSrc === card) return;
                const rect = card.getBoundingClientRect();
                if (e.clientY < rect.top + rect.height / 2) {
                    container.insertBefore(dragSrc, card);
                } else {
                    container.insertBefore(dragSrc, card.nextSibling);
                }
            });

            container.appendChild(card);
        });

        sectionEl.appendChild(container);
        listEl.appendChild(sectionEl);
    });
}

// --- Admin: Delete a rubrik ---
window.deleteRubrik = function (rubrikId) {
    showConfirm(
        "Adakah anda pasti mahu memadam dokumen ini? Tindakan ini tidak boleh diundurkan.",
        function () {
            const allRubriks = getRubriks();
            const r = allRubriks.find(x => x.id === rubrikId);
            if (r && r.fileUrl && typeof storage !== 'undefined' && storage) {
                storage.refFromURL(r.fileUrl).delete().catch(e => console.warn(e));
            } else {
                deleteFileFromFirestore("admin", rubrikId).catch(err => console.error(err));
            }
            
            const rubriks = allRubriks.filter(x => x.id !== rubrikId);
            saveRubriks(rubriks);
            addLog("danger", `Admin memadam Dokumen Rujukan (ID: ${rubrikId})`);
            showToast("Dokumen berjaya dipadamkan.", "info");
            renderAdminRubrik();
            renderAdminDashboard();
        },
        "Padam Dokumen",
        "Ya, Padam"
    );
};

// --- Global: View Rubrik (PDF Inline Preview Modal) ---
window.viewRubrik = async function (rubrikId, title) {
    showToast("Memuatkan dokumen untuk paparan...", "info");
    try {
        const rubriks = getRubriks();
        const r = rubriks.find(x => x.id === rubrikId);
        if (r) resolveGoogleDriveUrl(r);
        let pdfSrc = null;

        if (r && r.fileUrl && r.fileUrl !== "N/A" && !r.fileUrl.startsWith("N/A")) {
            pdfSrc = r.fileUrl;
        } else {
            const base64Data = await loadFileFromFirestore("admin", rubrikId);
            if (!base64Data) {
                if (r && r.fileData) {
                    pdfSrc = r.fileData;
                } else {
                    showToast("Fail tidak dijumpai di pangkalan data.", "error");
                    return;
                }
            } else {
                pdfSrc = base64Data;
            }
        }

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
        if (isMobile) {
            let targetUrl = pdfSrc;
            if (!pdfSrc.startsWith("http")) {
                const res = await fetch(pdfSrc);
                const blob = await res.blob();
                targetUrl = URL.createObjectURL(blob);
            }
            window.open(targetUrl, '_blank');
            showToast("Memaparkan dokumen di tab baharu.", "success");
            return;
        }

        // Create or reuse the rubrik preview modal
        let overlay = document.getElementById("rubrik-preview-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "rubrik-preview-overlay";
            overlay.style.cssText = "display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;align-items:center;justify-content:center;backdrop-filter:blur(6px);flex-direction:column;gap:0;";
            overlay.innerHTML = `
                <div style="width:92%;max-width:960px;height:90vh;display:flex;flex-direction:column;border-radius:16px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.1);">
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:var(--bg-card);border-bottom:1px solid var(--border-color);flex-shrink:0;">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <i class="fa-solid fa-file-pdf" style="color:#ef4444;font-size:1.2rem;"></i>
                            <span id="rubrik-preview-title" style="font-weight:700;font-size:0.95rem;color:var(--text-primary);max-width:600px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
                        </div>
                        <button id="rubrik-preview-close" onclick="document.getElementById('rubrik-preview-overlay').style.display='none'; document.getElementById('rubrik-preview-iframe').src='';" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#ef4444;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:0.85rem;display:flex;align-items:center;gap:6px;font-weight:600;transition:all 0.2s;">
                            <i class="fa-solid fa-xmark"></i> Tutup
                        </button>
                    </div>
                    <iframe id="rubrik-preview-iframe" style="flex:1;width:100%;border:none;background:#fff;" title="Pratonton Dokumen Rujukan"></iframe>
                </div>
            `;
            overlay.addEventListener("click", function(e) {
                if (e.target === overlay) {
                    overlay.style.display = "none";
                    document.getElementById("rubrik-preview-iframe").src = "";
                }
            });
            document.body.appendChild(overlay);
        }

        const titleEl = overlay.querySelector("#rubrik-preview-title");
        const iframe = overlay.querySelector("#rubrik-preview-iframe");
        if (titleEl) titleEl.textContent = title || "Dokumen Rujukan";

        // Set iframe source
        if (pdfSrc.startsWith("http")) {
            // Firebase Storage URL — use directly
            iframe.src = pdfSrc;
        } else {
            // Base64 data URL — use Blob URL
            const res = await fetch(pdfSrc);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            iframe.src = blobUrl;
            // Revoke after some time
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        }

        overlay.style.display = "flex";
    } catch (err) {
        console.error("Error viewing rubrik:", err);
        showToast("Ralat ketika memaparkan dokumen.", "error");
    }
};

// --- Global: Download Rubrik ---
window.downloadRubrik = async function (rubrikId, fileName) {
    showToast("Memuat turun fail dokumen, sila tunggu...", "info");
    try {
        const rubriks = getRubriks();
        const r = rubriks.find(x => x.id === rubrikId);
        if (r) resolveGoogleDriveUrl(r);
        
        if (r && r.fileId && r.fileId !== "N/A") {
            const driveUrl = `https://drive.google.com/uc?export=download&id=${r.fileId}`;
            window.open(driveUrl, "_blank");
            return;
        }
        if (r && r.fileUrl && r.fileUrl !== "N/A" && !r.fileUrl.startsWith("N/A")) {
            window.open(r.fileUrl, "_blank");
            return;
        }

        const base64Data = await loadFileFromFirestore("admin", rubrikId);
        let finalDataUrl = null;
        
        if (!base64Data) {
            // Fallback to rubrik in cache if it's small and wasn't stripped
            const rubriks = getRubriks();
            const r = rubriks.find(x => x.id === rubrikId);
            if (r && r.fileData) {
                finalDataUrl = r.fileData;
            } else {
                showToast("Fail tidak dijumpai di pangkalan data.", "error");
                return;
            }
        } else {
            finalDataUrl = base64Data;
        }
        
        // Use fetch to convert large Base64 data URL to a Blob to prevent browser URL length limits
        const res = await fetch(finalDataUrl);
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            a.remove();
            URL.revokeObjectURL(objectUrl);
        }, 100);
    } catch (err) {
        console.error("Error downloading rubrik:", err);
        showToast("Ralat ketika memuat turun.", "error");
    }
};

// --- Student/Lecturer: Render Rubrik Viewer (download only) ---
function renderRubrikViewer() {
    const rubriks = getRubriks();
    const listEl = document.getElementById("rubrik-viewer-list");
    if (!listEl) return;
    listEl.innerHTML = "";

    if (rubriks.length === 0) {
        listEl.innerHTML = `
            <div class="card" style="text-align:center; padding: 48px 20px; color: var(--text-muted);">
                <i class="fa-solid fa-book-open" style="font-size: 3rem; margin-bottom: 14px; opacity:0.35;"></i>
                <p style="font-size: 0.9rem; font-weight: 600;">Tiada Dokumen Tersedia</p>
                <p style="font-size: 0.8rem; margin-top: 4px;">Admin UPLI belum memuat naik sebarang Dokumen Rujukan. Sila hubungi Admin untuk maklumat lanjut.</p>
            </div>`;
        return;
    }

    const catColors = {
        "Kejuruteraan": { bg: "rgba(99,102,241,0.1)", color: "#818cf8", icon: "fa-compass-drafting", label: "Jabatan Kejuruteraan (JKA / JKE / JKM)" },
        "Bukan Kejuruteraan": { bg: "rgba(245,158,11,0.1)", color: "#fbbf24", icon: "fa-chart-pie", label: "Jabatan Bukan Kejuruteraan (JP / JPH)" },
        "Umum": { bg: "rgba(16,185,129,0.1)", color: "#34d399", icon: "fa-globe", label: "Umum (Semua Pelajar & Jabatan)" }
    };

    const categories = ["Umum", "Kejuruteraan", "Bukan Kejuruteraan"];
    let html = "";

    categories.forEach(category => {
        const filtered = rubriks.filter(r => r.category === category);
        if (filtered.length > 0) {
            const cat = catColors[category] || catColors["Umum"];
            html += `
                <div class="rubrik-category-section" style="margin-top: 16px; margin-bottom: 8px; width: 100%;">
                    <h4 style="font-family: var(--font-display); font-size: 0.9rem; font-weight: 700; color: var(--text-muted); display: flex; align-items: center; gap: 8px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fa-solid ${cat.icon}" style="color: ${cat.color};"></i> ${cat.label}
                    </h4>
                    <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
            `;

            filtered.forEach(r => {
                html += `
                    <div class="card rubrik-card">
                        <div class="rubrik-card-body">
                            <div class="rubrik-card-info">
                                <div class="rubrik-card-icon">
                                    <i class="fa-solid fa-file-pdf"></i>
                                </div>
                                <div class="rubrik-card-text">
                                    <div class="rubrik-card-title">${r.title}</div>
                                    <div class="rubrik-card-meta">
                                        <span><i class="fa-solid fa-file-invoice"></i> ${r.fileName}</span>
                                        <span><i class="fa-solid fa-weight-hanging"></i> ${r.fileSize}</span>
                                        <span><i class="fa-regular fa-calendar"></i> ${r.uploadDate}</span>
                                    </div>
                                    <div class="rubrik-card-author">
                                        <i class="fa-solid fa-user-shield" style="margin-right:4px;"></i>Dimuat naik oleh Admin UPLI
                                    </div>
                                </div>
                            </div>
                            <div class="rubrik-card-actions">
                                <a href="#" onclick="event.preventDefault(); window.viewRubrik('${r.id}', '${r.title.replace(/'/g, "\\'")}')" class="btn btn-sm" style="background:linear-gradient(135deg,#6366f1,#4f46e5); color:#fff; border:none; gap:8px; padding:8px 16px; font-size:0.8rem; display:flex; align-items:center; white-space:nowrap; flex-shrink:0; text-decoration:none; border-radius: 8px;">
                                    <i class="fa-solid fa-eye"></i> Papar Dokumen
                                </a>
                                <a href="#" onclick="event.preventDefault(); window.downloadRubrik('${r.id}', '${r.fileName.replace(/'/g, "\\'")}')" class="btn btn-primary btn-sm" style="gap:8px; padding:8px 16px; font-size:0.8rem; display:flex; align-items:center; white-space:nowrap; flex-shrink:0; text-decoration:none; border-radius: 8px;">
                                    <i class="fa-solid fa-download"></i> Muat Turun PDF
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }
    });

    listEl.innerHTML = html;
}

// --------------------------------==========================================
// N. PUBLIC PORTAL MODULE (DASHBOARD & STATS)
// --------------------------------==========================================
let calendarCurrentMonth = new Date().getMonth(); // 0-11
let calendarCurrentYear = new Date().getFullYear();
let calendarSelectedDateStr = null; // YYYY-MM-DD

window.switchPortalTab = function (tabName) {
    sessionStorage.setItem('upli_active_portal_tab', tabName);
    document.querySelectorAll(".portal-nav-item").forEach(btn => {
        btn.classList.remove("active");
    });

    document.querySelectorAll(".portal-tab-pane").forEach(pane => {
        pane.style.display = "none";
    });

    // Reset scroll position of public content container to prevent layout shifting
    const portalContent = document.querySelector(".portal-content");
    if (portalContent) {
        portalContent.scrollTop = 0;
    }

    if (tabName === 'dashboard') {
        const btn = document.getElementById("btn-portal-home");
        if (btn) btn.classList.add("active");
        document.getElementById("portal-tab-dashboard").style.display = "block";
        renderPortalAnnouncements();
    } else if (tabName === 'login') {
        const btn = document.getElementById("btn-portal-login-tab");
        if (btn) btn.classList.add("active");
        document.getElementById("portal-tab-login").style.display = "flex";
    } else if (tabName === 'register') {
        document.getElementById("portal-tab-register").style.display = "flex";
    }
};

// ---------- Portal Calendar & Announcements Rendering ----------
window.renderPortalAnnouncements = function () {
    renderCalendar();
    renderAnnouncementsList();
};

// ---------- Department Stats Modal ----------
const DEPT_CONFIG = {
    JKA: { name: "Jabatan Kejuruteraan Awam", icon: "fa-solid fa-mountain-city", color: "#6366f1", glow: "rgba(99,102,241,0.15)", programs: ["DKA", "DUB", "DBK"] },
    JKE: { name: "Jabatan Kejuruteraan Elektrik", icon: "fa-solid fa-bolt", color: "#f59e0b", glow: "rgba(245,158,11,0.15)", programs: ["DEE", "DEP", "DTK"] },
    JKM: { name: "Jabatan Kejuruteraan Mekanikal", icon: "fa-solid fa-gears", color: "#3b82f6", glow: "rgba(59,130,246,0.15)", programs: ["DKM", "DTP", "DEM"] },
    JP:  { name: "Jabatan Perdagangan", icon: "fa-solid fa-chart-line", color: "#10b981", glow: "rgba(16,185,129,0.15)", programs: ["DPR", "DLS", "DAT"] },
    JPH: { name: "Jabatan Pelancongan & Hospitaliti", icon: "fa-solid fa-utensils", color: "#ec4899", glow: "rgba(236,72,153,0.15)", programs: ["DHR", "DHM", "KOK"] }
};

window.openDeptStatsModal = function(deptCode) {
    const cfg = DEPT_CONFIG[deptCode];
    if (!cfg) return;

    const portalSelect = document.getElementById("portal-session-select");
    const activeSession = (portalSelect && portalSelect.value) ? portalSelect.value : (dbCache.activeSession || "");
    const allStudents = getStudents();
    
    // Strict session matching
    const sessionStudents = activeSession ? allStudents.filter(s => isStudentInSession(s, activeSession)) : allStudents;

    // Robust department matching
    const deptStudents = sessionStudents.filter(s => {
        const dept = (s.jabatan || "").toUpperCase().trim();
        if (dept === deptCode.toUpperCase()) return true;
        if (deptCode === "JKA" && (dept.includes("AWAM") || dept.includes("CIVIL") || dept.includes("JKA"))) return true;
        if (deptCode === "JKE" && (dept.includes("ELEKTRIK") || dept.includes("ELECTRICAL") || dept.includes("JKE"))) return true;
        if (deptCode === "JKM" && (dept.includes("MEKANIKAL") || dept.includes("MECHANICAL") || dept.includes("JKM"))) return true;
        if (deptCode === "JP"  && (dept.includes("PERDAGANGAN") || dept === "JP")) return true;
        if (deptCode === "JPH" && (dept.includes("HOSPITALITI") || dept.includes("PELANCONGAN") || dept === "JPH")) return true;
        const prog = getStudentProgram(s);
        return cfg.programs.includes(prog);
    });

    const total = deptStudents.length;

    // Use same completion logic as admin dashboard
    let deptCompleteCount = 0;
    deptStudents.forEach(s => {
        const requiredDocs = getStudentDocsList(s);
        const isComplete = requiredDocs.length > 0 && requiredDocs.every(doc => s.documents && s.documents[doc.id] && s.documents[doc.id].status === "Diterima");
        if (isComplete) deptCompleteCount++;
    });
    const deptRate = total > 0 ? Math.round((deptCompleteCount / total) * 100) : 0;

    let programsHTML = "";
    cfg.programs.forEach(prog => {
        const progStudents = deptStudents.filter(s => getStudentProgram(s) === prog);
        let progCompleteCount = 0;
        progStudents.forEach(s => {
            const requiredDocs = getStudentDocsList(s);
            const isComplete = requiredDocs.length > 0 && requiredDocs.every(doc => s.documents && s.documents[doc.id] && s.documents[doc.id].status === "Diterima");
            if (isComplete) progCompleteCount++;
        });
        programsHTML += `
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.85rem;padding:8px 0;border-bottom:1px dashed rgba(0,0,0,0.15);">
                <span style="font-weight:700;color:#0f172a;">${prog}</span>
                <span style="color:rgba(0,0,0,0.6);font-size:0.8rem;">
                    <strong>${progStudents.length}</strong> Pelajar
                    <span style="color:#065f46;font-weight:600;margin-left:4px;">(${progCompleteCount} Lengkap)</span>
                </span>
            </div>
        `;
    });

    const content = `
        <div class="dept-card-animated dept-card-${deptCode}" style="border-radius:16px;padding:24px;min-height:260px;border:none !important;">
            <!-- Header -->
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                <div style="width:48px;height:48px;border-radius:10px;background:rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;font-size:1.4rem;color:#0f172a;">
                    <i class="${cfg.icon}"></i>
                </div>
                <div>
                    <h4 style="font-family:var(--font-display);font-size:1.05rem;font-weight:700;color:#0f172a;line-height:1.2;margin:0;">${deptCode}</h4>
                    <span style="font-size:0.75rem;color:rgba(0,0,0,0.55);">${cfg.name}</span>
                </div>
            </div>

            <!-- Rate Donut Chart & Stats (Compact Layout) -->
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px; background: rgba(255,255,255,0.25); padding: 8px 12px; border-radius: 10px;">
                <!-- Donut Chart Container -->
                <div style="position: relative; width: 68px; height: 68px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <canvas id="modal-donut-${deptCode}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></canvas>
                    <div style="font-family: var(--font-display); font-size: 0.95rem; font-weight: 800; color: #0f172a; pointer-events: none; z-index: 2;">
                        ${deptRate}%
                    </div>
                </div>
                <!-- Stats Text -->
                <div>
                    <span style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(15, 23, 42, 0.65);">Kadar Siap</span>
                    <h3 style="font-family: var(--font-display); font-size: 1.2rem; font-weight: 800; color: #0f172a; margin: 0;">${deptRate}%</h3>
                    <span style="font-size: 0.7rem; color: rgba(15, 23, 42, 0.65); font-weight: 600;">${deptCompleteCount} / ${total} Lengkap</span>
                </div>
            </div>

            <!-- Program List -->
            <div style="display:flex;flex-direction:column;gap:0;">
                ${programsHTML}
            </div>
        </div>
    `;

    document.getElementById("dept-stats-modal-content").innerHTML = content;
    const overlay = document.getElementById("dept-stats-modal-overlay");
    if (overlay) overlay.style.display = "flex";

    // Render compact donut chart inside the modal
    const modalCanvas = document.getElementById(`modal-donut-${deptCode}`);
    if (modalCanvas) {
        const modalCtx = modalCanvas.getContext("2d");
        const completed = deptCompleteCount;
        const remaining = total > 0 ? (total - deptCompleteCount) : 1;
        
        if (window.activeModalChart) {
            window.activeModalChart.destroy();
        }

        window.activeModalChart = new Chart(modalCtx, {
            type: 'doughnut',
            data: {
                labels: ['Lengkap', 'Belum Lengkap'],
                datasets: [{
                    data: total > 0 ? [completed, remaining] : [0, 1],
                    backgroundColor: total > 0 ? ['#0f172a', 'rgba(15, 23, 42, 0.12)'] : ['rgba(15, 23, 42, 0.12)', 'rgba(15, 23, 42, 0.12)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    }
};


window.closeDeptStatsModal = function() {
    const overlay = document.getElementById("dept-stats-modal-overlay");
    if (overlay) overlay.style.display = "none";
    if (window.activeModalChart) {
        window.activeModalChart.destroy();
        window.activeModalChart = null;
    }
};



window.changeMonth = function (dir) {
    calendarCurrentMonth += dir;
    if (calendarCurrentMonth < 0) {
        calendarCurrentMonth = 11;
        calendarCurrentYear--;
    } else if (calendarCurrentMonth > 11) {
        calendarCurrentMonth = 0;
        calendarCurrentYear++;
    }
    // Reset selected date filter on month change
    calendarSelectedDateStr = null;
    const clearBtn = document.getElementById("btn-clear-date-filter");
    if (clearBtn) clearBtn.style.display = "none";
    renderCalendar();
    renderAnnouncementsList();
};

const MALAY_MONTHS = [
    "Januari", "Februari", "Mac", "April", "Mei", "Jun", 
    "Julai", "Ogos", "September", "Oktober", "November", "Disember"
];

window.renderCalendar = function () {
    const calendarTitle = document.getElementById("calendar-title");
    if (calendarTitle) {
        calendarTitle.textContent = `${MALAY_MONTHS[calendarCurrentMonth]} ${calendarCurrentYear}`;
    }

    const gridBody = document.getElementById("calendar-days-grid");
    if (!gridBody) return;
    gridBody.innerHTML = "";

    const announcements = getAnnouncements();

    // First day of the month
    const firstDayIndex = new Date(calendarCurrentYear, calendarCurrentMonth, 1).getDay();
    // Total days in the current month
    const totalDays = new Date(calendarCurrentYear, calendarCurrentMonth + 1, 0).getDate();

    // Fill previous empty cells
    for (let i = 0; i < firstDayIndex; i++) {
        const cell = document.createElement("div");
        cell.className = "calendar-cell cell-empty";
        cell.innerHTML = `<span class="cell-num"></span>`;
        gridBody.appendChild(cell);
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Fill days of the month
    for (let day = 1; day <= totalDays; day++) {
        const dayStr = `${calendarCurrentYear}-${String(calendarCurrentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Find announcements on this day
        const dayAnnouncements = announcements.filter(a => a.date === dayStr);

        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        if (dayStr === todayStr) {
            cell.classList.add("cell-today");
        }
        if (dayStr === calendarSelectedDateStr) {
            cell.classList.add("cell-active");
        }

        let numHtml = `<span class="cell-num">${day}</span>`;
        let dotsHtml = `<div class="cell-dots"></div>`;

        if (dayAnnouncements.length > 0) {
            cell.classList.add("cell-has-announcements");
            let dots = dayAnnouncements.map(a => {
                let catClass = "dot-umum";
                if (a.category === "Makluman Pelajar" || a.category === "Penting") catClass = "dot-penting";
                else if (a.category === "Makluman Pensyarah" || a.category === "Pendaftaran") catClass = "dot-pendaftaran";
                else if (a.category === "Makluman Umum" || a.category === "Akademik") catClass = "dot-akademik";
                return `<span class="cell-dot ${catClass}" title="${a.category}: ${a.title}"></span>`;
            }).slice(0, 3).join(""); // limit to 3 dots
            dotsHtml = `<div class="cell-dots">${dots}</div>`;
        }

        cell.innerHTML = numHtml + dotsHtml;

        // Click event to filter announcements
        cell.addEventListener("click", () => {
            if (calendarSelectedDateStr === dayStr) {
                // Toggle off
                calendarSelectedDateStr = null;
                const clearBtn = document.getElementById("btn-clear-date-filter");
                if (clearBtn) clearBtn.style.display = "none";
            } else {
                calendarSelectedDateStr = dayStr;
                const clearBtn = document.getElementById("btn-clear-date-filter");
                if (clearBtn) clearBtn.style.display = "inline-flex";
            }
            
            renderCalendar();
            renderAnnouncementsList();
        });

        gridBody.appendChild(cell);
    }
};

window.clearCalendarDateFilter = function () {
    calendarSelectedDateStr = null;
    const clearBtn = document.getElementById("btn-clear-date-filter");
    if (clearBtn) clearBtn.style.display = "none";
    renderCalendar();
    renderAnnouncementsList();
};

window.renderAnnouncementsList = function () {
    const listView = document.getElementById("announcements-list-view");
    if (!listView) return;
    listView.innerHTML = "";

    const listTitle = document.getElementById("announcements-list-title");
    if (listTitle) {
        if (calendarSelectedDateStr) {
            const parts = calendarSelectedDateStr.split('-');
            const dayNum = parseInt(parts[2]);
            const monthName = MALAY_MONTHS[parseInt(parts[1]) - 1];
            listTitle.textContent = `Makluman pada ${dayNum} ${monthName} ${parts[0]}`;
        } else {
            listTitle.textContent = `Makluman Bulan Ini (${MALAY_MONTHS[calendarCurrentMonth]})`;
        }
    }

    const announcements = getAnnouncements();
    let filtered = announcements;

    if (calendarSelectedDateStr) {
        // Filter by date
        filtered = announcements.filter(a => a.date === calendarSelectedDateStr);
    } else {
        // Filter by current month & year
        filtered = announcements.filter(a => {
            const dateParts = a.date.split("-");
            return parseInt(dateParts[0]) === calendarCurrentYear && parseInt(dateParts[1]) === (calendarCurrentMonth + 1);
        });
    }

    filtered.sort((a, b) => a.date.localeCompare(b.date));

    if (filtered.length === 0) {
        listView.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; text-align:center; color:var(--text-muted); gap:12px;">
                <i class="fa-regular fa-calendar-xmark" style="font-size:2.5rem; color:var(--text-muted); opacity:0.6;"></i>
                <p style="font-size:0.85rem;">Tiada makluman atau acara penting untuk ${calendarSelectedDateStr ? 'tarikh' : 'bulan'} ini.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(a => {
        let badgeClass = "badge-muted";
        let icon = "fa-solid fa-bullhorn";
        if (a.category === "Makluman Pelajar" || a.category === "Penting") { badgeClass = "badge-danger"; icon = "fa-solid fa-triangle-exclamation"; }
        else if (a.category === "Makluman Pensyarah" || a.category === "Pendaftaran") { badgeClass = "badge-success"; icon = "fa-solid fa-user-plus"; }
        else if (a.category === "Makluman Umum" || a.category === "Akademik") { badgeClass = "badge-warning"; icon = "fa-solid fa-graduation-cap"; }

        // Date format for display (e.g. 15 Julai 2026)
        const dateParts = a.date.split("-");
        const displayDate = `${parseInt(dateParts[2])} ${MALAY_MONTHS[parseInt(dateParts[1]) - 1]} ${dateParts[0]}`;

        const card = document.createElement("div");
        card.className = "announcement-card-item";
        card.innerHTML = `
            <div class="announcement-card-meta">
                <span class="badge ${badgeClass}"><i class="${icon}"></i> ${a.category}</span>
                <span><i class="fa-regular fa-calendar" style="margin-right:4px;"></i>${displayDate}</span>
            </div>
            <h4 class="announcement-card-title">${a.title}</h4>
            <p class="announcement-card-desc">${a.content.replace(/\n/g, '<br>')}</p>
            <div class="announcement-card-footer">
                <span><i class="fa-solid fa-user-shield" style="margin-right:4px;"></i>${a.updatedBy || 'UPLI PKK'}</span>
                <span>Kemaskini: ${a.updatedAt || ''}</span>
            </div>
        `;
        listView.appendChild(card);
    });
};

window.renderPortalDashboard = function (selectedSesi) {
    // Portal stats section removed as per Option A
};

function getStudentProgram(student) {
    if (!student) return "Lain-lain";
    const regNo = (student.regNo || "").toUpperCase();
    const classVal = (student.class || "").toUpperCase();

    const programs = [
        "DKA", "DUB", "DBK",
        "DEE", "DEP", "DTK",
        "DKM", "DTP", "DEM",
        "DPR", "DLS", "DAT",
        "DHR", "DHM", "KOK"
    ];
    for (let p of programs) {
        if (regNo.includes(p) || classVal.includes(p)) {
            return p;
        }
    }
    const match = classVal.match(/[A-Z]{3}/);
    if (match) return match[0];

    return "Lain-lain";
}

// Logo preview lightbox logic
window.openLogoPreviewModal = function() {
    console.log("openLogoPreviewModal called!");
    const modal = document.getElementById("logo-preview-modal");
    console.log("Modal found:", modal);
    if (modal) {
        modal.style.display = "flex";
    } else {
        alert("Ralat: Modal tidak dijumpai!");
    }
};

window.closeLogoPreviewModal = function() {
    const modal = document.getElementById("logo-preview-modal");
    if (modal) {
        modal.style.display = "none";
    }
};

// ==========================================================================
// SYSTEM & UI DEVELOPER PANEL ENGINE
// ==========================================================================
function hexToRgbA(hex, alpha = 1) {
    let c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x' + c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
    }
    return hex;
}

window.applySystemBranding = function () {
    const settings = dbCache.settings || {};
    
    // 1. Set dynamic colors variables on root element
    if (settings.themePrimary) {
        document.documentElement.style.setProperty('--color-primary', settings.themePrimary);
        document.documentElement.style.setProperty('--color-primary-glow', hexToRgbA(settings.themePrimary, 0.15));
    }
    if (settings.themeAccent) {
        document.documentElement.style.setProperty('--color-accent', settings.themeAccent);
        document.documentElement.style.setProperty('--color-accent-glow', hexToRgbA(settings.themeAccent, 0.15));
    }
    
    // 2. Set dynamic branding texts
    const appTitle = settings.appTitle || "My InternMS";
    const appSubtitle = settings.appSubtitle || "Sistem Pengurusan Latihan Industri";
    const copyright = settings.copyrightText || "Hakcipta © 2026 UPLI, PKK";
    
    // Update maximum file size limit
    if (settings.maxFileSize) {
        FS_MAX_FILE_SIZE = parseInt(settings.maxFileSize) * 1024 * 1024;
    } else {
        FS_MAX_FILE_SIZE = 20 * 1024 * 1024;
    }
    
    // Update uploader zones constraints labels dynamically
    const fileConstraints = document.querySelectorAll(".file-constraint");
    fileConstraints.forEach(label => {
        const maxMB = settings.maxFileSize || 20;
        if (label.textContent.includes("Boleh pilih berbilang fail") || label.id === "rubrik-upload-zone" || label.parentNode && label.parentNode.id === "rubrik-upload-zone") {
            label.textContent = `Format: PDF sahaja (Maks: ${maxMB}MB) (Boleh pilih berbilang fail)`;
        } else {
            label.textContent = `Format: PDF sahaja (Maks: ${maxMB}MB)`;
        }
    });

    // Update app title texts
    document.querySelectorAll(".app-title-text").forEach(el => {
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
            el.value = appTitle;
        } else {
            if (appTitle === "My InternMS") {
                el.innerHTML = `My Intern<span>MS</span>`;
            } else {
                el.textContent = appTitle;
            }
        }
    });

    // Update app subtitle text
    document.querySelectorAll(".app-subtitle-text").forEach(el => {
        el.textContent = appSubtitle;
    });

    // Update copyright footers
    document.querySelectorAll(".app-copyright-text").forEach(el => {
        el.textContent = copyright;
    });

    // 3. Update CMS Text Guidelines
    const portalDesc = settings.portalDesc || "Sila rujuk kalendar di bawah untuk tarikh-tarikh penting dan makluman terkini mengenai Latihan Industri.";
    const studentWelcome = settings.studentWelcome || "Sila pastikan semua dokumen latihan industri anda dimuat naik dan diluluskan oleh Pegawai UPLI";
    const studentDocsGuide = settings.studentDocsGuide || "Sila muat naik fail dokumen mengikut format yang ditetapkan. Sila klik \"Papar\" bagi dokumen yang telah diupload.";

    document.querySelectorAll(".app-desc-portal-text").forEach(el => el.textContent = portalDesc);
    document.querySelectorAll(".app-student-welcome-desc").forEach(el => el.textContent = studentWelcome);
    document.querySelectorAll(".app-student-docs-guideline").forEach(el => el.textContent = studentDocsGuide);

    // 4. Update Sidebar Menu Config
    const menuConfig = settings.menuConfig || {};
    const defaultMenus = {
        "student-documents": { label: "Penghantaran Dokumen", show: true },
        "rubrik-viewer": { label: "Dokumen Rujukan", show: true },
        "lecturer-dashboard": { label: "Ringkasan Jabatan", show: true },
        "lecturer-students": { label: "Pelajar Seliaan Saya", show: true },
        "lecturer-pa": { label: "Penasihat Akademik (PA)", show: true },
        "admin-dashboard": { label: "Statistik", show: true },
        "admin-students": { label: "Pengurusan Pelajar", show: true },
        "admin-lecturer-list": { label: "Direktori Pensyarah", show: true },
        "admin-lecturers": { label: "Agihan Pensyarah", show: true },
        "admin-pa": { label: "Pengurusan PA", show: true },
        "admin-announcements": { label: "Pengurusan Makluman", show: true },
        "admin-admins": { label: "Pengurusan Admin", show: true },
        "admin-rubrik": { label: "Dokumen Rujukan", show: true }
    };

    const finalConfig = { ...defaultMenus, ...menuConfig };

    Object.keys(finalConfig).forEach(tabId => {
        const conf = finalConfig[tabId];
        const items = document.querySelectorAll(`.nav-item[data-tab="${tabId}"]`);
        items.forEach(item => {
            // Update visibility
            item.style.display = conf.show ? "flex" : "none";
            // Update text label (preserving FontAwesome icon)
            const icon = item.querySelector("i");
            if (icon) {
                item.innerHTML = "";
                item.appendChild(icon);
                item.appendChild(document.createTextNode(" " + conf.label));
            }
        });
    });
};

window.populateDeveloperPanel = function() {
    const settings = dbCache.settings || {};
    
    const primCol = settings.themePrimary || "#14b8a6";
    const accCol = settings.themeAccent || "#6366f1";
    
    document.getElementById("dev-primary-color").value = primCol;
    document.getElementById("dev-primary-color-hex").value = primCol;
    
    document.getElementById("dev-accent-color").value = accCol;
    document.getElementById("dev-accent-color-hex").value = accCol;
    
    document.getElementById("dev-app-title").value = settings.appTitle || "My InternMS";
    document.getElementById("dev-app-subtitle").value = settings.appSubtitle || "Sistem Pengurusan Latihan Industri";
    document.getElementById("dev-copyright").value = settings.copyrightText || "Hakcipta © 2026 UPLI, PKK";
    document.getElementById("dev-max-file-size").value = settings.maxFileSize || 20;
    document.getElementById("dev-maintenance-toggle").checked = !!settings.maintenanceMode;

    // Populate CMS Guidelines Textareas
    document.getElementById("dev-portal-desc").value = settings.portalDesc || "Sila rujuk kalendar di bawah untuk tarikh-tarikh penting dan makluman terkini mengenai Latihan Industri.";
    document.getElementById("dev-student-welcome").value = settings.studentWelcome || "Sila pastikan semua dokumen latihan industri anda dimuat naik dan diluluskan oleh Pegawai UPLI";
    document.getElementById("dev-student-docs-guide").value = settings.studentDocsGuide || "Sila muat naik fail dokumen mengikut format yang ditetapkan. Sila klik \"Papar\" bagi dokumen yang telah diupload.";

    document.getElementById("dev-link-pes").value = settings.linkPES || "";
    document.getElementById("dev-link-maklum-balas").value = settings.linkMaklumBalas || "";

    // Populate Sidebar Customizer Inputs
    const menuConfig = settings.menuConfig || {};
    const keys = [
        "student-documents", "rubrik-viewer",
        "lecturer-dashboard", "lecturer-students", "lecturer-pa",
        "admin-dashboard", "admin-students", "admin-lecturer-list",
        "admin-lecturers", "admin-pa", "admin-announcements", "admin-admins", "admin-rubrik"
    ];
    const defaultLabels = {
        "student-documents": "Penghantaran Dokumen",
        "rubrik-viewer": "Dokumen Rujukan",
        "lecturer-dashboard": "Ringkasan Jabatan",
        "lecturer-students": "Pelajar Seliaan Saya",
        "lecturer-pa": "Penasihat Akademik (PA)",
        "admin-dashboard": "Statistik",
        "admin-students": "Pengurusan Pelajar",
        "admin-lecturer-list": "Direktori Pensyarah",
        "admin-lecturers": "Agihan Pensyarah",
        "admin-pa": "Pengurusan PA",
        "admin-announcements": "Pengurusan Makluman",
        "admin-admins": "Pengurusan Admin",
        "admin-rubrik": "Dokumen Rujukan"
    };

    keys.forEach(k => {
        const conf = menuConfig[k] || { label: defaultLabels[k], show: true };
        const lblInput = document.getElementById(`menu-${k}-label`);
        const showInput = document.getElementById(`menu-${k}-show`);
        if (lblInput) lblInput.value = conf.label;
        if (showInput) showInput.checked = !!conf.show;
    });
};

window.saveDeveloperSettings = async function() {
    const primaryColor = document.getElementById("dev-primary-color").value;
    const accentColor = document.getElementById("dev-accent-color").value;
    const appTitle = document.getElementById("dev-app-title").value.trim();
    const appSubtitle = document.getElementById("dev-app-subtitle").value.trim();
    const copyrightText = document.getElementById("dev-copyright").value.trim();
    const maxFileSize = parseInt(document.getElementById("dev-max-file-size").value);
    const maintenanceMode = document.getElementById("dev-maintenance-toggle").checked;

    const portalDesc = document.getElementById("dev-portal-desc").value.trim();
    const studentWelcome = document.getElementById("dev-student-welcome").value.trim();
    const studentDocsGuide = document.getElementById("dev-student-docs-guide").value.trim();

    const linkPES = document.getElementById("dev-link-pes").value.trim();
    const linkMaklumBalas = document.getElementById("dev-link-maklum-balas").value.trim();

    if (!appTitle) {
        showToast("Sila masukkan nama aplikasi!", "error");
        return;
    }
    if (isNaN(maxFileSize) || maxFileSize < 1 || maxFileSize > 100) {
        showToast("Saiz fail maks mestilah di antara 1MB hingga 100MB!", "error");
        return;
    }

    // Gather Sidebar labels & visibility checkbox configurations
    const keys = [
        "student-documents", "rubrik-viewer",
        "lecturer-dashboard", "lecturer-students", "lecturer-pa",
        "admin-dashboard", "admin-students", "admin-lecturer-list",
        "admin-lecturers", "admin-pa", "admin-announcements", "admin-admins", "admin-rubrik"
    ];
    const menuConfig = {};
    keys.forEach(k => {
        const labelInput = document.getElementById(`menu-${k}-label`);
        const showInput = document.getElementById(`menu-${k}-show`);
        const label = labelInput ? labelInput.value.trim() : k;
        const show = showInput ? showInput.checked : true;
        menuConfig[k] = { label: label || k, show };
    });

    const btn = document.getElementById("btn-save-developer-settings");
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;

    try {
        const updates = {
            themePrimary: primaryColor,
            themeAccent: accentColor,
            appTitle: appTitle,
            appSubtitle: appSubtitle,
            copyrightText: copyrightText,
            maxFileSize: maxFileSize,
            maintenanceMode: maintenanceMode,
            portalDesc: portalDesc,
            studentWelcome: studentWelcome,
            studentDocsGuide: studentDocsGuide,
            menuConfig: menuConfig,
            linkPES: linkPES,
            linkMaklumBalas: linkMaklumBalas
        };

        await writeSettingsToFirestore(updates);
        
        dbCache.settings = { ...dbCache.settings, ...updates };
        localStorage.setItem("upli_settings", JSON.stringify(dbCache.settings));
        
        applySystemBranding();
        
        showToast("Tetapan sistem dan pembangun berjaya disimpan!", "success");
    } catch (e) {
        console.error("Gagal simpan tetapan developer:", e);
        showToast("Ralat menyimpan tetapan: " + e.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

// Sync color inputs
document.getElementById("dev-primary-color").addEventListener("input", function() {
    document.getElementById("dev-primary-color-hex").value = this.value;
});
document.getElementById("dev-primary-color-hex").addEventListener("change", function() {
    let val = this.value.trim();
    if (/^#[0-9A-F]{6}$/i.test(val)) {
        document.getElementById("dev-primary-color").value = val;
    }
});
document.getElementById("dev-accent-color").addEventListener("input", function() {
    document.getElementById("dev-accent-color-hex").value = this.value;
});
document.getElementById("dev-accent-color-hex").addEventListener("change", function() {
    let val = this.value.trim();
    if (/^#[0-9A-F]{6}$/i.test(val)) {
        document.getElementById("dev-accent-color").value = val;
    }
});
