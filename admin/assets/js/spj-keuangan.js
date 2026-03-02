// ============================================================
// spj-keuangan.js — Penilaian SPJ Keuangan section (SPA)
// Admin Panel — Dinas Koperasi UKM
// JS source: admin-spj-keuangan.html
// ============================================================
(function () {
    'use strict';

    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxoYIwpRZizipn0TD84nNeoqld570-85UlnL6jBdXbbu-GVNwoEK712P7yB1e03SSU0EQ/exec';
    const UNITS = [
        "Balai Layanan Usaha Terpadu KUMKM",
        "Bidang Kewirausahaan",
        "Bidang Koperasi",
        "Bidang UKM",
        "Bidang Usaha Mikro",
        "Sekretariat"
    ];
    const MONTHS = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    const SKOR_MAX = 35;

    let chartTepat = null, chartTotal = null;

    // Use localStorage as local storage fallback for demo
    function getLocalData() {
        const raw = localStorage.getItem('spj_keuangan_data');
        return raw ? JSON.parse(raw) : {};
    }
    function setLocalData(data) {
        localStorage.setItem('spj_keuangan_data', JSON.stringify(data));
    }

    // Pre-populate with Jan & Feb from the provided data
    (function initDemoData() {
        const existing = getLocalData();
        if (Object.keys(existing).length > 0) return;
        const demo = {
            "JANUARI": {
                "Balai Layanan Usaha Terpadu KUMKM": { totalPengajuan: 0, nominalTepat: 0, hariTerlambat: 0, nilaiTepat: 35.00, sanksi: 0.00, totalNilai: 35.00, catatan: "Tepat waktu" },
                "Bidang Kewirausahaan": { totalPengajuan: 0, nominalTepat: 0, hariTerlambat: 0, nilaiTepat: 35.00, sanksi: 0.00, totalNilai: 35.00, catatan: "" },
                "Bidang Koperasi": { totalPengajuan: 0, nominalTepat: 0, hariTerlambat: 0, nilaiTepat: 35.00, sanksi: 0.00, totalNilai: 35.00, catatan: "" },
                "Bidang UKM": { totalPengajuan: 0, nominalTepat: 0, hariTerlambat: 0, nilaiTepat: 35.00, sanksi: 0.00, totalNilai: 35.00, catatan: "" },
                "Bidang Usaha Mikro": { totalPengajuan: 0, nominalTepat: 0, hariTerlambat: 0, nilaiTepat: 35.00, sanksi: 0.00, totalNilai: 35.00, catatan: "" },
                "Sekretariat": { totalPengajuan: 0, nominalTepat: 0, hariTerlambat: 0, nilaiTepat: 35.00, sanksi: 0.00, totalNilai: 35.00, catatan: "" }
            },
            "FEBRUARI": {
                "Balai Layanan Usaha Terpadu KUMKM": { totalPengajuan: 0, nominalTepat: 0, hariTerlambat: 0, nilaiTepat: 35.00, sanksi: 0.00, totalNilai: 35.00, catatan: "" },
                "Bidang Kewirausahaan": { totalPengajuan: 0, nominalTepat: 0, hariTerlambat: 0, nilaiTepat: 35.00, sanksi: 0.00, totalNilai: 35.00, catatan: "" },
                "Bidang Koperasi": { totalPengajuan: 0, nominalTepat: 0, hariTerlambat: 0, nilaiTepat: 35.00, sanksi: 0.00, totalNilai: 35.00, catatan: "" },
                "Bidang UKM": { totalPengajuan: 0, nominalTepat: 0, hariTerlambat: 0, nilaiTepat: 35.00, sanksi: 0.00, totalNilai: 35.00, catatan: "" },
                "Bidang Usaha Mikro": { totalPengajuan: 0, nominalTepat: 0, hariTerlambat: 3, nilaiTepat: 12.20, sanksi: 5.70, totalNilai: 17.90, catatan: "Terlambat 3 hari" },
                "Sekretariat": { totalPengajuan: 0, nominalTepat: 0, hariTerlambat: 0, nilaiTepat: 35.00, sanksi: 0.00, totalNilai: 35.00, catatan: "" }
            }
        };
        setLocalData(demo);
    })();

    // ═══ API & Helpers ═══════════════════════════════════════
    function callAPI(params) {
        return new Promise((resolve, reject) => {
            const cb = 'jsonp_spj_' + Date.now();
            window[cb] = data => { cleanup(); resolve(data); };
            const qs = new URLSearchParams({ ...params, callback: cb }).toString();
            const s = document.createElement('script'); s.src = `${APPS_SCRIPT_URL}?${qs}`;
            const t = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, 12000);
            function cleanup() { clearTimeout(t); if (s.parentNode) s.parentNode.removeChild(s); delete window[cb]; }
            s.onerror = () => { cleanup(); reject(new Error('network')); };
            document.body.appendChild(s);
        });
    }

    function calcSPJScores(totalPengajuan, nominalTepat, hariTerlambat) {
        const persen = totalPengajuan > 0 ? (nominalTepat / totalPengajuan) : 1;
        const nilaiTepat = parseFloat((persen * SKOR_MAX).toFixed(2));
        const sisaBobot = parseFloat((SKOR_MAX - nilaiTepat).toFixed(2));
        const sanksiPerHari = 100 / 6; // ~16.67%
        const sanksi = parseFloat((hariTerlambat * (sanksiPerHari / 100) * sisaBobot).toFixed(2));
        const totalNilai = Math.max(0, parseFloat((nilaiTepat + (sisaBobot - sanksi)).toFixed(2)));
        return { nilaiTepat, sisaBobot, sanksi, totalNilai };
    }

    // ═══ Tab Switching ══════════════════════════════════════
    window.spjSwitchTab = function (name, btn) {
        document.querySelectorAll('#section-spj-keuangan .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#section-spj-keuangan .tab-content').forEach(t => t.classList.remove('active'));
        if (btn) btn.classList.add('active');
        const content = document.getElementById('spj-tab-' + name);
        if (content) content.classList.add('active');
        if (name === 'rekap') renderRekap();
    };

    // ═══ STATS ══════════════════════════════════════════════
    function updateStats(bulan) {
        const data = getLocalData();
        if (!bulan || !data[bulan]) {
            if (document.getElementById('spj-avg-score')) document.getElementById('spj-avg-score').textContent = '—';
            if (document.getElementById('spj-units-assessed')) document.getElementById('spj-units-assessed').textContent = '0';
            if (document.getElementById('spj-units-pending')) document.getElementById('spj-units-pending').textContent = '6';
            return;
        }
        const unitData = data[bulan];
        const vals = Object.values(unitData).map(u => u.totalNilai);
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        if (document.getElementById('spj-avg-score')) document.getElementById('spj-avg-score').textContent = isNaN(avg) ? '0' : avg.toFixed(2);
        if (document.getElementById('spj-units-assessed')) document.getElementById('spj-units-assessed').textContent = vals.length;
        if (document.getElementById('spj-units-pending')) document.getElementById('spj-units-pending').textContent = Math.max(0, 6 - vals.length);
    }

    // ═══ TAB 1: INPUT ═══════════════════════════════════════
    window.spjRenderInputTable = function () {
        const bulan = document.getElementById('spj-select-bulan-input')?.value;
        const tbody = document.getElementById('spj-input-tbody');
        if (!tbody) return;
        if (!bulan) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8;">Pilih bulan untuk melihat data</td></tr>'; return; }
        const data = getLocalData(); const monthData = data[bulan] || {};
        if (Object.keys(monthData).length === 0) { tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8;">Belum ada penilaian untuk ${bulan}. Klik "Input Penilaian" untuk mulai.</td></tr>`; updateStats(bulan); return; }

        const fmt = n => new Intl.NumberFormat('id-ID').format(n);
        tbody.innerHTML = UNITS.map(unit => {
            const u = monthData[unit];
            if (!u) return `<tr><td style="font-weight:500;">${unit}</td><td>${bulan}</td><td colspan="5" style="color:#94a3b8;font-style:italic;">Belum dinilai</td><td><button onclick="spjOpenEditModal('${unit}','${bulan}')" class="btn btn-sm btn-primary">+ Isi Nilai</button></td></tr>`;
            const badgeClass = u.totalNilai >= 30 ? 'badge-green' : u.totalNilai >= 20 ? 'badge-blue' : 'badge-red';
            return `<tr><td style="font-weight:500;">${unit}</td><td>${bulan}</td><td>${u.totalPengajuan > 0 ? 'Rp ' + fmt(u.totalPengajuan) : '—'}</td><td>${u.nominalTepat > 0 ? 'Rp ' + fmt(u.nominalTepat) : '—'}</td><td>${u.nilaiTepat.toFixed(2)}</td><td style="color:#ef4444;">${u.sanksi > 0 ? '-' + u.sanksi.toFixed(2) : '0.00'}</td><td><span class="badge ${badgeClass}">${u.totalNilai.toFixed(2)}</span></td><td><button onclick="spjOpenEditModal('${unit}','${bulan}')" class="btn btn-sm">✏️ Edit</button> <button onclick="spjDeleteEntry('${unit}','${bulan}')" class="btn btn-sm" style="color:#ef4444;">🗑️</button></td></tr>`;
        }).join('');
        updateStats(bulan);
    };

    window.spjOpenInputModal = function () {
        const bulan = document.getElementById('spj-select-bulan-input')?.value;
        if (!bulan) { if (window.showToast) showToast('Pilih bulan terlebih dahulu', 'error'); return; }
        document.getElementById('spj-modal-bulan-label').textContent = `Bulan: ${bulan}`;
        document.getElementById('spj-input-unit').value = ''; document.getElementById('spj-input-unit').disabled = false;
        document.getElementById('spj-input-total').value = ''; document.getElementById('spj-input-nominal-tepat').value = '';
        document.getElementById('spj-input-hari-terlambat').value = ''; document.getElementById('spj-input-catatan').value = '';
        document.getElementById('spj-modal-total-nilai').textContent = '—'; document.getElementById('spj-modal-nilai-tepat').textContent = '—';
        document.getElementById('spj-modal-sisa-bobot').textContent = '—'; document.getElementById('spj-modal-sanksi').textContent = '—';
        document.getElementById('spj-inputModal').style.display = 'flex';
    };

    window.spjOpenEditModal = function (unit, bulan) {
        const data = getLocalData(); const u = (data[bulan] || {})[unit];
        document.getElementById('spj-modal-bulan-label').textContent = `Unit: ${unit} | Bulan: ${bulan}`;
        document.getElementById('spj-input-unit').value = unit; document.getElementById('spj-input-unit').disabled = true;
        document.getElementById('spj-input-total').value = u ? u.totalPengajuan : '';
        document.getElementById('spj-input-nominal-tepat').value = u ? u.nominalTepat : '';
        document.getElementById('spj-input-hari-terlambat').value = u ? u.hariTerlambat : '';
        document.getElementById('spj-input-catatan').value = u ? u.catatan : '';
        spjUpdateModalScore();
        document.getElementById('spj-inputModal').style.display = 'flex';
    };

    window.spjUpdateModalScore = function () {
        const total = parseFloat(document.getElementById('spj-input-total').value) || 0;
        const tepat = parseFloat(document.getElementById('spj-input-nominal-tepat').value) || 0;
        const hari = parseFloat(document.getElementById('spj-input-hari-terlambat').value) || 0;
        if (tepat === 0 && total === 0) {
            if (hari === 0) {
                document.getElementById('spj-modal-total-nilai').textContent = '35.00'; document.getElementById('spj-modal-nilai-tepat').textContent = '35.00';
                document.getElementById('spj-modal-sisa-bobot').textContent = '0.00'; document.getElementById('spj-modal-sanksi').textContent = '0.00';
            } else {
                const ss = calcSPJScores(1, 1, hari);
                document.getElementById('spj-modal-total-nilai').textContent = ss.totalNilai.toFixed(2); document.getElementById('spj-modal-nilai-tepat').textContent = ss.nilaiTepat.toFixed(2);
                document.getElementById('spj-modal-sisa-bobot').textContent = ss.sisaBobot.toFixed(2); document.getElementById('spj-modal-sanksi').textContent = ss.sanksi.toFixed(2);
            }
            return;
        }
        const ss = calcSPJScores(total || tepat, tepat, hari);
        document.getElementById('spj-modal-total-nilai').textContent = ss.totalNilai.toFixed(2); document.getElementById('spj-modal-nilai-tepat').textContent = ss.nilaiTepat.toFixed(2);
        document.getElementById('spj-modal-sisa-bobot').textContent = ss.sisaBobot.toFixed(2); document.getElementById('spj-modal-sanksi').textContent = ss.sanksi.toFixed(2);
    };

    window.spjSubmitInputNilai = async function () {
        const bulan = document.getElementById('spj-select-bulan-input').value;
        const unit = document.getElementById('spj-input-unit').value;
        if (!unit) { if (window.showToast) showToast('Pilih unit terlebih dahulu', 'error'); return; }

        const totalPengajuan = parseFloat(document.getElementById('spj-input-total').value) || 0;
        const nominalTepat = parseFloat(document.getElementById('spj-input-nominal-tepat').value) || 0;
        const hariTerlambat = parseFloat(document.getElementById('spj-input-hari-terlambat').value) || 0;
        const catatan = document.getElementById('spj-input-catatan').value;

        let nilaiTepat, sanksi, totalNilai, sisaBobot;
        if (totalPengajuan === 0 && nominalTepat === 0) {
            if (hariTerlambat === 0) { nilaiTepat = 35.00; sanksi = 0.00; totalNilai = 35.00; sisaBobot = 0.00; }
            else { const ss = calcSPJScores(1, 1, hariTerlambat); ({ nilaiTepat, sanksi, totalNilai, sisaBobot } = ss); }
        } else {
            const ss = calcSPJScores(totalPengajuan || nominalTepat, nominalTepat, hariTerlambat);
            ({ nilaiTepat, sanksi, totalNilai, sisaBobot } = ss);
        }

        const submitBtn = document.getElementById('spj-submit-input-btn');
        submitBtn.disabled = true; submitBtn.innerHTML = '<span class="spinner"></span> Menyimpan...';

        const data = getLocalData(); if (!data[bulan]) data[bulan] = {};
        data[bulan][unit] = { totalPengajuan, nominalTepat, hariTerlambat, nilaiTepat, sanksi, totalNilai, catatan };
        setLocalData(data);

        const u = AUTH.getUser() || {};
        try { await callAPI({ action: 'saveSPJKeuangan', bulan, unit, totalPengajuan, nominalTepat, hariTerlambat, nilaiTepat, sanksi, totalNilai, catatan, penilai: u.name || 'Admin' }); } catch (e) { }

        document.getElementById('spj-input-unit').disabled = false;
        document.getElementById('spj-inputModal').style.display = 'none';
        spjRenderInputTable();
        if (window.showToast) showToast(`Nilai ${unit} bulan ${bulan} berhasil disimpan!`, 'success');
        submitBtn.disabled = false; submitBtn.innerHTML = '💾 Simpan Penilaian';
    };

    window.spjDeleteEntry = function (unit, bulan) {
        if (!confirm(`Hapus penilaian ${unit} bulan ${bulan}?`)) return;
        const data = getLocalData(); if (data[bulan]) delete data[bulan][unit]; setLocalData(data);
        spjRenderInputTable();
        if (window.showToast) showToast('Data berhasil dihapus', 'success');
    };

    // ═══ TAB 2: REKAPITULASI ════════════════════════════════
    function renderRekap() {
        const bulan = document.getElementById('spj-select-bulan-rekap').value;
        const data = getLocalData();
        let targetData = {};
        if (bulan) { targetData[bulan] = data[bulan] || {}; }
        else {
            const latestMonth = MONTHS.slice().reverse().find(m => data[m] && Object.keys(data[m]).length > 0);
            if (latestMonth) targetData[latestMonth] = data[latestMonth];
        }

        const currentBulan = bulan || Object.keys(targetData)[0] || '';
        const monthData = targetData[currentBulan] || {};
        const tbody = document.getElementById('spj-rekap-tbody');
        if (!tbody) return;

        const nilaiTepat = UNITS.map(u => (monthData[u]?.nilaiTepat ?? 0).toFixed(2));
        const nilaiTerlambat = UNITS.map(u => (monthData[u]?.sanksi ?? 0).toFixed(2));
        const totalNilai = UNITS.map(u => (monthData[u]?.totalNilai ?? 0).toFixed(2));

        tbody.innerHTML = `
        <tr><td style="text-align:center;">1</td><td style="font-weight:500;">SPJ yang masuk tepat waktu</td>${nilaiTepat.map(v => `<td class="${parseFloat(v) < 35 ? 'rekap-bad' : 'rekap-good'}" style="text-align:center;">${v}</td>`).join('')}</tr>
        <tr><td style="text-align:center;">2</td><td style="font-weight:500;">SPJ yang terlambat (sanksi)</td>${nilaiTerlambat.map(v => `<td style="text-align:center;color:${parseFloat(v) > 0 ? '#ef4444' : '#64748b'};">${v > 0 ? '-' : ''}${v}</td>`).join('')}</tr>
        <tr style="background:#f0f7ff;"><td></td><td style="font-weight:700;">TOTAL NILAI</td>${totalNilai.map(v => `<td style="text-align:center;font-weight:700;color:${parseFloat(v) >= 30 ? '#065f46' : parseFloat(v) >= 20 ? '#1e40af' : '#991b1b'};">${v}</td>`).join('')}</tr>
        `;

        if (chartTepat) chartTepat.destroy(); if (chartTotal) chartTotal.destroy();
        const shortUnits = ['BLUT', 'Kewirausahaan', 'Koperasi', 'UKM', 'Usaha Mikro', 'Sekretariat'];

        const ctContainer = document.getElementById('spj-chartTepat');
        if (ctContainer) {
            chartTepat = new Chart(ctContainer.getContext('2d'), {
                type: 'bar', data: { labels: shortUnits, datasets: [{ label: 'Nilai Tepat Waktu', data: nilaiTepat.map(Number), backgroundColor: nilaiTepat.map(v => parseFloat(v) >= 35 ? '#10b981' : parseFloat(v) >= 20 ? '#f59e0b' : '#ef4444'), borderRadius: 6 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 35, ticks: { stepSize: 5 } } } }
            });
        }
        const cTotalContainer = document.getElementById('spj-chartTotal');
        if (cTotalContainer) {
            chartTotal = new Chart(cTotalContainer.getContext('2d'), {
                type: 'bar', data: { labels: shortUnits, datasets: [{ label: 'Total Nilai', data: totalNilai.map(Number), backgroundColor: totalNilai.map(v => parseFloat(v) >= 30 ? '#10b981' : parseFloat(v) >= 20 ? '#f59e0b' : '#ef4444'), borderRadius: 6 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `Nilai: ${ctx.parsed.y.toFixed(2)} / 35` } } }, scales: { y: { beginAtZero: true, max: 35, ticks: { stepSize: 5 } } } }
            });
        }
    }
    window.spjRenderRekap = renderRekap;

    // ═══ KALKULATOR ═════════════════════════════════════════
    window.spjRecalculate = function () {
        const total = parseFloat(document.getElementById('spj-calc-total').value) || 0;
        const tepat = parseFloat(document.getElementById('spj-calc-tepat').value) || 0;
        const hari = parseFloat(document.getElementById('spj-calc-terlambat').value) || 0;
        if (tepat === 0 && total === 0) return;
        const base = total || tepat;
        const ss = calcSPJScores(base, tepat, hari);
        const persen = base > 0 ? ((tepat / base) * 100).toFixed(1) : '100.0';
        document.getElementById('spj-res-persentase').textContent = `Persentase tepat waktu: ${persen}%`;
        document.getElementById('spj-res-nilai-tepat').textContent = `Nilai tepat waktu: ${ss.nilaiTepat.toFixed(2)}`;
        document.getElementById('spj-res-sanksi').textContent = `Total sanksi: ${ss.sanksi.toFixed(2)}`;
        document.getElementById('spj-res-total').textContent = ss.totalNilai.toFixed(2);
    };

    // ═══ HTML Injection & Initialization ════════════════════
    window.sectionInits = window.sectionInits || {};
    window.sectionInits['spj-keuangan'] = function () {
        const section = document.getElementById('section-spj-keuangan');
        if (!section) return;

        section.innerHTML = `
        <div class="container">
            <div class="tabs">
                <button class="tab active" onclick="spjSwitchTab('input', this)">📥 Input Penilaian</button>
                <button class="tab" onclick="spjSwitchTab('rekap', this)">📊 Rekapitulasi</button>
                <button class="tab" onclick="spjSwitchTab('rumus', this)">📐 Rumus & Flowchart</button>
            </div>

            <!-- TAB 1: INPUT -->
            <div id="spj-tab-input" class="tab-content active">
                <div class="stats-grid">
                    <div class="stat-card" style="border-left:4px solid #1F4E79;"><div class="stat-label">Skor Maksimum</div><div class="stat-value">35</div></div>
                    <div class="stat-card" style="border-left:4px solid #10b981;"><div class="stat-label">Rata-rata Bulan Ini</div><div class="stat-value" id="spj-avg-score">—</div></div>
                    <div class="stat-card" style="border-left:4px solid #f59e0b;"><div class="stat-label">Unit Dinilai</div><div class="stat-value" id="spj-units-assessed">0</div></div>
                    <div class="stat-card" style="border-left:4px solid #ef4444;"><div class="stat-label">Unit Belum Dinilai</div><div class="stat-value" id="spj-units-pending">6</div></div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Input Nilai Kinerja SPJ Per Unit</h2>
                        <div class="filter-container">
                            <select class="select-input" id="spj-select-bulan-input" onchange="spjRenderInputTable()">
                                <option value="">Pilih Bulan</option>
                                <option value="JANUARI">Januari</option><option value="FEBRUARI">Februari</option><option value="MARET">Maret</option><option value="APRIL">April</option><option value="MEI">Mei</option><option value="JUNI">Juni</option><option value="JULI">Juli</option><option value="AGUSTUS">Agustus</option><option value="SEPTEMBER">September</option><option value="OKTOBER">Oktober</option><option value="NOVEMBER">November</option><option value="DESEMBER">Desember</option>
                            </select>
                            <button onclick="spjOpenInputModal()" class="btn btn-primary" id="spj-btn-input-nilai">✏️ Input Penilaian</button>
                        </div>
                    </div>
                    <div style="overflow-x:auto;">
                        <table>
                            <thead><tr><th>Unit</th><th>Bulan</th><th>Total Pengajuan (Rp)</th><th>SPJ Tepat Waktu (Rp)</th><th>Nilai Tepat Waktu</th><th>Nilai Sanksi Terlambat</th><th>Total Nilai (max 35)</th><th>Aksi</th></tr></thead>
                            <tbody id="spj-input-tbody"><tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8;">Pilih bulan untuk melihat data</td></tr></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- TAB 2: REKAPITULASI -->
            <div id="spj-tab-rekap" class="tab-content">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Rekapitulasi Nilai Kinerja Penyampaian SPJ Keuangan</h2>
                        <div class="filter-container">
                            <select class="select-input" id="spj-select-bulan-rekap" onchange="spjRenderRekap()">
                                <option value="">Semua Bulan</option>
                                <option value="JANUARI">Januari</option><option value="FEBRUARI">Februari</option><option value="MARET">Maret</option><option value="APRIL">April</option><option value="MEI">Mei</option><option value="JUNI">Juni</option><option value="JULI">Juli</option><option value="AGUSTUS">Agustus</option><option value="SEPTEMBER">September</option><option value="OKTOBER">Oktober</option><option value="NOVEMBER">November</option><option value="DESEMBER">Desember</option>
                            </select>
                        </div>
                    </div>
                    <div class="card-content">
                        <div class="charts-grid">
                            <div class="card" style="margin:0;"><div class="card-header" style="padding:16px;"><h3 style="font-size:15px;font-weight:600;">Nilai Tepat Waktu Per Unit</h3></div><div class="card-content"><div class="chart-container"><canvas id="spj-chartTepat"></canvas></div></div></div>
                            <div class="card" style="margin:0;"><div class="card-header" style="padding:16px;"><h3 style="font-size:15px;font-weight:600;">Total Nilai Per Unit (Maks 35)</h3></div><div class="card-content"><div class="chart-container"><canvas id="spj-chartTotal"></canvas></div></div></div>
                        </div>
                        <div style="overflow-x:auto;">
                            <table class="rekap-table">
                                <thead><tr><th>No</th><th>Indikator Penilaian</th><th>BLUT</th><th>Bid. Kewirausahaan</th><th>Bid. Koperasi</th><th>Bid. UKM</th><th>Bid. Usaha Mikro</th><th>Sekretariat</th></tr></thead>
                                <tbody id="spj-rekap-tbody"><tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8;">Memuat data...</td></tr></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TAB 3: RUMUS & FLOWCHART -->
            <div id="spj-tab-rumus" class="tab-content">
                <div class="formula-box">
                    <h3>📐 Rumus Penilaian SPJ Keuangan (Skor 35)</h3>
                    <div class="formula-grid">
                        <div class="formula-item"><div class="formula-item-title">1. Nilai SPJ Tepat Waktu</div><div class="formula-math">= <span class="formula-accent">(Nominal SPJ Tepat Waktu / Total Pengajuan)</span><br>&nbsp;&nbsp;× 100% × 35</div><div class="formula-example">Contoh: SPJ tepat 30jt dari total 40jt<br>= (30jt / 40jt) × 100% × 35 = <strong style="color:#fbbf24">26,25</strong></div></div>
                        <div class="formula-item"><div class="formula-item-title">2. Sanksi Keterlambatan</div><div class="formula-math">Sanksi/hari = <span class="formula-accent">100% / Jumlah hari (tgl 26–30)</span><br>= 100% / 6 = <strong style="color:#fbbf24">~17%</strong> per hari</div><div class="formula-example">Nilai sanksi 1 hari:<br>= 17% × (Skor maks – Nilai tepat waktu)<br>= 17% × (35 – 26,25) = <strong style="color:#fbbf24">1,46</strong></div></div>
                        <div class="formula-item"><div class="formula-item-title">3. Total Nilai Akhir</div><div class="formula-math">= Nilai tepat waktu<br>&nbsp;&nbsp;+ (Sisa nilai bobot – Total sanksi)</div><div class="formula-example">Contoh 1 hari terlambat:<br>= 26,25 + (8,75 – 1,46) = <strong style="color:#fbbf24">33,54</strong></div></div>
                        <div class="formula-item"><div class="formula-item-title">Catatan Penting</div><div class="formula-math">Batas tepat waktu: <span class="formula-accent">sebelum tgl 25</span><br>Periode terlambat: <span class="formula-accent">tgl 26 – 30</span><br>Total hari denda: <span class="formula-accent">6 hari</span></div><div class="formula-example">Setelah tgl 30 → tidak mendapat nilai<br>Skor maksimal = 35 poin</div></div>
                    </div>
                </div>

                <div class="flowchart-container">
                    <div class="flowchart-title">📋 Alur Penilaian SPJ Keuangan Subbag Keuangan</div>
                    <div class="fc-row"><div><div class="fc-box fc-start">Mulai Bulan Berjalan</div><div class="fc-arrow-down">↓</div><div class="fc-box fc-input">Unit Bidang Mengajukan SPJ<br><small style="font-weight:400">Disertai nominal pengajuan dana</small></div><div class="fc-arrow-down">↓</div><div class="fc-box fc-decision">Apakah SPJ masuk<br>sebelum tgl 25?</div><div class="fc-arrow-down">↓</div></div></div>
                    <div class="fc-branch" style="margin-bottom:16px;">
                        <div class="fc-branch-item"><div style="color:#10b981;font-weight:700;margin-bottom:8px;">✅ YA (Tepat Waktu)</div><div class="fc-box fc-calc">Hitung Nilai SPJ Tepat Waktu<br><small>(Nominal/Total) × 100% × 35</small></div><div class="fc-arrow-down">↓</div><div class="fc-box fc-calc">Nilai Terlambat = 0</div></div>
                        <div class="fc-branch-item"><div style="color:#ef4444;font-weight:700;margin-bottom:8px;">❌ TIDAK (Terlambat)</div><div class="fc-box fc-calc">Hitung Nilai Tepat Waktu<br><small>dari nominal yang sudah masuk</small></div><div class="fc-arrow-down">↓</div><div class="fc-box fc-calc" style="border-color:#ef4444;background:#fee2e2;color:#991b1b;">Hitung Sanksi per Hari<br><small>17% × sisa nilai bobot × hari</small></div></div>
                    </div>
                    <div class="fc-arrow-down">↓</div>
                    <div style="display:flex;justify-content:center;"><div class="fc-box fc-final" style="min-width:260px;">Total Nilai = Nilai Tepat + (Sisa Bobot – Sanksi)<br><strong>Maks 35 Poin</strong></div></div>
                    <div class="fc-arrow-down">↓</div>
                    <div style="display:flex;justify-content:center;"><div class="fc-box fc-start">Input ke Rekapitulasi Bulanan</div></div>
                </div>

                <!-- Contoh Kalkulasi -->
                <div class="card">
                    <div class="card-header"><h2 class="card-title">🧮 Kalkulator Nilai SPJ</h2></div>
                    <div class="card-content">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
                            <div>
                                <div class="form-group"><label class="input-label">Total Pengajuan Dana (Rp)</label><input type="number" class="form-input" id="spj-calc-total" placeholder="Contoh: 40000000" oninput="spjRecalculate()"></div>
                                <div class="form-group"><label class="input-label">Nominal SPJ Tepat Waktu (Rp)</label><input type="number" class="form-input" id="spj-calc-tepat" placeholder="Contoh: 30000000" oninput="spjRecalculate()"></div>
                                <div class="form-group"><label class="input-label">Jumlah Hari Terlambat (hari)</label><input type="number" class="form-input" id="spj-calc-terlambat" placeholder="0 jika tepat waktu" min="0" max="30" oninput="spjRecalculate()"></div>
                            </div>
                            <div style="background:#f8fafc;border-radius:8px;padding:24px;display:flex;flex-direction:column;justify-content:center;">
                                <div style="font-size:13px;color:#64748b;margin-bottom:8px;">Hasil Perhitungan</div>
                                <div id="spj-res-persentase" style="font-size:14px;color:#64748b;margin-bottom:4px;">Persentase tepat waktu: —</div>
                                <div id="spj-res-nilai-tepat" style="font-size:14px;color:#64748b;margin-bottom:4px;">Nilai tepat waktu: —</div>
                                <div id="spj-res-sanksi" style="font-size:14px;color:#ef4444;margin-bottom:12px;">Total sanksi: —</div>
                                <div id="spj-res-total" style="font-size:36px;font-weight:800;color:#1F4E79;">—</div>
                                <div style="font-size:12px;color:#64748b;">Total Nilai (maks 35)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL INPUT -->
        <div id="spj-inputModal" class="modal-overlay">
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">Input Penilaian SPJ Keuangan</h2>
                    <p style="font-size:13px;color:#64748b;margin-top:4px;" id="spj-modal-bulan-label">—</p>
                </div>
                <div class="modal-content">
                    <div class="score-section">
                        <div class="score-section-title">Informasi Unit & Pengajuan</div>
                        <div class="score-row">
                            <div class="form-group"><label class="input-label">Unit Bidang</label>
                                <select class="form-input" id="spj-input-unit">
                                    <option value="">Pilih Unit</option>
                                    <option value="Balai Layanan Usaha Terpadu KUMKM">Balai Layanan Usaha Terpadu KUMKM</option>
                                    <option value="Bidang Kewirausahaan">Bidang Kewirausahaan</option>
                                    <option value="Bidang Koperasi">Bidang Koperasi</option>
                                    <option value="Bidang UKM">Bidang UKM</option>
                                    <option value="Bidang Usaha Mikro">Bidang Usaha Mikro</option>
                                    <option value="Sekretariat">Sekretariat</option>
                                </select>
                            </div>
                            <div class="form-group"><label class="input-label">Total Pengajuan Dana (Rp)</label><input type="number" class="form-input" id="spj-input-total" placeholder="Contoh: 40000000" oninput="spjUpdateModalScore()"></div>
                        </div>
                    </div>
                    <div class="score-section" style="border-left-color:#10b981;">
                        <div class="score-section-title">Komponen 1: SPJ Tepat Waktu (sebelum tgl 25)</div>
                        <div class="form-group"><label class="input-label">Nominal SPJ yang masuk tepat waktu (Rp)</label><input type="number" class="form-input" id="spj-input-nominal-tepat" placeholder="Contoh: 30000000" oninput="spjUpdateModalScore()"></div>
                    </div>
                    <div class="score-section" style="border-left-color:#ef4444;">
                        <div class="score-section-title">Komponen 2: SPJ Terlambat (tgl 26–30)</div>
                        <div class="form-group"><label class="input-label">Jumlah Hari Terlambat</label>
                            <input type="number" class="form-input" id="spj-input-hari-terlambat" placeholder="0 jika tidak ada keterlambatan" min="0" max="6" oninput="spjUpdateModalScore()">
                            <div style="font-size:12px;color:#64748b;margin-top:4px;">Sanksi per hari = 100%/6 ≈ 17% × sisa nilai bobot</div>
                        </div>
                    </div>
                    <div class="score-preview">
                        <div style="font-size:13px;color:#64748b;margin-bottom:8px;">TOTAL NILAI</div>
                        <div class="score-total" id="spj-modal-total-nilai">—</div>
                        <div class="score-max">dari maksimal 35</div>
                        <div class="score-breakdown">
                            <div class="score-item"><div class="score-item-label">Nilai Tepat Waktu</div><div class="score-item-val" id="spj-modal-nilai-tepat">—</div></div>
                            <div class="score-item"><div class="score-item-label">Sisa Nilai Bobot</div><div class="score-item-val" id="spj-modal-sisa-bobot">—</div></div>
                            <div class="score-item"><div class="score-item-label">Sanksi</div><div class="score-item-val" style="color:#ef4444;" id="spj-modal-sanksi">—</div></div>
                        </div>
                    </div>
                    <div class="form-group"><label class="input-label">Keterangan Tambahan (opsional)</label><textarea class="form-textarea" id="spj-input-catatan" placeholder="Catatan tambahan..."></textarea></div>
                </div>
                <div class="modal-footer"><button onclick="document.getElementById('spj-inputModal').style.display='none';document.getElementById('spj-input-unit').disabled=false;" class="btn" style="flex:1;">Batal</button><button onclick="spjSubmitInputNilai()" class="btn btn-success" style="flex:1;" id="spj-submit-input-btn">💾 Simpan Penilaian</button></div>
            </div>
        </div>
        `;

        // Setup modal close handler
        window.addEventListener('click', e => { if (e.target.classList.contains('modal-overlay') && e.target.id === 'spj-inputModal') { e.target.style.display = 'none'; document.getElementById('spj-input-unit').disabled = false; } });

        // Auto-select current month
        const currentMonthIdx = new Date().getMonth();
        if (MONTHS[currentMonthIdx]) {
            const m = document.getElementById('spj-select-bulan-input');
            if (m) m.value = MONTHS[currentMonthIdx];
            window.spjRenderInputTable();
        }
    };
})();
