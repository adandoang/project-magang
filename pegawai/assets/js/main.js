// ============================================
// GOOGLE APPS SCRIPT CONFIGURATION
// ============================================
const GAS_URL = "https://script.google.com/macros/s/AKfycbwQoOafMsgYDpsLZyD2Wp4_S-D-HT1WRRWIpn33UH8i8Qv8hQJqeiir5oPQIwmj90jS/exec";

// ============================================
// GLOBAL VARIABLES
// ============================================
let selectedFile = null;            // legacy (pengajuan-dana/SPJ)
let selectedFiles = [];             // multi: arsip
let arsipUploadMode = 'file';       // 'file' | 'drive'
let driveLinksCounter = 1;          // untuk ID unik drive-link-row
let selectedPengajuanFile = null;
let selectedMonevFile = null;
let selectedBuktiFile = null;
let currentCalendarType = 'KENDARAAN';
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let calendarData = {};
let allSchedules = [];
let allVouchers = [];
let currentVoucherFilter = 'ALL';

// ============================================
// HELPER: Animasi progress bar
// progressId  : id elemen .progress-bar
// loadingId   : id elemen .loading
// persen      : 0-100
// ============================================
function setProgress(progressId, loadingId, persen, labelText) {
    const bar = document.getElementById(progressId);
    const loading = document.getElementById(loadingId);

    if (bar) {
        bar.classList.add('show');
        bar.querySelector('.progress-fill').style.width = persen + '%';
    }
    if (loading && labelText !== undefined) {
        loading.textContent = labelText;
        loading.classList.add('show');
    }
}

function hideProgress(progressId, loadingId) {
    const bar = document.getElementById(progressId);
    const loading = document.getElementById(loadingId);

    if (bar) {
        bar.querySelector('.progress-fill').style.width = '0%';
        setTimeout(() => bar.classList.remove('show'), 300);
    }
    if (loading) {
        loading.classList.remove('show');
    }
}

// ============================================
// MOBILE DROPDOWN NAVIGATION
// ============================================
const navMap = {
    'home': 'home',
    'kendaraan': 'kendaraan',
    'ruangan': 'ruangan',
    'voucher': 'voucher',
    'arsip': 'arsip',
    'pengajuan-dana': 'pengajuan-dana',
    'spj': 'spj',
    'transparansi-nilai': 'transparansi-nilai',

    'transparansi-spj': () => {
        showSection('transparansi-nilai');
        setTimeout(() => loadNilaiData('spj-keuangan'), 100);
    },

    'transparansi-monev': () => {
        showSection('transparansi-nilai');
        setTimeout(() => loadNilaiData('monev'), 100);
    },

    'status-kendaraan': () => showCalendar('KENDARAAN'),
    'status-ruangan': () => showCalendar('RUANG_RAPAT'),
    'status-voucher': () => showVoucherStatus(),
    'status-dana': () => showDanaStatus()
};


// ============================================
// NAVIGATION FUNCTIONS
// ============================================
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => tab.classList.remove('active'));

    if (event && event.target) {
        event.target.classList.add('active');
    }

    const mobileSelect = document.getElementById('mobile-nav-select');
    if (mobileSelect) {
        mobileSelect.value = sectionId;
    }
}

function showLoading() {
    document.getElementById('loading-overlay').classList.add('show');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.remove('show');
}

// ============================================
// DROPDOWN TOGGLE (DESKTOP)
// ============================================
function toggleDropdown(event, dropdownId) {
    event.stopPropagation();

    document.querySelectorAll('.dropdown-content').forEach(d => {
        if (d.id !== dropdownId) d.classList.remove('show');
    });
    document.querySelectorAll('.nav-dropdown button').forEach(btn => {
        btn.classList.remove('active-dropdown');
    });

    const dropdown = document.getElementById(dropdownId);
    const button = event.target;
    if (!dropdown) return;

    dropdown.classList.toggle('show');
    if (dropdown.classList.contains('show')) {
        button.classList.add('active-dropdown');
    }
}

document.addEventListener('click', function (event) {
    const dropdownButton = event.target.closest('.nav-dropdown');
    if (!dropdownButton) {
        document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
        document.querySelectorAll('.nav-dropdown button').forEach(btn => btn.classList.remove('active-dropdown'));
    }
});

// ============================================
// CALENDAR FUNCTIONS
// ============================================
function showCalendar(type) {
    currentCalendarType = type;

    const dropdownContent = document.getElementById('status-dropdown');
    if (dropdownContent) dropdownContent.classList.remove('show');

    const titles = {
        'KENDARAAN': { title: 'Status Pengajuan Mobil', subtitle: 'Lihat semua status pengajuan kendaraan dinas' },
        'RUANG_RAPAT': { title: 'Status Pengajuan Ruang Rapat', subtitle: 'Lihat semua status penggunaan ruang rapat' }
    };

    document.getElementById('calendar-title').textContent = titles[type].title;
    document.getElementById('calendar-subtitle').textContent = titles[type].subtitle;

    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('kalender').classList.add('active');
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    const mobileSelect = document.getElementById('mobile-nav-select');
    if (mobileSelect) mobileSelect.value = type === 'KENDARAAN' ? 'status-kendaraan' : 'status-ruangan';

    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();

    showLoading();
    loadCalendarData();
}

function loadCalendarData() {
    const url = `${GAS_URL}?action=getSchedule&type=${currentCalendarType}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                calendarData = data.summary || {};
                renderCalendar();
            } else {
                calendarData = {};
                renderCalendar();
            }
            hideLoading();
        })
        .catch(error => {
            console.error('❌ Fetch error:', error);
            calendarData = {};
            renderCalendar();
            hideLoading();
        });
}

function renderCalendar() {
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    document.getElementById('calendar-month-year').textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        grid.appendChild(header);
    });

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';

        if (dateStr === todayStr) dayDiv.classList.add('today');

        const bookingCount = calendarData[dateStr] || 0;
        if (bookingCount > 0) dayDiv.classList.add('has-booking');

        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = day;
        dayDiv.appendChild(dayNumber);

        if (bookingCount > 0) {
            const label = document.createElement('div');
            label.className = 'calendar-day-label';
            label.textContent = `${bookingCount}`;
            dayDiv.appendChild(label);

            dayDiv.style.cursor = 'pointer';
            dayDiv.setAttribute('data-date', dateStr);
            dayDiv.addEventListener('click', function () {
                showScheduleDetail(this.getAttribute('data-date'));
            });
        } else {
            dayDiv.style.cursor = 'default';
        }

        grid.appendChild(dayDiv);
    }
}

function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    else if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    showLoading();
    setTimeout(() => { renderCalendar(); hideLoading(); }, 300);
}

function goToToday() {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
    showLoading();
    setTimeout(() => { renderCalendar(); hideLoading(); }, 300);
}

// ============================================
// SCHEDULE DETAIL FUNCTIONS
// ============================================
function showScheduleDetail(date) {
    showLoading();
    const url = `${GAS_URL}?action=getSchedule&type=${currentCalendarType}&date=${date}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.status === 'success' && data.schedules && data.schedules.length > 0) {
                displayScheduleDetailPage(date, data.schedules);
            } else {
                alert('Tidak ada jadwal pada tanggal ini');
            }
        })
        .catch(error => {
            console.error('❌ Error:', error);
            hideLoading();
            alert('Gagal memuat detail jadwal');
        });
}

function displayScheduleDetailPage(date, schedules) {
    allSchedules = schedules;
    const dateObj = new Date(date + 'T00:00:00');
    const dateFormatted = dateObj.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const typeTitle = currentCalendarType === 'KENDARAAN' ? 'Jadwal Mobil' : 'Jadwal Ruang Rapat';

    document.getElementById('detail-title').textContent = `${typeTitle} - ${dateFormatted}`;
    document.getElementById('detail-subtitle').textContent = `${schedules.length} pengajuan ditemukan`;
    document.getElementById('search-schedule').value = '';
    renderScheduleList(schedules);

    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('detail-jadwal').classList.add('active');
}

function formatTime(dateString) {
    if (!dateString) return '-';
    if (/^\d{2}:\d{2}$/.test(dateString)) return dateString + ' WIB';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} WIB`;
}

function formatTimeRange(startString, endString) {
    return `${formatTime(startString)} - ${formatTime(endString)}`;
}

function renderScheduleList(schedules) {
    const container = document.getElementById('detail-schedules-container');

    if (schedules.length === 0) {
        container.innerHTML = `
            <div class="schedule-cards-grid">
                <div class="no-schedule">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:40px;height:40px;margin:0 auto 12px;display:block;opacity:0.3;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Tidak ada jadwal yang cocok dengan pencarian
                </div>
            </div>`;
        return;
    }

    // Count statuses for summary chips
    const statusCount = { approved: 0, pending: 0, rejected: 0 };
    schedules.forEach(s => {
        const st = (s.Status || '').toLowerCase();
        if (st === 'approved' || st === 'disetujui') statusCount.approved++;
        else if (st === 'pending' || st === 'menunggu') statusCount.pending++;
        else if (st === 'rejected' || st === 'ditolak') statusCount.rejected++;
    });

    // Update header count badge
    const subtitleEl = document.getElementById('detail-subtitle');
    if (subtitleEl) {
        subtitleEl.innerHTML = `
            ${schedules.length} pengajuan &nbsp;·&nbsp;
            ${statusCount.approved > 0 ? `<span style="color:#059669;font-weight:700;">${statusCount.approved} disetujui</span>` : ''}
            ${statusCount.pending > 0 ? `${statusCount.approved > 0 ? ' &nbsp;·&nbsp; ' : ''}<span style="color:#d97706;font-weight:700;">${statusCount.pending} pending</span>` : ''}
            ${statusCount.rejected > 0 ? `${(statusCount.approved + statusCount.pending) > 0 ? ' &nbsp;·&nbsp; ' : ''}<span style="color:#dc2626;font-weight:700;">${statusCount.rejected} ditolak</span>` : ''}
        `;
    }

    const clockIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

    let cards = '';

    if (currentCalendarType === 'KENDARAAN') {
        schedules.forEach(schedule => {
            const statusRaw = (schedule.Status || '').toLowerCase();
            const nomorKend = schedule['Nomor Kendaraan'] ? `
                <div class="schedule-card-row">
                    <span class="schedule-card-label">No. Kend.</span>
                    <span class="schedule-card-value"><strong>${schedule['Nomor Kendaraan']}</strong></span>
                </div>` : '';

            cards += `
                <div class="schedule-card status-${statusRaw}" data-nama="${(schedule.Nama || '').toLowerCase()}">
                    <div class="schedule-card-strip"></div>
                    <div class="schedule-card-header">
                        <div class="schedule-card-name">${schedule.Nama}</div>
                        <span class="schedule-card-status ${statusRaw}">${schedule.Status}</span>
                    </div>
                    <div class="schedule-card-body">
                        <div class="schedule-card-time">
                            ${clockIcon}
                            ${formatTimeRange(schedule['Jam Mulai'], schedule['Jam Selesai'])}
                        </div>
                        <div class="schedule-card-info">
                            <div class="schedule-card-row">
                                <span class="schedule-card-label">Unit</span>
                                <span class="schedule-card-value"><span class="schedule-unit-badge">${schedule.Unit}</span></span>
                            </div>
                            ${nomorKend}
                            <div class="schedule-card-divider"></div>
                            <div class="schedule-card-row">
                                <span class="schedule-card-label">Keperluan</span>
                                <span class="schedule-card-value">${schedule.Keperluan}</span>
                            </div>
                            <div class="schedule-card-row">
                                <span class="schedule-card-label">Tujuan</span>
                                <span class="schedule-card-value">${schedule.Alamat}</span>
                            </div>
                        </div>
                    </div>
                </div>`;
        });

    } else if (currentCalendarType === 'RUANG_RAPAT') {
        schedules.forEach(schedule => {
            const statusRaw = (schedule.Status || '').toLowerCase();
            const namaRuang = schedule['Nama Ruang Rapat'] ? `
                <div class="schedule-card-row">
                    <span class="schedule-card-label">Ruang</span>
                    <span class="schedule-card-value"><strong>${schedule['Nama Ruang Rapat']}</strong></span>
                </div>` : '';

            cards += `
                <div class="schedule-card status-${statusRaw}" data-nama="${(schedule.Nama || '').toLowerCase()}">
                    <div class="schedule-card-strip"></div>
                    <div class="schedule-card-header">
                        <div class="schedule-card-name">${schedule.Kegiatan}</div>
                        <span class="schedule-card-status ${statusRaw}">${schedule.Status}</span>
                    </div>
                    <div class="schedule-card-body">
                        <div class="schedule-card-time">
                            ${clockIcon}
                            ${formatTimeRange(schedule['Jam Mulai'], schedule['Jam Selesai'])}
                        </div>
                        <div class="schedule-card-info">
                            <div class="schedule-card-row">
                                <span class="schedule-card-label">PJ</span>
                                <span class="schedule-card-value">${schedule.Nama}</span>
                            </div>
                            <div class="schedule-card-row">
                                <span class="schedule-card-label">Unit</span>
                                <span class="schedule-card-value"><span class="schedule-unit-badge">${schedule.Unit}</span></span>
                            </div>
                            ${namaRuang}
                            <div class="schedule-card-divider"></div>
                            <div class="schedule-card-row">
                                <span class="schedule-card-label">Peserta</span>
                                <span class="schedule-card-value"><strong>${schedule.Peserta}</strong> orang</span>
                            </div>
                        </div>
                    </div>
                </div>`;
        });
    }

    container.innerHTML = `<div class="schedule-cards-grid">${cards}</div>`;
}

function filterSchedules() {
    const searchTerm = document.getElementById('search-schedule').value.toLowerCase();
    if (searchTerm === '') {
        renderScheduleList(allSchedules);
    } else {
        renderScheduleList(allSchedules.filter(s => {
            const name = (s.Nama || '').toLowerCase();
            const unit = (s.Unit || '').toLowerCase();
            const keperluan = (s.Keperluan || s.Kegiatan || '').toLowerCase();
            return name.includes(searchTerm) || unit.includes(searchTerm) || keperluan.includes(searchTerm);
        }));
    }
}

function backToCalendar() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('kalender').classList.add('active');
    document.getElementById('search-schedule').value = '';
}

// ============================================
// VOUCHER STATUS FUNCTIONS
// ============================================
function showVoucherStatus() {
    const dropdownContent = document.getElementById('status-dropdown');
    if (dropdownContent) dropdownContent.classList.remove('show');

    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('status-voucher').classList.add('active');
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

    const mobileSelect = document.getElementById('mobile-nav-select');
    if (mobileSelect) mobileSelect.value = 'status-voucher';

    showLoading();
    loadVoucherData();
}

function loadVoucherData() {
    fetch(`${GAS_URL}?action=getVouchers`)
        .then(response => response.json())
        .then(data => {
            allVouchers = data.status === 'success' ? (data.vouchers || []) : [];
            renderVoucherTable(allVouchers);
            hideLoading();
        })
        .catch(error => {
            console.error('❌ Fetch error:', error);
            allVouchers = [];
            renderVoucherTable([]);
            hideLoading();
        });
}

function renderVoucherTable(vouchers) {
    const tbody = document.getElementById('voucher-table-body');
    if (vouchers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px; color: #6b7280;">Tidak ada data voucher BBM</td></tr>`;
        return;
    }
    tbody.innerHTML = vouchers.map(voucher => {
        const statusClass = (voucher.Status || '').toLowerCase();
        const timestamp = voucher.Timestamp ? new Date(voucher.Timestamp).toLocaleDateString('id-ID') : '-';
        return `<tr data-search="${(voucher.Nama || '').toLowerCase()} ${(voucher['Nomor Polisi'] || '').toLowerCase()}">
            <td>${timestamp}</td>
            <td>${voucher.Nama || '-'}</td>
            <td>${voucher.Unit || '-'}</td>
            <td><strong>${voucher['Nomor Polisi'] || '-'}</strong></td>
            <td><span class="status-badge ${statusClass}">${voucher.Status || 'UNKNOWN'}</span></td>
        </tr>`;
    }).join('');
}

function filterVouchers() {
    const searchTerm = document.getElementById('search-voucher').value.toLowerCase();
    document.querySelectorAll('#voucher-table-body tr').forEach(row => {
        const searchData = row.getAttribute('data-search');
        row.style.display = (!searchData || searchData.includes(searchTerm)) ? '' : 'none';
    });
}

function filterVoucherByStatus(status) {
    currentVoucherFilter = status;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderVoucherTable(status === 'ALL' ? allVouchers : allVouchers.filter(v => v.Status === status));
}

// ============================================
// FILE HANDLING
// ============================================
function handleFileSelect(event) {
    const file = event.target.files[0];
    const fileInfo = document.getElementById('file-info');
    if (!file) { selectedFile = null; fileInfo.classList.remove('show'); return; }
    if (file.type !== 'application/pdf') { alert('❌ Hanya file PDF yang diperbolehkan!'); event.target.value = ''; selectedFile = null; fileInfo.classList.remove('show'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('❌ Ukuran file maksimal 10MB!'); event.target.value = ''; selectedFile = null; fileInfo.classList.remove('show'); return; }
    selectedFile = file;
    fileInfo.innerHTML = `✅ ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
    fileInfo.classList.add('show');
}

function handlePengajuanFileSelect(event) {
    const file = event.target.files[0];
    const fileInfo = document.getElementById('file-pengajuan-info');
    if (!file) { selectedPengajuanFile = null; fileInfo.classList.remove('show'); return; }
    if (file.type !== 'application/pdf') { alert('❌ Hanya file PDF yang diperbolehkan!'); event.target.value = ''; selectedPengajuanFile = null; fileInfo.classList.remove('show'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('❌ Ukuran file maksimal 10MB!'); event.target.value = ''; selectedPengajuanFile = null; fileInfo.classList.remove('show'); return; }
    selectedPengajuanFile = file;
    fileInfo.innerHTML = `✅ ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
    fileInfo.classList.add('show');
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============================================
// SHARED: submit via hidden iframe (tanpa file)
// Dipakai oleh: Kendaraan, Ruang Rapat, Voucher, SPJ
// ============================================
function submitViaIframe(formData, iframeId, callback) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = GAS_URL;
    form.target = iframeId;
    form.style.display = 'none';

    for (let [key, value] of formData.entries()) {
        if (value instanceof File) continue;
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
    }

    let iframe = document.getElementById(iframeId);
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = iframeId;
        iframe.name = iframeId;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
    }

    document.body.appendChild(form);
    form.submit();

    setTimeout(() => {
        callback(true);
        if (form.parentNode) document.body.removeChild(form);
    }, 2000);
}

// ============================================
// KENDARAAN SUBMISSION
// ============================================
function submitKendaraan(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    formData.append('type', 'KENDARAAN');

    const submitBtn = document.getElementById('submit-kendaraan');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';
    setProgress('progress-kendaraan', 'loading-kendaraan', 30, 'Mengirim pengajuan...');

    submitViaIframe(formData, 'iframe-kendaraan', function (success) {
        setProgress('progress-kendaraan', 'loading-kendaraan', 100, 'Selesai!');
        setTimeout(() => {
            hideProgress('progress-kendaraan', 'loading-kendaraan');
            if (success) {
                showAlert('alert-kendaraan', '✓ Pengajuan kendaraan dinas berhasil dikirim!');
                form.reset();
            } else {
                showAlert('alert-kendaraan', '✗ Terjadi kesalahan, silakan coba lagi', 'error');
            }
            submitBtn.disabled = false;
            submitBtn.textContent = 'Kirim Pengajuan';
        }, 500);
    });
}

// ============================================
// RUANG RAPAT SUBMISSION
// ============================================
function submitRuang(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    formData.append('type', 'RUANG_RAPAT');

    const submitBtn = document.getElementById('submit-ruangan');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';
    setProgress('progress-ruangan', 'loading-ruangan', 30, 'Mengirim pengajuan...');

    submitViaIframe(formData, 'iframe-ruangan', function (success) {
        setProgress('progress-ruangan', 'loading-ruangan', 100, 'Selesai!');
        setTimeout(() => {
            hideProgress('progress-ruangan', 'loading-ruangan');
            if (success) {
                showAlert('alert-ruangan', '✓ Pengajuan ruang rapat berhasil dikirim!');
                form.reset();
            } else {
                showAlert('alert-ruangan', '✗ Terjadi kesalahan, silakan coba lagi', 'error');
            }
            submitBtn.disabled = false;
            submitBtn.textContent = 'Kirim Pengajuan';
        }, 500);
    });
}

// ============================================
// VOUCHER BBM SUBMISSION
// ============================================
function submitVoucher(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    formData.append('type', 'VOUCHER_BBM');

    const submitBtn = document.getElementById('submit-voucher');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';
    setProgress('progress-voucher', 'loading-voucher', 30, 'Mengirim pengajuan...');

    submitViaIframe(formData, 'iframe-voucher', function (success) {
        setProgress('progress-voucher', 'loading-voucher', 100, 'Selesai!');
        setTimeout(() => {
            hideProgress('progress-voucher', 'loading-voucher');
            if (success) {
                showAlert('alert-voucher', '✓ Permintaan voucher BBM berhasil dikirim!');
                form.reset();
            } else {
                showAlert('alert-voucher', '✗ Terjadi kesalahan, silakan coba lagi', 'error');
            }
            submitBtn.disabled = false;
            submitBtn.textContent = 'Kirim Pengajuan';
        }, 500);
    });
}

// ============================================
// SPJ SUBMISSION
// ============================================
function submitSPJ(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    formData.append('type', 'SPJ');

    const submitBtn = document.getElementById('submit-spj');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim SPJ...';
    setProgress('progress-spj', 'loading-spj', 30, 'Mengirim SPJ ke sistem...');

    submitViaIframe(formData, 'iframe-spj', function (success) {
        setProgress('progress-spj', 'loading-spj', 100, 'Selesai!');
        setTimeout(() => {
            hideProgress('progress-spj', 'loading-spj');
            if (success) {
                showAlert('alert-spj', '✓ SPJ berhasil dikirim!');
                form.reset();
            } else {
                showAlert('alert-spj', '✗ Terjadi kesalahan, silakan coba lagi', 'error');
            }
            submitBtn.disabled = false;
            submitBtn.textContent = 'Kirim SPJ';
        }, 500);
    });
}

// ============================================
// PENGAJUAN DANA SUBMISSION (with file upload)
// ============================================
async function submitPengajuanDana(event) {
    event.preventDefault();

    if (!selectedPengajuanFile) {
        alert('❌ Silakan pilih file pengajuan dana PDF terlebih dahulu!');
        return;
    }

    const formElement = event.target;
    const submitBtn = document.getElementById('submit-pengajuan-dana');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengunggah Pengajuan...';
    setProgress('progress-pengajuan-dana', 'loading-pengajuan-dana', 20, 'Membaca file...');

    try {
        const base64Data = await fileToBase64(selectedPengajuanFile);
        setProgress('progress-pengajuan-dana', 'loading-pengajuan-dana', 50, 'Mengunggah ke sistem...');

        const hiddenForm = document.createElement('form');
        hiddenForm.method = 'POST';
        hiddenForm.action = GAS_URL;
        hiddenForm.target = 'iframe-pengajuan-dana';
        hiddenForm.style.display = 'none';

        const fields = {
            action: 'uploadPengajuanDana',
            nama: formElement.querySelector('[name="nama"]').value,
            unit: formElement.querySelector('[name="unit"]').value,
            sub_kegiatan: formElement.querySelector('[name="sub_kegiatan"]').value,
            bulan_pengajuan: formElement.querySelector('[name="bulan_pengajuan"]').value,
            nominal_pengajuan: formElement.querySelector('[name="nominal_pengajuan"]').value,
            fileName: selectedPengajuanFile.name,
            fileData: base64Data,
            mimeType: selectedPengajuanFile.type
        };

        for (let [key, value] of Object.entries(fields)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            hiddenForm.appendChild(input);
        }

        let iframe = document.getElementById('iframe-pengajuan-dana');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'iframe-pengajuan-dana';
            iframe.name = 'iframe-pengajuan-dana';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
        }

        document.body.appendChild(hiddenForm);
        setProgress('progress-pengajuan-dana', 'loading-pengajuan-dana', 75, 'Menyimpan file...');
        hiddenForm.submit();

        setTimeout(() => {
            setProgress('progress-pengajuan-dana', 'loading-pengajuan-dana', 100, 'Selesai!');
        }, 1000);

        setTimeout(() => {
            hideProgress('progress-pengajuan-dana', 'loading-pengajuan-dana');
            showAlert('alert-pengajuan-dana', '✓ Pengajuan dana berhasil dikirim! File tersimpan di sistem.');
            formElement.reset();
            selectedPengajuanFile = null;
            document.getElementById('file-pengajuan-info').classList.remove('show');
            if (hiddenForm.parentNode) document.body.removeChild(hiddenForm);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Kirim Pengajuan Dana';
        }, 3000);

    } catch (error) {
        console.error('Error:', error);
        hideProgress('progress-pengajuan-dana', 'loading-pengajuan-dana');
        showAlert('alert-pengajuan-dana', '✗ ' + error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Pengajuan Dana';
    }
}

// ============================================
// ARSIP: Upload Mode Toggle
// ============================================
function setArsipUploadMode(mode) {
    arsipUploadMode = mode;
    document.getElementById('arsip-mode-file').style.display = mode === 'file' ? '' : 'none';
    document.getElementById('arsip-mode-drive').style.display = mode === 'drive' ? '' : 'none';
    document.getElementById('tab-file').classList.toggle('active', mode === 'file');
    document.getElementById('tab-drive').classList.toggle('active', mode === 'drive');
}

// ============================================
// ARSIP: Multi-File Select Handler
// ============================================
function handleMultiFileSelect(event) {
    const files = Array.from(event.target.files);
    const maxSizeMB = 10;
    const rejected = [];
    const accepted = [];

    files.forEach(f => {
        if (f.size > maxSizeMB * 1024 * 1024) {
            rejected.push(f.name);
        } else {
            accepted.push(f);
        }
    });

    if (rejected.length > 0) {
        alert(`⚠️ File berikut melebihi batas ${maxSizeMB}MB dan tidak akan diikutkan:\n${rejected.join('\n')}`);
    }

    selectedFiles = accepted;
    renderFileList();
}

function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const icons = { pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', jpg: '🖼️', jpeg: '🖼️', png: '🖼️' };
    return icons[ext] || '📁';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function renderFileList() {
    const container = document.getElementById('file-list-container');
    if (!container) return;
    if (selectedFiles.length === 0) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'flex';
    const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
    container.innerHTML = `
        <div class="file-list-header">📁 ${selectedFiles.length} file dipilih</div>
        ${selectedFiles.map((f, i) => `
            <div class="file-item">
                <span class="file-item-icon">${getFileIcon(f.name)}</span>
                <div class="file-item-info">
                    <div class="file-item-name">${f.name}</div>
                    <div class="file-item-size">${formatFileSize(f.size)}</div>
                </div>
                <button type="button" class="file-item-remove" onclick="removeSelectedFile(${i})">✕ Hapus</button>
            </div>
        `).join('')}
        <div class="file-list-summary">Total: ${formatFileSize(totalSize)}</div>
    `;
}

function removeSelectedFile(index) {
    selectedFiles.splice(index, 1);
    renderFileList();
    // Reset input supaya bisa pilih file yang sama lagi
    const input = document.getElementById('file-input');
    if (input) input.value = '';
}

// ============================================
// ARSIP: Drive Link UI
// ============================================
function addDriveLink() {
    driveLinksCounter++;
    const container = document.getElementById('drive-links-container');
    const rowId = `drive-row-${driveLinksCounter}`;
    const row = document.createElement('div');
    row.className = 'drive-link-row';
    row.id = rowId;
    row.innerHTML = `
        <input type="url" class="form-control drive-link-input" placeholder="https://drive.google.com/file/d/..." style="flex:1;">
        <button type="button" class="btn btn-sm" onclick="removeDriveLink('${rowId}')" style="color:#dc2626; border-color:#fca5a5; flex-shrink:0;">✕</button>
    `;
    container.appendChild(row);
    updateDriveLinkRemoveButtons();
}

function removeDriveLink(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
    updateDriveLinkRemoveButtons();
}

function updateDriveLinkRemoveButtons() {
    const rows = document.querySelectorAll('#drive-links-container .drive-link-row');
    rows.forEach((row, i) => {
        const removeBtn = row.querySelector('button');
        if (removeBtn) {
            removeBtn.style.display = rows.length > 1 ? '' : 'none';
        }
    });
}

// ============================================
// DOKUMEN ARSIP SUBMISSION (multi-file + drive)
// ============================================
async function submitDokumen(event) {
    event.preventDefault();
    const formElement = event.target;
    const submitBtn = document.getElementById('submit-arsip');

    // Validasi berdasarkan mode
    if (arsipUploadMode === 'file') {
        if (selectedFiles.length === 0) {
            alert('❌ Silakan pilih minimal satu file untuk diunggah!');
            return;
        }
    } else {
        const links = getDriveLinks();
        if (links.length === 0 || links.every(l => !l)) {
            alert('❌ Silakan isi minimal satu link Google Drive!');
            return;
        }
    }

    submitBtn.disabled = true;
    submitBtn.textContent = arsipUploadMode === 'file' ? 'Mengunggah...' : 'Mengirim...';
    setProgress('progress-arsip', 'loading-arsip', 15, 'Mempersiapkan data...');

    const baseFields = {
        action: 'uploadDokumen',
        nama: formElement.querySelector('[name="nama"]').value,
        unit: formElement.querySelector('[name="unit"]').value,
        bulan: formElement.querySelector('[name="bulan"]').value,
        tahun: formElement.querySelector('[name="tahun"]').value,
        jenis_dokumen: formElement.querySelector('[name="jenis_dokumen"]').value,
        keterangan: formElement.querySelector('[name="keterangan"]').value,
        upload_mode: arsipUploadMode
    };

    try {
        if (arsipUploadMode === 'drive') {
            // Kirim via iframe dengan link Drive (no file)
            const links = getDriveLinks().filter(l => l.trim() !== '');
            const fields = { ...baseFields, drive_links: JSON.stringify(links) };
            setProgress('progress-arsip', 'loading-arsip', 50, 'Mengirim link Drive...');
            submitViaIframeFields(fields, 'iframe-arsip');

        } else {
            // Upload file satu per satu
            const totalFiles = selectedFiles.length;
            for (let i = 0; i < totalFiles; i++) {
                const file = selectedFiles[i];
                const pct = Math.round(15 + ((i / totalFiles) * 70));
                setProgress('progress-arsip', 'loading-arsip', pct, `Mengunggah file ${i + 1}/${totalFiles}: ${file.name}`);
                const base64Data = await fileToBase64(file);
                const fields = {
                    ...baseFields,
                    fileName: file.name,
                    fileData: base64Data,
                    mimeType: file.type,
                    fileIndex: i + 1,
                    totalFiles
                };
                submitViaIframeFields(fields, `iframe-arsip-${i}`);
                // Jeda antar upload
                if (i < totalFiles - 1) await new Promise(r => setTimeout(r, 800));
            }
        }

        setProgress('progress-arsip', 'loading-arsip', 95, 'Menyelesaikan...');
        setTimeout(() => {
            setProgress('progress-arsip', 'loading-arsip', 100, 'Selesai!');
        }, 800);

        setTimeout(() => {
            hideProgress('progress-arsip', 'loading-arsip');
            const msg = arsipUploadMode === 'file'
                ? `✓ ${selectedFiles.length} dokumen berhasil diunggah ke Google Drive!`
                : '✓ Link Google Drive berhasil dikirim!';
            showAlert('alert-arsip', msg, 'success');
            formElement.reset();
            selectedFiles = [];
            renderFileList();
            driveLinksCounter = 1;
            const dlContainer = document.getElementById('drive-links-container');
            if (dlContainer) {
                dlContainer.innerHTML = `<div class="drive-link-row" id="drive-row-1" style="display:flex; gap: 8px; align-items: center; margin-bottom: 8px;"><input type="url" class="form-control drive-link-input" placeholder="https://drive.google.com/file/d/..." style="flex:1;"><button type="button" class="btn btn-sm" onclick="removeDriveLink('drive-row-1')" style="display:none; color:#dc2626; border-color:#fca5a5; flex-shrink:0;">✕</button></div>`;
            }
            submitBtn.disabled = false;
            submitBtn.textContent = 'Kirim Dokumen';
        }, 3200);

    } catch (error) {
        console.error('❌ Error:', error);
        hideProgress('progress-arsip', 'loading-arsip');
        showAlert('alert-arsip', '✗ ' + error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Dokumen';
    }
}

// Helper: ambil semua Drive link dari container
function getDriveLinks() {
    return Array.from(document.querySelectorAll('#drive-links-container .drive-link-input'))
        .map(el => el.value.trim())
        .filter(v => v !== '');
}

// Helper: submit form fields via iframe (tanpa file)
function submitViaIframeFields(fields, iframeId) {
    const hiddenForm = document.createElement('form');
    hiddenForm.method = 'POST';
    hiddenForm.action = GAS_URL;
    hiddenForm.target = iframeId;
    hiddenForm.style.display = 'none';

    for (let [key, value] of Object.entries(fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        hiddenForm.appendChild(input);
    }

    let iframe = document.getElementById(iframeId);
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = iframeId;
        iframe.name = iframeId;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
    }

    document.body.appendChild(hiddenForm);
    hiddenForm.submit();
    setTimeout(() => { if (hiddenForm.parentNode) document.body.removeChild(hiddenForm); }, 5000);
}

// ============================================
// ALERT HELPER
// ============================================
function showAlert(alertId, message, type = 'success') {
    const alert = document.getElementById(alertId);
    if (!alert) return;
    alert.textContent = message;
    alert.className = `alert alert-${type} show`;
    setTimeout(() => alert.classList.remove('show'), 5000);
}

// ============================================
// LEGACY: sendToGoogleScript (fallback, tidak dipakai lagi)
// ============================================
function sendToGoogleScript(formData, callback) {
    submitViaIframe(formData, 'hidden-iframe', callback);
}