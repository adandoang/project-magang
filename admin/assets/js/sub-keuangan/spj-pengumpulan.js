// ============================================================
// spj-pengumpulan.js — Pengumpulan SPJ section (SPA)
// Admin Panel — Dinas Koperasi UKM
// Changes:
//   1. Hapus kolom No
//   2. PENDING → tombol approve+reject di kolom Status
//   3. APPROVED/REJECTED → badge di kolom Status + tombol detail
//   4. Empty state diperkecil (inline, tanpa icon besar)
//   5. Fix card Bulan Ini: pakai BULAN_MAP agar tidak 0
//   6. Pagination 10 data per halaman
// ============================================================
(function () {
    'use strict';

    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxoYIwpRZizipn0TD84nNeoqld570-85UlnL6jBdXbbu-GVNwoEK712P7yB1e03SSU0EQ/exec';
    const CACHE_KEY = 'spj_pengumpulan_cache';
    const CACHE_DURATION = 5 * 60 * 1000;
    const ITEMS_PER_PAGE = 10;

    let allData = [];
    let filteredData = [];
    let currentPage = 1;
    let currentDeleteId = null;
    let currentEditId = null;
    let currentEditStatus = null;

    const BULAN_MAP = {
        'januari': 'JANUARI', 'februari': 'FEBRUARI', 'maret': 'MARET', 'april': 'APRIL',
        'mei': 'MEI', 'juni': 'JUNI', 'juli': 'JULI', 'agustus': 'AGUSTUS',
        'september': 'SEPTEMBER', 'oktober': 'OKTOBER', 'november': 'NOVEMBER', 'desember': 'DESEMBER'
    };

    const ICONS = {
        refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
        check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
        x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        eye: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
        edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
        trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
        save: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
        link: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
        user: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        building: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M3 9h6"/><path d="M3 15h6"/><path d="M15 9h3"/><path d="M15 15h3"/></svg>`,
        calendar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
        money: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
        briefcase: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
        clock: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    };

    // ── Cache ─────────────────────────────────────────────────
    function getCachedData() {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return null;
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) return data;
            localStorage.removeItem(CACHE_KEY);
            return null;
        } catch { return null; }
    }
    function setCachedData(data) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() })); } catch { }
    }
    window.spjpClearCache = function () { localStorage.removeItem(CACHE_KEY); };

    // ── Format ────────────────────────────────────────────────
    function formatTimestamp(ts) {
        if (!ts) return '-';
        try {
            const d = new Date(ts);
            if (isNaN(d.getTime())) return String(ts);
            const p = n => n.toString().padStart(2, '0');
            return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
        } catch { return String(ts); }
    }
    const fmtRupiah = n => 'Rp ' + new Intl.NumberFormat('id-ID').format(n || 0);
    const fmtNum = n => new Intl.NumberFormat('id-ID').format(n || 0);

    // ── API ───────────────────────────────────────────────────
    function callAPI(params) {
        return new Promise((resolve, reject) => {
            const cb = 'jsonp_spjp_' + Date.now() + '_' + Math.floor(Math.random() * 1e4);
            window[cb] = data => { cleanup(); resolve(data); };
            const s = document.createElement('script');
            s.src = `${APPS_SCRIPT_URL}?${new URLSearchParams({ ...params, callback: cb })}`;
            const t = setTimeout(() => { cleanup(); reject(new Error('Timeout')); }, 12000);
            function cleanup() { clearTimeout(t); s.parentNode?.removeChild(s); delete window[cb]; }
            s.onerror = () => { cleanup(); reject(new Error('Network error')); };
            document.body.appendChild(s);
        });
    }

    // ── Load Data ─────────────────────────────────────────────
    window.spjpLoadData = async function (forceRefresh = false) {
        if (!forceRefresh) {
            const cached = getCachedData();
            if (cached) {
                allData = cached; filteredData = [...allData];
                currentPage = 1; renderTable(); updateStats(); return;
            }
        }
        const tbody = document.getElementById('spjp-data-tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;">
            <div class="spinner"></div><div style="margin-top:12px;color:#94a3b8;">Memuat data...</div>
        </td></tr>`;
        const pgn = document.getElementById('spjp-pagination');
        if (pgn) pgn.innerHTML = '';
        try {
            const result = await callAPI({ action: 'getPenyampaianSPJ' });
            if (result && result.success) {
                allData = (result.data || []).slice().reverse();
                filteredData = [...allData];
                setCachedData(allData);
                currentPage = 1; renderTable(); updateStats();
            } else {
                showError('Gagal memuat data: ' + (result?.message || 'Unknown error'));
            }
        } catch (err) {
            showError('Gagal menghubungi server: ' + err.message);
        }
    };

    function showError(msg) {
        const tbody = document.getElementById('spjp-data-tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#ef4444;">${msg}
            <br><button onclick="spjpLoadData(true)" class="btn btn-sm" style="margin-top:12px;">Coba Lagi</button></td></tr>`;
    }

    // ── Filter ────────────────────────────────────────────────
    window.spjpFilterData = function () {
        const bulan = (document.getElementById('spjp-filter-bulan')?.value || '').toUpperCase();
        const unit = document.getElementById('spjp-filter-unit')?.value || '';
        const status = (document.getElementById('spjp-filter-status')?.value || '').toUpperCase();
        const search = (document.getElementById('spjp-search-nama')?.value || '').toLowerCase();
        filteredData = allData.filter(item => {
            const matchBulan = !bulan || (item.bulanSPJ || '').toUpperCase() === bulan;
            const matchUnit = !unit || item.unit === unit;
            const matchStatus = !status || (item.status || '').toUpperCase() === status;
            const matchSearch = !search
                || (item.nama || '').toLowerCase().includes(search)
                || (item.subKegiatan || '').toLowerCase().includes(search)
                || (item.unit || '').toLowerCase().includes(search);
            return matchBulan && matchUnit && matchStatus && matchSearch;
        });
        currentPage = 1; renderTable(); updateStats();
    };

    // ── Render Table + Pagination ─────────────────────────────
    function renderTable() {
        const tbody = document.getElementById('spjp-data-tbody');
        const pgn = document.getElementById('spjp-pagination');
        if (!tbody) return;

        if (filteredData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:#94a3b8;font-size:14px;">
                Tidak ada data SPJ yang sesuai filter
            </td></tr>`;
            if (pgn) pgn.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const items = filteredData.slice(start, start + ITEMS_PER_PAGE);

        tbody.innerHTML = items.map(item => {
            const isPending = (item.status || '').toUpperCase() === 'PENDING';
            const isApproved = (item.status || '').toUpperCase() === 'APPROVED';
            const isRejected = (item.status || '').toUpperCase() === 'REJECTED';

            let statusCell;
            if (isPending) {
                statusCell = `<div style="display:flex;align-items:center;justify-content:center;gap:4px;">
                    <button onclick="spjpApproveItem('${item.id}')" class="btn-icon btn-icon-approve" title="Setujui" id="spjp-btn-approve-${item.id}">${ICONS.check}</button>
                    <button onclick="spjpRejectItem('${item.id}')" class="btn-icon btn-icon-reject" title="Tolak" id="spjp-btn-reject-${item.id}">${ICONS.x}</button>
                </div>`;
            } else if (isApproved) {
                statusCell = `<span class="badge badge-approved">Disetujui</span>`;
            } else if (isRejected) {
                statusCell = `<span class="badge badge-rejected">Ditolak</span>`;
            } else {
                statusCell = `<span class="badge badge-pending">${item.status || '-'}</span>`;
            }

            return `<tr>
                <td style="font-size:.85rem;color:#64748b;">${formatTimestamp(item.timestamp)}</td>
                <td style="font-weight:500;">${item.nama || '-'}</td>
                <td>${item.unit || '-'}</td>
                <td style="min-width:200px;">${item.subKegiatan || '-'}</td>
                <td>${item.bulanSPJ || '-'}</td>
                <td>Rp ${fmtNum(item.nominalSPJMasuk)}</td>
                <td style="text-align:center;vertical-align:middle;">${statusCell}</td>
                <td>
                    <div class="action-buttons"><div class="btn-icon-group">
                        ${!isPending ? `<button onclick="spjpViewDetail('${item.id}')" class="btn-icon btn-icon-view" title="Lihat Detail">${ICONS.eye}</button>` : ''}
                        <button onclick="spjpOpenEditModal('${item.id}')" class="btn-icon btn-icon-edit" title="Edit Status">${ICONS.edit}</button>
                        <button onclick="spjpOpenDeleteModal('${item.id}')" class="btn-icon btn-icon-delete" title="Hapus">${ICONS.trash}</button>
                    </div></div>
                </td>
            </tr>`;
        }).join('');

        if (pgn) pgn.innerHTML = `
            <button onclick="spjpChangePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>&#8249; Prev</button>
            <span class="pagination-info">Halaman ${currentPage} dari ${totalPages} (${filteredData.length} data)</span>
            <button onclick="spjpChangePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next &#8250;</button>`;
    }

    window.spjpChangePage = function (page) {
        const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
        if (page < 1 || page > totalPages) return;
        currentPage = page; renderTable();
    };

    // ── Stats ─────────────────────────────────────────────────
    function updateStats() {
        if (!document.getElementById('spjp-total-pengumpulan')) return;
        const now = new Date();
        const namaHari = now.toLocaleString('id-ID', { month: 'long' }).toLowerCase();
        const currentMonthKey = BULAN_MAP[namaHari] || namaHari.toUpperCase();
        const currentYear = now.getFullYear();

        const bulanIni = allData.filter(i =>
            (i.bulanSPJ || '').toUpperCase().trim() === currentMonthKey
        );
        const pendingData = allData.filter(i => (i.status || '').toUpperCase() === 'PENDING');
        const totalNominal = filteredData.reduce((s, i) => s + (parseFloat(i.nominalSPJMasuk) || 0), 0);

        document.getElementById('spjp-total-pengumpulan').textContent = allData.length;
        document.getElementById('spjp-bulan-ini-count').textContent = bulanIni.length;
        document.getElementById('spjp-pending-count').textContent = pendingData.length;
        document.getElementById('spjp-total-nominal').textContent = fmtRupiah(totalNominal);
        document.getElementById('spjp-bulan-ini-label').textContent = `${currentMonthKey} ${currentYear}`;
    }

    // ── Approve ───────────────────────────────────────────────
    window.spjpApproveItem = async function (id) {
        if (!confirm('Setujui pengumpulan SPJ ini?')) return;
        const aBtn = document.getElementById(`spjp-btn-approve-${id}`);
        const rBtn = document.getElementById(`spjp-btn-reject-${id}`);
        if (aBtn) { aBtn.disabled = true; aBtn.innerHTML = '<span class="spinner spinner-sm"></span>'; }
        if (rBtn) rBtn.disabled = true;
        try {
            const result = await callAPI({ action: 'updateStatusSPJ', id, status: 'APPROVED' });
            if (result && result.success) {
                if (window.showToast) showToast('SPJ berhasil disetujui', 'success');
                window.spjpClearCache(); await window.spjpLoadData(true);
            } else {
                if (window.showToast) showToast(result?.message || 'Gagal menyetujui SPJ', 'error');
                if (aBtn) { aBtn.disabled = false; aBtn.innerHTML = ICONS.check; }
                if (rBtn) rBtn.disabled = false;
            }
        } catch {
            if (window.showToast) showToast('Terjadi kesalahan', 'error');
            if (aBtn) { aBtn.disabled = false; aBtn.innerHTML = ICONS.check; }
            if (rBtn) rBtn.disabled = false;
        }
    };

    // ── Reject ────────────────────────────────────────────────
    window.spjpRejectItem = async function (id) {
        if (!confirm('Tolak pengumpulan SPJ ini?')) return;
        const aBtn = document.getElementById(`spjp-btn-approve-${id}`);
        const rBtn = document.getElementById(`spjp-btn-reject-${id}`);
        if (rBtn) { rBtn.disabled = true; rBtn.innerHTML = '<span class="spinner spinner-sm"></span>'; }
        if (aBtn) aBtn.disabled = true;
        try {
            const result = await callAPI({ action: 'updateStatusSPJ', id, status: 'REJECTED' });
            if (result && result.success) {
                if (window.showToast) showToast('SPJ berhasil ditolak', 'success');
                window.spjpClearCache(); await window.spjpLoadData(true);
            } else {
                if (window.showToast) showToast(result?.message || 'Gagal menolak SPJ', 'error');
                if (rBtn) { rBtn.disabled = false; rBtn.innerHTML = ICONS.x; }
                if (aBtn) aBtn.disabled = false;
            }
        } catch {
            if (window.showToast) showToast('Terjadi kesalahan', 'error');
            if (rBtn) { rBtn.disabled = false; rBtn.innerHTML = ICONS.x; }
            if (aBtn) aBtn.disabled = false;
        }
    };

    // ── Edit Status Modal ─────────────────────────────────────
    window.spjpOpenEditModal = function (id) {
        const item = allData.find(d => d.id === id);
        if (!item) return;
        currentEditId = id;
        currentEditStatus = (item.status || 'PENDING').toUpperCase();

        document.getElementById('spjp-edit-modal-subtitle').textContent = `${item.nama || '-'} — ${item.bulanSPJ || ''}`;
        document.getElementById('spjp-edit-info-nama').textContent = item.nama || '-';
        document.getElementById('spjp-edit-info-unit').textContent = item.unit || '-';
        document.getElementById('spjp-edit-info-subkeg').textContent = item.subKegiatan || '-';
        document.getElementById('spjp-edit-info-bulan').textContent = item.bulanSPJ || '-';
        document.getElementById('spjp-edit-info-nominal').textContent = fmtRupiah(item.nominalSPJMasuk);

        spjpSelectStatus(currentEditStatus);
        document.getElementById('spjp-editModal').style.display = 'flex';
    };

    window.spjpSelectStatus = function (status) {
        currentEditStatus = status;
        ['PENDING', 'APPROVED', 'REJECTED'].forEach(s => {
            const el = document.getElementById('spjp-opt-' + s.toLowerCase());
            if (el) el.classList.remove('spjp-opt-selected-pending', 'spjp-opt-selected-approved', 'spjp-opt-selected-rejected');
        });
        const radio = document.getElementById('spjp-radio-' + status.toLowerCase());
        if (radio) radio.checked = true;
        const active = document.getElementById('spjp-opt-' + status.toLowerCase());
        if (active) active.classList.add('spjp-opt-selected-' + status.toLowerCase());
    };

    window.spjpCloseEditModal = function () {
        document.getElementById('spjp-editModal').style.display = 'none';
        currentEditId = null;
    };

    window.spjpSubmitEdit = async function () {
        if (!currentEditId || !currentEditStatus) return;
        const btn = document.getElementById('spjp-btn-submit-edit');
        const orig = btn.innerHTML;
        btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan...';
        try {
            const result = await callAPI({ action: 'updateStatusSPJ', id: currentEditId, status: currentEditStatus });
            if (result && result.success) {
                if (window.showToast) showToast('Status berhasil diperbarui', 'success');
                window.spjpClearCache(); window.spjpCloseEditModal(); await window.spjpLoadData(true);
            } else {
                if (window.showToast) showToast(result?.message || 'Gagal memperbarui status', 'error');
            }
        } catch {
            if (window.showToast) showToast('Gagal menghubungi server', 'error');
        } finally {
            btn.disabled = false; btn.innerHTML = orig;
        }
    };

    // ── Delete Modal ──────────────────────────────────────────
    window.spjpOpenDeleteModal = function (id) {
        const item = allData.find(d => d.id === id);
        if (!item) return;
        currentDeleteId = id;
        document.getElementById('spjp-delete-info-nama').textContent = item.nama || '-';
        document.getElementById('spjp-delete-info-detail').textContent =
            `${item.unit || '-'} · ${item.bulanSPJ || '-'} · Rp ${fmtNum(item.nominalSPJMasuk || 0)}`;
        document.getElementById('spjp-deleteModal').style.display = 'flex';
    };

    window.spjpCloseDeleteModal = function () {
        document.getElementById('spjp-deleteModal').style.display = 'none';
        currentDeleteId = null;
    };

    window.spjpSubmitDelete = async function () {
        if (!currentDeleteId) return;
        const btn = document.getElementById('spjp-btn-submit-delete');
        const orig = btn.innerHTML;
        btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menghapus...';
        try {
            const result = await callAPI({ action: 'deletePenyampaianSPJ', id: currentDeleteId });
            if (result && result.success) {
                if (window.showToast) showToast('Data SPJ berhasil dihapus', 'success');
                window.spjpClearCache(); window.spjpCloseDeleteModal(); await window.spjpLoadData(true);
            } else {
                allData = allData.filter(d => d.id !== currentDeleteId);
                filteredData = filteredData.filter(d => d.id !== currentDeleteId);
                setCachedData(allData); renderTable(); updateStats();
                if (window.showToast) showToast('Dihapus lokal. Server: ' + (result?.message || ''), 'error');
                window.spjpCloseDeleteModal();
            }
        } catch (err) {
            if (window.showToast) showToast('Gagal menghubungi server: ' + err.message, 'error');
        } finally {
            btn.disabled = false; btn.innerHTML = orig;
        }
    };

    // ── View Detail ───────────────────────────────────────────
    window.spjpViewDetail = function (id) {
        const item = allData.find(d => d.id === id);
        if (!item) return;
        const ex = document.getElementById('spjp-detail-modal');
        if (ex) ex.remove();

        const statusLabel = (item.status || '').toUpperCase() === 'APPROVED' ? 'Disetujui'
            : (item.status || '').toUpperCase() === 'REJECTED' ? 'Ditolak' : 'Pending';
        const statusColor = (item.status || '').toUpperCase() === 'APPROVED' ? '#10b981'
            : (item.status || '').toUpperCase() === 'REJECTED' ? '#ef4444' : '#f59e0b';
        const statusBg = (item.status || '').toUpperCase() === 'APPROVED' ? '#f0fdf4'
            : (item.status || '').toUpperCase() === 'REJECTED' ? '#fff1f2' : '#fffbeb';

        const modal = document.createElement('div');
        modal.id = 'spjp-detail-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `
        <div class="modal" style="max-width:560px;">
            <div class="modal-header"><h2 class="modal-title">Detail Pengumpulan SPJ</h2></div>
            <div class="modal-content">
                <div class="spjp-detail-wrap">
                    <div class="spjp-detail-status-banner" style="background:${statusBg};border-color:${statusColor};">
                        <div class="spjp-detail-status-dot" style="background:${statusColor};"></div>
                        <span style="font-weight:700;color:${statusColor};font-size:14px;">${statusLabel}</span>
                        <span style="margin-left:auto;font-size:12px;color:#64748b;">${item.id || ''}</span>
                    </div>
                    <div class="spjp-detail-section">
                        <div class="spjp-detail-section-title">Informasi Pegawai</div>
                        <div class="spjp-detail-grid-2">
                            <div class="spjp-detail-field">
                                <div class="spjp-detail-field-icon" style="background:#eff6ff;color:#3b82f6;">${ICONS.user}</div>
                                <div><div class="spjp-detail-field-label">Nama Penanggung Jawab</div><div class="spjp-detail-field-value">${item.nama || '-'}</div></div>
                            </div>
                            <div class="spjp-detail-field">
                                <div class="spjp-detail-field-icon" style="background:#f0fdf4;color:#10b981;">${ICONS.building}</div>
                                <div><div class="spjp-detail-field-label">Unit / Bidang</div><div class="spjp-detail-field-value">${item.unit || '-'}</div></div>
                            </div>
                        </div>
                    </div>
                    <div class="spjp-detail-section">
                        <div class="spjp-detail-section-title">Informasi SPJ</div>
                        <div class="spjp-detail-grid-2">
                            <div class="spjp-detail-field">
                                <div class="spjp-detail-field-icon" style="background:#fefce8;color:#ca8a04;">${ICONS.calendar}</div>
                                <div><div class="spjp-detail-field-label">Bulan SPJ</div><div class="spjp-detail-field-value">${item.bulanSPJ || '-'}</div></div>
                            </div>
                            <div class="spjp-detail-field">
                                <div class="spjp-detail-field-icon" style="background:#fdf4ff;color:#a855f7;">${ICONS.money}</div>
                                <div><div class="spjp-detail-field-label">Nominal SPJ</div><div class="spjp-detail-field-value">Rp ${fmtNum(item.nominalSPJMasuk || 0)}</div></div>
                            </div>
                            <div class="spjp-detail-field" style="grid-column:1/-1;">
                                <div class="spjp-detail-field-icon" style="background:#eff6ff;color:#3b82f6;">${ICONS.briefcase}</div>
                                <div><div class="spjp-detail-field-label">Sub Kegiatan</div><div class="spjp-detail-field-value">${item.subKegiatan || '-'}</div></div>
                            </div>
                            <div class="spjp-detail-field">
                                <div class="spjp-detail-field-icon" style="background:#fff7ed;color:#f97316;">${ICONS.clock}</div>
                                <div><div class="spjp-detail-field-label">Waktu Pengumpulan</div><div class="spjp-detail-field-value" style="font-size:13px;">${formatTimestamp(item.timestamp)}</div></div>
                            </div>
                        </div>
                    </div>
                    ${(item.linkFileIzinKeterlambatan || item.linkFileSPJ) ? `
                    <div class="spjp-detail-section">
                        <div class="spjp-detail-section-title">File Lampiran</div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;">
                            ${item.linkFileIzinKeterlambatan ? `<a href="${item.linkFileIzinKeterlambatan}" target="_blank" class="btn btn-sm" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;">${ICONS.link} File Izin Terlambat</a>` : ''}
                            ${item.linkFileSPJ ? `<a href="${item.linkFileSPJ}" target="_blank" class="btn btn-sm" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;">${ICONS.link} File SPJ</a>` : ''}
                        </div>
                    </div>` : ''}
                </div>
            </div>
            <div class="modal-footer">
                <button onclick="document.getElementById('spjp-detail-modal').remove()" class="btn" style="flex:1;">Tutup</button>
            </div>
        </div>`;
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        document.body.appendChild(modal);
    };

    // ═══ HTML Injection & Initialization ════════════════════
    window.sectionInits = window.sectionInits || {};
    window.sectionInits['spj-pengumpulan'] = function () {
        const section = document.getElementById('section-spj-pengumpulan');
        if (!section) return;
        section.innerHTML = `
<style>
/* ── Detail modal ── */
.spjp-detail-wrap { display:flex; flex-direction:column; gap:14px; }
.spjp-detail-status-banner { display:flex; align-items:center; gap:10px; padding:12px 16px; border-radius:10px; border:1.5px solid; }
.spjp-detail-status-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.spjp-detail-section { background:#f8fafc; border-radius:10px; padding:14px; border:1px solid #f1f5f9; }
.spjp-detail-section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:#94a3b8; margin-bottom:12px; }
.spjp-detail-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
@media(max-width:480px) { .spjp-detail-grid-2 { grid-template-columns:1fr; } }
.spjp-detail-field { display:flex; align-items:flex-start; gap:10px; }
.spjp-detail-field-icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.spjp-detail-field-label { font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:2px; }
.spjp-detail-field-value { font-size:13.5px; font-weight:600; color:#1e293b; line-height:1.4; }
/* ── Edit modal status pills ── */
.spjp-status-options { display:flex; flex-direction:column; gap:8px; margin-top:8px; }
.spjp-status-option { display:flex; align-items:center; gap:12px; padding:12px 14px; border:1.5px solid #e2e8f0; border-radius:10px; cursor:pointer; transition:all 0.15s; }
.spjp-status-option:hover { border-color:#94a3b8; background:#f8fafc; }
.spjp-status-option input[type="radio"] { display:none; }
.spjp-status-option-label { font-size:13.5px; font-weight:600; }
.spjp-status-option-sub { font-size:12px; color:#64748b; margin-top:1px; }
.spjp-opt-selected-pending  { border-color:#f59e0b !important; background:#fffbeb !important; }
.spjp-opt-selected-approved { border-color:#10b981 !important; background:#f0fdf4 !important; }
.spjp-opt-selected-rejected { border-color:#ef4444 !important; background:#fff1f2 !important; }
/* ── Info grid in edit modal ── */
.spjp-info-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; background:#f8fafc; border-radius:10px; padding:14px; border:1px solid #f1f5f9; margin-bottom:16px; }
.spjp-info-item { display:flex; flex-direction:column; gap:2px; }
.spjp-info-label { font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; }
.spjp-info-value { font-size:13px; font-weight:600; color:#1e293b; }
/* ── Misc ── */
#section-spj-pengumpulan .filter-container { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
#spjp-data-tbody tr td:nth-child(7) { text-align:center; vertical-align:middle; }
#spjp-data-tbody tr { vertical-align:middle; }
</style>

<div class="container">
    <div class="section-page-header">
        <h1 class="section-page-title">Pengumpulan SPJ Keuangan</h1>
        <p class="section-page-subtitle">Kelola dan verifikasi laporan Surat Pertanggungjawaban keuangan dari setiap unit / bidang</p>
    </div>

    <div class="stats-grid">
        <div class="stat-card" style="border-left:4px solid #10b981;">
            <div class="stat-label">Total Pengumpulan</div>
            <div class="stat-value" id="spjp-total-pengumpulan">0</div>
            <div class="stat-footer">Laporan SPJ</div>
        </div>
        <div class="stat-card" style="border-left:4px solid #3b82f6;">
            <div class="stat-label">Bulan Ini</div>
            <div class="stat-value" id="spjp-bulan-ini-count">0</div>
            <div class="stat-footer" id="spjp-bulan-ini-label">Laporan</div>
        </div>
        <div class="stat-card" style="border-left:4px solid #f59e0b;">
            <div class="stat-label">Pending</div>
            <div class="stat-value" id="spjp-pending-count">0</div>
            <div class="stat-footer">Menunggu verifikasi</div>
        </div>
        <div class="stat-card" style="border-left:4px solid #64748b;">
            <div class="stat-label">Total Nominal</div>
            <div class="stat-value" id="spjp-total-nominal" style="font-size:24px;">Rp 0</div>
            <div class="stat-footer">Akumulasi SPJ</div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <h2 class="card-title">Daftar Pengumpulan SPJ</h2>
            <div class="filter-container">
                <select class="select-input" id="spjp-filter-bulan" onchange="spjpFilterData()">
                    <option value="">Semua Bulan</option>
                    <option value="JANUARI">Januari</option><option value="FEBRUARI">Februari</option><option value="MARET">Maret</option>
                    <option value="APRIL">April</option><option value="MEI">Mei</option><option value="JUNI">Juni</option>
                    <option value="JULI">Juli</option><option value="AGUSTUS">Agustus</option><option value="SEPTEMBER">September</option>
                    <option value="OKTOBER">Oktober</option><option value="NOVEMBER">November</option><option value="DESEMBER">Desember</option>
                </select>
                <select class="select-input" id="spjp-filter-unit" onchange="spjpFilterData()">
                    <option value="">Semua Unit</option>
                    <option value="Sekretariat">Sekretariat</option>
                    <option value="Balai Layanan Usaha Terpadu KUMKM">BLUT KUMKM</option>
                    <option value="Bidang Kewirausahaan">Bid. Kewirausahaan</option>
                    <option value="Bidang Koperasi">Bid. Koperasi</option>
                    <option value="Bidang UKM">Bid. UKM</option>
                    <option value="Bidang Usaha Mikro">Bid. Usaha Mikro</option>
                </select>
                <select class="select-input" id="spjp-filter-status" onchange="spjpFilterData()">
                    <option value="">Semua Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Disetujui</option>
                    <option value="REJECTED">Ditolak</option>
                </select>
                <input type="text" class="search-input" id="spjp-search-nama" placeholder="Cari nama / sub kegiatan..." oninput="spjpFilterData()">
                <button onclick="spjpLoadData(true)" class="btn btn-sm" title="Refresh data">
                    ${ICONS.refresh} Refresh
                </button>
            </div>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Timestamp</th><th>Nama Penanggung Jawab</th><th>Unit / Bidang</th>
                        <th>Sub Kegiatan</th><th>Bulan SPJ</th><th>Nominal SPJ</th><th>Status</th><th>Aksi</th>
                    </tr>
                </thead>
                <tbody id="spjp-data-tbody">
                    <tr><td colspan="8" style="text-align:center;padding:40px;">
                        <div class="spinner"></div>
                        <div style="margin-top:12px;color:#94a3b8;">Memuat data...</div>
                    </td></tr>
                </tbody>
            </table>
        </div>
        <div class="pagination" id="spjp-pagination"></div>
    </div>
</div>

<!-- EDIT STATUS MODAL -->
<div id="spjp-editModal" class="modal-overlay" style="display:none;">
    <div class="modal" style="max-width:480px;">
        <div class="modal-header">
            <h2 class="modal-title">Edit Status SPJ</h2>
            <p style="font-size:13px;color:#64748b;margin-top:4px;" id="spjp-edit-modal-subtitle">—</p>
        </div>
        <div class="modal-content">
            <div class="spjp-info-grid">
                <div class="spjp-info-item"><div class="spjp-info-label">Nama</div><div class="spjp-info-value" id="spjp-edit-info-nama">—</div></div>
                <div class="spjp-info-item"><div class="spjp-info-label">Unit</div><div class="spjp-info-value" id="spjp-edit-info-unit">—</div></div>
                <div class="spjp-info-item" style="grid-column:1/-1;"><div class="spjp-info-label">Sub Kegiatan</div><div class="spjp-info-value" id="spjp-edit-info-subkeg">—</div></div>
                <div class="spjp-info-item"><div class="spjp-info-label">Bulan</div><div class="spjp-info-value" id="spjp-edit-info-bulan">—</div></div>
                <div class="spjp-info-item"><div class="spjp-info-label">Nominal</div><div class="spjp-info-value" id="spjp-edit-info-nominal">—</div></div>
            </div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;margin-bottom:8px;">Ubah Status</div>
            <div class="spjp-status-options">
                <label class="spjp-status-option" id="spjp-opt-pending" onclick="spjpSelectStatus('PENDING')">
                    <input type="radio" name="spjp-edit-status" id="spjp-radio-pending">
                    <div style="width:10px;height:10px;border-radius:50%;background:#f59e0b;flex-shrink:0;"></div>
                    <div><div class="spjp-status-option-label" style="color:#92400e;">Pending</div><div class="spjp-status-option-sub">Menunggu verifikasi admin</div></div>
                </label>
                <label class="spjp-status-option" id="spjp-opt-approved" onclick="spjpSelectStatus('APPROVED')">
                    <input type="radio" name="spjp-edit-status" id="spjp-radio-approved">
                    <div style="width:10px;height:10px;border-radius:50%;background:#10b981;flex-shrink:0;"></div>
                    <div><div class="spjp-status-option-label" style="color:#065f46;">Disetujui</div><div class="spjp-status-option-sub">SPJ telah diverifikasi dan disetujui</div></div>
                </label>
                <label class="spjp-status-option" id="spjp-opt-rejected" onclick="spjpSelectStatus('REJECTED')">
                    <input type="radio" name="spjp-edit-status" id="spjp-radio-rejected">
                    <div style="width:10px;height:10px;border-radius:50%;background:#ef4444;flex-shrink:0;"></div>
                    <div><div class="spjp-status-option-label" style="color:#991b1b;">Ditolak</div><div class="spjp-status-option-sub">SPJ tidak memenuhi syarat</div></div>
                </label>
            </div>
        </div>
        <div class="modal-footer">
            <button onclick="spjpCloseEditModal()" class="btn" style="flex:1;">Batal</button>
            <button onclick="spjpSubmitEdit()" class="btn btn-primary" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;" id="spjp-btn-submit-edit">
                ${ICONS.save} Simpan Perubahan
            </button>
        </div>
    </div>
</div>

<!-- DELETE MODAL -->
<div id="spjp-deleteModal" class="modal-overlay" style="display:none;">
    <div class="modal" style="max-width:420px;">
        <div class="modal-content" style="text-align:center;padding:32px 24px;">
            <div style="width:52px;height:52px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </div>
            <h3 style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:8px;">Hapus Data SPJ?</h3>
            <p style="font-size:14px;color:#64748b;margin-bottom:4px;">Data berikut akan dihapus permanen:</p>
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin:16px 0;text-align:left;">
                <div style="font-size:13px;color:#991b1b;font-weight:600;" id="spjp-delete-info-nama">—</div>
                <div style="font-size:12px;color:#b91c1c;margin-top:2px;" id="spjp-delete-info-detail">—</div>
            </div>
            <p style="font-size:13px;color:#ef4444;font-weight:500;">⚠️ Tindakan ini tidak dapat dibatalkan.</p>
        </div>
        <div class="modal-footer">
            <button onclick="spjpCloseDeleteModal()" class="btn" style="flex:1;">Batal</button>
            <button onclick="spjpSubmitDelete()" id="spjp-btn-submit-delete"
                style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;background:#ef4444;color:white;border:none;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                Ya, Hapus
            </button>
        </div>
    </div>
</div>`;

        window.addEventListener('click', e => {
            if (e.target.id === 'spjp-editModal') window.spjpCloseEditModal();
            if (e.target.id === 'spjp-deleteModal') window.spjpCloseDeleteModal();
        });

        const currentMonthName = new Date().toLocaleString('id-ID', { month: 'long' }).toUpperCase();
        const fMonth = document.getElementById('spjp-filter-bulan');
        if (fMonth) fMonth.value = currentMonthName;

        window.spjpLoadData(false).then(() => {
            window.spjpFilterData();
        });
    };
})();