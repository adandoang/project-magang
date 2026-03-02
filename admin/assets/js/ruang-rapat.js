// ============================================================
// ruang-rapat.js — Ruang Rapat section (SPA)
// Admin Panel — Dinas Koperasi UKM
// ============================================================
(function () {
    'use strict';

    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyfAJcjPDuKqwKk8A46z4quyaeV9trBLAuDtdqhQqX0CIZke6fgN1sptcnS0EURuF6ksg/exec';
    const CACHE_DURATION = 5 * 60 * 1000;
    const CACHE_KEYS = { REQUESTS: 'ruang_rapat_requests', VIOLATIONS: 'ruang_rapat_violations', SCORES: 'ruang_rapat_scores' };

    let masterRequests = [], allRequests = [];
    let masterViolations = [], allViolations = [];
    let allScores = {};
    let scoreChart = null, violationChart = null;
    let currentApproveId = null, currentEditId = null;
    let currentEditViolationId = null, currentEditViolationBulan = null, currentEditViolationUnit = null;
    let requestsCurrentPage = 1, violationsCurrentPage = 1;
    const itemsPerPage = 10;

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

    // ── Cache ─────────────────────────────────────────────────
    function saveToCache(key, data) { try { localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() })); } catch (e) { } }
    function getFromCache(key) {
        try {
            const c = JSON.parse(localStorage.getItem(key) || 'null');
            if (!c) return null;
            if (Date.now() - c.timestamp < CACHE_DURATION) return c.data;
            localStorage.removeItem(key); return null;
        } catch (e) { return null; }
    }
    function clearCache() { Object.values(CACHE_KEYS).forEach(k => localStorage.removeItem(k)); }

    // ── API (JSONP) ─────────────────────────────────────────
    function fetchAPI(action, params = {}) {
        return new Promise((resolve, reject) => {
            const cb = 'jsonp_rr_' + Date.now() + '_' + (Math.random() * 1e6 | 0);
            window[cb] = data => {
                delete window[cb]; document.getElementById(cb)?.remove();
                if (data && data.success === false) reject(new Error(data.message || 'API error'));
                else resolve(data);
            };
            const qs = new URLSearchParams({ action, callback: cb, ...params }).toString();
            const s = document.createElement('script');
            s.id = cb;
            s.onerror = () => { delete window[cb]; reject(new Error('Network error')); };
            setTimeout(() => { if (window[cb]) { delete window[cb]; s.remove(); reject(new Error('Request timeout')); } }, 20000);
            s.src = `${APPS_SCRIPT_URL}?${qs}`;
            document.head.appendChild(s);
        });
    }

    // ── Helpers ───────────────────────────────────────────────
    function createStatusBadge(status) {
        const s = (status || '').toLowerCase();
        if (s === 'approved') return '<span class="badge badge-approved">Disetujui</span>';
        if (s === 'completed' || s === 'selesai') return '<span class="badge badge-completed">Selesai</span>';
        return '<span class="badge badge-pending">Menunggu</span>';
    }
    function openModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'flex'; }
    function closeModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }

    // ── Tab switch ────────────────────────────────────────────
    function rrSwitchTab(tabName, btn) {
        document.querySelectorAll('#section-ruang-rapat .tab').forEach(t => t.classList.remove('active'));
        if (btn) btn.classList.add('active');
        else { const b = document.getElementById(`rr-tab-btn-${tabName}`); if (b) b.classList.add('active'); }
        const dropdown = document.getElementById('rr-mobile-tab-select');
        if (dropdown) dropdown.value = tabName;
        document.querySelectorAll('#section-ruang-rapat .tab-content').forEach(tc => tc.classList.remove('active'));
        const el = document.getElementById(`rr-tab-${tabName}`); if (el) el.classList.add('active');
        if (tabName === 'requests') loadRoomRequests();
        if (tabName === 'violations') loadViolations();
        if (tabName === 'scores') loadScores();
    }
    window.rrSwitchTab = rrSwitchTab;

    // ═══ TAB 1: PERMINTAAN ═══════════════════════════════════
    async function loadRoomRequests(forceRefresh = false) {
        const tbody = document.getElementById('rr-requests-tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="loading"><div class="spinner"></div><p style="margin-top:12px;color:#64748b;">Memuat data...</p></td></tr>`;
        try {
            if (!forceRefresh) {
                const cached = getFromCache(CACHE_KEYS.REQUESTS);
                if (cached) { masterRequests = cached; allRequests = [...masterRequests]; requestsCurrentPage = 1; renderPaginatedRequests(); return; }
            }
            const response = await fetchAPI('getRoomRequests');
            masterRequests = Array.isArray(response) ? response : (response?.data || []);
            allRequests = [...masterRequests]; requestsCurrentPage = 1;
            saveToCache(CACHE_KEYS.REQUESTS, masterRequests);
            renderPaginatedRequests();
        } catch (err) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#ef4444;">Gagal memuat data. <button onclick="rrLoadRoomRequests(true)" class="btn btn-sm" style="margin-left:8px;">Coba Lagi</button></td></tr>`;
            if (window.showToast) showToast('Gagal memuat data permintaan: ' + err.message, 'error');
        }
    }
    window.rrLoadRoomRequests = loadRoomRequests;
    window.rrLoadViolations = loadViolations;

    function updateStats() {
        const t = document.getElementById('rr-stat-total');
        const a = document.getElementById('rr-stat-approved');
        const p = document.getElementById('rr-stat-pending');
        const c = document.getElementById('rr-stat-completed');
        if (t) t.textContent = masterRequests.length;
        if (a) a.textContent = masterRequests.filter(r => (r.status || '').toUpperCase() === 'APPROVED').length;
        if (p) p.textContent = masterRequests.filter(r => (r.status || '').toUpperCase() === 'PENDING').length;
        if (c) c.textContent = masterRequests.filter(r => (r.status || '').toUpperCase() === 'COMPLETED').length;
    }

    function renderPaginatedRequests() {
        const tbody = document.getElementById('rr-requests-tbody');
        const cards = document.getElementById('rr-requests-cards');
        const pgn = document.getElementById('rr-requests-pagination');
        if (!tbody) return;
        updateStats();

        if (allRequests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8;">Tidak ada permintaan</td></tr>';
            if (cards) cards.innerHTML = '<div style="text-align:center;padding:2rem;color:#64748b;">Data tidak ditemukan</div>';
            if (pgn) pgn.innerHTML = ''; return;
        }
        const totalPages = Math.ceil(allRequests.length / itemsPerPage);
        const start = (requestsCurrentPage - 1) * itemsPerPage;
        const items = allRequests.slice(start, start + itemsPerPage);

        tbody.innerHTML = items.map(req => {
            const s = (req.status || '').toLowerCase();
            return `<tr>
                <td style="font-weight:500;font-family:monospace;font-size:12px;color:#64748b;">#${String(req.id).substring(0, 6)}</td>
                <td style="font-weight:500;">${req.nama_pemohon || '—'}</td>
                <td>${req.tanggal || '—'}</td>
                <td>${req.waktu_mulai || '—'} – ${req.waktu_selesai || '—'}</td>
                <td>${req.namaRuang || '-'}</td>
                <td style="min-width: 90px; text-align: center;">
                    ${s === 'pending' ? `<div class="btn-icon-group" style="margin: 0;">
                        <button onclick="rrOpenApprove('${req.id}')" class="btn-icon btn-icon-approve" title="Setujui">${ICONS.check}</button>
                        <button onclick="rrQuickReject('${req.id}')" class="btn-icon btn-icon-reject" title="Tolak">${ICONS.x}</button>
                    </div>` : createStatusBadge(req.status)}
                </td>
                <td>
                    <div class="action-buttons">
                        <div class="btn-icon-group">
                            ${s === 'approved' ? `<button onclick="rrMarkAsCompleted('${req.id}', this)" class="btn-icon btn-icon-complete" title="Selesai">${ICONS.checkCircle}</button>` : ''}
                            <button onclick="rrViewDetail('${req.id}')" class="btn-icon btn-icon-view" title="Detail">${ICONS.eye}</button>
                            <button onclick="rrOpenEdit('${req.id}')" class="btn-icon btn-icon-edit" title="Edit">${ICONS.edit}</button>
                            <button onclick="rrDeleteRequest('${req.id}')" class="btn-icon btn-icon-delete" title="Hapus">${ICONS.trash}</button>
                        </div>
                    </div>
                </td>
            </tr>`;
        }).join('');

        if (cards) cards.innerHTML = items.map(req => {
            const s = (req.status || '').toLowerCase();
            return `<div class="requests-card">
                <div class="requests-card-header">
                    <div style="flex:1;">
                        <div class="requests-card-title">${req.nama_pemohon || '—'}</div>
                        <div class="requests-card-subtitle" style="font-family:monospace;">#${String(req.id).substring(0, 6)}</div>
                    </div>
                    ${s === 'pending' ? `<div class="btn-icon-group" style="margin: 0;">
                        <button onclick="rrOpenApprove('${req.id}')" class="btn-icon btn-icon-approve" title="Setujui">${ICONS.check}</button>
                        <button onclick="rrQuickReject('${req.id}')" class="btn-icon btn-icon-reject" title="Tolak">${ICONS.x}</button>
                    </div>` : createStatusBadge(req.status)}
                </div>
                <div class="requests-card-body">
                    <div class="requests-card-row"><span class="requests-card-label">Tanggal</span><span class="requests-card-value">${req.tanggal || '—'}</span></div>
                    <div class="requests-card-row"><span class="requests-card-label">Waktu</span><span class="requests-card-value">${req.waktu_mulai || '—'} – ${req.waktu_selesai || '—'}</span></div>
                    <div class="requests-card-row"><span class="requests-card-label">Ruangan</span><span class="requests-card-value">${req.namaRuang || '-'}</span></div>
                    <div class="requests-card-row"><span class="requests-card-label">Keperluan</span><span class="requests-card-value">${req.kegiatan || req.keperluan || '—'}</span></div>
                </div>
                <div class="requests-card-footer">
                    <div class="action-buttons" style="justify-content:flex-end;">
                        <div class="btn-icon-group">
                            ${s === 'approved' ? `<button onclick="rrMarkAsCompleted('${req.id}', this)" class="btn-icon btn-icon-complete" title="Selesai">${ICONS.checkCircle}</button>` : ''}
                            <button onclick="rrViewDetail('${req.id}')" class="btn-icon btn-icon-view" title="Detail">${ICONS.eye}</button>
                            <button onclick="rrOpenEdit('${req.id}')" class="btn-icon btn-icon-edit" title="Edit">${ICONS.edit}</button>
                            <button onclick="rrDeleteRequest('${req.id}')" class="btn-icon btn-icon-delete" title="Hapus">${ICONS.trash}</button>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');

        if (pgn) pgn.innerHTML = `
            <button onclick="rrChangeReqPage(${requestsCurrentPage - 1})" ${requestsCurrentPage === 1 ? 'disabled' : ''}>&#8249; Prev</button>
            <span class="pagination-info">Halaman ${requestsCurrentPage} dari ${totalPages} (${allRequests.length} data)</span>
            <button onclick="rrChangeReqPage(${requestsCurrentPage + 1})" ${requestsCurrentPage === totalPages ? 'disabled' : ''}>Next &#8250;</button>`;
    }
    window.rrChangeReqPage = (page) => { const t = Math.ceil(allRequests.length / itemsPerPage); if (page < 1 || page > t) return; requestsCurrentPage = page; renderPaginatedRequests(); };
    window.rrSearchRequests = () => {
        const term = (document.getElementById('rr-search-requests')?.value || '').toLowerCase();
        allRequests = masterRequests.filter(r => (r.nama_pemohon || '').toLowerCase().includes(term) || (r.kegiatan || '').toLowerCase().includes(term) || (r.keperluan || '').toLowerCase().includes(term));
        requestsCurrentPage = 1; renderPaginatedRequests();
    };

    window.rrOpenApprove = (id) => { currentApproveId = id; const el = document.getElementById('rr-room-select'); if (el) el.value = ''; openModal('rr-approveModal'); };
    window.rrConfirmApprove = async () => {
        const ruang = document.getElementById('rr-room-select')?.value;
        if (!ruang) { if (window.showToast) showToast('Pilih ruang rapat terlebih dahulu', 'error'); return; }
        const btn = document.getElementById('rr-confirm-approve-btn'), orig = btn.innerHTML;
        btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyetujui...';
        try {
            const res = await fetchAPI('updateRoomRequest', { id: currentApproveId, status: 'APPROVED', namaRuang: ruang });
            if (res.success) { if (window.showToast) showToast('Permintaan disetujui: ' + ruang, 'success'); closeModal('rr-approveModal'); clearCache(); await loadRoomRequests(true); }
            else if (window.showToast) showToast(res.message || 'Gagal menyetujui', 'error');
        } catch (e) { if (window.showToast) showToast('Gagal: ' + e.message, 'error'); }
        finally { btn.disabled = false; btn.innerHTML = orig; }
    };
    window.rrQuickReject = async (id) => {
        if (!confirm('Tolak permintaan ini?')) return;
        try {
            const res = await fetchAPI('updateRoomRequest', { id, status: 'REJECTED' });
            if (res.success) { if (window.showToast) showToast('Permintaan ditolak', 'success'); clearCache(); await loadRoomRequests(true); }
            else if (window.showToast) showToast(res.message || 'Gagal', 'error');
        } catch (e) { if (window.showToast) showToast('Gagal: ' + e.message, 'error'); }
    };
    window.rrDeleteRequest = async (id) => {
        if (!confirm('Hapus permintaan ini? Tindakan tidak dapat dibatalkan.')) return;
        try {
            const res = await fetchAPI('deleteRoomRequest', { id });
            if (res.success) { if (window.showToast) showToast('Permintaan berhasil dihapus', 'success'); clearCache(); await loadRoomRequests(true); }
            else if (window.showToast) showToast(res.message || 'Gagal', 'error');
        } catch (e) { if (window.showToast) showToast('Gagal: ' + e.message, 'error'); }
    };
    window.rrMarkAsCompleted = async (id, btnEl) => {
        if (!confirm('Tandai permintaan ini sebagai selesai?')) return;
        const orig = btnEl.innerHTML; btnEl.disabled = true; btnEl.innerHTML = '<span class="spinner spinner-sm"></span>';
        try {
            const res = await fetchAPI('updateRoomRequest', { id, status: 'COMPLETED' });
            if (res.success) { if (window.showToast) showToast('Status diperbarui menjadi Selesai', 'success'); clearCache(); await loadRoomRequests(true); }
            else { if (window.showToast) showToast(res.message || 'Gagal', 'error'); btnEl.disabled = false; btnEl.innerHTML = orig; }
        } catch (e) { if (window.showToast) showToast('Gagal: ' + e.message, 'error'); btnEl.disabled = false; btnEl.innerHTML = orig; }
    };
    window.rrOpenEdit = (id) => {
        const req = allRequests.find(r => String(r.id) === String(id)); if (!req) return;
        currentEditId = id;
        document.getElementById('rr-edit-room').value = req.namaRuang || '';
        document.getElementById('rr-edit-status').value = req.status || 'PENDING';
        openModal('rr-editModal');
    };
    window.rrSubmitEdit = async () => {
        const btn = document.getElementById('rr-submit-edit-btn'), orig = btn.innerHTML;
        btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan...';
        try {
            const res = await fetchAPI('updateRoomRequest', { id: currentEditId, status: document.getElementById('rr-edit-status').value, namaRuang: document.getElementById('rr-edit-room').value });
            if (res.success) { if (window.showToast) showToast('Permintaan berhasil diperbarui', 'success'); closeModal('rr-editModal'); clearCache(); await loadRoomRequests(true); }
            else if (window.showToast) showToast(res.message || 'Gagal memperbarui', 'error');
        } catch (e) { if (window.showToast) showToast('Gagal: ' + e.message, 'error'); }
        finally { btn.disabled = false; btn.innerHTML = orig; }
    };
    window.rrViewDetail = (id) => {
        const req = allRequests.find(r => String(r.id) === String(id)); if (!req) return;
        const el = document.getElementById('rr-modal-body');
        if (el) el.innerHTML = `
            <div class="info-grid">
                <div class="info-item"><span class="input-label">No. Booking</span><p><strong>#${req.id}</strong></p></div>
                <div class="info-item"><span class="input-label">Status</span><div style="margin-top:4px;">${createStatusBadge(req.status)}</div></div>
            </div>
            <hr style="margin:16px 0;border:0;border-top:1px solid #f1f5f9;">
            <div class="info-grid">
                <div class="info-item"><span class="input-label">Nama Pemohon</span><p>${req.nama_pemohon || '—'}</p></div>
                <div class="info-item"><span class="input-label">Unit Kerja</span><p>${req.unit_eselon || '—'}</p></div>
                <div class="info-item"><span class="input-label">Tanggal</span><p>${req.tanggal || '—'}</p></div>
                <div class="info-item"><span class="input-label">Waktu</span><p>${req.waktu_mulai || '—'} s/d ${req.waktu_selesai || '—'}</p></div>
            </div>
            <div class="info-item" style="margin-top:16px;">
                <span class="input-label">Ruang Rapat</span>
                <div style="margin-top:6px;padding:12px;background:#f8fafc;border-radius:6px;font-weight:600;border:1px solid #f1f5f9;">${req.namaRuang || 'Belum Ditentukan'}</div>
            </div>
            <div class="info-item" style="margin-top:16px;">
                <span class="input-label">Agenda / Kegiatan</span>
                <div style="margin-top:6px;padding:12px;background:#f8fafc;border-radius:6px;border:1px solid #f1f5f9;">${req.kegiatan || req.keperluan || '—'}</div>
            </div>
            <div class="info-item" style="margin-top:16px;">
                <span class="input-label">Jumlah Peserta</span>
                <p>${req.jumlah_peserta || '0'} Orang</p>
            </div>`;
        openModal('rr-detailModal');
    };

    // ═══ TAB 2: PELANGGARAN ══════════════════════════════════
    async function loadViolations(forceRefresh = false) {
        const tbody = document.getElementById('rr-violations-tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="loading"><div class="spinner"></div><p style="margin-top:12px;color:#64748b;">Memuat data...</p></td></tr>`;
        try {
            if (!forceRefresh) {
                const cached = getFromCache(CACHE_KEYS.VIOLATIONS);
                if (cached) { masterViolations = cached; allViolations = [...masterViolations]; violationsCurrentPage = 1; renderPaginatedViolations(); return; }
            }
            const res = await fetchAPI('getRoomViolations');
            masterViolations = Array.isArray(res) ? res : (res?.data || []);
            allViolations = [...masterViolations]; violationsCurrentPage = 1;
            saveToCache(CACHE_KEYS.VIOLATIONS, masterViolations);
            renderPaginatedViolations();
        } catch (e) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#ef4444;">Gagal memuat data. <button onclick="rrLoadViolations(true)" class="btn btn-sm" style="margin-left:8px;">Coba Lagi</button></td></tr>`;
            if (window.showToast) showToast('Gagal memuat data pelanggaran: ' + e.message, 'error');
        }
    }
    window.rrFilterViolations = () => {
        const b = document.getElementById('rr-filter-bulan')?.value || '';
        const u = document.getElementById('rr-filter-unit')?.value || '';
        allViolations = masterViolations.filter(v => (!b || v.bulan === b) && (!u || v.unit === u));
        violationsCurrentPage = 1; renderPaginatedViolations();
    };

    function renderPaginatedViolations() {
        const tbody = document.getElementById('rr-violations-tbody');
        const cards = document.getElementById('rr-violations-cards');
        const pgn = document.getElementById('rr-violations-pagination');
        if (!tbody) return;
        if (!allViolations.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">Tidak ada catatan pelanggaran</td></tr>';
            if (cards) cards.innerHTML = '<div style="text-align:center;padding:2rem;color:#64748b;">Data tidak ditemukan</div>';
            if (pgn) pgn.innerHTML = ''; return;
        }
        const t = Math.ceil(allViolations.length / itemsPerPage);
        const start = (violationsCurrentPage - 1) * itemsPerPage;
        const items = allViolations.slice(start, start + itemsPerPage);

        tbody.innerHTML = items.map(v => `<tr>
            <td>${v.bulan || '—'}</td>
            <td>${v.unit || '—'}</td>
            <td>${v.tanggal || '—'}</td>
            <td>${v.namaRuang || '—'}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${v.laporan || ''}">${v.laporan || '—'}</td>
            <td>
                <div class="action-buttons">
                    <button onclick='rrOpenEditViol(${JSON.stringify(v).replace(/'/g, "&#39;")})' class="btn btn-sm btn-action-edit">${ICONS.edit} Edit</button>
                    <button onclick="rrDeleteViol('${v.id}','${v.bulan}','${v.unit}')" class="btn btn-sm btn-action-delete">${ICONS.trash}</button>
                </div>
            </td>
        </tr>`).join('');

        if (cards) cards.innerHTML = items.map(v => `<div class="violation-card">
            <div class="violation-card-header">
                <div>
                    <div class="violation-card-title">${v.unit || '—'}</div>
                    <div class="violation-card-subtitle">Bulan ${v.bulan || '—'}</div>
                </div>
            </div>
            <div class="violation-card-body">
                <div class="violation-card-item"><div class="violation-card-label">Tanggal</div><div class="violation-card-value">${v.tanggal || '—'}</div></div>
                <div class="violation-card-item"><div class="violation-card-label">Nama Ruang</div><div class="violation-card-value">${v.namaRuang || '—'}</div></div>
                <div class="violation-card-item" style="grid-column:1/-1"><div class="violation-card-label">Laporan</div><div class="violation-card-value">${v.laporan || '—'}</div></div>
            </div>
            <div class="violation-card-footer" style="display:flex;gap:8px;">
                <button onclick='rrOpenEditViol(${JSON.stringify(v).replace(/'/g, "&#39;")})' class="btn btn-sm btn-action-edit" style="flex:1;">${ICONS.edit} Edit</button>
                <button onclick="rrDeleteViol('${v.id}','${v.bulan}','${v.unit}')" class="btn btn-sm btn-action-delete" style="flex:1;">${ICONS.trash} Hapus</button>
            </div>
        </div>`).join('');

        if (pgn) pgn.innerHTML = `
            <button onclick="rrChangeViolPage(${violationsCurrentPage - 1})" ${violationsCurrentPage === 1 ? 'disabled' : ''}>&#8249; Prev</button>
            <span class="pagination-info">Halaman ${violationsCurrentPage} dari ${t} (${allViolations.length} data)</span>
            <button onclick="rrChangeViolPage(${violationsCurrentPage + 1})" ${violationsCurrentPage === t ? 'disabled' : ''}>Next &#8250;</button>`;
    }
    window.rrChangeViolPage = (p) => { const t = Math.ceil(allViolations.length / itemsPerPage); if (p < 1 || p > t) return; violationsCurrentPage = p; renderPaginatedViolations(); };

    window.rrOpenAddViol = () => { document.getElementById('rr-violationForm')?.reset(); openModal('rr-addViolationModal'); };
    window.rrSubmitViol = async () => {
        const form = document.getElementById('rr-violationForm'); if (form && !form.checkValidity()) { form.reportValidity(); return; }
        const btn = document.getElementById('rr-submit-violation-btn'), orig = btn.innerHTML;
        btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan...';
        try {
            const d = new Date(document.getElementById('rr-violation-tanggal').value);
            const res = await fetchAPI('createRoomViolation', { bulan: document.getElementById('rr-violation-bulan').value, unit: document.getElementById('rr-violation-unit').value, tanggal: `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`, namaRuang: document.getElementById('rr-violation-ruang').value, laporan: document.getElementById('rr-violation-laporan').value });
            if (res.success) { if (window.showToast) showToast('Catatan berhasil ditambahkan', 'success'); closeModal('rr-addViolationModal'); clearCache(); await loadViolations(true); await loadScores(true); }
            else if (window.showToast) showToast(res.message || 'Gagal menambahkan', 'error');
        } catch (e) { if (window.showToast) showToast('Gagal: ' + e.message, 'error'); }
        finally { btn.disabled = false; btn.innerHTML = orig; }
    };
    window.rrOpenEditViol = (v) => {
        currentEditViolationId = v.id; currentEditViolationBulan = v.bulan; currentEditViolationUnit = v.unit;
        const pts = (v.tanggal || '').split('-');
        document.getElementById('rr-edit-violation-tanggal').value = pts.length === 3 ? `${pts[2]}-${pts[1].padStart(2, '0')}-${pts[0].padStart(2, '0')}` : '';
        document.getElementById('rr-edit-violation-ruang').value = v.namaRuang || '';
        document.getElementById('rr-edit-violation-laporan').value = v.laporan || '';
        openModal('rr-editViolationModal');
    };
    window.rrSubmitEditViol = async () => {
        const form = document.getElementById('rr-editViolationForm'); if (form && !form.checkValidity()) { form.reportValidity(); return; }
        const btn = document.getElementById('rr-submit-edit-violation-btn'), orig = btn.innerHTML;
        btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan...';
        try {
            const d = new Date(document.getElementById('rr-edit-violation-tanggal').value);
            const res = await fetchAPI('updateRoomViolation', { id: currentEditViolationId, bulan: currentEditViolationBulan, unit: currentEditViolationUnit, tanggal: `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`, namaRuang: document.getElementById('rr-edit-violation-ruang').value, laporan: document.getElementById('rr-edit-violation-laporan').value });
            if (res.success) { if (window.showToast) showToast('Catatan berhasil diupdate', 'success'); closeModal('rr-editViolationModal'); clearCache(); await loadViolations(true); await loadScores(true); }
            else if (window.showToast) showToast(res.message || 'Gagal update', 'error');
        } catch (e) { if (window.showToast) showToast('Gagal: ' + e.message, 'error'); }
        finally { btn.disabled = false; btn.innerHTML = orig; }
    };
    window.rrDeleteViol = async (id, b, u) => {
        if (!confirm('Hapus catatan pelanggaran ini?')) return;
        try {
            const res = await fetchAPI('deleteRoomViolation', { id, bulan: b, unit: u });
            if (res.success) { if (window.showToast) showToast('Catatan berhasil dihapus', 'success'); clearCache(); await loadViolations(true); await loadScores(true); }
            else if (window.showToast) showToast(res.message || 'Gagal menghapus', 'error');
        } catch (e) { if (window.showToast) showToast('Gagal: ' + e.message, 'error'); }
    };
    window.rrExportViol = async () => {
        const b = document.getElementById('rr-filter-bulan')?.value || '';
        const u = document.getElementById('rr-filter-unit')?.value || '';
        if (!confirm('Export catatan ke sheet baru di spreadsheet?')) return;
        if (window.showToast) showToast('Mengekspor data...', 'success');
        try {
            const res = await fetchAPI('exportViolationsReport', { bulan: b, unit: u });
            if (res.success) { if (window.showToast) showToast(`Berhasil export ${res.recordCount || ''} catatan!`, 'success'); if (res.url && confirm('Buka spreadsheet di tab baru?')) window.open(res.url, '_blank'); }
            else if (window.showToast) showToast(res.message || 'Gagal export', 'error');
        } catch (e) { if (window.showToast) showToast('Gagal export: ' + e.message, 'error'); }
    };

    // ═══ TAB 3: PENILAIAN ════════════════════════════════════
    async function loadScores(forceRefresh = false) {
        let bulan = document.getElementById('rr-filter-score-bulan')?.value || '';
        if (!bulan) {
            const mn = ['', 'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
            bulan = mn[new Date().getMonth() + 1];
            const el = document.getElementById('rr-filter-score-bulan');
            if (el) el.value = bulan;
        }
        const ck = `${CACHE_KEYS.SCORES}_${bulan}`;
        try {
            if (!forceRefresh && bulan) { const cached = getFromCache(ck); if (cached) { allScores = cached; renderScoresUI(); return; } }
            const data = await fetchAPI('getRoomScores');
            if (data && data.success) {
                allScores = { sanksi: data.sanksiPerPelanggaran, scores: data.scores };
                if (bulan) saveToCache(ck, allScores);
                renderScoresUI();
            } else throw new Error(data?.message || 'Respons tidak valid');
        } catch (e) { if (window.showToast) showToast('Gagal memuat penilaian: ' + e.message, 'error'); }
    }
    window.rrLoadScores = loadScores;

    function renderScoresUI() {
        const sv = document.getElementById('rr-sanksi-value');
        if (sv) sv.textContent = allScores.sanksi != null ? `${allScores.sanksi} poin` : '—';
        const el = document.getElementById('rr-filter-score-bulan');
        if (el && !el.value) {
            const mn = ['', 'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
            el.value = mn[new Date().getMonth() + 1];
        }
        renderScores();
    }

    function renderScores() {
        const bulan = document.getElementById('rr-filter-score-bulan')?.value || '';
        const c = document.getElementById('rr-scores-container'); if (!c) return;
        if (!bulan) { c.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><p>Pilih bulan untuk melihat penilaian</p></div>'; if (scoreChart) scoreChart.destroy(); if (violationChart) violationChart.destroy(); return; }
        if (!allScores.scores) { c.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><p style="color:#ef4444">Data penilaian tidak tersedia</p></div>'; return; }
        const monthScores = allScores.scores.filter(s => s.bulan === bulan);
        if (!monthScores.length) { c.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>Tidak ada data untuk bulan ini</p></div>'; if (scoreChart) scoreChart.destroy(); if (violationChart) violationChart.destroy(); return; }
        renderCharts(monthScores);
        c.innerHTML = '<div class="scores-grid">' + monthScores.map(score => {
            const cls = score.skorAkhir >= 4.5 ? 'score-good' : score.skorAkhir >= 3 ? 'score-warning' : 'score-danger';
            return `<div class="score-card">
                <div class="score-header">
                    <div><div class="score-unit-name">${score.unit}</div><div class="score-month">Bulan ${score.bulan}</div></div>
                    <div class="score-value ${cls}">${Number(score.skorAkhir).toFixed(2)}</div>
                </div>
                <div class="score-details">
                    <div class="score-detail-item"><div class="score-detail-label">Skor Utuh</div><div class="score-detail-value">${score.skorUtuh}</div></div>
                    <div class="score-detail-item"><div class="score-detail-label">Pelanggaran</div><div class="score-detail-value">${score.jumlahPelanggaran}</div></div>
                    <div class="score-detail-item"><div class="score-detail-label">Sanksi</div><div class="score-detail-value" style="color:#ef4444;">-${Number(score.jumlahSanksi).toFixed(2)}</div></div>
                </div>
            </div>`;
        }).join('') + '</div>';
    }

    function renderCharts(monthScores) {
        const units = monthScores.map(s => s.unit.length > 25 ? s.unit.substring(0, 22) + '...' : s.unit);
        const scores = monthScores.map(s => s.skorAkhir);
        const violations = monthScores.map(s => s.jumlahPelanggaran);
        if (scoreChart) scoreChart.destroy();
        scoreChart = new Chart(document.getElementById('rr-scoreChart').getContext('2d'), {
            type: 'bar', data: { labels: units, datasets: [{ label: 'Skor Akhir', data: scores, backgroundColor: scores.map(s => s >= 4.5 ? '#10b981' : s >= 3 ? '#f59e0b' : '#ef4444'), borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `Skor: ${Number(c.parsed.y).toFixed(2)}` } } }, scales: { y: { beginAtZero: true, max: 5, ticks: { stepSize: 0.5 } } } }
        });
        if (violationChart) violationChart.destroy();
        violationChart = new Chart(document.getElementById('rr-violationChart').getContext('2d'), {
            type: 'bar', data: { labels: units, datasets: [{ label: 'Jumlah Pelanggaran', data: violations, backgroundColor: '#3b82f6', borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }

    // ── Daftar Ruang ─────────────────────────────────────────
    const ROOM_OPTIONS = `<option value="">Pilih Ruang Rapat</option>
        <option>Ruang Sekar Polo</option><option>Ruang Purbonegoro</option>
        <option>Ruang Sekar Asem</option><option>Ruang Sido Luhur</option>
        <option>Ruang Sekar Jagad</option><option>Ruang Sido Asih</option>
        <option>Ruang Semen Rante</option><option>Ruang Truntum</option>
        <option>Ruang Bokor Kencana</option><option>Ruang Pamiluto</option>
        <option>Ruang Wahyu Tumurun</option><option>Ruang Ratu Ratih</option>
        <option>Open Space</option><option>Coworking Space</option>`;

    // ═══ HTML Injection & Initialization ═════════════════════
    window.sectionInits = window.sectionInits || {};
    window.sectionInits['ruang-rapat'] = function () {
        const section = document.getElementById('section-ruang-rapat');
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
.btn-action-complete { background:#f0f9ff; color:#0369a1; border-color:#bae6fd; }
.btn-action-complete:hover { background:#e0f2fe; border-color:#7dd3fc; }
.filter-container { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
.badge-completed { background:#dbeafe; color:#1e40af; }
.section-page-header { margin-bottom:28px; padding-bottom:20px; border-bottom:1px solid #f1f5f9; }
.section-page-title { font-size:22px; font-weight:700; color:#0f172a; margin-bottom:4px; }
.section-page-subtitle { font-size:14px; color:#64748b; }
</style>

<div class="container">
    <div class="section-page-header">
        <h1 class="section-page-title">Pelayanan Ruang Rapat</h1>
        <p class="section-page-subtitle">Kelola permintaan, catatan ketidakrapian, dan penilaian penggunaan ruang rapat</p>
    </div>

    <div class="tabs">
        <button class="tab active" id="rr-tab-btn-requests" onclick="rrSwitchTab('requests', this)">Permintaan</button>
        <button class="tab" id="rr-tab-btn-violations" onclick="rrSwitchTab('violations', this)">Catatan Pelanggaran</button>
        <button class="tab" id="rr-tab-btn-scores" onclick="rrSwitchTab('scores', this)">Penilaian</button>
    </div>
    <div class="tabs-dropdown">
        <select id="rr-mobile-tab-select" onchange="rrSwitchTab(this.value, null)">
            <option value="requests">Permintaan</option>
            <option value="violations">Catatan Pelanggaran</option>
            <option value="scores">Penilaian</option>
        </select>
    </div>

    <!-- TAB 1: Permintaan -->
    <div id="rr-tab-requests" class="tab-content active">
        <div class="stats-grid">
            <div class="stat-card" style="border-left:3px solid #64748b;"><div class="stat-label">Total Permintaan</div><div class="stat-value" id="rr-stat-total">0</div></div>
            <div class="stat-card" style="border-left:3px solid #10b981;"><div class="stat-label">Disetujui</div><div class="stat-value" id="rr-stat-approved">0</div></div>
            <div class="stat-card" style="border-left:3px solid #f59e0b;"><div class="stat-label">Menunggu</div><div class="stat-value" id="rr-stat-pending">0</div></div>
            <div class="stat-card" style="border-left:3px solid #3b82f6;"><div class="stat-label">Selesai</div><div class="stat-value" id="rr-stat-completed">0</div></div>
        </div>
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Daftar Permintaan Ruang Rapat</h2>
                <div class="filter-container">
                    <input type="text" class="search-input" placeholder="Cari nama pemohon..." id="rr-search-requests" oninput="rrSearchRequests()">
                    <button onclick="rrLoadRoomRequests(true)" class="btn btn-sm btn-action-view">${ICONS.refresh} Refresh</button>
                </div>
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>No. Booking</th><th>Nama Pemohon</th><th>Tanggal</th><th>Waktu</th><th>Ruangan</th><th>Status</th><th>Aksi</th></tr></thead>
                    <tbody id="rr-requests-tbody"><tr><td colspan="7" class="loading"><div class="spinner"></div></td></tr></tbody>
                </table>
            </div>
            <div id="rr-requests-cards"></div>
            <div class="pagination" id="rr-requests-pagination"></div>
        </div>
    </div>

    <!-- TAB 2: Catatan Pelanggaran -->
    <div id="rr-tab-violations" class="tab-content">
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Catatan Ketidakrapian Ruangan</h2>
                <div class="filter-container">
                    <select class="select-input" id="rr-filter-bulan" onchange="window.rrFilterViolations()">
                        <option value="">Semua Bulan</option>
                        <option value="JANUARI">Januari</option><option value="FEBRUARI">Februari</option><option value="MARET">Maret</option><option value="APRIL">April</option>
                        <option value="MEI">Mei</option><option value="JUNI">Juni</option><option value="JULI">Juli</option><option value="AGUSTUS">Agustus</option>
                        <option value="SEPTEMBER">September</option><option value="OKTOBER">Oktober</option><option value="NOVEMBER">November</option><option value="DESEMBER">Desember</option>
                    </select>
                    <select class="select-input" id="rr-filter-unit" onchange="window.rrFilterViolations()">
                        <option value="">Semua Unit</option>
                        <option value="Sekretariat">Sekretariat</option><option value="Bidang Koperasi">Bidang Koperasi</option>
                        <option value="Bidang UKM">Bidang UKM</option><option value="Bidang Usaha Mikro">Bidang Usaha Mikro</option>
                        <option value="Bidang Kewirausahaan">Bidang Kewirausahaan</option>
                        <option value="Balai Layanan Usaha Terpadu KUMKM">BLUT KUMKM</option>
                    </select>
                    <button onclick="rrExportViol()" class="btn btn-sm btn-action-view">${ICONS.export} Export</button>
                    <button onclick="rrOpenAddViol()" class="btn btn-sm btn-action-edit">${ICONS.plus} Tambah</button>
                    <button onclick="window.rrLoadViolations(true)" class="btn btn-sm btn-action-view">${ICONS.refresh} Refresh</button>
                </div>
            </div>
            <div class="table-container">
                <table>
                    <thead><tr><th>Bulan</th><th>Unit</th><th>Tanggal</th><th>Nama Ruang</th><th>Laporan</th><th>Aksi</th></tr></thead>
                    <tbody id="rr-violations-tbody"><tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">Klik tab untuk memuat data</td></tr></tbody>
                </table>
            </div>
            <div id="rr-violations-cards"></div>
            <div class="pagination" id="rr-violations-pagination"></div>
        </div>
    </div>

    <!-- TAB 3: Penilaian -->
    <div id="rr-tab-scores" class="tab-content">
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Rekapitulasi Penilaian Penggunaan Ruang Rapat</h2>
                <div class="filter-container">
                    <select class="select-input" id="rr-filter-score-bulan" onchange="window.rrLoadScores(false)">
                        <option value="">Pilih Bulan</option>
                        <option value="JANUARI">Januari</option><option value="FEBRUARI">Februari</option><option value="MARET">Maret</option><option value="APRIL">April</option>
                        <option value="MEI">Mei</option><option value="JUNI">Juni</option><option value="JULI">Juli</option><option value="AGUSTUS">Agustus</option>
                        <option value="SEPTEMBER">September</option><option value="OKTOBER">Oktober</option><option value="NOVEMBER">November</option><option value="DESEMBER">Desember</option>
                    </select>
                    <button onclick="window.rrLoadScores(true)" class="btn btn-sm btn-action-view">${ICONS.refresh} Refresh</button>
                </div>
            </div>
            <div class="card-content">
                <div style="margin-bottom:24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #f1f5f9;">
                    <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;font-weight:600;margin-bottom:4px;">Sanksi per Ketidakrapian</p>
                    <p style="font-size:22px;font-weight:700;color:#0f172a;" id="rr-sanksi-value">—</p>
                </div>
                <div class="charts-grid">
                    <div class="card" style="margin:0;">
                        <div class="card-header" style="padding:16px;"><h3 style="font-size:14px;font-weight:600;color:#374151;">Skor Akhir Per Unit</h3></div>
                        <div class="card-content"><div class="chart-container"><canvas id="rr-scoreChart"></canvas></div></div>
                    </div>
                    <div class="card" style="margin:0;">
                        <div class="card-header" style="padding:16px;"><h3 style="font-size:14px;font-weight:600;color:#374151;">Jumlah Pelanggaran Per Unit</h3></div>
                        <div class="card-content"><div class="chart-container"><canvas id="rr-violationChart"></canvas></div></div>
                    </div>
                </div>
                <div id="rr-scores-container">
                    <div class="empty-state"><div class="empty-state-icon">📊</div><p>Pilih bulan untuk melihat penilaian</p></div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- MODALS -->
<div id="rr-detailModal" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal">
        <div class="modal-header"><h2 class="modal-title">Detail Permintaan Ruang Rapat</h2></div>
        <div class="modal-content" id="rr-modal-body"></div>
        <div class="modal-footer"><button onclick="document.getElementById('rr-detailModal').style.display='none'" class="btn" style="flex:1;">Tutup</button></div>
    </div>
</div>

<div id="rr-approveModal" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal">
        <div class="modal-header"><h2 class="modal-title">Setujui Permintaan Ruang Rapat</h2></div>
        <div class="modal-content">
            <div class="form-group">
                <label class="input-label">Pilih Ruang Rapat</label>
                <select class="form-input" id="rr-room-select" required>${ROOM_OPTIONS}</select>
            </div>
        </div>
        <div class="modal-footer">
            <button onclick="document.getElementById('rr-approveModal').style.display='none'" class="btn" style="flex:1;">Batal</button>
            <button onclick="rrConfirmApprove()" class="btn btn-action-approve" style="flex:1;" id="rr-confirm-approve-btn">${ICONS.check} Setujui</button>
        </div>
    </div>
</div>

<div id="rr-editModal" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal">
        <div class="modal-header"><h2 class="modal-title">Edit Permintaan Ruang Rapat</h2></div>
        <div class="modal-content">
            <div class="form-group">
                <label class="input-label">Ruang Rapat</label>
                <select class="form-input" id="rr-edit-room" required>${ROOM_OPTIONS}</select>
            </div>
            <div class="form-group">
                <label class="input-label">Status</label>
                <select class="form-input" id="rr-edit-status" required>
                    <option value="PENDING">Menunggu</option>
                    <option value="APPROVED">Disetujui</option>
                    <option value="COMPLETED">Selesai</option>
                </select>
            </div>
        </div>
        <div class="modal-footer">
            <button onclick="document.getElementById('rr-editModal').style.display='none'" class="btn" style="flex:1;">Batal</button>
            <button onclick="rrSubmitEdit()" class="btn btn-action-edit" style="flex:1;" id="rr-submit-edit-btn">Simpan Perubahan</button>
        </div>
    </div>
</div>

<div id="rr-addViolationModal" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal">
        <div class="modal-header"><h2 class="modal-title">Tambah Catatan Ketidakrapian</h2></div>
        <div class="modal-content">
            <form id="rr-violationForm">
                <div class="form-group">
                    <label class="input-label">Bulan</label>
                    <select class="form-input" id="rr-violation-bulan" required>
                        <option value="">Pilih Bulan</option>
                        <option value="JANUARI">Januari</option><option value="FEBRUARI">Februari</option><option value="MARET">Maret</option><option value="APRIL">April</option>
                        <option value="MEI">Mei</option><option value="JUNI">Juni</option><option value="JULI">Juli</option><option value="AGUSTUS">Agustus</option>
                        <option value="SEPTEMBER">September</option><option value="OKTOBER">Oktober</option><option value="NOVEMBER">November</option><option value="DESEMBER">Desember</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="input-label">Unit</label>
                    <select class="form-input" id="rr-violation-unit" required>
                        <option value="">Pilih Unit</option>
                        <option value="Sekretariat">Sekretariat</option><option value="Bidang Koperasi">Bidang Koperasi</option>
                        <option value="Bidang UKM">Bidang UKM</option><option value="Bidang Usaha Mikro">Bidang Usaha Mikro</option>
                        <option value="Bidang Kewirausahaan">Bidang Kewirausahaan</option>
                        <option value="Balai Layanan Usaha Terpadu KUMKM">Balai Layanan Usaha Terpadu KUMKM</option>
                    </select>
                </div>
                <div class="form-group"><label class="input-label">Tanggal Penggunaan</label><input type="date" class="form-input" id="rr-violation-tanggal" required></div>
                <div class="form-group">
                    <label class="input-label">Nama Ruang</label>
                    <select class="form-input" id="rr-violation-ruang" required>${ROOM_OPTIONS}</select>
                </div>
                <div class="form-group"><label class="input-label">Laporan Ketidakrapian</label><textarea class="form-textarea" id="rr-violation-laporan" placeholder="Deskripsikan ketidakrapian..." required></textarea></div>
            </form>
        </div>
        <div class="modal-footer">
            <button onclick="document.getElementById('rr-addViolationModal').style.display='none'" class="btn" style="flex:1;">Batal</button>
            <button onclick="rrSubmitViol()" class="btn btn-action-edit" style="flex:1;" id="rr-submit-violation-btn">Simpan</button>
        </div>
    </div>
</div>

<div id="rr-editViolationModal" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
    <div class="modal">
        <div class="modal-header"><h2 class="modal-title">Edit Catatan Ketidakrapian</h2></div>
        <div class="modal-content">
            <form id="rr-editViolationForm">
                <div class="form-group"><label class="input-label">Tanggal Penggunaan</label><input type="date" class="form-input" id="rr-edit-violation-tanggal" required></div>
                <div class="form-group">
                    <label class="input-label">Nama Ruang</label>
                    <select class="form-input" id="rr-edit-violation-ruang" required>${ROOM_OPTIONS}</select>
                </div>
                <div class="form-group"><label class="input-label">Laporan Ketidakrapian</label><textarea class="form-textarea" id="rr-edit-violation-laporan" required></textarea></div>
            </form>
        </div>
        <div class="modal-footer">
            <button onclick="document.getElementById('rr-editViolationModal').style.display='none'" class="btn" style="flex:1;">Batal</button>
            <button onclick="rrSubmitEditViol()" class="btn btn-action-edit" style="flex:1;" id="rr-submit-edit-violation-btn">Simpan Perubahan</button>
        </div>
    </div>
</div>`;

        window.addEventListener('click', e => { if (e.target.classList.contains('modal-overlay')) e.target.style.display = 'none'; });
        loadRoomRequests();
    };
})();