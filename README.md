# scryfall-17lands-overlay
Overlays rankings from 17Lands data onto Scryfall searches.

## Getting Started
Install the **Violentmonkey** extension on your browser, which allows user scripts to be run in-browser. Open the Violentmonkey dashboard, and copy **overlay.js** as a new script. Hit Save, and ensure the script is active.

To hide draft grades, open the TamperMonkey extension while on Scryfall, and hit the toggle to disable the script.

(This extension was tested on Firefox/Chrome, so other browsers may or may not work. Alternatives to Violentmonkey also may or may not work.)
## Notes

- Grades are calculated from MTGArena Premier Draft games, sourced from 17Lands. Grades may differ slightly from ones on the 17Lands website, though typically only by a single step (e.g. B vs. B+). 17Lands provides public data sets for the purpose of tools like this, but that data is not always as up-to-date as the website, even for past sets.

- A card may also have a sub-grade for particular color archetypes in the format. The card must have been significantly played in that archetype (played over 500 times, and contributing over 2% of that card's total play), and it must have performed significantly better/worse in the archetype (Differing from the main grade with at least one grade in-between.)

- This script's grades are not live. When new set data is available, the script must be manually updated. It's not worth coding anything more complicated...


## Scryfall Search help

#### Only sets that entered Standard ("Expansion"/"Premier" sets) have grades, going back to the start of 2022 with Kamigawa: Neon Dynasty. Commander sets, etc. don't have grades.
- To show only expansion sets, use the search term:  st:expansion
- To additionally show Foundations cards, use the search term:  (st:core or st:expansion)
- To filter out sets preceding the data, use the search term:  year>2021

#### For cards printed in multiple sets, each printing receives its own grade. Grades may differ due to being different draft environments. By default, Scryfall only shows the most version of a card in a search.
- To show all prints, use the search term:  unique:prints

#### Only the most typical printing of a card in each set receive a grade overlay. Foils, alternate arts, etc. don't get a grade. Draftable cards from bonus sheets (e.g. Mystical Archive cards) DO receive grades.
- To filter out non-standard frames, use the search term:  is:booster *(though this also filters out Mystical Archive, etc!)*

If you have a better way of filtering for exactly "draft" cards, let me know.
