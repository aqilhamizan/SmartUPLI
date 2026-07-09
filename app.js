/* ==========================================================================
   SMART UPLI HUB - APPLICATION SCRIPT (VANILLA JS)
   Logic: Role-Based Routing, Database Seeding, LocalStorage Sync, UI Updates
   ========================================================================== */

// --------------------------------------------------------------------------
// A. DATA SCHEMAS & DEFAULT DATABASE SEEDING
// --------------------------------------------------------------------------
const DOC_SCHEMAS = {
    "Kejuruteraan": {
        sebelum: [
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
            { id: "laporan_akhir", title: "Laporan Akhir LI", desc: "Laporan Akhir Latihan Industri (LALI)." }
        ]
    },
    "Bukan Kejuruteraan": {
        sebelum: [
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
            { id: "laporan_akhir", title: "Laporan Akhir LI", desc: "Laporan Akhir Latihan Industri (LALI)." }
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
        content: "Sila muat naik Borang Jawapan Organisasi yang telah lengkap ditandatangani oleh majikan ke dalam sistem SmartUPLI sebelum jam 5:00 Petang.",
        date: "2026-07-15",
        category: "Penting",
        updatedBy: "Dr. Hamzah bin Salleh",
        updatedAt: "2026-07-03 08:12"
    },
    {
        id: "ann_default_3",
        title: "Pendaftaran Sistem SmartUPLI Pelajar Baharu",
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
    "Sesi 2:2025/2026",
    "Sesi 1:2026/2027"
];

const DEFAULT_STUDENTS = [
    {
        name: "Mohammad Amirul bin Rosli",
        regNo: "13DKA23F1001",
        email: "amirul@student.com",
        class: "DKA5B",
        jabatan: "JKA",
        tempatLI: "Petronas Carigali KK",
        pensyarahPemantau: "faridah@polikk.edu.my",
        pensyarahPenilai: "rizwan@polikk.edu.my",
        sesi: "Sesi 1:2026/2027",
        role: "student",
        documents: {
            borang_jawapan: {
                status: "Diterima",
                fileName: "amirul_jawapan.pdf",
                fileSize: "1.4 MB",
                uploadDate: "2026-06-15 10:24",
                feedback: "Jawapan lengkap.",
                fileData: ""
            },
            skop_kerja: {
                status: "Dalam Semakan",
                fileName: "skop_kerja_amirul.pdf",
                fileSize: "980 KB",
                uploadDate: "2026-06-20 14:15",
                feedback: "",
                fileData: ""
            }
        }
    },
    {
        name: "Nurul Aishah binti Osman",
        regNo: "13DUB23F1002",
        email: "aishah@student.com",
        class: "DUB5A",
        jabatan: "JKA",
        tempatLI: "Telekom Malaysia (Sabah)",
        pensyarahPemantau: "faridah@polikk.edu.my",
        pensyarahPenilai: "alice@polikk.edu.my",
        sesi: "Sesi 1:2026/2027",
        role: "student",
        documents: {
            borang_jawapan: {
                status: "Diterima",
                fileName: "aishah_jawapan.pdf",
                fileSize: "1.1 MB",
                uploadDate: "2026-06-12 09:30",
                feedback: "Diluluskan.",
                fileData: ""
            }
        }
    },
    {
        name: "Chong Wei Sheng",
        regNo: "13DKA23F2001",
        email: "chong@student.com",
        class: "DKA5C",
        jabatan: "JKA",
        tempatLI: "Syarikat Pembinaan Jaya Sdn Bhd",
        pensyarahPemantau: "alice@polikk.edu.my",
        pensyarahPenilai: "faridah@polikk.edu.my",
        sesi: "Sesi 1:2026/2027",
        role: "student",
        documents: {}
    }
];


const DEFAULT_LOGS = [
    { type: "info", text: "Sistem Smart UPLI Hub berjaya dimulakan.", time: "2026-07-03 08:00" },
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
    try {
        await db.collection("settings").doc("announcements").set({
            list: data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.warn("FS writeAnnouncements:", e.message);
    }
}

// Show/hide loading overlay while Firestore loads
function showDBLoading(show) {
    let overlay = document.getElementById("db-loading-overlay");
    if (show && !overlay) {
        overlay = document.createElement("div");
        overlay.id = "db-loading-overlay";
        overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.97);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#f1f5f9;font-family:'Outfit',sans-serif;gap:18px;";
        overlay.innerHTML = `
            <div style="width:54px;height:54px;border:4px solid rgba(99,102,241,0.2);border-top:4px solid #6366f1;border-radius:50%;animation:db-spin 0.8s linear infinite;"></div>
            <div style="text-align:center;">
                <p style="font-size:1.15rem;font-weight:700;letter-spacing:-0.4px;margin-bottom:6px;">Menyambung ke Firebase...</p>
                <p style="font-size:0.8rem;color:#94a3b8;">Memuatkan data sistem SmartUPLI</p>
            </div>
            <style>@keyframes db-spin{to{transform:rotate(360deg)}}</style>
        `;
        document.body.appendChild(overlay);
    } else if (!show && overlay) {
        overlay.style.transition = "opacity 0.3s";
        overlay.style.opacity = "0";
        setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 300);
    }
}

// Sanitize Firestore document ID
function sanitizeDocId(str) {
    return String(str).replace(/[/.#$\[\]]/g, "_");
}

// ---------- Firestore Write Helpers (fire-and-forget) ----------

async function writeAdminsToFirestore(data) {
    try { await db.collection("settings").doc("admins").set({ list: data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
    catch (e) { console.warn("FS writeAdmins:", e.message); }
}

async function writeLecturersToFirestore(data) {
    try { await db.collection("settings").doc("lecturers").set({ list: data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
    catch (e) { console.warn("FS writeLecturers:", e.message); }
}

async function writeStudentToFirestore(student) {
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
    await Promise.all(data.map(s => writeStudentToFirestore(s)));
}

async function deleteStudentFromFirestore(regNo) {
    try { await db.collection("students").doc(sanitizeDocId(regNo)).delete(); }
    catch (e) { console.warn("FS deleteStudent:", e.message); }
}

async function writeSettingsToFirestore(updates) {
    try { await db.collection("settings").doc("global").set(updates, { merge: true }); }
    catch (e) { console.warn("FS writeSettings:", e.message); }
}

async function writeLogToFirestore(entry) {
    try { await db.collection("logs").add({ ...entry, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); }
    catch (e) { console.warn("FS writeLog:", e.message); }
}

async function writeRubriksToFirestore(data) {
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
    let changed = false;

    // Remove JTMK dept students
    const before = dbCache.students.length;
    dbCache.students = dbCache.students.filter(s => s.jabatan !== "JTMK");
    if (dbCache.students.length !== before) changed = true;

    // Remove JTMK lecturers
    dbCache.lecturers = dbCache.lecturers.filter(l => l.dept !== "JTMK");

    dbCache.students.forEach(s => {
        if (!s.documents) { s.documents = {}; changed = true; }
        OLD_DOC_IDS.forEach(k => { if (s.documents[k] !== undefined) { delete s.documents[k]; changed = true; } });
        const requiredDocs = getStudentDocsList(s);
        requiredDocs.forEach(d => {
            if (!s.documents[d.id]) {
                s.documents[d.id] = { status: "Belum Dihantar", fileName: "", fileSize: "", uploadDate: "", feedback: "", fileUrl: "" };
                changed = true;
            }
        });
    });

    if (changed) writeStudentsToFirestore(dbCache.students);
}

// ---------- initDatabase — Async, loads from Firestore ----------
async function initDatabase() {
    showDBLoading(true);
    try {
        // 1. Global settings
        const settingsDoc = await db.collection("settings").doc("global").get();
        if (settingsDoc.exists) {
            const d = settingsDoc.data();
            dbCache.sessions = d.sessions || DEFAULT_SESSIONS;
            dbCache.activeSession = d.activeSession || "Sesi 1:2026/2027";
        } else {
            dbCache.sessions = DEFAULT_SESSIONS;
            dbCache.activeSession = "Sesi 1:2026/2027";
            await writeSettingsToFirestore({ sessions: DEFAULT_SESSIONS, activeSession: "Sesi 1:2026/2027" });
        }

        // 2. Admins
        const adminsDoc = await db.collection("settings").doc("admins").get();
        if (adminsDoc.exists && adminsDoc.data().list && adminsDoc.data().list.length > 0) {
            dbCache.admins = adminsDoc.data().list;
        } else {
            dbCache.admins = DEFAULT_ADMINS;
            await writeAdminsToFirestore(DEFAULT_ADMINS);
        }

        // 3. Lecturers
        const lecturersDoc = await db.collection("settings").doc("lecturers").get();
        if (lecturersDoc.exists && lecturersDoc.data().list && lecturersDoc.data().list.length > 0) {
            dbCache.lecturers = lecturersDoc.data().list;
        } else {
            dbCache.lecturers = DEFAULT_LECTURERS;
            await writeLecturersToFirestore(DEFAULT_LECTURERS);
        }

        // 4. Students
        const studentsSnap = await db.collection("students").get();
        if (!studentsSnap.empty) {
            dbCache.students = studentsSnap.docs.map(doc => doc.data());
        } else {
            const cleanStudents = DEFAULT_STUDENTS.map(s => {
                const c = JSON.parse(JSON.stringify(s));
                if (c.documents) Object.keys(c.documents).forEach(k => { delete c.documents[k].fileData; });
                return c;
            });
            dbCache.students = cleanStudents;
            await writeStudentsToFirestore(cleanStudents);
        }
        normalizeStudentsCache();

        // 5. Logs
        try {
            const logsSnap = await db.collection("logs").orderBy("createdAt", "desc").limit(50).get();
            if (!logsSnap.empty) {
                dbCache.logs = logsSnap.docs.map(d => ({ type: d.data().type || "info", text: d.data().text || "", time: d.data().time || "" }));
            } else {
                dbCache.logs = DEFAULT_LOGS;
                for (const log of DEFAULT_LOGS) await writeLogToFirestore(log);
            }
        } catch (_) {
            // Logs index might not exist yet — fallback to defaults
            dbCache.logs = DEFAULT_LOGS;
        }

        // 6. Rubriks
        const rubriksDoc = await db.collection("settings").doc("rubriks").get();
        dbCache.rubriks = (rubriksDoc.exists && rubriksDoc.data().list) ? rubriksDoc.data().list : [];

        // 7. Announcements
        try {
            const announcementsDoc = await db.collection("settings").doc("announcements").get();
            if (announcementsDoc.exists && announcementsDoc.data().list && announcementsDoc.data().list.length > 0) {
                dbCache.announcements = announcementsDoc.data().list;
            } else {
                dbCache.announcements = DEFAULT_ANNOUNCEMENTS;
                await writeAnnouncementsToFirestore(DEFAULT_ANNOUNCEMENTS);
            }
        } catch (annErr) {
            console.warn("Firestore announcements load error:", annErr);
            dbCache.announcements = DEFAULT_ANNOUNCEMENTS;
        }

    } catch (err) {
        console.error("Firebase initDatabase error:", err);
        // Graceful fallback to localStorage if Firestore is unavailable
        dbCache.admins = JSON.parse(localStorage.getItem("upli_admins") || JSON.stringify(DEFAULT_ADMINS));
        dbCache.lecturers = JSON.parse(localStorage.getItem("upli_lecturers") || JSON.stringify(DEFAULT_LECTURERS));
        dbCache.students = JSON.parse(localStorage.getItem("upli_students") || JSON.stringify(DEFAULT_STUDENTS));
        dbCache.sessions = JSON.parse(localStorage.getItem("upli_sessions") || JSON.stringify(DEFAULT_SESSIONS));
        dbCache.activeSession = localStorage.getItem("upli_active_session") || "Sesi 1:2026/2027";
        dbCache.logs = JSON.parse(localStorage.getItem("upli_logs") || JSON.stringify(DEFAULT_LOGS));
        dbCache.rubriks = JSON.parse(localStorage.getItem("upli_rubriks") || "[]");
        dbCache.announcements = JSON.parse(localStorage.getItem("upli_announcements") || JSON.stringify(DEFAULT_ANNOUNCEMENTS));
        showToast("⚠️ Gagal menyambung Firebase. Data tempatan digunakan.", "error");
    } finally {
        showDBLoading(false);
    }
    
    // Attach realtime listeners only once after initial load
    attachRealtimeListeners();
}

let realtimeListenersAttached = false;
function attachRealtimeListeners() {
    if (realtimeListenersAttached) return;
    realtimeListenersAttached = true;

    // Helper to process document/collection snapshots
    function processSnapshot(snapshot, cacheKey, isCollection, processor) {
        if (snapshot.metadata.hasPendingWrites) return; // Ignore local writes to prevent UI jumping
        if (isCollection) {
            dbCache[cacheKey] = snapshot.empty ? [] : snapshot.docs.map(processor);
        } else {
            if (snapshot.exists) dbCache[cacheKey] = processor(snapshot);
        }
        try { localStorage.setItem(`upli_${cacheKey}`, JSON.stringify(dbCache[cacheKey])); } catch(e){}
        if (window.activeTab) renderTabData(window.activeTab);
    }

    let studentsFirst = true;
    db.collection("students").onSnapshot(snapshot => {
        if (studentsFirst) { studentsFirst = false; return; }
        if (snapshot.metadata.hasPendingWrites) return;
        dbCache.students = snapshot.empty ? [] : snapshot.docs.map(doc => doc.data());
        normalizeStudentsCache();
        try { localStorage.setItem("upli_students", JSON.stringify(dbCache.students)); } catch(e){}
        if (window.activeTab) renderTabData(window.activeTab);
    }, err => console.warn("Sync error students:", err));

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
        try { localStorage.setItem("upli_sessions", JSON.stringify(dbCache.sessions)); } catch(e){}
        try { localStorage.setItem("upli_active_session", dbCache.activeSession); } catch(e){}
        if (window.activeTab) renderTabData(window.activeTab);
    }, err => console.warn("Sync error global:", err));

    ['admins', 'lecturers', 'rubriks', 'announcements'].forEach(key => {
        let first = true;
        db.collection("settings").doc(key).onSnapshot(doc => {
            if (first) { first = false; return; }
            processSnapshot(doc, key, false, d => d.data().list || []);
        }, err => console.warn(`Sync error ${key}:`, err));
    });
}

// ---------- Sync Getters — read from in-memory cache ----------
function getAdmins() { return dbCache.admins; }
function saveAdmins(data) { dbCache.admins = data; writeAdminsToFirestore(data); }

function getLecturers() { return dbCache.lecturers; }
function saveLecturers(data) { dbCache.lecturers = data; writeLecturersToFirestore(data); }

function getStudents() { return dbCache.students; }
function saveStudents(data, modifiedRegNo = null) { 
    dbCache.students = data; 
    try { localStorage.setItem("upli_students", JSON.stringify(data)); } catch(e) {}
    
    if (modifiedRegNo === "none") {
        // Skip Firestore write (already handled via delete operations)
        return;
    }
    
    if (modifiedRegNo) {
        if (typeof modifiedRegNo === 'string') {
            const student = data.find(s => s.regNo === modifiedRegNo);
            if (student) writeStudentToFirestore(student);
        } else if (Array.isArray(modifiedRegNo)) {
            modifiedRegNo.forEach(r => {
                const student = data.find(s => s.regNo === r);
                if (student) writeStudentToFirestore(student);
            });
        }
    } else {
        writeStudentsToFirestore(data); 
    }
}

function getSessions() { return dbCache.sessions; }
function saveSessions(data) { dbCache.sessions = data; writeSettingsToFirestore({ sessions: data }); }

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
const FS_CHUNK_SIZE = 600 * 1024; // 600KB raw per chunk
const FS_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max per file

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

    // Return from memory cache if available
    if (fileCache[fileId]) return fileCache[fileId];

    // Load chunk 0 first to get totalChunks count
    const chunk0 = await db.collection("file_data").doc(`${fileId}_0`).get();
    if (!chunk0.exists) return null;

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
function startClock() {
    const dateDisplay = document.getElementById("current-date-display");
    const portalDateDisplay = document.getElementById("portal-date-display");
    const portalTimeDisplay = document.getElementById("portal-time-display");
    const portalDayDisplay = document.getElementById("portal-day-display");
    
    setInterval(() => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString("ms-MY");
        timeDisplay.textContent = timeStr;
        if (portalTimeDisplay) {
            portalTimeDisplay.textContent = timeStr;
        }
        
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        const dateStr = now.toLocaleDateString("ms-MY", options);
        if (dateDisplay) {
            dateDisplay.textContent = dateStr;
        }
        if (portalDateDisplay) {
            const portalDateOptions = { day: '2-digit', month: 'long', year: 'numeric' };
            portalDateDisplay.textContent = now.toLocaleDateString("ms-MY", portalDateOptions);
        }
        if (portalDayDisplay) {
            const portalDayOptions = { weekday: 'long' };
            portalDayDisplay.textContent = now.toLocaleDateString("ms-MY", portalDayOptions);
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

// Navigation switches between auth pages
document.getElementById("link-to-register").addEventListener("click", (e) => {
    e.preventDefault();
    switchPortalTab('register');
});

document.getElementById("link-to-login").addEventListener("click", (e) => {
    e.preventDefault();
    switchPortalTab('login');
});

// --- SUBMIT: Student Login ---
studentLoginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const regNo = document.getElementById("student-reg").value.trim().toUpperCase();
    const students = getStudents();

    const matchedStudent = students.find(s => s.regNo === regNo);
    if (matchedStudent) {
        loginUser(matchedStudent, "student");
    } else {
        showToast("No. Pendaftaran tidak wujud dalam sistem! Sila hubungi Admin.", "error");
    }
});

// --- SUBMIT: Lecturer Login (Auto-Register Email `@polikk.edu.my`) ---
lecturerLoginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("lecturer-email").value.trim().toLowerCase();

    if (!email.endsWith("@polikk.edu.my")) {
        showToast("Format emel salah! Mestilah berakhir dengan @polikk.edu.my", "error");
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
    const matchedAdmin = admins.find(a => a.email === email && a.staffId === password);

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

    showToast(`Log masuk berjaya sebagai ${user.name}`, "success");
    addLog("info", `${user.name} (${role.toUpperCase()}) log masuk.`);

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
    if (role === "lecturer" || role === "admin") {
        populateGlobalSessionSelect();
        sessionSelectContainer.style.display = "flex";
    } else {
        sessionSelectContainer.style.display = "none";
    }

    // Show Nav Group for Role
    Object.keys(navGroups).forEach(g => {
        navGroups[g].style.display = g === role ? "flex" : "none";
    });

    // Setup Navigation active link
    const firstNavItem = navGroups[role].querySelector(".nav-item");
    navGroups[role].querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    firstNavItem.classList.add("active");

    const targetTab = firstNavItem.dataset.tab;

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
    const sessions = getSessions();
    const active = getActiveSession();

    globalSessionSelect.innerHTML = "";
    sessions.forEach(s => {
        const option = document.createElement("option");
        option.value = s;
        option.textContent = s;
        option.style.setProperty('color', '#000000', 'important');
        option.style.setProperty('background-color', '#ffffff', 'important');
        if (s === active) option.selected = true;
        globalSessionSelect.appendChild(option);
    });
}

// Watch global session dropdown change
globalSessionSelect.addEventListener("change", function () {
    const selectedSesi = this.value;
    saveActiveSession(selectedSesi);
    addLog("info", `Pertukaran paparan sesi akademik aktif ke: ${selectedSesi}`);
    showToast(`Paparan ditukar ke Sesi: ${selectedSesi}`, "info");

    // Refresh current tab
    renderTabData(activeTab);
});

logoutBtn.addEventListener("click", () => {
    if (currentUser) {
        addLog("info", `${currentUser.name} log keluar.`);
        currentUser = null;
        currentRole = null;
    }

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
function switchTab(tabId) {
    activeTab = tabId;

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
    if (tabId === "admin-dashboard") title = "Statistik Keseluruhan Pelajar LI";
    if (tabId === "admin-students") title = "Pengurusan Data Pelajar";
    if (tabId === "admin-lecturers") title = "Agihan Pensyarah Pemantau / Penilai";
    if (tabId === "admin-announcements") title = "Pengurusan Makluman Penting";
    if (tabId === "admin-admins") title = "Pengurusan Pentadbir Sistem";
    if (tabId === "admin-rubrik") title = "Rubrik Pemarkahan";
    if (tabId === "rubrik-viewer") title = "Rubrik Pemarkahan";

    currentTabTitle.textContent = title;

    renderTabData(tabId);
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
        if (tabId === "student-dashboard") renderStudentDashboard();
        if (tabId === "student-documents") renderStudentDocuments();

        if (tabId === "lecturer-dashboard") renderLecturerDashboard();
        if (tabId === "lecturer-students") renderLecturerStudentsList();

        if (tabId === "admin-dashboard") renderAdminDashboard();
        if (tabId === "admin-students") renderAdminStudentsTable();
        if (tabId === "admin-lecturers") renderAdminLecturerAssignTable();
        if (tabId === "admin-announcements") renderAdminAnnouncements();
        if (tabId === "admin-admins") renderAdminAdminsTable();
        if (tabId === "admin-rubrik") renderAdminRubrik();
        if (tabId === "rubrik-viewer") renderRubrikViewer();
    } catch (renderErr) {
        console.error("[SmartUPLI] renderTabData error:", renderErr);
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

            const card = document.createElement("div");
            card.className = "doc-card";
            card.style.margin = "0";

            let cardBody = `
                <div class="doc-card-header">
                    <span class="doc-number">${index++}</span>
                    <span class="badge ${statusClass}"><i class="fa-solid fa-circle"></i> ${status}</span>
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
                    <div class="uploaded-file-info" style="justify-content: space-between;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <i class="fa-solid fa-file-pdf file-icon"></i>
                            <div class="file-meta-mini">
                                <span class="file-name-mini" title="${doc.fileName}">${doc.fileName}</span>
                                <span class="file-size-mini">${doc.fileSize} • ${doc.uploadDate}</span>
                            </div>
                        </div>
                        <button class="btn btn-secondary btn-sm btn-icon" onclick="openDocumentViewer('${currentUser.regNo}', '${key}')" title="Lihat Dokumen" style="border-radius: 4px; padding: 6px 10px;">
                            <i class="fa-solid fa-eye text-primary"></i> Papar
                        </button>
                    </div>
                `;
            }

            if (window.uploadProgress && window.uploadProgress[key] !== undefined) {
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
                // slaid_pembentangan: PowerPoint or PDF only; others: PDF/PNG/JPG
                const isSlaid = key === "slaid_pembentangan";
                const acceptTypes = isSlaid ? ".ppt,.pptx,.pdf" : ".pdf,.png,.jpg,.jpeg";
                const constraintLabel = isSlaid
                    ? "PowerPoint (.ppt, .pptx) atau PDF sahaja (Maks: 10GB)"
                    : "PDF, PNG, JPG (Maks: 10GB)";
                cardBody += `
                    <div class="upload-zone" onclick="triggerFileUpload('${key}')">
                        <i class="fa-solid fa-cloud-arrow-up"></i>
                        <span>Pilih Fail untuk Muat Naik</span>
                        <span class="file-constraint">${constraintLabel}</span>
                    </div>
                    <input type="file" id="file-input-${key}" style="display:none;" accept="${acceptTypes}" onchange="handleFileSelected(event, '${key}')">
                `;
            } else if (status === "Dalam Semakan") {
                cardBody += `
                    <button class="btn btn-secondary btn-block btn-sm" disabled>
                        <i class="fa-solid fa-spinner fa-spin"></i> Menunggu Semakan
                    </button>
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

    // FILTER: Filter students by department AND active academic session AND search query
    const filteredStudents = students.filter(s =>
        s.jabatan === activeLecturerDept &&
        s.sesi === activeSesi &&
        (s.name.toLowerCase().includes(searchQuery) || s.regNo.toLowerCase().includes(searchQuery))
    );

    // Set headers dynamically
    const hasPenilai = deptHasPenilai(activeLecturerDept);
    thead.innerHTML = `
        <tr>
            <th>Nama Pelajar</th>
            <th>No. Pendaftaran</th>
            <th>Tempat Latihan Industri (LI)</th>
            <th>Pensyarah Pemantau</th>
            <th>Emel Pemantau</th>
            ${hasPenilai ? `
                <th>Pensyarah Penilai</th>
                <th>Emel Penilai</th>
            ` : ""}
            <th>Status Dokumen</th>
        </tr>
    `;

    if (filteredStudents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${hasPenilai ? 8 : 6}" style="text-align:center;" class="text-muted">Tiada rekod pelajar berdaftar di bawah jabatan ${activeLecturerDept} bagi sesi ${activeSesi}.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
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

            docsVisual += `<span class="status-indicator-dot ${c}" title="${d.title}: ${status}" onclick="openDocumentReviewModal('${s.regNo}', '${key}')">${d.title.split(" ").map(w => w[0]).join("").substring(0, 2)}</span>`;
        });

        tbody.innerHTML += `
            <tr class="student-table-row" data-dept="${s.jabatan}">
                <td>
                    <div class="table-student-cell">
                        <div class="avatar mini-avatar">${getInitials(s.name)}</div>
                        <strong>${s.name}</strong>
                    </div>
                </td>
                <td><code>${s.regNo}</code></td>
                <td>${s.tempatLI || 'Belum Ditentukan'}</td>
                <td><span style="font-size:0.8rem;">${pemantauName}</span></td>
                <td><span style="font-size:0.8rem; color:var(--text-muted);">${pemantauEmail}</span></td>
                ${hasPenilai ? `
                    <td><span style="font-size:0.8rem;">${penilaiName}</span></td>
                    <td><span style="font-size:0.8rem; color:var(--text-muted);">${penilaiEmail}</span></td>
                ` : ""}
                <td>
                    <div class="doc-mini-status-grid">
                        ${docsVisual}
                    </div>
                </td>
            </tr>
        `;
    });
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
        (s.name.toLowerCase().includes(searchQuery) || s.regNo.toLowerCase().includes(searchQuery))
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

            const initialsDoc = d.title.split(" ").map(w => w[0]).join("").substring(0, 2);
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

        const card = document.createElement("div");
        card.className = "student-card";
        card.setAttribute("data-dept", s.jabatan);

        card.innerHTML = `
            <div class="student-card-header">
                <div class="avatar">${getInitials(s.name)}</div>
                <div>
                    <span class="role-badge" style="font-size:0.65rem; margin-bottom:4px; padding:2px 6px; display:inline-block;">${roleLabel}</span>
                    <h4>${s.name}</h4>
                    <p>No Pendaftaran: <code>${s.regNo}</code></p>
                    <p>Jabatan: ${s.jabatan}</p>
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

    const doc = student.documents[docId];
    if (doc.status === "Belum Dihantar") {
        showToast("Pelajar belum memuat naik fail dokumen ini!", "error");
        return;
    }

    currentReviewContext = { studentReg, docId };

    document.getElementById("doc-modal-student-name").textContent = student.name;
    document.getElementById("doc-modal-student-reg").textContent = student.regNo;
    document.getElementById("doc-modal-doc-type").textContent = getDocMetadata(docId, student).title;
    document.getElementById("doc-modal-file-name").textContent = doc.fileName;
    document.getElementById("doc-modal-file-size").textContent = `${doc.fileSize} • Dimuat naik pada ${doc.uploadDate}`;

    const badgeEl = document.getElementById("doc-modal-current-status-badge");
    badgeEl.className = "badge " + (doc.status === "Diterima" ? "badge-success" : (doc.status === "Ditolak" ? "badge-danger" : "badge-warning"));
    badgeEl.textContent = doc.status;

    document.getElementById("doc-review-status").value = doc.status === "Diterima" ? "Diterima" : "Ditolak";
    document.getElementById("doc-review-feedback").value = doc.feedback || "";

    const dlLink = document.getElementById("doc-modal-download-link");
    const fileSource = doc.fileUrl || doc.fileData || "";
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

    const previewBox = document.getElementById("doc-modal-preview-box");

    // Async helper to render preview after loading
    async function renderPreview() {
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
    if (!currentReviewContext) return;

    const { studentReg, docId } = currentReviewContext;
    const status = document.getElementById("doc-review-status").value;
    const feedback = document.getElementById("doc-review-feedback").value.trim();

    const students = getStudents();
    const studentIdx = students.findIndex(s => s.regNo === studentReg);

    if (studentIdx !== -1) {
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

function renderAdminDashboard() {
    if (currentRole !== "admin") return;

    const students = getStudents();
    const admins = getAdmins();
    const activeSesi = getActiveSession();

    applyDeptTheme(activeAdminDept);

    // Filter students by active session
    const currentSessionStudents = students.filter(s => s.sesi === activeSesi);

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

    // Update Department Details inside Dashboard
    document.getElementById("admin-dept-title-display").textContent = `Senarai Pelajar Jabatan: ${activeAdminDept} (${activeSesi})`;

    const deptStudents = currentSessionStudents.filter(s => s.jabatan === activeAdminDept);
    document.getElementById("admin-dept-count-badge").textContent = `${deptStudents.length} Pelajar`;

    const listBody = document.getElementById("admin-dashboard-dept-students-list");
    listBody.innerHTML = "";

    if (deptStudents.length === 0) {
        listBody.innerHTML = `<tr><td colspan="5" style="text-align:center;" class="text-muted">Tiada rekod pelajar berdaftar di bawah jabatan ${activeAdminDept} bagi sesi ${activeSesi}.</td></tr>`;
    } else {
        deptStudents.forEach(s => {
            const requiredDocs = getStudentDocsList(s);
            let approvedCount = 0;
            requiredDocs.forEach(d => {
                const status = s.documents[d.id] ? s.documents[d.id].status : "Belum Dihantar";
                if (status === "Diterima") approvedCount++;
            });
            const pct = Math.round((approvedCount / requiredDocs.length) * 100);

            listBody.innerHTML += `
                <tr class="student-table-row" data-dept="${s.jabatan}">
                    <td>
                        <div class="table-student-cell">
                            <div class="avatar mini-avatar">${getInitials(s.name)}</div>
                            <span>${s.name}</span>
                        </div>
                    </td>
                    <td><code>${s.regNo}</code></td>
                    <td><span style="font-size:0.75rem;" title="${s.tempatLI}">${s.tempatLI || 'Belum Diagihkan'}</span></td>
                    <td>
                        <div class="table-progress-mini">
                            <div class="progress-track-mini">
                                <div class="progress-fill-mini" style="width: ${pct}%"></div>
                            </div>
                            <span>${approvedCount}/${requiredDocs.length}</span>
                        </div>
                    </td>
                    <td>
                        <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.regNo}')">
                            <i class="fa-solid fa-trash-can"></i> Padam
                        </button>
                    </td>
                </tr>
            `;
        });
    }
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

                const studentObj = {
                    name: s.name,
                    regNo: s.regNo,
                    email: s.email || `${s.regNo.toLowerCase()}@student.com`,
                    class: s.class || "",
                    jabatan: s.jabatan || activeAdminStudentDept,
                    tempatLI: s.tempatLI || "Belum Ditentukan",
                    pensyarahPemantau: s.pensyarahPemantau || "",
                    pensyarahPemantauName: resolvedPemantauName,
                    pensyarahPenilai: s.pensyarahPenilai || "",
                    pensyarahPenilaiName: resolvedPenilaiName,
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
                    countImported++;
                } else {
                    students[dupIdx].name = s.name;
                    students[dupIdx].tempatLI = s.tempatLI || students[dupIdx].tempatLI;
                    students[dupIdx].pensyarahPemantau = s.pensyarahPemantau || students[dupIdx].pensyarahPemantau;
                    students[dupIdx].pensyarahPemantauName = resolvedPemantauName || students[dupIdx].pensyarahPemantauName;
                    students[dupIdx].pensyarahPenilai = s.pensyarahPenilai || students[dupIdx].pensyarahPenilai;
                    students[dupIdx].pensyarahPenilaiName = resolvedPenilaiName || students[dupIdx].pensyarahPenilaiName;
                    students[dupIdx].jabatan = s.jabatan || activeAdminStudentDept;
                    students[dupIdx].email = s.email || students[dupIdx].email;
                    students[dupIdx].sesi = sessionValue; // update session too
                    countDuplicates++;
                }
            });

            saveStudents(students);
            addLog("success", `Admin memuat naik fail Excel/CSV: ${countImported} pelajar baharu didaftarkan, ${countDuplicates} rekod dikemaskini.`);
            showToast(`Fail berjaya diproses! ${countImported} Pelajar Didaftarkan, ${countDuplicates} Dikemas Kini.`, "success");

            // Auto-switch to the active dept tab to show newly imported students
            if (countImported > 0) {
                const importedDept = results[0].jabatan || activeAdminStudentDept;
                activeAdminStudentDept = importedDept;
                document.querySelectorAll("#admin-students-dept-tabs .dept-tab-btn").forEach(b => {
                    b.classList.toggle("active", b.dataset.dept === importedDept);
                });
                const importLabel = document.getElementById("import-target-dept-label");
                if (importLabel) importLabel.textContent = activeAdminStudentDept;
            }

            renderAdminDashboard();
            renderAdminStudentsTable();
            renderAdminLecturerAssignTable();
        } catch (err) {
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
    const nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('name') || h.includes('pelajar') || h.includes('student') || h.includes('full'));
    const regIdx = headers.findIndex(h => h.includes('pendaftaran') || h.includes('reg') || h.includes('id') || h.includes('matrik') || h.includes('no'));
    const tempatIdx = headers.findIndex(h => h.includes('tempat') || h.includes('li') || h.includes('company') || h.includes('syarikat') || h.includes('organisasi'));

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

    const results = [];
    for (let i = startIndex; i < lines.length; i++) {
        const cols = lines[i].split(delimiter).map(c => cleanVal(c));
        if (cols.length === 0 || cols.every(c => c === "")) continue;

        let name = "";
        let regNo = "";
        let tempatLI = "";
        let pensyarahPemantau = "";
        let pensyarahPemantauName = "";
        let pensyarahPenilai = "";
        let pensyarahPenilaiName = "";
        let jabatan = "";
        let email = "";
        let classVal = "";
        let sesi = "";

        if (isHeader) {
            name = (nameIdx !== -1 && cols[nameIdx]) ? cleanStudentName(cols[nameIdx]) : "";
            regNo = (regIdx !== -1 && cols[regIdx]) ? cleanVal(cols[regIdx]).toUpperCase() : "";
            tempatLI = (tempatIdx !== -1 && cols[tempatIdx]) ? cleanVal(cols[tempatIdx]) : "";
            pensyarahPemantau = (emailPemantauIdx !== -1 && cols[emailPemantauIdx]) ? cleanVal(cols[emailPemantauIdx]).toLowerCase() : "";
            pensyarahPemantauName = (namePemantauIdx !== -1 && cols[namePemantauIdx]) ? cleanVal(cols[namePemantauIdx]) : "";
            pensyarahPenilai = (emailPenilaiIdx !== -1 && cols[emailPenilaiIdx]) ? cleanVal(cols[emailPenilaiIdx]).toLowerCase() : "";
            pensyarahPenilaiName = (namePenilaiIdx !== -1 && cols[namePenilaiIdx]) ? cleanVal(cols[namePenilaiIdx]) : "";
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

        results.push({ name, regNo, tempatLI, pensyarahPemantau, pensyarahPemantauName, pensyarahPenilai, pensyarahPenilaiName, jabatan, email, class: classVal, sesi });
    }
    return results;
}

// Excel row parser helper (using SheetJS 2D array)
function parseExcelRows(rows) {
    if (rows.length === 0) return [];

    // Clean rows of completely blank rows (all cells are empty/null)
    const cleanedRows = rows.filter(r => r && r.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ""));
    if (cleanedRows.length === 0) return [];

    const firstRow = cleanedRows[0].map(c => cleanVal(c));

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
    const nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('name') || h.includes('pelajar') || h.includes('student') || h.includes('full'));
    const regIdx = headers.findIndex(h => h.includes('pendaftaran') || h.includes('reg') || h.includes('id') || h.includes('matrik') || h.includes('no'));
    const tempatIdx = headers.findIndex(h => h.includes('tempat') || h.includes('li') || h.includes('company') || h.includes('syarikat') || h.includes('organisasi'));

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

    const results = [];
    for (let i = startIndex; i < cleanedRows.length; i++) {
        const cols = cleanedRows[i].map(c => cleanVal(c));
        if (cols.length === 0 || cols.every(c => c === "")) continue;

        let name = "";
        let regNo = "";
        let tempatLI = "";
        let pensyarahPemantau = "";
        let pensyarahPemantauName = "";
        let pensyarahPenilai = "";
        let pensyarahPenilaiName = "";
        let jabatan = "";
        let email = "";
        let classVal = "";
        let sesi = "";

        if (isHeader) {
            name = (nameIdx !== -1 && cols[nameIdx]) ? cleanStudentName(cols[nameIdx]) : "";
            regNo = (regIdx !== -1 && cols[regIdx]) ? cleanVal(cols[regIdx]).toUpperCase() : "";
            tempatLI = (tempatIdx !== -1 && cols[tempatIdx]) ? cleanVal(cols[tempatIdx]) : "";
            pensyarahPemantau = (emailPemantauIdx !== -1 && cols[emailPemantauIdx]) ? cleanVal(cols[emailPemantauIdx]).toLowerCase() : "";
            pensyarahPemantauName = (namePemantauIdx !== -1 && cols[namePemantauIdx]) ? cleanVal(cols[namePemantauIdx]) : "";
            pensyarahPenilai = (emailPenilaiIdx !== -1 && cols[emailPenilaiIdx]) ? cleanVal(cols[emailPenilaiIdx]).toLowerCase() : "";
            pensyarahPenilaiName = (namePenilaiIdx !== -1 && cols[namePenilaiIdx]) ? cleanVal(cols[namePenilaiIdx]) : "";
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

        results.push({ name, regNo, tempatLI, pensyarahPemantau, pensyarahPemantauName, pensyarahPenilai, pensyarahPenilaiName, jabatan, email, class: classVal, sesi });
    }
    return results;
}

// Add New Session Form Submit
const addSessionForm = document.getElementById("admin-add-session-form");
addSessionForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const newSessionName = document.getElementById("admin-new-session-name").value.trim();

    // Regular expression validation e.g. "Sesi 1:2026/2027" or "Sesi 2:2026/2027"
    const sessionRegex = /^Sesi \d:20\d{2}\/20\d{2}$/;
    if (!sessionRegex.test(newSessionName)) {
        showToast("Format nama Sesi salah! Sila gunakan format: Sesi [1/2]:[Tahun/Tahun] (Contoh: Sesi 2:2026/2027)", "error");
        return;
    }

    const sessions = getSessions();
    if (sessions.includes(newSessionName)) {
        showToast("Sesi Akademik ini sudah berdaftar di dalam sistem!", "error");
        return;
    }

    sessions.push(newSessionName);
    saveSessions(sessions);
    saveActiveSession(newSessionName); // auto-set to newly registered session
    addLog("success", `Admin mendaftarkan sesi akademik baharu: ${newSessionName}`);

    showToast(`Sesi "${newSessionName}" berjaya didaftarkan dan diaktifkan.`, "success");
    addSessionForm.reset();

    // Refresh selects
    populateGlobalSessionSelect();

    // Refresh View
    renderAdminDashboard();
    renderAdminStudentsTable();
    renderAdminLecturerAssignTable();
});

// Render Admin Students Tab Table (with Department & Session Filtering & Checkbox Selections)
function renderAdminStudentsTable() {
    if (currentRole !== "admin") return;

    applyDeptTheme(activeAdminStudentDept);

    const activeSesi = getActiveSession();
    document.getElementById("admin-students-table-title").textContent = `Pelajar Berdaftar: ${activeAdminStudentDept} (${activeSesi})`;

    const students = getStudents();
    const searchVal = document.getElementById("admin-student-search-input").value.trim().toLowerCase();

    const tbody = document.getElementById("admin-students-table-body");
    tbody.innerHTML = "";

    // FILTER: Filter students by department AND active session AND search query
    const filteredStudents = students.filter(s =>
        s.jabatan === activeAdminStudentDept &&
        (s.sesi || "").trim() === (activeSesi || "").trim() &&
        (
            (s.name || "").toLowerCase().includes(searchVal) ||
            (s.regNo || "").toLowerCase().includes(searchVal) ||
            (s.class || "").toLowerCase().includes(searchVal)
        )
    );

    if (filteredStudents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;" class="text-muted">Tiada rekod pelajar berdaftar ditemui bagi jabatan ${activeAdminStudentDept} untuk sesi ${activeSesi}.</td></tr>`;
        const selectAllCheck = document.getElementById("admin-student-select-all");
        if (selectAllCheck) selectAllCheck.checked = false;
        if (window.updateBulkCount) window.updateBulkCount();
        return;
    }

    filteredStudents.forEach(s => {
        const requiredDocs = getStudentDocsList(s);
        let approvedCount = 0;
        requiredDocs.forEach(d => {
            const status = s.documents[d.id] ? s.documents[d.id].status : "Belum Dihantar";
            if (status === "Diterima") approvedCount++;
        });
        const pct = Math.round((approvedCount / requiredDocs.length) * 100);

        // Check if ALL required documents are fully approved ("Diterima")
        const allComplete = approvedCount === requiredDocs.length && requiredDocs.every(d => {
            const doc = s.documents[d.id];
            return doc && doc.status === "Diterima";
        });

        let docsVisual = "";
        requiredDocs.forEach(d => {
            const key = d.id;
            const status = s.documents[key] ? s.documents[key].status : "Belum Dihantar";
            let c = "gray";
            if (status === "Dalam Semakan") c = "yellow";
            if (status === "Diterima") c = "green";
            if (status === "Ditolak") c = "red";

            docsVisual += `<span class="status-indicator-dot ${c}" title="${d.title}: ${status}" onclick="openDocumentReviewModal('${s.regNo}', '${key}')">${d.title.split(" ").map(w => w[0]).join("").substring(0, 2)}</span>`;
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

        tbody.innerHTML += `
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
                <td><span style="font-size:0.85rem;" title="${s.tempatLI}">${s.tempatLI || 'Belum Diagihkan'}</span></td>
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
    tbody.innerHTML = "";

    // JKA, JKE, JKM have 8 columns (Nama Pemantau, Email Pemantau, Nama Penilai, Email Penilai)
    // JP, JPH have 6 columns (Nama Pemantau, Email Pemantau, no Penilai)
    const isKejuruteraanTab = ["JKA", "JKE", "JKM"].includes(activeAdminAssignDept);

    if (isKejuruteraanTab) {
        thead.innerHTML = `
            <tr>
                <th>Pelajar &amp; No. Pendaftaran</th>
                <th>Tempat Latihan Industri</th>
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
                <th>Nama Pensyarah Pemantau</th>
                <th>Email Pensyarah Pemantau</th>
                <th>Tindakan</th>
            </tr>
        `;
    }

    // FILTER: Filter assignment list by active academic session AND selected department tab!
    const filteredStudents = students.filter(s =>
        s.sesi === activeSesi &&
        s.jabatan === activeAdminAssignDept &&
        (s.name.toLowerCase().includes(searchVal) || s.regNo.toLowerCase().includes(searchVal))
    );

    if (filteredStudents.length === 0) {
        const colSpan = isKejuruteraanTab ? 7 : 5;
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;" class="text-muted">Tiada rekod pelajar ditemui bagi jabatan ${activeAdminAssignDept} untuk sesi ${activeSesi}.</td></tr>`;
        return;
    }

    filteredStudents.forEach(s => {
        const hasPenilai = studentHasPenilai(s) && isKejuruteraanTab;

        if (isKejuruteraanTab) {
            tbody.innerHTML += `
                <tr class="student-table-row" data-dept="${s.jabatan}">
                    <td>
                        <strong>${s.name}</strong><br>
                        <code style="font-size:0.75rem;">${s.regNo}</code>
                    </td>
                    <td><span style="font-size:0.8rem;">${s.tempatLI || 'Belum Diagihkan'}</span></td>
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
            tbody.innerHTML += `
                <tr>
                    <td>
                        <strong>${s.name}</strong><br>
                        <code style="font-size:0.75rem;">${s.regNo}</code>
                    </td>
                    <td><span style="font-size:0.8rem;">${s.tempatLI || 'Belum Diagihkan'}</span></td>
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
}

document.getElementById("admin-assign-search-input").addEventListener("input", renderAdminLecturerAssignTable);

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
    tbody.innerHTML = "";

    admins.forEach(a => {
        const isCurrent = a.email === currentUser.email;
        tbody.innerHTML += `
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

    sorted.forEach(a => {
        let badgeClass = "badge-muted";
        if (a.category === "Penting") badgeClass = "badge-danger";
        else if (a.category === "Pendaftaran") badgeClass = "badge-success";
        else if (a.category === "Akademik") badgeClass = "badge-warning";

        tbody.innerHTML += `
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
async function uploadFileWithFallback(file, storagePath, onProgress) {
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
                    resolve({ useBase64: true });
                },
                async () => {
                    try {
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                        resolve({ useBase64: false, downloadURL });
                    } catch (urlErr) {
                        console.warn("Failed to get download URL, using base64 fallback:", urlErr);
                        resolve({ useBase64: true });
                    }
                }
            );
        });
    } catch (err) {
        console.warn("Storage error, fallback:", err);
        return { useBase64: true };
    }
}

window.handleFileSelected = async function (event, docId) {
    const file = event.target.files[0];
    if (!file) return;

    // Size validation (Max 10MB)
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
        let base64Data;
        let finalFileName = file.name;

        if (isImage) {
            window.uploadProgress[docId] = "Mengompresi Gambar...";
            updateUploadProgressDOM(docId, "Mengompresi Gambar...");
            base64Data = await compressImage(file, 1000, 1000, 0.6);
            if (!finalFileName.toLowerCase().endsWith(".jpg") && !finalFileName.toLowerCase().endsWith(".jpeg")) {
                finalFileName = finalFileName.substring(0, finalFileName.lastIndexOf('.')) + ".jpg";
            }
        } else {
            window.uploadProgress[docId] = "Membaca Fail...";
            updateUploadProgressDOM(docId, "Membaca Fail...");
            base64Data = await readFileAsBase64(file);
        }

        const rawSizeKB = (base64Data.length * 3 / 4) / 1024;
        const sizeStr = rawSizeKB > 1000 ? (rawSizeKB / 1024).toFixed(1) + " MB" : Math.round(rawSizeKB) + " KB";

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
        let base64Data;
        let finalFileName = file.name;

        if (isImage) {
            base64Data = await compressImage(file, 1000, 1000, 0.6);
            if (!finalFileName.toLowerCase().endsWith(".jpg") && !finalFileName.toLowerCase().endsWith(".jpeg")) {
                finalFileName = finalFileName.substring(0, finalFileName.lastIndexOf('.')) + ".jpg";
            }
        } else {
            base64Data = await readFileAsBase64(file);
        }

        const rawSizeKB = (base64Data.length * 3 / 4) / 1024;
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
    const bulkDeleteBtn = document.getElementById("btn-bulk-delete");
    const countDisplay = document.getElementById("bulk-select-count");

    if (!selectAllCheck) return; // safeguard if elements are not in DOM

    // Select All checkbox change
    selectAllCheck.addEventListener("change", function () {
        const checkboxes = document.querySelectorAll(".student-select-checkbox");
        checkboxes.forEach(cb => cb.checked = this.checked);
        updateBulkCount();
    });

    // Update bulk action bar states
    window.updateBulkCount = function () {
        const checkboxes = document.querySelectorAll(".student-select-checkbox");
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;

        countDisplay.textContent = `${checkedCount} pelajar dipilih`;
        if (checkedCount > 0) {
            bulkDeleteBtn.disabled = false;
            bulkDeleteBtn.style.background = "var(--color-danger)";
            bulkDeleteBtn.style.color = "white";
            bulkDeleteBtn.style.borderColor = "var(--color-danger)";
        } else {
            bulkDeleteBtn.disabled = true;
            bulkDeleteBtn.style.background = "rgba(244,63,94,0.08)";
            bulkDeleteBtn.style.color = "var(--color-danger)";
            bulkDeleteBtn.style.borderColor = "rgba(244,63,94,0.15)";
        }

        // Update Select All checkbox state
        if (checkboxes.length > 0 && checkedCount === checkboxes.length) {
            selectAllCheck.checked = true;
            selectAllCheck.indeterminate = false;
        } else if (checkedCount > 0) {
            selectAllCheck.checked = false;
            selectAllCheck.indeterminate = true;
        } else {
            selectAllCheck.checked = false;
            selectAllCheck.indeterminate = false;
        }
    };

    // Bulk Delete selected (checkbox ticked)
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

                selectAllCheck.checked = false;
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
}

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

// Bind Padam Semua Pelajar button in Pengurusan Pensyarah tab
document.addEventListener("DOMContentLoaded", () => {
    const btnDeleteAllFromLecturers = document.getElementById("btn-delete-all-from-lecturers");
    if (btnDeleteAllFromLecturers) {
        btnDeleteAllFromLecturers.addEventListener("click", deleteAllStudentsGlobal);
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
document.addEventListener("DOMContentLoaded", async () => {
    await initDatabase();
    startClock();
    setupBulkActionListeners();
    initTheme();

    // Restore session from localStorage if exists
    const savedUser = localStorage.getItem("upli_user");
    const savedRole = localStorage.getItem("upli_role");
    if (savedUser && savedRole) {
        try {
            const userObj = JSON.parse(savedUser);
            // Refresh from current Firestore copy to prevent stale session data
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
        switchPortalTab('dashboard');
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
            const jabatan = document.getElementById("edit-student-jabatan").value;
            const sesi = document.getElementById("edit-student-sesi").value;

            const students = getStudents();
            const idx = students.findIndex(s => s.regNo === regNo);
            if (idx !== -1) {
                students[idx].name = name;
                students[idx].email = email;
                students[idx].phone = phone;
                students[idx].tempatLI = tempat;
                students[idx].jabatan = jabatan;
                students[idx].sesi = sesi;
                students[idx].profilePic = adminTempProfilePic;

                saveStudents(students, regNo);
                addLog("info", `Admin mengemaskini profil pelajar ${name} (${regNo})`);
                showToast(`Profil pelajar ${name} berjaya dikemas kini.`, "success");

                closeEditStudentModal();

                // Refresh views
                renderAdminStudentsTable();
                renderAdminDashboard();
                renderAdminLecturerAssignTable();
            }
        });
    }
});

// ==========================================================================
// RUBRIK PEMARKAHAN MODULE
// ==========================================================================

// Note: getRubriks() and saveRubriks() are defined in the Firestore data layer (line ~444)
// and use dbCache for cloud sync. Do NOT redefine them here.

// --- File input: show selected filename on zone label ---
document.getElementById("rubrik-file-input").addEventListener("change", function () {
    const zone = document.getElementById("rubrik-upload-zone");
    if (this.files && this.files[0]) {
        zone.innerHTML = `
            <i class="fa-solid fa-file-pdf" style="font-size: 2rem; color: #ef4444;"></i>
            <span style="color: var(--color-success); font-weight: 600;">${this.files[0].name}</span>
            <span class="file-constraint">${(this.files[0].size / 1024 / 1024).toFixed(2)} MB — Sedia untuk dimuat naik</span>
        `;
    }
});

// --- Handle Rubrik Upload (Admin only) ---
window.handleRubrikUpload = function () {
    if (currentRole !== "admin") {
        showToast("Hanya Admin yang boleh memuat naik rubrik!", "error");
        return;
    }

    const titleInput = document.getElementById("rubrik-title-input");
    const categorySelect = document.getElementById("rubrik-category-select");
    const fileInput = document.getElementById("rubrik-file-input");
    const btn = document.getElementById("btn-upload-rubrik");

    const title = titleInput.value.trim();
    const category = categorySelect.value;
    const file = fileInput.files[0];

    if (!title) {
        showToast("Sila masukkan tajuk rubrik terlebih dahulu!", "error");
        titleInput.focus();
        return;
    }
    if (!file) {
        showToast("Sila pilih fail PDF rubrik terlebih dahulu!", "error");
        return;
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
        showToast("Hanya fail PDF dibenarkan!", "error");
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        showToast("Fail melebihi had 10MB!", "error");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sedang memuat naik...`;

    const reader = new FileReader();
    reader.onload = function (e) {
        const now = new Date();
        const formattedTime = now.getFullYear() + "-" +
            String(now.getMonth() + 1).padStart(2, "0") + "-" +
            String(now.getDate()).padStart(2, "0") + " " +
            String(now.getHours()).padStart(2, "0") + ":" +
            String(now.getMinutes()).padStart(2, "0");

        const sizeKB = file.size / 1024;
        const sizeStr = sizeKB > 1000 ? (sizeKB / 1024).toFixed(1) + " MB" : Math.round(sizeKB) + " KB";

        const rubrik = {
            id: "rubrik_" + Date.now(),
            title,
            category,
            fileName: file.name,
            fileSize: sizeStr,
            uploadDate: formattedTime,
            uploadedBy: currentUser.name,
            fileData: e.target.result
        };

        const rubriks = getRubriks();
        rubriks.unshift(rubrik);
        saveRubriks(rubriks);

        addLog("success", `Admin memuat naik Rubrik Pemarkahan: "${title}" (${category}) — ${file.name}`);
        showToast(`Rubrik "${title}" berjaya dimuat naik!`, "success");

        // Reset form
        titleInput.value = "";
        fileInput.value = "";
        document.getElementById("rubrik-upload-zone").innerHTML = `
            <i class="fa-solid fa-file-pdf" style="font-size: 2rem; color: #ef4444;"></i>
            <span>Klik untuk pilih fail PDF Rubrik</span>
            <span class="file-constraint">Format: PDF sahaja (Maks: 10MB)</span>
        `;

        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Simpan & Muat Naik Rubrik`;

        renderAdminRubrik();
        renderAdminDashboard();
    };
    reader.onerror = function () {
        showToast("Ralat membaca fail. Sila cuba semula.", "error");
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Simpan & Muat Naik Rubrik`;
    };
    reader.readAsDataURL(file);
};

// --- Admin: Render Rubrik Management List ---
function renderAdminRubrik() {
    if (currentRole !== "admin") return;

    const rubriks = getRubriks();
    const listEl = document.getElementById("admin-rubrik-list");
    const countBadge = document.getElementById("rubrik-count-badge");

    if (countBadge) countBadge.textContent = `${rubriks.length} Rubrik`;

    if (!listEl) return;
    listEl.innerHTML = "";

    if (rubriks.length === 0) {
        listEl.innerHTML = `
            <div style="text-align:center; padding: 32px 20px; color: var(--text-muted);">
                <i class="fa-solid fa-book-open" style="font-size: 2.5rem; margin-bottom: 10px; opacity: 0.4;"></i>
                <p style="font-size: 0.88rem;">Tiada rubrik dimuat naik lagi. Muat naik rubrik pertama anda di atas.</p>
            </div>`;
        return;
    }

    // Category badge colors
    const catColors = {
        "Kejuruteraan": { bg: "rgba(99,102,241,0.12)", color: "#818cf8", label: "Kejuruteraan (DKA / JKE / JKM)" },
        "Bukan Kejuruteraan": { bg: "rgba(245,158,11,0.12)", color: "#fbbf24", label: "Bukan Kejuruteraan (DBK / DUB / JP / JPH)" },
        "Umum": { bg: "rgba(16,185,129,0.12)", color: "#34d399", label: "Umum (Semua Pelajar)" }
    };

    rubriks.forEach(r => {
        const cat = catColors[r.category] || catColors["Umum"];
        const row = document.createElement("div");
        row.style.cssText = "display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 16px; background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; flex-wrap:wrap; transition: border-color 0.2s;";
        row.onmouseenter = () => row.style.borderColor = "var(--color-primary)";
        row.onmouseleave = () => row.style.borderColor = "var(--border-color)";
        row.innerHTML = `
            <div style="display:flex; align-items:center; gap:14px; flex:1; min-width:0;">
                <div style="width:44px; height:44px; border-radius:10px; background:rgba(239,68,68,0.12); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <i class="fa-solid fa-file-pdf" style="font-size:1.4rem; color:#ef4444;"></i>
                </div>
                <div style="min-width:0;">
                    <div style="font-weight:700; font-size:0.92rem; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${r.title}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                        ${r.fileName} &bull; ${r.fileSize} &bull; ${r.uploadDate}
                    </div>
                    <div style="margin-top:4px;">
                        <span style="font-size:0.68rem; font-weight:700; padding:2px 8px; border-radius:20px; background:${cat.bg}; color:${cat.color};">${cat.label}</span>
                        <span style="font-size:0.68rem; color:var(--text-muted); margin-left:6px;">Dimuat naik oleh: ${r.uploadedBy || 'Admin'}</span>
                    </div>
                </div>
            </div>
            <div style="display:flex; gap:8px; flex-shrink:0;">
                <a href="${r.fileData}" download="${r.fileName}" class="btn btn-sm" style="background:linear-gradient(135deg,#059669,#047857); color:#fff; border:none; border-radius:6px; padding:7px 14px; font-size:0.78rem; display:flex; align-items:center; gap:6px; text-decoration:none; white-space:nowrap;">
                    <i class="fa-solid fa-download"></i> Muat Turun
                </a>
                <button class="btn btn-danger btn-sm" onclick="deleteRubrik('${r.id}')" style="padding:7px 12px; font-size:0.78rem; display:flex; align-items:center; gap:6px; white-space:nowrap;">
                    <i class="fa-solid fa-trash"></i> Padam
                </button>
            </div>
        `;
        listEl.appendChild(row);
    });
}

// --- Admin: Delete a rubrik ---
window.deleteRubrik = function (rubrikId) {
    showConfirm(
        "Adakah anda pasti mahu memadam rubrik ini? Tindakan ini tidak boleh diundurkan.",
        function () {
            const rubriks = getRubriks().filter(r => r.id !== rubrikId);
            saveRubriks(rubriks);
            addLog("danger", `Admin memadam rubrik pemarkahan (ID: ${rubrikId})`);
            showToast("Rubrik berjaya dipadamkan.", "info");
            renderAdminRubrik();
            renderAdminDashboard();
        },
        "Padam Rubrik",
        "Ya, Padam"
    );
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
                <p style="font-size: 0.9rem; font-weight: 600;">Tiada Rubrik Tersedia</p>
                <p style="font-size: 0.8rem; margin-top: 4px;">Admin UPLI belum memuat naik sebarang rubrik pemarkahan. Sila hubungi Admin untuk maklumat lanjut.</p>
            </div>`;
        return;
    }

    const catColors = {
        "Kejuruteraan": { bg: "rgba(99,102,241,0.12)", color: "#818cf8" },
        "Bukan Kejuruteraan": { bg: "rgba(245,158,11,0.12)", color: "#fbbf24" },
        "Umum": { bg: "rgba(16,185,129,0.12)", color: "#34d399" }
    };
    const catLabels = {
        "Kejuruteraan": "Kejuruteraan (DKA / JKE / JKM)",
        "Bukan Kejuruteraan": "Bukan Kejuruteraan (DBK / DUB / JP / JPH)",
        "Umum": "Umum (Semua Pelajar)"
    };

    rubriks.forEach(r => {
        const cat = catColors[r.category] || catColors["Umum"];
        const card = document.createElement("div");
        card.className = "card";
        card.style.cssText = "padding: 0; overflow:hidden; transition: border-color 0.2s, box-shadow 0.2s;";
        card.onmouseenter = () => { card.style.borderColor = "var(--color-primary)"; card.style.boxShadow = "0 4px 20px rgba(99,102,241,0.12)"; };
        card.onmouseleave = () => { card.style.borderColor = "var(--border-color)"; card.style.boxShadow = ""; };
        card.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:16px; padding:18px 20px; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:16px; flex:1; min-width:0;">
                    <div style="width:52px; height:52px; border-radius:12px; background:rgba(239,68,68,0.1); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <i class="fa-solid fa-file-pdf" style="font-size:1.6rem; color:#ef4444;"></i>
                    </div>
                    <div style="min-width:0;">
                        <div style="font-weight:700; font-size:1rem; color:var(--text-primary);">${r.title}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:3px;">
                            <i class="fa-solid fa-file" style="margin-right:4px;"></i>${r.fileName}
                            &nbsp;&bull;&nbsp;
                            <i class="fa-solid fa-weight-hanging" style="margin-right:4px;"></i>${r.fileSize}
                            &nbsp;&bull;&nbsp;
                            <i class="fa-regular fa-calendar" style="margin-right:4px;"></i>${r.uploadDate}
                        </div>
                        <div style="margin-top:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <span style="font-size:0.68rem; font-weight:700; padding:3px 10px; border-radius:20px; background:${cat.bg}; color:${cat.color};">${catLabels[r.category] || r.category}</span>
                            <span style="font-size:0.7rem; color:var(--text-muted);">Dimuat naik oleh Admin UPLI</span>
                        </div>
                    </div>
                </div>
                <a href="${r.fileData}" download="${r.fileName}" class="btn btn-primary" style="gap:8px; padding:10px 20px; font-size:0.85rem; display:flex; align-items:center; white-space:nowrap; flex-shrink:0; text-decoration:none;">
                    <i class="fa-solid fa-download"></i> Muat Turun PDF
                </a>
            </div>
        `;
        listEl.appendChild(card);
    });
}

// --------------------------------==========================================
// N. PUBLIC PORTAL MODULE (DASHBOARD & STATS)
// --------------------------------==========================================
let calendarCurrentMonth = new Date().getMonth(); // 0-11
let calendarCurrentYear = new Date().getFullYear();
let calendarSelectedDateStr = null; // YYYY-MM-DD

window.switchPortalTab = function (tabName) {
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
        renderPortalDashboard();
    } else if (tabName === 'announcements') {
        const btn = document.getElementById("btn-portal-announcements");
        if (btn) btn.classList.add("active");
        document.getElementById("portal-tab-announcements").style.display = "block";
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
                if (a.category === "Penting") catClass = "dot-penting";
                else if (a.category === "Pendaftaran") catClass = "dot-pendaftaran";
                else if (a.category === "Akademik") catClass = "dot-akademik";
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
        if (a.category === "Penting") { badgeClass = "badge-danger"; icon = "fa-solid fa-triangle-exclamation"; }
        else if (a.category === "Pendaftaran") { badgeClass = "badge-success"; icon = "fa-solid fa-user-plus"; }
        else if (a.category === "Akademik") { badgeClass = "badge-warning"; icon = "fa-solid fa-graduation-cap"; }

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
    const students = getStudents();
    const activeSesi = getActiveSession();

    // Auto-populate the portal session dropdown if it is empty or changed
    const portalSessionSelect = document.getElementById("portal-session-select");
    if (portalSessionSelect) {
        const sessions = getSessions();
        const currentVal = portalSessionSelect.value;
        
        if (portalSessionSelect.options.length !== sessions.length) {
            portalSessionSelect.innerHTML = "";
            sessions.forEach(s => {
                const option = document.createElement("option");
                option.value = s;
                option.textContent = s;
                option.style.setProperty('color', '#000000', 'important');
                option.style.setProperty('background-color', '#ffffff', 'important');
                if (currentVal ? (s === currentVal) : (s === activeSesi)) option.selected = true;
                portalSessionSelect.appendChild(option);
            });

            portalSessionSelect.onchange = function () {
                window.renderPortalDashboard(this.value);
            };
        }
    }

    const sessionToUse = selectedSesi || (portalSessionSelect ? portalSessionSelect.value : activeSesi);

    // Filter students by selected session
    const currentSessionStudents = students.filter(s => s.sesi === sessionToUse);

    // Count complete students
    const completeStudents = currentSessionStudents.filter(s => {
        const requiredDocs = getStudentDocsList(s);
        return requiredDocs.length > 0 && requiredDocs.every(d => {
            const doc = s.documents[d.id];
            return doc && doc.status === "Diterima";
        });
    });

    const totalCount = currentSessionStudents.length;
    const completeCount = completeStudents.length;
    const rate = totalCount > 0 ? Math.round((completeCount / totalCount) * 100) : 0;

    document.getElementById("portal-total-students").textContent = totalCount;
    document.getElementById("portal-total-complete").textContent = completeCount;
    document.getElementById("portal-completion-rate").textContent = rate + "%";

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
            programs: ["DAT", "DLS", "DPR"]
        },
        {
            code: "JPH",
            name: "Jabatan Pelancongan & Hospitaliti",
            icon: "fa-solid fa-utensils",
            color: "#ec4899",
            glow: "rgba(236, 72, 153, 0.1)",
            programs: ["DHR", "KOK", "DHM"]
        }
    ];

    const grid = document.getElementById("portal-departments-grid");
    if (!grid) return;
    grid.innerHTML = "";

    depts.forEach(d => {
        const deptStudents = currentSessionStudents.filter(s => s.jabatan === d.code);
        const deptComplete = deptStudents.filter(s => {
            const requiredDocs = getStudentDocsList(s);
            return requiredDocs.length > 0 && requiredDocs.every(doc => {
                const studentDoc = s.documents[doc.id];
                return studentDoc && studentDoc.status === "Diterima";
            });
        });

        const deptRate = deptStudents.length > 0 ? Math.round((deptComplete.length / deptStudents.length) * 100) : 0;

        let programsHTML = "";
        d.programs.forEach(prog => {
            const progStudents = deptStudents.filter(s => getStudentProgram(s) === prog);
            const progComplete = progStudents.filter(s => {
                const requiredDocs = getStudentDocsList(s);
                return requiredDocs.length > 0 && requiredDocs.every(doc => {
                    const studentDoc = s.documents[doc.id];
                    return studentDoc && studentDoc.status === "Diterima";
                });
            });
            programsHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; padding:8px 0; border-bottom:1px dashed var(--border-color);">
                    <span style="font-weight:700; color:var(--text-primary);">${prog}</span>
                    <span style="color:var(--text-secondary); font-size:0.8rem;">
                        <strong>${progStudents.length}</strong> Pelajar 
                        <span style="color:var(--color-success); font-weight:600; margin-left:4px;">(${progComplete.length} Lengkap)</span>
                    </span>
                </div>
            `;
        });

        const card = document.createElement("div");
        card.className = `card dept-card-animated dept-card-${d.code}`;
        card.style.cssText = "padding:20px; transition:all 0.2s; border-radius:12px; display:flex; flex-direction:column; justify-content:space-between; min-height: 290px; border:none;";
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
                
                <!-- Programs list -->
                <div style="display:flex; flex-direction:column; gap:4px; margin-bottom:20px;">
                    ${programsHTML}
                </div>
            </div>
            
            <!-- Progress section -->
            <div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; margin-bottom:6px;">
                    <span style="color:var(--text-muted);">Status Penghantaran</span>
                    <span style="font-weight:700; color:${d.color};">${deptComplete.length} / ${deptStudents.length} Lengkap (${deptRate}%)</span>
                </div>
                <div class="progress-track-mini" style="height:6px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
                    <div class="progress-fill-mini" style="width:${deptRate}%; height:100%; background:${d.color}; border-radius:4px;"></div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
};

function getStudentProgram(student) {
    if (!student) return "Lain-lain";
    const regNo = (student.regNo || "").toUpperCase();
    const classVal = (student.class || "").toUpperCase();

    const programs = [
        "DKA", "DUB", "DBK",
        "DEE", "DEP", "DTK",
        "DKM", "DTP", "DEM",
        "DAT", "DLS", "DPR",
        "DHR", "KOK", "DHM"
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
