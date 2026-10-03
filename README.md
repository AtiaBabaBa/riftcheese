# Riftcheese

A tournament-prep tool for the Riftbound TCG: build decks from the full card database, log best-of-3 matches, track matchup win rates, and plan sideboards.

**Open it:** see the GitHub Pages link in this repository's About section.

## What it does

- **Cards / deckbuilder** – click cards to add them; Legend, Chosen Champion, main deck, sideboard (10), runes (12) and battlefields (3). Over-limit and banned cards are allowed while building and flagged as *Illegal* when you save. Ban list included (Standard and 2v2, as of 18 Sep 2026).
- **Match log** – record each round as best of 1 or best of 3. Opponents are identified by their **Legend**; their Chosen Champion is recorded too. Per game: result, who went first, score, both battlefields, and your sideboarding (arrows between main deck and sideboard, prefilled from your guide). Screenshots (upload or paste) come first, then replays and notes.
- **History** – every recorded match with search (Legend, battlefield, event, notes), deck filter, per-game sideboarding, screenshots and replays.
- **Matchups** – match, game 1 and post-board win rates per opponent Legend, going first vs second. *Chosen Champions* splits each Legend by the champion it ran. The **Battlefields** grid shows your game win rate with each of your battlefields against each of theirs, for all opponents or one matchup.
- **Sideboard** – an in/out guide per opponent Legend and a copyable cheat sheet.
- **Field** – expected match win rate for an event from the Legends you expect to face.
- **Data** – JSON backup/import, CSV export of every match, format rules.

## Install on a phone

Riftcheese can be installed like an app on any phone (and on desktop Chrome or Edge). It then opens full screen from the home screen and keeps working without a connection.

- **Android** (Chrome, Edge, Samsung Internet): tap **Install** in the banner or under *Data → Install the app*. In other browsers, open the browser menu and choose *Install app* or *Add to Home screen*.
- **iPhone / iPad**: tap **Share** (in Safari it can be under the **•••** button), then **Add to Home Screen**. The Install button in the app shows these steps.

The installed app uses the same data as the website in that browser. Offline, it opens from a cached copy; card images you've viewed before are cached too. Updates show up the next time it opens online.

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

## Screenshot reading

Built but switched off for now (`READ_SHOTS = false` in `riftbound-prep.html`). When on, marking a Riftatlas screenshot as *Final result* sends it to Claude (Anthropic's AI model) through a Supabase Edge Function, [`supabase/functions/read-shot`](supabase/functions/read-shot/index.ts). Claude reads the board and the game log and the match form is filled in for the player to check. Only signed-in accounts can use it, up to 30 screenshots per account per day. To turn it on:

1. Create an API key at [platform.claude.com](https://platform.claude.com) and add some credit. Each screenshot costs roughly 3–6 US cents with Claude Opus 5.5.
2. Supabase → **SQL Editor**: run [`supabase/setup.sql`](supabase/setup.sql) again (safe to re-run). It adds the per-day counter.
3. Supabase → **Edge Functions → Secrets**: add `ANTHROPIC_API_KEY` with your key.
4. Supabase → **Edge Functions → Deploy a new function → Via Editor**: name it `read-shot`, paste the contents of `supabase/functions/read-shot/index.ts` and deploy. With the Supabase CLI instead: `supabase functions deploy read-shot`.
5. Set `READ_SHOTS = true` near the top of the script in `riftbound-prep.html`, run `python scripts/build_index.py`, commit and push. The *Final result* button then appears on each screenshot.

The model, the daily limit and the instructions Claude gets are at the top of `index.ts`. If the flag is on but the function isn't deployed, the app says screenshot reading isn't set up yet; everything else works as before.

## Ads

The site can show Google AdSense ads to help pay for development. They're off until you add your account:

1. Sign up at [adsense.google.com](https://adsense.google.com) with the site's address (the GitHub Pages URL) and wait for approval.
2. Put your publisher id (`ca-pub-…`) in `ADS_CONFIG.client` near the top of the script in `riftbound-prep.html`. For a fixed ad at the bottom of the page, create a display ad unit and put its id in `ADS_CONFIG.slot`; leave `slot` empty to let Auto ads place them.
3. Run `python scripts/build_index.py` (it adds the AdSense tags to `index.html` and writes `ads.txt`), commit and push.
4. In AdSense, under **Privacy & messaging**, publish a consent message for EEA, UK and Swiss visitors.

Ads never appear in the Claude artifact version. `privacy.html` explains the ads and data storage; keep it linked (the footer does) since AdSense requires a privacy policy.

## Files

- `index.html` – the page served by GitHub Pages (generated).
- `riftbound-prep.html` – the source page (also used as a Claude artifact).
- `supabase/setup.sql` – database tables, file bucket and access rules for cloud saving, and the daily counter for screenshot reading.
- `supabase/functions/read-shot/index.ts` – the Edge Function that reads a final-result screenshot with Claude.
- `scripts/build_index.py` – regenerates `index.html` from the source (and `ads.txt` when ads are set up): `python scripts/build_index.py`.
- `privacy.html` – privacy page linked from the footer.
- `manifest.webmanifest`, `sw.js`, `icons/` – what makes the site installable: the app manifest, the service worker (offline cache) and home-screen icons. `python scripts/make_icons.py` redraws the icons.
- `cards/` – card data (`cards.json`) and image sprite sheets.

## Credits

Card data from [Riftcodex](https://riftcodex.com). Riftbound, its cards and card images are the property of Riot Games. This is an unofficial fan tool, not endorsed by or affiliated with Riot Games.
