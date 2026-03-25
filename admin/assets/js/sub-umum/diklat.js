// ============================================================
// diklat.js — Diklat Training Management Section (SPA)
// Admin Panel — Dinas Koperasi UKM
// ============================================================
(function () {
    'use strict';

    const API_URL = 'https://script.google.com/macros/s/AKfycby57ETxcwllJcTNCptwnZKW7EJ8PVrbqewUhxaUHGDYP3SO8TuvNofGeHfciXddvbhaVg/exec';

    const QUARTERS = [
        { key: 'triwulan1', label: 'Triwulan I',   sub: 'Jan – Mar', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', icon: '🌱' },
        { key: 'triwulan2', label: 'Triwulan II',  sub: 'Apr – Jun', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', icon: '☀️' },
        { key: 'triwulan3', label: 'Triwulan III', sub: 'Jul – Sep', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: '🍂' },
        { key: 'triwulan4', label: 'Triwulan IV',  sub: 'Okt – Des', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', icon: '❄️' }
    ];

    let masterDiklat      = [];
    let allDiklat         = [];
    let diklatCurrentPage = 1;
    const itemsPerPage    = 10;
    let editingId         = null;
    let fileData          = [{}, {}, {}, {}];

    const ICONS = {
        refresh: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
        plus:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
        eye:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
        edit:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
        trash:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
        check:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    };

    // ══════════════════════════════════════════════════════════
    // ★ API — JSONP saja (tidak pakai fetch agar tidak kena CORS)
    //
    // Untuk upload file besar: base64 dikirim lewat parameter
    // "fileData" di JSONP. GAS doGet() membacanya dari e.parameter.
    // Batas URL GAS ~8000 karakter per parameter; file 5MB base64
    // = ~6.7MB → terlalu besar untuk satu request.
    //
    // Solusi: batasi upload 500KB di frontend, atau pakai
    // Google Drive picker di sisi user dan hanya kirim link.
    // Untuk kebutuhan saat ini (≤500KB) JSONP sudah cukup.
    // ══════════════════════════════════════════════════════════
    function apiCall(params) {
        return new Promise((resolve, reject) => {
            const cbName = 'dklatCb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
            const timeout = setTimeout(() => {
                delete window[cbName];
                reject(new Error('Request timeout'));
            }, 60000); // 60 detik untuk upload

            window[cbName] = function (data) {
                clearTimeout(timeout);
                delete window[cbName];
                resolve(data);
            };

            // Bangun query string — fileData dikirim langsung sebagai param
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
                try { document.head.removeChild(script); } catch (_) {}
                reject(new Error('Network error — cek koneksi atau GAS deployment'));
            };
            document.head.appendChild(script);
            setTimeout(() => { try { document.head.removeChild(script); } catch (_) {} }, 65000);
        });
    }

    // ══════════════════════════════════════════════════════════
    // ★ NORMALISE
    // ══════════════════════════════════════════════════════════
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
                    link:        raw,
                    fileName:    _fileNameFromUrl(raw),
                    fileDataUrl: isDriveImg ? raw : null,
                };
            }
        });
        return row;
    }

    function _fileNameFromUrl(url) {
        if (!url) return null;
        try {
            const u    = new URL(url);
            const path = u.pathname.split('/').filter(Boolean);
            const last = path[path.length - 1];
            if (last && last.length < 100 && last.includes('.')) return last;
        } catch (_) {}
        return 'File';
    }

    // ══════════════════════════════════════════════════════════
    // ★ LOAD
    // ══════════════════════════════════════════════════════════
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
            console.error('[Diklat] loadDiklat error:', e);
            masterDiklat = [];
            _toast('Gagal terhubung ke server: ' + e.message, 'error');
        }
        allDiklat         = [...masterDiklat];
        diklatCurrentPage = 1;
        renderStats();
        renderPaginatedDiklat();
    }
    window.diklatLoad = loadDiklat;

    function _setTableLoading(on) {
        const tbody = document.getElementById('dklat-tbody');
        if (tbody && on) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8;">
            <span class="spinner"></span> Memuat data...
        </td></tr>`;
    }

    // ══════════════════════════════════════════════════════════
    // ★ STATS
    // ══════════════════════════════════════════════════════════
    function renderStats() {
        let lengkap = 0, sebagian = 0, kosong = 0;
        masterDiklat.forEach(d => {
            const filled = QUARTERS.filter(q => {
                const qd = d[q.key] || {};
                return qd.link || qd.fileName || qd.fileDataUrl;
            }).length;
            if (filled === 4)    lengkap++;
            else if (filled > 0) sebagian++;
            else                 kosong++;
        });
        const el = id => document.getElementById(id);
        if (el('dklat-stat-total'))    el('dklat-stat-total').textContent    = masterDiklat.length;
        if (el('dklat-stat-lengkap'))  el('dklat-stat-lengkap').textContent  = lengkap;
        if (el('dklat-stat-sebagian')) el('dklat-stat-sebagian').textContent = sebagian;
        if (el('dklat-stat-kosong'))   el('dklat-stat-kosong').textContent   = kosong;
    }

    // ══════════════════════════════════════════════════════════
    // ★ FILTER
    // ══════════════════════════════════════════════════════════
    function diklatApplyFilter() {
        const q = (document.getElementById('dklat-search')?.value || '').toLowerCase().trim();
        allDiklat = masterDiklat.filter(d =>
            (d.nama || '').toLowerCase().includes(q) ||
            (d.unit || '').toLowerCase().includes(q)
        );
        diklatCurrentPage = 1;
        renderPaginatedDiklat();
    }
    window.diklatApplyFilter = diklatApplyFilter;

    // ══════════════════════════════════════════════════════════
    // ★ RENDER TABLE
    // ══════════════════════════════════════════════════════════
    function _qdBadge(qd, q) {
        const hasImg  = qd.fileDataUrl && (qd.fileDataUrl.startsWith('data:image') || qd.fileDataUrl.includes('thumbnail'));
        const hasLink = !!qd.link;
        const hasFile = !!qd.fileName && !hasImg;
        if (hasImg)  return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;background:${q.bg};color:${q.color};border:1px solid ${q.border};">🖼️ Gambar</span>`;
        if (hasFile) return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;background:${q.bg};color:${q.color};border:1px solid ${q.border};">${hasLink ? '🔗 Link' : '📄 File'}</span>`;
        return `<span style="font-size:12px;color:#cbd5e1;padding:3px 10px;">—</span>`;
    }

    function renderPaginatedDiklat() {
        const tbody = document.getElementById('dklat-tbody');
        const cards = document.getElementById('dklat-cards');
        const pgn   = document.getElementById('dklat-pagination');
        if (!tbody) return;

        if (allDiklat.length === 0) {
            const msg = masterDiklat.length === 0
                ? 'Belum ada data diklat. Klik <strong>+ Tambah Data</strong> untuk memulai.'
                : 'Tidak ada data yang sesuai pencarian.';
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8;font-size:14px;">${msg}</td></tr>`;
            if (cards) cards.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;">${msg}</div>`;
            if (pgn)   pgn.innerHTML   = '';
            return;
        }

        const totalPages = Math.ceil(allDiklat.length / itemsPerPage);
        const start      = (diklatCurrentPage - 1) * itemsPerPage;
        const items      = allDiklat.slice(start, start + itemsPerPage);

        tbody.innerHTML = items.map((d, i) => {
            const no     = start + i + 1;
            const qCells = QUARTERS.map(q => `<td style="text-align:center;">${_qdBadge(d[q.key] || {}, q)}</td>`).join('');
            return `<tr>
                <td style="color:#94a3b8;font-size:12px;">${no}</td>
                <td><strong>${d.nama || '—'}</strong></td>
                <td style="color:#64748b;font-size:13px;">${d.unit || '—'}</td>
                ${qCells}
                <td>
                    <div class="action-buttons"><div class="btn-icon-group">
                        <button onclick="diklatOpenDetail('${d.id}')"  class="btn-icon btn-icon-view"   title="Detail">${ICONS.eye}</button>
                        <button onclick="diklatOpenEdit('${d.id}')"    class="btn-icon btn-icon-edit"   title="Edit">${ICONS.edit}</button>
                        <button onclick="diklatDelete('${d.id}',this)" class="btn-icon btn-icon-delete" title="Hapus">${ICONS.trash}</button>
                    </div></div>
                </td>
            </tr>`;
        }).join('');

        if (cards) {
            cards.innerHTML = items.map(d => {
                const qRows = QUARTERS.map(q => {
                    const qd  = d[q.key] || {};
                    const has = qd.fileDataUrl ? '🖼️' : qd.link ? '🔗' : qd.fileName ? '📄' : null;
                    return `<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid #f1f5f9;">
                        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8;min-width:84px;">${q.label}</span>
                        ${has
                            ? `<span style="font-size:12px;font-weight:600;padding:2px 8px;border-radius:12px;background:${q.bg};color:${q.color};">${has} Ada</span>`
                            : `<span style="font-size:12px;color:#cbd5e1;">—</span>`}
                    </div>`;
                }).join('');
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
                            <button onclick="diklatOpenDetail('${d.id}')"  class="btn-icon btn-icon-view">${ICONS.eye}</button>
                            <button onclick="diklatOpenEdit('${d.id}')"    class="btn-icon btn-icon-edit">${ICONS.edit}</button>
                            <button onclick="diklatDelete('${d.id}',this)" class="btn-icon btn-icon-delete">${ICONS.trash}</button>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }

        if (pgn) pgn.innerHTML = `
            <button onclick="diklatChangePage(${diklatCurrentPage - 1})" ${diklatCurrentPage === 1 ? 'disabled' : ''}>&#8249; Prev</button>
            <span class="pagination-info">Halaman ${diklatCurrentPage} dari ${totalPages} (${allDiklat.length} data)</span>
            <button onclick="diklatChangePage(${diklatCurrentPage + 1})" ${diklatCurrentPage === totalPages ? 'disabled' : ''}>Next &#8250;</button>`;
    }

    window.diklatChangePage = (page) => {
        const t = Math.ceil(allDiklat.length / itemsPerPage);
        if (page < 1 || page > t) return;
        diklatCurrentPage = page;
        renderPaginatedDiklat();
    };

    // ══════════════════════════════════════════════════════════
    // ★ MODAL HELPERS
    // ══════════════════════════════════════════════════════════
    function _openModal(id)  { const el = document.getElementById(id); if (el) el.style.display = 'flex'; }
    function _closeModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
    window.diklatCloseModal  = (id) => _closeModal(id);

    // ══════════════════════════════════════════════════════════
    // ★ FORM — ADD
    // ══════════════════════════════════════════════════════════
    window.diklatOpenAdd = function () {
        editingId = null;
        fileData  = [{}, {}, {}, {}];
        document.getElementById('dklat-modal-title').textContent = 'Tambah Data Diklat';
        document.getElementById('dklat-form-nama').value         = '';
        const unitSel = document.getElementById('dklat-form-unit');
        if (unitSel) unitSel.value = '';
        _buildQuarterForms(null);
        _openModal('dklat-formModal');
    };

    // ══════════════════════════════════════════════════════════
    // ★ FORM — EDIT
    // ══════════════════════════════════════════════════════════
    window.diklatOpenEdit = function (id) {
        const d = masterDiklat.find(x => x.id === id);
        if (!d) return;
        editingId = id;
        fileData  = QUARTERS.map(q => ({ ...(d[q.key] || {}) }));
        document.getElementById('dklat-modal-title').textContent = 'Edit Data Diklat';
        document.getElementById('dklat-form-nama').value = d.nama || '';
        const unitSel = document.getElementById('dklat-form-unit');
        if (unitSel) unitSel.value = d.unit || '';
        _buildQuarterForms(d);
        _openModal('dklat-formModal');
    };

    // ══════════════════════════════════════════════════════════
    // ★ SUBMIT
    //
    // Alur:
    //  1. createDiklat / updateDiklat → nama + unit + link triwulan
    //  2. uploadDiklatFile per triwulan yang punya file baru
    //     → semua via JSONP (tidak ada fetch/CORS)
    //
    // BATAS UKURAN FILE:
    //  URL query string GAS max ~8000 char per param.
    //  Base64 overhead ~1.37×. Batas aman: ~500KB per file.
    //  File lebih besar → user disarankan pakai tab Link (Drive URL).
    // ══════════════════════════════════════════════════════════
    window.diklatSubmitForm = async function () {
        const nama = document.getElementById('dklat-form-nama').value.trim();
        const unit = document.getElementById('dklat-form-unit').value.trim();
        if (!nama || !unit) {
            _toast('Nama Peserta dan Unit harus diisi', 'error');
            return;
        }

        // Kumpulkan state tiap triwulan dari DOM
        const qPayload = {};
        QUARTERS.forEach((q, idx) => {
            const linkEl     = document.getElementById(`dklat-link-${idx}`);
            const linkVal    = linkEl ? linkEl.value.trim() : '';
            const isLinkPane = document.getElementById(`dklat-pane-link-${idx}`)?.style.display !== 'none';
            const hasNewFile = !!(fileData[idx]?.fileDataUrl && fileData[idx].fileDataUrl.startsWith('data:'));
            qPayload[q.key]  = { isLink: isLinkPane, linkVal, hasNewFile, idx };
        });

        const btnSave = document.getElementById('dklat-btn-save');
        if (btnSave) {
            btnSave.disabled  = true;
            btnSave.innerHTML = '<span class="spinner spinner-sm"></span> Menyimpan...';
        }

        try {
            let targetId = editingId;

            // ── STEP 1: simpan record dasar (nama, unit, link triwulan) ──
            const baseParams = { nama, unit };
            QUARTERS.forEach(q => {
                const p = qPayload[q.key];
                // Kirim nilai triwulan hanya kalau tab Link aktif
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

            // ── STEP 2: upload file baru per triwulan via JSONP ──
            const uploadErrors = [];

            for (const q of QUARTERS) {
                const p = qPayload[q.key];
                if (!p.hasNewFile) continue;

                const fd        = fileData[p.idx];
                const commaIdx  = fd.fileDataUrl.indexOf(',');
                const base64Raw = commaIdx > -1 ? fd.fileDataUrl.slice(commaIdx + 1) : fd.fileDataUrl;

                // Cek ukuran: base64 > 500KB → skip + peringatan
                if (base64Raw.length > 700000) {
                    uploadErrors.push(q.label + ': file terlalu besar untuk upload langsung (maks ~500KB). Gunakan tab Link.');
                    continue;
                }

                try {
                    const upRes = await apiCall({
                        action:      'uploadDiklatFile',
                        id:          targetId,
                        triwulanKey: q.key,
                        fileData:    base64Raw,
                        mimeType:    fd.fileType || 'application/octet-stream',
                        fileName:    fd.fileName || ('file_' + q.key),
                    });
                    if (upRes.status !== 'success') {
                        uploadErrors.push(q.label + ': ' + (upRes.message || 'gagal upload'));
                    }
                } catch (e) {
                    uploadErrors.push(q.label + ': ' + e.message);
                }
            }

            if (uploadErrors.length > 0) {
                _toast('Data tersimpan, tapi ada file gagal:\n' + uploadErrors.join('\n'), 'warning');
            } else {
                _toast(editingId ? 'Data berhasil diperbarui ✓' : 'Data berhasil ditambahkan ✓', 'success');
            }

            _closeModal('dklat-formModal');
            await loadDiklat();

        } catch (err) {
            console.error('[Diklat] submitForm error:', err);
            _toast('Error: ' + err.message, 'error');
        } finally {
            if (btnSave) {
                btnSave.disabled  = false;
                btnSave.innerHTML = ICONS.check + ' &nbsp;Simpan Data';
            }
        }
    };

    // ══════════════════════════════════════════════════════════
    // ★ DELETE
    // ══════════════════════════════════════════════════════════
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

    // ══════════════════════════════════════════════════════════
    // ★ HAPUS FILE PER TRIWULAN
    // ══════════════════════════════════════════════════════════
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

    // ══════════════════════════════════════════════════════════
    // ★ QUARTER FORM BUILDER
    // ══════════════════════════════════════════════════════════
    function _buildQuarterForms(existData) {
        const grid = document.getElementById('dklat-quarters-grid');
        if (!grid) return;

        grid.innerHTML = QUARTERS.map((q, idx) => {
            const saved  = existData ? (existData[q.key] || {}) : {};
            const isLink = !!(saved.link && !saved.fileDataUrl);
            const hasImg = !!(saved.fileDataUrl &&
                (saved.fileDataUrl.startsWith('data:image') ||
                 saved.fileDataUrl.includes('thumbnail') ||
                 saved.fileDataUrl.includes('googleusercontent')));
            const hasFile = !!saved.fileName && !hasImg && !isLink;

            let fileContent;
            if (hasImg) {
                fileContent = `
                    <img src="${saved.fileDataUrl}" style="width:100%;border-radius:6px;object-fit:cover;max-height:100px;display:block;border:1px solid ${q.border};margin-bottom:6px;">
                    <div style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:#f1f5f9;border-radius:5px;font-size:12px;color:#475569;">
                        🖼️ ${saved.fileName || 'Gambar tersimpan'}
                        <button type="button" onclick="diklatClearFileLocal(${idx})" style="margin-left:auto;background:none;border:none;cursor:pointer;color:#94a3b8;font-size:15px;line-height:1;" title="Ganti">×</button>
                    </div>`;
            } else if (hasFile) {
                fileContent = `
                    <div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:#f1f5f9;border-radius:6px;font-size:12px;color:#475569;">
                        📄 ${saved.fileName}
                        <button type="button" onclick="diklatClearFileLocal(${idx})" style="margin-left:auto;background:none;border:none;cursor:pointer;color:#94a3b8;font-size:15px;" title="Ganti">×</button>
                    </div>`;
            } else {
                fileContent = _uploadZoneHTML(idx, q);
            }

            return `
            <div id="dklat-qcard-${idx}" style="border-radius:10px;border:1.5px solid ${q.border};background:${q.bg};padding:14px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                    <span style="font-size:17px;">${q.icon}</span>
                    <div>
                        <div style="font-size:13px;font-weight:700;color:#1e293b;">${q.label}</div>
                        <div style="font-size:11px;color:#94a3b8;">${q.sub}</div>
                    </div>
                </div>
                <div style="display:flex;border-radius:6px;overflow:hidden;border:1.5px solid #e2e8f0;margin-bottom:10px;">
                    <button type="button" id="dklat-tab-file-${idx}" onclick="diklatSwitchQTab(${idx},'file')"
                        style="flex:1;padding:6px;font-size:12px;font-weight:500;border:none;cursor:pointer;
                               background:${!isLink ? '#0f172a' : '#f8fafc'};color:${!isLink ? '#fff' : '#64748b'};transition:all .15s;">
                        📎 Upload File
                    </button>
                    <button type="button" id="dklat-tab-link-${idx}" onclick="diklatSwitchQTab(${idx},'link')"
                        style="flex:1;padding:6px;font-size:12px;font-weight:500;border:none;cursor:pointer;
                               background:${isLink ? '#0f172a' : '#f8fafc'};color:${isLink ? '#fff' : '#64748b'};transition:all .15s;">
                        🔗 Link
                    </button>
                </div>
                <div id="dklat-pane-file-${idx}" style="display:${isLink ? 'none' : 'block'};">
                    <div id="dklat-file-area-${idx}">${fileContent}</div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:4px;">⚠️ Maks ~500KB. File lebih besar → pakai tab Link.</div>
                </div>
                <div id="dklat-pane-link-${idx}" style="display:${isLink ? 'block' : 'none'};">
                    <input type="text" id="dklat-link-${idx}" class="form-input"
                        placeholder="https://drive.google.com/..."
                        value="${isLink ? (saved.link || '') : ''}"
                        oninput="diklatOnLinkInput(${idx})"
                        style="font-size:13px;">
                    <div id="dklat-link-preview-${idx}" style="margin-top:6px;">
                        ${isLink && saved.link
                            ? `<a href="${saved.link}" target="_blank" style="font-size:12px;color:#3b82f6;text-decoration:none;">🔗 Buka link</a>`
                            : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    function _uploadZoneHTML(idx, q) {
        return `
            <label style="display:block;border:2px dashed #e2e8f0;border-radius:7px;padding:14px 10px;text-align:center;
                          cursor:pointer;background:#fafbfc;color:#94a3b8;font-size:12px;position:relative;transition:border-color .15s;"
                   for="dklat-file-${idx}">
                <input type="file" id="dklat-file-${idx}" accept="image/*,.pdf,.doc,.docx"
                    style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;"
                    onchange="diklatHandleFile(${idx})">
                <div style="font-size:20px;margin-bottom:4px;">📂</div>
                <div>Klik atau drag file ke sini</div>
                <div style="font-size:11px;margin-top:2px;">Gambar (JPG/PNG), PDF, Word</div>
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
        if (tf) { tf.style.background = mode === 'file' ? '#0f172a' : '#f8fafc'; tf.style.color = mode === 'file' ? '#fff' : '#64748b'; }
        if (tl) { tl.style.background = mode === 'link' ? '#0f172a' : '#f8fafc'; tl.style.color = mode === 'link' ? '#fff' : '#64748b'; }
    };

    window.diklatHandleFile = function (idx) {
        const input = document.getElementById(`dklat-file-${idx}`);
        const file  = input?.files?.[0];
        if (!file) return;

        // Batasi 500KB agar muat di URL JSONP
        if (file.size > 500 * 1024) {
            _toast(`File terlalu besar (${(file.size/1024).toFixed(0)}KB). Maks 500KB untuk upload langsung.\nGunakan tab 🔗 Link lalu tempelkan URL Google Drive.`, 'error');
            input.value = '';
            return;
        }

        const isImage = file.type.startsWith('image/');
        const reader  = new FileReader();
        reader.onload = function (e) {
            fileData[idx] = { fileName: file.name, fileDataUrl: e.target.result, fileType: file.type };
            const area = document.getElementById(`dklat-file-area-${idx}`);
            if (!area) return;
            const q = QUARTERS[idx];
            area.innerHTML = isImage
                ? `<img src="${e.target.result}" style="width:100%;border-radius:6px;object-fit:cover;max-height:100px;display:block;border:1px solid ${q.border};margin-bottom:6px;">
                   <div style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:#f1f5f9;border-radius:5px;font-size:12px;color:#475569;">
                       🖼️ ${file.name}
                       <button type="button" onclick="diklatClearFileLocal(${idx})" style="margin-left:auto;background:none;border:none;cursor:pointer;color:#94a3b8;font-size:15px;line-height:1;">×</button>
                   </div>`
                : `<div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:#f1f5f9;border-radius:6px;font-size:12px;color:#475569;">
                       📄 ${file.name}
                       <button type="button" onclick="diklatClearFileLocal(${idx})" style="margin-left:auto;background:none;border:none;cursor:pointer;color:#94a3b8;font-size:15px;">×</button>
                   </div>`;
        };
        reader.readAsDataURL(file);
    };

    window.diklatClearFileLocal = function (idx) {
        fileData[idx] = {};
        const area = document.getElementById(`dklat-file-area-${idx}`);
        if (!area) return;
        area.innerHTML = _uploadZoneHTML(idx, QUARTERS[idx]);
    };

    window.diklatOnLinkInput = function (idx) {
        const val     = document.getElementById(`dklat-link-${idx}`)?.value.trim() || '';
        const preview = document.getElementById(`dklat-link-preview-${idx}`);
        if (preview) preview.innerHTML = val
            ? `<a href="${val}" target="_blank" style="font-size:12px;color:#3b82f6;text-decoration:none;">🔗 Buka link</a>`
            : '';
    };

    // ══════════════════════════════════════════════════════════
    // ★ DETAIL MODAL
    // ══════════════════════════════════════════════════════════
    window.diklatOpenDetail = function (id) {
        const d = masterDiklat.find(x => x.id === id);
        if (!d) return;
        const body = document.getElementById('dklat-detail-body');
        if (!body) return;

        body.innerHTML = `
            <div class="info-box" style="margin-bottom:16px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    <div>
                        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin-bottom:3px;">Nama Peserta</div>
                        <div style="font-size:15px;font-weight:700;color:#1e293b;">${d.nama || '—'}</div>
                    </div>
                    <div>
                        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin-bottom:3px;">Unit / Bagian</div>
                        <div style="font-size:14px;font-weight:600;color:#1e293b;">${d.unit || '—'}</div>
                    </div>
                </div>
            </div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin-bottom:10px;">Bukti Keikutsertaan Diklat</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;" class="dklat-detail-qgrid">
                ${QUARTERS.map(q => {
                    const qd     = d[q.key] || {};
                    const hasImg = !!(qd.fileDataUrl &&
                        (qd.fileDataUrl.startsWith('data:image') ||
                         qd.fileDataUrl.includes('thumbnail') ||
                         qd.fileDataUrl.includes('googleusercontent')));
                    const hasLink = !!qd.link;
                    const hasFile = !!qd.fileName && !hasImg;

                    let content;
                    if (hasImg) {
                        content = `
                            <img src="${qd.fileDataUrl}" alt="${q.label}"
                                style="width:100%;border-radius:6px;object-fit:cover;max-height:110px;display:block;border:1px solid ${q.border};cursor:zoom-in;margin-bottom:6px;"
                                onclick="diklatZoomImg('${qd.fileDataUrl}')">
                            <div style="display:flex;align-items:center;gap:5px;padding:5px 8px;background:#f1f5f9;border-radius:5px;font-size:12px;color:#475569;">
                                📄 ${qd.fileName || 'Gambar'}
                                ${hasLink ? `<a href="${qd.link}" target="_blank" style="margin-left:4px;color:#3b82f6;font-size:11px;">Buka ↗</a>` : ''}
                                <button onclick="diklatDeleteFile('${d.id}','${q.key}',this)"
                                    style="margin-left:auto;background:none;border:none;cursor:pointer;color:#ef4444;font-size:11px;font-weight:600;padding:2px 6px;border-radius:4px;border:1px solid #fca5a5;">🗑️ Hapus</button>
                            </div>`;
                    } else if (hasFile) {
                        content = `
                            <div style="display:flex;align-items:center;gap:6px;padding:10px 12px;background:#f1f5f9;border-radius:6px;font-size:13px;color:#475569;">
                                📄 ${qd.fileName}
                                ${hasLink ? `<a href="${qd.link}" target="_blank" style="color:#3b82f6;font-size:11px;">Buka ↗</a>` : ''}
                                <button onclick="diklatDeleteFile('${d.id}','${q.key}',this)"
                                    style="margin-left:auto;background:none;border:none;cursor:pointer;color:#ef4444;font-size:11px;font-weight:600;padding:2px 6px;border-radius:4px;border:1px solid #fca5a5;">🗑️</button>
                            </div>`;
                    } else if (hasLink) {
                        const short = qd.link.length > 42 ? qd.link.slice(0, 42) + '…' : qd.link;
                        content = `
                            <div style="display:flex;flex-direction:column;gap:6px;">
                                <a href="${qd.link}" target="_blank" rel="noopener"
                                    style="display:flex;align-items:center;gap:6px;padding:10px 12px;background:#eff6ff;border-radius:6px;color:#2563eb;font-size:12px;font-weight:600;text-decoration:none;word-break:break-all;">
                                    🔗 ${short}</a>
                                <button onclick="diklatDeleteFile('${d.id}','${q.key}',this)"
                                    style="background:none;border:1px solid #fca5a5;cursor:pointer;color:#ef4444;font-size:11px;font-weight:600;padding:4px 10px;border-radius:4px;align-self:flex-end;">🗑️ Hapus Link</button>
                            </div>`;
                    } else {
                        content = `<div style="text-align:center;padding:18px;color:#cbd5e1;font-size:13px;">— Belum ada data —</div>`;
                    }

                    return `<div style="border-radius:10px;border:1.5px solid ${q.border};background:${q.bg};padding:12px;">
                        <div style="display:flex;align-items:center;gap:7px;margin-bottom:10px;">
                            <span style="font-size:16px;">${q.icon}</span>
                            <div>
                                <div style="font-size:13px;font-weight:700;color:#1e293b;">${q.label}</div>
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
        el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;padding:20px;';
        el.innerHTML = `<img src="${src}" style="max-width:90vw;max-height:90vh;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,.4)">`;
        el.onclick = () => document.body.removeChild(el);
        document.body.appendChild(el);
    };

    // ══════════════════════════════════════════════════════════
    // ★ TOAST
    // ══════════════════════════════════════════════════════════
    function _toast(msg, type = 'info') {
        if (window.showToast) { showToast(msg, type); return; }
        console.log(`[Diklat toast/${type}]`, msg);
    }

    // ══════════════════════════════════════════════════════════
    // ★ REGISTER SECTION
    // ══════════════════════════════════════════════════════════
    window.sectionInits = window.sectionInits || {};
    window.sectionInits['diklat'] = function () {
        const section = document.getElementById('section-diklat');
        if (!section) return;

        section.innerHTML = `
<style>
.dklat-cards { display:none; }
.filter-container { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
@media (max-width: 768px) {
    .dklat-table-wrap { display:none !important; }
    .dklat-cards      { display:block !important; }
}
@media (max-width: 420px) {
    .dklat-detail-qgrid { grid-template-columns:1fr !important; }
}
.dklat-qgrid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
@media (max-width: 520px) { .dklat-qgrid { grid-template-columns:1fr; } }
</style>

<div class="container">
    <div class="section-page-header">
        <h1 class="section-page-title">📚 Diklat</h1>
        <p class="section-page-subtitle">Manajemen data pelatihan / training pegawai per triwulan</p>
    </div>

    <div class="stats-grid">
        <div class="stat-card" style="border-left:3px solid #64748b;">
            <div class="stat-label">Total Peserta</div>
            <div class="stat-value" id="dklat-stat-total">0</div>
            <div class="stat-footer">Data terdaftar</div>
        </div>
        <div class="stat-card" style="border-left:3px solid #10b981;">
            <div class="stat-label">Lengkap (4 Triwulan)</div>
            <div class="stat-value" id="dklat-stat-lengkap">0</div>
            <div class="stat-footer">Semua bukti terisi</div>
        </div>
        <div class="stat-card" style="border-left:3px solid #f59e0b;">
            <div class="stat-label">Sebagian</div>
            <div class="stat-value" id="dklat-stat-sebagian">0</div>
            <div class="stat-footer">1–3 triwulan terisi</div>
        </div>
        <div class="stat-card" style="border-left:3px solid #ef4444;">
            <div class="stat-label">Belum Ada Bukti</div>
            <div class="stat-value" id="dklat-stat-kosong">0</div>
            <div class="stat-footer">Semua triwulan kosong</div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <h2 class="card-title">Data Diklat Pegawai</h2>
            <div class="filter-container">
                <input type="text" class="search-input" id="dklat-search"
                    placeholder="Cari nama atau unit..." oninput="diklatApplyFilter()">
                <button onclick="diklatLoad()" class="btn btn-sm">${ICONS.refresh} Refresh</button>
                <button onclick="diklatOpenAdd()" class="btn btn-sm btn-primary">${ICONS.plus} Tambah Data</button>
            </div>
        </div>
        <div class="table-container dklat-table-wrap">
            <table>
                <thead>
                    <tr>
                        <th style="width:32px;">#</th>
                        <th>Nama Peserta</th>
                        <th>Unit / Bagian</th>
                        <th style="text-align:center;">🌱 Triwulan I</th>
                        <th style="text-align:center;">☀️ Triwulan II</th>
                        <th style="text-align:center;">🍂 Triwulan III</th>
                        <th style="text-align:center;">❄️ Triwulan IV</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody id="dklat-tbody">
                    <tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8;">Memuat data...</td></tr>
                </tbody>
            </table>
        </div>
        <div class="dklat-cards" id="dklat-cards"></div>
        <div class="pagination" id="dklat-pagination"></div>
    </div>
</div>

<!-- MODAL: FORM ADD / EDIT -->
<div id="dklat-formModal" class="modal-overlay" onclick="if(event.target===this)diklatCloseModal('dklat-formModal')">
    <div class="modal" style="max-width:680px;">
        <div class="modal-header">
            <h2 class="modal-title" id="dklat-modal-title">Tambah Data Diklat</h2>
        </div>
        <div class="modal-content">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
                <div class="form-group">
                    <label class="input-label">Nama Peserta <span style="color:#ef4444;">*</span></label>
                    <input type="text" class="form-input" id="dklat-form-nama" placeholder="Nama lengkap pegawai">
                </div>
                <div class="form-group">
                    <label class="input-label">Unit / Bagian <span style="color:#ef4444;">*</span></label>
                    <select class="form-input" id="dklat-form-unit">
                        <option value="">-- Pilih Unit --</option>
                        <option value="Sekretariat">Sekretariat</option>
                        <option value="Bidang Koperasi">Bidang Koperasi</option>
                        <option value="Bidang UKM">Bidang UKM</option>
                        <option value="Bidang Usaha Mikro">Bidang Usaha Mikro</option>
                        <option value="Bidang Kewirausahaan">Bidang Kewirausahaan</option>
                        <option value="Balai Layanan Usaha Terpadu KUMKM">Balai Layanan Usaha Terpadu KUMKM</option>
                    </select>
                </div>
            </div>
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
                Bukti Keikutsertaan Diklat per Triwulan
                <span style="flex:1;height:1.5px;background:#f1f5f9;display:block;"></span>
            </div>
            <div class="dklat-qgrid" id="dklat-quarters-grid"></div>
            <div class="alert alert-info" style="margin-top:14px;font-size:12.5px;">
                💡 Upload file langsung maks <strong>500KB</strong>. Untuk file lebih besar, upload ke Google Drive lalu tempelkan linknya di tab 🔗 Link.
            </div>
        </div>
        <div class="modal-footer">
            <button onclick="diklatCloseModal('dklat-formModal')" class="btn" style="flex:1;">Batal</button>
            <button id="dklat-btn-save" onclick="diklatSubmitForm()" class="btn btn-success" style="flex:1;">
                ${ICONS.check} &nbsp;Simpan Data
            </button>
        </div>
    </div>
</div>

<!-- MODAL: DETAIL -->
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

        loadDiklat();
    };

})();