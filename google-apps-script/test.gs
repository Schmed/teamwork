/**
 * test.gs
 *
 * Entry point for running all unit tests, plus code to log environment properties.
 *
 * See teamwork.gs for more information.
 */

/**
 * Run a few unit tests on some of the functions herein.
 
 * Note: Execute this by selecting the Run>Run Function>test menu item
 *       above within this Google Apps Script editor UI.
 * Note: This runs neither testSendEmail nor testSendPlayerSummary, 
 *       so you must run those separately.
 */
function test() {
  Logger.log('Checking that all required constants are defined...');

  Logger.log('RECORD_TEAMWORK_FORM_BASE_URL: ' + RECORD_TEAMWORK_FORM_BASE_URL);
  Logger.log('RECORD_TEAMWORK_FORM_ID: ' + RECORD_TEAMWORK_FORM_ID);
  Logger.log('EDIT_DURATION_CATEGORY_ITEM_ID: ' + EDIT_DURATION_CATEGORY_ITEM_ID);
  Logger.log('EDIT_OTHER_CATEGORY_ITEM_ID: ' + EDIT_OTHER_CATEGORY_ITEM_ID);
  Logger.log('EMAIL_ITEM_ID: ' + EMAIL_ITEM_ID);
  Logger.log('FIRST_NAME_ITEM_ID: ' + FIRST_NAME_ITEM_ID);
  Logger.log('LAST_NAME_ITEM_ID: ' + LAST_NAME_ITEM_ID);
  Logger.log('DATE_PERFORMED_ITEM_ID: ' + DATE_PERFORMED_ITEM_ID);
  Logger.log('DESCRIPTION_ITEM_ID: ' + DESCRIPTION_ITEM_ID);

  Logger.log('Running teamwork.gs unit tests...');
  var isAllTestsPassed = true;
  
  isAllTestsPassed = isAllTestsPassed && testMakeDateString();
  isAllTestsPassed = isAllTestsPassed && testParseDateString();
  isAllTestsPassed = isAllTestsPassed && testDateRange_getFinalDate();
  isAllTestsPassed = isAllTestsPassed && testDateRange_toString();
  isAllTestsPassed = isAllTestsPassed && testGetPreviousMonthRange();
  isAllTestsPassed = isAllTestsPassed && testActivityChoiceParsing();
  isAllTestsPassed = isAllTestsPassed && testGetAwardedPoints();
  isAllTestsPassed = isAllTestsPassed && testMakePreFilledFormUrl();
  isAllTestsPassed = isAllTestsPassed && testMakePointValue();
  isAllTestsPassed = isAllTestsPassed && testMakePlayerSummary();
  
  if (isAllTestsPassed) {
    Logger.log('All unit tests passed!');
  }
}

/**
 * Log a bunch of technical information about the form associated with our sheet
 */
function onOpen() {
  Logger.log('Running onOpen()...');
  var formURL = SpreadsheetApp.getActiveSpreadsheet().getFormUrl();
  Logger.log('Spreadsheet associated with form with URL: ' + formURL);
  var form = FormApp.openById(RECORD_TEAMWORK_FORM_ID);
  var items = form.getItems();
  for (var i in items) {
    var item = items[i];
    Utilities.formatString('Item %s of type %s has ID: %d',
                           item.getTitle(),
                           item.getType(),
                           item.getId());
  }
}
