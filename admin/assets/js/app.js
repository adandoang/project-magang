// ============================================================
// app.js — Shared constants, API helpers, and SPA routing
// Admin Panel — Dinas Koperasi UKM
// ============================================================

// ── API URLs ─────────────────────────────────────────────────
const API_OP = 'https://script.google.com/macros/s/AKfycbyEhda6j6cf0EO6NtMrYj8oCB_m0KZn_3mcAkd9H3CoLhMn2Y2b8RmW9Zhlybj_LMWqrQ/exec';
const API_SPJ = 'https://script.google.com/macros/s/AKfycbxoYIwpRZizipn0TD84nNeoqld570-85UlnL6jBdXbbu-GVNwoEK712P7yB1e03SSU0EQ/exec';
const API_MONEV = 'https://script.google.com/macros/s/AKfycbxwvQtZzZCYRmSX4UIL-7ars1HQX3Zp6pW0g9vlcffp2lXHTacIMX8I6PYkQtzRDaua/exec';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyaEDOcK0ZFQFZoG7ia-CMbtvF68un2f1k87ECYSSOewowjRSAyJYvCiveCY6T8v9gJkg/exec';

// ── JSONP helper (GET) ─────────────────────────────────────────
function apiGet(url, params) {
    return new Promise(function (resolve, reject) {
        var cb = '__x' + Date.now() + (Math.random() * 9999 | 0);
        var qs = new URLSearchParams(Object.assign({}, params, { callback: cb })).toString();
        var s = document.createElement('script');
        var done = false;
        var clean = function () {
            done = true;
            delete window[cb];
            if (s.parentNode) s.parentNode.removeChild(s);
        };
        window[cb] = function (d) { clean(); resolve(d); };
        s.onerror = function () { clean(); reject(new Error('network error')); };
        s.src = url + '?' + qs;
        setTimeout(function () { if (!done) { clean(); reject(new Error('timeout')); } }, 20000);
        document.head.appendChild(s);
    });
}

// JSONP helper via jsonBody (untuk action yang butuh body)
function apiJsonGet(url, payload, callback) {
    return new Promise(function (resolve, reject) {
        var cb = callback || ('__gas_' + Date.now() + '_' + (Math.random() * 9999 | 0));
        var body = encodeURIComponent(JSON.stringify(payload));
        var script = document.createElement('script');
        var done = false;
        window[cb] = function (data) { done = true; delete window[cb]; script.remove(); resolve(data); };
        script.onerror = function () { if (done) return; delete window[cb]; script.remove(); reject(new Error('Gagal terhubung.')); };
        setTimeout(function () { if (done) return; delete window[cb]; script.remove(); reject(new Error('Request timeout (15s)')); }, 15000);
        script.src = url + '?jsonBody=' + body + '&callback=' + cb;
        document.head.appendChild(script);
    });
}

// ── Logout ────────────────────────────────────────────────────
function logout() {
    try { AUTH.logout(); } catch (e) { }
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// ── SPA: Registry & Router ────────────────────────────────────
// Setiap section mendaftarkan fungsi init-nya ke sini
window.sectionInits = window.sectionInits || {};

function showSection(id) {
    // ── Otorisasi SPA ──
    if (typeof AUTH !== 'undefined') {
        const user = AUTH.getUser();
        if (user) {
            const role = AUTH.normalizeRole(user.role);
            if (role) {
                const allowed = AUTH.ROLE_ACCESS[role] || [];
                const key = AUTH.SECTIONS ? AUTH.SECTIONS[id] : null;
                if (key && !allowed.includes(key)) {
                    console.warn('[SPA] Akses ditolak ke section:', id);
                    if (window.showToast) showToast('Akses ditolak ke menu ini', 'error');
                    window.location.replace(AUTH.ROLE_HOME[role] || 'index.html#dashboard');
                    return;
                }
            }
        }
    }

    // Sembunyikan semua section
    document.querySelectorAll('.admin-section').forEach(function (s) {
        s.style.display = 'none';
    });

    // Tampilkan section yang dipilih
    var target = document.getElementById('section-' + id);
    if (target) {
        target.style.display = 'block';
    } else {
        // Fallback ke dashboard jika section tidak ditemukan
        id = 'dashboard';
        var dash = document.getElementById('section-dashboard');
        if (dash) dash.style.display = 'block';
    }

    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(function (n) {
        n.classList.remove('active');
    });
    var activeNav = document.querySelector('.nav-item[data-section="' + id + '"]');
    if (activeNav) activeNav.classList.add('active');

    // Update URL hash
    window.location.hash = id;

    // Tutup sidebar mobile
    if (window.innerWidth < 1024) {
        var sidebar = document.getElementById('sidebar');
        var overlay = document.querySelector('.sidebar-overlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }

    // Panggil init function jika belum diinisialisasi (lazy init)
    if (window.sectionInits && window.sectionInits[id]) {
        var initFn = window.sectionInits[id];
        delete window.sectionInits[id]; // hanya sekali
        try { initFn(); } catch (e) { console.error('[SPA] init error for section', id, e); }
    }
}

// ── Init SPA on load ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    // Set admin user info dari localStorage
    var user = {};
    try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) { }
    var nameEl = document.getElementById('adminName');
    var emailEl = document.getElementById('adminEmail');
    if (nameEl) nameEl.textContent = user.name || 'Administrator';
    if (emailEl) emailEl.textContent = user.email || 'admin@dinas.gov.id';

    // Routing berdasarkan URL hash
    var hash = window.location.hash.replace('#', '') || 'dashboard';
    showSection(hash);

    // Listen hash change (tombol back/forward browser)
    window.addEventListener('hashchange', function () {
        var newHash = window.location.hash.replace('#', '') || 'dashboard';
        showSection(newHash);
    });
});
