// ============================================
// KONFIGURASI SPREADSHEET
// ============================================
const SPREADSHEET_PELAYANAN_ID = "1dP1Nk5SiP4OpGyzpkKFx9edfvLrbiid5pcjlNh7x_FQ";
const SPREADSHEET_KEUANGAN_ID = "1zIfSE4bCOsJZ-WICLNTRuDFdC_-34WbBq2I4QfKUdpI";
const DRIVE_FOLDER_ID = "1695U4uQNvRwfNPaJCcs5yqiVeqWB4yyk";

// ============================================================
// ★ KONFIGURASI NOTIFIKASI WHATSAPP (FONNTE)
// ============================================================
const WA_FONNTE_TOKEN = 'm9NLcibL4zsCPw1nsbnY';
const WA_SEND_DELAY_MS = 1200;
const WA_ENABLED = true;

// Admin Sub Keuangan → menangani: Pengajuan Dana & Penyampaian SPJ
const WA_ADMIN_KEUANGAN = [
  '6285883889302',   // Admin Keuangan 1 — ganti dengan nomor sebenarnya
  // '628xxxxxxxxxx', // Admin Keuangan 2 — tambahkan jika ada nomor kedua
];

// Admin Sub Umum → menangani: Kendaraan, Ruang Rapat, Voucher BBM, Dokumen Arsip
const WA_ADMIN_UMUM = [
  '6285883889302',   // Admin Umum 1 — ganti dengan nomor sebenarnya
  // '628xxxxxxxxxx', // Admin Umum 2 — tambahkan jika ada nomor kedua
];

// ── Helper: format waktu WITA ──────────────────────────────
function waFormatWaktu(timestamp) {
  try {
    const d = timestamp ? new Date(timestamp) : new Date();
    return Utilities.formatDate(d, 'Asia/Makassar', "EEEE, dd MMMM yyyy 'pukul' HH:mm 'WITA'");
  } catch (e) {
    return new Date().toLocaleString('id-ID');
  }
}

// ── Helper: format angka sebagai Rupiah ───────────────────
function waFormatRupiah(angka) {
  try {
    const num = parseFloat(String(angka).replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return angka || '0';
    return num.toLocaleString('id-ID');
  } catch (e) {
    return String(angka || '0');
  }
}

// ── Core: kirim 1 pesan ke 1 nomor via Fonnte ─────────────
function _kirimFonnte(nomor, pesan) {
  try {
    const response = UrlFetchApp.fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': WA_FONNTE_TOKEN, 'Content-Type': 'application/json' },
      payload: JSON.stringify({ target: nomor, message: pesan, countryCode: '62' }),
      muteHttpExceptions: true,
    });
    const code = response.getResponseCode();
    const body = response.getContentText();
    Logger.log('[Fonnte] ' + nomor + ' → HTTP ' + code + ': ' + body);
    if (code === 200) {
      let json;
      try { json = JSON.parse(body); } catch (e) { json = {}; }
      if (json.status === true || json.status === 'true') return { success: true };
      return { success: false, error: json.reason || json.message || body };
    }
    return { success: false, error: 'HTTP ' + code + ': ' + body };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Core: kirim pesan ke array nomor ──────────────────────
function sendWANotifikasi(nomors, pesan) {
  if (!WA_ENABLED) { Logger.log('[WA] Dinonaktifkan'); return; }
  try {
    for (let i = 0; i < nomors.length; i++) {
      if (i > 0) Utilities.sleep(WA_SEND_DELAY_MS);
      const result = _kirimFonnte(nomors[i], pesan);
      Logger.log('[WA] → ' + nomors[i] + ': ' + (result.success ? '✅ Terkirim' : '❌ Gagal - ' + result.error));
    }
  } catch (err) {
    Logger.log('[WA] Error: ' + err.message);
  }
}

// ============================================
// HELPER FUNCTION: Format Time
// ============================================
function formatTime(timeValue) {
  try {
    if (typeof timeValue === 'string' && timeValue.match(/^\d{1,2}:\d{2}/)) {
      return timeValue;
    }
    if (timeValue instanceof Date) {
      const hours = String(timeValue.getHours()).padStart(2, '0');
      const minutes = String(timeValue.getMinutes()).padStart(2, '0');
      return hours + ':' + minutes;
    }
    if (typeof timeValue === 'number') {
      const totalMinutes = Math.round(timeValue * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
    }
    return String(timeValue);
  } catch (e) {
    Logger.log("Error formatting time: " + e.message);
    return String(timeValue);
  }
}

// ============================================
// ★ HELPER: Hash password (SHA-256)
// ============================================
function hashPassword(plain) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    plain,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function (b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

// ============================================
// ★ HELPER: Generate ID unik untuk user
// ============================================
function generateUserId() {
  return 'USR-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// ============================================
// ★ HELPER: Ambil (atau buat) sheet "Users"
//   Struktur kolom: ID | Email | Password | Name | Role | Created At
// ============================================
function getUsersSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_PELAYANAN_ID);
  var sheet = ss.getSheetByName("Users");
  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.appendRow(["ID", "Email", "Password", "Name", "Role", "Created At"]);
    sheet.getRange(1, 1, 1, 6)
      .setFontWeight("bold")
      .setBackground("#0f172a")
      .setFontColor("#ffffff");
    sheet.setColumnWidth(1, 200);  // ID
    sheet.setColumnWidth(2, 240);  // Email
    sheet.setColumnWidth(3, 80);   // Password (hash)
    sheet.setColumnWidth(4, 200);  // Name
    sheet.setColumnWidth(5, 100);  // Role
    sheet.setColumnWidth(6, 160);  // Created At
    Logger.log("Sheet 'Users' dibuat otomatis");
  }
  return sheet;
}

// ============================================
// ★ HELPER: Baca semua baris Users → array of objects
// ============================================
function readAllUsers() {
  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var users = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    var createdAt = row[5];
    if (createdAt instanceof Date) {
      createdAt = Utilities.formatDate(createdAt, "GMT+7", "yyyy-MM-dd'T'HH:mm:ss");
    } else {
      createdAt = String(createdAt || '');
    }
    users.push({
      _row: i + 1,
      id: String(row[0] || ''),
      email: String(row[1] || '').toLowerCase(),
      password: String(row[2] || ''),
      name: String(row[3] || ''),
      role: String(row[4] || 'viewer'),
      createdAt: createdAt
    });
  }
  return users;
}

// ============================================
// HELPER: createResponse + dukungan JSONP callback
// ============================================
function createResponse(data, callback) {
  var json = JSON.stringify(data);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// ★ HELPER BARU: Dapatkan atau buat folder berdasarkan nama
//   dalam parent folder tertentu
// ============================================================
function getOrCreateFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next(); // folder sudah ada, langsung pakai
  }
  // Belum ada → buat baru
  Logger.log("📁 Membuat folder baru: " + folderName);
  return parentFolder.createFolder(folderName);
}

// ============================================================
// ★ HELPER BARU: Resolve folder berstruktur Bulan → Unit
//   Parameter:
//     bulan  → string bulan (contoh: "Januari", "02", "2025-02", dll.)
//     unit   → string nama unit (contoh: "Keuangan", "IT", dst.)
//   Return: DriveApp.Folder → folder unit yang sudah siap diisi
// ============================================================
function getKeuanganFolder(bulan, unit) {
  // ── 1. Root folder utama ───────────────────────────────
  var rootFolder;
  try {
    rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  } catch (e) {
    Logger.log("⚠️ DRIVE_FOLDER_ID tidak valid, pakai root Drive");
    rootFolder = DriveApp.getRootFolder();
  }

  // ── 1b. Folder induk "Laporan Pengajuan Dana" ──────────
  rootFolder = getOrCreateFolder(rootFolder, "Laporan Pengajuan Dana");

  // ── 2. Normalisasi nama bulan → "01 - Januari" dst. ───
  var BULAN_MAP = {
    "1": "01 - Januari", "01": "01 - Januari", "januari": "01 - Januari",
    "2": "02 - Februari", "02": "02 - Februari", "februari": "02 - Februari",
    "3": "03 - Maret", "03": "03 - Maret", "maret": "03 - Maret",
    "4": "04 - April", "04": "04 - April", "april": "04 - April",
    "5": "05 - Mei", "05": "05 - Mei", "mei": "05 - Mei",
    "6": "06 - Juni", "06": "06 - Juni", "juni": "06 - Juni",
    "7": "07 - Juli", "07": "07 - Juli", "juli": "07 - Juli",
    "8": "08 - Agustus", "08": "08 - Agustus", "agustus": "08 - Agustus",
    "9": "09 - September", "09": "09 - September", "september": "09 - September",
    "10": "10 - Oktober", "oktober": "10 - Oktober",
    "11": "11 - November", "november": "11 - November",
    "12": "12 - Desember", "desember": "12 - Desember"
  };

  // Coba ekstrak angka bulan jika format "2025-02" atau "Februari 2025"
  var bulanKey = String(bulan).trim().toLowerCase();

  // Format "yyyy-mm" → ambil bagian mm
  var matchYM = bulanKey.match(/^\d{4}-(\d{1,2})$/);
  if (matchYM) bulanKey = matchYM[1];

  // Format "nama_bulan yyyy" → ambil bagian nama
  var matchNY = bulanKey.match(/^([a-z]+)\s+\d{4}$/);
  if (matchNY) bulanKey = matchNY[1];

  var folderBulanName = BULAN_MAP[bulanKey] || ("00 - " + String(bulan).trim());

  // ── 3. Dapatkan/buat folder bulan ─────────────────────
  var folderBulan = getOrCreateFolder(rootFolder, folderBulanName);

  // ── 4. Dapatkan/buat folder unit di dalam bulan ────────
  var unitName = String(unit || "Umum").trim();
  var folderUnit = getOrCreateFolder(folderBulan, unitName);

  Logger.log("📂 Target folder: " + folderBulanName + " / " + unitName);
  return folderUnit;
}

// ============================================
// MAIN HANDLER - doPost
// ============================================
function doPost(e) {
  try {
    var data;

    // Handle file upload actions (parameter-based)
    if (e.parameter && e.parameter.action === "uploadDokumen") {
      return handleFileUpload(e.parameter);
    }
    if (e.parameter && e.parameter.action === "uploadPengajuanDana") {
      return handlePengajuanDanaUpload(e.parameter);
    }
    if (e.parameter && e.parameter.action === "uploadSPJ") {
      return handleSPJUpload(e.parameter);
    }

    // Handle JSON POST
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);

        if (data.action === "uploadDokumen") return handleFileUpload(data);
        if (data.action === "uploadPengajuanDana") return handlePengajuanDanaUpload(data);
        if (data.action === "uploadSPJ") return handleSPJUpload(data);

        // ★ USER MANAGEMENT
        if (data.action === "createUser") return createUser(data);
        if (data.action === "updateUser") return updateUser(data);
        if (data.action === "deleteUser") return deleteUser(data);
        if (data.action === "loginUser") return loginUser(data);

        if (data.type) return handleFormSubmission(data);

      } catch (jsonError) {
        Logger.log("JSON Parse Error: " + jsonError.message);
      }
    }

    // Handle form submission (x-www-form-urlencoded)
    if (e.parameter && e.parameter.type) {
      return handleFormSubmission(e.parameter);
    }

    throw new Error("Format data tidak dikenali");

  } catch (err) {
    Logger.log("ERROR doPost: " + err.message);
    return createResponse({ status: "error", message: err.message });
  }
}

// ============================================
// MAIN HANDLER - doGet
// ============================================
function doGet(e) {
  try {
    if (e.parameter && e.parameter.jsonBody) {
      try {
        var payload = JSON.parse(decodeURIComponent(e.parameter.jsonBody));
        var callback = e.parameter.callback || null;
        var result;

        if (payload.action === "createUser") result = createUser(payload);
        else if (payload.action === "updateUser") result = updateUser(payload);
        else if (payload.action === "deleteUser") result = deleteUser(payload);
        else if (payload.action === "loginUser") result = loginUser(payload);
        else result = createResponse({ status: "error", message: "action tidak dikenal di jsonBody" });

        if (callback) {
          var json = result.getContent();
          return ContentService
            .createTextOutput(callback + '(' + json + ')')
            .setMimeType(ContentService.MimeType.JAVASCRIPT);
        }
        return result;

      } catch (parseErr) {
        Logger.log("ERROR parsing jsonBody: " + parseErr.message);
        return createResponse(
          { status: "error", message: "jsonBody tidak valid: " + parseErr.message },
          e.parameter.callback || null
        );
      }
    }

    if (e.parameter && e.parameter.action === "getUsers") return getUsers(e.parameter);
    if (e.parameter && e.parameter.action === "getUser") return getUser(e.parameter);

    if (e.parameter && e.parameter.action === "getSchedule") {
      return getScheduleData(e.parameter);
    }
    if (e.parameter && e.parameter.action === "getVouchers") {
      return getVoucherData(e.parameter);
    }

    return createResponse({
      status: "ok",
      message: "API Sistem Pelayanan Internal aktif",
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    Logger.log("ERROR doGet: " + err.message);
    return createResponse({ status: "error", message: err.message });
  }
}

// ============================================================
//  USER MANAGEMENT — CRUD FUNCTIONS
// ============================================================

function getUsers(params) {
  try {
    var callback = params.callback || null;
    var all = readAllUsers();
    var users = all.map(function (u) {
      return { id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt };
    });
    return createResponse({ status: "success", users: users, count: users.length }, callback);
  } catch (err) {
    Logger.log("ERROR getUsers: " + err.message);
    return createResponse({ status: "error", message: err.message }, params.callback || null);
  }
}

function getUser(params) {
  try {
    var callback = params.callback || null;
    var id = params.id;
    if (!id) throw new Error("Parameter 'id' diperlukan");

    var all = readAllUsers();
    var user = null;
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) { user = all[i]; break; }
    }
    if (!user) throw new Error("User tidak ditemukan: " + id);

    return createResponse({
      status: "success",
      user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt }
    }, callback);
  } catch (err) {
    Logger.log("ERROR getUser: " + err.message);
    return createResponse({ status: "error", message: err.message }, params.callback || null);
  }
}

function createUser(data) {
  try {
    var required = ["email", "password", "name", "role"];
    for (var r = 0; r < required.length; r++) {
      if (!data[required[r]] || String(data[required[r]]).trim() === '') {
        throw new Error("Field wajib diisi: " + required[r]);
      }
    }

    var email = String(data.email).trim().toLowerCase();
    var name = String(data.name).trim();
    var role = String(data.role).trim().toLowerCase();
    var password = String(data.password);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Format email tidak valid");
    }

    var validRoles = ["superadmin", "admin", "viewer"];
    if (validRoles.indexOf(role) === -1) {
      throw new Error("Role tidak valid. Gunakan: superadmin, admin, atau viewer");
    }

    if (password.length < 8) {
      throw new Error("Password minimal 8 karakter");
    }

    var all = readAllUsers();
    for (var d = 0; d < all.length; d++) {
      if (all[d].email === email) throw new Error("Email sudah terdaftar: " + email);
    }

    var sheet = getUsersSheet();
    var id = generateUserId();
    var hashedPw = hashPassword(password);
    var createdAt = new Date();

    sheet.appendRow([id, email, hashedPw, name, role, createdAt]);

    Logger.log("✅ User dibuat: " + id + " | " + email + " | " + role);

    return createResponse({
      status: "success",
      message: "User berhasil dibuat",
      user: { id: id, email: email, name: name, role: role, createdAt: createdAt.toISOString() }
    });

  } catch (err) {
    Logger.log("ERROR createUser: " + err.message);
    return createResponse({ status: "error", message: err.message });
  }
}

function updateUser(data) {
  try {
    if (!data.id) throw new Error("Field 'id' diperlukan");

    var sheet = getUsersSheet();
    var all = readAllUsers();
    var user = null;
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === String(data.id)) { user = all[i]; break; }
    }
    if (!user) throw new Error("User tidak ditemukan: " + data.id);

    var newEmail = data.email ? String(data.email).trim().toLowerCase() : user.email;
    var newName = data.name ? String(data.name).trim() : user.name;
    var newRole = data.role ? String(data.role).trim().toLowerCase() : user.role;
    var newHash = user.password;

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      throw new Error("Format email tidak valid");
    }

    if (data.email && newEmail !== user.email) {
      for (var d = 0; d < all.length; d++) {
        if (all[d].email === newEmail && all[d].id !== user.id) {
          throw new Error("Email sudah digunakan akun lain: " + newEmail);
        }
      }
    }

    if (data.role) {
      var validRoles = ["superadmin", "admin", "viewer"];
      if (validRoles.indexOf(newRole) === -1) {
        throw new Error("Role tidak valid. Gunakan: superadmin, admin, atau viewer");
      }
    }

    if (data.password && String(data.password).trim() !== '') {
      if (String(data.password).length < 8) throw new Error("Password minimal 8 karakter");
      newHash = hashPassword(String(data.password));
    }

    var rowNum = user._row;
    sheet.getRange(rowNum, 2).setValue(newEmail);
    sheet.getRange(rowNum, 3).setValue(newHash);
    sheet.getRange(rowNum, 4).setValue(newName);
    sheet.getRange(rowNum, 5).setValue(newRole);

    Logger.log("✅ User diupdate: " + user.id + " | " + newEmail + " | " + newRole);

    return createResponse({
      status: "success",
      message: "User berhasil diperbarui",
      user: { id: user.id, email: newEmail, name: newName, role: newRole, createdAt: user.createdAt }
    });

  } catch (err) {
    Logger.log("ERROR updateUser: " + err.message);
    return createResponse({ status: "error", message: err.message });
  }
}

function deleteUser(data) {
  try {
    if (!data.id) throw new Error("Field 'id' diperlukan");

    var sheet = getUsersSheet();
    var all = readAllUsers();
    var user = null;
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === String(data.id)) { user = all[i]; break; }
    }
    if (!user) throw new Error("User tidak ditemukan: " + data.id);

    var superadminCount = 0;
    for (var s = 0; s < all.length; s++) {
      if (all[s].role === 'superadmin') superadminCount++;
    }
    if (user.role === 'superadmin' && superadminCount <= 1) {
      throw new Error("Tidak dapat menghapus superadmin terakhir");
    }

    sheet.deleteRow(user._row);
    Logger.log("🗑️ User dihapus: " + user.id + " | " + user.email);

    return createResponse({
      status: "success",
      message: "User berhasil dihapus",
      deleted: { id: user.id, email: user.email, name: user.name }
    });

  } catch (err) {
    Logger.log("ERROR deleteUser: " + err.message);
    return createResponse({ status: "error", message: err.message });
  }
}

function loginUser(data) {
  try {
    if (!data.email || !data.password) {
      throw new Error("Email dan password wajib diisi");
    }

    var email = String(data.email).trim().toLowerCase();
    var hashedPw = hashPassword(String(data.password));

    var all = readAllUsers();
    var user = null;
    for (var i = 0; i < all.length; i++) {
      if (all[i].email === email && all[i].password === hashedPw) {
        user = all[i]; break;
      }
    }

    if (!user) throw new Error("Email atau password salah");

    Logger.log("🔑 Login berhasil: " + user.email + " | " + user.role);

    return createResponse({
      status: "success",
      message: "Login berhasil",
      user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt }
    });

  } catch (err) {
    Logger.log("ERROR loginUser: " + err.message);
    return createResponse({ status: "error", message: err.message });
  }
}

// ============================================
// GET SCHEDULE DATA
// ============================================
function getScheduleData(params) {
  try {
    const type = params.type;
    const date = params.date;

    if (!type) throw new Error("Parameter 'type' diperlukan");

    const ss = SpreadsheetApp.openById(SPREADSHEET_PELAYANAN_ID);
    const sheet = ss.getSheetByName(type);

    if (!sheet) throw new Error("Sheet tidak ditemukan: " + type);

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const statusCol = headers.indexOf("Status");
    const tanggalCol = headers.indexOf("Tanggal");
    const jamMulaiCol = headers.indexOf("Jam Mulai");
    const jamSelesaiCol = headers.indexOf("Jam Selesai");

    if (statusCol === -1 || tanggalCol === -1) {
      throw new Error("Kolom Status atau Tanggal tidak ditemukan");
    }

    let schedules = [];
    let summary = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = String(row[statusCol] || "").trim();
      const tanggal = row[tanggalCol];

      if (!tanggal) continue;

      let dateStr = "";
      const isDateLike = tanggal && typeof tanggal === 'object' && typeof tanggal.getTime === 'function';

      if (isDateLike) {
        const timestamp = tanggal.getTime();
        if (!isNaN(timestamp)) {
          const dateObj = new Date(timestamp);
          try {
            dateStr = Utilities.formatDate(dateObj, "GMT+7", "yyyy-MM-dd");
          } catch (e) {
            dateStr = dateObj.toISOString().substring(0, 10);
          }
        }
      } else if (typeof tanggal === "string") {
        if (tanggal.match(/^\d{4}-\d{2}-\d{2}/)) {
          dateStr = tanggal.substring(0, 10);
        } else {
          const parsed = new Date(tanggal);
          if (!isNaN(parsed.getTime())) {
            dateStr = Utilities.formatDate(parsed, "GMT+7", "yyyy-MM-dd");
          }
        }
      } else if (typeof tanggal === "number") {
        const excelDate = new Date((tanggal - 25569) * 86400 * 1000);
        dateStr = Utilities.formatDate(excelDate, "GMT+7", "yyyy-MM-dd");
      }

      if (!dateStr || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) continue;

      if (!summary[dateStr]) summary[dateStr] = 0;
      summary[dateStr]++;

      if (date && dateStr !== date) continue;

      const jamMulai = formatTime(row[jamMulaiCol]);
      const jamSelesai = formatTime(row[jamSelesaiCol]);

      let schedule = {};
      if (type === "KENDARAAN") {
        schedule = {
          "ID": row[0], "Nama": row[2], "Unit": row[3],
          "Tanggal": dateStr, "Jam Mulai": jamMulai, "Jam Selesai": jamSelesai,
          "Keperluan": row[7], "Alamat": row[8], "Status": status,
          "Nomor Kendaraan": row[11] || ""
        };
      } else if (type === "RUANG_RAPAT") {
        schedule = {
          "ID": row[0], "Nama": row[2], "Unit": row[3],
          "Tanggal": dateStr, "Jam Mulai": jamMulai, "Jam Selesai": jamSelesai,
          "Kegiatan": row[7], "Peserta": row[8], "Status": status,
          "Nama Ruang Rapat": row[11] || ""
        };
      }

      schedules.push(schedule);
    }

    if (date && schedules.length > 0) {
      schedules.sort((a, b) => String(a["Jam Mulai"] || "00:00").localeCompare(String(b["Jam Mulai"] || "00:00")));
    }

    return createResponse({
      status: "success", type: type, date: date || null,
      schedules: schedules, summary: summary, count: schedules.length
    });

  } catch (err) {
    Logger.log("❌ ERROR getScheduleData: " + err.message);
    return createResponse({ status: "error", message: err.message });
  }
}

// ============================================
// GET VOUCHER DATA
// ============================================
function getVoucherData(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_PELAYANAN_ID);
    const sheet = ss.getSheetByName("VOUCHER_BBM");

    if (!sheet) throw new Error("Sheet VOUCHER_BBM tidak ditemukan");

    const data = sheet.getDataRange().getValues();
    let vouchers = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      vouchers.push({
        "ID": row[0], "Timestamp": row[1], "Nama": row[2],
        "Unit": row[3], "Nomor Polisi": row[4], "Status": row[5]
      });
    }

    return createResponse({ status: "success", vouchers: vouchers, count: vouchers.length });

  } catch (err) {
    return createResponse({ status: "error", message: err.message });
  }
}

// ============================================
// HANDLE FORM SUBMISSION (Kendaraan, Ruangan, Voucher, SPJ)
// ============================================
function handleFormSubmission(data) {
  try {
    const isSpj = data.type === "SPJ";
    const ss = SpreadsheetApp.openById(
      isSpj ? SPREADSHEET_KEUANGAN_ID : SPREADSHEET_PELAYANAN_ID
    );

    let sheet = isSpj ? ss.getSheetByName("PENYAMPAIAN_SPJ") : ss.getSheetByName(data.type);

    if (!sheet && isSpj) {
      sheet = ss.insertSheet("PENYAMPAIAN_SPJ");
      sheet.appendRow([
        "ID", "Timestamp", "Nama", "Unit",
        "Sub Kegiatan", "Bulan SPJ", "Nominal SPJ Masuk", "Status"
      ]);
    }

    if (!sheet) {
      throw new Error("Sheet tidak ditemukan: " + data.type);
    }

    const id = "REQ-" + Date.now();
    const timestamp = new Date();

    if (data.type === "KENDARAAN") {
      sheet.appendRow([
        id, timestamp, data.nama, data.unit, data.tanggal,
        data.waktu_mulai, data.waktu_selesai, data.keperluan,
        data.alamat, "KENDARAAN", "PENDING"
      ]);
      // ★ Notifikasi WA ke Admin Sub Umum
      try {
        const pesan =
          `🚗 *PENGAJUAN KENDARAAN DINAS*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📋 *Pemohon:* ${data.nama || '-'}\n` +
          `🏢 *Unit/Divisi:* ${data.unit || '-'}\n` +
          `📅 *Tanggal Pakai:* ${data.tanggal || '-'}\n` +
          `🕐 *Waktu:* ${data.waktu_mulai || '-'} – ${data.waktu_selesai || '-'}\n` +
          `📍 *Keperluan:* ${data.keperluan || '-'}\n` +
          `📝 *Alamat:* ${data.alamat || '-'}\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `⏰ _Diajukan: ${waFormatWaktu(timestamp)}_\n\n` +
          `Silakan buka dashboard admin untuk memproses pengajuan ini.`;
        sendWANotifikasi(WA_ADMIN_UMUM, pesan);
      } catch (waErr) { Logger.log("[WA] Error kendaraan: " + waErr.message); }
    }
    else if (data.type === "RUANG_RAPAT") {
      sheet.appendRow([
        id, timestamp, data.nama, data.unit, data.tanggal,
        data.waktu_mulai, data.waktu_selesai, data.nama_kegiatan,
        data.jumlah_peserta, "RUANG_RAPAT", "PENDING"
      ]);
      // ★ Notifikasi WA ke Admin Sub Umum
      try {
        const pesan =
          `🏛️ *PERMINTAAN RUANG RAPAT*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📋 *Pemohon:* ${data.nama || '-'}\n` +
          `🏢 *Unit/Divisi:* ${data.unit || '-'}\n` +
          `📅 *Tanggal:* ${data.tanggal || '-'}\n` +
          `🕐 *Waktu:* ${data.waktu_mulai || '-'} – ${data.waktu_selesai || '-'}\n` +
          `📝 *Kegiatan:* ${data.nama_kegiatan || '-'}\n` +
          `👥 *Peserta:* ${data.jumlah_peserta || '-'} orang\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `⏰ _Diajukan: ${waFormatWaktu(timestamp)}_\n\n` +
          `Silakan buka dashboard admin untuk memproses pengajuan ini.`;
        sendWANotifikasi(WA_ADMIN_UMUM, pesan);
      } catch (waErr) { Logger.log("[WA] Error ruang_rapat: " + waErr.message); }
    }
    else if (data.type === "VOUCHER_BBM") {
      sheet.appendRow([
        id, timestamp, data.nama, data.unit,
        data.nomor_polisi.toUpperCase(), "PENDING"
      ]);
      // ★ Notifikasi WA ke Admin Sub Umum
      try {
        const pesan =
          `⛽ *PERMINTAAN VOUCHER BBM*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📋 *Pemohon:* ${data.nama || '-'}\n` +
          `🏢 *Unit/Divisi:* ${data.unit || '-'}\n` +
          `🚗 *No. Kendaraan:* ${data.nomor_polisi ? data.nomor_polisi.toUpperCase() : '-'}\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `⏰ _Diajukan: ${waFormatWaktu(timestamp)}_\n\n` +
          `Silakan buka dashboard admin untuk memproses pengajuan ini.`;
        sendWANotifikasi(WA_ADMIN_UMUM, pesan);
      } catch (waErr) { Logger.log("[WA] Error voucher_bbm: " + waErr.message); }
    }
    else if (data.type === "SPJ") {
      const id_spj = "SPJ-" + Date.now();
      sheet.appendRow([
        id_spj, timestamp, data.nama, data.unit,
        data.sub_kegiatan, data.bulan,
        Number(data.nominal_spj) || 0, "PENDING"
      ]);
      // ★ Notifikasi WA ke Admin Sub Keuangan
      try {
        const pesan =
          `📄 *PENYAMPAIAN SPJ BARU*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📋 *Pemohon:* ${data.nama || '-'}\n` +
          `🏢 *Unit/Divisi:* ${data.unit || '-'}\n` +
          `🗂️ *Sub Kegiatan:* ${data.sub_kegiatan || '-'}\n` +
          `📅 *Bulan SPJ:* ${data.bulan || '-'}\n` +
          `💵 *Nominal SPJ:* Rp ${waFormatRupiah(data.nominal_spj)}\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `⏰ _Diajukan: ${waFormatWaktu(timestamp)}_\n\n` +
          `Silakan buka dashboard admin untuk memproses pengajuan ini.`;
        sendWANotifikasi(WA_ADMIN_KEUANGAN, pesan);
      } catch (waErr) { Logger.log("[WA] Error spj: " + waErr.message); }
      return createResponse({
        status: "success", id: id_spj, type: "SPJ",
        message: "SPJ berhasil disimpan"
      });
    }
    else {
      throw new Error("Tipe form tidak dikenali: " + data.type);
    }

    return createResponse({
      status: "success", id: id, type: data.type,
      message: "Data berhasil disimpan"
    });

  } catch (err) {
    Logger.log("ERROR handleFormSubmission: " + err.message);
    return createResponse({ status: "error", message: err.message });
  }
}

// ============================================
// HANDLE DOKUMEN ARSIP UPLOAD
// Mendukung dua mode:
//   1. upload_mode = 'file'  → upload file base64 ke Drive
//   2. upload_mode = 'drive' → simpan array link Drive yang dikirim user
// ============================================
function handleFileUpload(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_PELAYANAN_ID);
    let sheet = ss.getSheetByName("DOKUMEN_ARSIP");

    // Buat sheet jika belum ada
    if (!sheet) {
      sheet = ss.insertSheet("DOKUMEN_ARSIP");
      sheet.appendRow([
        "ID", "Timestamp", "Nama", "Unit", "Bulan", "Tahun",
        "Jenis Dokumen", "Keterangan", "Link File / Drive", "Mode Upload",
        "Info File ke-", "Status"
      ]);
      sheet.getRange(1, 1, 1, 12).setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
      Logger.log("📋 Sheet DOKUMEN_ARSIP dibuat otomatis");
    }

    const id = "DOC-" + Date.now();
    const timestamp = new Date();
    const mode = String(data.upload_mode || 'file').trim().toLowerCase();

    // ── MODE: DRIVE LINK ────────────────────────────────────────────
    if (mode === 'drive') {
      let driveLinks = [];
      try {
        driveLinks = JSON.parse(data.drive_links || '[]');
        if (!Array.isArray(driveLinks)) driveLinks = [String(data.drive_links)];
      } catch (e) {
        driveLinks = [String(data.drive_links || '')];
      }
      driveLinks = driveLinks.filter(function (l) { return l && l.trim() !== ''; });

      if (driveLinks.length === 0) {
        throw new Error("Tidak ada link Drive yang valid");
      }

      // Gabungkan semua link ke satu cell (dipisah newline)
      const linksCombined = driveLinks.join("\n");
      const linkInfo = driveLinks.length + " link Drive";

      sheet.appendRow([
        id, timestamp, data.nama, data.unit, data.bulan, data.tahun,
        data.jenis_dokumen, data.keterangan || "", linksCombined, "drive",
        linkInfo, "PENDING"
      ]);

      Logger.log("✅ Dokumen Arsip (Drive mode) tersimpan: " + id + " | " + driveLinks.length + " links");

      // Notifikasi WA
      try {
        const linksText = driveLinks.map(function (l, i) { return (i + 1) + ". " + l; }).join("\n");
        const pesan =
          `📁 *UPLOAD DOKUMEN ARSIP (LINK DRIVE)*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📋 *Pemohon:* ${data.nama || '-'}\n` +
          `🏢 *Unit/Divisi:* ${data.unit || '-'}\n` +
          `📂 *Jenis Dokumen:* ${data.jenis_dokumen || '-'}\n` +
          `📅 *Bulan/Tahun:* ${data.bulan || '-'} / ${data.tahun || '-'}\n` +
          `🔗 *Link Drive (${driveLinks.length}):*\n${linksText}\n` +
          `📝 *Keterangan:* ${data.keterangan || '-'}\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `⏰ _Diajukan: ${waFormatWaktu(timestamp)}_\n\n` +
          `Silakan buka dashboard admin untuk memproses pengajuan ini.`;
        sendWANotifikasi(WA_ADMIN_UMUM, pesan);
      } catch (waErr) { Logger.log("[WA] Error dokumen_drive: " + waErr.message); }

      return createResponse({
        status: "success", id: id,
        mode: "drive", driveLinks: driveLinks,
        message: "Link Google Drive berhasil disimpan (" + driveLinks.length + " link)"
      });
    }

    // ── MODE: FILE UPLOAD ────────────────────────────────────────────
    if (!data.fileData || !data.mimeType || !data.fileName) {
      throw new Error("Data file tidak lengkap (fileData, mimeType, fileName diperlukan)");
    }

    const fileBlob = Utilities.newBlob(
      Utilities.base64Decode(data.fileData),
      data.mimeType,
      data.fileName
    );

    // Resolve folder: Root → "Dokumen Arsip" → Bulan → Unit
    let rootFolder;
    try {
      rootFolder = DRIVE_FOLDER_ID ? DriveApp.getFolderById(DRIVE_FOLDER_ID) : DriveApp.getRootFolder();
    } catch (e) {
      rootFolder = DriveApp.getRootFolder();
    }

    const arsipFolder = getOrCreateFolder(rootFolder, "Dokumen Arsip");
    const bulanFolder = getOrCreateFolder(arsipFolder, String(data.bulan || "Umum"));
    const unitFolder = getOrCreateFolder(bulanFolder, String(data.unit || "Umum"));

    const file = unitFolder.createFile(fileBlob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const fileUrl = file.getUrl();

    // Info file ke- (untuk multi-upload)
    const fileIndex = data.fileIndex ? String(data.fileIndex) : "1";
    const totalFiles = data.totalFiles ? String(data.totalFiles) : "1";
    const fileInfo = totalFiles !== "1"
      ? "File " + fileIndex + "/" + totalFiles + ": " + data.fileName
      : data.fileName;

    const rowId = "DOC-" + Date.now() + "-" + fileIndex;

    sheet.appendRow([
      rowId, timestamp, data.nama, data.unit, data.bulan, data.tahun,
      data.jenis_dokumen, data.keterangan || "", fileUrl, "file",
      fileInfo, "PENDING"
    ]);

    Logger.log("✅ Dokumen Arsip (file) tersimpan: " + rowId + " | " + data.fileName);

    // Kirim notifikasi WA hanya pada file pertama (fileIndex = 1)
    if (fileIndex === "1") {
      try {
        const totalInfo = totalFiles !== "1" ? ` (total ${totalFiles} file)` : "";
        const pesan =
          `📁 *UPLOAD DOKUMEN ARSIP*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📋 *Pemohon:* ${data.nama || '-'}\n` +
          `🏢 *Unit/Divisi:* ${data.unit || '-'}\n` +
          `📂 *Jenis Dokumen:* ${data.jenis_dokumen || '-'}${totalInfo}\n` +
          `📅 *Bulan/Tahun:* ${data.bulan || '-'} / ${data.tahun || '-'}\n` +
          `📄 *File:* ${data.fileName}\n` +
          `📝 *Keterangan:* ${data.keterangan || '-'}\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `⏰ _Diajukan: ${waFormatWaktu(timestamp)}_\n\n` +
          `Silakan buka dashboard admin untuk memproses pengajuan ini.`;
        sendWANotifikasi(WA_ADMIN_UMUM, pesan);
      } catch (waErr) { Logger.log("[WA] Error dokumen_file: " + waErr.message); }
    }

    return createResponse({
      status: "success", id: rowId, fileUrl: fileUrl,
      fileName: data.fileName, fileIndex: fileIndex, totalFiles: totalFiles,
      message: "Dokumen berhasil diunggah ke Google Drive"
    });

  } catch (err) {
    Logger.log("ERROR handleFileUpload: " + err.message);
    return createResponse({ status: "error", message: err.toString() });
  }
}


// ============================================
// ★ HANDLE PENGAJUAN DANA UPLOAD
//   File disimpan ke: Root → [Bulan] → [Unit] → file
// ============================================
function handlePengajuanDanaUpload(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_KEUANGAN_ID);
    let sheet = ss.getSheetByName("PENGAJUAN_DANA");

    if (!sheet) {
      sheet = ss.insertSheet("PENGAJUAN_DANA");
      sheet.appendRow([
        "ID", "Timestamp", "Nama", "Unit", "Sub Kegiatan",
        "Bulan Pengajuan", "Nominal Pengajuan", "Link File Pengajuan Dana", "Status"
      ]);
    }

    const fileBlob = Utilities.newBlob(
      Utilities.base64Decode(data.fileData),
      data.mimeType,
      data.fileName
    );

    const targetFolder = getKeuanganFolder(
      data.bulan_pengajuan || "Umum",
      data.unit || "Umum"
    );

    const file = targetFolder.createFile(fileBlob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileUrl = file.getUrl();
    const id = "DANA-" + Date.now();
    const timestamp = new Date();

    sheet.appendRow([
      id, timestamp, data.nama, data.unit, data.sub_kegiatan,
      data.bulan_pengajuan, Number(data.nominal_pengajuan), fileUrl, "PENDING"
    ]);

    Logger.log("✅ Pengajuan Dana tersimpan: " + id + " | folder: " + (data.bulan_pengajuan || "Umum") + "/" + (data.unit || "Umum"));

    // ★ Notifikasi WA ke Admin Sub Keuangan
    try {
      const pesan =
        `💰 *PENGAJUAN DANA BARU*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📋 *Pemohon:* ${data.nama || '-'}\n` +
        `🏢 *Unit/Divisi:* ${data.unit || '-'}\n` +
        `🗂️ *Sub Kegiatan:* ${data.sub_kegiatan || '-'}\n` +
        `📅 *Bulan Pengajuan:* ${data.bulan_pengajuan || '-'}\n` +
        `💵 *Nominal:* Rp ${waFormatRupiah(data.nominal_pengajuan)}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `⏰ _Diajukan: ${waFormatWaktu(timestamp)}_\n\n` +
        `Silakan buka dashboard admin untuk memproses pengajuan ini.`;
      sendWANotifikasi(WA_ADMIN_KEUANGAN, pesan);
    } catch (waErr) { Logger.log("[WA] Error pengajuan_dana: " + waErr.message); }

    return createResponse({
      status: "success", id: id, fileUrl: fileUrl,
      fileName: data.fileName, message: "Pengajuan dana berhasil dikirim"
    });

  } catch (err) {
    Logger.log("ERROR handlePengajuanDanaUpload: " + err.message);
    return createResponse({ status: "error", message: err.toString() });
  }
}

// ============================================
// ★ HANDLE SPJ UPLOAD
//   File disimpan ke: Root → [Bulan] → [Unit] → file
//   (jika ada fileData; jika tidak ada, hanya simpan ke sheet)
// ============================================
function handleSPJUpload(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_KEUANGAN_ID);
    let sheet = ss.getSheetByName("PENYAMPAIAN_SPJ");

    if (!sheet) {
      sheet = ss.insertSheet("PENYAMPAIAN_SPJ");
      sheet.appendRow([
        "ID", "Timestamp", "Nama", "Unit",
        "Sub Kegiatan", "Bulan SPJ", "Nominal SPJ Masuk", "Link File SPJ", "Status"
      ]);
    }

    const id = "SPJ-" + Date.now();
    const timestamp = new Date();
    let fileUrl = "";

    if (data.fileData && data.mimeType && data.fileName) {
      const fileBlob = Utilities.newBlob(
        Utilities.base64Decode(data.fileData),
        data.mimeType,
        data.fileName
      );

      const targetFolder = getKeuanganFolder(
        data.bulan || "Umum",
        data.unit || "Umum"
      );

      const file = targetFolder.createFile(fileBlob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = file.getUrl();

      Logger.log("✅ SPJ file tersimpan di: " + (data.bulan || "Umum") + "/" + (data.unit || "Umum"));
    }

    sheet.appendRow([
      id, timestamp, data.nama, data.unit,
      data.sub_kegiatan, data.bulan,
      Number(data.nominal_spj) || 0, fileUrl, "PENDING"
    ]);

    // ★ Notifikasi WA ke Admin Sub Keuangan
    try {
      const pesan =
        `📄 *PENYAMPAIAN SPJ BARU*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📋 *Pemohon:* ${data.nama || '-'}\n` +
        `🏢 *Unit/Divisi:* ${data.unit || '-'}\n` +
        `🗂️ *Sub Kegiatan:* ${data.sub_kegiatan || '-'}\n` +
        `📅 *Bulan SPJ:* ${data.bulan || '-'}\n` +
        `💵 *Nominal SPJ:* Rp ${waFormatRupiah(data.nominal_spj)}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `⏰ _Diajukan: ${waFormatWaktu(timestamp)}_\n\n` +
        `Silakan buka dashboard admin untuk memproses pengajuan ini.`;
      sendWANotifikasi(WA_ADMIN_KEUANGAN, pesan);
    } catch (waErr) { Logger.log("[WA] Error spj_upload: " + waErr.message); }

    return createResponse({
      status: "success", id: id,
      fileUrl: fileUrl || null,
      message: "SPJ berhasil disimpan"
    });

  } catch (err) {
    Logger.log("ERROR handleSPJUpload: " + err.message);
    return createResponse({ status: "error", message: err.toString() });
  }
}