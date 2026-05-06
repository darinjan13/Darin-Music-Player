# Darin Music Player

Darin Music Player is a desktop-first music player built with React, Vite, and Tauri. It is designed for a local music library workflow, with persistent playlists, track-level crossfade controls, a playful visual layer, and a built-in YouTube audio downloader powered by bundled sidecars.

This project currently sits in the sweet spot between portfolio app and actively evolving desktop tool: it already has a clear product identity, but it is still being refined for reliability, polish, and contributor friendliness.

## Highlights

- Load and browse a local music folder from the desktop filesystem
- Play tracks with queue controls, repeat modes, volume control, and shuffle state
- Save playlists locally between sessions
- Set custom crossfade duration per track, with a global fallback
- Show animated playback visuals with rotating background and funny image assets
- Download YouTube audio directly into the local library using bundled `yt-dlp` and `ffmpeg`
- Minimize to tray and continue behaving like a desktop app instead of a browser-only player

## Stack

- React 19
- Vite 7
- Tailwind CSS 4
- Tauri 2
- Tauri plugins: dialog, fs, shell, store, and log
- Rust backend for tray behavior, window lifecycle handling, and starter asset provisioning

## Local Setup

### Prerequisites

This repo is currently most Windows-friendly.

- Node.js and npm
- Rust toolchain
- Tauri desktop prerequisites for Windows

### Install

```bash
npm install
```

### Run the web app

```bash
npm run dev
```

### Run the Tauri-oriented dev setup

```bash
npm run dev:tauri
```

### Build the frontend

```bash
npm run build
```

### Build the Tauri frontend bundle

```bash
npm run build:tauri
```

Full desktop packaging also depends on a working Tauri CLI and Rust environment. The repository already includes Windows sidecar binaries for `yt-dlp` and `ffmpeg` under `src-tauri/bin/`.

## Project Structure

- `src/App.jsx`: main app shell that ties together library loading, queue selection, playback UI, playlists, downloader visibility, and file operations
- `src/hooks/`: custom hooks for music playback, playlists, track settings, and rotating image behavior
- `src/components/`: player controls, queue/playlist UI, downloader panel, icons, and audio visualizer
- `src-tauri/`: desktop shell, tray setup, window behavior, resource bundling, Rust-side commands, and sidecar configuration

## How It Works

The React frontend manages the player UI and most user interactions. Tauri provides desktop capabilities such as folder picking, filesystem access, local persistence helpers, shell sidecars, and native window/tray behavior.

On first run, the Rust backend provisions image assets into an application data vault. The frontend then uses those local assets to drive background rotation and playback visuals while the audio hooks coordinate queue state, playback timing, and crossfade behavior.

## Current State

- The previous `README.md` was still the default Vite template, so this file now serves as the project's primary documentation
- The app has a strong desktop-specific direction, but it is not yet fully polished for release
- `npm run lint` currently reports existing issues, including React hook rule violations and lint noise from Tauri-generated build output
- Some flows still rely on browser-native `prompt` and `confirm` dialogs for playlist and file actions
- The app is intentionally desktop-first because it depends on Tauri APIs and local filesystem access

## Contributing

Contributions are welcome, especially around playback reliability, UI polish, and desktop UX improvements.

- Run `npm run lint` before submitting changes, and expect to work through existing lint noise in the repo
- Keep Tauri constraints in mind when changing file access, shell commands, or desktop-specific behavior
- Prefer focused contributions that improve one area clearly rather than broad refactors without verification

## Next Improvements

- Wire the existing search state into a visible search input and library filtering flow
- Clean up current lint failures and tighten React hook compliance
- Replace browser `prompt` and `confirm` flows with better in-app dialogs
- Harden queue and crossfade behavior around edge cases and state synchronization
- Improve packaging/readiness documentation for future distribution

## Notes

This README reflects the current repository state as of May 6, 2026. It intentionally describes both the strengths of the app and the rough edges that are still being improved.
