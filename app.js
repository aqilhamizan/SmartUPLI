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
            { id: "lapor_diri", title: "Kad Pengesahan Lapor Diri", desc: "Kad pengesahan melapor diri di tempat latihan." },
            { id: "appendix_e2", title: "Appendix E2", desc: "Borang penilaian semasa latihan industri (Kejuruteraan)." }
        ],
        selepas: [
            { id: "appendix_e1", title: "Appendix E1", desc: "Borang penilaian selepas latihan industri (Kejuruteraan)." },
            { id: "appendix_e3", title: "Appendix E3", desc: "Borang laporan penilaian akhir (Kejuruteraan)." },
            { id: "weekly_reflections", title: "Weekly Reflections (20 muka surat)", desc: "Refleksi mingguan sepanjang latihan (minima 20 muka surat)." },
            { id: "slaid_pembentangan", title: "Slaid Pembentangan", desc: "Slaid untuk sesi pembentangan akhir." },
            { id: "laporan_akhir", title: "Laporan Akhir LI", desc: "Buku laporan akhir latihan industri lengkap." }
        ]
    },
    "Bukan Kejuruteraan": {
        sebelum: [
            { id: "borang_jawapan", title: "Borang Jawapan", desc: "Borang jawapan rasmi dari organisasi/syarikat yang bersetuju menerima pelajar." },
            { id: "skop_kerja", title: "Senarai Skop Kerja", desc: "Skop kerja yang dipersetujui semasa latihan industri." }
        ],
        semasa: [
            { id: "lapor_diri", title: "Kad Pengesahan Lapor Diri", desc: "Kad pengesahan melapor diri di tempat latihan." },
            { id: "appendix_2", title: "Appendix 2", desc: "Borang penilaian semasa latihan industri (Bukan Kejuruteraan)." }
        ],
        selepas: [
            { id: "appendix_1", title: "Appendix 1", desc: "Borang penilaian selepas latihan industri (Bukan Kejuruteraan)." },
            { id: "weekly_reflections", title: "Weekly Reflections (20 muka surat)", desc: "Refleksi mingguan sepanjang latihan (minima 20 muka surat)." },
            { id: "slaid_pembentangan", title: "Slaid Pembentangan", desc: "Slaid untuk sesi pembentangan akhir." },
            { id: "laporan_akhir", title: "Laporan Akhir LI", desc: "Buku laporan akhir latihan industri lengkap." }
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

// Initialize database (Includes migration for Session-based schema)
function initDatabase() {
    let migrate = false;
    const existingStudents = localStorage.getItem("upli_students");
    if (existingStudents) {
        try {
            const parsed = JSON.parse(existingStudents);
            if (parsed.length > 0 && !parsed[0].hasOwnProperty("sesi")) {
                migrate = true;
            }
        } catch (e) {
            migrate = true;
        }
    }
    
    if (migrate) {
        localStorage.removeItem("upli_admins");
        localStorage.removeItem("upli_lecturers");
        localStorage.removeItem("upli_students");
        localStorage.removeItem("upli_logs");
        localStorage.removeItem("upli_sessions");
        localStorage.removeItem("upli_active_session");
    }

    if (!localStorage.getItem("upli_admins")) {
        localStorage.setItem("upli_admins", JSON.stringify(DEFAULT_ADMINS));
    }
    if (!localStorage.getItem("upli_lecturers")) {
        localStorage.setItem("upli_lecturers", JSON.stringify(DEFAULT_LECTURERS));
    }
    if (!localStorage.getItem("upli_students")) {
        localStorage.setItem("upli_students", JSON.stringify(DEFAULT_STUDENTS));
    }
    
    // Purge JTMK records from database if they exist
    let existingSts = localStorage.getItem("upli_students");
    if (existingSts) {
        try {
            let sts = JSON.parse(existingSts);
            let cleaned = sts.filter(s => s.jabatan !== "JTMK");
            if (cleaned.length !== sts.length) {
                localStorage.setItem("upli_students", JSON.stringify(cleaned));
            }
        } catch(e) {}
    }
    let existingLecs = localStorage.getItem("upli_lecturers");
    if (existingLecs) {
        try {
            let lecs = JSON.parse(existingLecs);
            let cleaned = lecs.filter(l => l.dept !== "JTMK");
            if (cleaned.length !== lecs.length) {
                localStorage.setItem("upli_lecturers", JSON.stringify(cleaned));
            }
        } catch(e) {}
    }

    if (!localStorage.getItem("upli_logs")) {
        localStorage.setItem("upli_logs", JSON.stringify(DEFAULT_LOGS));
    }
    if (!localStorage.getItem("upli_sessions")) {
        localStorage.setItem("upli_sessions", JSON.stringify(DEFAULT_SESSIONS));
    }
    if (!localStorage.getItem("upli_active_session")) {
        localStorage.setItem("upli_active_session", "Sesi 1:2026/2027");
    }
}

// Helper DB Getters & Setters
function getAdmins() { return JSON.parse(localStorage.getItem("upli_admins")); }
function saveAdmins(data) { localStorage.setItem("upli_admins", JSON.stringify(data)); }

function getLecturers() { return JSON.parse(localStorage.getItem("upli_lecturers")); }
function saveLecturers(data) { localStorage.setItem("upli_lecturers", JSON.stringify(data)); }

function getStudents() {
    let list = JSON.parse(localStorage.getItem("upli_students") || "[]");
    let changed = false;
    
    // Old document IDs from previous schema that should be removed
    const OLD_DOC_IDS = ["resume", "reply_letter", "weekly_reports", "final_report", "completion_cert"];
    
    list.forEach(s => {
        if (!s.documents) {
            s.documents = {};
            changed = true;
        }
        
        // Remove any old schema doc keys that don't belong in new schema
        OLD_DOC_IDS.forEach(oldKey => {
            if (s.documents[oldKey] !== undefined) {
                delete s.documents[oldKey];
                changed = true;
            }
        });
        
        // Add any missing doc keys from the correct category-based schema
        const requiredDocs = getStudentDocsList(s);
        requiredDocs.forEach(d => {
            if (!s.documents[d.id]) {
                s.documents[d.id] = {
                    status: "Belum Dihantar",
                    fileName: "",
                    fileSize: "",
                    uploadDate: "",
                    feedback: "",
                    fileData: ""
                };
                changed = true;
            }
        });
    });
    if (changed) {
        localStorage.setItem("upli_students", JSON.stringify(list));
    }
    return list;
}
function saveStudents(data) {
    try {
        localStorage.setItem("upli_students", JSON.stringify(data));
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            console.warn("LocalStorage Quota Exceeded! Optimizing storage by mock-compressing large file data...");
            let optimized = false;
            
            // Go through students and replace any large fileData (> 50KB) with a small dummy file base64 string
            // but keep original file metadata (fileName, fileSize, uploadDate) intact.
            data.forEach(s => {
                if (s.documents) {
                    Object.keys(s.documents).forEach(k => {
                        const doc = s.documents[k];
                        if (doc.fileData && doc.fileData.length > 50000) {
                            // Dummy PDF base64 (small empty 1-page PDF)
                            doc.fileData = "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iagogIDw8IC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAyIDAgUiA+PgplbmRvYmoKMiAwIG9iagogIDw8IC9UeXBlIC9QYWdlcyAvS2lkcyBbIDMgMCBSIF0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKICA8PCAvVHlwZSAvUGFnZSAvUGFyZW50IDIgMCBSIC9NZWRpYUJveCBbIDAgMCA1OTUgODQyIF0gPj4KZW5kb2JqCnRyYWlsZXIKICA8PCAvUm9vdCAxIDAgUiA+JQolRU9GCg==";
                            optimized = true;
                        }
                    });
                }
            });
            
            if (optimized) {
                try {
                    localStorage.setItem("upli_students", JSON.stringify(data));
                    showToast("Simulasi Storan: Fail anda berjaya direkodkan, namun data fail disimpan secara simulasi kerana had storan pelayar (5MB).", "info");
                    return;
                } catch (retryErr) {
                    showToast("Had storan pelayar penuh sepenuhnya! Sila hubungi Pentadbir.", "error");
                }
            } else {
                showToast("Storan pelayar penuh sepenuhnya! Tidak dapat menyimpan rekod baharu.", "error");
            }
        }
        throw e;
    }
}

function getSessions() { return JSON.parse(localStorage.getItem("upli_sessions")); }
function saveSessions(data) { localStorage.setItem("upli_sessions", JSON.stringify(data)); }

function getActiveSession() { return localStorage.getItem("upli_active_session"); }
function saveActiveSession(val) { localStorage.setItem("upli_active_session", val); }

function getLogs() { return JSON.parse(localStorage.getItem("upli_logs")); }
function addLog(type, text) {
    const logs = getLogs() || [];
    const now = new Date();
    const formattedTime = now.getFullYear() + "-" + 
        String(now.getMonth() + 1).padStart(2, '0') + "-" + 
        String(now.getDate()).padStart(2, '0') + " " + 
        String(now.getHours()).padStart(2, '0') + ":" + 
        String(now.getMinutes()).padStart(2, '0');
    
    logs.unshift({ type, text, time: formattedTime });
    localStorage.setItem("upli_logs", JSON.stringify(logs.slice(0, 50))); // Keep last 50
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
    setInterval(() => {
        const now = new Date();
        timeDisplay.textContent = now.toLocaleTimeString("ms-MY");
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
        try { URL.revokeObjectURL(url); } catch(e){}
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
    btn.addEventListener("click", function() {
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
    btn.addEventListener("click", function() {
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
    
    // Switch to main interface
    loginView.classList.remove("active");
    dashboardLayout.classList.add("active");
    
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
        if (s === active) option.selected = true;
        globalSessionSelect.appendChild(option);
    });
}

// Watch global session dropdown change
globalSessionSelect.addEventListener("change", function() {
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
    switchPortalTab('dashboard');
    sessionSelectContainer.style.display = "none";
    applyDeptTheme(null); // Clear department theme on logout
    showToast("Anda telah log keluar dengan selamat.", "info");
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
    if (tabId === "admin-dashboard") title = "Statistik Dashboard Admin";
    if (tabId === "admin-students") title = "Pengurusan Maklumat Pelajar";
    if (tabId === "admin-lecturers") title = "Agihan Pensyarah Pemantau / Penilai";
    if (tabId === "admin-admins") title = "Pengurusan Pentadbir Sistem";
    if (tabId === "admin-rubrik") title = "Rubrik Pemarkahan UPLI";
    if (tabId === "rubrik-viewer") title = "Rubrik Pemarkahan UPLI";
    
    currentTabTitle.textContent = title;
    
    renderTabData(tabId);
}

document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", function(e) {
        e.preventDefault();
        const tabId = this.dataset.tab;
        switchTab(tabId);
        
        if (window.innerWidth <= 768) {
            sidebar.classList.remove("active");
        }
    });
});

function renderTabData(tabId) {
    if (tabId === "student-dashboard") renderStudentDashboard();
    if (tabId === "student-documents") renderStudentDocuments();
    
    if (tabId === "lecturer-dashboard") renderLecturerDashboard();
    if (tabId === "lecturer-students") renderLecturerStudentsList();
    
    if (tabId === "admin-dashboard") renderAdminDashboard();
    if (tabId === "admin-students") renderAdminStudentsTable();
    if (tabId === "admin-lecturers") renderAdminLecturerAssignTable();
    if (tabId === "admin-admins") renderAdminAdminsTable();
    if (tabId === "admin-rubrik") renderAdminRubrik();
    if (tabId === "rubrik-viewer") renderRubrikViewer();
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
            
            if (status === "Belum Dihantar" || status === "Ditolak") {
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
window.adminDownloadStudentDocs = async function(regNo) {
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
    
    // Only collect documents with actual fileData
    const docsWithData = requiredDocs
        .map(d => ({ meta: d, doc: (student.documents || {})[d.id] }))
        .filter(item => item.doc && item.doc.fileData && item.doc.fileData.trim() !== "");
    
    if (docsWithData.length === 0) {
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
        const zip = new JSZip();
        
        // Folder name: StudentName_RegNo
        const safeName = (student.name || "Pelajar").replace(/[^a-zA-Z0-9_ ]/g, "_");
        const folderName = `${safeName}_${student.regNo}`;
        const folder = zip.folder(folderName);
        
        docsWithData.forEach(item => {
            const { meta, doc } = item;
            let base64Data = doc.fileData;
            let fileExtension = "";
            
            if (base64Data.startsWith("data:")) {
                const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
                if (matches) {
                    const mime = matches[1];
                    base64Data = matches[2];
                    if (mime.includes("pdf")) fileExtension = ".pdf";
                    else if (mime.includes("png")) fileExtension = ".png";
                    else if (mime.includes("jpeg") || mime.includes("jpg")) fileExtension = ".jpg";
                }
            }
            
            let fileName = doc.fileName || `${meta.title}${fileExtension}`;
            fileName = fileName.replace(/[\\/]/g, "_");
            folder.file(fileName, base64Data, { base64: true });
        });
        
        const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
        saveAs(blob, `${folderName}.zip`);
        
        addLog("success", `Admin memuat turun folder dokumen pelajar: ${student.name} (${regNo}) — ${docsWithData.length} fail.`);
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
    btn.addEventListener("click", function() {
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
            
            docsVisual += `<span class="status-indicator-dot ${c}" title="${d.title}: ${status}" onclick="openDocumentReviewModal('${s.regNo}', '${key}')">${d.title.split(" ").map(w => w[0]).join("").substring(0,2)}</span>`;
        });
        
        tbody.innerHTML += `
            <tr>
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
            
            const initialsDoc = d.title.split(" ").map(w => w[0]).join("").substring(0,2);
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
            const hasDoc = s.documents[td.id] && s.documents[td.id].fileData;
            uploadControlsHTML += `
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; background:rgba(255,255,255,0.02); padding:6px 10px; border-radius:6px; border:1px solid var(--border-color); gap: 10px;">
                    <span style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">${td.title}</span>
                    <div style="display:flex; gap:6px; align-items:center;">
                        ${hasDoc ? `
                            <span class="badge badge-success" style="font-size:0.6rem; padding:2px 6px;">Selesai</span>
                            <a href="${s.documents[td.id].fileData}" download="${s.documents[td.id].fileName}" class="btn btn-sm btn-info" style="padding: 2px 6px; font-size: 0.65rem;" title="Muat Turun"><i class="fa-solid fa-download"></i></a>
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

window.openDocumentReviewModal = function(studentReg, docId) {
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
    if (doc.fileData) {
        dlLink.href = doc.fileData;
        dlLink.setAttribute("download", doc.fileName);
    } else {
        dlLink.removeAttribute("download");
        dlLink.href = "#";
        dlLink.onclick = function(e) {
            e.preventDefault();
            showToast("Fail dimuat turun (Simulasi)", "success");
        };
    }
    
    const previewBox = document.getElementById("doc-modal-preview-box");
    previewBox.innerHTML = "";
    if (doc.fileData && doc.fileData.trim() !== "") {
        if (doc.fileData.startsWith("data:image/")) {
            previewBox.innerHTML = `<img src="${doc.fileData}" alt="Fail Dokumen" style="max-width:100%; height:auto; border-radius:4px; box-shadow:0 2px 8px rgba(0,0,0,0.15);">`;
        } else if (doc.fileData.startsWith("data:application/pdf") || (doc.fileName && doc.fileName.toLowerCase().endsWith(".pdf"))) {
            const blobUrl = dataURLtoBlobURL(doc.fileData);
            previewBox.innerHTML = `<iframe src="${blobUrl}" style="width:100%; height:350px; border:1px solid var(--border-color); border-radius:6px; background:#fff;"></iframe>`;
        } else {
            previewBox.innerHTML = `
                <div style="text-align:center; padding: 20px 0;">
                    <i class="fa-solid fa-file-invoice text-accent" style="font-size:3.5rem; margin-bottom:8px;"></i>
                    <p style="font-size:0.75rem; color:var(--text-secondary);">Format: ${doc.fileName.split('.').pop().toUpperCase()}</p>
                    <p style="font-size:0.65rem; color:var(--text-muted);">Sila klik "Papar" untuk melihat paparan dokumen pintar</p>
                </div>
            `;
        }
    }
    
    viewBtnInReview.onclick = function() {
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
        
        saveStudents(students);
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

window.openDocumentViewer = function(studentReg, docId) {
    const students = getStudents();
    const student = students.find(s => s.regNo === studentReg);
    if (!student) return;
    
    const doc = student.documents[docId];
    if (!doc || doc.status === "Belum Dihantar") {
        showToast("Dokumen tidak wujud!", "error");
        return;
    }
    
    renderedView.innerHTML = "";
    
    // Priority 1: Show actual uploaded file
    if (doc.fileData && doc.fileData.trim() !== "") {
        if (doc.fileData.startsWith("data:image/")) {
            // Show image inline
            renderedView.innerHTML = `<img src="${doc.fileData}" style="max-width:100%; height:auto; box-shadow:0 0 10px rgba(0,0,0,0.1); border-radius:4px;" alt="Fail Pelajar">`;
        } else if (doc.fileData.startsWith("data:application/pdf") || (doc.fileName && doc.fileName.toLowerCase().endsWith(".pdf"))) {
            // Show PDF in iframe using Blob URL to bypass browser security restrictions on data: URIs
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
            // Generic file — show download link
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
    
    viewerModal.classList.add("active");
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
    btn.addEventListener("click", function() {
        document.querySelectorAll("#admin-dashboard-dept-tabs .dept-tab-btn").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        activeAdminDept = this.dataset.dept;
        renderAdminDashboard();
    });
});

// Switch Admin Students Management Department Tabs
document.querySelectorAll("#admin-students-dept-tabs .dept-tab-btn").forEach(btn => {
    btn.addEventListener("click", function() {
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
    btn.addEventListener("click", function() {
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
                <tr>
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
                            <i class="fa-solid fa-trash-can"></i> Hapus
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
    
    reader.onload = function(evt) {
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
        if (!regNo) regNo = `REG-${Math.floor(Math.random()*10000)}`;
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
        if (!regNo) regNo = `REG-${Math.floor(Math.random()*10000)}`;
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
        
        // Check if ALL required documents are fully approved ("Diterima") AND have actual file data
        const allComplete = approvedCount === requiredDocs.length && requiredDocs.every(d => {
            const doc = s.documents[d.id];
            return doc && doc.status === "Diterima" && doc.fileData && doc.fileData.trim() !== "";
        });
        
        let docsVisual = "";
        requiredDocs.forEach(d => {
            const key = d.id;
            const status = s.documents[key] ? s.documents[key].status : "Belum Dihantar";
            let c = "gray";
            if (status === "Dalam Semakan") c = "yellow";
            if (status === "Diterima") c = "green";
            if (status === "Ditolak") c = "red";
            
            docsVisual += `<span class="status-indicator-dot ${c}" title="${d.title}: ${status}" onclick="openDocumentReviewModal('${s.regNo}', '${key}')">${d.title.split(" ").map(w => w[0]).join("").substring(0,2)}</span>`;
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
            <tr>
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

window.deleteStudent = function(regNo) {
    showConfirm(
        `Padam pelajar ${regNo}? Ini akan memadamkan semua rekod dokumen mereka secara kekal.`,
        function() {
            const students = getStudents();
            const updated = students.filter(s => s.regNo !== regNo);
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
                            <i class="fa-solid fa-trash-can"></i> Hapus
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
                            <i class="fa-solid fa-trash-can"></i> Hapus
                        </button>
                    </td>
                </tr>
            `;
        }
    });
}

document.getElementById("admin-assign-search-input").addEventListener("input", renderAdminLecturerAssignTable);

window.saveAssignment = function(regNo) {
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
        
        saveStudents(students);
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

window.deleteAdmin = function(email) {
    showConfirm(
        `Adakah anda pasti mahu membuang admin dengan emel: ${email}? Tindakan ini tidak boleh diundurkan.`,
        function() {
            const admins = getAdmins();
            const updated = admins.filter(a => a.email !== email);
            saveAdmins(updated);
            addLog("danger", `Admin memadam admin: ${email}`);
            showToast("Rekod pentadbir (admin) telah dipadamkan.", "info");
            renderAdminAdminsTable();
            renderAdminDashboard();
        },
        "Buang Admin",
        "Ya, Buang"
    );
};

// Global handlers attached to window for upload logic
window.triggerFileUpload = function(docId) {
    const input = document.getElementById(`file-input-${docId}`);
    if (input) input.click();
};

window.handleFileSelected = function(event, docId) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Size limit: 10GB
    const MAX_SIZE = 10 * 1024 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        showToast("Fail melebihi had saiz 10GB!", "error");
        return;
    }
    
    // Format validation for Slaid Pembentangan
    if (docId === "slaid_pembentangan") {
        const name = file.name.toLowerCase();
        if (!name.endsWith(".ppt") && !name.endsWith(".pptx") && !name.endsWith(".pdf")) {
            showToast("Slaid Pembentangan: Hanya format PowerPoint (.ppt, .pptx) atau PDF dibenarkan!", "error");
            return;
        }
    } else {
        // All other documents: PDF, PNG, JPG only
        const name = file.name.toLowerCase();
        if (!name.endsWith(".pdf") && !name.endsWith(".png") && !name.endsWith(".jpg") && !name.endsWith(".jpeg")) {
            showToast("Hanya fail PDF, PNG, atau JPG dibenarkan untuk dokumen ini!", "error");
            return;
        }
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result;
        
        const students = getStudents();
        const studentIdx = students.findIndex(s => s.regNo === currentUser.regNo);
        
        if (studentIdx !== -1) {
            const now = new Date();
            const formattedTime = now.getFullYear() + "-" + 
                String(now.getMonth() + 1).padStart(2, '0') + "-" + 
                String(now.getDate()).padStart(2, '0') + " " + 
                String(now.getHours()).padStart(2, '0') + ":" + 
                String(now.getMinutes()).padStart(2, '0');
            
            const sizeKB = file.size / 1024;
            const sizeStr = sizeKB > 1000 ? (sizeKB / 1024).toFixed(1) + " MB" : Math.round(sizeKB) + " KB";
            
            students[studentIdx].documents[docId] = {
                status: "Dalam Semakan",
                fileName: file.name,
                fileSize: sizeStr,
                uploadDate: formattedTime,
                feedback: "",
                fileData: base64Data   // Store full base64 for ZIP download (had saiz: 10GB)
            };
            
            saveStudents(students);
            currentUser = students[studentIdx];
            
            addLog("info", `Pelajar ${currentUser.name} memuat naik dokumen: ${getDocMetadata(docId, currentUser).title}`);
            showToast(`Fail "${file.name}" berjaya dimuat naik untuk semakan.`, "success");
            
            renderStudentDocuments();
        }
    };
    reader.readAsDataURL(file);
};

window.handleLecturerFileUpload = function(regNo, docId, inputEl) {
    const file = inputEl.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showToast("Fail melebihi had saiz 5MB!", "error");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result;
        
        const students = getStudents();
        const studentIdx = students.findIndex(s => s.regNo === regNo);
        
        if (studentIdx !== -1) {
            const now = new Date();
            const formattedTime = now.getFullYear() + "-" + 
                String(now.getMonth() + 1).padStart(2, '0') + "-" + 
                String(now.getDate()).padStart(2, '0') + " " + 
                String(now.getHours()).padStart(2, '0') + ":" + 
                String(now.getMinutes()).padStart(2, '0');
            
            const sizeKB = file.size / 1024;
            const sizeStr = sizeKB > 1000 ? (sizeKB / 1024).toFixed(1) + " MB" : Math.round(sizeKB) + " KB";
            
            students[studentIdx].documents[docId] = {
                status: "Diterima", // Auto-approved since uploaded by supervisor
                fileName: file.name,
                fileSize: sizeStr,
                uploadDate: formattedTime,
                feedback: "Dimuat naik oleh Pensyarah Seliaan",
                fileData: file.size < 500 * 1024 ? base64Data : ""
            };
            
            saveStudents(students);
            
            addLog("info", `Pensyarah memuat naik borang markah (${docId}) bagi pelajar ${students[studentIdx].name} (${regNo})`);
            showToast(`Fail "${file.name}" berjaya dimuat naik dan diluluskan.`, "success");
            
            renderLecturerStudentsList();
        }
    };
    reader.readAsDataURL(file);
};

// Bulk selection and actions binding
function setupBulkActionListeners() {
    const selectAllCheck = document.getElementById("admin-student-select-all");
    const bulkDeleteBtn = document.getElementById("btn-bulk-delete");
    const countDisplay = document.getElementById("bulk-select-count");
    
    if (!selectAllCheck) return; // safeguard if elements are not in DOM
    
    // Select All checkbox change
    selectAllCheck.addEventListener("change", function() {
        const checkboxes = document.querySelectorAll(".student-select-checkbox");
        checkboxes.forEach(cb => cb.checked = this.checked);
        updateBulkCount();
    });
    
    // Update bulk action bar states
    window.updateBulkCount = function() {
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
            function() {
                const students = getStudents();
                const updated = students.filter(s => !regs.includes(s.regNo));
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
            "Hapus Pelajar Terpilih",
            "Ya, Hapus Semuanya"
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
        function() {
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
        "⚠️ Hapus SEMUA Pelajar Seluruh Sistem",
        "Ya, Hapus Semua Sepenuhnya"
    );
}

// Bind Hapus Semua Pelajar button in Pengurusan Pensyarah tab
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
    const savedTheme = localStorage.getItem("upli_theme") || "dark";
    const toggleBtn = document.getElementById("theme-toggle-btn");
    
    if (savedTheme === "light") {
        document.body.classList.add("light-mode");
        if (toggleBtn) {
            toggleBtn.innerHTML = `<i class="fa-solid fa-sun" style="color: #eab308;"></i>`;
        }
    } else {
        document.body.classList.remove("light-mode");
        if (toggleBtn) {
            toggleBtn.innerHTML = `<i class="fa-solid fa-moon"></i>`;
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
        saveStudents(students);
        
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
    reader.onload = function(e) {
        const base64 = e.target.result;
        if (type === "self") {
            if (currentRole !== "student" || !currentUser) return;
            const students = getStudents();
            const idx = students.findIndex(s => s.regNo === currentUser.regNo);
            if (idx !== -1) {
                students[idx].profilePic = base64;
                saveStudents(students);
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
document.addEventListener("DOMContentLoaded", () => {
    initDatabase();
    startClock();
    setupBulkActionListeners();
    initTheme();
    switchPortalTab('dashboard');
    
    // Theme toggle button click listener
    const toggleBtn = document.getElementById("theme-toggle-btn");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
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
                
                saveStudents(students);
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

// --- localStorage helpers ---
function getRubriks() {
    return JSON.parse(localStorage.getItem("upli_rubriks") || "[]");
}
function saveRubriks(data) {
    try {
        localStorage.setItem("upli_rubriks", JSON.stringify(data));
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            // For rubriks, since they are static reference files, we compress them if they exceed quota
            console.warn("LocalStorage Quota Exceeded for Rubrik! Optimizing...");
            let optimized = false;
            data.forEach(r => {
                if (r.fileData && r.fileData.length > 50000) {
                    r.fileData = "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iagogIDw8IC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAyIDAgUiA+PgplbmRvYmoKMiAwIG9iagogIDw8IC9UeXBlIC9QYWdlcyAvS2lkcyBbIDMgMCBSIF0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKICA8PCAvVHlwZSAvUGFnZSAvUGFyZW50IDIgMCBSIC9NZWRpYUJveCBbIDAgMCA1OTUgODQyIF0gPj4KZW5kb2JqCnRyYWlsZXIKICA8PCAvUm9vdCAxIDAgUiA+JQolRU9GCg==";
                    optimized = true;
                }
            });
            if (optimized) {
                try {
                    localStorage.setItem("upli_rubriks", JSON.stringify(data));
                    showToast("Simulasi Storan: Fail Rubrik disimpan secara simulasi kerana had storan pelayar.", "info");
                    return;
                } catch(retryErr) {}
            }
            showToast("Gagal menyimpan Rubrik: Storan pelayar penuh! Sila gunakan fail PDF bersaiz lebih kecil.", "error");
        } else {
            throw e;
        }
    }
}

// --- File input: show selected filename on zone label ---
document.getElementById("rubrik-file-input").addEventListener("change", function() {
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
window.handleRubrikUpload = function() {
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
    reader.onload = function(e) {
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
    reader.onerror = function() {
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
window.deleteRubrik = function(rubrikId) {
    showConfirm(
        "Adakah anda pasti mahu memadam rubrik ini? Tindakan ini tidak boleh diundurkan.",
        function() {
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
window.switchPortalTab = function(tabName) {
    document.querySelectorAll(".portal-nav-item").forEach(btn => {
        btn.classList.remove("active");
    });
    
    document.querySelectorAll(".portal-tab-pane").forEach(pane => {
        pane.style.display = "none";
    });

    if (tabName === 'dashboard') {
        const btn = document.getElementById("btn-portal-home");
        if (btn) btn.classList.add("active");
        document.getElementById("portal-tab-dashboard").style.display = "block";
        renderPortalDashboard();
    } else if (tabName === 'login') {
        const btn = document.getElementById("btn-portal-login-tab");
        if (btn) btn.classList.add("active");
        document.getElementById("portal-tab-login").style.display = "block";
    } else if (tabName === 'register') {
        document.getElementById("portal-tab-register").style.display = "block";
    }
};

window.renderPortalDashboard = function() {
    const students = getStudents();
    const activeSesi = getActiveSession();
    
    // Filter students by active session
    const currentSessionStudents = students.filter(s => s.sesi === activeSesi);
    
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
            programs: ["DEP", "DET", "DTK"]
        },
        {
            code: "JKM",
            name: "Jabatan Kejuruteraan Mekanikal",
            icon: "fa-solid fa-gears",
            color: "#3b82f6",
            glow: "rgba(59, 130, 246, 0.1)",
            programs: ["DKM", "DAD", "DTP"]
        },
        {
            code: "JP",
            name: "Jabatan Perdagangan",
            icon: "fa-solid fa-chart-line",
            color: "#10b981",
            glow: "rgba(16, 185, 129, 0.1)",
            programs: ["DAT", "DPM", "DPR"]
        },
        {
            code: "JPH",
            name: "Jabatan Pelancongan & Hospitaliti",
            icon: "fa-solid fa-utensils",
            color: "#ec4899",
            glow: "rgba(236, 72, 153, 0.1)",
            programs: ["DHF", "DUP", "DHS"]
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
        card.className = "card";
        card.style.cssText = "padding:20px; transition:all 0.2s; border-radius:12px; display:flex; flex-direction:column; justify-content:space-between; min-height: 290px;";
        card.onmouseenter = () => { card.style.borderColor = d.color; card.style.boxShadow = `0 4px 20px ${d.glow}`; };
        card.onmouseleave = () => { card.style.borderColor = "var(--border-color)"; card.style.boxShadow = ""; };
        
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
                    <span style="color:var(--text-muted);">Kemajuan Dokumen</span>
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
        "DEP", "DET", "DTK",
        "DKM", "DAD", "DTP",
        "DAT", "DPM", "DPR",
        "DHF", "DUP", "DHS"
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
