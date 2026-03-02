// ============================================================
// spj-pengumpulan.js — Pengumpulan SPJ section (SPA)
// Admin Panel — Dinas Koperasi UKM
// JS source: admin-spj-pengumpulan.html
// ============================================================
(function () {
    'use strict';

    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxoYIwpRZizipn0TD84nNeoqld570-85UlnL6jBdXbbu-GVNwoEK712P7yB1e03SSU0EQ/exec';
    const CACHE_KEY = 'spj_pengumpulan_cache';
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    let allData = [];
    let filteredData = [];

    // ============ CACHE MANAGEMENT ============
    function getCachedData() {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (!cached) return null;
            const { data, timestamp } = JSON.parse(cached);
            const now = Date.now();
            if (now - timestamp < CACHE_DURATION) return data;

            localStorage.removeItem(CACHE_KEY);
            return null;
        } catch (err) {
            return null;
        }
    }

    function setCachedData(data) {
        try {
            const cacheObj = { data: data, timestamp: Date.now() };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObj));
        } catch (err) { }
    }
    window.spjpClearCache = function () { localStorage.removeItem(CACHE_KEY); };

    // ============ FORMAT TIMESTAMP ============
    function formatTimestamp(timestamp) {
        if (!timestamp) return '-';
        try {
            let date;
            if (typeof timestamp === 'string') date = new Date(timestamp);
            else if (timestamp instanceof Date) date = timestamp;
            else return timestamp.toString();

            if (isNaN(date.getTime())) return timestamp.toString();

            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');

            return `${day}/${month}/${year} ${hours}:${minutes}`;
        } catch (err) {
            return timestamp.toString();
        }
    }

    // ============ API ============
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
        tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><h3>Tidak dapat memuat data</h3><p>${message}</p></div></td></tr>`;
    }

    // ============ LOAD DATA ============
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
        if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:#94a3b8;"><div class="spinner" style="border-top-color:#94a3b8;"></div><div style="margin-top:12px;">Memuat data...</div></td></tr>`;

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
            console.error('Load error:', err);
            showEmptyState('Gagal memuat data. Periksa koneksi internet Anda.');
        }
    };

    // ============ FILTER DATA ============
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

    // ============ RENDER TABLE ============
    window.spjpRenderTable = function () {
        const tbody = document.getElementById('spjp-data-tbody');
        if (!tbody) return;

        if (filteredData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><h3>Tidak ada data</h3><p>Belum ada pengumpulan SPJ atau filter tidak menemukan hasil</p></div></td></tr>`;
            return;
        }

        const fmt = n => new Intl.NumberFormat('id-ID').format(n);
        tbody.innerHTML = filteredData.map((item, idx) => {
            const statusClass = item.status === 'APPROVED' ? 'badge-green' : item.status === 'REJECTED' ? 'badge-red' : 'badge-yellow';
            const statusText = item.status === 'APPROVED' ? 'Disetujui' : item.status === 'REJECTED' ? 'Ditolak' : 'Pending';

            return `
            <tr>
                <td>${idx + 1}</td>
                <td>${formatTimestamp(item.timestamp)}</td>
                <td style="font-weight:500;">${item.nama || '-'}</td>
                <td>${item.unit || '-'}</td>
                <td>${item.bulanSPJ || '-'}</td>
                <td>Rp ${item.nominalSPJMasuk ? fmt(item.nominalSPJMasuk) : '0'}</td>
                <td>${item.linkFileIzinKeterlambatan ? `<a href="${item.linkFileIzinKeterlambatan}" target="_blank" class="link-file" rel="noopener noreferrer">📄 Lihat File</a>` : '-'}</td>
                <td>${item.linkFileSPJ ? `<a href="${item.linkFileSPJ}" target="_blank" class="link-file" rel="noopener noreferrer">📄 Lihat SPJ</a>` : '-'}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    ${item.status === 'PENDING' ? `
                        <button onclick="spjpApproveItem('${item.id}')" class="btn btn-sm btn-success" id="spjp-btn-approve-${item.id}">✓ Setujui</button>
                        <button onclick="spjpRejectItem('${item.id}')" class="btn btn-sm btn-danger" id="spjp-btn-reject-${item.id}">✗ Tolak</button>
                    ` : `<button onclick="spjpViewDetail('${item.id}')" class="btn btn-sm">👁️ Detail</button>`}
                </td>
            </tr>`;
        }).join('');
    };

    // ============ UPDATE STATS ============
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

    // ============ ACTIONS ============
    window.spjpApproveItem = async function (id) {
        if (!confirm('Setujui pengumpulan SPJ ini?')) return;
        const approveBtn = document.getElementById(`spjp-btn-approve-${id}`);
        const rejectBtn = document.getElementById(`spjp-btn-reject-${id}`);
        if (!approveBtn || !rejectBtn) return;

        approveBtn.disabled = true; rejectBtn.disabled = true;
        approveBtn.innerHTML = '<span class="spinner"></span> Memproses...';

        try {
            const result = await callAPI({ action: 'updateStatusSPJ', id: id, status: 'APPROVED' });
            if (result && result.success) {
                if (window.showToast) showToast('SPJ berhasil disetujui', 'success');
                window.spjpClearCache(); await window.spjpLoadData(true);
            } else {
                if (window.showToast) showToast(result?.message || 'Gagal menyetujui SPJ', 'error');
                approveBtn.disabled = false; rejectBtn.disabled = false; approveBtn.innerHTML = '✓ Setujui';
            }
        } catch (err) {
            if (window.showToast) showToast('Terjadi kesalahan saat menyetujui SPJ', 'error');
            approveBtn.disabled = false; rejectBtn.disabled = false; approveBtn.innerHTML = '✓ Setujui';
        }
    };

    window.spjpRejectItem = async function (id) {
        if (!confirm('Tolak pengumpulan SPJ ini?')) return;
        const approveBtn = document.getElementById(`spjp-btn-approve-${id}`);
        const rejectBtn = document.getElementById(`spjp-btn-reject-${id}`);
        if (!approveBtn || !rejectBtn) return;

        approveBtn.disabled = true; rejectBtn.disabled = true;
        rejectBtn.innerHTML = '<span class="spinner"></span> Memproses...';

        try {
            const result = await callAPI({ action: 'updateStatusSPJ', id: id, status: 'REJECTED' });
            if (result && result.success) {
                if (window.showToast) showToast('SPJ berhasil ditolak', 'success');
                window.spjpClearCache(); await window.spjpLoadData(true);
            } else {
                if (window.showToast) showToast(result?.message || 'Gagal menolak SPJ', 'error');
                approveBtn.disabled = false; rejectBtn.disabled = false; rejectBtn.innerHTML = '✗ Tolak';
            }
        } catch (err) {
            if (window.showToast) showToast('Terjadi kesalahan saat menolak SPJ', 'error');
            approveBtn.disabled = false; rejectBtn.disabled = false; rejectBtn.innerHTML = '✗ Tolak';
        }
    };

    window.spjpViewDetail = function (id) {
        const item = allData.find(d => d.id === id);
        if (item) {
            // Using alert since that's what was in the original code. Can update to modal if necessary.
            alert(`Detail SPJ:\n\nNama: ${item.nama}\nUnit: ${item.unit}\nBulan: ${item.bulanSPJ}\nNominal: Rp ${new Intl.NumberFormat('id-ID').format(item.nominalSPJMasuk || 0)}\nStatus: ${item.status}`);
        }
    };

    // ═══ HTML Injection & Initialization ════════════════════
    window.sectionInits = window.sectionInits || {};
    window.sectionInits['spj-pengumpulan'] = function () {
        const section = document.getElementById('section-spj-pengumpulan');
        if (!section) return;

        section.innerHTML = `
        <div class="container">
            <!-- STATS -->
            <div class="stats-grid">
                <div class="stat-card" style="border-left:4px solid #10b981;">
                    <div class="stat-label">Total Pengumpulan</div>
                    <div class="stat-value" id="spjp-total-pengumpulan">0</div>
                    <div class="stat-subtitle">Laporan SPJ</div>
                </div>
                <div class="stat-card" style="border-left:4px solid #3b82f6;">
                    <div class="stat-label">Bulan Ini</div>
                    <div class="stat-value" id="spjp-bulan-ini-count">0</div>
                    <div class="stat-subtitle" id="spjp-bulan-ini-label">Laporan</div>
                </div>
                <div class="stat-card" style="border-left:4px solid #f59e0b;">
                    <div class="stat-label">Pending</div>
                    <div class="stat-value" id="spjp-pending-count">0</div>
                    <div class="stat-subtitle">Menunggu Verifikasi</div>
                </div>
                <div class="stat-card" style="border-left:4px solid #64748b;">
                    <div class="stat-label">Total Nominal</div>
                    <div class="stat-value" id="spjp-total-nominal" style="font-size: 24px;">Rp 0</div>
                    <div class="stat-subtitle">Akumulasi SPJ</div>
                </div>
            </div>

            <!-- FILTER & TABLE -->
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
                        <input type="text" class="search-input" id="spjp-search-nama" placeholder="🔍 Cari nama pegawai..." oninput="spjpFilterData()">
                        <button onclick="spjpLoadData(true)" class="btn btn-primary" id="spjp-btn-refresh" title="Muat ulang data">🔄 Refresh</button>
                    </div>
                </div>
                <div style="overflow-x:auto;">
                    <table>
                        <thead>
                            <tr><th>No</th><th>Timestamp</th><th>Nama</th><th>Unit</th><th>Bulan SPJ</th><th>Nominal SPJ</th><th>File Izin Terlambat</th><th>File SPJ</th><th>Status</th><th>Aksi</th></tr>
                        </thead>
                        <tbody id="spjp-data-tbody">
                            <tr><td colspan="10" style="text-align:center;padding:40px;color:#94a3b8;"><div class="spinner" style="border-top-color:#94a3b8;"></div><div style="margin-top:12px;">Memuat data...</div></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;

        const currentMonthName = new Date().toLocaleString('id-ID', { month: 'long' }).toUpperCase();
        const fMonth = document.getElementById('spjp-filter-bulan');
        if (fMonth) fMonth.value = currentMonthName;

        window.spjpLoadData(false);
    };

})();
