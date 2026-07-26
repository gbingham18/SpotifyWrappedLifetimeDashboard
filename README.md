# REPLAY redesign — patch for SpotifyWrappedLifetimeDashboard

Drop-in patch that ports the minimalist warm dashboard from the prototype into
your Rails app. Backend, models, controllers (Rails), services, routes, and the
Stimulus controller logic stay the same — this only touches view templates,
the stylesheet, and the inline color/typography choices inside chart
controllers.

## What changed

### Stylesheet
- `app/assets/stylesheets/application.scss` — full rewrite. Defines design tokens
  as CSS custom properties on `:root` (so chart controllers can read them via
  `getComputedStyle`), restyles every component (sidebar, year pills, tiles,
  top-artist/track lists, heatmap cells, upload card, progress bar,
  bootstrap form-select/form-control overrides), and replaces the
  green-on-black palette with warm-cream-on-dark plus a green accent.
- Bootstrap import is preserved — only the visual layer is overridden.

### Layout
- `app/views/layouts/application.html.erb` — adds Google Fonts (Geist +
  JetBrains Mono) via `<link rel="stylesheet">`. Title default → "Replay".

### Dashboard
- `app/views/summaries/show.html.erb` — replaces the inline `<style>` block with
  CSS classes, splits the top-artist/track lists into a 2-column grid inside a
  flatter tile, replaces the four `<h3>` icon-and-number stat rows with a
  cleaner three-column grid (icon · label · large value), and rebuilds the
  streamgraph entity-list sidebar to match the warm theme.

### Upload screen
- `app/views/imports/index.html.erb` — single centered card with brand mark,
  title, lede, dropzone, animated progress bar, and a 3-step "how to get your
  export" footer.
- `app/views/imports/_form.html.erb` — minor markup polish (sub-copy under the
  dropzone), error-explanation styling matches new theme.

### Stimulus chart controllers
All hardcoded colors are replaced with `getComputedStyle(...).getPropertyValue('--token')`
reads (with hex fallbacks) so the charts pick up the theme automatically. The
controllers' data-loading / interaction logic is unchanged.
- `app/javascript/controllers/tree_controller.js` — accent-colored bars on the
  listening tree, themed pagination buttons.
- `app/javascript/controllers/hourly_listening_controller.js` — single-accent
  bars, monospace axis labels, dimmed early-AM hours, lighter axis lines.
- `app/javascript/controllers/daily_listening_controller.js` — same treatment.
- `app/javascript/controllers/barchart_controller.js` — desaturated artist
  palette, themed background/dividers, smaller sans title, sans-bold labels.
- `app/javascript/controllers/streamgraph_controller.js` — warm-coordinated
  layer palette, themed tooltip, themed entity toggle list.

The `heatmap_controller.js` is untouched — it already uses level-N CSS classes
which the new stylesheet rebinds to a warm intensity scale via `color-mix`.

## How to apply

From your Rails app root:

```bash
# Back up first if you want
git checkout -b replay-redesign

# Drop the patch in
cp -R /path/to/rails_patch/. .

# Sanity check
git status

# Restart your server so the SCSS recompiles
bin/dev
```

You shouldn't need to run `bundle install`, `yarn install`, or any migrations
— no dependencies or schema changes.

## Tokens reference

Defined on `:root` in `application.scss`. Override any of these to retheme.

| Token             | Value      | Used for                          |
|-------------------|-----------|-----------------------------------|
| `--bg`            | `#0E0D0B` | page background                   |
| `--bg-2`          | `#15130F` | input fields, secondary surfaces  |
| `--card`          | `#1A1814` | tiles / cards                     |
| `--card-hover`    | `#221F1A` | hover state for rows              |
| `--line`          | `#2A2620` | borders, axis lines               |
| `--line-soft`     | `#1F1C17` | dividers, heatmap empty cells     |
| `--ink`           | `#F2EDDF` | primary text                      |
| `--ink-soft`      | `#C9C0AB` | secondary text                    |
| `--ink-mute`      | `#847C6B` | labels                            |
| `--ink-faint`     | `#54503F` | de-emphasized text                |
| `--accent`        | `#66D46E` | call-to-action, active state      |
| `--accent-ink`    | `#07190A` | text on accent surfaces           |
| `--accent-soft`   | `#1F4A25` | focus rings                       |

## Notes

- Heatmap intensity scale uses CSS `color-mix(in oklab, var(--accent) N%, var(--line-soft))`.
  Modern browsers (Chrome 111+, Safari 16.4+, Firefox 113+) support this.
  If you need to support older browsers, swap the `.level-1` through `.level-4`
  rules in `application.scss` for hardcoded fallbacks.
- All chart controllers read CSS tokens via `getComputedStyle` *at render time*,
  so dynamically swapping the theme (e.g. via a JS toggle that flips
  `document.documentElement.dataset.theme`) works without restarting the page.
  No theme toggle is shipped — wire one up if you want.
- The `streaming-stats-tile` no longer uses the original `streamsIcon.png` /
  `hourglassIcon.png` / etc. at 50×50. They're now 22×22 and tinted to the
  accent via a CSS filter chain. To revert, remove the `filter:` line on
  `.streaming-stats-tile h3 img`.
