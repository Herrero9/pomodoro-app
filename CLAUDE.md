# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

An Ionic + Angular Pomodoro timer app (Spanish-language UI), buildable as a web app (deployed to GitHub Pages) and as an Android app via Capacitor.

## Commands

- `npm start` / `ng serve` — run the dev server.
- `npm run build` / `ng build` — production build, output goes to `www/` (see `outputPath` in [angular.json](angular.json)).
- `npm test` / `ng test` — run unit tests via the `@angular/build:unit-test` builder (Vitest under the hood, jsdom environment, setup file `src/test-setup.ts`).
  - To run a single spec file: `ng test -- src/app/home/home.page.spec.ts` (Vitest filename filtering applies since the builder passes through to Vitest).
- `npm run lint` / `ng lint` — ESLint via `@angular-eslint/builder`, lints `src/**/*.ts` and `src/**/*.html` (flat config in [eslint.config.js](eslint.config.js)).
- `ng build --base-href /pomodoro-app/` — the exact production build command used by the GitHub Pages deploy workflow ([.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml)); pushes to `main` trigger this automatically.

There is no separate `www/` source — it is a build artifact and is gitignored.

## Architecture

**Module structure**: Classic Angular NgModules (not standalone components) — `standalone: false` is set explicitly on every component/page because the Ionic schematics default to standalone. `AppModule` bootstraps `AppComponent` and imports `AppRoutingModule`, which lazy-loads two feature modules by route: `home` (`/home`) and `settings` (`/settings`). Root redirects to `/home`.

**State lives in two root-provided services**, both consumed directly by components via Angular signals — there is no NgRx/store layer:
- [`TimerService`](src/app/services/timer.service.ts) — the core pomodoro state machine, and the single source of truth for anything the UI shows about the timer. Holds `settings`, `phase` (`work` | `shortBreak` | `longBreak`), `secondsRemaining`, `isRunning`, `workPeriodsCompleted`, and `completedPeriods` as signals; every derived value components need is a `computed()` here rather than a getter in a component — `phaseDurationSeconds`, `progress`, `isBreak`, `nextPhase`, `phaseLabel`, `nextPhaseLabel`, `currentCycle`, `cycleDots`, `headline`. Commands (`start`/`pause`/`toggle`/`reset`/`skip`/`applyPreset`/`updateSettings`) live here too, so components stay declarative. Ticks via `rxjs interval(1000)` but counts down against a stored `deadline` timestamp, so a throttled or delayed interval does not lose time. `nextPhase` drives both the "next up" label and the actual transition in `advancePhase`, keeping the long-break cadence (`settings.sessionsBeforeLongBreak`) defined once. Persists settings and history through `StorageService`. Async-restores state on construction; consumers that need restored state to be in place should `await timer.ready` first (see `SettingsPage.ngOnInit`).
- [`ThemeService`](src/app/services/theme.service.ts) — dark mode as a signal, persisted via `StorageService`, applied by toggling a `dark` class on `document.body` inside an `effect()`.

Both services depend on [`StorageService`](src/app/services/storage.service.ts), a thin JSON-serializing wrapper around `@capacitor/preferences` (works in both the browser build and the native Capacitor app).

**Domain model and constants** live in [`src/app/models/pomodoro.model.ts`](src/app/models/pomodoro.model.ts), which also holds all Spanish UI copy: `PomodoroSettings`, `DEFAULT_SETTINGS`, timer presets (`PRESETS`), rest-break copy (`REST_IDEAS`), phase labels (`PHASE_LABELS`), the countdown headline (`headlineFor()`), the keyboard-shortcut legend (`SHORTCUTS`), and `extractYouTubeId()` — a pure function that validates/normalizes a pasted YouTube URL or bare ID into a video ID (used for the background-sound video setting, embedded via `youtube-nocookie.com` with `DomSanitizer.bypassSecurityTrustResourceUrl`).

**Home page composition**: `HomePage` (the `/home` route component) is a shell with no timer state of its own. It owns the global keyboard shortcuts (Space = start/pause, S = skip, R = reset, T = toggle theme, 1–4 = apply preset), renders both layouts (only one is visible — the breakpoint switch is the entire content of `home.page.scss`), and swaps in the break overlay while `timer.isBreak()`. Its children live under `src/app/home/components/`:

- `home-header` — toolbar (cycle counter, theme toggle, link to settings).
- `panel-compact` — the single-column layout used below the desktop breakpoint.
- `panel-main` / `panel-side` — the two desktop panels (title + ring + controls; sound, presets, cycle progress). `panel-main` is also the container the fluid sizes below resolve against.
- `break-overlay` — full-window takeover shown during a break. It is created fresh each break, which is what picks the first `REST_IDEAS` suggestion.
- `period-history` — the list of completed periods.

Components inject `TimerService`/`ThemeService` directly instead of taking `@Input()`s. That only works without duplication because the derived values live in the service: when a component needs a new one, add a `computed()` to `TimerService` rather than a getter in the component.

**Shared presentational pieces** live in [`src/app/shared/`](src/app/shared/) (`SharedModule`, imported by feature modules): `app-progress-ring` (SVG countdown ring, takes `progress` and a `compact`/`panel` variant, projects its centre content), `app-progress-dots` (cycle dots, projects extra content), `app-timer-controls` (start/pause/skip/reset, `showLabels` input) and the `mmss` pipe used by every countdown readout.

**Styling conventions**: [`src/theme/variables.scss`](src/theme/variables.scss) holds every design token — palette, derived text tints, type sizes, spacing, rule widths (`--rule-hairline`/`--rule-thick`), control height, ring geometry — for both the light `:root` and the `body.dark` palette; a token defined in terms of another must be redeclared in `body.dark`. Breakpoints cannot be custom properties, so they are Sass variables in [`src/theme/_breakpoints.scss`](src/theme/_breakpoints.scss) (`@use '.../breakpoints' as bp;`). [`src/global.scss`](src/global.scss) is limited to Ionic's base CSS, a few reused utility classes (`.eyebrow`, `.hr`/`.divider-tight`, `.tabular-nums`, `.run-dot`) and Ionic component defaults remapped onto the tokens. Component stylesheets should reference tokens rather than raw values.

**Fluid sizing on the desktop panels**: `.panel-main` declares `container-type: inline-size` / `container-name: panel-main`, and everything that grows with the window — the title, the countdown, the `%` label and `--ring-size-panel` — is sized in container units (`cqi`) against it, not in `vw`. Viewport units are wrong here: `.panel-side` holds a fluid fixed width (`clamp(var(--sidebar-min-width), 26vw, 42rem)`) rather than a flex share, so the main panel's width is *window minus sidebar* and `vw` overflows it on narrow desktops. Where a size could also outgrow the panel's height, the clamp takes a `min()` with a `vh` term (`min(40cqi, 56vh)`) so a wide-but-short window shrinks it instead of pushing the controls off-panel. The `panel` ring variant is only ever rendered inside this container — `cqi` in `--ring-size-panel` would resolve against the viewport anywhere else.

**Settings page**: `SettingsPage` edits a local copy of `PomodoroSettings` (`form`) and only commits it via `timer.updateSettings()` on explicit save, clamping numeric fields to be positive integers.

## Platform targets

- Web build output (`www/`) is deployed to GitHub Pages from `main` via GitHub Actions.
- `android/` is a generated Capacitor native project (`capacitor.config.ts` sets `webDir: 'www'`) — run `npx cap sync android` after a web build if native platform files need updated web assets.
