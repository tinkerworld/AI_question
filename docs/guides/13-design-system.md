# UI/UX Design System Documentation

This document outlines the design system for the Adaptive Examination & AI Learning Platform. It is implemented in our Next.js 15 frontend using Tailwind CSS and CSS Custom Properties.

## 1. Design Tokens

We use HSL values for colors to allow easy manipulation and theming via CSS variables.

### Colors
- **Primary**: Brand color used for primary actions and active states.
- **Secondary**: Used for secondary actions and structural elements.
- **Accent**: Used to highlight important features or calls to action.
- **Semantic**:
  - *Success*: Green (e.g., correct answers, saved states)
  - *Warning*: Yellow/Orange (e.g., expiring timers, destructive actions warning)
  - *Error*: Red (e.g., incorrect answers, validation errors)
  - *Info*: Blue (e.g., tooltips, informational banners)
- **Neutral Scale**: Slate & Gray scales for text, backgrounds, and borders.
- **3 Theme Color Modes**:
  - `LIGHT` (`data-theme="light"`): Pure crisp light mode (`bg-white` `#FFFFFF`, card `#F8FAFC`, text `#0F172A`, accent `#2563EB`).
  - `GRAY` (`data-theme="gray"`): Slate warm neutral low-contrast mode (`bg-slate-800` `#1E293B`, card `#334155`, text `#F1F5F9`, accent `#3B82F6`) designed specifically to minimize digital eye strain during multi-hour exams and reading.
  - `DARK` (`data-theme="dark"`): Deep obsidian dark mode (`bg-slate-950` `#090D16`, card `#111827`, text `#F9FAFB`, accent `#60A5FA`).

### Typography
- **Font Family**: `Inter` (sans-serif) for all UI text to ensure clarity and modern aesthetics.
- **Scale**: xs (0.75rem) through 4xl (2.25rem).
- **Weights**: Regular (400), Medium (500), Semibold (600), Bold (700).
- **Line Heights**: Tight (for headings), Normal (for body text), Relaxed (for reading long paragraphs).

### Spacing & Layout
- **Base Unit**: 4px scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96).
- **Breakpoints**: 
  - Mobile: `<640px`
  - Tablet: `640px - 1024px`
  - Desktop: `>1024px`
- **Border Radius**: sm (4px), md (8px), lg (12px), xl (16px), full (9999px).

### Depth & Elevation
- **Shadows**: sm, md, lg, xl. Includes glassmorphism variants (backdrop-blur) for floating elements.
- **Z-Index Scale**: 
  - Dropdown: 100
  - Sticky/Header: 200
  - Modal/Drawer: 300
  - Toast/Notification: 400

### Transitions
- **Fast**: 150ms (Hover states, color changes)
- **Normal**: 250ms (Dropdowns, simple modals)
- **Slow**: 350ms (Page transitions, large structural shifts)

## 2. Component Library

Our component library relies on shared styles mapped to the tokens above.

### Core Primitives
- **Button**: Variants (primary, secondary, outline, ghost, danger), Sizes (sm, md, lg), states (disabled, loading).
- **Inputs**: Text Input, Select, Textarea, Checkbox, Radio, Toggle Switch. Includes focus rings and validation states.
- **Feedback**: Toast/Notification, Alert Box, StatusBadge (e.g., active, draft, archived).

### Layout & Containers
- **Card / Panel**: For grouping related information (e.g., course cards, user profiles).
- **Navigation**: Sidebar (responsive drawer on mobile), Navbar, Breadcrumb for deep hierarchies.
- **Overlays**: Modal, Dialog (for confirmations), Drawer/Sheet (for complex side forms).

### Complex/Domain-Specific Components
- **DataTable**: Supports server-side sorting, filtering, pagination, and row selection.
- **Tree**: Specialized component for the Syllabus Builder (Subjects > Topics > Subtopics).
- **Question Renderer**: Dynamic component that renders differently based on question type (MCQ, Fill in the Blanks, Coding, Matrix).
- **Timer**: Sticky, high-visibility component for live exams.
- **Progress Indicators**: Mastery bars, proficiency heatmaps, and step indicators.

## 3. Accessibility (a11y)

The application MUST meet **WCAG 2.1 AA** standards:
- **Keyboard Navigation**: All interactive elements must be fully navigable via Tab/Shift+Tab and triggered via Enter/Space.
- **ARIA Labels**: Proper use of `aria-label`, `aria-expanded`, `aria-hidden` etc., on custom components.
- **Color Contrast**: Text and interactive elements must have a minimum contrast ratio of 4.5:1 against their backgrounds.
- **Focus Management**: Focus must be trapped inside Modals/Drawers when open, and returned to the trigger element when closed.

## 4. Dark Mode

- Full Dark Mode support is implemented via CSS custom property switching.
- Respects the user's OS preference (`prefers-color-scheme`) but provides a manual toggle in the UI.

## 5. Animations

- **Micro-interactions**: Subtle scale or color shifts on hover/active states.
- **Loading States**: Skeletons for structural loading (preferred over spinners) to reduce layout shift.
- **Page Transitions**: Simple fade-ins to make client-side routing feel smooth.
