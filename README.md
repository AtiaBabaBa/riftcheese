# Riftbound Prep Book

A tournament-prep tool for the Riftbound TCG: build decks from the full card database, log best-of-3 matches, track matchup win rates, and plan sideboards.

**Open it:** see the GitHub Pages link in this repository's About section.

## What it does

- **Cards / deckbuilder** – click cards to add them; Legend, Chosen Champion, main deck, sideboard (10), runes (12) and battlefields (3). Over-limit and banned cards are allowed while building and flagged as *Illegal* when you save. Ban list included (Standard and 2v2, as of 18 Sep 2026).
- **Match log** – per game: result, who went first, score, both battlefields, and your sideboarding (arrows between main deck and sideboard, prefilled from your guide). Both players' Legend and Chosen Champion, replay links and notes.
- **Matchups** – match, game 1 and post-board win rates per opponent deck, going first vs second, and win rate by battlefield.
- **Sideboard** – an in/out guide per matchup and a copyable cheat sheet.
- **Field** – expected match win rate for an event from the decks you expect to face.
- **Data** – JSON backup/import, CSV export of every match, format rules.

## Where data is saved

This GitHub Pages version saves everything **in your browser only** (localStorage). Use *Data → Export backup* regularly, and *Import backup* to move to another browser or device. Screenshot and video uploads are not available in this version; paste replay links instead.

## Files

- `index.html` – the page served by GitHub Pages (generated).
- `riftbound-prep.html` – the source page (also used as a Claude artifact).
- `scripts/build_index.py` – regenerates `index.html` from the source: `python scripts/build_index.py`.
- `cards/` – card data (`cards.json`) and image sprite sheets.

## Credits

Card data from [Riftcodex](https://riftcodex.com). Riftbound, its cards and card images are the property of Riot Games. This is an unofficial fan tool, not endorsed by or affiliated with Riot Games.
