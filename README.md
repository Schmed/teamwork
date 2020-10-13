# teamwork.gs
This is just a Google Apps Script that manages the interaction between a Google form
and a Google spreadsheet.  Players on an (Ultimate) team use the form to record
"Teamwork" performed outside of practice, activities like conditioning,
working individually or in small groups developing skills, and interacting with
and supporting other team members socially.

We developed this system to support our high school Ultimate team,
Air Traffic Control in 2020, partly to address the fact that in-person practices
posed too great a risk for COVID-19 transmission.  However, we hope it has
great potential as a permanent part of our program, to help us address some of 
our team goals that have so far proved fairly elusive.

It's based on an idea our former captain, Jenna Krugler, brought to us from
her college Ultimate team, the UC Berkeley Pie Queens.  They use a similar
system called "Workout Wars", employing a custom web development stack. 

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
* **Timestamp** - of the form submission
* **Email** - address uniquely identifying the player, to which the confirmation/failure email is sent
* **Player first name** - who performed the Teamwork
* **Player last name** - who performed the Teamwork
* **Date performed** - of the Teamwork
* **Duraction Activity Category** - if Teamwork is measured in 15-minute increments,
with points awarded scaled by the duration
* **Duration** - of the Teamwork in the Duration Activity Category
* **Other Activity Category** - if Teamwork instead merits a certain number of points
each time it is performed
* **Describe what you did (optional)** - optional notes entered by the player.
The script appends warnings and/or prepends error messages here.
* **Points awarded** - The script calculates and adds this value to the sheet.

# Activity Categories sheet
This sheet defines the set of Duration and Other activity categories presented
on the form, including point values.
There are currently 5 columns:
* **Category Name** - ends up in Duration/Other Activity Category in Teamwork sheet
* **Description and Examples** - if the form presents category options using
radio buttons (MultipleChoiceItem Objects), then this text is appended to the
category name and point value of each.
* **Unit** - denominator of the category's point value
* **Points per Unit** - numerator of the category's point value
* **Extra Notes** - ideas, clarifications, etc.

The data here are _not_ used by the script during form submission,
nor by any downstream sheet calculations based on the points awarded.
Instead, it represents a working area for future category revisions,
read only by periodic manual invocations of the updateActivityCategories()
function.

# updateActivityCategories() function
This function (invoked manually) forces any updates that have been made
to the Activity Categories sheet since its previous invocation
to be reflected in the options presented to any player who subsequently 
fills out an instance of the form.

# Source files
The following Google Apps Script files comprise the project.
(**Note:** Google Apps Script is just JavaScript with many pre-loaded Google modules.)
* **teamwork.gs** - Main program entry point, an onFormSubmit(e) Trigger target.
* **update_categories.gs** - Administrative function that updates the activity category options 
in the Record Teamwork form.
* **reports.gs** - Utilities for sending periodic Teamwork summaries to players.
* **test.gs** - Entry point for running all unit tests, plus code to log environment properties.
* **form_access.gs** - A file **you** must add to attach the script to your spreadsheet & form.
* **form_access_template.gs** - A template for your form_access.gs source file.
