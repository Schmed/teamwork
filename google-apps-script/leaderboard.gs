/**
 * leaderboard.gs
 *
 * This script helps automatically the Google Charts displayed on
 * Slides of the ATC Teamwork Leaderboard Google Presentation.
 *
 * It's essentially a copy of the script suggested by 
 * Marcus Hammarberg (c. 2018-06-2018):
 * http://www.marcusoft.net/2018/06/keeping-copies-diagrams-from-google-sheets-updated-automatically.html 
 */

/**
 * Update every embedded Chart on every Slide of this Presentation.
 * @param {Event} e associated with the time-driven (aka clock) Trigger
 * which contains the time it fired (unused)
 */
function refreshCharts(e) {
  var slides = SlidesApp.getActivePresentation().getSlides();

  for (var i = 0; i < slides.length; i++) {
    var slide = slides[i];
    var sheetsCharts = slide.getSheetsCharts();

    for (var k = 0; k < sheetsCharts.length; k++) {
      var chart = sheetsCharts[k];
      chart.refresh();
    }
  }
}
