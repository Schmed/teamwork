/**
 * reports.gs
 *
 * Utilities for sending periodic Teamwork summaries to players.
 *
 * See teamwork.gs for more information.
 *
 * TODO Add a sendMonthlyPlayerSummaries() funciton that, for each player who submitted teamwork
 *      during the month that just passed, summarizes that teamwork, comparing it to the teamwork
 *      s/he submitted during the preceeding month (if any).
 */

/**
 * Unit test for sendPlayerSummary()
 *
 * Note: This sends an email, but doesn't itself validate the content
 *       or even that it was sent properly.
 * Note: Unlike the other unit tests, it does not get run by test().
 */
function testSendPlayerSummary() {
  var playerEmailAddress = 'Schmed@TransPac.com';
  var firstDate = new Date(2020,9,6); // 2020-10-06
  var deadline = new Date(2020,9,12); // 2020-10-12 (on or before 2020-10-11)
  var otherFirstDate = new Date(2020,9,1); // 2020-10-01
  var otherDeadline = new Date(2020,9,6); // 2020-10-06 (on or before 2020-10-05)
  sendPlayerSummary(playerEmailAddress, 
                    firstDate, 
                    deadline,
                    otherFirstDate,
                    otherDeadline);
}

/**
 * Build a Google Doc summarizing Teamwork submissions over
 * a specific time period, optionally comparing them to another
 * time period.  Attach the PDF version of the Google Doc to
 * an email and send it to the player.
 *
 * @param {String} playerEmailAddress identifying target player
 * @param {Date}   firstDate of target period to summarize
 * @param {Date}   deadline for target period of summarized Teamwork
 *                 (i.e., it must occur *before* this Date)
 * @param {Date}   otherFirstDate of optional comparison period
 * @param {Date}   otherDeadline of optional comparison period
 */
function sendPlayerSummary(playerEmailAddress,
                           firstDate,
                           deadline,
                           otherFirstDate,
                           otherDeadline) {
  
  // Collect the player's Teamwork over the target date range
  var periodCategories = makePlayerSummary(playerEmailAddress, 
                                           firstDate, 
                                           deadline);
  
  // If provided, collect the player's Teamwork over the optional
  // comparison period as well.
  var otherCategories = null;
  if (!otherFirstDate) {
    otherDeadline = null;
  } else if (!otherDeadline) {
    otherFirstDate = null;
  } else {
    otherCategories = makePlayerSummary(playerEmailAddress, 
                                        otherFirstDate, 
                                        otherDeadline);
  }
  
  // Build a Google Doc listing the Teamwork submissions
  // in each category, category point totals, and grand total.
  var playerName = Object.values(periodCategories)[0][0][PD_CANONICAL_PLAYER_NAME_COLUMN-1];
  var lastDate = deadline;
  lastDate.setDate(deadline.getDate()-1);
  var title = Utilities.formatString('Teamwork summary for %s\n(%s through %s)',
                                     playerName,
                                     Utilities.formatDate(firstDate, 
                                                          SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 
                                                          'MM/dd'),
                                     Utilities.formatDate(lastDate, 
                                                          SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 
                                                          'MM/dd'));
  var doc = DocumentApp.create(title.replace(/\n/, ' '));
  if (otherCategories) {
    var otherLastDate = otherDeadline;
    otherLastDate.setDate(otherDeadline.getDate()-1);
    title = Utilities.formatString('%s vs. %s through %s)',
                                   title.replace(/\)/,''),
                                   Utilities.formatDate(otherFirstDate, 
                                                        SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 
                                                        'MM/dd'),
                                   Utilities.formatDate(otherLastDate, 
                                                        SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 
                                                        'MM/dd'));
  }
  var body = doc.getBody();
  body.appendParagraph(title)
    .setHeading(DocumentApp.ParagraphHeading.HEADING2)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  for (var category in periodCategories) {
    var categoryTeamwork = periodCategories[category];
    var totalPoints = 0;
    var otherPoints = 0;
    var tableData = (   categoryTeamwork[0][PD_DURATION_COLUMN-1] ?
                        [['Date performed', 'Duration', 'Points awarded', 'Description']]
                    :   [['Date performed', 'Points awarded', 'Description']]);
    for (var i = 0; i < categoryTeamwork.length; i++) {
      var datePerformed =
        Utilities.formatDate(categoryTeamwork[i][PD_DATE_PERFORMED_COLUMN-1], 
                             SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 
                             'MM/dd/YYYY');
      totalPoints += categoryTeamwork[i][PD_POINTS_AWARDED_COLUMN-1];
      if (categoryTeamwork[i][PD_DURATION_COLUMN-1]) {
        tableData.push([datePerformed,
                       categoryTeamwork[i][PD_DURATION_COLUMN-1],
                       categoryTeamwork[i][PD_POINTS_AWARDED_COLUMN-1].toString(),
                       categoryTeamwork[i][PD_DESCRIPTION_COLUMN-1]]);
      } else {
        tableData.push([datePerformed,
                       categoryTeamwork[i][PD_POINTS_AWARDED_COLUMN-1].toString(),
                       categoryTeamwork[i][PD_DESCRIPTION_COLUMN-1]]);
      }
    }
    if (otherCategories) {
      var otherTeamwork = otherCategories[category];
      if (otherTeamwork) {
        for (var i = 0; i < otherTeamwork.length; i++) {
          otherPoints += otherTeamwork[i][PD_POINTS_AWARDED_COLUMN-1];
        }
      }
    }
    var heading;
    if ((otherCategories) && (otherPoints)) {
      if (totalPoints > otherPoints) {
        var increase = totalPoints - otherPoints;
        heading = Utilities.formatString('%s [%d total points, %f%s increase]',
                                         category,
                                         totalPoints,
                                         (increase / otherPoints) * 100,
                                         '%');
      } else if (otherPoints < totalPoints) {
        var decrease = otherPoints - totalPoints;
        heading = Utilities.formatString('%s [%d total points, %f%s decrease]',
                                         category,
                                         totalPoints,
                                         (decrease / otherPoints) * 100,
                                         '%');
      } else {
        heading = Utilities.formatString('%s [%d total points (no change)]',
                                         category,
                                         totalPoints);
      }
    } else {
      heading = Utilities.formatString('%s [%d total points]',
                                       category,
                                       totalPoints);
    }
    body.appendParagraph(heading)
      .setHeading(DocumentApp.ParagraphHeading.HEADING3);
    var table = body.appendTable(tableData);
    table.getRow(0).editAsText().setBold(true);
    for (var i = 0; i < table.getRow(0).getNumCells()-1; i++) {
      table.setColumnWidth(i, 90);
    }
    for (var i = 1; i < table.getNumRows(); i++) {
      var row = table.getRow(i);
      row.getCell(row.getNumCells()-1).editAsText().setFontSize(8);
    }
  }
  doc.saveAndClose();

  // Email the PDF version of that summary to the player
  MailApp.sendEmail({
    to: playerEmailAddress,
    subject: doc.getName(),
    body: 'Thanks for all of your Teamwork!',
    attachments: doc.getAs(MimeType.PDF)
  });  
}

/**
 * Unit test for makePlayerSummary().
 */
function testMakePlayerSummary() {
  Logger.log('Testing makePlayerSummary...');
  
  var playerEmailAddress = 'Schmed@TransPac.com';
  var firstDate = new Date(2020,9,1); // 2020-10-01
  var deadline = new Date(2020,9,6); // 2020-10-06 (on or before 2020-10-05)
  var periodCategories = makePlayerSummary(playerEmailAddress, firstDate, deadline);
  
  if (!checkTeamwork([30,30], periodCategories, 'Cardio work', firstDate, deadline)) {
    return false;
  }
      
  if (!checkTeamwork([6], periodCategories, 'Medium throws', firstDate, deadline)) {
    return false;
  }
  
  // This validates the date sorting
  var playerEmailAddress = 'NellHolmesMiller@GMail.com';
  var firstDate = new Date(2020,9,1); // 2020-10-01
  var deadline = new Date(2020,9,4); // 2020-10-04 (on or before 2020-10-03)
  periodCategories = makePlayerSummary(playerEmailAddress, firstDate, deadline);
  if (!checkTeamwork([16,12], periodCategories, 'Strength training', firstDate, deadline)) {
    return false;
  }
      
  Logger.log('Test passed.');
  return true;  
}
  
/**
 * Assert that makePlayerSummary() has summarized the Teamwork
 * for a given category correctly.
 *
 * @param {Number[]} expectedPoints for each activity in category
 * @param {Object[String][][]} periodCategories returned by
 *        makePlayerSummary 
 * @param {String} activityCategory of periodCategories to validate
 * @param {Date}   firstDate of target period summarized
 * @param {Date}   deadline for target period summarized
 *                 (i.e., it must occur *before* this Date)
 */
function checkTeamwork(expectedPoints, periodCategories, activityCategory, firstDate, deadline) {
  var teamwork = periodCategories[activityCategory];
  var lastDate = deadline;
  lastDate.setDate(deadline.getDate()-1);
  var description = 
    Utilities.formatString('%s activities over period from %s through %s',
                           activityCategory,
                           Utilities.formatDate(firstDate, 
                                                SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 
                                                'yyyy-MM-dd'),
                           Utilities.formatDate(lastDate, 
                                                SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 
                                                'yyyy-MM-dd'));
  if (expectedPoints.length != teamwork.length) {
    Logger.log(Utilities.formatString('Wrong number of %s, expected %d, but got %d',
                                      description,
                                      expectedPoints.length,
                                      teamwork.length));
    return false;
  }
  
  var previousPerformedDate = null;
  for (var i = 0; i < expectedPoints.length; i++) {
    var pointsAwarded = teamwork[i][PD_POINTS_AWARDED_COLUMN-1];
    if (expectedPoints[i] != pointsAwarded) {
      Logger.log(Utilities.formatString('Wrong points for element %d of %s, expected %d, but got %d',
                                        i,
                                        description,
                                        expectedPoints[i],
                                        pointsAwarded));
      return false;
    }
    
    var performedDate = new Date(teamwork[i][PD_DATE_PERFORMED_COLUMN-1]);
    if  (   (performedDate < firstDate)
        ||  (performedDate > deadline)) {
      Logger.log(Utilities.formatString('Element %d of %s was performed on %s',
                                        i,
                                        description,
                                        Utilities.formatDate(performedDate, 
                                                             SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 
                                                             'yyyy-MM-dd')));
      return false;
    }
    if  (   (previousPerformedDate)
        &&  (previousPerformedDate > performedDate)) {
      Logger.log(Utilities.formatString('Element %d of %s was performed on %s (before previous element date: %s)',
                                        i,
                                        description,
                                        Utilities.formatDate(performedDate, 
                                                             SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 
                                                             'yyyy-MM-dd'),
                                        Utilities.formatDate(previousPerformedDate, 
                                                             SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 
                                                             'yyyy-MM-dd')));
      return false;
    }
    previousPerformedDate = performedDate;
  }
  return true;  
}
  
/**
 * Summarize one player's Teamwork submissions over a specific
 * date range.
 *
 * @param {String} playerEmailAddress identifying target player
 * @param {Date}   firstDate of target period to summarize
 * @param {Date}   deadline for target period of summarized Teamwork
 *                 (i.e., it must occur *before* this Date)
 */
function makePlayerSummary(playerEmailAddress,
                           firstDate,
                           deadline) {
  var canonicalEmailAddress = playerEmailAddress.toLowerCase();

  // Get access to all range & values from the 'Points data' sheet
  var ss = SpreadsheetApp.getActive();
  var pointsDataSheet = ss.getSheetByName('Points data');
  var numRows = pointsDataSheet.getDataRange().getNumRows(); // Includes title row
  
  // Collect this player's Teamwork submission data over the
  // target period, placing it into category-specific arrays.
  var playerName;
  var periodCategories = {};
  for (var i = 2; i <= numRows; i++) {
    var rowRange = pointsDataSheet.getRange(i, 1, 1, PD_CATEGORY_COLUMN);
    var rowValues = rowRange.getValues()[0];
    
    if (rowValues[PD_CANONICAL_EMAIL_COLUMN-1] == canonicalEmailAddress) {
      if (!playerName) {
        playerName = rowValues[PD_CANONICAL_PLAYER_NAME_COLUMN-1];
      }
      var category = rowValues[PD_CATEGORY_COLUMN-1];
      
      if (   (   rowValues[PD_DATE_PERFORMED_COLUMN-1]
             >=  firstDate)
         &&  (   rowValues[PD_DATE_PERFORMED_COLUMN-1]
             <   deadline)) {
        if (!(category in periodCategories)) {
          periodCategories[category] = new Array();
        }
        periodCategories[category].push(rowValues);
      }
    }
  }
  
  // Sort each category-specific array by ascending date performed
  // and return this map from category to Teamwork array.
  for (var category in periodCategories) {
    var categoryTeamwork = periodCategories[category];
    categoryTeamwork.sort(function(thisTeamwork, thatTeamwork) {
      if  (   thisTeamwork[PD_DATE_PERFORMED_COLUMN-1] 
          <   thatTeamwork[PD_DATE_PERFORMED_COLUMN-1]) {
        return -1;
      }
      if  (   thisTeamwork[PD_DATE_PERFORMED_COLUMN-1] 
          >   thatTeamwork[PD_DATE_PERFORMED_COLUMN-1]) {
        return 1;
      }
      return 0;
    });
  }
  return periodCategories;
}
