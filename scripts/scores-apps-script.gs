/**
 * 기존 Apps Script doPost 에 아래 분기를 추가하세요.
 * 시트 탭 이름: Scores
 * 1행 헤더: eid | time | court | a | b | updated
 *
 * SECRET 값은 .env 의 FEEDBACK_SECRET 과 동일하게 맞추세요.
 */

var SCORES_SHEET = "Scores";
// var SECRET = "your-secret"; // 기존 feedback 스크립트에 이미 있으면 재사용

function scoresSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SCORES_SHEET);
}

// doPost(e) 안에 추가:
// if (data.kind === "score_save") return json_(saveScore_(data));
// if (data.kind === "score_list") return json_(listScores_(data.eid));
// if (data.kind === "score_delete") return json_(deleteScore_(data));

function formatTimeForKey_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, "Asia/Seoul", "HH:mm");
  }
  var text = String(value || "").trim();
  var match = text.match(/(\d{1,2}):(\d{2})/);
  if (!match) return text;
  return ("0" + match[1]).slice(-2) + ":" + match[2];
}

function formatCourtForKey_(value) {
  return Number(value);
}

function saveScore_(data) {
  var eid = String(data.eid || "").trim();
  var time = formatTimeForKey_(data.time);
  var court = formatCourtForKey_(data.court);
  var a = Number(data.a);
  var b = Number(data.b);
  if (!eid || !time || !court || isNaN(a) || isNaN(b)) {
    return { ok: false, error: "invalid" };
  }

  var sheet = scoresSheet_();
  var rows = sheet.getDataRange().getValues();
  var now = new Date().toISOString();

  for (var i = 1; i < rows.length; i++) {
    if (
      rows[i][0] === eid &&
      formatTimeForKey_(rows[i][1]) === time &&
      formatCourtForKey_(rows[i][2]) === court
    ) {
      sheet.getRange(i + 1, 4, 1, 3).setValues([[a, b, now]]);
      return { ok: true };
    }
  }
  sheet.appendRow([eid, time, court, a, b, now]);
  return { ok: true };
}

function listScores_(eid) {
  eid = String(eid || "").trim();
  if (!eid) return { ok: false, error: "no eid" };

  var sheet = scoresSheet_();
  var rows = sheet.getDataRange().getValues();
  var scores = {};

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] !== eid) continue;
    var key = formatTimeForKey_(rows[i][1]) + "#" + formatCourtForKey_(rows[i][2]);
    scores[key] = { a: Number(rows[i][3]), b: Number(rows[i][4]) };
  }
  return { ok: true, scores: scores };
}

function deleteScore_(data) {
  var eid = String(data.eid || "").trim();
  var time = formatTimeForKey_(data.time);
  var court = formatCourtForKey_(data.court);
  if (!eid || !time || !court) return { ok: false, error: "invalid" };

  var sheet = scoresSheet_();
  var rows = sheet.getDataRange().getValues();
  var deleted = 0;

  for (var i = rows.length - 1; i >= 1; i--) {
    if (
      rows[i][0] === eid &&
      formatTimeForKey_(rows[i][1]) === time &&
      formatCourtForKey_(rows[i][2]) === court
    ) {
      sheet.deleteRow(i + 1);
      deleted += 1;
    }
  }

  if (deleted === 0) {
    return { ok: false, error: "not_found" };
  }
  return { ok: true, deleted: deleted };
}
