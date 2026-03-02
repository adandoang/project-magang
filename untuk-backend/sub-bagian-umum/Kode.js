const SPREADSHEET_ID = '1dP1Nk5SiP4OpGyzpkKFx9edfvLrbiid5pcjlNh7x_FQ';
const SHEET_NAMES = {
  USERS: 'Users',
  KENDARAAN: 'KENDARAAN',
  VOUCHER_BBM: 'VOUCHER_BBM',
  RUANG_RAPAT: 'RUANG_RAPAT',
  DOKUMEN: 'DOKUMEN_ARSIP',
  CATATAN_RUANG_RAPAT: 'CATATAN_RUANG_RAPAT',
  PENILAIAN_RUANG_RAPAT: 'PENILAIAN_RUANG_RAPAT',
  CATATAN_KUNCI_MOBIL: 'CATATAN KEALPAAN PENGEMBALIAN KUNCI MOBIL',
  CATATAN_KEBERSIHAN_MOBIL: 'CATATAN KEALPAAN MEMBERSIHKAN MOBIL',
  PENILAIAN_MOBIL: 'REKAPITULASI PENILAIAN PENGGUNAAN MOBIL DINAS OPERASIONAL',
  CATATAN_BBM: 'CATATAN BBM',
  PENILAIAN_BBM: 'REKAPITULASI PENILAIAN PERMINTAAN BBM'
};

const VALID_ROLES = ['superadmin', 'subumum', 'subkeuangan', 'sekretariat'];


// ============================================================
// doGet - JSONP Handler
// ============================================================
function doGet(e) {
  try {
    Logger.log('=== GET REQUEST ===');
    Logger.log('Parameters: ' + JSON.stringify(e.parameter));

    let params = e.parameter;
    const callback = e.parameter.callback;

    if (e.parameter.jsonBody) {
      try {
        const parsed = JSON.parse(decodeURIComponent(e.parameter.jsonBody));
        params = Object.assign({}, e.parameter, parsed);
        Logger.log('Parsed jsonBody: ' + JSON.stringify(parsed));
      } catch (parseErr) {
        Logger.log('WARNING: gagal parse jsonBody: ' + parseErr.toString());
      }
    }

    const action = params.action;
    let result;

    switch (action) {
      case 'login': result = handleLogin(params); break;
      case 'register': result = handleRegister(params); break;
      case 'getRequests': result = handleGetRequests(params); break;
      case 'createRequest': result = handleCreateRequest(params); break;
      case 'updateRequest': result = handleUpdateRequest(params); break;
      case 'deleteRequest': result = handleDeleteRequest(params); break;
      case 'getStats': result = handleGetStats(); break;
      case 'getVoucherRequests': result = handleGetVoucherRequests(params); break;
      case 'createVoucherRequest': result = handleCreateVoucherRequest(params); break;
      case 'updateVoucherRequest': result = handleUpdateVoucherRequest(params); break;
      case 'deleteVoucherRequest': result = handleDeleteVoucherRequest(params); break;
      case 'updateBBMViolation': result = handleUpdateBBMViolation(params); break;
      case 'deleteBBMViolation': result = handleDeleteBBMViolation(params); break;
      case 'getRoomRequests': result = handleGetRoomRequests(params); break;
      case 'createRoomRequest': result = handleCreateRoomRequest(params); break;
      case 'updateRoomRequest': result = handleUpdateRoomRequest(params); break;
      case 'getDocuments': result = handleGetDocuments(); break;
      case 'createDocumentAssessment': result = handleCreateDocumentAssessment(params); break;
      case 'getDocumentAssessments': result = handleGetDocumentAssessments(params); break;
      case 'getAssessmentStats': result = handleGetAssessmentStats(); break;
      case 'updateDocumentStatus': result = handleUpdateDocumentStatus(params); break;
      case 'getRoomViolations': result = handleGetRoomViolations(params); break;
      case 'createRoomViolation': result = handleCreateRoomViolation(params); break;
      case 'getRoomScores': result = handleGetRoomScores(params); break;
      case 'exportViolationsReport': result = handleExportViolationsReport(params); break;
      case 'getVehicleViolations': result = handleGetVehicleViolations(params); break;
      case 'createVehicleViolation': result = handleCreateVehicleViolation(params); break;
      case 'getVehicleScores': result = handleGetVehicleScores(params); break;
      case 'exportVehicleViolationsReport': result = handleExportVehicleViolationsReport(params); break;
      case 'getBBMViolations': result = handleGetBBMViolations(params); break;
      case 'createBBMViolation': result = handleCreateBBMViolation(params); break;
      case 'getBBMScores': result = handleGetBBMScores(params); break;
      case 'exportBBMViolationsReport': result = handleExportBBMViolationsReport(params); break;
      case 'updateDocumentAssessment': result = handleUpdateDocumentAssessment(params); break;
      case 'updateVehicleViolation': result = handleUpdateVehicleViolation(params); break;
      case 'deleteVehicleViolation': result = handleDeleteVehicleViolation(params); break;
      case 'updateRoomViolation': result = handleUpdateRoomViolation(params); break;
      case 'deleteRoomViolation': result = handleDeleteRoomViolation(params); break;
      case 'getUsers': result = handleGetUsers(params); break;
      case 'createUser': result = handleCreateUser(params); break;
      case 'updateUser': result = handleUpdateUser(params); break;
      case 'deleteUser': result = handleDeleteUser(params); break;
      // ★ NOTIFIKASI dikelola di backend pegawai, bukan di sini
      default:
        result = { success: false, message: 'Invalid action: ' + action };
    }

    Logger.log('=== RESPONSE ===');
    Logger.log(JSON.stringify(result));

    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(result) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('=== ERROR ===\n' + err.toString() + '\n' + err.stack);
    const errorResult = { success: false, message: 'Server error: ' + err.toString() };
    const cb = e.parameter.callback;
    if (cb) {
      return ContentService
        .createTextOutput(cb + '(' + JSON.stringify(errorResult) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ★ Handler retry kirim WA dari dashboard
function handleKirimWANotifikasi(params) {
  const jenis = params.jenis || 'default';
  const data = {
    pemohon: params.nama_pemohon || params.pemohon || '-',
    unit: params.unit || '-',
    tanggal: params.tanggal || '-',
    waktu_penjemputan: params.waktu_penjemputan || params.waktu || '-',
    waktu_pengembalian: params.waktu_pengembalian || params.waktu_selesai || '-',
    tujuan: params.tujuan || '-',
    alamat: params.alamat || '-',
    nomor_kendaraan: params.nomor_kendaraan || '-',
    keperluan: params.keperluan || '-',
    jumlah_peserta: params.jumlah_peserta || '-',
    waktu_mulai: params.waktu_mulai || '-',
    waktu_selesai: params.waktu_selesai || '-',
    timestamp: params.waktu || new Date().toISOString(),
  };
  return sendWANotifikasi(jenis, data);
}

// ============================================================
// AUTHENTICATION
// ============================================================
function handleLogin(params) {
  const { email, password } = params;

  Logger.log('handleLogin - Email: ' + email);

  if (!email || !password) {
    return { success: false, message: 'Email dan password harus diisi' };
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.USERS);
    const data = sheet.getDataRange().getValues();

    Logger.log('Total users: ' + (data.length - 1));

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      if (row[1] === email && row[2] === password) {
        const rawRole = (row[4] || '').toString().toLowerCase().trim();
        const validatedRole = VALID_ROLES.includes(rawRole) ? rawRole : 'subumum';

        const user = {
          id: row[0],
          email: row[1],
          name: row[3],
          role: validatedRole
        };

        Logger.log('✓ Login SUCCESS: ' + email + ' role=' + user.role);
        return { success: true, user: user, message: 'Login berhasil' };
      }
    }

    Logger.log('✗ Login FAILED: ' + email);
    return { success: false, message: 'Email atau password salah' };

  } catch (error) {
    Logger.log('ERROR handleLogin: ' + error.toString());
    return { success: false, message: 'Terjadi kesalahan: ' + error.toString() };
  }
}

function handleRegister(params) {
  const { email, password, name, role } = params;

  if (!email || !password || !name) {
    return { success: false, message: 'Semua field harus diisi' };
  }

  const normalizedRole = (role || '').toLowerCase().trim();
  const finalRole = VALID_ROLES.includes(normalizedRole) ? normalizedRole : 'subumum';

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.USERS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === email) {
        return { success: false, message: 'Email sudah terdaftar' };
      }
    }

    const newId = 'USR-' + new Date().getTime();
    sheet.appendRow([newId, email, password, name, finalRole, new Date()]);

    Logger.log('✓ Register SUCCESS: ' + email + ' role=' + finalRole);
    return { success: true, message: 'Registrasi berhasil' };

  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
    return { success: false, message: 'Terjadi kesalahan' };
  }
}

// ============================================================
// USER MANAGEMENT
// ============================================================
function handleGetUsers(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.USERS);
    const data = sheet.getDataRange().getValues();

    const users = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;

      const rawRole = (row[4] || '').toString().toLowerCase().trim();
      const validatedRole = VALID_ROLES.includes(rawRole) ? rawRole : 'subumum';

      users.push({
        id: row[0].toString(),
        email: row[1] || '',
        name: row[3] || '',
        role: validatedRole,
        createdAt: row[5] ? new Date(row[5]).toISOString() : '—'
      });
    }

    Logger.log('getUsers: ' + users.length + ' akun ditemukan');
    return { status: 'success', users: users };

  } catch (error) {
    Logger.log('ERROR handleGetUsers: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

function handleCreateUser(params) {
  try {
    const { name, email, password, role } = params;

    if (!name || !email || !password) {
      return { status: 'error', message: 'Nama, email, dan password harus diisi' };
    }

    const normalizedRole = (role || '').toLowerCase().trim();
    if (!VALID_ROLES.includes(normalizedRole)) {
      return { status: 'error', message: 'Role tidak valid. Gunakan: ' + VALID_ROLES.join(', ') };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { status: 'error', message: 'Format email tidak valid' };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.USERS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === email) {
        return { status: 'error', message: 'Email sudah terdaftar' };
      }
    }

    const newId = 'USR-' + new Date().getTime();
    sheet.appendRow([newId, email, password, name, normalizedRole, new Date()]);

    Logger.log('✓ createUser: ' + email + ' role=' + normalizedRole);
    return { status: 'success', message: 'Akun berhasil dibuat', id: newId };

  } catch (error) {
    Logger.log('ERROR handleCreateUser: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

function handleUpdateUser(params) {
  try {
    const { id, name, email, role, password } = params;

    if (!id) return { status: 'error', message: 'ID harus diisi' };

    if (role) {
      const normalizedRole = role.toLowerCase().trim();
      if (!VALID_ROLES.includes(normalizedRole)) {
        return { status: 'error', message: 'Role tidak valid. Gunakan: ' + VALID_ROLES.join(', ') };
      }
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.USERS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString() === id.toString()) {
        if (email) sheet.getRange(i + 1, 2).setValue(email);
        if (password && password.trim() !== '') sheet.getRange(i + 1, 3).setValue(password);
        if (name) sheet.getRange(i + 1, 4).setValue(name);
        if (role) sheet.getRange(i + 1, 5).setValue(role.toLowerCase().trim());

        Logger.log('✓ updateUser: id=' + id);
        return { status: 'success', message: 'Akun berhasil diperbarui' };
      }
    }

    return { status: 'error', message: 'Akun tidak ditemukan dengan ID: ' + id };

  } catch (error) {
    Logger.log('ERROR handleUpdateUser: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

function handleDeleteUser(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    const { id } = params;
    if (!id) return { status: 'error', message: 'ID harus diisi' };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.USERS);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString() === id.toString()) {
        sheet.deleteRow(i + 1);
        Logger.log('✓ deleteUser: id=' + id);
        return { status: 'success', message: 'Akun berhasil dihapus', deletedId: id };
      }
    }

    return { status: 'error', message: 'Akun tidak ditemukan dengan ID: ' + id };

  } catch (error) {
    Logger.log('ERROR handleDeleteUser: ' + error.toString());
    return { status: 'error', message: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// NOTIFIKASI
// ============================================================
function handleGetNotifikasi() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const notif = [];

    // ── 1. Kendaraan Dinas ──
    try {
      const sheetKendaraan = ss.getSheetByName(SHEET_NAMES.KENDARAAN);
      if (sheetKendaraan) {
        const dataKendaraan = sheetKendaraan.getDataRange().getValues();
        for (let i = 1; i < dataKendaraan.length; i++) {
          const row = dataKendaraan[i];
          if (!row[0]) continue;
          if (row[9] !== 'KENDARAAN') continue;
          const status = (row[10] || 'PENDING').toString().toUpperCase();
          if (status === 'PENDING') {
            notif.push({
              id: row[0].toString(),
              jenis: 'kendaraan',
              ikon: '🚗',
              judul: 'Pengajuan Kendaraan Dinas',
              pesan: (row[2] || '-') + ' mengajukan kendaraan dinas',
              nama_pemohon: row[2] || '-',
              unit: row[3] || '-',
              tanggal: row[4] || '-',
              waktu_penjemputan: row[5] || '-',
              waktu_pengembalian: row[6] || '-',
              tujuan: row[7] || '-',
              alamat: row[8] || '-',
              waktu: row[1] ? new Date(row[1]).toISOString() : new Date().toISOString(),
              status: 'pending'
            });
          }
        }
      }
    } catch (errKendaraan) {
      Logger.log('NOTIF ERROR kendaraan: ' + errKendaraan.toString());
    }

    // ── 2. Voucher BBM ──
    try {
      const sheetBBM = ss.getSheetByName(SHEET_NAMES.VOUCHER_BBM);
      if (sheetBBM) {
        const dataBBM = sheetBBM.getDataRange().getValues();
        for (let i = 1; i < dataBBM.length; i++) {
          const row = dataBBM[i];
          if (!row[0]) continue;
          const status = (row[5] || 'PENDING').toString().toUpperCase();
          if (status === 'PENDING') {
            notif.push({
              id: row[0].toString(),
              jenis: 'voucher_bbm',
              ikon: '⛽',
              judul: 'Permintaan Voucher BBM',
              pesan: (row[2] || '-') + ' mengajukan voucher BBM',
              nama_pemohon: row[2] || '-',
              unit: row[3] || '-',
              nomor_kendaraan: row[4] || '-',
              waktu: row[1] ? new Date(row[1]).toISOString() : new Date().toISOString(),
              status: 'pending'
            });
          }
        }
      }
    } catch (errBBM) {
      Logger.log('NOTIF ERROR voucher_bbm: ' + errBBM.toString());
    }

    // ── 3. Ruang Rapat ──
    try {
      const sheetRapat = ss.getSheetByName(SHEET_NAMES.RUANG_RAPAT);
      if (sheetRapat) {
        const dataRapat = sheetRapat.getDataRange().getValues();
        for (let i = 1; i < dataRapat.length; i++) {
          const row = dataRapat[i];
          if (!row[0]) continue;
          const status = (row[10] || 'PENDING').toString().toUpperCase();
          if (status === 'PENDING') {
            notif.push({
              id: row[0].toString(),
              jenis: 'ruang_rapat',
              ikon: '🏢',
              judul: 'Permintaan Ruang Rapat',
              pesan: (row[2] || '-') + ' mengajukan ruang rapat',
              nama_pemohon: row[2] || '-',
              unit: row[3] || '-',
              tanggal: row[4] || '-',
              waktu_mulai: row[5] || '-',
              waktu_selesai: row[6] || '-',
              keperluan: row[7] || '-',
              waktu: row[1] ? new Date(row[1]).toISOString() : new Date().toISOString(),
              status: 'pending'
            });
          }
        }
      }
    } catch (errRapat) {
      Logger.log('NOTIF ERROR ruang_rapat: ' + errRapat.toString());
    }

    notif.sort(function (a, b) { return new Date(b.waktu) - new Date(a.waktu); });

    Logger.log('handleGetNotifikasi: total=' + notif.length);
    return { success: true, total: notif.length, data: notif };

  } catch (error) {
    Logger.log('ERROR handleGetNotifikasi: ' + error.toString());
    return { success: false, message: error.toString(), total: 0, data: [] };
  }
}

// ============================================================
// BBM VIOLATIONS
// ============================================================
function handleGetBBMViolations(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.CATATAN_BBM);

    if (!sheet) {
      Logger.log('ERROR: Sheet CATATAN BBM tidak ditemukan');
      return [];
    }

    const data = sheet.getDataRange().getDisplayValues();
    const violations = [];

    Logger.log('Total rows in BBM sheet: ' + data.length);

    const unitStartCols = {
      1: 'Sekretariat',
      4: 'Bidang Koperasi',
      7: 'Bidang UKM',
      10: 'Bidang Usaha Mikro',
      13: 'Bidang Kewirausahaan',
      16: 'Balai Layanan Usaha Terpadu KUMKM'
    };

    const monthMarkers = [];
    for (let i = 0; i < data.length; i++) {
      const cell = data[i][0] ? data[i][0].toString().toUpperCase().trim() : '';
      if (cell.startsWith('CATATAN BULAN')) {
        monthMarkers.push({ row: i, month: cell.replace('CATATAN BULAN ', '').trim() });
      }
    }

    Logger.log('Found month markers: ' + monthMarkers.length);

    for (let m = 0; m < monthMarkers.length; m++) {
      const marker = monthMarkers[m];
      const scanTo = marker.row - 1;
      const scanFrom = m > 0 ? monthMarkers[m - 1].row + 1 : 0;

      for (let i = scanFrom; i <= scanTo; i++) {
        const firstCell = data[i][0] ? data[i][0].toString().trim() : '';
        const secondCell = data[i][1] ? data[i][1].toString().trim() : '';

        if (
          secondCell.toLowerCase().includes('tanggal') ||
          firstCell.toLowerCase().includes('nomor catatan') ||
          firstCell.toLowerCase().includes('nomor')
        ) continue;

        Object.keys(unitStartCols).forEach(startColStr => {
          const col = parseInt(startColStr);
          const tglPengambilan = data[i][col] ? data[i][col].toString().trim() : '';
          const tglPengembalian = data[i][col + 1] ? data[i][col + 1].toString().trim() : '';
          const nomorKendaraan = data[i][col + 2] ? data[i][col + 2].toString().trim() : '';

          if (
            tglPengambilan !== '' &&
            tglPengambilan !== '0' &&
            !tglPengambilan.toLowerCase().includes('tanggal') &&
            !tglPengambilan.toLowerCase().includes('pengambilan')
          ) {
            violations.push({
              id: marker.month + '-' + unitStartCols[col] + '-' + i,
              bulan: marker.month,
              unit: unitStartCols[col],
              tanggal_pengambilan: tglPengambilan,
              tanggal_pengembalian: tglPengembalian || '-',
              nomor_kendaraan: nomorKendaraan || '-'
            });
          }
        });
      }
    }

    Logger.log('Total BBM violations found: ' + violations.length);
    return violations;

  } catch (error) {
    Logger.log('ERROR handleGetBBMViolations: ' + error.toString());
    return [];
  }
}

function handleCreateBBMViolation(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const { bulan, unit, tanggal_pengambilan, tanggal_pengembalian, nomor_kendaraan } = params;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.CATATAN_BBM);
    if (!sheet) return { success: false, message: 'Sheet tidak ditemukan' };

    const unitColumns = {
      'Sekretariat': 2, 'Bidang Koperasi': 5, 'Bidang UKM': 8,
      'Bidang Usaha Mikro': 11, 'Bidang Kewirausahaan': 14,
      'Balai Layanan Usaha Terpadu KUMKM': 17
    };
    const colIdx = unitColumns[unit];
    if (!colIdx) return { success: false, message: 'Unit tidak valid: ' + unit };

    const data = sheet.getDataRange().getValues();
    let labelBulanRow = -1;

    for (let i = 0; i < data.length; i++) {
      const cellValue = data[i][0] ? data[i][0].toString().toUpperCase().trim() : '';
      if (cellValue === 'CATATAN BULAN ' + bulan.toUpperCase()) { labelBulanRow = i; break; }
    }
    if (labelBulanRow === -1) return { success: false, message: 'Label Bulan tidak ditemukan: ' + bulan };

    let subHeaderRow = -1;
    for (let i = labelBulanRow - 1; i >= 0; i--) {
      const cellB = data[i][1] ? data[i][1].toString().trim() : '';
      if (cellB.toLowerCase().includes('tanggal')) { subHeaderRow = i; break; }
    }
    if (subHeaderRow === -1) return { success: false, message: 'Sub-header tidak ditemukan di atas bulan ' + bulan };

    const dataStart = subHeaderRow + 1;
    const dataEnd = labelBulanRow - 1;

    let targetRow0 = -1;
    for (let r = dataStart; r <= dataEnd; r++) {
      const val = data[r][colIdx - 1];
      if (val === '' || val === null || val === undefined) { targetRow0 = r; break; }
    }

    let targetRow1, counterRow1;
    if (targetRow0 === -1) {
      sheet.insertRowBefore(labelBulanRow + 1);
      targetRow1 = labelBulanRow + 1;
      counterRow1 = labelBulanRow + 2;
    } else {
      targetRow1 = targetRow0 + 1;
      counterRow1 = labelBulanRow + 1;
    }

    let entryCount = 0;
    for (let r = dataStart; r <= dataEnd; r++) {
      const val = data[r][colIdx - 1];
      if (val !== '' && val !== null && val !== undefined) entryCount++;
    }
    entryCount++;

    sheet.getRange(targetRow1, 1).setValue(entryCount);
    sheet.getRange(targetRow1, colIdx).setValue(tanggal_pengambilan);
    sheet.getRange(targetRow1, colIdx + 1).setValue(tanggal_pengembalian);
    sheet.getRange(targetRow1, colIdx + 2).setValue(nomor_kendaraan);
    sheet.getRange(counterRow1, colIdx).setValue(entryCount);

    updateBBMScores(bulan, unit);

    return {
      success: true,
      message: 'Berhasil tambah catatan #' + entryCount + ' untuk ' + unit + ' bulan ' + bulan,
      id: bulan + '-' + unit + '-' + (targetRow0 === -1 ? labelBulanRow : targetRow0)
    };

  } catch (error) {
    Logger.log('ERROR handleCreateBBMViolation: ' + error.toString());
    return { success: false, message: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

function updateBBMScores(bulan, unit) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const scoreSheet = ss.getSheetByName(SHEET_NAMES.PENILAIAN_BBM);
    const catatanSheet = ss.getSheetByName(SHEET_NAMES.CATATAN_BBM);

    if (!scoreSheet || !catatanSheet) { Logger.log('ERROR: Score or Catatan sheet not found'); return; }

    const scoreData = scoreSheet.getDataRange().getValues();
    const catatanData = catatanSheet.getDataRange().getValues();
    const sanksi = parseFloat(scoreData[2][1]) || 0.1;

    const unitColumnsScore = {
      'Sekretariat': 1, 'Bidang Koperasi': 2, 'Bidang UKM': 3,
      'Bidang Usaha Mikro': 4, 'Bidang Kewirausahaan': 5, 'Balai Layanan Usaha Terpadu KUMKM': 6
    };
    const catatanUnitCols = {
      'Sekretariat': 2, 'Bidang Koperasi': 5, 'Bidang UKM': 8,
      'Bidang Usaha Mikro': 11, 'Bidang Kewirausahaan': 14, 'Balai Layanan Usaha Terpadu KUMKM': 17
    };

    const unitCol = unitColumnsScore[unit];
    if (!unitCol) { Logger.log('ERROR: Invalid unit for scoring'); return; }

    let violationCount = 0;
    for (let i = 0; i < catatanData.length; i++) {
      const cell = catatanData[i][0] ? catatanData[i][0].toString().trim() : '';
      if (cell.toUpperCase() === 'CATATAN BULAN ' + bulan.toUpperCase()) {
        violationCount = parseInt(catatanData[i][catatanUnitCols[unit] - 1]) || 0;
        break;
      }
    }

    for (let i = 0; i < scoreData.length; i++) {
      if (scoreData[i][0] === 'URAIAN' && i + 4 < scoreData.length) {
        const skorAkhirRow = scoreData[i + 4];
        if (skorAkhirRow[0] && skorAkhirRow[0].toString().toUpperCase().includes(bulan.toUpperCase())) {
          scoreSheet.getRange(i + 3, unitCol + 1).setValue(violationCount);
          const totalSanksi = violationCount * sanksi;
          scoreSheet.getRange(i + 4, unitCol + 1).setValue(totalSanksi);
          const skorUtuh = parseFloat(scoreData[i + 1][unitCol]) || 5;
          scoreSheet.getRange(i + 5, unitCol + 1).setValue(skorUtuh - totalSanksi);
          break;
        }
      }
    }
  } catch (error) {
    Logger.log('ERROR updateBBMScores: ' + error.toString());
  }
}

function handleGetBBMScores(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.PENILAIAN_BBM);
    if (!sheet) return { success: false, message: 'Sheet BBM tidak ditemukan' };

    const data = sheet.getDataRange().getValues();
    const allScores = [];
    const units = ['Sekretariat', 'Bidang Koperasi', 'Bidang UKM', 'Bidang Usaha Mikro', 'Bidang Kewirausahaan', 'Balai Layanan Usaha Terpadu KUMKM'];

    for (let i = 0; i < data.length; i++) {
      const rowHeader = data[i][0] ? data[i][0].toString().toUpperCase().trim() : '';
      if (rowHeader.includes('SKOR AKHIR BULAN')) {
        const monthName = rowHeader.replace('SKOR AKHIR BULAN', '').trim();
        for (let col = 1; col <= 6; col++) {
          allScores.push({
            bulan: monthName, unit: units[col - 1],
            skorUtuh: parseFloat(data[i - 3][col]) || 0,
            jumlahPelanggaran: parseInt(data[i - 2][col]) || 0,
            jumlahSanksi: parseFloat(data[i - 1][col]) || 0,
            skorAkhir: parseFloat(data[i][col]) || 0
          });
        }
      }
    }

    return { success: true, sanksiPerPelanggaran: parseFloat(data[2][1]) || 0.1, scores: allScores };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function handleExportBBMViolationsReport(params) {
  try {
    const { bulan, unit } = params;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = 'REKAP_BBM_' + (bulan || 'ALL').toUpperCase();
    let exportSheet = ss.getSheetByName(sheetName);
    if (exportSheet) ss.deleteSheet(exportSheet);
    exportSheet = ss.insertSheet(sheetName);

    const violations = handleGetBBMViolations({});
    let filtered = Array.isArray(violations) ? violations : [];
    if (bulan) filtered = filtered.filter(v => v.bulan === bulan.toUpperCase());
    if (unit) filtered = filtered.filter(v => v.unit === unit);

    exportSheet.appendRow(['REKAPITULASI CATATAN KETERLAMBATAN PENGEMBALIAN BUKTI PEMBELIAN BBM', '', '', '', '']);
    if (bulan) exportSheet.appendRow(['Bulan: ' + bulan]);
    if (unit) exportSheet.appendRow(['Unit: ' + unit]);
    exportSheet.appendRow(['']);

    const headerRow = exportSheet.getLastRow() + 1;
    exportSheet.getRange(headerRow, 1, 1, 6).setValues([['No', 'Bulan', 'Unit', 'Tanggal Pengambilan', 'Tanggal Pengembalian', 'Nomor Kendaraan']]);
    exportSheet.getRange(headerRow, 1, 1, 6).setFontWeight('bold').setBackground('#4a5568').setFontColor('#ffffff');

    filtered.forEach((v, idx) => {
      exportSheet.appendRow([idx + 1, v.bulan, v.unit, v.tanggal_pengambilan, v.tanggal_pengembalian, v.nomor_kendaraan]);
    });

    for (let i = 1; i <= 6; i++) exportSheet.autoResizeColumn(i);
    exportSheet.getRange(headerRow, 1, filtered.length + 1, 6).setBorder(true, true, true, true, true, true);

    return {
      success: true, message: 'Laporan berhasil diekspor',
      sheetName: exportSheet.getName(), recordCount: filtered.length,
      url: ss.getUrl() + '#gid=' + exportSheet.getSheetId()
    };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function handleUpdateBBMViolation(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const { id, bulan, unit, tanggal_pengambilan, tanggal_pengembalian, nomor_kendaraan } = params;
    if (!id || !bulan || !unit) return { success: false, message: 'Parameter id, bulan, dan unit harus diisi' };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.CATATAN_BBM);
    if (!sheet) return { success: false, message: 'Sheet CATATAN BBM tidak ditemukan' };

    const unitColumns = {
      'Sekretariat': 2, 'Bidang Koperasi': 5, 'Bidang UKM': 8,
      'Bidang Usaha Mikro': 11, 'Bidang Kewirausahaan': 14, 'Balai Layanan Usaha Terpadu KUMKM': 17
    };
    const colIdx = unitColumns[unit];
    if (!colIdx) return { success: false, message: 'Unit tidak valid: ' + unit };

    const idParts = id.split('-');
    const rowHint0 = parseInt(idParts[idParts.length - 1]);
    const data = sheet.getDataRange().getValues();

    let foundRow1 = -1;
    if (!isNaN(rowHint0) && rowHint0 >= 0 && rowHint0 < data.length) {
      const val = data[rowHint0][colIdx - 1];
      if (val !== null && val !== undefined && val.toString().trim() !== '') foundRow1 = rowHint0 + 1;
    }

    if (foundRow1 === -1) {
      let labelBulanRow0 = -1, subHeaderRow0 = -1;
      for (let i = 0; i < data.length; i++) {
        const cell = data[i][0] ? data[i][0].toString().toUpperCase().trim() : '';
        if (cell === 'CATATAN BULAN ' + bulan.toUpperCase()) { labelBulanRow0 = i; break; }
      }
      if (labelBulanRow0 === -1) return { success: false, message: 'Bulan ' + bulan + ' tidak ditemukan' };
      for (let i = labelBulanRow0 - 1; i >= 0; i--) {
        const cellB = data[i][1] ? data[i][1].toString().trim() : '';
        if (cellB.toLowerCase().includes('tanggal')) { subHeaderRow0 = i; break; }
      }
      if (subHeaderRow0 === -1) return { success: false, message: 'Sub-header tidak ditemukan' };
      for (let r = subHeaderRow0 + 1; r < labelBulanRow0; r++) {
        const val = data[r][colIdx - 1];
        if (val !== null && val !== undefined && val.toString().trim() !== '') { foundRow1 = r + 1; break; }
      }
    }

    if (foundRow1 === -1) return { success: false, message: 'Data tidak ditemukan untuk ' + unit + ' bulan ' + bulan };

    if (tanggal_pengambilan) sheet.getRange(foundRow1, colIdx).setValue(tanggal_pengambilan);
    if (tanggal_pengembalian) sheet.getRange(foundRow1, colIdx + 1).setValue(tanggal_pengembalian);
    if (nomor_kendaraan) sheet.getRange(foundRow1, colIdx + 2).setValue(nomor_kendaraan);

    return { success: true, message: 'Catatan berhasil diperbarui untuk ' + unit + ' bulan ' + bulan };

  } catch (error) {
    Logger.log('ERROR handleUpdateBBMViolation: ' + error.toString());
    return { success: false, message: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteBBMViolation(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const { id, bulan, unit } = params;
    if (!id || !bulan || !unit) return { success: false, message: 'Parameter id, bulan, dan unit harus diisi' };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.CATATAN_BBM);
    if (!sheet) return { success: false, message: 'Sheet CATATAN BBM tidak ditemukan' };

    const unitColumns = {
      'Sekretariat': 2, 'Bidang Koperasi': 5, 'Bidang UKM': 8,
      'Bidang Usaha Mikro': 11, 'Bidang Kewirausahaan': 14, 'Balai Layanan Usaha Terpadu KUMKM': 17
    };
    const colIdx = unitColumns[unit];
    if (!colIdx) return { success: false, message: 'Unit tidak valid: ' + unit };

    const idParts = id.split('-');
    const rowHint0 = parseInt(idParts[idParts.length - 1]);
    const data = sheet.getDataRange().getValues();

    let labelBulanRow0 = -1;
    for (let i = 0; i < data.length; i++) {
      const cell = data[i][0] ? data[i][0].toString().toUpperCase().trim() : '';
      if (cell === 'CATATAN BULAN ' + bulan.toUpperCase()) { labelBulanRow0 = i; break; }
    }
    if (labelBulanRow0 === -1) return { success: false, message: 'Bulan ' + bulan + ' tidak ditemukan' };

    const labelBulanRow1 = labelBulanRow0 + 1;
    let foundRow1 = -1;

    if (!isNaN(rowHint0) && rowHint0 >= 0 && rowHint0 < data.length) {
      const val = data[rowHint0][colIdx - 1];
      if (val !== null && val !== undefined && val.toString().trim() !== '') foundRow1 = rowHint0 + 1;
    }

    if (foundRow1 === -1) {
      let subHeaderRow0 = -1;
      for (let i = labelBulanRow0 - 1; i >= 0; i--) {
        const cellB = data[i][1] ? data[i][1].toString().trim() : '';
        if (cellB.toLowerCase().includes('tanggal')) { subHeaderRow0 = i; break; }
      }
      if (subHeaderRow0 === -1) return { success: false, message: 'Sub-header tidak ditemukan' };
      for (let r = subHeaderRow0 + 1; r < labelBulanRow0; r++) {
        const val = data[r][colIdx - 1];
        if (val !== null && val !== undefined && val.toString().trim() !== '') { foundRow1 = r + 1; break; }
      }
    }

    if (foundRow1 === -1) return { success: false, message: 'Data tidak ditemukan untuk ' + unit + ' bulan ' + bulan };

    sheet.getRange(foundRow1, colIdx).clearContent();
    sheet.getRange(foundRow1, colIdx + 1).clearContent();
    sheet.getRange(foundRow1, colIdx + 2).clearContent();

    const currentCount = parseInt(sheet.getRange(labelBulanRow1, colIdx).getValue()) || 0;
    sheet.getRange(labelBulanRow1, colIdx).setValue(Math.max(0, currentCount - 1));

    updateBBMScores(bulan, unit);

    return { success: true, message: 'Catatan berhasil dihapus untuk ' + unit + ' bulan ' + bulan };

  } catch (error) {
    Logger.log('ERROR handleDeleteBBMViolation: ' + error.toString());
    return { success: false, message: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// KENDARAAN DINAS
// ============================================================
function handleGetRequests(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.KENDARAAN);
    const data = sheet.getDataRange().getDisplayValues();
    const requests = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[9] !== 'KENDARAAN') continue;
      requests.push({
        id: row[0], timestamp: row[1], nama_pegawai: row[2], nip: '123456789',
        unit_eselon: row[3], tanggal_penggunaan: row[4], waktu_penjemputan: row[5],
        waktu_pengembalian: row[6], tujuan: row[7], alamat: row[8], jumlah_penumpang: 1,
        keterangan: row[7], status: (row[10] || 'pending').toLowerCase(), nomorKendaraan: row[11] || ''
      });
    }

    return requests;

  } catch (error) {
    Logger.log('ERROR: ' + error.toString());
    return [];
  }
}

function handleCreateRequest(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.KENDARAAN);
    const newId = 'REQ-' + new Date().getTime();
    const ts = new Date();

    sheet.appendRow([
      newId, ts, params.nama_pegawai, params.unit_eselon,
      params.tanggal_penggunaan, params.waktu_penjemputan, params.waktu_pengembalian,
      params.tujuan, params.alamat || '', 'KENDARAAN', 'PENDING'
    ]);

    // ★ Kirim WA otomatis setelah data disimpan
    sendWANotifikasi('kendaraan', {
      pemohon: params.nama_pegawai || '-',
      unit: params.unit_eselon || '-',
      tanggal: params.tanggal_penggunaan || '-',
      waktu_penjemputan: params.waktu_penjemputan || '-',
      waktu_pengembalian: params.waktu_pengembalian || '-',
      tujuan: params.tujuan || '-',
      alamat: params.alamat || '-',
      timestamp: ts.toISOString(),
    });

    return { success: true, message: 'Pengajuan berhasil dibuat', id: newId };

  } catch (error) {
    return { success: false, message: 'Gagal membuat pengajuan' };
  }
}

function handleGetStats() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.KENDARAAN);
    const data = sheet.getDataRange().getValues();

    let total = 0, pending = 0, approved = 0, rejected = 0;

    for (let i = 1; i < data.length; i++) {
      if (data[i][9] !== 'KENDARAAN') continue;
      total++;
      const status = (data[i][10] || 'PENDING').toUpperCase();
      if (status === 'PENDING') pending++;
      else if (status === 'APPROVED' || status === 'DISETUJUI') approved++;
      else if (status === 'REJECTED' || status === 'DITOLAK') rejected++;
    }

    return { total, pending, approved, rejected };

  } catch (error) {
    return { total: 0, pending: 0, approved: 0, rejected: 0 };
  }
}

function handleUpdateRequest(params) {
  const { id, status, nama_pegawai, unit_eselon, tanggal_penggunaan,
    waktu_penjemputan, waktu_pengembalian, tujuan, alamat, nomorKendaraan } = params;

  if (!id) return { success: false, message: 'ID harus diisi' };

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.KENDARAAN);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == id) {
        if (status && !nama_pegawai) {
          sheet.getRange(i + 1, 11).setValue(status.toUpperCase());
          if (status.toLowerCase() === 'approved' && nomorKendaraan) {
            sheet.getRange(i + 1, 12).setValue(nomorKendaraan);
          }
          return { success: true, message: 'Status berhasil diupdate' };
        }
        if (nama_pegawai) {
          sheet.getRange(i + 1, 3).setValue(nama_pegawai);
          sheet.getRange(i + 1, 4).setValue(unit_eselon);
          sheet.getRange(i + 1, 5).setValue(tanggal_penggunaan);
          sheet.getRange(i + 1, 6).setValue(waktu_penjemputan);
          sheet.getRange(i + 1, 7).setValue(waktu_pengembalian);
          sheet.getRange(i + 1, 8).setValue(tujuan);
          sheet.getRange(i + 1, 9).setValue(alamat || '');
          if (status) sheet.getRange(i + 1, 11).setValue(status.toUpperCase());
          if (nomorKendaraan) sheet.getRange(i + 1, 12).setValue(nomorKendaraan);
          return { success: true, message: 'Data berhasil diperbarui' };
        }
        return { success: true, message: 'Data berhasil diupdate' };
      }
    }

    return { success: false, message: 'Request tidak ditemukan' };

  } catch (error) {
    return { success: false, message: 'Gagal update: ' + error.toString() };
  }
}

function handleDeleteRequest(params) {
  const { id } = params;
  if (!id) return { success: false, message: 'ID harus diisi' };

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.KENDARAAN);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == id) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Pengajuan berhasil dihapus', deletedId: id };
      }
    }

    return { success: false, message: 'Request tidak ditemukan' };

  } catch (error) {
    return { success: false, message: 'Gagal menghapus: ' + error.toString() };
  }
}

// ============================================================
// VOUCHER BBM
// ============================================================
function handleGetVoucherRequests(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.VOUCHER_BBM);
    const data = sheet.getDataRange().getDisplayValues();

    return data.slice(1).map(row => ({
      id: row[0], timestamp: row[1], nama_pegawai: row[2],
      unit_eselon: row[3], nomor_kendaraan: row[4],
      status: (row[5] || 'PENDING').toLowerCase()
    }));
  } catch (error) { return []; }
}

function handleCreateVoucherRequest(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.VOUCHER_BBM);
    const newId = 'REQ-' + new Date().getTime();
    const ts = new Date();

    sheet.appendRow([newId, ts, params.nama_pegawai, params.unit_eselon, params.nomor_kendaraan, 'PENDING']);

    // ★ Kirim WA otomatis
    sendWANotifikasi('voucher_bbm', {
      pemohon: params.nama_pegawai || '-',
      unit: params.unit_eselon || '-',
      nomor_kendaraan: params.nomor_kendaraan || '-',
      timestamp: ts.toISOString(),
    });

    return { success: true, message: 'Permintaan voucher berhasil dibuat', id: newId };

  } catch (error) {
    return { success: false, message: 'Gagal membuat permintaan voucher' };
  }
}

function handleUpdateVoucherRequest(params) {
  const { id, status } = params;
  if (!id || !status) return { success: false, message: 'ID dan status harus diisi' };

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.VOUCHER_BBM);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == id) {
        sheet.getRange(i + 1, 6).setValue(status.toUpperCase());
        return { success: true, message: 'Status voucher berhasil diupdate' };
      }
    }

    return { success: false, message: 'Voucher request tidak ditemukan' };

  } catch (error) {
    return { success: false, message: 'Gagal update status voucher: ' + error.toString() };
  }
}

function handleDeleteVoucherRequest(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const { id } = params;
    if (!id) return { success: false, message: 'ID harus diisi' };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.VOUCHER_BBM);
    if (!sheet) return { success: false, message: 'Sheet VOUCHER_BBM tidak ditemukan' };

    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == id) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Permintaan voucher berhasil dihapus', deletedId: id };
      }
    }

    return { success: false, message: 'Permintaan tidak ditemukan dengan ID: ' + id };

  } catch (error) {
    return { success: false, message: 'Gagal menghapus: ' + error.toString() };
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// RUANG RAPAT
// ============================================================
function handleGetRoomRequests(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.RUANG_RAPAT);
    const data = sheet.getDataRange().getDisplayValues();

    return data.slice(1).map(row => ({
      id: row[0], timestamp: row[1], nama_pemohon: row[2], unit_eselon: row[3],
      tanggal: row[4], waktu_mulai: row[5], waktu_selesai: row[6],
      kegiatan: row[7], keperluan: row[7], jumlah_peserta: row[8],
      status: (row[10] || 'PENDING').toLowerCase(), namaRuang: row[11] || ''
    }));
  } catch (error) { return []; }
}

function handleCreateRoomRequest(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.RUANG_RAPAT);
    const newId = 'REQ-' + new Date().getTime();
    const ts = new Date();

    sheet.appendRow([
      newId, ts, params.nama_pemohon, params.unit_eselon,
      params.tanggal, params.waktu_mulai, params.waktu_selesai,
      params.keperluan, params.jumlah_peserta || 0, 'RUANG_RAPAT', 'PENDING'
    ]);

    // ★ Kirim WA otomatis
    sendWANotifikasi('ruang_rapat', {
      pemohon: params.nama_pemohon || '-',
      unit: params.unit_eselon || '-',
      tanggal: params.tanggal || '-',
      waktu_mulai: params.waktu_mulai || '-',
      waktu_selesai: params.waktu_selesai || '-',
      keperluan: params.keperluan || '-',
      jumlah_peserta: params.jumlah_peserta || '-',
      timestamp: ts.toISOString(),
    });

    return { success: true, message: 'Permintaan ruang rapat berhasil dibuat', id: newId };

  } catch (error) {
    return { success: false, message: 'Gagal membuat permintaan ruang rapat' };
  }
}

function handleUpdateRoomRequest(params) {
  const { id, status, namaRuang } = params;
  if (!id) return { success: false, message: 'ID harus diisi' };

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.RUANG_RAPAT);
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == id) {
        if (status) sheet.getRange(i + 1, 11).setValue(status.toUpperCase());
        if (namaRuang) sheet.getRange(i + 1, 12).setValue(namaRuang);
        return { success: true, message: 'Permintaan ruang rapat berhasil diupdate' };
      }
    }

    return { success: false, message: 'Permintaan tidak ditemukan' };

  } catch (error) {
    return { success: false, message: 'Gagal update: ' + error.toString() };
  }
}

// ============================================================
// CATATAN PELANGGARAN RUANG RAPAT
// ============================================================
function handleGetRoomViolations(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.CATATAN_RUANG_RAPAT);
    const data = sheet.getDataRange().getDisplayValues();
    const violations = [];

    const units = [
      { name: 'Sekretariat', colTanggal: 2 }, { name: 'Bidang Koperasi', colTanggal: 5 },
      { name: 'Bidang UKM', colTanggal: 8 }, { name: 'Bidang Usaha Mikro', colTanggal: 11 },
      { name: 'Bidang Kewirausahaan', colTanggal: 14 }, { name: 'Balai Layanan Usaha Terpadu KUMKM', colTanggal: 17 }
    ];

    for (let i = 0; i < data.length; i++) {
      const cellVal = data[i][0] ? data[i][0].toString().toUpperCase().trim() : '';

      if (cellVal.startsWith('CATATAN BULAN')) {
        const currentMonth = cellVal.replace('CATATAN BULAN ', '').trim();

        for (let j = i - 1; j >= 0; j--) {
          const firstCell = data[j][0] ? data[j][0].toString().trim() : '';
          const secondCell = data[j][1] ? data[j][1].toString().trim() : '';

          if (secondCell.includes('Tanggal') || firstCell.includes('Nomor') || firstCell.includes('CATATAN BULAN')) break;

          units.forEach(unit => {
            const colIdx = unit.colTanggal - 1;
            const tanggal = data[j][colIdx];
            const namaRuang = data[j][colIdx + 1];
            const laporan = data[j][colIdx + 2];

            if (tanggal && tanggal.trim() !== '' && !tanggal.includes('Tanggal') && !tanggal.includes('Penggunaan')) {
              violations.push({
                id: `${currentMonth}-${unit.name}-${j}`,
                bulan: currentMonth, unit: unit.name,
                tanggal, namaRuang: namaRuang || '-', laporan: laporan || '-'
              });
            }
          });
        }
      }
    }

    return violations;

  } catch (error) {
    Logger.log('ERROR handleGetRoomViolations: ' + error.toString());
    return [];
  }
}

function handleCreateRoomViolation(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const { bulan, unit, tanggal, namaRuang, laporan } = params;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.CATATAN_RUANG_RAPAT);
    const unitColumns = {
      'Sekretariat': 2, 'Bidang Koperasi': 5, 'Bidang UKM': 8,
      'Bidang Usaha Mikro': 11, 'Bidang Kewirausahaan': 14, 'Balai Layanan Usaha Terpadu KUMKM': 17
    };
    const colIdx = unitColumns[unit];
    if (!colIdx) return { success: false, message: 'Unit tidak valid' };

    const data = sheet.getDataRange().getValues();
    let labelBulanRow = -1;
    for (let i = 0; i < data.length; i++) {
      const cellVal = data[i][0] ? data[i][0].toString().toUpperCase().trim() : '';
      if (cellVal === `CATATAN BULAN ${bulan.toUpperCase()}`) { labelBulanRow = i; break; }
    }
    if (labelBulanRow === -1) return { success: false, message: 'Bulan tidak ditemukan di sheet' };

    let subHeaderRow = -1;
    for (let i = labelBulanRow - 1; i >= 0; i--) {
      const cellB = data[i][1] ? data[i][1].toString().trim() : '';
      if (cellB.toLowerCase().includes('tanggal')) { subHeaderRow = i; break; }
    }
    if (subHeaderRow === -1) return { success: false, message: 'Sub-header tidak ditemukan' };

    const dataStartRow0 = subHeaderRow + 1;
    const dataEndRow0 = labelBulanRow - 1;
    let targetRow0 = -1;
    for (let r = dataStartRow0; r <= dataEndRow0; r++) {
      const val = data[r][colIdx - 1];
      if (val === '' || val === null || val === undefined) { targetRow0 = r; break; }
    }

    let targetRow1based;
    if (targetRow0 === -1) { sheet.insertRowBefore(labelBulanRow + 1); targetRow1based = labelBulanRow + 1; }
    else { targetRow1based = targetRow0 + 1; }

    let entryCount = 0;
    for (let r = dataStartRow0; r <= dataEndRow0; r++) {
      const val = data[r][colIdx - 1];
      if (val !== '' && val !== null && val !== undefined) entryCount++;
    }
    entryCount++;

    sheet.getRange(targetRow1based, 1).setValue(entryCount);
    sheet.getRange(targetRow1based, colIdx).setValue(tanggal);
    sheet.getRange(targetRow1based, colIdx + 1).setValue(namaRuang);
    sheet.getRange(targetRow1based, colIdx + 2).setValue(laporan);

    const counterRow1based = (targetRow0 === -1) ? labelBulanRow + 2 : labelBulanRow + 1;
    sheet.getRange(counterRow1based, colIdx).setValue(entryCount);

    updateRoomScores(bulan, unit);

    return {
      success: true,
      message: `Berhasil menambah catatan #${entryCount} untuk ${unit} bulan ${bulan}`,
      id: `${bulan}-${unit}-${targetRow0 === -1 ? labelBulanRow : targetRow0}`
    };

  } catch (error) {
    Logger.log('ERROR handleCreateRoomViolation: ' + error.toString());
    return { success: false, message: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateRoomViolation(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const { id, bulan, unit, tanggal, namaRuang, laporan } = params;
    if (!id || !bulan || !unit) return { success: false, message: 'Parameter tidak lengkap' };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.CATATAN_RUANG_RAPAT);
    const unitColumns = {
      'Sekretariat': 2, 'Bidang Koperasi': 5, 'Bidang UKM': 8,
      'Bidang Usaha Mikro': 11, 'Bidang Kewirausahaan': 14, 'Balai Layanan Usaha Terpadu KUMKM': 17
    };
    const colIdx = unitColumns[unit];
    if (!colIdx) return { success: false, message: 'Unit tidak valid' };

    const data = sheet.getDataRange().getValues();
    const idParts = id.split('-');
    const rowHint = parseInt(idParts[idParts.length - 1]);

    let labelBulanRow = -1;
    for (let i = 0; i < data.length; i++) {
      const cellVal = data[i][0] ? data[i][0].toString().toUpperCase().trim() : '';
      if (cellVal === `CATATAN BULAN ${bulan.toUpperCase()}`) { labelBulanRow = i + 1; break; }
    }
    if (labelBulanRow === -1) return { success: false, message: 'Bulan tidak ditemukan' };

    let foundRow = -1;
    if (rowHint > 0 && rowHint < data.length) {
      const val = data[rowHint][colIdx - 1];
      if (val && val.toString().trim() !== '') foundRow = rowHint + 1;
    }
    if (foundRow === -1) {
      for (let j = labelBulanRow - 2; j >= 1; j--) {
        const cellA = data[j - 1][0] ? data[j - 1][0].toString().trim() : '';
        const cellB = data[j - 1][1] ? data[j - 1][1].toString().trim() : '';
        if (cellB.includes('Tanggal') || cellA.includes('Nomor')) break;
        const val = data[j - 1][colIdx - 1];
        if (val && val.toString().trim() !== '') { foundRow = j; break; }
      }
    }
    if (foundRow === -1) return { success: false, message: 'Data tidak ditemukan' };

    if (tanggal) sheet.getRange(foundRow, colIdx).setValue(tanggal);
    if (namaRuang) sheet.getRange(foundRow, colIdx + 1).setValue(namaRuang);
    if (laporan) sheet.getRange(foundRow, colIdx + 2).setValue(laporan);

    updateRoomScores(bulan, unit);
    return { success: true, message: 'Catatan berhasil diupdate' };

  } catch (error) {
    Logger.log('ERROR handleUpdateRoomViolation: ' + error.toString());
    return { success: false, message: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteRoomViolation(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const { id, bulan, unit } = params;
    if (!id || !bulan || !unit) return { success: false, message: 'Parameter tidak lengkap' };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.CATATAN_RUANG_RAPAT);
    const unitColumns = {
      'Sekretariat': 2, 'Bidang Koperasi': 5, 'Bidang UKM': 8,
      'Bidang Usaha Mikro': 11, 'Bidang Kewirausahaan': 14, 'Balai Layanan Usaha Terpadu KUMKM': 17
    };
    const colIdx = unitColumns[unit];
    if (!colIdx) return { success: false, message: 'Unit tidak valid' };

    const data = sheet.getDataRange().getValues();
    const idParts = id.split('-');
    const rowHint = parseInt(idParts[idParts.length - 1]);

    let labelBulanRow = -1;
    for (let i = 0; i < data.length; i++) {
      const cellVal = data[i][0] ? data[i][0].toString().toUpperCase().trim() : '';
      if (cellVal === `CATATAN BULAN ${bulan.toUpperCase()}`) { labelBulanRow = i + 1; break; }
    }
    if (labelBulanRow === -1) return { success: false, message: 'Bulan tidak ditemukan' };

    let foundRow = -1;
    if (rowHint > 0 && rowHint < data.length) {
      const val = data[rowHint][colIdx - 1];
      if (val && val.toString().trim() !== '') foundRow = rowHint + 1;
    }
    if (foundRow === -1) {
      for (let j = labelBulanRow - 2; j >= 1; j--) {
        const cellA = data[j - 1][0] ? data[j - 1][0].toString().trim() : '';
        const cellB = data[j - 1][1] ? data[j - 1][1].toString().trim() : '';
        if (cellB.includes('Tanggal') || cellA.includes('Nomor')) break;
        const val = data[j - 1][colIdx - 1];
        if (val && val.toString().trim() !== '') { foundRow = j; break; }
      }
    }
    if (foundRow === -1) return { success: false, message: 'Data tidak ditemukan' };

    sheet.getRange(foundRow, colIdx).clearContent();
    sheet.getRange(foundRow, colIdx + 1).clearContent();
    sheet.getRange(foundRow, colIdx + 2).clearContent();

    const currentCount = parseInt(sheet.getRange(labelBulanRow, colIdx).getValue()) || 0;
    sheet.getRange(labelBulanRow, colIdx).setValue(Math.max(0, currentCount - 1));

    updateRoomScores(bulan, unit);
    return { success: true, message: 'Catatan berhasil dihapus' };

  } catch (error) {
    Logger.log('ERROR handleDeleteRoomViolation: ' + error.toString());
    return { success: false, message: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// PENILAIAN RUANG RAPAT
// ============================================================
function handleGetRoomScores(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.PENILAIAN_RUANG_RAPAT);
    if (!sheet) return { success: false, message: "Sheet PENILAIAN_RUANG_RAPAT tidak ditemukan" };

    const data = sheet.getDataRange().getValues();
    const sanksiPerPelanggaran = data[1][0] || 0.1;
    const allScores = [];
    const months = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];

    for (let i = 0; i < data.length; i++) {
      let rowText = data[i][0] ? data[i][0].toString().toUpperCase().trim() : "";
      if (rowText.indexOf("SKOR AKHIR BULAN") !== -1) {
        let currentMonth = months.find(m => rowText.includes(m));
        if (currentMonth) {
          const units = ["Sekretariat", "Bidang Koperasi", "Bidang UKM", "Bidang Usaha Mikro", "Bidang Kewirausahaan", "Balai Layanan Usaha Terpadu KUMKM"];
          for (let col = 1; col <= 6; col++) {
            allScores.push({
              bulan: currentMonth, unit: units[col - 1],
              skorUtuh: parseFloat(data[i - 3][col]) || 0,
              jumlahPelanggaran: parseInt(data[i - 2][col]) || 0,
              jumlahSanksi: parseFloat(data[i - 1][col]) || 0,
              skorAkhir: parseFloat(data[i][col]) || 0
            });
          }
        }
      }
    }

    return { success: true, sanksiPerPelanggaran, scores: allScores };

  } catch (err) {
    return { success: false, message: "Error di server: " + err.toString() };
  }
}

function updateRoomScores(bulan, unit) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const scoreSheet = ss.getSheetByName(SHEET_NAMES.PENILAIAN_RUANG_RAPAT);
    const catatanSheet = ss.getSheetByName(SHEET_NAMES.CATATAN_RUANG_RAPAT);
    if (!scoreSheet || !catatanSheet) return;

    const scoreData = scoreSheet.getDataRange().getValues();
    const catatanData = catatanSheet.getDataRange().getValues();
    const sanksi = parseFloat(scoreData[1][1]) || 0.1;
    const unitColumns = {
      'Sekretariat': 1, 'Bidang Koperasi': 2, 'Bidang UKM': 3,
      'Bidang Usaha Mikro': 4, 'Bidang Kewirausahaan': 5, 'Balai Layanan Usaha Terpadu KUMKM': 6
    };
    const unitCol = unitColumns[unit];
    if (!unitCol) return;

    let violationCount = 0;
    for (let i = 0; i < catatanData.length; i++) {
      if (catatanData[i][0] && catatanData[i][0].toString().trim() === `CATATAN BULAN ${bulan.toUpperCase()}`) {
        violationCount = parseInt(catatanData[i][unitCol]) || 0;
        break;
      }
    }

    for (let i = 2; i < scoreData.length; i++) {
      if (scoreData[i][0] === 'URAIAN' && i + 4 < scoreData.length) {
        const skorAkhirRow = scoreData[i + 4];
        if (skorAkhirRow[0] && skorAkhirRow[0].toString().includes(bulan)) {
          scoreSheet.getRange(i + 3, unitCol + 1).setValue(violationCount);
          const totalSanksi = violationCount * sanksi;
          scoreSheet.getRange(i + 4, unitCol + 1).setValue(totalSanksi);
          const skorUtuh = parseFloat(scoreData[i + 1][unitCol]) || 5;
          scoreSheet.getRange(i + 5, unitCol + 1).setValue(skorUtuh - totalSanksi);
          break;
        }
      }
    }
  } catch (error) {
    Logger.log('ERROR updateRoomScores: ' + error.toString());
  }
}

function handleExportViolationsReport(params) {
  try {
    const { bulan, unit } = params;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let exportSheet = ss.getSheetByName('REKAP_CATATAN_' + (bulan || 'ALL').toUpperCase());
    if (exportSheet) ss.deleteSheet(exportSheet);
    exportSheet = ss.insertSheet('REKAP_CATATAN_' + (bulan || 'ALL').toUpperCase());

    const violations = handleGetRoomViolations({});
    let filteredViolations = Array.isArray(violations) ? violations : [];
    if (bulan) filteredViolations = filteredViolations.filter(v => v.bulan === bulan.toUpperCase());
    if (unit) filteredViolations = filteredViolations.filter(v => v.unit === unit);

    exportSheet.appendRow(['REKAPITULASI CATATAN KETIDAKRAPIAN RUANG RAPAT', '', '', '', '', '']);
    if (bulan) exportSheet.appendRow(['Bulan: ' + bulan]);
    if (unit) exportSheet.appendRow(['Unit: ' + unit]);
    exportSheet.appendRow(['']);

    const headerRow = exportSheet.getLastRow() + 1;
    exportSheet.getRange(headerRow, 1, 1, 6).setValues([['No', 'Bulan', 'Unit', 'Tanggal Penggunaan', 'Nama Ruang', 'Laporan Ketidakrapian']]);
    exportSheet.getRange(headerRow, 1, 1, 6).setFontWeight('bold').setBackground('#4a5568').setFontColor('#ffffff');

    filteredViolations.forEach((v, index) => {
      exportSheet.appendRow([index + 1, v.bulan, v.unit, v.tanggal, v.namaRuang, v.laporan]);
    });

    for (let i = 1; i <= 6; i++) exportSheet.autoResizeColumn(i);
    exportSheet.getRange(headerRow, 1, filteredViolations.length + 1, 6).setBorder(true, true, true, true, true, true);

    return {
      success: true, message: 'Laporan berhasil diekspor',
      sheetName: exportSheet.getName(), recordCount: filteredViolations.length,
      url: ss.getUrl() + '#gid=' + exportSheet.getSheetId()
    };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ============================================================
// VEHICLE VIOLATIONS
// ============================================================
function handleGetVehicleViolations() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const violationsConfig = [
      { name: 'CATATAN KEALPAAN PENGEMBALIAN KUNCI MOBIL', label: 'Kealpaan Pengembalian Kunci' },
      { name: 'CATATAN KEALPAAN MEMBERSIHKAN MOBIL', label: 'Kealpaan Membersihkan Mobil' }
    ];

    let allViolations = [];
    const unitMap = {
      2: 'Sekretariat', 4: 'Bidang Koperasi', 6: 'Bidang UKM',
      8: 'Bidang Usaha Mikro', 10: 'Bidang Kewirausahaan', 12: 'Balai Layanan Usaha Terpadu KUMKM'
    };

    violationsConfig.forEach(config => {
      const sheet = ss.getSheetByName(config.name);
      if (!sheet) return;

      const data = sheet.getDataRange().getValues();
      let monthPositions = [];

      for (let i = 0; i < data.length; i++) {
        const cellValue = data[i][0] ? String(data[i][0]).toUpperCase().trim() : "";
        if (cellValue.startsWith("CATATAN BULAN")) {
          monthPositions.push({ row: i, monthName: cellValue.replace("CATATAN BULAN ", "") });
        }
      }

      for (let i = 0; i < data.length; i++) {
        let found = monthPositions.find(m => m.row >= i);
        let rowMonth = found ? found.monthName : "JANUARI";

        [2, 4, 6, 8, 10, 12].forEach(colIdx => {
          const tanggalCell = data[i][colIdx - 1];
          const laporanCell = data[i][colIdx];
          if (!tanggalCell || !laporanCell) return;

          const tStr = String(tanggalCell).trim();
          const lStr = String(laporanCell).trim();
          const isInvalid = (tStr.includes("Tanggal") || lStr.includes("Laporan") ||
            tStr.includes("Nomor") || tStr.includes("CATATAN") || tStr === "" || lStr === "");

          if (!isInvalid) {
            allViolations.push({
              bulan: rowMonth, unit: unitMap[colIdx],
              tanggal: tanggalCell instanceof Date ? Utilities.formatDate(tanggalCell, "GMT+7", "dd-MM-yyyy") : tStr,
              jenis: config.label, laporan: lStr
            });
          }
        });
      }
    });

    return allViolations;
  } catch (error) { return []; }
}

function handleCreateVehicleViolation(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const { jenis, bulan, unit, tanggal, laporan } = params;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = jenis === 'KUNCI' ? 'CATATAN KEALPAAN PENGEMBALIAN KUNCI MOBIL' : 'CATATAN KEALPAAN MEMBERSIHKAN MOBIL';
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: 'Sheet tidak ditemukan' };

    const unitColumns = {
      'Sekretariat': 2, 'Bidang Koperasi': 4, 'Bidang UKM': 6,
      'Bidang Usaha Mikro': 8, 'Bidang Kewirausahaan': 10, 'Balai Layanan Usaha Terpadu KUMKM': 12
    };
    const colIdx = unitColumns[unit];
    const data = sheet.getDataRange().getValues();

    let labelBulanRow = -1, headerTabelRow = -1;
    for (let i = 0; i < data.length; i++) {
      let cellValue = data[i][0] ? data[i][0].toString().toUpperCase().trim() : "";
      if (cellValue === `CATATAN BULAN ${bulan.toUpperCase()}`) { labelBulanRow = i + 1; break; }
    }
    if (labelBulanRow === -1) return { success: false, message: 'Bulan tidak ditemukan' };

    for (let i = labelBulanRow - 2; i >= 0; i--) {
      let cellValue = data[i][0] ? data[i][0].toString().toUpperCase().trim() : "";
      if (cellValue.includes("NOMOR") || cellValue.includes("TANGGAL")) { headerTabelRow = i + 1; break; }
    }

    let targetRow = -1;
    let startDataRow = headerTabelRow + 2;
    for (let r = startDataRow; r < labelBulanRow; r++) {
      let currentVal = sheet.getRange(r, colIdx).getValue();
      if (currentVal === "" || currentVal === null) { targetRow = r; break; }
    }

    if (targetRow === -1) { sheet.insertRowBefore(labelBulanRow); targetRow = labelBulanRow; labelBulanRow++; }

    let rangeData = sheet.getRange(startDataRow, colIdx, labelBulanRow - startDataRow).getValues();
    let unitEntryCount = 0;
    rangeData.forEach(row => { if (row[0] !== "") unitEntryCount++; });
    let newCount = unitEntryCount + 1;

    sheet.getRange(targetRow, colIdx).setValue(tanggal);
    sheet.getRange(targetRow, colIdx + 1).setValue(laporan);
    if (sheet.getRange(targetRow, 1).getValue() === "") {
      sheet.getRange(targetRow, 1).setValue(targetRow - startDataRow + 1);
    }
    sheet.getRange(labelBulanRow, colIdx).setValue(newCount);
    updateVehicleScores(jenis, bulan, unit);

    return { success: true, message: `Berhasil menambah catatan #${newCount} untuk ${unit}` };

  } catch (error) {
    return { success: false, message: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateVehicleViolation(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const { id, jenis, bulan, unit, tanggal, laporan } = params;
    if (!id || !jenis || !bulan || !unit) return { success: false, message: 'Parameter tidak lengkap' };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = jenis === 'KUNCI' ? 'CATATAN KEALPAAN PENGEMBALIAN KUNCI MOBIL' : 'CATATAN KEALPAAN MEMBERSIHKAN MOBIL';
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: 'Sheet tidak ditemukan' };

    const unitColumns = {
      'Sekretariat': 2, 'Bidang Koperasi': 4, 'Bidang UKM': 6,
      'Bidang Usaha Mikro': 8, 'Bidang Kewirausahaan': 10, 'Balai Layanan Usaha Terpadu KUMKM': 12
    };
    const colIdx = unitColumns[unit];
    const data = sheet.getDataRange().getValues();

    let foundRow = -1;
    for (let i = 0; i < data.length; i++) {
      const cellValue = data[i][0] ? data[i][0].toString().toUpperCase().trim() : "";
      if (cellValue === `CATATAN BULAN ${bulan.toUpperCase()}`) {
        for (let j = i + 3; j < data.length && j < i + 20; j++) {
          if (data[j][colIdx - 1] && data[j][colIdx]) { foundRow = j + 1; break; }
        }
        break;
      }
    }
    if (foundRow === -1) return { success: false, message: 'Data tidak ditemukan' };

    if (tanggal) sheet.getRange(foundRow, colIdx).setValue(tanggal);
    if (laporan) sheet.getRange(foundRow, colIdx + 1).setValue(laporan);
    updateVehicleScores(jenis, bulan, unit);

    return { success: true, message: 'Catatan berhasil diupdate' };

  } catch (error) {
    return { success: false, message: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteVehicleViolation(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const { id, jenis, bulan, unit } = params;
    if (!id || !jenis || !bulan || !unit) return { success: false, message: 'Parameter tidak lengkap' };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = jenis === 'KUNCI' ? 'CATATAN KEALPAAN PENGEMBALIAN KUNCI MOBIL' : 'CATATAN KEALPAAN MEMBERSIHKAN MOBIL';
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { success: false, message: 'Sheet tidak ditemukan' };

    const unitColumns = {
      'Sekretariat': 2, 'Bidang Koperasi': 4, 'Bidang UKM': 6,
      'Bidang Usaha Mikro': 8, 'Bidang Kewirausahaan': 10, 'Balai Layanan Usaha Terpadu KUMKM': 12
    };
    const colIdx = unitColumns[unit];
    const data = sheet.getDataRange().getValues();

    let foundRow = -1, labelBulanRow = -1;
    for (let i = 0; i < data.length; i++) {
      const cellValue = data[i][0] ? data[i][0].toString().toUpperCase().trim() : "";
      if (cellValue === `CATATAN BULAN ${bulan.toUpperCase()}`) {
        labelBulanRow = i + 1;
        for (let j = i + 3; j < data.length && j < i + 20; j++) {
          if (data[j][colIdx - 1] && data[j][colIdx]) { foundRow = j + 1; break; }
        }
        break;
      }
    }
    if (foundRow === -1) return { success: false, message: 'Data tidak ditemukan' };

    sheet.getRange(foundRow, colIdx).clearContent();
    sheet.getRange(foundRow, colIdx + 1).clearContent();
    if (labelBulanRow > 0) {
      const currentCount = parseInt(sheet.getRange(labelBulanRow, colIdx).getValue()) || 0;
      sheet.getRange(labelBulanRow, colIdx).setValue(Math.max(0, currentCount - 1));
    }
    updateVehicleScores(jenis, bulan, unit);

    return { success: true, message: 'Catatan berhasil dihapus' };

  } catch (error) {
    return { success: false, message: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

function updateVehicleScores(jenis, bulan, unit) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const scoreSheet = ss.getSheetByName(SHEET_NAMES.PENILAIAN_MOBIL);
    const sheetName = jenis === 'KUNCI' ? SHEET_NAMES.CATATAN_KUNCI_MOBIL : SHEET_NAMES.CATATAN_KEBERSIHAN_MOBIL;
    const catatanSheet = ss.getSheetByName(sheetName);
    if (!scoreSheet || !catatanSheet) return;

    const scoreData = scoreSheet.getDataRange().getValues();
    const catatanData = catatanSheet.getDataRange().getValues();
    const sanksi = jenis === 'KUNCI' ? (parseFloat(scoreData[1][1]) || 0.1) : (parseFloat(scoreData[1][9]) || 0.1);
    const unitColumns = {
      'Sekretariat': 1, 'Bidang Koperasi': 2, 'Bidang UKM': 3,
      'Bidang Usaha Mikro': 4, 'Bidang Kewirausahaan': 5, 'Balai Layanan Usaha Terpadu KUMKM': 6
    };
    const unitCol = unitColumns[unit];
    if (!unitCol) return;

    let violationCount = 0;
    for (let i = 0; i < catatanData.length; i++) {
      if (catatanData[i][0] && catatanData[i][0].toString().trim() === `CATATAN BULAN ${bulan.toUpperCase()}`) {
        const colIdx = unitCol * 2;
        violationCount = parseInt(catatanData[i][colIdx]) || 0;
        break;
      }
    }

    for (let i = 0; i < scoreData.length; i++) {
      if (scoreData[i][0] === 'URAIAN' && i + 4 < scoreData.length) {
        const skorAkhirRow = scoreData[i + 4];
        if (skorAkhirRow[0] && skorAkhirRow[0].toString().includes(bulan)) {
          const colOffset = jenis === 'KUNCI' ? 0 : 8;
          scoreSheet.getRange(i + 3, unitCol + 1 + colOffset).setValue(violationCount);
          const totalSanksi = violationCount * sanksi;
          scoreSheet.getRange(i + 4, unitCol + 1 + colOffset).setValue(totalSanksi);
          const skorUtuh = parseFloat(scoreData[i + 1][unitCol + colOffset]) || 5;
          scoreSheet.getRange(i + 5, unitCol + 1 + colOffset).setValue(skorUtuh - totalSanksi);
          break;
        }
      }
    }
  } catch (error) {
    Logger.log('ERROR updateVehicleScores: ' + error.toString());
  }
}

function handleGetVehicleScores(params) {
  try {
    const { bulan, jenis } = params;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.PENILAIAN_MOBIL);
    if (!sheet) return { success: false, message: "Sheet tidak ditemukan" };

    const data = sheet.getDataRange().getValues();
    const allScores = [];
    let startCol = (jenis === 'KUNCI') ? 1 : 9;
    let monthLabelCol = (jenis === 'KUNCI') ? 0 : 8;
    const units = ["Sekretariat", "Bidang Koperasi", "Bidang UKM", "Bidang Usaha Mikro", "Bidang Kewirausahaan", "Balai Layanan Usaha Terpadu KUMKM"];

    for (let i = 0; i < data.length; i++) {
      let rowHeader = data[i][monthLabelCol] ? data[i][monthLabelCol].toString().toUpperCase().trim() : "";
      if (rowHeader.includes("SKOR AKHIR BULAN")) {
        let monthName = rowHeader.replace("SKOR AKHIR BULAN", "").trim();
        if (bulan && bulan.toUpperCase() !== monthName) continue;
        for (let colOffset = 0; colOffset < 6; colOffset++) {
          const colIdx = startCol + colOffset;
          allScores.push({
            bulan: monthName, jenis, unit: units[colOffset],
            skorUtuh: parseFloat(data[i - 3][colIdx]) || 0,
            jumlahPelanggaran: parseInt(data[i - 2][colIdx]) || 0,
            jumlahSanksi: parseFloat(data[i - 1][colIdx]) || 0,
            skorAkhir: parseFloat(data[i][colIdx]) || 0
          });
        }
      }
    }

    return { success: true, sanksiPerPelanggaran: parseFloat(data[2][startCol]) || 0.1, scores: allScores };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function handleExportVehicleViolationsReport(params) {
  try {
    const { bulan, unit, jenis } = params;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let exportSheet = ss.getSheetByName('REKAP_PELANGGARAN_MOBIL_' + (bulan || 'ALL').toUpperCase());
    if (exportSheet) ss.deleteSheet(exportSheet);
    exportSheet = ss.insertSheet('REKAP_PELANGGARAN_MOBIL_' + (bulan || 'ALL').toUpperCase());

    const violations = handleGetVehicleViolations({});
    let filteredViolations = Array.isArray(violations) ? violations : [];
    if (bulan) filteredViolations = filteredViolations.filter(v => v.bulan === bulan.toUpperCase());
    if (unit) filteredViolations = filteredViolations.filter(v => v.unit === unit);
    if (jenis) filteredViolations = filteredViolations.filter(v => v.jenis === jenis);

    exportSheet.appendRow(['REKAPITULASI CATATAN PELANGGARAN PENGGUNAAN MOBIL DINAS', '', '', '', '']);
    if (bulan) exportSheet.appendRow(['Bulan: ' + bulan]);
    if (unit) exportSheet.appendRow(['Unit: ' + unit]);
    if (jenis) exportSheet.appendRow(['Jenis: ' + (jenis === 'KUNCI' ? 'Kealpaan Pengembalian Kunci' : 'Kealpaan Membersihkan Mobil')]);
    exportSheet.appendRow(['']);

    const headerRow = exportSheet.getLastRow() + 1;
    exportSheet.getRange(headerRow, 1, 1, 6).setValues([['No', 'Bulan', 'Unit', 'Tanggal', 'Jenis Pelanggaran', 'Laporan']]);
    exportSheet.getRange(headerRow, 1, 1, 6).setFontWeight('bold').setBackground('#4a5568').setFontColor('#ffffff');

    filteredViolations.forEach((v, index) => {
      exportSheet.appendRow([index + 1, v.bulan, v.unit, v.tanggal,
      v.jenis === 'KUNCI' ? 'Kealpaan Pengembalian Kunci' : 'Kealpaan Membersihkan Mobil', v.laporan]);
    });

    for (let i = 1; i <= 6; i++) exportSheet.autoResizeColumn(i);
    exportSheet.getRange(headerRow, 1, filteredViolations.length + 1, 6).setBorder(true, true, true, true, true, true);

    return {
      success: true, message: 'Laporan berhasil diekspor',
      sheetName: exportSheet.getName(), recordCount: filteredViolations.length,
      url: ss.getUrl() + '#gid=' + exportSheet.getSheetId()
    };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ============================================================
// DOCUMENT ASSESSMENTS
// ============================================================
function handleGetDocuments() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.DOKUMEN);
    if (!sheet) return { success: false, message: "Sheet DOKUMEN tidak ditemukan" };

    const data = sheet.getDataRange().getDisplayValues();
    if (data.length <= 1) return [];

    return data.slice(1).map(row => ({
      id: row[0], timestamp: row[1], nama_pengirim: row[2], unit: row[3],
      bulan: row[4], tahun: row[5], jenis_dokumen: row[6], keterangan: row[7],
      file_url: row[8], status: row[9] || 'PENDING', penilai: row[10] || '',
      nilai: row[11] || '', catatan: row[12] || ''
    }));
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function handleCreateDocumentAssessment(params) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const { doc_id, bukti_lengkap, bukti_benar, bukti_tepat_waktu, hari_terlambat,
      sudah_srikandi, surat_sesuai_tnd, jumlah_surat_salah, catatan, penilai_nama } = params;

    if (!doc_id) return { success: false, message: 'Document ID harus diisi' };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const docSheet = ss.getSheetByName(SHEET_NAMES.DOKUMEN);
    if (!docSheet) return { success: false, message: 'Sheet DOKUMEN tidak ditemukan' };

    let skorBuktiDukung = 0;
    if (bukti_lengkap === 'true' || bukti_lengkap === true) skorBuktiDukung += 1;
    if (bukti_benar === 'true' || bukti_benar === true) skorBuktiDukung += 1;
    if (bukti_tepat_waktu === 'true' || bukti_tepat_waktu === true) {
      skorBuktiDukung += 1;
    } else {
      const hari = parseInt(hari_terlambat || 0);
      skorBuktiDukung += Math.max(0, 1 - (0.1 * hari));
    }

    let skorSrikandi = (sudah_srikandi === 'true' || sudah_srikandi === true) ? 1 : 0;
    let skorSuratKeluar = 1;
    if (surat_sesuai_tnd === 'false' || surat_sesuai_tnd === false) {
      const salah = parseInt(jumlah_surat_salah || 0);
      skorSuratKeluar = Math.max(0, 1 - (0.1 * salah));
    }

    const skorTotal = skorBuktiDukung + skorSrikandi + skorSuratKeluar;
    let kategori = 'poor';
    if (skorTotal >= 4.5) kategori = 'excellent';
    else if (skorTotal >= 3.5) kategori = 'good';
    else if (skorTotal >= 2.5) kategori = 'fair';

    const data = docSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === doc_id) {
        docSheet.getRange(i + 1, 10).setValue('ASSESSED');
        docSheet.getRange(i + 1, 11).setValue(penilai_nama || 'Admin');
        const nilaiCell = docSheet.getRange(i + 1, 12);
        nilaiCell.setValue(skorTotal);
        nilaiCell.setNumberFormat('0.0');
        const catatanDetail = `Bukti Dukung: ${skorBuktiDukung.toFixed(1)}/3\nSrikandi: ${skorSrikandi.toFixed(1)}/1\nSurat Keluar: ${skorSuratKeluar.toFixed(1)}/1\n\n${catatan || ''}`.trim();
        docSheet.getRange(i + 1, 13).setValue(catatanDetail);
        return {
          success: true, message: 'Penilaian berhasil disimpan',
          nilai: skorTotal.toFixed(1), kategori,
          breakdown: { bukti_dukung: skorBuktiDukung.toFixed(1), srikandi: skorSrikandi.toFixed(1), surat_keluar: skorSuratKeluar.toFixed(1) }
        };
      }
    }

    return { success: false, message: 'Dokumen tidak ditemukan' };

  } catch (error) {
    return { success: false, message: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateDocumentAssessment(params) {
  return handleCreateDocumentAssessment(params);
}

function handleGetDocumentAssessments(params) { return handleGetDocuments(); }

function handleUpdateDocumentStatus(params) {
  try {
    const { id, status } = params;
    if (!id || !status) return { success: false, message: 'ID dan status harus diisi' };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const docSheet = ss.getSheetByName(SHEET_NAMES.DOKUMEN);
    const data = docSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        docSheet.getRange(i + 1, 10).setValue(status.toUpperCase());
        return { success: true, message: 'Status berhasil diupdate' };
      }
    }

    return { success: false, message: 'Dokumen tidak ditemukan' };

  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function handleGetAssessmentStats() {
  try {
    const documents = handleGetDocuments();
    if (!Array.isArray(documents) || documents.length === 0) {
      return { total: 0, avg_score: 0, assessed: 0, pending: 0, this_month: 0 };
    }

    const assessed = documents.filter(d => d.nilai && d.nilai !== '');
    const total = assessed.length;

    if (total === 0) {
      return { total: 0, avg_score: 0, assessed: 0, pending: documents.filter(d => d.status === 'PENDING').length, this_month: 0 };
    }

    const avgScore = assessed.reduce((sum, d) => sum + (parseFloat(d.nilai) || 0), 0) / total;
    const now = new Date();
    const thisMonth = assessed.filter(d => {
      try {
        const docDate = new Date(d.timestamp);
        return docDate.getMonth() === now.getMonth() && docDate.getFullYear() === now.getFullYear();
      } catch { return false; }
    }).length;

    return {
      total, avg_score: avgScore.toFixed(2), assessed: total,
      pending: documents.filter(d => d.status === 'PENDING').length, this_month: thisMonth
    };

  } catch (error) {
    return { total: 0, avg_score: 0, assessed: 0, pending: 0, this_month: 0 };
  }
}

function forceAuth() {
  UrlFetchApp.fetch('https://www.google.com');
}