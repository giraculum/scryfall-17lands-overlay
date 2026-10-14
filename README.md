# scryfall-17lands-overlay
Overlays stats from **17Lands** onto **Scryfall** searches. Data goes back to 2022's Kamigawa: Neon Dynasty.

Also adds "draft tags" below cards, which link to similar cards from other sets.

## Getting Started
This script is for the **Violentmonkey** browser extension. With the the extension installed: open the dashboard, add **overlay.js** as a new script, and save.

You can get **updates to grades and tags** by opening the script and refreshing the **@resource** tab. No need to re-download the script for this. Your browser may even do this on its own periodically.

*(This extension was tested with ViolentMonkey on Firefox/Chrome. Alternatives may be buggy. Software is as-is.)*

## Grading Notes

- Grades are sourced from 17Lands premier draft GIHWR. A card that **doesn't affect average win rate** has a grade of **C**.

- A card can have **sub-grades** if its performance varies greatly between decks. It may even be a deck outside the card's colors, indicating a splash.

- Win rates and grades **may differ slightly** from the 17Lands website. The public datasets they release aren't always up-to-date.

- A **?** means the card was seen **<500 times** in the dataset, and is excluded.
