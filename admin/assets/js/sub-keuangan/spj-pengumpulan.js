// ============================================================
// spj-pengumpulan.js — Pengumpulan SPJ section (SPA)
// Admin Panel — Dinas Koperasi UKM
// ============================================================
(function () {
    'use strict';

    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxoYIwpRZizipn0TD84nNeoqld570-85UlnL6jBdXbbu-GVNwoEK712P7yB1e03SSU0EQ/exec';
    const CACHE_KEY = 'spj_pengumpulan_cache';
    const CACHE_DURATION = 5 * 60 * 1000;
    let allData = [];
    let filteredData = [];

    const ICONS = {
        check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
        x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        eye: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
        link: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
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
        } catch (err) { return null; }
    }
    function setCachedData(data) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() })); } catch (err) { }
    }
    window.spjpClearCache = function () { localStorage.removeItem(CACHE_KEY); };

    // ── Format ────────────────────────────────────────────────
    function formatTimestamp(timestamp) {
        if (!timestamp) return '-';
        try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return timestamp.toString();
            const pad = n => n.toString().padStart(2, '0');
            return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
        } catch (err) { return timestamp.toString(); }
    }

    // ── API ───────────────────────────────────────────────────
    function callAPI(params) {
        return new Promise((resolve, reject) => {
            const cb = 'jsonp_spjp_' + Date.now();
            window[cb] = data => { cleanup(); resolve(data); };
            const qs = new URLSearchParams({ ...params, callback: cb }).toString();
            const s = document.createElement('script');
            s.src = `${APPS_SCRIPT_URL}?${qs}`;
            const t = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 12000);
            function cleanup() { clearTimeout(t); if (s.parentNode) s.parentNode.removeChild(s); delete window[cb]; }
            s.onerror = () => { cleanup(); reject(new Error('network')); };
            document.body.appendChild(s);
        });
    }

    function showEmptyState(message) {
        const tbody = document.getElementById('spjp-data-tbody');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <h3>Tidak dapat memuat data</h3><p>${message}</p>
        </div></td></tr>`;
    }

    // ── Load Data ─────────────────────────────────────────────
    window.spjpLoadData = async function (forceRefresh = false) {
        if (!forceRefresh) {
            const cachedData = getCachedData();
            if (cachedData) {
                allData = cachedData;
                filteredData = [...allData];
                spjpRenderTable(); updateStats();
                return;
            }
        }
        const tbody = document.getElementById('spjp-data-tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:#94a3b8;"><div class="spinner"></div><div style="margin-top:12px;">Memuat data...</div></td></tr>`;
        try {
            const result = await callAPI({ action: 'getPenyampaianSPJ' });
            if (result && result.success) {
                allData = result.data || [];
                filteredData = [...allData];
                setCachedData(allData);
                spjpRenderTable(); updateStats();
            } else {
                showEmptyState('Gagal memuat data: ' + (result?.message || 'Unknown error'));
            }
        } catch (err) {
            showEmptyState('Gagal memuat data. Periksa koneksi internet Anda.');
        }
    };

    // ── Filter ────────────────────────────────────────────────
    window.spjpFilterData = function () {
        const bulan = document.getElementById('spjp-filter-bulan')?.value.toUpperCase() || '';
        const unit = document.getElementById('spjp-filter-unit')?.value || '';
        const status = document.getElementById('spjp-filter-status')?.value.toUpperCase() || '';
        const search = document.getElementById('spjp-search-nama')?.value.toLowerCase() || '';
        filteredData = allData.filter(item => {
            const matchBulan = !bulan || item.bulanSPJ?.toUpperCase() === bulan;
            const matchUnit = !unit || item.unit === unit;
            const matchStatus = !status || item.status?.toUpperCase() === status;
            const matchSearch = !search || item.nama?.toLowerCase().includes(search);
            return matchBulan && matchUnit && matchStatus && matchSearch;
        });
        spjpRenderTable(); updateStats();
    };

    // ── Render Table ──────────────────────────────────────────
    window.spjpRenderTable = function () {
        const tbody = document.getElementById('spjp-data-tbody');
        if (!tbody) return;
        if (filteredData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state">
                <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                <h3>Tidak ada data</h3><p>Belum ada pengumpulan SPJ atau filter tidak menemukan hasil</p>
            </div></td></tr>`;
            return;
        }
        const fmt = n => new Intl.NumberFormat('id-ID').format(n);
        tbody.innerHTML = filteredData.map((item, idx) => {
            const isPending = item.status === 'PENDING';
            const statusClass = item.status === 'APPROVED' ? 'badge-approved' : item.status === 'REJECTED' ? 'badge-rejected' : 'badge-pending';
            const statusText = item.status === 'APPROVED' ? 'Disetujui' : item.status === 'REJECTED' ? 'Ditolak' : 'Pending';
            return `<tr>
                <td>${idx + 1}</td>
                <td style="font-size:.85rem;color:#64748b;">${formatTimestamp(item.timestamp)}</td>
                <td style="font-weight:500;">${item.nama || '-'}</td>
                <td>${item.unit || '-'}</td>
                <td>${item.bulanSPJ || '-'}</td>
                <td>Rp ${item.nominalSPJMasuk ? fmt(item.nominalSPJMasuk) : '0'}</td>
                <td>${item.linkFileIzinKeterlambatan
                    ? `<a href="${item.linkFileIzinKeterlambatan}" target="_blank" class="link-file" rel="noopener noreferrer">${ICONS.link} Lihat</a>`
                    : '<span style="color:#94a3b8;">—</span>'}</td>
                <td>${item.linkFileSPJ
                    ? `<a href="${item.linkFileSPJ}" target="_blank" class="link-file" rel="noopener noreferrer">${ICONS.link} Lihat SPJ</a>`
                    : '<span style="color:#94a3b8;">—</span>'}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        ${isPending ? `
                        <div class="btn-icon-group">
                            <button onclick="spjpApproveItem('${item.id}')" class="btn-icon btn-icon-approve" data-tip="Setujui" id="spjp-btn-approve-${item.id}">${ICONS.check}</button>
                            <button onclick="spjpRejectItem('${item.id}')" class="btn-icon btn-icon-reject" data-tip="Tolak" id="spjp-btn-reject-${item.id}">${ICONS.x}</button>
                        </div>` : `
                        <div class="btn-icon-group">
                            <button onclick="spjpViewDetail('${item.id}')" class="btn-icon btn-icon-view" data-tip="Detail">${ICONS.eye}</button>
                        </div>`}
                    </div>
                </td>
            </tr>`;
        }).join('');
    };

    // ── Stats ─────────────────────────────────────────────────
    function updateStats() {
        if (!document.getElementById('spjp-total-pengumpulan')) return;
        const currentMonth = new Date().toLocaleString('id-ID', { month: 'long' }).toUpperCase();
        const bulanIniData = allData.filter(item => item.bulanSPJ?.toUpperCase() === currentMonth);
        const pendingData = allData.filter(item => item.status === 'PENDING');
        const totalNominal = filteredData.reduce((sum, item) => sum + (parseFloat(item.nominalSPJMasuk) || 0), 0);
        document.getElementById('spjp-total-pengumpulan').textContent = allData.length;
        document.getElementById('spjp-bulan-ini-count').textContent = bulanIniData.length;
        document.getElementById('spjp-pending-count').textContent = pendingData.length;
        document.getElementById('spjp-total-nominal').textContent = 'Rp ' + new Intl.NumberFormat('id-ID').format(totalNominal);
        const yr = new Date().getFullYear();
        document.getElementById('spjp-bulan-ini-label').textContent = `${currentMonth} ${yr}`;
    }

    // ── Actions ───────────────────────────────────────────────
    window.spjpApproveItem = async function (id) {
        if (!confirm('Setujui pengumpulan SPJ ini?')) return;
        const approveBtn = document.getElementById(`spjp-btn-approve-${id}`);
        const rejectBtn = document.getElementById(`spjp-btn-reject-${id}`);
        if (!approveBtn || !rejectBtn) return;
        approveBtn.disabled = true; rejectBtn.disabled = true;
        approveBtn.innerHTML = '<span class="spinner spinner-sm"></span>';
        try {
            const result = await callAPI({ action: 'updateStatusSPJ', id, status: 'APPROVED' });
            if (result && result.success) {
                if (window.showToast) showToast('SPJ berhasil disetujui', 'success');
                window.spjpClearCache(); await window.spjpLoadData(true);
            } else {
                if (window.showToast) showToast(result?.message || 'Gagal menyetujui SPJ', 'error');
                approveBtn.disabled = false; rejectBtn.disabled = false;
                approveBtn.innerHTML = ICONS.check;
            }
        } catch (err) {
            if (window.showToast) showToast('Terjadi kesalahan saat menyetujui SPJ', 'error');
            approveBtn.disabled = false; rejectBtn.disabled = false;
            approveBtn.innerHTML = ICONS.check;
        }
    };

    window.spjpRejectItem = async function (id) {
        if (!confirm('Tolak pengumpulan SPJ ini?')) return;
        const approveBtn = document.getElementById(`spjp-btn-approve-${id}`);
        const rejectBtn = document.getElementById(`spjp-btn-reject-${id}`);
        if (!approveBtn || !rejectBtn) return;
        approveBtn.disabled = true; rejectBtn.disabled = true;
        rejectBtn.innerHTML = '<span class="spinner spinner-sm"></span>';
        try {
            const result = await callAPI({ action: 'updateStatusSPJ', id, status: 'REJECTED' });
            if (result && result.success) {
                if (window.showToast) showToast('SPJ berhasil ditolak', 'success');
                window.spjpClearCache(); await window.spjpLoadData(true);
            } else {
                if (window.showToast) showToast(result?.message || 'Gagal menolak SPJ', 'error');
                approveBtn.disabled = false; rejectBtn.disabled = false;
                rejectBtn.innerHTML = ICONS.x;
            }
        } catch (err) {
            if (window.showToast) showToast('Terjadi kesalahan saat menolak SPJ', 'error');
            approveBtn.disabled = false; rejectBtn.disabled = false;
            rejectBtn.innerHTML = ICONS.x;
        }
    };

    window.spjpViewDetail = function (id) {
        const item = allData.find(d => d.id === id);
        if (!item) return;
        const existingModal = document.getElementById('spjp-detail-modal');
        if (existingModal) existingModal.remove();

        const statusClass = item.status === 'APPROVED' ? 'badge-approved' : item.status === 'REJECTED' ? 'badge-rejected' : 'badge-pending';
        const statusText = item.status === 'APPROVED' ? 'Disetujui' : item.status === 'REJECTED' ? 'Ditolak' : 'Pending';
        const fmt = n => new Intl.NumberFormat('id-ID').format(n);

        const modal = document.createElement('div');
        modal.id = 'spjp-detail-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2 class="modal-title">Detail Pengumpulan SPJ</h2>
            </div>
            <div class="modal-content">
                <div class="info-box">
                    <span class="info-box-label">Informasi Pegawai</span>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div><div style="font-size:12px;color:#64748b;margin-bottom:2px;">Nama</div><div style="font-weight:600;">${item.nama || '-'}</div></div>
                        <div><div style="font-size:12px;color:#64748b;margin-bottom:2px;">Unit</div><div style="font-weight:600;">${item.unit || '-'}</div></div>
                        <div><div style="font-size:12px;color:#64748b;margin-bottom:2px;">Bulan SPJ</div><div style="font-weight:600;">${item.bulanSPJ || '-'}</div></div>
                        <div><div style="font-size:12px;color:#64748b;margin-bottom:2px;">Nominal</div><div style="font-weight:600;">Rp ${fmt(item.nominalSPJMasuk || 0)}</div></div>
                        <div><div style="font-size:12px;color:#64748b;margin-bottom:2px;">Status</div><span class="badge ${statusClass}">${statusText}</span></div>
                        <div><div style="font-size:12px;color:#64748b;margin-bottom:2px;">Timestamp</div><div style="font-size:13px;">${formatTimestamp(item.timestamp)}</div></div>
                    </div>
                </div>
                <div style="display:flex;gap:10px;margin-top:4px;">
                    ${item.linkFileIzinKeterlambatan ? `<a href="${item.linkFileIzinKeterlambatan}" target="_blank" class="btn btn-sm" rel="noopener noreferrer">${ICONS.link} File Izin Terlambat</a>` : ''}
                    ${item.linkFileSPJ ? `<a href="${item.linkFileSPJ}" target="_blank" class="btn btn-sm" rel="noopener noreferrer">${ICONS.link} File SPJ</a>` : ''}
                </div>
            </div>
            <div class="modal-footer">
                <button onclick="this.closest('.modal-overlay').remove()" class="btn" style="flex:1;">Tutup</button>
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
<div class="container">
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
            <div class="filter-row" style="margin-top:0;">
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
                <input type="text" class="search-input" id="spjp-search-nama" placeholder="🔍 Cari nama pegawai..." oninput="spjpFilterData()">
                <button onclick="spjpLoadData(true)" class="btn btn-primary" id="spjp-btn-refresh">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    Refresh
                </button>
            </div>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>No</th>
                        <th>Timestamp</th>
                        <th>Nama</th>
                        <th>Unit</th>
                        <th>Bulan SPJ</th>
                        <th>Nominal SPJ</th>
                        <th>File Izin</th>
                        <th>File SPJ</th>
                        <th>Status</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody id="spjp-data-tbody">
                    <tr><td colspan="10" style="text-align:center;padding:40px;"><div class="spinner"></div><div style="margin-top:12px;color:#94a3b8;">Memuat data...</div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>`;

        const currentMonthName = new Date().toLocaleString('id-ID', { month: 'long' }).toUpperCase();
        const fMonth = document.getElementById('spjp-filter-bulan');
        if (fMonth) fMonth.value = currentMonthName;
        window.spjpLoadData(false);
    };
})();