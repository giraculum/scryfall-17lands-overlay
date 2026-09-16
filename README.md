# scryfall-17lands-overlay
Overlays rankings from 17Lands data onto Scryfall searches

Getting Started:
To use, install the Violentmonkey extension on your browser, which allows user scripts to be run. in-browser Open the Violentmonkey dashboard, and upload/copy overlay.js as a new script. Hit Save, and ensure the script is active.

The overlay adds card draft grades from 17Lands to all Scryfall searches and individual card pages. The overlay has data for sets from 2022 onward, beginning with Kamigawa: Neon Dynasty.

To hide draft grades, open the TamperMonkey extension while on Scryfall, and hit the toggle to disable the script.

This extension was tested on Firefox/Chrome, so other browsers may or may not work.
(If you use an alternative to Violentmonkey e.g. Greasemonkey or Tampermonkey, the script will probably still work with that. I recommend Violentmonkey because it's open-source, what I have, and what I used to test. As always, extensions and userscripts are run at your own risk.)

Notes:
Grades are calculated from MTGArena Premier Draft games, sourced from 17Lands. Grades may differ slightly from ones on the 17Lands website, though typically only by a single step (e.g. B vs. B+). 17Lands provides public data sets for the purpose of tools like this, but that data is not always as up-to-date as the website, even for past sets.

This script's grades are not live. When new set data is available, the script must be manually updated. It's not worth coding anything more complicated...

In addition to a card's main grade in its format, a card may also have a sub-grade for particular color archetypes in the format. For this to happen, the card must have been significantly played in that archetype (played over 500 times, and contributing over 2% of that card's total play). Additionally, a sub-grade is only shown if the card performed significantly better/worse in the archetype based on win rate data. In practice, this means the sub-grade must be separated from the main grade by at least one in-between grade (e.g. B- vs B+.)

Scryfall Search help:
Only sets that entered Standard ("Expansion"/"Premier" sets) have grades, going back to the start of 2022 with Kamigawa: Neon Dynasty. Commander sets, etc. don't have grades.
To show only expansion sets, use the search term:  st:expansion
To additionally show Foundations cards, use the search term:  (st:core or st:expansion)
To filter sets preceding this ranking, use the search term:  year>2021  or date>2021

For cards printed in multiple sets, each printing receives its own grade. Grades may differ due to being different draft environments. By default, Scryfall only shows the most version of a card in a search.
To show all prints, use the search term:  unique:prints

Only the most typical printing of a card in each set receive a grade overlay. Foils, alternate art, etc. don't have a grade. Cards from bonus sheets (e.g. Mystical Archive cards from Strixhaven) DO receive grades. Their frame may be special compared to other cards, but it's still the typical printing seen in a draft.
To filter out non-standard frames, use the search term:  is:booster
(Note this also filters out Mystical Archive, etc., be careful!)

If you have a better way of filtering for exactly "draft" cards, let me know.
