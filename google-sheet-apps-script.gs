/**
 * GMM Lead Funnel -> Google Sheet
 * Appends every form submission as a new row to the "form export" sheet.
 *
 * Sheet ID: 1PLzjsfzS5UUTmHsIlI54N8JZqPcT-aqi7D4Kt2D8xG0
 *
 * DEPLOY (one time):
 *   Deploy -> New deployment -> Web app
 *     Execute as: Me
 *     Who has access: Anyone
 *   Copy the /exec URL -> paste into script.js CONFIG.SHEET_WEBHOOK_URL
 * The header row is created automatically on the first submission.
 */

var SHEET_ID = '1PLzjsfzS5UUTmHsIlI54N8JZqPcT-aqi7D4Kt2D8xG0';
var HEADERS = [
  'timestamp', 'variant', 'zip', 'service', 'problem', 'jobs_per_month',
  'invest', 'revenue', 'name', 'company', 'phone', 'email', 'terms', 'source'
];

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    var data = {};
    if (e && e.postData && e.postData.contents) { data = JSON.parse(e.postData.contents); }
    if (sheet.getLastRow() === 0) { sheet.appendRow(HEADERS); }
    var row = HEADERS.map(function (h) {
      if (h === 'timestamp') return new Date();
      return (data[h] !== undefined && data[h] !== null) ? data[h] : '';
    });
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput('GMM lead funnel endpoint is live.');
}
