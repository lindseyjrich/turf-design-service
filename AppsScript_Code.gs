// Turf Design Inc. — Statement of Service: PDF Generator, Drive Storage & Email Notification
// Replace your existing Code.gs in Google Apps Script with this entire file.
// After pasting, click Deploy > New Deployment > Web App > Execute as "Me" > Access "Anyone"
// Copy the new deployment URL and update it in the HTML app.

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // 1. Log to Google Sheets (backup index)
    logToSheet(data);

    // 2. Generate PDF server-side
    var pdfBlob = generatePDF(data);

    // 3. Save PDF to Google Drive folder
    const file = saveToDrive(pdfBlob);

    // 4. Email notification with PDF attached
    sendNotification(data, pdfBlob);

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success', fileUrl: file.getUrl() }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'Turf Design Service Logger is active ✓' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════
// GOOGLE DRIVE — Save PDF to folder
// ═══════════════════════════════════════════
function getOrCreateFolder() {
  var folderName = 'Statement of Services';
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}

function saveToDrive(pdfBlob) {
  var folder = getOrCreateFolder();
  return folder.createFile(pdfBlob);
}

// ═══════════════════════════════════════════
// PDF GENERATION — Creates a Google Doc, converts to PDF
// ═══════════════════════════════════════════
function generatePDF(data) {
  var clientName = (data.clientName || 'Service').replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
  var date = data.date || new Date().toISOString().split('T')[0];
  var filename = 'SOS_' + clientName + '_' + date;

  var doc = DocumentApp.create(filename);
  var body = doc.getBody();

  // Page margins
  body.setMarginTop(36);
  body.setMarginBottom(36);
  body.setMarginLeft(50);
  body.setMarginRight(50);

  // ── HEADER — Green bar with logo and title ──
  var headerTable = body.appendTable([['', '']]);
  headerTable.setBorderWidth(0);
  var headerRow = headerTable.getRow(0);

  var leftCell = headerRow.getCell(0);
  var rightCell = headerRow.getCell(1);
  leftCell.setBackgroundColor('#2D6A4F');
  rightCell.setBackgroundColor('#2D6A4F');
  rightCell.setWidth(120);

  // Left cell — Title and address
  leftCell.clear();
  leftCell.setPaddingTop(8);
  leftCell.setPaddingBottom(8);
  leftCell.setPaddingLeft(12);
  leftCell.setPaddingRight(8);
  leftCell.setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER);

  var titlePara = leftCell.appendParagraph('STATEMENT OF SERVICE');
  titlePara.setForegroundColor('#FFFFFF');
  titlePara.setBold(true);
  titlePara.setFontSize(18);
  titlePara.setSpacingAfter(0);

  var compPara = leftCell.appendParagraph('Turf Design Inc. \u2014 Landscape and Irrigation');
  compPara.setForegroundColor('#D8F3DC');
  compPara.setFontSize(9);
  compPara.setSpacingAfter(0);
  compPara.setSpacingBefore(0);

  var addrPara = leftCell.appendParagraph('23770 W 81st Terrace, Shawnee, KS 66227  \u2022  913.764.6531');
  addrPara.setForegroundColor('#B5D8C8');
  addrPara.setFontSize(8);
  addrPara.setSpacingBefore(0);

  if (leftCell.getNumChildren() > 3) leftCell.removeChild(leftCell.getChild(0));

  // Right cell — Logo
  rightCell.clear();
  rightCell.setPaddingTop(8);
  rightCell.setPaddingBottom(8);
  rightCell.setPaddingLeft(4);
  rightCell.setPaddingRight(12);
  rightCell.setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER);
  try {
    var logoFile = DriveApp.getFileById('1NfWEGnY7cKnl3_ciwWs6DPg7Uqs7YcD_');
    var logoBlob = logoFile.getBlob();
    var logoPara = rightCell.appendParagraph('');
    logoPara.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    var logoImg = logoPara.appendInlineImage(logoBlob);
    var origW = logoImg.getWidth();
    var origH = logoImg.getHeight();
    var scale = 90 / origW;
    logoImg.setWidth(Math.round(origW * scale));
    logoImg.setHeight(Math.round(origH * scale));
    if (rightCell.getNumChildren() > 1) rightCell.removeChild(rightCell.getChild(0));
  } catch(e) {
    var lp = rightCell.appendParagraph('TURF DESIGN');
    lp.setForegroundColor('#FFFFFF');
    lp.setBold(true);
    lp.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  }

  body.appendParagraph('').setSpacingAfter(4);

  // ── APPLICATOR INFO ──
  addSectionTitle(body, 'Applicator Information');
  addRow(body, 'Date', data.date);
  addRow(body, 'Start Time', data.startTime);
  addRow(body, 'End Time', data.endTime);
  addRow(body, 'License #', data.licenseNum);
  addRow(body, 'Certified Applicator', data.certApplicator);
  addRow(body, 'Tech Applicator', data.techApplicator);

  // ── CLIENT INFO ──
  addSectionTitle(body, 'Client Information');
  addRow(body, 'Client Name', data.clientName);
  addRow(body, 'Address', data.address);
  addRow(body, 'City / State / Zip', [data.city, data.state, data.zip].filter(Boolean).join(', '));
  addRow(body, 'Phone', data.phone);

  // ── SITE CONDITIONS ──
  addSectionTitle(body, 'Site Conditions');
  addRow(body, 'Temperature', data.temp ? data.temp + '\u00B0F' : '\u2014');
  addRow(body, 'Wind Speed', data.windSpeed ? data.windSpeed + ' mph' : '\u2014');
  addRow(body, 'Wind Direction', data.windDir);

  // ── APPLICATION INFO ──
  addSectionTitle(body, 'Application Information');
  addRow(body, 'Target Location', data.targetLocation);
  addRow(body, 'Pests Controlled', data.pests);
  addRow(body, 'Chemical Types', data.chemTypes);

  // ── PRODUCTS ──
  if (data.products && data.products.length) {
    addSectionTitle(body, 'Products Applied');

    var products = data.products;
    if (typeof products === 'string') {
      var p = body.appendParagraph(products);
      p.setFontSize(9);
      p.setForegroundColor('#1B2D2A');
    } else {
      for (var i = 0; i < products.length; i++) {
        var prod = products[i];
        var title = body.appendParagraph('Product ' + (i + 1) + ': ' + (prod.name || '\u2014'));
        title.setFontSize(9);
        title.setBold(true);
        title.setForegroundColor('#2D6A4F');
        title.setSpacingBefore(6);
        title.setSpacingAfter(2);

        addRow(body, '  Target', prod.target);
        addRow(body, '  Area', prod.area ? prod.area + ' sq ft' : '\u2014');
        addRow(body, '  Rate', prod.rate ? prod.rate + ' oz/lb per 1000 sq ft' : '\u2014');
        addRow(body, '  Total Chemical', prod.totalChem ? prod.totalChem + ' oz/lb' : '\u2014');
        addRow(body, '  Sprayer Type', prod.sprayer);
        addRow(body, '  Less Than Label Rate', prod.lessThanLabel);
      }
    }
  }

  // ── NOTES ──
  if (data.notes) {
    addSectionTitle(body, 'Notes');
    var notesPara = body.appendParagraph(data.notes);
    notesPara.setFontSize(9);
    notesPara.setForegroundColor('#1B2D2A');
  }

  // ── SIGNATURE ──
  if (data.signatureCaptured) {
    addSectionTitle(body, 'Signature');
    var sigNote = body.appendParagraph('\u2713 Employee signature captured digitally at time of submission');
    sigNote.setFontSize(9);
    sigNote.setForegroundColor('#1B2D2A');
  }

  // ── FOOTER ──
  addDivider(body);
  var footer = body.appendParagraph(
    'Generated ' + new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago' }) +
    ' \u2014 Turf Design Inc. Statement of Service'
  );
  footer.setFontSize(8);
  footer.setForegroundColor('#8FABA9');
  footer.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  // Save and convert to PDF
  doc.saveAndClose();

  var docFile = DriveApp.getFileById(doc.getId());
  var pdfBlob = docFile.getAs('application/pdf').setName(filename + '.pdf');

  // Move temp doc to Statement of Services folder (keeps Drive clean)
  try {
    var folder = getOrCreateFolder();
    folder.addFile(docFile);
    DriveApp.getRootFolder().removeFile(docFile);
  } catch(e) { /* leave in root if move fails */ }

  return pdfBlob;
}

// ── Formatting helpers ──
function addSectionTitle(body, title) {
  var p = body.appendParagraph(title.toUpperCase());
  p.setFontSize(10);
  p.setBold(true);
  p.setForegroundColor('#2D6A4F');
  p.setSpacingBefore(10);
  p.setSpacingAfter(4);
}

function addRow(body, label, value) {
  var p = body.appendParagraph('');
  var labelText = p.appendText(label + ':  ');
  labelText.setFontSize(9);
  labelText.setBold(true);
  labelText.setForegroundColor('#4A6362');
  var valueText = p.appendText(String(value || '\u2014'));
  valueText.setFontSize(9);
  valueText.setBold(false);
  valueText.setForegroundColor('#1B2D2A');
  p.setSpacingAfter(1);
  p.setSpacingBefore(0);
  p.setLineSpacing(1.2);
}

function addDivider(body) {
  var d = body.appendParagraph('\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501');
  d.setFontSize(6);
  d.setForegroundColor('#D4E4E0');
  d.setSpacingBefore(8);
  d.setSpacingAfter(4);
}

// ═══════════════════════════════════════════
// EMAIL NOTIFICATION — Send PDF to recipients
// ═══════════════════════════════════════════
function sendNotification(data, pdfBlob) {
  var recipients = 'lbreidenthal@turfdesigninc.com,cbeilman@turfdesigninc.com';
  var subject = 'New Statement of Service: ' + (data.clientName || 'Unknown') + ' - ' + (data.date || 'No Date');

  var emailBody = 'A new Statement of Service has been submitted.\n\n';
  emailBody += 'Client: ' + (data.clientName || 'N/A') + '\n';
  emailBody += 'Date: ' + (data.date || 'N/A') + '\n';
  emailBody += 'Applicator: ' + (data.certApplicator || 'N/A') + '\n';
  emailBody += 'Tech: ' + (data.techApplicator || 'N/A') + '\n';
  emailBody += 'Address: ' + [data.address, data.city, data.state, data.zip].filter(Boolean).join(', ') + '\n';
  emailBody += 'Target Location: ' + (data.targetLocation || 'N/A') + '\n\n';
  emailBody += 'The full Statement of Service PDF is attached.\n';
  emailBody += 'This record has also been saved to the "Statement of Services" folder in Google Drive.\n\n';
  emailBody += '\u2014 Turf Design Inc. Service App';

  MailApp.sendEmail({
    to: recipients,
    subject: subject,
    body: emailBody,
    attachments: [pdfBlob],
    name: 'Turf Design Inc. Service App'
  });
}

// ═══════════════════════════════════════════
// GOOGLE SHEETS — Backup log
// ═══════════════════════════════════════════
function logToSheet(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Timestamp', 'Date', 'Start Time', 'End Time', 'License #',
      'Certified Applicator', 'Tech Applicator', 'Client Name', 'Address',
      'City', 'State', 'Zip', 'Phone', 'Temperature (\u00B0F)', 'Wind Speed',
      'Wind Direction', 'Target Location', 'Pests Controlled', 'Chemical Types',
      'Products Applied', 'Photo Count', 'Notes', 'PDF Status'
    ]);
    var headerRange = sheet.getRange(1, 1, 1, 23);
    headerRange.setBackground('#2D6A4F');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setFontSize(10);
    sheet.setFrozenRows(1);
  }

  var productsStr = '';
  if (data.products && Array.isArray(data.products)) {
    productsStr = data.products.map(function(p, i) {
      return (i + 1) + '. ' + p.name +
        ' | Target: ' + (p.target || '\u2014') +
        ' | Area: ' + (p.area || '\u2014') + ' sqft' +
        ' | Rate: ' + (p.rate || '\u2014') + ' oz/1000sqft';
    }).join('\n');
  } else if (typeof data.products === 'string') {
    productsStr = data.products;
  }

  sheet.appendRow([
    new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }),
    data.date || '', data.startTime || '', data.endTime || '',
    data.licenseNum || '', data.certApplicator || '', data.techApplicator || '',
    data.clientName || '', data.address || '', data.city || '',
    data.state || '', data.zip || '', data.phone || '',
    data.temp || '', data.windSpeed || '', data.windDir || '',
    data.targetLocation || '', data.pests || '', data.chemTypes || '',
    productsStr, data.photoCount || 0, data.notes || '', 'PDF Generated & Emailed'
  ]);

  var lastRow = sheet.getLastRow();
  if (lastRow % 2 === 0) {
    sheet.getRange(lastRow, 1, 1, 23).setBackground('#F0FAF4');
  }
  sheet.getRange(lastRow, 20).setWrap(true);
}

// ═══════════════════════════════════════════
// TEST — Run this manually from the editor to verify everything works
// ═══════════════════════════════════════════
function testSubmission() {
  var testData = {
    date: '2026-03-25',
    startTime: '8:00 AM',
    endTime: '10:00 AM',
    licenseNum: '5830',
    certApplicator: 'Test Applicator',
    techApplicator: 'Test Tech',
    clientName: 'TEST CLIENT',
    address: '123 Test St',
    city: 'Shawnee',
    state: 'KS',
    zip: '66216',
    phone: '913-555-1234',
    temp: '72',
    windSpeed: '5',
    windDir: 'N',
    targetLocation: 'Front lawn',
    pests: 'Dandelions',
    chemTypes: 'Herbicide',
    notes: 'This is a test submission',
    products: [
      { name: 'LESCO THREE-WAY SELECTIVE HERBICIDE', target: 'Turf', area: '5000', rate: '1.5', totalChem: '7.5', sprayer: 'Z Sprayer', lessThanLabel: 'No', gallons: '1.72 gal' }
    ],
    photoCount: 0,
    signatureCaptured: true
  };

  Logger.log('Starting test...');

  // Test PDF generation
  Logger.log('Generating PDF...');
  var pdfBlob = generatePDF(testData);
  Logger.log('PDF generated: ' + pdfBlob.getName());

  // Test saving to Drive
  Logger.log('Saving to Drive...');
  var file = saveToDrive(pdfBlob);
  Logger.log('Saved to Drive: ' + file.getUrl());

  // Test email
  Logger.log('Sending email...');
  sendNotification(testData, pdfBlob);
  Logger.log('Email sent!');

  // Test sheets logging
  Logger.log('Logging to sheet...');
  logToSheet(testData);
  Logger.log('Logged to sheet!');

  Logger.log('ALL TESTS PASSED');
}
