// ============================================================
// kearsipan.js — Kearsipan Internal section (SPA)
// Admin Panel — Dinas Koperasi UKM
// ============================================================
(function () {
    'use strict';

    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwYbUHgMtbcVrFk4H-j_Wfi___Ah4mLmBqF9ZvquFcZ9PSE8t4l-JDoTPRzvDJfgwX2Og/exec';
    const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    let masterDocuments = [], allDocuments = [];
    let documentsCurrentPage = 1;
    const itemsPerPage = 10;
    let currentUser = {};

    // ── SVG Icons ─────────────────────────────────────────────
    const ICONS = {
        refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
        check: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        x: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        eye: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
        edit: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
        link: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
    };

    // ── Modal helpers ─────────────────────────────────────────
    function openModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'flex'; }
    function closeModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }

    function normalizeMonth(str) {
        if (!str) return '';
        const s = str.trim().toLowerCase();
        return MONTHS_ID.find(m => m.toLowerCase() === s) || str;
    }

    // ── Auto-set bulan saat ini ───────────────────────────────
    function setCurrentMonth() {
        const el = document.getElementById('krs-bulan-filter');
        if (el && !el.value) {
            el.value = MONTHS_ID[new Date().getMonth()];
        }
    }

    // ── Load Documents ────────────────────────────────────────
    async function loadDocuments() {
        const tbody = document.getElementById('krs-docs-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="loading"><div class="spinner"></div><p style="margin-top:16px;">Memuat data...</p></td></tr>';
        try {
            const response = await fetch(`${APPS_SCRIPT_URL}?action=getDocuments`);
            const documents = await response.json();
            if (Array.isArray(documents)) {
                // simpan urutan asli, reverse untuk tampilan (terbaru di atas)
                masterDocuments = documents.slice().reverse();
                applyFilters();
                loadStats();
            }
        } catch (error) {
            if (window.showToast) showToast('Gagal memuat data kearsipan', 'error');
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#ef4444;">Gagal memuat data. <button onclick="krsLoadDocuments()" class="btn btn-sm" style="margin-left:8px;">Coba Lagi</button></td></tr>`;
        }
    }
    window.krsLoadDocuments = loadDocuments;

    async function loadStats() {
        try {
            const curMonth = MONTHS_ID[new Date().getMonth()];
            const monthDocs = masterDocuments.filter(d => normalizeMonth(d.bulan).toLowerCase() === curMonth.toLowerCase());
            const pending = masterDocuments.filter(d => d.status !== 'ASSESSED').length;
            const assessed = masterDocuments.filter(d => d.status === 'ASSESSED');
            const avg = assessed.length ? (assessed.reduce((a, d) => a + (parseFloat(d.nilai) || 0), 0) / assessed.length) : 0;

            const el = id => document.getElementById(id);
            if (el('krs-avg-score')) el('krs-avg-score').textContent = avg.toFixed(1);
            if (el('krs-total-assessed')) el('krs-total-assessed').textContent = assessed.length;
            if (el('krs-this-month')) el('krs-this-month').textContent = monthDocs.length;
            if (el('krs-total-pending')) el('krs-total-pending').textContent = pending;
        } catch (e) { }
    }

    // ── Filter Logic ──────────────────────────────────────────
    function applyFilters() {
        const bulan = document.getElementById('krs-bulan-filter')?.value || '';
        const status = document.getElementById('krs-status-filter')?.value || '';
        const search = (document.getElementById('krs-search-input')?.value || '').toLowerCase().trim();
        allDocuments = masterDocuments.filter(doc => {
            if (bulan) { const dm = normalizeMonth(doc.bulan); if (dm.toLowerCase() !== bulan.toLowerCase()) return false; }
            if (status && doc.status !== status) return false;
            if (search) { const text = `${doc.nama_pengirim} ${doc.unit} ${doc.jenis_dokumen} ${doc.bulan}`.toLowerCase(); if (!text.includes(search)) return false; }
            return true;
        });
        documentsCurrentPage = 1;
        renderActiveBadges(bulan, status, search);
        renderPaginatedDocuments();
    }
    window.krsApplyFilters = applyFilters;

    function renderActiveBadges(bulan, status, search) { }

    // ── Render Table ──────────────────────────────────────────
    function renderPaginatedDocuments() {
        const tbody = document.getElementById('krs-docs-tbody');
        const cards = document.getElementById('krs-docs-cards');
        const pgn = document.getElementById('krs-docs-pagination');
        if (!tbody) return;

        if (allDocuments.length === 0) {
            const msg = masterDocuments.length === 0
                ? '<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8;">Tidak ada dokumen</td></tr>'
                : '<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8;">🔍 Tidak ada dokumen yang sesuai filter</td></tr>';
            tbody.innerHTML = msg;
            if (cards) cards.innerHTML = '<div style="text-align:center;padding:2rem;color:#64748b;">Data tidak ditemukan</div>';
            if (pgn) pgn.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(allDocuments.length / itemsPerPage);
        const start = (documentsCurrentPage - 1) * itemsPerPage;
        const items = allDocuments.slice(start, start + itemsPerPage);

        // ── Desktop table ──────────────────────────────────────
        tbody.innerHTML = items.map(doc => {
            const isPending = doc.status !== 'ASSESSED';
            return `<tr>
                <td style="font-size:13px;color:#64748b;">${doc.timestamp || '-'}</td>
                <td>
                    <div style="font-weight:600;">${doc.nama_pengirim || '-'}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">${doc.unit || '-'}</div>
                </td>
                <td style="font-size:13px;">${doc.jenis_dokumen || '-'}</td>
                <td style="font-size:13px;">${doc.bulan || '-'} ${doc.tahun || ''}</td>
                <td>
                    <span class="badge ${doc.status === 'ASSESSED' ? 'badge-assessed' : 'badge-pending'}">
                        ${doc.status === 'ASSESSED' ? 'Sudah Dinilai' : 'Pending'}
                    </span>
                </td>
                <td>${doc.nilai ? `<strong style="font-size:16px;color:#10b981;">${doc.nilai}</strong>` : '-'}</td>
                <td>
                    <div class="action-buttons">
                        <div class="btn-icon-group">
                            <a href="${doc.file_url}" target="_blank" class="btn-icon btn-icon-view" title="Lihat File" rel="noopener noreferrer">${ICONS.link}</a>
                            ${isPending
                    ? `<button onclick="krsOpenAssess('${doc.id}')" class="btn-icon btn-icon-approve" title="Nilai Dokumen">${ICONS.check}</button>`
                    : `<button onclick="krsViewAssess('${doc.id}')" class="btn-icon btn-icon-view" title="Lihat Detail">${ICONS.eye}</button>
                               <button onclick="krsEditAssess('${doc.id}')" class="btn-icon btn-icon-edit" title="Edit Penilaian">${ICONS.edit}</button>`
                }
                        </div>
                    </div>
                </td>
            </tr>`;
        }).join('');

        // ── Mobile cards ───────────────────────────────────────
        if (cards) cards.innerHTML = items.map(doc => {
            const isPending = doc.status !== 'ASSESSED';
            return `<div class="requests-card">
                <div class="requests-card-header">
                    <div style="flex:1;">
                        <div class="requests-card-title">${doc.nama_pengirim || '-'}</div>
                        <div class="requests-card-subtitle">${doc.unit || '-'}</div>
                    </div>
                    <span class="badge ${doc.status === 'ASSESSED' ? 'badge-assessed' : 'badge-pending'}">
                        ${doc.status === 'ASSESSED' ? 'Dinilai' : 'Pending'}
                    </span>
                </div>
                <div class="requests-card-body">
                    <div class="requests-card-row"><span class="requests-card-label">Jenis</span><span class="requests-card-value">${doc.jenis_dokumen || '-'}</span></div>
                    <div class="requests-card-row"><span class="requests-card-label">Periode</span><span class="requests-card-value">${doc.bulan || '-'} ${doc.tahun || ''}</span></div>
                    ${doc.nilai ? `<div class="requests-card-row"><span class="requests-card-label">Nilai</span><span class="requests-card-value" style="font-size:16px;font-weight:700;color:#10b981;">${doc.nilai}</span></div>` : ''}
                </div>
                <div class="requests-card-footer">
                    <div class="action-buttons" style="justify-content:flex-end;">
                        <div class="btn-icon-group">
                            <a href="${doc.file_url}" target="_blank" class="btn-icon btn-icon-view" title="Lihat File" rel="noopener noreferrer">${ICONS.link}</a>
                            ${isPending
                    ? `<button onclick="krsOpenAssess('${doc.id}')" class="btn-icon btn-icon-approve" title="Nilai Dokumen">${ICONS.check}</button>`
                    : `<button onclick="krsViewAssess('${doc.id}')" class="btn-icon btn-icon-view" title="Lihat Detail">${ICONS.eye}</button>
                               <button onclick="krsEditAssess('${doc.id}')" class="btn-icon btn-icon-edit" title="Edit Penilaian">${ICONS.edit}</button>`
                }
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');

        if (pgn) pgn.innerHTML = `
            <button onclick="krsChangePage(${documentsCurrentPage - 1})" ${documentsCurrentPage === 1 ? 'disabled' : ''}>&#8249; Prev</button>
            <span class="pagination-info">Halaman ${documentsCurrentPage} dari ${totalPages} (${allDocuments.length} data)</span>
            <button onclick="krsChangePage(${documentsCurrentPage + 1})" ${documentsCurrentPage === totalPages ? 'disabled' : ''}>Next &#8250;</button>`;
    }

    window.krsChangePage = (page) => {
        const t = Math.ceil(allDocuments.length / itemsPerPage);
        if (page < 1 || page > t) return;
        documentsCurrentPage = page;
        renderPaginatedDocuments();
    };

    // ═══════════════════════════════════════════════════════════
    // ASSESSMENT MODAL
    // ═══════════════════════════════════════════════════════════
    window.krsOpenAssess = (docId) => openAssessmentModal(docId, false);
    window.krsEditAssess = (docId) => openAssessmentModal(docId, true);

    function openAssessmentModal(docId, isEdit) {
        const doc = allDocuments.find(d => d.id === docId) || masterDocuments.find(d => d.id === docId);
        if (!doc) return;

        const existingData = (isEdit && doc.status === 'ASSESSED')
            ? {
                bukti_lengkap: doc.bukti_lengkap !== false,
                bukti_benar: doc.bukti_benar !== false,
                bukti_tepat_waktu: doc.bukti_tepat_waktu !== false,
                hari_terlambat: doc.hari_terlambat || 0,
                sudah_srikandi: doc.sudah_srikandi !== false,
                surat_sesuai_tnd: doc.surat_sesuai_tnd !== false,
                jumlah_surat_salah: doc.jumlah_surat_salah || 0,
                catatan: doc.catatan || ''
            }
            : {
                bukti_lengkap: true, bukti_benar: true, bukti_tepat_waktu: true,
                hari_terlambat: 0, sudah_srikandi: true,
                surat_sesuai_tnd: true, jumlah_surat_salah: 0, catatan: ''
            };

        document.getElementById('krs-assessModal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'krs-assessModal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';

        modal.innerHTML = `
        <div class="modal" style="max-width:600px;">
            <div class="modal-header">
                <h2 class="modal-title">${isEdit ? '✏️ Edit' : '✓ Nilai'} Dokumen Kearsipan</h2>
            </div>
            <div class="modal-content">
                <div class="info-box" style="margin-bottom:20px;">
                    <p style="font-weight:600;margin:0 0 4px;">${doc.nama_pengirim} — ${doc.unit}</p>
                    <p style="font-size:13px;color:#64748b;margin:0;">${doc.jenis_dokumen} · ${doc.bulan} ${doc.tahun || ''}</p>
                </div>
                <div class="alert alert-info" style="margin-bottom:20px;">
                    📋 <strong>Sistem Penilaian:</strong> Bukti Dukung (3 poin) + Srikandi (1 poin) + Surat Keluar (1 poin) = <strong>Total 5 poin</strong>
                </div>
                <!-- 1. Bukti Dukung -->
                <div class="score-section">
                    <div class="score-section-title">1️⃣ Bukti Dukung <span style="font-weight:400;color:#64748b;font-size:13px;">(maks 3 poin)</span></div>
                    <div class="checkbox-container">
                        <input type="checkbox" id="krs-bukti-lengkap" ${existingData.bukti_lengkap ? 'checked' : ''}>
                        <label for="krs-bukti-lengkap" style="cursor:pointer;font-size:14px;">Bukti dukung lengkap (+1 poin)</label>
                    </div>
                    <div class="checkbox-container">
                        <input type="checkbox" id="krs-bukti-benar" ${existingData.bukti_benar ? 'checked' : ''}>
                        <label for="krs-bukti-benar" style="cursor:pointer;font-size:14px;">Bukti sesuai ketentuan (+1 poin)</label>
                    </div>
                    <div class="checkbox-container">
                        <input type="checkbox" id="krs-bukti-tepat-waktu" ${existingData.bukti_tepat_waktu ? 'checked' : ''}>
                        <label for="krs-bukti-tepat-waktu" style="cursor:pointer;font-size:14px;">Tepat waktu (+1 poin)</label>
                    </div>
                    <div class="form-group" id="krs-terlambat-group" style="display:${existingData.bukti_tepat_waktu ? 'none' : 'block'};margin-left:26px;margin-top:4px;">
                        <label class="input-label">Hari terlambat <span style="color:#64748b;">(−0.1 per hari)</span></label>
                        <input type="number" class="form-input" id="krs-hari-terlambat" value="${existingData.hari_terlambat}" min="0" max="30" style="width:120px;">
                    </div>
                </div>
                <!-- 2. Srikandi -->
                <div class="score-section" style="border-left-color:#8b5cf6;">
                    <div class="score-section-title">2️⃣ Srikandi <span style="font-weight:400;color:#64748b;font-size:13px;">(1 poin)</span></div>
                    <div class="checkbox-container">
                        <input type="checkbox" id="krs-sudah-srikandi" ${existingData.sudah_srikandi ? 'checked' : ''}>
                        <label for="krs-sudah-srikandi" style="cursor:pointer;font-size:14px;">Sudah ada di Srikandi (+1 poin)</label>
                    </div>
                </div>
                <!-- 3. Surat Keluar -->
                <div class="score-section" style="border-left-color:#f59e0b;">
                    <div class="score-section-title">3️⃣ Surat Keluar sesuai TND <span style="font-weight:400;color:#64748b;font-size:13px;">(1 poin)</span></div>
                    <div class="checkbox-container">
                        <input type="checkbox" id="krs-surat-sesuai-tnd" ${existingData.surat_sesuai_tnd ? 'checked' : ''}>
                        <label for="krs-surat-sesuai-tnd" style="cursor:pointer;font-size:14px;">Semua surat sesuai TND (+1 poin)</label>
                    </div>
                    <div class="form-group" id="krs-surat-salah-group" style="display:${existingData.surat_sesuai_tnd ? 'none' : 'block'};margin-left:26px;margin-top:4px;">
                        <label class="input-label">Jumlah surat tidak sesuai TND <span style="color:#64748b;">(−0.1 per surat)</span></label>
                        <input type="number" class="form-input" id="krs-jumlah-surat-salah" value="${existingData.jumlah_surat_salah}" min="0" style="width:120px;">
                    </div>
                </div>
                <!-- Score Preview -->
                <div class="score-preview">
                    <div class="score-preview-title">TOTAL SKOR</div>
                    <div class="score-preview-value" id="krs-total-score">5.0</div>
                    <div class="score-breakdown">
                        <div class="score-item"><div class="score-item-label">Bukti Dukung</div><div class="score-item-value" id="krs-score-bukti">3.0</div></div>
                        <div class="score-item"><div class="score-item-label">Srikandi</div><div class="score-item-value" id="krs-score-srikandi">1.0</div></div>
                        <div class="score-item"><div class="score-item-label">Surat Keluar</div><div class="score-item-value" id="krs-score-surat">1.0</div></div>
                    </div>
                </div>
                <!-- Catatan -->
                <div class="form-group">
                    <label class="input-label">Catatan Tambahan (Opsional)</label>
                    <textarea class="form-textarea" name="krs-catatan" rows="3" placeholder="Tambahkan catatan...">${existingData.catatan}</textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button onclick="document.getElementById('krs-assessModal').remove()" class="btn" style="flex:1;">Batal</button>
                <button onclick="krsSubmitAssessment('${docId}', ${isEdit})" id="krs-submit-assess-btn"
                    class="btn ${isEdit ? 'btn-warning' : 'btn-success'}" style="flex:1;">
                    ${isEdit ? '💾 Update Penilaian' : `${ICONS.check} Simpan Penilaian`}
                </button>
            </div>
        </div>`;

        function updateScore() {
            const bl = modal.querySelector('#krs-bukti-lengkap').checked ? 1 : 0;
            const bb = modal.querySelector('#krs-bukti-benar').checked ? 1 : 0;
            const btw = modal.querySelector('#krs-bukti-tepat-waktu').checked;
            const hari = parseInt(modal.querySelector('#krs-hari-terlambat').value) || 0;
            const sb = bl + bb + (btw ? 1 : Math.max(0, 1 - 0.1 * hari));
            const ss = modal.querySelector('#krs-sudah-srikandi').checked ? 1 : 0;
            const sesuai = modal.querySelector('#krs-surat-sesuai-tnd').checked;
            const jss = parseInt(modal.querySelector('#krs-jumlah-surat-salah').value) || 0;
            const sk = sesuai ? 1 : Math.max(0, 1 - 0.1 * jss);
            const total = sb + ss + sk;
            modal.querySelector('#krs-score-bukti').textContent = sb.toFixed(1);
            modal.querySelector('#krs-score-srikandi').textContent = ss.toFixed(1);
            modal.querySelector('#krs-score-surat').textContent = sk.toFixed(1);
            modal.querySelector('#krs-total-score').textContent = total.toFixed(1);
        }

        modal.querySelector('#krs-bukti-tepat-waktu').addEventListener('change', e => {
            modal.querySelector('#krs-terlambat-group').style.display = e.target.checked ? 'none' : 'block';
            if (e.target.checked) modal.querySelector('#krs-hari-terlambat').value = 0;
            updateScore();
        });
        modal.querySelector('#krs-surat-sesuai-tnd').addEventListener('change', e => {
            modal.querySelector('#krs-surat-salah-group').style.display = e.target.checked ? 'none' : 'block';
            if (e.target.checked) modal.querySelector('#krs-jumlah-surat-salah').value = 0;
            updateScore();
        });
        ['#krs-bukti-lengkap', '#krs-bukti-benar', '#krs-sudah-srikandi'].forEach(sel => {
            modal.querySelector(sel).addEventListener('change', updateScore);
        });
        ['#krs-hari-terlambat', '#krs-jumlah-surat-salah'].forEach(sel => {
            modal.querySelector(sel).addEventListener('input', updateScore);
            modal.querySelector(sel).addEventListener('change', updateScore);
        });

        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        updateScore();
        document.body.appendChild(modal);
    }

    // ── Submit Assessment ─────────────────────────────────────
    window.krsSubmitAssessment = async (docId, isEdit) => {
        const modal = document.getElementById('krs-assessModal');
        if (!modal) return;

        const buktiLengkap = modal.querySelector('#krs-bukti-lengkap').checked;
        const buktiBenar = modal.querySelector('#krs-bukti-benar').checked;
        const buktiTepatWaktu = modal.querySelector('#krs-bukti-tepat-waktu').checked;
        const hariTerlambat = modal.querySelector('#krs-hari-terlambat').value || 0;
        const sudahSrikandi = modal.querySelector('#krs-sudah-srikandi').checked;
        const suratSesuaiTND = modal.querySelector('#krs-surat-sesuai-tnd').checked;
        const jumlahSuratSalah = suratSesuaiTND ? 0 : (modal.querySelector('#krs-jumlah-surat-salah').value || 0);
        const catatan = modal.querySelector('textarea[name="krs-catatan"]').value;
        const user = (window.AUTH && window.AUTH.getUser) ? window.AUTH.getUser() : {};

        const btn = document.getElementById('krs-submit-assess-btn');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan...';

        const params = new URLSearchParams({
            action: isEdit ? 'updateDocumentAssessment' : 'createDocumentAssessment',
            doc_id: docId,
            bukti_lengkap: buktiLengkap, bukti_benar: buktiBenar,
            bukti_tepat_waktu: buktiTepatWaktu, hari_terlambat: hariTerlambat,
            sudah_srikandi: sudahSrikandi, surat_sesuai_tnd: suratSesuaiTND,
            jumlah_surat_salah: jumlahSuratSalah, catatan,
            penilai_nama: user.name || 'Admin'
        });

        try {
            const response = await fetch(`${APPS_SCRIPT_URL}?${params}`);
            const result = await response.json();
            if (result.success) {
                if (window.showToast) showToast(`${isEdit ? 'Penilaian berhasil diupdate' : 'Penilaian berhasil disimpan'}! Skor: ${result.nilai}/5`, 'success');
                modal.remove();
                await loadDocuments();
            } else {
                if (window.showToast) showToast('Gagal: ' + result.message, 'error');
                btn.disabled = false; btn.innerHTML = orig;
            }
        } catch (error) {
            if (window.showToast) showToast('Error: ' + error.message, 'error');
            btn.disabled = false; btn.innerHTML = orig;
        }
    };

    // ── View Assessment Detail ────────────────────────────────
    window.krsViewAssess = (docId) => {
        const doc = allDocuments.find(d => d.id === docId) || masterDocuments.find(d => d.id === docId);
        if (!doc) return;

        document.getElementById('krs-viewModal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'krs-viewModal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `
        <div class="modal">
            <div class="modal-header"><h2 class="modal-title">Detail Penilaian</h2></div>
            <div class="modal-content">
                <div class="info-box" style="margin-bottom:20px;">
                    <p style="font-weight:600;margin:0 0 4px;">${doc.nama_pengirim} — ${doc.unit}</p>
                    <p style="font-size:13px;color:#64748b;margin:0;">${doc.jenis_dokumen} · ${doc.bulan} ${doc.tahun || ''}</p>
                </div>
                <div style="text-align:center;padding:20px 0;">
                    <div style="font-size:56px;font-weight:700;color:#10b981;line-height:1;">${doc.nilai}</div>
                    <div style="font-size:14px;color:#64748b;margin-top:8px;">dari 5.0 &nbsp;·&nbsp; Dinilai oleh ${doc.penilai || 'Admin'}</div>
                </div>
                ${doc.catatan ? `<div style="padding:16px;background:#f8fafc;border-left:4px solid #3b82f6;border-radius:6px;white-space:pre-line;font-size:14px;">${doc.catatan}</div>` : ''}
            </div>
            <div class="modal-footer">
                <button onclick="document.getElementById('krs-viewModal').remove()" class="btn" style="flex:1;">Tutup</button>
                <button onclick="document.getElementById('krs-viewModal').remove();krsEditAssess('${docId}')" class="btn btn-warning" style="flex:1;">✏️ Edit Penilaian</button>
            </div>
        </div>`;
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        document.body.appendChild(modal);
    };

    // ═══════════════════════════════════════════════════════════
    // REGISTER SECTION & INJECT HTML
    // ═══════════════════════════════════════════════════════════
    window.sectionInits = window.sectionInits || {};
    window.sectionInits['kearsipan'] = function () {
        const section = document.getElementById('section-kearsipan');
        if (!section) return;

        section.innerHTML = `
<style>
/* ─── KRS local styles ─── */
.score-section {
    background: #f8fafc; padding: 16px; border-radius: 8px;
    margin-bottom: 16px; border-left: 4px solid #3b82f6;
}
.score-section-title { font-weight: 600; color: #1e293b; margin-bottom: 12px; font-size: 15px; }
.score-preview {
    background: white; padding: 20px; border-radius: 8px;
    margin-bottom: 16px; border: 2px solid #e5e7eb;
}
.score-preview-title { font-size: 13px; color: #64748b; margin-bottom: 8px; text-align: center; }
.score-preview-value { font-size: 36px; font-weight: 700; color: #0f172a; text-align: center; }
.score-breakdown { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 12px; }
.score-item { text-align: center; padding: 12px; background: #f8fafc; border-radius: 6px; }
.score-item-label { font-size: 11px; color: #64748b; margin-bottom: 4px; }
.score-item-value { font-size: 20px; font-weight: 700; color: #1e293b; }
.checkbox-container { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.checkbox-container input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: #0f172a; }
.form-textarea {
    width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 6px;
    font-size: 14px; font-family: inherit; resize: vertical; outline: none; transition: border-color 0.15s;
}
.form-textarea:focus { border-color: #0f172a; box-shadow: 0 0 0 3px rgba(15,23,42,0.08); }
.alert { padding: 12px 16px; border-radius: 6px; font-size: 13px; }
.alert-info { background: #eff6ff; border-left: 4px solid #3b82f6; color: #1e3a8a; }
.info-box { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 16px; }
.section-page-header { margin-bottom:28px; padding-bottom:20px; border-bottom:1px solid #f1f5f9; }
.section-page-title { font-size:22px; font-weight:700; color:#0f172a; margin-bottom:4px; }
.section-page-subtitle { font-size:14px; color:#64748b; }
</style>

<div class="container">

    <div class="section-page-header">
        <h1 class="section-page-title">Penilaian Kearsipan Internal</h1>
        <p class="section-page-subtitle">Sistem penilaian 3 komponen: Bukti Dukung, Srikandi, Surat Keluar</p>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
        <div class="stat-card" style="border-left:4px solid #10b981;">
            <div class="stat-label">Nilai Rata-rata</div>
            <div class="stat-value" id="krs-avg-score">0</div>
            <div class="stat-footer">Dari dokumen dinilai</div>
        </div>
        <div class="stat-card" style="border-left:4px solid #3b82f6;">
            <div class="stat-label">Total Dinilai</div>
            <div class="stat-value" id="krs-total-assessed">0</div>
            <div class="stat-footer">Dokumen</div>
        </div>
        <div class="stat-card" style="border-left:4px solid #f59e0b;">
            <div class="stat-label">Bulan Ini</div>
            <div class="stat-value" id="krs-this-month">0</div>
            <div class="stat-footer">Pengumpulan</div>
        </div>
        <div class="stat-card" style="border-left:4px solid #8b5cf6;">
            <div class="stat-label">Pending</div>
            <div class="stat-value" id="krs-total-pending">0</div>
            <div class="stat-footer">Menunggu penilaian</div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <h2 class="card-title">Dokumen Kearsipan</h2>
            <div class="filter-container">
                <select class="select-input" id="krs-bulan-filter" onchange="krsApplyFilters()">
                    <option value="">Semua Bulan</option>
                    <option value="Januari">Januari</option><option value="Februari">Februari</option>
                    <option value="Maret">Maret</option><option value="April">April</option>
                    <option value="Mei">Mei</option><option value="Juni">Juni</option>
                    <option value="Juli">Juli</option><option value="Agustus">Agustus</option>
                    <option value="September">September</option><option value="Oktober">Oktober</option>
                    <option value="November">November</option><option value="Desember">Desember</option>
                </select>
                <select class="select-input" id="krs-status-filter" onchange="krsApplyFilters()">
                    <option value="">Semua Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="ASSESSED">Sudah Dinilai</option>
                </select>
                <input type="text" class="search-input" id="krs-search-input" placeholder="Cari nama / unit / jenis..." oninput="krsApplyFilters()">
                <button onclick="krsLoadDocuments()" class="btn btn-sm btn-action-view" title="Refresh Data">${ICONS.refresh} Refresh</button>
            </div>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Tanggal</th>
                        <th>Pengirim / Unit</th>
                        <th>Jenis Dokumen</th>
                        <th>Periode</th>
                        <th>Status</th>
                        <th>Nilai</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody id="krs-docs-tbody">
                    <tr><td colspan="7" class="loading"><div class="spinner"></div><p style="margin-top:16px;">Memuat data...</p></td></tr>
                </tbody>
            </table>
        </div>
        <div id="krs-docs-cards"></div>
        <div class="pagination" id="krs-docs-pagination"></div>
    </div>
</div>`;

        currentUser = (window.AUTH && window.AUTH.getUser) ? window.AUTH.getUser() || {} : {};
        // Set bulan saat ini sebelum loadDocuments → applyFilters otomatis pakai bulan ini
        setCurrentMonth();
        loadDocuments();
    };

})();