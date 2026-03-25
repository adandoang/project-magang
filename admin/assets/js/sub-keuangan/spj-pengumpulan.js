// ============================================================
// spj-pengumpulan.js — Pengumpulan SPJ section (SPA)
// Admin Panel — Dinas Koperasi UKM
// v3: grouping per unit+subKegiatan+bulan, akumulasi nominal,
//     history modal, edit nominal per-entry & total, delete per-entry
// ============================================================
(function () {
    'use strict';

    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxoYIwpRZizipn0TD84nNeoqld570-85UlnL6jBdXbbu-GVNwoEK712P7yB1e03SSU0EQ/exec';
    const CACHE_KEY = 'spj_pengumpulan_cache';
    const CACHE_DURATION = 5 * 60 * 1000;
    const ITEMS_PER_PAGE = 10;

    // allData   = flat array dari server (semua entry mentah)
    // groupedData = array of group objects (setelah grouping)
    // filteredGroups = subset groupedData setelah filter
    let allData = [];
    let groupedData = [];
    let filteredGroups = [];
    let currentPage = 1;

    // state edit status (group level)
    let currentEditGroupKey = null;
    let currentEditStatus = null;

    const BULAN_MAP = {
        'januari': 'JANUARI', 'februari': 'FEBRUARI', 'maret': 'MARET', 'april': 'APRIL',
        'mei': 'MEI', 'juni': 'JUNI', 'juli': 'JULI', 'agustus': 'AGUSTUS',
        'september': 'SEPTEMBER', 'oktober': 'OKTOBER', 'november': 'NOVEMBER', 'desember': 'DESEMBER'
    };

    const ICONS = {
        refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
        check:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
        x:       `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        eye:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
        edit:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
        trash:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
        save:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
        history: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
        money:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
        user:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        building:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M3 9h6"/><path d="M3 15h6"/><path d="M15 9h3"/><path d="M15 15h3"/></svg>`,
        calendar:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
        briefcase:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
        pencil:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
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
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() })); } catch {}
    }
    window.spjpClearCache = function () { localStorage.removeItem(CACHE_KEY); };

    // ── Format ────────────────────────────────────────────────
    function formatTimestamp(ts) {
        if (!ts) return '-';
        try {
            const d = new Date(ts);
            if (isNaN(d.getTime())) return String(ts);
            const p = n => n.toString().padStart(2, '0');
            return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
        } catch { return String(ts); }
    }
    const fmtRupiah = n => 'Rp ' + new Intl.NumberFormat('id-ID').format(n || 0);
    const fmtNum    = n => new Intl.NumberFormat('id-ID').format(n || 0);

    // ── API ───────────────────────────────────────────────────
    function callAPI(params) {
        return new Promise((resolve, reject) => {
            const cb = 'jsonp_spjp_' + Date.now() + '_' + Math.floor(Math.random() * 1e4);
            window[cb] = data => { cleanup(); resolve(data); };
            const s = document.createElement('script');
            s.src = `${APPS_SCRIPT_URL}?${new URLSearchParams({ ...params, callback: cb })}`;
            const t = setTimeout(() => { cleanup(); reject(new Error('Timeout')); }, 15000);
            function cleanup() { clearTimeout(t); s.parentNode?.removeChild(s); delete window[cb]; }
            s.onerror = () => { cleanup(); reject(new Error('Network error')); };
            document.body.appendChild(s);
        });
    }

    // ── Grouping Logic ────────────────────────────────────────
    /**
     * Grouping key: unit + "||" + subKegiatan + "||" + bulanSPJ (case-insensitive trim)
     * Setiap group berisi:
     *   - key, unit, subKegiatan, bulanSPJ, nama (dari entry terbaru)
     *   - entries: array entry diurutkan terbaru dulu
     *   - totalNominal: sum semua entry
     *   - latestStatus: status entry terbaru
     *   - latestTimestamp: timestamp entry terbaru
     *   - latestId: id entry terbaru (untuk aksi approve/reject default)
     */
    function buildGroups(flatData) {
        const map = new Map();

        // Sort flat data: terbaru dulu berdasarkan timestamp
        const sorted = [...flatData].sort((a, b) => {
            const ta = new Date(a.timestamp).getTime() || 0;
            const tb = new Date(b.timestamp).getTime() || 0;
            return tb - ta;
        });

        sorted.forEach(item => {
            const k = [
                (item.unit || '').trim(),
                (item.subKegiatan || '').trim(),
                (item.bulanSPJ || '').toUpperCase().trim()
            ].join('||');

            if (!map.has(k)) {
                map.set(k, {
                    key: k,
                    unit: (item.unit || '').trim(),
                    subKegiatan: (item.subKegiatan || '').trim(),
                    bulanSPJ: (item.bulanSPJ || '').toUpperCase().trim(),
                    nama: item.nama || '-',       // nama dari entry terbaru
                    entries: [],
                    totalNominal: 0,
                    latestStatus: '',
                    latestTimestamp: null,
                    latestId: null,
                });
            }
            const g = map.get(k);
            g.entries.push(item);
            g.totalNominal += parseFloat(item.nominalSPJMasuk) || 0;
        });

        // Setelah semua entry masuk, entries sudah urut terbaru dulu (karena sorted)
        // Ambil metadata dari entry terbaru (index 0)
        const groups = [];
        map.forEach(g => {
            const latest = g.entries[0]; // terbaru
            g.latestStatus    = (latest.status || 'PENDING').toUpperCase();
            g.latestTimestamp = latest.timestamp;
            g.latestId        = latest.id;
            g.nama            = latest.nama || '-';
            groups.push(g);
        });

        // Urutkan grup: terbaru dulu (berdasarkan latestTimestamp)
        groups.sort((a, b) => {
            const ta = new Date(a.latestTimestamp).getTime() || 0;
            const tb = new Date(b.latestTimestamp).getTime() || 0;
            return tb - ta;
        });

        return groups;
    }

    // ── Load Data ─────────────────────────────────────────────
    window.spjpLoadData = async function (forceRefresh = false) {
        if (!forceRefresh) {
            const cached = getCachedData();
            if (cached) {
                allData = cached;
                groupedData = buildGroups(allData);
                filteredGroups = [...groupedData];
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
                allData = result.data || [];
                setCachedData(allData);
                groupedData = buildGroups(allData);
                filteredGroups = [...groupedData];
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
        const bulan  = (document.getElementById('spjp-filter-bulan')?.value || '').toUpperCase();
        const unit   = document.getElementById('spjp-filter-unit')?.value || '';
        const status = (document.getElementById('spjp-filter-status')?.value || '').toUpperCase();
        const search = (document.getElementById('spjp-search-nama')?.value || '').toLowerCase();

        filteredGroups = groupedData.filter(g => {
            const matchBulan  = !bulan  || g.bulanSPJ === bulan;
            const matchUnit   = !unit   || g.unit === unit;
            const matchStatus = !status || g.latestStatus === status;
            const matchSearch = !search
                || (g.nama || '').toLowerCase().includes(search)
                || (g.subKegiatan || '').toLowerCase().includes(search)
                || (g.unit || '').toLowerCase().includes(search);
            return matchBulan && matchUnit && matchStatus && matchSearch;
        });
        currentPage = 1; renderTable(); updateStats();
    };

    // ── Render Table ──────────────────────────────────────────
    function renderTable() {
        const tbody = document.getElementById('spjp-data-tbody');
        const pgn   = document.getElementById('spjp-pagination');
        if (!tbody) return;

        if (filteredGroups.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:#94a3b8;font-size:14px;">
                Tidak ada data SPJ yang sesuai filter
            </td></tr>`;
            if (pgn) pgn.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(filteredGroups.length / ITEMS_PER_PAGE);
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const items = filteredGroups.slice(start, start + ITEMS_PER_PAGE);

        tbody.innerHTML = items.map(g => {
            const isPending  = g.latestStatus === 'PENDING';
            const isApproved = g.latestStatus === 'APPROVED';
            const isRejected = g.latestStatus === 'REJECTED';
            const gk = encodeGK(g.key);
            const entryCount = g.entries.length;

            // Badge jumlah entry jika lebih dari 1
            const countBadge = entryCount > 1
                ? `<span class="spjp-entry-count" title="${entryCount} pengumpulan">${entryCount}x</span>`
                : '';

            let statusCell;
            if (isPending) {
                statusCell = `<div style="display:flex;align-items:center;justify-content:center;gap:4px;">
                    <button onclick="spjpApproveGroup('${gk}')" class="btn-icon btn-icon-approve" title="Setujui entry terbaru" id="spjp-btn-approve-${gk}">${ICONS.check}</button>
                    <button onclick="spjpRejectGroup('${gk}')"  class="btn-icon btn-icon-reject"  title="Tolak entry terbaru"  id="spjp-btn-reject-${gk}">${ICONS.x}</button>
                </div>`;
            } else if (isApproved) {
                statusCell = `<span class="badge badge-approved">Disetujui</span>`;
            } else if (isRejected) {
                statusCell = `<span class="badge badge-rejected">Ditolak</span>`;
            } else {
                statusCell = `<span class="badge badge-pending">${g.latestStatus || '-'}</span>`;
            }

            return `<tr>
                <td style="font-size:.85rem;color:#64748b;">${formatTimestamp(g.latestTimestamp)}</td>
                <td style="font-weight:500;">${g.nama || '-'}</td>
                <td>${g.unit || '-'}</td>
                <td style="min-width:200px;">${g.subKegiatan || '-'} ${countBadge}</td>
                <td>${g.bulanSPJ || '-'}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span id="spjp-nominal-display-${gk}">${fmtRupiah(g.totalNominal)}</span>
                        <button onclick="spjpOpenEditNominalModal('${gk}')" class="btn-icon-mini" title="Edit total nominal" style="opacity:.6;flex-shrink:0;">${ICONS.pencil}</button>
                    </div>
                </td>
                <td style="text-align:center;vertical-align:middle;">${statusCell}</td>
                <td>
                    <div class="action-buttons"><div class="btn-icon-group">
                        <button onclick="spjpOpenHistoryModal('${gk}')" class="btn-icon btn-icon-view" title="Lihat Riwayat (${entryCount} entry)">${ICONS.history}</button>
                        <button onclick="spjpOpenEditModal('${gk}')"    class="btn-icon btn-icon-edit"  title="Edit Status">${ICONS.edit}</button>
                        <button onclick="spjpDeleteGroup('${gk}')"      class="btn-icon btn-icon-delete" title="Hapus semua entry grup ini">${ICONS.trash}</button>
                    </div></div>
                </td>
            </tr>`;
        }).join('');

        if (pgn) pgn.innerHTML = `
            <button onclick="spjpChangePage(${currentPage-1})" ${currentPage===1?'disabled':''}>&#8249; Prev</button>
            <span class="pagination-info">Halaman ${currentPage} dari ${totalPages} (${filteredGroups.length} grup)</span>
            <button onclick="spjpChangePage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>Next &#8250;</button>`;
    }

    // encode/decode group key untuk attr HTML (ganti || dan spasi)
    function encodeGK(key) { return btoa(encodeURIComponent(key)).replace(/=/g,'_'); }
    function decodeGK(enc) { return decodeURIComponent(atob(enc.replace(/_/g,'='))); }

    function getGroupByGK(enc) {
        const key = decodeGK(enc);
        return groupedData.find(g => g.key === key) || null;
    }

    window.spjpChangePage = function (page) {
        const totalPages = Math.ceil(filteredGroups.length / ITEMS_PER_PAGE);
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

        const grupsIni     = groupedData.filter(g => g.bulanSPJ === currentMonthKey);
        const pendingGrups = groupedData.filter(g => g.latestStatus === 'PENDING');
        const totalNominal = filteredGroups.reduce((s, g) => s + g.totalNominal, 0);

        document.getElementById('spjp-total-pengumpulan').textContent = groupedData.length;
        document.getElementById('spjp-bulan-ini-count').textContent   = grupsIni.length;
        document.getElementById('spjp-pending-count').textContent     = pendingGrups.length;
        document.getElementById('spjp-total-nominal').textContent     = fmtRupiah(totalNominal);
        document.getElementById('spjp-bulan-ini-label').textContent   = `${currentMonthKey} ${currentYear}`;
    }

    // ── Approve / Reject Group (entry terbaru) ────────────────
    window.spjpApproveGroup = function (gk) {
        const g = getGroupByGK(gk);
        if (!g) return;
        showConfirmModal({
            icon: '✅', title: 'Setujui Pengumpulan SPJ?',
            message: `Entry terbaru dari <strong>${g.nama}</strong> — ${g.subKegiatan} akan disetujui.`,
            confirmText: 'Ya, Setujui', confirmClass: 'btn-success',
        }, async () => {
            const aBtn = document.getElementById(`spjp-btn-approve-${gk}`);
            const rBtn = document.getElementById(`spjp-btn-reject-${gk}`);
            if (aBtn) { aBtn.disabled = true; aBtn.innerHTML = '<span class="spinner spinner-sm"></span>'; }
            if (rBtn) rBtn.disabled = true;
            try {
                const result = await callAPI({ action: 'updateStatusSPJ', id: g.latestId, status: 'APPROVED' });
                if (result && result.success) {
                    if (window.showToast) showToast('SPJ berhasil disetujui', 'success');
                    window.spjpClearCache(); await window.spjpLoadData(true);
                } else {
                    if (window.showToast) showToast(result?.message || 'Gagal menyetujui', 'error');
                    if (aBtn) { aBtn.disabled = false; aBtn.innerHTML = ICONS.check; }
                    if (rBtn) rBtn.disabled = false;
                }
            } catch {
                if (window.showToast) showToast('Terjadi kesalahan', 'error');
                if (aBtn) { aBtn.disabled = false; aBtn.innerHTML = ICONS.check; }
                if (rBtn) rBtn.disabled = false;
            }
        });
    };

    window.spjpRejectGroup = function (gk) {
        const g = getGroupByGK(gk);
        if (!g) return;
        showConfirmModal({
            icon: '❌', title: 'Tolak Pengumpulan SPJ?',
            message: `Entry terbaru dari <strong>${g.nama}</strong> — ${g.subKegiatan} akan ditolak.`,
            confirmText: 'Ya, Tolak', confirmClass: 'btn-warning',
        }, async () => {
            const aBtn = document.getElementById(`spjp-btn-approve-${gk}`);
            const rBtn = document.getElementById(`spjp-btn-reject-${gk}`);
            if (rBtn) { rBtn.disabled = true; rBtn.innerHTML = '<span class="spinner spinner-sm"></span>'; }
            if (aBtn) aBtn.disabled = true;
            try {
                const result = await callAPI({ action: 'updateStatusSPJ', id: g.latestId, status: 'REJECTED' });
                if (result && result.success) {
                    if (window.showToast) showToast('SPJ berhasil ditolak', 'success');
                    window.spjpClearCache(); await window.spjpLoadData(true);
                } else {
                    if (window.showToast) showToast(result?.message || 'Gagal menolak', 'error');
                    if (rBtn) { rBtn.disabled = false; rBtn.innerHTML = ICONS.x; }
                    if (aBtn) aBtn.disabled = false;
                }
            } catch {
                if (window.showToast) showToast('Terjadi kesalahan', 'error');
                if (rBtn) { rBtn.disabled = false; rBtn.innerHTML = ICONS.x; }
                if (aBtn) aBtn.disabled = false;
            }
        });
    };

    // ── Delete Group (hapus semua entry dalam grup) ───────────
    window.spjpDeleteGroup = function (gk) {
        const g = getGroupByGK(gk);
        if (!g) return;
        const cnt = g.entries.length;
        showConfirmModal({
            icon: '🗑️', title: 'Hapus Semua Entry Grup Ini?',
            message: `<strong>${g.subKegiatan}</strong><br>${g.unit} · ${g.bulanSPJ}<br>
                      <br>Akan menghapus <strong>${cnt} entry</strong> dengan total Rp ${fmtNum(g.totalNominal)}.
                      <br><br><span style="color:#ef4444;font-weight:600;">Tindakan ini tidak dapat dibatalkan.</span>`,
            confirmText: `Ya, Hapus ${cnt} Entry`, confirmClass: 'btn-danger',
        }, async () => {
            try {
                // Hapus semua entry satu per satu (server tidak mendukung bulk delete)
                for (const entry of g.entries) {
                    await callAPI({ action: 'deletePenyampaianSPJ', id: entry.id });
                }
                if (window.showToast) showToast(`${cnt} entry berhasil dihapus`, 'success');
                window.spjpClearCache(); await window.spjpLoadData(true);
            } catch (err) {
                if (window.showToast) showToast('Gagal menghapus: ' + err.message, 'error');
            }
        });
    };

    // ── Edit Status Modal (Group Level) ───────────────────────
    window.spjpOpenEditModal = function (gk) {
        const g = getGroupByGK(gk);
        if (!g) return;
        currentEditGroupKey = gk;
        currentEditStatus   = g.latestStatus;

        document.getElementById('spjp-edit-modal-subtitle').textContent = `${g.nama || '-'} — ${g.bulanSPJ || ''}`;
        document.getElementById('spjp-edit-info-nama').textContent    = g.nama || '-';
        document.getElementById('spjp-edit-info-unit').textContent    = g.unit || '-';
        document.getElementById('spjp-edit-info-subkeg').textContent  = g.subKegiatan || '-';
        document.getElementById('spjp-edit-info-bulan').textContent   = g.bulanSPJ || '-';
        document.getElementById('spjp-edit-info-nominal').textContent = fmtRupiah(g.totalNominal);

        spjpSelectStatus(currentEditStatus);
        document.getElementById('spjp-editModal').style.display = 'flex';
    };

    window.spjpSelectStatus = function (status) {
        currentEditStatus = status;
        ['PENDING','APPROVED','REJECTED'].forEach(s => {
            const el = document.getElementById('spjp-opt-' + s.toLowerCase());
            if (el) el.classList.remove('spjp-opt-selected-pending','spjp-opt-selected-approved','spjp-opt-selected-rejected');
        });
        const radio = document.getElementById('spjp-radio-' + status.toLowerCase());
        if (radio) radio.checked = true;
        const active = document.getElementById('spjp-opt-' + status.toLowerCase());
        if (active) active.classList.add('spjp-opt-selected-' + status.toLowerCase());
    };

    window.spjpCloseEditModal = function () {
        document.getElementById('spjp-editModal').style.display = 'none';
        currentEditGroupKey = null;
    };

    window.spjpSubmitEdit = async function () {
        if (!currentEditGroupKey || !currentEditStatus) return;
        const g = getGroupByGK(currentEditGroupKey);
        if (!g) return;
        const btn = document.getElementById('spjp-btn-submit-edit');
        const orig = btn.innerHTML;
        btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan...';
        try {
            const result = await callAPI({ action: 'updateStatusSPJ', id: g.latestId, status: currentEditStatus });
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

    // ── Edit Nominal Modal ────────────────────────────────────
    // Bisa edit total (override seluruh entry dengan satu nilai) ATAU per-entry di history modal
    window.spjpOpenEditNominalModal = function (gk) {
        const g = getGroupByGK(gk);
        if (!g) return;

        const ex = document.getElementById('spjp-nominal-modal');
        if (ex) ex.remove();

        const isSingle = g.entries.length === 1;

        const modal = document.createElement('div');
        modal.id = 'spjp-nominal-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';

        let entryRows = '';
        if (!isSingle) {
            entryRows = g.entries.map((entry, i) => {
                const stColor = entry.status === 'APPROVED' ? '#10b981' : entry.status === 'REJECTED' ? '#ef4444' : '#f59e0b';
                return `<div class="spjp-nominal-entry-row" id="spjp-nominal-row-${entry.id}">
                    <div class="spjp-nominal-entry-meta">
                        <span style="font-size:12px;color:#64748b;">${formatTimestamp(entry.timestamp)}</span>
                        <span style="font-size:11px;font-weight:600;color:${stColor};background:${stColor}18;padding:2px 8px;border-radius:20px;">${entry.status}</span>
                    </div>
                    <div class="spjp-nominal-entry-input">
                        <span style="font-size:13px;color:#64748b;white-space:nowrap;">Rp</span>
                        <input type="number" id="spjp-nominal-entry-${entry.id}"
                            value="${parseFloat(entry.nominalSPJMasuk) || 0}"
                            min="0" step="1000"
                            style="flex:1;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;font-family:inherit;">
                        <button onclick="spjpSaveEntryNominal('${entry.id}','${gk}')" class="btn btn-primary btn-sm"
                            style="display:flex;align-items:center;gap:4px;white-space:nowrap;" id="spjp-save-entry-btn-${entry.id}">
                            ${ICONS.save} Simpan
                        </button>
                        <button onclick="spjpDeleteEntry('${entry.id}','${gk}')" class="btn btn-sm"
                            style="background:#fee2e2;color:#ef4444;border:none;display:flex;align-items:center;gap:4px;white-space:nowrap;" id="spjp-del-entry-btn-${entry.id}">
                            ${ICONS.trash}
                        </button>
                    </div>
                </div>`;
            }).join('');
        }

        const singleInput = `
            <div style="margin-bottom:8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;">
                ${isSingle ? 'Nominal SPJ' : 'atau: Override Total (akan distribusi rata ke semua entry)'}
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <span style="font-size:13px;color:#64748b;white-space:nowrap;">Rp</span>
                <input type="number" id="spjp-nominal-total-input"
                    value="${g.totalNominal}"
                    min="0" step="1000"
                    style="flex:1;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;font-weight:600;">
            </div>
            ${!isSingle ? `<div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">Total baru akan dibagi rata ke ${g.entries.length} entry.</div>` : ''}`;

        modal.innerHTML = `
        <div class="modal" style="max-width:520px;">
            <div class="modal-header">
                <h2 class="modal-title">Edit Nominal SPJ</h2>
                <p style="font-size:13px;color:#64748b;margin-top:4px;">${g.subKegiatan || '-'} · ${g.bulanSPJ}</p>
            </div>
            <div class="modal-content" style="display:flex;flex-direction:column;gap:14px;">
                ${!isSingle ? `
                <div>
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin-bottom:10px;">
                        Edit Per Entry (${g.entries.length} pengumpulan)
                    </div>
                    <div style="display:flex;flex-direction:column;gap:10px;">${entryRows}</div>
                </div>
                <div style="border-top:1px solid #f1f5f9;padding-top:14px;">` : ''}
                ${singleInput}
                ${!isSingle ? `</div>` : ''}
            </div>
            <div class="modal-footer">
                <button onclick="document.getElementById('spjp-nominal-modal').remove()" class="btn" style="flex:1;">Tutup</button>
                <button onclick="spjpSaveTotalNominal('${gk}')" class="btn btn-primary" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;" id="spjp-save-total-btn">
                    ${ICONS.save} ${isSingle ? 'Simpan Nominal' : 'Simpan Override Total'}
                </button>
            </div>
        </div>`;

        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        document.body.appendChild(modal);
    };

    // Simpan nominal per entry (update nominalSPJMasuk entry tertentu)
    // Note: server saat ini hanya punya updateStatusSPJ, bukan updateNominalSPJ.
    // Kita simulasikan dengan menyimpan override di allData lokal dan update cache.
    // Jika backend nanti ditambah endpoint updateNominalSPJ, ganti blok try-catch di bawah.
    window.spjpSaveEntryNominal = async function (entryId, gk) {
        const input = document.getElementById(`spjp-nominal-entry-${entryId}`);
        if (!input) return;
        const newVal = parseFloat(input.value);
        if (isNaN(newVal) || newVal < 0) {
            if (window.showToast) showToast('Nominal tidak valid', 'error');
            return;
        }
        const btn = document.getElementById(`spjp-save-entry-btn-${entryId}`);
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span>'; }

        // Update lokal (frontend only) — karena server belum punya endpoint edit nominal
        const idx = allData.findIndex(d => d.id === entryId);
        if (idx !== -1) {
            allData[idx].nominalSPJMasuk = newVal;
            setCachedData(allData);
            groupedData = buildGroups(allData);
            filteredGroups = applyCurrentFilter();
            renderTable(); updateStats();
        }

        if (btn) { btn.disabled = false; btn.innerHTML = `${ICONS.save} Simpan`; }
        if (window.showToast) showToast('Nominal entry diperbarui (lokal)', 'success');

        // Refresh modal agar total terupdate
        const modal = document.getElementById('spjp-nominal-modal');
        if (modal) { modal.remove(); spjpOpenEditNominalModal(gk); }
    };

    // Override total → bagi rata ke semua entry
    window.spjpSaveTotalNominal = async function (gk) {
        const g = getGroupByGK(gk);
        if (!g) return;
        const input = document.getElementById('spjp-nominal-total-input');
        if (!input) return;
        const newTotal = parseFloat(input.value);
        if (isNaN(newTotal) || newTotal < 0) {
            if (window.showToast) showToast('Nominal tidak valid', 'error');
            return;
        }
        const btn = document.getElementById('spjp-save-total-btn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan...'; }

        const perEntry = g.entries.length > 0 ? newTotal / g.entries.length : 0;
        g.entries.forEach(entry => {
            const idx = allData.findIndex(d => d.id === entry.id);
            if (idx !== -1) allData[idx].nominalSPJMasuk = perEntry;
        });
        setCachedData(allData);
        groupedData = buildGroups(allData);
        filteredGroups = applyCurrentFilter();
        renderTable(); updateStats();

        document.getElementById('spjp-nominal-modal')?.remove();
        if (window.showToast) showToast('Total nominal diperbarui (lokal)', 'success');
    };

    // Delete entry tunggal dari dalam modal nominal
    window.spjpDeleteEntry = function (entryId, gk) {
        const entry = allData.find(d => d.id === entryId);
        if (!entry) return;
        showConfirmModal({
            icon: '🗑️', title: 'Hapus Entry Ini?',
            message: `Nominal: Rp ${fmtNum(entry.nominalSPJMasuk)}<br>${formatTimestamp(entry.timestamp)}<br>
                      <br><span style="color:#ef4444;font-weight:600;">Tidak dapat dibatalkan.</span>`,
            confirmText: 'Ya, Hapus', confirmClass: 'btn-danger',
        }, async () => {
            try {
                const result = await callAPI({ action: 'deletePenyampaianSPJ', id: entryId });
                if (result && result.success) {
                    if (window.showToast) showToast('Entry dihapus', 'success');
                    document.getElementById('spjp-nominal-modal')?.remove();
                    window.spjpClearCache(); await window.spjpLoadData(true);
                } else {
                    if (window.showToast) showToast(result?.message || 'Gagal menghapus', 'error');
                }
            } catch (err) {
                if (window.showToast) showToast('Error: ' + err.message, 'error');
            }
        });
    };

    // helper: terapkan filter saat ini ke groupedData yang sudah di-rebuild
    function applyCurrentFilter() {
        const bulan  = (document.getElementById('spjp-filter-bulan')?.value || '').toUpperCase();
        const unit   = document.getElementById('spjp-filter-unit')?.value || '';
        const status = (document.getElementById('spjp-filter-status')?.value || '').toUpperCase();
        const search = (document.getElementById('spjp-search-nama')?.value || '').toLowerCase();
        return groupedData.filter(g => {
            const matchBulan  = !bulan  || g.bulanSPJ === bulan;
            const matchUnit   = !unit   || g.unit === unit;
            const matchStatus = !status || g.latestStatus === status;
            const matchSearch = !search
                || (g.nama||'').toLowerCase().includes(search)
                || (g.subKegiatan||'').toLowerCase().includes(search)
                || (g.unit||'').toLowerCase().includes(search);
            return matchBulan && matchUnit && matchStatus && matchSearch;
        });
    }

    // ── History / Riwayat Modal ───────────────────────────────
    window.spjpOpenHistoryModal = function (gk) {
        const g = getGroupByGK(gk);
        if (!g) return;

        const ex = document.getElementById('spjp-history-modal');
        if (ex) ex.remove();

        const modal = document.createElement('div');
        modal.id = 'spjp-history-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';

        const entryRows = g.entries.map((entry, i) => {
            const stColor = entry.status === 'APPROVED' ? '#10b981' : entry.status === 'REJECTED' ? '#ef4444' : '#f59e0b';
            const stBg    = entry.status === 'APPROVED' ? '#f0fdf4' : entry.status === 'REJECTED' ? '#fff1f2' : '#fffbeb';
            const stLabel = entry.status === 'APPROVED' ? 'Disetujui' : entry.status === 'REJECTED' ? 'Ditolak' : 'Pending';
            const isLatest = i === 0;

            return `<div class="spjp-history-entry ${isLatest ? 'spjp-history-entry-latest' : ''}">
                <div class="spjp-history-entry-header">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div class="spjp-history-num">${g.entries.length - i}</div>
                        <div>
                            <div style="font-size:13px;font-weight:600;color:#1e293b;">
                                ${formatTimestamp(entry.timestamp)}
                                ${isLatest ? '<span class="spjp-latest-badge">Terbaru</span>' : ''}
                            </div>
                            <div style="font-size:11px;color:#94a3b8;">ID: ${entry.id}</div>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:12px;font-weight:700;color:${stColor};background:${stBg};border:1px solid ${stColor}30;padding:3px 10px;border-radius:20px;">${stLabel}</span>
                    </div>
                </div>
                <div class="spjp-history-entry-body">
                    <div class="spjp-history-field">
                        <span class="spjp-history-label">Nominal</span>
                        <span class="spjp-history-value" id="spjp-hval-${entry.id}">${fmtRupiah(entry.nominalSPJMasuk)}</span>
                    </div>
                    <div class="spjp-history-field">
                        <span class="spjp-history-label">Nama</span>
                        <span class="spjp-history-value">${entry.nama || '-'}</span>
                    </div>
                </div>
                <div class="spjp-history-entry-actions">
                    <button onclick="spjpHistoryEditStatus('${entry.id}','${entry.status}','${gk}')"
                        class="btn btn-sm" style="display:flex;align-items:center;gap:5px;">
                        ${ICONS.edit} Edit Status
                    </button>
                    <button onclick="spjpHistoryEditNominal('${entry.id}','${gk}')"
                        class="btn btn-sm" style="display:flex;align-items:center;gap:5px;">
                        ${ICONS.pencil} Edit Nominal
                    </button>
                    <button onclick="spjpDeleteEntry('${entry.id}','${gk}')"
                        class="btn btn-sm" style="background:#fee2e2;color:#ef4444;border:none;display:flex;align-items:center;gap:5px;">
                        ${ICONS.trash} Hapus
                    </button>
                </div>
            </div>`;
        }).join('');

        modal.innerHTML = `
        <div class="modal" style="max-width:600px;">
            <div class="modal-header">
                <h2 class="modal-title">Riwayat Pengumpulan SPJ</h2>
                <p style="font-size:13px;color:#64748b;margin-top:4px;">${g.subKegiatan || '-'}</p>
            </div>
            <div class="modal-content" style="padding-bottom:0;">
                <!-- Summary strip -->
                <div class="spjp-history-summary">
                    <div class="spjp-hs-item">
                        <div class="spjp-hs-label">Unit / Bidang</div>
                        <div class="spjp-hs-value">${g.unit}</div>
                    </div>
                    <div class="spjp-hs-item">
                        <div class="spjp-hs-label">Bulan SPJ</div>
                        <div class="spjp-hs-value">${g.bulanSPJ}</div>
                    </div>
                    <div class="spjp-hs-item">
                        <div class="spjp-hs-label">Total Entry</div>
                        <div class="spjp-hs-value">${g.entries.length}x pengumpulan</div>
                    </div>
                    <div class="spjp-hs-item">
                        <div class="spjp-hs-label">Total Nominal</div>
                        <div class="spjp-hs-value" style="color:#10b981;font-size:15px;">${fmtRupiah(g.totalNominal)}</div>
                    </div>
                </div>
                <!-- Timeline entries -->
                <div style="display:flex;flex-direction:column;gap:12px;max-height:420px;overflow-y:auto;padding:16px;">
                    ${entryRows}
                </div>
            </div>
            <div class="modal-footer">
                <button onclick="document.getElementById('spjp-history-modal').remove()" class="btn" style="flex:1;">Tutup</button>
                <button onclick="spjpOpenEditNominalModal('${gk}');document.getElementById('spjp-history-modal').remove();" class="btn btn-primary" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;">
                    ${ICONS.pencil} Edit Nominal
                </button>
            </div>
        </div>`;

        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        document.body.appendChild(modal);
    };

    // Edit status entry individual dari history modal
    window.spjpHistoryEditStatus = function (entryId, currentStatus, gk) {
        let selectedStatus = (currentStatus || 'PENDING').toUpperCase();
        const entry = allData.find(d => d.id === entryId);
        if (!entry) return;

        const ex = document.getElementById('spjp-history-status-modal');
        if (ex) ex.remove();

        const modal = document.createElement('div');
        modal.id = 'spjp-history-status-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';

        const opts = [
            { val: 'PENDING',  label: 'Pending',    sub: 'Menunggu verifikasi', color: '#f59e0b', bg: '#fffbeb', tc: '#92400e' },
            { val: 'APPROVED', label: 'Disetujui',  sub: 'SPJ diverifikasi',    color: '#10b981', bg: '#f0fdf4', tc: '#065f46' },
            { val: 'REJECTED', label: 'Ditolak',    sub: 'SPJ tidak memenuhi',  color: '#ef4444', bg: '#fff1f2', tc: '#991b1b' },
        ];

        modal.innerHTML = `
        <div class="modal" style="max-width:400px;">
            <div class="modal-header">
                <h2 class="modal-title">Edit Status Entry</h2>
                <p style="font-size:13px;color:#64748b;margin-top:4px;">${formatTimestamp(entry.timestamp)}</p>
            </div>
            <div class="modal-content">
                <div class="spjp-status-options" id="spjp-hs-status-opts">
                ${opts.map(o => `
                    <label class="spjp-status-option ${selectedStatus === o.val ? 'spjp-opt-selected-'+o.val.toLowerCase() : ''}"
                           id="spjp-hso-${o.val.toLowerCase()}"
                           onclick="(function(){
                               ['pending','approved','rejected'].forEach(s=>{
                                   document.getElementById('spjp-hso-'+s).classList.remove('spjp-opt-selected-pending','spjp-opt-selected-approved','spjp-opt-selected-rejected');
                               });
                               document.getElementById('spjp-hso-${o.val.toLowerCase()}').classList.add('spjp-opt-selected-${o.val.toLowerCase()}');
                               window._spjpHistoryStatus='${o.val}';
                           })()">
                        <input type="radio" name="spjp-hs-radio" ${selectedStatus===o.val?'checked':''}>
                        <div style="width:10px;height:10px;border-radius:50%;background:${o.color};flex-shrink:0;"></div>
                        <div>
                            <div class="spjp-status-option-label" style="color:${o.tc};">${o.label}</div>
                            <div class="spjp-status-option-sub">${o.sub}</div>
                        </div>
                    </label>`).join('')}
                </div>
            </div>
            <div class="modal-footer">
                <button onclick="document.getElementById('spjp-history-status-modal').remove()" class="btn" style="flex:1;">Batal</button>
                <button onclick="spjpSaveHistoryStatus('${entryId}','${gk}')" class="btn btn-primary" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;" id="spjp-hss-save-btn">
                    ${ICONS.save} Simpan
                </button>
            </div>
        </div>`;
        window._spjpHistoryStatus = selectedStatus;
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        document.body.appendChild(modal);
    };

    window.spjpSaveHistoryStatus = async function (entryId, gk) {
        const status = window._spjpHistoryStatus;
        if (!status) return;
        const btn = document.getElementById('spjp-hss-save-btn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan...'; }
        try {
            const result = await callAPI({ action: 'updateStatusSPJ', id: entryId, status });
            if (result && result.success) {
                if (window.showToast) showToast('Status entry diperbarui', 'success');
                document.getElementById('spjp-history-status-modal')?.remove();
                document.getElementById('spjp-history-modal')?.remove();
                window.spjpClearCache(); await window.spjpLoadData(true);
            } else {
                if (window.showToast) showToast(result?.message || 'Gagal', 'error');
                if (btn) { btn.disabled = false; btn.innerHTML = `${ICONS.save} Simpan`; }
            }
        } catch {
            if (window.showToast) showToast('Gagal menghubungi server', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = `${ICONS.save} Simpan`; }
        }
    };

    // Edit nominal dari dalam history modal
    window.spjpHistoryEditNominal = function (entryId, gk) {
        document.getElementById('spjp-history-modal')?.remove();
        spjpOpenEditNominalModal(gk);
    };

    // ═══ HTML Injection & Initialization ════════════════════
    window.sectionInits = window.sectionInits || {};
    window.sectionInits['spj-pengumpulan'] = function () {
        const section = document.getElementById('section-spj-pengumpulan');
        if (!section) return;
        section.innerHTML = `
<style>
/* ── Entry count badge ── */
.spjp-entry-count {
    display: inline-flex; align-items: center; justify-content: center;
    background: #eff6ff; color: #3b82f6; font-size: 10px; font-weight: 700;
    padding: 1px 7px; border-radius: 20px; margin-left: 6px; vertical-align: middle;
    border: 1px solid #bfdbfe;
}

/* ── Mini icon button (pencil beside nominal) ── */
.btn-icon-mini {
    width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center;
    background: transparent; border: 1px solid #e2e8f0; border-radius: 6px;
    cursor: pointer; transition: all .15s; padding: 0; color: #64748b;
}
.btn-icon-mini:hover { background: #f1f5f9; border-color: #94a3b8; color: #1e293b; }

/* ── History modal ── */
.spjp-history-summary {
    display: grid; grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 12px; padding: 16px; background: #f8fafc;
    border-bottom: 1px solid #f1f5f9;
}
@media(max-width:520px){ .spjp-history-summary { grid-template-columns: 1fr 1fr; } }
.spjp-hs-item { display: flex; flex-direction: column; gap: 3px; }
.spjp-hs-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #94a3b8; }
.spjp-hs-value { font-size: 13px; font-weight: 700; color: #1e293b; }

.spjp-history-entry {
    background: #fff; border: 1.5px solid #f1f5f9; border-radius: 12px;
    overflow: hidden; transition: border-color .15s;
}
.spjp-history-entry-latest {
    border-color: #bfdbfe; background: #eff6ff10;
}
.spjp-history-entry-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px; border-bottom: 1px solid #f1f5f9;
}
.spjp-history-num {
    width: 28px; height: 28px; border-radius: 50%;
    background: #f1f5f9; color: #64748b;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; flex-shrink: 0;
}
.spjp-latest-badge {
    display: inline-block; background: #dbeafe; color: #1d4ed8;
    font-size: 10px; font-weight: 700; padding: 1px 7px;
    border-radius: 20px; margin-left: 6px; vertical-align: middle;
}
.spjp-history-entry-body {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 8px; padding: 12px 14px;
}
.spjp-history-field { display: flex; flex-direction: column; gap: 2px; }
.spjp-history-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #94a3b8; }
.spjp-history-value { font-size: 13px; font-weight: 600; color: #1e293b; }
.spjp-history-entry-actions {
    display: flex; gap: 8px; padding: 10px 14px;
    border-top: 1px solid #f1f5f9; flex-wrap: wrap;
}

/* ── Nominal entry row ── */
.spjp-nominal-entry-row {
    background: #f8fafc; border-radius: 10px; padding: 12px;
    border: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 8px;
}
.spjp-nominal-entry-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.spjp-nominal-entry-input { display: flex; align-items: center; gap: 8px; }

/* ── Status options (reused) ── */
.spjp-status-options { display:flex; flex-direction:column; gap:8px; margin-top:8px; }
.spjp-status-option { display:flex; align-items:center; gap:12px; padding:12px 14px; border:1.5px solid #e2e8f0; border-radius:10px; cursor:pointer; transition:all 0.15s; }
.spjp-status-option:hover { border-color:#94a3b8; background:#f8fafc; }
.spjp-status-option input[type="radio"] { display:none; }
.spjp-status-option-label { font-size:13.5px; font-weight:600; }
.spjp-status-option-sub { font-size:12px; color:#64748b; margin-top:1px; }
.spjp-opt-selected-pending  { border-color:#f59e0b !important; background:#fffbeb !important; }
.spjp-opt-selected-approved { border-color:#10b981 !important; background:#f0fdf4 !important; }
.spjp-opt-selected-rejected { border-color:#ef4444 !important; background:#fff1f2 !important; }

/* ── Info grid (edit status modal) ── */
.spjp-info-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; background:#f8fafc; border-radius:10px; padding:14px; border:1px solid #f1f5f9; margin-bottom:16px; }
.spjp-info-item { display:flex; flex-direction:column; gap:2px; }
.spjp-info-label { font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; }
.spjp-info-value { font-size:13px; font-weight:600; color:#1e293b; }

/* ── Filter row ── */
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
            <div class="stat-label">Total Grup SPJ</div>
            <div class="stat-value" id="spjp-total-pengumpulan">0</div>
            <div class="stat-footer">Sub kegiatan unik</div>
        </div>
        <div class="stat-card" style="border-left:4px solid #3b82f6;">
            <div class="stat-label">Bulan Ini</div>
            <div class="stat-value" id="spjp-bulan-ini-count">0</div>
            <div class="stat-footer" id="spjp-bulan-ini-label">Grup</div>
        </div>
        <div class="stat-card" style="border-left:4px solid #f59e0b;">
            <div class="stat-label">Pending</div>
            <div class="stat-value" id="spjp-pending-count">0</div>
            <div class="stat-footer">Menunggu verifikasi</div>
        </div>
        <div class="stat-card" style="border-left:4px solid #64748b;">
            <div class="stat-label">Total Nominal</div>
            <div class="stat-value" id="spjp-total-nominal" style="font-size:24px;">Rp 0</div>
            <div class="stat-footer">Akumulasi SPJ (filtered)</div>
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
                        <th>Terakhir Submit</th><th>Nama</th><th>Unit / Bidang</th>
                        <th>Sub Kegiatan</th><th>Bulan SPJ</th><th>Total Nominal</th><th>Status</th><th>Aksi</th>
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

<!-- EDIT STATUS MODAL (Group Level) -->
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
                <div class="spjp-info-item"><div class="spjp-info-label">Total Nominal</div><div class="spjp-info-value" id="spjp-edit-info-nominal">—</div></div>
            </div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;margin-bottom:8px;">
                Ubah Status (berlaku untuk entry terbaru)
            </div>
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
</div>`;

        window.addEventListener('click', e => {
            if (e.target && e.target.id === 'spjp-editModal') window.spjpCloseEditModal();
        });

        // Set filter bulan ke bulan ini
        const currentMonthName = new Date().toLocaleString('id-ID', { month: 'long' }).toUpperCase();
        const fMonth = document.getElementById('spjp-filter-bulan');
        if (fMonth) fMonth.value = currentMonthName;

        window.spjpLoadData(false).then(() => {
            window.spjpFilterData();
        });
    };
})();