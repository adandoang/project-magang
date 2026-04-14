// ============================================================
// diklat.js — Diklat Training Management Section (SPA) v2.1
// Admin Panel — Dinas Koperasi UKM
//
// PERUBAHAN v2.1:
//  1. Daftar nama pegawai sudah ter-populate otomatis dari GROUPS
//     (sama persis dengan penilaian-orang.js GROUPS) — tinggal upload foto
//  2. Upload triwulan bersifat SEQUENTIAL: triwulan N hanya bisa
//     diupload setelah triwulan N-1 sudah terisi
//  3. Upload dibatasi sesuai PERIODE SAAT INI berdasarkan bulan:
//     Jan–Mar  → hanya Triwulan 1
//     Apr–Jun  → Triwulan 1 & 2
//     Jul–Sep  → Triwulan 1, 2 & 3
//     Okt–Des  → semua 4 triwulan
//  4. [FIX v2.1] buildMergedList() selalu digunakan sebagai sumber data
//     utama tabel — SEMUA nama dari PEGAWAI_LIST selalu tampil meskipun
//     data server belum ada / kosong.
// ============================================================
(function () {
    'use strict';

    const API_URL = 'https://script.google.com/macros/s/AKfycbwjJwYtLjnhZ__smIDfVkLJTpu_m3rqvg4Sy1TSfyXvwA6_2FKrXGFgMUi4_MSMefpvtg/exec';

    const QUARTERS = [
        { key: 'triwulan1', label: 'Triwulan I',   sub: 'Jan – Mar', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6' },
        { key: 'triwulan2', label: 'Triwulan II',  sub: 'Apr – Jun', color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', dot: '#10b981' },
        { key: 'triwulan3', label: 'Triwulan III', sub: 'Jul – Sep', color: '#b45309', bg: '#fffbeb', border: '#fcd34d', dot: '#f59e0b' },
        { key: 'triwulan4', label: 'Triwulan IV',  sub: 'Okt – Des', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', dot: '#8b5cf6' }
    ];

    // ── Daftar pegawai (sama persis dengan penilaian-orang.js GROUPS) ──
    const PEGAWAI_LIST = [
        // Grup: agus (Kepala Bidang)
        { nama: 'Ritaningrum, S.Sos., M.M.',                       unit: 'Sekretariat' },
        { nama: 'Hellen Phornica, S.T.P., M.Si.',                  unit: 'Bidang UKM' },
        { nama: 'Veronica Setioningtyas Prativi, S.Si., M.Si.',     unit: 'Bidang Usaha Mikro' },
        { nama: 'Wisnu Hermawan, S.P., M.T.',                       unit: 'Balai Layanan Usaha Terpadu KUMKM' },
        { nama: 'Ir. Setyo Hastuti, M.P.',                          unit: 'Bidang Koperasi' },
        { nama: 'Hana Fais Prabowo, S.T.P., M.Si.',                 unit: 'Bidang Kewirausahaan' },
        // Grup: sekretariat
        { nama: 'Fuji Ippa Wati, S.E.',                    unit: 'Sekretariat' },
        { nama: 'Winarto, S.E.',                            unit: 'Sekretariat' },
        { nama: 'Ice Norawati, S.E., Akt.',                 unit: 'Sekretariat' },
        { nama: 'Marselina Widaranti, S.T., M.T.',          unit: 'Sekretariat' },
        { nama: 'Hana Kurniawati',                          unit: 'Sekretariat' },
        { nama: 'Raden Bambang Bagus Tri Hantoro, S.M.',    unit: 'Sekretariat' },
        { nama: 'Heru Wiranto, SIP',                        unit: 'Sekretariat' },
        { nama: 'Septia Yudha Rennaningtyas, S.M.B.',       unit: 'Sekretariat' },
        { nama: 'Dias Hartanto, S.M.',                      unit: 'Sekretariat' },
        { nama: 'Anas Margono, S.Kom.',                     unit: 'Sekretariat' },
        { nama: 'Joko Sambudi Raharjo',                     unit: 'Sekretariat' },
        { nama: 'Luvianingsih, A.Md.',                      unit: 'Sekretariat' },
        { nama: 'Hesti Ratnasari, A.Md.',                   unit: 'Sekretariat' },
        { nama: 'Rana Salsabila Putri',                     unit: 'Sekretariat' },
        { nama: 'Bob Prabowo, S.E.',                        unit: 'Sekretariat' },
        { nama: 'Windu Wahyu Suryaningsih, S.E.',           unit: 'Sekretariat' },
        { nama: 'Dhaniar Fitria Widyaningtyas, S.E.',       unit: 'Sekretariat' },
        { nama: 'Nita Arum Sari, A.Md.Sek.',               unit: 'Sekretariat' },
        // Grup: koperasi
        { nama: 'Purnama Setiawan, S.T.',            unit: 'Bidang Koperasi' },
        { nama: 'Fikri Muttaqin, S.A.B.',            unit: 'Bidang Koperasi' },
        { nama: 'Rembranto Gusani Putro, S.A.B.',    unit: 'Bidang Koperasi' },
        { nama: 'Faris Rizki Rahardian, S.H.',       unit: 'Bidang Koperasi' },
        { nama: 'Anindya Putri Kusumaningrum, S.H.', unit: 'Bidang Koperasi' },
        { nama: 'Firdha Ikhsania Fadilla, S.H.',     unit: 'Bidang Koperasi' },
        { nama: 'Laura Nindya Khalista, S.H.',       unit: 'Bidang Koperasi' },
        // Grup: ukm
        { nama: 'Perpetua Windhy Harmonie, S.E., M.E.', unit: 'Bidang UKM' },
        { nama: 'Yogie Krisnawangi Saifullah, S.A.B.',  unit: 'Bidang UKM' },
        { nama: 'Ali Najmudin, S.A.B.',                 unit: 'Bidang UKM' },
        { nama: 'Edi Susila',                           unit: 'Bidang UKM' },
        { nama: 'Asyifa Dicha Firani, S.T.',            unit: 'Bidang UKM' },
        { nama: 'Deni Wijayanto, S.Kom.',               unit: 'Bidang UKM' },
        // Grup: usaha-mikro
        { nama: 'Alexius Widhi Nur Pambudi, S.E., M.Sc.', unit: 'Bidang Usaha Mikro' },
        { nama: 'Rizki Octaviani, S.T.',                  unit: 'Bidang Usaha Mikro' },
        { nama: 'Desi Kurniawati, S.H., M.Acc.',          unit: 'Bidang Usaha Mikro' },
        { nama: 'Asrindha Patriandina, S.STP.',           unit: 'Bidang Usaha Mikro' },
        { nama: 'Bernadheta Gezia Arine, S.E.',           unit: 'Bidang Usaha Mikro' },
        { nama: 'Gita Putri Andikawati, S.E.',            unit: 'Bidang Usaha Mikro' },
        // Grup: kewirausahaan
        { nama: 'Ratna Listiyani, S.Si.',          unit: 'Bidang Kewirausahaan' },
        { nama: 'Muhammad Daud Ramadhan, S.H.',    unit: 'Bidang Kewirausahaan' },
        { nama: 'Nanda Kesuma Devi, S.I.A.',       unit: 'Bidang Kewirausahaan' },
        { nama: 'Rosalia Kurnia Handari, S.T.P.',  unit: 'Bidang Kewirausahaan' },
        { nama: 'Pancais Meysir Kusdanarko, S.E.', unit: 'Bidang Kewirausahaan' },
        { nama: 'Annisa Sulcha Afifah, S.Kom.',    unit: 'Bidang Kewirausahaan' },
        { nama: 'Endah Febriasih, S.A.B.',         unit: 'Bidang Kewirausahaan' },
        // Grup: blut
        { nama: 'Aribowo, S.Pi., M.Eng.',    unit: 'Balai Layanan Usaha Terpadu KUMKM' },
        { nama: 'Kuntarta, S.Sos., M.AP',    unit: 'Balai Layanan Usaha Terpadu KUMKM' },
        { nama: 'Hana Budi Setyowati, S.T.', unit: 'Balai Layanan Usaha Terpadu KUMKM' },
    ];

    // ── Hitung triwulan yang boleh diupload berdasarkan bulan sekarang ──
    function getMaxAllowedTriwulan() {
        const month = new Date().getMonth() + 1;
        if (month <= 3)  return 1;
        if (month <= 6)  return 2;
        if (month <= 9)  return 3;
        return 4;
    }

    // ── Cek apakah triwulan ke-idx (0-based) boleh diakses ──
    function isTriwulanAllowed(idx, existData) {
        const maxIdx = getMaxAllowedTriwulan() - 1;
        if (idx > maxIdx) return false;
        if (idx === 0) return true;
        for (let prev = 0; prev < idx; prev++) {
            const qd = existData ? (existData[QUARTERS[prev].key] || {}) : {};
            const hasPrev = !!(qd.link || qd.fileName || qd.fileDataUrl);
            if (!hasPrev) return false;
        }
        return true;
    }

    // ── Label alasan kenapa triwulan dikunci ──
    function getTriwulanLockReason(idx, existData) {
        const maxIdx = getMaxAllowedTriwulan() - 1;
        if (idx > maxIdx) {
            const monthNames = ['','Januari','Februari','Maret','April','Mei','Juni',
                                'Juli','Agustus','September','Oktober','November','Desember'];
            const startMonth = [0,1,4,7,10][idx + 1];
            return `Periode belum tiba (mulai ${monthNames[startMonth]})`;
        }
        if (idx > 0) {
            const prevQ = QUARTERS[idx - 1];
            const qd = existData ? (existData[prevQ.key] || {}) : {};
            const hasPrev = !!(qd.link || qd.fileName || qd.fileDataUrl);
            if (!hasPrev) return `Upload ${prevQ.label} terlebih dahulu`;
        }
        return 'Terkunci';
    }

    let masterDiklat = [];
    // [v2.1] allDiklat sekarang selalu berbasis buildMergedList(),
    // bukan masterDiklat langsung — supaya semua nama PEGAWAI_LIST selalu muncul.
    let allDiklat = [];
    let diklatCurrentPage = 1;
    const itemsPerPage = 10;
    let editingId = null;
    let fileData = [{}, {}, {}, {}];

    const SVG = {
        refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
        plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
        eye: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
        edit: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
        trash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
        check: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        link: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
        file: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
        img: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
        upload: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>`,
        lock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
        x: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    };

    // ─── API JSONP ───────────────────────────────────────────────
    function apiCall(params) {
        return new Promise((resolve, reject) => {
            const cbName = 'dklatCb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
            const timeout = setTimeout(() => {
                delete window[cbName];
                reject(new Error('Request timeout'));
            }, 60000);

            window[cbName] = function (data) {
                clearTimeout(timeout);
                delete window[cbName];
                resolve(data);
            };

            const parts = [];
            Object.entries({ ...params, callback: cbName }).forEach(([k, v]) => {
                parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(
                    typeof v === 'object' ? JSON.stringify(v) : String(v)
                ));
            });

            const script = document.createElement('script');
            script.src = API_URL + '?' + parts.join('&');
            script.onerror = () => {
                clearTimeout(timeout);
                delete window[cbName];
                try { document.head.removeChild(script); } catch (_) { }
                reject(new Error('Network error'));
            };
            document.head.appendChild(script);
            setTimeout(() => { try { document.head.removeChild(script); } catch (_) { } }, 65000);
        });
    }

    // ─── API POST (upload file) ──────────────────────────────────
    function apiCallPost(params) {
        return new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('timeout')), 60000);
            fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(params),
                redirect: 'follow'
            })
                .then(r => r.text())
                .then(text => {
                    clearTimeout(t);
                    try { resolve(JSON.parse(text)); }
                    catch (e) { resolve({ status: 'error', message: 'Respons tidak valid' }); }
                })
                .catch(err => { clearTimeout(t); reject(err); });
        });
    }

    // ─── NORMALISE ──────────────────────────────────────────────
    function _normaliseRow(row) {
        QUARTERS.forEach(q => {
            const raw = row[q.key];
            if (!raw || raw === '') {
                row[q.key] = { link: null, fileName: null, fileDataUrl: null };
            } else if (typeof raw === 'object') {
                row[q.key] = raw;
            } else {
                const isDriveImg = raw.includes('drive.google.com/thumbnail') ||
                    raw.includes('googleusercontent.com');
                row[q.key] = {
                    link: raw,
                    fileName: _fileNameFromUrl(raw),
                    fileDataUrl: isDriveImg ? raw : null,
                };
            }
        });
        return row;
    }

    function _fileNameFromUrl(url) {
        if (!url) return null;
        try {
            const u = new URL(url);
            const path = u.pathname.split('/').filter(Boolean);
            const last = path[path.length - 1];
            if (last && last.length < 100 && last.includes('.')) return last;
        } catch (_) { }
        return 'File';
    }

    // ─── CEK APAKAH PEGAWAI SUDAH ADA DI masterDiklat ──────────
    function findDiklatByNama(nama) {
        return masterDiklat.find(d => (d.nama || '').toLowerCase().trim() === (nama || '').toLowerCase().trim());
    }

    // ─── LOAD ────────────────────────────────────────────────────
    async function loadDiklat() {
        _setTableLoading(true);
        try {
            const res = await apiCall({ action: 'getDiklat' });
            if (res.status === 'success') {
                masterDiklat = (res.diklat || []).map(_normaliseRow);
            } else {
                masterDiklat = [];
                _toast('Gagal memuat data: ' + (res.message || ''), 'error');
            }
        } catch (e) {
            masterDiklat = [];
            _toast('Gagal terhubung ke server: ' + e.message, 'error');
        }

        // [v2.1] allDiklat selalu dibangun dari merged list supaya semua
        // nama PEGAWAI_LIST tampil walau belum ada data di server.
        allDiklat = buildMergedList();
        diklatCurrentPage = 1;
        renderStats();
        renderPaginatedDiklat();
    }
    window.diklatLoad = loadDiklat;

    // ── Expose masterDiklat agar penilaian-orang.js bisa akses ──
    window.diklatGetMasterData = () => masterDiklat;
    window.diklatHasUpload = (nama) => {
        const d = findDiklatByNama(nama);
        if (!d) return false;
        return QUARTERS.some(q => {
            const qd = d[q.key] || {};
            return !!(qd.link || qd.fileName || qd.fileDataUrl);
        });
    };

    function _setTableLoading(on) {
        const tbody = document.getElementById('dklat-tbody');
        if (tbody && on) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px;color:#94a3b8;font-size:14px;">
            <span class="spinner"></span>&nbsp; Memuat data…
        </td></tr>`;
    }

    // ─── STATS ───────────────────────────────────────────────────
    function renderStats() {
        let lengkap = 0, sebagian = 0, kosong = 0;
        PEGAWAI_LIST.forEach(p => {
            const d = findDiklatByNama(p.nama);
            if (!d) { kosong++; return; }
            const filled = QUARTERS.filter(q => {
                const qd = d[q.key] || {};
                return qd.link || qd.fileName || qd.fileDataUrl;
            }).length;
            if (filled === 4) lengkap++;
            else if (filled > 0) sebagian++;
            else kosong++;
        });
        const el = id => document.getElementById(id);
        if (el('dklat-stat-total'))    el('dklat-stat-total').textContent    = PEGAWAI_LIST.length;
        if (el('dklat-stat-lengkap'))  el('dklat-stat-lengkap').textContent  = lengkap;
        if (el('dklat-stat-sebagian')) el('dklat-stat-sebagian').textContent = sebagian;
        if (el('dklat-stat-kosong'))   el('dklat-stat-kosong').textContent   = kosong;
    }

    // ─── FILTER ──────────────────────────────────────────────────
    function diklatApplyFilter() {
        const q = (document.getElementById('dklat-search')?.value || '').toLowerCase().trim();
        // [v2.1] Filter selalu dari buildMergedList() agar semua nama tetap tersedia
        allDiklat = buildMergedList().filter(d =>
            (d.nama || '').toLowerCase().includes(q) ||
            (d.unit || '').toLowerCase().includes(q)
        );
        diklatCurrentPage = 1;
        renderPaginatedDiklat();
    }
    window.diklatApplyFilter = diklatApplyFilter;

    // ─── Gabungkan PEGAWAI_LIST dengan data dari server ──────────
    // [v2.1] Fungsi ini adalah SATU-SATUNYA sumber data tabel.
    // Semua pegawai dari PEGAWAI_LIST selalu tampil.
    // Pegawai yang sudah ada datanya di server → digabung.
    // Pegawai yang belum ada → ditampilkan sebagai baris kosong.
    function buildMergedList() {
        const merged = PEGAWAI_LIST.map(p => {
            const serverData = findDiklatByNama(p.nama);
            if (serverData) return serverData;
            // Baris kosong — belum ada di spreadsheet
            const empty = { id: null, nama: p.nama, unit: p.unit };
            QUARTERS.forEach(q => { empty[q.key] = { link: null, fileName: null, fileDataUrl: null }; });
            return empty;
        });
        // Tambahkan data server yang namanya tidak ada di PEGAWAI_LIST (data lama/manual)
        masterDiklat.forEach(d => {
            const inList = PEGAWAI_LIST.some(p => p.nama.toLowerCase().trim() === (d.nama || '').toLowerCase().trim());
            if (!inList) merged.push(d);
        });
        return merged;
    }

    // ─── BADGE (table cell) ──────────────────────────────────────
    function _qdBadge(qd, q, locked) {
        if (locked) {
            return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;
                padding:3px 8px 3px 6px;border-radius:20px;
                background:#f1f5f9;color:#94a3b8;border:1px solid #e2e8f0;white-space:nowrap;">
                ${SVG.lock}&nbsp;Terkunci
            </span>`;
        }

        const hasImg  = !!(qd.fileDataUrl && (qd.fileDataUrl.startsWith('data:image') || qd.fileDataUrl.includes('thumbnail')));
        const hasLink = !!qd.link;
        const hasFile = !!qd.fileName && !hasImg;

        if (!hasImg && !hasFile && !hasLink) {
            return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#e2e8f0;" title="Belum ada"></span>`;
        }

        const icon  = hasImg ? SVG.img : hasFile ? SVG.file : SVG.link;
        const label = hasImg ? 'Gambar' : hasFile ? 'File' : 'Link';
        const url   = hasLink ? qd.link : null;

        const inner = `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:500;
            padding:3px 9px 3px 7px;border-radius:20px;
            background:${q.bg};color:${q.color};border:1px solid ${q.border};
            white-space:nowrap;line-height:1.4;">
            ${icon}&nbsp;${label}
        </span>`;

        if (url) return `<a href="${url}" target="_blank" rel="noopener" style="text-decoration:none;" title="Buka ${label}">${inner}</a>`;
        return inner;
    }

    // ─── RENDER TABLE ────────────────────────────────────────────
    function renderPaginatedDiklat() {
        const tbody = document.getElementById('dklat-tbody');
        const cards = document.getElementById('dklat-cards');
        const pgn   = document.getElementById('dklat-pagination');
        if (!tbody) return;

        // [v2.1] Selalu gunakan allDiklat yang sudah diisi dari buildMergedList().
        // allDiklat tidak pernah kosong selama PEGAWAI_LIST ada isinya.
        const list = allDiklat.length > 0 ? allDiklat : buildMergedList();

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px;color:#94a3b8;font-size:14px;">Tidak ada data.</td></tr>`;
            if (cards) cards.innerHTML = '';
            if (pgn)   pgn.innerHTML   = '';
            return;
        }

        const totalPages = Math.ceil(list.length / itemsPerPage);
        const start = (diklatCurrentPage - 1) * itemsPerPage;
        const items = list.slice(start, start + itemsPerPage);

        tbody.innerHTML = items.map((d, i) => {
            const no       = start + i + 1;
            const initials = (d.nama || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
            const qCells   = QUARTERS.map((q, idx) => {
                const locked = !isTriwulanAllowed(idx, d);
                return `<td style="text-align:center;vertical-align:middle;">${_qdBadge(d[q.key] || {}, q, locked)}</td>`;
            }).join('');
            const hasId    = !!d.id;
            return `<tr>
                <td style="color:#94a3b8;font-size:12px;font-weight:500;">${no}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:32px;height:32px;border-radius:50%;background:#f1f5f9;
                            display:flex;align-items:center;justify-content:center;
                            font-size:11px;font-weight:600;color:#475569;flex-shrink:0;">${initials}</div>
                        <div>
                            <div style="font-weight:600;font-size:13.5px;color:#1e293b;">${d.nama || '—'}</div>
                        </div>
                    </div>
                </td>
                <td style="color:#64748b;font-size:13px;">${d.unit || '—'}</td>
                ${qCells}
                <td>
                    <div class="action-buttons"><div class="btn-icon-group">
                        ${hasId ? `<button onclick="diklatOpenDetail('${d.id}')"  class="btn-icon btn-icon-view"   title="Lihat detail">${SVG.eye}</button>` : ''}
                        <button onclick="diklatOpenEditByNama('${_escJs(d.nama)}','${_escJs(d.unit)}')"    class="btn-icon btn-icon-edit"   title="Upload bukti">${SVG.edit}</button>
                        ${hasId ? `<button onclick="diklatDelete('${d.id}',this)" class="btn-icon btn-icon-delete" title="Hapus">${SVG.trash}</button>` : ''}
                    </div></div>
                </td>
            </tr>`;
        }).join('');

        // Mobile cards
        if (cards) {
            cards.innerHTML = items.map(d => {
                const qRows = QUARTERS.map((q, idx) => {
                    const locked = !isTriwulanAllowed(idx, d);
                    const badge  = _qdBadge(d[q.key] || {}, q, locked);
                    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;">
                        <span style="font-size:11.5px;font-weight:600;color:#94a3b8;">${q.label}</span>
                        ${badge}
                    </div>`;
                }).join('');
                const hasId = !!d.id;
                return `<div class="krs-card" style="margin-bottom:10px;">
                    <div class="krs-card-top">
                        <div>
                            <div class="krs-card-name">${d.nama || '—'}</div>
                            <div class="krs-card-unit">${d.unit || '—'}</div>
                        </div>
                    </div>
                    <div style="margin:8px 0 4px;">${qRows}</div>
                    <div class="krs-card-footer">
                        <div></div>
                        <div class="btn-icon-group" style="margin:0;">
                            ${hasId ? `<button onclick="diklatOpenDetail('${d.id}')"  class="btn-icon btn-icon-view">${SVG.eye}</button>` : ''}
                            <button onclick="diklatOpenEditByNama('${_escJs(d.nama)}','${_escJs(d.unit)}')" class="btn-icon btn-icon-edit">${SVG.edit}</button>
                            ${hasId ? `<button onclick="diklatDelete('${d.id}',this)" class="btn-icon btn-icon-delete">${SVG.trash}</button>` : ''}
                        </div>
                    </div>
                </div>`;
            }).join('');
        }

        if (pgn) pgn.innerHTML = `
            <button onclick="diklatChangePage(${diklatCurrentPage - 1})" ${diklatCurrentPage === 1 ? 'disabled' : ''}>&#8249; Prev</button>
            <span class="pagination-info">Halaman ${diklatCurrentPage} dari ${totalPages} &nbsp;·&nbsp; ${list.length} pegawai</span>
            <button onclick="diklatChangePage(${diklatCurrentPage + 1})" ${diklatCurrentPage === totalPages ? 'disabled' : ''}>Next &#8250;</button>`;
    }

    window.diklatChangePage = (page) => {
        const list = allDiklat.length > 0 ? allDiklat : buildMergedList();
        const t = Math.ceil(list.length / itemsPerPage);
        if (page < 1 || page > t) return;
        diklatCurrentPage = page;
        renderPaginatedDiklat();
    };

    function _escJs(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

    // ─── MODAL HELPERS ───────────────────────────────────────────
    function _openModal(id)  { const el = document.getElementById(id); if (el) el.style.display = 'flex'; }
    function _closeModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
    window.diklatCloseModal = (id) => _closeModal(id);

    // ─── FORM — EDIT BY NAMA (dari tabel utama) ──────────────────
    window.diklatOpenEditByNama = function (nama, unit) {
        const existing = findDiklatByNama(nama);
        if (existing) {
            diklatOpenEdit(existing.id);
        } else {
            editingId = null;
            fileData  = [{}, {}, {}, {}];
            document.getElementById('dklat-modal-title').textContent = 'Upload Bukti Diklat';
            document.getElementById('dklat-form-nama').value = nama;
            const unitSel = document.getElementById('dklat-form-unit');
            if (unitSel) unitSel.value = unit || '';
            document.getElementById('dklat-form-nama').readOnly = true;
            if (unitSel) unitSel.disabled = true;
            _buildQuarterForms(null);
            _openModal('dklat-formModal');
        }
    };

    // ─── FORM — ADD ──────────────────────────────────────────────
    window.diklatOpenAdd = function () {
        editingId = null;
        fileData  = [{}, {}, {}, {}];
        document.getElementById('dklat-modal-title').textContent = 'Tambah Data Diklat';
        document.getElementById('dklat-form-nama').value = '';
        document.getElementById('dklat-form-nama').readOnly = false;
        const unitSel = document.getElementById('dklat-form-unit');
        if (unitSel) { unitSel.value = ''; unitSel.disabled = false; }
        _buildQuarterForms(null);
        _openModal('dklat-formModal');
    };

    // ─── FORM — EDIT ─────────────────────────────────────────────
    window.diklatOpenEdit = function (id) {
        const d = masterDiklat.find(x => x.id === id);
        if (!d) return;
        editingId = id;
        fileData  = QUARTERS.map(q => ({ ...(d[q.key] || {}) }));
        document.getElementById('dklat-modal-title').textContent = 'Upload Bukti Diklat';
        document.getElementById('dklat-form-nama').value = d.nama || '';
        document.getElementById('dklat-form-nama').readOnly = true;
        const unitSel = document.getElementById('dklat-form-unit');
        if (unitSel) { unitSel.value = d.unit || ''; unitSel.disabled = true; }
        _buildQuarterForms(d);
        _openModal('dklat-formModal');
    };

    // ─── SUBMIT ──────────────────────────────────────────────────
    window.diklatSubmitForm = async function () {
        const nama = document.getElementById('dklat-form-nama').value.trim();
        const unitEl = document.getElementById('dklat-form-unit');
        const unit = (unitEl.value || '').trim();
        if (!nama || !unit) {
            _toast('Nama Peserta dan Unit harus diisi', 'error');
            return;
        }

        const qPayload = {};
        QUARTERS.forEach((q, idx) => {
            const linkEl  = document.getElementById(`dklat-link-${idx}`);
            const linkVal = linkEl ? linkEl.value.trim() : '';
            const isLinkPane = document.getElementById(`dklat-pane-link-${idx}`)?.style.display !== 'none';
            const hasNewFile = !!(fileData[idx]?.fileDataUrl && fileData[idx].fileDataUrl.startsWith('data:'));
            qPayload[q.key] = { isLink: isLinkPane, linkVal, hasNewFile, idx };
        });

        const btnSave = document.getElementById('dklat-btn-save');
        if (btnSave) {
            btnSave.disabled = true;
            btnSave.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan…';
        }

        try {
            let targetId = editingId;

            const baseParams = { nama, unit };
            QUARTERS.forEach(q => {
                const p = qPayload[q.key];
                if (p.isLink) baseParams[q.key] = p.linkVal || '';
            });

            if (!editingId) {
                const res = await apiCall({ action: 'createDiklat', ...baseParams });
                if (res.status !== 'success') throw new Error(res.message || 'Gagal membuat data');
                targetId = res.id;
            } else {
                const res = await apiCall({ action: 'updateDiklat', id: editingId, ...baseParams });
                if (res.status !== 'success') throw new Error(res.message || 'Gagal memperbarui data');
            }

            const uploadErrors = [];
            for (const q of QUARTERS) {
                const p = qPayload[q.key];
                if (!p.hasNewFile) continue;
                const fd = fileData[p.idx];
                const commaIdx = fd.fileDataUrl.indexOf(',');
                const base64Raw = commaIdx > -1 ? fd.fileDataUrl.slice(commaIdx + 1) : fd.fileDataUrl;
                try {
                    const upRes = await apiCallPost({
                        action: 'uploadDiklatFile',
                        id: targetId,
                        triwulanKey: q.key,
                        fileData: base64Raw,
                        mimeType: fd.fileType || 'application/octet-stream',
                        fileName: fd.fileName || ('file_' + q.key),
                    });
                    if (upRes.status !== 'success' && !upRes.success) {
                        uploadErrors.push(q.label + ': ' + (upRes.message || 'gagal upload'));
                    }
                } catch (e) {
                    uploadErrors.push(q.label + ': ' + e.message);
                }
            }

            if (uploadErrors.length > 0) {
                _toast('Data tersimpan, tapi ada file gagal:\n' + uploadErrors.join('\n'), 'warning');
            } else {
                _toast(editingId ? 'Data berhasil diperbarui' : 'Data berhasil ditambahkan', 'success');
            }

            _closeModal('dklat-formModal');
            await loadDiklat();

        } catch (err) {
            _toast('Error: ' + err.message, 'error');
        } finally {
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.innerHTML = SVG.check + ' &nbsp;Simpan Data';
            }
        }
    };

    // ─── DELETE ──────────────────────────────────────────────────
    window.diklatDelete = function (id, btnEl) {
        const d = masterDiklat.find(x => x.id === id);
        if (!d) return;

        const doDelete = async () => {
            const orig = btnEl ? btnEl.innerHTML : null;
            if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '<span class="spinner spinner-sm"></span>'; }
            try {
                const res = await apiCall({ action: 'deleteDiklat', id });
                if (res.status === 'success') {
                    _toast('Data berhasil dihapus', 'success');
                    await loadDiklat();
                } else {
                    _toast('Gagal hapus: ' + (res.message || ''), 'error');
                    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = orig; }
                }
            } catch (e) {
                _toast('Error: ' + e.message, 'error');
                if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = orig; }
            }
        };

        if (window.showConfirmModal) {
            showConfirmModal({
                icon: '🗑️',
                title: 'Hapus Data Diklat?',
                message: `Peserta: <strong>${d.nama || '-'}</strong><br>Unit: <strong>${d.unit || '-'}</strong><br><br>
                    <span style="color:#ef4444;font-weight:600;">File di Drive juga akan dihapus. Tindakan ini tidak dapat dibatalkan.</span>`,
                confirmText: 'Ya, Hapus',
                confirmClass: 'btn-danger',
            }, doDelete);
        } else {
            if (confirm(`Hapus data ${d.nama}?`)) doDelete();
        }
    };

    // ─── HAPUS FILE PER TRIWULAN ─────────────────────────────────
    window.diklatDeleteFile = async function (id, triwulanKey, btnEl) {
        const orig = btnEl ? btnEl.innerHTML : null;
        if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '<span class="spinner spinner-sm"></span>'; }
        try {
            const res = await apiCall({ action: 'deleteDiklatFile', id, triwulanKey });
            if (res.status === 'success') {
                _toast('File berhasil dihapus', 'success');
                await loadDiklat();
                const dm = document.getElementById('dklat-detailModal');
                if (dm && dm.style.display !== 'none') diklatOpenDetail(id);
            } else {
                _toast('Gagal hapus file: ' + (res.message || ''), 'error');
                if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = orig; }
            }
        } catch (e) {
            _toast('Error: ' + e.message, 'error');
            if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = orig; }
        }
    };

    // ─── QUARTER FORM BUILDER ────────────────────────────────────
    function _buildQuarterForms(existData) {
        const grid = document.getElementById('dklat-quarters-grid');
        if (!grid) return;

        grid.innerHTML = QUARTERS.map((q, idx) => {
            const saved   = existData ? (existData[q.key] || {}) : {};
            const allowed = isTriwulanAllowed(idx, existData);
            const reason  = allowed ? '' : getTriwulanLockReason(idx, existData);

            if (!allowed) {
                return `
                <div id="dklat-qcard-${idx}" style="border-radius:10px;border:1px solid #e2e8f0;background:#f8fafc;padding:14px;opacity:.65;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#cbd5e1;flex-shrink:0;"></span>
                        <div>
                            <div style="font-size:13px;font-weight:600;color:#94a3b8;">${q.label}</div>
                            <div style="font-size:11px;color:#cbd5e1;">${q.sub}</div>
                        </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;padding:12px;background:#f1f5f9;border-radius:7px;border:1px dashed #e2e8f0;">
                        <span style="color:#94a3b8;">${SVG.lock}</span>
                        <span style="font-size:12px;color:#94a3b8;">${reason}</span>
                    </div>
                </div>`;
            }

            const isLink  = !!(saved.link && !saved.fileDataUrl);
            const hasImg  = !!(saved.fileDataUrl &&
                (saved.fileDataUrl.startsWith('data:image') ||
                    saved.fileDataUrl.includes('thumbnail') ||
                    saved.fileDataUrl.includes('googleusercontent')));
            const hasFile = !!saved.fileName && !hasImg && !isLink;

            let fileContent;
            if (hasImg) {
                fileContent = `
                    <img src="${saved.fileDataUrl}" style="width:100%;border-radius:6px;object-fit:cover;max-height:90px;display:block;border:1px solid ${q.border};margin-bottom:6px;">
                    <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:#f8fafc;border-radius:5px;font-size:12px;color:#475569;border:1px solid #e2e8f0;">
                        ${SVG.img}&nbsp;<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${saved.fileName || 'Gambar'}</span>
                        <button type="button" onclick="diklatClearFileLocal(${idx})" style="background:none;border:none;cursor:pointer;color:#94a3b8;display:flex;align-items:center;padding:2px;" title="Ganti">${SVG.x}</button>
                    </div>`;
            } else if (hasFile) {
                fileContent = `
                    <div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:#f8fafc;border-radius:6px;font-size:12px;color:#475569;border:1px solid #e2e8f0;">
                        ${SVG.file}&nbsp;<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${saved.fileName}</span>
                        <button type="button" onclick="diklatClearFileLocal(${idx})" style="background:none;border:none;cursor:pointer;color:#94a3b8;display:flex;align-items:center;padding:2px;" title="Ganti">${SVG.x}</button>
                    </div>`;
            } else {
                fileContent = _uploadZoneHTML(idx);
            }

            return `
            <div id="dklat-qcard-${idx}" style="border-radius:10px;border:1px solid #e2e8f0;background:#fff;padding:14px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${q.dot};flex-shrink:0;"></span>
                    <div>
                        <div style="font-size:13px;font-weight:600;color:#1e293b;">${q.label}</div>
                        <div style="font-size:11px;color:#94a3b8;">${q.sub}</div>
                    </div>
                </div>

                <div style="display:flex;border-radius:6px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:10px;background:#f8fafc;">
                    <button type="button" id="dklat-tab-file-${idx}" onclick="diklatSwitchQTab(${idx},'file')"
                        style="flex:1;padding:6px 10px;font-size:12px;font-weight:500;border:none;cursor:pointer;transition:all .15s;
                               background:${!isLink ? '#1e293b' : 'transparent'};color:${!isLink ? '#fff' : '#64748b'};">
                        Upload File
                    </button>
                    <button type="button" id="dklat-tab-link-${idx}" onclick="diklatSwitchQTab(${idx},'link')"
                        style="flex:1;padding:6px 10px;font-size:12px;font-weight:500;border:none;cursor:pointer;transition:all .15s;
                               background:${isLink ? '#1e293b' : 'transparent'};color:${isLink ? '#fff' : '#64748b'};">
                        Tempel Link
                    </button>
                </div>

                <div id="dklat-pane-file-${idx}" style="display:${isLink ? 'none' : 'block'};">
                    <div id="dklat-file-area-${idx}">${fileContent}</div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:5px;">JPG · PNG · PDF · Word — maks 10MB</div>
                </div>
                <div id="dklat-pane-link-${idx}" style="display:${isLink ? 'block' : 'none'};">
                    <input type="text" id="dklat-link-${idx}" class="form-input"
                        placeholder="https://drive.google.com/…"
                        value="${isLink ? (saved.link || '') : ''}"
                        oninput="diklatOnLinkInput(${idx})"
                        style="font-size:12.5px;">
                    <div id="dklat-link-preview-${idx}" style="margin-top:5px;">
                        ${isLink && saved.link
                    ? `<a href="${saved.link}" target="_blank" style="font-size:12px;color:#2563eb;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">${SVG.link}&nbsp;Buka link</a>`
                    : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    function _uploadZoneHTML(idx) {
        return `
            <label style="display:flex;flex-direction:column;align-items:center;gap:6px;
                border:1.5px dashed #cbd5e1;border-radius:7px;padding:16px 10px;text-align:center;
                cursor:pointer;background:#fafbfc;color:#94a3b8;font-size:12px;position:relative;
                transition:border-color .15s;" for="dklat-file-${idx}">
                <input type="file" id="dklat-file-${idx}" accept="image/*,.pdf,.doc,.docx"
                    style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;"
                    onchange="diklatHandleFile(${idx})">
                <div style="color:#64748b;">${SVG.upload}</div>
                <div style="font-size:12px;color:#64748b;">Klik atau seret file ke sini</div>
            </label>`;
    }

    window.diklatSwitchQTab = function (idx, mode) {
        const fp = document.getElementById(`dklat-pane-file-${idx}`);
        const lp = document.getElementById(`dklat-pane-link-${idx}`);
        const tf = document.getElementById(`dklat-tab-file-${idx}`);
        const tl = document.getElementById(`dklat-tab-link-${idx}`);
        if (!fp || !lp) return;
        fp.style.display = mode === 'file' ? 'block' : 'none';
        lp.style.display = mode === 'link' ? 'block' : 'none';
        if (tf) { tf.style.background = mode === 'file' ? '#1e293b' : 'transparent'; tf.style.color = mode === 'file' ? '#fff' : '#64748b'; }
        if (tl) { tl.style.background = mode === 'link' ? '#1e293b' : 'transparent'; tl.style.color = mode === 'link' ? '#fff' : '#64748b'; }
    };

    window.diklatHandleFile = function (idx) {
        const input = document.getElementById(`dklat-file-${idx}`);
        const file  = input?.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            _toast(`File terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Maks 10MB.`, 'error');
            input.value = '';
            return;
        }

        const isImage = file.type.startsWith('image/');
        const reader  = new FileReader();
        reader.onload = function (e) {
            fileData[idx] = { fileName: file.name, fileDataUrl: e.target.result, fileType: file.type };
            const area = document.getElementById(`dklat-file-area-${idx}`);
            if (!area) return;
            area.innerHTML = isImage
                ? `<img src="${e.target.result}" style="width:100%;border-radius:6px;object-fit:cover;max-height:90px;display:block;border:1px solid #e2e8f0;margin-bottom:6px;">
                   <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:#f8fafc;border-radius:5px;font-size:12px;color:#475569;border:1px solid #e2e8f0;">
                       ${SVG.img}&nbsp;<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${file.name}</span>
                       <button type="button" onclick="diklatClearFileLocal(${idx})" style="background:none;border:none;cursor:pointer;color:#94a3b8;display:flex;align-items:center;padding:2px;">${SVG.x}</button>
                   </div>`
                : `<div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:#f8fafc;border-radius:6px;font-size:12px;color:#475569;border:1px solid #e2e8f0;">
                       ${SVG.file}&nbsp;<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${file.name}</span>
                       <button type="button" onclick="diklatClearFileLocal(${idx})" style="background:none;border:none;cursor:pointer;color:#94a3b8;display:flex;align-items:center;padding:2px;">${SVG.x}</button>
                   </div>`;
        };
        reader.readAsDataURL(file);
    };

    window.diklatClearFileLocal = function (idx) {
        fileData[idx] = {};
        const area = document.getElementById(`dklat-file-area-${idx}`);
        if (!area) return;
        area.innerHTML = _uploadZoneHTML(idx);
    };

    window.diklatOnLinkInput = function (idx) {
        const val     = document.getElementById(`dklat-link-${idx}`)?.value.trim() || '';
        const preview = document.getElementById(`dklat-link-preview-${idx}`);
        if (preview) preview.innerHTML = val
            ? `<a href="${val}" target="_blank" style="font-size:12px;color:#2563eb;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">${SVG.link}&nbsp;Buka link</a>`
            : '';
    };

    // ─── DETAIL MODAL ────────────────────────────────────────────
    window.diklatOpenDetail = function (id) {
        const d    = masterDiklat.find(x => x.id === id);
        if (!d) return;
        const body = document.getElementById('dklat-detail-body');
        if (!body) return;

        body.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;
                padding:16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
                <div>
                    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:4px;">Nama Peserta</div>
                    <div style="font-size:15px;font-weight:700;color:#1e293b;">${d.nama || '—'}</div>
                </div>
                <div>
                    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:4px;">Unit / Bagian</div>
                    <div style="font-size:14px;font-weight:600;color:#1e293b;">${d.unit || '—'}</div>
                </div>
            </div>

            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:12px;">Bukti Keikutsertaan Diklat</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;" class="dklat-detail-qgrid">
                ${QUARTERS.map((q, idx) => {
            const qd      = d[q.key] || {};
            const locked  = !isTriwulanAllowed(idx, d);
            const hasImg  = !!(qd.fileDataUrl &&
                (qd.fileDataUrl.startsWith('data:image') ||
                    qd.fileDataUrl.includes('thumbnail') ||
                    qd.fileDataUrl.includes('googleusercontent')));
            const hasLink = !!qd.link;
            const hasFile = !!qd.fileName && !hasImg;

            let content;
            if (locked && !hasImg && !hasFile && !hasLink) {
                content = `<div style="text-align:center;padding:16px;color:#cbd5e1;font-size:12px;display:flex;align-items:center;gap:6px;justify-content:center;">${SVG.lock}&nbsp;${getTriwulanLockReason(idx, d)}</div>`;
            } else if (hasImg) {
                content = `
                    <img src="${qd.fileDataUrl}" alt="${q.label}"
                        style="width:100%;border-radius:6px;object-fit:cover;max-height:110px;display:block;border:1px solid ${q.border};cursor:zoom-in;margin-bottom:6px;"
                        onclick="diklatZoomImg('${qd.fileDataUrl}')">
                    <div style="display:flex;align-items:center;gap:5px;padding:5px 8px;background:#f8fafc;border-radius:5px;font-size:12px;color:#475569;border:1px solid #e2e8f0;">
                        ${SVG.img}&nbsp;<span style="flex:1;font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${qd.fileName || 'Gambar'}</span>
                        ${hasLink ? `<a href="${qd.link}" target="_blank" style="color:#2563eb;font-size:11px;white-space:nowrap;">Buka ↗</a>` : ''}
                        <button onclick="diklatDeleteFile('${d.id}','${q.key}',this)"
                            style="background:none;border:none;cursor:pointer;color:#ef4444;display:flex;align-items:center;padding:2px 4px;" title="Hapus">${SVG.trash}</button>
                    </div>`;
            } else if (hasFile) {
                content = `
                    <div style="display:flex;align-items:center;gap:6px;padding:10px 12px;background:#f8fafc;border-radius:6px;font-size:13px;color:#475569;border:1px solid #e2e8f0;">
                        ${SVG.file}&nbsp;<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${qd.fileName}</span>
                        ${hasLink ? `<a href="${qd.link}" target="_blank" style="color:#2563eb;font-size:11px;white-space:nowrap;">Buka ↗</a>` : ''}
                        <button onclick="diklatDeleteFile('${d.id}','${q.key}',this)"
                            style="background:none;border:none;cursor:pointer;color:#ef4444;display:flex;align-items:center;padding:2px 4px;" title="Hapus">${SVG.trash}</button>
                    </div>`;
            } else if (hasLink) {
                const short = qd.link.length > 40 ? qd.link.slice(0, 40) + '…' : qd.link;
                content = `
                    <div style="display:flex;flex-direction:column;gap:6px;">
                        <a href="${qd.link}" target="_blank" rel="noopener"
                            style="display:flex;align-items:center;gap:6px;padding:10px 12px;
                            background:#eff6ff;border-radius:6px;color:#2563eb;font-size:12px;
                            font-weight:500;text-decoration:none;word-break:break-all;border:1px solid #bfdbfe;">
                            ${SVG.link}&nbsp;${short}
                        </a>
                        <button onclick="diklatDeleteFile('${d.id}','${q.key}',this)"
                            style="background:none;border:1px solid #fca5a5;cursor:pointer;color:#ef4444;
                            font-size:11.5px;font-weight:500;padding:4px 10px;border-radius:5px;
                            align-self:flex-end;display:flex;align-items:center;gap:4px;">
                            ${SVG.trash}&nbsp;Hapus Link
                        </button>
                    </div>`;
            } else {
                content = `<div style="text-align:center;padding:20px;color:#cbd5e1;font-size:13px;">Belum ada data</div>`;
            }

            return `<div style="border-radius:10px;border:1px solid ${locked && !hasImg && !hasFile && !hasLink ? '#e2e8f0' : q.border};background:${locked && !hasImg && !hasFile && !hasLink ? '#f8fafc' : q.bg};padding:12px;">
                        <div style="display:flex;align-items:center;gap:7px;margin-bottom:10px;">
                            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${locked && !hasImg && !hasFile && !hasLink ? '#cbd5e1' : q.dot};"></span>
                            <div>
                                <div style="font-size:12.5px;font-weight:700;color:${locked && !hasImg && !hasFile && !hasLink ? '#94a3b8' : '#1e293b'};">${q.label}</div>
                                <div style="font-size:11px;color:#94a3b8;">${q.sub}</div>
                            </div>
                        </div>
                        ${content}
                    </div>`;
        }).join('')}
            </div>`;

        _openModal('dklat-detailModal');
    };

    window.diklatZoomImg = function (src) {
        const el = document.createElement('div');
        el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;padding:24px;';
        el.innerHTML = `<img src="${src}" style="max-width:90vw;max-height:90vh;border-radius:8px;">`;
        el.onclick   = () => document.body.removeChild(el);
        document.body.appendChild(el);
    };

    // ─── TOAST ───────────────────────────────────────────────────
    function _toast(msg, type = 'info') {
        if (window.showToast) { showToast(msg, type); return; }
        console.log(`[Diklat toast/${type}]`, msg);
    }

    // ─── REGISTER SECTION ────────────────────────────────────────
    window.sectionInits = window.sectionInits || {};
    window.sectionInits['diklat'] = function () {
        const section = document.getElementById('section-diklat');
        if (!section) return;

        const maxTw   = getMaxAllowedTriwulan();
        const twNames = ['', 'Triwulan I (Jan–Mar)', 'Triwulan II (Apr–Jun)', 'Triwulan III (Jul–Sep)', 'Triwulan IV (Okt–Des)'];
        const periodBadge = `<span style="background:#dbeafe;color:#1e40af;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">
            Periode aktif: ${twNames[maxTw]}
        </span>`;

        section.innerHTML = `
<style>
.dklat-cards { display:none; }
.dklat-filter-row { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
@media (max-width: 768px) {
    .dklat-table-wrap { display:none !important; }
    .dklat-cards      { display:block !important; }
}
@media (max-width: 420px) {
    .dklat-detail-qgrid { grid-template-columns:1fr !important; }
    .dklat-qgrid        { grid-template-columns:1fr !important; }
}
.dklat-qgrid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
@media (max-width: 520px) { .dklat-qgrid { grid-template-columns:1fr; } }

.dklat-stat {
    display:flex;flex-direction:column;gap:4px;
    padding:16px 18px;border-radius:10px;
    border:1px solid #e2e8f0;background:#fff;
}
.dklat-stat-label { font-size:12px;font-weight:500;color:#94a3b8; }
.dklat-stat-val   { font-size:26px;font-weight:700;line-height:1.1; }
.dklat-stat-sub   { font-size:11.5px;color:#94a3b8; }
</style>

<div class="container">

    <div class="section-page-header">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <div>
                <h1 class="section-page-title">Diklat</h1>
                <p class="section-page-subtitle">Upload bukti pelatihan pegawai per triwulan</p>
            </div>
            ${periodBadge}
        </div>
    </div>

    <!-- Keterangan periode -->
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:10px 14px;margin-bottom:18px;font-size:12.5px;color:#0369a1;display:flex;gap:8px;align-items:flex-start;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>Upload triwulan bersifat <strong>berurutan</strong> — triwulan berikutnya baru bisa diupload setelah triwulan sebelumnya sudah terisi.
        Upload juga disesuaikan dengan <strong>periode saat ini</strong>: Jan–Mar hanya Tw I · Apr–Jun Tw I & II · Jul–Sep Tw I–III · Okt–Des semua.
        <strong>Semua nama pegawai selalu tampil</strong> meskipun belum ada data — klik ikon pensil untuk upload.</span>
    </div>

    <!-- Stats -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;" class="dklat-stats-row">
        <div class="dklat-stat">
            <div class="dklat-stat-label">Total Pegawai</div>
            <div class="dklat-stat-val" id="dklat-stat-total" style="color:#1e293b;">0</div>
            <div class="dklat-stat-sub">Daftar resmi</div>
        </div>
        <div class="dklat-stat">
            <div class="dklat-stat-label">Lengkap</div>
            <div class="dklat-stat-val" id="dklat-stat-lengkap" style="color:#059669;">0</div>
            <div class="dklat-stat-sub">4 triwulan terisi</div>
        </div>
        <div class="dklat-stat">
            <div class="dklat-stat-label">Sebagian</div>
            <div class="dklat-stat-val" id="dklat-stat-sebagian" style="color:#b45309;">0</div>
            <div class="dklat-stat-sub">1–3 triwulan</div>
        </div>
        <div class="dklat-stat">
            <div class="dklat-stat-label">Belum Ada Bukti</div>
            <div class="dklat-stat-val" id="dklat-stat-kosong" style="color:#dc2626;">0</div>
            <div class="dklat-stat-sub">Semua kosong</div>
        </div>
    </div>

    <!-- Table card -->
    <div class="card">
        <div class="card-header">
            <h2 class="card-title">Daftar Pegawai — Bukti Diklat</h2>
            <div class="dklat-filter-row">
                <input type="text" class="search-input" id="dklat-search"
                    placeholder="Cari nama atau unit…" oninput="diklatApplyFilter()">
                <button onclick="diklatLoad()" class="btn btn-sm"
                    style="display:inline-flex;align-items:center;gap:5px;">${SVG.refresh} Refresh</button>
            </div>
        </div>

        <div class="table-container dklat-table-wrap">
            <table>
                <thead>
                    <tr>
                        <th style="width:36px;">#</th>
                        <th>Nama Pegawai</th>
                        <th>Unit / Bagian</th>
                        <th style="text-align:center;">Triwulan I</th>
                        <th style="text-align:center;">Triwulan II</th>
                        <th style="text-align:center;">Triwulan III</th>
                        <th style="text-align:center;">Triwulan IV</th>
                        <th style="width:90px;">Aksi</th>
                    </tr>
                </thead>
                <tbody id="dklat-tbody">
                    <tr><td colspan="8" style="text-align:center;padding:48px;color:#94a3b8;">Memuat data…</td></tr>
                </tbody>
            </table>
        </div>
        <div class="dklat-cards" id="dklat-cards"></div>
        <div class="pagination" id="dklat-pagination"></div>
    </div>
</div>

<!-- ── MODAL: FORM UPLOAD ───────────────────────────── -->
<div id="dklat-formModal" class="modal-overlay" onclick="if(event.target===this)diklatCloseModal('dklat-formModal')">
    <div class="modal" style="max-width:680px;">
        <div class="modal-header">
            <h2 class="modal-title" id="dklat-modal-title">Upload Bukti Diklat</h2>
        </div>
        <div class="modal-content">

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
                <div class="form-group" style="margin:0;">
                    <label class="input-label">Nama Peserta <span style="color:#ef4444;">*</span></label>
                    <input type="text" class="form-input" id="dklat-form-nama" placeholder="Nama lengkap pegawai"
                        style="background:#f8fafc;">
                </div>
                <div class="form-group" style="margin:0;">
                    <label class="input-label">Unit / Bagian <span style="color:#ef4444;">*</span></label>
                    <select class="form-input" id="dklat-form-unit" style="background:#f8fafc;">
                        <option value="">— Pilih Unit —</option>
                        <option value="Sekretariat">Sekretariat</option>
                        <option value="Bidang Koperasi">Bidang Koperasi</option>
                        <option value="Bidang UKM">Bidang UKM</option>
                        <option value="Bidang Usaha Mikro">Bidang Usaha Mikro</option>
                        <option value="Bidang Kewirausahaan">Bidang Kewirausahaan</option>
                        <option value="Balai Layanan Usaha Terpadu KUMKM">Balai Layanan Usaha Terpadu KUMKM</option>
                    </select>
                </div>
            </div>

            <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
                <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;white-space:nowrap;">Bukti per Triwulan</span>
                <span style="flex:1;height:1px;background:#e2e8f0;"></span>
                <span style="font-size:11px;color:#94a3b8;white-space:nowrap;">Periode aktif: ${twNames[maxTw]}</span>
            </div>

            <div class="dklat-qgrid" id="dklat-quarters-grid"></div>

            <div style="margin-top:14px;padding:10px 14px;background:#f0f9ff;border-radius:7px;
                border:1px solid #bae6fd;font-size:12px;color:#0369a1;">
                Upload langsung maks <strong>10 MB</strong>, atau tempelkan link Google Drive di tab Tempel Link.
                Triwulan yang terkunci tidak dapat diisi sampai triwulan sebelumnya terisi.
            </div>
        </div>
        <div class="modal-footer">
            <button onclick="diklatCloseModal('dklat-formModal');document.getElementById('dklat-form-nama').readOnly=false;document.getElementById('dklat-form-unit').disabled=false;" class="btn" style="flex:1;">Batal</button>
            <button id="dklat-btn-save" onclick="diklatSubmitForm()" class="btn btn-success" style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
                ${SVG.check} Simpan Data
            </button>
        </div>
    </div>
</div>

<!-- ── MODAL: DETAIL ────────────────────────────────────── -->
<div id="dklat-detailModal" class="modal-overlay" onclick="if(event.target===this)diklatCloseModal('dklat-detailModal')">
    <div class="modal" style="max-width:640px;">
        <div class="modal-header">
            <h2 class="modal-title">Detail Diklat</h2>
        </div>
        <div class="modal-content" id="dklat-detail-body"></div>
        <div class="modal-footer">
            <button onclick="diklatCloseModal('dklat-detailModal')" class="btn" style="flex:1;">Tutup</button>
        </div>
    </div>
</div>`;

        // [v2.1] Render daftar kosong dulu dari PEGAWAI_LIST sebelum fetch server
        // supaya tabel langsung tampil semua nama tanpa menunggu network.
        allDiklat = buildMergedList();
        renderStats();
        renderPaginatedDiklat();

        // Baru kemudian fetch data dari server (akan update badge triwulan)
        loadDiklat();
    };

})();