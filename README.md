# scryfall-17lands-overlay
Overlays rankings from 17Lands data onto Scryfall searches.

## Getting Started
Install the **Violentmonkey** extension on your browser, which allows user scripts to be run in-browser. Open the Violentmonkey dashboard, and copy **overlay.js** as a new script. Hit Save, and ensure the script is active.

To **hide** draft grades, open the Violentmonkey extension while on Scryfall, and hit the toggle to disable the script.

**Grades are updated over time** once data is available. No need to update the script except for eventual new features.

*(This extension was tested on Firefox/Chrome, so other browsers may or may not work. Alternatives to Violentmonkey also may or may not work.)*

## Notes

- Grades are calculated from MTGArena Premier Draft games recorded by 17Lands, using their grading methodology: A card that **doesn't increase/decrease a deck's win rate** has a grade of **C**.

- Grades **may differ slightly** from ones on the 17Lands website, though typically only by a single step (e.g. B vs. B+). This is because the 17Lands public datasets releases lag behind the internal data used for the website.

- A card **may have sub-grades** for color archetypes in the format. This is only shown when the card performs significantly better/worse in that archetype (it must *skip* a grade e.g. B- to B+), and only if it appeared frequently enough (must account for *over 2%* of the times the card was seen.) A card may have a score for an off-color archetype as a splash.

- **A card seen <500 times has a grade of "?"**. It's either a rare Special Guest card, or just a *really* bad card in draft.

## Scryfall Search help

#### Only main Standard-hitting sets are graded, going back to 2022 with Kamigawa: Neon Dynasty. Sets that never hit Standard aren't graded.
- *To show only expansion sets, use:  **st:expansion***
- *To also show Foundations cards, use:  **(st:core or st:expansion)***
- *To filter out ungraded sets, use:  **year>2021***

#### For cards printed in multiple sets, each printing receives its own grade. Grades may differ across sets due to different draft environments.
- *To show all prints, use:  **unique:prints***

#### Only the most typical "draft" version of a card receives a grade overlay. Draft cards from bonus sheets (e.g. Mystical Archive cards) DO receive grades however.
- *To filter out non-standard frames/versions, use:  **is:booster** (this also filters out Mystical Archive!)*

If you have a better way of filtering for exactly "draft" cards, let me know.
