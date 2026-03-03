// ============================================================
// pengajuan-dana.js — Pengajuan Dana section (SPA)
// Admin Panel — Dinas Koperasi UKM
// JS source: admin-pengajuan-dana.html
// ============================================================
(function () {
    'use strict';

    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxoYIwpRZizipn0TD84nNeoqld570-85UlnL6jBdXbbu-GVNwoEK712P7yB1e03SSU0EQ/exec';
    const CACHE_KEY = 'pengajuan_dana_cache';
    const CACHE_DURATION = 5 * 60 * 1000;
    let allData = [];
    let filteredData = [];
    let chartPengajuan = null;

    let currentEditId = null;
    let currentDeleteId = null;
    let currentSelectedStatus = null;

    // ============ CACHE ============
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
    window.pdClearCache = function () { localStorage.removeItem(CACHE_KEY); };

    // ============ FORMAT ============
    function formatTimestamp(ts) {
        if (!ts) return '-';
        try {
            const d = new Date(ts);
            if (isNaN(d.getTime())) return String(ts);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        } catch { return String(ts); }
    }
    const fmtRupiah = n => 'Rp ' + new Intl.NumberFormat('id-ID').format(n || 0);

    // ============ API CALL (JSONP) ============
    function callAPI(params) {
        return new Promise((resolve, reject) => {
            const cb = 'jsonp_pd_' + Date.now();
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
        const tbody = document.getElementById('pd-data-tbody');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><h3>Tidak dapat memuat data</h3><p>${message}</p></div></td></tr>`;
    }

    // ============ LOAD DATA ============
    window.pdLoadData = async function (forceRefresh = false) {
        if (!forceRefresh) {
            const cached = getCachedData();
            if (cached) {
                allData = cached; filteredData = [...allData];
                pdRenderTable(); pdUpdateStats(); pdRenderChart();
                return;
            }
        }

        const tbody = document.getElementById('pd-data-tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:#94a3b8;"><div class="spinner-table"></div><div style="margin-top:12px;">Memuat data...</div></td></tr>`;

        try {
            const result = await callAPI({ action: 'getPengajuanDana' });
            if (result && result.success) {
                allData = result.data || [];
                filteredData = [...allData];
                setCachedData(allData);
                pdRenderTable(); pdUpdateStats(); pdRenderChart();
            } else {
                showEmptyState('Gagal memuat data: ' + (result?.message || 'Unknown error'));
            }
        } catch (err) {
            showEmptyState('Gagal memuat data. Periksa koneksi internet Anda.');
        }
    };

    // ============ FILTER ============
    window.pdFilterData = function () {
        const bulan = document.getElementById('pd-filter-bulan')?.value.toUpperCase() || '';
        const unit = document.getElementById('pd-filter-unit')?.value || '';
        const status = document.getElementById('pd-filter-status')?.value.toUpperCase() || '';
        const search = document.getElementById('pd-search-nama')?.value.toLowerCase() || '';

        filteredData = allData.filter(item => {
            const matchBulan = !bulan || item.bulanPengajuan?.toUpperCase() === bulan;
            const matchUnit = !unit || item.unit === unit;
            const matchStatus = !status || item.status?.toUpperCase() === status;
            const matchSearch = !search || item.nama?.toLowerCase().includes(search) || item.subKegiatan?.toLowerCase().includes(search);
            return matchBulan && matchUnit && matchStatus && matchSearch;
        });

        pdRenderTable(); pdUpdateStats();
    };

    // ============ RENDER TABLE ============
    window.pdRenderTable = function () {
        const tbody = document.getElementById('pd-data-tbody');
        if (!tbody) return;

        if (filteredData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><h3>Tidak ada data</h3><p>Belum ada pengajuan dana atau filter tidak menemukan hasil</p></div></td></tr>`;
            return;
        }

        tbody.innerHTML = filteredData.map((item, idx) => {
            const statusClass = item.status === 'APPROVED' ? 'badge-green' : item.status === 'REJECTED' ? 'badge-red' : 'badge-yellow';
            const statusText = item.status === 'APPROVED' ? 'Disetujui' : item.status === 'REJECTED' ? 'Ditolak' : 'Pending';
            const subKeg = item.subKegiatan || '-';

            return `
            <tr>
                <td>${idx + 1}</td>
                <td>${formatTimestamp(item.timestamp)}</td>
                <td style="font-weight:500;">${item.nama || '-'}</td>
                <td>${item.unit || '-'}</td>
                <td><div class="sub-kegiatan-cell" title="${subKeg}">${subKeg}</div></td>
                <td>${item.bulanPengajuan || '-'}</td>
                <td>${fmtRupiah(item.nominalPengajuan)}</td>
                <td>${item.linkFilePengajuanDana ? `<a href="${item.linkFilePengajuanDana}" target="_blank" class="link-file" rel="noopener noreferrer">📄 Lihat File</a>` : '-'}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td style="white-space:nowrap;">
                    <button onclick="pdOpenEditModal('${item.id}')" class="btn btn-sm btn-warning" title="Edit status">✏️ Edit</button>
                    <button onclick="pdOpenDeleteModal('${item.id}')" class="btn btn-sm btn-danger" style="margin-left:4px;" title="Hapus data">🗑️ Hapus</button>
                </td>
            </tr>`;
        }).join('');
    };

    // ============ UPDATE STATS ============
    window.pdUpdateStats = function () {
        if (!document.getElementById('pd-total-pengajuan')) return;
        const currentMonth = new Date().toLocaleString('id-ID', { month: 'long' }).toUpperCase();
        const bulanIniData = allData.filter(i => i.bulanPengajuan?.toUpperCase() === currentMonth);
        const pendingData = allData.filter(i => i.status === 'PENDING');
        const totalNominal = filteredData.reduce((s, i) => s + (parseFloat(i.nominalPengajuan) || 0), 0);

        document.getElementById('pd-total-pengajuan').textContent = allData.length;
        document.getElementById('pd-bulan-ini-count').textContent = bulanIniData.length;
        document.getElementById('pd-pending-count').textContent = pendingData.length;
        document.getElementById('pd-total-nominal').textContent = fmtRupiah(totalNominal);

        const yr = new Date().getFullYear();
        document.getElementById('pd-bulan-ini-label').textContent = `${currentMonth} ${yr}`;
    };

    // ============ RENDER CHART ============
    window.pdRenderChart = function () {
        const ct = document.getElementById('pd-chartPengajuan');
        if (!ct) return;

        const months = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
        const monthlyData = {};
        months.forEach(m => { monthlyData[m] = { count: 0, nominal: 0 }; });
        allData.forEach(item => {
            const b = item.bulanPengajuan?.toUpperCase();
            if (monthlyData[b]) { monthlyData[b].count++; monthlyData[b].nominal += parseFloat(item.nominalPengajuan) || 0; }
        });
        const labels = months.map(m => m.charAt(0) + m.slice(1).toLowerCase());
        const counts = months.map(m => monthlyData[m].count);
        const nominals = months.map(m => monthlyData[m].nominal / 1_000_000);

        if (chartPengajuan) chartPengajuan.destroy();
        chartPengajuan = new Chart(ct.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Jumlah Pengajuan', data: counts, backgroundColor: '#3b82f6', yAxisID: 'y' },
                    { label: 'Total Nominal (Juta Rp)', data: nominals, backgroundColor: '#1F4E79', yAxisID: 'y1', type: 'line', borderColor: '#1F4E79', borderWidth: 2, tension: 0.4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    y: { type: 'linear', position: 'left', title: { display: true, text: 'Jumlah Pengajuan' } },
                    y1: { type: 'linear', position: 'right', title: { display: true, text: 'Nominal (Juta Rp)' }, grid: { drawOnChartArea: false } }
                }
            }
        });
    };

    // ============ MODAL EDIT ============
    window.pdOpenEditModal = function (id) {
        const item = allData.find(d => d.id === id);
        if (!item) return;

        currentEditId = id;
        currentSelectedStatus = item.status || 'PENDING';

        document.getElementById('pd-edit-modal-subtitle').textContent = `Pengajuan — ${item.bulanPengajuan || ''}`;
        document.getElementById('pd-edit-info-nama').textContent = item.nama || '-';
        document.getElementById('pd-edit-info-unit').textContent = item.unit || '-';
        document.getElementById('pd-edit-info-subkeg').textContent = item.subKegiatan || '-';
        document.getElementById('pd-edit-info-bulan').textContent = item.bulanPengajuan || '-';
        document.getElementById('pd-edit-info-nominal').textContent = fmtRupiah(item.nominalPengajuan);

        const fileEl = document.getElementById('pd-edit-info-file');
        if (item.linkFilePengajuanDana) {
            fileEl.innerHTML = `<a href="${item.linkFilePengajuanDana}" target="_blank" style="color:#3b82f6;text-decoration:none;">📄 Lihat File</a>`;
        } else {
            fileEl.textContent = 'Tidak ada file';
        }

        pdSelectStatus(currentSelectedStatus);
        document.getElementById('pd-editModal').style.display = 'flex';
    };

    window.pdSelectStatus = function (status) {
        currentSelectedStatus = status;
        const lowStatus = status.toLowerCase();
        ['pending', 'approved', 'rejected'].forEach(s => {
            const el = document.getElementById('pd-opt-' + s);
            if (el) el.className = 'status-option';
        });

        const radio = document.getElementById('pd-radio-' + lowStatus);
        if (radio) radio.checked = true;

        const activeEl = document.getElementById('pd-opt-' + lowStatus);
        if (activeEl) activeEl.classList.add('selected-' + lowStatus);
    };

    window.pdCloseEditModal = function () {
        document.getElementById('pd-editModal').style.display = 'none';
        currentEditId = null;
    };

    window.pdSubmitEditStatus = async function () {
        if (!currentEditId || !currentSelectedStatus) return;

        const btn = document.getElementById('pd-btn-submit-edit');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Menyimpan...';

        try {
            const result = await callAPI({ action: 'updateStatusPengajuanDana', id: currentEditId, status: currentSelectedStatus });
            if (result && result.success) {
                if (window.showToast) showToast('Status berhasil diperbarui!', 'success');
                window.pdClearCache(); window.pdCloseEditModal(); await window.pdLoadData(true);
            } else {
                if (window.showToast) showToast(result?.message || 'Gagal memperbarui status', 'error');
            }
        } catch (err) {
            if (window.showToast) showToast('Gagal menghubungi server', 'error');
        } finally {
            btn.disabled = false; btn.innerHTML = '💾 Simpan Perubahan';
        }
    };

    // ============ MODAL DELETE ============
    window.pdOpenDeleteModal = function (id) {
        const item = allData.find(d => d.id === id);
        if (!item) return;

        currentDeleteId = id;
        document.getElementById('pd-delete-info-nama').textContent = item.nama || '-';
        document.getElementById('pd-delete-info-detail').textContent = `${item.unit || '-'} · ${item.bulanPengajuan || '-'} · ${fmtRupiah(item.nominalPengajuan)}`;
        document.getElementById('pd-deleteModal').style.display = 'flex';
    };

    window.pdCloseDeleteModal = function () {
        document.getElementById('pd-deleteModal').style.display = 'none';
        currentDeleteId = null;
    };

    window.pdSubmitDelete = async function () {
        if (!currentDeleteId) return;

        const btn = document.getElementById('pd-btn-submit-delete');
        btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menghapus...';

        try {
            const result = await callAPI({ action: 'deletePengajuanDana', id: currentDeleteId });
            if (result && result.success) {
                if (window.showToast) showToast('Data berhasil dihapus!', 'success');
                window.pdClearCache(); window.pdCloseDeleteModal(); await window.pdLoadData(true);
            } else {
                allData = allData.filter(d => d.id !== currentDeleteId);
                filteredData = filteredData.filter(d => d.id !== currentDeleteId);
                setCachedData(allData); pdRenderTable(); pdUpdateStats(); pdRenderChart();
                if (window.showToast) showToast('Dihapus lokal. Server: ' + (result?.message || 'Unknown'), 'error');
                window.pdCloseDeleteModal();
            }
        } catch (err) {
            if (window.showToast) showToast('Gagal menghubungi server: ' + err.message, 'error');
        } finally {
            btn.disabled = false; btn.innerHTML = '🗑️ Ya, Hapus';
        }
    };

    // ═══ HTML Injection & Initialization ════════════════════
    window.sectionInits = window.sectionInits || {};
    window.sectionInits['pengajuan-dana'] = function () {
        const section = document.getElementById('section-pengajuan-dana');
        if (!section) return;

        section.innerHTML = `
        <div class="container">
            <!-- STATS -->
            <div class="stats-grid">
                <div class="stat-card" style="border-left:4px solid #3b82f6;"><div class="stat-label">Total Pengajuan</div><div class="stat-value" id="pd-total-pengajuan">0</div><div class="stat-subtitle">Permintaan Dana</div></div>
                <div class="stat-card" style="border-left:4px solid #10b981;"><div class="stat-label">Bulan Ini</div><div class="stat-value" id="pd-bulan-ini-count">0</div><div class="stat-subtitle" id="pd-bulan-ini-label">Pengajuan</div></div>
                <div class="stat-card" style="border-left:4px solid #f59e0b;"><div class="stat-label">Pending</div><div class="stat-value" id="pd-pending-count">0</div><div class="stat-subtitle">Menunggu Persetujuan</div></div>
                <div class="stat-card" style="border-left:4px solid #1F4E79;"><div class="stat-label">Total Nominal</div><div class="stat-value" id="pd-total-nominal" style="font-size:24px;">Rp 0</div><div class="stat-subtitle">Dana Diajukan</div></div>
            </div>

            <!-- CHART -->
            <div class="card">
                <div class="card-header"><h2 class="card-title">Jumlah Pengajuan Dana per Bulan</h2></div>
                <div class="card-content"><div class="chart-container"><canvas id="pd-chartPengajuan"></canvas></div></div>
            </div>

            <!-- FILTER & TABLE -->
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Daftar Pengajuan Dana</h2>
                    <div class="filter-container">
                        <select class="select-input" id="pd-filter-bulan" onchange="pdFilterData()">
                            <option value="">Semua Bulan</option>
                            <option value="JANUARI">Januari</option><option value="FEBRUARI">Februari</option><option value="MARET">Maret</option>
                            <option value="APRIL">April</option><option value="MEI">Mei</option><option value="JUNI">Juni</option>
                            <option value="JULI">Juli</option><option value="AGUSTUS">Agustus</option><option value="SEPTEMBER">September</option>
                            <option value="OKTOBER">Oktober</option><option value="NOVEMBER">November</option><option value="DESEMBER">Desember</option>
                        </select>
                        <select class="select-input" id="pd-filter-unit" onchange="pdFilterData()">
                            <option value="">Semua Unit</option>
                            <option value="Sekretariat">Sekretariat</option>
                            <option value="Balai Layanan Usaha Terpadu KUMKM">BLUT KUMKM</option>
                            <option value="Bidang Kewirausahaan">Bid. Kewirausahaan</option>
                            <option value="Bidang Koperasi">Bid. Koperasi</option>
                            <option value="Bidang UKM">Bid. UKM</option>
                            <option value="Bidang Usaha Mikro">Bid. Usaha Mikro</option>
                        </select>
                        <select class="select-input" id="pd-filter-status" onchange="pdFilterData()">
                            <option value="">Semua Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Disetujui</option>
                            <option value="REJECTED">Ditolak</option>
                        </select>
                        <input type="text" class="search-input" id="pd-search-nama" placeholder="🔍 Cari nama / sub kegiatan..." oninput="pdFilterData()">
                        <button onclick="pdLoadData(true)" class="btn btn-primary" id="pd-btn-refresh">🔄 Refresh</button>
                    </div>
                </div>
                <div style="overflow-x:auto;">
                    <table>
                        <thead>
                            <tr><th>No</th><th>Timestamp</th><th>Nama</th><th>Unit</th><th>Sub Kegiatan</th><th>Bulan Pengajuan</th><th>Nominal Pengajuan</th><th>File Pengajuan Dana</th><th>Status</th><th>Aksi</th></tr>
                        </thead>
                        <tbody id="pd-data-tbody">
                            <tr><td colspan="10" style="text-align:center;padding:40px;color:#94a3b8;"><div class="spinner-table"></div><div style="margin-top:12px;">Memuat data...</div></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- MODALS -->
        <div id="pd-editModal" class="modal-overlay" style="display:none;">
            <div class="modal">
                <div class="modal-header"><div class="modal-title">✏️ Edit Status Pengajuan</div><div class="modal-subtitle" id="pd-edit-modal-subtitle">—</div></div>
                <div class="modal-body">
                    <div style="background:#f8fafc;border-radius:8px;padding:4px 16px;margin-bottom:4px;">
                        <div class="info-row"><span class="info-row-label">Nama Pengaju</span><span class="info-row-value" id="pd-edit-info-nama">—</span></div>
                        <div class="info-row"><span class="info-row-label">Unit</span><span class="info-row-value" id="pd-edit-info-unit">—</span></div>
                        <div class="info-row"><span class="info-row-label">Sub Kegiatan</span><span class="info-row-value" id="pd-edit-info-subkeg" style="max-width:220px;word-break:break-word;">—</span></div>
                        <div class="info-row"><span class="info-row-label">Bulan Pengajuan</span><span class="info-row-value" id="pd-edit-info-bulan">—</span></div>
                        <div class="info-row"><span class="info-row-label">Nominal</span><span class="info-row-value" id="pd-edit-info-nominal">—</span></div>
                        <div class="info-row"><span class="info-row-label">File</span><span class="info-row-value" id="pd-edit-info-file">—</span></div>
                    </div>
                    <div class="form-label">Ubah Status Pengajuan</div>
                    <div class="status-options">
                        <label class="status-option" id="pd-opt-pending" onclick="pdSelectStatus('PENDING')"><input type="radio" name="pd-edit-status" value="PENDING" id="pd-radio-pending"><div><div class="status-option-label" style="color:#92400e;">⏳ Pending</div><div class="status-option-sub">Menunggu persetujuan admin</div></div></label>
                        <label class="status-option" id="pd-opt-approved" onclick="pdSelectStatus('APPROVED')"><input type="radio" name="pd-edit-status" value="APPROVED" id="pd-radio-approved"><div><div class="status-option-label" style="color:#065f46;">✅ Disetujui</div><div class="status-option-sub">Pengajuan dana disetujui</div></div></label>
                        <label class="status-option" id="pd-opt-rejected" onclick="pdSelectStatus('REJECTED')"><input type="radio" name="pd-edit-status" value="REJECTED" id="pd-radio-rejected"><div><div class="status-option-label" style="color:#991b1b;">❌ Ditolak</div><div class="status-option-sub">Pengajuan dana ditolak</div></div></label>
                    </div>
                </div>
                <div class="modal-footer"><button onclick="pdCloseEditModal()" class="btn" style="flex:1;">Batal</button><button onclick="pdSubmitEditStatus()" class="btn btn-warning" style="flex:1;" id="pd-btn-submit-edit">💾 Simpan Perubahan</button></div>
            </div>
        </div>

        <div id="pd-deleteModal" class="modal-overlay" style="display:none;">
            <div class="modal delete-modal">
                <div class="modal-body" style="text-align:center;padding:32px 24px;">
                    <div class="delete-icon">🗑️</div>
                    <h3 style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:8px;">Hapus Pengajuan Dana?</h3>
                    <p style="font-size:14px;color:#64748b;margin-bottom:4px;">Data berikut akan dihapus permanen:</p>
                    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin:16px 0;text-align:left;">
                        <div style="font-size:13px;color:#991b1b;font-weight:600;" id="pd-delete-info-nama">—</div>
                        <div style="font-size:12px;color:#b91c1c;margin-top:2px;" id="pd-delete-info-detail">—</div>
                    </div>
                    <p style="font-size:13px;color:#ef4444;font-weight:500;">⚠️ Tindakan ini tidak dapat dibatalkan.</p>
                </div>
                <div class="modal-footer"><button onclick="pdCloseDeleteModal()" class="btn" style="flex:1;">Batal</button><button onclick="pdSubmitDelete()" class="btn btn-danger" style="flex:1;" id="pd-btn-submit-delete">🗑️ Ya, Hapus</button></div>
            </div>
        </div>
        `;

        window.addEventListener('click', e => {
            if (e.target.id === 'pd-editModal') window.pdCloseEditModal();
            else if (e.target.id === 'pd-deleteModal') window.pdCloseDeleteModal();
        });

        const currentMonthName = new Date().toLocaleString('id-ID', { month: 'long' }).toUpperCase();
        const fMonth = document.getElementById('pd-filter-bulan');
        if (fMonth) fMonth.value = currentMonthName;

        window.pdLoadData(false);
    };
})();
