// ============================================
// GOOGLE APPS SCRIPT CONFIGURATION
// ============================================
const GAS_URL = "https://script.google.com/macros/s/AKfycbyKHm8fROuNziK-6oe6vbit2dHO0tb0giugbdmTJ-wWQc1r_qCejp5iY2GTeQYqki3b/exec";

// ============================================
// GLOBAL VARIABLES
// ============================================
let selectedFile = null;
let selectedArsipFile = null;   // ★ GANTI: hanya 1 file untuk arsip
let arsipUploadMode = 'file';
let driveLinksCounter = 1;
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
// CORE: aktivasi section
// ============================================
function activateSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.add('active');
    const mobileSelect = document.getElementById('mobile-nav-select');
    if (mobileSelect) mobileSelect.value = sectionId;
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
}

// ============================================
// MOBILE NAVIGATION
// ============================================
function handleMobileNav(value) {
    if (!value) return;
    document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
    switch (value) {
        case 'home':
        case 'kendaraan':
        case 'ruangan':
        case 'voucher':
        case 'arsip':
        case 'pengajuan-dana':
        case 'spj':
        case 'transparansi-nilai':
            activateSection(value);
            break;
        case 'transparansi-ruang':
            activateSection('transparansi-nilai');
            setTimeout(() => { if (typeof loadNilaiData === 'function') loadNilaiData('ruang-rapat'); }, 150);
            break;
        case 'transparansi-kendaraan':
            activateSection('transparansi-nilai');
            setTimeout(() => { if (typeof loadNilaiData === 'function') loadNilaiData('kendaraan'); }, 150);
            break;
        case 'transparansi-bbm':
            activateSection('transparansi-nilai');
            setTimeout(() => { if (typeof loadNilaiData === 'function') loadNilaiData('bbm'); }, 150);
            break;
        case 'transparansi-dokumen':
            activateSection('transparansi-nilai');
            setTimeout(() => { if (typeof loadNilaiData === 'function') loadNilaiData('dokumen'); }, 150);
            break;
        case 'transparansi-spj':
            activateSection('transparansi-nilai');
            setTimeout(() => { if (typeof loadNilaiData === 'function') loadNilaiData('spj-keuangan'); }, 150);
            break;
        case 'transparansi-monev':
            activateSection('transparansi-nilai');
            setTimeout(() => { if (typeof loadNilaiData === 'function') loadNilaiData('monev'); }, 150);
            break;
        case 'status-kendaraan':
            showCalendar('KENDARAAN');
            break;
        case 'status-ruangan':
            showCalendar('RUANG_RAPAT');
            break;
        case 'status-voucher':
            showVoucherStatus();
            break;
        case 'status-dana':
            showDanaStatus();
            break;
        default:
            console.warn('handleMobileNav: nilai tidak dikenal →', value);
    }
    const mobileSelect = document.getElementById('mobile-nav-select');
    if (mobileSelect) setTimeout(() => { mobileSelect.value = value; }, 60);
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================
function showSection(sectionId) {
    activateSection(sectionId);
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    try {
        if (typeof event !== 'undefined' && event && event.currentTarget
            && event.currentTarget.classList.contains('nav-tab')) {
            event.currentTarget.classList.add('active');
        } else if (typeof event !== 'undefined' && event && event.target
            && event.target.classList.contains('nav-tab')) {
            event.target.classList.add('active');
        }
    } catch (e) { }
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
// DATE/TIME VALIDATION HELPERS
// ============================================
function initDateValidation() {
    document.querySelectorAll('input[type="date"]').forEach(input => {
        input.addEventListener('change', function () { warnPastDate(this); });
        input.addEventListener('blur', function () { warnPastDate(this); });
    });
}

function getTodayString() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function warnPastDate(inputEl) {
    const val = inputEl.value;
    if (!val) return;
    const today = getTodayString();
    let warn = inputEl.parentNode.querySelector('.date-past-warning');
    if (val < today) {
        if (!warn) {
            warn = document.createElement('p');
            warn.className = 'date-past-warning';
            warn.style.cssText = 'color:#d97706;font-size:0.8125rem;margin-top:6px;font-weight:600;';
            inputEl.after(warn);
        }
        warn.textContent = '⚠️ Tanggal yang dipilih sudah lampau. Pastikan tanggal sudah benar.';
        inputEl.style.borderColor = '#f59e0b';
    } else {
        if (warn) warn.remove();
        inputEl.style.borderColor = '';
    }
}

function validateTimeRange(formEl, startName, endName) {
    const startInput = formEl.querySelector(`[name="${startName}"]`);
    const endInput = formEl.querySelector(`[name="${endName}"]`);
    if (!startInput || !endInput) return true;
    const startVal = startInput.value;
    const endVal = endInput.value;
    let warn = endInput.parentNode.querySelector('.time-range-warning');
    if (!startVal || !endVal) {
        if (warn) warn.remove();
        endInput.style.borderColor = '';
        startInput.style.borderColor = '';
        return true;
    }
    const toMinutes = t => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };
    const invalid = toMinutes(endVal) <= toMinutes(startVal);
    if (invalid) {
        if (!warn) {
            warn = document.createElement('p');
            warn.className = 'time-range-warning';
            warn.style.cssText = 'color:#dc2626;font-size:0.8125rem;margin-top:6px;font-weight:600;';
            endInput.after(warn);
        }
        warn.textContent = '⛔ Waktu selesai harus lebih dari waktu mulai.';
        endInput.style.borderColor = '#dc2626';
        startInput.style.borderColor = '#dc2626';
        endInput.focus();
        return false;
    } else {
        if (warn) warn.remove();
        endInput.style.borderColor = '';
        startInput.style.borderColor = '';
        return true;
    }
}

function initTimeValidationListeners() {
    [{ formId: 'form-kendaraan' }, { formId: 'form-ruangan' }].forEach(({ formId }) => {
        const form = document.getElementById(formId);
        if (!form) return;
        const startEl = form.querySelector('[name="waktu_mulai"]');
        const endEl = form.querySelector('[name="waktu_selesai"]');
        const revalidate = () => validateTimeRange(form, 'waktu_mulai', 'waktu_selesai');
        if (startEl) { startEl.addEventListener('change', revalidate); startEl.addEventListener('blur', revalidate); }
        if (endEl) { endEl.addEventListener('change', revalidate); endEl.addEventListener('blur', revalidate); }
    });
}

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
    activateSection('kalender');
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
            dayDiv.addEventListener('click', function () { showScheduleDetail(this.getAttribute('data-date')); });
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
    activateSection('detail-jadwal');
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
    const statusCount = { approved: 0, pending: 0, rejected: 0 };
    schedules.forEach(s => {
        const st = (s.Status || '').toLowerCase();
        if (st === 'approved' || st === 'disetujui') statusCount.approved++;
        else if (st === 'pending' || st === 'menunggu') statusCount.pending++;
        else if (st === 'rejected' || st === 'ditolak') statusCount.rejected++;
    });
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
                        <div class="schedule-card-time">${clockIcon}${formatTimeRange(schedule['Jam Mulai'], schedule['Jam Selesai'])}</div>
                        <div class="schedule-card-info">
                            <div class="schedule-card-row"><span class="schedule-card-label">Unit</span><span class="schedule-card-value"><span class="schedule-unit-badge">${schedule.Unit}</span></span></div>
                            ${nomorKend}
                            <div class="schedule-card-divider"></div>
                            <div class="schedule-card-row"><span class="schedule-card-label">Keperluan</span><span class="schedule-card-value">${schedule.Keperluan}</span></div>
                            <div class="schedule-card-row"><span class="schedule-card-label">Tujuan</span><span class="schedule-card-value">${schedule.Alamat}</span></div>
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
                        <div class="schedule-card-time">${clockIcon}${formatTimeRange(schedule['Jam Mulai'], schedule['Jam Selesai'])}</div>
                        <div class="schedule-card-info">
                            <div class="schedule-card-row"><span class="schedule-card-label">PJ</span><span class="schedule-card-value">${schedule.Nama}</span></div>
                            <div class="schedule-card-row"><span class="schedule-card-label">Unit</span><span class="schedule-card-value"><span class="schedule-unit-badge">${schedule.Unit}</span></span></div>
                            ${namaRuang}
                            <div class="schedule-card-divider"></div>
                            <div class="schedule-card-row"><span class="schedule-card-label">Peserta</span><span class="schedule-card-value"><strong>${schedule.Peserta}</strong> orang</span></div>
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
    activateSection('kalender');
    document.getElementById('search-schedule').value = '';
}

// ============================================
// VOUCHER STATUS FUNCTIONS
// ============================================
function showVoucherStatus() {
    const dropdownContent = document.getElementById('status-dropdown');
    if (dropdownContent) dropdownContent.classList.remove('show');
    activateSection('status-voucher');
    const mobileSelect = document.getElementById('mobile-nav-select');
    if (mobileSelect) mobileSelect.value = 'status-voucher';
    showLoading();
    loadVoucherData();
}

let voucherCurrentPage = 1;
let voucherPageSize = 10;
let voucherDisplayData = [];

function changeVoucherPageSize(val) {
    voucherPageSize = parseInt(val) || 10;
    voucherCurrentPage = 1;
    renderVoucherTable(voucherDisplayData, 1);
}

function loadVoucherData() {
    fetch(`${GAS_URL}?action=getVouchers`)
        .then(response => response.json())
        .then(data => {
            allVouchers = data.status === 'success' ? (data.vouchers || []) : [];
            allVouchers = sortVouchersByDate(allVouchers);
            voucherCurrentPage = 1;
            voucherDisplayData = allVouchers;
            renderVoucherTable(voucherDisplayData, voucherCurrentPage);
            hideLoading();
        })
        .catch(error => {
            console.error('❌ Fetch error:', error);
            allVouchers = [];
            voucherDisplayData = [];
            renderVoucherTable([], 1);
            hideLoading();
        });
}

function getVoucherTimestamp(voucher) {
    const keys = ['Timestamp', 'timestamp', 'Tanggal', 'tanggal', 'Date', 'date', 'TIMESTAMP', 'Waktu', 'waktu'];
    for (const k of keys) { if (voucher[k]) return voucher[k]; }
    for (const val of Object.values(voucher)) {
        if (val && typeof val === 'string' && !isNaN(Date.parse(val))) return val;
    }
    return null;
}

function parseVoucherDate(raw) {
    if (!raw) return new Date(0);
    if (raw instanceof Date) return raw;
    const d = new Date(raw);
    if (!isNaN(d)) return d;
    const m = String(raw).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) return new Date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
    return new Date(0);
}

function sortVouchersByDate(vouchers) {
    return [...vouchers].sort((a, b) => {
        const dateA = parseVoucherDate(getVoucherTimestamp(a));
        const dateB = parseVoucherDate(getVoucherTimestamp(b));
        return dateB - dateA;
    });
}

function renderVoucherTable(vouchers, page) {
    page = page || 1;
    const tbody = document.getElementById('voucher-table-body');
    const total = vouchers.length;
    const totalPages = Math.max(1, Math.ceil(total / voucherPageSize));
    page = Math.min(page, totalPages);
    if (total === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#6b7280;">Tidak ada data voucher BBM</td></tr>`;
        renderVoucherPagination(0, 1, 1);
        return;
    }
    const start = (page - 1) * voucherPageSize;
    const slice = vouchers.slice(start, start + voucherPageSize);
    tbody.innerHTML = slice.map(voucher => {
        const statusClass = (voucher.Status || '').toLowerCase();
        const rawTs = getVoucherTimestamp(voucher);
        const timestamp = rawTs
            ? parseVoucherDate(rawTs).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
            : '-';
        return `<tr>
            <td>${timestamp}</td>
            <td>${voucher.Nama || '-'}</td>
            <td>${voucher.Unit || '-'}</td>
            <td><strong>${voucher['Nomor Polisi'] || '-'}</strong></td>
            <td><span class="status-badge ${statusClass}">${voucher.Status || 'UNKNOWN'}</span></td>
        </tr>`;
    }).join('');
    renderVoucherPagination(total, page, totalPages);
}

function renderVoucherPagination(total, page, totalPages) {
    const container = document.getElementById('voucher-pagination');
    if (!container) return;
    if (total === 0) { container.innerHTML = ''; return; }
    const start = (page - 1) * voucherPageSize + 1;
    const end = Math.min(page * voucherPageSize, total);
    const sizeOptions = [10, 25, 50, 100];
    let html = `<div class="pagination-size"><label>Tampilkan&nbsp;<select class="page-size-select" onchange="changeVoucherPageSize(this.value)">${sizeOptions.map(n => `<option value="${n}"${n === voucherPageSize ? ' selected' : ''}>${n}</option>`).join('')}</select>&nbsp;data per halaman</label></div>`;
    html += `<div class="pagination-info">Menampilkan ${start}–${end} dari ${total} data</div>`;
    html += `<div class="pagination-controls">`;
    html += `<button class="page-btn" onclick="goToVoucherPage(1)" ${page === 1 ? 'disabled' : ''}>««</button>`;
    html += `<button class="page-btn" onclick="goToVoucherPage(${page - 1})" ${page === 1 ? 'disabled' : ''}>‹</button>`;
    const delta = 2;
    const from = Math.max(1, page - delta);
    const to = Math.min(totalPages, page + delta);
    if (from > 1) html += `<span class="page-ellipsis">…</span>`;
    for (let i = from; i <= to; i++) {
        html += `<button class="page-btn${i === page ? ' active' : ''}" onclick="goToVoucherPage(${i})">${i}</button>`;
    }
    if (to < totalPages) html += `<span class="page-ellipsis">…</span>`;
    html += `<button class="page-btn" onclick="goToVoucherPage(${page + 1})" ${page === totalPages ? 'disabled' : ''}>›</button>`;
    html += `<button class="page-btn" onclick="goToVoucherPage(${totalPages})" ${page === totalPages ? 'disabled' : ''}>»»</button>`;
    html += `</div>`;
    container.innerHTML = html;
}

function goToVoucherPage(page) {
    voucherCurrentPage = page;
    renderVoucherTable(voucherDisplayData, voucherCurrentPage);
    const tbl = document.getElementById('status-voucher');
    if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function filterVouchers() {
    const searchTerm = document.getElementById('search-voucher').value.toLowerCase();
    const filtered = allVouchers.filter(v => {
        const hay = ((v.Nama || '') + ' ' + (v['Nomor Polisi'] || '') + ' ' + (v.Unit || '')).toLowerCase();
        return hay.includes(searchTerm);
    });
    const byStatus = currentVoucherFilter === 'ALL'
        ? filtered
        : filtered.filter(v => v.Status === currentVoucherFilter);
    voucherCurrentPage = 1;
    voucherDisplayData = sortVouchersByDate(byStatus);
    renderVoucherTable(voucherDisplayData, 1);
}

function filterVoucherByStatus(status, clickedBtn) {
    currentVoucherFilter = status;
    document.querySelectorAll('#status-voucher .filter-btn').forEach(b => b.classList.remove('active'));
    const btn = clickedBtn || (typeof event !== 'undefined' && event && event.target);
    if (btn && btn.classList) btn.classList.add('active');
    const searchTerm = document.getElementById('search-voucher').value.toLowerCase();
    let filtered = allVouchers;
    if (status !== 'ALL') filtered = filtered.filter(v => v.Status === status);
    if (searchTerm) {
        filtered = filtered.filter(v => {
            const hay = ((v.Nama || '') + ' ' + (v['Nomor Polisi'] || '') + ' ' + (v.Unit || '')).toLowerCase();
            return hay.includes(searchTerm);
        });
    }
    voucherCurrentPage = 1;
    voucherDisplayData = sortVouchersByDate(filtered);
    renderVoucherTable(voucherDisplayData, 1);
}

// ============================================
// FILE HANDLING (non-arsip)
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

// ============================================
// ★ ARSIP: Single File Select Handler
//   Menggantikan handleMultiFileSelect.
//   selectedFiles dihapus, diganti selectedArsipFile.
// ============================================
function handleArsipFileSelect(event) {
    const file = event.target.files[0];
    const infoEl = document.getElementById('arsip-file-info');

    // Reset dulu
    selectedArsipFile = null;
    if (infoEl) { infoEl.textContent = ''; infoEl.className = 'arsip-file-info'; }

    if (!file) return;

    // Validasi ukuran maks 10 MB
    if (file.size > 10 * 1024 * 1024) {
        alert('❌ Ukuran file melebihi batas 10 MB. Silakan pilih file yang lebih kecil.');
        event.target.value = '';
        return;
    }

    selectedArsipFile = file;

    // Tampilkan info file yang dipilih
    if (infoEl) {
        infoEl.innerHTML = `✅ <strong>${file.name}</strong> &nbsp;(${formatFileSize(file.size)})`;
        infoEl.className = 'arsip-file-info show';
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
    if (!validateTimeRange(form, 'waktu_mulai', 'waktu_selesai')) return;
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
            if (success) { showAlert('alert-kendaraan', '✓ Pengajuan kendaraan dinas berhasil dikirim!'); form.reset(); }
            else { showAlert('alert-kendaraan', '✗ Terjadi kesalahan, silakan coba lagi', 'error'); }
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
    if (!validateTimeRange(form, 'waktu_mulai', 'waktu_selesai')) return;
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
            if (success) { showAlert('alert-ruangan', '✓ Pengajuan ruang rapat berhasil dikirim!'); form.reset(); }
            else { showAlert('alert-ruangan', '✗ Terjadi kesalahan, silakan coba lagi', 'error'); }
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
            if (success) { showAlert('alert-voucher', '✓ Permintaan voucher BBM berhasil dikirim!'); form.reset(); }
            else { showAlert('alert-voucher', '✗ Terjadi kesalahan, silakan coba lagi', 'error'); }
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
            if (success) { showAlert('alert-spj', '✓ SPJ berhasil dikirim!'); form.reset(); }
            else { showAlert('alert-spj', '✗ Terjadi kesalahan, silakan coba lagi', 'error'); }
            submitBtn.disabled = false;
            submitBtn.textContent = 'Kirim SPJ';
        }, 500);
    });
}

// ============================================
// PENGAJUAN DANA SUBMISSION
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
        setTimeout(() => { setProgress('progress-pengajuan-dana', 'loading-pengajuan-dana', 100, 'Selesai!'); }, 1000);
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
    rows.forEach((row) => {
        const removeBtn = row.querySelector('button');
        if (removeBtn) removeBtn.style.display = rows.length > 1 ? '' : 'none';
    });
}

// ============================================
// ★ DOKUMEN ARSIP SUBMISSION
//   Mode 'file' : kirim 1 file saja
//   Mode 'drive': kirim link Google Drive (boleh banyak)
// ============================================
async function submitDokumen(event) {
    event.preventDefault();
    const formElement = event.target;
    const submitBtn = document.getElementById('submit-arsip');

    // ── Validasi sesuai mode ──────────────────────────────
    if (arsipUploadMode === 'file') {
        if (!selectedArsipFile) {
            alert('❌ Silakan pilih file terlebih dahulu!');
            return;
        }
    } else {
        const links = getDriveLinks();
        if (links.length === 0) {
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
            // ── MODE DRIVE ──────────────────────────────────
            const links = getDriveLinks();
            const fields = { ...baseFields, drive_links: JSON.stringify(links) };
            setProgress('progress-arsip', 'loading-arsip', 50, 'Mengirim link Drive...');
            submitViaIframeFields(fields, 'iframe-arsip');

        } else {
            // ── MODE FILE (1 file) ──────────────────────────
            setProgress('progress-arsip', 'loading-arsip', 30, `Membaca file: ${selectedArsipFile.name}`);
            const base64Data = await fileToBase64(selectedArsipFile);
            setProgress('progress-arsip', 'loading-arsip', 65, 'Mengunggah ke Google Drive...');

            const fields = {
                ...baseFields,
                fileName: selectedArsipFile.name,
                fileData: base64Data,
                mimeType: selectedArsipFile.type || 'application/octet-stream',
            };
            submitViaIframeFields(fields, 'iframe-arsip');
        }

        setProgress('progress-arsip', 'loading-arsip', 95, 'Menyelesaikan...');
        setTimeout(() => { setProgress('progress-arsip', 'loading-arsip', 100, 'Selesai!'); }, 800);

        setTimeout(() => {
            hideProgress('progress-arsip', 'loading-arsip');

            const msg = arsipUploadMode === 'file'
                ? `✓ Dokumen berhasil diunggah ke Google Drive!`
                : '✓ Link Google Drive berhasil dikirim!';
            showAlert('alert-arsip', msg, 'success');

            // Reset form
            formElement.reset();
            selectedArsipFile = null;

            // Reset info file
            const infoEl = document.getElementById('arsip-file-info');
            if (infoEl) { infoEl.textContent = ''; infoEl.className = 'arsip-file-info'; }

            // Reset drive links
            driveLinksCounter = 1;
            const dlContainer = document.getElementById('drive-links-container');
            if (dlContainer) {
                dlContainer.innerHTML = `<div class="drive-link-row" id="drive-row-1" style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
                    <input type="url" class="form-control drive-link-input" placeholder="https://drive.google.com/file/d/..." style="flex:1;">
                    <button type="button" class="btn btn-sm" onclick="removeDriveLink('drive-row-1')" style="display:none;color:#dc2626;border-color:#fca5a5;flex-shrink:0;">✕</button>
                </div>`;
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

function getDriveLinks() {
    return Array.from(document.querySelectorAll('#drive-links-container .drive-link-input'))
        .map(el => el.value.trim())
        .filter(v => v !== '');
}

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
// LEGACY fallback
// ============================================
function sendToGoogleScript(formData, callback) {
    submitViaIframe(formData, 'hidden-iframe', callback);
}

// ============================================
// TABLE SCROLL WRAPPER (mobile)
// ============================================
function wrapTablesForMobile() {
    document.querySelectorAll('.table-compact').forEach(function (container) {
        if (container.querySelector('.table-scroll-wrapper')) return;
        const table = container.querySelector('table');
        if (!table) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'table-scroll-wrapper';
        wrapper.style.cssText = 'overflow-x:auto;-webkit-overflow-scrolling:touch;width:100%;border-radius:0 0 12px 12px;';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    });
}

function initTableScrollObserver() {
    const targets = [
        document.getElementById('nilai-content'),
        document.getElementById('summary-container'),
    ].filter(Boolean);
    if (!targets.length || typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(function () {
        clearTimeout(observer._timer);
        observer._timer = setTimeout(wrapTablesForMobile, 80);
    });
    targets.forEach(function (t) { observer.observe(t, { childList: true, subtree: true }); });
}

// ============================================
// DOMContentLoaded
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    initDateValidation();
    initTimeValidationListeners();
    wrapTablesForMobile();
    initTableScrollObserver();
});