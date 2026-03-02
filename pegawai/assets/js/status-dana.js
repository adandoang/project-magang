// ============================================
// STATUS PENGAJUAN DANA - JavaScript Functions
// FIXED: JSONP fetch + field mapping yang benar
// ============================================

const ANGGARAN_GAS_URL = "https://script.google.com/macros/s/AKfycbxoYIwpRZizipn0TD84nNeoqld570-85UlnL6jBdXbbu-GVNwoEK712P7yB1e03SSU0EQ/exec";

let allDana = [];
let currentDanaFilter = 'ALL';

// ============================================
// FIX: Google Apps Script mengembalikan
// Content-Type: application/javascript, bukan JSON.
// fetch() biasa gagal parse → harus pakai JSONP.
// ============================================
function fetchJSONP(url) {
    return new Promise((resolve, reject) => {
        // Buat nama callback unik agar tidak tabrakan
        const callbackName = 'jsonp_cb_' + Date.now() + '_' + Math.floor(Math.random() * 10000);

        // Buat script tag
        const script = document.createElement('script');
        script.src = url + '&callback=' + callbackName;

        // Timeout 15 detik
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('JSONP request timeout'));
        }, 15000);

        // Daftarkan callback ke window
        window[callbackName] = function (data) {
            cleanup();
            resolve(data);
        };

        function cleanup() {
            clearTimeout(timeout);
            delete window[callbackName];
            if (script.parentNode) script.parentNode.removeChild(script);
        }

        script.onerror = function () {
            cleanup();
            reject(new Error('Script load error'));
        };

        document.head.appendChild(script);
    });
}

// ============================================
// MAIN FUNCTIONS
// ============================================

function showDanaStatus() {
    console.log('🔄 showDanaStatus called');

    const dropdownContent = document.getElementById('status-dropdown');
    if (dropdownContent) dropdownContent.classList.remove('show');

    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));
    document.getElementById('status-dana').classList.add('active');

    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => tab.classList.remove('active'));

    const mobileSelect = document.getElementById('mobile-nav-select');
    if (mobileSelect) mobileSelect.value = 'status-dana';

    showLoadingDana();
    loadDanaData();
}

function loadDanaData() {
    const url = `${ANGGARAN_GAS_URL}?action=getPengajuanDana`;
    console.log('🔄 Fetching (JSONP) from:', url);

    // FIX: Gunakan JSONP karena GAS return Content-Type: application/javascript
    fetchJSONP(url)
        .then(data => {
            console.log('✅ Data received:', data);

            if (data && data.success === true) {
                allDana = data.data || [];
                console.log('✅ Total data:', allDana.length);
                if (allDana.length > 0) console.log('📊 Sample:', allDana[0]);
                renderDanaTable(allDana);
            } else {
                console.error('❌ Response not successful:', data);
                showDanaError(data ? data.message : 'Gagal mengambil data');
                allDana = [];
                renderDanaTable([]);
            }
            hideLoadingDana();
        })
        .catch(error => {
            console.error('❌ Fetch error:', error);
            showDanaError('Tidak dapat terhubung ke server. Periksa koneksi internet.');
            allDana = [];
            renderDanaTable([]);
            hideLoadingDana();
        });
}

function renderDanaTable(data) {
    console.log('🎨 Rendering table with', data.length, 'items');
    const tbody = document.getElementById('dana-table-body');
    let html = '';

    if (!data || data.length === 0) {
        html = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #6b7280;">
                    Tidak ada data pengajuan dana
                </td>
            </tr>`;
    } else {
        data.forEach(item => {
            const statusClass = (item.status || 'PENDING').toLowerCase();

            const timestamp = item.timestamp
                ? new Date(item.timestamp).toLocaleDateString('id-ID', {
                    day: '2-digit', month: 'short', year: 'numeric'
                })
                : '-';

            const nominal = item.nominalPengajuan
                ? new Intl.NumberFormat('id-ID', {
                    style: 'currency', currency: 'IDR',
                    minimumFractionDigits: 0, maximumFractionDigits: 0
                }).format(item.nominalPengajuan)
                : '-';

            // FIX: field name sesuai GAS → bulanPengajuan (bukan bulan)
            const bulan = item.bulanPengajuan || '-';
            const status = item.status || 'PENDING';
            const subKegiatan = item.subKegiatan || '-';
            const subKegiatanDisplay = subKegiatan.length > 50
                ? subKegiatan.substring(0, 47) + '...'
                : subKegiatan;

            html += `
                <tr data-status="${status}"
                    data-search="${(item.nama || '').toLowerCase()} ${(item.unit || '').toLowerCase()} ${subKegiatan.toLowerCase()} ${bulan.toLowerCase()}">
                    <td>${timestamp}</td>
                    <td>${item.nama || '-'}</td>
                    <td>${item.unit || '-'}</td>
                    <td title="${subKegiatan}">${subKegiatanDisplay}</td>
                    <td>${bulan}</td>
                    <td style="text-align: right; font-weight: 600;">${nominal}</td>
                    <td><span class="status-badge ${statusClass}">${status}</span></td>
                </tr>`;
        });
    }

    tbody.innerHTML = html;
}

function filterDana() {
    const searchTerm = document.getElementById('search-dana').value.toLowerCase();
    const rows = document.querySelectorAll('#dana-table-body tr');

    rows.forEach(row => {
        const searchData = row.getAttribute('data-search');
        if (!searchData) return;
        row.style.display = searchData.includes(searchTerm) ? '' : 'none';
    });
}

function filterDanaByStatus(status) {
    console.log('🔍 Filter by status:', status);
    currentDanaFilter = status;

    const buttons = document.querySelectorAll('#status-dana .filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    buttons.forEach(btn => {
        if ((btn.textContent.includes('Semua') && status === 'ALL') ||
            (btn.textContent.includes('Disetujui') && status === 'APPROVED') ||
            (btn.textContent.includes('Pending') && status === 'PENDING') ||
            (btn.textContent.includes('Ditolak') && status === 'REJECTED')) {
            btn.classList.add('active');
        }
    });

    if (status === 'ALL') {
        renderDanaTable(allDana);
    } else {
        const filtered = allDana.filter(d => (d.status || 'PENDING') === status);
        console.log('✅ Filtered:', filtered.length, 'items');
        renderDanaTable(filtered);
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function showLoadingDana() {
    const tbody = document.getElementById('dana-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #6b7280;">
                    <div class="spinner" style="margin: 0 auto 10px;"></div>
                    Memuat data...
                </td>
            </tr>`;
    }
}

function hideLoadingDana() {
    // Loading sudah di-replace oleh renderDanaTable
}

function showDanaError(message) {
    const tbody = document.getElementById('dana-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #ef4444;">
                    ⚠️ ${message || 'Terjadi kesalahan saat memuat data'}
                    <br><br>
                    <button class="btn btn-primary" onclick="loadDanaData()" style="font-size: 0.875rem; padding: 8px 16px;">
                        Coba Lagi
                    </button>
                </td>
            </tr>`;
    }
}

console.log('✅ status-dana.js (FIXED) loaded');