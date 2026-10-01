# Riftbound Prep Book

A tournament-prep tool for the Riftbound TCG: build decks from the full card database, log best-of-3 matches, track matchup win rates, and plan sideboards.

**Open it:** see the GitHub Pages link in this repository's About section.

## What it does

- **Cards / deckbuilder** – click cards to add them; Legend, Chosen Champion, main deck, sideboard (10), runes (12) and battlefields (3). Over-limit and banned cards are allowed while building and flagged as *Illegal* when you save. Ban list included (Standard and 2v2, as of 18 Sep 2026).
- **Match log** – record each round. Per game: result, who went first, score, both battlefields, and your sideboarding (arrows between main deck and sideboard, prefilled from your guide). Both players' Legend and Chosen Champion, screenshots (upload or paste), replays and notes.
- **History** – every recorded match with search, deck filter, per-game sideboarding, screenshots and replays.
- **Matchups** – match, game 1 and post-board win rates per opponent deck, going first vs second, and win rate by battlefield.
- **Sideboard** – an in/out guide per matchup and a copyable cheat sheet.
- **Field** – expected match win rate for an event from the decks you expect to face.
- **Data** – JSON backup/import, CSV export of every match, format rules.

## Where data is saved

This GitHub Pages version saves everything **in your browser only**: decks and matches in localStorage, screenshots and uploaded replay files in IndexedDB (large screenshots are resized to 1920px). Use *Data → Export backup* regularly and *Import backup* to move to another browser or device. Backups include screenshots but not uploaded video files.

## Cloud saving (accounts)

Players can create an account with a **username and password** (Data tab, or *Sign in* in the header) to keep everything in the cloud and use it on any device. Each account can only read its own data. Without an account the site keeps working from the browser as before.

It runs on a free [Supabase](https://supabase.com) project. One-time setup:

1. Create a free account at supabase.com and a **New project** (any name and region; save the database password somewhere).
2. **SQL Editor → New query**: paste the contents of [`supabase/setup.sql`](supabase/setup.sql) and click **Run**.
3. **Authentication → Sign In / Providers → Email**: turn **Confirm email** off and save. Usernames are stored as `<name>@users.riftprep.app`, which can't receive mail, so confirmation emails would never arrive.
4. **Project Settings → API** (or **Connect**): copy the **Project URL** and the **anon public** key.
5. Put them in `CLOUD_CONFIG` near the top of the script in `riftbound-prep.html`, run `python scripts/build_index.py`, commit and push.

The anon key is meant to be public; access is limited by the row-level security rules in `setup.sql`. Free projects pause after a week with no activity; open the Supabase dashboard and click *Restore* if that happens. There is no password reset, so players should keep their passwords safe.

## Files

- `index.html` – the page served by GitHub Pages (generated).
- `riftbound-prep.html` – the source page (also used as a Claude artifact).
- `supabase/setup.sql` – database tables, file bucket and access rules for cloud saving.
- `scripts/build_index.py` – regenerates `index.html` from the source: `python scripts/build_index.py`.
- `cards/` – card data (`cards.json`) and image sprite sheets.

## Credits

Card data from [Riftcodex](https://riftcodex.com). Riftbound, its cards and card images are the property of Riot Games. This is an unofficial fan tool, not endorsed by or affiliated with Riot Games.
