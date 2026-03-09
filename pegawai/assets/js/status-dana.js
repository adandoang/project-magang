// ============================================
// STATUS PENGAJUAN DANA
// - Sorting tanggal terbaru di atas (robust)
// - Pagination 10 item per halaman
// ============================================

const ANGGARAN_GAS_URL = "https://script.google.com/macros/s/AKfycbxoYIwpRZizipn0TD84nNeoqld570-85UlnL6jBdXbbu-GVNwoEK712P7yB1e03SSU0EQ/exec";

let allDana           = [];
let currentDanaFilter = 'ALL';
let danaCurrentPage   = 1;
let danaPageSize      = 10;  // bisa diubah user via selector
let danaDisplayData   = [];

function changeDanaPageSize(val) {
    danaPageSize      = parseInt(val) || 10;
    danaCurrentPage   = 1;
    renderDanaTable(danaDisplayData, 1);
}

// ── Robust timestamp detection ──
function getDanaTimestamp(item) {
    const keys = ['timestamp','Timestamp','tanggal','Tanggal','createdAt','date','Date','TIMESTAMP','waktu'];
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
    if (m) return new Date(m[3] + '-' + m[2].padStart(2,'0') + '-' + m[1].padStart(2,'0'));
    return new Date(0);
}

function sortDanaByDate(data) {
    return [...data].sort((a, b) =>
        parseDanaDate(getDanaTimestamp(b)) - parseDanaDate(getDanaTimestamp(a))
    );
}

// ── JSONP fetch ──
function fetchJSONP(url) {
    return new Promise((resolve, reject) => {
        const cbName = 'jsonp_cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        const script = document.createElement('script');
        script.src   = url + '&callback=' + cbName;
        const timer  = setTimeout(() => { cleanup(); reject(new Error('Timeout')); }, 15000);
        window[cbName] = function(data) { cleanup(); resolve(data); };
        function cleanup() {
            clearTimeout(timer); delete window[cbName];
            if (script.parentNode) script.parentNode.removeChild(script);
        }
        script.onerror = () => { cleanup(); reject(new Error('Script load error')); };
        document.head.appendChild(script);
    });
}

// ── Navigasi ──
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

// ── Fetch ──
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

// ── Render tabel ──
function renderDanaTable(data, page) {
    page = page || 1;
    const tbody      = document.getElementById('dana-table-body');
    const total      = data.length;
    const totalPages = Math.max(1, Math.ceil(total / danaPageSize));
    page = Math.min(page, totalPages);

    if (total === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#6b7280;">Tidak ada data pengajuan dana</td></tr>';
        renderDanaPagination(0, 1, 1);
        return;
    }

    const start = (page - 1) * danaPageSize;
    const slice = data.slice(start, start + danaPageSize);

    tbody.innerHTML = slice.map(item => {
        const statusClass = (item.status || 'PENDING').toLowerCase();
        const rawTs       = getDanaTimestamp(item);
        const timestamp   = rawTs
            ? parseDanaDate(rawTs).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })
            : '-';
        const nominal = item.nominalPengajuan
            ? new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', minimumFractionDigits:0, maximumFractionDigits:0 }).format(item.nominalPengajuan)
            : '-';
        const bulan   = item.bulanPengajuan || '-';
        const status  = item.status || 'PENDING';
        const sub     = item.subKegiatan || '-';
        const subShow = sub.length > 50 ? sub.substring(0, 47) + '...' : sub;
        return '<tr>' +
            '<td>' + timestamp + '</td>' +
            '<td>' + (item.nama || '-') + '</td>' +
            '<td>' + (item.unit || '-') + '</td>' +
            '<td title="' + sub + '">' + subShow + '</td>' +
            '<td>' + bulan + '</td>' +
            '<td style="text-align:right;font-weight:600;">' + nominal + '</td>' +
            '<td><span class="status-badge ' + statusClass + '">' + status + '</span></td>' +
            '</tr>';
    }).join('');

    renderDanaPagination(total, page, totalPages);
}

// ── Pagination ──
function renderDanaPagination(total, page, totalPages) {
    const container = document.getElementById('dana-pagination');
    if (!container) return;
    if (total === 0) { container.innerHTML = ''; return; }

    const start      = (page - 1) * danaPageSize + 1;
    const end        = Math.min(page * danaPageSize, total);
    const sizeOpts   = [10, 25, 50, 100];

    // ── Selector "tampilkan X per halaman" ──
    let html = '<div class="pagination-size"><label>Tampilkan&nbsp;<select class="page-size-select" onchange="changeDanaPageSize(this.value)">';
    sizeOpts.forEach(n => {
        html += '<option value="' + n + '"' + (n === danaPageSize ? ' selected' : '') + '>' + n + '</option>';
    });
    html += '</select>&nbsp;data per halaman</label></div>';

    html += '<div class="pagination-info">Menampilkan ' + start + '–' + end + ' dari ' + total + ' data</div>';
    html += '<div class="pagination-controls">';
    html += '<button class="page-btn" onclick="goToDanaPage(1)"' + (page===1?' disabled':'') + '>««</button>';
    html += '<button class="page-btn" onclick="goToDanaPage(' + (page-1) + ')"' + (page===1?' disabled':'') + '>‹</button>';

    const delta = 2;
    const from  = Math.max(1, page - delta);
    const to    = Math.min(totalPages, page + delta);
    if (from > 1) html += '<span class="page-ellipsis">…</span>';
    for (let i = from; i <= to; i++) {
        html += '<button class="page-btn' + (i===page?' active':'') + '" onclick="goToDanaPage(' + i + ')">' + i + '</button>';
    }
    if (to < totalPages) html += '<span class="page-ellipsis">…</span>';

    html += '<button class="page-btn" onclick="goToDanaPage(' + (page+1) + ')"' + (page===totalPages?' disabled':'') + '>›</button>';
    html += '<button class="page-btn" onclick="goToDanaPage(' + totalPages + ')"' + (page===totalPages?' disabled':'') + '>»»</button>';
    html += '</div>';

    container.innerHTML = html;
}

function goToDanaPage(page) {
    danaCurrentPage = page;
    renderDanaTable(danaDisplayData, danaCurrentPage);
    const sec = document.getElementById('status-dana');
    if (sec) sec.scrollIntoView({ behavior:'smooth', block:'start' });
}

// ── Search + filter ──
function filterDana() {
    const searchTerm = document.getElementById('search-dana').value.toLowerCase();
    let filtered = currentDanaFilter === 'ALL' ? allDana : allDana.filter(d => (d.status || 'PENDING') === currentDanaFilter);
    if (searchTerm) {
        filtered = filtered.filter(d => {
            return [d.nama, d.unit, d.subKegiatan, d.bulanPengajuan].map(v => (v||'').toLowerCase()).join(' ').includes(searchTerm);
        });
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
    let filtered = status === 'ALL' ? allDana : allDana.filter(d => (d.status || 'PENDING') === status);
    if (searchTerm) {
        filtered = filtered.filter(d => {
            return [d.nama, d.unit, d.subKegiatan, d.bulanPengajuan].map(v => (v||'').toLowerCase()).join(' ').includes(searchTerm);
        });
    }
    danaCurrentPage = 1;
    danaDisplayData = sortDanaByDate(filtered);
    renderDanaTable(danaDisplayData, 1);
}

// ── Helpers ──
function showLoadingDana() {
    const tbody = document.getElementById('dana-table-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#6b7280;"><div class="spinner" style="margin:0 auto 10px;"></div>Memuat data...</td></tr>';
    const pg = document.getElementById('dana-pagination');
    if (pg) pg.innerHTML = '';
}
function hideLoadingDana() {}
function showDanaError(message) {
    const tbody = document.getElementById('dana-table-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#ef4444;">\u26a0\ufe0f ' + (message||'Terjadi kesalahan') + '<br><br><button class="btn btn-primary" onclick="loadDanaData()" style="font-size:0.875rem;padding:8px 16px;">Coba Lagi</button></td></tr>';
}

console.log('status-dana.js (sort + pagination) loaded');