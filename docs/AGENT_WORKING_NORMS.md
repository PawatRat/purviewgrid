# Purview Engineering & Agent Working Norms
### Standard Operating Playbook for AI Agents & Engineers

This document defines the core philosophy, collaboration standards, architectural expectations, and quality gates for AI agents and developers working on the **Purview** codebase.

---

## 1. Product Philosophy & Taste Standards

1. **Studio-Grade Modern Minimalist Aesthetic**:
   - Inspired by **Linear, Raycast, Figma, and Apple native software**.
   - Dark zinc/slate palette (`#09090b` canvas, `#121316` surface, `#131418` cards).
   - Crisp 1px subtle borders (`rgba(255, 255, 255, 0.06)`), refined typography (Apple SF Pro / Inter font stack).
   - Zero informal emojis in production UI — use precision SVG stroke vectors.
   - Zero wasted vertical space — compact 48px top bar with native macOS traffic light clearance (84px left padding).

2. **Local-First, Fast & Private**:
   - Zero cloud accounts, zero telemetry bloat, zero heavy database setup.
   - Reference files directly in place without making unnecessary duplicates on disk.
   - Persistent memory via lightweight local storage (`localStorage` / local JSON index).

3. **No Feature Bloat**:
   - Strictly focus on core user requirements (History, Pinning, Favorites, Albums, Fluid Masonry, Focus Board Packing).
   - Do not introduce unrequested complex features (e.g. AI auto-tagging, cloud sync, complex file daemons) unless explicitly aligned.

---

## 2. Requirements & Communication Protocol

1. **Requirements Before Code**:
   - When discussing product scope, describe features from a **user-experience and product perspective** rather than technical jargon.
   - Maintain clear specifications in [`docs/APP_DESIGN_REQUIREMENTS.md`](docs/APP_DESIGN_REQUIREMENTS.md).

2. **Planning for Major Changes**:
   - Propose architectural or feature plans before making destructive or large-scale modifications.
   - Align on user intent and confirm approval prior to execution.

3. **Clear & Actionable Summaries**:
   - Be concise and structured. Use bullet points and clickable file/commit links.

---

## 3. Architecture & Code Quality Standards

1. **Modular Code Structure**:
   ```
   src/
   ├── components/       # Presentational & interactive UI components
   │   ├── TopNavbar.jsx
   │   ├── Sidebar.jsx
   │   ├── MasonryGrid.jsx
   │   ├── ImageCard.jsx
   │   ├── Lightbox.jsx
   │   ├── PinnedBoard.jsx
   │   ├── EmptyState.jsx
   │   └── icons.jsx     # Centralized SVG vector icons
   ├── hooks/            # Custom React hooks (e.g. usePersistentState)
   ├── data/             # Static sample data & default fixtures
   ├── utils/            # Pure helpers (packing algorithm, image URLs)
   ├── styles/           # Scoped CSS modules (navbar, sidebar, gallery, etc.)
   ├── App.jsx           # Root layout & state coordinator
   └── main.jsx          # Vite React root
   ```

2. **Strict Linting & Build Cleanliness**:
   - Every single change **MUST pass `npm run lint` with 0 errors and 0 warnings**.
   - Every single change **MUST pass `npm run build:vite`** without missing imports or external resolution errors.
   - No unused variables or missing React Hook dependency array warnings.

---

## 4. Packaging, Release & Verification Norms

1. **Real-App Production Deployment**:
   - When the user asks to publish / update the app:
     1. Build Vite production bundle (`npm run build:vite`).
     2. Package macOS binary with electron-builder (`npm run build:electron`).
     3. Install directly to `/Applications/Purview.app` (`rm -rf /Applications/Purview.app && cp -R release/mac-arm64/Purview.app /Applications/`).
     4. Open and verify live execution (`open /Applications/Purview.app`).
     5. Keep standalone installers (`release/Purview-1.0.0-arm64.dmg` & `release/Purview-1.0.0-arm64-mac.zip`) available.

2. **High-Resolution Icon Integrity**:
   - The macOS app bundle must use high-resolution Apple ICNS assets generated from [`public/favicon.svg`](public/favicon.svg) located at [`build/icon.icns`](build/icon.icns) and [`build/icon.png`](build/icon.png).

---

## 5. Git & Account Integrity

1. **Author Authentication**:
   - All Git commits and GitHub pushes MUST be executed under the verified account:
     - **Username**: `PawatRat`
     - **Email**: `143491992+PawatRat@users.noreply.github.com`
     - **Repository**: `https://github.com/PawatRat/purviewgrid.git`

2. **Conventional Commit Format**:
   - Use descriptive conventional commit messages:
     - `feat: ...` for new capabilities
     - `refactor: ...` for structural code improvements
     - `chore(release): ...` for release builds & version bumps
     - `docs: ...` for documentation and design specs

---

## 6. Execution Mindset

- **Autonomous & Thorough**: Fix lints, verify builds, test packaging, and resolve issues proactively.
- **Respect Sandbox Boundaries**: Use `BypassSandbox: true` when running package builds, Git push operations, or filesystem installations to `/Applications`.
- **Zero Drift**: Keep repository code, documentation, and live `/Applications/Purview.app` in complete synchronization.
