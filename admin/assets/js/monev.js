// ============================================================
// monev.js — Penilaian Monitoring & Evaluasi section (SPA)
// Admin Panel — Dinas Koperasi UKM
// JS source: admin-penilaian-monev.html
// ============================================================
(function () {
    'use strict';

    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxwvQtZzZCYRmSX4UIL-7ars1HQX3Zp6pW0g9vlcffp2lXHTacIMX8I6PYkQtzRDaua/exec';

    const UNITS = [
        "Balai Layanan Usaha Terpadu KUMKM", "Bidang Kewirausahaan", "Bidang Koperasi",
        "Bidang UKM", "Bidang Usaha Mikro", "Sekretariat"
    ];
    const SHORT_UNITS = ['BLUT', 'Kewirausahaan', 'Koperasi', 'UKM', 'Usaha Mikro', 'Sekretariat'];
    const MONTHS = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const CACHE_KEY = 'monev_data_v3';

    let selectedBuktiFile = null;
    let selectedBuktiBase64 = null;
    let existingLinkBukti = '';
    let existingBuktiDeleted = false;
    let chartIndikator = null;
    let chartTotal = null;
    let currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // ─── CACHE ───────────────────────────────────────────
    function getLocalData() { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
    function setLocalData(d) { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); }

    // ─── STATUS BAR ──────────────────────────────────────
    function setStatusBar(type, text) {
        const bar = document.getElementById('mnv-last-updated-bar');
        if (!bar) return;
        bar.className = 'last-updated-bar ' + type + (type ? ' visible' : '');
        bar.textContent = text;
    }

    // ─── INLINE TABLE LOADING ─────────────────────────────
    function showTableLoading() {
        const tbody = document.getElementById('mnv-input-tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:40px;color:#94a3b8;"><div class="spinner-table"></div><div style="margin-top:12px;">Memuat data dari server...</div></td></tr>`;
    }

    // ─── SCORE CALC ──────────────────────────────────────
    function calcScores(state) {
        let waktu = state.waktuOk ? 5 : Math.max(0, 5 - parseInt(state.selKeterlambatan || 3));
        let kelengkapan = state.kelengkapanOk ? 5 : Math.max(0, 5 - parseInt(state.selKualitas || 2));
        let fisik = state.fisikOk ? 10 : Math.max(0, 10 - parseInt(state.selDeviasiFisik || 5));
        let keuangan = state.keuanganOk ? 10 : Math.max(0, 10 - parseInt(state.selDeviasiKeuangan || 5));
        let partisipasi = state.partisipasiOk ? 5 : (state.selPartisipasi === 'tidak-hadir' ? 0 : 3);
        let tindakLanjut = state.tindakLanjutOk ? 5 : 0;
        return { waktu, kelengkapan, fisik, keuangan, partisipasi, tindakLanjut, total: waktu + kelengkapan + fisik + keuangan + partisipasi + tindakLanjut };
    }

    // ─── LOAD FROM SERVER (JSONP) ────────────────────────
    function callAPIGet(params) {
        return new Promise((resolve, reject) => {
            const cbName = 'jsonp_mnv_' + Date.now();
            const timeout = setTimeout(() => { cleanup(); reject(new Error('Timeout 30 detik')); }, 30000);
            function cleanup() { clearTimeout(timeout); delete window[cbName]; const el = document.getElementById('script_' + cbName); if (el) el.remove(); }
            window[cbName] = function (data) { cleanup(); resolve(data); };
            const qs = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
            const script = document.createElement('script');
            script.id = 'script_' + cbName;
            script.src = APPS_SCRIPT_URL + '?' + qs + '&callback=' + cbName;
            script.onerror = () => { cleanup(); reject(new Error('Gagal koneksi ke server')); };
            document.head.appendChild(script);
        });
    }

    // ─── POST ─────────────────────────────────────────────
    function callAPIPost(params) {
        return new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('timeout')), 30000);
            const body = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k] || '')).join('&');
            fetch(APPS_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, redirect: 'follow' })
                .then(r => r.text())
                .then(text => { clearTimeout(t); try { resolve(JSON.parse(text)); } catch (e) { resolve({ status: 'success', linkBukti: '' }); } })
                .catch(err => { clearTimeout(t); reject(err); });
        });
    }

    // ─── LOAD DATA DARI SERVER ────────────────────────────
    window.mnvLoadDataFromServer = async function () {
        showTableLoading();
        setStatusBar('loading', '⏳ Memuat data dari server...');
        try {
            const result = await callAPIGet({ action: 'getAllSheetData' });
            if (result && result.status === 'success') {
                setLocalData(result.data || {});
                const now = new Date().toLocaleTimeString('id-ID');
                setStatusBar('visible', '✅ Data dimuat dari server · ' + now);
            } else {
                throw new Error((result && result.message) || 'Respons tidak valid');
            }
        } catch (err) {
            const cached = getLocalData();
            if (Object.keys(cached).length > 0) {
                setStatusBar('error', '⚠️ Gagal koneksi server — menampilkan data cache lokal');
            } else {
                setStatusBar('error', '⚠️ Gagal memuat data: ' + err.message);
            }
        } finally {
            const selectBulan = document.getElementById('mnv-select-bulan-input');
            const bulan = selectBulan ? selectBulan.value : '';
            if (bulan) { window.mnvRenderInputTable(bulan); window.mnvUpdateStats(bulan); }
            else { const tbody = document.getElementById('mnv-input-tbody'); if (tbody) tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:40px;color:#94a3b8;">Pilih bulan untuk melihat data</td></tr>'; }
            window.mnvRenderRekap();
        }
    };

    // ─── TAB SWITCHING ────────────────────────────────────
    window.mnvSwitchTab = function (name, e) {
        document.querySelectorAll('#section-monev .tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('#section-monev .tab-content').forEach(t => t.classList.remove('active'));
        if (e) e.target.classList.add('active');
        const tabContent = document.getElementById('mnv-tab-' + name);
        if (tabContent) tabContent.classList.add('active');
        if (name === 'rekap') window.mnvRenderRekap();
    };

    // ─── STATS ────────────────────────────────────────────
    window.mnvUpdateStats = function (bulan) {
        if (!document.getElementById('mnv-avg-score-this-month')) return;
        const data = getLocalData();
        if (!bulan || !data[bulan]) {
            document.getElementById('mnv-avg-score-this-month').textContent = '—';
            document.getElementById('mnv-units-assessed').textContent = '0';
            document.getElementById('mnv-units-pending').textContent = '6';
            return;
        }
        const vals = Object.values(data[bulan]).map(u => u.total);
        document.getElementById('mnv-avg-score-this-month').textContent = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
        document.getElementById('mnv-units-assessed').textContent = vals.length;
        document.getElementById('mnv-units-pending').textContent = Math.max(0, 6 - vals.length);
    };

    // ─── RENDER TABLE ─────────────────────────────────────
    window.mnvRenderInputTable = function (bulan) {
        const tbody = document.getElementById('mnv-input-tbody');
        if (!tbody) return;
        if (!bulan) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:40px;color:#94a3b8;">Pilih bulan untuk melihat data</td></tr>';
            return;
        }
        const monthData = (getLocalData()[bulan]) || {};
        tbody.innerHTML = UNITS.map(unit => {
            const u = monthData[unit];
            if (!u) return `<tr><td style="font-weight:500;">${unit}</td><td>${bulan}</td><td colspan="6" style="color:#94a3b8;font-style:italic;">Belum dinilai</td><td>—</td><td>—</td><td><button onclick="mnvOpenInputModal('${esc(unit)}','${bulan}')" class="btn btn-sm btn-primary">+ Isi Nilai</button></td></tr>`;
            const badgeClass = u.total >= 35 ? 'badge-green' : u.total >= 25 ? 'badge-yellow' : 'badge-red';
            const buktiCell = u.linkBukti ? `<a href="${u.linkBukti}" target="_blank" style="color:#3b82f6;font-size:12px;text-decoration:none;">📎 Lihat</a>` : `<span style="color:#94a3b8;font-size:12px;">—</span>`;
            return `<tr><td style="font-weight:500;">${unit}</td><td>${bulan}</td><td>${u.waktu}</td><td>${u.kelengkapan}</td><td>${u.fisik}</td><td>${u.keuangan}</td><td>${u.partisipasi}</td><td>${u.tindakLanjut}</td><td><span class="badge ${badgeClass}">${u.total}</span></td><td>${buktiCell}</td><td style="white-space:nowrap;"><button onclick="mnvOpenInputModal('${esc(unit)}','${bulan}')" class="btn btn-sm">✏️ Edit</button><button onclick="mnvDeleteEntry('${esc(unit)}','${bulan}')" class="btn btn-sm btn-danger" style="margin-left:4px;">🗑️ Hapus</button></td></tr>`;
        }).join('');
    };

    function esc(s) { return s.replace(/'/g, "\\'"); }

    // ─── TOGGLE CHECK ─────────────────────────────────────
    window.mnvToggleCheck = function (key, e) {
        if (e) e.stopPropagation();
        const cb = document.getElementById('mnv-check-' + key);
        if (!cb && e) e.target.closest('input').checked = !e.target.closest('input').checked;
        if (cb) cb.checked = !cb.checked;
        window.mnvSyncCheckItem(key);
        window.mnvUpdateModalScore();
    };

    window.mnvSyncCheckItem = function (key) {
        const cb = document.getElementById('mnv-check-' + key);
        const item = document.getElementById('mnv-check-' + key + '-item');
        const sub = document.getElementById('mnv-sub-' + key);
        const badge = document.getElementById('mnv-badge-' + key);
        if (!cb || !item || !sub || !badge) return;

        const maxPoints = { waktu: 5, kelengkapan: 5, fisik: 10, keuangan: 10, partisipasi: 5, tindaklanjut: 5 };
        const mp = maxPoints[key];
        if (cb.checked) {
            item.classList.add('checked'); item.classList.remove('unchecked-state');
            badge.textContent = `+${mp} poin`; sub.classList.remove('show');
        } else {
            item.classList.remove('checked'); item.classList.add('unchecked-state');
            sub.classList.add('show'); window.mnvUpdateBadge(key);
        }
    };

    window.mnvUpdateBadge = function (key) {
        const badge = document.getElementById('mnv-badge-' + key);
        if (!badge) return;
        const scores = calcScores(mnvGetModalState());
        const map = { waktu: 'waktu', kelengkapan: 'kelengkapan', fisik: 'fisik', keuangan: 'keuangan', partisipasi: 'partisipasi', tindaklanjut: 'tindakLanjut' };
        const maxPoints = { waktu: 5, kelengkapan: 5, fisik: 10, keuangan: 10, partisipasi: 5, tindaklanjut: 5 };
        const val = scores[map[key]];
        badge.textContent = val === maxPoints[key] ? `+${val} poin` : `${val} poin ⬇`;
    };

    function mnvGetModalState() {
        return {
            waktuOk: document.getElementById('mnv-check-waktu')?.checked,
            kelengkapanOk: document.getElementById('mnv-check-kelengkapan')?.checked,
            fisikOk: document.getElementById('mnv-check-fisik')?.checked,
            keuanganOk: document.getElementById('mnv-check-keuangan')?.checked,
            partisipasiOk: document.getElementById('mnv-check-partisipasi')?.checked,
            tindakLanjutOk: document.getElementById('mnv-check-tindaklanjut')?.checked,
            selKeterlambatan: document.getElementById('mnv-sel-keterlambatan')?.value,
            selKualitas: document.getElementById('mnv-sel-kualitas')?.value,
            selDeviasiFisik: document.getElementById('mnv-sel-deviasi-fisik')?.value,
            selDeviasiKeuangan: document.getElementById('mnv-sel-deviasi-keuangan')?.value,
            selPartisipasi: document.getElementById('mnv-sel-partisipasi')?.value,
        };
    }

    window.mnvUpdateModalScore = function () {
        const s = calcScores(mnvGetModalState());
        ['score-waktu', 'score-kelengkapan', 'score-fisik', 'score-keuangan', 'score-partisipasi', 'score-tindak-lanjut', 'modal-total-nilai'].forEach((id, i) => {
            const el = document.getElementById('mnv-' + id);
            if (el) {
                if (i === 0) el.textContent = s.waktu;
                if (i === 1) el.textContent = s.kelengkapan;
                if (i === 2) el.textContent = s.fisik;
                if (i === 3) el.textContent = s.keuangan;
                if (i === 4) el.textContent = s.partisipasi;
                if (i === 5) el.textContent = s.tindakLanjut;
                if (i === 6) el.textContent = s.total;
            }
        });
        ['waktu', 'kelengkapan', 'fisik', 'keuangan', 'partisipasi', 'tindaklanjut'].forEach(k => {
            if (!document.getElementById('mnv-check-' + k)?.checked) window.mnvUpdateBadge(k);
        });
    };

    // ─── OPEN MODAL ───────────────────────────────────────
    window.mnvOpenInputModal = function (unit, bulan) {
        if (!bulan) {
            bulan = document.getElementById('mnv-select-bulan-input').value;
            if (!bulan) { if (window.showToast) showToast('Pilih bulan terlebih dahulu', 'error'); return; }
        }
        const data = getLocalData();
        const existing = (data[bulan] || {})[unit];
        const isEdit = !!existing;

        document.getElementById('mnv-modal-title-text').textContent = isEdit ? 'Edit Penilaian Monev' : 'Input Penilaian Monev';
        document.getElementById('mnv-modal-bulan-label').textContent = `Bulan: ${bulan}`;
        document.getElementById('mnv-modal-unit-name').textContent = unit;
        document.getElementById('mnv-modal-unit-meta').textContent = `Penilaian Bulan ${bulan}`;
        document.getElementById('mnv-modal-existing-badge').style.display = isEdit ? 'block' : 'none';
        document.getElementById('mnv-input-unit').value = unit;

        const submitBtn = document.getElementById('mnv-submit-input-btn');
        if (isEdit) {
            submitBtn.className = 'btn btn-warning'; submitBtn.style.flex = '1';
            submitBtn.innerHTML = '💾 Update Penilaian';
        } else {
            submitBtn.className = 'btn btn-success'; submitBtn.style.flex = '1';
            submitBtn.innerHTML = '💾 Simpan Penilaian';
        }

        const state = (isEdit && existing._state) ? existing._state : {
            waktuOk: true, kelengkapanOk: true, fisikOk: true, keuanganOk: true, partisipasiOk: true, tindakLanjutOk: true,
            selKeterlambatan: '3', selKualitas: '2', selDeviasiFisik: '5', selDeviasiKeuangan: '5', selPartisipasi: 'diwakili'
        };

        if (document.getElementById('mnv-check-waktu')) document.getElementById('mnv-check-waktu').checked = state.waktuOk;
        if (document.getElementById('mnv-check-kelengkapan')) document.getElementById('mnv-check-kelengkapan').checked = state.kelengkapanOk;
        if (document.getElementById('mnv-check-fisik')) document.getElementById('mnv-check-fisik').checked = state.fisikOk;
        if (document.getElementById('mnv-check-keuangan')) document.getElementById('mnv-check-keuangan').checked = state.keuanganOk;
        if (document.getElementById('mnv-check-partisipasi')) document.getElementById('mnv-check-partisipasi').checked = state.partisipasiOk;
        if (document.getElementById('mnv-check-tindaklanjut')) document.getElementById('mnv-check-tindaklanjut').checked = state.tindakLanjutOk;

        if (document.getElementById('mnv-sel-keterlambatan')) document.getElementById('mnv-sel-keterlambatan').value = state.selKeterlambatan || '3';
        if (document.getElementById('mnv-sel-kualitas')) document.getElementById('mnv-sel-kualitas').value = state.selKualitas || '2';
        if (document.getElementById('mnv-sel-deviasi-fisik')) document.getElementById('mnv-sel-deviasi-fisik').value = state.selDeviasiFisik || '5';
        if (document.getElementById('mnv-sel-deviasi-keuangan')) document.getElementById('mnv-sel-deviasi-keuangan').value = state.selDeviasiKeuangan || '5';
        if (document.getElementById('mnv-sel-partisipasi')) document.getElementById('mnv-sel-partisipasi').value = state.selPartisipasi || 'diwakili';

        ['waktu', 'kelengkapan', 'fisik', 'keuangan', 'partisipasi', 'tindaklanjut'].forEach(k => window.mnvSyncCheckItem(k));
        document.getElementById('mnv-input-catatan').value = existing ? existing.catatan : '';

        selectedBuktiFile = null; selectedBuktiBase64 = null; existingBuktiDeleted = false;
        document.getElementById('mnv-bukti-file-input').value = '';
        document.getElementById('mnv-bukti-file-preview').style.display = 'none';
        document.getElementById('mnv-bukti-file-error').style.display = 'none';
        document.getElementById('mnv-upload-progress').style.display = 'none';

        if (isEdit && existing && existing.linkBukti) {
            existingLinkBukti = existing.linkBukti;
            document.getElementById('mnv-existing-bukti-link').href = existingLinkBukti;
            document.getElementById('mnv-existing-bukti-panel').style.display = 'block';
            document.getElementById('mnv-new-file-upload-zone').style.display = 'none';
        } else {
            existingLinkBukti = '';
            document.getElementById('mnv-existing-bukti-panel').style.display = 'none';
            document.getElementById('mnv-new-file-upload-zone').style.display = 'block';
        }
        window.mnvUpdateModalScore();

        const modal = document.getElementById('mnv-inputModal');
        modal.style.display = 'flex';
        setTimeout(() => { const m = modal.querySelector('.modal'); if (m) m.scrollTop = 0; }, 0);
    };

    window.mnvCloseInputModal = function () { document.getElementById('mnv-inputModal').style.display = 'none'; };

    // ─── SUBMIT ───────────────────────────────────────────
    window.mnvSubmitInputNilai = async function () {
        const bulan = document.getElementById('mnv-select-bulan-input').value;
        const unit = document.getElementById('mnv-input-unit').value;
        if (!unit || !bulan) { if (window.showToast) showToast('Data tidak lengkap', 'error'); return; }

        const state = mnvGetModalState();
        const scores = calcScores(state);
        const catatan = document.getElementById('mnv-input-catatan').value;

        const submitBtn = document.getElementById('mnv-submit-input-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Menyimpan...';

        const payload = {
            action: 'uploadAndSave', bulan, unit,
            waktu: scores.waktu, kelengkapan: scores.kelengkapan,
            fisik: scores.fisik, keuangan: scores.keuangan,
            partisipasi: scores.partisipasi, tindakLanjut: scores.tindakLanjut,
            total: scores.total, catatan,
            penilai: currentUser.name || 'Admin',
            fileName: '', mimeType: '', fileData: ''
        };

        if (selectedBuktiFile && selectedBuktiBase64) {
            window.mnvSetUploadProgress(20, 'Mempersiapkan file...');
            const ext = selectedBuktiFile.name.split('.').pop().toLowerCase();
            const safeUnit = unit.replace(/[^a-zA-Z0-9]/g, '_');
            payload.fileName = `MONEV_${bulan}_${safeUnit}_${Date.now()}.${ext}`;
            payload.mimeType = selectedBuktiFile.type;
            payload.fileData = selectedBuktiBase64;
        }

        window.mnvSetUploadProgress(50, 'Mengirim ke server...');
        let linkBukti = '';
        try {
            const result = await callAPIPost(payload);
            if (result && result.status === 'success') {
                linkBukti = (selectedBuktiFile && selectedBuktiBase64) ? (result.linkBukti || '') : (!existingBuktiDeleted && existingLinkBukti ? existingLinkBukti : '');
                window.mnvSetUploadProgress(100, 'Berhasil!');
            } else {
                if (window.showToast) showToast('Gagal simpan: ' + (result?.message || 'Unknown error'), 'error');
            }
        } catch (err) {
            if (window.showToast) showToast('Gagal menghubungi server: ' + err.message, 'error');
        }

        const localData = getLocalData();
        if (!localData[bulan]) localData[bulan] = {};
        localData[bulan][unit] = { ...scores, catatan, linkBukti, _state: state };
        setLocalData(localData);

        window.mnvHideUploadProgress();
        window.mnvCloseInputModal();
        window.mnvRenderInputTable(bulan);
        window.mnvUpdateStats(bulan);
        if (window.showToast) showToast(`Nilai ${unit} bulan ${bulan} berhasil disimpan!`, 'success');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '💾 Simpan Penilaian';
    };

    // ─── DELETE ENTRY ──────────────────────────────────────
    window.mnvDeleteEntry = async function (unit, bulan) {
        if (!confirm(`Hapus penilaian ${unit} bulan ${bulan}?\n\nData akan dihapus dari spreadsheet.`)) return;
        const data = getLocalData();
        if (data[bulan]) delete data[bulan][unit];
        setLocalData(data);
        window.mnvRenderInputTable(bulan);
        window.mnvUpdateStats(bulan);

        try {
            const result = await callAPIPost({ action: 'deleteMonevData', bulan: bulan, unit: unit });
            if (result && result.status === 'success') {
                if (window.showToast) showToast(`Data ${unit} bulan ${bulan} berhasil dihapus dari spreadsheet.`, 'success');
            } else {
                if (window.showToast) showToast('Hapus lokal berhasil, tapi gagal hapus di server', 'error');
            }
        } catch (err) {
            if (window.showToast) showToast('Hapus lokal berhasil, tapi gagal koneksi server', 'error');
        }
    };

    // ─── REKAP ────────────────────────────────────────────
    window.mnvRenderRekap = function () {
        const ct1 = document.getElementById('mnv-chartIndikator');
        const ct2 = document.getElementById('mnv-chartTotal');
        const tbody = document.getElementById('mnv-rekap-tbody');
        if (!ct1 || !ct2 || !tbody) return;

        const bulan = document.getElementById('mnv-select-bulan-rekap').value;
        const data = getLocalData();
        const monthData = (bulan && data[bulan]) ? data[bulan] : {};

        const w = UNITS.map(u => (monthData[u]?.waktu) || 0);
        const kl = UNITS.map(u => (monthData[u]?.kelengkapan) || 0);
        const f = UNITS.map(u => (monthData[u]?.fisik) || 0);
        const ke = UNITS.map(u => (monthData[u]?.keuangan) || 0);
        const p = UNITS.map(u => (monthData[u]?.partisipasi) || 0);
        const tl = UNITS.map(u => (monthData[u]?.tindakLanjut) || 0);
        const tot = UNITS.map(u => (monthData[u]?.total) || 0);

        tbody.innerHTML = `
        <tr><td>1</td><td style="font-weight:500;text-align:left;">Ketepatan Waktu</td>${w.map(v => `<td class="${v < 5 ? 'rekap-bad' : 'rekap-good'}">${v}</td>`).join('')}</tr>
        <tr><td>2</td><td style="font-weight:500;text-align:left;">Kelengkapan Data</td>${kl.map(v => `<td class="${v < 5 ? 'rekap-bad' : 'rekap-good'}">${v}</td>`).join('')}</tr>
        <tr><td>3</td><td style="font-weight:500;text-align:left;">Capaian Fisik</td>${f.map(v => `<td class="${v < 10 ? 'rekap-bad' : 'rekap-good'}">${v}</td>`).join('')}</tr>
        <tr><td>4</td><td style="font-weight:500;text-align:left;">Capaian Keuangan</td>${ke.map(v => `<td class="${v < 10 ? 'rekap-bad' : 'rekap-good'}">${v}</td>`).join('')}</tr>
        <tr><td>5</td><td style="font-weight:500;text-align:left;">Partisipasi PPTK</td>${p.map(v => `<td class="${v < 5 ? 'rekap-bad' : 'rekap-good'}">${v}</td>`).join('')}</tr>
        <tr><td>6</td><td style="font-weight:500;text-align:left;">Tindak Lanjut</td>${tl.map(v => `<td class="${v < 5 ? 'rekap-bad' : 'rekap-good'}">${v}</td>`).join('')}</tr>
        <tr><td></td><td style="font-weight:700;text-align:left;">TOTAL NILAI</td>${tot.map(v => `<td style="font-weight:700;color:${v >= 35 ? '#065f46' : v >= 25 ? '#92400e' : '#991b1b'};">${v}</td>`).join('')}</tr>`;

        if (chartIndikator) chartIndikator.destroy();
        if (chartTotal) chartTotal.destroy();

        chartIndikator = new Chart(ct1.getContext('2d'), {
            type: 'bar',
            data: {
                labels: SHORT_UNITS, datasets: [
                    { label: 'Ket.Waktu', data: w, backgroundColor: '#3b82f6' }, { label: 'Kelengkapan', data: kl, backgroundColor: '#8b5cf6' },
                    { label: 'Fisik', data: f, backgroundColor: '#10b981' }, { label: 'Keuangan', data: ke, backgroundColor: '#f59e0b' },
                    { label: 'Partisipasi', data: p, backgroundColor: '#ec4899' }, { label: 'Tindak Lanjut', data: tl, backgroundColor: '#06b6d4' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom' } }, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, max: 40 } } }
        });
        chartTotal = new Chart(ct2.getContext('2d'), {
            type: 'bar',
            data: { labels: SHORT_UNITS, datasets: [{ label: 'Total', data: tot, borderRadius: 6, backgroundColor: tot.map(v => v >= 35 ? '#10b981' : v >= 25 ? '#f59e0b' : '#ef4444') }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `Nilai: ${ctx.parsed.y}/40` } } }, scales: { y: { beginAtZero: true, max: 40, ticks: { stepSize: 5 } } } }
        });
    };

    // ─── FILE HANDLING ────────────────────────────────────
    window.mnvHandleBuktiFileSelect = function (event) {
        const file = event.target.files[0];
        const errEl = document.getElementById('mnv-bukti-file-error');
        errEl.style.display = 'none';
        if (!file) return;
        if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.type)) {
            errEl.textContent = '❌ Format tidak didukung. Gunakan JPG, PNG, atau PDF.';
            errEl.style.display = 'block'; event.target.value = ''; return;
        }
        if (file.size > MAX_FILE_SIZE) {
            errEl.textContent = `❌ Ukuran terlalu besar (${window.mnvFormatFileSize(file.size)}). Maks 10 MB.`;
            errEl.style.display = 'block'; event.target.value = ''; return;
        }
        selectedBuktiFile = file;
        document.getElementById('mnv-bukti-preview-name').textContent = file.name;
        document.getElementById('mnv-bukti-preview-size').textContent = window.mnvFormatFileSize(file.size);
        document.getElementById('mnv-bukti-preview-icon').textContent = file.type === 'application/pdf' ? '📄' : '🖼️';
        document.getElementById('mnv-bukti-file-preview').style.display = 'flex';
        const reader = new FileReader();
        reader.onload = e => { selectedBuktiBase64 = e.target.result.split(',')[1]; };
        reader.readAsDataURL(file);
    };

    window.mnvReplaceExistingBukti = function () {
        document.getElementById('mnv-existing-bukti-panel').style.display = 'none';
        document.getElementById('mnv-new-file-upload-zone').style.display = 'block';
    };

    window.mnvDeleteExistingBukti = function () {
        if (!confirm('Hapus bukti yang tersimpan?')) return;
        existingLinkBukti = ''; existingBuktiDeleted = true;
        document.getElementById('mnv-existing-bukti-panel').style.display = 'none';
        document.getElementById('mnv-new-file-upload-zone').style.display = 'block';
    };

    window.mnvCancelNewFile = function () {
        selectedBuktiFile = null; selectedBuktiBase64 = null;
        document.getElementById('mnv-bukti-file-input').value = '';
        document.getElementById('mnv-bukti-file-preview').style.display = 'none';
        document.getElementById('mnv-bukti-file-error').style.display = 'none';
        if (existingLinkBukti && !existingBuktiDeleted) {
            document.getElementById('mnv-existing-bukti-panel').style.display = 'block';
            document.getElementById('mnv-new-file-upload-zone').style.display = 'none';
        }
    };

    window.mnvFormatFileSize = function (b) {
        if (b < 1024) return b + ' B';
        if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
        return (b / 1048576).toFixed(2) + ' MB';
    };

    window.mnvSetUploadProgress = function (pct, label) {
        document.getElementById('mnv-upload-progress').style.display = 'block';
        document.getElementById('mnv-upload-progress-fill').style.width = pct + '%';
        document.getElementById('mnv-upload-progress-label').textContent = label;
    };

    window.mnvHideUploadProgress = function () {
        document.getElementById('mnv-upload-progress').style.display = 'none';
        document.getElementById('mnv-upload-progress-fill').style.width = '0%';
    };

    // ═══ HTML Injection & Initialization ════════════════════
    window.sectionInits = window.sectionInits || {};
    window.sectionInits['monev'] = function () {
        const section = document.getElementById('section-monev');
        if (!section) return;

        section.innerHTML = `
        <div class="container">
            <!-- STATUS BAR KECIL -->
            <div class="last-updated-bar" id="mnv-last-updated-bar"></div>

            <div class="tabs">
                <button class="tab active" onclick="mnvSwitchTab('input', event)">📥 Input Penilaian</button>
                <button class="tab" onclick="mnvSwitchTab('rekap', event)">📊 Rekapitulasi</button>
            </div>

            <!-- TAB INPUT -->
            <div id="mnv-tab-input" class="tab-content active">
                <div class="stats-grid">
                    <div class="stat-card" style="border-left:4px solid #1F4E79;"><div class="stat-label">Skor Maksimum</div><div class="stat-value">40</div></div>
                    <div class="stat-card" style="border-left:4px solid #10b981;"><div class="stat-label">Rata-rata Bulan Ini</div><div class="stat-value" id="mnv-avg-score-this-month">—</div></div>
                    <div class="stat-card" style="border-left:4px solid #f59e0b;"><div class="stat-label">Unit Dinilai</div><div class="stat-value" id="mnv-units-assessed">0</div></div>
                    <div class="stat-card" style="border-left:4px solid #ef4444;"><div class="stat-label">Unit Belum Dinilai</div><div class="stat-value" id="mnv-units-pending">6</div></div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Input Nilai Kinerja Monev Per Unit</h2>
                        <div class="filter-container">
                            <select class="select-input" id="mnv-select-bulan-input" onchange="mnvRenderInputTable(this.value); mnvUpdateStats(this.value);">
                                <option value="">Pilih Bulan</option>
                                ${MONTHS.map(m => `<option value="${m}">${m.charAt(0) + m.slice(1).toLowerCase()}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead><tr><th>Unit</th><th>Bulan</th><th>Ket. Waktu (5)</th><th>Kelengkapan (5)</th><th>Fisik (10)</th><th>Keuangan (10)</th><th>Partisipasi (5)</th><th>Tindak Lanjut (5)</th><th>Total (40)</th><th>Bukti</th><th>Aksi</th></tr></thead>
                            <tbody id="mnv-input-tbody"><tr><td colspan="11" style="text-align:center;padding:40px;color:#94a3b8;"><div class="spinner-table"></div><div style="margin-top:12px;">Memuat data...</div></td></tr></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- TAB REKAP -->
            <div id="mnv-tab-rekap" class="tab-content">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Rekapitulasi Nilai Kinerja Monitoring & Evaluasi</h2>
                        <div class="filter-container">
                            <select class="select-input" id="mnv-select-bulan-rekap" onchange="mnvRenderRekap()">
                                <option value="">Semua Bulan</option>
                                ${MONTHS.map(m => `<option value="${m}">${m.charAt(0) + m.slice(1).toLowerCase()}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="card-content">
                        <div class="charts-grid">
                            <div class="card" style="margin:0;"><div class="card-header" style="padding:16px;"><h3 style="font-size:15px;font-weight:600;">Distribusi Per Indikator</h3></div><div class="card-content"><div class="chart-container"><canvas id="mnv-chartIndikator"></canvas></div></div></div>
                            <div class="card" style="margin:0;"><div class="card-header" style="padding:16px;"><h3 style="font-size:15px;font-weight:600;">Total Nilai Per Unit</h3></div><div class="card-content"><div class="chart-container"><canvas id="mnv-chartTotal"></canvas></div></div></div>
                        </div>
                        <div style="overflow-x:auto;">
                            <table class="rekap-table">
                                <thead><tr><th>No</th><th>Indikator Penilaian</th><th>BLUT</th><th>Bid. Kewirausahaan</th><th>Bid. Koperasi</th><th>Bid. UKM</th><th>Bid. Usaha Mikro</th><th>Sekretariat</th></tr></thead>
                                <tbody id="mnv-rekap-tbody"><tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8;"><div class="spinner-table"></div><div style="margin-top:12px;">Memuat data...</div></td></tr></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL INPUT -->
        <div id="mnv-inputModal" class="modal-overlay" style="display:none;">
            <div class="modal">
                <div class="modal-header"><h2 class="modal-title" id="mnv-modal-title-text">Input Penilaian Monev</h2><p style="font-size:13px;color:#64748b;margin-top:2px;" id="mnv-modal-bulan-label">—</p></div>
                <div class="modal-content">
                    <div class="info-banner">📊 <strong>Sistem Penilaian:</strong> Centang tiap indikator jika terpenuhi. Jika tidak dicentang, isikan detail pengurangan nilai.</div>

                    <input type="hidden" id="mnv-input-unit">
                    <div class="unit-strip"><div><div class="unit-strip-name" id="mnv-modal-unit-name">—</div><div class="unit-strip-meta" id="mnv-modal-unit-meta">—</div></div><div id="mnv-modal-existing-badge" style="display:none;"><span style="background:#dbeafe;color:#1e40af;font-size:12px;font-weight:600;padding:4px 12px;border-radius:12px;">✏️ Mode Edit</span></div></div>

                    <div class="score-section"><div class="score-section-title">1️⃣ Ketepatan Waktu <span style="color:#64748b;font-weight:400;font-size:12px;">(Maks 5 poin)</span></div><div class="check-item checked" id="mnv-check-waktu-item" onclick="mnvToggleCheck('waktu')"><input type="checkbox" id="mnv-check-waktu" checked onclick="mnvToggleCheck('waktu', event)"><div class="check-item-body"><div class="check-item-label">Penyampaian data tepat waktu</div><div class="check-item-sub">Tidak melebihi batas waktu pelaporan</div></div><span class="check-item-badge" id="mnv-badge-waktu">+5 poin</span></div><div class="sub-input-group" id="mnv-sub-waktu"><label class="input-label">⏰ Pilih kategori keterlambatan</label><select class="form-input" id="mnv-sel-keterlambatan" onchange="mnvUpdateModalScore()"><option value="3">Terlambat &lt; 5 hari (-3 poin → skor 2)</option><option value="5">Terlambat ≥ 5 hari (-5 poin → skor 0)</option></select></div></div>
                    <div class="score-section" style="border-left-color:#8b5cf6;"><div class="score-section-title">2️⃣ Kelengkapan Data <span style="color:#64748b;font-weight:400;font-size:12px;">(Maks 5 poin)</span></div><div class="check-item checked" id="mnv-check-kelengkapan-item" onclick="mnvToggleCheck('kelengkapan')"><input type="checkbox" id="mnv-check-kelengkapan" checked onclick="mnvToggleCheck('kelengkapan', event)"><div class="check-item-body"><div class="check-item-label">Seluruh komponen data monev lengkap</div><div class="check-item-sub">Keterlisian &gt; 90%</div></div><span class="check-item-badge" id="mnv-badge-kelengkapan">+5 poin</span></div><div class="sub-input-group" id="mnv-sub-kelengkapan"><label class="input-label">📋 Pilih kategori kekurangan</label><select class="form-input" id="mnv-sel-kualitas" onchange="mnvUpdateModalScore()"><option value="2">Keterlisian 50%–90% (-2 poin → skor 3)</option><option value="3">Keterlisian &lt; 50% (-3 poin → skor 2)</option></select></div></div>
                    <div class="score-section" style="border-left-color:#10b981;"><div class="score-section-title">3️⃣ Capaian Fisik <span style="color:#64748b;font-weight:400;font-size:12px;">(Maks 10 poin)</span></div><div class="check-item checked" id="mnv-check-fisik-item" onclick="mnvToggleCheck('fisik')"><input type="checkbox" id="mnv-check-fisik" checked onclick="mnvToggleCheck('fisik', event)"><div class="check-item-body"><div class="check-item-label">Capaian fisik sesuai target</div><div class="check-item-sub">Deviasi &lt; 5% dari target</div></div><span class="check-item-badge" id="mnv-badge-fisik">+10 poin</span></div><div class="sub-input-group" id="mnv-sub-fisik"><label class="input-label">📊 Pilih kategori deviasi fisik</label><select class="form-input" id="mnv-sel-deviasi-fisik" onchange="mnvUpdateModalScore()"><option value="5">Deviasi ≥ 5% – &lt; 10% (-5 poin → skor 5)</option><option value="8">Deviasi ≥ 10% (-8 poin → skor 2)</option></select></div></div>
                    <div class="score-section" style="border-left-color:#f59e0b;"><div class="score-section-title">4️⃣ Capaian Keuangan <span style="color:#64748b;font-weight:400;font-size:12px;">(Maks 10 poin)</span></div><div class="check-item checked" id="mnv-check-keuangan-item" onclick="mnvToggleCheck('keuangan')"><input type="checkbox" id="mnv-check-keuangan" checked onclick="mnvToggleCheck('keuangan', event)"><div class="check-item-body"><div class="check-item-label">Capaian keuangan sesuai anggaran</div><div class="check-item-sub">Deviasi &lt; 5% dari anggaran</div></div><span class="check-item-badge" id="mnv-badge-keuangan">+10 poin</span></div><div class="sub-input-group" id="mnv-sub-keuangan"><label class="input-label">💰 Pilih kategori deviasi keuangan</label><select class="form-input" id="mnv-sel-deviasi-keuangan" onchange="mnvUpdateModalScore()"><option value="5">Deviasi ≥ 5% – &lt; 10% (-5 poin → skor 5)</option><option value="8">Deviasi ≥ 10% (-8 poin → skor 2)</option></select></div></div>
                    <div class="score-section" style="border-left-color:#ec4899;"><div class="score-section-title">5️⃣ Partisipasi PPTK <span style="color:#64748b;font-weight:400;font-size:12px;">(Maks 5 poin)</span></div><div class="check-item checked" id="mnv-check-partisipasi-item" onclick="mnvToggleCheck('partisipasi')"><input type="checkbox" id="mnv-check-partisipasi" checked onclick="mnvToggleCheck('partisipasi', event)"><div class="check-item-body"><div class="check-item-label">PPTK hadir langsung dalam Desk Timbal Balik</div><div class="check-item-sub">Tidak diwakilkan</div></div><span class="check-item-badge" id="mnv-badge-partisipasi">+5 poin</span></div><div class="sub-input-group" id="mnv-sub-partisipasi"><label class="input-label">👤 Pilih kategori ketidakhadiran</label><select class="form-input" id="mnv-sel-partisipasi" onchange="mnvUpdateModalScore()"><option value="diwakili">Diwakili Staf (-2 poin → skor 3)</option><option value="tidak-hadir">Tidak Hadir sama sekali (-5 poin → skor 0)</option></select></div></div>
                    <div class="score-section" style="border-left-color:#06b6d4;"><div class="score-section-title">6️⃣ Tindak Lanjut <span style="color:#64748b;font-weight:400;font-size:12px;">(Maks 5 poin)</span></div><div class="check-item checked" id="mnv-check-tindaklanjut-item" onclick="mnvToggleCheck('tindaklanjut')"><input type="checkbox" id="mnv-check-tindaklanjut" checked onclick="mnvToggleCheck('tindaklanjut', event)"><div class="check-item-body"><div class="check-item-label">Tindak lanjut pasca Desk Timbal Balik sudah dilaksanakan</div><div class="check-item-sub">Rekomendasi diimplementasikan</div></div><span class="check-item-badge" id="mnv-badge-tindaklanjut">+5 poin</span></div><div class="sub-input-group" id="mnv-sub-tindaklanjut"><p style="font-size:13px;color:#92400e;margin:0;">⚠️ Tindak lanjut tidak dilaksanakan: <strong>0 poin</strong> untuk indikator ini.</p></div></div>

                    <div class="score-preview">
                        <div style="font-size:13px;color:#64748b;margin-bottom:8px;font-weight:500;">TOTAL NILAI</div>
                        <div class="score-total" id="mnv-modal-total-nilai">40</div>
                        <div class="score-max">dari maksimal 40 poin</div>
                        <div class="score-breakdown">
                            <div class="score-item"><div class="score-item-label">Ket. Waktu</div><div class="score-item-val" id="mnv-score-waktu">5</div></div>
                            <div class="score-item"><div class="score-item-label">Kelengkapan</div><div class="score-item-val" id="mnv-score-kelengkapan">5</div></div>
                            <div class="score-item"><div class="score-item-label">Capaian Fisik</div><div class="score-item-val" id="mnv-score-fisik">10</div></div>
                            <div class="score-item"><div class="score-item-label">Keuangan</div><div class="score-item-val" id="mnv-score-keuangan">10</div></div>
                            <div class="score-item"><div class="score-item-label">Partisipasi</div><div class="score-item-val" id="mnv-score-partisipasi">5</div></div>
                            <div class="score-item"><div class="score-item-label">Tindak Lanjut</div><div class="score-item-val" id="mnv-score-tindak-lanjut">5</div></div>
                        </div>
                    </div>

                    <div class="form-group"><label class="input-label">📝 Catatan Tambahan (Opsional)</label><textarea class="form-textarea" id="mnv-input-catatan" placeholder="Catatan tambahan mengenai penilaian ini..."></textarea></div>

                    <div style="background:#fafafa;border:1.5px dashed #cbd5e1;border-radius:10px;padding:16px;margin-bottom:4px;">
                        <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:4px;display:flex;align-items:center;gap:6px;">📎 Bukti Penilaian <span style="background:#fef3c7;color:#92400e;font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600;">Opsional</span></div>
                        <div id="mnv-existing-bukti-panel" style="display:none;margin-bottom:12px;"><div style="font-size:12px;font-weight:600;color:#1e40af;margin-bottom:6px;">📌 File Bukti Tersimpan:</div><div style="display:flex;align-items:center;gap:12px;background:white;border:1.5px solid #bfdbfe;border-radius:8px;padding:12px;"><div style="width:36px;height:36px;border-radius:8px;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">📎</div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:600;color:#1e293b;">File bukti sebelumnya</div><a id="mnv-existing-bukti-link" href="#" target="_blank" rel="noopener" style="font-size:12px;color:#3b82f6;text-decoration:none;">🔗 Lihat file di Google Drive</a></div><div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0;"><button onclick="mnvReplaceExistingBukti()" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:600;color:#0369a1;cursor:pointer;">🔄 Ganti File</button><button onclick="mnvDeleteExistingBukti()" style="background:#fff1f2;border:1px solid #fecdd3;border-radius:6px;padding:5px 10px;font-size:11px;font-weight:600;color:#be123c;cursor:pointer;">🗑️ Hapus Bukti</button></div></div></div>
                        <div id="mnv-new-file-upload-zone"><div style="position:relative;cursor:pointer;"><input type="file" id="mnv-bukti-file-input" accept=".jpg,.jpeg,.png,.pdf" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;z-index:2;" onchange="mnvHandleBuktiFileSelect(event)"><div id="mnv-file-upload-ui" style="border:2px dashed #e2e8f0;border-radius:8px;padding:16px;text-align:center;background:white;"><div style="font-size:24px;margin-bottom:4px;">📁</div><div style="font-size:13px;color:#64748b;"><strong style="color:#3b82f6;">Klik untuk pilih file</strong> atau drag & drop</div><div style="font-size:11px;color:#94a3b8;margin-top:4px;">JPG · PNG · PDF | Maks. 10 MB</div></div></div><div id="mnv-bukti-file-error" style="display:none;font-size:12px;color:#ef4444;margin-top:6px;padding:6px 10px;background:#fee2e2;border-radius:5px;"></div><div id="mnv-bukti-file-preview" style="display:none;align-items:center;gap:12px;background:white;border:1.5px solid #e2e8f0;border-radius:8px;padding:12px;margin-top:10px;"><div id="mnv-bukti-preview-icon" style="width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;background:#dbeafe;">📄</div><div style="flex:1;min-width:0;"><div id="mnv-bukti-preview-name" style="font-size:13px;font-weight:600;">—</div><div id="mnv-bukti-preview-size" style="font-size:11px;color:#94a3b8;margin-top:2px;">—</div></div><button onclick="mnvCancelNewFile()" style="background:none;border:none;cursor:pointer;color:#94a3b8;font-size:18px;padding:4px;">✕</button></div></div>
                        <div id="mnv-upload-progress" style="display:none;margin-top:10px;"><div style="height:4px;background:#e5e7eb;border-radius:10px;overflow:hidden;"><div id="mnv-upload-progress-fill" style="height:100%;background:linear-gradient(90deg,#3b82f6,#10b981);border-radius:10px;transition:width 0.3s;width:0%;"></div></div><div id="mnv-upload-progress-label" style="font-size:11px;color:#64748b;margin-top:4px;text-align:right;">Mengunggah...</div></div>
                    </div>
                </div>
                <div class="modal-footer"><button onclick="mnvCloseInputModal()" class="btn" style="flex:1;">Batal</button><button onclick="mnvSubmitInputNilai()" class="btn btn-success" style="flex:1;" id="mnv-submit-input-btn">💾 Simpan Penilaian</button></div>
            </div>
        </div>
        `;

        window.addEventListener('click', e => {
            if (e.target.id === 'mnv-inputModal') window.mnvCloseInputModal();
        });

        const cMonthName = MONTHS[new Date().getMonth()];
        if (cMonthName) {
            const iMonth = document.getElementById('mnv-select-bulan-input');
            const rMonth = document.getElementById('mnv-select-bulan-rekap');
            if (iMonth) iMonth.value = cMonthName;
            if (rMonth) rMonth.value = cMonthName;
        }

        window.mnvLoadDataFromServer();
    };
})();
