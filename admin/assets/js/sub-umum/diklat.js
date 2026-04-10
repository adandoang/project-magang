// ============================================================
// diklat.js — Diklat Training Management Section (SPA)
// Admin Panel — Dinas Koperasi UKM
// ============================================================
(function () {
    'use strict';

    const API_URL = 'https://script.google.com/macros/s/AKfycbwjJwYtLjnhZ__smIDfVkLJTpu_m3rqvg4Sy1TSfyXvwA6_2FKrXGFgMUi4_MSMefpvtg/exec';

    const QUARTERS = [
        { key: 'triwulan1', label: 'Triwulan I', sub: 'Jan – Mar', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', dot: '#3b82f6' },
        { key: 'triwulan2', label: 'Triwulan II', sub: 'Apr – Jun', color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', dot: '#10b981' },
        { key: 'triwulan3', label: 'Triwulan III', sub: 'Jul – Sep', color: '#b45309', bg: '#fffbeb', border: '#fcd34d', dot: '#f59e0b' },
        { key: 'triwulan4', label: 'Triwulan IV', sub: 'Okt – Des', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', dot: '#8b5cf6' }
    ];

    let masterDiklat = [];
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
        allDiklat = [...masterDiklat];
        diklatCurrentPage = 1;
        renderStats();
        renderPaginatedDiklat();
    }
    window.diklatLoad = loadDiklat;

    function _setTableLoading(on) {
        const tbody = document.getElementById('dklat-tbody');
        if (tbody && on) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px;color:#94a3b8;font-size:14px;">
            <span class="spinner"></span>&nbsp; Memuat data…
        </td></tr>`;
    }

    // ─── STATS ───────────────────────────────────────────────────
    function renderStats() {
        let lengkap = 0, sebagian = 0, kosong = 0;
        masterDiklat.forEach(d => {
            const filled = QUARTERS.filter(q => {
                const qd = d[q.key] || {};
                return qd.link || qd.fileName || qd.fileDataUrl;
            }).length;
            if (filled === 4) lengkap++;
            else if (filled > 0) sebagian++;
            else kosong++;
        });
        const el = id => document.getElementById(id);
        if (el('dklat-stat-total')) el('dklat-stat-total').textContent = masterDiklat.length;
        if (el('dklat-stat-lengkap')) el('dklat-stat-lengkap').textContent = lengkap;
        if (el('dklat-stat-sebagian')) el('dklat-stat-sebagian').textContent = sebagian;
        if (el('dklat-stat-kosong')) el('dklat-stat-kosong').textContent = kosong;
    }

    // ─── FILTER ──────────────────────────────────────────────────
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

    // ─── BADGE (table cell) ──────────────────────────────────────
    function _qdBadge(qd, q) {
        const hasImg = !!(qd.fileDataUrl && (qd.fileDataUrl.startsWith('data:image') || qd.fileDataUrl.includes('thumbnail')));
        const hasLink = !!qd.link;
        const hasFile = !!qd.fileName && !hasImg;

        if (!hasImg && !hasFile && !hasLink) {
            return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#e2e8f0;" title="Belum ada"></span>`;
        }

        const icon = hasImg ? SVG.img : hasFile ? SVG.file : SVG.link;
        const label = hasImg ? 'Gambar' : hasFile ? 'File' : 'Link';
        const url = hasLink ? qd.link : null;

        const inner = `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:500;
            padding:3px 9px 3px 7px;border-radius:20px;
            background:${q.bg};color:${q.color};border:1px solid ${q.border};
            white-space:nowrap;line-height:1.4;">
            ${icon}&nbsp;${label}
        </span>`;

        if (url) {
            return `<a href="${url}" target="_blank" rel="noopener" style="text-decoration:none;" title="Buka ${label}">${inner}</a>`;
        }
        return inner;
    }

    // ─── RENDER TABLE ────────────────────────────────────────────
    function renderPaginatedDiklat() {
        const tbody = document.getElementById('dklat-tbody');
        const cards = document.getElementById('dklat-cards');
        const pgn = document.getElementById('dklat-pagination');
        if (!tbody) return;

        if (allDiklat.length === 0) {
            const msg = masterDiklat.length === 0
                ? 'Belum ada data diklat. Klik <strong>+ Tambah Data</strong> untuk memulai.'
                : 'Tidak ada data yang sesuai pencarian.';
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px;color:#94a3b8;font-size:14px;">${msg}</td></tr>`;
            if (cards) cards.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;font-size:14px;">${msg}</div>`;
            if (pgn) pgn.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(allDiklat.length / itemsPerPage);
        const start = (diklatCurrentPage - 1) * itemsPerPage;
        const items = allDiklat.slice(start, start + itemsPerPage);

        tbody.innerHTML = items.map((d, i) => {
            const no = start + i + 1;
            const initials = (d.nama || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
            const qCells = QUARTERS.map(q => `<td style="text-align:center;vertical-align:middle;">${_qdBadge(d[q.key] || {}, q)}</td>`).join('');
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
                        <button onclick="diklatOpenDetail('${d.id}')"  class="btn-icon btn-icon-view"   title="Lihat detail">${SVG.eye}</button>
                        <button onclick="diklatOpenEdit('${d.id}')"    class="btn-icon btn-icon-edit"   title="Edit data">${SVG.edit}</button>
                        <button onclick="diklatDelete('${d.id}',this)" class="btn-icon btn-icon-delete" title="Hapus">${SVG.trash}</button>
                    </div></div>
                </td>
            </tr>`;
        }).join('');

        // Mobile cards
        if (cards) {
            cards.innerHTML = items.map(d => {
                const qRows = QUARTERS.map(q => {
                    const qd = d[q.key] || {};
                    const badge = _qdBadge(qd, q);
                    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;">
                        <span style="font-size:11.5px;font-weight:600;color:#94a3b8;">${q.label}</span>
                        ${badge}
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
                            <button onclick="diklatOpenDetail('${d.id}')"  class="btn-icon btn-icon-view">${SVG.eye}</button>
                            <button onclick="diklatOpenEdit('${d.id}')"    class="btn-icon btn-icon-edit">${SVG.edit}</button>
                            <button onclick="diklatDelete('${d.id}',this)" class="btn-icon btn-icon-delete">${SVG.trash}</button>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }

        if (pgn) pgn.innerHTML = `
            <button onclick="diklatChangePage(${diklatCurrentPage - 1})" ${diklatCurrentPage === 1 ? 'disabled' : ''}>&#8249; Prev</button>
            <span class="pagination-info">Halaman ${diklatCurrentPage} dari ${totalPages} &nbsp;·&nbsp; ${allDiklat.length} data</span>
            <button onclick="diklatChangePage(${diklatCurrentPage + 1})" ${diklatCurrentPage === totalPages ? 'disabled' : ''}>Next &#8250;</button>`;
    }

    window.diklatChangePage = (page) => {
        const t = Math.ceil(allDiklat.length / itemsPerPage);
        if (page < 1 || page > t) return;
        diklatCurrentPage = page;
        renderPaginatedDiklat();
    };

    // ─── MODAL HELPERS ───────────────────────────────────────────
    function _openModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'flex'; }
    function _closeModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
    window.diklatCloseModal = (id) => _closeModal(id);

    // ─── FORM — ADD ──────────────────────────────────────────────
    window.diklatOpenAdd = function () {
        editingId = null;
        fileData = [{}, {}, {}, {}];
        document.getElementById('dklat-modal-title').textContent = 'Tambah Data Diklat';
        document.getElementById('dklat-form-nama').value = '';
        const unitSel = document.getElementById('dklat-form-unit');
        if (unitSel) unitSel.value = '';
        _buildQuarterForms(null);
        _openModal('dklat-formModal');
    };

    // ─── FORM — EDIT ─────────────────────────────────────────────
    window.diklatOpenEdit = function (id) {
        const d = masterDiklat.find(x => x.id === id);
        if (!d) return;
        editingId = id;
        fileData = QUARTERS.map(q => ({ ...(d[q.key] || {}) }));
        document.getElementById('dklat-modal-title').textContent = 'Edit Data Diklat';
        document.getElementById('dklat-form-nama').value = d.nama || '';
        const unitSel = document.getElementById('dklat-form-unit');
        if (unitSel) unitSel.value = d.unit || '';
        _buildQuarterForms(d);
        _openModal('dklat-formModal');
    };

    // ─── SUBMIT ──────────────────────────────────────────────────
    window.diklatSubmitForm = async function () {
        const nama = document.getElementById('dklat-form-nama').value.trim();
        const unit = document.getElementById('dklat-form-unit').value.trim();
        if (!nama || !unit) {
            _toast('Nama Peserta dan Unit harus diisi', 'error');
            return;
        }

        const qPayload = {};
        QUARTERS.forEach((q, idx) => {
            const linkEl = document.getElementById(`dklat-link-${idx}`);
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
            const saved = existData ? (existData[q.key] || {}) : {};
            const isLink = !!(saved.link && !saved.fileDataUrl);
            const hasImg = !!(saved.fileDataUrl &&
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
        const file = input?.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            _toast(`File terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Maks 10MB.`, 'error');
            input.value = '';
            return;
        }

        const isImage = file.type.startsWith('image/');
        const reader = new FileReader();
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
        const val = document.getElementById(`dklat-link-${idx}`)?.value.trim() || '';
        const preview = document.getElementById(`dklat-link-preview-${idx}`);
        if (preview) preview.innerHTML = val
            ? `<a href="${val}" target="_blank" style="font-size:12px;color:#2563eb;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">${SVG.link}&nbsp;Buka link</a>`
            : '';
    };

    // ─── DETAIL MODAL ────────────────────────────────────────────
    window.diklatOpenDetail = function (id) {
        const d = masterDiklat.find(x => x.id === id);
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
                ${QUARTERS.map(q => {
            const qd = d[q.key] || {};
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

            return `<div style="border-radius:10px;border:1px solid ${q.border};background:${q.bg};padding:12px;">
                        <div style="display:flex;align-items:center;gap:7px;margin-bottom:10px;">
                            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${q.dot};"></span>
                            <div>
                                <div style="font-size:12.5px;font-weight:700;color:#1e293b;">${q.label}</div>
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
        el.onclick = () => document.body.removeChild(el);
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

/* Stat cards override */
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
        <h1 class="section-page-title">Diklat</h1>
        <p class="section-page-subtitle">Manajemen data pelatihan pegawai per triwulan</p>
    </div>

    <!-- Stats -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;" class="dklat-stats-row">
        <div class="dklat-stat">
            <div class="dklat-stat-label">Total Peserta</div>
            <div class="dklat-stat-val" id="dklat-stat-total" style="color:#1e293b;">0</div>
            <div class="dklat-stat-sub">Data terdaftar</div>
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
            <h2 class="card-title">Data Diklat Pegawai</h2>
            <div class="dklat-filter-row">
                <input type="text" class="search-input" id="dklat-search"
                    placeholder="Cari nama atau unit…" oninput="diklatApplyFilter()">
                <button onclick="diklatLoad()" class="btn btn-sm"
                    style="display:inline-flex;align-items:center;gap:5px;">${SVG.refresh} Refresh</button>
                <button onclick="diklatOpenAdd()" class="btn btn-sm btn-primary"
                    style="display:inline-flex;align-items:center;gap:5px;">${SVG.plus} Tambah Data</button>
            </div>
        </div>

        <div class="table-container dklat-table-wrap">
            <table>
                <thead>
                    <tr>
                        <th style="width:36px;">#</th>
                        <th>Nama Peserta</th>
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

<!-- ── MODAL: FORM ADD / EDIT ───────────────────────────── -->
<div id="dklat-formModal" class="modal-overlay" onclick="if(event.target===this)diklatCloseModal('dklat-formModal')">
    <div class="modal" style="max-width:680px;">
        <div class="modal-header">
            <h2 class="modal-title" id="dklat-modal-title">Tambah Data Diklat</h2>
        </div>
        <div class="modal-content">

            <!-- Identitas -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
                <div class="form-group" style="margin:0;">
                    <label class="input-label">Nama Peserta <span style="color:#ef4444;">*</span></label>
                    <input type="text" class="form-input" id="dklat-form-nama" placeholder="Nama lengkap pegawai">
                </div>
                <div class="form-group" style="margin:0;">
                    <label class="input-label">Unit / Bagian <span style="color:#ef4444;">*</span></label>
                    <select class="form-input" id="dklat-form-unit">
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

            <!-- Divider -->
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
                <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;white-space:nowrap;">Bukti per Triwulan</span>
                <span style="flex:1;height:1px;background:#e2e8f0;"></span>
            </div>

            <div class="dklat-qgrid" id="dklat-quarters-grid"></div>

            <div style="margin-top:14px;padding:10px 14px;background:#f0f9ff;border-radius:7px;
                border:1px solid #bae6fd;font-size:12px;color:#0369a1;">
                Upload langsung maks <strong>10 MB</strong>, atau tempelkan link Google Drive di tab Tempel Link.
            </div>
        </div>
        <div class="modal-footer">
            <button onclick="diklatCloseModal('dklat-formModal')" class="btn" style="flex:1;">Batal</button>
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

        loadDiklat();
    };

})();