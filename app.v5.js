// === VERSI: app.v5.js BUILD 5 — 2026-07-25 ===
console.warn("=== SmartUPLI app.v5.js BUILD 8 dimuatkan ===");

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


// --- NEW: PAGINATION STATE & RENDER LOGIC ---
window.paginationState = {
    adminStudents: { currentPage: 1, itemsPerPage: 10 },
    adminLecturerList: { currentPage: 1, itemsPerPage: 10 },
    adminLecturerAssign: { currentPage: 1, itemsPerPage: 10 },
    adminPA: { currentPage: 1, itemsPerPage: 10 },
    pkli: { currentPage: 1, itemsPerPage: 10 },
    auditLogs: { currentPage: 1, itemsPerPage: 10 }
};

function renderPaginationControls(totalItems, itemsPerPage, currentPage, containerId, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return;

    // Prev Button
    const prevBtn = document.createElement("button");
    prevBtn.className = "btn btn-sm";
    prevBtn.innerHTML = "<i class='fa-solid fa-chevron-left'></i>";
    prevBtn.style.padding = "5px 10px";
    prevBtn.style.background = "rgba(128, 128, 128, 0.15)";
    prevBtn.style.color = "inherit";
    prevBtn.style.fontWeight = "600";
    prevBtn.style.border = "1px solid var(--border-color)";
    
    if (currentPage === 1) {
        prevBtn.disabled = true;
        prevBtn.style.opacity = "0.4";
        prevBtn.style.cursor = "not-allowed";
    } else {
        prevBtn.onclick = () => { onPageChange(currentPage - 1); };
    }
    container.appendChild(prevBtn);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            const pageBtn = document.createElement("button");
            pageBtn.className = "btn btn-sm";
            pageBtn.textContent = i;
            pageBtn.style.padding = "5px 12px";
            if (i === currentPage) {
                pageBtn.style.background = "var(--color-primary)";
                pageBtn.style.color = "#fff";
                pageBtn.style.fontWeight = "bold";
                pageBtn.style.border = "none";
            } else {
                pageBtn.style.background = "rgba(128, 128, 128, 0.15)";
                pageBtn.style.color = "inherit";
                pageBtn.style.fontWeight = "600";
                pageBtn.style.border = "1px solid var(--border-color)";
                pageBtn.onclick = () => { onPageChange(i); };
            }
            container.appendChild(pageBtn);
        } else if (i === 2 && currentPage > 3) {
            const ellipsis = document.createElement("span");
            ellipsis.textContent = "...";
            ellipsis.style.padding = "5px";
            ellipsis.style.color = "inherit";
            ellipsis.style.fontWeight = "600";
            container.appendChild(ellipsis);
        } else if (i === totalPages - 1 && currentPage < totalPages - 2) {
            const ellipsis = document.createElement("span");
            ellipsis.textContent = "...";
            ellipsis.style.padding = "5px";
            ellipsis.style.color = "inherit";
            ellipsis.style.fontWeight = "600";
            container.appendChild(ellipsis);
        }
    }

    // Next Button
    const nextBtn = document.createElement("button");
    nextBtn.className = "btn btn-sm";
    nextBtn.innerHTML = "<i class='fa-solid fa-chevron-right'></i>";
    nextBtn.style.padding = "5px 10px";
    nextBtn.style.background = "rgba(128, 128, 128, 0.15)";
    nextBtn.style.color = "inherit";
    nextBtn.style.fontWeight = "600";
    nextBtn.style.border = "1px solid var(--border-color)";
    
    if (currentPage === totalPages) {
        nextBtn.disabled = true;
        nextBtn.style.opacity = "0.4";
        nextBtn.style.cursor = "not-allowed";
    } else {
        nextBtn.onclick = () => { onPageChange(currentPage + 1); };
    }
    container.appendChild(nextBtn);
}

// --- NEW: AUDIT LOG ---
async function logActivity(action, details) {
    if (typeof db === 'undefined' || !db.collection) return;
    try {
        const userEmail = (currentUser && currentUser.email) ? currentUser.email : "unknown_user";
        const role = currentRole || "unknown";
        await db.collection("audit_logs").add({
            action: action,
            details: details,
            userEmail: userEmail,
            role: role,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.warn("Gagal merekod log aktiviti:", e);
    }
}

// --- NEW: EXPORT LOGIC ---
function exportStudentsToExcel() {
    try {
        const students = getStudents();
        const activeSesi = getActiveSession();
        const searchVal = document.getElementById("admin-student-search-input").value.trim().toLowerCase();
        const isPKLIMode = activeAdminStudentTabMode === "pkli";
        
        const filteredStudents = students.filter(s =>
            (isPKLIMode ? Boolean(s.isPKLI) : !s.isPKLI) &&
            (s.jabatan || "").toUpperCase().trim() === (activeAdminStudentDept || "").toUpperCase().trim() &&
            isStudentInSession(s, activeSesi) &&
            (
                (s.name || "").toLowerCase().includes(searchVal) ||
                (s.regNo || "").toLowerCase().includes(searchVal) ||
                (s.class || "").toLowerCase().includes(searchVal)
            )
        );

        if (filteredStudents.length === 0) {
            alert("Tiada data pelajar untuk dieksport.");
            return;
        }

        const exportData = filteredStudents.map(s => {
            let lecturerName = "Tiada Pensyarah Pemantau";
            if (s.assignedLecturer) {
                const lp = getLecturers().find(l => String(l.id) === String(s.assignedLecturer));
                if (lp) lecturerName = lp.name;
            }
            return {
                "Nama Pelajar": s.name || "",
                "No. Pendaftaran": s.regNo || "",
                "Kelas": s.class || "",
                "Jabatan": s.jabatan || "",
                "Sesi": s.sesi || "",
                "Syarikat Latihan": s.companyName || "-",
                "Status Borang Jawapan": (s.documents && s.documents['borang_jawapan']) ? s.documents['borang_jawapan'].status : "Belum Dihantar",
                "Pensyarah Pemantau": lecturerName
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Pelajar");
        
        const fileName = `Senarai_Pelajar_${activeAdminStudentDept}_${activeSesi}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        
        if(typeof logActivity === 'function') {
            logActivity("EKSPORT_EXCEL", `Mengeksport ${filteredStudents.length} rekod pelajar ${activeAdminStudentDept}`);
        }
    } catch (e) {
        console.error(e);
        alert("Ralat semasa mengeksport fail Excel.");
    }
}

function exportLecturersToExcel() {
    try {
        const lecturers = getLecturers();
        const searchVal = document.getElementById("lecturer-list-search").value.trim().toLowerCase();
        
        const filteredLecturers = lecturers.filter(l => 
            (l.name || "").toLowerCase().includes(searchVal) ||
            (l.email || "").toLowerCase().includes(searchVal)
        );

        if (filteredLecturers.length === 0) {
            alert("Tiada data pensyarah untuk dieksport.");
            return;
        }

        const exportData = filteredLecturers.map(l => {
            return {
                "Nama Pensyarah": l.name || "",
                "Emel": l.email || "",
                "No Tel": l.phone || "-",
                "Jabatan": l.jabatan || "-",
                "Status Admin": l.isAdmin ? "Ya" : "Tidak"
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Pensyarah");
        
        XLSX.writeFile(workbook, "Direktori_Pensyarah.xlsx");
        
        if(typeof logActivity === 'function') {
            logActivity("EKSPORT_EXCEL", `Mengeksport ${filteredLecturers.length} rekod pensyarah`);
        }
    } catch (e) {
        console.error(e);
        alert("Ralat semasa mengeksport fail Excel.");
    }
}

// --------------------------------------------------------------------------
// A. DATA SCHEMAS & DEFAULT DATABASE SEEDING
// --------------------------------------------------------------------------
let DOC_SCHEMAS = {
    "Kejuruteraan": {
        sebelum: [
            { id: "borang_jawapan", title: "Borang Jawapan", desc: "Borang jawapan rasmi dari organisasi/syarikat yang bersetuju menerima pelajar." },
            { id: "skop_kerja", title: "Senarai Skop Kerja", desc: "Skop kerja yang dipersetujui semasa latihan industri." }
        ],
        semasa: [
            { id: "lapor_diri", title: "Kad Pengesahan Lapor Diri", desc: "Kad pengesahan lapor diri di tempat latihan industri." },
            { id: "appendix_e2", title: "Borang Markah Pemantauan", desc: "Borang markah Proses Pemantauan semasa latihan industri (Kejuruteraan)." }
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
            { id: "borang_jawapan", title: "Borang Jawapan", desc: "Borang jawapan rasmi dari organisasi/syarikat yang bersetuju menerima pelajar." },
            { id: "skop_kerja", title: "Senarai Skop Kerja", desc: "Skop kerja yang dipersetujui semasa latihan industri." }
        ],
        semasa: [
            { id: "lapor_diri", title: "Kad Pengesahan Lapor Diri", desc: "Kad pengesahan lapor diri di tempat latihan industri." },
            { id: "appendix_2", title: "Borang Markah Pemantauan", desc: "Borang markah Proses Pemantauan semasa latihan industri (Bukan Kejuruteraan)." }
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

async function loadDocSchemas() {
    try {
        const res = await fetch('https://firestore.googleapis.com/v1/projects/myinternms/databases/(default)/documents/settings/documents_schema');
        const json = await res.json();
        if (json && json.fields && json.fields.schemaData && json.fields.schemaData.stringValue) {
            DOC_SCHEMAS = JSON.parse(json.fields.schemaData.stringValue);
            console.log("✅ DOC_SCHEMAS dimuat turun dari Firestore");
        }
    } catch (e) {
        console.error("Gagal memuat turun DOC_SCHEMAS, menggunakan senarai asal.", e);
    }
}
loadDocSchemas();

async function saveDocSchemas() {
    const payload = {
        fields: {
            schemaData: {
                stringValue: JSON.stringify(DOC_SCHEMAS)
            }
        }
    };
    try {
        await fetch('https://firestore.googleapis.com/v1/projects/myinternms/databases/(default)/documents/settings/documents_schema?updateMask.fieldPaths=schemaData', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        showToast("Senarai dokumen berjaya dikemas kini!", "success");
    } catch (e) {
        showToast("Ralat menyimpan senarai dokumen.", "error");
        console.error(e);
    }
}

// UI Functions for Developer Panel
function renderDevDocLists() {
    const container = document.getElementById("dev-doc-categories-container");
    if (!container) return;
    
    let html = "";
    const categories = Object.keys(DOC_SCHEMAS);
    
    if (categories.length === 0) {
        container.innerHTML = `<p class="text-muted">Tiada kategori dokumen dijumpai.</p>`;
        return;
    }
    
    categories.forEach(cat => {
        html += `
            <div class="card" style="margin:0; position:relative;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h4 style="margin:0;">${cat}</h4>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-sm btn-primary" onclick="openAddDocModal('${cat}')"><i class="fa-solid fa-plus"></i> Tambah</button>
                        ${(cat !== 'Kejuruteraan' && cat !== 'Bukan Kejuruteraan') ? `<button class="btn btn-sm" style="background:#ef4444; color:white; border:none;" onclick="deleteDevCategory('${cat}')" title="Buang Kategori"><i class="fa-solid fa-trash"></i></button>` : ''}
                    </div>
                </div>
                <div>
        `;
        
        const phases = ["sebelum", "semasa", "selepas"];
        phases.forEach(phase => {
            html += `<h5 style="margin-top:15px; color:var(--text-primary); text-transform:capitalize;">Fasa: ${phase}</h5>`;
            const docs = DOC_SCHEMAS[cat][phase] || [];
            
            if (docs.length === 0) {
                html += `<p class="text-muted" style="font-size:0.8rem; font-style:italic;">Tiada dokumen dalam fasa ini.</p>`;
            } else {
                html += `<div style="display:flex; flex-direction:column; gap:8px;">`;
                docs.forEach(d => {
                    html += `
                        <div style="background:var(--bg-elevated); padding:10px 12px; border-radius:6px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <strong style="font-size:0.9rem;">${d.title}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(${d.id})</span>
                                <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">${d.desc}</div>
                            </div>
                            <button class="btn btn-sm" style="background:#ef4444; color:white; border:none;" onclick="deleteDevDoc('${cat}', '${phase}', '${d.id}')">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    `;
                });
                html += `</div>`;
            }
        });
        
        html += `</div></div>`;
    });
    
    container.innerHTML = html;
}

function openAddCategoryModal() {
    document.getElementById("add-dev-category-form").reset();
    document.getElementById("add-dev-category-modal").style.display = "flex";
}

function deleteDevCategory(category) {
    if (confirm(`Adakah anda pasti mahu membuang keseluruhan kategori '${category}'?`)) {
        delete DOC_SCHEMAS[category];
        renderDevDocLists();
        saveDocSchemas();
    }
}

function openAddDocModal(category) {
    document.getElementById("dev-doc-category").value = category;
    document.getElementById("add-dev-doc-form").reset();
    document.getElementById("add-dev-doc-modal").style.display = "flex";
}

function deleteDevDoc(category, phase, docId) {
    if (confirm(`Adakah anda pasti mahu membuang dokumen '${docId}' dari fasa '${phase}'? Pelajar sedia ada tidak lagi akan melihat slot muat naik untuk dokumen ini.`)) {
        DOC_SCHEMAS[category][phase] = DOC_SCHEMAS[category][phase].filter(d => d.id !== docId);
        renderDevDocLists();
        saveDocSchemas();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const addDevCategoryForm = document.getElementById("add-dev-category-form");
    if (addDevCategoryForm) {
        addDevCategoryForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const catName = document.getElementById("dev-category-name").value.trim().toUpperCase();
            if (!catName) return;
            
            if (DOC_SCHEMAS[catName]) {
                alert("Kategori ini sudah wujud!");
                return;
            }
            
            DOC_SCHEMAS[catName] = {
                sebelum: [],
                semasa: [],
                selepas: []
            };
            
            document.getElementById("add-dev-category-modal").style.display = "none";
            renderDevDocLists();
            saveDocSchemas();
        });
    }

    const addDevDocForm = document.getElementById("add-dev-doc-form");
    if (addDevDocForm) {
        addDevDocForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const category = document.getElementById("dev-doc-category").value;
            const docId = document.getElementById("dev-doc-id").value.trim().toLowerCase();
            const title = document.getElementById("dev-doc-title").value.trim();
            const desc = document.getElementById("dev-doc-desc").value.trim();
            const phase = document.getElementById("dev-doc-phase").value;
            
            if (!DOC_SCHEMAS[category][phase]) {
                DOC_SCHEMAS[category][phase] = [];
            }
            
            // Check for duplicate ID
            let exists = false;
            ['sebelum', 'semasa', 'selepas'].forEach(p => {
                if (DOC_SCHEMAS[category][p].find(d => d.id === docId)) exists = true;
            });
            
            if (exists) {
                alert("ID Dokumen ini sudah wujud dalam kategori ini!");
                return;
            }
            
            DOC_SCHEMAS[category][phase].push({ id: docId, title: title, desc: desc });
            
            document.getElementById("add-dev-doc-modal").style.display = "none";
            renderDevDocLists();
            saveDocSchemas();
        });
    }
});

function getStudentCategory(student) {
    if (!student) return "Bukan Kejuruteraan";
    const dept = (student.jabatan || "").toUpperCase();
    const classVal = (student.class || "").toUpperCase();
    const regNo = (student.regNo || "").toUpperCase();

    // 1. Check for dynamic program overrides in DOC_SCHEMAS (e.g. "DLS")
    const dynamicCategories = Object.keys(DOC_SCHEMAS).filter(c => c !== "Kejuruteraan" && c !== "Bukan Kejuruteraan");
    for (let cat of dynamicCategories) {
        if (classVal.includes(cat) || regNo.includes(cat)) {
            return cat;
        }
    }

    // 2. Fallback to standard logic
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
    if (!doc) return;
    let fileId = doc.fileId;
    if (!fileId && doc.fileUrl) {
        const m = doc.fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || doc.fileUrl.match(/id=([a-zA-Z0-9_-]+)/);
        if (m) fileId = m[1];
    }
    if (fileId && fileId !== "N/A") {
        doc.fileId = fileId;
        const isImage = doc.fileName && /\.(png|jpg|jpeg)$/i.test(doc.fileName);
        if (isImage) {
            doc.fileUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        } else {
            doc.fileUrl = `https://drive.google.com/file/d/${fileId}/preview`;
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
    if (typeof db === 'undefined' || !db || !db.collection) return;
    // KRITIKAL: Pastikan setiap makluman mempunyai medan 'date' yang eksplisit sebelum disimpan ke Firestore.
    // Jika 'date' adalah undefined, ia TIDAK akan disimpan ke Firestore (JSON tidak menyimpan nilai undefined).
    // Ini menyebabkan makluman kehilangan tarikh setiap kali data dibaca semula dari Firestore.
    const toWrite = (Array.isArray(data) ? data : []).map(a => {
        const resolvedDate = getAnnouncementDate(a); // Sentiasa dapatkan tarikh yang sah
        return {
            id:         a.id        || ("ann_" + Date.now()),
            title:      a.title     || "",
            date:       resolvedDate,        // WAJIB ada — tidak boleh undefined
            category:   a.category  || "Makluman Umum",
            content:    a.content   || "",
            updatedBy:  a.updatedBy || "Admin",
            updatedAt:  a.updatedAt || ""
        };
    });
    try {
        await db.collection("settings").doc("announcements").set({
            list: toWrite,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.warn("FS writeAnnouncements:", e.message);
    }
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        try { callGoogleScript("writeAnnouncements", { data: toWrite }); } catch(e){}
    }
}

// Loading overlay for database operations
function showDBLoading(show) {
    let overlay = document.getElementById("db-loading-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "db-loading-overlay";
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100%";
        overlay.style.height = "100%";
        overlay.style.backgroundColor = "rgba(15, 23, 42, 0.75)";
        overlay.style.backdropFilter = "blur(8px)";
        overlay.style.webkitBackdropFilter = "blur(8px)";
        overlay.style.display = "none";
        overlay.style.flexDirection = "column";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.zIndex = "99999";
        overlay.style.transition = "opacity 0.25s ease";
        overlay.style.color = "#ffffff";

        overlay.innerHTML = `
            <div style="background: rgba(30, 41, 59, 0.95); padding: 30px 40px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; text-align: center; max-width: 380px;">
                <i class="fa-solid fa-spinner fa-spin" style="font-size: 3.5rem; color: #3b82f6;"></i>
                <div>
                    <h3 style="margin: 0 0 8px 0; font-size: 1.25rem; font-weight: 700; color: #f8fafc; font-family: var(--font-display, sans-serif);">Memuat Turun Data Terkini</h3>
                    <p style="margin: 0; font-size: 0.88rem; color: #94a3b8; line-height: 1.5; font-family: var(--font-sans, sans-serif);">Sistem sedang mengambil data segar daripada Google Sheets secara langsung. Sila tunggu seketika...</p>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    if (show) {
        overlay.style.display = "flex";
        overlay.style.opacity = "0";
        // Force reflow
        overlay.offsetHeight;
        overlay.style.opacity = "1";
    } else {
        overlay.style.opacity = "0";
        setTimeout(() => {
            if (overlay.style.opacity === "0") {
                overlay.style.display = "none";
            }
        }, 250);
    }
}

// Sanitize Firestore document ID (always clean, trimmed, and UPPERCASE)
function sanitizeDocId(str) {
    if (!str) return "DOC";
    return String(str).replace(/[^a-zA-Z0-9_-]/g, "_").trim().toUpperCase();
}

// ---------- Firestore Write Helpers (fire-and-forget) ----------

async function writeAdminsToFirestore(data) {
    if (typeof db === 'undefined' || !db || !db.collection) return;
    try { await db.collection("settings").doc("admins").set({ list: data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
    catch (e) { console.warn("FS writeAdmins:", e.message); }

    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        const dataForGas = data.map(admin => {
            const copy = { ...admin };
            delete copy.profilePic;
            return copy;
        });
        await callGoogleScript("writeAdmins", { data: dataForGas });
    }
}

async function writeLecturersToFirestore(data) {
    if (typeof db === 'undefined' || !db || !db.collection) return;
    try { await db.collection("settings").doc("lecturers").set({ list: data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); }
    catch (e) { console.warn("FS writeLecturers:", e.message); }

    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        const dataForGas = data.map(lec => {
            const copy = { ...lec };
            delete copy.profilePic;
            return copy;
        });
        await callGoogleScript("writeLecturers", { data: dataForGas });
    }
}

async function writeStudentDocumentToFirestore(regNo, docId, docData) {
    if (typeof db === 'undefined' || !db || !db.collection || !regNo || !docId) return;
    const cleanReg = sanitizeDocId(regNo);
    try {
        await db.collection("students").doc(cleanReg).update({
            [`documents.${docId}`]: docData
        });
    } catch (e) {
        try {
            await db.collection("students").doc(cleanReg).set({
                regNo: cleanReg,
                documents: { [docId]: docData }
            }, { merge: true });
        } catch (e2) {
            console.warn("writeStudentDocumentToFirestore err:", e2.message);
        }
    }
}

async function writeStudentToFirestore(student) {
    if (!student || !student.regNo) return;
    try {
        if (typeof db !== 'undefined' && db && db.collection) {
            const cleanReg = sanitizeDocId(student.regNo);
            const pkliSet = getPKLIRegNoSet();
            const s = JSON.parse(JSON.stringify(student));
            s.regNo = cleanReg;
            if (pkliSet.has(cleanReg) || s.isPKLI || s.statusLI === "PKLI") {
                s.isPKLI = true;
                s.statusLI = "PKLI";
                pkliSet.add(cleanReg);
            }
            // Strip large base64 fileData — files stored in file_data or Firebase Storage
            if (s.documents) {
                Object.keys(s.documents).forEach(k => {
                    if (s.documents[k] && s.documents[k].fileData) delete s.documents[k].fileData;
                });
            }
            // Strip large base64 profile pics (allow up to 900KB)
            if (s.profilePic && s.profilePic.startsWith("data:") && s.profilePic.length > 900000) delete s.profilePic;

            // BUG FIX: Jangan tulis keseluruhan objek 'documents' secara pukal menggunakan set()
            // untuk mengelakkan status dokumen yang telah disahkan tertimpa oleh cache lama
            delete s.documents;

            db.collection("students").doc(cleanReg).set(s, { merge: true }).catch(e => console.warn("FS writeStudent err:", e.message));
        }
    } catch (e) { console.warn("FS writeStudent:", e.message); }

    // 2. Google Sheets sync in background (non-blocking)
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        const students = getStudents();
        const existingIdx = students.findIndex(s => s.regNo === student.regNo);
        if (existingIdx !== -1) {
            students[existingIdx] = student;
        } else {
            students.push(student);
        }
        
        // Map local model keys to Google Sheets database column keys
        // ✅ Buang profilePic dan fileData — terlalu besar untuk Google Sheets (had 50k aksara/sel)
        const mappedStudents = students.map(s => {
            const copy = { ...s };
            copy.dept = s.jabatan || "";
            copy.company = s.tempatLI || "";
            copy.paEmail = s.penasihatAkademik || "";
            copy.paName = s.penasihatAkademikName || "";
            copy.session = s.sesi || "";
            copy.sesi = s.sesi || "";
            copy.phone = s.phone || "";
            copy.isPKLI = Boolean(s.isPKLI);
            copy.statusLI = s.statusLI || (s.isPKLI ? "PKLI" : "Aktif");
            // Buang profilePic base64 — simpan dalam Firestore sahaja, bukan Google Sheets
            delete copy.profilePic;
            // Buang fileData dalam documents (terlalu besar)
            if (copy.documents) {
                const cleanDocs = {};
                Object.keys(copy.documents).forEach(k => {
                    const d = { ...copy.documents[k] };
                    delete d.fileData;
                    cleanDocs[k] = d;
                });
                copy.documents = cleanDocs;
            }
            return copy;
        });
        callGoogleScript("writeStudents", { data: mappedStudents }).catch(e => console.warn("GAS writeStudents err:", e));
    }
}


async function writeStudentsToFirestore(data, modifiedRegNos = null) {
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        const mappedData = data.map(s => {
            const copy = { ...s };
            copy.dept = s.jabatan || "";
            copy.company = s.tempatLI || "";
            copy.paEmail = s.penasihatAkademik || "";
            copy.paName = s.penasihatAkademikName || "";
            copy.session = s.sesi || "";
            copy.sesi = s.sesi || "";
            copy.phone = s.phone || "";
            copy.isPKLI = Boolean(s.isPKLI);
            copy.statusLI = s.statusLI || (s.isPKLI ? "PKLI" : "Aktif");
            // ✅ Buang profilePic base64 — simpan dalam Firestore sahaja, bukan Google Sheets
            delete copy.profilePic;
            // ✅ Buang fileData dalam documents (terlalu besar)
            if (copy.documents) {
                const cleanDocs = {};
                Object.keys(copy.documents).forEach(k => {
                    const d = { ...copy.documents[k] };
                    delete d.fileData;
                    cleanDocs[k] = d;
                });
                copy.documents = cleanDocs;
            }
            return copy;
        });
        callGoogleScript("writeStudents", { data: mappedData });
    }
    if (!data || data.length === 0) return;

    if (modifiedRegNos === "none") return; // Abaikan penulisan Firestore jika sudah diuruskan secara berasingan (contoh: pemadaman)

    if (typeof db !== 'undefined' && db && db.collection) {
        try {
            await db.collection("settings").doc("students_master").set({
                list: data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.warn("FS writeStudents_master error:", e.message);
        }
    }

    const pkliSet = getPKLIRegNoSet();
    
    let dataToWrite = data;
    if (Array.isArray(modifiedRegNos)) {
        const modifiedSet = new Set(modifiedRegNos.map(r => String(r).trim().toUpperCase()));
        dataToWrite = data.filter(s => s.regNo && modifiedSet.has(String(s.regNo).trim().toUpperCase()));
        console.log(`[Firestore] Mengoptimumkan muat naik: ${dataToWrite.length} / ${data.length} rekod sahaja akan ditulis.`);
    }

    const chunkSize = 400;
    for (let i = 0; i < dataToWrite.length; i += chunkSize) {
        const chunk = dataToWrite.slice(i, i + chunkSize);
        const batch = db.batch();
        chunk.forEach(student => {
            const s = JSON.parse(JSON.stringify(student));
            if (s.regNo) {
                const reg = String(s.regNo).trim().toUpperCase();
                s.regNo = reg;
                if (pkliSet.has(reg) || s.isPKLI || s.statusLI === "PKLI") {
                    s.isPKLI = true;
                    s.statusLI = "PKLI";
                    pkliSet.add(reg);
                }
                if (s.documents) {
                    Object.keys(s.documents).forEach(k => {
                        if (s.documents[k] && s.documents[k].fileData) delete s.documents[k].fileData;
                    });
                }
                if (s.profilePic && s.profilePic.startsWith("data:") && s.profilePic.length > 900000) delete s.profilePic;
                
                // BUG FIX: Jangan tulis keseluruhan objek 'documents' dalam batch write
                delete s.documents;

                const ref = db.collection("students").doc(sanitizeDocId(reg));
                batch.set(ref, s, { merge: true });
            }
        });
        try {
            await batch.commit();
        } catch (e) {
            console.warn("FS batch commit writeStudents error:", e.message);
        }
    }
}

// ── Eksport data profil pelajar (phone, email) dari Firestore ke Google Sheets ──
window.exportPhoneToSheets = async function exportPhoneToSheets() {
    if (!GOOGLE_SCRIPT_URL || !GOOGLE_SCRIPT_URL.trim()) {
        showToast("Google Sheets tidak dikonfigurasi.", "error");
        return;
    }

    const btn = document.getElementById("btn-export-phone-to-sheets");
    if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mengeksport...`; }

    try {
        showToast("Sedang mengambil data profil terkini dari Firestore...", "info");

        // Step 1: Merge latest Firestore profile data into cache
        await mergeFirestoreStudentsData();

        // Step 2: Map all students with phone included for GAS
        const students = getStudents();
        const mappedStudents = students.map(s => {
            const copy = { ...s };
            copy.dept = s.jabatan || "";
            copy.company = s.tempatLI || "";
            copy.paEmail = s.penasihatAkademik || "";
            copy.paName = s.penasihatAkademikName || "";
            copy.session = s.sesi || "";
            copy.sesi = s.sesi || "";
            copy.phone = s.phone || "";
            copy.email = s.email || "";
            copy.isPKLI = Boolean(s.isPKLI);
            copy.statusLI = s.statusLI || (s.isPKLI ? "PKLI" : "Aktif");
            // Strip heavy base64 data before sending
            if (copy.profilePic && copy.profilePic.startsWith("data:")) delete copy.profilePic;
            if (copy.documents) {
                Object.keys(copy.documents).forEach(k => {
                    if (copy.documents[k] && copy.documents[k].fileData) delete copy.documents[k].fileData;
                });
            }
            return copy;
        });

        // Step 3: Send to GAS
        showToast(`Menghantar ${mappedStudents.length} rekod pelajar ke Google Sheets...`, "info");
        await callGoogleScript("writeStudents", { data: mappedStudents });

        showToast(`✅ Berjaya! Data profil ${mappedStudents.length} pelajar (phone, email) telah dieksport ke Google Sheets.`, "success");
        addLog("success", `Admin mengeksport data profil pelajar ke Google Sheets (${mappedStudents.length} rekod).`);
    } catch (e) {
        console.error("exportPhoneToSheets error:", e);
        showToast(`Gagal mengeksport: ${e.message || e}`, "error");
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-file-export" style="color:#fff !important;"></i> Eksport ke Sheets`; }
    }
};

async function deleteStudentFromFirestore(regNo) {
    if (typeof db === 'undefined' || !db || !db.collection) return;
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        // Google Sheets write is handled cleanly in batch by saveStudents()
        return;
    }
    try { await db.collection("students").doc(sanitizeDocId(regNo)).delete(); }
    catch (e) { console.warn("FS deleteStudent:", e.message); }
}

async function writeSettingsToFirestore(updates) {
    if (typeof db === 'undefined' || !db || !db.collection) return;
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        await callGoogleScript("writeSettings", { data: updates });
        return;
    }
    try { await db.collection("settings").doc("global").set(updates, { merge: true }); }
    catch (e) { console.warn("FS writeSettings:", e.message); }
}

async function writeLogToFirestore(entry) {
    if (typeof db === 'undefined' || !db || !db.collection) return;
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        await callGoogleScript("writeLog", { data: entry });
        return;
    }
    try { await db.collection("logs").add({ ...entry, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); }
    catch (e) { console.warn("FS writeLog:", e.message); }
}

async function writeRubriksToFirestore(data) {
    if (typeof db === 'undefined' || !db || !db.collection) return;
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

// ── Standalone PKLI Persistence Lock ──────────────────────────────────
function getPKLIRegNoSet() {
    try {
        const arr = JSON.parse(localStorage.getItem("upli_pkli_ids") || "[]");
        const cleaned = (Array.isArray(arr) ? arr : []).map(r => String(r).trim().toUpperCase()).filter(Boolean);
        return new Set(cleaned);
    } catch(e) { return new Set(); }
}

function savePKLIRegNoSet(pkliSet, syncRemote = true) {
    try {
        const arr = Array.from(pkliSet).map(r => String(r).trim().toUpperCase()).filter(Boolean);
        localStorage.setItem("upli_pkli_ids", JSON.stringify(arr));

        if (syncRemote) {
            if (typeof writeSettingsToFirestore === "function") {
                writeSettingsToFirestore({ pkli_ids: arr });
            }
            if (typeof db !== 'undefined' && db && db.collection) {
                db.collection("settings").doc("pkli_ids").set({ list: arr }, { merge: true }).catch(e => console.warn("FS pkli_ids set error:", e));
            }
        }
    } catch(e) {}
}

let pkliListenerAttached = false;
function attachPKLISyncListener() {
    if (pkliListenerAttached) return;
    if (typeof db === 'undefined' || !db || !db.collection) return;
    
    pkliListenerAttached = true;
    db.collection("settings").doc("pkli_ids").onSnapshot(doc => {
        if (doc && doc.metadata && doc.metadata.hasPendingWrites) return; // Prevent local pending write echoes
        if (doc && doc.exists && doc.data() && Array.isArray(doc.data().list)) {
            const arr = doc.data().list;
            const remoteSet = new Set(arr.map(r => String(r).trim().toUpperCase()).filter(Boolean));
            savePKLIRegNoSet(remoteSet, false); // Don't echo write back during snapshot sync

            if (dbCache.students && Array.isArray(dbCache.students)) {
                dbCache.students.forEach(st => {
                    if (st && st.regNo) {
                        const cleanReg = String(st.regNo).trim().toUpperCase();
                        if (remoteSet.has(cleanReg)) {
                            st.isPKLI = true;
                            st.statusLI = "PKLI";
                        } else if (st.isPKLI || st.statusLI === "PKLI") {
                            st.isPKLI = false;
                            st.statusLI = "Aktif";
                        }
                    }
                });
            }
            normalizeStudentsCache();
            if (typeof saveStudentsLocalStorage === "function") {
                saveStudentsLocalStorage(dbCache.students);
            }
            if (typeof requestTabDataRender === "function") {
                requestTabDataRender();
            }
            if (typeof updatePKLICountBadge === "function") updatePKLICountBadge();
            if (typeof renderPKLITable === "function" && document.getElementById("pkli-table-body")) renderPKLITable();
        }
    }, err => console.warn("Sync error pkli_ids:", err));
}


function cleanLocationName(str) {
    if (!str) return "Belum Ditentukan";
    let text = String(str)
        .replace(/📍|☒|[\u{1F300}-\u{1F9FF}]/gu, "")
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .trim();
    if (!text || text === "-" || text === "null" || text === "undefined") {
        return "Belum Ditentukan";
    }
    return text;
}

// ---------- Normalize students cache (ensure required doc fields) ----------
function normalizeStudentsCache() {
    const OLD_DOC_IDS = ["resume", "reply_letter", "weekly_reports", "final_report", "completion_cert"];

    if (!dbCache.students) dbCache.students = [];
    if (!dbCache.lecturers) dbCache.lecturers = [];

    const fallbackSession = dbCache.activeSession || "Sesi 1:2026/2027";
    const pkliSet = getPKLIRegNoSet();

    // Remove JTMK dept students in memory
    dbCache.students = dbCache.students.filter(s => s && s.jabatan !== "JTMK" && s.dept !== "JTMK");

    // Remove JTMK lecturers in memory
    dbCache.lecturers = dbCache.lecturers.filter(l => l && l.dept !== "JTMK");

    dbCache.students.forEach(s => {
        if (!s || typeof s !== 'object') return;

        // Clean & normalize regNo FIRST so Set lookup is 100% accurate!
        if (s.regNo) s.regNo = String(s.regNo).trim().toUpperCase();

        // Map Google Sheet/GAS keys to local model keys immediately if available
        if (s.dept !== undefined && s.dept !== null) {
            s.jabatan = s.dept;
        }
        if (s.company !== undefined && s.company !== null) {
            s.tempatLI = s.company;
        }
        if (s.paEmail !== undefined && s.paEmail !== null) {
            s.penasihatAkademik = s.paEmail;
        }
        if (s.paName !== undefined && s.paName !== null) {
            s.penasihatAkademikName = s.paName;
        }
        if (s.session !== undefined && s.session !== null) {
            s.sesi = s.session;
        }

        // Clean any quotation marks on text fields
        if (s.name) s.name = cleanStudentName(s.name);
        if (s.tempatLI) s.tempatLI = cleanVal(s.tempatLI);
        if (s.company) s.company = cleanVal(s.company);

        // Extract district from tempatLI or handle unset tempatLI
        const tLI = (s.tempatLI || "").trim();
        const isTempatUnset = !tLI || tLI === "-" || tLI === "Belum Ditentukan" || tLI === "Belum Diagihkan";

        if (isTempatUnset) {
            s.daerah = "Belum Ditentukan";
        } else {
            let rawDaerah = s.daerah ? String(s.daerah).trim() : "";
            const tUpper = tLI.toUpperCase();
            let extracted = "";
            if (tUpper.includes("PAPAR")) extracted = "Papar";
            else if (tUpper.includes("RANAU")) extracted = "Ranau";
            else if (tUpper.includes("LABUAN")) extracted = "Labuan";
            else if (tUpper.includes("SANDAKAN")) extracted = "Sandakan";
            else if (tUpper.includes("TAWAU")) extracted = "Tawau";
            else if (tUpper.includes("BANDARAYA") || tUpper.includes("KOTA KINABALU") || tUpper.includes("KK")) extracted = "Kota Kinabalu";
            else if (tUpper.includes("KUCHING")) extracted = "Kuching";
            else if (tUpper.includes("KUALA LUMPUR") || tUpper.includes("KL")) extracted = "Kuala Lumpur";
            else if (tUpper.includes("PENAMPANG")) extracted = "Penampang";
            else if (tUpper.includes("PUTATAN")) extracted = "Putatan";
            else if (tUpper.includes("TUARAN")) extracted = "Tuaran";
            else if (tUpper.includes("KOTA BELUD")) extracted = "Kota Belud";
            else if (tUpper.includes("KIMANIS")) extracted = "Kimanis";
            else if (tUpper.includes("BEAUFORT")) extracted = "Beaufort";
            else if (tUpper.includes("KENINGAU")) extracted = "Keningau";

            if (extracted) {
                s.daerah = extracted;
            } else if (!rawDaerah || rawDaerah === "-" || rawDaerah === "Belum Ditentukan") {
                s.daerah = "Belum Ditentukan";
            } else {
                s.daerah = cleanLocationName(rawDaerah);
            }
        }
        if (s.pensyarahPemantauName) s.pensyarahPemantauName = cleanVal(s.pensyarahPemantauName);
        if (s.pensyarahPenilaiName) s.pensyarahPenilaiName = cleanVal(s.pensyarahPenilaiName);
        if (s.penasihatAkademikName) s.penasihatAkademikName = cleanVal(s.penasihatAkademikName);

        // Auto-fix swapped or name-in-email-field for lecturers (e.g. names containing @ like "Cyril Bin Buin @ Edwin")
        if (s.pensyarahPemantau && !isValidEmailFormat(s.pensyarahPemantau)) {
            if (!s.pensyarahPemantauName) s.pensyarahPemantauName = s.pensyarahPemantau;
            s.pensyarahPemantau = resolveLecturerEmailByName(s.pensyarahPemantauName);
        }
        if (s.pensyarahPenilai && !isValidEmailFormat(s.pensyarahPenilai)) {
            if (!s.pensyarahPenilaiName) s.pensyarahPenilaiName = s.pensyarahPenilai;
            s.pensyarahPenilai = resolveLecturerEmailByName(s.pensyarahPenilaiName);
        }
        if (s.penasihatAkademik && !isValidEmailFormat(s.penasihatAkademik)) {
            if (!s.penasihatAkademikName) s.penasihatAkademikName = s.penasihatAkademik;
            s.penasihatAkademik = resolveLecturerEmailByName(s.penasihatAkademikName);
        }

        // Auto-fill missing lecturer emails by name
        if (!s.pensyarahPemantau && s.pensyarahPemantauName) {
            s.pensyarahPemantau = resolveLecturerEmailByName(s.pensyarahPemantauName);
        }
        if (!s.pensyarahPenilai && s.pensyarahPenilaiName) {
            s.pensyarahPenilai = resolveLecturerEmailByName(s.pensyarahPenilaiName);
        }
        if (!s.penasihatAkademik && s.penasihatAkademikName) {
            s.penasihatAkademik = resolveLecturerEmailByName(s.penasihatAkademikName);
        }

        // Auto-fill missing lecturer names by email
        if (s.pensyarahPemantau && !s.pensyarahPemantauName) {
            s.pensyarahPemantauName = resolveLecturerNameByEmail(s.pensyarahPemantau);
        }
        if (s.pensyarahPenilai && !s.pensyarahPenilaiName) {
            s.pensyarahPenilaiName = resolveLecturerNameByEmail(s.pensyarahPenilai);
        }
        if (s.penasihatAkademik && !s.penasihatAkademikName) {
            s.penasihatAkademikName = resolveLecturerNameByEmail(s.penasihatAkademik);
        }

        // Normalize session (sesi)
        if (s.sesi) {
            let str = String(s.sesi).trim();
            str = str.replace(/\s*-\s*Fasa\s*\d+/gi, "").trim();
            str = str.replace(/\s*(JKA|JKM|JKE|JP|JPH)\b/gi, "").trim();
            str = str.replace(/^SESI/i, "Sesi");
            if (str.includes("1") && (str.includes("26") || str.includes("2026"))) {
                str = "Sesi 1:2026/2027";
            } else if (str.includes("2") && (str.includes("26") || str.includes("2026") || str.includes("27") || str.includes("2027"))) {
                str = "Sesi 2:2026/2027";
            }
            s.sesi = str;
        }

        if (!s.sesi || String(s.sesi).trim() === "") {
            s.sesi = fallbackSession;
        }

        const isMarkedPKLI = Boolean(s.regNo && pkliSet.has(s.regNo));

        if (isMarkedPKLI) {
            s.isPKLI = true;
            s.statusLI = "PKLI";
        } else {
            s.isPKLI = false;
            if (s.statusLI === "PKLI") s.statusLI = "Aktif";
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
        // Ensure regNo is clean
        if (s.regNo) s.regNo = String(s.regNo).trim().toUpperCase();
    });

    try {
        const arr = Array.from(pkliSet).map(r => String(r).trim().toUpperCase()).filter(Boolean);
        localStorage.setItem("upli_pkli_ids", JSON.stringify(arr));
    } catch(e) {}
}

// ---------- Auto-migrate legacy sessions (add Fasa 1 & Fasa 2) ----------
function autoMigrateSessions() {
    // Keep exact session strings from user uploads / database without forcing legacy suffixes
}

// ==========================================================================
// STALE-WHILE-REVALIDATE CONSTANTS
// ==========================================================================

/** Cache dianggap "segar" selama 5 minit. Fetch hanya berlaku jika lebih lama. */
const CACHE_TTL_MS = 0; // Sentiasa revalidate dengan Google Sheets di latar belakang

/** Interval polling bila tab AKTIF (pengguna sedang guna app) */
const POLL_ACTIVE_MS  = 10 * 60 * 1000;   // 10 minit (kurangkan lag UI)

/** Interval polling bila tab DI LATAR (pengguna tukar tab/minimize) */
const POLL_IDLE_MS    = 30 * 60 * 1000; // 30 minit

/** ID interval polling semasa (supaya boleh clear bila tukar mod) */
let _swrPollingInterval = null;

// ---------- initDatabase — Async, loads from Firestore ----------
// --- GOOGLE APPS SCRIPT HTTP HELPER ---
async function callGoogleScript(action, dataObj = {}) {
    if (!GOOGLE_SCRIPT_URL) return null;
    // 60-second timeout so slow/offline GAS doesn't block the whole app
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            mode: "cors",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({ action, ...dataObj }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        const resJson = await response.json();
        if (resJson && resJson.success) {
            return resJson;
        } else {
            console.error("Google Script API Error:", resJson.error);
            return null;
        }
    } catch (e) {
        clearTimeout(timeoutId);
        if (e.name === "AbortError") {
            console.warn("callGoogleScript timeout (60s) for action:", action);
        } else {
            console.error("callGoogleScript failed:", e);
        }
        return null;
    }
}

/**
 * Simpan semua data dari Google Sheets ke localStorage + dbCache.
 * Dipanggil oleh initDatabase dan swrRevalidate.
 */
function applyRemoteData(data) {
    if (!data) return false;
    if (data && data.data) data = data.data;

    if (data.students && Array.isArray(data.students)) {
        if (data.students.length === 0 && dbCache.students && dbCache.students.length > 0) {
            console.warn("[Perlindungan SWR] Data pelajar dari Google Script adalah kosong (0). Mengelak daripada memadamkan cache tempatan.");
        } else {
        const pkliSet = getPKLIRegNoSet();

        // Merge PKLI IDs from remote settings if available
        if (data.settings && Array.isArray(data.settings.pkli_ids)) {
            data.settings.pkli_ids.forEach(r => pkliSet.add(String(r).trim().toUpperCase()));
        }
        if (data.pkli_ids && Array.isArray(data.pkli_ids)) {
            data.pkli_ids.forEach(r => pkliSet.add(String(r).trim().toUpperCase()));
        }

        // Remote data is the single source of truth. Completely overwrite local cache with incoming remote data.
        const existingMap = new Map();
        (dbCache.students || []).forEach(exist => {
            if (exist && exist.regNo) {
                existingMap.set(String(exist.regNo).trim().toUpperCase(), exist);
            }
        });

        dbCache.students = data.students.map(st => {
            if (!st || !st.regNo) return st;
            const reg = String(st.regNo).trim().toUpperCase();

            // Merge local fields to prevent data loss (phone, email, profilePic, documents)
            const exist = existingMap.get(reg);
            if (exist) {
                if ((st.phone === undefined || st.phone === null || st.phone === "") && exist.phone) {
                    st.phone = exist.phone;
                }
                if ((st.email === undefined || st.email === null || st.email === "") && exist.email) {
                    st.email = exist.email;
                }
                // ✅ profilePic SENTIASA diambil dari cache tempatan — GAS tidak simpan profilePic
                // Ini menghalang gambar salah dari Google Sheets mencemari cache
                if (exist.profilePic) {
                    st.profilePic = exist.profilePic;
                } else if (st.profilePic) {
                    // Jika GAS ada profilePic (tidak sepatutnya), buang ia — jangan guna
                    delete st.profilePic;
                }
                // ✅ BUGFIX: documents SENTIASA diambil/digabungkan dari cache tempatan
                // GAS (Google Sheets) tidak menyimpan data dokumen pelajar.
                // Tanpa perlindungan ini, dokumen yang baru diupload akan hilang setiap kali
                // pollSync mencetuskan applyRemoteData (setiap 3.5 saat).
                if (exist.documents && Object.keys(exist.documents).length > 0) {
                    if (!st.documents || Object.keys(st.documents).length === 0) {
                        // GAS tiada documents — pakai sepenuhnya dari cache tempatan
                        st.documents = exist.documents;
                    } else {
                        // Gabungkan: prioriti cache tempatan bagi setiap docKey
                        Object.keys(exist.documents).forEach(docKey => {
                            const localDoc = exist.documents[docKey];
                            const remoteDoc = st.documents[docKey];
                            // Jika dokumen tempatan ada fail (fileUrl/fileId/status) — kekalkan
                            if (localDoc && (localDoc.fileUrl || localDoc.fileId || (localDoc.status && localDoc.status !== "Belum Dihantar"))) {
                                st.documents[docKey] = localDoc;
                            } else if (remoteDoc) {
                                // Tiada apa dalam cache, guna remote jika ada
                                st.documents[docKey] = remoteDoc;
                            }
                        });
                    }
                }
            }

            // Set PKLI properties from PKLI set
            if (pkliSet.has(reg)) {
                st.isPKLI = true;
                st.statusLI = "PKLI";
            } else {
                st.isPKLI = false;
                if (st.statusLI === "PKLI") st.statusLI = "Aktif";
            }
            return st;
        });

        savePKLIRegNoSet(pkliSet, false);
        normalizeStudentsCache();
        }
    }
    if (data.lecturers) {
        const oldLecs = dbCache.lecturers || [];
        dbCache.lecturers = data.lecturers.map(lec => {
            const exist = oldLecs.find(l => l.email === lec.email && l.name === lec.name);
            if (exist && exist.profilePic) {
                lec.profilePic = exist.profilePic;
            } else if (lec.profilePic) {
                delete lec.profilePic;
            }
            return lec;
        });
    }
    if (data.admins) {
        const oldAdmins = dbCache.admins || [];
        dbCache.admins = data.admins.map(admin => {
            const exist = oldAdmins.find(a => a.email === admin.email && a.staffId === admin.staffId);
            if (exist && exist.profilePic) {
                admin.profilePic = exist.profilePic;
            } else if (admin.profilePic) {
                delete admin.profilePic;
            }
            return admin;
        });
    }
    if (data.rubriks)       { dbCache.rubriks       = data.rubriks; }
    // HOTFIX: JANGAN gunakan data makluman dari Google Sheets (syncData).
    // Google Apps Script rosak — ia sentiasa menghantar data hantu (2026-07-24).
    // Makluman HANYA diuruskan melalui Firestore secara terus.
    // if (data.announcements) { dbCache.announcements = mergeAnnouncementsWithLocal(data.announcements); }
    if (data.logs)          { dbCache.logs          = data.logs; }
    if (data.settings) {
        dbCache.settings = data.settings;
        dbCache.sessions = data.settings.sessions || DEFAULT_SESSIONS;
        // Preserve user's locked session choice in browser
        const userLocked = localStorage.getItem("upli_locked_active_session");
        if (userLocked && userLocked.trim()) {
            dbCache.activeSession = userLocked.trim();
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
        // HOTFIX: JANGAN tulis semula upli_announcements di sini.
        // Makluman ditulis HANYA apabila admin menyimpan/memadam makluman secara eksplisit.
        // Ini mengelak data hantu dari Google Sheets menimpa data Firestore yang betul.
        // localStorage.setItem("upli_announcements", JSON.stringify(dbCache.announcements));
        localStorage.setItem("upli_sessions",      JSON.stringify(dbCache.sessions));
        localStorage.setItem("upli_active_session", dbCache.activeSession);
        localStorage.setItem("upli_logs",          JSON.stringify(dbCache.logs));
        // Tandakan masa cache terkini berhasil disimpan
        localStorage.setItem("upli_cache_ts",      String(Date.now()));
    } catch(e) { console.warn("localStorage write error:", e); }

    return true;
}

// Penyatuan data profil pelajar dari Firestore dengan data Google Sheets
async function mergeFirestoreStudentsData() {
    console.log("[Merge] Memulakan penyatuan data profil pelajar dari Firestore (Lazy Load)...");
    if (typeof db === 'undefined' || !db || !db.collection) {
        console.warn("[Merge] Firestore tidak diaktifkan / tidak dijumpai.");
        return;
    }
    
    // --- LAZY LOADING OPTIMIZATION ---
    let currentUserObj = currentUser;
    if (!currentUserObj) {
        try {
            const lsUser = localStorage.getItem("upli_current_user");
            if (lsUser) currentUserObj = JSON.parse(lsUser);
        } catch (e) {}
    }
    if (!currentUserObj) {
        console.log("[Merge] Pengguna belum log masuk. Abaikan bacaan pukal.");
        return; 
    }

    let effectiveRole = (currentUserObj && currentUserObj.role) || (typeof currentRole !== "undefined" ? currentRole : null);
    if (!effectiveRole) {
        try { effectiveRole = sessionStorage.getItem("upli_role"); } catch(e) {}
    }
    const isAdmin = effectiveRole === "admin" || (currentUserObj && currentUserObj.role === "admin");
    const isStudent = effectiveRole === "student" || effectiveRole === "pelajar" || Boolean(currentUserObj && currentUserObj.regNo);
    const isLecturer = effectiveRole === "lecturer" || effectiveRole === "pensyarah" || Boolean(currentUserObj && currentUserObj.email && !currentUserObj.regNo);

    let targetDocs = [];

    try {
        if (isStudent && currentUserObj.regNo) {
            const doc = await db.collection("students").doc(sanitizeDocId(currentUserObj.regNo)).get({ source: 'server' });
            if (doc.exists) targetDocs.push(doc);
        } else if (isLecturer && currentUserObj.email) {
            // Senarai pelajar di bawah seliaan pensyarah ini
            const myStudents = (dbCache.students || []).filter(s => 
                s.pemantauEmail === currentUserObj.email || s.penilaiEmail === currentUserObj.email
            ).map(s => sanitizeDocId(s.regNo));
            
            if (myStudents.length > 0) {
                // Pecahkan kepada chunk 30 (had maksimum Firestore 'in' query)
                const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
                const chunks = chunkArray(myStudents, 30);
                
                const promises = chunks.map(async chunk => {
                    const snap = await db.collection("students").where(firebase.firestore.FieldPath.documentId(), 'in', chunk).get({ source: 'server' });
                    return snap.docs;
                });
                const results = await Promise.all(promises);
                results.forEach(res => targetDocs.push(...res));
            }
        } else if (isAdmin) {
            const snap = await db.collection("students").get({ source: 'server' });
            targetDocs = snap.docs;
        } else {
            console.warn("[Merge] Peranan pengguna tidak sejajar untuk Lazy Load. Abaikan.");
            return;
        }

        if (targetDocs.length === 0) {
            console.log("[Merge] Tiada rekod students di Firestore yang relevan untuk dimuat turun.");
            return;
        }
        
        const fsMap = new Map();
        targetDocs.forEach(doc => {
            fsMap.set(String(doc.id).trim().toUpperCase(), doc.data());
        });
        console.log(`[Merge] Berjaya membaca ${targetDocs.length} rekod dari Firestore mengikut peranan (${currentUserObj.role}).`);

        let changed = false;
        let mergeCount = 0;
        dbCache.students = (dbCache.students || []).map(st => {
            if (!st || !st.regNo) return st;
            const reg = String(st.regNo).trim().toUpperCase();
            const fsData = fsMap.get(reg);
            if (fsData) {
                mergeCount++;
                // Penyatuan data profil peribadi pelajar
                if (fsData.phone && st.phone !== fsData.phone) { st.phone = fsData.phone; changed = true; }
                if (fsData.email && st.email !== fsData.email) { st.email = fsData.email; changed = true; }
                if (fsData.profilePic && st.profilePic !== fsData.profilePic) { 
                    st.profilePic = fsData.profilePic; 
                    changed = true; 
                    console.log(`[Merge] 📸 Penyatuan profilePic berjaya bagi pelajar ${reg}`);
                }
                
                // Penyatuan status dokumen dan file data
                if (fsData.documents) {
                    st.documents = st.documents || {};
                    Object.keys(fsData.documents).forEach(docKey => {
                        const localDoc = st.documents[docKey] || {};
                        const fsDoc = fsData.documents[docKey] || {};
                        
                        if (fsDoc.status && localDoc.status !== fsDoc.status) {
                            localDoc.status = fsDoc.status;
                            changed = true;
                        }
                        if (fsDoc.fileUrl && localDoc.fileUrl !== fsDoc.fileUrl) {
                            localDoc.fileUrl = fsDoc.fileUrl;
                            changed = true;
                        }
                        if (fsDoc.fileName && localDoc.fileName !== fsDoc.fileName) {
                            localDoc.fileName = fsDoc.fileName;
                            changed = true;
                        }
                        if (fsDoc.uploadDate && localDoc.uploadDate !== fsDoc.uploadDate) {
                            localDoc.uploadDate = fsDoc.uploadDate;
                            changed = true;
                        }
                        if (fsDoc.fileSize && localDoc.fileSize !== fsDoc.fileSize) {
                            localDoc.fileSize = fsDoc.fileSize;
                            changed = true;
                        }
                        if (fsDoc.fileId && localDoc.fileId !== fsDoc.fileId) {
                            localDoc.fileId = fsDoc.fileId;
                            changed = true;
                        }
                        if (fsDoc.feedback !== undefined && localDoc.feedback !== fsDoc.feedback) {
                            localDoc.feedback = fsDoc.feedback;
                            changed = true;
                        }
                        if (fsDoc.fileRef && localDoc.fileRef !== fsDoc.fileRef) {
                            localDoc.fileRef = fsDoc.fileRef;
                            changed = true;
                        }
                        st.documents[docKey] = localDoc;
                    });
                }
            }
            return st;
        });

        console.log(`[Merge] Penyatuan selesai. ${mergeCount} pelajar dipadankan. changed = ${changed}`);
        if (changed) {
            try { localStorage.setItem("upli_students", JSON.stringify(dbCache.students)); } catch(e){}
        }

        // ✅ FIX: Kemas kini currentUser dari Firestore supaya dokumen kekal selepas refresh
        // Ini penting untuk pelajar Firestore-only (tiada dalam dbCache.students / Google Sheets)
        if (isStudent && currentUserObj && currentUserObj.regNo) {
            const currentReg = String(currentUserObj.regNo).trim().toUpperCase();
            const fsCurrentData = fsMap.get(currentReg);
            if (fsCurrentData) {
                // Muat turun documents dari Firestore ke currentUser
                if (fsCurrentData.documents) {
                    currentUserObj.documents = currentUserObj.documents || {};
                    Object.keys(fsCurrentData.documents).forEach(docKey => {
                        const localDoc = currentUserObj.documents[docKey] || {};
                        const fsDoc = fsCurrentData.documents[docKey] || {};
                        // Merge semua medan penting dari Firestore
                        currentUserObj.documents[docKey] = Object.assign({}, localDoc, {
                            status: fsDoc.status || localDoc.status || "Belum Dihantar",
                            fileName: fsDoc.fileName || localDoc.fileName || "",
                            fileSize: fsDoc.fileSize || localDoc.fileSize || "",
                            uploadDate: fsDoc.uploadDate || localDoc.uploadDate || "",
                            fileUrl: fsDoc.fileUrl || localDoc.fileUrl || "",
                            fileId: fsDoc.fileId || localDoc.fileId || "",
                            fileRef: fsDoc.fileRef || localDoc.fileRef || "",
                            feedback: fsDoc.feedback !== undefined ? fsDoc.feedback : (localDoc.feedback || "")
                        });
                    });
                }
                // Kemas kini profil jika ada
                if (fsCurrentData.phone) currentUserObj.phone = fsCurrentData.phone;
                if (fsCurrentData.email) currentUserObj.email = fsCurrentData.email;
                if (fsCurrentData.profilePic) currentUserObj.profilePic = fsCurrentData.profilePic;

                // Simpan semula ke localStorage dan sessionStorage
                if (currentUser && String(currentUser.regNo || "").trim().toUpperCase() === currentReg) {
                    currentUser = currentUserObj;
                }
                try {
                    localStorage.setItem("upli_current_user", JSON.stringify(currentUserObj));
                    sessionStorage.setItem("upli_current_user", JSON.stringify(currentUserObj));
                    sessionStorage.setItem("upli_user", JSON.stringify(currentUserObj));
                } catch(e) {}
                console.log(`[Merge] ✅ currentUser (${currentReg}) dikemas kini dari Firestore — ${Object.keys(currentUserObj.documents || {}).length} dokumen dipulihkan.`);
            }
        }
    } catch (e) {
        console.warn("[Merge] Gagal menyatukan data Firestore:", e);
    }
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
    // GUARD: Jangan render semula jika pensyarah sedang dalam proses muat naik dokumen
    if (currentUser && currentRole && typeof requestTabDataRender === "function") {
        if (!window._lecturerUploadInProgress) {
            requestTabDataRender();
        } else {
            console.log('[SWR] Render semula ditangguhkan — muat naik pensyarah sedang berlaku.');
        }
    }

    console.log(`[SWR] ✅ Data dikemas kini senyap pada ${new Date().toLocaleTimeString('ms-MY')}`);
}

/**
 * Mulakan polling adaptif menggunakan Tab Visibility API.
 * - Tab aktif   → poll setiap POLL_ACTIVE_MS (15 saat)
 * - Tab di latar → poll setiap POLL_IDLE_MS (2 minit)
 */
function startAdaptivePolling() {
    // Polling is disabled. Synchronization is now strictly manual via the "Kemaskini" button.
    return;
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
        dbCache.announcements = sanitizeAnnouncementsData(JSON.parse(localStorage.getItem("upli_announcements") || JSON.stringify(DEFAULT_ANNOUNCEMENTS)));
        dbCache.settings      = JSON.parse(localStorage.getItem("upli_settings")      || "{}");
    } catch(e) { console.warn("Cache load error:", e); }
    applySystemBranding();
    attachPKLISyncListener();
    initGlobalStudentsListener();
    if (typeof db !== 'undefined' && db && db.collection) {
        ['admins', 'lecturers'].forEach(key => {
            db.collection("settings").doc(key).get().then(doc => {
                if (doc.exists && doc.data().list) {
                    const fsData = doc.data().list;
                    let changed = false;
                    const cacheArr = dbCache[key] || [];
                    cacheArr.forEach(localObj => {
                        const fsObj = fsData.find(a => a.email === localObj.email && (a.staffId === localObj.staffId || a.name === localObj.name));
                        if (fsObj) {
                            if (fsObj.profilePic && localObj.profilePic !== fsObj.profilePic) {
                                localObj.profilePic = fsObj.profilePic;
                                changed = true;
                            } else if (!fsObj.profilePic && localObj.profilePic) {
                                delete localObj.profilePic;
                                changed = true;
                            }
                        }
                    });
                    if (changed) {
                        try { localStorage.setItem(`upli_${key}`, JSON.stringify(cacheArr)); } catch(e){}
                        if (currentUser && ((key === "admins" && currentRole === "admin") || (key === "lecturers" && currentRole === "lecturer"))) {
                            const up = cacheArr.find(a => a.email === currentUser.email && (a.staffId === currentUser.staffId || a.name === currentUser.name));
                            if (up) {
                                currentUser = up;
                                try { sessionStorage.setItem("upli_user", JSON.stringify(currentUser)); } catch(e){}
                                if (typeof updateUserAvatars === "function") updateUserAvatars(currentUser);
                                if (typeof requestTabDataRender === "function") requestTabDataRender();
                            }
                        }
                    }
                }
            }).catch(e => console.warn(`Silent sync ${key}:`, e.message));
        });

        attachRealtimeListeners();
    }

    if (!window._syncListenersAttached) {
        window._syncListenersAttached = true;
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                if (typeof requestTabDataRender === "function") requestTabDataRender();
            }
        });
        window.addEventListener("focus", () => {
            if (typeof requestTabDataRender === "function") requestTabDataRender();
        });
    }

    // ── Google Sheets Mode ──────────────────────────────────────────────────
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {

        const hasStudents = dbCache.students && dbCache.students.length > 0;

        if (hasStudents) {
            // ✅ Cache wujud — Guna terus, jangan sync secara automatik pada loading pertama
            console.log(`[SWR] ✅ Cache wujud. Guna localStorage, skip auto-fetch Google Sheets.`);
            autoMigrateSessions();
            attachRealtimeListeners(); // Pasang listener sync_signal walaupun cache wujud
            mergeFirestoreStudentsData().then(() => {
                if (currentUser && activeTab) {
                    try { renderTabData(activeTab); } catch(e) {}
                }
            }).catch(e => console.warn("Background firestore merge err:", e));
            return;
        }

        // ── LANGKAH 3: Cache kosong — fetch Google Sheets secara automatik (hanya untuk kali pertama/kosong) ──
        console.log(`[SWR] ⏳ Cache kosong. Memulakan muat turun Google Sheets kali pertama...`);
        showDBLoading(true);
        try {
            const data = await callGoogleScript("init");
            if (applyRemoteData(data)) {
                await mergeFirestoreStudentsData();
                // Kemas kini UI dropdown dan pengumuman
                populateGlobalSessionSelect();
                if (typeof renderPortalAnnouncements === "function") renderPortalAnnouncements();
                // Kemas kini dashboard jika pengguna sudah log masuk
                if (currentUser && activeTab) {
                    try { renderTabData(activeTab); } catch(e) {}
                }
                console.log(`[SWR] ✅ Fetch init berjaya. ${dbCache.students.length} pelajar dimuatkan.`);
            }
        } catch (e) {
            console.warn("[SWR] Google Script init gagal:", e.message);
        } finally {
            showDBLoading(false);
        }

        // Fetch & sync PKLI master list from Firestore across devices
        try {
            if (typeof db !== 'undefined' && db && db.collection) {
                const pkliDoc = await db.collection("settings").doc("pkli_ids").get({ source: 'server' });
                if (pkliDoc && pkliDoc.exists && pkliDoc.data() && pkliDoc.data().list) {
                    const arr = pkliDoc.data().list;
                    if (Array.isArray(arr) && arr.length > 0) {
                        const pkliSet = getPKLIRegNoSet();
                        arr.forEach(r => pkliSet.add(String(r).trim().toUpperCase()));
                        savePKLIRegNoSet(pkliSet, false);
                        if (dbCache.students && Array.isArray(dbCache.students)) {
                            dbCache.students.forEach(st => {
                                if (st && st.regNo && pkliSet.has(String(st.regNo).trim().toUpperCase())) {
                                    st.isPKLI = true;
                                    st.statusLI = "PKLI";
                                }
                            });
                        }
                        normalizeStudentsCache();
                        try { localStorage.setItem("upli_students", JSON.stringify(dbCache.students)); } catch(e){}
                    }
                }
            }
        } catch(e) { console.warn("PKLI Firestore sync error:", e); }

        autoMigrateSessions();

        // ── LANGKAH 4: Mulakan adaptive polling ──────────────────────────────
        startAdaptivePolling();
        return;
    }

    // Then fetch from Firestore in parallel (background, non-blocking)
    try {
        if (typeof db === 'undefined' || !db || !db.collection) return;
        const [settingsDoc, adminsDoc, lecturersDoc, rubriksDoc, pkliDoc] = await Promise.all([
            db.collection("settings").doc("global").get(),
            db.collection("settings").doc("admins").get(),
            db.collection("settings").doc("lecturers").get(),
            db.collection("settings").doc("rubriks").get(),
            db.collection("settings").doc("pkli_ids").get().catch(() => null)
        ]);

        // Baca makluman PAKSA dari server (bukan IndexedDB cache) untuk elak data lapuk
        let announcementsDoc;
        try {
            announcementsDoc = await db.collection("settings").doc("announcements").get({ source: 'server' });
        } catch(e) {
            // Fallback ke cache jika server tidak boleh dicapai
            announcementsDoc = await db.collection("settings").doc("announcements").get();
        }

        // PKLI persistence restore on cache clear
        if (pkliDoc && pkliDoc.exists && pkliDoc.data().list) {
            const arr = pkliDoc.data().list;
            if (Array.isArray(arr) && arr.length > 0) {
                const pkliSet = getPKLIRegNoSet();
                arr.forEach(r => pkliSet.add(String(r).trim().toUpperCase()));
                try {
                    localStorage.setItem("upli_pkli_ids", JSON.stringify(Array.from(pkliSet)));
                } catch(e) {}
            }
        }

        // Settings
        if (settingsDoc.exists) {
            const d = settingsDoc.data();
            dbCache.settings = d;
            dbCache.sessions = d.sessions || DEFAULT_SESSIONS;
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
            dbCache.announcements = sanitizeAnnouncementsData(announcementsDoc.data().list);
        } else {
            dbCache.announcements = sanitizeAnnouncementsData(DEFAULT_ANNOUNCEMENTS);
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
    console.log("[DEBUG] attachRealtimeListeners() dipanggil. db wujud:", typeof db !== 'undefined', "| attached:", realtimeListenersAttached);
    if (typeof db === 'undefined' || !db || !db.collection) { console.warn("[DEBUG] db tidak wujud — listeners tidak dipasang!"); return; }
    if (realtimeListenersAttached) { console.log("[DEBUG] Listeners sudah dipasang sebelum ini."); return; }

    // Helper to process document/collection snapshots
    function processSnapshot(snapshot, cacheKey, isCollection, processor) {
        if (snapshot.metadata.hasPendingWrites) return; // Ignore local writes to prevent UI jumping
        let result;
        if (isCollection) {
            result = snapshot.empty ? [] : snapshot.docs.map(processor);
        } else {
            if (!snapshot.exists) return;
            result = processor(snapshot);
        }
        // Sanitize announcements dates before writing to cache
        if (cacheKey === "announcements" && Array.isArray(result)) {
            result = sanitizeAnnouncementsData(result);
        }
        dbCache[cacheKey] = result;
        try { localStorage.setItem(`upli_${cacheKey}`, JSON.stringify(dbCache[cacheKey])); } catch(e){}

        if (typeof currentUser !== "undefined" && currentUser) {
            if (cacheKey === "admins" && typeof currentRole !== "undefined" && currentRole === "admin") {
                const up = result.find(a => a.email === currentUser.email && a.staffId === currentUser.staffId);
                if (up) {
                    currentUser = up;
                    try { sessionStorage.setItem("upli_user", JSON.stringify(currentUser)); } catch(e){}
                    if (typeof updateUserAvatars === "function") updateUserAvatars(currentUser);
                }
            } else if (cacheKey === "lecturers" && typeof currentRole !== "undefined" && currentRole === "lecturer") {
                const up = result.find(l => l.email === currentUser.email && l.name === currentUser.name);
                if (up) {
                    currentUser = up;
                    try { sessionStorage.setItem("upli_user", JSON.stringify(currentUser)); } catch(e){}
                    if (typeof updateUserAvatars === "function") updateUserAvatars(currentUser);
                }
            }
        }

        if (typeof requestTabDataRender === "function") requestTabDataRender();
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
        if (typeof requestTabDataRender === "function") requestTabDataRender();
    }, err => console.warn("Sync error global:", err));

    ['admins', 'lecturers', 'rubriks'].forEach(key => {
        let first = true;
        db.collection("settings").doc(key).onSnapshot(doc => {
            if (first) { first = false; return; }
            processSnapshot(doc, key, false, d => d.data().list || []);
        }, err => console.warn(`Sync error ${key}:`, err));
    });

    // Announcements listener — paksa baca terus dari server, sentiasa sanitize tarikh
    db.collection("settings").doc("announcements").onSnapshot({ includeMetadataChanges: false }, doc => {
        if (doc.metadata.hasPendingWrites || !doc.exists) return;
        const rawList = doc.data().list || [];
        // PENTING: Jangan jalankan sanitizeAnnouncementsData di sini kerana ia akan
        // menimpa tarikh yang ditetapkan oleh admin dengan tarikh yang diekstrak dari teks.
        // Contoh: "BERMULA 27 JULAI" dalam kandungan akan menukar tarikh jadi "2026-07-27"
        // walaupun admin telah tetapkan "2026-10-10".
        // Gunakan data terus dari Firestore — Firestore adalah sumber kebenaran (source of truth).
        dbCache.announcements = rawList;
        try { localStorage.setItem("upli_announcements", JSON.stringify(rawList)); } catch(e){}
        if (typeof renderPortalAnnouncements === "function") renderPortalAnnouncements();
        if (typeof renderAdminAnnouncements === "function") renderAdminAnnouncements();
        if (typeof requestTabDataRender === "function") requestTabDataRender();
    }, err => console.warn("Sync error announcements:", err));

    // ── Auto-Sync Listener & REST Poller: Auto refresh data apabila Google Sheets / Admin kemaskini data ──
    let _lastProcessedSyncId = null;
    let _onSnapshotFirstRun = true;

    // 1. onSnapshot Listener (Firestore SDK)
    db.collection("settings").doc("sync_signal").onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data() || {};
        const syncId = data.syncId;
        if (!syncId) return;

        // Abaikan run kali pertama semasa load page (supaya tidak popup toast waktu baru refresh)
        if (_onSnapshotFirstRun) {
            _onSnapshotFirstRun = false;
            _lastProcessedSyncId = syncId;
            return;
        }

        if (syncId === window._lastSentSyncId) return;
        if (syncId === _lastProcessedSyncId) return;
        _lastProcessedSyncId = syncId;

        const byWho = data.by || "admin";
        console.log(`[SyncSignal-SDK] 📡 Isyarat sync diterima (dikemas kini oleh: ${byWho}).`);
        showToast("⏳ Mengemas kini data terkini...", "info");
        if (byWho === "Google Sheets Auto-Sync") {
            silentRefreshFromFirestore();
        } else {
            silentRefreshGlobalData();
        }
    }, err => console.warn("Sync error sync_signal:", err));
    realtimeListenersAttached = true;
}

// ---------- Dynamic Role-Based Realtime Listeners ----------
let activeStudentListener = null;
function attachStudentRealtimeListener(regNo) {
    if (typeof db === 'undefined' || !db || !db.collection) return;
    if (activeStudentListener) return;
    activeStudentListener = db.collection("students").doc(sanitizeDocId(regNo))
        .onSnapshot(doc => {
            if (doc.metadata.hasPendingWrites) return;
            if (doc.exists) {
                const studentData = doc.data();
                const cleanReg = String(regNo).trim().toUpperCase();
                if (!dbCache.students) dbCache.students = [];
                const existingIdx = dbCache.students.findIndex(s => s && String(s.regNo).trim().toUpperCase() === cleanReg);
                if (existingIdx !== -1) {
                    const st = dbCache.students[existingIdx];
                    const fsData = studentData;
                    
                    if (fsData.phone) st.phone = fsData.phone;
                    if (fsData.email) st.email = fsData.email;
                    if (fsData.profilePic) st.profilePic = fsData.profilePic;
                    
                    if (fsData.documents) {
                        st.documents = st.documents || {};
                        Object.keys(fsData.documents).forEach(docKey => {
                            st.documents[docKey] = { ...(st.documents[docKey] || {}), ...fsData.documents[docKey] };
                        });
                    }
                    if (fsData.catatan !== undefined) st.catatan = fsData.catatan;
                    if (fsData.logbook) {
                        st.logbook = st.logbook || {};
                        Object.assign(st.logbook, fsData.logbook);
                    }
                    if (fsData.rubrik) {
                        st.rubrik = st.rubrik || {};
                        Object.assign(st.rubrik, fsData.rubrik);
                    }
                } else {
                    dbCache.students.push(studentData);
                }
                normalizeStudentsCache();
                if (currentUser && String(currentUser.regNo || "").trim().toUpperCase() === cleanReg) {
                    if (existingIdx !== -1) {
                        currentUser = dbCache.students[existingIdx];
                    } else {
                        currentUser = studentData;
                    }
                    if (!currentUser.role) currentUser.role = "student";
                    try {
                        localStorage.setItem("upli_current_user", JSON.stringify(currentUser));
                        sessionStorage.setItem("upli_current_user", JSON.stringify(currentUser));
                        sessionStorage.setItem("upli_user", JSON.stringify(currentUser));
                    } catch(e) {}
                }
                try { localStorage.setItem("upli_students", JSON.stringify(dbCache.students)); } catch(e){}
                if (activeTab) renderTabData(activeTab);
            }
        }, err => console.warn("Sync error single student:", err));
}

let activeGlobalStudentsListener = null;

function initGlobalStudentsListener() {
    if (typeof attachGlobalStudentsRealtimeListener === "function") {
        attachGlobalStudentsRealtimeListener();
    }
}

async function attachGlobalStudentsRealtimeListener() {
    // Disabled to prevent out-of-sync Firestore students collection from overwriting fresh Google Sheets data
    return;
}

window.refreshGlobalData = async function() {
    showDBLoading(true);
    try {
        if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
            const data = await callGoogleScript("init");
            if (data) {
                if (data.students && Array.isArray(data.students)) {
                    const pkliSet = getPKLIRegNoSet();
                    if (data.settings && Array.isArray(data.settings.pkli_ids)) {
                        data.settings.pkli_ids.forEach(r => pkliSet.add(String(r).trim().toUpperCase()));
                    }
                    if (data.pkli_ids && Array.isArray(data.pkli_ids)) {
                        data.pkli_ids.forEach(r => pkliSet.add(String(r).trim().toUpperCase()));
                    }

                    const existingMap = new Map();
                    (dbCache.students || []).forEach(exist => {
                        if (exist && exist.regNo) {
                            existingMap.set(String(exist.regNo).trim().toUpperCase(), exist);
                        }
                    });

                    dbCache.students = data.students.map(st => {
                        if (!st || !st.regNo) return st;
                        const reg = String(st.regNo).trim().toUpperCase();

                        // Merge local fields to prevent data loss (phone, email, profilePic)
                        const exist = existingMap.get(reg);
                        if (exist) {
                            if ((st.phone === undefined || st.phone === null || st.phone === "") && exist.phone) {
                                st.phone = exist.phone;
                            }
                            if ((st.email === undefined || st.email === null || st.email === "") && exist.email) {
                                st.email = exist.email;
                            }
                            if ((st.profilePic === undefined || st.profilePic === null || st.profilePic === "") && exist.profilePic) {
                                st.profilePic = exist.profilePic;
                            }
                        }

                        if (pkliSet.has(reg)) {
                            st.isPKLI = true;
                            st.statusLI = "PKLI";
                        } else {
                            st.isPKLI = false;
                            if (st.statusLI === "PKLI") st.statusLI = "Aktif";
                        }
                        return st;
                    });
                    savePKLIRegNoSet(pkliSet, false);
                    normalizeStudentsCache();
                }
                if (data.lecturers) {
                    const oldLecs = dbCache.lecturers || [];
                    dbCache.lecturers = data.lecturers.map(lec => {
                        const exist = oldLecs.find(l => l.email === lec.email && l.name === lec.name);
                        if (exist && exist.profilePic) lec.profilePic = exist.profilePic;
                        else if (lec.profilePic) delete lec.profilePic;
                        return lec;
                    });
                } else {
                    dbCache.lecturers = [];
                }

                if (data.admins) {
                    const oldAdmins = dbCache.admins || [];
                    dbCache.admins = data.admins.map(admin => {
                        const exist = oldAdmins.find(a => a.email === admin.email && a.staffId === admin.staffId);
                        if (exist && exist.profilePic) admin.profilePic = exist.profilePic;
                        else if (admin.profilePic) delete admin.profilePic;
                        return admin;
                    });
                } else {
                    dbCache.admins = [];
                }
                
                dbCache.rubriks = data.rubriks || [];
                dbCache.announcements = mergeAnnouncementsWithLocal(data.announcements || []);
                dbCache.logs = data.logs || [];
                if (data.settings) {
                    dbCache.settings = data.settings || {};
                    dbCache.sessions = data.settings.sessions || DEFAULT_SESSIONS;
                    const userLocked = localStorage.getItem("upli_locked_active_session");
                    if (userLocked && userLocked.trim()) {
                        dbCache.activeSession = userLocked.trim();
                    } else {
                        dbCache.activeSession = data.settings.activeSession || "Sesi 1:2026/2027";
                    }
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
                
                await mergeFirestoreStudentsData();
                populateGlobalSessionSelect();
                if (typeof renderPortalAnnouncements === "function") {
                    renderPortalAnnouncements();
                }
                showToast("Data terkini berjaya dimuat turun dari Google Sheets!", "success");
                // Hantar isyarat sync ke Firestore supaya pelajar/pensyarah auto-refresh
                writeSyncSignalToFirestore();
            } else {
                showToast("Gagal menyambung ke Google Sheets.", "error");
            }
        } else {
            // Firestore mode
            const snap = await db.collection("students").get();
            if (snap.empty) {
                console.log("Firestore empty on refresh. Seeding from SEED_STUDENTS...");
                if (typeof SEED_STUDENTS !== 'undefined' && SEED_STUDENTS.length > 0) {
                    const mergedStudents = [...DEFAULT_STUDENTS, ...SEED_STUDENTS];
                    await writeStudentsToFirestore(mergedStudents);
                    dbCache.students = mergedStudents;
                } else {
                    dbCache.students = DEFAULT_STUDENTS;
                }
            } else {
                const incomingDocs = snap.docs.map(doc => doc.data());
                const pkliSet = getPKLIRegNoSet();
                const studentMap = new Map();
                (dbCache.students || []).forEach(st => {
                    if (st && st.regNo) studentMap.set(String(st.regNo).trim().toUpperCase(), st);
                });
                incomingDocs.forEach(st => {
                    if (st && st.regNo) {
                        const reg = String(st.regNo).trim().toUpperCase();
                        st.regNo = reg;
                        if (st.isPKLI || st.statusLI === "PKLI" || pkliSet.has(reg)) {
                            st.isPKLI = true;
                            st.statusLI = "PKLI";
                            pkliSet.add(reg);
                        }
                        studentMap.set(reg, st);
                    }
                });
                dbCache.students = Array.from(studentMap.values());
                savePKLIRegNoSet(pkliSet, false);
            }
            normalizeStudentsCache();
            try { localStorage.setItem("upli_students", JSON.stringify(dbCache.students)); } catch(e){}
            showToast("Data terkini berjaya dimuat turun!", "success");
        }
    } catch (e) {
        console.error("Failed to refresh global data:", e);
        showToast("Gagal memuat turun data terkini.", "error");
    } finally {
        showDBLoading(false);
        if (typeof requestTabDataRender === "function") requestTabDataRender();
    }
};

// --------------------------------------------------------------------------
// AUTO-SYNC: Isyarat Firestore — Admin → Pelajar/Pensyarah
// Apabila admin berjaya kemaskini data dari Google Sheets, tulis timestamp
// ke settings/sync_signal. Semua pengguna lain yang login akan menerima
// isyarat ini melalui onSnapshot dan auto-refresh data mereka.
// --------------------------------------------------------------------------

/**
 * Tulis isyarat sync ke Firestore selepas admin berjaya refresh data.
 * Dipanggil oleh refreshGlobalData() sahaja.
 */
window._lastSentSyncId = null;
async function writeSyncSignalToFirestore() {
    if (typeof db === 'undefined' || !db || !db.collection) return;
    try {
        const syncId = Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        window._lastSentSyncId = syncId;
        
        const adminName = currentUser
            ? (currentUser.name || currentUser.email || "Admin")
            : "Admin";
            
        await db.collection("settings").doc("sync_signal").set({
            lastSync: firebase.firestore.FieldValue.serverTimestamp(),
            by: adminName,
            syncId: syncId
        });
        console.log("[SyncSignal] ✅ Isyarat sync dihantar ke Firestore oleh:", adminName);
    } catch (e) {
        console.warn("[SyncSignal] Gagal hantar isyarat sync:", e.message);
    }
}

/**
 * Refresh data dari Google Sheets secara senyap (tanpa loading besar).
 * Dipanggil oleh listener sync_signal pada pelajar/pensyarah.
 */
async function silentRefreshGlobalData() {
    // Elak panggilan berganda dalam masa singkat
    if (window._silentRefreshInProgress) return;
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.trim() === "") return;
    window._silentRefreshInProgress = true;
    try {
        console.log("[SyncSignal] 🔄 Memulakan silent refresh dari Google Sheets...");
        const data = await callGoogleScript("init");
        if (data && applyRemoteData(data)) {
            await mergeFirestoreStudentsData();
            populateGlobalSessionSelect();
            if (typeof renderPortalAnnouncements === "function") renderPortalAnnouncements();
            if (currentUser && activeTab) {
                try { renderTabData(activeTab); } catch(e) {}
            }
            showToast("✅ Data telah dikemas kini oleh admin.", "info");
            console.log("[SyncSignal] ✅ Silent refresh berjaya.");
        }
    } catch (e) {
        console.warn("[SyncSignal] Silent refresh gagal:", e.message);
    } finally {
        window._silentRefreshInProgress = false;
    }
}

// Helper untuk menghuraikan medan dokumen dari Firestore REST API
function parseFirestoreDocFields(fields) {
    if (!fields) return {};
    const obj = {};
    for (const k in fields) {
        const val = fields[k];
        if (val.stringValue !== undefined) obj[k] = val.stringValue;
        else if (val.booleanValue !== undefined) obj[k] = val.booleanValue;
        else if (val.integerValue !== undefined) obj[k] = parseInt(val.integerValue, 10);
        else if (val.doubleValue !== undefined) obj[k] = parseFloat(val.doubleValue);
        else if (val.timestampValue !== undefined) obj[k] = val.timestampValue;
        else if (val.mapValue !== undefined) obj[k] = parseFirestoreDocFields(val.mapValue.fields || {});
        else if (val.arrayValue !== undefined) obj[k] = (val.arrayValue.values || []).map(v => v.stringValue || v);
    }
    return obj;
}

// Mengambil senarai semua pelajar terus melalui HTTPS REST API
async function fetchStudentsFromFirestoreREST() {
    try {
        const url = "https://firestore.googleapis.com/v1/projects/myinternms/databases/(default)/documents/students?pageSize=500";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return null;
        const data = await res.json();
        const docs = data.documents || [];
        const students = [];
        docs.forEach(d => {
            const parsed = parseFirestoreDocFields(d.fields);
            if (parsed && parsed.regNo) students.push(parsed);
        });
        return students;
    } catch (e) {
        console.warn("[REST] Gagal mengambil pelajar melalui REST:", e.message);
        return null;
    }
}

/**
 * Baca semula data pelajar TERUS dari Firestore (kalis SDK error).
 * Dipanggil apabila sync_signal diterima dari GAS (Google Sheets Auto-Sync).
 */
async function silentRefreshFromFirestore() {
    if (window._silentRefreshInProgress) return;
    window._silentRefreshInProgress = true;
    try {
        console.log("[SyncSignal] 🔄 Memulakan silent refresh dari Firestore...");
        let incoming = [];

        // 1. Cuba guna Firestore SDK dengan timeout 3.5s
        if (typeof db !== 'undefined' && db && db.collection) {
            try {
                const snap = await Promise.race([
                    db.collection("students").get({ source: 'server' }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("SDK Timeout")), 3500))
                ]);
                if (snap && !snap.empty) {
                    snap.forEach(doc => {
                        const d = doc.data();
                        if (d && d.regNo) incoming.push(d);
                    });
                }
            } catch (sdkErr) {
                console.warn("[SyncSignal] SDK get gagal, bertukar ke REST API fallback:", sdkErr.message);
            }
        }

        // 2. Jika SDK gagal atau kosong, gunakan HTTPS REST API secara terus
        if (incoming.length === 0) {
            console.log("[SyncSignal] Mengambil data terus melalui HTTPS REST API...");
            const restStudents = await fetchStudentsFromFirestoreREST();
            if (restStudents && restStudents.length > 0) {
                incoming = restStudents;
            }
        }

        if (incoming.length > 0) {
            // Gabungkan dengan cache sedia ada supaya dokumen/profilePic tidak hilang
            const currentMap = new Map();
            (dbCache.students || []).forEach(s => {
                if (s && s.regNo) currentMap.set(String(s.regNo).trim().toUpperCase(), s);
            });
            incoming.forEach(st => {
                const reg = String(st.regNo).trim().toUpperCase();
                const existing = currentMap.get(reg) || {};
                // Gabungkan documents secara pintar: utamakan dokumen yang ada fail / status dihantar
                const mergedDocs = Object.assign({}, existing.documents || {});
                if (st.documents) {
                    Object.keys(st.documents).forEach(dk => {
                        const inDoc = st.documents[dk];
                        const exDoc = mergedDocs[dk];
                        if (inDoc && inDoc.status && inDoc.status !== "Belum Dihantar") {
                            mergedDocs[dk] = inDoc;
                        } else if (!exDoc) {
                            mergedDocs[dk] = inDoc;
                        }
                    });
                }
                currentMap.set(reg, Object.assign({}, existing, st, {
                    documents: mergedDocs,
                    profilePic: st.profilePic || existing.profilePic || ""
                }));
            });
            dbCache.students = Array.from(currentMap.values());
            normalizeStudentsCache();
            try { localStorage.setItem("upli_students", JSON.stringify(dbCache.students)); } catch(e) {}
            populateGlobalSessionSelect();
            if (typeof renderPortalAnnouncements === "function") {
                try { renderPortalAnnouncements(); } catch(e) {}
            }
            if (currentUser && activeTab && typeof renderTabData === "function") {
                try { renderTabData(activeTab); } catch(e) {}
            }
            if (typeof requestTabDataRender === "function") {
                try { requestTabDataRender(); } catch(e) {}
            }
            if (typeof renderAdminStudentsTable === "function") {
                try { renderAdminStudentsTable(); } catch(e) {}
            }
            if (typeof renderLecturerStudentsList === "function") {
                try { renderLecturerStudentsList(); } catch(e) {}
            }
            if (typeof updatePKLICountBadge === "function") {
                try { updatePKLICountBadge(); } catch(e) {}
            }
            showToast("✅ Data telah dikemas kini secara automatik.", "success");
            console.log("[SyncSignal] ✅ Silent refresh dari Firestore berjaya. Pelajar dimuat: " + incoming.length);
        }
    } catch (e) {
        console.warn("[SyncSignal] Silent refresh Firestore gagal:", e.message);
    } finally {
        window._silentRefreshInProgress = false;
    }
}

// ---------- Sync Getters — read from in-memory cache ----------
function getAdmins() { return dbCache.admins; }
function saveAdmins(data) { dbCache.admins = data; try{localStorage.setItem("upli_admins", JSON.stringify(data));}catch(e){} writeAdminsToFirestore(data); }

function getLecturers() { return dbCache.lecturers; }
function saveLecturers(data) { dbCache.lecturers = data; try{localStorage.setItem("upli_lecturers", JSON.stringify(data));}catch(e){} writeLecturersToFirestore(data); }

function sanitizeStudentQuotes(s) {
    if (!s) return s;
    if (s.name) s.name = cleanVal(s.name);
    if (s.tempatLI) s.tempatLI = cleanVal(s.tempatLI);
    if (s.daerah) s.daerah = cleanVal(s.daerah);
    if (s.pensyarahPemantauName) s.pensyarahPemantauName = cleanVal(s.pensyarahPemantauName);
    if (s.pensyarahPenilaiName) s.pensyarahPenilaiName = cleanVal(s.pensyarahPenilaiName);
    return s;
}

function getStudents() {
    if (Array.isArray(dbCache.students)) {
        dbCache.students.forEach(s => sanitizeStudentQuotes(s));
    }
    return dbCache.students;
}
function saveStudents(data, modifiedRegNo = null) { 
    if (Array.isArray(data)) {
        data.forEach(s => sanitizeStudentQuotes(s));
    }
    dbCache.students = data; 
    normalizeStudentsCache();
    try { localStorage.setItem("upli_students", JSON.stringify(dbCache.students)); } catch(e) {}
    
    if (modifiedRegNo === "none") {
        // Skip Firestore write (already handled via delete operations)
        return;
    }
    
    if (modifiedRegNo) {
        if (typeof modifiedRegNo === 'string') {
            const cleanTarget = String(modifiedRegNo).trim().toUpperCase();
            const student = data.find(s => String(s.regNo || "").trim().toUpperCase() === cleanTarget);
            if (student) writeStudentToFirestore(student);
        } else if (Array.isArray(modifiedRegNo)) {
            writeStudentsToFirestore(data, modifiedRegNo);
        }
    } else {
        writeStudentsToFirestore(data, modifiedRegNo); 
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
    let sSesi = String(student.sesi || "").toUpperCase().trim();
    let target = String(activeSession || "").toUpperCase().trim();

    // Jika tiada nilai sesi pada pelajar, TIDAK termasuk dalam mana-mana sesi
    if (!sSesi) return false;
    if (!target) return true;

    if (sSesi === target) return true;

    function normalizeKey(str) {
        let s = str.replace(/\s*-\s*FASA\s*\d+/gi, "").trim();
        s = s.replace(/\s*(JKA|JKM|JKE|JP|JPH)\b/gi, "").trim();
        s = s.replace(/[\.\:\-\_\s]+/g, " ");
        const match = s.match(/(?:SESI|SES)?\s*([12])\b/i);
        const sesNum = match ? match[1] : "";
        const years = s.match(/\d{2,4}/g) || [];
        const filteredYears = years.filter(y => y !== sesNum);
        return (sesNum + "_" + filteredYears.join("")).toUpperCase();
    }

    const k1 = normalizeKey(sSesi);
    const k2 = normalizeKey(target);

    // Mesti padankan TEPAT sahaja — jangan guna includes() kerana boleh sebabkan
    // Sesi 1 kelihatan dalam Sesi 2 (atau sebaliknya)
    if (k1 && k2 && k1 === k2) return true;

    return false;
}

function isValidSessionString(str) {
    if (!str || typeof str !== 'string') return false;
    const clean = str.trim();
    return clean.startsWith("Sesi") || /^Sesi\s*\d+/i.test(clean);
}

function getActiveSession() {
    const locked = localStorage.getItem("upli_locked_active_session");
    if (locked && locked.trim() && isValidSessionString(locked.trim())) {
        return locked.trim();
    }
    if (dbCache.activeSession && isValidSessionString(dbCache.activeSession)) {
        return dbCache.activeSession;
    }
    dbCache.activeSession = "Sesi 1:2026/2027";
    return dbCache.activeSession;
}

function saveActiveSession(val, isUserAction = true) {
    if (!val) return;
    const cleanValStr = val.trim();
    if (!isValidSessionString(cleanValStr)) {
        console.warn("Skipping invalid active session format:", cleanValStr);
        return;
    }
    dbCache.activeSession = cleanValStr;
    if (isUserAction) {
        try { localStorage.setItem("upli_locked_active_session", cleanValStr); } catch(e){}
    }
    try { localStorage.setItem("upli_active_session", cleanValStr); } catch(e){}
    writeSettingsToFirestore({ activeSession: cleanValStr });
}

function getLogs() { return dbCache.logs; }
window.logActivity = async function(action, details) {
    if (typeof db === 'undefined' || !db.collection) return;
    try {
        await db.collection("audit_logs").add({
            userEmail: currentEmail,
            role: currentRole,
            action: action,
            details: details,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        // Invalidate cache
        auditLogsCache = null;
    } catch (e) {
        console.error("Failed to write audit log:", e);
    }
};

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
    
    // Also write to comprehensive audit trail
    if (window.logActivity) {
        window.logActivity(type === "danger" ? "PADAM REKOD" : (type === "warning" ? "KEMASKINI" : "MAKLUMAT"), text);
    }
}

function getRubriks() { return dbCache.rubriks; }
function saveRubriks(data) { dbCache.rubriks = data; writeRubriksToFirestore(data); }

function normalizeDateStr(dateVal) {
    if (!dateVal) return "";
    let str = String(dateVal).trim();

    // If ISO timestamp e.g. 2026-07-24T12:12:00.000Z
    if (str.includes("T")) str = str.split("T")[0];

    // Try YYYY-MM-DD pattern
    const ymdMatch = str.match(/\b(\d{4})[\-\/\.](\d{1,2})[\-\/\.](\d{1,2})\b/);
    if (ymdMatch) {
        const y = ymdMatch[1];
        const m = String(ymdMatch[2]).padStart(2, '0');
        const d = String(ymdMatch[3]).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // Try DD-MM-YYYY pattern
    const dmyMatch = str.match(/\b(\d{1,2})[\-\/\.](\d{1,2})[\-\/\.](\d{4})\b/);
    if (dmyMatch) {
        const d = String(dmyMatch[1]).padStart(2, '0');
        const m = String(dmyMatch[2]).padStart(2, '0');
        const y = dmyMatch[3];
        return `${y}-${m}-${d}`;
    }

    // Try Malay / English text date pattern e.g. "24 Julai 2026" or "10 Oktober 2026"
    const months = {
        jan: "01", januari: "01", january: "01",
        feb: "02", februari: "02", february: "02",
        mac: "03", march: "03",
        apr: "04", april: "04",
        mei: "05", may: "05",
        jun: "06", june: "06",
        jul: "07", julai: "07", july: "07",
        ogo: "08", ogos: "08", aug: "08", august: "08",
        sep: "09", september: "09",
        okt: "10", oktober: "10", oct: "10", october: "10",
        nov: "11", november: "11",
        dis: "12", disember: "12", dec: "12", december: "12"
    };

    const textMatch = str.match(/\b(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})\b/);
    if (textMatch) {
        const d = String(textMatch[1]).padStart(2, '0');
        const mName = textMatch[2].toLowerCase();
        const m = months[mName];
        const y = textMatch[3];
        if (m) {
            return `${y}-${m}-${d}`;
        }
    }

    return "";
}

function getTodayDateStr() {
    const today = new Date();
    return today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0') + "-" + String(today.getDate()).padStart(2, '0');
}

function extractDateFromText(text) {
    if (!text) return "";
    const matches = text.match(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/g);
    if (matches) {
        for (let mStr of matches) {
            const parts = mStr.split(/[\/\-\.]/);
            const d = parseInt(parts[0]);
            const m = parseInt(parts[1]);
            const y = parseInt(parts[2]);
            if (!isNaN(d) && !isNaN(m) && !isNaN(y) && d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2020) {
                return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            }
        }
    }
    const isoMatches = text.match(/\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/g);
    if (isoMatches) {
        for (let mStr of isoMatches) {
            const parts = mStr.split(/[\/\-\.]/);
            const y = parseInt(parts[0]);
            const m = parseInt(parts[1]);
            const d = parseInt(parts[2]);
            if (!isNaN(d) && !isNaN(m) && !isNaN(y) && d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2020) {
                return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            }
        }
    }
    return "";
}

function getAnnouncementDate(a) {
    if (!a) return '';
    // PENTING: Hanya gunakan a.date yang disimpan dalam data.
    // Logik "ekstrak tarikh dari teks" telah menyebabkan tarikh admin ditimpa.
    // Firestore adalah sumber kebenaran — gunakan terus.
    const d = (a.date || '').trim();
    if (d && d !== '-') return d;
    return '';
}

function formatMalayDate(dateStr) {
    if (!dateStr || dateStr === "-" || typeof dateStr !== "string") return "-";
    let clean = dateStr.trim();
    if (clean.includes("T")) clean = clean.split("T")[0];
    if (clean.includes(" ")) clean = clean.split(" ")[0];

    const parts = clean.split(/[\-\/\.]+/);
    if (parts.length >= 3) {
        let y = parseInt(parts[0]);
        let m = parseInt(parts[1]) - 1;
        let d = parseInt(parts[2]);

        if (parts[2].length === 4) {
            d = parseInt(parts[0]);
            m = parseInt(parts[1]) - 1;
            y = parseInt(parts[2]);
        }

        if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 0 && m < 12 && d >= 1 && d <= 31) {
            const monthName = (typeof MALAY_MONTHS !== "undefined" && m >= 0 && m < MALAY_MONTHS.length) ? MALAY_MONTHS[m] : (m + 1);
            return `${d} ${monthName} ${y}`;
        }
    }
    return clean || "-";
}

function sanitizeAnnouncementsData(data) {
    // Fungsi ini telah dilumpuhkan.
    // Dahulu ia digunakan untuk membersihkan tarikh kotor, tetapi ia memadam
    // tarikh sah 2026-07-24 secara tidak sengaja.
    return data;
}

function mergeAnnouncementsWithLocal(incoming) {
    // LALUAN PINTAS (HOTFIX): Google Apps Script 'writeAnnouncements' rosak
    // (mengeluarkan TypeError: dataList.map is not a function).
    // Akibatnya, Google Sheets sentiasa menghantar data 'hantu' yang lama (termasuk 2026-07-24)
    // semasa SWR (syncData) berjalan.
    // Memandangkan Firestore adalah sumber data utama yang sentiasa betul, kita ABAIKAN data 
    // makluman dari Google Sheets buat masa ini untuk mengelakkan data hantu menimpa data Firestore.
    return dbCache.announcements || [];
}

function getAnnouncements() {
    // PENTING: Pulangkan data secara terus. Jangan panggil sanitizeAnnouncementsData
    // kerana fungsi tersebut mengandungi logik lama yang memadam tarikh "2026-07-24"
    // yang disangkakan tarikh lalai/kosong, menyebabkan Taklimat 1 hilang tarikhnya.
    return dbCache.announcements || [];
}

function saveAnnouncements(data) {
    // PENTING: Jangan jalankan sanitizeAnnouncementsData di sini.
    // sanitizeAnnouncementsData akan menimpa tarikh yang ditetapkan admin
    // dengan tarikh yang diekstrak dari kandungan teks (cth: "27 JULAI" → "2026-07-27").
    // Gunakan data terus — tarikh yang admin masukkan adalah muktamad.
    dbCache.announcements = data;
    writeAnnouncementsToFirestore(data);
    localStorage.setItem("upli_announcements", JSON.stringify(data));
    if (typeof renderPortalAnnouncements === "function") renderPortalAnnouncements();
    if (typeof renderAdminAnnouncements === "function") renderAdminAnnouncements();
    if (typeof requestTabDataRender === "function") requestTabDataRender();
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

function sanitizeDocId(str) {
    if (!str) return "DOC";
    return String(str).replace(/[^a-zA-Z0-9_-]/g, "_").trim().toUpperCase();
}

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

    // Query Firestore chunked storage
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

function dataURLtoBlobURL(dataurl) {
    if (!dataurl || typeof dataurl !== 'string') return "";
    try {
        const arr = dataurl.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
        const bstr = atob(arr[1] || arr[0]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        return URL.createObjectURL(blob);
    } catch(e) {
        return dataurl;
    }
}

async function deleteFileFromFirestore(regNo, docId) {
    try {
        const cleanReg = sanitizeDocId(regNo);
        const fileIdUpper = `${cleanReg}_${docId}`;
        const fileIdOrig = `${regNo}_${docId}`;
        
        if (typeof fileCache !== 'undefined' && fileCache) {
            delete fileCache[fileIdUpper];
            delete fileCache[fileIdOrig];
        }
        if (typeof db !== 'undefined' && db && db.collection) {
            const deletesUpper = Array.from({ length: 20 }, (_, i) =>
                db.collection("file_data").doc(`${fileIdUpper}_${i}`).delete().catch(() => { })
            );
            const deletesOrig = Array.from({ length: 20 }, (_, i) =>
                db.collection("file_data").doc(`${fileIdOrig}_${i}`).delete().catch(() => { })
            );
            await Promise.all([...deletesUpper, ...deletesOrig]);
        }
    } catch(e) {
        console.warn("deleteFileFromFirestore safe catch:", e.message);
    }
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
let activeAdminStudentDept = (function() {
    try { return sessionStorage.getItem("upli_admin_dept") || "JKA"; } catch(e) { return "JKA"; }
})();
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
    admin: document.getElementById("nav-admin"),
    developer: document.getElementById("nav-developer")
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
const developerLoginForm = document.getElementById("developer-login-form");
const registerAdminForm = document.getElementById("register-admin-form");

// Helper: render an avatar element with profile pic or initials
function renderProfileAvatar(el, profilePic, name) {
    if (!el) return;
    el.style.background = "none";
    el.style.backgroundImage = "none";
    el.style.backgroundColor = "transparent";

    const eyeIcon = `<div style="position:absolute; bottom:0; right:0; width:22px; height:22px; border-radius:50%; background:var(--color-primary); color:#fff; font-size:0.6rem; display:flex; align-items:center; justify-content:center; border: 2px solid var(--bg-card);"><i class="fa-solid fa-eye"></i></div>`;

    if (profilePic) {
        el.innerHTML = `
            <img src="${profilePic}" alt="Gambar Profil" style="width:100%; height:100%; object-fit:cover; border-radius:50%; display:block;">
            ${eyeIcon}
        `;
        el.style.setProperty("background", "transparent", "important");
        el.style.border = "none";
    } else {
        el.style.removeProperty("background");
        el.style.background = "#1e3a8a";
        el.innerHTML = `
            <span style="color:#fff; font-size:2rem; font-weight:800; line-height:1;">${getInitials(name || "?")}</span>
            ${eyeIcon}
        `;
    }
}

function viewProfilePic() {
    const modal = document.getElementById("profile-pic-view-modal");
    const img   = document.getElementById("profile-pic-view-img");
    const nameEl = document.getElementById("profile-pic-view-name");
    if (!modal || !img) return;

    if (currentUser && currentUser.profilePic) {
        img.src = currentUser.profilePic;
        img.style.display = "block";
        if (nameEl) nameEl.textContent = currentUser.name || "";
        modal.style.display = "flex";
    } else {
        // No pic — open upload dialog instead
        let input; if (currentRole === "admin") { input = document.getElementById("profile-pic-upload-admin-self"); } else { input = document.getElementById("profile-pic-upload-self"); }
        if (input) input.click();
    }
}

window.viewAnyProfilePic = function(picUrl, name) {
    if (!picUrl) return;
    const modal = document.getElementById("profile-pic-view-modal");
    const img   = document.getElementById("profile-pic-view-img");
    const nameEl = document.getElementById("profile-pic-view-name");
    if (!modal || !img) return;

    img.src = picUrl;
    img.style.display = "block";
    if (nameEl) nameEl.textContent = name || "";
    modal.style.display = "flex";
};

function closeProfilePicModal() {
    const modal = document.getElementById("profile-pic-view-modal");
    if (modal) modal.style.display = "none";
}

window.viewProfilePic       = viewProfilePic;
window.closeProfilePicModal = closeProfilePicModal;

function updateUserAvatars(user) {
    const pic = (user && user.profilePic) ? user.profilePic : null;
    const name = user ? (user.name || user.displayName || "Pengguna") : "Pengguna";

    if (sidebarUserAvatar) {
        if (pic) {
            sidebarUserAvatar.style.setProperty("padding", "0", "important");
            sidebarUserAvatar.style.setProperty("overflow", "hidden", "important");
            sidebarUserAvatar.style.setProperty("background", "transparent", "important");
            sidebarUserAvatar.style.setProperty("border", "none", "important");
            sidebarUserAvatar.innerHTML = `<img src="${pic}" alt="${name}" style="width:100%; height:100%; object-fit:cover; border-radius:50%; display:block;">`;
        } else {
            sidebarUserAvatar.style.removeProperty("padding");
            sidebarUserAvatar.style.removeProperty("overflow");
            sidebarUserAvatar.style.removeProperty("background");
            sidebarUserAvatar.style.removeProperty("border");
            sidebarUserAvatar.innerHTML = "";
            sidebarUserAvatar.textContent = getInitials(name);
        }
    }

    if (headerUserAvatar) {
        if (pic) {
            headerUserAvatar.style.setProperty("padding", "0", "important");
            headerUserAvatar.style.setProperty("overflow", "hidden", "important");
            headerUserAvatar.style.setProperty("background", "transparent", "important");
            headerUserAvatar.style.setProperty("border", "none", "important");
            headerUserAvatar.innerHTML = `<img src="${pic}" alt="${name}" style="width:100%; height:100%; object-fit:cover; border-radius:50%; display:block;">`;
        } else {
            headerUserAvatar.style.removeProperty("padding");
            headerUserAvatar.style.removeProperty("overflow");
            headerUserAvatar.style.removeProperty("background");
            headerUserAvatar.style.removeProperty("border");
            headerUserAvatar.innerHTML = "";
            headerUserAvatar.textContent = getInitials(name);
        }
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
function showConfirm(message, onConfirm, title = "Pengesahan Diperlukan", confirmLabel = "Ya, Padam Fail", cancelLabel = "Kembali") {
    let overlay = document.getElementById("custom-confirm-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "custom-confirm-overlay";
        overlay.style.cssText = "display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.85); backdrop-filter:blur(6px); z-index:999999; align-items:center; justify-content:center; padding:15px;";
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div style="background:#ffffff; border-radius:16px; max-width:420px; width:100%; padding:24px; box-shadow:0 20px 50px rgba(0,0,0,0.3); text-align:center;">
            <div style="width:50px; height:50px; border-radius:50%; background:#fef2f2; color:#dc2626; display:flex; align-items:center; justify-content:center; font-size:1.5rem; margin:0 auto 15px auto;">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 id="custom-confirm-title" style="margin:0 0 10px 0; font-family:'Outfit',sans-serif; color:#0f172a; font-size:1.2rem; font-weight:800;">${title}</h3>
            <p id="custom-confirm-message" style="margin:0 0 20px 0; color:#475569; font-size:0.9rem; line-height:1.5;">${message}</p>
            <div style="display:flex; gap:10px; justify-content:center;">
                <button id="custom-confirm-cancel" style="flex:1; padding:10px 16px; border-radius:10px; border:1px solid #cbd5e1; background:#f8fafc; color:#475569; font-weight:700; cursor:pointer;">${cancelLabel}</button>
                <button id="custom-confirm-ok" style="flex:1; padding:10px 16px; border-radius:10px; border:none; background:#dc2626; color:#ffffff; font-weight:700; cursor:pointer; box-shadow:0 4px 12px rgba(220,38,38,0.3);">${confirmLabel}</button>
            </div>
        </div>
    `;

    overlay.style.display = "flex";

    const okBtn = document.getElementById("custom-confirm-ok");
    const cancelBtn = document.getElementById("custom-confirm-cancel");

    function closeModal() {
        overlay.style.display = "none";
    }

    okBtn.addEventListener("click", function() {
        closeModal();
        if (typeof onConfirm === "function") {
            try {
                const res = onConfirm();
                if (res && typeof res.catch === 'function') {
                    res.catch(err => console.error("showConfirm onConfirm error:", err));
                }
            } catch(e) {
                console.error("showConfirm sync error:", e);
            }
        }
    });

    cancelBtn.addEventListener("click", closeModal);

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

// Mobile navigation drawer & backdrop controls
function closeMobileSidebar() {
    if (sidebar) sidebar.classList.remove("active");
    const backdrop = document.getElementById("sidebar-backdrop");
    if (backdrop) backdrop.classList.remove("active");
}

window.switchPortalRoleLogin = function(role) {
    if (typeof switchPortalTab === "function") {
        switchPortalTab('login');
    }
    const roleBtn = document.querySelector(`.login-tabs .tab-btn[data-role="${role}"]`);
    if (roleBtn) {
        roleBtn.click();
    }
    if (window.innerWidth <= 992) {
        togglePortalMobileNav(false);
    }
};


function togglePortalMobileNav(forceState) {
    const portalSidebar = document.querySelector(".portal-sidebar");
    const backdrop = document.getElementById("portal-sidebar-backdrop");
    if (!portalSidebar) return;
    
    let newState;
    if (typeof forceState === "boolean") {
        newState = forceState;
    } else {
        newState = !portalSidebar.classList.contains("mobile-open");
    }

    if (newState) {
        portalSidebar.classList.add("mobile-open");
        portalSidebar.classList.add("active");
        if (backdrop) backdrop.classList.add("active");
    } else {
        portalSidebar.classList.remove("mobile-open");
        portalSidebar.classList.remove("active");
        if (backdrop) backdrop.classList.remove("active");
    }
}

// Close portal sidebar automatically when any portal nav item is clicked on mobile
document.querySelectorAll(".portal-nav-item").forEach(item => {
    item.addEventListener("click", () => {
        if (window.innerWidth <= 992) {
            togglePortalMobileNav(false);
        }
    });
});


if (sidebarToggle) {
    sidebarToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        if (sidebar) {
            const isActive = sidebar.classList.toggle("active");
            const backdrop = document.getElementById("sidebar-backdrop");
            if (backdrop) {
                if (isActive) backdrop.classList.add("active");
                else backdrop.classList.remove("active");
            }
        }
    });
}

// Close sidebar on navigation item click or outside click (mobile view <= 992px)
document.addEventListener("click", (e) => {
    if (window.innerWidth <= 992 && sidebar && sidebar.classList.contains("active")) {
        if (!sidebar.contains(e.target) && sidebarToggle && !sidebarToggle.contains(e.target)) {
            closeMobileSidebar();
        }
    }
});

// Close sidebar automatically when any nav item is clicked on mobile
document.querySelectorAll(".sidebar .nav-item").forEach(item => {
    item.addEventListener("click", () => {
        if (window.innerWidth <= 992) {
            closeMobileSidebar();
        }
    });
});


// --------------------------------------------------------------------------
// D. AUTHENTICATION & VIEWS CONTROL
// --------------------------------------------------------------------------

// Switch Login Roles Tabs
document.querySelectorAll(".login-tabs .tab-btn").forEach(btn => {
    btn.addEventListener("click", function () {
        document.querySelectorAll(".login-tabs .tab-btn").forEach(b => b.classList.remove("active"));
        this.classList.add("active");

        document.querySelectorAll(".login-form").forEach(f => f.classList.remove("active"));
        const role = this.dataset.role;
        const formEl = document.getElementById(`${role}-login-form`);
        if (formEl) formEl.classList.add("active");
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
        const cleanReg = String(regNo).trim().toUpperCase();

        if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
            const student = (dbCache.students || []).find(s => s && String(s.regNo).trim().toUpperCase() === cleanReg);
            if (student) {
                loginUser(student, "student");
            } else {
                showToast("No. Pendaftaran tidak wujud dalam sistem! Sila hubungi Admin.", "error");
            }
            return;
        }

        if (typeof db !== 'undefined' && db && db.collection) {
            const docSnap = await db.collection("students").doc(sanitizeDocId(cleanReg)).get().catch(() => null);
            if (docSnap && docSnap.exists) {
                const studentData = docSnap.data();
                if (!dbCache.students) dbCache.students = [];
                const existingIdx = dbCache.students.findIndex(s => s && String(s.regNo).trim().toUpperCase() === cleanReg);
                if (existingIdx !== -1) {
                    dbCache.students[existingIdx] = studentData;
                } else {
                    dbCache.students.push(studentData);
                }
                normalizeStudentsCache();
                loginUser(studentData, "student");
                return;
            }
        }

        // Fallback to local dbCache memory / localStorage
        const localFound = (dbCache.students || []).find(s => s && String(s.regNo).trim().toUpperCase() === cleanReg);
        if (localFound) {
            loginUser(localFound, "student");
        } else {
            showToast("No. Pendaftaran tidak wujud dalam sistem! Sila hubungi Admin.", "error");
        }
    } catch (err) {
        console.error("Student login error:", err);
        const localFound = (dbCache.students || []).find(s => s && String(s.regNo).trim().toUpperCase() === regNo);
        if (localFound) {
            loginUser(localFound, "student");
        } else {
            showToast("Ralat menyambung ke pangkalan data. Sila cuba lagi.", "error");
        }
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

// --- SUBMIT: Developer Login ---
if (developerLoginForm) {
    developerLoginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = document.getElementById("developer-email").value.trim().toLowerCase();
        const password = document.getElementById("developer-password").value;

        if (email === "upli@polikk.edu.my" && password === "Malaysia@2026") {
            const devObj = {
                name: "Developer",
                email: email,
                role: "developer"
            };
            loginUser(devObj, "developer");
            addLog("info", "Pembangun (Developer) berjaya log masuk.");
        } else {
            showToast("Akses ditolak: Kredensial tidak sah!", "error");
        }
    });
}

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
    if (user && !user.role) user.role = role;
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
    if (role === "developer") displayBadge = "Sistem Admin";

    userRoleBadge.textContent = displayBadge;
    headerUserRole.textContent = displayBadge;

    // Reset inputs
    studentLoginForm.reset();
    lecturerLoginForm.reset();
    adminLoginForm.reset();
    if (developerLoginForm) developerLoginForm.reset();

    // Global Session Dropdown logic: Show only for Lecturer, Admin, Developer
    const refreshBtn = document.getElementById("btn-refresh-global-data");
    const exportSheetsBtn = document.getElementById("btn-export-phone-to-sheets");
    if (role === "lecturer" || role === "admin" || role === "developer") {
        populateGlobalSessionSelect();
        sessionSelectContainer.style.display = "flex";
        if (refreshBtn) refreshBtn.style.display = "inline-flex";
        // Export button only visible for admin (hidden initially — shown per tab)
        if (exportSheetsBtn) exportSheetsBtn.style.display = "none";
    } else {
        sessionSelectContainer.style.display = "none";
        if (refreshBtn) refreshBtn.style.display = "none";
        if (exportSheetsBtn) exportSheetsBtn.style.display = "none";
    }

    // Show Nav Group for Role
    Object.keys(navGroups).forEach(g => {
        if(navGroups[g]) {
            navGroups[g].style.display = g === role ? "flex" : "none";
        }
    });

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

    // Disable browser automatic scroll restoration to prevent landing at old scroll position
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    // Switch to main interface — explicitly set display to handle inline style override
    loginView.style.display = "none";          // Force hide (overrides inline style)
    loginView.classList.remove("active");
    dashboardLayout.style.display = "flex";
    dashboardLayout.classList.add("active");

    // Reset scroll position across all possible scroll containers & frame cycles
    const resetScrollToTop = () => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
        const mc = document.querySelector(".main-content");
        if (mc) mc.scrollTop = 0;
        const cb = document.querySelector(".content-body");
        if (cb) cb.scrollTop = 0;
        const dl = document.getElementById("dashboard-layout");
        if (dl) dl.scrollTop = 0;
    };

    resetScrollToTop();
    requestAnimationFrame(() => {
        resetScrollToTop();
        setTimeout(resetScrollToTop, 50);
        setTimeout(resetScrollToTop, 150);
        setTimeout(resetScrollToTop, 350);
    });

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

    let active = getActiveSession();
    if (!active || !cleanSessions.includes(active)) {
        active = cleanSessions[0];
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

    // Refresh PKLI badge counts immediately when session changes
    if (typeof updatePKLICountBadge === "function") updatePKLICountBadge();

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

    dashboardLayout.style.display = "none";
    dashboardLayout.classList.remove("active");
    loginView.classList.add("active");
    loginView.style.display = "flex"; // Restore inline style to let CSS handle visibility
    switchPortalTab('dashboard');
    sessionSelectContainer.style.display = "none";
    applyDeptTheme(null); // Clear department theme on logout
    showToast("Anda telah log keluar dengan selamat.", "info");
    window.scrollTo(0, 0);
});

window.showPublicPortalFromDashboard = function() {
    const loginView = document.getElementById("portal-view");
    const dashboardLayout = document.getElementById("dashboard-layout");
    if (dashboardLayout) {
        dashboardLayout.style.display = "none";
        dashboardLayout.classList.remove("active");
    }
    if (loginView) {
        loginView.style.display = "flex";
        loginView.classList.add("active");
    }
    if (typeof switchPortalTab === "function") switchPortalTab('dashboard');
    if (typeof togglePortalMobileNav === "function") togglePortalMobileNav(false);
    window.scrollTo(0, 0);
};



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

    // Show export-to-sheets button only for admin on admin-students tab
    const exportBtn = document.getElementById("btn-export-phone-to-sheets");
    if (exportBtn) {
        const isAdminStudentsTab = tabId === "admin-students";
        const isAdmin = currentUser && currentUser.role === "admin";
        exportBtn.style.display = (isAdminStudentsTab && isAdmin && GOOGLE_SCRIPT_URL) ? "inline-flex" : "none";
    }

    const resetTabScroll = () => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
        const mc = document.querySelector(".main-content");
        if (mc) mc.scrollTop = 0;
    };

    resetTabScroll();

    // Show skeleton immediately, then render real content on next frame
    const skHandle = showSkeletonForTab(tabId);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            renderTabData(tabId);
            removeSkeletonOverlay(skHandle);
            resetTabScroll();
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

let _renderTimeout = null;
function requestTabDataRender() {
    if (_renderTimeout) clearTimeout(_renderTimeout);
    _renderTimeout = setTimeout(() => {
        if (typeof activeTab !== "undefined" && activeTab) {
            try { renderTabData(activeTab); } catch(e) {}
        }
        if (typeof renderPortalAnnouncements === "function") {
            try { renderPortalAnnouncements(); } catch(e) {}
        }
    }, 150);
}
window.requestTabDataRender = requestTabDataRender;

let _lsStudentsTimeout = null;
function saveStudentsLocalStorage(students) {
    if (!students || !Array.isArray(students)) return;
    if (students.length === 0) {
        try {
            const existing = JSON.parse(localStorage.getItem("upli_students") || "[]");
            if (Array.isArray(existing) && existing.length > 0) {
                console.warn("[Perlindungan Cache] Mencuba menyimpan 0 pelajar ke localStorage. Tindakan dibatalkan untuk mengelak kehilangan data.");
                return;
            }
        } catch(e) {}
    }
    if (_lsStudentsTimeout) clearTimeout(_lsStudentsTimeout);
    _lsStudentsTimeout = setTimeout(() => {
        try { localStorage.setItem("upli_students", JSON.stringify(students)); } catch(e){}
    }, 300);
}
window.saveStudentsLocalStorage = saveStudentsLocalStorage;

function renderTabData(tabId) {
    try {
        if (typeof updateAdminNotifications === "function") updateAdminNotifications();
        if (tabId === "student-dashboard") renderStudentDashboard();
        if (tabId === "student-documents") renderStudentDocuments();

        if (tabId === "lecturer-dashboard") renderLecturerDashboard();
        if (tabId === "lecturer-students") renderLecturerStudentsList();
        if (tabId === "lecturer-pa") renderLecturerPAStudentsTable();

        if (tabId === "admin-dashboard") renderAdminDashboard();
        if (tabId === "admin-students") {
            renderAdminStudentsTable();
            if (typeof updatePKLICountBadge === "function") updatePKLICountBadge();
        }
        if (tabId === "admin-lecturers") renderAdminLecturerAssignTable();
        if (tabId === "admin-pa") renderAdminPATable();
        if (tabId === "admin-lecturer-list") renderAdminLecturerList();
        if (tabId === "admin-announcements") renderAdminAnnouncements();
        if (tabId === "admin-admins") renderAdminAdminsTable();
        if (tabId === "admin-rubrik") renderAdminRubrik();
        if (tabId === "rubrik-viewer") renderRubrikViewer();
        if (tabId === "developer-dashboard") populateDeveloperPanel();
        if (tabId === "developer-documents") renderDevDocLists();
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
    if (!currentUser) return;
    const students = getStudents();
    const cleanReg = String(currentUser.regNo || "").trim().toUpperCase();
    const updatedUser = students.find(s => String(s.regNo || "").trim().toUpperCase() === cleanReg);
    if (updatedUser) {
        if (currentUser.documents) {
            updatedUser.documents = updatedUser.documents || {};
            Object.keys(currentUser.documents).forEach(dKey => {
                const cDoc = currentUser.documents[dKey];
                const uDoc = updatedUser.documents[dKey];
                if (cDoc && cDoc.status && cDoc.status !== "Belum Dihantar") {
                    if (!uDoc || uDoc.status === "Belum Dihantar" || !uDoc.fileName) {
                        updatedUser.documents[dKey] = cDoc;
                    }
                }
            });
        }
        currentUser = updatedUser;
    }

    const elWelcomeName = document.getElementById("student-welcome-name");
    if (elWelcomeName) elWelcomeName.textContent = currentUser.name;

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

    const elApproved = document.getElementById("student-stat-approved");
    if (elApproved) elApproved.textContent = approved;

    const elPending = document.getElementById("student-stat-pending");
    if (elPending) elPending.textContent = pending;

    const elRejected = document.getElementById("student-stat-rejected");
    if (elRejected) elRejected.textContent = rejected;

    const elMissing = document.getElementById("student-stat-missing");
    if (elMissing) elMissing.textContent = missing;

    const progressPercent = (approved / totalDocs) * 100;
    const progressBar = document.getElementById("student-progress-bar");
    if (progressBar) progressBar.style.width = `${progressPercent}%`;

    const elProgressText = document.getElementById("student-progress-text");
    if (elProgressText) elProgressText.textContent = `${approved}/${totalDocs} Diluluskan`;

    // Render Sesi, Company & Monitors & Evaluators
    const elSessionDisplay = document.getElementById("student-session-display");
    if (elSessionDisplay) elSessionDisplay.textContent = currentUser.sesi || "Sesi 1:2026/2027";

    const elTempatLI = document.getElementById("student-tempat-li");
    if (elTempatLI) elTempatLI.textContent = currentUser.tempatLI || "Belum Ditentukan";

    const lecturers = getLecturers();
    const pemantau = lecturers.find(l => l.email === currentUser.pensyarahPemantau);
    const penilai = lecturers.find(l => l.email === currentUser.pensyarahPenilai);

    const pemantauNameEl = document.getElementById("student-pemantau-name");
    const pemantauEmailEl = document.getElementById("student-pemantau-email");
    const penilaiNameEl = document.getElementById("student-penilai-name");
    const penilaiEmailEl = document.getElementById("student-penilai-email");
    const penilaiRow = document.getElementById("student-penilai-row");

    if (pemantau) {
        if (pemantauNameEl) pemantauNameEl.textContent = currentUser.pensyarahPemantauName || pemantau.name;
        if (pemantauEmailEl) pemantauEmailEl.textContent = pemantau.email;
    } else {
        if (pemantauNameEl) pemantauNameEl.textContent = currentUser.pensyarahPemantauName || currentUser.pensyarahPemantau || "Belum Diagihkan";
        if (pemantauEmailEl) pemantauEmailEl.textContent = currentUser.pensyarahPemantau ? currentUser.pensyarahPemantau : "";
    }

    if (studentHasPenilai(currentUser)) {
        if (penilaiRow) penilaiRow.style.display = "flex";
        if (penilai) {
            if (penilaiNameEl) penilaiNameEl.textContent = currentUser.pensyarahPenilaiName || penilai.name;
            if (penilaiEmailEl) penilaiEmailEl.textContent = penilai.email;
        } else {
            if (penilaiNameEl) penilaiNameEl.textContent = currentUser.pensyarahPenilaiName || currentUser.pensyarahPenilai || "Belum Diagihkan";
            if (penilaiEmailEl) penilaiEmailEl.textContent = currentUser.pensyarahPenilai ? currentUser.pensyarahPenilai : "";
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
        renderProfileAvatar(selfAvatarEl, currentUser.profilePic, currentUser.name);
    }

    // Update theme
    applyDeptTheme(currentUser.jabatan);
}

function renderStudentDocuments() {
    if (currentRole !== "student" || !currentUser) return;

    const students = getStudents();
    const cleanReg = String(currentUser.regNo || "").trim().toUpperCase();
    const updatedUser = students.find(s => String(s.regNo || "").trim().toUpperCase() === cleanReg);
    if (updatedUser) {
        if (currentUser.documents) {
            updatedUser.documents = updatedUser.documents || {};
            Object.keys(currentUser.documents).forEach(dKey => {
                const cDoc = currentUser.documents[dKey];
                const uDoc = updatedUser.documents[dKey];
                if (cDoc && cDoc.status && cDoc.status !== "Belum Dihantar") {
                    if (!uDoc || uDoc.status === "Belum Dihantar" || !uDoc.fileName) {
                        updatedUser.documents[dKey] = cDoc;
                    }
                }
            });
        }
        currentUser = updatedUser;
    }

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

            let statusClass = "badge-danger"; // Default for Belum Dihantar is RED
            if (status === "Belum Dihantar") statusClass = "badge-danger";
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
                        <span class="feedback-title">Ulasan Pensyarah:</span>
                        <p class="feedback-text">"${doc.feedback}"</p>
                    </div>
                `;
            }

            if (status !== "Belum Dihantar" && doc.fileName) {
                cardBody += `
                    <div class="uploaded-file-info">
                        <div style="display:flex; align-items:center; gap:10px; min-width:0; flex-grow:1;">
                            <i class="fa-solid fa-file-pdf file-icon"></i>
                            <div class="file-meta-mini" style="min-width:0;">
                                <span class="file-name-mini" title="${doc.fileName}">${doc.fileName}</span>
                                <span class="file-size-mini">${doc.fileSize} • ${doc.uploadDate}</span>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                            <button class="btn btn-sm btn-icon upli-papar-btn" data-regNo="${currentUser.regNo}" data-docId="${key}" title="Lihat Dokumen" style="border-radius: 6px; padding: 6px 12px; font-weight: 800; background: #0284c7 !important; color: #ffffff !important; border: 1.5px solid #38bdf8 !important; cursor: pointer; box-shadow: 0 2px 6px rgba(2,132,199,0.3);">
                                <i class="fa-solid fa-eye" style="color: #ffffff !important;"></i> Papar
                            </button>
                            ${status !== "Diterima" ? `
                            <button class="btn btn-sm btn-icon upli-padam-btn" data-docId="${key}" title="Padam Fail" style="border-radius: 6px; padding: 6px 12px; font-weight: 800; background: #dc2626 !important; color: #ffffff !important; border: 1.5px solid #fca5a5 !important; cursor: pointer; box-shadow: 0 2px 6px rgba(220,38,38,0.3);">
                                <i class="fa-solid fa-trash-can" style="color: #ffffff !important;"></i> Padam
                            </button>
                            ` : ''}
                        </div>
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
                } else if (key === "appendix_e2" || key === "appendix_2" || key === "appendix_e3") {
                    cardBody += `
                        <div style="background: rgba(234,179,8,0.03); border: 1.5px dashed rgba(234,179,8,0.3); border-radius: 12px; padding: 20px 15px; text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center; justify-content: center;">
                            <i class="fa-solid fa-user-tie" style="font-size: 1.8rem; color: #ca8a04;"></i>
                            <span style="font-size: 0.8rem; font-weight: 700; color: #ca8a04;">Tindakan Pensyarah Sahaja</span>
                            <span style="font-size: 0.75rem; color: var(--text-secondary); max-width: 250px; line-height: 1.4; margin:0;">
                                Borang ini hanya boleh dimuat naik dan disahkan oleh Pensyarah Pemantau/Penilai anda.
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
            } else if (status === "Dalam Semakan") {
                cardBody += `
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <button class="btn btn-secondary btn-block btn-sm" disabled style="background: rgba(234,179,8,0.05); color: var(--color-primary); border-color: rgba(234,179,8,0.2);">
                            <i class="fa-solid fa-spinner fa-spin"></i> Menunggu Semakan
                        </button>
                        <button class="btn btn-danger btn-block btn-sm upli-padam-btn" data-docId="${key}" onclick="cancelStudentDocumentSubmission('${key}')" style="background: #ffffff; color: #dc2626; border: 1.5px solid #dc2626; padding: 6px 10px; font-weight:600; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='#ffffff'">
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

    // Bind Papar/Padam buttons via addEventListener (safer than inline onclick)
    setTimeout(bindStudentDocButtons, 0);
}

// After rendering student docs, bind Papar/Padam buttons via data-attributes
function bindStudentDocButtons() {
    document.querySelectorAll(".upli-papar-btn").forEach(btn => {
        // Remove existing listeners by cloning
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener("click", function() {
            const reg = this.getAttribute("data-regno") || this.getAttribute("data-regNo") || (currentUser && currentUser.regNo);
            const docId = this.getAttribute("data-docid") || this.getAttribute("data-docId");
            if (!reg || !docId) {
                showToast("Maklumat dokumen tidak lengkap. Sila muat semula halaman.", "error");
                console.error("Papar btn: missing reg or docId", {reg, docId, dataset: this.dataset});
                return;
            }
            openDocumentViewer(reg, docId);
        });
    });
    document.querySelectorAll(".upli-padam-btn").forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener("click", function() {
            const docId = this.getAttribute("data-docid") || this.getAttribute("data-docId");
            if (!docId) {
                showToast("ID dokumen tidak dijumpai. Sila muat semula halaman.", "error");
                console.error("Padam btn: missing docId", this.dataset);
                return;
            }
            cancelStudentDocumentSubmission(docId);
        });
    });
}

window.executeDeleteDocument = async function(docId, customReg = null) {
    let targetReg = customReg || (currentUser ? currentUser.regNo : null);
    if (!targetReg) {
        showToast("Sesi pengguna tidak ditemui. Sila cuba lagi.", "error");
        return;
    }
    const cleanReg = sanitizeDocId(targetReg);
    const students = getStudents();

    let studentObj = students.find(s => sanitizeDocId(s.regNo) === cleanReg);
    if (!studentObj && currentUser && sanitizeDocId(currentUser.regNo) === cleanReg) {
        studentObj = currentUser;
    }
    if (!studentObj) {
        showToast("Maklumat pelajar tidak ditemui untuk operasi padam.", "error");
        return;
    }

    const docMeta = getDocMetadata(docId, studentObj);
    const docObj = (studentObj && studentObj.documents && studentObj.documents[docId]) ? studentObj.documents[docId] : null;
    const fileId = docObj ? (docObj.fileId || docObj.driveFileId) : null;

    if (!fileId) {
        alert("DEBUG UPLI: fileId tiada! Data dokumen: " + JSON.stringify(docObj));
    }

    const blankDoc = {
        status: "Belum Dihantar",
        fileName: "",
        fileSize: "",
        uploadDate: "",
        feedback: "",
        fileData: "",
        fileUrl: "",
        fileRef: ""
    };

    // 1. Instantly update in-memory currentUser & persistent browser storage
    if (currentUser && sanitizeDocId(currentUser.regNo) === cleanReg) {
        if (!currentUser.documents) currentUser.documents = {};
        currentUser.documents[docId] = { ...blankDoc };
        try {
            localStorage.setItem("upli_current_user", JSON.stringify(currentUser));
            sessionStorage.setItem("upli_current_user", JSON.stringify(currentUser));
            sessionStorage.setItem("upli_user", JSON.stringify(currentUser));
        } catch(e) {}
    }

    // 2. Instantly update in-memory students array & dbCache
    const studentIdx = students.findIndex(s => sanitizeDocId(s.regNo) === cleanReg);
    if (studentIdx !== -1) {
        if (!students[studentIdx].documents) students[studentIdx].documents = {};
        students[studentIdx].documents[docId] = { ...blankDoc };
        dbCache.students[studentIdx] = students[studentIdx];
        try {
            localStorage.setItem("upli_students", JSON.stringify(dbCache.students));
        } catch(e) {}
    }

    // 3. Immediately re-render UI so user sees "Belum Dihantar" INSTANTLY (< 10ms!)
    if (currentRole === "student") {
        renderStudentDocuments();
        renderStudentDashboard();
    } else {
        renderAdminStudentsTable();
        renderAdminDashboard();
        if (typeof renderLecturerDashboard === "function") renderLecturerDashboard();
    }

    // Close any open review modal
    const reviewModal = document.getElementById("document-review-modal") || document.getElementById("document-detail-modal");
    if (reviewModal && reviewModal.classList.contains("active")) {
        reviewModal.classList.remove("active");
    }

    showToast(`Dokumen "${docMeta.title}" berjaya dipadamkan.`, "success");

    // 4. Perform cloud deletion synchronously for Google Drive
    deleteFileFromFirestore(cleanReg, docId).catch(() => {});
    if (fileId && typeof callGoogleScript === "function") {
        showToast("Memadam dari pelayan Google Drive...", "info");
        try {
            await callGoogleScript("deleteFile", { fileId: fileId, regNo: cleanReg, docId: docId });
        } catch(e) {}
    }

    if (typeof db !== "undefined" && db && db.collection) {
        try {
            const docRefUpper = db.collection("students").doc(cleanReg);
            const docRefOrig = db.collection("students").doc(targetReg);
            if (typeof firebase !== "undefined" && firebase.firestore && firebase.firestore.FieldValue) {
                await docRefUpper.update({ [`documents.${docId}`]: firebase.firestore.FieldValue.delete() }).catch(() => {});
                if (cleanReg !== targetReg) {
                    await docRefOrig.update({ [`documents.${docId}`]: firebase.firestore.FieldValue.delete() }).catch(() => {});
                }
            }
            await docRefUpper.set({ documents: { [docId]: blankDoc } }, { merge: true }).catch(() => {});
        } catch(e) {}
    }
};

window.cancelStudentDocumentSubmission = function(docId, customReg = null) {
    alert("DEBUG UPLI: Butang Padam Ditekan (Pelajar)!");
    const targetReg = customReg || (currentUser ? currentUser.regNo : null);
    const cleanReg = sanitizeDocId(targetReg);
    const studentObj = (currentUser && sanitizeDocId(currentUser.regNo) === cleanReg) ? currentUser : getStudents().find(s => sanitizeDocId(s.regNo) === cleanReg);
    const docMeta = getDocMetadata(docId, studentObj);
    
    showConfirm(
        `Adakah anda pasti mahu membatalkan penyerahan untuk "${docMeta.title}"? Fail akan dipadamkan daripada pengkalan data.`,
        function() {
            executeDeleteDocument(docId, customReg);
        },
        "Padam Penyerahan Dokumen",
        "Ya, Padam Fail",
        "Kembali"
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

    // Calculate Department Statistics for Lecturer View
    let deptTotal = filteredStudents.length;
    let deptComplete = 0;
    let deptInReview = 0;
    let deptPending = 0;

    filteredStudents.forEach(s => {
        const requiredDocs = getStudentDocsList(s);
        let complete = requiredDocs.length > 0 && requiredDocs.every(d => s.documents && s.documents[d.id] && s.documents[d.id].status === "Diterima");
        let inReview = requiredDocs.some(d => s.documents && s.documents[d.id] && s.documents[d.id].status === "Dalam Semakan");
        if (complete) {
            deptComplete++;
        } else if (inReview) {
            deptInReview++;
        } else {
            deptPending++;
        }
    });

    const elTotal = document.getElementById("lecturer-stat-total-students");
    const elComplete = document.getElementById("lecturer-stat-complete-students");
    const elReview = document.getElementById("lecturer-stat-review-students");
    const elPending = document.getElementById("lecturer-stat-pending-students");

    if (elTotal) elTotal.textContent = deptTotal;
    if (elComplete) elComplete.textContent = deptComplete;
    if (elReview) elReview.textContent = deptInReview;
    if (elPending) elPending.textContent = deptPending;

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

        let avatarStyle = `style="cursor:pointer; transition: transform 0.15s, box-shadow 0.15s;"`;
        let avatarContent = getInitials(s.name);
        if (s.profilePic) {
            avatarStyle = `style="background-image: url(${s.profilePic}) !important; background-size: cover !important; background-position: center !important; cursor:pointer; transition: transform 0.15s, box-shadow 0.15s;"`;
            avatarContent = "";
        }

        rowsHtml += `
            <tr class="student-table-row" data-dept="${s.jabatan}">
                <td>
                    <div class="table-student-cell">
                        <div class="avatar mini-avatar" onclick="showStudentProfilePopup('${s.regNo}')" title="Lihat profil ${s.name}" ${avatarStyle} onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 4px 14px rgba(99,102,241,0.4)';" onmouseout="this.style.transform=''; this.style.boxShadow='';">${avatarContent}</div>
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

        const userEmail = (currentUser?.email || "").trim().toLowerCase();
        const userName = (currentUser?.name || currentUser?.displayName || "").trim().toLowerCase();
        const isAdmin = currentUser?.role === "admin";

        const pemantauEmail = (s.pensyarahPemantau || "").trim().toLowerCase();
        const pemantauName = (s.pensyarahPemantauName || "").trim().toLowerCase();

        const penilaiEmail = (s.pensyarahPenilai || "").trim().toLowerCase();
        const penilaiName = (s.pensyarahPenilaiName || "").trim().toLowerCase();

        const isPemantau = isAdmin || (userEmail && (pemantauEmail === userEmail || pemantauEmail.includes(userEmail))) || (userName && (pemantauName === userName || pemantauName.includes(userName)));
        const isPenilai = isAdmin || (userEmail && (penilaiEmail === userEmail || penilaiEmail.includes(userEmail))) || (userName && (penilaiName === userName || penilaiName.includes(userName)));

        let roleLabel = "";
        if (isPemantau && isPenilai) roleLabel = "Pemantau & Penilai";
        else if (isPemantau) roleLabel = "Pensyarah Pemantau";
        else if (isPenilai) roleLabel = "Pensyarah Penilai";

        // Lecturer marksheets upload buttons
        const isKejuruteraan = getStudentCategory(s) === "Kejuruteraan";
        const targetDocs = [];

        if (isKejuruteraan) {
            if (isPemantau) {
                targetDocs.push({ id: "appendix_e2", title: "Borang Markah Pemantauan" });
            }
            if (isPenilai) {
                targetDocs.push({ id: "appendix_e3", title: "Appendix E3 (Penilai)" });
            }
        } else {
            if (isPemantau) {
                targetDocs.push({ id: "appendix_2", title: "Borang Markah Pemantauan" });
            }
        }

        let uploadControlsHTML = "";
        targetDocs.forEach((td, docIndex) => {
            const docEntry = s.documents[td.id] || {};
            const hasDoc = Boolean(docEntry && (docEntry.fileUrl || docEntry.fileData || docEntry.fileRef || docEntry.fileName));
            const docStatus = docEntry.status || "Belum Dihantar";
            const isLecturerDoc = ["appendix_e3", "appendix_e2", "appendix_2"].includes(td.id);
            const isVerified = isLecturerDoc && docStatus === "Diterima";

            let statusBadgeHTML = "";
            if (hasDoc) {
                if (docStatus === "Diterima") {
                    statusBadgeHTML = `<span style="background:#dcfce7; color:#15803d; border:1px solid #86efac; font-size:0.7rem; font-weight:700; padding:4px 12px; border-radius:20px; display:inline-flex; align-items:center; gap:6px;"><i class="fa-solid fa-circle" style="font-size:0.45rem; color:#16a34a;"></i> DISAHKAN</span>`;
                } else if (docStatus === "Ditolak") {
                    statusBadgeHTML = `<span style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; font-size:0.7rem; font-weight:700; padding:4px 12px; border-radius:20px; display:inline-flex; align-items:center; gap:6px;"><i class="fa-solid fa-circle" style="font-size:0.45rem; color:#dc2626;"></i> DITOLAK</span>`;
                } else {
                    statusBadgeHTML = `<span style="background:#fef3c7; color:#b45309; border:1px solid #fcd34d; font-size:0.7rem; font-weight:700; padding:4px 12px; border-radius:20px; display:inline-flex; align-items:center; gap:6px;"><i class="fa-solid fa-circle" style="font-size:0.45rem; color:#d97706;"></i> DALAM SEMAKAN</span>`;
                }
            } else {
                statusBadgeHTML = `<span style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; font-size:0.7rem; font-weight:700; padding:4px 12px; border-radius:20px; display:inline-flex; align-items:center; gap:6px;"><i class="fa-solid fa-circle" style="font-size:0.45rem; color:#94a3b8;"></i> BELUM DIHANTAR</span>`;
            }

            let fileBoxHTML = "";
            if (hasDoc) {
                const isPdf = docEntry.fileName && /\.pdf$/i.test(docEntry.fileName);
                const isWord = docEntry.fileName && /\.(doc|docx)$/i.test(docEntry.fileName);
                const iconClass = isPdf ? "fa-file-pdf" : (isWord ? "fa-file-word" : "fa-file-lines");
                const iconColor = isPdf ? "#ef4444" : (isWord ? "#2563eb" : "#38bdf8");

                fileBoxHTML = `
                    <div style="background: #090d16; border: 1.5px solid #00bcff; border-radius: 12px; padding: 12px 14px; margin: 10px 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; box-shadow: 0 4px 14px rgba(0,188,255,0.12);">
                        <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                            <i class="fa-solid ${iconClass}" style="font-size: 2rem; color: ${iconColor}; flex-shrink: 0;"></i>
                            <div style="min-width: 0;">
                                <div style="color: #ffffff; font-weight: 700; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;" title="${docEntry.fileName || td.title}">${docEntry.fileName || td.title}</div>
                                <div style="color: #38bdf8; font-size: 0.72rem; font-weight: 600; margin-top: 2px; white-space: nowrap;">${docEntry.fileSize || "Fail Dokumen"} • ${docEntry.uploadDate ? docEntry.uploadDate.split(" ")[0] : "Baru"}</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 6px; flex-shrink: 0;">
                            <button onclick="openDocumentReviewModal('${s.regNo}', '${td.id}')" style="background: #0284c7; color: #ffffff; border: 1px solid #38bdf8; border-radius: 8px; padding: 5px 12px; font-weight: 700; font-size: 0.76rem; display: inline-flex; align-items: center; gap: 5px; cursor: pointer;" title="Papar Dokumen"><i class="fa-solid fa-eye"></i> Papar</button>
                            ${!isVerified ? `<button onclick="deleteLecturerDocument('${s.regNo}', '${td.id}')" style="background: #dc2626; color: #ffffff; border: 1px solid #f87171; border-radius: 8px; padding: 5px 12px; font-weight: 700; font-size: 0.76rem; display: inline-flex; align-items: center; gap: 5px; cursor: pointer;" title="Padam Dokumen"><i class="fa-solid fa-trash-can"></i> Padam</button>` : ''}
                        </div>
                    </div>
                `;
            }

            const cleanRegId = String(s.regNo || "").replace(/[^a-zA-Z0-9_-]/g, '_');
            const inputId = `lecturer-input-${td.id}-${cleanRegId}`;
            const uploadKey = `${s.regNo}_${td.id}`;
            const isUploading = window._lecturerUploadingFor === uploadKey;

            let bottomStatusHTML = "";
            if (isUploading) {
                // Tunjukkan loading spinner semasa upload sedang berjalan
                bottomStatusHTML = `
                    <div style="width: 100%; border: 2px dashed #0ea5e9; background: #f0f9ff; color: #0369a1; padding: 10px; border-radius: 12px; font-weight: 700; font-size: 0.82rem; display: flex; align-items: center; justify-content: center; gap: 8px; opacity: 0.85;">
                        <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.1rem;"></i> Sedang memuat naik...
                    </div>
                `;
            } else if (hasDoc) {
                if (docStatus === "Diterima") {
                    bottomStatusHTML = `<div style="border: 1.5px solid #86efac; background: #f0fdf4; color: #16a34a; text-align: center; padding: 8px; border-radius: 10px; font-weight: 700; font-size: 0.78rem; display: flex; align-items: center; justify-content: center; gap: 6px;"><i class="fa-solid fa-circle-check"></i> Dokumen Telah Disahkan Oleh Admin UPLI</div>`;
                } else {
                    bottomStatusHTML = `
                        <div style="border: 1.5px solid #fef08a; background: #fffbeb; color: #d97706; text-align: center; padding: 7px; border-radius: 10px; font-weight: 700; font-size: 0.78rem; margin-bottom: 6px; display: flex; align-items: center; justify-content: center; gap: 6px;"><i class="fa-solid fa-spinner fa-spin"></i> Menunggu Semakan Admin UPLI</div>
                        <button onclick="deleteLecturerDocument('${s.regNo}', '${td.id}')" style="width: 100%; border: 1.5px solid #fca5a5; background: #fff; color: #dc2626; padding: 7px; border-radius: 10px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;"><i class="fa-solid fa-xmark"></i> Batal Penyerahan</button>
                    `;
                }
            } else {
                bottomStatusHTML = `
                    <button onclick="document.getElementById('${inputId}').click()" style="width: 100%; border: 2px dashed #0284c7; background: #f0f9ff; color: #0369a1; padding: 10px; border-radius: 12px; font-weight: 700; font-size: 0.82rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;"><i class="fa-solid fa-cloud-arrow-up" style="font-size: 1.1rem;"></i> Muat Naik Borang Markah (${td.title})</button>
                    <input type="file" id="${inputId}" style="display:none;" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onchange="handleLecturerFileUpload('${s.regNo}', '${td.id}', this)">
                `;
            }

            uploadControlsHTML += `
                <div style="border: 1.5px solid var(--border-color); background: var(--bg-card, #ffffff); border-radius: 16px; padding: 14px; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                        <div style="width: 26px; height: 26px; border-radius: 50%; background: #0f172a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.75rem;">${docIndex + 1}</div>
                        ${statusBadgeHTML}
                    </div>
                    <h5 style="font-size: 0.92rem; font-weight: 800; color: var(--text-primary); margin-bottom: 2px;">${td.title}</h5>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px; line-height: 1.4;">Borang penilaian rasmi dari Pensyarah Pemantau / Penilai bagi pelajar ini.</p>
                    ${fileBoxHTML}
                    ${bottomStatusHTML}
                </div>
            `;
        });

        let avatarStyle = "";
        let avatarContent = getInitials(s.name);
        if (s.profilePic) {
            avatarStyle = `style="background-image: url(${s.profilePic}) !important; background-size: cover !important; background-position: center !important;"`;
            avatarContent = "";
        }

        const card = document.createElement("div");
        card.className = "student-card";
        card.setAttribute("data-dept", s.jabatan);

        card.innerHTML = `
            <div class="student-card-header">
                <div class="avatar" ${avatarStyle} onclick="showStudentProfilePopup('${s.regNo}')" title="Lihat profil ${s.name}" style="cursor:pointer; transition: transform 0.15s, box-shadow 0.15s;" onmouseover="this.style.transform='scale(1.08)'; this.style.boxShadow='0 6px 18px rgba(99,102,241,0.45)';" onmouseout="this.style.transform=''; this.style.boxShadow='';">${avatarContent}</div>
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
    const cleanReg = String(studentReg || "").trim().toUpperCase();
    const student = students.find(s => String(s.regNo || "").trim().toUpperCase() === cleanReg);
    if (!student) {
        showToast("Pelajar tidak ditemui.", "error");
        return;
    }

    const doc = student.documents[docId] || { status: "Belum Dihantar", fileName: "", fileSize: "", uploadDate: "", feedback: "" };
    resolveGoogleDriveUrl(doc);
    const docMeta = getDocMetadata(docId, student);
    const isLecturerDoc = ["appendix_e3", "appendix_e2", "appendix_2"].includes(docId);
    const hasAnyFile = Boolean(doc.fileUrl || doc.fileData || doc.fileRef || doc.fileName);

    if ((doc.status === "Belum Dihantar" || !hasAnyFile) && !docMeta.isPhysical) {
        showToast(isLecturerDoc ? "Dokumen ini belum dimuat naik oleh pensyarah." : "Pelajar belum memuat naik fail dokumen ini!", "error");
        return;
    }

    currentReviewContext = { studentReg: cleanReg, docId };

    document.getElementById("doc-modal-student-name").textContent = student.name;
    document.getElementById("doc-modal-student-reg").textContent = student.regNo;
    document.getElementById("doc-modal-doc-type").textContent = docMeta.title;
    document.getElementById("doc-modal-file-name").textContent = doc.fileName || (docMeta.isPhysical ? "(Borang Fizikal)" : "");

    // Paparan maklumat siapa yang menghantar (untuk borang markah pensyarah: E3, E2, Appendix 2)
    let fileSizeText = doc.fileSize ? `${doc.fileSize} • Dimuat naik pada ${doc.uploadDate}` : (docMeta.isPhysical ? "Penyerahan fizikal ke pejabat UPLI" : "");
    if (isLecturerDoc && doc.submittedByName) {
        fileSizeText += ` • Dihantar oleh: ${doc.submittedByName}`;
    }
    document.getElementById("doc-modal-file-size").textContent = fileSizeText;

    const badgeEl = document.getElementById("doc-modal-current-status-badge");
    badgeEl.className = "badge " + (doc.status === "Diterima" ? "badge-success" : (doc.status === "Ditolak" ? "badge-danger" : "badge-warning"));
    badgeEl.textContent = doc.status || "Dalam Semakan";

    document.getElementById("doc-review-status").value = doc.status === "Diterima" ? "Diterima" : (doc.status === "Ditolak" ? "Ditolak" : "Diterima");
    document.getElementById("doc-review-feedback").value = doc.feedback || "";

    const dlLink = document.getElementById("doc-modal-download-link");
    let fileSource = doc.fileUrl || doc.fileData || "";

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
                dlLink.setAttribute("download", doc.fileName || `${docId}.pdf`);
            }
        } else if (doc.fileRef) {
            dlLink.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memuatkan fail...`;
            dlLink.href = "#";
            loadFileFromFirestore(cleanReg, docId).then(b64 => {
                if (b64) {
                    doc.fileData = b64;
                    dlLink.href = b64;
                    dlLink.setAttribute("download", doc.fileName || `${docId}.pdf`);
                    dlLink.innerHTML = `<i class="fa-solid fa-download"></i> Muat Turun Fail`;
                } else {
                    dlLink.innerHTML = `<i class="fa-solid fa-download"></i> Muat Turun Fail`;
                }
            }).catch(() => {
                dlLink.innerHTML = `<i class="fa-solid fa-download"></i> Muat Turun Fail`;
            });
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
    previewBox.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:30px; text-align:center; min-height: 200px;">
            <i class="fa-solid fa-spinner fa-spin text-accent" style="font-size: 2rem; margin-bottom: 12px;"></i>
            <p style="font-size:0.85rem; color:var(--text-secondary); margin:0;">Memuatkan pratonton dokumen...</p>
        </div>
    `;

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

        // 1. ALWAYS load fileData from Firestore chunk storage FIRST if available
        if (!doc.fileData && doc.fileRef) {
            const loaded = await loadFileFromFirestore(cleanReg, docId);
            if (loaded) doc.fileData = loaded;
        }

        previewBox.innerHTML = "";
        const isImage = doc.fileName && /\.(png|jpg|jpeg)$/i.test(doc.fileName);
        const isWordDoc = doc.fileName && /\.(doc|docx)$/i.test(doc.fileName);

        // Priority 1: Direct Base64 / Data URL in local memory or Firestore chunks
        if (doc.fileData && doc.fileData.trim() !== "") {
            if (doc.fileData.startsWith("data:image/") || isImage) {
                previewBox.innerHTML = `<img src="${doc.fileData}" alt="Fail Dokumen" style="max-width:100%; height:auto; border-radius:4px; box-shadow:0 2px 8px rgba(0,0,0,0.15);">`;
            } else if (isWordDoc) {
                previewBox.innerHTML = `
                    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:35px 20px; text-align:center; background:rgba(59,130,246,0.03); border:1.5px dashed rgba(59,130,246,0.25); border-radius:10px; width:100%;">
                        <i class="fa-solid fa-file-word" style="font-size:3.8rem; color:#2563eb; margin-bottom:12px;"></i>
                        <h4 style="font-weight:700; margin-bottom:6px; color:var(--text-primary); font-size:0.95rem; word-break:break-all;">${doc.fileName || "Dokumen Word"}</h4>
                        <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:15px;">Fail Microsoft Word (.doc / .docx)</p>
                        <a href="${doc.fileData}" download="${doc.fileName || 'dokumen.docx'}" class="btn btn-primary btn-sm" style="font-size:0.8rem; display:inline-flex; align-items:center; gap:6px; background:#2563eb; color:#fff; padding:8px 16px; border-radius:6px; font-weight:600; text-decoration:none;"><i class="fa-solid fa-download"></i> Muat Turun Dokumen Word</a>
                    </div>
                `;
            } else {
                const blobUrl = dataURLtoBlobURL(doc.fileData);
                previewBox.innerHTML = `<iframe src="${blobUrl}" style="width:100%; height:350px; border:1px solid var(--border-color); border-radius:6px; background:#fff;"></iframe>`;
            }
            if (dlLink) {
                dlLink.href = doc.fileData;
                dlLink.setAttribute("download", doc.fileName || `${docId}.pdf`);
                dlLink.style.display = "inline-flex";
            }
            return;
        }

        // Priority 2: Direct URL / Firebase Storage URL / Google Drive URL
        if (doc.fileUrl || doc.fileId) {
            const isFirebaseStorage = doc.fileUrl && doc.fileUrl.includes("firebasestorage.googleapis.com");
            const isGoogleDrive = doc.fileId || (doc.fileUrl && doc.fileUrl.includes("drive.google.com"));

            if (isFirebaseStorage) {
                if (isImage) {
                    previewBox.innerHTML = `<img src="${doc.fileUrl}" alt="Fail Dokumen" style="max-width:100%; height:auto; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.15);">`;
                } else if (isWordDoc) {
                    previewBox.innerHTML = `
                        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:35px 20px; text-align:center; background:rgba(59,130,246,0.03); border:1.5px dashed rgba(59,130,246,0.25); border-radius:10px; width:100%;">
                            <i class="fa-solid fa-file-word" style="font-size:3.8rem; color:#2563eb; margin-bottom:12px;"></i>
                            <h4 style="font-weight:700; margin-bottom:6px; color:var(--text-primary); font-size:0.95rem; word-break:break-all;">${doc.fileName || "Dokumen Word"}</h4>
                            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:15px;">Fail Microsoft Word (.doc / .docx)</p>
                            <a href="${doc.fileUrl}" download="${doc.fileName || 'dokumen.docx'}" target="_blank" class="btn btn-primary btn-sm" style="font-size:0.8rem; display:inline-flex; align-items:center; gap:6px; background:#2563eb; color:#fff; padding:8px 16px; border-radius:6px; font-weight:600; text-decoration:none;"><i class="fa-solid fa-download"></i> Muat Turun Dokumen Word</a>
                        </div>
                    `;
                } else {
                    previewBox.innerHTML = `
                        <div style="display:flex; flex-direction:column; gap:12px; width:100%; height:100%; align-items:center;">
                            <iframe src="${doc.fileUrl}" style="width:100%; height:320px; border:1px solid var(--border-color); border-radius:6px; background:#fff;"></iframe>
                            <a href="${doc.fileUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="font-size:0.8rem; gap:6px; background:#2563eb; color:#fff; text-decoration:none; padding:8px 16px; border-radius:6px; font-weight:600;">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Fail Terus Dalam Tab Baharu
                            </a>
                        </div>
                    `;
                }
                if (dlLink) {
                    dlLink.href = doc.fileUrl;
                    dlLink.target = "_blank";
                    dlLink.setAttribute("download", doc.fileName || "dokumen.pdf");
                    dlLink.style.display = "inline-flex";
                }
                return;
            }

            const fileId = doc.fileId || (doc.fileUrl.match(/id=([a-zA-Z0-9_-]+)/) || [])[1];
            const previewUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : doc.fileUrl;
            const driveDirectUrl = fileId ? `https://drive.google.com/file/d/${fileId}/view?usp=sharing` : doc.fileUrl;
            
            previewBox.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:10px; width:100%; height:100%;">
                    <iframe src="${previewUrl}" style="width:100%; height:320px; border:1px solid var(--border-color); border-radius:6px; background:#fff;" allow="autoplay"></iframe>
                    <div style="text-align:center;">
                        <a href="${driveDirectUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="font-size:0.75rem; gap:4px; background:#2563eb; color:#fff; text-decoration:none;">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Fail Terus di Google Drive
                        </a>
                    </div>
                </div>
            `;
            if (dlLink) {
                dlLink.href = driveDirectUrl;
                dlLink.target = "_blank";
                dlLink.removeAttribute("download");
            }
            return;
        }

        previewBox.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:30px; text-align:center;">
                <i class="fa-solid fa-file-circle-exclamation text-warning" style="font-size:3rem; margin-bottom:12px; color:#f59e0b;"></i>
                <h4 style="font-weight:700; margin-bottom:6px;">Dokumen Telah Dimuat Naik</h4>
                <p style="font-size:0.8rem; color:var(--text-muted);">Gunakan butang 'Muat Turun Fail' di bawah untuk mengambil fail ini.</p>
            </div>
        `;
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
        writeStudentDocumentToFirestore(studentReg, docId, students[studentIdx].documents[docId]);
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
    const cleanReg = String(studentReg || "").trim().toUpperCase();
    const students = getStudents();
    // Normalize comparison + fallback to currentUser
    let student = students.find(s => String(s.regNo || "").trim().toUpperCase() === cleanReg);
    if (!student && currentUser && String(currentUser.regNo || "").trim().toUpperCase() === cleanReg) {
        student = currentUser;
    }
    if (!student) {
        console.error("openDocumentViewer: student not found for regNo:", cleanReg);
        showToast("Maklumat pelajar tidak ditemui!", "error");
        return;
    }

    if (!student.documents) student.documents = {};
    const doc = student.documents[docId];
    if (doc) resolveGoogleDriveUrl(doc);
    if (!doc || doc.status === "Belum Dihantar") {
        showToast("Dokumen tidak wujud atau belum dihantar!", "error");
        return;
    }

    renderedView.innerHTML = `<div style="text-align:center; padding:40px;"><div style="width:40px;height:40px;border:3px solid rgba(99,102,241,0.2);border-top:3px solid #6366f1;border-radius:50%;animation:db-spin 0.8s linear infinite;margin:0 auto 12px;"></div><p style="font-size:0.85rem;color:var(--text-muted);">Memuatkan dokumen...</p></div>`;
    viewerModal.classList.add("active");

    // 1. Load fileData from Firestore chunk storage if not already in memory
    if (!doc.fileData) {
        const loaded = await loadFileFromFirestore(studentReg, docId);
        if (loaded) doc.fileData = loaded;
    }

    renderedView.innerHTML = "";

    const isImage = doc.fileName && /\.(png|jpg|jpeg)$/i.test(doc.fileName);
    const isPDF = doc.fileName ? doc.fileName.toLowerCase().endsWith(".pdf") : true;

    // Priority 1: Direct Base64 / Data URL in local memory or Firestore chunks (loads 100% directly without Google Drive login!)
    if (doc.fileData && doc.fileData.trim() !== "") {
        if (doc.fileData.startsWith("data:image/") || isImage) {
            renderedView.innerHTML = `<img src="${doc.fileData}" style="max-width:100%; height:auto; box-shadow:0 0 10px rgba(0,0,0,0.1); border-radius:4px;" alt="Fail Pelajar">`;
        } else {
            const blobUrl = dataURLtoBlobURL(doc.fileData);
            renderedView.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; gap:12px; width:100%;">
                    <div style="font-size:0.8rem; color:var(--text-muted); text-align:center;">
                        <i class="fa-solid fa-file-pdf" style="font-size:1.5rem; color:#ef4444; margin-bottom:4px;"></i><br>
                        <strong>${doc.fileName}</strong>
                    </div>
                    <iframe src="${blobUrl}" style="width:100%; height:600px; border:1px solid var(--border-color); border-radius:6px; background:#fff;"></iframe>
                    <a href="${doc.fileData}" download="${doc.fileName || 'dokumen.pdf'}" class="btn btn-primary btn-sm" style="gap:6px;">
                        <i class="fa-solid fa-download"></i> Muat Turun Dokumen PDF
                    </a>
                </div>
            `;
        }
        return;
    }

    // Priority 2: Google Drive or External URL
    if (doc.fileUrl && doc.fileUrl.trim() !== "") {
        let fileId = doc.fileId;
        if (!fileId) {
            const m = doc.fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || doc.fileUrl.match(/id=([a-zA-Z0-9_-]+)/);
            if (m) fileId = m[1];
        }

        const embedUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : doc.fileUrl;
        const driveDirectUrl = fileId ? `https://drive.google.com/file/d/${fileId}/view?usp=sharing` : doc.fileUrl;

        renderedView.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:14px; width:100%; text-align:center; padding:10px 0;">
                <div style="font-size:0.85rem; color:var(--text-primary); text-align:center; background:rgba(37,99,235,0.06); padding:10px 16px; border-radius:8px; width:100%;">
                    <i class="fa-solid fa-file-pdf" style="font-size:1.4rem; color:#ef4444; margin-right:6px; vertical-align:middle;"></i>
                    <strong>${doc.fileName || 'Dokumen Pelajar'}</strong>
                </div>
                <iframe src="${embedUrl}" style="width:100%; height:550px; border:1px solid var(--border-color); border-radius:8px; background:#fff;" allow="autoplay"></iframe>
                <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center;">
                    <a href="${driveDirectUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="background:#2563eb; color:#fff; font-weight:700; gap:6px; padding:8px 16px; border-radius:8px; text-decoration:none;">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Fail Terus di Google Drive
                    </a>
                </div>
            </div>
        `;
        return;
    }
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
        try { sessionStorage.setItem("upli_admin_dept", activeAdminStudentDept); } catch(e){}
        // Update import label to reflect new active dept
        const importLabel = document.getElementById("import-target-dept-label");
        if (importLabel) importLabel.textContent = activeAdminStudentDept;
        renderAdminStudentsTable();
        updatePKLICountBadge();
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

    // Render Admin Personal Profile details
    const adminSelfEmailInput = document.getElementById("profile-admin-self-email");
    const adminSelfAvatarEl = document.getElementById("admin-profile-card-avatar");

    if (adminSelfEmailInput) adminSelfEmailInput.value = currentUser.email || "";
    if (adminSelfAvatarEl) {
        renderProfileAvatar(adminSelfAvatarEl, currentUser.profilePic, currentUser.name || "Admin");
    }

    applyDeptTheme(activeAdminDept);

    // Filter students strictly by active session
    let currentSessionStudents = students.filter(s => isStudentInSession(s, activeSesi));

    // Total stats update (filtered by academic session for students)
    const elTotalStudents = document.getElementById("admin-total-students");
    if (elTotalStudents) elTotalStudents.textContent = currentSessionStudents.length;

    const elTotalAdmins = document.getElementById("admin-total-admins");
    if (elTotalAdmins) elTotalAdmins.textContent = admins.length;

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

    // Setup department configs with official theme colors
    const depts = [
        {
            code: "JKA",
            name: "Jabatan Kejuruteraan Awam",
            icon: "fa-solid fa-mountain-city",
            color: "#10b981",
            glow: "rgba(16, 185, 129, 0.2)",
            programs: ["DKA", "DUB", "DBK"]
        },
        {
            code: "JKE",
            name: "Jabatan Kejuruteraan Elektrik",
            icon: "fa-solid fa-bolt",
            color: "#f43f5e",
            glow: "rgba(244, 63, 94, 0.2)",
            programs: ["DEE", "DEP", "DTK"]
        },
        {
            code: "JKM",
            name: "Jabatan Kejuruteraan Mekanikal",
            icon: "fa-solid fa-gears",
            color: "#facc15",
            glow: "rgba(250, 204, 21, 0.2)",
            programs: ["DKM", "DTP", "DEM"]
        },
        {
            code: "JP",
            name: "Jabatan Perdagangan",
            icon: "fa-solid fa-chart-line",
            color: "#3b82f6",
            glow: "rgba(59, 130, 246, 0.2)",
            programs: ["DPR", "DLS", "DAT"]
        },
        {
            code: "JPH",
            name: "Jabatan Pelancongan & Hospitaliti",
            icon: "fa-solid fa-utensils",
            color: "#8b5cf6",
            glow: "rgba(139, 92, 246, 0.2)",
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
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.88rem; padding:10px 14px; border-bottom:1px solid rgba(0,0,0,0.1); background:#ffffff !important; border-radius:10px; margin-bottom:6px; box-shadow:0 2px 6px rgba(0,0,0,0.06);">
                    <span style="font-weight:900; color:#0f172a !important; -webkit-text-fill-color:#0f172a !important;">${prog}</span>
                    <span style="color:#334155 !important; -webkit-text-fill-color:#334155 !important; font-size:0.85rem; font-weight:700;">
                        <strong style="color:#0f172a !important; -webkit-text-fill-color:#0f172a !important; font-weight:900;">${progStudents.length}</strong> Pelajar 
                        <span style="color:#047857 !important; -webkit-text-fill-color:#047857 !important; font-weight:800; margin-left:4px;">(${progCompleteCount} Lengkap)</span>
                    </span>
                </div>
            `;
        });

        const card = document.createElement("div");
        card.className = `card dept-card-animated dept-card-${d.code}`;
        card.style.cssText = `padding:22px; transition:all 0.25s ease; border-radius:18px; display:flex; flex-direction:column; justify-content:space-between; min-height: 290px; border:2.5px solid ${deptColor} !important; box-shadow: 0 8px 24px ${d.glow};`;
        card.onmouseenter = () => { card.style.transform = "translateY(-5px)"; card.style.boxShadow = `0 14px 30px ${d.glow}`; };
        card.onmouseleave = () => { card.style.transform = "translateY(0)"; card.style.boxShadow = `0 8px 24px ${d.glow}`; };

        card.innerHTML = `
            <div>
                <!-- Header -->
                <div style="display:flex; align-items:center; gap:14px; margin-bottom:18px;">
                    <div class="dept-icon-box" style="width:52px; height:52px; border-radius:14px; background:${deptColor} !important; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px ${d.glow}; flex-shrink:0;">
                        ${(window.DEPT_SVGS && window.DEPT_SVGS[d.code]) ? window.DEPT_SVGS[d.code] : `<i class="${d.icon}" style="color:#ffffff !important;"></i>`}
                    </div>
                    <div>
                        <h4 style="font-family:var(--font-display); font-size:1.35rem; font-weight:900; color:#0f172a !important; -webkit-text-fill-color:#0f172a !important; line-height:1.2; margin:0; text-shadow:none !important;">${d.code}</h4>
                        <span style="font-size:0.85rem; color:#334155 !important; -webkit-text-fill-color:#334155 !important; font-weight:800;">${d.name}</span>
                    </div>
                </div>

                <!-- Rate Donut Chart & Stats (Compact Layout) -->
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 18px; background: #ffffff !important; padding: 14px 18px; border-radius: 14px; border: 2px solid ${deptColor}; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
                    <!-- Donut Chart Container -->
                    <div style="position: relative; width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <canvas id="card-donut-${d.code}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></canvas>
                        <div style="font-family: var(--font-display); font-size: 1.05rem; font-weight: 900; color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; pointer-events: none; z-index: 2;">
                            ${deptRate}%
                        </div>
                    </div>
                    <!-- Stats Text -->
                    <div>
                        <span style="font-size: 0.74rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a !important; -webkit-text-fill-color: #0f172a !important;">KADAR SIAP DOKUMEN</span>
                        <h3 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 900; color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; margin: 2px 0;">${deptRate}%</h3>
                        <span style="font-size: 0.85rem; color: #047857 !important; -webkit-text-fill-color: #047857 !important; font-weight: 800;">${deptCompleteCount} / ${deptStudents.length} Pelajar Lengkap</span>
                    </div>
                </div>
                
                <!-- Programs List -->
                <div style="display:flex; flex-direction:column; gap:4px;">
                    ${programsHTML}
                </div>
            </div>
        `;
        grid.appendChild(card);

        // Render compact donut chart inside the card with official department theme color
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
                        backgroundColor: deptStudents.length > 0 ? [deptColor, 'rgba(0, 0, 0, 0.12)'] : ['rgba(0, 0, 0, 0.12)', 'rgba(0, 0, 0, 0.12)'],
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

if (excelUploadZone && excelFileInput) {
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
            // Guna requestAnimationFrame supaya DOM dikemas kini dulu, kemudian render
            showToast(`✅ ${countImported} pelajar didaftarkan, ${countDuplicates} dikemas kini — paparan dikemas kini!`, "success");
            writeSyncSignalToFirestore(); // Hantar isyarat sync ke peranti lain
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
}

// --- Google Drive / Google Sheet Sync Logic ---
function initGoogleSheetSync() {
    const sheetIdInput = document.getElementById("gdrive-sheet-id-input");
    const sheetTabInput = document.getElementById("gdrive-sheet-tab-input");
    const syncBtn = document.getElementById("btn-sync-gdrive-sheet");
    const statusDiv = document.getElementById("gdrive-sync-status");

    if (!syncBtn || !sheetIdInput) return;

    // Load saved settings from localStorage if available
    const savedSheetId = localStorage.getItem("smartupli_gdrive_sheet_id");
    const savedSheetTab = localStorage.getItem("smartupli_gdrive_sheet_tab");
    if (savedSheetId) sheetIdInput.value = savedSheetId;
    if (savedSheetTab) sheetTabInput.value = savedSheetTab;

    syncBtn.addEventListener("click", async () => {
        let rawInput = (sheetIdInput.value || "").trim();
        let sheetName = (sheetTabInput.value || "Sheet1").trim() || "Sheet1";

        if (!rawInput) {
            showToast("Sila masukkan Pautan atau ID Google Sheet!", "error");
            sheetIdInput.focus();
            return;
        }

        // Extract Spreadsheet ID if a full URL was provided
        let spreadsheetId = rawInput;
        const urlMatch = rawInput.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (urlMatch && urlMatch[1]) {
            spreadsheetId = urlMatch[1];
        }

        // Save to localStorage for future use
        localStorage.setItem("smartupli_gdrive_sheet_id", rawInput);
        localStorage.setItem("smartupli_gdrive_sheet_tab", sheetName);

        // UI Loading state
        const originalBtnHtml = syncBtn.innerHTML;
        syncBtn.disabled = true;
        syncBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Syncing...`;
        
        if (statusDiv) {
            statusDiv.style.display = "block";
            statusDiv.style.background = "rgba(59, 130, 246, 0.1)";
            statusDiv.style.color = "#2563eb";
            statusDiv.style.border = "1px solid rgba(59, 130, 246, 0.2)";
            statusDiv.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Memuat turun data dari Google Sheet (ID: ${spreadsheetId})...`;
        }

        try {
            const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
            console.log("Fetching Google Sheet CSV from:", csvUrl);

            const res = await fetch(csvUrl);
            if (!res.ok) {
                throw new Error(`Gagal mengakses Google Sheet (HTTP ${res.status}). Pastikan fail ditetapkan kepada "Anyone with the link can view".`);
            }

            const csvText = await res.text();
            if (!csvText || csvText.includes("<!DOCTYPE html>") || csvText.includes("<html")) {
                throw new Error("Gagal membaca data CSV. Sila semak kebenaran akses fail Google Sheet ('Anyone with link can view').");
            }

            const results = parseCSV(csvText);
            if (!results || results.length === 0) {
                throw new Error("Tiada rekod pelajar dijumpai atau format lajur tidak padan!");
            }

            // Process students
            const students = getStudents();
            const activeSesi = getActiveSession();
            let countImported = 0;
            let countDuplicates = 0;

            const lecturers = getLecturers();
            const modifiedRegNos = [];

            results.forEach(s => {
                const dupIdx = students.findIndex(exist => exist.regNo === s.regNo);
                const sessionValue = s.sesi || activeSesi;

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
                    phone: s.phone || "",
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
            addLog("success", `Admin sync Google Sheet: ${countImported} pelajar baharu didaftarkan, ${countDuplicates} dikemaskini.`);

            try {
                localStorage.setItem("upli_students", JSON.stringify(dbCache.students));
                localStorage.setItem("upli_cache_ts", String(Date.now()));
            } catch(e) {}

            const csvSessions = [...new Set(results.map(r => r.sesi).filter(Boolean))];
            const validSession = csvSessions.find(s => isValidSessionString(s));
            if (validSession) {
                saveActiveSession(validSession.trim());
            }
            populateGlobalSessionSelect();

            if (statusDiv) {
                statusDiv.style.display = "block";
                statusDiv.style.background = "rgba(16, 185, 129, 0.1)";
                statusDiv.style.color = "#059669";
                statusDiv.style.border = "1px solid rgba(16, 185, 129, 0.2)";
                statusDiv.innerHTML = `<i class="fa-solid fa-circle-check"></i> <strong>Sync Berjaya!</strong> (${countImported}) pelajar baharu didaftarkan, (${countDuplicates}) dikemaskini.`;
            }

            showToast(`✅ Sync Google Sheet Berjaya! (${countImported} baharu, ${countDuplicates} dikemaskini)`, "success");
            writeSyncSignalToFirestore(); // Hantar isyarat sync ke peranti lain
            
            requestAnimationFrame(() => {
                renderAdminStudentsTable();
                renderAdminDashboard();
                renderAdminLecturerAssignTable();
            });

        } catch (err) {
            console.error("Ralat Sync Google Sheet:", err);
            if (statusDiv) {
                statusDiv.style.display = "block";
                statusDiv.style.background = "rgba(239, 68, 68, 0.1)";
                statusDiv.style.color = "#dc2626";
                statusDiv.style.border = "1px solid rgba(239, 68, 68, 0.2)";
                statusDiv.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <strong>Ralat Sync:</strong> ${err.message}`;
            }
            showToast("Ralat Sync Google Sheet: " + err.message, "error");
        } finally {
            syncBtn.disabled = false;
            syncBtn.innerHTML = originalBtnHtml;
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGoogleSheetSync);
} else {
    initGoogleSheetSync();
}

// Helper to clean leading/trailing BOM, hidden control chars, and CSV quotation marks
function cleanVal(str) {
    if (str === null || str === undefined) return "";
    let s = String(str);

    s = s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#34;/g, '"').replace(/&#39;/g, "'");
    s = s.replace(/^[\ufeff\u200b\u00a0\u202f\u2000-\u200a\u0000-\u001F]+/g, "")
         .replace(/[\ufeff\u200b\u00a0\u202f\u2000-\u200a\u0000-\u001F]+$/g, "")
         .trim();

    s = s.replace(/\\"/g, '"').replace(/\\'/g, "'");

    let prev = "";
    while (s !== prev) {
        prev = s;
        s = s.trim();
        s = s.replace(/^[ "'“”«»`]+/g, '');
        s = s.replace(/[ "'“”«»`]+$/g, '');
    }

    s = s.replace(/""/g, '"').trim();
    return s;
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
    const headerKeywords = ['bil', 'nama', 'name', 'pendaftaran', 'no.pend', 'pend', 'reg', 'id', 'matrik', 'kelas', 'class', 'jabatan', 'dept', 'tempat', 'li', 'bandar', 'daerah', 'company', 'syarikat', 'sesi', 'session', 'pemantau', 'penilai', 'phone', 'telefon'];
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

    let regIdx = headers.findIndex(h => h.includes('pendaftaran') || h.includes('reg') || h.includes('matrik') || h.includes('nokp') || h.includes('nondp') || h.includes('pend') || h.includes('no.pend') || h.includes('no_pend'));
    if (regIdx === -1) regIdx = headers.findIndex(h => h === 'id' || /\bid\b/.test(h) || h.includes('nombor') || h.includes('no_') || h.includes('no.') || h.includes('noma'));
    if (regIdx === -1) regIdx = headers.findIndex(h => /\bno\b/.test(h) && !h.includes('bil'));

    const tempatIdx = headers.findIndex(h => h.includes('tempat') || h === 'li' || h.includes('company') || h.includes('syarikat') || h.includes('organisasi') || h.includes('tempat li'));
    const daerahIdx = headers.findIndex(h => h.includes('daerah') || h.includes('district') || h.includes('kawasan') || h.includes('bandar'));

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
    const emailIdx = headers.findIndex(h => (h.includes('emel') || h.includes('email')) && !h.includes('phone') && !h.includes('telefon'));
    const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('telefon') || h === 'tel' || h.includes('no tel') || h.includes('no. tel'));
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
        let phone = "";
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
            phone = (phoneIdx !== -1 && cols[phoneIdx]) ? cleanVal(cols[phoneIdx]) : "";
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
        if (pensyarahPemantau && !isValidEmailFormat(pensyarahPemantau)) {
            if (!pensyarahPemantauName) {
                pensyarahPemantauName = (emailPemantauIdx !== -1 && cols[emailPemantauIdx]) ? cleanVal(cols[emailPemantauIdx]) : pensyarahPemantau;
            }
            pensyarahPemantau = "";
        }
        if (pensyarahPenilai && !isValidEmailFormat(pensyarahPenilai)) {
            if (!pensyarahPenilaiName) {
                pensyarahPenilaiName = (emailPenilaiIdx !== -1 && cols[emailPenilaiIdx]) ? cleanVal(cols[emailPenilaiIdx]) : pensyarahPenilai;
            }
            pensyarahPenilai = "";
        }
        if (penasihatAkademik && !isValidEmailFormat(penasihatAkademik)) {
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

        results.push({ name, regNo, tempatLI, daerah, pensyarahPemantau, pensyarahPemantauName, pensyarahPenilai, pensyarahPenilaiName, penasihatAkademik, penasihatAkademikName, jabatan, email, phone, class: classVal, sesi });
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
    const headerKeywords = ['nama', 'name', 'pendaftaran', 'reg', 'id', 'matrik', 'kelas', 'class', 'jabatan', 'dept', 'tempat', 'li', 'company', 'syarikat', 'sesi', 'session', 'phone', 'telefon'];
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
    const daerahIdx = headers.findIndex(h => h.includes('daerah') || h.includes('district') || h.includes('kawasan') || h.includes('bandar'));

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
    const emailIdx = headers.findIndex(h => (h.includes('emel') || h.includes('email')) && !h.includes('phone') && !h.includes('telefon'));
    const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('telefon') || h === 'tel' || h.includes('no tel') || h.includes('no. tel'));
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
        let phone = "";
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
            phone = (phoneIdx !== -1 && cols[phoneIdx]) ? cleanVal(cols[phoneIdx]) : "";
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
        if (pensyarahPemantau && !isValidEmailFormat(pensyarahPemantau)) {
            if (!pensyarahPemantauName) {
                pensyarahPemantauName = (emailPemantauIdx !== -1 && cols[emailPemantauIdx]) ? cleanVal(cols[emailPemantauIdx]) : pensyarahPemantau;
            }
            pensyarahPemantau = "";
        }
        if (pensyarahPenilai && !isValidEmailFormat(pensyarahPenilai)) {
            if (!pensyarahPenilaiName) {
                pensyarahPenilaiName = (emailPenilaiIdx !== -1 && cols[emailPenilaiIdx]) ? cleanVal(cols[emailPenilaiIdx]) : pensyarahPenilai;
            }
            pensyarahPenilai = "";
        }
        if (penasihatAkademik && !isValidEmailFormat(penasihatAkademik)) {
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

        results.push({ name, regNo, tempatLI, daerah, pensyarahPemantau, pensyarahPemantauName, pensyarahPenilai, pensyarahPenilaiName, penasihatAkademik, penasihatAkademikName, jabatan, email, phone, class: classVal, sesi });
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

let activeAdminStudentTabMode = (function() {
    try { return sessionStorage.getItem("upli_admin_tab_mode") || "active"; } catch(e) { return "active"; }
})();

// Render Admin Students Tab Table (with Department & Session Filtering & Checkbox Selections)
function renderAdminStudentsTable() {
    if (currentRole !== "admin") return;

    applyDeptTheme(activeAdminStudentDept);

    const activeSesi = getActiveSession();
    const isPKLIMode = activeAdminStudentTabMode === "pkli";

    document.getElementById("admin-students-table-title").textContent = isPKLIMode
        ? `Pelajar PKLI (Penilaian Khas LI): ${activeAdminStudentDept}`
        : `Pelajar Berdaftar: ${activeAdminStudentDept} (${activeSesi})`;

    const students = getStudents();
    const searchVal = document.getElementById("admin-student-search-input").value.trim().toLowerCase();

    const tbody = document.getElementById("admin-students-table-body");
    let rowsHtml = "";

    // FILTER: Filter students by department AND (active session OR PKLI mode) AND search query AND tab mode
    const filteredStudents = students.filter(s =>
        (isPKLIMode ? Boolean(s.isPKLI) : !s.isPKLI) &&
        (s.jabatan || "").toUpperCase().trim() === (activeAdminStudentDept || "").toUpperCase().trim() &&
        isStudentInSession(s, activeSesi) &&
        (
            (s.name || "").toLowerCase().includes(searchVal) ||
            (s.regNo || "").toLowerCase().includes(searchVal) ||
            (s.class || "").toLowerCase().includes(searchVal)
        )
    );

    if (filteredStudents.length === 0) {
        const counterpartCount = students.filter(s =>
            (isPKLIMode ? !s.isPKLI : Boolean(s.isPKLI)) &&
            (s.jabatan || "").toUpperCase().trim() === (activeAdminStudentDept || "").toUpperCase().trim() &&
            isStudentInSession(s, activeSesi)
        ).length;

        let emptyMsg = "";
        if (!isPKLIMode && counterpartCount > 0) {
            emptyMsg = `<div style="padding:28px 20px; text-align:center;">
                <p style="margin:0 0 14px 0; color:var(--text-muted); font-size:0.92rem;">
                    <i class="fa-solid fa-circle-info text-warning" style="font-size:1.3rem; margin-right:8px; vertical-align:middle;"></i>
                    Semua (<strong>${counterpartCount}</strong>) pelajar <strong>${activeAdminStudentDept}</strong> bagi sesi ini telah dipindahkan ke <strong>Senarai PKLI</strong>.
                </p>
                <button class="btn btn-sm" onclick="switchAdminStudentTabMode('pkli')" style="background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; font-weight:700; border:none; padding:9px 20px; border-radius:10px; cursor:pointer; box-shadow:0 4px 12px rgba(245,158,11,0.25);">
                    <i class="fa-solid fa-user-clock"></i> Lihat Senarai PKLI ${activeAdminStudentDept} (${counterpartCount})
                </button>
            </div>`;
        } else if (isPKLIMode && counterpartCount > 0) {
            emptyMsg = `<div style="padding:28px 20px; text-align:center;">
                <p style="margin:0 0 14px 0; color:var(--text-muted); font-size:0.92rem;">
                    Tiada pelajar PKLI bagi <strong>${activeAdminStudentDept}</strong> untuk sesi ini. Terdapat <strong>${counterpartCount}</strong> pelajar aktif berdaftar.
                </p>
                <button class="btn btn-sm" onclick="switchAdminStudentTabMode('active')" style="background:var(--color-primary); color:#fff; font-weight:700; border:none; padding:9px 20px; border-radius:10px; cursor:pointer;">
                    <i class="fa-solid fa-user-check"></i> Lihat Pelajar Berdaftar (Aktif)
                </button>
            </div>`;
        } else {
            emptyMsg = `<div style="padding:28px 20px; text-align:center; color:var(--text-muted);">
                Tiada rekod ${isPKLIMode ? "pelajar PKLI" : "pelajar berdaftar"} ditemui bagi jabatan ${activeAdminStudentDept} untuk sesi ${activeSesi}.
            </div>`;
        }

        tbody.innerHTML = `<tr><td colspan="6">${emptyMsg}</td></tr>`;
        const selectAllCheck = document.getElementById("admin-student-select-all");
        if (selectAllCheck) selectAllCheck.checked = false;
        if (window.updateBulkCount) window.updateBulkCount();
        return;
    }

    const stateKey = isPKLIMode ? 'pkli' : 'adminStudents';
    const state = window.paginationState[stateKey];
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const paginatedStudents = filteredStudents.slice(startIndex, startIndex + state.itemsPerPage);

    paginatedStudents.forEach((s, idx) => {
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
            avatarStyle = `style="background-image: url(${s.profilePic}) !important; background-size: cover !important; background-position: center !important;"`;
            avatarContent = "";
        }

        // Admin-only download button — only shown when folder is complete
        const downloadBtn = allComplete
            ? `<button id="btn-admin-dl-${s.regNo}" class="btn btn-sm" onclick="adminDownloadStudentDocs('${s.regNo}')" title="Muat Turun Folder Pelajar (ZIP)" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff !important; border: none; border-radius: 20px; padding: 6px 14px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.28); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(16, 185, 129, 0.38)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.28)';">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#ffffff" style="vertical-align:middle; flex-shrink:0;"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg> Muat Turun
              </button>`
            : `<span title="Dokumen belum lengkap — muat turun hanya tersedia apabila semua dokumen 'Diterima'" style="background: rgba(245, 158, 11, 0.12); color: #b45309; border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 20px; padding: 5px 12px; font-size: 0.76rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="#d97706" style="vertical-align:middle; flex-shrink:0;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg> Belum Lengkap
              </span>`;

        const editBtnHtml = `<button class="btn btn-sm" onclick="openEditStudentModal('${s.regNo}')" title="Sunting Maklumat Pelajar" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff !important; border: none; border-radius: 20px; padding: 6px 14px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(37, 99, 235, 0.4)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 12px rgba(37, 99, 235, 0.3)';">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#ffffff" style="vertical-align:middle; flex-shrink:0;"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg> Sunting
        </button>`;

        const deleteBtnHtml = `<button class="btn btn-sm" onclick="deleteStudent('${s.regNo}')" title="Padam Rekod Pelajar" style="background: rgba(244, 63, 94, 0.08); color: #e11d48 !important; border: 1px solid rgba(244, 63, 94, 0.25); border-radius: 20px; padding: 5px 12px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; transition: all 0.2s;" onmouseover="this.style.background='#e11d48'; this.style.color='#ffffff !important'; this.style.borderColor='#e11d48'; this.style.boxShadow='0 4px 12px rgba(225, 29, 72, 0.3)';" onmouseout="this.style.background='rgba(244, 63, 94, 0.08)'; this.style.color='#e11d48 !important'; this.style.borderColor='rgba(244, 63, 94, 0.25)'; this.style.boxShadow='none';">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle; flex-shrink:0;"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg> Padam
        </button>`;

        const restoreBtnHtml = `<button class="btn btn-sm" onclick="restoreFromPKLI('${s.regNo}')" title="Kembalikan Pelajar ke Senarai Aktif" style="background: linear-gradient(135deg, #10b981, #047857); color: #ffffff !important; border: none; border-radius: 20px; padding: 6px 14px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(16, 185, 129, 0.35)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.25)';">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#ffffff" style="vertical-align:middle; flex-shrink:0;"><path d="M12.5 8c-2.65 0-5.05 1-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg> Pulihkan
        </button>`;

        const actionButtonsHtml = isPKLIMode
            ? `${restoreBtnHtml} ${editBtnHtml} ${deleteBtnHtml}`
            : `${downloadBtn} ${editBtnHtml} ${deleteBtnHtml}`;

        rowsHtml += `
            <tr class="student-table-row" data-dept="${s.jabatan}">
                <td style="text-align: center; vertical-align: middle;">
                    <input type="checkbox" class="student-select-checkbox" data-reg="${s.regNo}" onchange="updateBulkCount()">
                </td>
                <td style="vertical-align: middle;">
                    <div class="table-student-cell" style="display:flex; align-items:center; gap:10px;">
                        <div class="avatar mini-avatar" ${avatarStyle} onclick="showStudentProfilePopup('${s.regNo}')" title="Lihat profil ${s.name}" style="cursor:pointer; transition: transform 0.15s, box-shadow 0.15s;" onmouseover="this.style.transform='scale(1.12)'; this.style.boxShadow='0 4px 14px rgba(99,102,241,0.4)';" onmouseout="this.style.transform=''; this.style.boxShadow='';">${avatarContent}</div>
                        <div>
                            <div style="font-weight:700; color:var(--text-primary); font-size:0.88rem; line-height:1.2;">${s.name} ${isPKLIMode ? `<span class="badge" style="background:rgba(245,158,11,0.15); color:#d97706; font-size:0.68rem; margin-left:4px;">PKLI</span>` : ""}</div>
                            <code style="font-size:0.75rem; opacity:0.85; margin-top:2px; display:inline-block;">${s.regNo}</code>
                        </div>
                    </div>
                </td>
                <td style="vertical-align: middle;">
                    <span style="font-size:0.83rem; font-weight:600;">${s.penasihatAkademikName || (s.penasihatAkademik || 'Belum Diagihkan')}</span>
                </td>
                <td style="vertical-align: middle;">
                    <div style="line-height:1.35;">
                        <span style="font-size:0.85rem; font-weight:700; color:var(--text-primary); display:block;" title="${s.tempatLI}">${s.tempatLI || 'Belum Diagihkan'}</span>
                        ${(() => {
                            const locName = cleanLocationName(s.daerah);
                            const isUnsetLoc = !locName || locName === 'Belum Ditentukan';
                            const badgeBg = isUnsetLoc ? 'rgba(107,114,128,0.08)' : 'rgba(239,68,68,0.08)';
                            const badgeColor = isUnsetLoc ? '#6b7280' : '#dc2626';
                            const badgeBorder = isUnsetLoc ? 'rgba(107,114,128,0.18)' : 'rgba(239,68,68,0.18)';
                            return `<span style="font-size:0.76rem; color:${badgeColor}; font-weight:700; display:inline-flex; align-items:center; gap:5px; margin-top:4px; background:${badgeBg}; padding:2px 9px; border-radius:6px; border:1px solid ${badgeBorder};">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="${badgeColor}" style="vertical-align:middle; flex-shrink:0;"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg> ${locName}
                            </span>`;
                        })()}
                    </div>
                </td>
                <td style="vertical-align: middle; text-align: center;">
                    <div style="display:flex; flex-direction:column; gap:4px; align-items:center; max-width: 170px; margin: 0 auto;">
                        <div class="table-progress-mini" style="width:100%;">
                            <div class="progress-track-mini">
                                <div class="progress-fill-mini" style="width: ${pct}%"></div>
                            </div>
                            <span>${approvedCount}/${requiredDocs.length}</span>
                        </div>
                        <div class="doc-mini-status-grid" style="margin-top:2px; display:flex; flex-wrap:wrap; gap:3px; justify-content:center;">
                            ${docsVisual}
                        </div>
                    </div>
                </td>
                <td style="vertical-align: middle; text-align: center;">
                    <div style="display:flex; gap:6px; align-items:center; justify-content:center; flex-wrap:wrap;">
                        ${actionButtonsHtml}
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;

    // Render pagination controls
    renderPaginationControls(
        filteredStudents.length, 
        state.itemsPerPage, 
        state.currentPage, 
        isPKLIMode ? 'pkli-pagination' : 'admin-students-pagination', 
        (newPage) => {
            window.paginationState[stateKey].currentPage = newPage;
            renderAdminStudentsTable();
        }
    );

    const selectAllCheck = document.getElementById("admin-student-select-all");
    if (selectAllCheck) selectAllCheck.checked = false;
    if (window.updateBulkCount) window.updateBulkCount();
}

document.getElementById("admin-student-search-input").addEventListener("input", () => {
    window.paginationState.adminStudents.currentPage = 1;
    window.paginationState.pkli.currentPage = 1;
    renderAdminStudentsTable();
});

window.deleteStudent = function (regNo) {
    const cleanReg = String(regNo || "").trim().toUpperCase();
    showConfirm(
        `Padam pelajar ${cleanReg}? Ini akan memadamkan semua rekod dokumen mereka secara kekal.`,
        function () {
            const students = getStudents();
            const updated = students.filter(s => String(s.regNo || "").trim().toUpperCase() !== cleanReg);
            deleteStudentFromFirestore(cleanReg);
            saveStudents(updated, "none");
            try { localStorage.setItem("upli_cache_ts", String(Date.now())); } catch(e) {}
            addLog("danger", `Admin memadam maklumat pelajar: ${cleanReg}`);
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

    const state = window.paginationState.adminLecturerAssign;
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const paginatedStudents = filteredStudents.slice(startIndex, startIndex + state.itemsPerPage);

    paginatedStudents.forEach(s => {
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

    renderPaginationControls(
        filteredStudents.length, 
        state.itemsPerPage, 
        state.currentPage, 
        'admin-lecturer-assign-pagination', 
        (newPage) => {
            window.paginationState.adminLecturerAssign.currentPage = newPage;
            renderAdminLecturerAssignTable();
        }
    );
}

document.getElementById("admin-assign-search-input").addEventListener("input", () => {
    window.paginationState.adminLecturerAssign.currentPage = 1;
    renderAdminLecturerAssignTable();
});

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
    
    const state = window.paginationState.adminPA;
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const paginatedStudents = filteredStudents.slice(startIndex, startIndex + state.itemsPerPage);

    paginatedStudents.forEach(s => {
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

    renderPaginationControls(
        filteredStudents.length, 
        state.itemsPerPage, 
        state.currentPage, 
        'admin-pa-pagination', 
        (newPage) => {
            window.paginationState.adminPA.currentPage = newPage;
            renderAdminPATable();
        }
    );
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
        appendix_e2: "Borang Markah Pemantauan",
        appendix_2: "Borang Markah Pemantauan",
        appendix_e3: "Appendix E3 (Markah Penilai)"
    };
    return docs[docId] || docId.toUpperCase().replace("_", " ");
}

window.updateAdminNotifications = function () {
    const notifContainer = document.getElementById("admin-notification-container");
    if (!notifContainer) return;

    // Notifikasi hanya untuk Admin UPLI sahaja
    if (currentRole !== "admin") {
        notifContainer.style.display = "none";
        return;
    }

    notifContainer.style.display = "flex";

    const students = getStudents();
    const activeSesi = getActiveSession();
    const readNotifs = JSON.parse(localStorage.getItem("admin_read_notifs") || "[]");

    // Kumpul semua dokumen "Dalam Semakan" dari sesi aktif
    const pendingReviews = [];
    students.forEach(s => {
        if (s.sesi === activeSesi && s.documents) {
            Object.keys(s.documents).forEach(docKey => {
                const doc = s.documents[docKey];
                if (doc.status === "Dalam Semakan") {
                    const notifId = `${s.regNo}_${docKey}_${doc.uploadDate || ""}`;
                    // Kenal pasti jenis pengirim
                    const isE3 = docKey === "appendix_e3";
                    const isE2 = docKey === "appendix_e2";
                    const isApp2 = docKey === "appendix_2";
                    const isLecturerDoc = isE3 || isE2 || isApp2;
                    const submitterType = isLecturerDoc ? "pensyarah" : "pelajar";

                    let submitterRoleLabel = "Pelajar";
                    let defaultRoleName = "Pensyarah";
                    if (isE3) {
                        submitterRoleLabel = "Pensyarah Penilai";
                        defaultRoleName = s.pensyarahPenilai || "Pensyarah Penilai";
                    } else if (isE2 || isApp2) {
                        submitterRoleLabel = "Pensyarah Pemantau";
                        defaultRoleName = s.pensyarahPemantau || "Pensyarah Pemantau";
                    }

                    const submitterName = isLecturerDoc
                        ? (doc.submittedByName || defaultRoleName)
                        : s.name;

                    pendingReviews.push({
                        notifId,
                        regNo: s.regNo,
                        studentName: s.name,
                        studentClass: s.class || s.dept || "-",
                        docKey,
                        time: doc.uploadDate || "",
                        submitterType,
                        submitterRoleLabel,
                        submitterName,
                        isRead: readNotifs.includes(notifId)
                    });
                }
            });
        }
    });

    // Kira bilangan yang belum dibaca
    const unreadCount = pendingReviews.filter(n => !n.isRead).length;

    // Kemaskini badge
    const badge = document.getElementById("admin-notification-count");
    const bellIcon = notifContainer.querySelector("i.fa-bell");
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
            badge.style.display = "flex";
            // Animasi loceng bergetar jika ada notifikasi belum dibaca
            if (bellIcon) {
                bellIcon.style.color = "var(--color-warning, #f59e0b)";
                bellIcon.style.animation = "bell-shake 1s ease-in-out";
                setTimeout(() => { if (bellIcon) bellIcon.style.animation = ""; }, 1000);
            }
        } else {
            badge.style.display = "none";
            if (bellIcon) {
                bellIcon.style.color = "var(--text-secondary)";
                bellIcon.style.animation = "";
            }
        }
    }

    // Populasi senarai notifikasi
    const list = document.getElementById("admin-notification-list");
    if (list) {
        if (pendingReviews.length === 0) {
            list.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size:0.82rem;">
                <i class="fa-regular fa-bell-slash" style="font-size:1.8rem; margin-bottom:8px; display:block; opacity:0.4;"></i>
                Tiada dokumen menunggu semakan.
            </div>`;
        } else {
            // Susun: belum dibaca dahulu, kemudian ikut masa terkini
            pendingReviews.sort((a, b) => {
                if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
                return (b.time || "").localeCompare(a.time || "");
            });
            let html = "";
            pendingReviews.forEach(item => {
                const unreadDot = !item.isRead
                    ? `<span style="width:8px;height:8px;border-radius:50%;background:var(--color-danger);display:inline-block;margin-right:6px;flex-shrink:0;"></span>`
                    : `<span style="width:8px;height:8px;display:inline-block;margin-right:6px;flex-shrink:0;"></span>`;

                const iconHTML = item.submitterType === "pensyarah"
                    ? `<i class="fa-solid fa-chalkboard-teacher" style="color:var(--color-accent);"></i>`
                    : `<i class="fa-solid fa-user-graduate" style="color:var(--color-success);"></i>`;

                const typeLabel = item.submitterType === "pensyarah"
                    ? `<span style="font-size:0.65rem; font-weight:700; padding:1px 6px; border-radius:4px; background:rgba(99,102,241,0.15); color:var(--color-accent);">${item.submitterRoleLabel}</span>`
                    : `<span style="font-size:0.65rem; font-weight:700; padding:1px 6px; border-radius:4px; background:rgba(34,197,94,0.15); color:var(--color-success);">Pelajar</span>`;

                const bgStyle = item.isRead ? "background:transparent;" : "background:rgba(99,102,241,0.04);";

                html += `
                    <div class="notification-item ${item.isRead ? '' : 'unread'}" 
                        style="padding: 12px 15px; border-bottom: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 5px; cursor: pointer; transition: background 0.2s; ${bgStyle}" 
                        onmouseover="this.style.background='rgba(255,255,255,0.04)'" 
                        onmouseout="this.style.background='${item.isRead ? 'transparent' : 'rgba(99,102,241,0.04)'}'" 
                        onclick="handleNotificationClick('${item.regNo}', '${item.docKey}', '${item.notifId}', event)">
                        <div style="display:flex; align-items:center; gap:6px; justify-content:space-between;">
                            <div style="display:flex; align-items:center; gap:6px;">
                                ${unreadDot} ${iconHTML} ${typeLabel}
                            </div>
                            <span style="font-size:0.65rem; color:var(--text-muted);">${item.time || 'Baru sahaja'}</span>
                        </div>
                        <div style="font-size:0.79rem; color:var(--text-primary); line-height:1.4; padding-left:14px;">
                            ${item.submitterType === 'pensyarah'
                                ? `<strong>${item.submitterName}</strong> menghantar <span style="color:var(--color-accent); font-weight:600;">${getFriendlyDocName(item.docKey)}</span> bagi pelajar <strong>${item.studentName}</strong>`
                                : `<strong>${item.studentName}</strong> (${item.studentClass}) menghantar <span style="color:var(--color-success); font-weight:600;">${getFriendlyDocName(item.docKey)}</span>`
                            }
                        </div>
                    </div>
                `;
            });
            list.innerHTML = html;
        }
    }

    // Kemaskini butang "Tandakan Semua Dibaca"
    const markAllBtn = document.getElementById("notif-mark-all-read");
    if (markAllBtn) {
        markAllBtn.style.display = unreadCount > 0 ? "inline-block" : "none";
    }
};


// Toggle Admin Notification Dropdown
window.toggleAdminNotificationDropdown = function (event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById("admin-notification-dropdown");
    if (dropdown) {
        const isHidden = dropdown.style.display === "none";
        dropdown.style.display = isHidden ? "block" : "none";
    }
};

// Handle Notification Click — dengan tandakan dibaca
window.handleNotificationClick = function (regNo, docKey, notifId, event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById("admin-notification-dropdown");
    if (dropdown) dropdown.style.display = "none";

    // Tandakan notifikasi ini sebagai dibaca
    if (notifId) {
        const readNotifs = JSON.parse(localStorage.getItem("admin_read_notifs") || "[]");
        if (!readNotifs.includes(notifId)) {
            readNotifs.push(notifId);
            localStorage.setItem("admin_read_notifs", JSON.stringify(readNotifs));
        }
    }

    // Buka modal semakan dokumen
    if (typeof window.openDocumentReviewModal === "function") {
        window.openDocumentReviewModal(regNo, docKey);
    }
};

// Tandakan semua notifikasi sebagai dibaca
window.markAllNotificationsRead = function (event) {
    if (event) event.stopPropagation();
    const students = getStudents();
    const activeSesi = getActiveSession();
    const readNotifs = JSON.parse(localStorage.getItem("admin_read_notifs") || "[]");

    students.forEach(s => {
        if (s.sesi === activeSesi && s.documents) {
            Object.keys(s.documents).forEach(docKey => {
                const doc = s.documents[docKey];
                if (doc.status === "Dalam Semakan") {
                    const notifId = `${s.regNo}_${docKey}_${doc.uploadDate || ""}`;
                    if (!readNotifs.includes(notifId)) readNotifs.push(notifId);
                }
            });
        }
    });

    localStorage.setItem("admin_read_notifs", JSON.stringify(readNotifs));
    updateAdminNotifications();
    showToast("Semua notifikasi telah ditandakan sebagai dibaca.", "success");
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

        let lecAvatarStyle = "";
        let lecAvatarContent = getInitials(s.name);
        if (s.profilePic) {
            lecAvatarStyle = `style="background-image: url(${s.profilePic}) !important; background-size: cover !important; background-position: center !important; cursor:pointer;"`;
            lecAvatarContent = "";
        }

        rowsHtml += `
            <tr class="student-table-row" data-dept="${s.jabatan}">
                <td>
                    <div class="table-student-cell">
                        <div class="avatar mini-avatar" ${lecAvatarStyle || 'style="cursor:pointer;"'} onclick="showStudentProfilePopup('${s.regNo}')" title="Lihat profil ${s.name}" onmouseover="this.style.transform='scale(1.12)'; this.style.boxShadow='0 4px 14px rgba(99,102,241,0.4)';" onmouseout="this.style.transform=''; this.style.boxShadow='';">${lecAvatarContent}</div>
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
document.getElementById("admin-pa-search-input")?.addEventListener("input", () => {
    window.paginationState.adminPA.currentPage = 1;
    renderAdminPATable();
});
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

    const state = window.paginationState.adminLecturerList;
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const paginatedLecturers = filtered.slice(startIndex, startIndex + state.itemsPerPage);

    tbody.innerHTML = paginatedLecturers.map(l => {
        let avatarStyle = `style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--color-primary),var(--color-secondary));display:flex;align-items:center;justify-content:center;flex-shrink:0;"`;
        let avatarContent = `<i class="fa-solid fa-user" style="font-size:0.8rem;color:#fff;"></i>`;
        if (l.profilePic) {
            avatarStyle = `style="width:36px;height:36px;border-radius:50%;background-image: url(${l.profilePic}) !important; background-size: cover !important; background-position: center !important; cursor:pointer; flex-shrink:0;" onclick="viewAnyProfilePic('${l.profilePic}', '${l.name.replace(/'/g, "\\'")}')"`;
            avatarContent = "";
        }
        return `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:10px;">
                    <div ${avatarStyle}>
                        ${avatarContent}
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
    `}).join("");

    renderPaginationControls(
        filtered.length, 
        state.itemsPerPage, 
        state.currentPage, 
        'admin-lecturer-list-pagination', 
        (newPage) => {
            window.paginationState.adminLecturerList.currentPage = newPage;
            renderAdminLecturerList();
        }
    );
}

document.getElementById("lecturer-list-search")?.addEventListener("input", () => {
    window.paginationState.adminLecturerList.currentPage = 1;
    renderAdminLecturerList();
});

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
function isValidEmailFormat(str) {
    if (!str || typeof str !== 'string') return false;
    const s = str.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function resolveLecturerNameByEmail(email) {
    if (!email || typeof email !== 'string') return "";
    const e = email.trim().toLowerCase();
    const lecturers = getLecturers();
    const found = lecturers.find(l => (l.email || "").trim().toLowerCase() === e);
    return found ? found.name : "";
}

function normalizeLecturerNameTokens(name) {
    if (!name) return [];
    const STOP = new Set(["pn", "en", "dr", "ts", "prof", "mdm", "cik", "tuan",
                          "haji", "hajah", "hj", "hjh", "bin", "binti", "bt", "b"]);
    return name
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()@]/g, " ")  // strip punctuation and @ in alias names
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
    const phone = document.getElementById("modal-admin-phone") ? document.getElementById("modal-admin-phone").value.trim() : "";
    const telegram = document.getElementById("modal-admin-telegram") ? document.getElementById("modal-admin-telegram").value.trim() : "";

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
        phone,
        telegram,
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
    if (currentRole !== "admin" && currentRole !== "developer") return;

    // Render Admin Personal Profile details (Only if current user is an admin)
    const profileCard = document.getElementById("admin-personal-profile-card");
    if (currentRole === "developer") {
        if (profileCard) profileCard.style.display = "none";
    } else {
        if (profileCard) profileCard.style.display = "flex";
        
        const adminSelfEmailInput = document.getElementById("profile-admin-self-email");
    const adminSelfPhoneInput = document.getElementById("profile-admin-self-phone");
    const adminSelfTgInput = document.getElementById("profile-admin-self-telegram");
    const adminSelfAvatarEl = document.getElementById("admin-profile-card-avatar");
    if (adminSelfEmailInput) adminSelfEmailInput.value = currentUser.email || "";
    if (adminSelfPhoneInput) adminSelfPhoneInput.value = currentUser.phone || "";
    if (adminSelfTgInput) adminSelfTgInput.value = currentUser.telegram || "";
        if (adminSelfAvatarEl) {
            renderProfileAvatar(adminSelfAvatarEl, currentUser.profilePic, currentUser.name || "Admin");
        }
    }

    const admins = getAdmins();
    const tbody = document.getElementById("admin-admins-table-body");
    let rowsHtml = "";
    admins.forEach(a => {
        const isCurrent = a.email === currentUser.email;
        let avatarStyle = `style="background:linear-gradient(135deg, var(--color-accent), #4338ca);"`;
        let avatarContent = getInitials(a.name);
        if (a.profilePic) {
            avatarStyle = `style="background-image: url(${a.profilePic}) !important; background-size: cover !important; background-position: center !important; cursor:pointer;" onclick="if('${a.profilePic}') viewAnyProfilePic('${a.profilePic}', '${a.name.replace(/'/g, "\\'")}')"`;
            avatarContent = "";
        }
        rowsHtml += `
            <tr>
                <td>
                    <div class="table-student-cell">
                        <div class="avatar mini-avatar" ${avatarStyle}>${avatarContent}</div>
                        <strong>${a.name} ${isCurrent ? '<span class="text-accent" style="font-size:0.75rem;">(Anda)</span>' : ''}</strong>
                    </div>
                </td>
                <td><code>${a.email}</code></td>
                <td><code>${a.staffId}</code></td>
                <td><span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> ${a.status || 'Aktif'}</span></td>
                <td>
                        <button class="btn btn-secondary btn-sm" onclick="editAdmin('${a.email}')" style="margin-right: 5px;">
                            <i class="fa-solid fa-pen"></i> Edit
                        </button>
                    ${isCurrent ? '<span class="text-muted" style="font-size:0.8rem;">(Semasa)</span>' : `
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

const editAdminModal = document.getElementById("edit-admin-modal");
const editAdminForm = document.getElementById("edit-admin-form");

document.querySelectorAll("#edit-admin-modal .close-modal-btn").forEach(btn => {
    btn.addEventListener("click", () => editAdminModal.classList.remove("active"));
});

window.editAdmin = function (email) {
    const admins = getAdmins();
    const adminToEdit = admins.find(a => a.email === email);
    if (!adminToEdit) {
        showToast("Admin tidak dijumpai.", "error");
        return;
    }

    document.getElementById("edit-admin-original-email").value = adminToEdit.email;
    document.getElementById("edit-admin-name").value = adminToEdit.name;
    document.getElementById("edit-admin-email").value = adminToEdit.email;
    document.getElementById("edit-admin-id").value = adminToEdit.staffId;
    document.getElementById("edit-admin-phone").value = adminToEdit.phone || "";
    document.getElementById("edit-admin-telegram").value = adminToEdit.telegram || "";
    document.getElementById("edit-admin-status").value = adminToEdit.status || "Aktif";

    editAdminModal.classList.add("active");
};

editAdminForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const originalEmail = document.getElementById("edit-admin-original-email").value;
    const name = document.getElementById("edit-admin-name").value.trim();
    const email = document.getElementById("edit-admin-email").value.trim().toLowerCase();
    const staffId = document.getElementById("edit-admin-id").value.trim();
    const phone = document.getElementById("edit-admin-phone").value.trim();
    const telegram = document.getElementById("edit-admin-telegram").value.trim();
    const status = document.getElementById("edit-admin-status").value;

    if (!email.endsWith("@polikk.edu.my")) {
        showToast("Ralat: Hanya emel @polikk.edu.my dibenarkan!", "error");
        return;
    }

    const admins = getAdmins();
    const adminIndex = admins.findIndex(a => a.email === originalEmail);
    if (adminIndex === -1) {
        showToast("Admin asal tidak dijumpai.", "error");
        return;
    }

    // Check if new email already exists in another record
    if (email !== originalEmail && admins.some(a => a.email === email)) {
        showToast("Ralat: Emel ini telah digunakan oleh admin lain!", "error");
        return;
    }

    admins[adminIndex] = {
        ...admins[adminIndex],
        name,
        email,
        staffId,
        phone,
        telegram,
        status
    };

    saveAdmins(admins);
    addLog("success", `Admin mengemaskini maklumat pentadbir: ${name} (${email})`);
    
    showToast("Maklumat admin berjaya dikemaskini!", "success");
    editAdminModal.classList.remove("active");
    renderAdminAdminsTable();
});

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
    const sorted = [...announcements].sort((a, b) => (getAnnouncementDate(b)).localeCompare(getAnnouncementDate(a)));

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

        const annDate = getAnnouncementDate(a);

        rowsHtml += `
            <tr>
                <td style="white-space: nowrap;">
                    <strong><code>${annDate}</code></strong>
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
    let dateInputVal = document.getElementById("announcement-date-input").value;
    const category = document.getElementById("announcement-category-select").value;
    const content = document.getElementById("announcement-content-input").value.trim();

    if (!title || !category || !content) {
        showToast("Sila lengkapkan tajuk, kategori dan perincian.", "error");
        return;
    }

    // Gunakan tarikh yang dimasukkan oleh admin terus — ia adalah muktamad.
    // JANGAN panggil getAnnouncementDate() kerana ia akan menimpa tarikh betul
    // dengan tarikh yang diekstrak dari teks kandungan.
    let date = dateInputVal ? dateInputVal.trim() : "";

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
        let idx = announcements.findIndex(a => String(a.id).trim() === String(idInput).trim());
        if (idx === -1) {
            idx = announcements.findIndex(a => a.title === title);
        }
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
        } else {
            showToast("Ralat: Makluman yang dikemaskini tidak ditemui.", "error");
            return;
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

    // Auto switch calendar view month/year to match saved date
    if (date) {
        const dateParts = date.split("-");
        if (dateParts.length >= 2) {
            calendarCurrentYear = parseInt(dateParts[0]);
            calendarCurrentMonth = parseInt(dateParts[1]) - 1;
            calendarSelectedDateStr = date;
        }
    }

    resetAnnouncementForm();
    renderAdminAnnouncements();
    renderPortalAnnouncements();
};

window.editAnnouncement = function (id) {
    if (currentRole !== "admin") return;
    const announcements = getAnnouncements();
    const ann = announcements.find(a => String(a.id).trim() === String(id).trim());
    if (!ann) {
        showToast("Makluman tidak ditemui.", "error");
        return;
    }

    // HOTFIX: Gunakan ann.date terus — JANGAN guna getAnnouncementDate() kerana ia
    // akan menimpa tarikh betul dengan tarikh dari teks kandungan.
    const resolvedDate = ann.date || "";

    document.getElementById("announcement-id-input").value = ann.id;
    document.getElementById("announcement-title-input").value = ann.title;
    document.getElementById("announcement-date-input").value = resolvedDate;
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
    document.getElementById("announcement-date-input").value = "";
};

window.deleteAnnouncement = function (id) {
    if (currentRole !== "admin") return;
    const announcements = getAnnouncements();
    const ann = announcements.find(a => String(a.id).trim() === String(id).trim());
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
    writeStudentDocumentToFirestore(students[studentIdx].regNo, docId, docData);
    currentUser = students[studentIdx];
    try {
        localStorage.setItem("upli_current_user", JSON.stringify(currentUser));
        sessionStorage.setItem("upli_current_user", JSON.stringify(currentUser));
        sessionStorage.setItem("upli_user", JSON.stringify(currentUser));
    } catch(e) {}
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
            try {
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

                const studentDept = (currentUser.jabatan || currentUser.dept || activeAdminStudentDept || "JKA").toUpperCase().trim();
                const studentSesi = currentUser.sesi || getActiveSession() || "Sesi 1:2026/2027";
                const studentName = (currentUser.name || currentUser.nama || "Pelajar").toUpperCase().trim();

                const res = await callGoogleScript("uploadFile", {
                    regNo: currentUser.regNo,
                    studentName: studentName,
                    dept: studentDept,
                    sesi: studentSesi,
                    docId: docId,
                    fileName: finalFileName,
                    base64Data: base64Data
                });

                if (res && (res.fileId || res.fileUrl || res.status === "success")) {
                    // Find student in local array, or use currentUser as fallback
                    const students = getStudents();
                    let studentIdx = students.findIndex(s => String(s.regNo || "").trim().toUpperCase() === String(currentUser.regNo || "").trim().toUpperCase());
                    if (studentIdx !== -1) {
                        const docData = {
                            status: "Dalam Semakan",
                            fileName: finalFileName,
                            fileSize: res.fileSize || sizeStr,
                            uploadDate: formattedTime,
                            fileId: res.fileId || "",
                            fileUrl: res.fileUrl || "",
                            feedback: ""
                        };
                        window.uploadProgress[docId] = 100;
                        updateUploadProgressDOM(docId, 100);
                        saveDocumentToStudent(studentIdx, docId, docData, students);
                        return;
                    } else {
                        // Firestore-only student: save directly to currentUser + Firestore
                        const docData = {
                            status: "Dalam Semakan",
                            fileName: finalFileName,
                            fileSize: res.fileSize || sizeStr,
                            uploadDate: formattedTime,
                            fileId: res.fileId || "",
                            fileUrl: res.fileUrl || "",
                            feedback: ""
                        };
                        if (!currentUser.documents) currentUser.documents = {};
                        currentUser.documents[docId] = docData;
                        // Save directly to Firestore
                        try {
                            if (typeof db !== "undefined") {
                                await writeStudentDocumentToFirestore(currentUser.regNo, docId, docData);
                            }
                        } catch(e) { console.warn("Direct Firestore doc save:", e); }
                        // ✅ FIX: Simpan currentUser ke localStorage supaya dokumen kekal selepas refresh
                        try {
                            localStorage.setItem("upli_current_user", JSON.stringify(currentUser));
                            sessionStorage.setItem("upli_current_user", JSON.stringify(currentUser));
                            sessionStorage.setItem("upli_user", JSON.stringify(currentUser));
                        } catch(e) {}
                        window.uploadProgress[docId] = 100;
                        updateUploadProgressDOM(docId, 100);
                        addLog("info", `Pelajar ${currentUser.name} memuat naik dokumen: ${getDocMetadata(docId, currentUser).title}`);
                        showToast(`Fail "${finalFileName}" berjaya dimuat naik untuk semakan.`, "success");
                        renderStudentDocuments();
                        return;
                    }
                } else {
                    console.warn("Google Drive upload response invalid/failed, switching to Firebase Storage fallback...", res);
                }
            } catch (gdErr) {
                console.warn("Google Drive upload exception, switching to Firebase Storage fallback...", gdErr);
            }
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

        // Fallback: save to Firestore (base64 chunks)
        const students = getStudents();
        const studentIdx = students.findIndex(s => String(s.regNo || "").trim().toUpperCase() === String(currentUser.regNo || "").trim().toUpperCase());

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

        if (studentIdx !== -1) {
            saveDocumentToStudent(studentIdx, docId, docData, students);
        } else {
            // Firestore-only student: save directly
            if (!currentUser.documents) currentUser.documents = {};
            currentUser.documents[docId] = docData;
            try {
                if (typeof db !== "undefined") {
                    await writeStudentDocumentToFirestore(currentUser.regNo, docId, docData);
                }
            } catch(e) { console.warn("Direct Firestore doc save (fallback):", e); }
            // ✅ FIX: Simpan currentUser ke localStorage supaya dokumen kekal selepas refresh
            try {
                localStorage.setItem("upli_current_user", JSON.stringify(currentUser));
                sessionStorage.setItem("upli_current_user", JSON.stringify(currentUser));
                sessionStorage.setItem("upli_user", JSON.stringify(currentUser));
            } catch(e) {}
            addLog("info", `Pelajar ${currentUser.name} memuat naik dokumen: ${getDocMetadata(docId, currentUser).title}`);
            showToast(`Fail "${finalFileName}" berjaya dimuat naik untuk semakan.`, "success");
            renderStudentDocuments();
        }
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

window.deleteLecturerDocument = function (regNo, docId) {
    alert("DEBUG UPLI: Butang Padam Ditekan (Pensyarah)!");
    const cleanReg = String(regNo || "").trim().toUpperCase();
    showConfirm("Adakah anda pasti mahu memadam/membatalkan penyerahan borang markah ini?", async function() {
        const students = getStudents();
        const studentIdx = students.findIndex(s => String(s.regNo || "").trim().toUpperCase() === cleanReg);
        if (studentIdx === -1) return;

        // Dapatkan fileId sebelum dipadam untuk tujuan pemadaman dari Google Drive
        const existingDoc = students[studentIdx].documents ? students[studentIdx].documents[docId] : null;
        const fileId = existingDoc ? (existingDoc.fileId || existingDoc.driveFileId) : null;
        
        if (!fileId) {
            alert("DEBUG UPLI: fileId tiada! Data dokumen: " + JSON.stringify(existingDoc));
        }

        const blankDoc = {
            status: "Belum Dihantar",
            fileName: "",
            fileSize: "",
            uploadDate: "",
            feedback: "",
            fileData: "",
            fileUrl: "",
            fileRef: "",
            fileId: ""
        };

        if (!students[studentIdx].documents) students[studentIdx].documents = {};
        students[studentIdx].documents[docId] = blankDoc;
        saveStudents(students, cleanReg);
        writeStudentDocumentToFirestore(cleanReg, docId, blankDoc);

    // Padam dari Firestore chunked storage (fallback)
    const fsFileId = `${sanitizeDocId(cleanReg)}_${docId}`;
    try {
        if (typeof db !== "undefined" && db && db.collection) {
            await db.collection("file_data").doc(`${fsFileId}_0`).delete().catch(() => {});
        }
    } catch (e) {}

    // Padam dari Google Drive secara latar belakang (background) jika ada fileId
    if (fileId && typeof callGoogleScript === "function") {
        showToast("Memadam dari Google Drive...", "info");
        console.log('[Pensyarah Delete] Menghantar arahan padam ke Google Drive untuk fileId:', fileId);
        try {
            const res = await callGoogleScript("deleteFile", { fileId: fileId, regNo: cleanReg, docId: docId });
            console.log('[Pensyarah Delete] Respons padam:', res);
        } catch (err) {
            console.error('[Pensyarah Delete] Ralat semasa memadam:', err);
        }
    }

    showToast("Borang markah telah dipadam / dibatalkan penyerahan.", "success");
    renderLecturerStudentsList();
    });
};

window.triggerLecturerUpload = function (regNo, docId) {
    var input = document.getElementById('dynamic-lecturer-upload-input');
    if (!input) {
        input = document.createElement('input');
        input.type = 'file';
        input.id = 'dynamic-lecturer-upload-input';
        input.accept = '.pdf,.png,.jpg,.jpeg,.doc,.docx';
        input.style.display = 'none';
        document.body.appendChild(input);
    }
    input.value = '';
    input.onchange = function () {
        if (input.files && input.files[0]) {
            handleLecturerFileUpload(regNo, docId, input);
        }
    };
    input.click();
};

window.handleLecturerFileUpload = async function (regNo, docId, inputEl) {
    console.log('[Pensyarah Upload] dipanggil: regNo=' + regNo + ', docId=' + docId);
    // GUARD: Halang SWR daripada render semula semasa upload berlaku
    window._lecturerUploadInProgress = true;

    var file = inputEl && inputEl.files ? inputEl.files[0] : null;
    if (!file) {
        window._lecturerUploadInProgress = false;
        showToast('Tiada fail dipilih.', 'warning');
        return;
    }
    console.log('[Pensyarah Upload] Fail dipilih:', file.name, '(', file.size, 'bytes)');

    if (file.size > FS_MAX_FILE_SIZE) {
        window._lecturerUploadInProgress = false;
        showToast('Fail terlalu besar! Had ialah ' + (FS_MAX_FILE_SIZE / 1024 / 1024) + 'MB.', 'error');
        return;
    }

    var cleanReg = String(regNo || '').trim().toUpperCase();
    var isE3 = docId === 'appendix_e3';
    var isE2 = docId === 'appendix_e2';
    var isApp2 = docId === 'appendix_2';
    var isLecturerDoc = isE3 || isE2 || isApp2;

    // Set flag untuk tunjukkan loading spinner pada kad ini
    window._lecturerUploadingFor = cleanReg + '_' + docId;
    try { renderLecturerStudentsList(); } catch(e) {}

    var now = new Date();
    var formattedTime = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0');

    showToast('Memproses fail...', 'info');

    try {
        var isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png)$/i.test(file.name);
        var finalFileName = file.name;
        if (isImage) {
            if (!finalFileName.toLowerCase().endsWith('.jpg') && !finalFileName.toLowerCase().endsWith('.jpeg')) {
                finalFileName = finalFileName.substring(0, finalFileName.lastIndexOf('.')) + '.jpg';
            }
        }
        var rawSizeKB = file.size / 1024;
        var sizeStr = rawSizeKB > 1000 ? (rawSizeKB / 1024).toFixed(1) + ' MB' : Math.round(rawSizeKB) + ' KB';

        var students = getStudents();
        var studentIdx = students.findIndex(function(s) {
            return String(s.regNo || '').trim().toUpperCase() === cleanReg;
        });
        console.log('[Pensyarah Upload] studentIdx:', studentIdx);
        if (studentIdx === -1) {
            window._lecturerUploadInProgress = false;
            showToast('Gagal menemui profil pelajar.', 'error');
            return;
        }

        var student = students[studentIdx];
        var submitterRoleName = isE3 ? 'Pensyarah Penilai' : 'Pensyarah Pemantau';
        var docTitle = isE3 ? 'Appendix E3' : 'Borang Markah Pemantauan';
        var docData = null;

        // ── LALUAN 1: Google Drive (sama seperti upload pelajar) ──────────────
        if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== '') {
            showToast('Membaca fail...', 'info');
            var base64Data;
            try {
                if (isImage) {
                    base64Data = await compressImage(file, 1000, 1000, 0.6);
                } else {
                    base64Data = await readFileAsBase64(file);
                }
                if (base64Data && base64Data.includes(';base64,')) {
                    base64Data = base64Data.split(';base64,')[1];
                }

                showToast('Menyimpan ke Google Drive...', 'info');
                var studentDept = (student.jabatan || student.dept || 'JKA').toUpperCase().trim();
                var studentSesi = student.sesi || getActiveSession() || 'Sesi 1:2026/2027';
                var studentName = (student.name || student.nama || 'Pelajar').toUpperCase().trim();

                console.log('[Pensyarah Upload] Menghantar ke Google Drive...');
                var res = await callGoogleScript('uploadFile', {
                    regNo: cleanReg,
                    studentName: studentName,
                    dept: studentDept,
                    sesi: studentSesi,
                    docId: docId,
                    fileName: finalFileName,
                    base64Data: base64Data
                });
                console.log('[Pensyarah Upload] Respons Google Drive:', res);

                if (res && (res.fileId || res.fileUrl || res.status === 'success')) {
                    docData = {
                        status: isLecturerDoc ? 'Dalam Semakan' : 'Diterima',
                        fileName: finalFileName,
                        fileSize: res.fileSize || sizeStr,
                        uploadDate: formattedTime,
                        fileId: res.fileId || '',
                        fileUrl: res.fileUrl || '',
                        feedback: isLecturerDoc ? 'Menunggu pengesahan Admin UPLI' : '',
                        submittedBy: (currentUser && currentUser.email) ? currentUser.email : '',
                        submittedByName: (currentUser && (currentUser.name || currentUser.displayName)) ? (currentUser.name || currentUser.displayName) : submitterRoleName
                    };
                    console.log('[Pensyarah Upload] Google Drive berjaya! docData:', JSON.stringify({status: docData.status, fileName: docData.fileName, fileUrl: docData.fileUrl}));
                } else {
                    console.warn('[Pensyarah Upload] Google Drive gagal atau tiada respons, guna fallback...', res);
                }
            } catch (gdErr) {
                console.warn('[Pensyarah Upload] Google Drive exception, guna fallback...', gdErr);
            }
        }

        // ── LALUAN 2: Firebase Storage / Base64 Fallback ─────────────────────
        if (!docData) {
            console.log('[Pensyarah Upload] Menggunakan Firebase Storage / Base64 fallback...');
            var storagePath = 'lecturer_docs/' + cleanReg + '/' + docId + '/' + Date.now() + '_' + finalFileName;
            var result = await uploadFileWithFallback(file, storagePath, null);
            console.log('[Pensyarah Upload] Hasil storage:', result);

            docData = {
                status: isLecturerDoc ? 'Dalam Semakan' : 'Diterima',
                fileName: finalFileName,
                fileSize: sizeStr,
                uploadDate: formattedTime,
                feedback: isLecturerDoc ? 'Menunggu pengesahan Admin UPLI' : '',
                submittedBy: (currentUser && currentUser.email) ? currentUser.email : '',
                submittedByName: (currentUser && (currentUser.name || currentUser.displayName)) ? (currentUser.name || currentUser.displayName) : submitterRoleName
            };

            if (!result.useBase64) {
                docData.fileUrl = result.downloadURL;
            } else {
                showToast('Menyimpan fail ke pangkalan data...', 'info');
                var b64;
                if (isImage) {
                    b64 = await compressImage(file, 1000, 1000, 0.6);
                } else {
                    b64 = await readFileAsBase64(file);
                }
                var b64SizeKB = (b64.length * 3 / 4) / 1024;
                docData.fileSize = b64SizeKB > 1000 ? (b64SizeKB / 1024).toFixed(1) + ' MB' : Math.round(b64SizeKB) + ' KB';
                var fileRef = await saveFileToFirestore(cleanReg, docId, b64);
                docData.fileRef = fileRef;
                docData.fileData = b64;
            }
        }

        // ── SIMPAN KE CACHE & FIRESTORE ───────────────────────────────────────
        if (!students[studentIdx].documents) students[studentIdx].documents = {};
        students[studentIdx].documents[docId] = docData;
        console.log('[Pensyarah Upload] Menyimpan docData:', JSON.stringify({status: docData.status, fileName: docData.fileName}));
        saveStudents(students, cleanReg);
        writeStudentDocumentToFirestore(cleanReg, docId, docData);

        // Kemas kini SWR timestamp supaya tidak timpa data baru
        try { localStorage.setItem('upli_cache_ts', String(Date.now())); } catch(e) {}

        // Log & toast
        if (isLecturerDoc) {
            try { addLog('info', submitterRoleName + ' menghantar ' + docTitle + ' bagi pelajar ' + student.name + ' (' + cleanReg + ')'); } catch(e) {}
        }
        showToast(docTitle + ' berjaya dihantar!', 'success');

        // Kosongkan loading flag dan render semula
        window._lecturerUploadingFor = null;
        try { renderLecturerStudentsList(); } catch(e) { console.error('render error:', e); }

        // Lepaskan SWR guard selepas 2 saat
        setTimeout(function() {
            window._lecturerUploadInProgress = false;
            try { renderLecturerStudentsList(); } catch(e) {}
            console.log('[Pensyarah Upload] Selesai. Guard dilepaskan.');
        }, 2000);

    } catch (err) {
        window._lecturerUploadingFor = null;
        window._lecturerUploadInProgress = false;
        console.error('[Pensyarah Upload] RALAT:', err);
        showToast('Gagal memuat naik fail: ' + (err.message || err), 'error');
        try { renderLecturerStudentsList(); } catch(e) {}
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

        const countDisplay = document.getElementById("bulk-select-count");
        if (countDisplay) {
            countDisplay.textContent = `${checkedCount} pelajar dipilih`;
        }

        // --- Bulk Delete button ---
        if (bulkDeleteBtn) {
            if (checkedCount > 0) {
                bulkDeleteBtn.disabled          = false;
                bulkDeleteBtn.style.opacity     = "1";
                bulkDeleteBtn.style.cursor      = "pointer";
                bulkDeleteBtn.style.background  = "var(--color-danger)";
                bulkDeleteBtn.style.color       = "white";
                bulkDeleteBtn.style.borderColor = "var(--color-danger)";
            } else {
                bulkDeleteBtn.disabled          = true;
                bulkDeleteBtn.style.opacity     = "0.5";
                bulkDeleteBtn.style.cursor      = "not-allowed";
                bulkDeleteBtn.style.background  = "rgba(244,63,94,0.08)";
                bulkDeleteBtn.style.color       = "var(--color-danger)";
                bulkDeleteBtn.style.borderColor = "rgba(244,63,94,0.15)";
            }
        }

        // --- Bulk Approve BP button (Header) ---
        const headerBulkApproveBtn = document.getElementById("btn-header-bulk-approve-bp");
        if (headerBulkApproveBtn) {
            if (checkedCount > 0) {
                headerBulkApproveBtn.disabled      = false;
                headerBulkApproveBtn.style.opacity = "1";
                headerBulkApproveBtn.style.cursor  = "pointer";
            } else {
                headerBulkApproveBtn.disabled      = true;
                headerBulkApproveBtn.style.opacity = "0.5";
                headerBulkApproveBtn.style.cursor  = "not-allowed";
            }
        }

        // --- Bulk Move to PKLI / Restore button ---
        const bulkMovePKLIBtn = document.getElementById("btn-bulk-move-pkli");
        if (bulkMovePKLIBtn) {
            const isPKLIMode = activeAdminStudentTabMode === "pkli";
            if (isPKLIMode) {
                bulkMovePKLIBtn.innerHTML = `<i class="fa-solid fa-rotate-left"></i> Pulihkan Terpilih`;
            } else {
                bulkMovePKLIBtn.innerHTML = `<i class="fa-solid fa-user-clock"></i> Pindah ke PKLI`;
            }

            if (checkedCount > 0) {
                bulkMovePKLIBtn.disabled          = false;
                bulkMovePKLIBtn.style.opacity     = "1";
                bulkMovePKLIBtn.style.cursor      = "pointer";
                bulkMovePKLIBtn.style.background  = isPKLIMode ? "rgba(16,185,129,0.18)" : "rgba(245,158,11,0.18)";
                bulkMovePKLIBtn.style.borderColor = isPKLIMode ? "rgba(16,185,129,0.5)"  : "rgba(245,158,11,0.5)";
                bulkMovePKLIBtn.style.color       = isPKLIMode ? "#059669" : "#d97706";
            } else {
                bulkMovePKLIBtn.disabled          = true;
                bulkMovePKLIBtn.style.opacity     = "0.5";
                bulkMovePKLIBtn.style.cursor      = "not-allowed";
                bulkMovePKLIBtn.style.background  = isPKLIMode ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.1)";
                bulkMovePKLIBtn.style.borderColor = isPKLIMode ? "rgba(16,185,129,0.2)"  : "rgba(245,158,11,0.3)";
                bulkMovePKLIBtn.style.color       = isPKLIMode ? "#059669" : "#d97706";
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
                saveStudents(updated, "none");
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

                writeStudentDocumentToFirestore(reg, "borang_pendaftaran_li", students[idx].documents.borang_pendaftaran_li);

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

    // ── BULK MOVE / RESTORE PKLI ───────────────────────────────────────────
    const bulkMovePKLIBtn = document.getElementById("btn-bulk-move-pkli");
    if (bulkMovePKLIBtn) {
        bulkMovePKLIBtn.addEventListener("click", () => {
            const checkboxes = document.querySelectorAll(".student-select-checkbox:checked");
            const regs = Array.from(checkboxes).map(cb => cb.dataset.reg);
            if (regs.length === 0) return;

            const isPKLIMode = activeAdminStudentTabMode === "pkli";
            const confirmMsg = isPKLIMode
                ? `Adakah anda pasti mahu mengembalikan ${regs.length} pelajar PKLI yang dipilih ke senarai Pelajar Aktif?`
                : `Adakah anda pasti mahu memindahkan ${regs.length} pelajar yang dipilih ke Senarai PKLI (Penilaian Khas LI)?`;

            showConfirm(
                confirmMsg,
                function () {
                    const students = getStudents();
                    const pkliSet  = getPKLIRegNoSet();

                    regs.forEach(reg => {
                        const cleanReg = String(reg).trim().toUpperCase();
                        const st = students.find(s => String(s.regNo).trim().toUpperCase() === cleanReg);
                        if (st) {
                            st.isPKLI   = !isPKLIMode;
                            st.statusLI = isPKLIMode ? "Aktif" : "PKLI";
                            if (isPKLIMode) {
                                pkliSet.delete(cleanReg);
                                if (typeof db !== 'undefined' && db.collection) {
                                    db.collection("settings").doc("pkli_ids").set({
                                        list: firebase.firestore.FieldValue.arrayRemove(cleanReg)
                                    }, { merge: true }).catch(e => console.warn("FS arrayRemove PKLI:", e));
                                    db.collection("students").doc(sanitizeDocId(cleanReg)).set({
                                        isPKLI: false,
                                        statusLI: "Aktif"
                                    }, { merge: true }).catch(e => console.warn("FS set student PKLI false:", e));
                                }
                            } else {
                                pkliSet.add(cleanReg);
                                if (typeof db !== 'undefined' && db.collection) {
                                    db.collection("settings").doc("pkli_ids").set({
                                        list: firebase.firestore.FieldValue.arrayUnion(cleanReg)
                                    }, { merge: true }).catch(e => console.warn("FS arrayUnion PKLI:", e));
                                    db.collection("students").doc(sanitizeDocId(cleanReg)).set({
                                        isPKLI: true,
                                        statusLI: "PKLI"
                                    }, { merge: true }).catch(e => console.warn("FS set student PKLI true:", e));
                                }
                            }
                        }
                    });

                    savePKLIRegNoSet(pkliSet, true);
                    saveStudents(students, regs.length === 1 ? regs[0] : regs);
                    
                    const actionLabel = isPKLIMode ? "mengembalikan dari PKLI" : "memindahkan ke Senarai PKLI";
                    addLog("warning", `Admin ${actionLabel} bagi ${regs.length} pelajar.`);
                    
                    const toastMsg = isPKLIMode
                        ? `Berjaya! ${regs.length} pelajar telah dikembalikan ke senarai Pelajar Aktif.`
                        : `Berjaya! ${regs.length} pelajar telah dipindahkan ke Senarai PKLI.`;
                    showToast(toastMsg, isPKLIMode ? "success" : "warning");

                    document.querySelectorAll(".student-select-checkbox").forEach(cb => cb.checked = false);
                    if (selectAllCheck) {
                        selectAllCheck.checked       = false;
                        selectAllCheck.indeterminate = false;
                    }
                    updateBulkCount();

                    // Auto switch mode to PKLI if moved to PKLI
                    if (!isPKLIMode) {
                        switchAdminStudentTabMode("pkli");
                    } else {
                        renderAdminStudentsTable();
                    }
                    renderAdminDashboard();
                    updatePKLICountBadge();
                },
                isPKLIMode ? "Pulihkan Terpilih" : "⚠️ Pindah ke PKLI",
                isPKLIMode ? "Ya, Pulihkan" : "Ya, Pindahkan"
            );
        });
    }

function switchAdminStudentTabMode(mode) {
    activeAdminStudentTabMode = mode;
    try { sessionStorage.setItem("upli_admin_tab_mode", mode); } catch(e){}
    const subtabActive = document.getElementById("subtab-active-students");
    const subtabPKLI   = document.getElementById("subtab-pkli-students");
    if (mode === "pkli") {
        if (subtabPKLI && subtabActive) {
            subtabPKLI.classList.add("active");
            subtabActive.classList.remove("active");
            subtabPKLI.style.background = "#d97706";
            subtabPKLI.style.color = "#ffffff";
            subtabActive.style.background = "rgba(255,255,255,0.06)";
            subtabActive.style.color = "var(--text-muted)";
        }
    } else {
        if (subtabActive && subtabPKLI) {
            subtabActive.classList.add("active");
            subtabPKLI.classList.remove("active");
            subtabActive.style.background = "var(--color-primary)";
            subtabActive.style.color = "#ffffff";
            subtabPKLI.style.background = "rgba(245,158,11,0.08)";
            subtabPKLI.style.color = "#d97706";
        }
    }
    renderAdminStudentsTable();
    updatePKLICountBadge();
}
window.switchAdminStudentTabMode = switchAdminStudentTabMode;

    // ── SUBTAB MODE LISTENERS (Pelajar Aktif vs Senarai PKLI) ───────────────
    const subtabActive = document.getElementById("subtab-active-students");
    const subtabPKLI   = document.getElementById("subtab-pkli-students");

    if (subtabActive && subtabPKLI) {
        subtabActive.addEventListener("click", () => switchAdminStudentTabMode("active"));
        subtabPKLI.addEventListener("click", () => switchAdminStudentTabMode("pkli"));
    }

    // Restore active subtab state on DOM load if saved in sessionStorage
    if (activeAdminStudentTabMode === "pkli" && subtabActive && subtabPKLI) {
        subtabPKLI.classList.add("active");
        subtabActive.classList.remove("active");
        subtabPKLI.style.background = "#d97706";
        subtabPKLI.style.color = "#ffffff";
        subtabActive.style.background = "rgba(255,255,255,0.06)";
        subtabActive.style.color = "var(--text-muted)";
    }

    // ── PKLI MODAL & LIST LISTENERS ─────────────────────────────────────────
    const btnViewPKLIList = document.getElementById("btn-view-pkli-list");
    const pkliModal       = document.getElementById("pkli-list-modal");
    const btnClosePKLI    = document.getElementById("btn-close-pkli-modal");
    const pkliSearchInput = document.getElementById("pkli-search-input");

    if (btnViewPKLIList) {
        btnViewPKLIList.addEventListener("click", () => {
            if (activeAdminStudentTabMode === "pkli") {
                switchAdminStudentTabMode("active");
            } else {
                switchAdminStudentTabMode("pkli");
            }
            const tableTitle = document.getElementById("admin-students-table-title");
            if (tableTitle) tableTitle.scrollIntoView({ behavior: "smooth", block: "start" });
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
        let avatarStyle = "";
        let avatarContent = getInitials(s.name);
        if (s.profilePic) {
            avatarStyle = `style="background-image: url(${s.profilePic}) !important; background-size: cover !important; background-position: center !important;"`;
            avatarContent = "";
        }
        rowsHtml += `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div class="avatar mini-avatar" ${avatarStyle}>${avatarContent}</div>
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
    const cleanReg = String(regNo).trim().toUpperCase();
    const st = students.find(s => String(s.regNo).trim().toUpperCase() === cleanReg || s.regNo === regNo);
    if (st) {
        showConfirm(
            `Adakah anda pasti mahu memulihkan pelajar ${st.name} (${cleanReg}) dari Senarai PKLI ke senarai Pelajar Berdaftar (Aktif)?`,
            function() {
                st.isPKLI   = false;
                st.statusLI = "Aktif";

                const pkliSet = getPKLIRegNoSet();
                pkliSet.delete(cleanReg);
                savePKLIRegNoSet(pkliSet, true);

                if (typeof db !== 'undefined' && db.collection) {
                    db.collection("settings").doc("pkli_ids").set({
                        list: firebase.firestore.FieldValue.arrayRemove(cleanReg)
                    }, { merge: true }).catch(e => console.warn("FS arrayRemove PKLI:", e));

                    db.collection("students").doc(sanitizeDocId(cleanReg)).set({
                        isPKLI: false,
                        statusLI: "Aktif"
                    }, { merge: true }).catch(e => console.warn("FS set student PKLI false:", e));
                }

                saveStudents(students, cleanReg);
                addLog("info", `Admin mengembalikan pelajar ${st.name} (${cleanReg}) dari Senarai PKLI ke senarai Pelajar Berdaftar.`);
                showToast(`Berjaya! Pelajar ${st.name} telah dikembalikan ke senarai Pelajar Berdaftar.`, "success");

                renderPKLITable();
                renderAdminStudentsTable();
                renderAdminDashboard();
                updatePKLICountBadge();
            },
            "Pulihkan Pelajar dari PKLI",
            "Ya, Pulihkan"
        );
    }
};

function updatePKLICountBadge() {
    const students = getStudents();
    const activeDept = (activeAdminStudentDept || "JKA").toUpperCase().trim();
    const activeSesi = getActiveSession();

    // Filter PKLI students strictly by active department AND active session
    const deptPKLICount = students.filter(s =>
        Boolean(s.isPKLI) &&
        (s.jabatan || "").toUpperCase().trim() === activeDept &&
        isStudentInSession(s, activeSesi)
    ).length;

    const totalPKLICount = students.filter(s =>
        Boolean(s.isPKLI) && isStudentInSession(s, activeSesi)
    ).length;

    const badge = document.getElementById("pkli-count-badge");
    if (badge) {
        badge.textContent = deptPKLICount;
        badge.style.cssText = "background:#0f172a !important; color:#facc15 !important; font-weight:900 !important; margin-left:6px; padding:3px 8px; border-radius:12px; font-size:0.78rem; box-shadow:0 2px 6px rgba(0,0,0,0.3);";
    }

    const tabBadge = document.getElementById("pkli-tab-count-badge");
    if (tabBadge) {
        tabBadge.textContent = deptPKLICount;
        tabBadge.style.cssText = "background:#0f172a !important; color:#facc15 !important; font-weight:900 !important; margin-left:6px; padding:3px 8px; border-radius:12px; font-size:0.78rem; box-shadow:0 2px 6px rgba(0,0,0,0.3);";
    }

    const DEPT_ICONS = {
        JKA: '<i class="fa-solid fa-mountain-city"></i>',
        JKE: '<i class="fa-solid fa-bolt"></i>',
        JKM: '<i class="fa-solid fa-gears"></i>',
        JP:  '<i class="fa-solid fa-chart-line"></i>',
        JPH: '<i class="fa-solid fa-utensils"></i>'
    };

    // Update individual department tab buttons with their respective PKLI counts — preserving icons!
    document.querySelectorAll("#admin-students-dept-tabs .dept-tab-btn").forEach(btn => {
        const d = (btn.dataset.dept || "").toUpperCase().trim();
        const icon = DEPT_ICONS[d] || '';
        const count = students.filter(s =>
            Boolean(s.isPKLI) &&
            (s.jabatan || "").toUpperCase().trim() === d &&
            isStudentInSession(s, activeSesi)
        ).length;

        if (d === activeDept) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }

        if (count > 0) {
            btn.innerHTML = `${icon} ${d} <span class="badge" style="background:#0f172a !important; color:#facc15 !important; margin-left:6px; padding:3px 8px; border-radius:12px; font-size:0.76rem; font-weight:900; box-shadow:0 2px 6px rgba(0,0,0,0.3); line-height:1;">${count} PKLI</span>`;
        } else {
            btn.innerHTML = `${icon} ${d}`;
        }
    });

    const btnViewPKLIList = document.getElementById("btn-view-pkli-list");
    if (btnViewPKLIList) {
        if (activeAdminStudentTabMode === "pkli") {
            btnViewPKLIList.innerHTML = `<i class="fa-solid fa-arrow-left" style="font-size:0.95rem;"></i> Kembali ke Pelajar Berdaftar`;
            btnViewPKLIList.style.background = "linear-gradient(135deg, #4f46e5, #3730a3)";
            btnViewPKLIList.style.boxShadow = "0 4px 12px rgba(79, 70, 229, 0.25)";
            btnViewPKLIList.title = "Kembali ke senarai Pelajar Berdaftar (Aktif / Bukan PKLI)";
        } else {
            let label = `Senarai PKLI (${activeDept})`;
            btnViewPKLIList.innerHTML = `<i class="fa-solid fa-user-clock" style="font-size:0.95rem;"></i> ${label} <span id="pkli-count-badge" class="badge" style="background:#0f172a !important; color:#facc15 !important; margin-left:6px; padding:3px 8px; border-radius:12px; font-size:0.78rem; font-weight:900; box-shadow:0 2px 6px rgba(0,0,0,0.3);">${deptPKLICount}</span>`;
            btnViewPKLIList.style.background = "linear-gradient(135deg, #f59e0b, #d97706)";
            btnViewPKLIList.style.boxShadow = "0 4px 12px rgba(245, 158, 11, 0.25)";
            if (deptPKLICount === 0 && totalPKLICount > 0) {
                btnViewPKLIList.title = `Jabatan ${activeDept} tiada pelajar PKLI (Terdapat ${totalPKLICount} pelajar PKLI di jabatan lain bagi sesi ini)`;
            } else {
                btnViewPKLIList.title = `Lihat ${deptPKLICount} pelajar Penilaian Khas LI (PKLI) bagi jabatan ${activeDept}`;
            }
        }
    }
}
// Reset ALL PKLI students globally back to Active status
async function resetAllPKLIGlobal() {
    showConfirm(
        "Adakah anda pasti mahu MENGESET SEMUA SENARAI PKLI kembali kepada Pelajar Aktif/Berdaftar? Semua pelajar PKLI akan dikembalikan ke senarai utama.",
        async function() {
            showDBLoading(true);
            try {
                // 1. Reset localStorage
                localStorage.setItem("upli_pkli_ids", JSON.stringify([]));

                // 2. Reset memory students
                if (dbCache.students && Array.isArray(dbCache.students)) {
                    dbCache.students.forEach(st => {
                        if (st) {
                            st.isPKLI = false;
                            if (st.statusLI === "PKLI") st.statusLI = "Aktif";
                        }
                    });
                }

                // 3. Save to localStorage
                if (typeof saveStudentsLocalStorage === "function") {
                    saveStudentsLocalStorage(dbCache.students);
                }

                // 4. Reset Firestore pkli_ids document & student documents
                if (typeof db !== 'undefined' && db && db.collection) {
                    await db.collection("settings").doc("pkli_ids").set({ list: [] }).catch(e => console.warn("FS reset pkli_ids:", e));
                    
                    const snap = await db.collection("students").where("isPKLI", "==", true).get().catch(() => null);
                    if (snap && !snap.empty) {
                        const batch = db.batch();
                        snap.docs.forEach(doc => {
                            batch.update(doc.ref, { isPKLI: false, statusLI: "Aktif" });
                        });
                        await batch.commit().catch(e => console.warn("FS batch reset PKLI students:", e));
                    }
                }

                // 5. Reset Google Sheets if configured
                if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim()) {
                    await callGoogleScript("writeSettings", { data: { pkli_ids: [] } }).catch(() => null);
                }

                normalizeStudentsCache();
                if (typeof updatePKLICountBadge === "function") updatePKLICountBadge();
                if (typeof requestTabDataRender === "function") requestTabDataRender();
                addLog("warning", "Admin mengeset semula (reset) SEMUA Senarai PKLI kembali kepada Pelajar Berdaftar.");
                showToast("Berjaya! Semua pelajar PKLI telah dikembalikan ke senarai Pelajar Berdaftar (Aktif).", "success");
            } catch (err) {
                console.error("Reset PKLI error:", err);
                showToast("Ralat semasa mengeset semula PKLI: " + err.message, "danger");
            } finally {
                showDBLoading(false);
            }
        },
        "Reset Semua PKLI",
        "Ya, Reset Semua"
    );
}
window.resetAllPKLIGlobal = resetAllPKLIGlobal;

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
            saveStudents([], "none");
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

// Theme Toggle Disabled (Unified Default Theme)
window.toggleAppTheme = function() {};

function initTheme() {
    localStorage.removeItem("upli_theme");
    document.body.classList.remove("light-mode");
    const t1 = document.getElementById("theme-toggle-btn");
    if (t1) t1.style.display = "none";
    const t2 = document.getElementById("portal-theme-toggle-btn");
    if (t2) t2.style.display = "none";
}

// Profile updates (Student)
function updateSelfProfile() {
    if (currentRole !== "student" || !currentUser) return;

    const email = document.getElementById("profile-self-email").value.trim();
    const phone = document.getElementById("profile-self-phone").value.trim();

    const students = getStudents();
    const idx = students.findIndex(s => s.regNo === currentUser.regNo);
    if (idx !== -1) {
        // ✅ Perbaikan: Kemaskini hanya medan profil sahaja (jangan tulis balik semua pelajar ke GAS)
        writeStudentProfileFieldsOnly(currentUser.regNo, { email, phone });

        students[idx].email = email;
        students[idx].phone = phone;
        try { localStorage.setItem("upli_students", JSON.stringify(dbCache.students)); } catch(e) {}

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

    if (file.size > 8 * 1024 * 1024) {
        showToast("Gagal: Saiz fail imej melebihi had 8MB!", "error");
        input.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const rawBase64 = e.target.result;
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement("canvas");
            const maxDim = 300;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxDim) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                }
            } else {
                if (height > maxDim) {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);
            const base64 = canvas.toDataURL("image/jpeg", 0.85);

            if (type === "self") {
                if (currentRole !== "student" || !currentUser) return;
                const students = getStudents();
                const idx = students.findIndex(s => s.regNo === currentUser.regNo);
                if (idx !== -1) {
                    students[idx].profilePic = base64;
                    currentUser.profilePic = base64;

                    // ✅ Perbaikan: Hanya kemaskini profilePic sahaja, jangan tulis balik ke GAS
                    writeStudentProfileFieldsOnly(currentUser.regNo, { profilePic: base64 });
                    try { localStorage.setItem("upli_students", JSON.stringify(dbCache.students)); } catch(e) {}

                    // Update avatar visuals
                    const selfAvatarEl = document.getElementById("profile-card-avatar");
                    renderProfileAvatar(selfAvatarEl, base64, currentUser.name);
                    updateUserAvatars(currentUser);
                    try { sessionStorage.setItem("upli_user", JSON.stringify(currentUser)); } catch(e){}
                    showToast("Gambar profil berjaya dikemas kini!", "success");
                }
            } else if (type === "admin-self") {
                if (currentRole !== "admin" || !currentUser) return;
                const admins = getAdmins();
                const idx = admins.findIndex(a => a.staffId === currentUser.staffId && a.email === currentUser.email);
                if (idx !== -1) {
                    admins[idx].profilePic = base64;
                    currentUser.profilePic = base64;

                    saveAdmins(admins);

                    // Update avatar visuals
                    const adminSelfAvatarEl = document.getElementById("admin-profile-card-avatar");
                    renderProfileAvatar(adminSelfAvatarEl, base64, currentUser.name || "Admin");
                    updateUserAvatars(currentUser);
                    try { sessionStorage.setItem("upli_user", JSON.stringify(currentUser)); } catch(e){}
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
        img.src = rawBase64;
    };
    reader.readAsDataURL(file);
}

// ── Kemaskini medan profil pelajar (phone/email/profilePic) SAHAJA tanpa menulis semua pelajar ke GAS ──
// Ini mengelakkan data lain (paName, pensyarahPemantauName, dll) daripada tertimpa oleh cache pelajar
function writeStudentProfileFieldsOnly(regNo, fields) {
    if (!regNo || !fields) return;
    const cleanReg = sanitizeDocId(regNo);

    // Firestore partial update (.update() hanya kemaskini medan yang dinyatakan)
    if (typeof db !== 'undefined' && db && db.collection) {
        db.collection("students").doc(cleanReg).update(fields)
            .catch(e => {
                // .update() akan gagal jika dokumen belum wujud — guna .set() dengan merge
                db.collection("students").doc(cleanReg).set(fields, { merge: true })
                    .catch(e2 => console.warn("writeStudentProfileFieldsOnly err:", e2.message));
            });
    }
    // Tiada GAS write — pelajar tidak patut menulis balik semua data ke Google Sheets
}

function deleteProfilePic(type) {
    if (type === "self") {
        if (currentRole !== "student" || !currentUser) return;
        if (!currentUser.profilePic) {
            showToast("Tiada gambar profil untuk dipadam.", "info");
            return;
        }
        const students = getStudents();
        const idx = students.findIndex(s => s.regNo === currentUser.regNo);
        if (idx !== -1) {
            delete students[idx].profilePic;
            // ✅ Perbaikan: Hanya padam profilePic di Firestore sahaja, jangan tulis balik ke GAS
            db.collection("students").doc(sanitizeDocId(currentUser.regNo)).update({ profilePic: firebase.firestore.FieldValue.delete() })
                .catch(e => console.warn("deleteProfilePic err:", e.message));
            try { localStorage.setItem("upli_students", JSON.stringify(dbCache.students)); } catch(e) {}
            delete currentUser.profilePic;

            const selfAvatarEl = document.getElementById("profile-card-avatar");
            renderProfileAvatar(selfAvatarEl, null, currentUser.name);
            let input; if (currentRole === "admin") { input = document.getElementById("profile-pic-upload-admin-self"); } else { input = document.getElementById("profile-pic-upload-self"); }
            if (input) input.value = "";

            updateUserAvatars(currentUser);
            try { sessionStorage.setItem("upli_user", JSON.stringify(currentUser)); } catch(e){}
            showToast("Gambar profil berjaya dipadam!", "success");
        }
    } else if (type === "admin-self") {
        if (currentRole !== "admin" || !currentUser) return;
        if (!currentUser.profilePic) {
            showToast("Tiada gambar profil untuk dipadam.", "info");
            return;
        }
        const admins = getAdmins();
        const idx = admins.findIndex(a => a.staffId === currentUser.staffId && a.email === currentUser.email);
        if (idx !== -1) {
            delete admins[idx].profilePic;
            saveAdmins(admins);
            delete currentUser.profilePic;

            const adminSelfAvatarEl = document.getElementById("admin-profile-card-avatar");
            renderProfileAvatar(adminSelfAvatarEl, null, currentUser.name || "Admin");
            const input = document.getElementById("profile-pic-upload-admin-self");
            if (input) input.value = "";

            updateUserAvatars(currentUser);
            try { sessionStorage.setItem("upli_user", JSON.stringify(currentUser)); } catch(e){}
            showToast("Gambar profil berjaya dipadam!", "success");
        }
    }
}

function updateSelfProfile() {
    if (currentRole !== "student" || !currentUser) return;
    const emailEl = document.getElementById("profile-self-email");
    const phoneEl = document.getElementById("profile-self-phone");
    if (!emailEl || !phoneEl) return;

    const email = emailEl.value.trim();
    const phone = phoneEl.value.trim();

    const students = getStudents();
    const idx = students.findIndex(s => s.regNo === currentUser.regNo);
    if (idx !== -1) {
        // ✅ Perbaikan: Kemaskini hanya medan profil sahaja (jangan tulis balik semua pelajar ke GAS)
        writeStudentProfileFieldsOnly(currentUser.regNo, { email, phone });

        students[idx].email = email;
        students[idx].phone = phone;
        try { localStorage.setItem("upli_students", JSON.stringify(dbCache.students)); } catch(e) {}

        currentUser.email = email;
        currentUser.phone = phone;
        try { sessionStorage.setItem("upli_user", JSON.stringify(currentUser)); } catch(e){}
        showToast("Profil peribadi berjaya dikemas kini!", "success");
    }
}

window.saveAdminPhone = async function() {
    const phoneInput = document.getElementById("profile-admin-self-phone");
    if (!phoneInput) return;
    
    const newPhone = phoneInput.value.trim();
    if (currentUser.phone === newPhone) return;

    try {
        const btn = phoneInput.nextElementSibling;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        btn.disabled = true;

        const docRef = db.collection("settings").doc("admins");
        const doc = await docRef.get();
        if (doc.exists && doc.data().list) {
            let adminsArr = doc.data().list;
            const idx = adminsArr.findIndex(a => a.email === currentUser.email && String(a.staffId) === String(currentUser.staffId));
            if (idx > -1) {
                if (newPhone === "") {
                    delete adminsArr[idx].phone;
                } else {
                    adminsArr[idx].phone = newPhone;
                }
                await docRef.update({ list: adminsArr });
                
                currentUser.phone = newPhone === "" ? undefined : newPhone;
                try { sessionStorage.setItem("upli_user", JSON.stringify(currentUser)); } catch(e){}
                
                showToast("Nombor telefon berjaya dikemaskini.", "success");
            } else {
                showToast("Ralat: Profil pentadbir tidak dijumpai di pangkalan data.", "error");
            }
        } else {
            showToast("Ralat: Senarai pentadbir tidak wujud.", "error");
        }
        
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    } catch(err) {
        console.error("Error saving phone:", err);
        showToast("Ralat menyimpan nombor telefon: " + err.message, "error");
    }
};

window.saveAdminTelegram = async function() {
    const tgInput = document.getElementById("profile-admin-self-telegram");
    if (!tgInput) return;
    
    const newTg = tgInput.value.trim();
    if (currentUser.telegram === newTg) return;

    try {
        const btn = tgInput.nextElementSibling;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        btn.disabled = true;

        const docRef = db.collection("settings").doc("admins");
        const doc = await docRef.get();
        if (doc.exists && doc.data().list) {
            let adminsArr = doc.data().list;
            const idx = adminsArr.findIndex(a => a.email === currentUser.email && String(a.staffId) === String(currentUser.staffId));
            if (idx > -1) {
                if (newTg === "") {
                    delete adminsArr[idx].telegram;
                } else {
                    adminsArr[idx].telegram = newTg;
                }
                await docRef.update({ list: adminsArr });
                
                currentUser.telegram = newTg === "" ? undefined : newTg;
                try { sessionStorage.setItem("upli_user", JSON.stringify(currentUser)); } catch(e){}
                
                showToast("Pautan Telegram berjaya dikemaskini.", "success");
            } else {
                showToast("Ralat: Profil pentadbir tidak dijumpai di pangkalan data.", "error");
            }
        } else {
            showToast("Ralat: Senarai pentadbir tidak wujud.", "error");
        }
        
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    } catch(err) {
        console.error("Error saving telegram:", err);
        showToast("Ralat menyimpan pautan Telegram: " + err.message, "error");
    }
};
window.handleProfilePicUploaded = handleProfilePicUploaded;
window.deleteProfilePic = deleteProfilePic;
window.updateSelfProfile = updateSelfProfile;

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
        dbCache.announcements= sanitizeAnnouncementsData(JSON.parse(ls.getItem("upli_announcements") || JSON.stringify(DEFAULT_ANNOUNCEMENTS)));
    } catch(e) {}

    // ── STEP 2: Start UI immediately with cached data ──
    startClock();
    setupBulkActionListeners();
    initTheme();
    populateGlobalSessionSelect();

    // ── STEP 2: Automatic Session Restoration on Refresh ──
    const savedUserStr = sessionStorage.getItem('upli_user');
    const savedRole    = sessionStorage.getItem('upli_role');

    if (savedUserStr && savedRole) {
        try {
            let savedUser = JSON.parse(savedUserStr);

            // ✅ FIX: Merge data dari upli_current_user (lebih terkini) supaya dokumen kekal selepas refresh
            try {
                const currentUserStr = localStorage.getItem("upli_current_user") || sessionStorage.getItem("upli_current_user");
                if (currentUserStr) {
                    const currentUserData = JSON.parse(currentUserStr);
                    // Pastikan ini pengguna yang sama berdasarkan regNo atau email
                    const isSameUser = (savedUser.regNo && currentUserData.regNo &&
                        String(savedUser.regNo).trim().toUpperCase() === String(currentUserData.regNo).trim().toUpperCase()) ||
                        (savedUser.email && currentUserData.email && savedUser.email === currentUserData.email);
                    if (isSameUser && currentUserData.documents) {
                        savedUser.documents = savedUser.documents || {};
                        Object.keys(currentUserData.documents).forEach(dk => {
                            const cDoc = currentUserData.documents[dk];
                            if (cDoc && cDoc.status && cDoc.status !== "Belum Dihantar") {
                                savedUser.documents[dk] = cDoc;
                            } else if (!savedUser.documents[dk]) {
                                savedUser.documents[dk] = cDoc;
                            }
                        });
                        console.log("[Session Restore] ✅ Dokumen dipulihkan dari upli_current_user:", Object.keys(currentUserData.documents).length, "dokumen");
                    }
                }
            } catch(e) {}

            // ✅ SINKRONKAN JUGA KE dbCache.students SUPAYA getStudents() TIDAK MENGANDUNGI DATA DOKUMEN KOSONG
            if (savedUser && savedUser.regNo && savedUser.documents && Array.isArray(dbCache.students)) {
                const cleanR = String(savedUser.regNo).trim().toUpperCase();
                const matchedSt = dbCache.students.find(s => s && String(s.regNo).trim().toUpperCase() === cleanR);
                if (matchedSt) {
                    matchedSt.documents = matchedSt.documents || {};
                    Object.keys(savedUser.documents).forEach(dk => {
                        const sDoc = savedUser.documents[dk];
                        if (sDoc && sDoc.status && sDoc.status !== "Belum Dihantar") {
                            matchedSt.documents[dk] = sDoc;
                        }
                    });
                    try { localStorage.setItem("upli_students", JSON.stringify(dbCache.students)); } catch(e){}
                }
            }

            loginUser(savedUser, savedRole);
        } catch (e) {
            if (dashboardLayout) {
                dashboardLayout.style.display = "none";
                dashboardLayout.classList.remove("active");
            }
            if (loginView) {
                loginView.style.display = "flex";
                loginView.classList.add("active");
            }
            const savedPortalTab = sessionStorage.getItem('upli_active_portal_tab') || 'dashboard';
            switchPortalTab(savedPortalTab);
        }
    } else {
        if (dashboardLayout) {
            dashboardLayout.style.display = "none";
            dashboardLayout.classList.remove("active");
        }
        if (loginView) {
            loginView.style.display = "flex";
            loginView.classList.add("active");
        }
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

    // Theme toggle button click listeners
    const toggleBtn = document.getElementById("theme-toggle-btn");
    if (toggleBtn) {
        toggleBtn.onclick = function(e) {
            e.preventDefault();
            toggleAppTheme();
        };
    }

    const portalToggleBtn = document.getElementById("portal-theme-toggle-btn");
    if (portalToggleBtn) {
        portalToggleBtn.onclick = function(e) {
            e.preventDefault();
            toggleAppTheme();
        };
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
                                <span><i class="fa-regular fa-calendar"></i> ${formatMalayDate(r.uploadDate)}</span>
                            </div>
                            <div class="rubrik-card-author">
                                <i class="fa-solid fa-user-shield" style="margin-right:4px;"></i>Dimuat naik oleh: ${r.uploadedBy || 'Admin'}
                            </div>
                        </div>
                    </div>
                    <div class="rubrik-card-actions">
                        <a href="#" onclick="event.preventDefault(); window.viewRubrik('${r.id}', '${r.title.replace(/'/g, "\\'")}')" class="btn btn-sm" style="background:linear-gradient(135deg,#6366f1,#4f46e5); color:#fff; border:none;">
                            <i class="fa-solid fa-eye"></i> Papar
                        </a>
                        <a href="#" onclick="event.preventDefault(); window.downloadRubrik('${r.id}', '${r.fileName.replace(/'/g, "\\'")}')" class="btn btn-sm" style="background:linear-gradient(135deg,#059669,#047857); color:#fff; border:none;">
                            <i class="fa-solid fa-download"></i> Muat Turun
                        </a>
                        <button class="btn btn-danger btn-sm" onclick="deleteRubrik('${r.id}')">
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
                const formattedDate = formatMalayDate(r.uploadDate);
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
                                        <span><i class="fa-regular fa-calendar"></i> ${formattedDate}</span>
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
    } else if (tabName === 'contact') {
        const btn = document.getElementById("btn-portal-contact");
        if (btn) btn.classList.add("active");
        document.getElementById("portal-tab-contact").style.display = "block";
        renderPortalContactAdmins();
    }
};

window.renderPortalContactAdmins = async function() {
    const container = document.getElementById("portal-contact-admins-container");
    if (!container) return;
    
    try {
        const doc = await db.collection("settings").doc("admins").get();
        if (doc.exists && doc.data().list) {
            const admins = doc.data().list;
            if (admins.length === 0) {
                container.innerHTML = `<div style="text-align: center; color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important; padding: 40px; grid-column: 1 / -1;">Tiada pentadbir direkodkan.</div>`;
                return;
            }
            
            let html = "";
            admins.forEach(a => {
                let avatarStyle = `style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg, var(--color-accent), #4338ca);display:flex;align-items:center;justify-content:center;margin:0 auto 15px auto;font-size:2rem;color:#fff;font-weight:bold;box-shadow:0 4px 10px rgba(0,0,0,0.2);"`;
                let avatarContent = typeof getInitials === "function" ? getInitials(a.name) : (a.name ? a.name.substring(0,2).toUpperCase() : "?");
                
                if (a.profilePic) {
                    avatarStyle = `style="width:80px;height:80px;border-radius:50%;background-image:url(${a.profilePic});background-size:cover;background-position:center;margin:0 auto 15px auto;box-shadow:0 4px 10px rgba(0,0,0,0.2);cursor:pointer;" onclick="if(window.viewAnyProfilePic) viewAnyProfilePic('${a.profilePic}', '${a.name.replace(/'/g, "\\'")}')"`;
                    avatarContent = "";
                }
                
                let tgBtnHtml = "";
                if (a.telegram) {
                    let tgLink = a.telegram.trim();
                    if (!tgLink.startsWith("http")) {
                        tgLink = tgLink.startsWith("@") ? `https://t.me/${tgLink.substring(1)}` : `https://t.me/${tgLink}`;
                    }
                    tgBtnHtml = `
                    <div style="margin-top: 15px;">
                        <a href="${tgLink}" target="_blank" style="display: block; width: 100%; padding: 10px; background: #0088cc; color: white; text-align: center; border-radius: 8px; text-decoration: none; font-weight: bold; transition: background 0.2s; box-sizing: border-box;" onmouseover="this.style.background='#007ab8'" onmouseout="this.style.background='#0088cc'">
                            <i class="fa-brands fa-telegram"></i> Hubungi di Telegram
                        </a>
                    </div>`;
                }

                html += `
                    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 16px; padding: 25px 20px; text-align: center; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column;" onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 20px rgba(56, 189, 248, 0.15)';" onmouseout="this.style.transform=''; this.style.boxShadow='';">
                        <div ${avatarStyle}>${avatarContent}</div>
                        <h3 style="color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; font-size: 1.2rem; font-weight: 700; margin: 0 0 5px 0;">${a.name}</h3>
                        <div style="display:inline-block; background: rgba(56, 189, 248, 0.15); color: #38bdf8 !important; -webkit-text-fill-color: #38bdf8 !important; font-size: 0.75rem; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 15px; align-self: center;">Pentadbir Sistem</div>
                        
                        <div style="display: flex; flex-direction: column; gap: 8px; text-align: left; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; flex-grow: 1;">
                            <div style="display:flex; align-items:flex-start; gap:10px;">
                                <i class="fa-solid fa-envelope" style="color: #38bdf8 !important; -webkit-text-fill-color: #38bdf8 !important; margin-top: 3px;"></i>
                                <div style="color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important; font-size: 0.9rem; word-break: break-all;">${a.email || '-'}</div>
                            </div>
                            ${a.phone ? `
                            <div style="display:flex; align-items:flex-start; gap:10px;">
                                <i class="fa-solid fa-phone" style="color: #38bdf8 !important; -webkit-text-fill-color: #38bdf8 !important; margin-top: 3px;"></i>
                                <div style="color: #cbd5e1 !important; -webkit-text-fill-color: #cbd5e1 !important; font-size: 0.9rem;">${a.phone}</div>
                            </div>
                            ` : ""}
                        </div>
                        ${tgBtnHtml}
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px; grid-column: 1 / -1;">Tiada data pentadbir.</div>`;
        }
    } catch(err) {
        console.error("Error loading contact admins:", err);
        container.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 40px; grid-column: 1 / -1;">Ralat memuatkan senarai pentadbir. Sila cuba sebentar lagi.</div>`;
    }
};

// ---------- Portal Calendar & Announcements Rendering ----------
window.renderPortalAnnouncements = function () {
    renderCalendar();
    renderAnnouncementsList();
};

// ---------- Department Stats Modal & SVGs ----------
window.DEPT_SVGS = {
    JKA: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>`,
    JKE: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    JKM: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    JP:  `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
    JPH: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v20"/><path d="M22 2v20"/><path d="M18 10h4"/><path d="M10 2v6a3 3 0 0 1-6 0V2"/><path d="M7 8v14"/></svg>`
};

const DEPT_CONFIG = {
    JKA: { name: "Jabatan Kejuruteraan Awam", icon: "fa-solid fa-mountain-city", color: "#10b981", glow: "rgba(16,185,129,0.2)", programs: ["DKA", "DUB", "DBK"] },
    JKE: { name: "Jabatan Kejuruteraan Elektrik", icon: "fa-solid fa-bolt", color: "#f43f5e", glow: "rgba(244,63,94,0.2)", programs: ["DEE", "DEP", "DTK"] },
    JKM: { name: "Jabatan Kejuruteraan Mekanikal", icon: "fa-solid fa-gears", color: "#facc15", glow: "rgba(250,204,21,0.2)", programs: ["DKM", "DTP", "DEM"] },
    JP:  { name: "Jabatan Perdagangan", icon: "fa-solid fa-chart-line", color: "#3b82f6", glow: "rgba(59,130,246,0.2)", programs: ["DPR", "DLS", "DAT"] },
    JPH: { name: "Jabatan Pelancongan & Hospitaliti", icon: "fa-solid fa-utensils", color: "#8b5cf6", glow: "rgba(139,92,246,0.2)", programs: ["DHR", "DHM", "KOK"] }
};

window.openDeptStatsModal = function(deptCode) {
    window.currentActiveDeptModal = deptCode;
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
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.9rem;padding:12px 16px;border:1.5px solid #cbd5e1 !important;background:#ffffff !important;border-radius:12px;margin-bottom:6px;box-shadow:0 3px 8px rgba(0,0,0,0.08);opacity:1 !important;">
                <span style="font-weight:900;color:#0f172a !important;-webkit-text-fill-color:#0f172a !important;">${prog}</span>
                <span style="color:#334155 !important;-webkit-text-fill-color:#334155 !important;font-size:0.85rem;font-weight:700;">
                    <strong style="color:#0f172a !important;-webkit-text-fill-color:#0f172a !important;font-weight:900;">${progStudents.length}</strong> Pelajar
                    <span style="color:#047857 !important;-webkit-text-fill-color:#047857 !important;font-weight:900;margin-left:4px;">(${progCompleteCount} Lengkap)</span>
                </span>
            </div>
        `;
    });

    const content = `
        <div class="dept-card-animated dept-card-${deptCode}" style="border-radius:20px;padding:24px;min-height:260px;background:#0f172a !important;border:2.5px solid ${cfg.color} !important;box-shadow:0 20px 50px rgba(0,0,0,0.7) !important;opacity:1 !important;">
            <!-- Header Banner inside Modal -->
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;background:linear-gradient(135deg, ${cfg.color}, #0f172a) !important;padding:16px 20px;border-radius:16px;border:1.5px solid ${cfg.color};box-shadow:0 6px 18px rgba(0,0,0,0.3);">
                <div class="dept-icon-box" style="width:52px; height:52px; border-radius:14px; background:${cfg.color} !important; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px ${cfg.glow}; flex-shrink:0; border:2px solid #ffffff;">
                    ${(window.DEPT_SVGS && window.DEPT_SVGS[deptCode]) ? window.DEPT_SVGS[deptCode] : `<i class="${cfg.icon}" style="color:#ffffff !important;"></i>`}
                </div>
                <div>
                    <h4 style="font-family:var(--font-display);font-size:1.35rem;font-weight:900;color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;line-height:1.2;margin:0;text-shadow:0 2px 4px rgba(0,0,0,0.5);">${deptCode}</h4>
                    <span style="font-size:0.85rem;color:#f8fafc !important;-webkit-text-fill-color:#f8fafc !important;font-weight:700;">${cfg.name}</span>
                </div>
            </div>

            <!-- Rate Donut Chart & Stats (Compact Layout) -->
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 18px; background: #ffffff !important; padding: 16px 20px; border-radius: 16px; border: 2px solid ${cfg.color}; box-shadow: 0 4px 16px rgba(0,0,0,0.15); opacity:1 !important;">
                <!-- Donut Chart Container -->
                <div style="position: relative; width: 76px; height: 76px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <canvas id="modal-donut-${deptCode}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></canvas>
                    <div style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 900; color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; pointer-events: none; z-index: 2;">
                        ${deptRate}%
                    </div>
                </div>
                <!-- Stats Text -->
                <div>
                    <span style="font-size: 0.78rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.6px; color: #0f172a !important; -webkit-text-fill-color: #0f172a !important;">KADAR SIAP DOKUMEN</span>
                    <h3 style="font-family: var(--font-display); font-size: 1.6rem; font-weight: 900; color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; margin: 2px 0;">${deptRate}%</h3>
                    <span style="font-size: 0.88rem; color: #047857 !important; -webkit-text-fill-color: #047857 !important; font-weight: 800;">${deptCompleteCount} / ${total} Pelajar Lengkap</span>
                </div>
            </div>

            <!-- Program List -->
            <div style="display:flex;flex-direction:column;gap:6px;">
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
        
        // Find announcements on this day using getAnnouncementDate
        const dayAnnouncements = announcements.filter(a => getAnnouncementDate(a) === dayStr);

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
    const announcements = getAnnouncements();

    let filtered = announcements;

    if (calendarSelectedDateStr) {
        // Filter by specific date selected on calendar
        filtered = announcements.filter(a => getAnnouncementDate(a) === calendarSelectedDateStr);
        if (listTitle) {
            const parts = calendarSelectedDateStr.split('-');
            const dayNum = parseInt(parts[2]);
            const monthIdx = parseInt(parts[1]) - 1;
            const monthName = (monthIdx >= 0 && monthIdx < MALAY_MONTHS.length) ? MALAY_MONTHS[monthIdx] : parts[1];
            listTitle.textContent = `Makluman pada ${dayNum} ${monthName} ${parts[0]}`;
        }
    } else {
        // Filter by current month & year
        filtered = announcements.filter(a => {
            const dateStr = getAnnouncementDate(a);
            if (!dateStr) return false;
            const dateParts = dateStr.split("-");
            return parseInt(dateParts[0]) === calendarCurrentYear && parseInt(dateParts[1]) === (calendarCurrentMonth + 1);
        });

        if (listTitle) {
            listTitle.textContent = `Makluman Bulan Ini (${MALAY_MONTHS[calendarCurrentMonth]} ${calendarCurrentYear})`;
        }
    }

    // Sort descending by date (latest announcements first)
    filtered.sort((a, b) => (getAnnouncementDate(b)).localeCompare(getAnnouncementDate(a)));

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

        // Date format for display (e.g. 23 Julai 2026)
        let displayDate = formatMalayDate(getAnnouncementDate(a));

        const card = document.createElement("div");
        card.className = "announcement-card-item";
        card.innerHTML = `
            <div class="announcement-card-meta">
                <span class="badge ${badgeClass}"><i class="${icon}"></i> ${a.category}</span>
                <span class="announcement-date-text"><i class="fa-regular fa-calendar" style="margin-right:4px;"></i>${displayDate}</span>
            </div>
            <h4 class="announcement-card-title">${a.title}</h4>
            <p class="announcement-card-desc">${(a.content || '').replace(/\n/g, '<br>')}</p>
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

// ── Student Profile Popup ──
window.showStudentProfilePopup = function(regNo) {
    const students = getStudents();
    const s = students.find(st => st.regNo === regNo);
    if (!s) return;

    const popup = document.getElementById("student-profile-popup");
    const avatarEl = document.getElementById("spp-avatar");
    const nameEl   = document.getElementById("spp-name");
    const regEl    = document.getElementById("spp-regno");
    const emailEl  = document.getElementById("spp-email");
    const phoneEl  = document.getElementById("spp-phone");
    if (!popup || !avatarEl) return;

    // Avatar
    avatarEl.textContent = "";
    if (s.profilePic) {
        avatarEl.style.backgroundImage = `url(${s.profilePic})`;
        avatarEl.style.backgroundSize = "cover";
        avatarEl.style.backgroundPosition = "center";
    } else {
        avatarEl.style.backgroundImage = "none";
        avatarEl.textContent = getInitials(s.name);
    }

    nameEl.textContent  = s.name || "-";
    regEl.textContent   = s.regNo || "";

    // Email
    if (s.email) {
        emailEl.innerHTML = `<a href="mailto:${s.email}" style="color: #60a5fa; text-decoration: none; font-weight:600;">${s.email}</a>`;
    } else {
        emailEl.innerHTML = `<span style="color: var(--text-muted); font-style: italic;">Tiada Maklumat</span>`;
    }

    // Phone
    if (s.phone) {
        phoneEl.innerHTML = `<a href="tel:${s.phone}" style="color: #34d399; text-decoration: none; font-weight:600;">${s.phone}</a>`;
    } else {
        phoneEl.innerHTML = `<span style="color: var(--text-muted); font-style: italic;">Tiada Maklumat</span>`;
    }

    popup.style.display = "flex";
    document.body.style.overflow = "hidden";
};

window.closeStudentProfilePopup = function() {
    const popup = document.getElementById("student-profile-popup");
    if (popup) popup.style.display = "none";
    document.body.style.overflow = "";
};

// Close popup on Escape key
document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") closeStudentProfilePopup();
});

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

let auditLogsCache = null;
window.renderAuditLogs = async function() {
    const tbody = document.getElementById("audit-logs-table-body");
    if (!tbody) return;

    if (typeof db === 'undefined' || !db.collection) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;" class="text-danger">Gagal menghubungi pengkalan data (Firestore).</td></tr>`;
        return;
    }

    try {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Memuatkan log aktiviti...</td></tr>`;
        
        // Fetch logs only if cache is null or we force a refresh (e.g. from the button)
        if (!auditLogsCache || event?.type === 'click') {
            const snapshot = await db.collection("audit_logs")
                .orderBy("timestamp", "desc")
                .limit(100)
                .get();
            
            auditLogsCache = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    formattedTime: data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString('ms-MY', {
                        day: '2-digit', month: '2-digit', year: 'numeric', 
                        hour: '2-digit', minute:'2-digit', hour12:true
                    }) : "N/A"
                };
            });
        }

        if (auditLogsCache.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;" class="text-muted">Tiada log aktiviti setakat ini.</td></tr>`;
            return;
        }

        const state = window.paginationState.auditLogs;
        const startIndex = (state.currentPage - 1) * state.itemsPerPage;
        const paginatedLogs = auditLogsCache.slice(startIndex, startIndex + state.itemsPerPage);

        tbody.innerHTML = paginatedLogs.map(log => `
            <tr>
                <td style="white-space:nowrap;font-size:0.8rem;">${log.formattedTime}</td>
                <td><strong>${log.userEmail || '-'}</strong></td>
                <td><span class="badge" style="background:#f1f5f9;color:#475569;">${log.role || '-'}</span></td>
                <td><span class="badge" style="background:var(--color-primary);color:#fff;">${log.action || '-'}</span></td>
                <td>${log.details || '-'}</td>
            </tr>
        `).join("");

        renderPaginationControls(
            auditLogsCache.length, 
            state.itemsPerPage, 
            state.currentPage, 
            'audit-logs-pagination', 
            (newPage) => {
                window.paginationState.auditLogs.currentPage = newPage;
                renderAuditLogs();
            }
        );

    } catch (e) {
        console.error("Error fetching audit logs:", e);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;" class="text-danger">Ralat memuatkan log: ${e.message}</td></tr>`;
    }
};

window.populateDeveloperPanel = function() {
    renderAuditLogs();
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
        if (window.logActivity) window.logActivity("KEMASKINI", "Tetapan sistem (developer) telah dikemaskini.");
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

/* ==========================================================================
   INTERACTIVE CANVAS BACKGROUND SYSTEM
   ========================================================================== */
function initInteractiveBackground() {
    const canvas = document.getElementById("interactive-bg-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;

    function resize() {
        const parent = canvas.parentElement || document.body;
        width = canvas.width = parent.clientWidth || window.innerWidth;
        height = canvas.height = parent.clientHeight || window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Mouse tracking
    const mouse = { x: -1000, y: -1000, radius: 170, active: false };

    window.addEventListener("mousemove", (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        mouse.active = true;
    });

    window.addEventListener("mouseleave", () => {
        mouse.active = false;
        mouse.x = -1000;
        mouse.y = -1000;
    });

    // Touch support
    window.addEventListener("touchmove", (e) => {
        if (e.touches.length > 0) {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.touches[0].clientX - rect.left;
            mouse.y = e.touches[0].clientY - rect.top;
            mouse.active = true;
        }
    }, { passive: true });

    // Ripple click effect
    const ripples = [];
    window.addEventListener("click", (e) => {
        const rect = canvas.getBoundingClientRect();
        ripples.push({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            radius: 0,
            maxRadius: 240,
            opacity: 0.6
        });
    });

    // Particle class
    const colors = ["#00f2fe", "#38bdf8", "#10b981", "#60a5fa", "#facc15"];
    const particlesCount = Math.min(Math.floor((width * height) / 11000), 85);
    const particles = [];

    for (let i = 0; i < particlesCount; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 1.4,
            vy: (Math.random() - 0.5) * 1.4,
            baseRadius: Math.random() * 3 + 2,
            radius: Math.random() * 3 + 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: Math.random() * 0.6 + 0.4
        });
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Draw rich deep tech neon blue gradient background
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, "#071126");
        grad.addColorStop(0.5, "#0b2246");
        grad.addColorStop(1, "#041533");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Render & update shockwave ripples
        for (let i = ripples.length - 1; i >= 0; i--) {
            const r = ripples[i];
            r.radius += 7;
            r.opacity -= 0.018;

            if (r.opacity <= 0 || r.radius >= r.maxRadius) {
                ripples.splice(i, 1);
                continue;
            }

            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 242, 254, ${r.opacity})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Mouse glow aura
        if (mouse.active) {
            const auraGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, mouse.radius);
            auraGrad.addColorStop(0, "rgba(0, 242, 254, 0.3)");
            auraGrad.addColorStop(1, "rgba(0, 242, 254, 0)");
            ctx.fillStyle = auraGrad;
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, mouse.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Update and draw particles
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            // Move
            p.x += p.vx;
            p.y += p.vy;

            // Bounce off boundaries
            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;

            // Mouse interaction (gravity attraction & glow expansion)
            if (mouse.active) {
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < mouse.radius) {
                    const force = (mouse.radius - dist) / mouse.radius;
                    p.x += (dx / dist) * force * 1.5;
                    p.y += (dy / dist) * force * 1.5;
                    p.radius = p.baseRadius + force * 3;

                    // Draw connecting ray to mouse
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = `rgba(2, 132, 199, ${0.3 * force})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                } else {
                    p.radius = p.baseRadius;
                }
            }

            // Draw particle
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fill();
            ctx.globalAlpha = 1.0;

            // Connect nearby particles
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 130) {
                    const lineAlpha = (1 - dist / 130) * 0.35;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(2, 132, 199, ${lineAlpha})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(animate);
    }

    animate();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initInteractiveBackground);
} else {
    initInteractiveBackground();
}

// ==========================================================================
// 🚀 GLOBAL HIGH-RELIABILITY AUTO-SYNC POLLER (Runs continuously every 3.5s)
// Mengesan kemas kini dari Google Sheets atau Admin secara bebas tanpa bergantung
// kepada Firestore WebSocket atau IndexedDB persistence.
// ==========================================================================
(function initGlobalAutoSyncPoller() {
    let lastSeenSyncId = null;
    let isInitialized = false;

    async function pollSync() {
        if (window._silentRefreshInProgress) return;
        try {
            const url = "https://firestore.googleapis.com/v1/projects/myinternms/databases/(default)/documents/settings/sync_signal";
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) return;
            const doc = await res.json();
            const fields = doc.fields || {};
            const syncId = fields.syncId ? fields.syncId.stringValue : null;
            if (!syncId) return;

            // Baseline awal semasa buka laman (tanpa trigger toast)
            if (!isInitialized) {
                isInitialized = true;
                lastSeenSyncId = syncId;
                window._lastProcessedSyncId = syncId;
                console.log("⚡ [AutoSync-REST] Poller aktif (3.5s). Baseline:", syncId);
                return;
            }

            // Jika syncId sama, tiada data baru
            if (syncId === lastSeenSyncId || syncId === window._lastProcessedSyncId) return;
            // Abaikan isyarat yang dihantar oleh peranti ini sendiri
            if (syncId === window._lastSentSyncId) {
                lastSeenSyncId = syncId;
                window._lastProcessedSyncId = syncId;
                return;
            }

            lastSeenSyncId = syncId;
            window._lastProcessedSyncId = syncId;
            const byWho = fields.by ? fields.by.stringValue : "admin";
            console.log(`⚡ [AutoSync-REST] 🔥 Kemas kini baharu dikesan! (oleh: ${byWho}, syncId: ${syncId})`);
            
            if (typeof showToast === "function") {
                showToast("⏳ Mengemas kini data terkini...", "info");
            }

            if (byWho === "Google Sheets Auto-Sync") {
                if (typeof silentRefreshFromFirestore === "function") {
                    await silentRefreshFromFirestore();
                }
            } else {
                if (typeof silentRefreshGlobalData === "function") {
                    await silentRefreshGlobalData();
                }
            }
        } catch (e) {
            // Ralat seketika diabaikan
        }
    }

    // Mulakan polling setiap 3.5 saat
    setInterval(pollSync, 3500);
    setTimeout(pollSync, 2000);
})();
