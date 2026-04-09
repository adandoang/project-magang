// ============================================
// STATUS PENGAJUAN DANA
// - Sorting tanggal terbaru di atas (robust)
// - Pagination 10 item per halaman
// - ★ Edit nominal & file untuk pengajuan REJECTED
// ============================================

const ANGGARAN_GAS_URL = "https://script.google.com/macros/s/AKfycbxoYIwpRZizipn0TD84nNeoqld570-85UlnL6jBdXbbu-GVNwoEK712P7yB1e03SSU0EQ/exec";

let allDana = [];
let currentDanaFilter = 'ALL';
let danaCurrentPage = 1;
let danaPageSize = 10;
let danaDisplayData = [];

// ★ State untuk modal edit
let editDanaItem = null;
let editDanaNewFile = null;

// ============================================
// INJECT STYLES
// ============================================
(function injectDanaStyles() {
    if (document.getElementById('dana-edit-styles')) return;
    const style = document.createElement('style');
    style.id = 'dana-edit-styles';
    style.textContent = `
    /* ── Modal Overlay ── */
    #dana-edit-modal {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(10, 15, 30, 0.72);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        align-items: center;
        justify-content: center;
        padding: 16px;
        animation: danaFadeIn 0.22s ease;
    }
    #dana-edit-modal.show {
        display: flex;
    }
    @keyframes danaFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
    }

    /* ── Modal Card ── */
    .dana-modal-card {
        background: #fff;
        border-radius: 20px;
        width: 100%;
        max-width: 520px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 32px 80px rgba(0,0,0,0.28);
        animation: danaSlideUp 0.26s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
    }
    @keyframes danaSlideUp {
        from { transform: translateY(40px) scale(0.96); opacity: 0; }
        to   { transform: translateY(0) scale(1); opacity: 1; }
    }

    /* ── Modal Header ── */
    .dana-modal-header {
        padding: 24px 28px 18px;
        border-bottom: 1px solid #f0f0f0;
        display: flex;
        align-items: flex-start;
        gap: 14px;
    }
    .dana-modal-header-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: linear-gradient(135deg, #dc2626, #ef4444);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 20px;
    }
    .dana-modal-header-text h3 {
        font-size: 17px;
        font-weight: 700;
        color: #111827;
        margin: 0 0 4px;
    }
    .dana-modal-header-text p {
        font-size: 13px;
        color: #6b7280;
        margin: 0;
        line-height: 1.4;
    }
    .dana-modal-close {
        margin-left: auto;
        background: #f3f4f6;
        border: none;
        border-radius: 8px;
        width: 32px;
        height: 32px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
        font-size: 18px;
        flex-shrink: 0;
        transition: background 0.15s, color 0.15s;
    }
    .dana-modal-close:hover {
        background: #fee2e2;
        color: #dc2626;
    }

    /* ── Info bar pengajuan ── */
    .dana-edit-info {
        margin: 16px 28px 0;
        background: #f8faff;
        border: 1px solid #e0e8ff;
        border-radius: 12px;
        padding: 14px 16px;
    }
    .dana-edit-info-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        font-size: 13px;
        color: #374151;
        margin-bottom: 6px;
    }
    .dana-edit-info-row:last-child { margin-bottom: 0; }
    .dana-edit-info-label { color: #6b7280; font-weight: 500; flex-shrink: 0; }
    .dana-edit-info-value { font-weight: 600; text-align: right; color: #111827; }
    .dana-edit-info-value.rejected {
        color: #dc2626;
        background: #fee2e2;
        border-radius: 5px;
        padding: 1px 8px;
        font-size: 12px;
    }

    /* ── Modal Body ── */
    .dana-modal-body {
        padding: 20px 28px;
    }

    /* ── Form Group ── */
    .dana-form-group {
        margin-bottom: 18px;
    }
    .dana-form-label {
        display: block;
        font-size: 13.5px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 7px;
    }
    .dana-form-label span.req {
        color: #dc2626;
        margin-left: 2px;
    }
    .dana-form-input {
        width: 100%;
        padding: 11px 14px;
        border: 1.5px solid #d1d5db;
        border-radius: 10px;
        font-size: 14.5px;
        font-family: inherit;
        color: #111827;
        background: #fff;
        transition: border-color 0.18s, box-shadow 0.18s;
        box-sizing: border-box;
    }
    .dana-form-input:focus {
        outline: none;
        border-color: #c5a572;
        box-shadow: 0 0 0 3px rgba(197,165,114,0.18);
    }
    .dana-form-hint {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 5px;
    }

    /* ── File upload area ── */
    .dana-file-area {
        border: 2px dashed #d1d5db;
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s;
        position: relative;
        background: #fafafa;
    }
    .dana-file-area:hover {
        border-color: #c5a572;
        background: #fdf8f0;
    }
    .dana-file-area.has-file {
        border-color: #059669;
        background: #f0fdf4;
    }
    .dana-file-area input[type="file"] {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
        width: 100%;
        height: 100%;
    }
    .dana-file-icon { font-size: 28px; margin-bottom: 8px; display: block; }
    .dana-file-text { font-size: 13.5px; font-weight: 600; color: #374151; }
    .dana-file-subtext { font-size: 12px; color: #9ca3af; margin-top: 4px; }
    .dana-file-selected {
        display: none;
        font-size: 13px;
        font-weight: 600;
        color: #059669;
        margin-top: 10px;
        background: #dcfce7;
        border-radius: 8px;
        padding: 8px 12px;
        text-align: left;
        word-break: break-all;
    }
    .dana-file-selected.show { display: block; }

    /* ── Current file link ── */
    .dana-current-file {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 10px;
        margin-bottom: 12px;
        font-size: 13px;
        color: #0369a1;
    }
    .dana-current-file a {
        color: #0369a1;
        text-decoration: none;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 300px;
        display: inline-block;
    }
    .dana-current-file a:hover { text-decoration: underline; }

    /* ── Modal Footer ── */
    .dana-modal-footer {
        padding: 16px 28px 24px;
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        border-top: 1px solid #f0f0f0;
    }
    .dana-btn {
        padding: 10px 22px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: all 0.17s;
        font-family: inherit;
    }
    .dana-btn-cancel {
        background: #f3f4f6;
        color: #374151;
    }
    .dana-btn-cancel:hover { background: #e5e7eb; }
    .dana-btn-submit {
        background: linear-gradient(135deg, #c5a572, #a07840);
        color: #fff;
        min-width: 140px;
    }
    .dana-btn-submit:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(160,120,64,0.3);
    }
    .dana-btn-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }

    /* ── Alert in modal ── */
    .dana-modal-alert {
        display: none;
        padding: 10px 14px;
        border-radius: 9px;
        font-size: 13px;
        font-weight: 500;
        margin: 0 28px 14px;
    }
    .dana-modal-alert.show { display: block; }
    .dana-modal-alert.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .dana-modal-alert.error   { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

    /* ── Progress in modal ── */
    .dana-modal-progress {
        display: none;
        margin: 0 28px 14px;
    }
    .dana-modal-progress.show { display: block; }
    .dana-modal-progress-bar {
        height: 5px;
        background: #f3f4f6;
        border-radius: 99px;
        overflow: hidden;
    }
    .dana-modal-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #c5a572, #a07840);
        border-radius: 99px;
        width: 0%;
        transition: width 0.4s ease;
    }
    .dana-modal-progress-label {
        font-size: 12px;
        color: #6b7280;
        margin-top: 5px;
        text-align: center;
    }

    /* ── Edit button in table ── */
    .btn-edit-dana {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 12px;
        background: linear-gradient(135deg, #fef3c7, #fde68a);
        border: 1.5px solid #f59e0b;
        color: #92400e;
        border-radius: 7px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.17s;
        white-space: nowrap;
    }
    .btn-edit-dana:hover {
        background: linear-gradient(135deg, #fde68a, #fbbf24);
        transform: translateY(-1px);
        box-shadow: 0 3px 10px rgba(245,158,11,0.3);
    }

    /* ── Rejected row highlight ── */
    tr.row-rejected td {
        background: #fff8f8 !important;
    }
    tr.row-rejected:hover td {
        background: #fff0f0 !important;
    }

    /* ── Status badge ── */
    .status-badge.rejected, .status-badge.ditolak {
        background: #fee2e2;
        color: #dc2626;
        border: 1px solid #fecaca;
        padding: 3px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
    }
    .status-badge.approved, .status-badge.disetujui {
        background: #dcfce7;
        color: #059669;
        border: 1px solid #bbf7d0;
        padding: 3px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
    }
    .status-badge.pending {
        background: #fef3c7;
        color: #d97706;
        border: 1px solid #fde68a;
        padding: 3px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
    }

    /* ── Responsive ── */
    @media (max-width: 540px) {
        .dana-modal-card { border-radius: 16px 16px 0 0; max-height: 92vh; margin-top: auto; }
        .dana-modal-header, .dana-modal-body, .dana-modal-footer { padding-left: 20px; padding-right: 20px; }
        .dana-edit-info, .dana-modal-alert, .dana-modal-progress { margin-left: 20px; margin-right: 20px; }
    }
    `;
    document.head.appendChild(style);
})();

// ============================================
// INJECT MODAL HTML
// ============================================
(function injectDanaModal() {
    if (document.getElementById('dana-edit-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'dana-edit-modal';
    modal.innerHTML = `
    <div class="dana-modal-card">
        <!-- Header -->
        <div class="dana-modal-header">
            <div class="dana-modal-header-icon">✏️</div>
            <div class="dana-modal-header-text">
                <h3>Edit Pengajuan Dana</h3>
                <p>Perbarui nominal dan/atau file pengajuan yang ditolak</p>
            </div>
            <button class="dana-modal-close" onclick="closeDanaEditModal()" title="Tutup">✕</button>
        </div>

        <!-- Info pengajuan -->
        <div class="dana-edit-info" id="dana-edit-info-bar"></div>

        <!-- Alert -->
        <div class="dana-modal-alert" id="dana-modal-alert"></div>

        <!-- Progress -->
        <div class="dana-modal-progress" id="dana-modal-progress">
            <div class="dana-modal-progress-bar">
                <div class="dana-modal-progress-fill" id="dana-modal-progress-fill"></div>
            </div>
            <div class="dana-modal-progress-label" id="dana-modal-progress-label">Memproses...</div>
        </div>

        <!-- Body -->
        <div class="dana-modal-body">
            <!-- Nominal -->
            <div class="dana-form-group">
                <label class="dana-form-label">
                    Nominal Pengajuan (Rp) <span class="req">*</span>
                </label>
                <input
                    type="text"
                    id="dana-edit-nominal-display"
                    class="dana-form-input"
                    placeholder="Contoh: 5.000.000"
                    inputmode="numeric"
                    autocomplete="off"
                    oninput="formatDanaEditNominal(this)"
                >
                <input type="hidden" id="dana-edit-nominal-raw">
                <div class="dana-form-hint">Masukkan nominal baru jika perlu diubah</div>
            </div>

            <!-- File Upload -->
            <div class="dana-form-group">
                <label class="dana-form-label">
                    File Pengajuan Dana (PDF)
                    <span style="font-size:11px;font-weight:400;color:#6b7280;margin-left:6px;">— kosongkan jika tidak ganti file</span>
                </label>

                <!-- Link file saat ini -->
                <div class="dana-current-file" id="dana-current-file-row" style="display:none;">
                    <span>📎</span>
                    <span>File saat ini:</span>
                    <a id="dana-current-file-link" href="#" target="_blank" rel="noopener">Lihat File</a>
                </div>

                <!-- Drop area -->
                <div class="dana-file-area" id="dana-file-drop-area">
                    <input
                        type="file"
                        id="dana-edit-file-input"
                        accept=".pdf"
                        onchange="handleDanaEditFileChange(event)"
                    >
                    <span class="dana-file-icon">📄</span>
                    <div class="dana-file-text">Klik atau seret file PDF ke sini</div>
                    <div class="dana-file-subtext">Format: PDF | Maks. 10 MB</div>
                </div>

                <div class="dana-file-selected" id="dana-edit-file-info"></div>
            </div>
        </div>

        <!-- Footer -->
        <div class="dana-modal-footer">
            <button class="dana-btn dana-btn-cancel" onclick="closeDanaEditModal()">Batal</button>
            <button class="dana-btn dana-btn-submit" id="dana-edit-submit-btn" onclick="submitDanaEdit()">
                Kirim Ulang Pengajuan
            </button>
        </div>
    </div>
    `;
    document.body.appendChild(modal);

    // Tutup modal saat klik overlay
    modal.addEventListener('click', function (e) {
        if (e.target === modal) closeDanaEditModal();
    });
})();

// ============================================
// PAGE SIZE
// ============================================
function changeDanaPageSize(val) {
    danaPageSize = parseInt(val) || 10;
    danaCurrentPage = 1;
    renderDanaTable(danaDisplayData, 1);
}

// ============================================
// TIMESTAMP HELPERS
// ============================================
function getDanaTimestamp(item) {
    const keys = ['timestamp', 'Timestamp', 'tanggal', 'Tanggal', 'createdAt', 'date', 'Date', 'TIMESTAMP', 'waktu'];
    for (const k of keys) { if (item[k]) return item[k]; }
    for (const val of Object.values(item)) {
        if (val && typeof val === 'string' && !isNaN(Date.parse(val))) return val;
    }
    return null;
}

function parseDanaDate(raw) {
    if (!raw) return new Date(0);
    if (raw instanceof Date) return raw;
    const d = new Date(raw);
    if (!isNaN(d)) return d;
    const m = String(raw).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) return new Date(m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'));
    return new Date(0);
}

function sortDanaByDate(data) {
    return [...data].sort((a, b) =>
        parseDanaDate(getDanaTimestamp(b)) - parseDanaDate(getDanaTimestamp(a))
    );
}

// ============================================
// JSONP FETCH
// ============================================
function fetchJSONP(url) {
    return new Promise((resolve, reject) => {
        const cbName = 'jsonp_cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        const script = document.createElement('script');
        script.src = url + '&callback=' + cbName;
        const timer = setTimeout(() => { cleanup(); reject(new Error('Timeout')); }, 15000);
        window[cbName] = function (data) { cleanup(); resolve(data); };
        function cleanup() {
            clearTimeout(timer); delete window[cbName];
            if (script.parentNode) script.parentNode.removeChild(script);
        }
        script.onerror = () => { cleanup(); reject(new Error('Script load error')); };
        document.head.appendChild(script);
    });
}

// ============================================
// NAVIGASI
// ============================================
function showDanaStatus() {
    const dd = document.getElementById('status-dropdown');
    if (dd) dd.classList.remove('show');
    if (typeof activateSection === 'function') {
        activateSection('status-dana');
    } else {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        const t = document.getElementById('status-dana');
        if (t) t.classList.add('active');
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        const sel = document.getElementById('mobile-nav-select');
        if (sel) sel.value = 'status-dana';
    }
    showLoadingDana();
    loadDanaData();
}

// ============================================
// FETCH DATA
// ============================================
function loadDanaData() {
    fetchJSONP(ANGGARAN_GAS_URL + '?action=getPengajuanDana')
        .then(data => {
            if (data && data.success === true) {
                allDana = sortDanaByDate(data.data || []);
            } else {
                showDanaError(data ? data.message : 'Gagal mengambil data');
                allDana = [];
            }
            danaCurrentPage = 1;
            danaDisplayData = allDana;
            renderDanaTable(danaDisplayData, 1);
            hideLoadingDana();
        })
        .catch(err => {
            console.error('Dana fetch error:', err);
            showDanaError('Tidak dapat terhubung ke server. Periksa koneksi internet.');
            allDana = []; danaDisplayData = [];
            renderDanaTable([], 1); hideLoadingDana();
        });
}

// ============================================
// RENDER TABEL
// ============================================
function renderDanaTable(data, page) {
    page = page || 1;
    const tbody = document.getElementById('dana-table-body');
    const total = data.length;
    const totalPages = Math.max(1, Math.ceil(total / danaPageSize));
    page = Math.min(page, totalPages);

    if (total === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#6b7280;">Tidak ada data pengajuan dana</td></tr>';
        renderDanaPagination(0, 1, 1);
        return;
    }

    const start = (page - 1) * danaPageSize;
    const slice = data.slice(start, start + danaPageSize);

    tbody.innerHTML = slice.map((item, idx) => {
        const status = (item.status || 'PENDING').toUpperCase();
        const statusClass = status.toLowerCase();
        const isRejected = status === 'REJECTED' || status === 'DITOLAK';
        const rowClass = isRejected ? 'row-rejected' : '';

        const rawTs = getDanaTimestamp(item);
        const timestamp = rawTs
            ? parseDanaDate(rawTs).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
            : '-';

        const nominal = item.nominalPengajuan
            ? new Intl.NumberFormat('id-ID', {
                style: 'currency', currency: 'IDR',
                minimumFractionDigits: 0, maximumFractionDigits: 0
            }).format(item.nominalPengajuan)
            : '-';

        const bulan = item.bulanPengajuan || '-';
        const sub = item.subKegiatan || '-';
        const subShow = sub.length > 50 ? sub.substring(0, 47) + '...' : sub;

        // ★ globalIdx = posisi item ini di dalam danaDisplayData (bukan slice)
        const globalIdx = start + idx;

        // Tombol Edit hanya untuk REJECTED
        const editBtn = isRejected
            ? `<br><button class="btn-edit-dana" onclick="openDanaEditModal(${globalIdx})" title="Edit dan kirim ulang pengajuan">
                Edit &amp; Kirim Ulang
               </button>`
            : '';

        return `<tr class="${rowClass}">
            <td>${timestamp}</td>
            <td>${item.nama || '-'}</td>
            <td>${item.unit || '-'}</td>
            <td title="${sub}">${subShow}</td>
            <td>${bulan}</td>
            <td style="text-align:right;font-weight:600;">${nominal}</td>
            <td>
                <span class="status-badge ${statusClass}">${status}</span>
                ${editBtn}
            </td>
        </tr>`;
    }).join('');

    renderDanaPagination(total, page, totalPages);
}

// ============================================
// PAGINATION
// ============================================
function renderDanaPagination(total, page, totalPages) {
    const container = document.getElementById('dana-pagination');
    if (!container) return;
    if (total === 0) { container.innerHTML = ''; return; }

    const start = (page - 1) * danaPageSize + 1;
    const end = Math.min(page * danaPageSize, total);
    const sizeOpts = [10, 25, 50, 100];

    let html = '<div class="pagination-size"><label>Tampilkan&nbsp;<select class="page-size-select" onchange="changeDanaPageSize(this.value)">';
    sizeOpts.forEach(n => {
        html += `<option value="${n}"${n === danaPageSize ? ' selected' : ''}>${n}</option>`;
    });
    html += `</select>&nbsp;data per halaman</label></div>`;
    html += `<div class="pagination-info">Menampilkan ${start}–${end} dari ${total} data</div>`;
    html += `<div class="pagination-controls">`;
    html += `<button class="page-btn" onclick="goToDanaPage(1)"${page === 1 ? ' disabled' : ''}>««</button>`;
    html += `<button class="page-btn" onclick="goToDanaPage(${page - 1})"${page === 1 ? ' disabled' : ''}>‹</button>`;

    const delta = 2;
    const from = Math.max(1, page - delta);
    const to = Math.min(totalPages, page + delta);
    if (from > 1) html += `<span class="page-ellipsis">…</span>`;
    for (let i = from; i <= to; i++) {
        html += `<button class="page-btn${i === page ? ' active' : ''}" onclick="goToDanaPage(${i})">${i}</button>`;
    }
    if (to < totalPages) html += `<span class="page-ellipsis">…</span>`;

    html += `<button class="page-btn" onclick="goToDanaPage(${page + 1})"${page === totalPages ? ' disabled' : ''}>›</button>`;
    html += `<button class="page-btn" onclick="goToDanaPage(${totalPages})"${page === totalPages ? ' disabled' : ''}>»»</button>`;
    html += `</div>`;

    container.innerHTML = html;
}

function goToDanaPage(page) {
    danaCurrentPage = page;
    renderDanaTable(danaDisplayData, danaCurrentPage);
    const sec = document.getElementById('status-dana');
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================
// SEARCH + FILTER
// ============================================
function filterDana() {
    const searchTerm = document.getElementById('search-dana').value.toLowerCase();
    let filtered = currentDanaFilter === 'ALL' ? allDana : allDana.filter(d => (d.status || 'PENDING').toUpperCase() === currentDanaFilter);
    if (searchTerm) {
        filtered = filtered.filter(d =>
            [d.nama, d.unit, d.subKegiatan, d.bulanPengajuan]
                .map(v => (v || '').toLowerCase()).join(' ')
                .includes(searchTerm)
        );
    }
    danaCurrentPage = 1;
    danaDisplayData = sortDanaByDate(filtered);
    renderDanaTable(danaDisplayData, 1);
}

function filterDanaByStatus(status, clickedBtn) {
    currentDanaFilter = status;
    document.querySelectorAll('#status-dana .filter-btn').forEach(b => b.classList.remove('active'));
    const btn = clickedBtn || (typeof event !== 'undefined' && event && event.target);
    if (btn && btn.classList) btn.classList.add('active');

    const searchTerm = document.getElementById('search-dana').value.toLowerCase();
    let filtered = status === 'ALL' ? allDana : allDana.filter(d => (d.status || 'PENDING').toUpperCase() === status);
    if (searchTerm) {
        filtered = filtered.filter(d =>
            [d.nama, d.unit, d.subKegiatan, d.bulanPengajuan]
                .map(v => (v || '').toLowerCase()).join(' ')
                .includes(searchTerm)
        );
    }
    danaCurrentPage = 1;
    danaDisplayData = sortDanaByDate(filtered);
    renderDanaTable(danaDisplayData, 1);
}

// ============================================
// ★ MODAL EDIT — OPEN
// ============================================
function openDanaEditModal(globalIdx) {
    // globalIdx = index dalam danaDisplayData
    const item = danaDisplayData[globalIdx];
    if (!item) return;
    editDanaItem = item;
    editDanaNewFile = null;

    // Populate info bar
    const nominal = item.nominalPengajuan
        ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.nominalPengajuan)
        : '-';
    document.getElementById('dana-edit-info-bar').innerHTML = `
        <div class="dana-edit-info-row">
            <span class="dana-edit-info-label">Nama</span>
            <span class="dana-edit-info-value">${item.nama || '-'}</span>
        </div>
        <div class="dana-edit-info-row">
            <span class="dana-edit-info-label">Unit</span>
            <span class="dana-edit-info-value">${item.unit || '-'}</span>
        </div>
        <div class="dana-edit-info-row">
            <span class="dana-edit-info-label">Bulan</span>
            <span class="dana-edit-info-value">${item.bulanPengajuan || '-'}</span>
        </div>
        <div class="dana-edit-info-row">
            <span class="dana-edit-info-label">Nominal Saat Ini</span>
            <span class="dana-edit-info-value">${nominal}</span>
        </div>
        <div class="dana-edit-info-row">
            <span class="dana-edit-info-label">Status</span>
            <span class="dana-edit-info-value rejected">✕ DITOLAK</span>
        </div>
    `;

    // Populate nominal input (tanpa format Rupiah agar user bisa edit)
    const displayEl = document.getElementById('dana-edit-nominal-display');
    const rawEl = document.getElementById('dana-edit-nominal-raw');
    const nominalRaw = item.nominalPengajuan ? String(item.nominalPengajuan).replace(/\D/g, '') : '';
    rawEl.value = nominalRaw;
    displayEl.value = nominalRaw
        ? parseInt(nominalRaw, 10).toLocaleString('id-ID')
        : '';

    // File saat ini
    const fileRow = document.getElementById('dana-current-file-row');
    const fileLink = document.getElementById('dana-current-file-link');
    if (item.linkFilePengajuanDana && item.linkFilePengajuanDana.trim() !== '') {
        fileLink.href = item.linkFilePengajuanDana;
        fileLink.textContent = 'Lihat File Saat Ini ↗';
        fileRow.style.display = 'flex';
    } else {
        fileRow.style.display = 'none';
    }

    // Reset file input & info
    document.getElementById('dana-edit-file-input').value = '';
    const fileInfoEl = document.getElementById('dana-edit-file-info');
    fileInfoEl.textContent = '';
    fileInfoEl.classList.remove('show');
    document.getElementById('dana-file-drop-area').classList.remove('has-file');

    // Reset alert & progress
    hideDanaModalAlert();
    hideDanaModalProgress();

    // Reset submit button
    const submitBtn = document.getElementById('dana-edit-submit-btn');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Kirim Ulang Pengajuan';

    // Show modal
    const modal = document.getElementById('dana-edit-modal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// ============================================
// ★ MODAL EDIT — CLOSE
// ============================================
function closeDanaEditModal() {
    const modal = document.getElementById('dana-edit-modal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    editDanaItem = null;
    editDanaNewFile = null;
}

// ============================================
// ★ FORMAT NOMINAL DALAM MODAL
// ============================================
function formatDanaEditNominal(inputEl) {
    let raw = inputEl.value.replace(/\D/g, '');
    document.getElementById('dana-edit-nominal-raw').value = raw;
    inputEl.value = raw ? parseInt(raw, 10).toLocaleString('id-ID') : '';
}

// ============================================
// ★ HANDLE FILE CHANGE DALAM MODAL
// ============================================
function handleDanaEditFileChange(event) {
    const file = event.target.files[0];
    const infoEl = document.getElementById('dana-edit-file-info');
    const dropArea = document.getElementById('dana-file-drop-area');

    editDanaNewFile = null;
    infoEl.textContent = '';
    infoEl.classList.remove('show');
    dropArea.classList.remove('has-file');

    if (!file) return;

    if (file.type !== 'application/pdf') {
        showDanaModalAlert('❌ Hanya file PDF yang diperbolehkan!', 'error');
        event.target.value = '';
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        showDanaModalAlert('❌ Ukuran file melebihi 10 MB. Pilih file yang lebih kecil.', 'error');
        event.target.value = '';
        return;
    }

    hideDanaModalAlert();
    editDanaNewFile = file;

    const sizeStr = file.size < 1024 * 1024
        ? (file.size / 1024).toFixed(1) + ' KB'
        : (file.size / (1024 * 1024)).toFixed(1) + ' MB';

    infoEl.innerHTML = `✅ <strong>${file.name}</strong> &nbsp;(${sizeStr})`;
    infoEl.classList.add('show');
    dropArea.classList.add('has-file');
}

// ============================================
// ★ SUBMIT EDIT (kirim ulang pengajuan)
// ============================================
async function submitDanaEdit() {
    if (!editDanaItem) return;

    const nominalRaw = document.getElementById('dana-edit-nominal-raw').value;
    if (!nominalRaw || parseInt(nominalRaw) <= 0) {
        showDanaModalAlert('❌ Nominal pengajuan harus diisi dengan angka yang valid.', 'error');
        document.getElementById('dana-edit-nominal-display').focus();
        return;
    }

    const submitBtn = document.getElementById('dana-edit-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Memproses...';
    hideDanaModalAlert();
    showDanaModalProgress(15, 'Mempersiapkan data...');

    try {
        const itemId = String(editDanaItem.id || '').trim();
        if (!itemId) throw new Error('ID pengajuan tidak ditemukan. Coba refresh halaman.');

        const fields = {
            action: 'resubmitPengajuanDana',
            id: itemId,
            nama: editDanaItem.nama || '',
            unit: editDanaItem.unit || '',
            sub_kegiatan: editDanaItem.subKegiatan || '',
            bulan_pengajuan: editDanaItem.bulanPengajuan || '',
            nominal_pengajuan: nominalRaw,
            existingFileUrl: editDanaItem.linkFilePengajuanDana || '',
            hasNewFile: 'false',
            fileName: '',
            fileData: '',
            mimeType: '',
        };

        if (editDanaNewFile) {
            showDanaModalProgress(35, 'Membaca file PDF...');
            const base64Data = await fileToBase64Dana(editDanaNewFile);
            fields.fileName = editDanaNewFile.name;
            fields.fileData = base64Data;
            fields.mimeType = editDanaNewFile.type || 'application/pdf';
            fields.hasNewFile = 'true';
        }

        showDanaModalProgress(60, 'Mengirim ke sistem...');

        // ★ GANTI iframe → fetch POST (sama persis dengan submitViaIframeFields di main.js)
        const body = Object.keys(fields)
            .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(fields[k] ?? ''))
            .join('&');

        const resp = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
            redirect: 'follow'
        });

        const text = await resp.text();
        console.log('[submitDanaEdit] raw response:', text.slice(0, 300));

        let result;
        try { result = JSON.parse(text); }
        catch (e) { result = { status: 'success' }; }

        showDanaModalProgress(100, 'Selesai!');

        const ok = result?.status === 'success' || result?.success === true;
        if (ok) {
            setTimeout(() => {
                hideDanaModalProgress();
                showDanaModalAlert('✅ Pengajuan berhasil dikirim ulang! Menunggu proses admin.', 'success');
                submitBtn.textContent = '✓ Terkirim';
                setTimeout(() => {
                    closeDanaEditModal();
                    showLoadingDana();
                    loadDanaData();
                }, 2500);
            }, 400);
        } else {
            hideDanaModalProgress();
            showDanaModalAlert('❌ Gagal: ' + (result?.message || 'Terjadi kesalahan di server.'), 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Kirim Ulang Pengajuan';
        }

    } catch (err) {
        console.error('Dana edit error:', err);
        hideDanaModalProgress();
        showDanaModalAlert('❌ Terjadi kesalahan: ' + err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Ulang Pengajuan';
    }
}

// ── Helper: file → base64 ──
function fileToBase64Dana(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ── Helper: submit via iframe ──
function submitDanaViaIframe(fields, iframeId) {
    const hiddenForm = document.createElement('form');
    hiddenForm.method = 'POST';
    // ★ WAJIB ke GAS_URL yang sama dengan handlePengajuanDanaUpload
    //   GAS_URL didefinisikan di main.js:
    //   "https://script.google.com/macros/s/AKfycbz2cFiTZIq71hf.../exec"
    //   BUKAN ANGGARAN_GAS_URL yang merupakan endpoint terpisah
    if (typeof GAS_URL === 'undefined') {
        console.error('GAS_URL tidak terdefinisi. Pastikan main.js sudah dimuat sebelum status-dana.js');
        throw new Error('Konfigurasi URL server tidak ditemukan');
    }
    hiddenForm.action = GAS_URL;
    hiddenForm.target = iframeId;
    hiddenForm.style.display = 'none';

    Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        hiddenForm.appendChild(input);
    });

    let iframe = document.getElementById(iframeId);
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = iframeId;
        iframe.name = iframeId;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
    }

    document.body.appendChild(hiddenForm);
    hiddenForm.submit();

    setTimeout(() => {
        if (hiddenForm.parentNode) document.body.removeChild(hiddenForm);
    }, 8000);
}

// ============================================
// MODAL HELPERS
// ============================================
function showDanaModalAlert(msg, type) {
    const el = document.getElementById('dana-modal-alert');
    if (!el) return;
    el.textContent = msg;
    el.className = 'dana-modal-alert show ' + (type || 'error');
}
function hideDanaModalAlert() {
    const el = document.getElementById('dana-modal-alert');
    if (el) { el.className = 'dana-modal-alert'; el.textContent = ''; }
}

function showDanaModalProgress(pct, label) {
    const wrap = document.getElementById('dana-modal-progress');
    const fill = document.getElementById('dana-modal-progress-fill');
    const lbl = document.getElementById('dana-modal-progress-label');
    if (wrap) wrap.classList.add('show');
    if (fill) fill.style.width = pct + '%';
    if (lbl) lbl.textContent = label || '';
}
function hideDanaModalProgress() {
    const wrap = document.getElementById('dana-modal-progress');
    const fill = document.getElementById('dana-modal-progress-fill');
    if (fill) fill.style.width = '0%';
    if (wrap) setTimeout(() => wrap.classList.remove('show'), 300);
}

// ============================================
// TABLE LOADING HELPERS
// ============================================
function showLoadingDana() {
    const tbody = document.getElementById('dana-table-body');
    if (tbody) tbody.innerHTML = `
        <tr><td colspan="8" style="text-align:center;padding:40px;color:#6b7280;">
            <div class="spinner" style="margin:0 auto 10px;"></div>Memuat data...
        </td></tr>`;
    const pg = document.getElementById('dana-pagination');
    if (pg) pg.innerHTML = '';
}
function hideLoadingDana() { /* handled by renderDanaTable */ }
function showDanaError(message) {
    const tbody = document.getElementById('dana-table-body');
    if (tbody) tbody.innerHTML = `
        <tr><td colspan="8" style="text-align:center;padding:40px;color:#ef4444;">
            ⚠️ ${message || 'Terjadi kesalahan'}<br><br>
            <button class="btn btn-primary" onclick="loadDanaData()" style="font-size:0.875rem;padding:8px 16px;">
                Coba Lagi
            </button>
        </td></tr>`;
}

console.log('status-dana.js (v2 — edit rejected) loaded');