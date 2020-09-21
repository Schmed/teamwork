# teamwork.gs
This is just a Google Apps Script that manages the interaction between a Google form
and a Google spreadsheet.  Players on an (Ultimate) team use the form to record
"Teamwork" performed outside of practice, activities like conditioning,
working individually or in small groups developing skills, and interacting with
and supporting other team members socially.

# Record Teamwork form
Our team has a Google form players use to record Teamwork.  A form submission 
automatically adds a row to the Teamwork sheet.  Afterward, the onFormSubmit()
function in teamwork.gs is called automatically, as it is the target of an
SpreadsheetTriggerBuilder.onFormSubmit() Trigger.  

# onFormSubmit() function
After the player submits the form and data is added to the Teamwork sheet,
this handler validates and normalizes the data in the new row, calculates
and awards points for the activity, etc.
A confirmation or failure email is also sent to the player.

# Teamwork sheet
This sheet contains one row automatically added by each form submission,
and then validated and augmented by the onFormSubmit() function.
There are currently 10 columns:
* _Timestamp_ - of the form submission
* _Email_ - address uniquely identifying the player, to which the confirmation/failure email is sent
* _Playe_r first name - who performed the Teamwork
* _Player last name_ - who performed the Teamwork
* _Date performed_ - of the Teamwork
* _Duraction Activity Category_ - if Teamwork is measured in 15-minute increments,
with points awarded scaled by the duration
* _Duration_ - of the Teamwork in the Duration Activity Category
* _Other Activity Category_ - if Teamwork instead merits a certain number of points
each time it is performed
* _Describe what you did (optional)_ - optional notes entered by the player.
The script appends warnings and/or prepends error messages here.
* _Points awarded_ - The script calculates and adds this value to the sheet.

# Activity Categories sheet
This sheet defines the set of Duration and Other activity categories presented
on the form, including point values.
There are currently 5 columns:
* _Category Name_ - ends up in Duration/Other Activity Category in Teamwork sheet
* _Description and Examples_ - if the form presents category options using
radio buttons (MultipleChoiceItem Objects), then this text is appended to the
category name and point value of each.
* _Unit_ - denominator of the category's point value
* _Points per Unit_ - numerator of the category's point value
* _Extra Notes_ - ideas, clarifications, etc.

The data here are _not_ used by the script during form submission,
nor by any downstream sheet calculations based on the points awarded.
Instead, it represents a working area for future category revisions,
read only by periodic manual invocations of the updateActivityCategories()
function.

# updateActivityCategories() function
Force any updates to the Activity Categories sheet to be reflected 
in the options presented to any player who subsequently 
fills out an instance of the form.
