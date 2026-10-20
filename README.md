# scryfall-17lands-overlay
Overlays stats from **17Lands** onto **Scryfall** searches. Data goes back to 2022's Kamigawa: Neon Dynasty.

Also adds "draft tags" below cards, which link to similar cards from other sets.

## Getting Started
This script is for the **Violentmonkey** browser extension. With the the extension installed: open the dashboard, add **overlay.js** as a new script, and save.

Versions 1.0.0+ have easy updates. Open the script and click **⟳Update** for feature updates, and  **@resource ⟳** for updated stats/tags. (Versions <1.0.0 require a reinstall of the script)

*(This extension was tested with ViolentMonkey on Firefox/Chrome. Alternatives may be buggy. Software is as-is.)*

## Grading Notes

- Grades are sourced from 17Lands premier draft GIHWR. A card that **doesn't affect average win rate** has a grade of **C**.

- A card's **sub-grades** are shown as a hint when it performs better in specific deck colors. Use the "Deck" dropdown to use that deck for all main grades.

- A **?** means the card was seen **<500 times** in the dataset (or in the selected deck.) This is considered not enough data to calculate a grade.

- Win rates and grades **may differ slightly** from the 17Lands website. The public datasets they release aren't always up-to-date.
