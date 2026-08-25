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
- [`TimerService`](src/app/services/timer.service.ts) — the core pomodoro state machine. Holds `settings`, `phase` (`work` | `shortBreak` | `longBreak`), `secondsRemaining`, `isRunning`, `workPeriodsCompleted`, and `completedPeriods` as signals, plus derived `computed()` signals (`phaseDurationSeconds`, `progress`). Ticks via `rxjs interval(1000)`. Phase transitions and long-break cadence are driven by `settings.sessionsBeforeLongBreak`. Persists settings and history through `StorageService`. Async-restores state on construction; consumers that need restored state to be in place should `await timer.ready` first (see `SettingsPage.ngOnInit`).
- [`ThemeService`](src/app/services/theme.service.ts) — dark mode as a signal, persisted via `StorageService`, applied by toggling a `dark` class on `document.body` inside an `effect()`.

Both services depend on [`StorageService`](src/app/services/storage.service.ts), a thin JSON-serializing wrapper around `@capacitor/preferences` (works in both the browser build and the native Capacitor app).

**Domain model and constants** live in [`src/app/models/pomodoro.model.ts`](src/app/models/pomodoro.model.ts): `PomodoroSettings`, `DEFAULT_SETTINGS`, timer presets (`PRESETS`), rest-break copy (`REST_IDEAS`), Spanish phase labels (`PHASE_LABELS`), and `extractYouTubeId()` — a pure function that validates/normalizes a pasted YouTube URL or bare ID into a video ID (used for the background-sound video setting, embedded via `youtube-nocookie.com` with `DomSanitizer.bypassSecurityTrustResourceUrl`).

**Home page composition**: `HomePage` (the `/home` route component) is a thin shell that owns global keyboard shortcuts (Space = start/pause, S = skip, R = reset, T = toggle theme, 1–4 = apply preset) and composes three presentational children under `src/app/home/components/`: `home-header`, `panel-main` (the countdown ring + controls), and `panel-side` (presets, progress dots, embedded YouTube player). These child components each inject `TimerService`/`ThemeService` directly rather than receiving `@Input()`s from `HomePage` — there's duplication of small getters (e.g. `currentWorkPeriod`, `dashOffset`, `headline`) across `HomePage`, `panel-main`, and `panel-side` by design of that pattern; keep that in mind when changing shared timer-display logic in one place, since it's mirrored in the others.

**Settings page**: `SettingsPage` edits a local copy of `PomodoroSettings` (`form`) and only commits it via `timer.updateSettings()` on explicit save, clamping numeric fields to be positive integers.

## Platform targets

- Web build output (`www/`) is deployed to GitHub Pages from `main` via GitHub Actions.
- `android/` is a generated Capacitor native project (`capacitor.config.ts` sets `webDir: 'www'`) — run `npx cap sync android` after a web build if native platform files need updated web assets.
