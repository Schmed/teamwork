/**
 * dates.gs
 *
 * Utilities for manipulating Dates and DateRange objects.
 *
 * See teamwork.gs for more information.
 */

/**
 * @param {Date} firstDate in the range
 * @param {Number} numDays in the range (including both first & final dates)
 * @returns {DateRange} object describing this range of dates
 */
function DateRange(firstDate, numDays) {
  this.firstDate = firstDate;
  this.numDays = numDays;
}

/**
 * Unit test for DateRange.getFinalDate().
 */
function testDateRange_getFinalDate() {
  Logger.log('Testing DateRange.getFinalDate...');
  
  var firstDate = parseDateString('2020-02-05');
  var numDays = 10;
  var dateRange = new DateRange(firstDate, numDays);
  var expectedFinalDate = parseDateString('2020-02-14');
  var finalDate = dateRange.getFinalDate();
  if (expectedFinalDate.getTime() != finalDate.getTime()) {
    Logger.log(Utilities.formatString('Wrong final date, expected %s, but got %s',
                                      getDateString(expectedFinalDate),
                                      getDateString(finalDate)));
    return false;
  }
  
  Logger.log('Test passed.');
  return true;  
}

DateRange.prototype.getFirstDate = function() {
  return this.firstDate;
}

DateRange.prototype.getFinalDate = function() {
  var result = new Date(this.firstDate.getTime());
  result.setDate(this.firstDate.getDate() + this.numDays - 1);
  return result;
}

/**
 * Unit test for DateRange.toString().
 */
function testDateRange_toString() {
  Logger.log('Testing DateRange.toString...');
  
  if (!checkDateRange_toString('10/1 through 10/5', 
                               new DateRange(parseDateString('2020-10-01'), 5))) {
    return false;
  }
      
  if (!checkDateRange_toString('October', 
                               new DateRange(parseDateString('2020-10-01'), 31))) {
    return false;
  }
      
  if (!checkDateRange_toString('December', 
                               new DateRange(parseDateString('2020-12-01'), 31))) {
    return false;
  }
      
  Logger.log('Test passed.');
  return true;  
}

/**
 * Assert that DateRange.toString() returns the correct String.
 *
 * @param {String} expectedString that should be returned
 * @param {String} dateRange to be described
 */
function checkDateRange_toString(expectedString, dateRange) {
  var dateRangeString = dateRange.toString();
  if (expectedString != dateRangeString) {
    Logger.log(Utilities.formatString('Wrong string value, expected %s, but got %s',
                                      expectedString,
                                      dateRangeString));
    return false;
  }
  return true;
}

/**
 * @returns {String} describing this date range, either:
 *                   "M/d' through 'M/d"
 *                   or, if it exactly spans a month, "MMMM"
 *
 * TODO This is more compact than "yyyy-MM-dd through yyyy-MM-dd" or "MMMM yyyy", 
 *      but is the inconsistency & familiarity worth it?
 */
DateRange.prototype.toString = function() {
  
  // Find the final date of the month containing our first date.
  // Note: Months are 0..11, but days are 1..31,
  // However, the Date "constructor" supports passing 0 in date,
  // which returns the final date of the previous month.
  // You can also pass 12 in month to refer to January of the following year,
  // which for date 0 would return 31 December of this year.
  var finalDateOfMonth = new Date(this.firstDate.getFullYear(),
                                  this.firstDate.getMonth()+1,
                                  0);
  
  // If we span a month exactly, just return the name of that month.
  if  (   (this.firstDate.getDate() == 1)
      &&  (this.getFinalDate().getTime() == finalDateOfMonth.getTime())) {
      return Utilities.formatDate(this.firstDate,
                                  SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 
                                  'MMMM');
  }
  
  // Otherwise, return a String in "M/d' through 'M/d" format.
  return Utilities.formatString('%s through %s',
                                Utilities.formatDate(this.firstDate,
                                                     SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 
                                                     'M/d'),
                                Utilities.formatDate(this.getFinalDate(),
                                                     SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 
                                                     'M/d'));
}

/**
 * Unit test for getPreviousMonthRange().
 */
function testGetPreviousMonthRange() {
  Logger.log('Testing checkGetPreviousMonthRange...');
  
  if (!checkGetPreviousMonthRange('2020-09-01', '2020-10-05')) {
    return false;
  }
      
  if (!checkGetPreviousMonthRange('2020-12-01', '2021-01-31')) {
    return false;
  }
      
  Logger.log('Test passed.');
  return true;  
}

/**
 * Assert that getPreviousMonthRange() returns the correct range.
 *
 * @param {String} expectedFirstDateString of the DateRange returned
 * @param {String} targetDateString in 'yyyy-MM-dd' format
 */
function checkGetPreviousMonthRange(expectedFirstDateString, targetDateString) {
  var targetDate = parseDateString(targetDateString);
  var expectedFirstDate = parseDateString(expectedFirstDateString);
  var expectedFinalDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0);
  var expectedRange = new DateRange(expectedFirstDate, expectedFinalDate.getDate());
  var range = getPreviousMonthRange(targetDate);
  if (expectedRange.toString() != range.toString()) {
    Logger.log(Utilities.formatString('Wrong previous month date range for %s, expected %s, but got %s',
                                      targetDateString,
                                      expectedRange.toString(),
                                      range.toString()));
    return false;
  }
  return true;
}

/**
 * @param {Date} targetDate within the target month (any such date)
 * @returns {DateRange} covering the month preceding the target month
 */
function getPreviousMonthRange(targetDate) {
  var previousMonth = targetDate.getMonth() - 1;
  var previousYear = targetDate.getFullYear();
  if (targetDate.getMonth < 1) {
    previousMonth = 11; // December
    previousYear--;
  }
  
  // Note: Months are 0..11, but days are 1..31,
  // However, the Date "constructor" supports passing 0 in date,
  // which returns the final date of the previous month.
  var previousMonthFinalDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0);
  var previousMonthFirstDate = 
    parseDateString(Utilities.formatString("%s-%s-%s", 
                                           previousYear, 
                                           previousMonth+1, // Month is 0..11
                                           1)); // Date is 1..31
  return new DateRange(previousMonthFirstDate, previousMonthFinalDate.getDate());  
}

/**
 * Unit test for parseDateString(), as well as some Date "constructor" tests.
 */
function testParseDateString() {
  Logger.log('Testing parseDateString...');
  
  if (!checkParseDateString(new Date(2020,9,1), '2020-10-01')) {
    return false;
  }
  
  // Let's also validate some strange support in the Date "constructor":
  
  // First for finding last day of month using date=0, where it
  // normally ranges from 1..31.
  if (!checkParseDateString(new Date(2020,10,0), '2020-10-31')) {
    return false;
  }
  
  // That should also work if it takes us across a year boundary.
  if (!checkParseDateString(new Date(2021,0,0), '2020-12-31')) {
    return false;
  }
  
  // That should even work if we pass month=12, where it normally ranges from 0..11.
  if (!checkParseDateString(new Date(2020,12,0), '2020-12-31')) {
    return false;
  }
  
  // Note that we don't try passing -1month.
  
  Logger.log('Test passed.');
  return true;  
}

/**
 * Assert that parseDateString() parses <code>dateString</code> correctly.
 *
 * @param {Date} expectedDate to be returned
 * @param {String} dateString in 'yyyy-MM-dd' format
 */
function checkParseDateString(expectedDate, dateString) {
  date = parseDateString(dateString);
  if (expectedDate.getTime() != date.getTime()) {
    Logger.log(Utilities.formatString('Wrong date, expected %s, but got %s',
                                      makeDateString(expectedDate),
                                      makeDateString(date)));
    return false;
  }
  return true;
}

/**
 * @param {String} dateString in 'yyyy-MM-dd' format
 * @returns {Date} matching <code>dateString</code>
 *
 * TODO Should this also parse other date formats
 *      (at least what comes back from the Teamwork submission Form?)
 */
function parseDateString(dateString) {
  var fields = dateString.split('-');
  var year = fields[0];
  var month = fields[1];
  var day = fields[2];
  
  return new Date(year, month-1, day);
}

/**
 * Unit test for makeDateString().
 */
function testMakeDateString() {
  Logger.log('Testing makeDateString...');
  
  var date = new Date(2020,11,31);
  var expectedDateString = '2020-12-31';
  var dateString = makeDateString(date);
  
  if (expectedDateString != dateString) {
    Logger.log(Utilities.formatString('Wrong date string, expected %s, but got %s',
                                      expectedDateString,
                                      dateString));
    return false;
  }
  
  Logger.log('Test passed.');
  return true;  
}

/**
 * @param {Date} date to be represented
 * @returns {String} 'yyyy-MM-dd' represention of <code>date</code>
 */
function makeDateString(date) {
  return Utilities.formatDate(date, 
                              SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 
                              'yyyy-MM-dd');
}
