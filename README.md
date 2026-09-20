# scryfall-17lands-overlay
Overlays grades and win rates from 17Lands data onto Scryfall searches. Provides quick searches under cards to view cards of the same "template" from other sets.

## Getting Started
Install the **Violentmonkey** extension on your browser, which allows user scripts to be run in-browser. Open the Violentmonkey dashboard, and copy **overlay.js** as a new script. Hit Save, ensure the script is active, then start searching on Scryfall. To stop displaying grades, re-open the dashboard and disable the script.

**Grades and templates update automatically.** No need to update the script except for new features!

*(This extension was tested on Firefox/Chrome, so other browsers may or may not work. Alternatives to Violentmonkey also may or may not work.)*

## Grading Notes

- Results are calculated from MTGArena Premier Draft games recorded by 17Lands. The percent shown for a card is its **Game In Hand Win Rate**. Grades are determined based off this rate, with the methodology: A card that **doesn't increase/decrease a deck's win rate** has a grade of **C**.

- A card can have **sub-grades** for color archetypes in its set. This is shown when the card over-performs in that archetype, or when that archetype sees the majority of the card's use across all decks. A card **may have a score for an off-color archetype** if it is a frequent enough splash.

- **A card seen <500 times has a grade of "?"**. It's may be a Special Guest card, or just a *really* bad card in limited. Similarly, A card can't get a sub-grade in an archetype if it appeared <500 times there.

- Win rates and grades **may differ slightly** from ones on the 17Lands website, as their public datasets lag behind the internal data used for the website. The difference should be negligible.

## Scryfall Search help

#### Only main Standard-hitting sets are graded, going back to 2022 with Kamigawa: Neon Dynasty. Sets that never hit Standard aren't graded.
- *To show only expansion sets, use:  **st:expansion***
- *To also show Foundations cards, use:  **(st:core or st:expansion)***
- *To filter out past ungraded sets, use:  **year>2021***

#### For cards printed in multiple sets, each printing receives its own grade. Grades may differ across sets due to different draft environments.
- *To show all prints, use:  **unique:prints***

#### Only the most typical "draft" version of a card receives a grade overlay. Draft cards from bonus sheets (e.g. Mystical Archive cards) DO receive grades however.
- *To filter out non-standard frames/versions, use:  **is:booster** (this also filters out Mystical Archive!)*

If you have a better way of filtering for exactly "draft" cards, let me know.
