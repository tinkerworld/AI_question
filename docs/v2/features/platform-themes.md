# Feature: Platform Themes & Visual Customization

## 1. Purpose
The Platform Themes system extends the application's visual customization beyond the baseline 3-theme mode (Light, Slate Gray, Dark) by introducing configurable **Primary Accent Color Palettes**, an **Accessibility Mode** (High-Contrast, Reduced Motion, and Typography Scaling), and custom institution branding presets while preserving zero-flash CSS hydration.

## 2. Current State
Verified against the codebase:
- `ThemeContext.tsx` and `theme.ts` support 3 base themes: `LIGHT`, `GRAY`, `DARK` with CSS classes `theme-light`, `theme-gray`, `theme-dark` in `theme.css`.
- `ThemeSwitcher.tsx` provides a 3-button toggle in the header.
- Preferences are saved to `user_preferences` via `preference.routes.ts`.
- **The Concrete Gap**: Accent colors, contrast ratios, and font scales are hardcoded. There are no secondary accent palettes (e.g. Indigo, Emerald, Royal Blue, Crimson), no high-contrast accessibility mode, and no institutional brand theme styling.

## 3. Problem / Requirement
Users and educational institutions require richer visual personalization and accessibility accommodations:
- **Visual Diversity**: Modern platforms require distinct brand identity palettes (e.g. Emerald Green for Medical/Life Sciences, Royal Blue for Engineering/Tech, Crimson for Legal/Civil Services).
- **Accessibility Compliance (WCAG 2.1 AA)**: Visually impaired students need a High-Contrast mode (contrast ratio $\ge 7:1$), larger base typography scaling (100%, 110%, 125%), and Reduced Motion toggles to minimize vestibular motion sensitivity.
- **Persistence & Performance**: Must persist in `user_preferences` database and `localStorage` to eliminate visual flashing on page reloads.

## 4. Proposed Solution
1. Refactor `ThemeContext.tsx` to manage a composite visual preference state:
   - `baseTheme`: `'LIGHT'` | `'GRAY'` | `'DARK'`
   - `accentPalette`: `'INDIGO'` | `'EMERALD'` | `'ROYAL_BLUE'` | `'CRIMSON'` | `'AMBER'` | `'VIOLET'`
   - `accessibility`: `{ highContrast: boolean, reducedMotion: boolean, fontScale: 'NORMAL' | 'LARGE' | 'XLARGE' }`
2. Update `theme.css` with CSS custom properties dynamically mapped to `data-accent`, `data-contrast`, and `data-font-scale` attributes on `<html>`.
3. Enhance `ThemeSwitcher.tsx` and the Settings Page (`SettingsPage.tsx`) with visual palette pickers and accessibility switches.

## 5. User Experience
- **Quick Theme Popover**: Clicking the theme button in the navbar opens a quick palette menu showing the 3 base modes alongside 6 round accent color swatches.
- **Accessibility Controls**: In Settings -> Preferences, users can toggle "High-Contrast Mode" (crisp solid borders, bold text, pure black/white backgrounds) and select larger text scaling.
- **Instant Preview**: Changes take effect immediately across all screens without reloading.

## 6. Admin Experience
- **Platform Branding Presets**: Admins can set default institutional theme palettes and logo assets for the entire platform.

## 7. Technical Architecture
- **Frontend Context**: `apps/web/src/context/ThemeContext.tsx`.
- **CSS Variable Architecture**:
  ```css
  :root[data-accent="emerald"] {
    --accent-primary: #10b981;
    --accent-hover: #059669;
    --accent-glow: rgba(16, 185, 129, 0.2);
  }
  :root[data-contrast="high"] {
    --border-color: #000000;
    --text-muted: #111827;
    --contrast-ratio: 7;
  }
  ```
- **Hydration**: `index.html` inline script reads `localStorage` and applies attributes before React mounts, guaranteeing 0ms flash of unstyled theme.

## 8. Database
*No Prisma schema modifications applied during planning.*
Existing `user_preferences` table payload extended:
```json
{
  "themeMode": "DARK",
  "accentPalette": "EMERALD",
  "highContrast": false,
  "reducedMotion": false,
  "fontScale": "NORMAL"
}
```

## 9. API
- `GET /api/v1/preferences` (Auth: Authenticated) — Retrieves visual preferences.
- `PUT /api/v1/preferences` (Auth: Authenticated) — Updates visual preferences.
- `GET /api/v1/platform/branding` (Auth: Public) — Returns default institutional theme preset.

## 10. Frontend
- **Components**:
  - `ThemePaletteSelector.tsx`: Interactive color swatch picker.
  - `AccessibilitySettings.tsx`: High-contrast, font scale, and motion toggles.
  - Updated `theme.css` with 6 accent palettes and accessibility variables.

## 11. AI / External Services
- None required.

## 12. Permissions / Entitlements
- **Personal Preference**: Any authenticated user or guest (stored locally for guests).
- **Global Institutional Default**: Restricted to `MAIN_ADMIN` with `preferences.update`.

## 13. Maintenance Behaviour
- Visual theme engine is pure CSS/client-side and remains 100% operational during backend maintenance.

## 14. Import / Export
- Theme preferences included in user settings export.

## 15. Edge Cases
- Student in High-Contrast mode takes exam with custom exam player theme: Accessibility settings take strict precedence over exam-specific aesthetic styling to ensure readability.
- Browser system preference changes (`prefers-color-scheme` or `prefers-reduced-motion`): System auto-detects and synchronizes if user sets mode to `SYSTEM_DEFAULT`.

## 16. Test Cases
- **Unit (THEME-U001)**: `ThemeContext` parses and validates composite visual settings cleanly.
- **UI (THEME-UI001)**: Selecting `EMERALD` sets `data-accent="emerald"` on document root.
- **UI (THEME-UI002)**: High-contrast toggle applies high-contrast border and text styles across all active buttons.
- **API (THEME-A001)**: `PUT /api/v1/preferences` successfully persists accent palette and font scale.
- **Accessibility (THEME-ACC001)**: Contrast ratio in High-Contrast Dark mode exceeds 7:1 against background.

## 17. Acceptance Criteria
- [ ] 6 accent color palettes (Indigo, Emerald, Royal Blue, Crimson, Amber, Violet).
- [ ] High-contrast mode complying with WCAG 2.1 AA contrast requirements.
- [ ] Typography scale options (100%, 110%, 125%) with responsive layouts.
- [ ] Zero-flash CSS hydration on reload.
- [ ] Synchronization with `user_preferences` API.

## 18. Dependencies
- `apps/web/src/context/ThemeContext.tsx`
- `apps/api/src/routes/preference.routes.ts`

## 19. Future Improvements
- Custom CSS variable injector for enterprise institutional white-labeling.
- Auto-switching dark mode schedule (Light theme during day, Dark theme at sunset).
