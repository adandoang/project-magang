// ─── KONFIGURASI UTAMA ─────────────────────────────
var FOLDER_BUKTI = "BUKTI_MONEV";
var LOG_SHEET_NAME = "LOG_INPUT";

var UNIT_COLUMN_MAP = {
  "Balai Layanan Usaha Terpadu KUMKM": 3,
  "Bidang Kewirausahaan": 4,
  "Bidang Koperasi": 5,
  "Bidang UKM": 6,
  "Bidang Usaha Mikro": 7,
  "Sekretariat": 8
};

var COL_UNIT_MAP = {
  3: "Balai Layanan Usaha Terpadu KUMKM",
  4: "Bidang Kewirausahaan",
  5: "Bidang Koperasi",
  6: "Bidang UKM",
  7: "Bidang Usaha Mikro",
  8: "Sekretariat"
};

var ALL_MONTHS = [
  "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
  "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
];

// ─── doPost ───────────────────────────────────────────
function doPost(e) {
  var result;
  try {
    var p = e.parameter;
    var action = p.action;
    if (action === "uploadAndSave") {
      result = uploadAndSave(p);
    } else if (action === "saveMonevData") {
      result = saveMonevData(p);
    } else if (action === "deleteMonevData") {
      result = deleteMonevData(p);
    } else {
      result = { status: "error", message: "Action tidak dikenal: " + action };
    }
  } catch (err) {
    result = { status: "error", message: err.toString() };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── doGet ────────────────────────────────────────────
function doGet(e) {
  var callback = e.parameter.callback;
  var action = e.parameter.action;
  var result;
  try {
    if (action === "getMonevData") {
      result = getMonevData(e.parameter);
    } else if (action === "getSheetData") {
      result = getSheetData(e.parameter);
    } else if (action === "getAllSheetData") {
      result = getAllSheetDataFast();
    } else {
      result = { status: "error", message: "Action tidak dikenal: " + action };
    }
  } catch (err) {
    result = { status: "error", message: err.toString() };
  }
  if (callback) {
    return ContentService
      .createTextOutput(callback + "(" + JSON.stringify(result) + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── UPLOAD + SAVE ────────────────────────────────────
function uploadAndSave(p) {
  var linkBukti = "";
  if (p.fileData && p.fileName && p.mimeType) {
    try {
      var uploadResult = uploadBuktiMonev(p);
      if (uploadResult.status === "success") linkBukti = uploadResult.fileUrl || "";
    } catch (uploadErr) {
      Logger.log("Exception upload: " + uploadErr.toString());
    }
  }
  var saveParams = {
    bulan: p.bulan, unit: p.unit,
    waktu: p.waktu, kelengkapan: p.kelengkapan,
    fisik: p.fisik, keuangan: p.keuangan,
    partisipasi: p.partisipasi, tindakLanjut: p.tindakLanjut,
    total: p.total, catatan: p.catatan,
    penilai: p.penilai, linkBukti: linkBukti
  };
  var saveResult = saveMonevData(saveParams);
  if (saveResult.status !== "success") return saveResult;
  return { status: "success", message: saveResult.message, linkBukti: linkBukti };
}

// ─── SIMPAN PENILAIAN ─────────────────────────────────
function saveMonevData(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(p.bulan.toUpperCase());
  if (!sheet) return { status: "error", message: "Sheet '" + p.bulan + "' tidak ditemukan." };

  var colIndex = UNIT_COLUMN_MAP[p.unit];
  if (!colIndex) return { status: "error", message: "Unit tidak terdaftar: " + p.unit };

  sheet.getRange(2, colIndex).setValue(Number(p.waktu) || 0);
  sheet.getRange(3, colIndex).setValue(Number(p.kelengkapan) || 0);
  sheet.getRange(4, colIndex).setValue(Number(p.fisik) || 0);
  sheet.getRange(5, colIndex).setValue(Number(p.keuangan) || 0);
  sheet.getRange(6, colIndex).setValue(Number(p.partisipasi) || 0);
  sheet.getRange(7, colIndex).setValue(Number(p.tindakLanjut) || 0);
  var colLetter = columnToLetter(colIndex);
  sheet.getRange(8, colIndex).setFormula("=SUM(" + colLetter + "2:" + colLetter + "7)");

  logActivity(p);
  return { status: "success", message: "Data " + p.unit + " bulan " + p.bulan + " berhasil disimpan." };
}

// ─── HAPUS PENILAIAN ─────────────────────────────────
// Mengosongkan cell nilai unit tersebut di sheet bulan yang bersangkutan
function deleteMonevData(p) {
  var bulan = (p.bulan || "").toUpperCase().trim();
  var unit = (p.unit || "").trim();

  if (!bulan) return { status: "error", message: "Parameter bulan wajib diisi." };
  if (!unit) return { status: "error", message: "Parameter unit wajib diisi." };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(bulan);
  if (!sheet) return { status: "error", message: "Sheet '" + bulan + "' tidak ditemukan." };

  var colIndex = UNIT_COLUMN_MAP[unit];
  if (!colIndex) return { status: "error", message: "Unit tidak terdaftar: " + unit };

  // Kosongkan baris 2–8 (waktu, kelengkapan, fisik, keuangan, partisipasi, tindakLanjut, total)
  sheet.getRange(2, colIndex, 7, 1).clearContent();

  // Hapus juga entri terakhir di LOG_INPUT untuk unit & bulan ini (opsional tapi rapi)
  try {
    var logSheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (logSheet && logSheet.getLastRow() >= 2) {
      var logValues = logSheet.getRange(2, 1, logSheet.getLastRow() - 1, 3).getValues();
      // Hapus dari bawah ke atas supaya index tidak bergeser
      for (var i = logValues.length - 1; i >= 0; i--) {
        var rowBulan = (logValues[i][1] || "").toString().trim().toUpperCase();
        var rowUnit = (logValues[i][2] || "").toString().trim();
        if (rowBulan === bulan && rowUnit === unit) {
          logSheet.deleteRow(i + 2); // +2 karena header di baris 1 dan array 0-indexed
        }
      }
    }
  } catch (logErr) {
    Logger.log("Gagal hapus log: " + logErr.toString());
    // Tidak return error — hapus di sheet utama sudah berhasil
  }

  return { status: "success", message: "Data " + unit + " bulan " + bulan + " berhasil dihapus." };
}

// ─── UPLOAD BUKTI ─────────────────────────────────────
function uploadBuktiMonev(p) {
  if (!p.fileData || !p.fileName || !p.mimeType) return { status: "error", message: "Parameter file tidak lengkap." };
  var allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
  if (allowed.indexOf(p.mimeType) === -1) return { status: "error", message: "Tipe file tidak didukung." };

  var decodedBytes;
  try {
    decodedBytes = Utilities.base64Decode(p.fileData.toString().replace(/ /g, '+'));
  } catch (e) {
    return { status: "error", message: "Gagal decode base64: " + e.toString() };
  }
  var blob = Utilities.newBlob(decodedBytes, p.mimeType, p.fileName);
  var folder = getOrCreateFolder(FOLDER_BUKTI);
  if (p.bulan) folder = getOrCreateFolder(p.bulan.toUpperCase(), folder);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var fileId = file.getId();
  return { status: "success", fileId: fileId, fileUrl: "https://drive.google.com/file/d/" + fileId + "/view?usp=sharing", fileName: p.fileName };
}

// ─── GET MONEV DATA (dari LOG_INPUT — legacy) ─────────
function getMonevData(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  if (!logSheet) return { status: "error", message: "Sheet '" + LOG_SHEET_NAME + "' tidak ditemukan." };
  var lastRow = logSheet.getLastRow();
  if (lastRow < 2) return { status: "success", data: [] };

  var values = logSheet.getRange(2, 1, lastRow - 1, 7).getValues();
  var filterUnit = p.unit ? p.unit.trim().toUpperCase() : null;
  var filterBulan = p.bulan ? p.bulan.trim().toUpperCase() : null;

  var result = [];
  values.forEach(function (row) {
    var bulan = (row[1] || "").toString().trim().toUpperCase();
    var unit = (row[2] || "").toString().trim();
    var linkBukti = (row[6] || "").toString().trim();
    if (filterUnit && unit.toUpperCase() !== filterUnit) return;
    if (filterBulan && bulan !== filterBulan) return;
    result.push({
      timestamp: row[0] ? row[0].toString() : "",
      bulan: bulan, unit: unit,
      total: Number(row[3]) || 0,
      penilai: (row[4] || "").toString().trim(),
      catatan: (row[5] || "").toString().trim(),
      linkBukti: linkBukti, hasBukti: linkBukti.length > 0
    });
  });
  result.sort(function (a, b) { return a.timestamp > b.timestamp ? -1 : 1; });
  return { status: "success", data: result };
}

// ─── GET SHEET DATA (1 bulan) ─────────────────────────
function getSheetData(p) {
  var bulan = (p.bulan || "").toUpperCase().trim();
  if (!bulan) return { status: "error", message: "Parameter bulan wajib diisi." };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(bulan);
  if (!sheet) return { status: "success", bulan: bulan, data: {} };

  var values = sheet.getRange(2, 3, 7, 6).getValues();
  var logLinks = getLogLinksForBulan(bulan);
  var data = {};

  for (var col = 0; col < 6; col++) {
    var unitName = COL_UNIT_MAP[col + 3];
    if (!unitName) continue;
    var waktu = Number(values[0][col]) || 0;
    var kelengkapan = Number(values[1][col]) || 0;
    var fisik = Number(values[2][col]) || 0;
    var keuangan = Number(values[3][col]) || 0;
    var partisipasi = Number(values[4][col]) || 0;
    var tindakLanjut = Number(values[5][col]) || 0;
    var total = Number(values[6][col]) || 0;
    if (waktu === 0 && kelengkapan === 0 && fisik === 0 && keuangan === 0 && partisipasi === 0 && tindakLanjut === 0) continue;
    var lg = logLinks[unitName] || {};
    data[unitName] = {
      waktu: waktu, kelengkapan: kelengkapan, fisik: fisik,
      keuangan: keuangan, partisipasi: partisipasi, tindakLanjut: tindakLanjut, total: total,
      catatan: lg.catatan || "", penilai: lg.penilai || "", linkBukti: lg.linkBukti || ""
    };
  }
  return { status: "success", bulan: bulan, data: data };
}

// ─── GET ALL SHEET DATA — VERSI CEPAT ⚡ ─────────────
function getAllSheetDataFast() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var allData = {};

  var logMap = buildFullLogMap(ss);

  for (var m = 0; m < ALL_MONTHS.length; m++) {
    var bulan = ALL_MONTHS[m];
    var sheet = ss.getSheetByName(bulan);
    if (!sheet) continue;

    var values = sheet.getRange(2, 3, 7, 6).getValues();
    var monthData = {};

    for (var col = 0; col < 6; col++) {
      var unitName = COL_UNIT_MAP[col + 3];
      if (!unitName) continue;
      var waktu = Number(values[0][col]) || 0;
      var kelengkapan = Number(values[1][col]) || 0;
      var fisik = Number(values[2][col]) || 0;
      var keuangan = Number(values[3][col]) || 0;
      var partisipasi = Number(values[4][col]) || 0;
      var tindakLanjut = Number(values[5][col]) || 0;
      var total = Number(values[6][col]) || 0;
      if (waktu === 0 && kelengkapan === 0 && fisik === 0 && keuangan === 0 && partisipasi === 0 && tindakLanjut === 0) continue;

      var logKey = bulan + "||" + unitName;
      var logInfo = logMap[logKey] || { catatan: "", penilai: "", linkBukti: "" };

      monthData[unitName] = {
        waktu: waktu, kelengkapan: kelengkapan, fisik: fisik,
        keuangan: keuangan, partisipasi: partisipasi, tindakLanjut: tindakLanjut, total: total,
        catatan: logInfo.catatan, penilai: logInfo.penilai, linkBukti: logInfo.linkBukti
      };
    }
    if (Object.keys(monthData).length > 0) allData[bulan] = monthData;
  }

  return { status: "success", data: allData };
}

// ─── buildFullLogMap ──────────────────────────────────
function buildFullLogMap(ss) {
  var logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  var map = {};
  if (!logSheet || logSheet.getLastRow() < 2) return map;

  var values = logSheet.getRange(2, 1, logSheet.getLastRow() - 1, 7).getValues();
  var tempMap = {};

  values.forEach(function (row) {
    var bulan = (row[1] || "").toString().trim().toUpperCase();
    var unit = (row[2] || "").toString().trim();
    if (!bulan || !unit) return;
    var key = bulan + "||" + unit;
    var ts = row[0] ? new Date(row[0]).getTime() : 0;
    if (!tempMap[key] || ts > tempMap[key].ts) {
      tempMap[key] = {
        ts: ts,
        catatan: (row[5] || "").toString().trim(),
        penilai: (row[4] || "").toString().trim(),
        linkBukti: (row[6] || "").toString().trim()
      };
    }
  });

  Object.keys(tempMap).forEach(function (k) {
    map[k] = { catatan: tempMap[k].catatan, penilai: tempMap[k].penilai, linkBukti: tempMap[k].linkBukti };
  });
  return map;
}

// ─── getLogLinksForBulan ──────────────────────────────
function getLogLinksForBulan(bulan) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  var map = {};
  if (!logSheet || logSheet.getLastRow() < 2) return map;

  var values = logSheet.getRange(2, 1, logSheet.getLastRow() - 1, 7).getValues();
  var tempMap = {};
  values.forEach(function (row) {
    var rowBulan = (row[1] || "").toString().trim().toUpperCase();
    var unit = (row[2] || "").toString().trim();
    if (rowBulan !== bulan || !unit) return;
    var ts = row[0] ? new Date(row[0]).getTime() : 0;
    if (!tempMap[unit] || ts > tempMap[unit].ts) {
      tempMap[unit] = {
        ts: ts,
        catatan: (row[5] || "").toString().trim(),
        penilai: (row[4] || "").toString().trim(),
        linkBukti: (row[6] || "").toString().trim()
      };
    }
  });
  Object.keys(tempMap).forEach(function (k) { map[k] = tempMap[k]; });
  return map;
}

// ─── LOG ACTIVITY ─────────────────────────────────────
function logActivity(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  if (!logSheet) {
    logSheet = ss.insertSheet(LOG_SHEET_NAME);
    var hdr = logSheet.getRange(1, 1, 1, 7);
    hdr.setValues([["Timestamp", "Bulan", "Unit", "Total", "Penilai", "Catatan", "Link Bukti"]]);
    hdr.setFontWeight("bold");
    hdr.setBackground("#1F4E79");
    hdr.setFontColor("#FFFFFF");
    logSheet.setFrozenRows(1);
  }
  logSheet.appendRow([
    new Date(),
    (p.bulan || "").toUpperCase(),
    p.unit || "",
    Number(p.total) || 0,
    p.penilai || "Admin",
    p.catatan || "",
    p.linkBukti || ""
  ]);
}

// ─── HELPERS ──────────────────────────────────────────
function getOrCreateFolder(folderName, parentFolder) {
  var parent = parentFolder || DriveApp.getRootFolder();
  var iter = parent.getFoldersByName(folderName);
  return iter.hasNext() ? iter.next() : parent.createFolder(folderName);
}

function columnToLetter(column) {
  var letter = "", temp;
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = Math.floor((column - temp - 1) / 26);
  }
  return letter;
}