/**
 * form_access_template.gs
 *
 * Add a copy of this file to your Google Apps Script project (e.g., named form_access.gs),
 * and fill in the values of the constants below to hook the script to your spreadsheet & form.
 *
 * See teamwork.gs for more information.
 */

// This URL displays the Record Teamwork form, allowing the player to
// record one activity.
RECORD_TEAMWORK_FORM_BASE_URL = 'Your form base URL goes here';

// This ID provides write access to the form design from the script.
RECORD_TEAMWORK_FORM_ID = 'Your form ID goes here';

// These form item IDs refer to the Record Teamwork form when the form
// design itself is being updated (i.e., using item.setChoiceValues()).
EDIT_DURATION_CATEGORY_ITEM_ID = 'Your form item ID goes here';
EDIT_OTHER_CATEGORY_ITEM_ID = 'Your form item ID goes here';

// These form item IDs refer to the Record Teamwork form when an
// instance of the form is being filled out by a player 
// (e.g., building a pre-filled form URL for the player's use).
EMAIL_ITEM_ID = 'Your form item ID goes here';
FIRST_NAME_ITEM_ID = 'Your form item ID goes here';
LAST_NAME_ITEM_ID = 'Your form item ID goes here';
DATE_PERFORMED_ITEM_ID = 'Your form item ID goes here';
DESCRIPTION_ITEM_ID = 'Your form item ID goes here';
