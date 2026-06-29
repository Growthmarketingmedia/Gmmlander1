/**
 * GMM Lead Funnel -> Google Sheet
 * Appends every form submission as a new row.
 *
 * SETUP (one time):
 * 1. Create a Google Sheet.
 * 2. Extensions -> Apps Script. Delete any code, paste THIS file.
 * 3. Click Deploy -> New deployment -> type "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 *    Deploy, authorize, and COPY the Web app URL (ends in /exec).
 * 4. Send that URL to your dev -> it goes in script.js CONFIG.SHEET_WEBHOOK_URL.
 *
 * The header row is created automatically on the first submission.
 */

var HEADERS = [
  'timestamp', 'variant', 'zip', 'service', 'problem',
  'jobs_per_month', 'revenue', 'name', 'company', 'phone', 'email', 'terms', 'source'
];

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
    }

    var row = HEADERS.map(function (h) {
      if (h === 'timestamp') return new Date();
      return (data[h] !== undefined && data[h] !== null) ? data[h] : '';
    });
    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// lets you open the /exec URL in a browser to confirm it's deployed
function doGet() {
  return ContentService.createTextOutput('GMM lead funnel endpoint is live.');
}
