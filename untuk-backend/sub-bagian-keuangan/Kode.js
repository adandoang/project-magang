// ---- KONFIGURASI UTAMA ----
const SPREADSHEET_ID = '1zIfSE4bCOsJZ-WICLNTRuDFdC_-34WbBq2I4QfKUdpI';

const SHEET_DATA_NAME = 'DATA_PENILAIAN_SPJ';
const SHEET_LOG_NAME = 'LOG_AKTIVITAS';
const SHEET_SPJ_NAME = 'PENYAMPAIAN_SPJ';
const SHEET_DANA_NAME = 'PENGAJUAN_DANA';

const MONTHS = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
];

const MONTH_SHEET_MAP = {
  'JANUARI': 'JAN', 'FEBRUARI': 'FEB', 'MARET': 'MAR', 'APRIL': 'APR',
  'MEI': 'MEI', 'JUNI': 'JUNI', 'JULI': 'JULI', 'AGUSTUS': 'AGST',
  'SEPTEMBER': 'SEPT', 'OKTOBER': 'OKT', 'NOVEMBER': 'NOV', 'DESEMBER': 'DES'
};

const UNITS = [
  'Balai Layanan Usaha Terpadu KUMKM',
  'Bidang Kewirausahaan',
  'Bidang Koperasi',
  'Bidang UKM',
  'Bidang Usaha Mikro',
  'Sekretariat'
];

const UNIT_COL_MAP = {
  'Balai Layanan Usaha Terpadu KUMKM': 3,
  'Bidang Kewirausahaan': 4,
  'Bidang Koperasi': 5,
  'Bidang UKM': 6,
  'Bidang Usaha Mikro': 7,
  'Sekretariat': 8
};


// ============================================================
// ENTRY POINT
// ============================================================
function doGet(e) {
  const params = e.parameter;
  const callback = params.callback || '';
  let result;

  try {
    const action = params.action || '';
    switch (action) {
      case 'saveSPJKeuangan': result = saveSPJKeuangan(params); break;
      case 'getSPJKeuangan': result = getSPJKeuangan(params); break;
      case 'getAllSPJKeuangan': result = getAllSPJKeuangan(params); break;
      case 'deleteSPJKeuangan': result = deleteSPJKeuangan(params); break;
      case 'getRekapBulanan': result = getRekapBulanan(params); break;
      case 'exportRekap': result = exportRekap(params); break;
      case 'getStats': result = getStats(params); break;
      case 'getPenyampaianSPJ': result = getPenyampaianSPJ(params); break;
      case 'updateStatusSPJ': result = updateStatusSPJ(params); break;
      case 'getMonthlySheetData': result = getMonthlySheetData(params); break;
      case 'getAllMonthlySheetData': result = getAllMonthlySheetData(params); break;
      case 'getPengajuanDana': result = getPengajuanDana(params); break;
      case 'updateStatusPengajuanDana': result = updateStatusPengajuanDana(params); break;
      default: result = { success: false, message: 'Action tidak dikenal: ' + action };
    }
  } catch (err) {
    result = { success: false, message: 'Server error: ' + err.message };
    logError(err.message, params.action || 'unknown');
  }

  const json = JSON.stringify(result);
  const output = callback ? callback + '(' + json + ');' : json;
  return ContentService
    .createTextOutput(output)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}


// ============================================================
// ★ FIXED: GET MONTHLY SHEET DATA
// ============================================================
function getMonthlySheetData(params) {
  try {
    const bulan = (params.bulan || '').toUpperCase().trim();
    if (!bulan) return { success: false, message: 'Parameter bulan wajib diisi' };

    const sheetName = MONTH_SHEET_MAP[bulan];
    if (!sheetName) return { success: false, message: 'Bulan tidak valid: ' + bulan };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      Logger.log('[getMonthlySheetData] Sheet "' + sheetName + '" tidak ditemukan');
      return { success: true, bulan: bulan, data: {}, message: 'Sheet ' + sheetName + ' belum dibuat' };
    }

    var values;
    try {
      values = sheet.getRange(5, 3, 3, 6).getValues();
    } catch (rangeErr) {
      Logger.log('[getMonthlySheetData] Range error: ' + rangeErr.message);
      return { success: true, bulan: bulan, data: {}, message: 'Range read error: ' + rangeErr.message };
    }

    Logger.log('[getMonthlySheetData] Raw values baris 5: ' + JSON.stringify(values[0]));
    Logger.log('[getMonthlySheetData] Raw values baris 6: ' + JSON.stringify(values[1]));
    Logger.log('[getMonthlySheetData] Raw values baris 7: ' + JSON.stringify(values[2]));

    const data = {};
    UNITS.forEach(function (unit) {
      var colIdx = UNIT_COL_MAP[unit];
      var arrIdx = colIdx - 3;

      var rawTepat = values[0][arrIdx];
      var rawSanksi = values[1][arrIdx];
      var rawTotal = values[2][arrIdx];

      var nilaiTepat = parseRobust(rawTepat);
      var sanksi = parseRobust(rawSanksi);
      var totalNilai = parseRobust(rawTotal);

      if (totalNilai === 0 && nilaiTepat > 0) {
        totalNilai = Math.max(0, nilaiTepat + (nilaiTepat < 35 ? (35 - nilaiTepat - sanksi) : 0));
      }

      var hasData = (rawTepat !== '' && rawTepat !== null) ||
        (rawTotal !== '' && rawTotal !== null);
      if (typeof rawTepat === 'number' || typeof rawTotal === 'number') hasData = true;

      Logger.log('[getMonthlySheetData] Unit=' + unit + ' col=' + colIdx +
        ' raw=[' + rawTepat + ',' + rawSanksi + ',' + rawTotal + ']' +
        ' parsed=[' + nilaiTepat + ',' + sanksi + ',' + totalNilai + ']' +
        ' hasData=' + hasData);

      if (hasData) {
        data[unit] = { nilaiTepat: nilaiTepat, sanksi: sanksi, totalNilai: totalNilai };
      }
    });

    Logger.log('[getMonthlySheetData] Bulan=' + bulan + ' Units ditemukan=' + Object.keys(data).length);
    return { success: true, bulan: bulan, sheetName: sheetName, data: data };

  } catch (err) {
    Logger.log('[getMonthlySheetData] Error: ' + err.message);
    return { success: false, message: 'Error: ' + err.message };
  }
}

// ============================================================
// ★ FIXED: GET ALL MONTHLY SHEET DATA
// ============================================================
function getAllMonthlySheetData(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const rekap = {};

    MONTHS.forEach(function (bulan) {
      const sheetName = MONTH_SHEET_MAP[bulan];
      if (!sheetName) return;

      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) { Logger.log('[getAllMonthlySheetData] Sheet tidak ada: ' + sheetName); return; }

      var values;
      try {
        values = sheet.getRange(5, 3, 3, 6).getValues();
      } catch (e) {
        Logger.log('[getAllMonthlySheetData] Range error ' + sheetName + ': ' + e.message);
        return;
      }

      const bulanData = {};
      UNITS.forEach(function (unit) {
        var colIdx = UNIT_COL_MAP[unit];
        var arrIdx = colIdx - 3;

        var rawTepat = values[0][arrIdx];
        var rawSanksi = values[1][arrIdx];
        var rawTotal = values[2][arrIdx];

        var nilaiTepat = parseRobust(rawTepat);
        var sanksi = parseRobust(rawSanksi);
        var totalNilai = parseRobust(rawTotal);

        var hasData = (typeof rawTepat === 'number') ||
          (typeof rawTotal === 'number') ||
          (rawTepat !== '' && rawTepat !== null && rawTepat !== undefined) ||
          (rawTotal !== '' && rawTotal !== null && rawTotal !== undefined);

        if (hasData) {
          bulanData[unit] = { nilaiTepat: nilaiTepat, sanksi: sanksi, totalNilai: totalNilai };
        }
      });

      if (Object.keys(bulanData).length > 0) {
        rekap[bulan] = bulanData;
        Logger.log('[getAllMonthlySheetData] ' + bulan + ' (' + sheetName + '): ' + Object.keys(bulanData).length + ' units');
      }
    });

    Logger.log('[getAllMonthlySheetData] Total bulan dengan data: ' + Object.keys(rekap).join(', '));
    return { success: true, rekap: rekap };

  } catch (err) {
    Logger.log('[getAllMonthlySheetData] Error: ' + err.message);
    return { success: false, message: 'Error: ' + err.message };
  }
}

// ============================================================
// ★ HELPER: parseRobust
// ============================================================
function parseRobust(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  var cleaned = String(val).replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, '').trim();
  if (cleaned === '' || isNaN(parseFloat(cleaned))) {
    cleaned = String(val).replace(',', '.').replace(/[^\d.\-]/g, '').trim();
  }
  var result = parseFloat(cleaned);
  return isNaN(result) ? 0 : result;
}

// ============================================================
// GET PENYAMPAIAN SPJ
// ============================================================
function getPenyampaianSPJ(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_SPJ_NAME);
    if (!sheet) return { success: false, message: 'Sheet PENYAMPAIAN_SPJ tidak ditemukan' };
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true, data: [], message: 'Belum ada data' };
    const rows = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
    const data = rows
      .filter(row => row[0] !== '' && row[0] !== null)
      .map(row => ({
        id: String(row[0]), timestamp: row[1], nama: String(row[2] || ''),
        unit: String(row[3] || ''), subKegiatan: String(row[4] || ''),
        bulanSPJ: String(row[5] || ''), nominalSPJMasuk: parseFloat(row[6]) || 0,
        status: String(row[7] || 'PENDING')
      }));
    return { success: true, data: data, count: data.length };
  } catch (err) {
    return { success: false, message: 'Error: ' + err.message };
  }
}

// ============================================================
// UPDATE STATUS SPJ
// ============================================================
function updateStatusSPJ(params) {
  try {
    const id = String(params.id || '').trim();
    const status = (params.status || 'PENDING').toUpperCase().trim();
    if (!id) return { success: false, message: 'ID tidak boleh kosong' };
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) return { success: false, message: 'Status tidak valid' };
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_SPJ_NAME);
    if (!sheet) return { success: false, message: 'Sheet PENYAMPAIAN_SPJ tidak ditemukan' };
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: false, message: 'Sheet kosong' };
    const idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    let targetRow = -1;
    for (let i = 0; i < idValues.length; i++) {
      if (String(idValues[i][0]).trim() === id) { targetRow = i + 2; break; }
    }
    if (targetRow === -1) return { success: false, message: 'ID tidak ditemukan' };
    sheet.getRange(targetRow, 8).setValue(status);
    logActivity(ss, params.penilai || 'Admin', 'UPDATE_STATUS_SPJ', id, status, 0);
    return { success: true, message: 'Status SPJ berhasil diupdate', id: id, status: status };
  } catch (err) {
    return { success: false, message: 'Error: ' + err.message };
  }
}

// ============================================================
// GET PENGAJUAN DANA
// ============================================================
function getPengajuanDana(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_DANA_NAME);
    if (!sheet) return { success: false, message: 'Sheet PENGAJUAN_DANA tidak ditemukan' };
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true, data: [], message: 'Belum ada data' };
    const rows = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
    const data = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] === '' || row[0] === null) continue;
      const sheetRow = i + 2;
      const linkFile = getCellUrl(sheet, sheetRow, 8);
      data.push({
        id: String(row[0]), timestamp: row[1], nama: String(row[2] || ''),
        unit: String(row[3] || ''), subKegiatan: String(row[4] || ''),
        bulanPengajuan: String(row[5] || ''), nominalPengajuan: parseNominal(row[6]),
        linkFilePengajuanDana: linkFile, status: String(row[8] || 'PENDING')
      });
    }
    return { success: true, data: data, count: data.length };
  } catch (err) {
    return { success: false, message: 'Error: ' + err.message };
  }
}

// ============================================================
// UPDATE STATUS PENGAJUAN DANA
// ============================================================
function updateStatusPengajuanDana(params) {
  try {
    const id = String(params.id || '').trim();
    const status = (params.status || 'PENDING').toUpperCase().trim();
    if (!id) return { success: false, message: 'ID tidak boleh kosong' };
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) return { success: false, message: 'Status tidak valid' };
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_DANA_NAME);
    if (!sheet) return { success: false, message: 'Sheet PENGAJUAN_DANA tidak ditemukan' };
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: false, message: 'Sheet kosong' };
    const idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    let targetRow = -1;
    for (let i = 0; i < idValues.length; i++) {
      if (String(idValues[i][0]).trim() === id) { targetRow = i + 2; break; }
    }
    if (targetRow === -1) return { success: false, message: 'ID tidak ditemukan' };
    sheet.getRange(targetRow, 9).setValue(status);
    logActivity(ss, params.penilai || 'Admin', 'UPDATE_STATUS_DANA', id, status, 0);
    return { success: true, message: 'Status pengajuan dana berhasil diupdate', id: id, status: status };
  } catch (err) {
    return { success: false, message: 'Error: ' + err.message };
  }
}

// ============================================================
// SAVE SPJ KEUANGAN
// ============================================================
function saveSPJKeuangan(params) {
  const bulan = (params.bulan || '').toUpperCase().trim();
  const unit = (params.unit || '').trim();
  const totalPengajuan = parseFloat(params.totalPengajuan) || 0;
  const nominalTepat = parseFloat(params.nominalTepat) || 0;
  const hariTerlambat = parseInt(params.hariTerlambat) || 0;
  const penilai = params.penilai || 'Admin';

  const SKOR_MAX = 35;
  const tahunSekarang = new Date().getFullYear();
  const mapHari = {
    'JANUARI': 31, 'FEBRUARI': (tahunSekarang % 4 === 0 ? 29 : 28), 'MARET': 31,
    'APRIL': 30, 'MEI': 31, 'JUNI': 30, 'JULI': 31, 'AGUSTUS': 31,
    'SEPTEMBER': 30, 'OKTOBER': 31, 'NOVEMBER': 30, 'DESEMBER': 31
  };
  const totalHariBulan = mapHari[bulan] || 30;
  const hariSanksiTersedia = totalHariBulan - 25;
  const persenSanksiPerHari = 1 / hariSanksiTersedia;

  const persen = (totalPengajuan > 0) ? (nominalTepat / totalPengajuan) : 1.0;
  const nilaiTepat = parseFloat((persen * SKOR_MAX).toFixed(2));
  const sisaBobotAwal = parseFloat((SKOR_MAX - nilaiTepat).toFixed(2));
  const nilaiSanksi = parseFloat((persenSanksiPerHari * sisaBobotAwal * hariTerlambat).toFixed(2));
  const sisaBobotBersih = parseFloat((sisaBobotAwal - nilaiSanksi).toFixed(2));
  const totalNilai = parseFloat((nilaiTepat + sisaBobotBersih).toFixed(2));

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const dataSheet = getOrCreateDataSheet(ss);
  const existingRow = findExistingRow(dataSheet, bulan, unit);

  const rowData = [
    timestamp, bulan, unit, totalPengajuan, nominalTepat, hariTerlambat,
    nilaiTepat, nilaiSanksi, totalNilai, params.catatan || '', penilai
  ];

  if (existingRow > 0) {
    dataSheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    dataSheet.appendRow(rowData);
  }

  updateMonthlySheet(ss, bulan, unit, nilaiTepat, sisaBobotBersih);
  logActivity(ss, penilai, 'SAVE', bulan, unit, totalNilai);

  return { success: true, data: { totalNilai: totalNilai, sisaBobotBersih: sisaBobotBersih, nilaiTepat: nilaiTepat, sanksi: nilaiSanksi } };
}

function getSPJKeuangan(params) {
  const bulan = (params.bulan || '').toUpperCase().trim();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const dataSheet = getOrCreateDataSheet(ss);
  const lastRow = dataSheet.getLastRow();
  if (lastRow <= 1) return { success: true, data: [], message: 'Belum ada data' };
  const rows = dataSheet.getRange(2, 1, lastRow - 1, 11).getValues();
  let filtered = rows.filter(row => row[0] !== '');
  if (bulan) filtered = filtered.filter(row => String(row[1]).toUpperCase() === bulan);
  const data = filtered.map(row => ({
    timestamp: row[0], bulan: row[1], unit: row[2], totalPengajuan: row[3],
    nominalTepat: row[4], hariTerlambat: row[5], nilaiTepat: row[6],
    sanksi: row[7], totalNilai: row[8], catatan: row[9], penilai: row[10]
  }));
  return { success: true, data: data, count: data.length };
}

function getAllSPJKeuangan(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const dataSheet = getOrCreateDataSheet(ss);
  const lastRow = dataSheet.getLastRow();
  if (lastRow <= 1) return { success: true, rekap: {}, message: 'Belum ada data' };
  const rows = dataSheet.getRange(2, 1, lastRow - 1, 11).getValues();
  const rekap = {};
  rows.forEach(row => {
    if (!row[0]) return;
    const bulan = String(row[1]).toUpperCase();
    const unit = String(row[2]);
    if (!rekap[bulan]) rekap[bulan] = {};
    rekap[bulan][unit] = {
      totalPengajuan: row[3], nominalTepat: row[4], hariTerlambat: row[5],
      nilaiTepat: parseFloat(row[6]) || 0, sanksi: parseFloat(row[7]) || 0,
      totalNilai: parseFloat(row[8]) || 0, catatan: row[9], penilai: row[10]
    };
  });
  return { success: true, rekap: rekap };
}

function deleteSPJKeuangan(params) {
  const bulan = (params.bulan || '').toUpperCase().trim();
  const unit = (params.unit || '').trim();
  if (!bulan || !unit) return { success: false, message: 'Bulan dan unit harus diisi' };
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const dataSheet = getOrCreateDataSheet(ss);
  const rowNum = findExistingRow(dataSheet, bulan, unit);
  if (rowNum <= 0) return { success: false, message: 'Data tidak ditemukan' };
  dataSheet.deleteRow(rowNum);
  updateMonthlySheet(ss, bulan, unit, 0, 0);
  logActivity(ss, 'Admin', 'DELETE', bulan, unit, 0);
  return { success: true, message: 'Data berhasil dihapus' };
}

function getRekapBulanan(params) {
  const bulan = (params.bulan || '').toUpperCase().trim();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const dataSheet = getOrCreateDataSheet(ss);
  const lastRow = dataSheet.getLastRow();
  const rekap = {};
  UNITS.forEach(u => {
    rekap[u] = { nilaiTepat: 0, sanksi: 0, totalNilai: 0, totalPengajuan: 0, nominalTepat: 0, hariTerlambat: 0, catatan: '' };
  });
  if (lastRow > 1) {
    const rows = dataSheet.getRange(2, 1, lastRow - 1, 11).getValues();
    rows.forEach(row => {
      const bulanSheet = String(row[1]).toUpperCase().trim();
      if (bulanSheet === bulan) {
        const unit = String(row[2]).trim();
        if (rekap[unit]) {
          rekap[unit] = {
            totalPengajuan: row[3], nominalTepat: row[4], hariTerlambat: row[5],
            nilaiTepat: parseFloat(row[6]) || 0, sanksi: parseFloat(row[7]) || 0,
            totalNilai: parseFloat(row[8]) || 0, catatan: row[9]
          };
        }
      }
    });
  }
  const unitsDone = Object.values(rekap).filter(r => r.totalNilai > 0).length;
  return { success: true, bulan: bulan, rekap: rekap, stats: { unitsDone: unitsDone, totalUnits: UNITS.length } };
}

function exportRekap(params) {
  const bulanFilter = (params.bulan || '').toUpperCase().trim();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const dataSheet = getOrCreateDataSheet(ss);
  const lastRow = dataSheet.getLastRow();
  if (lastRow <= 1) return { success: false, message: 'Belum ada data' };
  const rows = dataSheet.getRange(2, 1, lastRow - 1, 11).getValues();
  const filtered = bulanFilter
    ? rows.filter(r => r[0] && String(r[1]).toUpperCase() === bulanFilter)
    : rows.filter(r => r[0]);
  if (filtered.length === 0) return { success: false, message: 'Tidak ada data' };
  const exportName = 'EXPORT_' + (bulanFilter || 'SEMUA') + '_' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'ddMMyyyyHHmm');
  const existingExport = ss.getSheetByName(exportName);
  if (existingExport) ss.deleteSheet(existingExport);
  const exportSheet = ss.insertSheet(exportName);
  exportSheet.getRange('A1:K1').merge().setValue('REKAPITULASI NILAI KINERJA PENYAMPAIAN SPJ KEUANGAN')
    .setFontWeight('bold').setFontSize(13).setBackground('#1F4E79').setFontColor('white').setHorizontalAlignment('center');
  if (bulanFilter) {
    exportSheet.getRange('A2:K2').merge().setValue('BULAN ' + bulanFilter)
      .setFontWeight('bold').setFontSize(11).setBackground('#2E75B6').setFontColor('white').setHorizontalAlignment('center');
  }
  const startRow = bulanFilter ? 4 : 3;
  const headers = ['Timestamp', 'Bulan', 'Unit', 'Total Pengajuan (Rp)', 'Nominal Tepat Waktu (Rp)', 'Hari Terlambat', 'Nilai Tepat Waktu', 'Sanksi', 'Total Nilai', 'Catatan', 'Penilai'];
  exportSheet.getRange(startRow, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#2E75B6').setFontColor('white').setBorder(true, true, true, true, true, true);
  exportSheet.getRange(startRow + 1, 1, filtered.length, filtered[0].length).setValues(filtered).setBorder(true, true, true, true, true, true);
  exportSheet.getRange(startRow + 1, 4, filtered.length, 2).setNumberFormat('#,##0');
  exportSheet.getRange(startRow + 1, 7, filtered.length, 3).setNumberFormat('#,##0.00');
  exportSheet.autoResizeColumns(1, 11);
  return { success: true, message: 'Berhasil export ' + filtered.length + ' data', sheetName: exportName, recordCount: filtered.length, url: ss.getUrl() };
}

function getStats(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const dataSheet = getOrCreateDataSheet(ss);
  const lastRow = dataSheet.getLastRow();
  const stats = { totalRecords: 0, avgNilaiAll: 0, bulanTersedia: [], unitStats: {} };
  UNITS.forEach(u => { stats.unitStats[u] = { avgNilai: 0, count: 0 }; });
  if (lastRow <= 1) return { success: true, stats: stats };
  const rows = dataSheet.getRange(2, 1, lastRow - 1, 9).getValues();
  const validRows = rows.filter(r => r[0]);
  stats.totalRecords = validRows.length;
  const bulanSet = new Set();
  let totalNilaiSum = 0;
  validRows.forEach(row => {
    const bulan = String(row[1]).toUpperCase();
    const unit = String(row[2]);
    const nilai = parseFloat(row[8]) || 0;
    bulanSet.add(bulan);
    totalNilaiSum += nilai;
    if (stats.unitStats[unit]) { stats.unitStats[unit].count++; stats.unitStats[unit].avgNilai += nilai; }
  });
  stats.avgNilaiAll = validRows.length > 0 ? parseFloat((totalNilaiSum / validRows.length).toFixed(2)) : 0;
  stats.bulanTersedia = MONTHS.filter(m => bulanSet.has(m));
  UNITS.forEach(u => {
    if (stats.unitStats[u].count > 0) {
      stats.unitStats[u].avgNilai = parseFloat((stats.unitStats[u].avgNilai / stats.unitStats[u].count).toFixed(2));
    }
  });
  return { success: true, stats: stats };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function getOrCreateDataSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_DATA_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_DATA_NAME);
    const headers = ['Timestamp', 'Bulan', 'Unit', 'Total Pengajuan (Rp)', 'Nominal Tepat Waktu (Rp)', 'Hari Terlambat', 'Nilai Tepat Waktu', 'Nilai Sanksi', 'Total Nilai', 'Catatan', 'Penilai'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#1F4E79').setFontColor('white').setBorder(true, true, true, true, true, true);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findExistingRow(sheet, bulan, unit) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  const data = sheet.getRange(2, 2, lastRow - 1, 2).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).toUpperCase() === bulan.toUpperCase() &&
      String(data[i][1]).trim() === unit.trim()) return i + 2;
  }
  return -1;
}

function updateMonthlySheet(ss, bulan, unit, nilaiTepat, sisaBobotBersih) {
  const sheetName = MONTH_SHEET_MAP[bulan];
  if (!sheetName) return;
  const monthSheet = ss.getSheetByName(sheetName);
  if (!monthSheet) return;
  const colIdx = UNIT_COL_MAP[unit];
  if (!colIdx) return;
  const colLetter = columnToLetter(colIdx);
  monthSheet.getRange(5, colIdx).setValue(nilaiTepat).setNumberFormat('#,##0.00');
  monthSheet.getRange(6, colIdx).setValue(sisaBobotBersih).setNumberFormat('#,##0.00');
  monthSheet.getRange(7, colIdx).setFormula('=SUM(' + colLetter + '5:' + colLetter + '6)').setNumberFormat('#,##0.00');
}

function columnToLetter(col) {
  let letter = '';
  while (col > 0) {
    const mod = (col - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

function logActivity(ss, penilai, aksi, bulan, unit, nilai) {
  let logSheet = ss.getSheetByName(SHEET_LOG_NAME);
  if (!logSheet) {
    logSheet = ss.insertSheet(SHEET_LOG_NAME);
    logSheet.getRange(1, 1, 1, 6).setValues([['Timestamp', 'Penilai', 'Aksi', 'Bulan', 'Unit', 'Nilai']]).setFontWeight('bold').setBackground('#374151').setFontColor('white');
    logSheet.setFrozenRows(1);
  }
  const ts = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  logSheet.appendRow([ts, penilai, aksi, bulan, unit, nilai]);
}

function logError(errMsg, action) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let errSheet = ss.getSheetByName('ERROR_LOG');
    if (!errSheet) {
      errSheet = ss.insertSheet('ERROR_LOG');
      errSheet.getRange(1, 1, 1, 3).setValues([['Timestamp', 'Action', 'Error']]).setFontWeight('bold');
    }
    errSheet.appendRow([new Date(), action, errMsg]);
  } catch (e) { }
}

function getCellUrl(sheet, row, col) {
  try {
    const richText = sheet.getRange(row, col).getRichTextValue();
    if (richText) {
      const runs = richText.getRuns();
      for (const run of runs) { const link = run.getLinkUrl(); if (link) return link; }
      const cellLink = richText.getLinkUrl();
      if (cellLink) return cellLink;
    }
  } catch (e) { }
  try {
    const formula = sheet.getRange(row, col).getFormula();
    if (formula) { const match = formula.match(/=HYPERLINK\("([^"]+)"/i); if (match) return match[1]; }
  } catch (e) { }
  const val = sheet.getRange(row, col).getValue();
  return val ? String(val) : '';
}

function parseNominal(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/Rp\.?\s*/gi, '').replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.]/g, '').trim();
  const result = parseFloat(cleaned);
  return isNaN(result) ? 0 : result;
}

function forceAuth() {
  UrlFetchApp.fetch('https://www.google.com');
}