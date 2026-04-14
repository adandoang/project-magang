// ============================================================
// penilaian-orang.js — Penilaian Per Orang section (SPA) v3.3
// Admin Panel — Dinas Koperasi UKM
//
// PERUBAHAN v3.3 (dari v3.2):
//  1. AUTO-LOAD skor tim saat halaman dibuka — tidak perlu klik
//     "Ambil Skor Tim" lagi. loadFromGAS() sekarang memanggil
//     fetchAllTeamScores() secara otomatis bersamaan dengan
//     fetch data penilaian & diklat.
//  2. AUTO-LOAD nilai diklat saat halaman dibuka — langsung
//     diambil dari GAS operasional tanpa klik tombol apapun.
//  3. Tombol "Refresh Diklat" tetap tersedia untuk refresh manual.
//  4. Semua perubahan dari v3.2 tetap berlaku.
// ============================================================
(function () {
    'use strict';

    var SECTION_ID     = 'penilaian-orang';
    var DATA_KEY       = 'penilaian_orang_v2';
    var TEAM_CACHE_KEY = 'penilaian_orang_team_cache_v1';
    var DIKLAT_CACHE_KEY = 'penilaian_orang_diklat_cache_v1';

    function getGasUrl() {
        return (window.PPO_GAS_CONFIG && window.PPO_GAS_CONFIG.url)
            ? window.PPO_GAS_CONFIG.url : '';
    }

    function getOperasionalUrl() {
        return (window.PPO_GAS_CONFIG && window.PPO_GAS_CONFIG.urlOperasional)
            ? window.PPO_GAS_CONFIG.urlOperasional : '';
    }

    var MONTHS = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI',
                  'JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'];
    var MONTH_LABELS = {
        JANUARI:'Januari', FEBRUARI:'Februari', MARET:'Maret', APRIL:'April',
        MEI:'Mei', JUNI:'Juni', JULI:'Juli', AGUSTUS:'Agustus',
        SEPTEMBER:'September', OKTOBER:'Oktober', NOVEMBER:'November', DESEMBER:'Desember'
    };

    var UNITS = [
        'Sekretariat','Bidang Koperasi','Bidang UKM',
        'Bidang Usaha Mikro','Bidang Kewirausahaan',
        'Balai Layanan Usaha Terpadu KUMKM'
    ];

    var AKHLAK = [
        { key:'pelayanan',   label:'Berorientasi Pelayanan',
          desc:'Memahami & memenuhi kebutuhan masyarakat; ramah, cekatan, solutif; melakukan perbaikan tiada henti.' },
        { key:'akuntabel',   label:'Akuntabel',
          desc:'Jujur, bertanggung jawab, cermat, disiplin, berintegritas; efisien gunakan BMN; tidak menyalahgunakan wewenang.' },
        { key:'kompeten',    label:'Kompeten',
          desc:'Mengembangkan kompetensi diri; membantu orang lain belajar; melaksanakan tugas dengan kualitas terbaik.' },
        { key:'harmonis',    label:'Harmonis',
          desc:'Menghargai setiap orang apapun latar belakangnya; suka menolong; membangun lingkungan kerja kondusif.' },
        { key:'loyal',       label:'Loyal',
          desc:'Setia pada Pancasila & UUD 1945, NKRI & pemerintahan yang sah; menjaga nama baik instansi; menjaga rahasia jabatan.' },
        { key:'adaptif',     label:'Adaptif',
          desc:'Cepat menyesuaikan diri; terus berinovasi & kreatif; bertindak proaktif.' },
        { key:'kolaboratif', label:'Kolaboratif',
          desc:'Memberi kesempatan kontribusi; terbuka bekerja sama; menggerakkan pemanfaatan sumber daya bersama.' }
    ];

    var ROLE_TO_GID = {
        penilai_sekretariat:  'sekretariat',
        penilai_ketua:        'agus',
        penilai_koperasi:     'koperasi',
        penilai_ukm:          'ukm',
        penilai_usaha_mikro:  'usaha-mikro',
        penilai_kewirausahaan:'kewirausahaan',
        penilai_blut:         'blut',
    };

    var GROUPS = [
        {
            id: 'agus', evaluator: 'Agus Mulyono, S.P., M.T.', unitLabel: 'Lintas Unit',
            people: [
                { name:'Ritaningrum, S.Sos., M.M.',                       unit:'Sekretariat' },
                { name:'Hellen Phornica, S.T.P., M.Si.',                  unit:'Bidang UKM' },
                { name:'Veronica Setioningtyas Prativi, S.Si., M.Si.',     unit:'Bidang Usaha Mikro' },
                { name:'Wisnu Hermawan, S.P., M.T.',                      unit:'Balai Layanan Usaha Terpadu KUMKM' },
                { name:'Ir. Setyo Hastuti, M.P.',                         unit:'Bidang Koperasi' },
                { name:'Hana Fais Prabowo, S.T.P., M.Si.',                unit:'Bidang Kewirausahaan' }
            ]
        },
        {
            id: 'sekretariat', evaluator: 'Ritaningrum, S.Sos., M.M.', unitLabel: 'Sekretariat',
            people: [
                { name:'Fuji Ippa Wati, S.E.',                   unit:'Sekretariat' },
                { name:'Winarto, S.E.',                           unit:'Sekretariat' },
                { name:'Ice Norawati, S.E., Akt.',                unit:'Sekretariat' },
                { name:'Marselina Widaranti, S.T., M.T.',         unit:'Sekretariat' },
                { name:'Hana Kurniawati',                         unit:'Sekretariat' },
                { name:'Raden Bambang Bagus Tri Hantoro, S.M.',   unit:'Sekretariat' },
                { name:'Heru Wiranto, SIP',                       unit:'Sekretariat' },
                { name:'Septia Yudha Rennaningtyas, S.M.B.',      unit:'Sekretariat' },
                { name:'Dias Hartanto, S.M.',                     unit:'Sekretariat' },
                { name:'Anas Margono, S.Kom.',                    unit:'Sekretariat' },
                { name:'Joko Sambudi Raharjo',                    unit:'Sekretariat' },
                { name:'Luvianingsih, A.Md.',                     unit:'Sekretariat' },
                { name:'Hesti Ratnasari, A.Md.',                  unit:'Sekretariat' },
                { name:'Rana Salsabila Putri',                    unit:'Sekretariat' },
                { name:'Bob Prabowo, S.E.',                       unit:'Sekretariat' },
                { name:'Windu Wahyu Suryaningsih, S.E.',          unit:'Sekretariat' },
                { name:'Dhaniar Fitria Widyaningtyas, S.E.',      unit:'Sekretariat' },
                { name:'Nita Arum Sari, A.Md.Sek.',              unit:'Sekretariat' }
            ]
        },
        {
            id: 'koperasi', evaluator: 'Ir. Setyo Hastuti, M.P.', unitLabel: 'Bidang Koperasi',
            people: [
                { name:'Purnama Setiawan, S.T.',             unit:'Bidang Koperasi' },
                { name:'Fikri Muttaqin, S.A.B.',             unit:'Bidang Koperasi' },
                { name:'Rembranto Gusani Putro, S.A.B.',     unit:'Bidang Koperasi' },
                { name:'Faris Rizki Rahardian, S.H.',        unit:'Bidang Koperasi' },
                { name:'Anindya Putri Kusumaningrum, S.H.',  unit:'Bidang Koperasi' },
                { name:'Firdha Ikhsania Fadilla, S.H.',      unit:'Bidang Koperasi' },
                { name:'Laura Nindya Khalista, S.H.',        unit:'Bidang Koperasi' }
            ]
        },
        {
            id: 'ukm', evaluator: 'Hellen Phornica, S.T.P., M.Si.', unitLabel: 'Bidang UKM',
            people: [
                { name:'Perpetua Windhy Harmonie, S.E., M.E.', unit:'Bidang UKM' },
                { name:'Yogie Krisnawangi Saifullah, S.A.B.',   unit:'Bidang UKM' },
                { name:'Ali Najmudin, S.A.B.',                  unit:'Bidang UKM' },
                { name:'Edi Susila',                            unit:'Bidang UKM' },
                { name:'Asyifa Dicha Firani, S.T.',             unit:'Bidang UKM' },
                { name:'Deni Wijayanto, S.Kom.',                unit:'Bidang UKM' }
            ]
        },
        {
            id: 'usaha-mikro', evaluator: 'Veronica Setioningtyas Prativi, S.Si., M.Si.', unitLabel: 'Bidang Usaha Mikro',
            people: [
                { name:'Alexius Widhi Nur Pambudi, S.E., M.Sc.', unit:'Bidang Usaha Mikro' },
                { name:'Rizki Octaviani, S.T.',                  unit:'Bidang Usaha Mikro' },
                { name:'Desi Kurniawati, S.H., M.Acc.',          unit:'Bidang Usaha Mikro' },
                { name:'Asrindha Patriandina, S.STP.',           unit:'Bidang Usaha Mikro' },
                { name:'Bernadheta Gezia Arine, S.E.',           unit:'Bidang Usaha Mikro' },
                { name:'Gita Putri Andikawati, S.E.',            unit:'Bidang Usaha Mikro' }
            ]
        },
        {
            id: 'kewirausahaan', evaluator: 'Hana Fais Prabowo, S.T.P., M.Si.', unitLabel: 'Bidang Kewirausahaan',
            people: [
                { name:'Ratna Listiyani, S.Si.',         unit:'Bidang Kewirausahaan' },
                { name:'Muhammad Daud Ramadhan, S.H.',   unit:'Bidang Kewirausahaan' },
                { name:'Nanda Kesuma Devi, S.I.A.',      unit:'Bidang Kewirausahaan' },
                { name:'Rosalia Kurnia Handari, S.T.P.', unit:'Bidang Kewirausahaan' },
                { name:'Pancais Meysir Kusdanarko, S.E.',unit:'Bidang Kewirausahaan' },
                { name:'Annisa Sulcha Afifah, S.Kom.',   unit:'Bidang Kewirausahaan' },
                { name:'Endah Febriasih, S.A.B.',        unit:'Bidang Kewirausahaan' }
            ]
        },
        {
            id: 'blut', evaluator: 'Wisnu Hermawan, S.P., M.T.', unitLabel: 'Balai Layanan Usaha Terpadu KUMKM',
            people: [
                { name:'Aribowo, S.Pi., M.Eng.',    unit:'Balai Layanan Usaha Terpadu KUMKM' },
                { name:'Kuntarta, S.Sos., M.AP',    unit:'Balai Layanan Usaha Terpadu KUMKM' },
                { name:'Hana Budi Setyowati, S.T.', unit:'Balai Layanan Usaha Terpadu KUMKM' }
            ]
        }
    ];

    // ── STATE ──
    var state = {
        month: MONTHS[new Date().getMonth()],
        search: '', groupFilter: '', statusFilter: '',
        records: {}, teamScores: {},
        diklatScores: {},
        diklatLoaded: false,
        currentUser: null, loading: false
    };

    // ── STORAGE ──
    function loadRecords() {
        try { state.records = JSON.parse(localStorage.getItem(DATA_KEY) || '{}'); }
        catch(e) { state.records = {}; }
    }
    function saveRecords() {
        try { localStorage.setItem(DATA_KEY, JSON.stringify(state.records)); }
        catch(e) { console.warn('[PPO] localStorage penuh'); }
    }
    function getRec(personPid) { return (state.records[state.month] || {})[personPid] || null; }
    function setRec(personPid, rec) {
        if (!state.records[state.month]) state.records[state.month] = {};
        state.records[state.month][personPid] = rec;
        saveRecords();
    }
    function delRec(personPid) {
        if (state.records[state.month] && state.records[state.month][personPid]) {
            delete state.records[state.month][personPid];
            saveRecords();
        }
    }
    function getCurrentYearString() { return String(new Date().getFullYear()); }

    // ── DIKLAT CACHE ──
    function saveDiklatCache(scores) {
        try {
            var cache = { scores: scores, timestamp: Date.now() };
            localStorage.setItem(DIKLAT_CACHE_KEY, JSON.stringify(cache));
        } catch(e) {}
    }
    function loadDiklatCache() {
        try {
            var raw = JSON.parse(localStorage.getItem(DIKLAT_CACHE_KEY) || 'null');
            if (!raw || !raw.scores) return null;
            // Cache berlaku 1 jam
            if (Date.now() - (raw.timestamp || 0) > 3600000) return null;
            return raw.scores;
        } catch(e) { return null; }
    }

    // ── AMBIL NILAI DIKLAT ──
    function fetchDiklatScores() {
        // Prioritas 1: ambil dari modul diklat yang sudah load (real-time)
        if (window.diklatGetMasterData) {
            var masterData = window.diklatGetMasterData();
            if (masterData && masterData.length > 0) {
                return Promise.resolve(_buildDiklatMap(masterData));
            }
        }

        // Prioritas 2: cache lokal (max 1 jam)
        var cached = loadDiklatCache();
        if (cached) return Promise.resolve(cached);

        // Prioritas 3: fetch langsung dari GAS operasional
        var urlOp = getOperasionalUrl();
        if (!urlOp) {
            console.warn('[PPO Diklat] URL operasional belum dikonfigurasi');
            return Promise.resolve({});
        }

        return new Promise(function(resolve) {
            var cb     = '__ppoDiklat_' + Date.now() + '_' + Math.floor(Math.random() * 99999);
            var done   = false;
            var script = document.createElement('script');
            var timer  = setTimeout(function() {
                if (done) return;
                cleanup();
                console.warn('[PPO Diklat] Timeout fetch diklat scores');
                resolve({});
            }, 15000);

            function cleanup() {
                done = true; clearTimeout(timer);
                try { delete window[cb]; } catch(e) {}
                if (script.parentNode) script.parentNode.removeChild(script);
            }

            window[cb] = function(data) {
                cleanup();
                if (data && data.status === 'success' && Array.isArray(data.diklat)) {
                    var scores = _buildDiklatMap(data.diklat);
                    saveDiklatCache(scores);
                    resolve(scores);
                } else {
                    resolve({});
                }
            };
            script.onerror = function() { if (done) return; cleanup(); resolve({}); };
            script.src = urlOp + '?action=getDiklat&callback=' + cb;
            document.head.appendChild(script);
        });
    }

    function _buildDiklatMap(diklatList) {
        var TRIWULAN_KEYS = ['triwulan1','triwulan2','triwulan3','triwulan4'];
        var map = {};
        diklatList.forEach(function(d) {
            var nama = (d.nama || '').toLowerCase().trim();
            if (!nama) return;
            var hasAny = TRIWULAN_KEYS.some(function(k) {
                var val = d[k];
                if (!val) return false;
                if (typeof val === 'object') return !!(val.link || val.fileName || val.fileDataUrl);
                return String(val).trim() !== '';
            });
            map[nama] = hasAny;
        });
        return map;
    }

    function getDiklatValue(personName) {
        if (!state.diklatLoaded) return null;
        var key = (personName || '').toLowerCase().trim();
        if (state.diklatScores[key] === true)  return 10;
        if (state.diklatScores[key] === false) return 0;
        return 0;
    }

    // ── TEAM CACHE ──
    function loadTeamCacheMonth(month) {
        try {
            var cached = JSON.parse(localStorage.getItem(TEAM_CACHE_KEY) || '{}');
            return (cached[month] && cached[month].scores) ? cached[month].scores : {};
        } catch(e) { return {}; }
    }
    function saveTeamCacheMonth(month, scores) {
        if (window.PPO_GAS_CONFIG && window.PPO_GAS_CONFIG.saveTeamScoresToCache) {
            window.PPO_GAS_CONFIG.saveTeamScoresToCache(month, scores);
        } else {
            try {
                var cached = JSON.parse(localStorage.getItem(TEAM_CACHE_KEY) || '{}');
                cached[month] = { scores: scores || {}, timestamp: Date.now() };
                localStorage.setItem(TEAM_CACHE_KEY, JSON.stringify(cached));
            } catch(e) {}
        }
    }

    // ── JSONP ──
    function gasJsonp(params) {
        return new Promise(function(resolve, reject) {
            var gasUrl = getGasUrl();
            if (!gasUrl) { reject(new Error('URL GAS belum diatur')); return; }
            var cb     = '__ppoGas_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
            var done   = false;
            var script = document.createElement('script');
            var timeout = setTimeout(function() {
                if (done) return;
                cleanup();
                reject(new Error('Timeout 20 detik'));
            }, 20000);
            function cleanup() {
                done = true; clearTimeout(timeout);
                try { delete window[cb]; } catch(e) {}
                if (script.parentNode) script.parentNode.removeChild(script);
            }
            window[cb] = function(data) { cleanup(); resolve(data); };
            script.onerror = function() {
                if (done) return;
                cleanup();
                reject(new Error('Network error'));
            };
            var qs = Object.keys(params || {}).map(function(k) {
                return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
            }).join('&');
            script.src = gasUrl + '?' + qs + '&callback=' + cb;
            document.head.appendChild(script);
        });
    }

    // ── FIND PERSON ──
    function findPersonByPid(personPid) {
        var found = null;
        GROUPS.some(function(g) {
            var p = g.people.find(function(pp) { return pid(g.id, pp.name) === personPid; });
            if (p) { found = { group: g, person: p }; return true; }
        });
        return found;
    }

    function mapGasRecordToLocal(rec) {
        var criteria = (rec.criteria && typeof rec.criteria === 'object') ? rec.criteria : {};
        var diklatFromGas = parseFloat(rec.diklat) || 0;
        var skorTim   = parseFloat(rec.skorTim)   || 0;
        var bobotTim  = parseFloat(rec.bobotTim)  || +(skorTim * 0.60).toFixed(2);
        var nilaiAkhlak = parseFloat(rec.nilaiAkhlak) || 0;
        var total     = parseFloat(rec.total)     || +(bobotTim + nilaiAkhlak + diklatFromGas).toFixed(2);
        return {
            month: rec.bulan || state.month,
            gid: rec.gid || '',
            evaluator: rec.penilai || '',
            name: rec.nama || '',
            unit: rec.unit || '',
            criteria: criteria,
            diklat: diklatFromGas,
            teamScore: skorTim,
            summary: { teamW: bobotTim, akhlakW: nilaiAkhlak, diklatW: diklatFromGas, total: total },
            updatedAt: rec.updatedAt || new Date().toISOString(),
            updatedBy: rec.updatedBy || 'Admin'
        };
    }

    // ══════════════════════════════════════════════════════════
    // [v3.3] loadFromGAS — AUTO-LOAD skor tim + diklat + penilaian
    // semuanya berjalan paralel saat halaman dibuka.
    // ══════════════════════════════════════════════════════════
    function loadFromGAS() {
        var gasUrl = getGasUrl();
        if (!gasUrl) { console.warn('[PPO] GAS URL belum tersedia'); return Promise.resolve(); }
        setLoadingState(true);
        var bulan = state.month;
        var tahun = getCurrentYearString();

        // ── 1. Fetch nilai diklat ──────────────────────────────
        var pDiklat = fetchDiklatScores().then(function(scores) {
            state.diklatScores = scores || {};
            state.diklatLoaded = true;
        }).catch(function() {
            state.diklatLoaded = true;
        });

        // ── 2. Fetch skor tim OTOMATIS (jika tersedia) ─────────
        var pTeam;
        if (window.PPO_GAS_CONFIG && window.PPO_GAS_CONFIG.fetchAllTeamScores) {
            pTeam = window.PPO_GAS_CONFIG.fetchAllTeamScores(bulan)
                .then(function(allScores) {
                    state.teamScores = allScores || {};
                    saveTeamCacheMonth(bulan, state.teamScores);
                    _updateAutoLoadStatus('✓ Skor tim berhasil dimuat otomatis', '#059669');
                })
                .catch(function(err) {
                    console.warn('[PPO] Auto-load skor tim gagal:', err.message);
                    // Fallback ke cache
                    var cached = loadTeamCacheMonth(bulan);
                    if (Object.keys(cached).length > 0) {
                        state.teamScores = cached;
                        _updateAutoLoadStatus('Skor tim dari cache lokal', '#f59e0b');
                    } else {
                        _updateAutoLoadStatus('Skor tim belum tersedia — input manual di modal penilaian', '#94a3b8');
                    }
                });
        } else {
            // Tidak ada fetchAllTeamScores — pakai GAS getTeamScores biasa
            pTeam = gasJsonp({ action: 'getTeamScores', bulan: bulan, tahun: tahun })
                .then(function(teamRes) {
                    if (teamRes && teamRes.status === 'success' && teamRes.scores) {
                        state.teamScores = teamRes.scores;
                        saveTeamCacheMonth(bulan, teamRes.scores);
                        _updateAutoLoadStatus('✓ Skor tim berhasil dimuat', '#059669');
                    }
                })
                .catch(function() {
                    var cached = loadTeamCacheMonth(bulan);
                    if (Object.keys(cached).length > 0) state.teamScores = cached;
                });
        }

        // ── 3. Fetch data penilaian ────────────────────────────
        var pData = gasJsonp({ action: 'getAllPenilaian', bulan: bulan, tahun: tahun })
            .then(function(penilaianRes) {
                if (penilaianRes && penilaianRes.status === 'success' && Array.isArray(penilaianRes.records)) {
                    if (!state.records[bulan]) state.records[bulan] = {};
                    penilaianRes.records.forEach(function(rec) {
                        if (!rec.gid || !rec.nama) return;
                        var recPid = pid(rec.gid, rec.nama);
                        state.records[bulan][recPid] = mapGasRecordToLocal(rec);
                    });
                    saveRecords();
                }
            })
            .catch(function(err) {
                console.warn('[PPO] loadFromGAS penilaian gagal:', err.message);
                if (window.showToast) showToast('Gagal sinkronisasi penilaian: ' + err.message, 'error');
            });

        // ── Jalankan semua paralel ─────────────────────────────
        return Promise.all([pDiklat, pTeam, pData])
            .finally(function() {
                setLoadingState(false);
                render();
            });
    }

    // Helper update status bar auto-load skor tim
    function _updateAutoLoadStatus(msg, color) {
        var el = document.getElementById('ppo-autoload-status');
        if (!el) return;
        el.textContent = msg;
        el.style.color = color || '#64748b';
    }

    function setLoadingState(on) {
        state.loading = on;
        var btn = document.getElementById('ppo-btn-refresh');
        if (!btn) return;
        btn.disabled    = on;
        btn.textContent = on ? 'Memuat...' : '↻ Refresh Data';
    }

    // ── SAVE KE GAS ──
    function saveToGAS(personPid, rec) {
        var found = findPersonByPid(personPid);
        if (!found) return Promise.reject(new Error('Pegawai tidak ditemukan: ' + personPid));

        var payload = {
            bulan:       state.month,
            tahun:       getCurrentYearString(),
            gid:         found.group.id,
            penilai:     found.group.evaluator,
            namaPegawai: found.person.name,
            unit:        found.person.unit,
            criteria:    rec.criteria || {},
            diklat:      rec.diklat || 0,
            skorTim:     rec.teamScore || 0,
            updatedBy:   state.currentUser ? (state.currentUser.name || 'Admin') : 'Admin',
            catatan:     ''
        };

        if (window.PPO_GAS_CONFIG && window.PPO_GAS_CONFIG.savePenilaian) {
            return window.PPO_GAS_CONFIG.savePenilaian(payload);
        }

        var gasUrl = getGasUrl();
        if (!gasUrl) return Promise.resolve({ status: 'skipped' });

        return new Promise(function(resolve, reject) {
            var body   = Object.assign({ action: 'savePenilaian' }, payload);
            body.criteria = JSON.stringify(body.criteria);
            var cb     = '__ppoSave_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
            var done   = false;
            var script = document.createElement('script');
            var timer  = setTimeout(function() {
                if (done) return;
                cleanup();
                reject(new Error('Timeout simpan'));
            }, 20000);
            function cleanup() {
                done = true; clearTimeout(timer);
                try { delete window[cb]; } catch(e) {}
                if (script.parentNode) script.parentNode.removeChild(script);
            }
            window[cb] = function(data) { cleanup(); resolve(data); };
            script.onerror = function() { if (done) return; cleanup(); reject(new Error('Network error')); };
            var encoded = encodeURIComponent(JSON.stringify(body));
            script.src  = gasUrl + '?jsonBody=' + encoded + '&callback=' + cb;
            document.head.appendChild(script);
        });
    }

    // ── DELETE DARI GAS ──
    function deleteFromGAS(personPid) {
        var found = findPersonByPid(personPid);
        if (!found) return Promise.reject(new Error('Pegawai tidak ditemukan: ' + personPid));

        var payload = {
            bulan:       state.month,
            gid:         found.group.id,
            namaPegawai: found.person.name,
            deletedBy:   state.currentUser ? (state.currentUser.name || 'Admin') : 'Admin'
        };

        if (window.PPO_GAS_CONFIG && window.PPO_GAS_CONFIG.deletePenilaian) {
            return window.PPO_GAS_CONFIG.deletePenilaian(payload);
        }

        var gasUrl = getGasUrl();
        if (!gasUrl) return Promise.resolve({ status: 'skipped' });

        return new Promise(function(resolve, reject) {
            var body   = Object.assign({ action: 'deletePenilaian' }, payload);
            var cb     = '__ppoDel_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
            var done   = false;
            var script = document.createElement('script');
            var timer  = setTimeout(function() {
                if (done) return;
                cleanup();
                reject(new Error('Timeout hapus'));
            }, 20000);
            function cleanup() {
                done = true; clearTimeout(timer);
                try { delete window[cb]; } catch(e) {}
                if (script.parentNode) script.parentNode.removeChild(script);
            }
            window[cb] = function(data) { cleanup(); resolve(data); };
            script.onerror = function() { if (done) return; cleanup(); reject(new Error('Network error')); };
            var encoded = encodeURIComponent(JSON.stringify(body));
            script.src  = gasUrl + '?jsonBody=' + encoded + '&callback=' + cb;
            document.head.appendChild(script);
        });
    }

    // ── HELPERS ──
    function slug(s) {
        return String(s || '').toLowerCase().trim()
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }
    function pid(gid, name) { return gid + '::' + slug(name); }
    function monthLabel(m) { return MONTH_LABELS[String(m||'').trim().toUpperCase()] || m || '—'; }
    function esc(s) {
        return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }
    function escJs(s) { return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }

    // ── AUTH ──
    function getUser() {
        var u = null;
        if (window.AUTH && typeof AUTH.getUser === 'function') u = AUTH.getUser();
        if (!u) { try { u = JSON.parse(localStorage.getItem('user') || 'null'); } catch(e) {} }
        if (!u) return null;
        u._role = (window.AUTH && typeof AUTH.normalizeRole === 'function')
            ? AUTH.normalizeRole(u.role) || ''
            : String(u.role || '').toLowerCase().trim();
        return u;
    }

    function isAdmin()   { var u = state.currentUser; return !!(u && u._role === 'superadmin'); }
    function isProgram() { var u = state.currentUser; return !!(u && u._role === 'program'); }

    function getAllowedGids() {
        var u = state.currentUser;
        if (!u) return [];
        var role = u._role;
        if (role === 'superadmin' || role === 'program') return null;
        if (ROLE_TO_GID[role]) return [ROLE_TO_GID[role]];
        var derived = deriveGidFromUser(u);
        if (derived) return [derived];
        return [];
    }

    function deriveGidFromUser(u) {
        if (!u || !u.name) return null;
        var uNameLower = u.name.toLowerCase().trim();
        var found = GROUPS.find(function(g) { return g.evaluator.toLowerCase() === uNameLower; });
        if (found) return found.id;
        var uNameNoGelar = uNameLower.split(',')[0].trim();
        found = GROUPS.find(function(g) { return g.evaluator.toLowerCase().split(',')[0].trim() === uNameNoGelar; });
        if (found) return found.id;
        var uWords = uNameNoGelar.split(/\s+/).filter(function(w){ return w.length >= 3; });
        if (uWords.length > 0) {
            found = GROUPS.find(function(g) {
                var evalLower = g.evaluator.toLowerCase();
                return uWords.every(function(w){ return evalLower.indexOf(w) !== -1; });
            });
            if (found) return found.id;
        }
        var firstWord = uNameNoGelar.split(' ')[0];
        if (firstWord && firstWord.length >= 4) {
            found = GROUPS.find(function(g) { return g.evaluator.toLowerCase().indexOf(firstWord) !== -1; });
            if (found) return found.id;
        }
        return null;
    }

    function canEditGroup(gid) {
        if (isAdmin() || isProgram()) return true;
        var allowedGids = getAllowedGids();
        if (allowedGids === null) return true;
        return allowedGids.indexOf(gid) !== -1;
    }

    // ── KALKULASI ──
    function getTeamScore(unit) {
        var s = state.teamScores[unit];
        if (!s) return null;
        if (s.total !== undefined && !isNaN(parseFloat(s.total))) return +parseFloat(s.total).toFixed(2);
        var keys = ['bbm','kendaraan','ruang','kearsipan','spj','monev'];
        var total = 0, hasAny = false;
        keys.forEach(function(k) { var v = parseFloat(s[k]); if (!isNaN(v)) { total += v; hasAny = true; } });
        return hasAny ? +total.toFixed(2) : null;
    }

    function calcAkhlak(criteria) {
        var vals = AKHLAK.map(function(a) {
            var v = parseFloat(criteria && criteria[a.key]);
            return isNaN(v) ? 7 : Math.min(10, Math.max(7, v));
        });
        var avg = vals.reduce(function(a,b){return a+b;},0) / AKHLAK.length;
        return { avg: +avg.toFixed(2), weighted: +(avg * 3).toFixed(2) };
    }

    function calcFinal(teamScore, akhlakAvg, diklat) {
        var t = parseFloat(teamScore) || 0;
        var a = parseFloat(akhlakAvg) || 7;
        var d = parseFloat(diklat)    || 0;
        return {
            teamW:   +(t * 0.60).toFixed(2),
            akhlakW: +(a * 3).toFixed(2),
            diklatW: +(d * 1).toFixed(2),
            total:   +(t * 0.60 + a * 3 + d).toFixed(2)
        };
    }

    function statusOf(total) {
        if (total >= 90) return { label:'Amat Baik',       cls:'badge-assessed', boxCls:'great' };
        if (total >= 80) return { label:'Baik',            cls:'badge-good',     boxCls:'good'  };
        if (total >= 70) return { label:'Cukup Baik',      cls:'badge-mid',      boxCls:'fair'  };
        return                  { label:'Perlu Pembinaan', cls:'badge-bad',      boxCls:'low'   };
    }

    function snap(personPid, personName, unit) {
        var rec      = getRec(personPid);
        var ts       = getTeamScore(unit);
        var criteria = rec && rec.criteria ? rec.criteria : {};
        var akhlak   = calcAkhlak(criteria);
        var diklatVal = getDiklatValue(personName);
        var diklat   = diklatVal !== null ? diklatVal : (rec && rec.diklat != null ? rec.diklat : 0);
        var final    = calcFinal(ts, akhlak.avg, diklat);
        return {
            rec: rec, ts: ts, akhlak: akhlak, diklat: diklat, diklatLoaded: state.diklatLoaded, final: final,
            status: rec ? statusOf(final.total) : { label:'Belum Dinilai', cls:'badge-pending', boxCls:'draft' }
        };
    }

    // ── VISIBLE GROUPS ──
    function visibleGroups() {
        var allowedGids = getAllowedGids();
        if (allowedGids === null) return GROUPS;
        if (allowedGids.length === 0) return [];
        return GROUPS.filter(function(g) { return allowedGids.indexOf(g.id) !== -1; });
    }

    function allVisiblePeople() {
        var rows = [];
        visibleGroups().forEach(function(g) {
            g.people.forEach(function(p) {
                rows.push({ gid:g.id, evaluator:g.evaluator, unitLabel:g.unitLabel, name:p.name, unit:p.unit, pid:pid(g.id,p.name) });
            });
        });
        return rows;
    }

    function filteredPeople() {
        var q  = (state.search  || '').toLowerCase();
        var gf = state.groupFilter  || '';
        var sf = state.statusFilter || '';
        return allVisiblePeople().filter(function(p) {
            if (q  && !p.name.toLowerCase().includes(q) && !p.unit.toLowerCase().includes(q)) return false;
            if (gf && p.gid !== gf) return false;
            var rec = getRec(p.pid);
            if (sf === 'done'  && !rec) return false;
            if (sf === 'draft' &&  rec) return false;
            return true;
        });
    }

    var ICONS = {
        edit:  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
        trash: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>',
        eye:   '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
    };

    // ── RENDER STATS ──
    function renderStats() {
        var people = allVisiblePeople();
        var done = 0, totals = [], akhlaks = [];
        people.forEach(function(p) {
            var s = snap(p.pid, p.name, p.unit);
            if (s.rec) { done++; if (!isNaN(s.final.total)) totals.push(s.final.total); akhlaks.push(s.akhlak.avg); }
        });
        var avgT = totals.length  ? +(totals.reduce(function(a,b){return a+b;},0) /totals.length).toFixed(1)  : 0;
        var avgA = akhlaks.length ? +(akhlaks.reduce(function(a,b){return a+b;},0)/akhlaks.length).toFixed(1) : 0;
        var pct  = people.length ? Math.round(done / people.length * 100) : 0;
        var el   = document.getElementById('ppo-stat-grid');
        if (!el) return;
        el.innerHTML =
            '<div class="stat-card" style="border-left:4px solid #1F4E79;">' +
                '<div class="stat-label">Total Pegawai</div>' +
                '<div class="stat-value">' + people.length + '</div>' +
                '<div class="stat-footer">Dalam tanggung jawab Anda</div>' +
            '</div>' +
            '<div class="stat-card" style="border-left:4px solid #10b981;">' +
                '<div class="stat-label">Sudah Dinilai</div>' +
                '<div class="stat-value">' + done + '</div>' +
                '<div class="stat-footer">' + pct + '% selesai' +
                    '<div style="height:3px;background:#e5e7eb;border-radius:2px;margin-top:6px;overflow:hidden;">' +
                        '<div style="height:100%;background:linear-gradient(90deg,#1d4ed8,#0ea5e9);border-radius:2px;width:' + pct + '%"></div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="stat-card" style="border-left:4px solid #f59e0b;">' +
                '<div class="stat-label">Rata-rata Total</div>' +
                '<div class="stat-value">' + (avgT || '—') + '</div>' +
                '<div class="stat-footer">Nilai akhir /100</div>' +
            '</div>' +
            '<div class="stat-card" style="border-left:4px solid #8b5cf6;">' +
                '<div class="stat-label">Rata-rata BerAKHLAK</div>' +
                '<div class="stat-value">' + (avgA || '—') + '</div>' +
                '<div class="stat-footer">Skala 7–10</div>' +
            '</div>';
    }

    // ── RENDER TABLE ──
    function renderTable() {
        var people  = filteredPeople();
        var tbody   = document.getElementById('ppo-tbody');
        var colEval = document.getElementById('ppo-col-evaluator');
        if (!tbody) return;
        var showEvalCol = isAdmin() || isProgram();
        if (colEval) colEval.style.display = showEvalCol ? '' : 'none';
        var html = '', lastEval = '';
        people.forEach(function(p, i) {
            var s       = snap(p.pid, p.name, p.unit);
            var ts      = s.ts !== null ? s.ts.toFixed(1) : '—';
            var ak      = s.rec ? s.akhlak.avg.toFixed(1) : '—';
            var dkDisplay;
            if (!s.diklatLoaded) {
                dkDisplay = '<span style="color:#94a3b8;font-size:11px;">…</span>';
            } else {
                dkDisplay = s.diklat + ' ' + (s.diklat === 10
                    ? '<span style="font-size:10px;background:#d1fae5;color:#065f46;padding:1px 5px;border-radius:10px;">✓</span>'
                    : '<span style="font-size:10px;background:#fee2e2;color:#991b1b;padding:1px 5px;border-radius:10px;">✗</span>');
            }
            var tot     = s.rec ? s.final.total.toFixed(1) : '—';
            var canEdit = canEditGroup(p.gid);
            if (showEvalCol && p.evaluator !== lastEval) {
                html += '<tr><td colspan="10" style="padding:8px 14px;font-size:11px;font-weight:700;' +
                    'color:#1e40af;background:#eff6ff;border-bottom:1px solid #bfdbfe;' +
                    'text-transform:uppercase;letter-spacing:.06em;">' +
                    esc(p.evaluator) + ' — ' + esc(p.unitLabel) + '</td></tr>';
                lastEval = p.evaluator;
            }
            var actionBtns = '';
            if (canEdit) {
                actionBtns += '<button onclick="ppoOpenModal(\'' + escJs(p.pid) + '\')" ' +
                    'class="btn-icon btn-icon-edit" title="' + (s.rec ? 'Edit Penilaian' : 'Beri Penilaian') + '">' +
                    ICONS.edit + '</button>';
            }
            if (s.rec) {
                actionBtns += '<button onclick="ppoOpenModalView(\'' + escJs(p.pid) + '\')" ' +
                    'class="btn-icon btn-icon-view" title="Lihat Detail">' + ICONS.eye + '</button>';
            }
            html +=
                '<tr>' +
                '<td style="color:#94a3b8;font-size:12px;">' + (i+1) + '</td>' +
                '<td><div style="font-weight:600;font-size:13px;">' + esc(p.name) + '</div></td>' +
                '<td><span class="badge badge-pending" style="font-size:11px;">' + esc(p.unit) + '</span></td>' +
                (showEvalCol ? '<td style="font-size:11px;color:#94a3b8;">' + esc(p.evaluator.split(',')[0]) + '</td>' : '') +
                '<td style="text-align:center;font-family:monospace;">' + ts  + '</td>' +
                '<td style="text-align:center;font-family:monospace;">' + ak  + '</td>' +
                '<td style="text-align:center;font-family:monospace;">' + dkDisplay + '</td>' +
                '<td style="text-align:center;font-weight:700;font-family:monospace;">' + tot + '</td>' +
                '<td style="text-align:center;"><span class="badge ' + s.status.cls + '">' + s.status.label + '</span></td>' +
                '<td><div class="action-buttons"><div class="btn-icon-group">' + actionBtns + '</div></div></td>' +
                '</tr>';
        });
        if (!html) {
            html = '<tr><td colspan="10" style="text-align:center;padding:32px;color:#94a3b8;">Tidak ada data yang sesuai filter.</td></tr>';
        }
        tbody.innerHTML = html;
    }

    // ── RENDER REKAP ──
    function renderRekap() {
        var tbody = document.getElementById('ppo-rekap-tbody');
        if (!tbody) return;
        var html = '';
        UNITS.forEach(function(unit) {
            var people = allVisiblePeople().filter(function(p){ return p.unit === unit; });
            if (!people.length) return;
            var done = 0, tots = [], akhs = [], dks = [];
            people.forEach(function(p) {
                var s = snap(p.pid, p.name, p.unit);
                if (s.rec) { done++; if (!isNaN(s.final.total)) tots.push(s.final.total); akhs.push(s.akhlak.avg); dks.push(s.diklat); }
            });
            var avgT = tots.length ? +(tots.reduce(function(a,b){return a+b;},0)/tots.length).toFixed(1) : '—';
            var avgA = akhs.length ? +(akhs.reduce(function(a,b){return a+b;},0)/akhs.length).toFixed(1) : '—';
            var avgD = dks.length  ? +(dks.reduce(function(a,b){return a+b;},0)/dks.length).toFixed(1)  : '—';
            var pct  = Math.round(done / people.length * 100);
            html += '<tr><td style="font-weight:600;">' + esc(unit) + '</td>' +
                '<td style="text-align:center;">' + people.length + '</td>' +
                '<td style="text-align:center;">' + done + '</td>' +
                '<td style="text-align:center;">' +
                    '<div style="display:flex;align-items:center;gap:8px;justify-content:center;">' +
                        '<div style="flex:1;max-width:80px;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;">' +
                            '<div style="height:100%;background:#1d4ed8;border-radius:2px;width:' + pct + '%"></div>' +
                        '</div><span style="font-size:12px;">' + pct + '%</span></div>' +
                '</td>' +
                '<td style="text-align:center;font-weight:700;">' + avgT + '</td>' +
                '<td style="text-align:center;">' + avgA + '</td>' +
                '<td style="text-align:center;">' + avgD + '</td></tr>';
        });
        if (!html) html = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#94a3b8;">Belum ada data.</td></tr>';
        tbody.innerHTML = html;
    }

    // ── RENDER RANKING ──
    function renderRanking() {
        var el = document.getElementById('ppo-ranking-list');
        if (!el) return;
        var ranked = [];
        allVisiblePeople().forEach(function(p) {
            var s = snap(p.pid, p.name, p.unit);
            if (s.rec && !isNaN(s.final.total)) ranked.push({ name:p.name, unit:p.unit, total:s.final.total, status:s.status });
        });
        ranked.sort(function(a,b){ return b.total - a.total; });
        if (!ranked.length) { el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:24px;">Belum ada data.</p>'; return; }
        el.innerHTML = ranked.slice(0, 25).map(function(r, i) {
            var nc = i === 0 ? 'background:#fef3c7;color:#92400e;' : i === 1 ? 'background:#f1f5f9;color:#475569;' : i === 2 ? 'background:#fef3c7;color:#78350f;' : 'background:#f9fafb;color:#9ca3af;';
            return '<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:white;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:6px;">' +
                '<div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;' + nc + '">' + (i+1) + '</div>' +
                '<div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(r.name) + '</div>' +
                '<div style="font-size:11px;color:#94a3b8;">' + esc(r.unit) + '</div></div>' +
                '<span class="badge ' + r.status.cls + '">' + r.status.label + '</span>' +
                '<div style="font-size:18px;font-weight:700;font-family:monospace;min-width:44px;text-align:right;">' + r.total.toFixed(1) + '</div></div>';
        }).join('');
    }

    function render() {
        renderStats();
        renderTable();
        var rp = document.getElementById('ppo-panel-rekap');   if (rp  && rp.style.display  !== 'none') renderRekap();
        var rnk = document.getElementById('ppo-panel-ranking'); if (rnk && rnk.style.display !== 'none') renderRanking();
    }

    // ══════════════════════════════════════════════════════════
    // MODAL PENILAIAN
    // ══════════════════════════════════════════════════════════
    var _activePid     = null;
    var _modalReadOnly = false;

    var BOX_COLORS = {
        great: { bg:'#ecfdf5', border:'#6ee7b7', text:'#065f46' },
        good:  { bg:'#eff6ff', border:'#bfdbfe', text:'#1e40af' },
        fair:  { bg:'#fffbeb', border:'#fcd34d', text:'#92400e' },
        low:   { bg:'#fef2f2', border:'#fca5a5', text:'#991b1b' },
        draft: { bg:'#f9fafb', border:'#e5e7eb', text:'#6b7280' }
    };

    function openModalView(personPid) { _modalReadOnly = true; openModal(personPid, true); }

    function openModal(personPid, readOnly) {
        var person = null, group = null;
        GROUPS.some(function(g) {
            var p = g.people.find(function(pp){ return pid(g.id, pp.name) === personPid; });
            if (p) { person = p; group = g; return true; }
        });
        if (!person) { if (window.showToast) showToast('Pegawai tidak ditemukan.', 'error'); return; }
        var isReadOnly = readOnly || false;
        if (!isReadOnly && !canEditGroup(group.id)) { if (window.showToast) showToast('Anda tidak memiliki akses untuk menilai pegawai ini.', 'error'); return; }
        _activePid     = personPid;
        _modalReadOnly = isReadOnly;

        var rec      = getRec(personPid);
        var criteria = rec && rec.criteria ? rec.criteria : {};
        var diklatVal = getDiklatValue(person.name);
        var diklat    = diklatVal !== null ? diklatVal : (rec && rec.diklat != null ? rec.diklat : 0);
        var ts        = getTeamScore(person.unit);
        var akhlak    = calcAkhlak(criteria);
        var final     = calcFinal(ts, akhlak.avg, diklat);
        var sts       = rec ? statusOf(final.total) : { label:'Belum Dinilai', boxCls:'draft' };
        var bc        = BOX_COLORS[sts.boxCls] || BOX_COLORS.draft;

        var diklatSource = diklatVal !== null
            ? (diklatVal === 10
                ? '<span style="color:#059669;font-size:11px;font-weight:600;">✓ Ada upload diklat → nilai 10</span>'
                : '<span style="color:#ef4444;font-size:11px;font-weight:600;">✗ Belum ada upload diklat → nilai 0</span>')
            : '<span style="color:#94a3b8;font-size:11px;">Memuat data diklat…</span>';

        var akhlakFields = AKHLAK.map(function(a) {
            var v = parseFloat(criteria[a.key]) || 7;
            v = Math.min(10, Math.max(7, v));
            var selectOrText = isReadOnly
                ? '<div style="font-size:14px;font-weight:700;color:#1e293b;padding:6px 8px;background:#f1f5f9;border-radius:8px;min-width:120px;text-align:center;">' + v + ' — ' + {7:'Kurang',8:'Cukup Baik',9:'Baik',10:'Amat Baik'}[v] + '</div>'
                : '<select data-key="' + a.key + '" onchange="ppoUpdatePreview()" style="padding:6px 8px;border:1px solid #e5e7eb;border-radius:8px;font-family:inherit;font-size:13px;font-weight:600;min-width:120px;background:#f8fafc;cursor:pointer;">' +
                  [7,8,9,10].map(function(opt) { return '<option value="' + opt + '"' + (v==opt?' selected':'') + '>' + opt + ' — ' + {7:'Kurang',8:'Cukup Baik',9:'Baik',10:'Amat Baik'}[opt] + '</option>'; }).join('') + '</select>';
            return '<div class="ppo-akhlak-item"><div class="ppo-akhlak-info"><div class="ppo-akhlak-name">' + esc(a.label) + '</div><div class="ppo-akhlak-desc">' + esc(a.desc) + '</div></div><div class="ppo-akhlak-sel">' + selectOrText + '</div></div>';
        }).join('');

        var tsRaw    = state.teamScores[person.unit] || null;
        var KOMP_DEF = [
            { label:'BBM',         key:'bbm',       maks:5  },
            { label:'Kendaraan',   key:'kendaraan', maks:10 },
            { label:'Ruang Rapat', key:'ruang',     maks:5  },
            { label:'Kearsipan',   key:'kearsipan', maks:5  },
            { label:'SPJ',         key:'spj',       maks:35 },
            { label:'Monev',       key:'monev',     maks:40 }
        ];
        var tsDetail = tsRaw ? KOMP_DEF.map(function(c) {
            var v = parseFloat(tsRaw[c.key]) || 0;
            return '<div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;padding:2px 0;gap:8px;">' +
                '<span style="color:#64748b;">' + c.label + ' <span style="opacity:.5">/' + c.maks + '</span></span>' +
                '<span style="font-family:monospace;font-weight:700;color:#1e293b;">' + v.toFixed(1) + '</span></div>';
        }).join('') : '';

        // [v3.3] Tombol ambil skor tim tetap ada di modal untuk refresh manual
        var fetchBtnHtml = !isReadOnly ? (
            '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">' +
                '<button id="ppo-btn-fetch-direct" onclick="ppoFetchTeamScoreDirect(\'' + escJs(person.unit) + '\')" ' +
                    'style="flex:1;padding:7px 10px;border-radius:8px;border:1px solid #a7f3d0;' +
                    'background:#d1fae5;color:#065f46;font-size:12px;font-weight:600;cursor:pointer;' +
                    'font-family:inherit;display:flex;align-items:center;justify-content:center;gap:5px;">' +
                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
                    '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>' +
                    'Refresh Skor Tim' +
                '</button>' +
                '<button onclick="ppoShowTeamScoreInput(\'' + escJs(person.unit) + '\')" ' +
                    'style="flex:1;padding:7px 10px;border-radius:8px;border:1px solid #e5e7eb;' +
                    'background:white;color:#374151;font-size:12px;font-weight:600;cursor:pointer;' +
                    'font-family:inherit;display:flex;align-items:center;justify-content:center;gap:5px;">' +
                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                    '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>' +
                    '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
                    'Input Manual' +
                '</button>' +
            '</div>' +
            '<div id="ppo-ts-fetch-status" style="font-size:11px;color:#94a3b8;margin-top:5px;">' +
                (tsRaw
                    ? '✓ Skor tim sudah dimuat otomatis. Klik "Refresh Skor Tim" untuk memperbarui.'
                    : 'Skor tim belum tersedia untuk unit ini. Coba "Refresh Skor Tim" atau "Input Manual".')
            + '</div>'
        ) : '';

        var tsSectionHtml;
        if (!isReadOnly) {
            tsSectionHtml =
                (ts !== null
                    ? '<div style="display:flex;align-items:baseline;gap:10px;">' +
                      '<div class="ppo-score-big" id="ppo-ts-display">' + ts.toFixed(1) + '</div>' +
                      '<div style="font-size:11px;color:#94a3b8;">× 0.60 = <strong style="color:#1e293b;">' + (ts * 0.60).toFixed(1) + '</strong></div></div>' +
                      (tsDetail ? '<div style="margin-top:8px;padding:8px;background:#f1f5f9;border-radius:6px;" id="ppo-ts-detail">' + tsDetail + '</div>' : '<div id="ppo-ts-detail"></div>')
                    : '<div class="ppo-score-big" id="ppo-ts-display" style="color:#f59e0b;">—</div>' +
                      '<div id="ppo-ts-detail"></div>') +
                fetchBtnHtml +
                '<div id="ppo-ts-input-panel" style="display:none;margin-top:10px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:10px;">' +
                    '<div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Input Skor Tim per Komponen (/100)</div>' +
                    KOMP_DEF.map(function(c) {
                        var existing = tsRaw ? (parseFloat(tsRaw[c.key]) || 0) : 0;
                        return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
                            '<label style="font-size:12px;color:#374151;width:100px;flex-shrink:0;">' + c.label + ' <span style="color:#94a3b8;">/' + c.maks + '</span></label>' +
                            '<input type="number" id="ppo-ts-' + c.key + '" min="0" max="' + c.maks + '" step="0.1" value="' + existing.toFixed(1) + '" oninput="ppoUpdateTeamScoreTotal()" ' +
                            'style="flex:1;padding:5px 8px;border:1px solid #e5e7eb;border-radius:6px;font-family:monospace;font-size:13px;font-weight:600;text-align:right;"></div>';
                    }).join('') +
                    '<div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid #e5e7eb;padding-top:8px;margin-top:4px;">' +
                        '<div style="font-size:12px;color:#64748b;">Total: <strong id="ppo-ts-manual-total" style="font-family:monospace;color:#1e293b;">' + (ts !== null ? ts.toFixed(1) : '0.0') + '</strong>/100</div>' +
                        '<button onclick="ppoApplyTeamScore(\'' + escJs(person.unit) + '\')" style="padding:6px 14px;border-radius:7px;border:none;background:#1d4ed8;color:white;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">Terapkan</button>' +
                    '</div>' +
                '</div>';
        } else {
            tsSectionHtml = ts !== null
                ? '<div class="ppo-score-big">' + ts.toFixed(1) + '</div>' +
                  '<div class="ppo-score-detail">Bobot × 0.60 = <strong>' + (ts * 0.60).toFixed(1) + '</strong></div>' +
                  (tsDetail ? '<div style="margin-top:8px;padding:8px;background:#f1f5f9;border-radius:6px;">' + tsDetail + '</div>' : '')
                : '<div class="ppo-score-big" style="color:#f59e0b;">—</div>' +
                  '<div class="ppo-score-detail" style="color:#f59e0b;">Data skor tim tidak tersedia.</div>';
        }

        var diklatPanel =
            '<div style="padding:10px 12px;background:' + (diklat === 10 ? '#ecfdf5' : '#fef2f2') + ';' +
            'border-radius:8px;border:1px solid ' + (diklat === 10 ? '#6ee7b7' : '#fca5a5') + ';margin-top:4px;">' +
                '<div style="font-size:22px;font-weight:700;font-family:monospace;color:' + (diklat === 10 ? '#065f46' : '#991b1b') + ';">' + diklat + '</div>' +
                '<div style="margin-top:4px;">' + diklatSource + '</div>' +
                '<div style="font-size:11px;color:#94a3b8;margin-top:4px;">Nilai diambil otomatis dari data Diklat. Tidak dapat diubah manual.</div>' +
            '</div>';

        var presetRow = isReadOnly ? '' :
            '<div class="ppo-preset-row"><span style="font-size:11px;color:#94a3b8;align-self:center;">Isi semua:</span>' +
            [7,8,9,10].map(function(v) { return '<button class="ppo-preset-btn" onclick="ppoApplyPreset(' + v + ')">' + v + '</button>'; }).join('') + '</div>';

        var box = document.getElementById('ppo-modal-box');
        if (!box) return;
        box.innerHTML =
            '<div class="modal-header"><div>' +
                '<h2 class="modal-title">' + (isReadOnly ? 'Detail Penilaian — ' : 'Penilaian — ') + esc(person.name) + '</h2>' +
                '<p style="font-size:13px;color:#64748b;margin-top:3px;">' + esc(group.evaluator) + ' · ' + esc(person.unit) + ' · ' + monthLabel(state.month) +
                (isReadOnly ? ' <span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">Mode Lihat</span>' : '') +
                '</p></div>' +
                '<button class="ppo-modal-close" onclick="ppoCloseModal()">×</button>' +
            '</div>' +
            '<div class="modal-content"><div class="ppo-modal-grid">' +
                '<div>' +
                    '<div class="ppo-section-label">Komponen Nilai</div>' +
                    '<div class="ppo-score-box"><div class="ppo-score-box-label">Skor Tim — 60% (maks 60 poin)</div>' + tsSectionHtml + '</div>' +
                    '<div class="ppo-score-box"><div class="ppo-score-box-label">BerAKHLAK — 30% (maks 30 poin)</div>' +
                        '<div class="ppo-score-big" id="ppo-prev-akhlak-w">' + akhlak.weighted.toFixed(2) + '</div>' +
                        '<div class="ppo-score-detail">Rata-rata <span id="ppo-prev-akhlak-avg">' + akhlak.avg.toFixed(2) + '</span> × 3</div>' +
                    '</div>' +
                    '<div class="ppo-score-box"><div class="ppo-score-box-label">Diklat — 10% (maks 10 poin) 🔒 Otomatis</div>' +
                        diklatPanel +
                    '</div>' +
                    '<div id="ppo-total-box" style="border-radius:14px;padding:16px;margin-top:12px;text-align:center;background:' + bc.bg + ';border:2px solid ' + bc.border + ';">' +
                        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:' + bc.text + ';margin-bottom:6px;">Nilai Akhir</div>' +
                        '<div id="ppo-prev-total" style="font-size:38px;font-weight:700;color:' + bc.text + ';font-family:monospace;line-height:1;">' + (rec ? final.total.toFixed(1) : '—') + '</div>' +
                        '<div id="ppo-prev-status" style="font-size:13px;font-weight:600;margin-top:6px;color:' + bc.text + ';">' + sts.label + '</div>' +
                    '</div>' +
                    '<div style="font-size:11px;color:#94a3b8;background:#f9fafb;border-radius:8px;padding:8px 12px;margin-top:10px;font-family:monospace;line-height:1.8;">= (Tim×0.60) + (Rata×3) + Diklat</div>' +
                    (rec ? '<div style="font-size:11px;color:#94a3b8;margin-top:8px;">Terakhir: ' + new Date(rec.updatedAt).toLocaleString('id-ID') + ' oleh ' + esc(rec.updatedBy || 'Admin') + '</div>' : '') +
                '</div>' +
                '<div>' +
                    '<div class="ppo-section-label">Penilaian BerAKHLAK (7 Kriteria)</div>' +
                    presetRow +
                    '<div class="ppo-akhlak-list">' + akhlakFields + '</div>' +
                '</div>' +
            '</div></div>' +
            '<div class="modal-footer">' +
                (!isReadOnly && rec ? '<button class="btn btn-danger" onclick="ppoResetModal()">Reset Penilaian</button>' : '') +
                '<button class="btn" onclick="ppoCloseModal()">' + (isReadOnly ? 'Tutup' : 'Batal') + '</button>' +
                (!isReadOnly ? '<button class="btn btn-primary" onclick="ppoSaveModal()" id="ppo-save-btn">Simpan Penilaian</button>' : '') +
            '</div>';

        document.getElementById('ppo-modal-overlay').classList.add('open');
        if (!isReadOnly) updatePreview();
    }

    function updatePreview() {
        if (!_activePid || _modalReadOnly) return;
        var personName = '', unit = '';
        GROUPS.some(function(g) {
            var p = g.people.find(function(pp){ return pid(g.id,pp.name) === _activePid; });
            if (p) { unit = p.unit; personName = p.name; return true; }
        });
        var criteria = {};
        document.querySelectorAll('#ppo-modal-box [data-key]').forEach(function(sel) { criteria[sel.dataset.key] = parseFloat(sel.value) || 7; });
        var diklatVal = getDiklatValue(personName);
        var diklat    = diklatVal !== null ? diklatVal : 0;
        var ts        = getTeamScore(unit);
        var akhlak    = calcAkhlak(criteria);
        var final     = calcFinal(ts, akhlak.avg, diklat);
        var sts       = statusOf(final.total);
        var bc        = BOX_COLORS[sts.boxCls] || BOX_COLORS.draft;
        function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
        setText('ppo-prev-akhlak-w',   akhlak.weighted.toFixed(2));
        setText('ppo-prev-akhlak-avg', akhlak.avg.toFixed(2));
        setText('ppo-prev-total',      final.total.toFixed(1));
        setText('ppo-prev-status',     sts.label);
        var totalBox = document.getElementById('ppo-total-box');
        if (totalBox) {
            totalBox.style.background  = bc.bg;
            totalBox.style.borderColor = bc.border;
            totalBox.querySelectorAll('div').forEach(function(d) { d.style.color = bc.text; });
        }
    }

    function applyPreset(val) {
        document.querySelectorAll('#ppo-modal-box [data-key]').forEach(function(sel) { sel.value = String(val); });
        updatePreview();
    }

    // ── FETCH SKOR TIM (manual refresh dari modal) ──
    function fetchTeamScoreDirect(unit) {
        var btn      = document.getElementById('ppo-btn-fetch-direct');
        var statusEl = document.getElementById('ppo-ts-fetch-status');
        if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Mengambil...'; }
        if (statusEl) statusEl.textContent = 'Mengambil skor dari database...';

        function restoreBtn() {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
                    '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Refresh Skor Tim';
            }
        }

        if (!window.PPO_GAS_CONFIG || !window.PPO_GAS_CONFIG.fetchAllTeamScores) {
            // Fallback: pakai GAS getTeamScores
            gasJsonp({ action: 'getTeamScores', bulan: state.month, tahun: getCurrentYearString() })
                .then(function(teamRes) {
                    if (teamRes && teamRes.status === 'success' && teamRes.scores) {
                        state.teamScores = teamRes.scores;
                        saveTeamCacheMonth(state.month, teamRes.scores);
                        var unitScore = teamRes.scores[unit];
                        if (unitScore) {
                            var total = parseFloat(unitScore.total) || 0;
                            _applyTeamScoreToModal(unit, total, unitScore);
                            if (statusEl) { statusEl.textContent = '✓ Total ' + total.toFixed(1) + '/100'; statusEl.style.color = '#059669'; }
                            if (window.showToast) showToast('Skor tim berhasil diperbarui.', 'success');
                        } else {
                            if (statusEl) { statusEl.textContent = '⚠ Skor unit ' + unit + ' belum tersedia.'; statusEl.style.color = '#d97706'; }
                        }
                        render();
                    }
                })
                .catch(function(err) {
                    if (statusEl) { statusEl.textContent = '✗ Gagal: ' + err.message; statusEl.style.color = '#dc2626'; }
                })
                .finally(restoreBtn);
            return;
        }

        window.PPO_GAS_CONFIG.fetchAllTeamScores(state.month)
            .then(function(allScores) {
                state.teamScores = allScores;
                saveTeamCacheMonth(state.month, allScores);
                var unitScore = allScores[unit];
                if (unitScore) {
                    var total = parseFloat(unitScore.total) || 0;
                    _applyTeamScoreToModal(unit, total, unitScore);
                    if (statusEl) {
                        var parts = ['BBM:' + (unitScore.bbm||0), 'Kend:' + (unitScore.kendaraan||0),
                            'Ruang:' + (unitScore.ruang||0), 'Arsip:' + (unitScore.kearsipan||0),
                            'SPJ:' + (unitScore.spj||0), 'Monev:' + (unitScore.monev||0)];
                        statusEl.textContent = '✓ Total ' + total.toFixed(1) + '/100 — ' + parts.join(' | ');
                        statusEl.style.color = '#059669';
                    }
                    if (window.showToast) showToast('Skor tim ' + unit.split(' ')[0] + ': ' + total.toFixed(1) + '/100', 'success');
                    render();
                } else {
                    if (statusEl) { statusEl.textContent = '⚠ Skor unit ' + unit + ' belum tersedia.'; statusEl.style.color = '#d97706'; }
                    if (window.showToast) showToast('Skor ' + unit + ' bulan ' + monthLabel(state.month) + ' belum ada.', 'error');
                }
            })
            .catch(function(err) {
                if (statusEl) { statusEl.textContent = '✗ Gagal: ' + err.message; statusEl.style.color = '#dc2626'; }
                if (window.showToast) showToast('Gagal ambil skor: ' + err.message, 'error');
            })
            .finally(restoreBtn);
    }

    function showTeamScoreInput(unit) {
        var panel = document.getElementById('ppo-ts-input-panel');
        if (!panel) return;
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        if (panel.style.display !== 'none') updateTeamScoreTotal();
    }

    function updateTeamScoreTotal() {
        var keys  = ['bbm','kendaraan','ruang','kearsipan','spj','monev'];
        var total = 0;
        keys.forEach(function(k) { var el = document.getElementById('ppo-ts-' + k); if (el) total += parseFloat(el.value) || 0; });
        total = Math.min(100, Math.max(0, total));
        var el = document.getElementById('ppo-ts-manual-total');
        if (el) el.textContent = total.toFixed(1);
    }

    function applyTeamScore(unit) {
        var keys = ['bbm','kendaraan','ruang','kearsipan','spj','monev'];
        var components = {}, total = 0;
        keys.forEach(function(k) {
            var el = document.getElementById('ppo-ts-' + k);
            if (!el) return;
            var v = parseFloat(el.value); if (isNaN(v) || v < 0) { v = 0; el.value = '0'; }
            components[k] = +v.toFixed(2); total += components[k];
        });
        total = +Math.min(100, total).toFixed(2);
        components.total = total;
        state.teamScores[unit] = components;
        saveTeamCacheMonth(state.month, state.teamScores);
        _applyTeamScoreToModal(unit, total, components);
        if (window.showToast) showToast('Skor tim diterapkan: ' + total.toFixed(1) + '/100', 'success');
        render();
    }

    function _applyTeamScoreToModal(unit, total, components) {
        var dispEl = document.getElementById('ppo-ts-display');
        if (dispEl) { dispEl.style.color = ''; dispEl.textContent = total.toFixed(1); }
        var detailEl = document.getElementById('ppo-ts-detail');
        if (detailEl && components) {
            var KOMP_DEF = [{label:'BBM',key:'bbm',maks:5},{label:'Kendaraan',key:'kendaraan',maks:10},{label:'Ruang Rapat',key:'ruang',maks:5},{label:'Kearsipan',key:'kearsipan',maks:5},{label:'SPJ',key:'spj',maks:35},{label:'Monev',key:'monev',maks:40}];
            detailEl.innerHTML = '<div style="margin-top:8px;padding:8px;background:#f1f5f9;border-radius:6px;">' +
                KOMP_DEF.map(function(c) {
                    var v = parseFloat(components[c.key]) || 0;
                    return '<div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;padding:2px 0;gap:8px;"><span style="color:#64748b;">' + c.label + ' <span style="opacity:.5">/' + c.maks + '</span></span><span style="font-family:monospace;font-weight:700;color:#1e293b;">' + v.toFixed(1) + '</span></div>';
                }).join('') + '</div>';
        }
        if (components) {
            ['bbm','kendaraan','ruang','kearsipan','spj','monev'].forEach(function(k) {
                var el = document.getElementById('ppo-ts-' + k);
                if (el && components[k] !== undefined) el.value = parseFloat(components[k]).toFixed(1);
            });
            updateTeamScoreTotal();
        }
        var panel = document.getElementById('ppo-ts-input-panel');
        if (panel) panel.style.display = 'none';
        updatePreview();
    }

    // ── SIMPAN PENILAIAN ──
    function saveModal() {
        if (!_activePid || _modalReadOnly) return;
        var found = findPersonByPid(_activePid);
        if (!found) return;
        var criteria = {};
        document.querySelectorAll('#ppo-modal-box [data-key]').forEach(function(sel) { criteria[sel.dataset.key] = parseFloat(sel.value) || 7; });

        var diklatVal = getDiklatValue(found.person.name);
        var diklat    = diklatVal !== null ? diklatVal : 0;

        var ts      = getTeamScore(found.person.unit);
        var akhlak  = calcAkhlak(criteria);
        var final   = calcFinal(ts, akhlak.avg, diklat);

        var saveBtn = document.getElementById('ppo-save-btn');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Menyimpan...'; }

        var newRec = {
            month: state.month, gid: found.group.id, evaluator: found.group.evaluator,
            name: found.person.name, unit: found.person.unit,
            criteria: criteria, diklat: diklat,
            teamScore: ts !== null ? ts : 0,
            summary: final,
            updatedAt: new Date().toISOString(),
            updatedBy: state.currentUser ? (state.currentUser.name || 'Admin') : 'Admin'
        };

        setRec(_activePid, newRec);
        if (window.showToast) showToast('Penilaian ' + found.person.name.split(',')[0] + ' tersimpan lokal.', 'success');
        var syncPid = _activePid;
        closeModal();
        render();

        saveToGAS(syncPid, newRec).then(function(res) {
            if (!res) return;
            if (res.status === 'success') {
                if (window.showToast) showToast('✓ Tersinkronisasi ke server (GAS).', 'success');
            } else if (res.status === 'skipped') {
                // silent
            } else {
                if (window.showToast) showToast('Tersimpan lokal. Sinkronisasi server gagal: ' + (res.message || 'Error'), 'error');
            }
        }).catch(function(err) {
            if (window.showToast) showToast('Tersimpan lokal. Sinkronisasi gagal: ' + err.message, 'error');
        });
    }

    // ── RESET / HAPUS ──
    function resetModal() {
        if (!_activePid || _modalReadOnly) return;
        var pidToDelete = _activePid;
        function doDelete() {
            delRec(pidToDelete);
            if (window.showToast) showToast('Data penilaian berhasil direset.', 'success');
            closeModal();
            render();
            deleteFromGAS(pidToDelete).then(function(res) {
                if (res && res.status === 'success') { if (window.showToast) showToast('✓ Data dihapus dari server.', 'success'); }
            }).catch(function(err) { if (window.showToast) showToast('Lokal terhapus. Hapus server gagal: ' + err.message, 'error'); });
        }
        if (window.showConfirmModal) {
            showConfirmModal({ icon:'🗑️', title:'Reset Penilaian?', message:'Data penilaian bulan ini akan dihapus permanen.', confirmText:'Ya, Reset', confirmClass:'btn-danger' }, doDelete);
        } else {
            if (!confirm('Reset data penilaian bulan ini?')) return;
            doDelete();
        }
    }

    function closeModal() {
        var overlay = document.getElementById('ppo-modal-overlay');
        var box     = document.getElementById('ppo-modal-box');
        if (overlay) overlay.classList.remove('open');
        if (box)     box.innerHTML = '';
        _activePid = null; _modalReadOnly = false;
    }

    // ── EXPOSE GLOBAL ──
    window.ppoOpenModal             = openModal;
    window.ppoOpenModalView         = openModalView;
    window.ppoCloseModal            = closeModal;
    window.ppoUpdatePreview         = updatePreview;
    window.ppoApplyPreset           = applyPreset;
    window.ppoSaveModal             = saveModal;
    window.ppoResetModal            = resetModal;
    window.ppoLoadFromGAS           = loadFromGAS;
    window.ppoFetchTeamScore        = fetchTeamScoreDirect;
    window.ppoFetchTeamScoreDirect  = fetchTeamScoreDirect;
    window.ppoShowTeamScoreInput    = showTeamScoreInput;
    window.ppoUpdateTeamScoreTotal  = updateTeamScoreTotal;
    window.ppoApplyTeamScore        = applyTeamScore;
    window._ppoLoadTeamCacheMonth   = loadTeamCacheMonth;

    // ── TAB SWITCH ──
    function switchTab(tab, btn) {
        document.querySelectorAll('#section-' + SECTION_ID + ' .ppo-tab-btn').forEach(function(b) { b.classList.remove('active'); });
        if (btn) btn.classList.add('active');
        ['daftar','rekap','ranking'].forEach(function(t) {
            var el = document.getElementById('ppo-panel-' + t);
            if (el) el.style.display = (t === tab) ? 'block' : 'none';
        });
        if (tab === 'rekap')   renderRekap();
        if (tab === 'ranking') renderRanking();
    }
    window.ppoSwitchTab = switchTab;

    // ── INJECT STYLES ──
    var STYLE_ID = 'ppo-section-styles';
    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id  = STYLE_ID;
        style.textContent = [
            '.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;align-items:center;justify-content:center;padding:16px;}',
            '.modal-overlay.open{display:flex;}',
            '.modal{background:white;border-radius:16px;max-height:90vh;overflow-y:auto;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.2);}',
            '.modal-header{display:flex;justify-content:space-between;align-items:flex-start;padding:20px 24px 16px;border-bottom:1px solid #e5e7eb;}',
            '.modal-title{font-size:17px;font-weight:700;color:#0f172a;margin:0;}',
            '.modal-content{padding:20px 24px;}',
            '.modal-footer{display:flex;gap:10px;justify-content:flex-end;padding:16px 24px;border-top:1px solid #e5e7eb;flex-wrap:wrap;}',
            '.btn{padding:9px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;border:1px solid #e5e7eb;background:white;color:#374151;}',
            '.btn:hover{background:#f1f5f9;}',
            '.btn-primary{background:#1d4ed8;color:white;border-color:#1d4ed8;}',
            '.btn-primary:hover{background:#1e40af;}',
            '.btn-danger{background:#ef4444;color:white;border-color:#ef4444;}',
            '.btn-danger:hover{background:#dc2626;}',
            '.ppo-modal-grid{display:grid;grid-template-columns:.85fr 1.15fr;gap:20px;}',
            '.ppo-score-box{background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;margin-bottom:10px;}',
            '.ppo-score-box-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin-bottom:6px;}',
            '.ppo-score-big{font-size:24px;font-weight:700;color:#1e293b;font-family:monospace;}',
            '.ppo-score-detail{font-size:11px;color:#94a3b8;margin-top:3px;}',
            '.ppo-section-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:10px;}',
            '.ppo-preset-row{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;align-items:center;}',
            '.ppo-preset-btn{padding:4px 12px;border-radius:99px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #e5e7eb;background:white;font-family:inherit;color:#374151;}',
            '.ppo-preset-btn:hover{border-color:#1d4ed8;color:#1d4ed8;background:#eff6ff;}',
            '.ppo-akhlak-list{display:flex;flex-direction:column;gap:8px;max-height:420px;overflow-y:auto;padding-right:4px;}',
            '.ppo-akhlak-item{border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;background:white;}',
            '.ppo-akhlak-item:hover{border-color:#bfdbfe;background:#fafcff;}',
            '.ppo-akhlak-info{flex:1;min-width:0;}',
            '.ppo-akhlak-name{font-size:13px;font-weight:700;color:#1e293b;margin-bottom:2px;}',
            '.ppo-akhlak-desc{font-size:11px;color:#64748b;line-height:1.5;}',
            '.ppo-akhlak-sel select{padding:6px 8px;border:1px solid #e5e7eb;border-radius:8px;font-family:inherit;font-size:13px;font-weight:600;min-width:120px;background:#f8fafc;cursor:pointer;}',
            '.ppo-akhlak-sel select:focus{border-color:#1d4ed8;outline:none;box-shadow:0 0 0 2px #dbeafe;}',
            '.ppo-modal-close{width:32px;height:32px;border-radius:8px;border:1px solid #e5e7eb;background:#f1f5f9;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;color:#64748b;line-height:1;}',
            '.ppo-modal-close:hover{background:#e2e8f0;color:#1e293b;}',
            '.ppo-tab-btn{padding:9px 16px;font-size:13px;font-weight:600;color:#64748b;background:none;border:none;cursor:pointer;font-family:inherit;border-bottom:2px solid transparent;margin-bottom:-1px;}',
            '.ppo-tab-btn.active{color:#1d4ed8;border-bottom-color:#1d4ed8;}',
            '.ppo-tab-btn:hover:not(.active){color:#374151;}',
            '.action-buttons{display:flex;gap:4px;}',
            '.btn-icon-group{display:flex;gap:4px;}',
            '.btn-icon{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border-radius:7px;border:none;cursor:pointer;transition:background .15s,transform .1s;}',
            '.btn-icon:active{transform:scale(.93);}',
            '.btn-icon-view{background:#dbeafe;color:#1e40af;}',
            '.btn-icon-view:hover{background:#bfdbfe;}',
            '.btn-icon-edit{background:#fef9c3;color:#a16207;}',
            '.btn-icon-edit:hover{background:#fde68a;}',
            '.badge-assessed{background:#dcfce7;color:#15803d;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap;}',
            '.badge-good{background:#dbeafe;color:#1e40af;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap;}',
            '.badge-mid{background:#fef9c3;color:#a16207;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap;}',
            '.badge-bad{background:#fee2e2;color:#991b1b;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap;}',
            '.badge-pending{background:#f1f5f9;color:#64748b;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap;}',
            '#ppo-btn-refresh:disabled{opacity:.6;cursor:not-allowed;}',
            '@media(max-width:768px){.ppo-modal-grid{grid-template-columns:1fr;}}',
            '@media(max-width:600px){#ppo-stat-grid .stat-card{min-width:calc(50% - 6px);}}'
        ].join('');
        document.head.appendChild(style);
    }

    // ── BUILD SHELL ──
    function buildShell() {
        var section = document.getElementById('section-' + SECTION_ID);
        if (!section) return;
        var u     = state.currentUser;
        var admin = isAdmin();
        var prog  = isProgram();
        var showAllGroups = admin || prog;

        var roleLabel = u && u._role ? (
            window.AUTH && AUTH.ROLE_LABELS ? (AUTH.ROLE_LABELS[u._role] || u._role) : u._role
        ) : '';
        var heroSub = showAllGroups
            ? 'Admin dapat melihat dan menilai seluruh pegawai di semua unit.'
            : 'Anda menilai sebagai <strong>' + esc(roleLabel) + '</strong>' +
              (u && u.name ? ' (' + esc(u.name) + ')' : '') + '.';

        var penilaiFilter = showAllGroups
            ? ('<select id="ppo-group-filter" onchange="(function(){window._ppoState.groupFilter=document.getElementById(\'ppo-group-filter\').value;window._ppoRender();})()" style="padding:7px 28px 7px 10px;border:1px solid #e5e7eb;border-radius:8px;font-family:inherit;font-size:13px;">' +
               '<option value="">Semua penilai</option>' +
               GROUPS.map(function(g) { return '<option value="' + g.id + '">' + esc(g.evaluator) + '</option>'; }).join('') + '</select>')
            : '';

        var adminTabs = showAllGroups
            ? ('<button class="ppo-tab-btn" onclick="ppoSwitchTab(\'rekap\',this)">Rekap per Divisi</button>' +
               '<button class="ppo-tab-btn" onclick="ppoSwitchTab(\'ranking\',this)">Ranking</button>')
            : '';

        function thStyle(align) { return ' style="text-align:' + (align||'left') + ';padding:10px 14px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;background:#f8fafc;border-bottom:1px solid #e5e7eb;"'; }
        function thCell(label, align) { return '<th' + thStyle(align) + '>' + label + '</th>'; }

        section.innerHTML = [
            '<div class="container">',
            '<div class="section-page-header"><h1 class="section-page-title">Penilaian Per Orang</h1><p class="section-page-subtitle">' + heroSub + '</p></div>',

            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px;">',
                '<div style="display:flex;align-items:center;gap:8px;"><label style="font-size:12px;font-weight:600;color:#64748b;">Bulan</label>',
                '<select id="ppo-month-sel" onchange="(function(){var v=document.getElementById(\'ppo-month-sel\').value;if(!v)return;window._ppoState.month=v;window._ppoState.teamScores=window._ppoLoadTeamCacheMonth(v);var ml=document.getElementById(\'ppo-active-month\');if(ml)ml.textContent=window._ppoMonthLabel(v);window._ppoRender();if(window.ppoLoadFromGAS)window.ppoLoadFromGAS();})()" style="padding:7px 28px 7px 10px;border:1px solid #e5e7eb;border-radius:8px;font-family:inherit;font-size:13px;">' +
                    MONTHS.map(function(m) { return '<option value="' + m + '">' + monthLabel(m) + '</option>'; }).join('') + '</select>',
                '<span id="ppo-active-month" style="font-size:12px;color:#94a3b8;"></span></div>',
                '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">',
                    // Tombol refresh diklat manual
                    '<button onclick="(function(){window._ppoState.diklatLoaded=false;window._ppoState.diklatScores={};try{localStorage.removeItem(\'' + DIKLAT_CACHE_KEY + '\');}catch(e){}return window.ppoLoadFromGAS();})()" style="display:flex;align-items:center;gap:6px;padding:7px 12px;border:1px solid #bae6fd;background:#f0f9ff;color:#0369a1;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;" title="Paksa ambil ulang nilai diklat dari server">🔄 Refresh Diklat</button>',
                    '<button id="ppo-btn-refresh" onclick="window.ppoLoadFromGAS()" style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid #bfdbfe;background:#eff6ff;color:#1e40af;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">↻ Refresh Semua</button>',
                '</div>',
            '</div>',
            '<div class="stats-grid" id="ppo-stat-grid"></div>',
            '<div style="display:flex;gap:0;border-bottom:1px solid #e5e7eb;margin-bottom:18px;"><button class="ppo-tab-btn active" onclick="ppoSwitchTab(\'daftar\',this)">Daftar Pegawai</button>' + adminTabs + '</div>',
            '<div id="ppo-panel-daftar">',
                '<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;">',
                    '<input type="text" id="ppo-search" placeholder="Cari nama atau unit..." oninput="(function(){window._ppoState.search=document.getElementById(\'ppo-search\').value;window._ppoRender();})()" style="flex:1;min-width:160px;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-family:inherit;font-size:13px;">',
                    penilaiFilter,
                    '<select id="ppo-status-filter" onchange="(function(){window._ppoState.statusFilter=document.getElementById(\'ppo-status-filter\').value;window._ppoRender();})()" style="padding:7px 28px 7px 10px;border:1px solid #e5e7eb;border-radius:8px;font-family:inherit;font-size:13px;"><option value="">Semua status</option><option value="done">Sudah dinilai</option><option value="draft">Belum dinilai</option></select>',
                '</div>',
                '<div class="card" style="padding:0;overflow:hidden;"><div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr>' +
                    thCell('#') + thCell('Nama Pegawai') + thCell('Unit / Bidang') +
                    '<th id="ppo-col-evaluator"' + thStyle() + '>Penilai</th>' +
                    thCell('Tim (60%)','center') + thCell('BerAKHLAK (30%)','center') +
                    thCell('Diklat 🔒','center') +
                    thCell('Total','center') + thCell('Status','center') + '<th style="padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e5e7eb;"></th>' +
                    '</tr></thead><tbody id="ppo-tbody"></tbody></table></div></div>',
            '</div>',
            '<div id="ppo-panel-rekap" style="display:none;"><div class="card" style="padding:0;overflow:hidden;"><div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr>' +
                thCell('Divisi / Unit') + thCell('Total Pegawai','center') + thCell('Dinilai','center') + thCell('Selesai','center') + thCell('Rata Total','center') + thCell('Rata BerAKHLAK','center') + thCell('Rata Diklat','center') +
                '</tr></thead><tbody id="ppo-rekap-tbody"></tbody></table></div></div></div>',
            '<div id="ppo-panel-ranking" style="display:none;"><div class="card"><div id="ppo-ranking-list"></div></div></div>',
            '</div>',
            '<div class="modal-overlay" id="ppo-modal-overlay" onclick="if(event.target===this)ppoCloseModal()"><div class="modal" style="max-width:820px;" id="ppo-modal-box"></div></div>'
        ].join('');

        var mSel = document.getElementById('ppo-month-sel');
        if (mSel) mSel.value = state.month;
        var mLbl = document.getElementById('ppo-active-month');
        if (mLbl) mLbl.textContent = monthLabel(state.month);
    }

    // ── SECTION INIT ──
    window.sectionInits = window.sectionInits || {};
    window.sectionInits[SECTION_ID] = function () {
        state.currentUser = getUser();
        if (state.currentUser && !state.currentUser.gid) {
            var role = state.currentUser._role;
            if (ROLE_TO_GID[role]) {
                state.currentUser.gid = ROLE_TO_GID[role];
            } else {
                var derivedGid = deriveGidFromUser(state.currentUser);
                if (derivedGid) state.currentUser.gid = derivedGid;
            }
        }
        loadRecords();
        injectStyles();
        buildShell();
        window._ppoState      = state;
        window._ppoRender     = render;
        window._ppoMonthLabel = monthLabel;

        // Load skor tim dari cache dulu — render segera
        state.teamScores = loadTeamCacheMonth(state.month);

        // Load cache diklat — render segera jika ada
        var cachedDiklat = loadDiklatCache();
        if (cachedDiklat) {
            state.diklatScores = cachedDiklat;
            state.diklatLoaded = true;
            _updateAutoLoadStatus('Nilai diklat dari cache lokal. Menyinkronisasi...', '#f59e0b');
        }

        // Render awal dengan data cache yang sudah ada
        render();

        // [v3.3] Auto-load SEMUA data dari server secara paralel
        // (penilaian + skor tim + diklat) tanpa perlu klik tombol apapun.
        setTimeout(function() { loadFromGAS(); }, 200);
    };

})();