// ============================================================
// kearsipan.js — Kearsipan Internal section (SPA)
// Admin Panel — Dinas Koperasi UKM
// Menggunakan fetch() biasa (GAS doGet + JSON response)
// ============================================================
(function () {
    'use strict';

    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwYbUHgMtbcVrFk4H-j_Wfi___Ah4mLmBqF9ZvquFcZ9PSE8t4l-JDoTPRzvDJfgwX2Og/exec';
    const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    let masterDocuments = [], allDocuments = [];
    let documentsCurrentPage = 1;
    const itemsPerPage = 10;
    let currentUser = {};

    function normalizeMonth(str) {
        if (!str) return '';
        const s = str.trim().toLowerCase();
        return MONTHS_ID.find(m => m.toLowerCase() === s) || str;
    }

    // ── Load Documents ────────────────────────────────────────
    async function loadDocuments() {
        const tbody = document.getElementById('krs-docs-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="loading"><div class="spinner"></div><p style="margin-top:16px;">Memuat data...</p></td></tr>';
        try {
            const response = await fetch(`${APPS_SCRIPT_URL}?action=getDocuments`);
            const documents = await response.json();
            if (Array.isArray(documents)) {
                masterDocuments = documents;
                applyFilters();
                loadStats();
            }
        } catch (error) {
            if (window.showToast) showToast('Gagal memuat data kearsipan', 'error');
            if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#ef4444;">❌ Gagal memuat data.<br><button onclick="krsLoadDocuments()" class="btn" style="margin-top:12px;">🔄 Coba Lagi</button></td></tr>';
        }
    }
    window.krsLoadDocuments = loadDocuments;

    async function loadStats() {
        try {
            const response = await fetch(`${APPS_SCRIPT_URL}?action=getStats`);
            const stats = await response.json();
            const now = new Date();
            const curMonth = MONTHS_ID[now.getMonth()];
            const monthDocs = masterDocuments.filter(d => normalizeMonth(d.bulan).toLowerCase() === curMonth.toLowerCase());
            const pending = masterDocuments.filter(d => d.status !== 'ASSESSED').length;
            const assessed = masterDocuments.filter(d => d.status === 'ASSESSED');
            const avg = assessed.length ? (assessed.reduce((a, d) => a + (parseFloat(d.nilai) || 0), 0) / assessed.length) : 0;

            const el = id => document.getElementById(id);
            if (el('krs-avg-score')) el('krs-avg-score').textContent = avg.toFixed(1);
            if (el('krs-total-assessed')) el('krs-total-assessed').textContent = assessed.length;
            if (el('krs-this-month')) el('krs-this-month').textContent = monthDocs.length;
            if (el('krs-total-pending')) el('krs-total-pending').textContent = pending;
        } catch (e) {
            // Hitung dari masterDocuments
            const now = new Date();
            const curMonth = MONTHS_ID[now.getMonth()];
            const monthDocs = masterDocuments.filter(d => normalizeMonth(d.bulan).toLowerCase() === curMonth.toLowerCase());
            const pending = masterDocuments.filter(d => d.status !== 'ASSESSED').length;
            const assessed = masterDocuments.filter(d => d.status === 'ASSESSED');
            const avg = assessed.length ? (assessed.reduce((a, d) => a + (parseFloat(d.nilai) || 0), 0) / assessed.length) : 0;
            const el = id => document.getElementById(id);
            if (el('krs-avg-score')) el('krs-avg-score').textContent = avg.toFixed(1);
            if (el('krs-total-assessed')) el('krs-total-assessed').textContent = assessed.length;
            if (el('krs-this-month')) el('krs-this-month').textContent = monthDocs.length;
            if (el('krs-total-pending')) el('krs-total-pending').textContent = pending;
        }
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

    function resetFilters() {
        const el = id => document.getElementById(id);
        if (el('krs-bulan-filter')) el('krs-bulan-filter').value = '';
        if (el('krs-status-filter')) el('krs-status-filter').value = '';
        if (el('krs-search-input')) el('krs-search-input').value = '';
        applyFilters();
    }
    window.krsResetFilters = resetFilters;

    function renderActiveBadges(bulan, status, search) {
        const container = document.getElementById('krs-active-filters');
        if (!container) return;
        container.innerHTML = '';
        function makeBadge(text, onRemove) {
            const b = document.createElement('span'); b.className = 'filter-badge';
            b.innerHTML = `${text} <span class="filter-badge-clear" title="Hapus filter">×</span>`;
            b.querySelector('.filter-badge-clear').onclick = onRemove; return b;
        }
        if (bulan) container.appendChild(makeBadge('📅 ' + bulan, () => { document.getElementById('krs-bulan-filter').value = ''; applyFilters(); }));
        if (status) { const label = status === 'ASSESSED' ? 'Sudah Dinilai' : 'Pending'; container.appendChild(makeBadge('🔖 ' + label, () => { document.getElementById('krs-status-filter').value = ''; applyFilters(); })); }
        if (search) container.appendChild(makeBadge('🔍 "' + search + '"', () => { document.getElementById('krs-search-input').value = ''; applyFilters(); }));
        const info = document.getElementById('krs-results-info');
        if (info) { info.style.display = (bulan || status || search) ? 'block' : 'none'; info.textContent = `Menampilkan ${allDocuments.length} dari ${masterDocuments.length} dokumen`; }
    }

    // ── Render Table ──────────────────────────────────────────
    function renderPaginatedDocuments() {
        const tbody = document.getElementById('krs-docs-tbody');
        const cardsContainer = document.getElementById('krs-docs-cards');
        const pgn = document.getElementById('krs-docs-pagination');
        if (!tbody) return;
        if (allDocuments.length === 0) {
            const msg = masterDocuments.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8;">Tidak ada dokumen</td></tr>' : '<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8;">🔍 Tidak ada dokumen yang sesuai filter</td></tr>';
            tbody.innerHTML = msg;
            if (cardsContainer) cardsContainer.innerHTML = '<div style="text-align:center;padding:2rem;color:#64748b;">Data tidak ditemukan</div>';
            if (pgn) pgn.innerHTML = ''; return;
        }
        const totalPages = Math.ceil(allDocuments.length / itemsPerPage);
        const start = (documentsCurrentPage - 1) * itemsPerPage;
        const items = allDocuments.slice(start, start + itemsPerPage);
        tbody.innerHTML = items.map(doc => `<tr>
            <td style="font-size:.85rem;color:#64748b;">${doc.timestamp || '-'}</td>
            <td><div style="font-weight:600;">${doc.nama_pengirim || '-'}</div><div style="font-size:.75rem;color:#64748b;">${doc.unit || '-'}</div></td>
            <td>${doc.jenis_dokumen || '-'}</td>
            <td>${doc.bulan || '-'} ${doc.tahun || ''}</td>
            <td><span class="badge ${doc.status === 'ASSESSED' ? 'badge-assessed' : 'badge-pending'}">${doc.status === 'ASSESSED' ? 'Sudah Dinilai' : 'Pending'}</span></td>
            <td>${doc.nilai ? `<strong style="font-size:18px;color:#10b981;">${doc.nilai}</strong>` : '-'}</td>
            <td><div class="action-buttons">
                <a href="${doc.file_url}" target="_blank" class="btn btn-sm">👁️ Lihat</a>
                ${doc.status !== 'ASSESSED'
                ? `<button onclick="krsOpenAssess('${doc.id}')" class="btn btn-sm btn-success">✓ Nilai</button>`
                : `<button onclick="krsViewAssess('${doc.id}')" class="btn btn-sm">📊 Detail</button>
                       <button onclick="krsEditAssess('${doc.id}')" class="btn btn-sm btn-edit">✏️ Edit</button>`}
            </div></td>
        </tr>`).join('');
        if (cardsContainer) cardsContainer.innerHTML = items.map(doc => `<div class="requests-card">
            <div class="requests-card-header"><div style="flex:1;"><div class="requests-card-title">${doc.nama_pengirim || '-'}</div><div class="requests-card-subtitle">${doc.unit || '-'}</div></div>
            <span class="badge ${doc.status === 'ASSESSED' ? 'badge-assessed' : 'badge-pending'}">${doc.status === 'ASSESSED' ? 'Sudah Dinilai' : 'Pending'}</span></div>
            <div class="requests-card-body">
                <div class="requests-card-row"><span class="requests-card-label">Jenis</span><span class="requests-card-value">${doc.jenis_dokumen || '-'}</span></div>
                <div class="requests-card-row"><span class="requests-card-label">Periode</span><span class="requests-card-value">${doc.bulan || '-'} ${doc.tahun || ''}</span></div>
                ${doc.nilai ? `<div class="requests-card-row"><span class="requests-card-label">Nilai</span><span class="requests-card-value" style="font-size:18px;font-weight:700;color:#10b981;">${doc.nilai}</span></div>` : ''}
            </div>
            <div class="requests-card-footer"><div style="display:flex;gap:8px;">
                <a href="${doc.file_url}" target="_blank" class="btn btn-sm" style="flex:1;">👁️ Lihat</a>
                ${doc.status !== 'ASSESSED'
                ? `<button onclick="krsOpenAssess('${doc.id}')" class="btn btn-sm btn-success" style="flex:1;">✓ Nilai</button>`
                : `<button onclick="krsViewAssess('${doc.id}')" class="btn btn-sm" style="flex:1;">📊 Detail</button>`}
            </div></div>
        </div>`).join('');
        if (pgn) pgn.innerHTML = `<button onclick="krsChangePage(${documentsCurrentPage - 1})" ${documentsCurrentPage === 1 ? 'disabled' : ''}>‹ Prev</button>
            <span class="pagination-info">Halaman ${documentsCurrentPage} dari ${totalPages} (${allDocuments.length} data)</span>
            <button onclick="krsChangePage(${documentsCurrentPage + 1})" ${documentsCurrentPage === totalPages ? 'disabled' : ''}>Next ›</button>`;
    }
    window.krsChangePage = (page) => {
        const t = Math.ceil(allDocuments.length / itemsPerPage);
        if (page < 1 || page > t) return;
        documentsCurrentPage = page; renderPaginatedDocuments();
    };

    // ── Assessment Modal ──────────────────────────────────────
    window.krsOpenAssess = (docId) => openAssessmentModal(docId, false);
    window.krsEditAssess = (docId) => openAssessmentModal(docId, true);

    function openAssessmentModal(docId, isEdit) {
        const doc = allDocuments.find(d => d.id === docId) || masterDocuments.find(d => d.id === docId);
        if (!doc) return;
        const existingData = isEdit && doc.status === 'ASSESSED'
            ? { bukti_lengkap: doc.bukti_lengkap, bukti_benar: doc.bukti_benar, bukti_tepat_waktu: doc.bukti_tepat_waktu, hari_terlambat: doc.hari_terlambat || 0, sudah_srikandi: doc.sudah_srikandi, surat_sesuai_tnd: doc.surat_sesuai_tnd !== false, jumlah_surat_salah: doc.jumlah_surat_salah || 0, catatan: doc.catatan || '' }
            : { bukti_lengkap: false, bukti_benar: false, bukti_tepat_waktu: false, hari_terlambat: 0, sudah_srikandi: false, surat_sesuai_tnd: true, jumlah_surat_salah: 0, catatan: '' };
        // Remove existing modal
        document.getElementById('krs-assess-modal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'krs-assess-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `<div class="modal" style="max-width:600px;">
            <div class="modal-header"><h2 class="modal-title">${isEdit ? '✏️ Edit' : 'Nilai'} Dokumen Kearsipan</h2></div>
            <div class="modal-content">
                <div style="background:#f8fafc;padding:12px 16px;border-radius:8px;margin-bottom:20px;border-left:4px solid #3b82f6;">
                    <p style="font-weight:600;margin:0 0 4px;">${doc.nama_pengirim} — ${doc.unit}</p>
                    <p style="font-size:13px;color:#64748b;margin:0;">${doc.jenis_dokumen} · ${doc.bulan} ${doc.tahun}</p>
                </div>
                <!-- A. Bukti Dukung (maks 3 poin) -->
                <div style="margin-bottom:20px;padding:16px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;">
                    <div style="font-weight:600;font-size:14px;margin-bottom:12px;color:#1e3a5f;">A. Bukti Dukung <span style="color:#64748b;font-weight:400;">(maks 3 poin)</span></div>
                    <div class="form-group"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="krs-bukti-lengkap" ${existingData.bukti_lengkap ? 'checked' : ''}> Bukti dukung lengkap (+ 1 poin)</label></div>
                    <div class="form-group"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="krs-bukti-benar" ${existingData.bukti_benar ? 'checked' : ''}> Bukti sesuai ketentuan (+ 1 poin)</label></div>
                    <div class="form-group"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="krs-bukti-tepat-waktu" ${existingData.bukti_tepat_waktu ? 'checked' : ''}> Tepat waktu (+ 1 poin)</label></div>
                    <div class="form-group" id="krs-terlambat-group" style="display:${existingData.bukti_tepat_waktu ? 'none' : 'block'};margin-left:28px;">
                        <label class="input-label">Hari terlambat (pengurangan 0.1/hari)</label>
                        <input type="number" class="form-input" id="krs-hari-terlambat" value="${existingData.hari_terlambat}" min="0" max="30" style="width:100px;">
                    </div>
                </div>
                <!-- B. Srikandi (1 poin) -->
                <div style="margin-bottom:20px;padding:16px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;">
                    <div style="font-weight:600;font-size:14px;margin-bottom:12px;color:#1e3a5f;">B. Srikandi <span style="color:#64748b;font-weight:400;">(1 poin)</span></div>
                    <div class="form-group"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="krs-sudah-srikandi" ${existingData.sudah_srikandi ? 'checked' : ''}> Sudah ada di Srikandi (+ 1 poin)</label></div>
                </div>
                <!-- C. Surat Keluar (1 poin) -->
                <div style="margin-bottom:20px;padding:16px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;">
                    <div style="font-weight:600;font-size:14px;margin-bottom:12px;color:#1e3a5f;">C. Surat Keluar <span style="color:#64748b;font-weight:400;">(1 poin)</span></div>
                    <div style="display:flex;gap:16px;margin-bottom:8px;">
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="radio" name="krs-surat" value="sesuai" ${existingData.surat_sesuai_tnd ? 'checked' : ''}> Sesuai TND (+ 1 poin)</label>
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="radio" name="krs-surat" value="ada-salah" ${!existingData.surat_sesuai_tnd ? 'checked' : ''}> Ada surat salah</label>
                    </div>
                    <div id="krs-surat-salah-group" style="display:${existingData.surat_sesuai_tnd ? 'none' : 'block'};margin-left:8px;">
                        <label class="input-label">Jumlah surat salah (pengurangan 0.1/surat)</label>
                        <input type="number" class="form-input" id="krs-jumlah-surat-salah" value="${existingData.jumlah_surat_salah}" min="0" style="width:100px;">
                    </div>
                </div>
                <!-- Score Preview -->
                <div style="padding:16px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <span style="font-weight:700;font-size:16px;">Total Skor:</span>
                        <span style="font-size:28px;font-weight:800;color:#10b981;" id="krs-total-score">0.0</span>
                    </div>
                    <div style="display:flex;gap:16px;font-size:12px;color:#64748b;">
                        <span>Bukti: <strong id="krs-score-bukti">0.0</strong></span>
                        <span>Srikandi: <strong id="krs-score-srikandi">0.0</strong></span>
                        <span>Surat: <strong id="krs-score-surat">1.0</strong></span>
                    </div>
                </div>
                <div class="form-group"><label class="input-label">Catatan Tambahan (Opsional)</label><textarea class="form-input" name="krs-catatan" rows="3" placeholder="Tambahkan catatan..." style="resize:vertical;">${existingData.catatan}</textarea></div>
            </div>
            <div class="modal-footer">
                <button onclick="document.getElementById('krs-assess-modal').remove()" class="btn" style="flex:1;">Batal</button>
                <button onclick="krsSubmitAssessment('${docId}',${isEdit})" class="btn ${isEdit ? 'btn-warning' : 'btn-success'}" style="flex:1;" id="krs-submit-assess-btn">
                    ${isEdit ? '💾 Update Penilaian' : 'Simpan Penilaian'}
                </button>
            </div>
        </div>`;

        // Score updater
        function updateScore() {
            const buktiL = modal.querySelector('#krs-bukti-lengkap').checked ? 1 : 0;
            const buktiB = modal.querySelector('#krs-bukti-benar').checked ? 1 : 0;
            const tepatWaktu = modal.querySelector('#krs-bukti-tepat-waktu').checked;
            const hari = parseInt(modal.querySelector('#krs-hari-terlambat').value) || 0;
            const sb = buktiL + buktiB + (tepatWaktu ? 1 : Math.max(0, 1 - 0.1 * hari));
            const ss = modal.querySelector('#krs-sudah-srikandi').checked ? 1 : 0;
            const suratOpt = modal.querySelector('input[name="krs-surat"]:checked')?.value;
            const jumlahSuratSalah = parseInt(modal.querySelector('#krs-jumlah-surat-salah').value) || 0;
            const sk = suratOpt === 'ada-salah' ? Math.max(0, 1 - 0.1 * jumlahSuratSalah) : 1;
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
        modal.querySelectorAll('input[name="krs-surat"]').forEach(r => r.addEventListener('change', e => {
            modal.querySelector('#krs-surat-salah-group').style.display = e.target.value === 'ada-salah' ? 'block' : 'none';
            if (e.target.value === 'sesuai') modal.querySelector('#krs-jumlah-surat-salah').value = 0;
            updateScore();
        }));
        [modal.querySelector('#krs-bukti-lengkap'), modal.querySelector('#krs-bukti-benar'), modal.querySelector('#krs-hari-terlambat'),
        modal.querySelector('#krs-sudah-srikandi'), modal.querySelector('#krs-jumlah-surat-salah')].forEach(el => {
            el.addEventListener('change', updateScore); el.addEventListener('input', updateScore);
        });
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        updateScore();
        document.body.appendChild(modal);
    }

    window.krsSubmitAssessment = async (docId, isEdit) => {
        const modal = document.getElementById('krs-assess-modal');
        if (!modal) return;
        const buktiLengkap = document.getElementById('krs-bukti-lengkap').checked;
        const buktiBenar = document.getElementById('krs-bukti-benar').checked;
        const buktiTepatWaktu = document.getElementById('krs-bukti-tepat-waktu').checked;
        const hariTerlambat = document.getElementById('krs-hari-terlambat').value || 0;
        const sudahSrikandi = document.getElementById('krs-sudah-srikandi').checked;
        const suratOption = document.querySelector('input[name="krs-surat"]:checked').value;
        const suratSesuaiTND = suratOption === 'sesuai';
        const jumlahSuratSalah = suratSesuaiTND ? 0 : (document.getElementById('krs-jumlah-surat-salah').value || 0);
        const catatan = modal.querySelector('textarea[name="krs-catatan"]').value;
        const user = (window.AUTH && window.AUTH.getUser) ? window.AUTH.getUser() : {};

        const submitBtn = document.getElementById('krs-submit-assess-btn');
        const origText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;"></span> Menyimpan...';

        const params = new URLSearchParams({
            action: isEdit ? 'updateDocumentAssessment' : 'createDocumentAssessment',
            doc_id: docId, bukti_lengkap: buktiLengkap, bukti_benar: buktiBenar,
            bukti_tepat_waktu: buktiTepatWaktu, hari_terlambat: hariTerlambat,
            sudah_srikandi: sudahSrikandi, surat_sesuai_tnd: suratSesuaiTND,
            jumlah_surat_salah: jumlahSuratSalah, catatan, penilai_nama: user.name || 'Admin'
        });
        try {
            const response = await fetch(`${APPS_SCRIPT_URL}?${params}`);
            const result = await response.json();
            if (result.success) {
                if (window.showToast) showToast(`${isEdit ? 'Penilaian berhasil diupdate' : 'Penilaian berhasil'}! Skor: ${result.nilai}/5`, 'success');
                modal.remove();
                await loadDocuments();
            } else {
                if (window.showToast) showToast('Gagal: ' + result.message, 'error');
                submitBtn.disabled = false; submitBtn.innerHTML = origText;
            }
        } catch (error) {
            if (window.showToast) showToast('Error: ' + error.message, 'error');
            submitBtn.disabled = false; submitBtn.innerHTML = origText;
        }
    };

    window.krsViewAssess = (docId) => {
        const doc = allDocuments.find(d => d.id === docId) || masterDocuments.find(d => d.id === docId);
        if (!doc) return;
        document.getElementById('krs-view-modal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'krs-view-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.innerHTML = `<div class="modal"><div class="modal-header"><h2 class="modal-title">Detail Penilaian</h2></div>
            <div class="modal-content">
                <div style="text-align:center;padding:20px;">
                    <div style="font-size:56px;font-weight:700;color:#10b981;">${doc.nilai}</div>
                    <div style="font-size:14px;color:#64748b;margin-top:8px;">Dinilai oleh ${doc.penilai || 'Admin'}</div>
                </div>
                ${doc.catatan ? `<div style="padding:16px;background:#f8fafc;border-left:4px solid #3b82f6;border-radius:6px;white-space:pre-line;">${doc.catatan}</div>` : ''}
            </div>
            <div class="modal-footer">
                <button onclick="this.closest('.modal-overlay').remove()" class="btn" style="flex:1;">Tutup</button>
                <button onclick="this.closest('.modal-overlay').remove();krsEditAssess('${docId}')" class="btn btn-warning" style="flex:1;">✏️ Edit Penilaian</button>
            </div>
        </div>`;
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        document.body.appendChild(modal);
    };

    // ═══ Register & Render HTML ══════════════════════════════
    window.sectionInits = window.sectionInits || {};
    window.sectionInits['kearsipan'] = function () {
        const section = document.getElementById('section-kearsipan');
        if (!section) return;
        section.innerHTML = `
<div class="container">
    <div class="header">
        <h1 class="header-title">Penilaian Kearsipan Internal</h1>
        <p class="header-subtitle">Sistem penilaian 3 komponen: Bukti Dukung, Srikandi, dan Surat Keluar</p>
    </div>
    <div class="stats-grid">
        <div class="stat-card" style="border-left:4px solid #10b981;"><div class="stat-label">Nilai Rata-rata</div><div class="stat-value" id="krs-avg-score">0</div></div>
        <div class="stat-card" style="border-left:4px solid #3b82f6;"><div class="stat-label">Total Dinilai</div><div class="stat-value" id="krs-total-assessed">0</div></div>
        <div class="stat-card" style="border-left:4px solid #f59e0b;"><div class="stat-label">Bulan Ini</div><div class="stat-value" id="krs-this-month">0</div></div>
        <div class="stat-card" style="border-left:4px solid #8b5cf6;"><div class="stat-label">Pending</div><div class="stat-value" id="krs-total-pending">0</div></div>
    </div>
    <div class="card">
        <div class="card-header">
            <div class="card-header-top">
                <h2 class="card-title">Dokumen Kearsipan</h2>
                <div style="display:flex;gap:8px;">
                    <button onclick="krsResetFilters()" class="btn btn-sm" style="color:#64748b;">🗑️ Reset Filter</button>
                    <button onclick="krsLoadDocuments()" class="btn btn-sm">🔄 Refresh</button>
                </div>
            </div>
            <div class="filter-row">
                <div class="filter-group">
                    <span class="filter-label">Bulan:</span>
                    <select class="select-input month-select" id="krs-bulan-filter" onchange="krsApplyFilters()">
                        <option value="">Semua Bulan</option>
                        <option value="Januari">Januari</option><option value="Februari">Februari</option><option value="Maret">Maret</option><option value="April">April</option>
                        <option value="Mei">Mei</option><option value="Juni">Juni</option><option value="Juli">Juli</option><option value="Agustus">Agustus</option>
                        <option value="September">September</option><option value="Oktober">Oktober</option><option value="November">November</option><option value="Desember">Desember</option>
                    </select>
                </div>
                <div class="filter-group">
                    <span class="filter-label">Status:</span>
                    <select class="select-input" id="krs-status-filter" onchange="krsApplyFilters()">
                        <option value="">Semua Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="ASSESSED">Sudah Dinilai</option>
                    </select>
                </div>
                <div class="filter-group" style="flex:1;min-width:180px;">
                    <span class="filter-label">Cari:</span>
                    <input type="text" class="search-input" style="width:100%;" placeholder="Nama / unit / jenis..." id="krs-search-input" oninput="krsApplyFilters()">
                </div>
            </div>
        </div>
        <div class="active-filters" id="krs-active-filters"></div>
        <div class="results-info" id="krs-results-info" style="display:none;"></div>
        <div class="table-container">
            <table><thead><tr><th>Tanggal</th><th>Pengirim/Unit</th><th>Jenis Dokumen</th><th>Periode</th><th>Status</th><th>Nilai</th><th>Aksi</th></tr></thead>
            <tbody id="krs-docs-tbody"><tr><td colspan="7" class="loading"><div class="spinner"></div><p style="margin-top:16px;">Memuat data...</p></td></tr></tbody></table>
        </div>
        <div id="krs-docs-cards"></div>
        <div class="pagination" id="krs-docs-pagination"></div>
    </div>
</div>`;
        currentUser = (window.AUTH && window.AUTH.getUser) ? window.AUTH.getUser() || {} : {};
        loadDocuments();
    };
})();
