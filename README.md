# PokeMMO Guide Creator

Static GitHub Pages app for building PokeMMO raid guides with a step-by-step workflow, synchronized team builder, planner, live preview, and HTML/image export.

Live site:
https://pampaks.github.io/pokemmo-guide-creator/

## What The Website Does

The current site is focused on a raid-guide workflow with four steps:

1. Guide Information
2. Team Creator
3. Turn Planner
4. Export & Preview

Current functionality includes:

- Apple-inspired dark glass UI with a reactive animated background.
- Branded favicon/header logo and a simple footer with Discord, PokeMMO Forums, and GitHub links.
- Step 1 metadata form with lock/edit behavior that does not wipe raid progress.
- Step 2 player-based team building for `P1` to `P4`.
- Three synchronized Step 2 input methods:
  - `Pokepaste Import`
  - `Manual Builder`
  - `Raw Import`
- Step 2 help modal with concise explanations for each workflow.
- Shared team state across all three input methods.
- Manual builder support for:
  - Specific Pokemon slots
  - Flexible type slots
  - Ability, nature, EVs, IVs, item, moves, and notes
- EV/IV validation:
  - EVs clamp to `0-252`
  - IVs clamp to `0-31`
  - EV total is capped at `510`
- Raw import/export helpers:
  - current-player raw sync
  - copy current raw
  - copy all players as `# P1..# P4`
  - load all players from exported raw format
- Visual player team preview board for the active player.
- Turn planner with free-text per-player actions and `FF / Notes`.
- Preview/export that renders only filled planner rows.
- Single-file HTML export with inline CSS, raw copy support, collapsible player sections, and watermark text.
- Styled image export as `WebP` or `JPEG` for quick sharing without sending an HTML file.

## Current Workflow

### Step 1 - Guide Information

Add:

- strategy name
- author
- IGN
- short description

After continuing, the guide info is locked into a summary card, but you can still reopen and edit it later without resetting the raid builder state.

### Step 2 - Team Creator

The raid team builder works per player (`P1` to `P4`).

Available input methods:

- `Pokepaste Import`
  - Paste a Pokepaste URL or ID and import a team directly.
- `Manual Builder`
  - Build one slot at a time for non-technical users.
- `Raw Import`
  - Paste Showdown-style text, render it into the shared team, or load a full `# P1..# P4` export.

Important behavior:

- All three tabs edit the same underlying team state.
- Changing one tab updates the others.
- The active player team is shown below in `Player X Team Preview`.

### Step 3 - Turn Planner

Add turn-by-turn actions for the raid team:

- one free-text action column per player
- one `FF / Notes` column
- add as many turn rows as needed

Only rows with real content are rendered in preview/export.

### Step 4 - Export & Preview

Review the generated guide and export it as a standalone HTML file or a styled image snapshot.

Export behavior:

- inline CSS
- dark theme
- collapsible player team sections
- collapsible raw team section
- copy raw button inside exported HTML
- preview image export as `WebP` or `JPEG`

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript (ES modules)

No build step is required.

## Local Development

1. Clone the repo:

```bash
git clone https://github.com/pampaks/pokemmo-guide-creator.git
cd pokemmo-guide-creator
```

2. Run a local server:

```bash
python -m http.server 8080
```

3. Open:

```text
http://localhost:8080
```

Opening the HTML directly is not recommended because ES modules and asset paths behave more reliably through a local server.

## GitHub Pages

This site is designed to run directly on GitHub Pages.

Deployment URL:
https://pampaks.github.io/pokemmo-guide-creator/

Notes:

- no build pipeline required
- keep the current folder structure intact
- export generated from the deployed site can resolve hosted asset URLs more reliably than a local file context
- Pokepaste import can still fail in-browser because of external network/CORS behavior; raw import remains the reliable fallback

## Project Structure

```text
pokemmo-guide-creator/
|-- assets/
|   |-- icon.png
|   |-- pokemmo.png
|   `-- types/
|-- index.html
|-- styles.css
|-- js/
|   |-- main.js
|   |-- creators/
|   |   |-- guide_workflow.js
|   |   |-- raid.js
|   |   `-- team_creation.js
|   `-- lib/
|       |-- background.js
|       |-- pokemon.js
|       |-- raid_export.js
|       |-- team_raw.js
|       |-- team_render.js
|       `-- team_slots.js
|-- codex.md
`-- README.md
```

## Module Overview

- `js/main.js`
  - App bootstrap.
- `js/creators/guide_workflow.js`
  - Step 1 form, validation, summary lock, and edit flow.
- `js/creators/team_creation.js`
  - Step 2 player tabs, tabbed input workflows, shared team state, validation, and active player preview board.
- `js/creators/raid.js`
  - Raid-specific Step 2-4 orchestration, planner, preview, and HTML export.
- `js/lib/background.js`
  - Reactive background canvas.
- `js/lib/pokemon.js`
  - Pokemon parsing, Pokepaste ID extraction, sprite helpers, and type metadata.
- `js/lib/team_raw.js`
  - Raw serialization/parsing helpers, including `# P1..# P4` sections.
- `js/lib/team_render.js`
  - Live team-board rendering helpers.
- `js/lib/team_slots.js`
  - Flexible type-slot labeling and hydration helpers.
- `js/lib/raid_export.js`
  - Preview/export HTML generation and export download helpers.

## Notes

- Current scope is raid guides only.
- Gym rerun flow is still not developed.
