const FEEDBACK_SHEET = "시트1";
const EVENT_SHEET = "이벤트로그";
const SCORES_SHEET = "점수입력";
const ROSTER_SHEET = "선수등록";

// .env 의 FEEDBACK_SECRET 과 동일하게 설정
const SECRET = "your-secret-here";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // 봇 스팸 방지 (웹사이트에서 website 필드 보내는 경우)
    if (data.website) {
      return jsonResponse({ ok: true });
    }

    if (data.kind === "event") {
      return handleEvent(data);
    }

    if (data.kind === "score_save") {
      const secretError = assertSecret_(data);
      if (secretError) return secretError;
      return handleScoreSave(data);
    }

    if (data.kind === "score_list") {
      const secretError = assertSecret_(data);
      if (secretError) return secretError;
      return handleScoreList(data);
    }

    if (data.kind === "score_delete") {
      const secretError = assertSecret_(data);
      if (secretError) return secretError;
      return handleScoreDelete(data);
    }

    if (data.kind === "roster_save") {
      const secretError = assertSecret_(data);
      if (secretError) return secretError;
      return handleRosterSave(data);
    }

    if (data.kind === "roster_get") {
      const secretError = assertSecret_(data);
      if (secretError) return secretError;
      return handleRosterGet(data);
    }

    return handleFeedback(data);
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function assertSecret_(data) {
  if (!SECRET) return null;
  if (data.secret !== SECRET) {
    return jsonResponse({ ok: false, error: "unauthorized" });
  }
  return null;
}

function formatTimeForKey_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, "Asia/Seoul", "HH:mm");
  }
  const text = String(value || "").trim();
  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (!match) return text;
  return ("0" + match[1]).slice(-2) + ":" + match[2];
}

function formatCourtForKey_(value) {
  return Number(value);
}

function normalizeEid_(value) {
  return String(value == null ? "" : value).trim();
}

function isSameEid_(left, right) {
  return normalizeEid_(left) === normalizeEid_(right);
}

function handleFeedback(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEEDBACK_SHEET);
  if (!sheet) {
    return jsonResponse({ ok: false, error: "Feedback sheet not found" });
  }

  sheet.appendRow([
    formatNow(),
    data.type || "",
    data.content || "",
    data.contact || "",
    data.pageUrl || "",
    data.note || "",
  ]);

  return jsonResponse({ ok: true });
}

function handleEvent(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(EVENT_SHEET);
  if (!sheet) {
    return jsonResponse({ ok: false, error: "Event sheet not found" });
  }

  const meta =
    data.meta === undefined || data.meta === null || data.meta === ""
      ? ""
      : typeof data.meta === "string"
        ? data.meta
        : JSON.stringify(data.meta);

  sheet.appendRow([
    formatNow(),
    data.event || "",
    data.pageUrl || "",
    data.referrer || "",
    meta,
    data.ip || "",
    data.device || "",
    data.platform || "",
  ]);

  return jsonResponse({ ok: true });
}

function handleScoreSave(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SCORES_SHEET);
  if (!sheet) {
    return jsonResponse({ ok: false, error: "Scores sheet not found" });
  }

  const eid = String(data.eid || "").trim();
  const time = formatTimeForKey_(data.time);
  const court = formatCourtForKey_(data.court);
  const a = Number(data.a);
  const b = Number(data.b);
  const dfPayload = String(data.df || "").trim();

  if (!eid || !time || !court || isNaN(a) || isNaN(b)) {
    return jsonResponse({ ok: false, error: "invalid" });
  }

  const rows = sheet.getDataRange().getValues();
  const now = new Date().toISOString();
  let updated = false;

  for (let i = 1; i < rows.length; i++) {
    if (
      isSameEid_(rows[i][0], eid) &&
      formatTimeForKey_(rows[i][1]) === time &&
      formatCourtForKey_(rows[i][2]) === court
    ) {
      sheet.getRange(i + 1, 4, 1, 4).setValues([[a, b, dfPayload, now]]);
      updated = true;
      break;
    }
  }

  if (!updated) {
    sheet.appendRow([eid, time, court, a, b, dfPayload, now]);
  }

  return jsonResponse({ ok: true });
}

function handleScoreList(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SCORES_SHEET);
  if (!sheet) {
    return jsonResponse({ ok: false, error: "Scores sheet not found" });
  }

  const eid = String(data.eid || "").trim();
  if (!eid) {
    return jsonResponse({ ok: false, error: "no eid" });
  }

  const rows = sheet.getDataRange().getValues();
  const scores = {};

  for (let i = 1; i < rows.length; i++) {
    if (!isSameEid_(rows[i][0], eid)) continue;
    const key = formatTimeForKey_(rows[i][1]) + "#" + formatCourtForKey_(rows[i][2]);
    const score = { a: Number(rows[i][3]), b: Number(rows[i][4]) };
    const dfPayload = String(rows[i][5] || "").trim();
    if (dfPayload.startsWith("{")) {
      try {
        score.df = JSON.parse(dfPayload);
      } catch (err) {
        // ignore invalid df payload
      }
    }
    scores[key] = score;
  }

  return jsonResponse({ ok: true, scores: scores });
}

function handleScoreDelete(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SCORES_SHEET);
  if (!sheet) {
    return jsonResponse({ ok: false, error: "Scores sheet not found" });
  }

  const eid = String(data.eid || "").trim();
  const time = formatTimeForKey_(data.time);
  const court = formatCourtForKey_(data.court);

  if (!eid || !time || !court) {
    return jsonResponse({ ok: false, error: "invalid" });
  }

  const rows = sheet.getDataRange().getValues();
  let deleted = 0;

  for (let i = rows.length - 1; i >= 1; i--) {
    if (
      isSameEid_(rows[i][0], eid) &&
      formatTimeForKey_(rows[i][1]) === time &&
      formatCourtForKey_(rows[i][2]) === court
    ) {
      sheet.deleteRow(i + 1);
      deleted += 1;
    }
  }

  if (deleted === 0) {
    return jsonResponse({ ok: false, error: "not_found" });
  }

  return jsonResponse({ ok: true, deleted: deleted });
}

function handleRosterSave(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ROSTER_SHEET);
  if (!sheet) {
    return jsonResponse({ ok: false, error: "Roster sheet not found" });
  }

  const eid = String(data.eid || "").trim();
  const payload =
    typeof data.roster === "string" ? data.roster : JSON.stringify(data.roster || {});

  if (!eid || !payload) {
    return jsonResponse({ ok: false, error: "invalid" });
  }

  const rows = sheet.getDataRange().getValues();
  const now = new Date().toISOString();
  let updated = false;

  for (let i = 1; i < rows.length; i++) {
    if (isSameEid_(rows[i][0], eid)) {
      sheet.getRange(i + 1, 2, 1, 2).setValues([[payload, now]]);
      updated = true;
      break;
    }
  }

  if (!updated) {
    sheet.appendRow([eid, payload, now]);
  }

  return jsonResponse({ ok: true });
}

function handleRosterGet(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ROSTER_SHEET);
  if (!sheet) {
    return jsonResponse({ ok: false, error: "Roster sheet not found" });
  }

  const eid = String(data.eid || "").trim();
  if (!eid) {
    return jsonResponse({ ok: false, error: "no eid" });
  }

  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (!isSameEid_(rows[i][0], eid)) continue;

    const payload = String(rows[i][1] || "").trim();
    if (!payload) {
      return jsonResponse({ ok: true, roster: null });
    }

    try {
      return jsonResponse({ ok: true, roster: JSON.parse(payload) });
    } catch (err) {
      return jsonResponse({ ok: false, error: "invalid_roster" });
    }
  }

  return jsonResponse({ ok: true, roster: null });
}

function formatNow() {
  return Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
