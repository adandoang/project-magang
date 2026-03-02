// ============================================================
// manageacc.js — Manajemen Akun section (SPA)
// Admin Panel — Dinas Koperasi UKM
// JS source: admin-manageacc.html
// ============================================================
(function () {
    'use strict';

    const GAS_URL = 'https://script.google.com/macros/s/AKfycbyaEDOcK0ZFQFZoG7ia-CMbtvF68un2f1k87ECYSSOewowjRSAyJYvCiveCY6T8v9gJkg/exec';

    const ROLES = {
        superadmin: { label: 'Super Admin', icon: '🛡️', badgeClass: 'badge-superadmin' },
        subumum: { label: 'Sub Bagian Umum', icon: '📋', badgeClass: 'badge-subumum' },
        subkeuangan: { label: 'Sub Bagian Keuangan', icon: '💰', badgeClass: 'badge-subkeuangan' },
        sekretariat: { label: 'Sekretariat', icon: '🏛️', badgeClass: 'badge-sekretariat' },
    };

    let allUsers = [];
    let filteredUsers = [];
    let currentPage = 1;
    const PAGE_SIZE = 10;
    let editingId = null;

    const AV_COLORS = ['#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981', '#ec4899', '#0ea5e9', '#14b8a6', '#f97316'];
    function avColor(email) {
        let h = 0;
        for (const c of (email || '')) h = (h << 5) - h + c.charCodeAt(0);
        return AV_COLORS[Math.abs(h) % AV_COLORS.length];
    }
    function initials(name) {
        return (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
    }

    // ─── JSONP – GAS request wrappers ─────────────────────
    function gasRequest(payload) {
        return new Promise((resolve, reject) => {
            const cb = '__gas_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
            const body = encodeURIComponent(JSON.stringify(payload));
            const url = `${GAS_URL}?jsonBody=${body}&callback=${cb}`;
            const script = document.createElement('script');
            let done = false;
            window[cb] = data => { done = true; delete window[cb]; script.remove(); resolve(data); };
            script.onerror = () => { if (done) return; delete window[cb]; script.remove(); reject(new Error('Gagal terhubung.')); };
            setTimeout(() => { if (done) return; delete window[cb]; script.remove(); reject(new Error('Request timeout (15s)')); }, 15000);
            script.src = url;
            document.head.appendChild(script);
        });
    }

    function gasGet(params) {
        return new Promise((resolve, reject) => {
            const cb = '__gas_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
            const qs = new URLSearchParams({ ...params, callback: cb }).toString();
            const script = document.createElement('script');
            let done = false;
            window[cb] = data => { done = true; delete window[cb]; script.remove(); resolve(data); };
            script.onerror = () => { if (done) return; delete window[cb]; script.remove(); reject(new Error('Gagal terhubung ke server')); };
            setTimeout(() => { if (done) return; delete window[cb]; script.remove(); reject(new Error('Timeout')); }, 15000);
            script.src = `${GAS_URL}?${qs}`;
            document.head.appendChild(script);
        });
    }

    // ─── LOAD USERS ───────────────────────────────────────
    window.accLoadUsers = async function () {
        accShowApiBar('loading', 'Memuat data dari Google Sheets…');
        accSetTableLoading();
        try {
            const res = await gasGet({ action: 'getUsers' });
            if (res.status === 'success') {
                allUsers = res.users || [];
                accShowApiBar('ok', `Berhasil memuat ${allUsers.length} akun dari Google Sheets`);
                window.accApplyFilter();
            } else {
                throw new Error(res.message || 'Gagal memuat data');
            }
        } catch (err) {
            accShowApiBar('err', err.message);
            if (window.showToast) showToast('Gagal memuat data: ' + err.message, 'error');
            allUsers = [];
            window.accApplyFilter();
        }
    };

    // ─── FILTER & RENDER ──────────────────────────────────
    window.accApplyFilter = function () {
        const qEl = document.getElementById('acc-searchQ');
        const roleEl = document.getElementById('acc-fltRole');
        if (!qEl || !roleEl) return;

        const q = qEl.value.trim().toLowerCase();
        const role = roleEl.value;
        filteredUsers = allUsers.filter(u => {
            const mQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
            const mR = !role || u.role === role;
            return mQ && mR;
        });
        currentPage = 1;
        accRenderStats();
        accRender();
    };

    function accRenderStats() {
        if (document.getElementById('acc-statSuper')) document.getElementById('acc-statSuper').textContent = allUsers.filter(u => u.role === 'superadmin').length;
        if (document.getElementById('acc-statUmum')) document.getElementById('acc-statUmum').textContent = allUsers.filter(u => u.role === 'subumum').length;
        if (document.getElementById('acc-statKeuangan')) document.getElementById('acc-statKeuangan').textContent = allUsers.filter(u => u.role === 'subkeuangan').length;
        if (document.getElementById('acc-statSekretariat')) document.getElementById('acc-statSekretariat').textContent = allUsers.filter(u => u.role === 'sekretariat').length;
    }

    function accRender() {
        const start = (currentPage - 1) * PAGE_SIZE;
        const items = filteredUsers.slice(start, start + PAGE_SIZE);
        const tbody = document.getElementById('acc-tblBody');
        const cards = document.getElementById('acc-mobileCards');
        const pager = document.getElementById('acc-pagination');
        if (!tbody || !cards || !pager) return;

        if (filteredUsers.length === 0) {
            const emptyHtml = `<div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <div class="empty-state-text">Tidak ada akun yang sesuai</div>
                <div class="empty-state-sub">Coba ubah kata kunci atau filter pencarian</div>
            </div>`;
            tbody.innerHTML = `<tr><td colspan="5">${emptyHtml}</td></tr>`;
            cards.innerHTML = emptyHtml;
            pager.innerHTML = '';
            return;
        }

        tbody.innerHTML = items.map((u, i) => {
            const no = start + i + 1;
            const ini = initials(u.name);
            const col = avColor(u.email);
            return `<tr>
                <td style="color:#94a3b8;font-weight:600;font-size:12px">${no}</td>
                <td>
                    <div class="user-cell">
                        <div class="avatar" style="background:${col}">${ini}</div>
                        <div>
                            <div class="user-cell-name">${esc(u.name)}</div>
                            <div class="user-cell-email">${esc(u.email)}</div>
                            <div class="user-cell-id">${esc(u.id)}</div>
                        </div>
                    </div>
                </td>
                <td>${accRoleBadge(u.role)}</td>
                <td style="font-size:13px;color:#64748b">${accFmtDate(u.createdAt)}</td>
                <td>
                    <div class="action-buttons" style="justify-content:center">
                        <button onclick="accViewUser('${escA(u.id)}')" class="btn btn-sm" title="Detail">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button onclick="accOpenForm('edit','${escA(u.id)}')" class="btn btn-sm" title="Edit">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onclick="accConfirmDelete('${escA(u.id)}')" class="btn btn-sm btn-danger" title="Hapus">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');

        cards.innerHTML = items.map(u => {
            const ini = initials(u.name);
            const col = avColor(u.email);
            return `<div class="documents-card">
                <div class="documents-card-header">
                    <div style="display:flex;align-items:center;gap:10px;flex:1">
                        <div class="avatar" style="background:${col}">${ini}</div>
                        <div>
                            <div class="documents-card-title">${esc(u.name)}</div>
                            <div class="documents-card-subtitle">${esc(u.email)}</div>
                        </div>
                    </div>
                    ${accRoleBadge(u.role)}
                </div>
                <div class="documents-card-body">
                    <div class="documents-card-row">
                        <span class="documents-card-label">User ID</span>
                        <span class="documents-card-value" style="font-family:monospace;font-size:11px">${esc(u.id)}</span>
                    </div>
                    <div class="documents-card-row">
                        <span class="documents-card-label">Dibuat</span>
                        <span class="documents-card-value">${accFmtDate(u.createdAt)}</span>
                    </div>
                </div>
                <div class="documents-card-footer">
                    <button onclick="accViewUser('${escA(u.id)}')" class="btn btn-sm" style="flex:1">👁️ Detail</button>
                    <button onclick="accOpenForm('edit','${escA(u.id)}')" class="btn btn-sm" style="flex:1">✏️ Edit</button>
                    <button onclick="accConfirmDelete('${escA(u.id)}')" class="btn btn-sm btn-danger" style="flex:1">🗑️ Hapus</button>
                </div>
            </div>`;
        }).join('');

        const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
        if (totalPages <= 1) { pager.innerHTML = ''; return; }
        pager.innerHTML = `
            <button onclick="accGoPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹ Prev</button>
            <span class="pagination-info">Halaman ${currentPage} dari ${totalPages} (${filteredUsers.length} akun)</span>
            <button onclick="accGoPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next ›</button>`;
    }

    window.accGoPage = function (p) {
        const total = Math.ceil(filteredUsers.length / PAGE_SIZE);
        if (p < 1 || p > total) return;
        currentPage = p;
        accRender();
        const target = window.innerWidth < 1024
            ? document.getElementById('acc-mobileCards')
            : document.querySelector('#section-manageacc .table-container');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    function accSetTableLoading() {
        const tbody = document.getElementById('acc-tblBody');
        const cards = document.getElementById('acc-mobileCards');
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="loading"><div class="spinner"></div><p style="margin-top:16px">Memuat data dari Google Sheets...</p></td></tr>`;
        if (cards) cards.innerHTML = '';
    }

    // ─── FORM: TAMBAH / EDIT ──────────────────────────────
    window.accOpenForm = function (mode, id) {
        editingId = null;
        accClearErrs();
        const isEdit = mode === 'edit';
        document.getElementById('acc-formTitle').textContent = isEdit ? 'Edit Akun' : 'Tambah Akun Baru';
        document.getElementById('acc-saveLbl').textContent = isEdit ? 'Perbarui Akun' : 'Simpan Akun';
        document.getElementById('acc-passReqMark').style.display = isEdit ? 'none' : 'inline';
        document.getElementById('acc-passHint').style.display = isEdit ? 'block' : 'none';
        document.getElementById('acc-fPassword').placeholder = isEdit ? 'Kosongkan jika tidak diubah' : 'Minimal 8 karakter';

        if (isEdit) {
            const u = allUsers.find(x => x.id === id);
            if (!u) return;
            editingId = id;
            document.getElementById('acc-fName').value = u.name;
            document.getElementById('acc-fEmail').value = u.email;
            document.getElementById('acc-fPassword').value = '';
            const r = document.querySelector(`#section-manageacc input[name="fRole"][value="${u.role}"]`);
            if (r) r.checked = true;
            else document.getElementById('acc-rSubUmum').checked = true;
        } else {
            document.getElementById('acc-fName').value = '';
            document.getElementById('acc-fEmail').value = '';
            document.getElementById('acc-fPassword').value = '';
            document.getElementById('acc-rSubUmum').checked = true;
        }

        document.getElementById('acc-ovView').style.display = 'none';
        document.getElementById('acc-ovForm').style.display = 'flex';
    };

    window.accSaveAccount = async function () {
        accClearErrs();
        const name = document.getElementById('acc-fName').value.trim();
        const email = document.getElementById('acc-fEmail').value.trim();
        const password = document.getElementById('acc-fPassword').value;
        const role = document.querySelector('#section-manageacc input[name="fRole"]:checked')?.value || 'subumum';
        let valid = true;

        if (!name) { accShowErr('acc-eName', 'acc-fName'); valid = false; }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { accShowErr('acc-eEmail', 'acc-fEmail'); valid = false; }
        if (!editingId && password.length < 8) { accShowErr('acc-ePassword', 'acc-fPassword'); valid = false; }
        if (editingId && password && password.length < 8) { accShowErr('acc-ePassword', 'acc-fPassword'); valid = false; }
        if (!valid) return;

        const btn = document.getElementById('acc-btnSave');
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner spinner-sm"></span> Menyimpan...`;

        try {
            let payload;
            if (editingId) {
                payload = { action: 'updateUser', id: editingId, name, email, role };
                if (password) payload.password = password;
            } else {
                payload = { action: 'createUser', name, email, password, role };
            }
            const res = await gasRequest(payload);
            if (res.status === 'success') {
                if (window.showToast) showToast(editingId ? 'Akun berhasil diperbarui!' : 'Akun baru berhasil dibuat!', 'success');
                document.getElementById('acc-ovForm').style.display = 'none';
                await window.accLoadUsers();
            } else {
                throw new Error(res.message || 'Gagal menyimpan');
            }
        } catch (err) {
            if (window.showToast) showToast('Error: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12" /></svg> <span id="acc-saveLbl">${editingId ? 'Perbarui Akun' : 'Simpan Akun'}</span>`;
        }
    };

    // ─── VIEW DETAIL ──────────────────────────────────────
    window.accViewUser = function (id) {
        const u = allUsers.find(x => x.id === id);
        if (!u) return;
        document.getElementById('acc-vAv').style.background = avColor(u.email);
        document.getElementById('acc-vAv').textContent = initials(u.name);
        document.getElementById('acc-vName').textContent = u.name;
        document.getElementById('acc-vEmail').textContent = u.email;
        document.getElementById('acc-vRoleBadge').innerHTML = accRoleBadge(u.role);
        document.getElementById('acc-vId').textContent = u.id;
        document.getElementById('acc-vRole').textContent = accRoleLabel(u.role);
        document.getElementById('acc-vEmailFull').textContent = u.email;
        document.getElementById('acc-vCreated').textContent = accFmtDate(u.createdAt);
        document.getElementById('acc-vEditBtn').onclick = () => { document.getElementById('acc-ovView').style.display = 'none'; window.accOpenForm('edit', id); };
        document.getElementById('acc-ovView').style.display = 'flex';
    };

    // ─── DELETE ───────────────────────────────────────────
    window.accConfirmDelete = function (id) {
        const u = allUsers.find(x => x.id === id);
        if (!u) return;
        document.getElementById('acc-delName').textContent = u.name;
        document.getElementById('acc-btnConfirmDel').onclick = () => accDoDelete(id);
        document.getElementById('acc-ovDelete').style.display = 'flex';
    };

    async function accDoDelete(id) {
        const btn = document.getElementById('acc-btnConfirmDel');
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner spinner-sm"></span> Menghapus...`;
        try {
            const res = await gasRequest({ action: 'deleteUser', id });
            if (res.status === 'success') {
                if (window.showToast) showToast('Akun berhasil dihapus!', 'success');
                document.getElementById('acc-ovDelete').style.display = 'none';
                await window.accLoadUsers();
            } else {
                throw new Error(res.message || 'Gagal menghapus');
            }
        } catch (err) {
            if (window.showToast) showToast('Error: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Ya, Hapus`;
        }
    }

    // ─── HELPERS ──────────────────────────────────────────
    function accClearErrs() {
        document.querySelectorAll('#section-manageacc .field-err').forEach(e => e.style.display = 'none');
        document.querySelectorAll('#section-manageacc .input-field').forEach(e => e.classList.remove('err'));
    }
    function accShowErr(errId, fieldId) {
        const e = document.getElementById(errId); if (e) e.style.display = 'block';
        const f = document.getElementById(fieldId); if (f) f.classList.add('err');
    }

    function accShowApiBar(type, msg) {
        const bar = document.getElementById('acc-apiBar');
        if (!bar) return;
        bar.className = 'api-bar ' + type;
        bar.innerHTML = `<div class="api-dot"></div> ${esc(msg)}`;
        if (type === 'ok') setTimeout(() => { bar.className = 'api-bar'; }, 4000);
    }

    function accRoleBadge(role) {
        const r = ROLES[role] || { label: role, badgeClass: 'badge-subumum' };
        return `<span class="badge ${r.badgeClass}"><span class="badge-dot"></span>${r.label}</span>`;
    }
    function accRoleLabel(role) {
        return (ROLES[role] || { label: role }).label;
    }
    function accFmtDate(d) {
        if (!d || d === '—') return '—';
        try { const dt = new Date(d); return isNaN(dt) ? d : dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return d; }
    }
    function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function escA(s) { return String(s || '').replace(/'/g, "\\'"); }

    // ═══ HTML Injection & Initialization ════════════════════
    window.sectionInits = window.sectionInits || {};
    window.sectionInits['manageacc'] = function () {
        const section = document.getElementById('section-manageacc');
        if (!section) return;

        section.innerHTML = `
            <div class="header">
            <div class="header-left">
                <h1 class="header-title">Manajemen Akun</h1>
                <p class="header-subtitle" id="acc-headerDate">Sistem pengelolaan akun pengguna</p>
            </div>
            <div class="header-right">
                <button class="btn" onclick="accLoadUsers()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                    Refresh
                </button>
                <button class="btn btn-primary" onclick="accOpenForm('add')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Tambah Akun
                </button>
            </div>
        </div >

        <div class="container">
            <!-- Banner -->
            <div class="superadmin-banner">
                <div><div class="superadmin-banner-title">Halaman Khusus Super Admin</div><div class="superadmin-banner-sub">CRUD akun pengguna langsung terhubung ke Google Sheets via Apps Script</div></div>
                <div class="superadmin-badge">SUPER ADMIN ACCESS</div>
            </div>

            <!-- Stat Cards -->
            <div class="stats-grid">
                <div class="stat-card" style="border-left:4px solid #1e293b;"><div class="stat-label">Super Admin</div><div class="stat-value" id="acc-statSuper">0</div></div>
                <div class="stat-card" style="border-left:4px solid #3b82f6;"><div class="stat-label">Sub Bag. Umum</div><div class="stat-value" id="acc-statUmum">0</div></div>
                <div class="stat-card" style="border-left:4px solid #22c55e;"><div class="stat-label">Sub Bag. Keuangan</div><div class="stat-value" id="acc-statKeuangan">0</div></div>
                <div class="stat-card" style="border-left:4px solid #a855f7;"><div class="stat-label">Sekretariat</div><div class="stat-value" id="acc-statSekretariat">0</div></div>
            </div>

            <!-- Table Card -->
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Daftar Akun Pengguna</h2>
                    <div class="filter-container">
                        <select class="select-input" id="acc-fltRole" onchange="accApplyFilter()">
                            <option value="">Semua Role</option>
                            <option value="superadmin">Super Admin</option>
                            <option value="subumum">Sub Bagian Umum</option>
                            <option value="subkeuangan">Sub Bagian Keuangan</option>
                            <option value="sekretariat">Sekretariat</option>
                        </select>
                        <input type="text" class="search-input" id="acc-searchQ" placeholder="Cari nama / email..." oninput="accApplyFilter()">
                    </div>
                </div>

                <div class="api-bar" id="acc-apiBar"></div>

                <div class="table-container">
                    <table>
                        <thead><tr><th style="width:40px">#</th><th>Pengguna</th><th>Role</th><th>Dibuat</th><th style="text-align:center;width:130px">Aksi</th></tr></thead>
                        <tbody id="acc-tblBody"><tr><td colspan="5" class="loading"><div class="spinner"></div><p style="margin-top:16px">Memuat data...</p></td></tr></tbody>
                    </table>
                </div>

                <div id="acc-mobileCards" style="padding:0 16px 8px"></div>
                <div class="pagination" id="acc-pagination"></div>
            </div>
        </div>

        <!-- MODAL: TAMBAH / EDIT -->
        <div class="modal-overlay" id="acc-ovForm" style="display:none">
            <div class="modal">
                <div class="modal-header">
                    <span class="modal-title" id="acc-formTitle">Tambah Akun Baru</span>
                    <button class="modal-close" onclick="document.getElementById('acc-ovForm').style.display='none'">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>
                <div class="modal-content">
                    <div class="info-banner">👤 Isi data akun dengan lengkap. Password minimal 8 karakter dan akan di-hash SHA-256 di server.</div>
                    <div class="form-row">
                        <div class="form-group"><label class="input-label">Nama Lengkap <span class="req">*</span></label><input type="text" class="input-field" id="acc-fName" placeholder="cth. Budi Santoso"><div class="field-err" id="acc-eName">Nama wajib diisi</div></div>
                        <div class="form-group"><label class="input-label">Email <span class="req">*</span></label><input type="email" class="input-field" id="acc-fEmail" placeholder="cth. budi@dinas.gov.id"><div class="field-err" id="acc-eEmail">Email tidak valid</div></div>
                    </div>
                    <div class="form-group">
                        <label class="input-label">Password <span class="req" id="acc-passReqMark">*</span></label>
                        <input type="password" class="input-field" id="acc-fPassword" placeholder="Minimal 8 karakter">
                        <div class="field-hint" id="acc-passHint" style="display:none">Kosongkan jika tidak ingin mengubah password</div>
                        <div class="field-err" id="acc-ePassword">Password minimal 8 karakter</div>
                    </div>

                    <div class="form-group" style="margin-bottom:0">
                        <label class="input-label">Role Akun <span class="req">*</span></label>
                        <div class="role-opts">
                            <div class="role-opt"><input type="radio" name="fRole" id="acc-rSuperAdmin" value="superadmin"><label class="role-opt-label" for="acc-rSuperAdmin"><span class="role-ico">🛡️</span><span class="role-nm">Super Admin</span><span class="role-ds">Akses penuh & kelola akun</span></label></div>
                            <div class="role-opt"><input type="radio" name="fRole" id="acc-rSubUmum" value="subumum" checked><label class="role-opt-label" for="acc-rSubUmum"><span class="role-ico">📋</span><span class="role-nm">Sub Bag. Umum</span><span class="role-ds">Pengelolaan administrasi umum</span></label></div>
                            <div class="role-opt"><input type="radio" name="fRole" id="acc-rSubKeuangan" value="subkeuangan"><label class="role-opt-label" for="acc-rSubKeuangan"><span class="role-ico">💰</span><span class="role-nm">Sub Bag. Keuangan</span><span class="role-ds">Pengelolaan keuangan & SPJ</span></label></div>
                            <div class="role-opt"><input type="radio" name="fRole" id="acc-rSekretariat" value="sekretariat"><label class="role-opt-label" for="acc-rSekretariat"><span class="role-ico">🏛️</span><span class="role-nm">Sekretariat</span><span class="role-ds">Koordinasi & kearsipan</span></label></div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer"><button class="btn" onclick="document.getElementById('acc-ovForm').style.display='none'">Batal</button><button class="btn btn-primary" id="acc-btnSave" onclick="accSaveAccount()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12" /></svg><span id="acc-saveLbl">Simpan Akun</span></button></div>
            </div>
        </div>

        <!-- MODAL: DETAIL -->
        <div class="modal-overlay" id="acc-ovView" style="display:none">
            <div class="modal">
                <div class="modal-header">
                    <span class="modal-title">Detail Akun</span>
                    <button class="modal-close" onclick="document.getElementById('acc-ovView').style.display='none'">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>
                <div class="modal-content">
                    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #f1f5f9">
                        <div class="avatar" id="acc-vAv" style="width:48px;height:48px;font-size:18px;border-radius:12px"></div>
                        <div><div style="font-size:16px;font-weight:700;color:#1e293b" id="acc-vName">—</div><div style="font-size:13px;color:#64748b;margin-top:2px" id="acc-vEmail">—</div><div style="margin-top:6px" id="acc-vRoleBadge"></div></div>
                    </div>
                    <div class="view-grid">
                        <div class="view-field"><div class="view-field-label">User ID</div><div class="view-field-value" id="acc-vId" style="font-family:monospace;font-size:11px;word-break:break-all">—</div></div>
                        <div class="view-field"><div class="view-field-label">Role</div><div class="view-field-value" id="acc-vRole">—</div></div>
                        <div class="view-field"><div class="view-field-label">Email</div><div class="view-field-value" id="acc-vEmailFull" style="font-size:13px">—</div></div>
                        <div class="view-field"><div class="view-field-label">Dibuat</div><div class="view-field-value" id="acc-vCreated">—</div></div>
                    </div>
                </div>
                <div class="modal-footer"><button class="btn" onclick="document.getElementById('acc-ovView').style.display='none'">Tutup</button><button class="btn btn-warning" id="acc-vEditBtn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit Akun</button></div>
            </div>
        </div>

        <!-- MODAL: HAPUS -->
                <div class="modal-overlay" id="acc-ovDelete" style="display:none">
                    <div class="modal confirm-modal">
                        <div class="modal-content" style="padding:28px 24px">
                            <div class="confirm-ico" style="background:#fef2f2">🗑️</div>
                            <div class="confirm-title">Hapus Akun?</div>
                            <div class="confirm-msg">Akun <strong id="acc-delName">—</strong> akan dihapus permanen dari Google Sheets.<br>Tindakan ini tidak dapat dibatalkan.</div>
                        </div>
                        <div class="modal-footer" style="justify-content:center"><button class="btn" onclick="document.getElementById('acc-ovDelete').style.display='none'">Batal</button><button class="btn btn-danger" id="acc-btnConfirmDel"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg> Ya, Hapus</button></div>
                    </div>
                </div>
            `;

        document.querySelectorAll('#section-manageacc .modal-overlay').forEach(ov => {
            ov.addEventListener('click', e => { if (e.target === ov) ov.style.display = 'none'; });
        });

        if (document.getElementById('acc-headerDate')) {
            document.getElementById('acc-headerDate').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }

        window.accLoadUsers();
    };
})();
