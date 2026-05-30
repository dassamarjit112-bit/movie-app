---
name: Cosmic Immersive System
colors:
  surface: '#13131b'
  surface-dim: '#13131b'
  surface-bright: '#393841'
  surface-container-lowest: '#0d0d15'
  surface-container-low: '#1b1b23'
  surface-container: '#1f1f27'
  surface-container-high: '#292932'
  surface-container-highest: '#34343d'
  on-surface: '#e4e1ed'
  on-surface-variant: '#d4c0d7'
  inverse-surface: '#e4e1ed'
  inverse-on-surface: '#303038'
  outline: '#9d8ba0'
  outline-variant: '#514255'
  surface-tint: '#ecb2ff'
  primary: '#ecb2ff'
  on-primary: '#520071'
  primary-container: '#bd00ff'
  on-primary-container: '#ffffff'
  inverse-primary: '#9900cf'
  secondary: '#d3fbff'
  on-secondary: '#00363a'
  secondary-container: '#00eefc'
  on-secondary-container: '#00686f'
  tertiary: '#c9bfff'
  on-tertiary: '#2f009c'
  tertiary-container: '#7658ff'
  on-tertiary-container: '#ffffff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#f8d8ff'
  primary-fixed-dim: '#ecb2ff'
  on-primary-fixed: '#320047'
  on-primary-fixed-variant: '#74009f'
  secondary-fixed: '#7df4ff'
  secondary-fixed-dim: '#00dbe9'
  on-secondary-fixed: '#002022'
  on-secondary-fixed-variant: '#004f54'
  tertiary-fixed: '#e5deff'
  tertiary-fixed-dim: '#c9bfff'
  on-tertiary-fixed: '#1b0063'
  on-tertiary-fixed-variant: '#4500d8'
  background: '#13131b'
  on-background: '#e4e1ed'
  surface-variant: '#34343d'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-padding: 24px
  gutter: 16px
  sidebar-width: 80px
  section-gap: 32px
  stack-sm: 8px
  stack-md: 16px
---

## Brand & Style

The design system is centered on a high-end, cinematic entertainment experience optimized for large-format touch devices. It evokes a sense of "digital exploration" through a futuristic, cosmic aesthetic. The personality is immersive, sleek, and premium, targeting tech-savvy users who appreciate high-fidelity visuals.

The design style is **Deep Glassmorphism** mixed with **Modern Futurology**. Key characteristics include:
- **Depth-first layering:** Using varying levels of backdrop blur to establish hierarchy.
- **Floating Architecture:** All main UI containers are detached from the screen edges, creating a "hud" feel.
- **Vibrant Interaction:** Neutral glass surfaces are punctuated by high-energy neon accents for primary actions.

## Colors

The palette is rooted in a dark, nocturnal foundation to allow content and glass effects to shine. 

- **Primary (Neon Magenta):** Used for critical calls to action, active states, and focus highlights.
- **Secondary (Electric Cyan):** Used for progress indicators, secondary interactive elements, and data visualization.
- **Tertiary (Deep Indigo):** Used for subtle gradients within glass surfaces to add richness.
- **Surface Neutrals:** A range of semi-transparent grays and deep navies that serve as the base for glass containers.

All surfaces must maintain a minimum of 40% transparency to allow the cosmic background to bleed through, maintaining the "nebula" aesthetic.

## Typography

This design system utilizes **Plus Jakarta Sans** for headlines and labels to provide a soft, modern geometric feel that complements the rounded UI. **Be Vietnam Pro** is used for body text to ensure high legibility against complex, blurred backgrounds.

- **Weight Usage:** Bold weights are reserved for content titles to pull them forward from the glass background.
- **Letter Spacing:** Labels and small metadata should use slight tracking (0.05em) to improve readability on translucent surfaces.
- **Hierarchy:** High contrast in font sizes is essential to guide the eye across the multi-pane tablet layout.

## Layout & Spacing

The layout follows a **Fixed-Component Fluid Grid**. Containers have fixed maximum widths on large tablets but scale fluidly on smaller devices.

- **Vertical Sidebar:** A sleek, integrated sidebar is fixed to the left, acting as a floating glass "dock."
- **Paneled Layout:** Content is divided into distinct floating glass panels. On tablet, this uses a 12-column grid:
    - Sidebar: 1 Column
    - Main Content: 7 Columns
    - Supplemental/Info Panel: 4 Columns
- **Floating Margins:** Main containers never touch the screen edge; a minimum "safe zone" of 24px of the background remains visible at all times.

## Elevation & Depth

Hierarchy is defined through "Glass Tiers" rather than traditional shadows:

1.  **Level 0 (Background):** The vibrant nebula image, slightly dimmed.
2.  **Level 1 (Main Containers):** Low-opacity (20-40%) glass with a 40px backdrop blur and a thin (1px) inner white border at 10% opacity.
3.  **Level 2 (Interactive Elements):** Higher opacity glass (60%) or saturated gradients (Primary/Secondary colors) that appear to sit closer to the user.
4.  **Level 3 (Popovers/Tooltips):** Near-opaque surfaces with intense backdrop blurs (80px) to completely isolate the foreground from the background noise.

## Shapes

The shape language is defined by **Extreme Radii**. 

- **Primary Containers:** 32px to 40px corner radius to emphasize the "floating pod" aesthetic.
- **Buttons & Small UI:** 12px to 16px radius.
- **Search Bars & Icons:** Use fully rounded (pill-shaped) ends for a streamlined, aerodynamic look.
- **Visual Continuity:** Inner elements should have a radius that is 8px-12px smaller than their parent container to maintain visual harmony.

## Components

### Glass Cards
The core unit of the design system. Features a subtle top-down linear gradient (White @ 10% to White @ 0%) and a `1px` stroke to simulate a light-catching edge.

### Interactive Accents
- **Primary Buttons:** High-saturation gradients (Magenta to Purple) with a soft glow effect (box-shadow with the same color at 30% opacity).
- **Secondary Buttons:** Ghost style with a neon cyan border.

### Sidebar Navigation
Icons are contained within "glass bubbles." The active state is indicated by a glowing background pulse behind the icon and a primary color vertical indicator.

### Input Fields
Fully pill-shaped with a dark, semi-transparent fill (40% black). Focus state should ignite the `Secondary` cyan border and a subtle inner glow.

### Chips & Tags
Small, highly rounded capsules with a 10% white fill and uppercase labels for content categorization (e.g., "4K", "TRENDING").