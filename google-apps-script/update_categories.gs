/**
 * Force any updates to the Activity Categories sheet to be
 * reflected in the options presented to any player who
 * subsequently fills out an instance of the form.
 *
 * Note: Execute this periodically by selecting the 
 *       Run>Run Function>updateActivityCategories menu item
 *       above within this Google Apps Script editor UI.
 */
function updateActivityCategories() {
  Logger.log('Updating Teamwork Activity Categories in Record Teamwork form...');
  
  // Get all values from Activity Categories sheet
  var ss = SpreadsheetApp.getActive();
  var categoriesSheet = ss.getSheetByName('Activity Categories');
  var categoriesRange = categoriesSheet.getDataRange();
  var categoryValues = categoriesRange.getValues();

  // Get access to the Duration Category & Other Category form items
  // which might be either drop-down menus (ListItem) or radio buttons
  // (MultipleChoiceItem).
  var form = FormApp.openById(RECORD_TEAMWORK_FORM_ID);
  var item = form.getItemById(EDIT_DURATION_CATEGORY_ITEM_ID);
  var durationCategoryListItem;
  var durationCategoryMcItem;
  if (item.getType() == 'LIST') {
    durationCategoryListItem = item.asListItem();
  } else {
    durationCategoryMcItem = item.asMultipleChoiceItem();
  }
  item = form.getItemById(EDIT_OTHER_CATEGORY_ITEM_ID);
  var otherCategoryListItem;
  var otherCategoryMcItem;
  if (item.getType() == 'LIST') {
    otherCategoryListItem = item.asListItem();
  } else {
    otherCategoryMcItem = item.asMultipleChoiceItem();
  }
  
  // Build the text to put into choice strings of each item.
  // If they're drop-down menus, then just use category names
  // and point values, but if they're radio buttons then
  // there's room for the category description text as well
  // (examples, etc.)
  var durationCategoryOptions = [];
  var otherCategoryOptions = [];
  for (var i = 1; i < categoryValues.length; i++) {
    var categoryRow = categoryValues[i];
    var categoryName = categoryRow[0];
    var categoryNotes = categoryRow[1];
    var categoryUnit = categoryRow[2];
    var categoryPointsPerUnit = categoryRow[3];
    var categoryOption = 
      Utilities.formatString('%s [%s] %s',
                             categoryName,
                             makePointValue(categoryUnit,
                                            categoryPointsPerUnit),
                             otherCategoryMcItem ? ' ' + categoryNotes : '');
    if (categoryUnit.match(DURATION_PATTERN)) {
      Logger.log('Adding duration category option: ' + categoryOption);
      durationCategoryOptions.push(categoryOption);
    } else {
      Logger.log('Adding other category option: ' + categoryOption);
      otherCategoryOptions.push(categoryOption);
    }
  }
  
  // Update the options in the Duration Category form item
  if (durationCategoryListItem) {
    durationCategoryListItem.setChoiceValues(durationCategoryOptions);
  } else if (durationCategoryMcItem) {
    durationCategoryMcItem.setChoiceValues(durationCategoryOptions);
  }
  
  // Update the options in the Other Category form item
  if (otherCategoryListItem) {
    otherCategoryListItem.setChoiceValues(otherCategoryOptions);
  } else if (durationCategoryMcItem) {
    otherCategoryMcItem.setChoiceValues(otherCategoryOptions);
  }
  
  Logger.log('Teamwork Activity Categories update was successful.');
}
