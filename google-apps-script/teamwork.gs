/**
 * teamwork.gs
 *
 * This script manages the interaction between the Record Teamwork form
 * and the ATC Teamwork DB spreadsheet.  In particular:
 *
 * onFormSubmit(e):
 * A form submission automatically adds a row to the Teamwork sheet,
 * but the data is validated & normalized (somewhat).  A confirmation
 * or error email is also sent to the player.
 *
 * updateActivityCategories():
 * The coaches can make changes to the Activity Categories sheet,
 * and then manually run this function to force these updates
 * to be reflected in the options available to the next player
 * who subsequently fills out an instance of the form.
 * (Use the Run>Run Function>updateActivityCategories menu item
 * above within this Google Apps Script editor UI.)
 *
 * See:  https://developers.google.com/apps-script/quickstart/forms
 *
 * TODO Other administrative features?
 */

// Image to embed in email indicating successful form submission
SUBMIT_SUCCESS_IMAGE_URL = 'https://media.giphy.com/media/26tPcgtbhhbU88U2A/giphy.gif';

// Image to embed in email indicating failed form submission
SUBMIT_FAILURE_IMAGE_URL = 'https://media.giphy.com/media/l41YsxKKVYnucStag/giphy.gif';

// 1-based spreadsheet Range coordinates for the cells we may need to modify
// in the Teamwork sheet
// Note: when accessing values array, subtract one from each of the following.
DATE_PERFORMED_COLUMN = 5;
DURATION_CATEGORY_COLUMN = 6;
DURATION_COLUMN = 7;
OTHER_CATEGORY_COLUMN = 8;
DESCRIPTION_COLUMN = 9;
POINTS_AWARDED_COLUMN = 10; // Left blank by form itself; set by script

// 1-based spreadsheet Range coordinates for the cells we read from
// the 'Points data' sheet
// Note: when accessing values array, subtract one from each of the following.
PD_DATE_PERFORMED_COLUMN = 5;
PD_DURATION_COLUMN = 7;
PD_DESCRIPTION_COLUMN = 9;
PD_POINTS_AWARDED_COLUMN = 10;
PD_CANONICAL_EMAIL_COLUMN = 11;
PD_CANONICAL_PLAYER_NAME_COLUMN = 12;
PD_CATEGORY_COLUMN = 13;

// Used both for defining the denominator of Duration Category points/unit
// and for the choices in the Duration form item. 
DURATION_PATTERN = /^([0-9.]+) (minute|hour)s?(?: .+)?$/;

// NOTE: In addition to the constants above, the constants listed within
// https://github.com/Schmed/teamwork/blob/master/google-apps-script/form_acccess_template.gs
// must also be defined somewhere (e.g., in your own custom form_access.gs
// which you add to your Google Apps Script project, but maintain outside
// of source control for security reasons).

/**
 * Validate the row of values just added to the Teamwork spreadsheet by
 * a Record Teamwork form submission.
 * @param {Event} e associated with the form submission
 *
 * Note: This is the main entry point to this script, the target of
 *       an SpreadsheetTriggerBuilder.onFormSubmit() Trigger 
 *       from the Record Teamwork form to our spreadsheet.
 *
 * See:  https://developers.google.com/apps-script/reference/script/spreadsheet-trigger-builder#onFormSubmit()
 *       https://developers.google.com/apps-script/quickstart/forms
 */
function onFormSubmit(e) {
  var warning = '';
  var error = '';

  // Get access to the range and values from the Teamwork sheet that was just
  // added by the form submission
  var ss = SpreadsheetApp.getActive();
  var teamworkSheet = ss.getSheetByName('Teamwork');
  var newTeamworkRange = teamworkSheet.getRange(e.range.getRow(), 
                                                e.range.getColumn(),
                                                e.range.getNumRows(),
                                                e.range.getNumColumns()+1); // include pointsAwarded
  var newTeamworkValues = newTeamworkRange.getValues();
  
  // Load the values entered into the form by the user
  var playerEmailAddress = e.namedValues['Email'].toString();
  var playerFirstName = e.namedValues['Player first name'].toString();
  var playerLastName = e.namedValues['Player last name'].toString();
  var datePerformed = e.namedValues['Date performed'].toString();
  var durationCategoryChoice = e.namedValues['Duration Activity Category'].toString();
  var durationChoice = e.namedValues['Duration'].toString();
  var otherCategoryChoice = e.namedValues['Other Activity Category'].toString();

  // Silently ignore the Duration Activity Category if the player
  // probably didn't mean to select it.
  if  (   (durationCategoryChoice) 
      &&  (durationChoice)
      &&  (durationChoice.match(/did not perform/i))) {
    durationCategoryChoice = ''
    durationChoice = '';
  }
  
  // Complain if the player forgot to choose an Activity Category.
  if  (   (!durationCategoryChoice)
      &&  (!otherCategoryChoice)) {
    error += '\nYou forgot to select an Activity Category.';
  }
  
  // Complain if the player forgot to choose a duration.
  if  (   (durationCategoryChoice)
      &&  (!durationChoice)) {
    if (otherCategoryChoice) {
      warning += '\nYour Duration Activity Category selection was ignored (no duration): \n' + durationCategoryChoice;
      durationCategoryChoice = '';
    } else {
      error += '\nYou forgot to select the duration for your Duration Activity Category selection: \n' + durationCategoryChoice;
    }
  }
  
  // Complain if the player entered two activites
  if  (   (durationCategoryChoice)
      &&  (otherCategoryChoice)) {
    error += '\nYou entered both a Duration Catgeory: \n' + durationCategoryChoice;
    error += '\nand an Other Category: \n' + otherCategoryChoice;
    error += '\n\nPlease go back and enter the single activity you actually performed.';
    error += '\nIf you did both, then please go back and enter each via a separate form submission.';
  }

  // Parse the category choice to retrieve the category name & pointValue,
  // then compute the points (given the duration choice).
  var durationCategoryName;
  var otherCategoryName;
  var pointsAwarded = 0;
  var categoryChoice = durationCategoryChoice ? durationCategoryChoice : otherCategoryChoice;
  if (categoryChoice) {
    var activityChoiceFormPattern = /^([^[]+) \[([^\]]+)\](?: .+)?$/;
    var fields = activityChoiceFormPattern.exec(categoryChoice);
    if ((!fields) || (fields.length != 3)) {
      error += '\nInternal error! Could not match category choice pattern to: ' + categoryChoice;
      MailApp.sendEmail({
        to: 'Schmed@TransPac.com', 
        subject: 'Internal error in teamwork.gs!', 
        body: error,
      });  
    } else {
      var pointValue = fields[2];
      if (durationCategoryChoice) {
        durationCategoryName = fields[1];
        pointsAwarded = getAwardedPoints(pointValue, durationChoice);
      } else if (otherCategoryChoice) {
        otherCategoryName = fields[1];
        pointsAwarded = getAwardedPoints(pointValue);
      }
    }
  }

  // Make sure the date is not in the future
  // (and silently replace year "0020" with "2020").
  var today = new Date();
  var fields = datePerformed.split('/');
  var year = Number(fields[2]);
  if (year < 100) {
    year = year + 2000;
  }
  var performedDate = new Date(year, fields[0] - 1, fields[1]);
  if (performedDate.getTime() > today.getTime()) {
    error += '\nThe date you entered (' + datePerformed + ') is in the future.';
    error += '\nNo borrowing points against future Teamwork!';
  }
  
  // Include any error and/or warning info in the description column
  // Note: This form item has an awkward/unstable name, complicating
  // the use of e.namedValues()[], so we just load this value from
  // the values that were copied from the spreadsheet itself.
  var userDescription = newTeamworkValues[0][DESCRIPTION_COLUMN-1];
  var description = userDescription;
  if (error) {
    description = Utilities.formatString('Error! %s\n%s', error, description);
    pointsAwarded = 0;
  }
  if (warning) {
    description += '\nWarning! ' + warning;
  }
  newTeamworkValues[0][8] = description;
 
  // Update the new Teamwork row in the spreadsheet with any changes 
  // we made (including any warning/error logging)
  //
  // TODO Move data to a separate sheet for errors?
  //
  newTeamworkValues[0][DATE_PERFORMED_COLUMN-1] =
        Utilities.formatDate(performedDate, 
                             SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 
                             "MM/dd/yyyy");
  newTeamworkValues[0][DURATION_CATEGORY_COLUMN-1] = durationCategoryName;
  newTeamworkValues[0][DURATION_COLUMN-1] = durationChoice;
  newTeamworkValues[0][OTHER_CATEGORY_COLUMN-1] = otherCategoryName;
  newTeamworkValues[0][DESCRIPTION_COLUMN-1] = description;
  newTeamworkValues[0][POINTS_AWARDED_COLUMN-1] = pointsAwarded;
  newTeamworkRange.setValues(newTeamworkValues);
  
  // Finally, send the player an email summarizing the results
  // from validating the form data s/he submitted:
  
  // If there was an error, the email describes the problem.
  // Include a link back to the form, but with the email, player name,
  // date, and description fields already filled out.
  if (error) {
    var emailBody = '\n\nUnfortunately, there was a problem with the Teamwork you submitted:';
    emailBody += '\n' + error;
    emailBody += '\n\nUse this link to go back and fix the problem:';
    var preFilledFormUrl = 
      makePreFilledFormUrl(playerEmailAddress, 
                           playerFirstName, 
                           playerLastName, 
                           datePerformed, 
                           userDescription);
    sendEmail(playerEmailAddress,
              'Teamwork submission error',
              emailBody,
              SUBMIT_FAILURE_IMAGE_URL,
              {  
                linkText: 'Fix Teamwork',
                url: preFilledFormUrl,
              });
    
  // Otherwise, the email summarizes the Teamwork s/he just added.
  // Include a link back to the form, but with the email & player name
  // fields already filled out.
  } else {
    var emailSubject = 
      Utilities.formatString('Thanks for your Teamwork%s!', playerFirstName ? ', ' + playerFirstName : '');
    var emailBody = '\n\nYou successfully recorded the following Teamwork:';
    if (durationCategoryChoice) {
      emailBody += '\nActivity: ' + durationCategoryName;
      emailBody += '\nDuration: ' + durationChoice;
    } else {
      emailBody += '\nActivity: ' + otherCategoryName;
    }
    emailBody += '\nDate Performed: ' + datePerformed;
    if (userDescription) {
      emailBody += '\nDetails: ' + userDescription;
    }
    emailBody += '\nPoints: ' + pointsAwarded;
    if (warning) {
      emailBody += '\n\nWarning! ' + warning;
    }
    emailBody += '\n\nUse one of the links below next time to skip entering the player email & name:';
    var today = new Date();
    var tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate()+1);
    var tomorrowDateString = 
      Utilities.formatString('%d/%d/%d',
                             tomorrow.getMonth()+1,   // Date.month is 0-based
                             tomorrow.getDate(),      // Date.day is 1-based
                             tomorrow.getFullYear()); // Date.year is 1-based
    var preFilledFormUrlTomorrow = 
      makePreFilledFormUrl(playerEmailAddress, 
                           playerFirstName, 
                           playerLastName, 
                           tomorrowDateString, 
                           '');
    var preFilledFormUrl = 
      makePreFilledFormUrl(playerEmailAddress, 
                           playerFirstName, 
                           playerLastName, 
                           '', 
                           '');
    var preFilledFormLinkText = 
      playerFirstName ? Utilities.formatString('More Teamwork for %s', playerFirstName) : 'Enter more Teamwork';
    var preFilledFormTomorrowLinkText =
      Utilities.formatString('%s tomorrow (%s)',
                             preFilledFormLinkText,
                             Utilities.formatDate(tomorrow, 
                                                  SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 
                                                  "EEEEE, d MMMMM yyyy"));
    sendEmail(playerEmailAddress,
              emailSubject,
              emailBody,
              SUBMIT_SUCCESS_IMAGE_URL,
              {
                linkText: preFilledFormTomorrowLinkText,
                url: preFilledFormUrlTomorrow,
              },
              {
                linkText: preFilledFormLinkText,
                url: preFilledFormUrl,
              },
    );
  }
}

/**
 * Unit test for some activity parsing code appearing in onFormSubmit().
 */
function testActivityChoiceParsing() {  
  Logger.log('Testing activity choice parsing...');
  
  if (!checkActivityChoiceParsing('Throwing',
                                  '5 pts./15 min.',
                                  'Throwing [5 pts./15 min.] Throwing in pairs (at most 3 players/disc)')) {
    return false;
  }
      
  if (!checkActivityChoiceParsing('Playing video games',
                                  '1 pts./3 hr.',
                                  'Playing video games [1 pts./3 hr.] Mindlessly gazing into your phone forever')) {
    return false;
  }
      
  if (!checkActivityChoiceParsing('Sharing media',
                                  '3 pts.',
                                  'Sharing media [3 pts.] Blah blah blah')) {
    return false;
  }
      
  if (!checkActivityChoiceParsing('Daily team check-in',
                                  '1 pts.',
                                  'Daily team check-in [1 pts.] Blah blah blah')) {
    return false;
  }
      
  Logger.log('Test passed.');
  return true;
}
    
/**
 * Assert that this code, similar to that appearing in onFormSubmit()
 * parses the Activity Category selected in the form properly.
 *
 * @param {String} expectedCategoryName portion of category selection
 * @param {String} expectedPointValue portion of category selection
 * @param {String} formValue selected by the player in the form 
 */
function checkActivityChoiceParsing(expectedCategoryName,
                                    expectedPointValue,
                                    formValue) {
  var activityChoiceFormPattern = /^([^[]+) \[([^\]]+)\](?: .+)?$/;
  var fields = activityChoiceFormPattern.exec(formValue);
  if ((!fields) || (fields.length != 3)) {
    Logger.log('Could not match pattern to: ' + formValue);
    return false;
  }
  var categoryName = fields[1];
  var pointValue = fields[2];
  
  if (expectedCategoryName != categoryName) {
    Logger.log('Wrong category name, expected [' + expectedCategoryName + '], but got [' + categoryName + '] for: ' + formValue);
    return false;
  }
  
  if (expectedPointValue != pointValue) {
    Logger.log('Wrong point value, expected [' + expectedPointValue + '], but got [' + pointValue + '] for: ' + formValue);
    return false;
  }
  
  return true;
}
    
/**
 * Unit test for getAwardedPoints().
 */
function testGetAwardedPoints() {
  Logger.log('Testing getAwardedPoints...');
  
  if (!checkAwardedPoints(11, '11 pts.')) {
    return false;
  }
  
  if (!checkAwardedPoints(30, '10 pts./15 min.', '45 minutes')) {
    return false;
  }
      
  if (!checkAwardedPoints(40, '10 pts./15 min.', '1 hour')) {
    return false;
  }
      
  if (!checkAwardedPoints(100, '10 pts./15 min.', '2.5 hours')) {
    return false;
  }
      
  if (!checkAwardedPoints(120, '10 pts./15 min.', '3 hours')) {
    return false;
  }
      
  if (!checkAwardedPoints(160, '10 pts./15 min.', '4 hours or more (aka "give it a rest, maybe?")')) {
    return false;
  }
      
  if (!checkAwardedPoints(160, '40 pts./1 hr.', '4 hours or more (aka "give it a rest, maybe?")')) {
    return false;
  }
      
  if (!checkAwardedPoints(20, '40 pts./1 hr.', '30 minutes')) {
    return false;
  }
      
  Logger.log('Test passed.');
  return true;
}
    
/**
 * Assert that getAwardedPoints() computes the correct point total.
 *
 * @param {String} expectedPoints which should be returned
 * @param {String} pointValue portion of category selection
 *        that defines how many points to award for each
 *        instance or duration unit.
 * @param {String} duration value selected by player in form
 *        (if any), which includes units. 
 */
function checkAwardedPoints(expectedPoints, pointValue, duration) {
  var points = (duration) ? getAwardedPoints(pointValue, duration) : getAwardedPoints(pointValue);
  
  if (expectedPoints != points) {
    var description = (duration) ? duration + ' at ' + pointValue : pointValue;
    Logger.log(Utilities.formatString('Wrong points for %s, expected %d, but got %d',
                                      description,
                                      expectedPoints,
                                      points));
    return false;
  }
  return true;
}
    
/**
 * Compute the correct point count to award the player for a
 * Teamwork submission.
 *
 * @param {String} pointValue portion of category selection
 *        that defines how many points to award for each
 *        instance or duration unit.
 * @param {String} duration value selected by player in form
 *        (if any), which includes units. 
 */
function getAwardedPoints(pointValue, duration) {
  var pointValuePattern = /^([0-9]+) pts\.(?:\/([0-9]+) (min|hr)\.)$/;
  var fields = pointValuePattern.exec(pointValue);
  if (!fields) {
    pointValuePattern = /^([0-9]+) pts\.$/;
    fields = pointValuePattern.exec(pointValue);
  }
  if (!fields) {
    Logger.log('Cannot parse pointsValue: ' + pointValue);
  }
  var pointsPerDurationUnit = fields[1];
  if (fields.length == 2) {
    if (duration) {
      Logger.log(Utilities.formatString('Duration [%s] not allowed for pointValue: %s',
                                        duration,
                                        pointValue));
      return 0;
    }
    return pointsPerDurationUnit;
  }
  if (fields.length != 4) {
    Logger.log('Unable to parse pointValue: ' + pointValue);
    return 0;
  }
  if (!duration) {
    Logger.log('No duration chosen for pointValue: ' + pointValue);
    return 0;
  }
  var denominator = fields[2];
  var denominatorMinutes = (fields[3] == 'min') ? denominator : denominator * 60;
  
  fields = DURATION_PATTERN.exec(duration);
  if ((!fields) || (fields.length != 3)) {
    Logger.log('Unable to parse duration: ' + duration);
    return 0;
  }
  var numerator = fields[1];
  var durationMinutes = (fields[2] == 'minute') ? numerator : numerator * 60;
  return durationMinutes * pointsPerDurationUnit / denominatorMinutes;
}
    
/**
 * Unit test for sendEmail()
 *
 * Note: This sends an email, but doesn't itself validate the content
 *       or even that it was sent properly.
 * Note: Unlike the other unit tests, it does not get run by test().
 */
function testSendEmail() {
  var emailAddress = 'Schmed@TransPac.com';
  var today = new Date();
  var tomorrowDateString = 
    Utilities.formatString('%d/%d/%d',
                           today.getMonth()+1, // Date.month is 0-based
                           today.getDate()+1,  // Date.day is 1-based
                           today.getFullYear());
  var preFilledFormUrlTomorrow = 
    makePreFilledFormUrl(emailAddress, 
                         'Chris', 
                         'Schneider', 
                         tomorrowDateString, 
                         '');
  var preFilledFormUrl = 
    makePreFilledFormUrl(emailAddress, 
                         'Chris', 
                         'Schneider', 
                         '', 
                         '');
  sendEmail(emailAddress,
            'Success email test',
            'Success email body',
            SUBMIT_SUCCESS_IMAGE_URL,
            {
              linkText: 'Tomorrow Teamwork link',
              url: preFilledFormUrlTomorrow,
            },
            {
              linkText: 'More Teamwork link',
              url: preFilledFormUrl,
            },
  );
}

/**
 * Send the player an email summarizing the results from validating the
 * form data s/he submitted.
 *
 * @param {String} playerEmailAddress to which email is sent
 * @param {String} emailSubject in header
 * @param {String} emailBody of content
 * @param {String} imageUrl
 * @param {Object} preFilledFormLinks... to append to HTML body,
 *                 Each Object should contain the following properties:
 * {
 *   url: 'https://www.google.com',
 *   linkText: 'Link taking you to Google',
 * }
 */
function sendEmail(playerEmailAddress,
                   emailSubject,
                   emailBody,
                   imageUrl,
                   /* preFilledFormLinks... */) {
  var plainBody = emailBody;
  var richBody = '<img src="cid:imageKey"><br>';
  richBody += plainBody.replace(/\n/g, '<br>');
  for (var i = 4; i < arguments.length; i++) {
    var preFilledFormLink = arguments[i];
    richBody += Utilities.formatString('<br><a href="%s">%s</a>', 
                                       preFilledFormLink.url, 
                                       preFilledFormLink.linkText);
  
    plainBody += '\n' + preFilledFormLink.url;
  }
  
  var imageData = UrlFetchApp
                    .fetch(imageUrl)
                    .getBlob()
                    .setName('Image data for ' + emailSubject);
  var emailInlineImages = {
      imageKey: imageData
  };

  MailApp.sendEmail({
    to: playerEmailAddress, 
    subject: emailSubject, 
    body: emailBody,
    htmlBody: richBody,
    inlineImages: emailInlineImages,
  });  
}

/**
 * Unit test for testMakePreFilledFormUrl().
 */
function testMakePreFilledFormUrl() {
  Logger.log('Testing makePreFilledFormUrl...');
  var expectedUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSdazcXFRQv2X9RQ5fVQ-3WVIgy_4jA6LUeK7n3Pbeg2ThQlcg/viewform?usp=pp_url&entry.669911929=Schmed@TransPac.com&entry.1489568342=Chris&entry.1879728817=Schneider&entry.92806500=2020-09-30&entry.127008239=I%20ate%20cake';
  var preFilledFormUrl = 
    makePreFilledFormUrl('Schmed@TransPac.com',
                         'Chris',
                         'Schneider',
                         '9/30/2020',
                         'I ate cake');
  if (expectedUrl != preFilledFormUrl) {
    Logger.log('Wrong URL, expected [' + expectedUrl + '], but got [' + preFilledFormUrl + ']');
    return false;
  }
  Logger.log('Test passed.');
  return true;
}

/**
 * Construct a URL to the Record Teamwork form that has the email
 * player name, date performed & description fields pre-filled.
 *
 * @param {String} email address to pre-select in form
 * @param {String} firstName (if any) to pre-select in form
 * @param {String} lastName (if any) to pre-select in form
 * @param {String} datePerformed (if any) to pre-select in form
 * @param {String} description (if any) to pre-select in form
 */
function makePreFilledFormUrl(email, firstName, lastName, datePerformed, description) {
  var url = RECORD_TEAMWORK_FORM_BASE_URL;
  url += '&entry.' + EMAIL_ITEM_ID + '=' + email;
  if (firstName) {
    url += '&entry.' + FIRST_NAME_ITEM_ID + '=' + firstName;
  }
  if (lastName) {
    url += '&entry.' + LAST_NAME_ITEM_ID + '=' + lastName;
  }
  if (datePerformed) {
    var fields = datePerformed.split('/', 3);
    var standardDatePerformed = Utilities.formatString('%04d-%02d-%02d', fields[2], fields[0], fields[1]);
    url += '&entry.' + DATE_PERFORMED_ITEM_ID + '=' + standardDatePerformed;
  }
  if (description) {
    url += '&entry.' + DESCRIPTION_ITEM_ID + '=' + description;
  }
  return encodeURI(url);
}
  
/**
 * Unit test for makePointValue().
 */
function testMakePointValue() {
  Logger.log('Testing makePointValue...');
  
  if (!checkMakePointValue('3 pts.', 'Each shared item', 3)) {
    return false;
  }
      
  if (!checkMakePointValue('5 pts./15 min.', '15 minutes', 5)) {
    return false;
  }
      
  if (!checkMakePointValue('15 pts./1 hr.', '1 hour', 15)) {
    return false;
  }
      
  Logger.log('Test passed.');
  return true;  
}

/**
 * Assert that makePointValue() builds the point value 
 * String correctly (e.g., '5 pts./15 min.')
 *
 * @param {String} expectedPointValue which should be returned
 * @param {String} categoryUnit of duration measurement 
 *        (e.g., '15 minutes')
 * @param {Integer} categoryPointsPerUnit to award for each unit
 *        (e.g., 5)
 */
function checkMakePointValue(expectedPointValue, categoryUnit, categoryPointsPerUnit) {
  var pointValue = makePointValue(categoryUnit, categoryPointsPerUnit);
  if (expectedPointValue != pointValue) {
    Logger.log(Utilities.formatString('Wrong pointValue for (%d points/%s), expected %s, but got %s',
                                      categoryPointsPerUnit,
                                      categoryUnit,
                                      expectedPointValue,
                                      pointValue));
    return false;
  }
  return true;  
}
  
/**
 * Describe an Activity Category's the point value,
 * which may depend on duration (e.g., '5 pts./15 min.')
 *
 * @param {String} categoryUnit of duration measurement 
 *        (e.g., '15 minutes')
 * @param {Integer} categoryPointsPerUnit to award for each unit
 *        (e.g., 5)
 */
function makePointValue(categoryUnit, categoryPointsPerUnit) {
  var fields = DURATION_PATTERN.exec(categoryUnit);
  if ((fields) && (fields.length == 3)) {
    var denominator = fields[1];
    var denominatorUnit = fields[2];
    denominatorUnit = (denominatorUnit == 'minute') ? 'min.' : 'hr.';
    return Utilities.formatString('%d pts./%d %s',
                                  categoryPointsPerUnit,
                                  denominator,
                                  denominatorUnit);
  }
  return categoryPointsPerUnit + ' pts.';
}
