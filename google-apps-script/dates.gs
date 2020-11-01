/**
 * dates.gs
 *
 * Utilities for manipulating Dates and DateRange objects.
 *
 * See teamwork.gs for more information.
 */

function DateRange(firstDate, numDays) {
  this.firstDate = firstDate;
  this.numDays = numDays;
}

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
      
  Logger.log('Test passed.');
  return true;  
}

function checkDateRange_toString(expectedString,
                                 dateRange) {
  var dateRangeString = dateRange.toString();
  if (expectedString != dateRangeString) {
    Logger.log(Utilities.formatString('Wrong string value, expected %s, but got %s',
                                      expectedString,
                                      dateRangeString));
    return false;
  }
  return true;
}

DateRange.prototype.toString = function() {
  var finalDate = this.getFinalDate();
  var lastMonthDate = new Date(this.firstDate.getTime());
  lastMonthDate.setMonth(this.firstDate.getMonth()+1);
  lastMonthDate.setDate(0);
  
  if  (   (this.firstDate.getDate() == 1)
      &&  (finalDate.getTime() == lastMonthDate.getTime())) {
      return Utilities.formatDate(this.firstDate,
                                  SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 
                                  'MMMM');
  }
  return Utilities.formatString('%s through %s',
                                Utilities.formatDate(this.firstDate,
                                                     SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 
                                                     'M/d'),
                                Utilities.formatDate(finalDate,
                                                     SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 
                                                     'M/d'));
}

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

function checkGetPreviousMonthRange(expectedFirstDateString, targetDateString) {
  var targetDate = parseDateString(targetDateString);
  var expectedFirstDate = parseDateString(expectedFirstDateString);
  var expectedLastDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0);
  var expectedRange = new DateRange(expectedFirstDate, expectedLastDate.getDate());
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

function getPreviousMonthRange(targetDate) {
  var previousMonth = targetDate.getMonth() - 1;
  var previousYear = targetDate.getFullYear();
  if (targetDate.getMonth < 1) {
    previousMonth = 11;
    previousYear--;
  }
  var previousMonthLastDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0);
  var previousMonthFirstDate = 
    parseDateString(Utilities.formatString("%s-%s-%s", 
                                           previousYear, 
                                           previousMonth+1,
                                           1));
  return new DateRange(previousMonthFirstDate, previousMonthLastDate.getDate());  
}

function testParseDateString() {
  Logger.log('Testing parseDateString...');
  
  if (!checkParseDateString(new Date(2020,9,1), '2020-10-01')) {
    return false;
  }
  
  // This is also verifying some support in the Date constructor,
  // first for finding last day of month using &date=0, where it
  // normally ranges from 1..31.
  if (!checkParseDateString(new Date(2020,10,0), '2020-10-31')) {
    return false;
  }
  
  // It should also work if it takes us across a year boundary.
  if (!checkParseDateString(new Date(2021,0,0), '2020-12-31')) {
    return false;
  }
  
  // Note that we don't try passing -1 or 12 in month.
  
  Logger.log('Test passed.');
  return true;  
}

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

function parseDateString(dateString) {
  var fields = dateString.split('-');
  var year = fields[0];
  var month = fields[1];
  var day = fields[2];
  
  return new Date(year, month-1, day);
}

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

function makeDateString(date) {
  return Utilities.formatDate(date, 
                              SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 
                              'yyyy-MM-dd');
  
}
