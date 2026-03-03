// ============================================================
// voucher-bbm.js — Voucher BBM section (SPA)
// Admin Panel — Dinas Koperasi UKM
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

    // ── Violation source state ────────────────────────────────
    let violationSource = 'approved';
    let selectedApprovedReq = null;

    // ── SVG Icons ─────────────────────────────────────────────
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
    };

    // ── Opsi plat kendaraan (sama dengan requests.js) ────────
    const VEHICLE_OPTIONS = `<option value="">Pilih Nomor Kendaraan</option>
        <option value="AB 1027 AV">AB 1027 AV</option>
        <option value="AB 1869 UA">AB 1869 UA</option>
        <option value="AB 1147 UH">AB 1147 UH</option>
        <option value="AB 1340 UH">AB 1340 UH</option>
        <option value="AB 1530 UH">AB 1530 UH</option>
        <option value="AB 1067 IA">AB 1067 IA</option>`;

    // ── Cache ─────────────────────────────────────────────────
    function saveToCache(key, data) {
        try { localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() })); } catch (e) { }
    }
    function getFromCache(key) {
        try {
            const c = localStorage.getItem(key);
            if (!c) return null;
            const p = JSON.parse(c);
            if (Date.now() - p.timestamp < CACHE_DURATION) return p.data;
            localStorage.removeItem(key); return null;
        } catch (e) { return null; }
    }
    function clearCache() { Object.values(CACHE_KEYS).forEach(k => localStorage.removeItem(k)); }
    function showCacheIndicator() {
        const el = document.getElementById('bbm-cacheIndicator');
        if (!el) return;
        el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2000);
    }

    // ── Date helpers ──────────────────────────────────────────
    // YYYY-MM-DD (input[type=date]) → DD-MM-YYYY (storage/display)
    function dateToStr(dateInput) {
        if (!dateInput) return '-';
        const parts = dateInput.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateInput;
    }
    // DD-MM-YYYY (storage) → YYYY-MM-DD (input[type=date])
    function strToDate(str) {
        if (!str || str === '-') return '';
        const parts = str.split('-');
        if (parts.length === 3 && parts[2].length === 4) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return str;
    }

    // ── Auto-set bulan helper ─────────────────────────────────
    function setCurrentMonth(elId) {
        const el = document.getElementById(elId);
        if (el && !el.value) {
            const mn = ['', 'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
            el.value = mn[new Date().getMonth() + 1];
        }
    }

    // ── API ───────────────────────────────────────────────────
    function callAPI(params) {
        return new Promise((resolve, reject) => {
            const cb = 'bbm_' + Math.round(1e6 * Math.random());
            window[cb] = data => { delete window[cb]; document.getElementById(cb)?.remove(); resolve(data); };
            const qs = new URLSearchParams({ ...params, callback: cb }).toString();
            const s = document.createElement('script');
            s.id = cb; s.src = `${API_URL}?${qs}`;
            const tid = setTimeout(() => { delete window[cb]; s.remove(); reject(new Error('Timeout')); }, 20000);
            s.onerror = () => { clearTimeout(tid); delete window[cb]; reject(new Error('Network error')); };
            document.body.appendChild(s);
        });
    }

    // ── Modal helpers ─────────────────────────────────────────
    function openModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'flex'; }
    function closeModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }

    // ── Status badge ──────────────────────────────────────────
    function createStatusBadge(status) {
        const s = (status || '').toUpperCase();
        if (s === 'APPROVED') return '<span class="badge badge-approved">Disetujui</span>';
        if (s === 'REJECTED') return '<span class="badge badge-rejected">Ditolak</span>';
        return '<span class="badge badge-pending">Menunggu</span>';
    }

    // ── Tab Switch ────────────────────────────────────────────
    function bbmSwitchTab(tabName, event) {
        document.querySelectorAll('#section-voucher-bbm .tab').forEach(t => t.classList.remove('active'));
        if (event?.target) event.target.classList.add('active');
        document.querySelectorAll('#section-voucher-bbm .tab-content').forEach(tc => tc.classList.remove('active'));
        const el = document.getElementById('bbm-tab-' + tabName);
        if (el) el.classList.add('active');
        if (tabName === 'requests') loadRequests();
        if (tabName === 'violations') loadViolations();
        if (tabName === 'scores') loadScores();
    }
    function bbmSwitchTabDropdown(tabName) {
        document.querySelectorAll('#section-voucher-bbm .tab-content').forEach(tc => tc.classList.remove('active'));
        const el = document.getElementById('bbm-tab-' + tabName);
        if (el) el.classList.add('active');
        if (tabName === 'requests') loadRequests();
        if (tabName === 'violations') loadViolations();
        if (tabName === 'scores') loadScores();
    }
    window.bbmSwitchTab = bbmSwitchTab;
    window.bbmSwitchTabDropdown = bbmSwitchTabDropdown;

    // ═══════════════════════════════════════════════════════════
    // TAB 1 — PERMINTAAN VOUCHER
    // ═══════════════════════════════════════════════════════════
    async function loadRequests(forceRefresh = false) {
        if (!forceRefresh) {
            const cached = getFromCache(CACHE_KEYS.REQUESTS);
            if (cached) {
                // cache disimpan urutan asli, reverse agar terbaru tampil di atas
                masterRequests = cached.slice().reverse();
                applyRequestFilter(); updateStats(); showCacheIndicator(); return;
            }
        }
        const tbody = document.getElementById('bbm-requests-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="loading"><div class="spinner"></div><p style="margin-top:12px;color:#64748b;">Memuat data...</p></td></tr>';
        try {
            const res = await callAPI({ action: 'getVoucherRequests' });
            const rawData = Array.isArray(res) ? res : [];
            // simpan ke cache dalam urutan ASLI dari API/sheet
            saveToCache(CACHE_KEYS.REQUESTS, rawData);
            // reverse untuk tampilan: terbaru (index akhir) → halaman 1 atas
            masterRequests = rawData.slice().reverse();
            applyRequestFilter(); updateStats();
        } catch (e) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#ef4444;">Gagal memuat data. <button onclick="window.bbmLoadRequests(true)" class="btn btn-sm" style="margin-left:8px;">Coba Lagi</button></td></tr>`;
            if (window.showToast) showToast('Gagal memuat permintaan: ' + e.message, 'error');
        }
    }
    window.bbmLoadRequests = (f) => loadRequests(f);

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

    function applyRequestFilter() {
        const status = (document.getElementById('bbm-filter-status')?.value || '').toUpperCase();
        const search = (document.getElementById('bbm-search-req')?.value || '').toLowerCase().trim();
        allRequests = masterRequests.filter(r => {
            if (status && (r.status || '').toUpperCase() !== status) return false;
            const h = `${r.nama_pegawai || ''} ${r.unit_eselon || ''}`.toLowerCase();
            return !search || h.includes(search);
        });
        requestsCurrentPage = 1;
        renderPaginatedRequests();
    }
    window.bbmApplyFilter = applyRequestFilter;

    function renderPaginatedRequests() {
        const tbody = document.getElementById('bbm-requests-tbody');
        const cards = document.getElementById('bbm-requests-cards');
        const pgn = document.getElementById('bbm-requests-pagination');
        if (!tbody) return;
        if (allRequests.length === 0) {
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
                <td><div style="font-weight:600;">${req.nama_pegawai || '-'}</div></td>
                <td style="color:#64748b;font-size:13px;">${req.unit_eselon || '-'}</td>
                <td style="font-family:monospace;font-weight:500;">${req.nomor_kendaraan || '-'}</td>
                <td style="color:#64748b;font-size:13px;">${req.timestamp || '-'}</td>
                <td style="min-width: 90px; text-align: center;">
                    ${isPending ? `<div class="btn-icon-group" style="margin: 0;">
                        <button onclick="bbmOpenApprove('${req.id}')" class="btn-icon btn-icon-approve" title="Setujui">${ICONS.check}</button>
                        <button onclick="bbmQuickReject('${req.id}')" class="btn-icon btn-icon-reject" title="Tolak">${ICONS.x}</button>
                    </div>` : createStatusBadge(req.status)}
                </td>
                <td>
                    <div class="action-buttons">
                        <div class="btn-icon-group">
                            <button onclick="bbmViewDetail('${req.id}')" class="btn-icon btn-icon-view" title="Detail">${ICONS.eye}</button>
                            <button onclick="bbmOpenEdit('${req.id}')" class="btn-icon btn-icon-edit" title="Edit">${ICONS.edit}</button>
                            <button onclick="bbmDeleteRequest('${req.id}')" class="btn-icon btn-icon-delete" title="Hapus">${ICONS.trash}</button>
                        </div>
                    </div>
                </td>
            </tr>`;
        }).join('');

        if (cards) cards.innerHTML = items.map(req => {
            const isPending = (req.status || '').toUpperCase() === 'PENDING';
            return `<div class="requests-card">
                <div class="requests-card-header">
                    <div style="flex:1;">
                        <div class="requests-card-title">${req.nama_pegawai || '-'}</div>
                        <div class="requests-card-subtitle">${req.unit_eselon || '-'}</div>
                    </div>
                    ${isPending ? `<div class="btn-icon-group" style="margin: 0;">
                        <button onclick="bbmOpenApprove('${req.id}')" class="btn-icon btn-icon-approve" title="Setujui">${ICONS.check}</button>
                        <button onclick="bbmQuickReject('${req.id}')" class="btn-icon btn-icon-reject" title="Tolak">${ICONS.x}</button>
                    </div>` : createStatusBadge(req.status)}
                </div>
                <div class="requests-card-body">
                    <div class="requests-card-row"><span class="requests-card-label">No. Kendaraan</span><span class="requests-card-value" style="font-family:monospace;">${req.nomor_kendaraan || '-'}</span></div>
                    <div class="requests-card-row"><span class="requests-card-label">Waktu Pengajuan</span><span class="requests-card-value">${req.timestamp || '-'}</span></div>
                </div>
                <div class="requests-card-footer">
                    <div class="action-buttons" style="justify-content:flex-end;">
                        <div class="btn-icon-group">
                            <button onclick="bbmViewDetail('${req.id}')" class="btn-icon btn-icon-view" title="Detail">${ICONS.eye}</button>
                            <button onclick="bbmOpenEdit('${req.id}')" class="btn-icon btn-icon-edit" title="Edit">${ICONS.edit}</button>
                            <button onclick="bbmDeleteRequest('${req.id}')" class="btn-icon btn-icon-delete" title="Hapus">${ICONS.trash}</button>
                        </div>
                    </div>
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

    // ── View Detail ───────────────────────────────────────────
    window.bbmViewDetail = (id) => {
        const req = allRequests.find(r => r.id == id) || masterRequests.find(r => r.id == id);
        if (!req) return;
        const el = document.getElementById('bbm-detail-body');
        if (el) el.innerHTML = `
            <div class="info-grid">
                <div class="info-item"><label class="input-label">Nama Pegawai</label><p style="font-weight:500;">${req.nama_pegawai || '-'}</p></div>
                <div class="info-item"><label class="input-label">Unit / Eselon</label><p style="font-weight:500;">${req.unit_eselon || '-'}</p></div>
                <div class="info-item"><label class="input-label">No. Kendaraan</label><p style="font-weight:500;font-family:monospace;">${req.nomor_kendaraan || '-'}</p></div>
                <div class="info-item"><label class="input-label">Waktu Pengajuan</label><p style="font-weight:500;">${req.timestamp || '-'}</p></div>
            </div>
            <div><label class="input-label">Status</label><div style="margin-top:4px;">${createStatusBadge(req.status)}</div></div>`;
        openModal('bbm-detailModal');
    };

    // ── Approve ───────────────────────────────────────────────
    window.bbmOpenApprove = (id) => {
        const el = document.getElementById('bbm-approve-id'); if (el) el.value = id;
        const cat = document.getElementById('bbm-approve-catatan'); if (cat) cat.value = '';
        openModal('bbm-approveModal');
    };
    window.bbmConfirmApprove = async () => {
        const id = document.getElementById('bbm-approve-id')?.value;
        const btn = document.getElementById('bbm-confirm-approve-btn');
        const orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyetujui...';
        try {
            const res = await callAPI({ action: 'updateVoucherRequest', id, status: 'APPROVED' });
            if (res?.success) { if (window.showToast) showToast('Permintaan disetujui', 'success'); closeModal('bbm-approveModal'); clearCache(); await loadRequests(true); }
            else if (window.showToast) showToast(res?.message || 'Gagal', 'error');
        } catch (e) { if (window.showToast) showToast('Error: ' + e.message, 'error'); }
        finally { btn.disabled = false; btn.innerHTML = orig; }
    };

    // ── Quick Reject ──────────────────────────────────────────
    window.bbmQuickReject = async (id) => {
        if (!confirm('Tolak permintaan voucher BBM ini?')) return;
        try {
            const res = await callAPI({ action: 'updateVoucherRequest', id, status: 'REJECTED' });
            if (res?.success) { if (window.showToast) showToast('Permintaan ditolak', 'success'); clearCache(); await loadRequests(true); }
            else if (window.showToast) showToast(res?.message || 'Gagal', 'error');
        } catch (e) { if (window.showToast) showToast('Error: ' + e.message, 'error'); }
    };

    // ── Edit Request ──────────────────────────────────────────
    window.bbmOpenEdit = (id) => {
        const req = allRequests.find(r => r.id == id) || masterRequests.find(r => r.id == id);
        if (!req) return;
        document.getElementById('bbm-edit-id').value = req.id;
        document.getElementById('bbm-edit-status').value = (req.status || 'PENDING').toUpperCase();
        document.getElementById('bbm-edit-nama').value = req.nama_pegawai || '';
        document.getElementById('bbm-edit-unit').value = req.unit_eselon || '';
        document.getElementById('bbm-edit-kendaraan').value = req.nomor_kendaraan || '';
        openModal('bbm-editModal');
    };
    window.bbmSubmitEdit = async () => {
        const btn = document.getElementById('bbm-submit-edit-btn');
        const orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan...';
        try {
            const res = await callAPI({ action: 'updateVoucherRequest', id: document.getElementById('bbm-edit-id').value, status: document.getElementById('bbm-edit-status').value });
            if (res?.success) { if (window.showToast) showToast('Status berhasil diperbarui!', 'success'); closeModal('bbm-editModal'); clearCache(); await loadRequests(true); }
            else if (window.showToast) showToast(res?.message || 'Gagal', 'error');
        } catch (e) { if (window.showToast) showToast('Error: ' + e.message, 'error'); }
        finally { btn.disabled = false; btn.innerHTML = orig; }
    };

    // ── Delete Request ────────────────────────────────────────
    window.bbmDeleteRequest = async (id) => {
        if (!confirm('Hapus permintaan ini? Tindakan tidak dapat dibatalkan.')) return;
        try {
            const res = await callAPI({ action: 'deleteVoucherRequest', id });
            if (res?.success) { if (window.showToast) showToast('Data berhasil dihapus', 'success'); clearCache(); await loadRequests(true); }
            else if (window.showToast) showToast(res?.message || 'Gagal', 'error');
        } catch (e) { if (window.showToast) showToast('Error: ' + e.message, 'error'); }
    };

    // ═══════════════════════════════════════════════════════════
    // TAB 2 — CATATAN PELANGGARAN (sebelumnya: CATATAN KETERLAMBATAN)
    // ═══════════════════════════════════════════════════════════
    // FIX: Pola yang sama dengan requests.js — reverse di sini, simpan urutan asli ke cache
    async function loadViolations(forceRefresh = false) {
        // Auto-set filter bulan ke bulan sekarang jika belum dipilih
        setCurrentMonth('bbm-filter-bulan-viol');

        if (!forceRefresh) {
            const cached = getFromCache(CACHE_KEYS.VIOLATIONS);
            if (cached) {
                // cached disimpan dalam urutan asli (ascending),
                // reverse agar data terbaru (index akhir) tampil di halaman 1 atas
                masterViolations = cached.slice().reverse();
                applyViolationFilter();
                showCacheIndicator();
                return;
            }
        }

        const tbody = document.getElementById('bbm-violations-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;"><div class="spinner"></div><p style="margin-top:12px;color:#64748b;">Memuat data...</p></td></tr>';

        try {
            const res = await callAPI({ action: 'getBBMViolations' });
            const rawData = Array.isArray(res) ? res : [];
            // Simpan ke cache dalam urutan ASLI (ascending) dari API/sheet
            saveToCache(CACHE_KEYS.VIOLATIONS, rawData);
            // Reverse untuk tampilan: data terbaru (ditambahkan terakhir) → halaman 1 atas
            masterViolations = rawData.slice().reverse();
            applyViolationFilter();
        } catch (e) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#ef4444;">Gagal memuat data. <button onclick="window.bbmLoadViolations(true)" class="btn btn-sm" style="margin-left:8px;">Coba Lagi</button></td></tr>`;
            if (window.showToast) showToast('Gagal memuat catatan: ' + e.message, 'error');
        }
    }
    window.bbmLoadViolations = (f) => loadViolations(f);

    function applyViolationFilter() {
        const bulan = document.getElementById('bbm-filter-bulan-viol')?.value || '';
        const unit = document.getElementById('bbm-filter-unit-viol')?.value || '';
        allViolations = masterViolations.filter(v => (bulan === '' || v.bulan === bulan) && (unit === '' || v.unit === unit));
        violationsCurrentPage = 1;
        renderPaginatedViolations();
    }
    window.bbmApplyViolFilter = applyViolationFilter;

    function renderPaginatedViolations() {
        const tbody = document.getElementById('bbm-violations-tbody');
        const cards = document.getElementById('bbm-violations-cards');
        const pgn = document.getElementById('bbm-violations-pagination');
        if (!tbody) return;
        if (allViolations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">Tidak ada catatan pelanggaran</td></tr>';
            if (cards) cards.innerHTML = '<div style="text-align:center;padding:2rem;color:#64748b;">Data tidak ditemukan</div>';
            if (pgn) pgn.innerHTML = ''; return;
        }
        const totalPages = Math.ceil(allViolations.length / itemsPerPage);
        const start = (violationsCurrentPage - 1) * itemsPerPage;
        const items = allViolations.slice(start, start + itemsPerPage);

        // Layout tabel disamakan: Bulan | Unit | Tanggal Pengambilan | Tanggal Pengembalian | No. Kendaraan | Aksi
        tbody.innerHTML = items.map((v, idx) => {
            const gi = start + idx;
            return `<tr>
                <td><span style="font-weight:600;font-size:12px;background:#f1f5f9;color:#1e293b;padding:3px 8px;border-radius:4px;">${v.bulan || '—'}</span></td>
                <td style="font-size:13px;">${v.unit || '—'}</td>
                <td style="font-size:13px;">${v.tanggal_pengambilan || '—'}</td>
                <td style="font-size:13px;">${v.tanggal_pengembalian || '—'}</td>
                <td style="font-family:monospace;font-size:13px;">${v.nomor_kendaraan || '—'}</td>
                <td>
                    <div class="action-buttons">
                        <div class="btn-icon-group">
                            <button onclick="bbmOpenEditViol(${gi})" class="btn-icon btn-icon-edit" title="Edit">${ICONS.edit}</button>
                            <button onclick="bbmDeleteViol(${gi})" class="btn-icon btn-icon-delete" title="Hapus">${ICONS.trash}</button>
                        </div>
                    </div>
                </td>
            </tr>`;
        }).join('');

        if (cards) cards.innerHTML = items.map((v, idx) => {
            const gi = start + idx;
            return `<div class="violation-card">
                <div class="violation-card-header">
                    <div>
                        <div class="violation-card-title">${v.unit || '—'}</div>
                        <div class="violation-card-subtitle">Bulan ${v.bulan || '—'}</div>
                    </div>
                </div>
                <div class="violation-card-body">
                    <div class="violation-card-item"><div class="violation-card-label">Tgl Pengambilan</div><div class="violation-card-value">${v.tanggal_pengambilan || '—'}</div></div>
                    <div class="violation-card-item"><div class="violation-card-label">Tgl Pengembalian</div><div class="violation-card-value">${v.tanggal_pengembalian || '—'}</div></div>
                    <div class="violation-card-item" style="grid-column:1/-1"><div class="violation-card-label">No. Kendaraan</div><div class="violation-card-value" style="font-family:monospace;">${v.nomor_kendaraan || '—'}</div></div>
                </div>
                <div class="violation-card-footer">
                    <div class="action-buttons" style="justify-content:flex-end;">
                        <div class="btn-icon-group">
                            <button onclick="bbmOpenEditViol(${gi})" class="btn-icon btn-icon-edit" title="Edit">${ICONS.edit}</button>
                            <button onclick="bbmDeleteViol(${gi})" class="btn-icon btn-icon-delete" title="Hapus">${ICONS.trash}</button>
                        </div>
                    </div>
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
        document.getElementById('bbm-src-approved').style.display = src === 'approved' ? 'block' : 'none';
        document.getElementById('bbm-src-manual').style.display = src === 'manual' ? 'block' : 'none';
        document.getElementById('bbm-src-btn-approved').className = `btn btn-sm ${src === 'approved' ? 'btn-primary' : ''}`;
        document.getElementById('bbm-src-btn-manual').className = `btn btn-sm ${src === 'manual' ? 'btn-primary' : ''}`;
        if (src === 'approved') renderApprovedRequests();
    };

    function renderApprovedRequests(filter = '') {
        const list = document.getElementById('bbm-approved-request-list');
        if (!list) return;
        const approved = masterRequests.filter(r => (r.status || '').toUpperCase() === 'APPROVED');
        const filtered = filter
            ? approved.filter(r => `${r.nama_pegawai} ${r.nomor_kendaraan} ${r.unit_eselon}`.toLowerCase().includes(filter.toLowerCase()))
            : approved;

        if (!filtered.length) {
            list.innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;font-size:13px;">Tidak ada permintaan yang disetujui</div>';
            return;
        }
        list.innerHTML = filtered.map(r => `
            <div class="bbm-req-item ${selectedApprovedReq?.id === r.id ? 'selected' : ''}" onclick="bbmSelectApprovedReq('${r.id}')">
                <div class="bbm-req-item-check">${selectedApprovedReq?.id === r.id ? '✓' : ''}</div>
                <div style="flex:1;min-width:0;">
                    <div class="bbm-req-item-name">${r.nama_pegawai || '-'}</div>
                    <div class="bbm-req-item-meta">${r.unit_eselon || '-'} · <span class="bbm-req-item-plate">${r.nomor_kendaraan || '-'}</span></div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${r.timestamp || ''}</div>
                </div>
            </div>`).join('');
    }

    window.bbmFilterApprovedReqs = () => {
        renderApprovedRequests(document.getElementById('bbm-approved-search')?.value || '');
    };
    window.bbmSelectApprovedReq = (id) => {
        selectedApprovedReq = masterRequests.find(r => r.id == id);
        renderApprovedRequests(document.getElementById('bbm-approved-search')?.value || '');
        const info = document.getElementById('bbm-selected-req-info');
        const detail = document.getElementById('bbm-selected-req-detail');
        if (selectedApprovedReq && info && detail) {
            info.style.display = 'block';
            detail.innerHTML = `<strong>${selectedApprovedReq.nama_pegawai}</strong> — ${selectedApprovedReq.unit_eselon} — <span class="bbm-req-item-plate">${selectedApprovedReq.nomor_kendaraan}</span>`;
        }
    };

    // ── Add Violation ─────────────────────────────────────────
    window.bbmOpenAddViol = () => {
        selectedApprovedReq = null;
        ['bbm-viol-bulan', 'bbm-viol-unit', 'bbm-viol-tgl-ambil', 'bbm-viol-tgl-kembali', 'bbm-viol-no-kendaraan'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        const searchEl = document.getElementById('bbm-approved-search');
        if (searchEl) searchEl.value = '';
        const infoEl = document.getElementById('bbm-selected-req-info');
        if (infoEl) infoEl.style.display = 'none';

        if (!masterRequests.length) loadRequests().then(() => renderApprovedRequests());
        else renderApprovedRequests();

        window.bbmSetViolSource('approved');
        openModal('bbm-addViolModal');
    };

    window.bbmSubmitViol = async () => {
        const btn = document.getElementById('bbm-submit-viol-btn');
        const tglAmbilRaw = document.getElementById('bbm-viol-tgl-ambil')?.value || '';
        const tglKembaliRaw = document.getElementById('bbm-viol-tgl-kembali')?.value || '';
        const MONTHS = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];

        let bulan, unit, noKendaraan;
        if (violationSource === 'approved') {
            if (!selectedApprovedReq) { if (window.showToast) showToast('Pilih permintaan yang disetujui', 'error'); return; }
            if (!tglAmbilRaw) { if (window.showToast) showToast('Tanggal pengambilan harus diisi', 'error'); return; }
            bulan = MONTHS[new Date(tglAmbilRaw).getMonth()];
            unit = selectedApprovedReq.unit_eselon;
            noKendaraan = selectedApprovedReq.nomor_kendaraan;
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
                tanggal_pengambilan: dateToStr(tglAmbilRaw),
                tanggal_pengembalian: dateToStr(tglKembaliRaw) || '-',
                nomor_kendaraan: noKendaraan
            });
            if (res?.success) {
                if (window.showToast) showToast('Catatan berhasil ditambahkan!', 'success');
                closeModal('bbm-addViolModal'); clearCache(); await loadViolations(true);
            } else if (window.showToast) showToast(res?.message || 'Gagal', 'error');
        } catch (e) { if (window.showToast) showToast('Error: ' + e.message, 'error'); }
        finally { btn.disabled = false; btn.innerHTML = orig; }
    };

    // ── Edit Violation ────────────────────────────────────────
    window.bbmOpenEditViol = (idx) => {
        const v = allViolations[idx]; if (!v) return;
        document.getElementById('bbm-ev-id').value = v.id || '';
        document.getElementById('bbm-ev-bulan').value = v.bulan || 'JANUARI';
        document.getElementById('bbm-ev-unit').value = v.unit || '';
        document.getElementById('bbm-ev-bulan-hidden').value = v.bulan || '';
        document.getElementById('bbm-ev-unit-hidden').value = v.unit || '';
        document.getElementById('bbm-ev-tgl-ambil').value = strToDate(v.tanggal_pengambilan);
        document.getElementById('bbm-ev-tgl-kembali').value = strToDate(v.tanggal_pengembalian);
        document.getElementById('bbm-ev-no-kendaraan').value = v.nomor_kendaraan !== '-' ? v.nomor_kendaraan : '';
        openModal('bbm-editViolModal');
    };
    window.bbmSubmitEditViol = async () => {
        const btn = document.getElementById('bbm-submit-ev-btn');
        const orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan...';
        try {
            const res = await callAPI({
                action: 'updateBBMViolation',
                id: document.getElementById('bbm-ev-id').value,
                bulan: document.getElementById('bbm-ev-bulan').value,
                unit: document.getElementById('bbm-ev-unit').value,
                bulan_orig: document.getElementById('bbm-ev-bulan-hidden').value,
                unit_orig: document.getElementById('bbm-ev-unit-hidden').value,
                tanggal_pengambilan: dateToStr(document.getElementById('bbm-ev-tgl-ambil').value),
                tanggal_pengembalian: dateToStr(document.getElementById('bbm-ev-tgl-kembali').value) || '-',
                nomor_kendaraan: document.getElementById('bbm-ev-no-kendaraan').value || '-'
            });
            if (res?.success) {
                if (window.showToast) showToast('Catatan berhasil diperbarui!', 'success');
                closeModal('bbm-editViolModal'); clearCache(); await loadViolations(true);
            } else if (window.showToast) showToast(res?.message || 'Gagal', 'error');
        } catch (e) { if (window.showToast) showToast('Error: ' + e.message, 'error'); }
        finally { btn.disabled = false; btn.innerHTML = orig; }
    };

    // ── Delete Violation ──────────────────────────────────────
    window.bbmDeleteViol = async (idx) => {
        const v = allViolations[idx]; if (!v) return;
        if (!confirm(`Hapus catatan ini?\nUnit: ${v.unit}\nBulan: ${v.bulan}`)) return;
        try {
            const res = await callAPI({ action: 'deleteBBMViolation', id: v.id || '', bulan: v.bulan, unit: v.unit });
            if (res?.success) {
                if (window.showToast) showToast('Catatan berhasil dihapus', 'success');
                clearCache(); await loadViolations(true); await loadScores(true);
            } else if (window.showToast) showToast(res?.message || 'Gagal', 'error');
        } catch (e) { if (window.showToast) showToast('Error: ' + e.message, 'error'); }
    };

    // ── Export ────────────────────────────────────────────────
    window.bbmExportViol = async () => {
        if (!confirm('Export catatan pelanggaran ke sheet baru?')) return;
        if (window.showToast) showToast('Mengekspor...', 'success');
        try {
            const res = await callAPI({
                action: 'exportBBMViolationsReport',
                bulan: document.getElementById('bbm-filter-bulan-viol')?.value || '',
                unit: document.getElementById('bbm-filter-unit-viol')?.value || ''
            });
            if (res?.success) {
                if (window.showToast) showToast(`Berhasil export ${res.recordCount} catatan!`, 'success');
                if (res.url && confirm('Buka spreadsheet?')) window.open(res.url, '_blank');
            } else if (window.showToast) showToast(res?.message || 'Gagal', 'error');
        } catch (e) { if (window.showToast) showToast('Gagal export: ' + e.message, 'error'); }
    };

    // ═══════════════════════════════════════════════════════════
    // TAB 3 — PENILAIAN
    // ═══════════════════════════════════════════════════════════
    async function loadScores(forceRefresh = false) {
        let bulan = document.getElementById('bbm-filter-score-bulan')?.value || '';
        if (!bulan) {
            const mn = ['', 'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
            bulan = mn[new Date().getMonth() + 1];
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
            if (scoreChart) scoreChart.destroy();
            if (violationChart) violationChart.destroy();
            return;
        }

        const monthScores = (allScores.scores || []).filter(s => s.bulan === bulan);
        if (!monthScores.length) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>Tidak ada data untuk bulan ini</p></div>';
            if (chartsGrid) chartsGrid.style.display = 'none';
            if (scoreChart) scoreChart.destroy();
            if (violationChart) violationChart.destroy();
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
                    <div>
                        <div class="score-unit-name">${score.unit}</div>
                        <div class="score-month">Bulan ${score.bulan}</div>
                    </div>
                    <div style="text-align:right;">
                        <div class="score-value ${cls}">${s.toFixed(2)}</div>
                        <div style="font-size:12px;color:#64748b;margin-top:4px;">${label}</div>
                    </div>
                </div>
                <div class="score-bar"><div class="score-bar-fill" style="width:${pct}%;background:${barColor};"></div></div>
                <div class="score-details">
                    <div class="score-detail-item">
                        <div class="score-detail-label">Skor Awal</div>
                        <div class="score-detail-value">${parseFloat(score.skorUtuh || 0).toFixed(1)}</div>
                    </div>
                    <div class="score-detail-item">
                        <div class="score-detail-label">Keterlambatan</div>
                        <div class="score-detail-value" style="color:#f59e0b;">${score.jumlahPelanggaran || 0}×</div>
                    </div>
                    <div class="score-detail-item">
                        <div class="score-detail-label">Pengurangan</div>
                        <div class="score-detail-value" style="color:#ef4444;">−${parseFloat(score.jumlahSanksi || 0).toFixed(2)}</div>
                    </div>
                </div>
            </div>`;
        }).join('') + '</div>';
    }

    function renderBBMCharts(monthScores) {
        const units = monthScores.map(s => s.unit.length > 22 ? s.unit.substring(0, 19) + '...' : s.unit);
        const scores = monthScores.map(s => parseFloat(s.skorAkhir) || 0);
        const violations = monthScores.map(s => parseInt(s.jumlahPelanggaran) || 0);
        if (scoreChart) scoreChart.destroy();
        scoreChart = new Chart(document.getElementById('bbm-scoreChart').getContext('2d'), {
            type: 'bar',
            data: { labels: units, datasets: [{ label: 'Skor Akhir', data: scores, backgroundColor: scores.map(s => s >= 4.5 ? '#10b981' : s >= 3 ? '#f59e0b' : '#ef4444'), borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 5, ticks: { stepSize: 0.5 }, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
        });
        if (violationChart) violationChart.destroy();
        violationChart = new Chart(document.getElementById('bbm-violationChart').getContext('2d'), {
            type: 'bar',
            data: { labels: units, datasets: [{ label: 'Keterlambatan', data: violations, backgroundColor: '#3b82f6', borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // TEMPLATE OPTIONS
    // ═══════════════════════════════════════════════════════════
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

    // ═══════════════════════════════════════════════════════════
    // REGISTER SECTION & INJECT HTML
    // ═══════════════════════════════════════════════════════════
    window.sectionInits = window.sectionInits || {};
    window.sectionInits['voucher-bbm'] = function () {
        const section = document.getElementById('section-voucher-bbm');
        if (!section) return;

        section.innerHTML = `
<style>
/* ─── BBM-specific local styles ─── */

/* Approved request list item */
.bbm-req-item {
    padding: 12px 14px;
    cursor: pointer;
    border-bottom: 1px solid #f1f5f9;
    display: flex; align-items: center; gap: 10px;
    transition: background 0.12s;
}
.bbm-req-item:last-child { border-bottom: none; }
.bbm-req-item:hover      { background: #eff6ff; }
.bbm-req-item.selected   { background: #d1fae5; }

.bbm-req-item-check {
    width: 18px; height: 18px; border-radius: 50%;
    border: 2px solid #e5e7eb;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; font-size: 11px; font-weight: 700;
}
.bbm-req-item.selected .bbm-req-item-check {
    background: #10b981; border-color: #10b981; color: white;
}

.bbm-req-item-name { font-weight: 600; font-size: 13.5px; color: #1e293b; }
.bbm-req-item-meta { font-size: 12px; color: #64748b; margin-top: 2px; }
.bbm-req-item-plate {
    font-family: 'Courier New', monospace; font-size: 12px;
    background: #f8fafc; padding: 2px 8px; border-radius: 4px;
    display: inline-block;
}

/* Scrollable request list */
.bbm-req-list {
    max-height: 260px; overflow-y: auto;
    border: 1px solid #e5e7eb; border-radius: 6px;
    margin-bottom: 12px;
}

/* Source toggle row */
.bbm-source-toggle { display: flex; gap: 8px; margin-bottom: 16px; }

/* Score progress bar */
.score-bar {
    height: 4px; background: #e5e7eb;
    border-radius: 2px; margin-top: 10px; overflow: hidden;
}
.score-bar-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }

/* Info grid di detail modal */
.info-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 14px; margin-bottom: 16px;
}
.info-item .input-label { margin-bottom: 4px; }
.info-item p { font-size: 14px; color: #1e293b; }
.section-page-header { margin-bottom:28px; padding-bottom:20px; border-bottom:1px solid #f1f5f9; }
.section-page-title { font-size:22px; font-weight:700; color:#0f172a; margin-bottom:4px; }
.section-page-subtitle { font-size:14px; color:#64748b; }

/* BBM action button styles */
.btn-action-view    { background:#f8fafc; color:#475569; border-color:#e2e8f0; }
.btn-action-view:hover    { background:#f1f5f9; border-color:#cbd5e1; }
.btn-action-edit    { background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe; }
.btn-action-edit:hover    { background:#dbeafe; border-color:#93c5fd; }
</style>

<div class="container">
<div class="section-page-header">
    <h1 class="section-page-title">Voucher BBM</h1>
    <p class="section-page-subtitle">Manajemen permintaan, catatan pelanggaran, dan penilaian voucher BBM</p>
</div>

    <!-- TABS — disamakan: Permintaan | Catatan Pelanggaran | Penilaian -->
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
            <div class="stat-card" style="border-left:3px solid #64748b;">
                <div class="stat-label">Total Permintaan</div>
                <div class="stat-value" id="bbm-stat-total">0</div>
            </div>
            <div class="stat-card" style="border-left:3px solid #10b981;">
                <div class="stat-label">Disetujui</div>
                <div class="stat-value" id="bbm-stat-approved">0</div>
            </div>
            <div class="stat-card" style="border-left:3px solid #f59e0b;">
                <div class="stat-label">Menunggu</div>
                <div class="stat-value" id="bbm-stat-pending">0</div>
            </div>
            <div class="stat-card" style="border-left:3px solid #ef4444;">
                <div class="stat-label">Ditolak</div>
                <div class="stat-value" id="bbm-stat-rejected">0</div>
            </div>
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
                    <input type="text" class="search-input" id="bbm-search-req" placeholder="Cari nama / unit..." oninput="bbmApplyFilter()">
                    <button onclick="bbmLoadRequests(true)" class="btn btn-sm btn-action-view">${ICONS.refresh} Refresh</button>
                </div>
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Nama Pegawai</th><th>Unit / Eselon</th><th>No. Kendaraan</th><th>Waktu Pengajuan</th><th>Status</th><th>Aksi</th></tr></thead>
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
                    <button onclick="bbmExportViol()" class="btn btn-sm btn-action-view">${ICONS.export} Export</button>
                    <button onclick="bbmOpenAddViol()" class="btn btn-sm btn-action-edit">${ICONS.plus} Tambah</button>
                    <button onclick="bbmLoadViolations(true)" class="btn btn-sm btn-action-view">${ICONS.refresh} Refresh</button>
                </div>
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Bulan</th><th>Unit</th><th>Tgl Pengambilan</th><th>Tgl Pengembalian</th><th>No. Kendaraan</th><th>Aksi</th></tr></thead>
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
                    <button onclick="bbmLoadScores(true)" class="btn btn-sm btn-action-view">${ICONS.refresh} Refresh</button>
                </div>
            </div>
            <div class="card-content">
                <!-- Sanksi box -->
                <div id="bbm-sanksi-box" style="display:none;background:#f8fafc;border:1px solid #f1f5f9;border-radius:8px;padding:16px;margin-bottom:24px;">
                    <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;margin-bottom:4px;">Sanksi per Keterlambatan</p>
                    <p style="font-size:22px;font-weight:700;color:#0f172a;" id="bbm-sanksi-value">-</p>
                </div>
                <!-- Charts grid -->
                <div class="charts-grid" id="bbm-charts-grid" style="display:none;">
                    <div class="card" style="margin:0;">
                        <div class="card-header" style="padding:16px;"><h3 style="font-size:14px;font-weight:600;color:#374151;">Skor Akhir Per Unit</h3></div>
                        <div class="card-content"><div class="chart-container"><canvas id="bbm-scoreChart"></canvas></div></div>
                    </div>
                    <div class="card" style="margin:0;">
                        <div class="card-header" style="padding:16px;"><h3 style="font-size:14px;font-weight:600;color:#374151;">Jumlah Keterlambatan Per Unit</h3></div>
                        <div class="card-content"><div class="chart-container"><canvas id="bbm-violationChart"></canvas></div></div>
                    </div>
                </div>
                <!-- Score cards -->
                <div id="bbm-scores-container">
                    <div class="empty-state"><div class="empty-state-icon">📊</div><p>Pilih bulan untuk melihat penilaian</p></div>
                </div>
            </div>
        </div>
    </div>

</div><!-- /container -->


<!-- ═══════════════ MODALS ═══════════════ -->

<!-- DETAIL -->
<div id="bbm-detailModal" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal">
        <div class="modal-header"><h2 class="modal-title">Detail Permintaan Voucher BBM</h2></div>
        <div class="modal-content" id="bbm-detail-body"></div>
        <div class="modal-footer">
            <button onclick="document.getElementById('bbm-detailModal').style.display='none'" class="btn" style="flex:1;">Tutup</button>
        </div>
    </div>
</div>

<!-- APPROVE -->
<div id="bbm-approveModal" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal">
        <div class="modal-header"><h2 class="modal-title">Setujui Permintaan Voucher BBM</h2></div>
        <div class="modal-content">
            <div class="alert alert-info">Status akan diubah menjadi <strong>Disetujui</strong>. Pastikan data sudah benar.</div>
            <div class="form-group">
                <label class="input-label">Catatan (opsional)</label>
                <textarea class="form-textarea" id="bbm-approve-catatan" placeholder="Tambahkan catatan jika diperlukan..."></textarea>
            </div>
            <input type="hidden" id="bbm-approve-id">
        </div>
        <div class="modal-footer">
            <button onclick="document.getElementById('bbm-approveModal').style.display='none'" class="btn" style="flex:1;">Batal</button>
            <button onclick="bbmConfirmApprove()" class="btn btn-success" style="flex:1;" id="bbm-confirm-approve-btn">${ICONS.check} Setujui</button>
        </div>
    </div>
</div>

<!-- EDIT REQUEST STATUS -->
<div id="bbm-editModal" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal">
        <div class="modal-header"><h2 class="modal-title">Edit Status Voucher BBM</h2></div>
        <div class="modal-content">
            <div class="form-group">
                <label class="input-label">Status</label>
                <select class="form-input" id="bbm-edit-status">
                    <option value="PENDING">Menunggu</option>
                    <option value="APPROVED">Disetujui</option>
                    <option value="REJECTED">Ditolak</option>
                </select>
            </div>
            <div class="info-box">
                <p class="info-box-label">Info Permintaan (tidak dapat diubah)</p>
                <div class="form-group" style="margin-bottom:8px;"><label class="input-label">Nama Pegawai</label><input type="text" class="form-input" id="bbm-edit-nama" readonly style="background:#f0f4f8;cursor:not-allowed;"></div>
                <div class="form-group" style="margin-bottom:8px;"><label class="input-label">Unit</label><input type="text" class="form-input" id="bbm-edit-unit" readonly style="background:#f0f4f8;cursor:not-allowed;"></div>
                <div class="form-group" style="margin-bottom:0;"><label class="input-label">No. Kendaraan</label><input type="text" class="form-input" id="bbm-edit-kendaraan" readonly style="background:#f0f4f8;cursor:not-allowed;"></div>
            </div>
            <input type="hidden" id="bbm-edit-id">
        </div>
        <div class="modal-footer">
            <button onclick="document.getElementById('bbm-editModal').style.display='none'" class="btn" style="flex:1;">Batal</button>
            <button onclick="bbmSubmitEdit()" class="btn btn-primary" style="flex:1;" id="bbm-submit-edit-btn">Simpan Perubahan</button>
        </div>
    </div>
</div>

<!-- ADD VIOLATION — dengan source toggle (approved / manual) -->
<div id="bbm-addViolModal" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal" style="max-width:680px;">
        <div class="modal-header"><h2 class="modal-title">Tambah Catatan Pelanggaran BBM</h2></div>
        <div class="modal-content">

            <!-- Source toggle -->
            <div class="bbm-source-toggle">
                <button class="btn btn-sm btn-primary" id="bbm-src-btn-approved" onclick="bbmSetViolSource('approved')">${ICONS.check} Dari Permintaan Disetujui</button>
                <button class="btn btn-sm"             id="bbm-src-btn-manual"   onclick="bbmSetViolSource('manual')">${ICONS.plus} Input Manual</button>
            </div>

            <!-- Panel: dari approved -->
            <div id="bbm-src-approved">
                <div class="alert alert-info" style="margin-bottom:10px;">Pilih permintaan yang sudah disetujui sebagai dasar catatan pelanggaran.</div>
                <div class="form-group" style="margin-bottom:8px;">
                    <input type="text" class="form-input" id="bbm-approved-search" placeholder="Cari nama atau plat kendaraan..." oninput="bbmFilterApprovedReqs()">
                </div>
                <div class="bbm-req-list" id="bbm-approved-request-list">
                    <div style="padding:20px;text-align:center;color:#64748b;font-size:13px;">Memuat data...</div>
                </div>
                <div id="bbm-selected-req-info" style="display:none;" class="info-box">
                    <p class="info-box-label">Permintaan Dipilih</p>
                    <div id="bbm-selected-req-detail" style="font-size:13.5px;"></div>
                </div>
            </div>

            <!-- Panel: manual — plat nomor menggunakan dropdown -->
            <div id="bbm-src-manual" style="display:none;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div class="form-group">
                        <label class="input-label">Bulan <span style="color:#ef4444;">*</span></label>
                        <select class="form-input" id="bbm-viol-bulan">${OPT_BULAN_REQ}</select>
                    </div>
                    <div class="form-group">
                        <label class="input-label">Unit <span style="color:#ef4444;">*</span></label>
                        <select class="form-input" id="bbm-viol-unit">${OPT_UNIT_REQ}</select>
                    </div>
                    <div class="form-group" style="grid-column:1/-1;">
                        <label class="input-label">Nomor Kendaraan</label>
                        <select class="form-input" id="bbm-viol-no-kendaraan">${VEHICLE_OPTIONS}</select>
                    </div>
                </div>
            </div>

            <!-- Date fields (shared antara approved & manual) -->
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

<!-- EDIT VIOLATION -->
<div id="bbm-editViolModal" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal">
        <div class="modal-header"><h2 class="modal-title">Edit Catatan Pelanggaran</h2></div>
        <div class="modal-content">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <label class="input-label">Bulan</label>
                    <select class="form-input" id="bbm-ev-bulan">${OPT_BULAN_EDIT}</select>
                </div>
                <div class="form-group">
                    <label class="input-label">Unit</label>
                    <select class="form-input" id="bbm-ev-unit">${OPT_UNIT_EDIT}</select>
                </div>
                <div class="form-group">
                    <label class="input-label">Tanggal Pengambilan</label>
                    <input type="date" class="form-input" id="bbm-ev-tgl-ambil">
                </div>
                <div class="form-group">
                    <label class="input-label">Tanggal Pengembalian</label>
                    <input type="date" class="form-input" id="bbm-ev-tgl-kembali">
                </div>
                <div class="form-group" style="grid-column:1/-1;">
                    <label class="input-label">Nomor Kendaraan</label>
                    <select class="form-input" id="bbm-ev-no-kendaraan">${VEHICLE_OPTIONS}</select>
                </div>
            </div>
            <input type="hidden" id="bbm-ev-id">
            <input type="hidden" id="bbm-ev-bulan-hidden">
            <input type="hidden" id="bbm-ev-unit-hidden">
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