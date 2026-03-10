// ============================================================
// voucher-bbm.js — Voucher BBM section (SPA)
// Admin Panel — Dinas Koperasi UKM
// Refactored to mirror ruang-rapat.js patterns:
//   1. Full CRUD with loading states on every button
//   2. Detail modal matching ruang-rapat style
//   3. Move between bulan/unit (pindah) on edit violation
//   4. Sorted newest-first (reverse from API)
//   5. Consistent modal & card UI
// ============================================================
(function () {
    'use strict';

    const API_URL = 'https://script.google.com/macros/s/AKfycbyfAJcjPDuKqwKk8A46z4quyaeV9trBLAuDtdqhQqX0CIZke6fgN1sptcnS0EURuF6ksg/exec';
    const CACHE_DURATION = 5 * 60 * 1000;
    const CACHE_KEYS = {
        REQUESTS: 'bbm_voucher_requests',
        VIOLATIONS: 'bbm_violations_catatan',
        SCORES: 'bbm_scores_penilaian'
    };

    let masterRequests = [], allRequests = [];
    let masterViolations = [], allViolations = [];
    let allScores = {}, scoreChart = null, violationChart = null;
    let requestsCurrentPage = 1, violationsCurrentPage = 1;
    const itemsPerPage = 10;

    // ── State ─────────────────────────────────────────────────
    let currentApproveId = null;
    let currentEditId = null;
    let currentEditViol = null;
    let selectedApprovedReq = null;
    let violationSource = 'approved';

    const MONTHS_ID = ['', 'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
        'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];

    // ── SVG Icons (identical set to ruang-rapat) ──────────────
    const ICONS = {
        refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
        export: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
        plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
        check: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        checkCircle: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
        x: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        eye: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
        edit: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
        trash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
        car: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14l4 4v4a2 2 0 0 1-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/><path d="M5 9l2-4h8l2 4"/></svg>`,
        user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        building: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M3 9h6"/><path d="M3 15h6"/><path d="M15 9h3"/><path d="M15 15h3"/></svg>`,
        calendar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
        clock: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
        fileText: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    };

    // ── Template options ──────────────────────────────────────
    const OPT_BULAN_ALL = `<option value="">Semua Bulan</option>
        <option value="JANUARI">Januari</option><option value="FEBRUARI">Februari</option>
        <option value="MARET">Maret</option><option value="APRIL">April</option>
        <option value="MEI">Mei</option><option value="JUNI">Juni</option>
        <option value="JULI">Juli</option><option value="AGUSTUS">Agustus</option>
        <option value="SEPTEMBER">September</option><option value="OKTOBER">Oktober</option>
        <option value="NOVEMBER">November</option><option value="DESEMBER">Desember</option>`;

    const OPT_BULAN_REQ = `<option value="">Pilih Bulan</option>
        <option value="JANUARI">Januari</option><option value="FEBRUARI">Februari</option>
        <option value="MARET">Maret</option><option value="APRIL">April</option>
        <option value="MEI">Mei</option><option value="JUNI">Juni</option>
        <option value="JULI">Juli</option><option value="AGUSTUS">Agustus</option>
        <option value="SEPTEMBER">September</option><option value="OKTOBER">Oktober</option>
        <option value="NOVEMBER">November</option><option value="DESEMBER">Desember</option>`;

    const OPT_BULAN_EDIT = `<option value="JANUARI">Januari</option><option value="FEBRUARI">Februari</option>
        <option value="MARET">Maret</option><option value="APRIL">April</option>
        <option value="MEI">Mei</option><option value="JUNI">Juni</option>
        <option value="JULI">Juli</option><option value="AGUSTUS">Agustus</option>
        <option value="SEPTEMBER">September</option><option value="OKTOBER">Oktober</option>
        <option value="NOVEMBER">November</option><option value="DESEMBER">Desember</option>`;

    const OPT_UNIT_ALL = `<option value="">Semua Unit</option>
        <option value="Sekretariat">Sekretariat</option>
        <option value="Bidang Koperasi">Bidang Koperasi</option>
        <option value="Bidang UKM">Bidang UKM</option>
        <option value="Bidang Usaha Mikro">Bidang Usaha Mikro</option>
        <option value="Bidang Kewirausahaan">Bidang Kewirausahaan</option>
        <option value="Balai Layanan Usaha Terpadu KUMKM">BLUT KUMKM</option>`;

    const OPT_UNIT_REQ = `<option value="">Pilih Unit</option>
        <option value="Sekretariat">Sekretariat</option>
        <option value="Bidang Koperasi">Bidang Koperasi</option>
        <option value="Bidang UKM">Bidang UKM</option>
        <option value="Bidang Usaha Mikro">Bidang Usaha Mikro</option>
        <option value="Bidang Kewirausahaan">Bidang Kewirausahaan</option>
        <option value="Balai Layanan Usaha Terpadu KUMKM">Balai Layanan Usaha Terpadu KUMKM</option>`;

    const OPT_UNIT_EDIT = `<option value="Sekretariat">Sekretariat</option>
        <option value="Bidang Koperasi">Bidang Koperasi</option>
        <option value="Bidang UKM">Bidang UKM</option>
        <option value="Bidang Usaha Mikro">Bidang Usaha Mikro</option>
        <option value="Bidang Kewirausahaan">Bidang Kewirausahaan</option>
        <option value="Balai Layanan Usaha Terpadu KUMKM">Balai Layanan Usaha Terpadu KUMKM</option>`;

    const OPT_KENDARAAN = `<option value="">Pilih Nomor Kendaraan</option>
        <option value="AB 1027 AV">AB 1027 AV</option>
        <option value="AB 1869 UA">AB 1869 UA</option>
        <option value="AB 1147 UH">AB 1147 UH</option>
        <option value="AB 1340 UH">AB 1340 UH</option>
        <option value="AB 1530 UH">AB 1530 UH</option>
        <option value="AB 1067 IA">AB 1067 IA</option>`;

    // ── Cache ─────────────────────────────────────────────────
    function saveToCache(k, d) { try { localStorage.setItem(k, JSON.stringify({ data: d, timestamp: Date.now() })); } catch (e) { } }
    function getFromCache(k) {
        try {
            const c = localStorage.getItem(k);
            if (!c) return null;
            const p = JSON.parse(c);
            if (Date.now() - p.timestamp < CACHE_DURATION) return p.data;
            localStorage.removeItem(k); return null;
        } catch (e) { return null; }
    }
    function clearCache() { Object.values(CACHE_KEYS).forEach(k => localStorage.removeItem(k)); }
    function showCacheIndicator() {
        const el = document.getElementById('bbm-cacheIndicator');
        if (el) { el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2000); }
    }

    // ── API (JSONP) ───────────────────────────────────────────
    function callAPI(params) {
        return new Promise((resolve, reject) => {
            const cb = 'bbm_cb_' + Math.round(1e6 * Math.random());
            window[cb] = data => { delete window[cb]; document.getElementById(cb)?.remove(); resolve(data); };
            const qs = new URLSearchParams({ ...params, callback: cb }).toString();
            const s = document.createElement('script');
            s.id = cb; s.src = `${API_URL}?${qs}`;
            const tid = setTimeout(() => { delete window[cb]; s.remove(); reject(new Error('Timeout')); }, 20000);
            s.onerror = () => { clearTimeout(tid); delete window[cb]; reject(new Error('Network error')); };
            document.body.appendChild(s);
        });
    }

    // ── Date helpers ──────────────────────────────────────────
    // DD-MM-YYYY ↔ YYYY-MM-DD
    function normalizeDisplayDate(val) {
        if (!val || val === '-') return '-';
        const s = String(val).trim();
        if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s)) return s;
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
            const [y, m, d] = s.split('-');
            return `${parseInt(d)}-${parseInt(m)}-${y}`;
        }
        try { const dt = new Date(s); if (!isNaN(dt)) return `${dt.getDate()}-${dt.getMonth() + 1}-${dt.getFullYear()}`; } catch (e) { }
        return s;
    }
    function storageToInputDate(str) {
        const n = normalizeDisplayDate(str);
        if (n === '-' || !n) return '';
        const p = n.split('-');
        if (p.length === 3 && p[2].length === 4) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
        return '';
    }
    function inputDateToStorage(str) {
        if (!str) return '';
        const p = str.split('-');
        if (p.length === 3 && p[0].length === 4) return `${parseInt(p[2])}-${parseInt(p[1])}-${p[0]}`;
        return str;
    }

    // ── Helpers ───────────────────────────────────────────────
    function createStatusBadge(status) {
        const s = (status || '').toUpperCase();
        const base = 'display:inline-flex;align-items:center;justify-content:center;min-width:80px;font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px;white-space:nowrap;';
        if (s === 'APPROVED') return `<span style="${base}background:#dcfce7;color:#15803d;">Disetujui</span>`;
        if (s === 'REJECTED') return `<span style="${base}background:#fee2e2;color:#b91c1c;">Ditolak</span>`;
        return `<span style="${base}background:#fef9c3;color:#a16207;">Menunggu</span>`;
    }
    function openModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'flex'; }
    function closeModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
    function setCurrentMonth(elId) {
        const el = document.getElementById(elId);
        if (el && !el.value) el.value = MONTHS_ID[new Date().getMonth() + 1];
    }

    // ── Tab switch ────────────────────────────────────────────
    function bbmSwitchTab(tabName, event) {
        document.querySelectorAll('#section-voucher-bbm .tab').forEach(t => t.classList.remove('active'));
        if (event?.target) event.target.classList.add('active');
        document.querySelectorAll('#section-voucher-bbm .tab-content').forEach(tc => tc.classList.remove('active'));
        const el = document.getElementById('bbm-tab-' + tabName); if (el) el.classList.add('active');
        if (tabName === 'requests') loadRequests();
        else if (tabName === 'violations') loadViolations();
        else if (tabName === 'scores') loadScores();
    }
    window.bbmSwitchTab = bbmSwitchTab;
    window.bbmSwitchTabDropdown = (v) => {
        document.querySelectorAll('#section-voucher-bbm .tab-content').forEach(tc => tc.classList.remove('active'));
        const el = document.getElementById('bbm-tab-' + v); if (el) el.classList.add('active');
        if (v === 'requests') loadRequests();
        else if (v === 'violations') loadViolations();
        else if (v === 'scores') loadScores();
    };

    function updateStats() {
        const t = document.getElementById('bbm-stat-total');
        const a = document.getElementById('bbm-stat-approved');
        const p = document.getElementById('bbm-stat-pending');
        const r = document.getElementById('bbm-stat-rejected');
        if (t) t.textContent = masterRequests.length;
        if (a) a.textContent = masterRequests.filter(r => (r.status || '').toUpperCase() === 'APPROVED').length;
        if (p) p.textContent = masterRequests.filter(r => (r.status || '').toUpperCase() === 'PENDING').length;
        if (r) r.textContent = masterRequests.filter(r => (r.status || '').toUpperCase() === 'REJECTED').length;
    }

    function bbmApplyFilter() {
        const status = (document.getElementById('bbm-filter-status')?.value || '').toUpperCase();
        const term = (document.getElementById('bbm-search-req')?.value || '').toLowerCase();
        allRequests = masterRequests.filter(r => {
            if (status && (r.status || '').toUpperCase() !== status) return false;
            return !term || (r.nama_pegawai || '').toLowerCase().includes(term)
                || (r.unit_eselon || '').toLowerCase().includes(term);
        });
        requestsCurrentPage = 1; renderPaginatedRequests();
    }
    window.bbmApplyFilter = bbmApplyFilter;

    // ═══════════════════════════════════════════════════════════
    // TAB 1 — PERMINTAAN VOUCHER
    // ═══════════════════════════════════════════════════════════
    async function loadRequests(forceRefresh = false) {
        if (!forceRefresh) {
            const cached = getFromCache(CACHE_KEYS.REQUESTS);
            if (cached) {
                masterRequests = cached.slice().reverse();
                allRequests = [...masterRequests];
                requestsCurrentPage = 1;
                renderPaginatedRequests();
                showCacheIndicator(); return;
            }
        }
        const tbody = document.getElementById('bbm-requests-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="loading"><div class="spinner"></div><p style="margin-top:12px;color:#64748b;">Memuat data...</p></td></tr>';
        try {
            const res = await callAPI({ action: 'getVoucherRequests' });
            const rawData = Array.isArray(res) ? res : [];
            saveToCache(CACHE_KEYS.REQUESTS, rawData);
            masterRequests = rawData.slice().reverse();
            allRequests = [...masterRequests];
            requestsCurrentPage = 1;
            renderPaginatedRequests();
        } catch (e) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#ef4444;">Gagal memuat data. <button onclick="bbmLoadRequests(true)" class="btn btn-sm" style="margin-left:8px;">Coba Lagi</button></td></tr>`;
            if (window.showToast) showToast('Gagal memuat permintaan: ' + e.message, 'error');
        }
    }
    window.bbmLoadRequests = (f) => loadRequests(f);

    function renderPaginatedRequests() {
        const tbody = document.getElementById('bbm-requests-tbody');
        const cards = document.getElementById('bbm-requests-cards');
        const pgn = document.getElementById('bbm-requests-pagination');
        if (!tbody) return;
        updateStats();

        if (!allRequests.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">Tidak ada data permintaan</td></tr>';
            if (cards) cards.innerHTML = '<div style="text-align:center;padding:2rem;color:#64748b;">Data tidak ditemukan</div>';
            if (pgn) pgn.innerHTML = ''; return;
        }
        const totalPages = Math.ceil(allRequests.length / itemsPerPage);
        const start = (requestsCurrentPage - 1) * itemsPerPage;
        const items = allRequests.slice(start, start + itemsPerPage);

        tbody.innerHTML = items.map(req => {
            const isPending = (req.status || '').toUpperCase() === 'PENDING';
            return `<tr>
                <td style="font-weight:500;">${req.nama_pegawai || '—'}</td>
                <td style="color:#64748b;font-size:13px;">${req.unit_eselon || '—'}</td>
                <td style="font-family:monospace;font-weight:500;">${req.nomor_kendaraan || '—'}</td>
                <td style="color:#64748b;font-size:13px;">${req.timestamp || '—'}</td>
                <td style="min-width:110px;">
                    <div style="display:flex;align-items:center;justify-content:center;">
                    ${isPending ? `<div class="btn-icon-group" style="margin:0;">
                        <button onclick="bbmOpenApprove('${req.id}')" class="btn-icon btn-icon-approve" title="Setujui">${ICONS.check}</button>
                        <button onclick="bbmQuickReject('${req.id}', this)" class="btn-icon btn-icon-reject" title="Tolak">${ICONS.x}</button>
                    </div>` : createStatusBadge(req.status)}
                    </div>
                </td>
                <td><div class="action-buttons"><div class="btn-icon-group">
                    <button onclick="bbmViewDetail('${req.id}')" class="btn-icon btn-icon-view" title="Detail">${ICONS.eye}</button>
                    <button onclick="bbmOpenEdit('${req.id}')" class="btn-icon btn-icon-edit" title="Edit">${ICONS.edit}</button>
                    <button onclick="bbmDeleteRequest('${req.id}', this)" class="btn-icon btn-icon-delete" title="Hapus">${ICONS.trash}</button>
                </div></div></td>
            </tr>`;
        }).join('');

        if (cards) cards.innerHTML = items.map(req => {
            const isPending = (req.status || '').toUpperCase() === 'PENDING';
            return `<div class="requests-card">
                <div class="requests-card-header">
                    <div style="flex:1;">
                        <div class="requests-card-title">${req.nama_pegawai || '—'}</div>
                        <div class="requests-card-subtitle">${req.unit_eselon || '—'}</div>
                    </div>
                    ${isPending ? `<div class="btn-icon-group" style="margin:0;">
                        <button onclick="bbmOpenApprove('${req.id}')" class="btn-icon btn-icon-approve">${ICONS.check}</button>
                        <button onclick="bbmQuickReject('${req.id}', this)" class="btn-icon btn-icon-reject">${ICONS.x}</button>
                    </div>` : createStatusBadge(req.status)}
                </div>
                <div class="requests-card-body">
                    <div class="requests-card-row"><span class="requests-card-label">No. Kendaraan</span><span class="requests-card-value" style="font-family:monospace;">${req.nomor_kendaraan || '—'}</span></div>
                    <div class="requests-card-row"><span class="requests-card-label">Waktu Pengajuan</span><span class="requests-card-value">${req.timestamp || '—'}</span></div>
                </div>
                <div class="requests-card-footer">
                    <div class="action-buttons" style="justify-content:flex-end;"><div class="btn-icon-group">
                        <button onclick="bbmViewDetail('${req.id}')" class="btn-icon btn-icon-view">${ICONS.eye}</button>
                        <button onclick="bbmOpenEdit('${req.id}')" class="btn-icon btn-icon-edit">${ICONS.edit}</button>
                        <button onclick="bbmDeleteRequest('${req.id}', this)" class="btn-icon btn-icon-delete">${ICONS.trash}</button>
                    </div></div>
                </div>
            </div>`;
        }).join('');

        if (pgn) pgn.innerHTML = `
            <button onclick="bbmChangeReqPage(${requestsCurrentPage - 1})" ${requestsCurrentPage === 1 ? 'disabled' : ''}>&#8249; Prev</button>
            <span class="pagination-info">Halaman ${requestsCurrentPage} dari ${totalPages} (${allRequests.length} data)</span>
            <button onclick="bbmChangeReqPage(${requestsCurrentPage + 1})" ${requestsCurrentPage === totalPages ? 'disabled' : ''}>Next &#8250;</button>`;
    }
    window.bbmChangeReqPage = (page) => {
        const t = Math.ceil(allRequests.length / itemsPerPage);
        if (page < 1 || page > t) return;
        requestsCurrentPage = page; renderPaginatedRequests();
    };

    // ── Detail Modal (styled like ruang-rapat) ─────────────────
    window.bbmViewDetail = (id) => {
        const req = masterRequests.find(r => String(r.id) === String(id));
        if (!req) return;
        const el = document.getElementById('bbm-detail-body');
        const s = (req.status || 'pending').toUpperCase();
        const statusColor = s === 'APPROVED' ? '#10b981' : s === 'REJECTED' ? '#ef4444' : '#f59e0b';
        const statusBg = s === 'APPROVED' ? '#f0fdf4' : s === 'REJECTED' ? '#fff1f2' : '#fffbeb';
        const statusLabel = s === 'APPROVED' ? 'Disetujui' : s === 'REJECTED' ? 'Ditolak' : 'Menunggu';

        if (el) el.innerHTML = `
        <div class="req-detail-wrap">
            <div class="req-detail-status-banner" style="background:${statusBg};border-color:${statusColor};">
                <div class="req-detail-status-dot" style="background:${statusColor};"></div>
                <span style="font-weight:700;color:${statusColor};font-size:14px;">${statusLabel}</span>
                <span style="margin-left:auto;font-size:12px;color:#64748b;">${req.id || ''}</span>
            </div>
            <div class="req-detail-section">
                <div class="req-detail-section-title">Informasi Pegawai</div>
                <div class="req-detail-grid-2">
                    <div class="req-detail-field">
                        <div class="req-detail-field-icon" style="background:#eff6ff;color:#3b82f6;">${ICONS.user}</div>
                        <div><div class="req-detail-field-label">Nama Pegawai</div><div class="req-detail-field-value">${req.nama_pegawai || '-'}</div></div>
                    </div>
                    <div class="req-detail-field">
                        <div class="req-detail-field-icon" style="background:#f0fdf4;color:#10b981;">${ICONS.building}</div>
                        <div><div class="req-detail-field-label">Unit / Eselon</div><div class="req-detail-field-value">${req.unit_eselon || '-'}</div></div>
                    </div>
                </div>
            </div>
            <div class="req-detail-section">
                <div class="req-detail-section-title">Detail Permintaan</div>
                <div class="req-detail-field">
                    <div class="req-detail-field-icon" style="background:#fefce8;color:#ca8a04;">${ICONS.car}</div>
                    <div><div class="req-detail-field-label">Nomor Kendaraan</div><div class="req-detail-field-value" style="font-family:monospace;">${req.nomor_kendaraan || '-'}</div></div>
                </div>
            </div>
            <div class="req-detail-section">
                <div class="req-detail-section-title">Waktu Pengajuan</div>
                <div class="req-detail-field">
                    <div class="req-detail-field-icon" style="background:#fdf4ff;color:#a855f7;">${ICONS.clock}</div>
                    <div><div class="req-detail-field-label">Timestamp</div><div class="req-detail-field-value">${req.timestamp || '-'}</div></div>
                </div>
            </div>
        </div>`;
        openModal('bbm-detailModal');
    };

    // ── Approve ───────────────────────────────────────────────
    window.bbmOpenApprove = (id) => {
        currentApproveId = id;
        const req = masterRequests.find(r => String(r.id) === String(id));
        const infoEl = document.getElementById('bbm-approve-req-info');
        if (infoEl && req) {
            infoEl.innerHTML = `
                <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:13px;">
                    <div style="flex:1;min-width:140px;">
                        <div style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;margin-bottom:2px;">Pegawai</div>
                        <div style="font-weight:600;color:#1e293b;">${req.nama_pegawai || '-'}</div>
                        <div style="color:#64748b;font-size:12px;">${req.unit_eselon || '-'}</div>
                    </div>
                    <div style="flex:1;min-width:140px;">
                        <div style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;margin-bottom:2px;">Kendaraan</div>
                        <div style="font-weight:700;color:#1e293b;font-family:monospace;">${req.nomor_kendaraan || '-'}</div>
                    </div>
                    <div style="flex:1;min-width:140px;">
                        <div style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;margin-bottom:2px;">Waktu Pengajuan</div>
                        <div style="color:#64748b;font-size:12px;">${req.timestamp || '-'}</div>
                    </div>
                </div>`;
        }
        openModal('bbm-approveModal');
    };

    window.bbmConfirmApprove = async () => {
        const btn = document.getElementById('bbm-confirm-approve-btn');
        const orig = btn.innerHTML;
        btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyetujui...';
        try {
            const res = await callAPI({ action: 'updateVoucherRequest', id: currentApproveId, status: 'APPROVED' });
            if (res?.success) {
                if (window.showToast) showToast('Permintaan disetujui', 'success');
                closeModal('bbm-approveModal'); clearCache(); await loadRequests(true);
            } else if (window.showToast) showToast(res?.message || 'Gagal', 'error');
        } catch (e) { if (window.showToast) showToast('Error: ' + e.message, 'error'); }
        finally { btn.disabled = false; btn.innerHTML = orig; }
    };

    // ── Quick Reject ──────────────────────────────────────────
    window.bbmQuickReject = (id, btnEl) => {
        showConfirmModal({
            icon: '❌',
            title: 'Tolak Permintaan Voucher BBM?',
            message: 'Permintaan voucher BBM ini akan ditolak.',
            confirmText: 'Ya, Tolak',
            confirmClass: 'btn-warning',
        }, async () => {
            const orig = btnEl ? btnEl.innerHTML : null;
            if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '<span class="spinner spinner-sm"></span>'; }
            try {
                const res = await callAPI({ action: 'updateVoucherRequest', id, status: 'REJECTED' });
                if (res?.success) {
                    if (window.showToast) showToast('Permintaan ditolak', 'success');
                    clearCache(); await loadRequests(true);
                } else {
                    if (window.showToast) showToast(res?.message || 'Gagal', 'error');
                    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = orig; }
                }
            } catch (e) {
                if (window.showToast) showToast('Error: ' + e.message, 'error');
                if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = orig; }
            }
        });
    };

    // ── Edit Request (all fields editable) ────────────────────
    window.bbmOpenEdit = (id) => {
        const req = masterRequests.find(r => String(r.id) === String(id));
        if (!req) return;
        currentEditId = id;
        // Tampilkan info request di panel
        const infoEl = document.getElementById('bbm-edit-req-info');
        if (infoEl) {
            infoEl.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:6px;">
                    <div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;white-space:nowrap;">Pegawai</span><span style="font-weight:600;color:#1e293b;text-align:right;">${req.nama_pegawai || '-'}</span></div>
                    <div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;white-space:nowrap;">Unit</span><span style="color:#475569;text-align:right;">${req.unit_eselon || '-'}</span></div>
                    <div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:#94a3b8;font-size:11px;font-weight:600;text-transform:uppercase;white-space:nowrap;">Kendaraan</span><span style="font-family:monospace;font-weight:600;">${req.nomor_kendaraan || '-'}</span></div>
                </div>`;
        }
        const statusEl = document.getElementById('bbm-edit-status');
        if (statusEl) statusEl.value = (req.status || 'PENDING').toUpperCase();
        openModal('bbm-editModal');
    };

    window.bbmSubmitEdit = async () => {
        const btn = document.getElementById('bbm-submit-edit-btn');
        const orig = btn.innerHTML;
        btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan...';
        try {
            const res = await callAPI({
                action: 'updateVoucherRequest',
                id: currentEditId,
                status: document.getElementById('bbm-edit-status')?.value || 'PENDING'
            });
            if (res?.success) {
                if (window.showToast) showToast('Status berhasil diperbarui!', 'success');
                closeModal('bbm-editModal'); clearCache(); await loadRequests(true);
            } else if (window.showToast) showToast(res?.message || 'Gagal', 'error');
        } catch (e) { if (window.showToast) showToast('Error: ' + e.message, 'error'); }
        finally { btn.disabled = false; btn.innerHTML = orig; }
    };

    // ── Delete Request ────────────────────────────────────────
    window.bbmDeleteRequest = (id, btnEl) => {
        showConfirmModal({
            icon: '🗑️',
            title: 'Hapus Permintaan?',
            message: 'Permintaan voucher BBM ini akan dihapus permanen. <span style="color:#ef4444;font-weight:600;">Tindakan ini tidak dapat dibatalkan.</span>',
            confirmText: 'Ya, Hapus',
            confirmClass: 'btn-danger',
        }, async () => {
            const orig = btnEl ? btnEl.innerHTML : null;
            if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '<span class="spinner spinner-sm"></span>'; }
            try {
                const res = await callAPI({ action: 'deleteVoucherRequest', id });
                if (res?.success) {
                    if (window.showToast) showToast('Data berhasil dihapus', 'success');
                    clearCache(); await loadRequests(true);
                } else {
                    if (window.showToast) showToast(res?.message || 'Gagal', 'error');
                    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = orig; }
                }
            } catch (e) {
                if (window.showToast) showToast('Error: ' + e.message, 'error');
                if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = orig; }
            }
        });
    };

    // ═══════════════════════════════════════════════════════════
    // TAB 2 — CATATAN PELANGGARAN
    // ═══════════════════════════════════════════════════════════
    async function loadViolations(forceRefresh = false) {
        setCurrentMonth('bbm-filter-bulan-viol');
        if (!forceRefresh) {
            const cached = getFromCache(CACHE_KEYS.VIOLATIONS);
            if (cached) {
                masterViolations = cached.slice().reverse();
                window.bbmApplyViolFilter();
                showCacheIndicator(); return;
            }
        }
        const tbody = document.getElementById('bbm-violations-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="loading"><div class="spinner"></div><p style="margin-top:12px;color:#64748b;">Memuat data...</p></td></tr>';
        try {
            const res = await callAPI({ action: 'getBBMViolations' });
            const rawData = Array.isArray(res) ? res : [];
            saveToCache(CACHE_KEYS.VIOLATIONS, rawData);
            masterViolations = rawData.slice().reverse();
            window.bbmApplyViolFilter();
        } catch (e) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#ef4444;">Gagal memuat data. <button onclick="bbmLoadViolations(true)" class="btn btn-sm" style="margin-left:8px;">Coba Lagi</button></td></tr>`;
            if (window.showToast) showToast('Gagal memuat catatan: ' + e.message, 'error');
        }
    }
    window.bbmLoadViolations = (f) => loadViolations(f);

    window.bbmApplyViolFilter = () => {
        const bulan = document.getElementById('bbm-filter-bulan-viol')?.value || '';
        const unit = document.getElementById('bbm-filter-unit-viol')?.value || '';
        allViolations = masterViolations.filter(v => (!bulan || v.bulan === bulan) && (!unit || v.unit === unit));
        violationsCurrentPage = 1; renderPaginatedViolations();
    };

    // Resolve violation by safe-encoded key (mirrors ruang-rapat resolveViol pattern)
    function resolveViol(safeId) {
        try {
            const key = JSON.parse(decodeURIComponent(safeId));
            return allViolations.find(v => v.id === key.id && v.bulan === key.bulan && v.unit === key.unit)
                || masterViolations.find(v => v.id === key.id && v.bulan === key.bulan && v.unit === key.unit)
                || null;
        } catch (e) { return null; }
    }

    function renderPaginatedViolations() {
        const tbody = document.getElementById('bbm-violations-tbody');
        const cards = document.getElementById('bbm-violations-cards');
        const pgn = document.getElementById('bbm-violations-pagination');
        if (!tbody) return;
        if (!allViolations.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">Tidak ada catatan pelanggaran</td></tr>';
            if (cards) cards.innerHTML = '<div style="text-align:center;padding:2rem;color:#64748b;">Data tidak ditemukan</div>';
            if (pgn) pgn.innerHTML = ''; return;
        }
        const totalPages = Math.ceil(allViolations.length / itemsPerPage);
        const start = (violationsCurrentPage - 1) * itemsPerPage;
        const items = allViolations.slice(start, start + itemsPerPage);

        tbody.innerHTML = items.map(v => {
            const safeV = encodeURIComponent(JSON.stringify({ id: v.id, bulan: v.bulan, unit: v.unit }));
            return `<tr>
                <td><span style="font-weight:600;font-size:12px;background:#f1f5f9;color:#1e293b;padding:3px 8px;border-radius:4px;">${v.bulan || '—'}</span></td>
                <td style="font-size:13px;">${v.unit || '—'}</td>
                <td style="font-size:13px;">${normalizeDisplayDate(v.tanggal_pengambilan)}</td>
                <td style="font-size:13px;">${normalizeDisplayDate(v.tanggal_pengembalian)}</td>
                <td style="font-family:monospace;font-size:13px;">${v.nomor_kendaraan || '—'}</td>
                <td><div class="action-buttons"><div class="btn-icon-group">
                    <button onclick="bbmOpenEditViol('${safeV}')" class="btn-icon btn-icon-edit" title="Edit">${ICONS.edit}</button>
                    <button onclick="bbmDeleteViol('${safeV}', this)" class="btn-icon btn-icon-delete" title="Hapus">${ICONS.trash}</button>
                </div></div></td>
            </tr>`;
        }).join('');

        if (cards) cards.innerHTML = items.map(v => {
            const safeV = encodeURIComponent(JSON.stringify({ id: v.id, bulan: v.bulan, unit: v.unit }));
            return `<div class="violation-card">
                <div class="violation-card-header">
                    <div>
                        <div class="violation-card-title">${v.unit || '—'}</div>
                        <div class="violation-card-subtitle">Bulan ${v.bulan || '—'}</div>
                    </div>
                </div>
                <div class="violation-card-body">
                    <div class="violation-card-item"><div class="violation-card-label">Tgl Pengambilan</div><div class="violation-card-value">${normalizeDisplayDate(v.tanggal_pengambilan)}</div></div>
                    <div class="violation-card-item"><div class="violation-card-label">Tgl Pengembalian</div><div class="violation-card-value">${normalizeDisplayDate(v.tanggal_pengembalian)}</div></div>
                    <div class="violation-card-item" style="grid-column:1/-1"><div class="violation-card-label">No. Kendaraan</div><div class="violation-card-value" style="font-family:monospace;">${v.nomor_kendaraan || '—'}</div></div>
                </div>
                <div class="violation-card-footer">
                    <div class="action-buttons" style="justify-content:flex-end;"><div class="btn-icon-group">
                        <button onclick="bbmOpenEditViol('${safeV}')" class="btn-icon btn-icon-edit">${ICONS.edit}</button>
                        <button onclick="bbmDeleteViol('${safeV}', this)" class="btn-icon btn-icon-delete">${ICONS.trash}</button>
                    </div></div>
                </div>
            </div>`;
        }).join('');

        if (pgn) pgn.innerHTML = `
            <button onclick="bbmChangeViolPage(${violationsCurrentPage - 1})" ${violationsCurrentPage === 1 ? 'disabled' : ''}>&#8249; Prev</button>
            <span class="pagination-info">Halaman ${violationsCurrentPage} dari ${totalPages} (${allViolations.length} data)</span>
            <button onclick="bbmChangeViolPage(${violationsCurrentPage + 1})" ${violationsCurrentPage === totalPages ? 'disabled' : ''}>Next &#8250;</button>`;
    }
    window.bbmChangeViolPage = (page) => {
        const t = Math.ceil(allViolations.length / itemsPerPage);
        if (page < 1 || page > t) return;
        violationsCurrentPage = page; renderPaginatedViolations();
    };

    // ── Violation source toggle ───────────────────────────────
    window.bbmSetViolSource = (src) => {
        violationSource = src;
        document.getElementById('bbm-vsrc-approved').style.display = src === 'approved' ? 'block' : 'none';
        document.getElementById('bbm-vsrc-manual').style.display = src === 'manual' ? 'block' : 'none';
        document.getElementById('bbm-vsrc-btn-approved').className = `btn btn-sm ${src === 'approved' ? 'btn-primary' : ''}`;
        document.getElementById('bbm-vsrc-btn-manual').className = `btn btn-sm ${src === 'manual' ? 'btn-primary' : ''}`;
        if (src === 'approved') renderApprovedReqList();
    };

    // ── Approved request list (mirrors ruang-rapat) ───────────
    function renderApprovedReqList(filter = '') {
        const list = document.getElementById('bbm-approved-req-list'); if (!list) return;
        const approved = masterRequests.filter(r => (r.status || '').toUpperCase() === 'APPROVED');
        const filtered = filter
            ? approved.filter(r => `${r.nama_pegawai} ${r.unit_eselon} ${r.nomor_kendaraan || ''}`.toLowerCase().includes(filter.toLowerCase()))
            : approved;
        if (!filtered.length) {
            list.innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;font-size:13px;">Tidak ada permintaan yang disetujui</div>';
            return;
        }
        list.innerHTML = filtered.map(r => `
            <div class="req-pick-item ${selectedApprovedReq?.id === r.id ? 'selected' : ''}" onclick="bbmSelectApproved('${r.id}')">
                <div class="req-pick-check">${selectedApprovedReq?.id === r.id ? ICONS.check : ''}</div>
                <div style="flex:1;min-width:0;">
                    <div class="req-pick-name">${r.nama_pegawai || '-'}</div>
                    <div class="req-pick-meta">${r.unit_eselon || '-'} &nbsp;·&nbsp; <span style="font-size:11px;background:#f1f5f9;padding:1px 5px;border-radius:3px;font-family:monospace;">${r.nomor_kendaraan || '-'}</span></div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${r.timestamp || ''}</div>
                </div>
            </div>`).join('');
    }
    window.bbmFilterApprovedReqs = () => renderApprovedReqList(document.getElementById('bbm-approved-search')?.value || '');

    window.bbmSelectApproved = (id) => {
        selectedApprovedReq = masterRequests.find(r => String(r.id) === String(id));
        renderApprovedReqList(document.getElementById('bbm-approved-search')?.value || '');
        if (!selectedApprovedReq) return;
        const info = document.getElementById('bbm-selected-req-info');
        const detail = document.getElementById('bbm-selected-req-detail');
        if (info) info.style.display = 'block';
        if (detail) {
            detail.innerHTML = `<strong>${selectedApprovedReq.nama_pegawai}</strong> — ${selectedApprovedReq.unit_eselon} — <span style="font-family:monospace;background:#f1f5f9;padding:1px 6px;border-radius:3px;">${selectedApprovedReq.nomor_kendaraan || '-'}</span>`;
        }
        // Auto-set kendaraan dropdown
        const kendaraanSel = document.getElementById('bbm-viol-no-kendaraan');
        if (kendaraanSel && selectedApprovedReq.nomor_kendaraan) {
            const plat = (selectedApprovedReq.nomor_kendaraan || '').trim();
            let matched = false;
            for (let i = 0; i < kendaraanSel.options.length; i++) {
                if (kendaraanSel.options[i].value.toLowerCase() === plat.toLowerCase()) {
                    kendaraanSel.selectedIndex = i; matched = true; break;
                }
            }
            if (!matched) kendaraanSel.value = '';
        }
    };

    // ── Add Violation ─────────────────────────────────────────
    window.bbmOpenAddViol = () => {
        selectedApprovedReq = null;
        ['bbm-viol-bulan', 'bbm-viol-unit', 'bbm-viol-tgl-ambil', 'bbm-viol-tgl-kembali', 'bbm-viol-no-kendaraan'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        const srch = document.getElementById('bbm-approved-search'); if (srch) srch.value = '';
        const info = document.getElementById('bbm-selected-req-info'); if (info) info.style.display = 'none';
        if (!masterRequests.length) loadRequests().then(() => renderApprovedReqList());
        else renderApprovedReqList();
        window.bbmSetViolSource('approved');
        openModal('bbm-addViolModal');
    };

    window.bbmSubmitViol = async () => {
        const btn = document.getElementById('bbm-submit-viol-btn');
        const tglAmbilRaw = document.getElementById('bbm-viol-tgl-ambil')?.value || '';
        const tglKembaliRaw = document.getElementById('bbm-viol-tgl-kembali')?.value || '';

        let bulan, unit, noKendaraan;
        if (violationSource === 'approved') {
            if (!selectedApprovedReq) { if (window.showToast) showToast('Pilih permintaan yang disetujui', 'error'); return; }
            if (!tglAmbilRaw) { if (window.showToast) showToast('Tanggal pengambilan harus diisi', 'error'); return; }
            bulan = MONTHS_ID[new Date(tglAmbilRaw + 'T00:00:00').getMonth() + 1];
            unit = selectedApprovedReq.unit_eselon;
            noKendaraan = selectedApprovedReq.nomor_kendaraan || '-';
        } else {
            bulan = document.getElementById('bbm-viol-bulan')?.value.trim() || '';
            unit = document.getElementById('bbm-viol-unit')?.value.trim() || '';
            noKendaraan = document.getElementById('bbm-viol-no-kendaraan')?.value.trim() || '-';
            if (!bulan || !unit) { if (window.showToast) showToast('Bulan dan unit harus diisi', 'error'); return; }
            if (!tglAmbilRaw) { if (window.showToast) showToast('Tanggal pengambilan harus diisi', 'error'); return; }
        }

        const orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan...';
        try {
            const res = await callAPI({
                action: 'createBBMViolation', bulan, unit,
                tanggal_pengambilan: inputDateToStorage(tglAmbilRaw),
                tanggal_pengembalian: tglKembaliRaw ? inputDateToStorage(tglKembaliRaw) : '-',
                nomor_kendaraan: noKendaraan
            });
            if (res?.success) {
                if (window.showToast) showToast('Catatan berhasil ditambahkan!', 'success');
                closeModal('bbm-addViolModal'); clearCache(); await loadViolations(true);
            } else if (window.showToast) showToast(res?.message || 'Gagal', 'error');
        } catch (e) { if (window.showToast) showToast('Error: ' + e.message, 'error'); }
        finally { btn.disabled = false; btn.innerHTML = orig; }
    };

    // ── Edit Violation (with pindah support, mirrors ruang-rapat) ──
    window.bbmOpenEditViol = (safeV) => {
        const v = resolveViol(safeV);
        if (!v) { if (window.showToast) showToast('Data tidak ditemukan', 'error'); return; }
        currentEditViol = v;

        // Buka modal dulu agar elemen visible dan nilai bisa di-set dengan benar
        openModal('bbm-editViolModal');

        // Helper: set select dengan loop eksplisit agar pasti cocok
        const setSelect = (id, val) => {
            const el = document.getElementById(id);
            if (!el || val == null) return;
            const v2 = (val || '').toString().trim();
            // Exact match dulu
            for (let i = 0; i < el.options.length; i++) {
                if (el.options[i].value === v2) { el.selectedIndex = i; return; }
            }
            // Loose match (normalize spasi) untuk nomor kendaraan
            const norm = v2.replace(/\s+/g, '').toUpperCase();
            for (let i = 0; i < el.options.length; i++) {
                if (el.options[i].value.replace(/\s+/g, '').toUpperCase() === norm) { el.selectedIndex = i; return; }
            }
            el.value = v2; // fallback
        };
        const setInput = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

        setSelect('bbm-ev-bulan', v.bulan);
        setSelect('bbm-ev-unit', v.unit);
        setSelect('bbm-ev-no-kendaraan', v.nomor_kendaraan !== '-' ? v.nomor_kendaraan : '');
        setInput('bbm-ev-tgl-ambil', storageToInputDate(v.tanggal_pengambilan));
        setInput('bbm-ev-tgl-kembali', storageToInputDate(v.tanggal_pengembalian));

        // Simpan nilai asli untuk deteksi pindah
        const bulanEl = document.getElementById('bbm-ev-bulan');
        const unitEl = document.getElementById('bbm-ev-unit');
        if (bulanEl) bulanEl.dataset.original = v.bulan || '';
        if (unitEl) unitEl.dataset.original = v.unit || '';
        bbmUpdatePindahBadge();
    };

    window.bbmUpdatePindahBadge = () => {
        const badge = document.getElementById('bbm-ev-pindah-badge');
        if (!badge || !currentEditViol) return;
        const bulanBaru = document.getElementById('bbm-ev-bulan')?.value;
        const unitBaru = document.getElementById('bbm-ev-unit')?.value;
        const bulanLama = document.getElementById('bbm-ev-bulan')?.dataset.original || currentEditViol.bulan;
        const unitLama = document.getElementById('bbm-ev-unit')?.dataset.original || currentEditViol.unit;
        const isPindah = bulanBaru !== bulanLama || unitBaru !== unitLama;
    };

    window.bbmSubmitEditViol = async () => {
        if (!currentEditViol) { if (window.showToast) showToast('Tidak ada data yang diedit', 'error'); return; }
        const bulanBaru = document.getElementById('bbm-ev-bulan')?.value;
        const unitBaru = document.getElementById('bbm-ev-unit')?.value;
        const tglAmbil = document.getElementById('bbm-ev-tgl-ambil')?.value;
        const tglKembali = document.getElementById('bbm-ev-tgl-kembali')?.value;
        const noKendaraan = document.getElementById('bbm-ev-no-kendaraan')?.value || '-';
        if (!bulanBaru || !unitBaru) { if (window.showToast) showToast('Bulan dan unit harus diisi', 'error'); return; }
        if (!tglAmbil) { if (window.showToast) showToast('Tanggal pengambilan harus diisi', 'error'); return; }

        const bulanLama = document.getElementById('bbm-ev-bulan')?.dataset.original || currentEditViol.bulan;
        const unitLama = document.getElementById('bbm-ev-unit')?.dataset.original || currentEditViol.unit;
        const isPindah = bulanBaru !== bulanLama || unitBaru !== unitLama;

        const btn = document.getElementById('bbm-submit-ev-btn');
        const orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan...';
        try {
            const res = await callAPI({
                action: 'updateBBMViolation',
                id: currentEditViol.id,
                bulan: bulanLama,
                unit: unitLama,
                bulan_orig: bulanLama,
                unit_orig: unitLama,
                tanggal_pengambilan: inputDateToStorage(tglAmbil),
                tanggal_pengembalian: tglKembali ? inputDateToStorage(tglKembali) : '-',
                nomor_kendaraan: noKendaraan,
                pindah: isPindah ? '1' : '0',
                bulan_baru: isPindah ? bulanBaru : undefined,
                unit_baru: isPindah ? unitBaru : undefined
            });
            if (res?.success) {
                if (window.showToast) showToast(res.message || 'Catatan berhasil diperbarui!', 'success');
                closeModal('bbm-editViolModal');
                currentEditViol = null;
                clearCache(); await loadViolations(true);
            } else if (window.showToast) showToast(res?.message || 'Gagal', 'error');
        } catch (e) { if (window.showToast) showToast('Error: ' + e.message, 'error'); }
        finally { btn.disabled = false; btn.innerHTML = orig; }
    };

    // ── Delete Violation ──────────────────────────────────────
    window.bbmDeleteViol = (safeV, btnEl) => {
        const v = resolveViol(safeV);
        if (!v) { if (window.showToast) showToast('Data tidak ditemukan', 'error'); return; }
        showConfirmModal({
            icon: '🗑️',
            title: 'Hapus Catatan Pelanggaran?',
            message: `Unit: <strong>${v.unit}</strong><br>Bulan: <strong>${v.bulan}</strong><br><br><span style="color:#ef4444;font-weight:600;">Tindakan ini tidak dapat dibatalkan.</span>`,
            confirmText: 'Ya, Hapus',
            confirmClass: 'btn-danger',
        }, async () => {
            const orig = btnEl ? btnEl.innerHTML : null;
            if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '<span class="spinner spinner-sm"></span>'; }
            try {
                const res = await callAPI({ action: 'deleteBBMViolation', id: v.id || '', bulan: v.bulan, unit: v.unit });
                if (res?.success) {
                    if (window.showToast) showToast('Catatan berhasil dihapus', 'success');
                    clearCache(); await loadViolations(true); await loadScores(true);
                } else {
                    if (window.showToast) showToast(res?.message || 'Gagal', 'error');
                    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = orig; }
                }
            } catch (e) {
                if (window.showToast) showToast('Error: ' + e.message, 'error');
                if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = orig; }
            }
        });
    };

    // ── Export ────────────────────────────────────────────────
    window.bbmExportViol = () => {
        showConfirmModal({
            icon: '📤',
            title: 'Export Catatan Pelanggaran?',
            message: 'Data catatan pelanggaran BBM akan diexport ke sheet baru di spreadsheet.',
            confirmText: 'Ya, Export',
            confirmClass: 'btn-primary',
        }, async () => {
            if (window.showToast) showToast('Mengekspor...', 'success');
            try {
                const res = await callAPI({
                    action: 'exportBBMViolationsReport',
                    bulan: document.getElementById('bbm-filter-bulan-viol')?.value || '',
                    unit: document.getElementById('bbm-filter-unit-viol')?.value || ''
                });
                if (res?.success) {
                    if (window.showToast) showToast(`Berhasil export ${res.recordCount} catatan!`, 'success');
                    if (res.url) {
                        showConfirmModal({
                            icon: '🔗',
                            title: 'Export Berhasil!',
                            message: 'Spreadsheet berhasil dibuat. Buka sekarang?',
                            confirmText: 'Buka Spreadsheet',
                            confirmClass: 'btn-primary',
                        }, () => window.open(res.url, '_blank'));
                    }
                } else if (window.showToast) showToast(res?.message || 'Gagal', 'error');
            } catch (e) { if (window.showToast) showToast('Gagal export: ' + e.message, 'error'); }
        });
    };

    // ═══════════════════════════════════════════════════════════
    // TAB 3 — PENILAIAN
    // ═══════════════════════════════════════════════════════════
    async function loadScores(forceRefresh = false) {
        let bulan = document.getElementById('bbm-filter-score-bulan')?.value || '';
        if (!bulan) {
            bulan = MONTHS_ID[new Date().getMonth() + 1];
            const el = document.getElementById('bbm-filter-score-bulan');
            if (el) el.value = bulan;
        }
        const cacheKey = CACHE_KEYS.SCORES + '_' + (bulan || 'all');
        if (!forceRefresh && bulan) {
            const cached = getFromCache(cacheKey);
            if (cached) { allScores = cached; renderScoresUI(); showCacheIndicator(); return; }
        }
        const container = document.getElementById('bbm-scores-container');
        if (container) container.innerHTML = '<div class="loading"><div class="spinner"></div><p style="margin-top:12px;">Memuat penilaian...</p></div>';
        const chartsGrid = document.getElementById('bbm-charts-grid');
        const sanksiBox = document.getElementById('bbm-sanksi-box');
        if (chartsGrid) chartsGrid.style.display = 'none';
        if (sanksiBox) sanksiBox.style.display = 'none';
        try {
            const res = await callAPI({ action: 'getBBMScores', bulan });
            if (res?.success) {
                allScores = { sanksi: res.sanksiPerPelanggaran, scores: res.scores };
                if (bulan) saveToCache(cacheKey, allScores);
                renderScoresUI();
            } else {
                if (container) container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><p style="color:#ef4444;">Gagal memuat penilaian</p></div>';
            }
        } catch (e) {
            if (container) container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><p style="color:#ef4444;">${e.message}</p></div>`;
        }
    }
    window.bbmLoadScores = (f) => loadScores(f);

    function renderScoresUI() {
        const bulan = document.getElementById('bbm-filter-score-bulan')?.value || '';
        const container = document.getElementById('bbm-scores-container');
        const chartsGrid = document.getElementById('bbm-charts-grid');
        const sanksiBox = document.getElementById('bbm-sanksi-box');
        const sanksiVal = document.getElementById('bbm-sanksi-value');

        if (allScores.sanksi !== undefined && sanksiBox && sanksiVal) {
            sanksiBox.style.display = 'block';
            sanksiVal.textContent = `${allScores.sanksi} poin per keterlambatan`;
        }
        if (!container) return;
        if (!bulan) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><p>Pilih bulan untuk melihat penilaian</p></div>';
            if (chartsGrid) chartsGrid.style.display = 'none';
            if (scoreChart) { scoreChart.destroy(); scoreChart = null; }
            if (violationChart) { violationChart.destroy(); violationChart = null; }
            return;
        }
        const monthScores = (allScores.scores || []).filter(s => s.bulan === bulan);
        if (!monthScores.length) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>Tidak ada data untuk bulan ini</p></div>';
            if (chartsGrid) chartsGrid.style.display = 'none';
            if (scoreChart) { scoreChart.destroy(); scoreChart = null; }
            if (violationChart) { violationChart.destroy(); violationChart = null; }
            return;
        }
        if (chartsGrid) chartsGrid.style.display = 'grid';
        renderBBMCharts(monthScores);
        container.innerHTML = '<div class="scores-grid">' + monthScores.map(score => {
            const s = parseFloat(score.skorAkhir) || 0;
            const cls = s >= 4.5 ? 'score-good' : s >= 3 ? 'score-warning' : 'score-danger';
            const barColor = s >= 4.5 ? '#10b981' : s >= 3 ? '#f59e0b' : '#ef4444';
            const label = s >= 4.5 ? 'Sangat Baik' : s >= 3 ? 'Cukup' : 'Perlu Perhatian';
            const pct = Math.min(100, (s / 5) * 100);
            return `<div class="score-card">
                <div class="score-header">
                    <div><div class="score-unit-name">${score.unit}</div><div class="score-month">Bulan ${score.bulan}</div></div>
                    <div style="text-align:right;">
                        <div class="score-value ${cls}">${s.toFixed(2)}</div>
                        <div style="font-size:12px;color:#64748b;margin-top:4px;">${label}</div>
                    </div>
                </div>
                <div class="score-bar"><div class="score-bar-fill" style="width:${pct}%;background:${barColor};"></div></div>
                <div class="score-details">
                    <div class="score-detail-item"><div class="score-detail-label">Skor Awal</div><div class="score-detail-value">${parseFloat(score.skorUtuh || 0).toFixed(1)}</div></div>
                    <div class="score-detail-item"><div class="score-detail-label">Keterlambatan</div><div class="score-detail-value" style="color:#f59e0b;">${score.jumlahPelanggaran || 0}×</div></div>
                    <div class="score-detail-item"><div class="score-detail-label">Pengurangan</div><div class="score-detail-value" style="color:#ef4444;">−${parseFloat(score.jumlahSanksi || 0).toFixed(2)}</div></div>
                </div>
            </div>`;
        }).join('') + '</div>';
    }

    function renderBBMCharts(monthScores) {
        const units = monthScores.map(s => s.unit.length > 22 ? s.unit.substring(0, 19) + '...' : s.unit);
        const scores = monthScores.map(s => parseFloat(s.skorAkhir) || 0);
        const violations = monthScores.map(s => parseInt(s.jumlahPelanggaran) || 0);
        const scCtx = document.getElementById('bbm-scoreChart'); if (!scCtx) return;
        const vlCtx = document.getElementById('bbm-violationChart'); if (!vlCtx) return;
        if (scoreChart) scoreChart.destroy();
        scoreChart = new Chart(scCtx.getContext('2d'), {
            type: 'bar',
            data: { labels: units, datasets: [{ label: 'Skor Akhir', data: scores, backgroundColor: scores.map(s => s >= 4.5 ? '#10b981' : s >= 3 ? '#f59e0b' : '#ef4444'), borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 5, ticks: { stepSize: 0.5 }, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
        });
        if (violationChart) violationChart.destroy();
        violationChart = new Chart(vlCtx.getContext('2d'), {
            type: 'bar',
            data: { labels: units, datasets: [{ label: 'Keterlambatan', data: violations, backgroundColor: '#3b82f6', borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // REGISTER SECTION & INJECT HTML
    // ═══════════════════════════════════════════════════════════
    window.sectionInits = window.sectionInits || {};
    window.sectionInits['voucher-bbm'] = function () {
        const section = document.getElementById('section-voucher-bbm');
        if (!section) return;

        section.innerHTML = `
<style>
/* ─── Shared styles mirroring ruang-rapat ─── */
.filter-container { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
.section-page-header { margin-bottom:28px; padding-bottom:20px; border-bottom:1px solid #f1f5f9; }
.section-page-title { font-size:22px; font-weight:700; color:#0f172a; margin-bottom:4px; }
.section-page-subtitle { font-size:14px; color:#64748b; }
.vsrc-toggle { display:flex; gap:8px; margin-bottom:14px; }

/* Approved request picker list */
.req-pick-list { max-height:260px; overflow-y:auto; border:1px solid #e5e7eb; border-radius:6px; margin-bottom:12px; }
.req-pick-item { padding:11px 14px; cursor:pointer; border-bottom:1px solid #f1f5f9; display:flex; align-items:flex-start; gap:10px; transition:background 0.12s; }
.req-pick-item:last-child { border-bottom:none; }
.req-pick-item:hover { background:#eff6ff; }
.req-pick-item.selected { background:#d1fae5; }
.req-pick-check { width:18px; height:18px; border-radius:50%; border:2px solid #e5e7eb; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:11px; font-weight:700; margin-top:2px; }
.req-pick-item.selected .req-pick-check { background:#10b981; border-color:#10b981; color:white; }
.req-pick-name { font-weight:600; font-size:13.5px; color:#1e293b; }
.req-pick-meta { font-size:12px; color:#64748b; margin-top:2px; }

/* Score progress bar */
.score-bar { height:4px; background:#e5e7eb; border-radius:2px; margin-top:10px; overflow:hidden; }
.score-bar-fill { height:100%; border-radius:2px; transition:width 0.6s ease; }

/* Detail modal shared styles */
.req-detail-wrap { display:flex; flex-direction:column; gap:14px; }
.req-detail-status-banner { display:flex; align-items:center; gap:10px; padding:12px 16px; border-radius:10px; border:1.5px solid; }
.req-detail-status-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.req-detail-section { background:#f8fafc; border-radius:10px; padding:14px; border:1px solid #f1f5f9; }
.req-detail-section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#94a3b8; margin-bottom:12px; }
.req-detail-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
@media(max-width:480px) { .req-detail-grid-2 { grid-template-columns:1fr; } }
.req-detail-field { display:flex; align-items:flex-start; gap:10px; }
.req-detail-field-icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.req-detail-field-label { font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:2px; }
.req-detail-field-value { font-size:13.5px; font-weight:600; color:#1e293b; line-height:1.4; }

/* Status column center align */
#bbm-requests-tbody tr td:nth-child(5), #section-voucher-bbm table thead tr th:nth-child(5) { text-align:center; vertical-align:middle; }
#bbm-requests-tbody tr { vertical-align:middle; }
</style>

<div class="container">
    <div class="section-page-header">
        <h1 class="section-page-title">Voucher BBM</h1>
        <p class="section-page-subtitle">Manajemen permintaan, catatan pelanggaran, dan penilaian voucher BBM</p>
    </div>

    <div class="tabs">
        <button class="tab active" onclick="bbmSwitchTab('requests',event)">Permintaan</button>
        <button class="tab" onclick="bbmSwitchTab('violations',event)">Catatan Pelanggaran</button>
        <button class="tab" onclick="bbmSwitchTab('scores',event)">Penilaian</button>
    </div>
    <div class="tabs-dropdown">
        <select onchange="bbmSwitchTabDropdown(this.value)">
            <option value="requests">Permintaan</option>
            <option value="violations">Catatan Pelanggaran</option>
            <option value="scores">Penilaian</option>
        </select>
    </div>

    <!-- ═══ TAB 1: PERMINTAAN ═══ -->
    <div id="bbm-tab-requests" class="tab-content active">
        <div class="stats-grid">
            <div class="stat-card" style="border-left:3px solid #64748b;"><div class="stat-label">Total Permintaan</div><div class="stat-value" id="bbm-stat-total">0</div></div>
            <div class="stat-card" style="border-left:3px solid #10b981;"><div class="stat-label">Disetujui</div><div class="stat-value" id="bbm-stat-approved">0</div></div>
            <div class="stat-card" style="border-left:3px solid #f59e0b;"><div class="stat-label">Menunggu</div><div class="stat-value" id="bbm-stat-pending">0</div></div>
            <div class="stat-card" style="border-left:3px solid #ef4444;"><div class="stat-label">Ditolak</div><div class="stat-value" id="bbm-stat-rejected">0</div></div>
        </div>
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Daftar Permintaan Voucher BBM</h2>
                <div class="filter-container">
                    <select class="select-input" id="bbm-filter-status" onchange="bbmApplyFilter()">
                        <option value="">Semua Status</option>
                        <option value="PENDING">Menunggu</option>
                        <option value="APPROVED">Disetujui</option>
                        <option value="REJECTED">Ditolak</option>
                    </select>
                    <input type="text" class="search-input" id="bbm-search-req" placeholder="Cari nama penanggung jawab / unit..." oninput="bbmApplyFilter()">
                    <button onclick="bbmLoadRequests(true)" class="btn btn-sm">${ICONS.refresh} Refresh</button>
                </div>
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Nama Penanggung Jawab</th><th>Unit / Bidang</th><th>No. Kendaraan</th><th>Waktu Pengajuan</th><th>Status</th><th>Aksi</th></tr></thead>
                    <tbody id="bbm-requests-tbody">
                        <tr><td colspan="6" class="loading"><div class="spinner"></div><p style="margin-top:12px;">Memuat data...</p></td></tr>
                    </tbody>
                </table>
            </div>
            <div id="bbm-requests-cards"></div>
            <div class="pagination" id="bbm-requests-pagination"></div>
        </div>
    </div>

    <!-- ═══ TAB 2: CATATAN PELANGGARAN ═══ -->
    <div id="bbm-tab-violations" class="tab-content">
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Catatan Keterlambatan Pengembalian Bukti BBM</h2>
                <div class="filter-container">
                    <select class="select-input" id="bbm-filter-bulan-viol" onchange="bbmApplyViolFilter()">${OPT_BULAN_ALL}</select>
                    <select class="select-input" id="bbm-filter-unit-viol" onchange="bbmApplyViolFilter()">${OPT_UNIT_ALL}</select>
                    <button onclick="bbmExportViol()" class="btn btn-sm">${ICONS.export} Export</button>
                    <button onclick="bbmOpenAddViol()" class="btn btn-sm btn-primary">${ICONS.plus} Tambah</button>
                    <button onclick="bbmLoadViolations(true)" class="btn btn-sm">${ICONS.refresh} Refresh</button>
                </div>
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Bulan</th><th>Unit / Bidang</th><th>Tgl Pengambilan</th><th>Tgl Pengembalian</th><th>No. Kendaraan</th><th>Aksi</th></tr></thead>
                    <tbody id="bbm-violations-tbody">
                        <tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">Memuat data...</td></tr>
                    </tbody>
                </table>
            </div>
            <div id="bbm-violations-cards"></div>
            <div class="pagination" id="bbm-violations-pagination"></div>
        </div>
    </div>

    <!-- ═══ TAB 3: PENILAIAN ═══ -->
    <div id="bbm-tab-scores" class="tab-content">
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Rekapitulasi Penilaian Voucher BBM</h2>
                <div class="filter-container">
                    <select class="select-input" id="bbm-filter-score-bulan" onchange="bbmLoadScores(false)">${OPT_BULAN_REQ}</select>
                    <button onclick="bbmLoadScores(true)" class="btn btn-sm">${ICONS.refresh} Refresh</button>
                </div>
            </div>
            <div class="card-content">
                <div id="bbm-sanksi-box" style="display:none;background:#f8fafc;border:1px solid #f1f5f9;border-radius:8px;padding:16px;margin-bottom:24px;">
                    <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;margin-bottom:4px;">Sanksi per Keterlambatan</p>
                    <p style="font-size:22px;font-weight:700;color:#0f172a;" id="bbm-sanksi-value">—</p>
                </div>
                <div class="charts-grid" id="bbm-charts-grid" style="display:none;">
                    <div class="card" style="margin:0;"><div class="card-header" style="padding:16px;"><h3 style="font-size:14px;font-weight:600;color:#374151;">Skor Akhir Per Unit</h3></div><div class="card-content"><div class="chart-container"><canvas id="bbm-scoreChart"></canvas></div></div></div>
                    <div class="card" style="margin:0;"><div class="card-header" style="padding:16px;"><h3 style="font-size:14px;font-weight:600;color:#374151;">Jumlah Keterlambatan Per Unit</h3></div><div class="card-content"><div class="chart-container"><canvas id="bbm-violationChart"></canvas></div></div></div>
                </div>
                <div id="bbm-scores-container">
                    <div class="empty-state"><div class="empty-state-icon">📊</div><p>Pilih bulan untuk melihat penilaian</p></div>
                </div>
            </div>
        </div>
    </div>
</div><!-- /container -->


<!-- ════════════════ MODALS ════════════════ -->

<!-- DETAIL -->
<div id="bbm-detailModal" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal" style="max-width:520px;">
        <div class="modal-header"><h2 class="modal-title">Detail Permintaan Voucher BBM</h2></div>
        <div class="modal-content" id="bbm-detail-body"></div>
        <div class="modal-footer">
            <button onclick="document.getElementById('bbm-detailModal').style.display='none'" class="btn" style="flex:1;">Tutup</button>
        </div>
    </div>
</div>

<!-- APPROVE -->
<div id="bbm-approveModal" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal" style="max-width:480px;">
        <div class="modal-header"><h2 class="modal-title" style="display:flex;align-items:center;gap:8px;">${ICONS.check} Setujui Permintaan Voucher BBM</h2></div>
        <div class="modal-content" style="padding:20px;">
            <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:10px;padding:14px;margin-bottom:16px;" id="bbm-approve-req-info"></div>
            <div class="alert alert-info">Status akan diubah menjadi <strong>Disetujui</strong>. Pastikan data sudah benar.</div>
        </div>
        <div class="modal-footer">
            <button onclick="document.getElementById('bbm-approveModal').style.display='none'" class="btn" style="flex:1;">Batal</button>
            <button onclick="bbmConfirmApprove()" class="btn btn-success" style="flex:1;" id="bbm-confirm-approve-btn">${ICONS.check} Setujui</button>
        </div>
    </div>
</div>

<!-- EDIT REQUEST — hanya status yang bisa diubah -->
<div id="bbm-editModal" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal" style="max-width:420px;">
        <div class="modal-header"><h2 class="modal-title">Ubah Status Permintaan</h2></div>
        <div class="modal-content">
            <div id="bbm-edit-req-info" style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:10px;padding:14px;margin-bottom:16px;font-size:13px;"></div>
            <div class="form-group">
                <label class="input-label">Status <span style="color:#ef4444;">*</span></label>
                <select class="form-input" id="bbm-edit-status">
                    <option value="PENDING">Menunggu</option>
                    <option value="APPROVED">Disetujui</option>
                    <option value="REJECTED">Ditolak</option>
                </select>
            </div>
        </div>
        <div class="modal-footer">
            <button onclick="document.getElementById('bbm-editModal').style.display='none'" class="btn" style="flex:1;">Batal</button>
            <button onclick="bbmSubmitEdit()" class="btn btn-primary" style="flex:1;" id="bbm-submit-edit-btn">Simpan Status</button>
        </div>
    </div>
</div>

<!-- ADD VIOLATION -->
<div id="bbm-addViolModal" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal" style="max-width:680px;">
        <div class="modal-header"><h2 class="modal-title">Tambah Catatan Pelanggaran BBM</h2></div>
        <div class="modal-content">
            <div class="vsrc-toggle">
                <button class="btn btn-sm btn-primary" id="bbm-vsrc-btn-approved" onclick="bbmSetViolSource('approved')">${ICONS.check} Dari Permintaan Disetujui</button>
                <button class="btn btn-sm" id="bbm-vsrc-btn-manual" onclick="bbmSetViolSource('manual')">${ICONS.plus} Input Manual</button>
            </div>

            <!-- Panel: dari approved -->
            <div id="bbm-vsrc-approved">
                <div class="alert alert-info" style="margin-bottom:10px;">Pilih permintaan yang sudah disetujui sebagai dasar catatan pelanggaran.</div>
                <div class="form-group" style="margin-bottom:8px;">
                    <input type="text" class="form-input" id="bbm-approved-search" placeholder="Cari nama, unit, atau plat kendaraan..." oninput="bbmFilterApprovedReqs()">
                </div>
                <div class="req-pick-list" id="bbm-approved-req-list">
                    <div style="padding:20px;text-align:center;color:#64748b;font-size:13px;">Memuat data...</div>
                </div>
                <div id="bbm-selected-req-info" style="display:none;" class="info-box">
                    <p class="info-box-label">Permintaan Dipilih</p>
                    <div id="bbm-selected-req-detail" style="font-size:13.5px;"></div>
                </div>
            </div>

            <!-- Panel: manual -->
            <div id="bbm-vsrc-manual" style="display:none;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div class="form-group">
                        <label class="input-label">Bulan <span style="color:#ef4444;">*</span></label>
                        <select class="form-input" id="bbm-viol-bulan">${OPT_BULAN_REQ}</select>
                    </div>
                    <div class="form-group">
                        <label class="input-label">Unit / Bidang <span style="color:#ef4444;">*</span></label>
                        <select class="form-input" id="bbm-viol-unit">${OPT_UNIT_REQ}</select>
                    </div>
                    <div class="form-group" style="grid-column:1/-1;">
                        <label class="input-label">Nomor Kendaraan</label>
                        <select class="form-input" id="bbm-viol-no-kendaraan">${OPT_KENDARAAN}</select>
                    </div>
                </div>
            </div>

            <!-- Date fields (shared) -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;">
                <div class="form-group">
                    <label class="input-label">Tanggal Pengambilan <span style="color:#ef4444;">*</span></label>
                    <input type="date" class="form-input" id="bbm-viol-tgl-ambil">
                </div>
                <div class="form-group">
                    <label class="input-label">Tanggal Pengembalian</label>
                    <input type="date" class="form-input" id="bbm-viol-tgl-kembali">
                    <small style="color:#64748b;font-size:11px;margin-top:3px;display:block;">Kosongkan jika belum dikembalikan</small>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button onclick="document.getElementById('bbm-addViolModal').style.display='none'" class="btn" style="flex:1;">Batal</button>
            <button onclick="bbmSubmitViol()" class="btn btn-primary" style="flex:1;" id="bbm-submit-viol-btn">💾 Simpan Catatan</button>
        </div>
    </div>
</div>

<!-- EDIT VIOLATION (with pindah support) -->
<div id="bbm-editViolModal" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal">
        <div class="modal-header"><h2 class="modal-title">Edit Catatan Pelanggaran BBM</h2></div>
        <div class="modal-content">
            <div class="alert alert-info" style="margin-bottom:16px;font-size:13px;">Perubahan bulan atau unit akan memindahkan catatan ke kolom yang sesuai di sheet.</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label class="input-label">Bulan <span style="color:#ef4444;">*</span></label>
                    <select class="form-input" id="bbm-ev-bulan" onchange="bbmUpdatePindahBadge()">${OPT_BULAN_EDIT}</select>
                </div>
                <div class="form-group">
                    <label class="input-label">Unit / Bidang <span style="color:#ef4444;">*</span></label>
                    <select class="form-input" id="bbm-ev-unit" onchange="bbmUpdatePindahBadge()">${OPT_UNIT_EDIT}</select>
                </div>
                <div class="form-group">
                    <label class="input-label">Tanggal Pengambilan <span style="color:#ef4444;">*</span></label>
                    <input type="date" class="form-input" id="bbm-ev-tgl-ambil">
                </div>
                <div class="form-group">
                    <label class="input-label">Tanggal Pengembalian</label>
                    <input type="date" class="form-input" id="bbm-ev-tgl-kembali">
                </div>
                <div id="bbm-ev-pindah-badge" style="display:none;grid-column:1/-1;padding:8px 12px;background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;color:#92400e;font-size:12px;font-weight:500;align-items:center;gap:6px;"></div>
                <div class="form-group" style="grid-column:1/-1;">
                    <label class="input-label">Nomor Kendaraan</label>
                    <select class="form-input" id="bbm-ev-no-kendaraan">${OPT_KENDARAAN}</select>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button onclick="document.getElementById('bbm-editViolModal').style.display='none'" class="btn" style="flex:1;">Batal</button>
            <button onclick="bbmSubmitEditViol()" class="btn btn-primary" style="flex:1;" id="bbm-submit-ev-btn">Simpan Perubahan</button>
        </div>
    </div>
</div>`;

        loadRequests();
    };
})();