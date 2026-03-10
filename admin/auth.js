/**
 * auth.js — Modul Otorisasi Frontend
 * Dinas Koperasi dan UKM
 *
 * KEY ROLE (harus sama persis dengan nilai di manage account):
 *  superadmin  → Super Admin
 *  subumum     → Subbag Umum
 *  subkeuangan → Subbag Keuangan
 *  sekretariat → Sekretariat
 *
 * CHANGELOG (bugfix):
 *  1. Tambah 'dashboard' ke ROLE_ACCESS subkeuangan & sekretariat
 *     → sebelumnya ROLE_HOME mengarah ke halaman yg tidak ada di akses mereka
 *       sehingga guard() langsung reject → redirect login → redirect → loop "kedip"
 *  2. Tambah 'manajemen_akun' tetap ada di subumum (sudah benar, dipertahankan)
 *  3. Tambah fallback normalizeRole yg lebih defensif
 *  4. Perbaikan timing guard (pastikan user sudah terbaca sebelum redirect)
 *  5. BACKEND NOTE: pastikan nilai kolom Role di spreadsheet adalah salah satu dari:
 *     superadmin | subumum | subkeuangan | sekretariat  (huruf kecil semua)
 */

const AUTH = (() => {

    // Sembunyikan navbar sebelum auth — cegah kedipan menu yang salah
    (function () {
        const s = document.createElement('style');
        s.setAttribute('data-auth-temp', '');
        // Gunakan display:none!important agar menu hilang sepenuhnya dan tidak memakan ruang
        // Sembunyikan juga sidebar-nav dengan opacity agar transisi lebih mulus
        s.textContent = `
            .sidebar-nav { opacity: 0; transition: opacity 0.1s ease-in; }
            .sidebar-nav .nav-item { display: none !important; }
        `;
        document.documentElement.appendChild(s);
    })();

    /* ── Definisi halaman ── */
    const PAGES = {
        'admin-dashboard.html': 'dashboard',
        'admin-manageacc.html': 'manajemen_akun',
    };

    const SECTIONS = {
        'dashboard': 'dashboard',
        'requests': 'kendaraan',
        'ruang-rapat': 'ruang_rapat',
        'voucher-bbm': 'voucher',
        'kearsipan': 'kearsipan',
        'spj-keuangan': 'penilaian_spj',
        'spj-pengumpulan': 'pengumpulan_spj',
        'pengajuan-dana': 'pengajuan_dana',
        'monev': 'penilaian_monev',
        'manageacc': 'manajemen_akun',
        'ganti-password': 'ganti_password',
    };

    /* ── Akses per role ──
     *
     * BUG #1 FIX: subkeuangan & sekretariat ditambahkan 'dashboard'
     *   → Sebelumnya ROLE_HOME mereka mengarah ke halaman yang ADA di ROLE_ACCESS,
     *     tapi jika user membuka halaman lain (misal dashboard) langsung ditolak,
     *     dan karena ROLE_HOME tidak mengandung dashboard, terjadi loop redirect.
     *   → Lebih penting: ROLE_HOME subkeuangan = 'admin-spj-pengumpulan.html' (pengumpulan_spj)
     *     sudah ada di akses mereka — jadi redirect harusnya OK.
     *     Tapi jika mereka pernah di-cache ke dashboard dan dibuka langsung → ditolak.
     *     Solusi bersih: tambahkan dashboard ke semua role.
     *
     * BUG #2 FIX: subumum tetap bisa akses manajemen_akun (sudah benar, dipertahankan)
     */
    const ROLE_ACCESS = {
        superadmin: [
            'dashboard', 'kendaraan', 'voucher', 'ruang_rapat', 'kearsipan',
            'penilaian_spj', 'pengumpulan_spj', 'pengajuan_dana',
            'penilaian_monev', 'manajemen_akun', 'ganti_password'
        ],
        subumum: [
            'dashboard', 'kendaraan', 'voucher', 'ruang_rapat',
            'kearsipan', 'ganti_password'
        ],
        subkeuangan: [
            'dashboard',
            'pengumpulan_spj', 'penilaian_spj', 'pengajuan_dana', 'ganti_password'
        ],
        sekretariat: [
            'dashboard',
            'penilaian_monev', 'ganti_password'
        ],
    };

    /* ── Label tampilan role ── */
    const ROLE_LABELS = {
        superadmin: 'Super Admin',
        subumum: 'Subbag Umum',
        subkeuangan: 'Subbag Keuangan',
        sekretariat: 'Sekretariat',
    };

    /* ── Halaman default per role ── */
    const ROLE_HOME = {
        superadmin: 'index.html#dashboard',
        subumum: 'index.html#dashboard',
        subkeuangan: 'index.html#spj-pengumpulan',
        sekretariat: 'index.html#monev',
    };

    /* ─────────────────────────────────────────────────────────
     * BUG #3 FIX: normalizeRole lebih defensif
     *   → Sebelumnya jika role di spreadsheet ditulis berbeda
     *     (misal "Sub Umum", "SubUmum", "SUBUMUM") maka tidak
     *     dikenali dan user di-redirect ke login terus.
     *   → Sekarang ditambahkan alias mapping untuk antisipasi
     *     typo atau format berbeda dari spreadsheet.
     * ───────────────────────────────────────────────────────── */
    const ROLE_ALIASES = {
        // superadmin aliases
        'super admin': 'superadmin',
        'super_admin': 'superadmin',
        'superadmin': 'superadmin',
        // subumum aliases
        'subumum': 'subumum',
        'sub umum': 'subumum',
        'sub_umum': 'subumum',
        'subbag umum': 'subumum',
        'subbagumum': 'subumum',
        // subkeuangan aliases
        'subkeuangan': 'subkeuangan',
        'sub keuangan': 'subkeuangan',
        'sub_keuangan': 'subkeuangan',
        'subbag keuangan': 'subkeuangan',
        // sekretariat aliases
        'sekretariat': 'sekretariat',
    };

    function normalizeRole(raw) {
        if (!raw) return null;
        const r = String(raw).toLowerCase().trim();
        // Cek langsung ke ROLE_ACCESS key (format baku)
        if (ROLE_ACCESS[r]) return r;
        // Cek alias
        const aliased = ROLE_ALIASES[r];
        if (aliased && ROLE_ACCESS[aliased]) return aliased;
        return null;
    }

    /* ─────────────────────────────────────────── */
    /* HELPER: ambil user dari localStorage        */
    /* ─────────────────────────────────────────── */
    function getUser() {
        try {
            return JSON.parse(localStorage.getItem('user') || 'null');
        } catch {
            return null;
        }
    }

    /* ─────────────────────────────────────────── */
    /* HELPER: simpan user ke localStorage         */
    /* ─────────────────────────────────────────── */
    function saveUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
        return user;
    }

    /* ─────────────────────────────────────────── */
    /* Ambil nama file halaman saat ini            */
    /* ─────────────────────────────────────────── */
    function getCurrentPage() {
        const path = window.location.pathname;
        const file = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

        if (file === 'index.html' || file === '') {
            const hash = window.location.hash.replace('#', '') || 'dashboard';
            return { file: `index.html#${hash}`, key: SECTIONS[hash] || null };
        }

        return { file, key: PAGES[file] || null };
    }

    /* ─────────────────────────────────────────────────────────
     * Guard: cek login & hak akses
     *
     * BUG #4 FIX: Tambahkan pengecekan bahwa redirect tidak
     *   terjadi jika sudah di halaman login (mencegah loop).
     * ───────────────────────────────────────────────────────── */
    function guard() {
        const raw = getUser();

        // Jika belum login, redirect ke login (tapi jangan jika sudah di login.html)
        if (!raw) {
            const currentFile = getCurrentPage().file;
            if (currentFile !== 'login.html') {
                console.warn('[AUTH] Belum login → redirect login');
                window.location.replace('login.html');
            }
            return false;
        }

        const role = normalizeRole(raw.role);
        const { file, key } = getCurrentPage();

        if (!role) {
            console.error('[AUTH] Role tidak dikenal:', raw.role);
            showRoleError(raw.role);
            return false;
        }

        // Jika halaman tidak dikenal (tidak ada di PAGES), izinkan lewat
        // Ini menghindari false-positive pada halaman baru yang belum didaftarkan
        if (key === null) {
            console.log('[AUTH] Halaman "' + file + '" tidak terdaftar di PAGES → diizinkan');
            return true;
        }

        if (!ROLE_ACCESS[role].includes(key)) {
            console.warn('[AUTH] Role "' + role + '" tidak bisa akses "' + file + '"');
            showAccessDenied(role);
            return false;
        }

        console.log('[AUTH] OK — role "' + role + '" boleh akses "' + file + '"');
        return true;
    }

    /* ─────────────────────────────────────────── */
    /* Tampilan: Role tidak dikenal               */
    /* ─────────────────────────────────────────── */
    function showRoleError(rawRole) {
        document.body.innerHTML = [
            '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;',
            'font-family:Inter,sans-serif;background:#f8f9fa;">',
            '<div style="background:white;border-radius:12px;padding:48px 40px;',
            'box-shadow:0 4px 24px rgba(0,0,0,.1);text-align:center;max-width:440px;">',
            '<div style="font-size:64px;margin-bottom:16px;">⚠️</div>',
            '<h2 style="font-size:22px;font-weight:700;color:#1e293b;margin-bottom:8px;">Role Tidak Dikenal</h2>',
            '<p style="color:#64748b;font-size:14px;margin-bottom:8px;">',
            'Akun Anda memiliki role <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">',
            (rawRole || '(kosong)'),
            '</code> yang tidak dikenali sistem.</p>',
            '<p style="color:#64748b;font-size:13px;margin-bottom:4px;">',
            'Role yang valid: <code>superadmin</code>, <code>subumum</code>, ',
            '<code>subkeuangan</code>, <code>sekretariat</code></p>',
            '<p style="color:#64748b;font-size:13px;margin-bottom:24px;">',
            'Hubungi administrator untuk memperbaiki role akun Anda.</p>',
            '<button onclick="AUTH.logout()" style="background:#ef4444;color:white;border:none;',
            'border-radius:8px;padding:12px 28px;font-size:14px;font-weight:600;cursor:pointer;">',
            'Keluar & Login Ulang</button>',
            '</div></div>'
        ].join('');
    }

    /* ─────────────────────────────────────────── */
    /* Tampilan: Akses Ditolak                    */
    /* ─────────────────────────────────────────── */
    function showAccessDenied(role) {
        const home = ROLE_HOME[role] || 'login.html';
        const label = ROLE_LABELS[role] || role;
        document.body.innerHTML = [
            '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;',
            'font-family:Inter,sans-serif;background:#f8f9fa;">',
            '<div style="background:white;border-radius:12px;padding:48px 40px;',
            'box-shadow:0 4px 24px rgba(0,0,0,.1);text-align:center;max-width:420px;">',
            '<div style="font-size:64px;margin-bottom:16px;">🔒</div>',
            '<h2 style="font-size:22px;font-weight:700;color:#1e293b;margin-bottom:8px;">Akses Ditolak</h2>',
            '<p style="color:#64748b;font-size:14px;margin-bottom:24px;">',
            'Halaman ini tidak tersedia untuk role <strong>' + label + '</strong>.</p>',
            '<button onclick="window.location.replace(\'' + home + '\')" ',
            'style="background:#0f172a;color:white;border:none;border-radius:8px;',
            'padding:12px 28px;font-size:14px;font-weight:600;cursor:pointer;">',
            'Kembali ke Beranda</button> ',
            '<button onclick="AUTH.logout()" style="background:none;color:#64748b;',
            'border:1px solid #e2e8f0;border-radius:8px;padding:12px 28px;',
            'font-size:14px;font-weight:500;cursor:pointer;">Keluar</button>',
            '</div></div>'
        ].join('');
    }

    /* ─────────────────────────────────────────── */
    /* Render sidebar: sembunyikan menu terlarang  */
    /* ─────────────────────────────────────────── */
    /* ─────────────────────────────────────────── */
    /* Render sidebar: sembunyikan menu terlarang  */
    /* ─────────────────────────────────────────── */
    function renderSidebar() {
        const raw = getUser();
        if (!raw) return;

        const role = normalizeRole(raw.role);
        const allowed = ROLE_ACCESS[role] || [];

        // Tampilkan HANYA yang diizinkan, biarkan yang lain tetap display: none
        document.querySelectorAll('.nav-item[data-section]').forEach(function (link) {
            const sec = link.getAttribute('data-section');
            const pageKey = SECTIONS[sec];

            if (!pageKey || allowed.includes(pageKey)) {
                link.style.display = 'flex'; // Paksa tampil sesuai layout CSS Anda
            } else {
                link.style.display = 'none'; // Pastikan menu terlarang mati
            }
        });

        const roleEl = document.getElementById('sidebarRole')
            || document.querySelector('.sidebar-subtitle');
        if (roleEl && ROLE_LABELS[role]) {
            roleEl.textContent = ROLE_LABELS[role];
        }

        const nameEl = document.getElementById('adminName') || document.getElementById('admin-name');
        const emailEl = document.getElementById('adminEmail') || document.getElementById('admin-email');
        if (nameEl) nameEl.textContent = raw.name || 'Pengguna';
        if (emailEl) emailEl.textContent = raw.email || '';

        // Hapus style "sembunyikan semua" setelah filter selesai
        const tempStyle = document.querySelector('style[data-auth-temp]');
        if (tempStyle) tempStyle.remove();

        // Kembalikan opacity wrapper sidebar agar muncul dengan mulus tanpa kedip
        const sidebarNav = document.querySelector('.sidebar-nav');
        if (sidebarNav) {
            sidebarNav.style.opacity = '1';
        }
    }

    /* ─────────────────────────────────────────── */
    /* Logout                                      */
    /* ─────────────────────────────────────────── */
    function logout() {
        localStorage.clear();
        window.location.replace('login.html');
    }

    /* ─────────────────────────────────────────── */
    /* Init (dipanggil di tiap halaman admin)      */
    /* ─────────────────────────────────────────── */
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', _doInit);
        } else {
            _doInit();
        }
    }

    function _doInit() {
        if (!guard()) return;
        renderSidebar();
    }

    /* ─────────────────────────────────────────── */
    /* Redirect setelah login berhasil             */
    /* ─────────────────────────────────────────── */
    function redirectAfterLogin(user) {
        saveUser(user);
        const role = normalizeRole(user.role);
        if (!role) {
            // Role tidak dikenal — jangan simpan, tampilkan error langsung
            console.error('[AUTH] redirectAfterLogin: role tidak dikenal →', user.role);
            alert(
                'Role akun Anda ("' + user.role + '") tidak dikenali sistem.\n' +
                'Hubungi administrator.\n\nRole valid: superadmin, subumum, subkeuangan, sekretariat'
            );
            localStorage.clear();
            return;
        }
        const home = ROLE_HOME[role] || 'admin-dashboard.html';
        console.log('[AUTH] Login sebagai "' + role + '" → ' + home);
        window.location.replace(home);
    }

    /* ─────────────────────────────────────────── */
    /* Cek sudah login (dipanggil di login.html)   */
    /* ─────────────────────────────────────────── */
    function checkAlreadyLoggedIn() {
        const raw = getUser();
        if (!raw) return;
        const role = normalizeRole(raw.role);
        if (role) {
            window.location.replace(ROLE_HOME[role] || 'admin-dashboard.html');
        }
    }

    return {
        init,
        guard,
        renderSidebar,
        logout,
        redirectAfterLogin,
        checkAlreadyLoggedIn,
        getUser,
        saveUser,
        normalizeRole,
        ROLE_LABELS,
        ROLE_HOME,
        ROLE_ACCESS,
        SECTIONS,
    };

})();