// ============================================================
// requests.js — Kendaraan Dinas section (SPA)
// Admin Panel — Dinas Koperasi UKM
// ============================================================
(function () {
    'use strict';

    const API_URL = 'https://script.google.com/macros/s/AKfycbyfAJcjPDuKqwKk8A46z4quyaeV9trBLAuDtdqhQqX0CIZke6fgN1sptcnS0EURuF6ksg/exec';
    const CACHE_DURATION = 5 * 60 * 1000;
    const CACHE_KEYS = { REQUESTS: 'kendaraan_requests', VIOLATIONS: 'kendaraan_violations', SCORES: 'kendaraan_scores' };

    let masterRequests = [], allRequests = [];
    let masterViolations = [], allViolations = [];
    let allScores = {}, scoreChart = null, violationChart = null;
    let currentApproveId = null;
    let requestsCurrentPage = 1, violationsCurrentPage = 1;
    const itemsPerPage = 10;

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
        car: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1"/><path d="M19 17h2a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1"/><rect x="5" y="9" width="14" height="8" rx="2"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/><path d="M8 9V5h8v4"/></svg>`,
    };

    // ── Cache ─────────────────────────────────────────────────
    function saveToCache(k, d) { try { localStorage.setItem(k, JSON.stringify({ data: d, timestamp: Date.now() })); } catch (e) { } }
    function getFromCache(k) { try { const c = localStorage.getItem(k); if (!c) return null; const p = JSON.parse(c); if (Date.now() - p.timestamp < CACHE_DURATION) return p.data; localStorage.removeItem(k); return null; } catch (e) { return null; } }
    function clearCache() { Object.values(CACHE_KEYS).forEach(k => localStorage.removeItem(k)); }
    function showCacheIndicator() { const el = document.getElementById('req-cache-indicator'); if (el) { el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2000); } }

    // ── API (JSONP) ─────────────────────────────────────────
    function callAPI(params) {
        return new Promise((resolve, reject) => {
            const cb = 'req_cb_' + Math.round(100000 * Math.random());
            window[cb] = data => { delete window[cb]; document.getElementById(cb)?.remove(); resolve(data); };
            const qs = new URLSearchParams({ ...params, callback: cb }).toString();
            const script = document.createElement('script');
            script.id = cb; script.src = `${API_URL}?${qs}`;
            const tid = setTimeout(() => { delete window[cb]; script.remove(); reject(new Error('Timeout')); }, 15000);
            script.onerror = () => { clearTimeout(tid); delete window[cb]; reject(new Error('Network error')); };
            document.body.appendChild(script);
        });
    }

    // ── Helpers ───────────────────────────────────────────────
    function createStatusBadge(status) {
        const s = (status || '').toLowerCase();
        if (s === 'approved') return '<span class="badge badge-approved">Disetujui</span>';
        if (s === 'rejected') return '<span class="badge badge-rejected">Ditolak</span>';
        return '<span class="badge badge-pending">Menunggu</span>';
    }
    function formatTime(t) { if (!t) return '-'; if (typeof t === 'string' && t.includes('T')) return t.split('T')[1].substring(0, 5); return t; }
    function openModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'flex'; }
    function closeModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }

    // ── Tab switch ────────────────────────────────────────────
    function reqSwitchTab(tabName, event) {
        document.querySelectorAll('#section-requests .tab').forEach(t => t.classList.remove('active'));
        if (event?.target) event.target.classList.add('active');
        document.querySelectorAll('#section-requests .tab-content').forEach(tc => tc.classList.remove('active'));
        const el = document.getElementById('req-tab-' + tabName); if (el) el.classList.add('active');
        if (tabName === 'requests') loadRequests();
        else if (tabName === 'violations') loadViolations();
        else if (tabName === 'scores') loadScores();
    }
    window.reqSwitchTab = reqSwitchTab;
    window.reqSwitchTabDD = (v) => {
        document.querySelectorAll('#section-requests .tab-content').forEach(tc => tc.classList.remove('active'));
        const el = document.getElementById('req-tab-' + v); if (el) el.classList.add('active');
        if (v === 'requests') loadRequests(); else if (v === 'violations') loadViolations(); else if (v === 'scores') loadScores();
    };

    function updateStats() {
        const t = document.getElementById('req-stat-total');
        const a = document.getElementById('req-stat-approved');
        const p = document.getElementById('req-stat-pending');
        const r = document.getElementById('req-stat-rejected');
        if (t) t.textContent = masterRequests.length;
        if (a) a.textContent = masterRequests.filter(req => (req.status || '').toUpperCase() === 'APPROVED').length;
        if (p) p.textContent = masterRequests.filter(req => (req.status || '').toUpperCase() === 'PENDING').length;
        if (r) r.textContent = masterRequests.filter(req => (req.status || '').toUpperCase() === 'REJECTED').length;
    }

    function reqApplyFilter() {
        const status = (document.getElementById('req-filter-status')?.value || '').toUpperCase();
        const search = (document.getElementById('req-search-input')?.value || '').toLowerCase().trim();
        allRequests = masterRequests.filter(req => {
            if (status && (req.status || '').toUpperCase() !== status) return false;
            const h = `${req.nama_pegawai || ''} ${req.unit_eselon || ''}`.toLowerCase();
            return !search || h.includes(search);
        });
        requestsCurrentPage = 1;
        renderPaginatedRequests();
    }
    window.reqApplyFilter = reqApplyFilter;

    // ═══ TAB 1: PERMINTAAN ═══════════════════════════════════
    async function loadRequests(forceRefresh = false) {
        if (!forceRefresh) {
            const cached = getFromCache(CACHE_KEYS.REQUESTS);
            if (cached) {
                // cache disimpan urutan asli, reverse agar terbaru tampil di atas
                masterRequests = cached.slice().reverse();
                allRequests = [...masterRequests]; requestsCurrentPage = 1;
                renderPaginatedRequests(); showCacheIndicator(); return;
            }
        }
        const tbody = document.getElementById('req-requests-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="loading"><div class="spinner"></div><p style="margin-top:12px;color:#64748b;">Memuat data...</p></td></tr>';
        try {
            const res = await callAPI({ action: 'getRequests' });
            const rawData = Array.isArray(res) ? res : [];
            // simpan ke cache dalam urutan ASLI dari API/sheet
            saveToCache(CACHE_KEYS.REQUESTS, rawData);
            // reverse untuk tampilan: terbaru (index akhir) → halaman 1 atas
            masterRequests = rawData.slice().reverse();
            allRequests = [...masterRequests]; requestsCurrentPage = 1;
            renderPaginatedRequests();
        } catch (e) { if (window.showToast) showToast('Gagal memuat data: ' + e.message, 'error'); }
    }
    window.reqLoadRequests = (f) => loadRequests(f);

    function renderPaginatedRequests() {
        const tbody = document.getElementById('req-requests-tbody');
        const cards = document.getElementById('req-requests-cards');
        const pgn = document.getElementById('req-requests-pagination');
        if (!tbody) return;
        updateStats();

        if (allRequests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8;">Tidak ada pengajuan</td></tr>';
            if (cards) cards.innerHTML = '<div style="text-align:center;padding:2rem;color:#64748b;">Data tidak ditemukan</div>';
            if (pgn) pgn.innerHTML = ''; return;
        }
        const totalPages = Math.ceil(allRequests.length / itemsPerPage);
        const start = (requestsCurrentPage - 1) * itemsPerPage;
        const items = allRequests.slice(start, start + itemsPerPage);

        tbody.innerHTML = items.map(req => {
            const isPending = (req.status || '').toLowerCase() === 'pending';
            const kendaraan = (req.nomorKendaraan && req.nomorKendaraan !== '-')
                ? `<span style="font-family:monospace;font-weight:600;">${req.nomorKendaraan}</span>`
                : `<span style="color:#94a3b8;font-size:12px;">Belum ditentukan</span>`;
            return `<tr>
                <td style="font-weight:500;">${req.nama_pegawai || '-'}</td>
                <td style="color:#64748b;font-size:13px;">${req.unit_eselon || '-'}</td>
                <td>${req.tanggal_penggunaan || '-'}</td>
                <td>${formatTime(req.waktu_penjemputan)} – ${formatTime(req.waktu_pengembalian)}</td>
                <td>${kendaraan}</td>
                <td style="min-width: 90px; text-align: center;">
                    ${isPending ? `<div class="btn-icon-group" style="margin: 0;">
                        <button onclick="reqOpenApprove('${req.id}')" class="btn-icon btn-icon-approve" title="Setujui">${ICONS.check}</button>
                        <button onclick="reqQuickReject('${req.id}')" class="btn-icon btn-icon-reject" title="Tolak">${ICONS.x}</button>
                    </div>` : createStatusBadge(req.status)}
                </td>
                <td>
                    <div class="action-buttons">
                        <div class="btn-icon-group">
                            ${(req.status || '').toLowerCase() === 'approved' ? `<button onclick="reqMarkAsCompleted('${req.id}', this)" class="btn-icon btn-icon-complete" title="Selesai">${ICONS.checkCircle}</button>` : ''}
                            <button onclick="reqViewDetail('${req.id}')" class="btn-icon btn-icon-view" title="Detail">${ICONS.eye}</button>
                            <button onclick="reqOpenEdit('${req.id}')" class="btn-icon btn-icon-edit" title="Edit">${ICONS.edit}</button>
                            <button onclick="reqDeleteRequest('${req.id}')" class="btn-icon btn-icon-delete" title="Hapus">${ICONS.trash}</button>
                        </div>
                    </div>
                </td>
            </tr>`;
        }).join('');

        if (cards) cards.innerHTML = items.map(req => {
            const isPending = (req.status || '').toLowerCase() === 'pending';
            const kendaraan = (req.nomorKendaraan && req.nomorKendaraan !== '-') ? req.nomorKendaraan : '-';
            return `<div class="requests-card">
                <div class="requests-card-header">
                    <div style="flex:1;">
                        <div class="requests-card-title">${req.nama_pegawai || '-'}</div>
                        <div class="requests-card-subtitle">${req.unit_eselon || '-'}</div>
                    </div>
                    ${isPending ? `<div class="btn-icon-group" style="margin: 0;">
                        <button onclick="reqOpenApprove('${req.id}')" class="btn-icon btn-icon-approve" title="Setujui">${ICONS.check}</button>
                        <button onclick="reqQuickReject('${req.id}')" class="btn-icon btn-icon-reject" title="Tolak">${ICONS.x}</button>
                    </div>` : createStatusBadge(req.status)}
                </div>
                <div class="requests-card-body">
                    <div class="requests-card-row"><span class="requests-card-label">Tanggal</span><span class="requests-card-value">${req.tanggal_penggunaan || '-'}</span></div>
                    <div class="requests-card-row"><span class="requests-card-label">Waktu</span><span class="requests-card-value">${formatTime(req.waktu_penjemputan)} – ${formatTime(req.waktu_pengembalian)}</span></div>
                    <div class="requests-card-row"><span class="requests-card-label">Kendaraan</span><span class="requests-card-value" style="font-weight:600;">${kendaraan}</span></div>
                </div>
                <div class="requests-card-footer">
                    <div class="action-buttons" style="justify-content:flex-end;">
                        <div class="btn-icon-group">
                            ${(req.status || '').toLowerCase() === 'approved' ? `<button onclick="reqMarkAsCompleted('${req.id}', this)" class="btn-icon btn-icon-complete" title="Selesai">${ICONS.checkCircle}</button>` : ''}
                            <button onclick="reqViewDetail('${req.id}')" class="btn-icon btn-icon-view" title="Detail">${ICONS.eye}</button>
                            <button onclick="reqOpenEdit('${req.id}')" class="btn-icon btn-icon-edit" title="Edit">${ICONS.edit}</button>
                            <button onclick="reqDeleteRequest('${req.id}')" class="btn-icon btn-icon-delete" title="Hapus">${ICONS.trash}</button>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');

        if (pgn) pgn.innerHTML = `
            <button onclick="reqChangeReqPage(${requestsCurrentPage - 1})" ${requestsCurrentPage === 1 ? 'disabled' : ''}>&#8249; Prev</button>
            <span class="pagination-info">Halaman ${requestsCurrentPage} dari ${totalPages} (${allRequests.length} data)</span>
            <button onclick="reqChangeReqPage(${requestsCurrentPage + 1})" ${requestsCurrentPage === totalPages ? 'disabled' : ''}>Next &#8250;</button>`;
    }
    window.reqChangeReqPage = (page) => { const t = Math.ceil(allRequests.length / itemsPerPage); if (page < 1 || page > t) return; requestsCurrentPage = page; renderPaginatedRequests(); };

    window.reqViewDetail = (id) => {
        const req = allRequests.find(r => r.id == id) || masterRequests.find(r => r.id == id); if (!req) return;
        const el = document.getElementById('req-detail-body');
        if (el) el.innerHTML = `
            <div class="info-grid">
                <div class="info-item"><label class="input-label">Nama Pegawai</label><p style="font-weight:500;">${req.nama_pegawai || '-'}</p></div>
                <div class="info-item"><label class="input-label">Unit Eselon</label><p style="font-weight:500;">${req.unit_eselon || '-'}</p></div>
            </div>
            <div class="info-grid">
                <div class="info-item"><label class="input-label">Tanggal</label><p style="font-weight:500;">${req.tanggal_penggunaan || '-'}</p></div>
                <div class="info-item"><label class="input-label">Waktu</label><p style="font-weight:500;">${formatTime(req.waktu_penjemputan)} – ${formatTime(req.waktu_pengembalian)}</p></div>
            </div>
            <div style="margin-bottom:16px;"><label class="input-label">Nomor Kendaraan</label><p style="font-weight:500;">${req.nomorKendaraan || 'Belum Ditentukan'}</p></div>
            <div style="margin-bottom:16px;"><label class="input-label">Keperluan</label><p style="font-weight:500;">${req.tujuan || req.keterangan || '-'}</p></div>
            <div style="margin-bottom:16px;"><label class="input-label">Alamat</label><p style="font-weight:500;">${req.alamat || '-'}</p></div>
            <div><label class="input-label">Status</label><div style="margin-top:4px;">${createStatusBadge(req.status)}</div></div>`;
        openModal('req-detailModal');
    };
    window.reqOpenApprove = (id) => { currentApproveId = id; const el = document.getElementById('req-vehicle-select'); if (el) el.value = ''; openModal('req-approveModal'); };
    window.reqConfirmApprove = async () => {
        const v = document.getElementById('req-vehicle-select')?.value;
        if (!v) { if (window.showToast) showToast('Pilih nomor kendaraan terlebih dahulu', 'error'); return; }
        const btn = document.getElementById('req-confirm-approve-btn'), orig = btn.innerHTML;
        btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyetujui...';
        try {
            const res = await callAPI({ action: 'updateRequest', id: currentApproveId, status: 'approved', nomorKendaraan: v });
            if (res.success) { if (window.showToast) showToast('Pengajuan disetujui: ' + v, 'success'); closeModal('req-approveModal'); clearCache(); await loadRequests(true); }
            else if (window.showToast) showToast(res.message || 'Gagal', 'error');
        } catch (e) { if (window.showToast) showToast('Gagal: ' + e.message, 'error'); }
        finally { btn.disabled = false; btn.innerHTML = orig; }
    };
    window.reqQuickReject = async (id) => {
        if (!confirm('Tolak pengajuan ini?')) return;
        try { const res = await callAPI({ action: 'updateRequest', id, status: 'rejected' }); if (res.success) { if (window.showToast) showToast('Pengajuan ditolak', 'success'); clearCache(); await loadRequests(true); } else if (window.showToast) showToast(res.message || 'Gagal', 'error'); }
        catch (e) { if (window.showToast) showToast('Gagal: ' + e.message, 'error'); }
    };
    window.reqMarkAsCompleted = async (id, btnEl) => {
        if (!confirm('Tandai pengajuan ini sebagai selesai?')) return;
        const orig = btnEl.innerHTML; btnEl.disabled = true; btnEl.innerHTML = '<span class="spinner spinner-sm"></span>';
        try {
            const res = await callAPI({ action: 'updateRequest', id, status: 'completed' });
            if (res.success) { if (window.showToast) showToast('Status diperbarui menjadi Selesai', 'success'); clearCache(); await loadRequests(true); }
            else { if (window.showToast) showToast(res.message || 'Gagal', 'error'); btnEl.disabled = false; btnEl.innerHTML = orig; }
        } catch (e) { if (window.showToast) showToast('Gagal: ' + e.message, 'error'); btnEl.disabled = false; btnEl.innerHTML = orig; }
    };
    window.reqOpenEdit = (id) => {
        const req = allRequests.find(r => r.id == id) || masterRequests.find(r => r.id == id); if (!req) return;
        document.getElementById('req-edit-status').value = (req.status || 'pending').toLowerCase();
        document.getElementById('req-edit-nomor-kendaraan').value = req.nomorKendaraan || '';
        document.getElementById('req-edit-nama').value = req.nama_pegawai || '';
        document.getElementById('req-edit-unit').value = req.unit_eselon || '';
        document.getElementById('req-edit-tanggal').value = req.tanggal_penggunaan || '';
        document.getElementById('req-edit-id').value = id;
        openModal('req-editModal');
    };
    window.reqSubmitEdit = async () => {
        const btn = document.getElementById('req-submit-edit-btn'), orig = btn.innerHTML;
        btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan...';
        try {
            const res = await callAPI({ action: 'updateRequest', id: document.getElementById('req-edit-id').value, status: document.getElementById('req-edit-status').value, nomorKendaraan: document.getElementById('req-edit-nomor-kendaraan').value });
            if (res.success) { if (window.showToast) showToast('Data berhasil diperbarui!', 'success'); closeModal('req-editModal'); clearCache(); await loadRequests(true); }
            else if (window.showToast) showToast(res.message || 'Gagal', 'error');
        } catch (e) { if (window.showToast) showToast('Error: ' + e.message, 'error'); }
        finally { btn.disabled = false; btn.innerHTML = orig; }
    };
    window.reqDeleteRequest = async (id) => {
        if (!confirm('Hapus pengajuan ini? Tindakan tidak dapat dibatalkan.')) return;
        try { const res = await callAPI({ action: 'deleteRequest', id }); if (res.success) { if (window.showToast) showToast('Pengajuan berhasil dihapus', 'success'); clearCache(); await loadRequests(true); } else if (window.showToast) showToast(res.message || 'Gagal', 'error'); }
        catch (e) { if (window.showToast) showToast('Gagal: ' + e.message, 'error'); }
    };

    // ── Auto-set bulan helper ─────────────────────────────────
    function setCurrentMonth(elId) {
        const el = document.getElementById(elId);
        if (el && !el.value) {
            const mn = ['', 'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
            el.value = mn[new Date().getMonth() + 1];
        }
    }

    // ═══ TAB 2: VIOLATIONS ═══════════════════════════════════
    async function loadViolations(forceRefresh = false) {
        setCurrentMonth('req-filter-bulan');
        if (!forceRefresh) {
            const cached = getFromCache(CACHE_KEYS.VIOLATIONS);
            if (cached) {
                masterViolations = cached.slice().reverse();
                window.reqFilterViolations();
                showCacheIndicator();
                return;
            }
        }
        const tbody = document.getElementById('req-violations-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="loading"><div class="spinner"></div><p style="margin-top:12px;color:#64748b;">Memuat data...</p></td></tr>';
        try {
            const res = await callAPI({ action: 'getVehicleViolations' });
            const rawData = Array.isArray(res) ? res : [];
            saveToCache(CACHE_KEYS.VIOLATIONS, rawData);
            masterViolations = rawData.slice().reverse();
            window.reqFilterViolations();
        } catch (e) { if (window.showToast) showToast('Gagal memuat data pelanggaran', 'error'); }
    }
    window.reqLoadViolations = (f) => loadViolations(f);
    window.reqFilterViolations = () => {
        const b = document.getElementById('req-filter-bulan')?.value || '';
        const u = document.getElementById('req-filter-unit')?.value || '';
        const j = document.getElementById('req-filter-jenis')?.value || '';
        allViolations = masterViolations.filter(v => (b === '' || v.bulan === b) && (u === '' || v.unit === u) && (j === '' || v.jenis === j));
        violationsCurrentPage = 1; renderPaginatedViolations();
    };

    function renderPaginatedViolations() {
        const tbody = document.getElementById('req-violations-tbody');
        const cards = document.getElementById('req-violations-cards');
        const pgn = document.getElementById('req-violations-pagination');
        if (!tbody) return;
        if (allViolations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">Tidak ada catatan pelanggaran</td></tr>';
            if (cards) cards.innerHTML = '<div style="text-align:center;padding:2rem;color:#64748b;">Data tidak ditemukan</div>';
            if (pgn) pgn.innerHTML = ''; return;
        }
        const totalPages = Math.ceil(allViolations.length / itemsPerPage);
        const start = (violationsCurrentPage - 1) * itemsPerPage;
        const items = allViolations.slice(start, start + itemsPerPage);

        tbody.innerHTML = items.map((v, idx) => {
            const gi = start + idx;
            return `<tr>
                <td>${v.bulan || '—'}</td>
                <td>${v.unit || '—'}</td>
                <td>${v.tanggal || '—'}</td>
                <td><span style="font-size:12px;background:#f1f5f9;padding:2px 8px;border-radius:12px;">${v.jenis || '—'}</span></td>
                <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${v.laporan || ''}">${v.laporan || '—'}</td>
                <td>
                    <div class="action-buttons">
                        <div class="btn-icon-group">
                            <button onclick="reqOpenEditViol(${gi})" class="btn-icon btn-icon-edit" title="Edit">${ICONS.edit}</button>
                            <button onclick="reqDeleteViol(${gi})" class="btn-icon btn-icon-delete" title="Hapus">${ICONS.trash}</button>
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
                    <div class="violation-card-item"><div class="violation-card-label">Tanggal</div><div class="violation-card-value">${v.tanggal || '—'}</div></div>
                    <div class="violation-card-item"><div class="violation-card-label">Jenis</div><div class="violation-card-value">${v.jenis || '—'}</div></div>
                    <div class="violation-card-item" style="grid-column:1/-1"><div class="violation-card-label">Laporan</div><div class="violation-card-value">${v.laporan || '—'}</div></div>
                </div>
                <div class="violation-card-footer">
                    <div class="action-buttons" style="justify-content:flex-end;">
                        <div class="btn-icon-group">
                            <button onclick="reqOpenEditViol(${gi})" class="btn-icon btn-icon-edit" title="Edit">${ICONS.edit}</button>
                            <button onclick="reqDeleteViol(${gi})" class="btn-icon btn-icon-delete" title="Hapus">${ICONS.trash}</button>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');

        if (pgn) pgn.innerHTML = `
            <button onclick="reqChangeViolPage(${violationsCurrentPage - 1})" ${violationsCurrentPage === 1 ? 'disabled' : ''}>&#8249; Prev</button>
            <span class="pagination-info">Halaman ${violationsCurrentPage} dari ${totalPages} (${allViolations.length} data)</span>
            <button onclick="reqChangeViolPage(${violationsCurrentPage + 1})" ${violationsCurrentPage === totalPages ? 'disabled' : ''}>Next &#8250;</button>`;
    }
    window.reqChangeViolPage = (page) => { const t = Math.ceil(allViolations.length / itemsPerPage); if (page < 1 || page > t) return; violationsCurrentPage = page; renderPaginatedViolations(); };

    window.reqOpenAddViol = () => {
        document.getElementById('req-violationForm')?.reset();
        setCurrentMonth('req-violation-bulan');
        openModal('req-addViolModal');
    };
    window.reqSubmitViol = async () => {
        const form = document.getElementById('req-violationForm'); if (form && !form.checkValidity()) { form.reportValidity(); return; }
        const btn = document.getElementById('req-submit-viol-btn'), orig = btn.innerHTML;
        btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan...';
        try {
            const tRaw = document.getElementById('req-violation-tanggal')?.value;
            const d = new Date(tRaw), fmt = `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
            const res = await callAPI({ action: 'createVehicleViolation', jenis: document.getElementById('req-violation-jenis').value, bulan: document.getElementById('req-violation-bulan').value, unit: document.getElementById('req-violation-unit').value, tanggal: fmt, laporan: document.getElementById('req-violation-laporan').value });
            if (res.success) { if (window.showToast) showToast('Catatan pelanggaran berhasil ditambahkan!', 'success'); closeModal('req-addViolModal'); clearCache(); await loadViolations(true); await loadScores(true); }
            else if (window.showToast) showToast(res.message || 'Gagal', 'error');
        } catch (e) { if (window.showToast) showToast('Gagal: ' + e, 'error'); }
        finally { btn.disabled = false; btn.innerHTML = orig; }
    };
    window.reqOpenEditViol = (idx) => {
        const v = allViolations[idx]; if (!v) return;
        let jenisKode = 'KUNCI';
        if (v.jenis === 'Kealpaan Membersihkan Mobil') jenisKode = 'KEBERSIHAN';
        document.getElementById('req-ev-bulan').value = v.bulan;
        document.getElementById('req-ev-unit').value = v.unit;
        document.getElementById('req-ev-jenis-display').value = v.jenis;
        document.getElementById('req-ev-tanggal').value = v.tanggal;
        document.getElementById('req-ev-laporan').value = v.laporan;
        document.getElementById('req-ev-id').value = v.id || '';
        document.getElementById('req-ev-jenis').value = jenisKode;
        openModal('req-editViolModal');
    };
    window.reqSubmitEditViol = async () => {
        const tanggal = document.getElementById('req-ev-tanggal')?.value.trim();
        const laporan = document.getElementById('req-ev-laporan')?.value.trim();
        if (!tanggal || !laporan) { if (window.showToast) showToast('Tanggal dan laporan harus diisi', 'error'); return; }
        const btn = document.getElementById('req-submit-ev-btn'), orig = btn.innerHTML;
        btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan...';
        try {
            const res = await callAPI({ action: 'updateVehicleViolation', id: document.getElementById('req-ev-id').value, jenis: document.getElementById('req-ev-jenis').value, bulan: document.getElementById('req-ev-bulan').value, unit: document.getElementById('req-ev-unit').value, tanggal, laporan });
            if (res.success) { if (window.showToast) showToast('Catatan berhasil diperbarui!', 'success'); closeModal('req-editViolModal'); clearCache(); await loadViolations(true); await loadScores(true); }
            else if (window.showToast) showToast(res.message || 'Gagal', 'error');
        } catch (e) { if (window.showToast) showToast('Error: ' + e.message, 'error'); }
        finally { btn.disabled = false; btn.innerHTML = orig; }
    };
    window.reqDeleteViol = async (idx) => {
        const v = allViolations[idx]; if (!v) return;
        if (!confirm(`Hapus catatan pelanggaran ini?\n\nUnit: ${v.unit}\nBulan: ${v.bulan}\nTanggal: ${v.tanggal}`)) return;
        let jenisKode = 'KUNCI'; if (v.jenis === 'Kealpaan Membersihkan Mobil') jenisKode = 'KEBERSIHAN';
        try {
            const res = await callAPI({ action: 'deleteVehicleViolation', id: v.id || '', jenis: jenisKode, bulan: v.bulan, unit: v.unit });
            if (res.success) { if (window.showToast) showToast('Catatan berhasil dihapus', 'success'); clearCache(); await loadViolations(true); await loadScores(true); }
            else if (window.showToast) showToast(res.message || 'Gagal', 'error');
        } catch (e) { if (window.showToast) showToast('Gagal: ' + e.message, 'error'); }
    };
    window.reqExportViol = async () => {
        const b = document.getElementById('req-filter-bulan')?.value || '';
        const u = document.getElementById('req-filter-unit')?.value || '';
        const j = document.getElementById('req-filter-jenis')?.value || '';
        if (!confirm('Export catatan ke sheet baru di spreadsheet?')) return;
        if (window.showToast) showToast('Mengekspor data...', 'success');
        let jenisParam = '';
        if (j === 'Kealpaan Pengembalian Kunci') jenisParam = 'KUNCI';
        else if (j === 'Kealpaan Membersihkan Mobil') jenisParam = 'KEBERSIHAN';
        try {
            const res = await callAPI({ action: 'exportVehicleViolationsReport', bulan: b, unit: u, jenis: jenisParam });
            if (res.success) { if (window.showToast) showToast(`Berhasil export ${res.recordCount} catatan!`, 'success'); if (res.url && confirm('Buka spreadsheet di tab baru?')) window.open(res.url, '_blank'); }
            else if (window.showToast) showToast(res.message || 'Gagal', 'error');
        } catch (e) { if (window.showToast) showToast('Gagal export: ' + e, 'error'); }
    };

    // ═══ TAB 3: SCORES ═══════════════════════════════════════
    async function loadScores(forceRefresh = false) {
        try {
            let bulan = document.getElementById('req-filter-score-bulan')?.value || '';
            const mode = document.getElementById('req-score-mode')?.value || 'KUNCI';
            if (!bulan) {
                const mn = ['', 'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
                bulan = mn[new Date().getMonth() + 1];
                const el = document.getElementById('req-filter-score-bulan');
                if (el) el.value = bulan;
            }
            const ck = `${CACHE_KEYS.SCORES}_${bulan}_${mode}`;
            if (!forceRefresh && bulan) { const cached = getFromCache(ck); if (cached) { allScores = cached; renderScores(); showCacheIndicator(); return; } }
            const container = document.getElementById('req-scores-container');
            if (container) container.innerHTML = '<div class="loading"><div class="spinner"></div><p style="margin-top:12px;">Memuat penilaian...</p></div>';
            const data = await callAPI({ action: 'getVehicleScores', bulan, jenis: mode });
            if (data.success) {
                allScores = { sanksi: data.sanksiPerPelanggaran, scores: data.scores };
                const sv = document.getElementById('req-sanksi-value'); if (sv) sv.textContent = `${data.sanksiPerPelanggaran} poin`;
                if (bulan) saveToCache(ck, allScores);
                renderScores();
            } else {
                if (container) container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><p style="color:#ef4444;">Gagal memuat penilaian</p></div>';
            }
        } catch (e) {
            const container = document.getElementById('req-scores-container');
            if (container) container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><p style="color:#ef4444;">${e.message || 'Gagal memuat penilaian'}</p></div>`;
            if (window.showToast) showToast('Gagal memuat penilaian', 'error');
        }
    }
    window.reqLoadScores = (f) => loadScores(f);

    function renderScores() {
        const bulan = document.getElementById('req-filter-score-bulan')?.value || '';
        const mode = document.getElementById('req-score-mode')?.value || 'KUNCI';
        const container = document.getElementById('req-scores-container'); if (!container) return;
        if (!bulan) { container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><p>Pilih bulan untuk melihat penilaian</p></div>'; if (scoreChart) scoreChart.destroy(); if (violationChart) violationChart.destroy(); return; }
        if (!allScores.scores) { container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><p style="color:#ef4444;">Data tidak tersedia</p></div>'; return; }
        const monthScores = allScores.scores.filter(s => s.bulan === bulan);
        if (!monthScores.length) { container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>Tidak ada data untuk bulan ini</p></div>'; if (scoreChart) scoreChart.destroy(); if (violationChart) violationChart.destroy(); return; }
        renderCharts(monthScores, mode);
        const modeLabel = mode === 'KUNCI' ? 'Kealpaan Pengembalian Kunci' : 'Kealpaan Membersihkan Mobil';
        container.innerHTML = `<div style="margin-bottom:16px;padding:12px 16px;background:#f8fafc;border-radius:8px;border:1px solid #f1f5f9;border-left:3px solid #0f172a;">
            <p style="font-size:13px;font-weight:600;color:#1e293b;">Mode Penilaian: ${modeLabel}</p>
        </div>` + '<div class="scores-grid">' + monthScores.map(score => {
            const cls = score.skorAkhir >= 4.5 ? 'score-good' : score.skorAkhir >= 3 ? 'score-warning' : 'score-danger';
            return `<div class="score-card">
                <div class="score-header">
                    <div><div class="score-unit-name">${score.unit}</div><div class="score-month">Bulan ${score.bulan}</div></div>
                    <div class="score-value ${cls}">${score.skorAkhir.toFixed(2)}</div>
                </div>
                <div class="score-details">
                    <div class="score-detail-item"><div class="score-detail-label">Skor Utuh</div><div class="score-detail-value">${score.skorUtuh}</div></div>
                    <div class="score-detail-item"><div class="score-detail-label">Pelanggaran</div><div class="score-detail-value">${score.jumlahPelanggaran}</div></div>
                    <div class="score-detail-item"><div class="score-detail-label">Sanksi</div><div class="score-detail-value" style="color:#ef4444;">-${score.jumlahSanksi.toFixed(2)}</div></div>
                </div>
            </div>`;
        }).join('') + '</div>';
    }

    function renderCharts(monthScores, mode) {
        const units = monthScores.map(s => s.unit.length > 25 ? s.unit.substring(0, 22) + '...' : s.unit);
        const scores = monthScores.map(s => s.skorAkhir);
        const violations = monthScores.map(s => s.jumlahPelanggaran);
        const modeLabel = mode === 'KUNCI' ? 'Pengembalian Kunci' : 'Membersihkan Mobil';
        if (scoreChart) scoreChart.destroy();
        scoreChart = new Chart(document.getElementById('req-scoreChart').getContext('2d'), {
            type: 'bar', data: { labels: units, datasets: [{ label: 'Skor Akhir', data: scores, backgroundColor: scores.map(s => s >= 4.5 ? '#10b981' : s >= 3 ? '#f59e0b' : '#ef4444'), borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: `Mode: ${modeLabel}`, font: { size: 12, weight: 'normal' }, color: '#64748b' } }, scales: { y: { beginAtZero: true, max: 10, ticks: { stepSize: 1 } } } }
        });
        if (violationChart) violationChart.destroy();
        violationChart = new Chart(document.getElementById('req-violationChart').getContext('2d'), {
            type: 'bar', data: { labels: units, datasets: [{ label: 'Jumlah Pelanggaran', data: violations, backgroundColor: '#3b82f6', borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: `Mode: ${modeLabel}`, font: { size: 12, weight: 'normal' }, color: '#64748b' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }

    // ═══ Register & Render HTML ══════════════════════════════
    window.sectionInits = window.sectionInits || {};
    window.sectionInits['requests'] = function () {
        const section = document.getElementById('section-requests');
        if (!section) return;
        section.innerHTML = `
<style>
.btn-action-approve { background:#f0fdf4; color:#166534; border-color:#bbf7d0; }
.btn-action-approve:hover { background:#dcfce7; border-color:#86efac; }
.btn-action-reject  { background:#fff1f2; color:#9f1239; border-color:#fecdd3; }
.btn-action-reject:hover  { background:#ffe4e6; border-color:#fda4af; }
.btn-action-view    { background:#f8fafc; color:#475569; border-color:#e2e8f0; }
.btn-action-view:hover    { background:#f1f5f9; border-color:#cbd5e1; }
.btn-action-edit    { background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe; }
.btn-action-edit:hover    { background:#dbeafe; border-color:#93c5fd; }
.btn-action-delete  { background:#fff1f2; color:#9f1239; border-color:#fecdd3; }
.btn-action-delete:hover  { background:#ffe4e6; border-color:#fda4af; }
.filter-container { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
.section-page-header { margin-bottom:28px; padding-bottom:20px; border-bottom:1px solid #f1f5f9; }
.section-page-title { font-size:22px; font-weight:700; color:#0f172a; margin-bottom:4px; }
.section-page-subtitle { font-size:14px; color:#64748b; }
.score-mode-switcher { display:flex; align-items:center; gap:0; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; background:#f8fafc; }
.score-mode-btn { padding:7px 14px; font-size:13px; font-weight:500; font-family:'Inter',sans-serif; color:#64748b; background:transparent; border:none; cursor:pointer; transition:all 0.15s; white-space:nowrap; border-right:1px solid #e2e8f0; display:flex; align-items:center; gap:5px; }
.score-mode-btn:last-child { border-right:none; }
.score-mode-btn:hover { background:#f1f5f9; color:#374151; }
.score-mode-btn.active { background:#0f172a; color:white; }
</style>

<div class="container">
    <div class="section-page-header">
        <h1 class="section-page-title">Pelayanan Kendaraan Dinas Operasional</h1>
        <p class="section-page-subtitle">Tinjau permintaan, kelola catatan pelanggaran, dan penilaian penggunaan kendaraan dinas</p>
    </div>

    <div class="tabs">
        <button class="tab active" onclick="reqSwitchTab('requests',event)">Permintaan</button>
        <button class="tab" onclick="reqSwitchTab('violations',event)">Catatan Pelanggaran</button>
        <button class="tab" onclick="reqSwitchTab('scores',event)">Penilaian</button>
    </div>
    <div class="tabs-dropdown">
        <select onchange="reqSwitchTabDD(this.value)">
            <option value="requests">Permintaan</option>
            <option value="violations">Catatan Pelanggaran</option>
            <option value="scores">Penilaian</option>
        </select>
    </div>

    <!-- TAB 1: Permintaan -->
    <div id="req-tab-requests" class="tab-content active">
        <div class="stats-grid">
            <div class="stat-card" style="border-left:3px solid #64748b;"><div class="stat-label">Total Permintaan</div><div class="stat-value" id="req-stat-total">0</div></div>
            <div class="stat-card" style="border-left:3px solid #10b981;"><div class="stat-label">Disetujui</div><div class="stat-value" id="req-stat-approved">0</div></div>
            <div class="stat-card" style="border-left:3px solid #f59e0b;"><div class="stat-label">Menunggu</div><div class="stat-value" id="req-stat-pending">0</div></div>
            <div class="stat-card" style="border-left:3px solid #ef4444;"><div class="stat-label">Ditolak</div><div class="stat-value" id="req-stat-rejected">0</div></div>
        </div>
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Daftar Pengajuan Kendaraan Dinas</h2>
                <div class="filter-container">
                    <select class="select-input" id="req-filter-status" onchange="reqApplyFilter()">
                        <option value="">Semua Status</option>
                        <option value="PENDING">Menunggu</option>
                        <option value="APPROVED">Disetujui</option>
                        <option value="REJECTED">Ditolak</option>
                    </select>
                    <input type="text" class="search-input" placeholder="Cari nama atau unit..." id="req-search-input" oninput="reqApplyFilter()">
                    <button onclick="reqLoadRequests(true)" class="btn btn-sm btn-action-view">${ICONS.refresh} Refresh</button>
                </div>
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Nama Pegawai</th><th>Unit Eselon</th><th>Tanggal</th><th>Waktu</th><th>Kendaraan</th><th>Status</th><th>Aksi</th></tr></thead>
                    <tbody id="req-requests-tbody">
                        <tr><td colspan="7" class="loading"><div class="spinner"></div><p style="margin-top:12px;color:#64748b;">Memuat data...</p></td></tr>
                    </tbody>
                </table>
            </div>
            <div id="req-requests-cards"></div>
            <div class="pagination" id="req-requests-pagination"></div>
        </div>
    </div>

    <!-- TAB 2: Catatan Pelanggaran -->
    <div id="req-tab-violations" class="tab-content">
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Catatan Pelanggaran Penggunaan Mobil Dinas</h2>
                <div class="filter-container">
                    <select class="select-input" id="req-filter-bulan" onchange="reqFilterViolations()">
                        <option value="">Semua Bulan</option>
                        <option value="JANUARI">Januari</option><option value="FEBRUARI">Februari</option><option value="MARET">Maret</option><option value="APRIL">April</option>
                        <option value="MEI">Mei</option><option value="JUNI">Juni</option><option value="JULI">Juli</option><option value="AGUSTUS">Agustus</option>
                        <option value="SEPTEMBER">September</option><option value="OKTOBER">Oktober</option><option value="NOVEMBER">November</option><option value="DESEMBER">Desember</option>
                    </select>
                    <select class="select-input" id="req-filter-unit" onchange="reqFilterViolations()">
                        <option value="">Semua Unit</option>
                        <option value="Sekretariat">Sekretariat</option><option value="Bidang Koperasi">Bidang Koperasi</option>
                        <option value="Bidang UKM">Bidang UKM</option><option value="Bidang Usaha Mikro">Bidang Usaha Mikro</option>
                        <option value="Bidang Kewirausahaan">Bidang Kewirausahaan</option>
                        <option value="Balai Layanan Usaha Terpadu KUMKM">BLUT KUMKM</option>
                    </select>
                    <select class="select-input" id="req-filter-jenis" onchange="reqFilterViolations()">
                        <option value="">Semua Jenis</option>
                        <option value="Kealpaan Pengembalian Kunci">Kunci</option>
                        <option value="Kealpaan Membersihkan Mobil">Kebersihan</option>
                    </select>
                    <button onclick="reqExportViol()" class="btn btn-sm btn-action-view">${ICONS.export} Export</button>
                    <button onclick="reqOpenAddViol()" class="btn btn-sm btn-action-edit">${ICONS.plus} Tambah</button>
                    <button onclick="reqLoadViolations(true)" class="btn btn-sm btn-action-view">${ICONS.refresh} Refresh</button>
                </div>
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Bulan</th><th>Unit</th><th>Tanggal</th><th>Jenis</th><th>Laporan</th><th>Aksi</th></tr></thead>
                    <tbody id="req-violations-tbody">
                        <tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8;">Memuat data...</td></tr>
                    </tbody>
                </table>
            </div>
            <div id="req-violations-cards"></div>
            <div class="pagination" id="req-violations-pagination"></div>
        </div>
    </div>

    <!-- TAB 3: Penilaian -->
    <div id="req-tab-scores" class="tab-content">
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Rekapitulasi Penilaian Kendaraan Dinas</h2>
                <div class="filter-container">
                    <div class="score-mode-switcher">
                        <button class="score-mode-btn active" id="req-mode-btn-kunci" onclick="reqSetScoreMode('KUNCI', this)">
                            ${ICONS.car} Pengembalian Kunci
                        </button>
                        <button class="score-mode-btn" id="req-mode-btn-bersih" onclick="reqSetScoreMode('BERSIH', this)">
                            ${ICONS.car} Kebersihan Mobil
                        </button>
                    </div>
                    <input type="hidden" id="req-score-mode" value="KUNCI">
                    <select class="select-input" id="req-filter-score-bulan" onchange="reqLoadScores(false)">
                        <option value="">Pilih Bulan</option>
                        <option value="JANUARI">Januari</option><option value="FEBRUARI">Februari</option><option value="MARET">Maret</option><option value="APRIL">April</option>
                        <option value="MEI">Mei</option><option value="JUNI">Juni</option><option value="JULI">Juli</option><option value="AGUSTUS">Agustus</option>
                        <option value="SEPTEMBER">September</option><option value="OKTOBER">Oktober</option><option value="NOVEMBER">November</option><option value="DESEMBER">Desember</option>
                    </select>
                    <button onclick="reqLoadScores(true)" class="btn btn-sm btn-action-view">${ICONS.refresh} Refresh</button>
                </div>
            </div>
            <div class="card-content">
                <div style="margin-bottom:24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #f1f5f9;">
                    <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;margin-bottom:4px;">Sanksi per Pelanggaran</p>
                    <p style="font-size:22px;font-weight:700;color:#0f172a;" id="req-sanksi-value">0.1 poin</p>
                </div>
                <div class="charts-grid">
                    <div class="card" style="margin:0;">
                        <div class="card-header" style="padding:16px;"><h3 style="font-size:14px;font-weight:600;color:#374151;">Skor Akhir Per Unit</h3></div>
                        <div class="card-content"><div class="chart-container"><canvas id="req-scoreChart"></canvas></div></div>
                    </div>
                    <div class="card" style="margin:0;">
                        <div class="card-header" style="padding:16px;"><h3 style="font-size:14px;font-weight:600;color:#374151;">Jumlah Pelanggaran Per Unit</h3></div>
                        <div class="card-content"><div class="chart-container"><canvas id="req-violationChart"></canvas></div></div>
                    </div>
                </div>
                <div id="req-scores-container">
                    <div class="empty-state"><div class="empty-state-icon">📊</div><p>Pilih bulan untuk melihat penilaian</p></div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- MODALS -->
<div id="req-detailModal" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal">
        <div class="modal-header"><h2 class="modal-title">Detail Pengajuan Kendaraan Dinas</h2></div>
        <div class="modal-content" id="req-detail-body"></div>
        <div class="modal-footer"><button onclick="document.getElementById('req-detailModal').style.display='none'" class="btn" style="flex:1;">Tutup</button></div>
    </div>
</div>

<div id="req-approveModal" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal">
        <div class="modal-header"><h2 class="modal-title">Setujui Pengajuan Kendaraan Dinas</h2></div>
        <div class="modal-content">
            <div class="form-group">
                <label class="input-label">Pilih Nomor Kendaraan</label>
                <select class="form-input" id="req-vehicle-select">
                    <option value="">Pilih Nomor Kendaraan</option>
                    <option value="AB 1027 AV">AB 1027 AV</option>
                    <option value="AB 1869 UA">AB 1869 UA</option>
                    <option value="AB 1147 UH">AB 1147 UH</option>
                    <option value="AB 1340 UH">AB 1340 UH</option>
                    <option value="AB 1530 UH">AB 1530 UH</option>
                    <option value="AB 1067 IA">AB 1067 IA</option>
                </select>
            </div>
        </div>
        <div class="modal-footer">
            <button onclick="document.getElementById('req-approveModal').style.display='none'" class="btn" style="flex:1;">Batal</button>
            <button onclick="reqConfirmApprove()" class="btn btn-action-approve" style="flex:1;" id="req-confirm-approve-btn">${ICONS.check} Setujui</button>
        </div>
    </div>
</div>

<div id="req-editModal" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal">
        <div class="modal-header"><h2 class="modal-title">Edit Pengajuan Kendaraan Dinas</h2></div>
        <div class="modal-content">
            <div class="info-box">
                <p class="info-box-label">Info (tidak dapat diubah)</p>
                <div class="form-group" style="margin-bottom:8px;"><label class="input-label">Nama Pegawai</label><input type="text" class="form-input" id="req-edit-nama" readonly style="background:#f0f4f8;cursor:not-allowed;"></div>
                <div class="form-group" style="margin-bottom:8px;"><label class="input-label">Unit Eselon</label><input type="text" class="form-input" id="req-edit-unit" readonly style="background:#f0f4f8;cursor:not-allowed;"></div>
                <div class="form-group" style="margin-bottom:0;"><label class="input-label">Tanggal Penggunaan</label><input type="text" class="form-input" id="req-edit-tanggal" readonly style="background:#f0f4f8;cursor:not-allowed;"></div>
            </div>
            <div class="form-group">
                <label class="input-label">Nomor Kendaraan</label>
                <select class="form-input" id="req-edit-nomor-kendaraan">
                    <option value="">Pilih Nomor Kendaraan</option>
                    <option value="AB 1027 AV">AB 1027 AV</option><option value="AB 1869 UA">AB 1869 UA</option>
                    <option value="AB 1147 UH">AB 1147 UH</option><option value="AB 1340 UH">AB 1340 UH</option>
                    <option value="AB 1530 UH">AB 1530 UH</option><option value="AB 1067 IA">AB 1067 IA</option>
                </select>
            </div>
            <div class="form-group">
                <label class="input-label">Status Pengajuan</label>
                <select class="form-input" id="req-edit-status">
                    <option value="pending">Menunggu</option>
                    <option value="approved">Disetujui</option>
                    <option value="rejected">Ditolak</option>
                </select>
            </div>
            <input type="hidden" id="req-edit-id">
        </div>
        <div class="modal-footer">
            <button onclick="document.getElementById('req-editModal').style.display='none'" class="btn" style="flex:1;">Batal</button>
            <button onclick="reqSubmitEdit()" class="btn btn-action-edit" style="flex:1;" id="req-submit-edit-btn">Simpan Perubahan</button>
        </div>
    </div>
</div>

<div id="req-addViolModal" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal">
        <div class="modal-header"><h2 class="modal-title">Tambah Catatan Pelanggaran</h2></div>
        <div class="modal-content">
            <form id="req-violationForm">
                <div class="form-group">
                    <label class="input-label">Jenis Pelanggaran</label>
                    <select class="form-input" id="req-violation-jenis" required>
                        <option value="">Pilih Jenis</option>
                        <option value="KUNCI">Kealpaan Pengembalian Kunci Mobil</option>
                        <option value="KEBERSIHAN">Kealpaan Membersihkan Mobil</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="input-label">Bulan</label>
                    <select class="form-input" id="req-violation-bulan" required>
                        <option value="">Pilih Bulan</option>
                        <option value="JANUARI">Januari</option><option value="FEBRUARI">Februari</option><option value="MARET">Maret</option><option value="APRIL">April</option>
                        <option value="MEI">Mei</option><option value="JUNI">Juni</option><option value="JULI">Juli</option><option value="AGUSTUS">Agustus</option>
                        <option value="SEPTEMBER">September</option><option value="OKTOBER">Oktober</option><option value="NOVEMBER">November</option><option value="DESEMBER">Desember</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="input-label">Unit</label>
                    <select class="form-input" id="req-violation-unit" required>
                        <option value="">Pilih Unit</option>
                        <option value="Sekretariat">Sekretariat</option><option value="Bidang Koperasi">Bidang Koperasi</option>
                        <option value="Bidang UKM">Bidang UKM</option><option value="Bidang Usaha Mikro">Bidang Usaha Mikro</option>
                        <option value="Bidang Kewirausahaan">Bidang Kewirausahaan</option>
                        <option value="Balai Layanan Usaha Terpadu KUMKM">Balai Layanan Usaha Terpadu KUMKM</option>
                    </select>
                </div>
                <div class="form-group"><label class="input-label">Tanggal Penggunaan</label><input type="date" class="form-input" id="req-violation-tanggal" required></div>
                <div class="form-group"><label class="input-label">Laporan</label><textarea class="form-textarea" id="req-violation-laporan" placeholder="Deskripsikan pelanggaran..." required></textarea></div>
            </form>
        </div>
        <div class="modal-footer">
            <button onclick="document.getElementById('req-addViolModal').style.display='none'" class="btn" style="flex:1;">Batal</button>
            <button onclick="reqSubmitViol()" class="btn btn-action-edit" style="flex:1;" id="req-submit-viol-btn">Simpan</button>
        </div>
    </div>
</div>

<div id="req-editViolModal" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal">
        <div class="modal-header"><h2 class="modal-title">Edit Catatan Pelanggaran</h2></div>
        <div class="modal-content">
            <div class="info-box">
                <p class="info-box-label">Info (tidak dapat diubah)</p>
                <div style="display:flex;gap:12px;margin-bottom:8px;">
                    <div style="flex:1;"><label class="input-label">Bulan</label><input type="text" class="form-input" id="req-ev-bulan" readonly style="background:#f0f4f8;cursor:not-allowed;"></div>
                    <div style="flex:1;"><label class="input-label">Unit</label><input type="text" class="form-input" id="req-ev-unit" readonly style="background:#f0f4f8;cursor:not-allowed;"></div>
                </div>
                <div><label class="input-label">Jenis Pelanggaran</label><input type="text" class="form-input" id="req-ev-jenis-display" readonly style="background:#f0f4f8;cursor:not-allowed;"></div>
            </div>
            <div class="form-group" style="margin-top:16px;"><label class="input-label">Tanggal</label><input type="date" class="form-input" id="req-ev-tanggal"></div>
            <div class="form-group"><label class="input-label">Laporan</label><textarea class="form-textarea" id="req-ev-laporan" placeholder="Deskripsikan pelanggaran..."></textarea></div>
            <input type="hidden" id="req-ev-id">
            <input type="hidden" id="req-ev-jenis">
        </div>
        <div class="modal-footer">
            <button onclick="document.getElementById('req-editViolModal').style.display='none'" class="btn" style="flex:1;">Batal</button>
            <button onclick="reqSubmitEditViol()" class="btn btn-action-edit" style="flex:1;" id="req-submit-ev-btn">Simpan Perubahan</button>
        </div>
    </div>
</div>`;

        window.reqSetScoreMode = function (mode, btnEl) {
            document.getElementById('req-score-mode').value = mode;
            document.querySelectorAll('.score-mode-btn').forEach(b => b.classList.remove('active'));
            btnEl.classList.add('active');
            loadScores(false);
        };

        loadRequests();
    };
})();