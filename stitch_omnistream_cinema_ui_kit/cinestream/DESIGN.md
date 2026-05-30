---
name: CineStream
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#e9bcb6'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#af8782'
  outline-variant: '#5e3f3b'
  surface-tint: '#ffb4aa'
  primary: '#ffb4aa'
  on-primary: '#690003'
  primary-container: '#e50914'
  on-primary-container: '#fff7f6'
  inverse-primary: '#c0000c'
  secondary: '#a6e6ff'
  on-secondary: '#003543'
  secondary-container: '#14d1ff'
  on-secondary-container: '#00566b'
  tertiary: '#c8c6c5'
  on-tertiary: '#313030'
  tertiary-container: '#737272'
  on-tertiary-container: '#fbf8f7'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad5'
  primary-fixed-dim: '#ffb4aa'
  on-primary-fixed: '#410001'
  on-primary-fixed-variant: '#930007'
  secondary-fixed: '#b7eaff'
  secondary-fixed-dim: '#4cd6ff'
  on-secondary-fixed: '#001f28'
  on-secondary-fixed-variant: '#004e60'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 64px
    fontWeight: '800'
    lineHeight: 72px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Montserrat
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1440px
  gutter-desktop: 24px
  margin-desktop: 64px
  gutter-mobile: 16px
  margin-mobile: 20px
---

## Brand & Style
The design system is engineered for high-performance cinematic immersion. The brand personality is authoritative, fast, and premium, positioning the content as the hero while the interface recedes into a sophisticated supporting role.

The visual style is **Dark Cinematic**, blending **Minimalism** with **Glassmorphism**. By utilizing deep charcoal foundations and high-contrast accents, the system evokes the feeling of a darkened theater. Interactive elements use vibrant neon accents to provide clear wayfinding without distracting from the visual storytelling of movie key art. The emotional goal is to provide a seamless, luxurious "lean-back" experience that feels both technically advanced and effortless to navigate.

## Colors
The palette is rooted in absolute darkness to maximize the dynamic range of movie posters and trailers. 

- **Primary (Action Red):** Reserved for critical actions, branding, and active states. It demands attention and signals energy.
- **Secondary (Neon Blue):** Used for secondary interactions, progress bars, and informational highlights to provide a "tech-forward" contrast to the red.
- **Neutral (Cinema Black):** The foundation of the UI (#0F0F0F). All background surfaces use this or slightly lighter tiered shades to create depth.
- **Surface Tiers:** Use `#1A1A1A` for containers and `#262626` for hover states or elevated card backgrounds.

## Typography
The typography strategy balances the bold, geometric impact of **Montserrat** for headlines with the exceptional legibility of **Inter** for UI and metadata. 

Headlines use tight letter-spacing and heavy weights to command the screen. Body text is kept clean with generous line heights to ensure readability against dark backgrounds. Metadata and labels (like genres or durations) utilize uppercase Inter with increased letter-spacing to create a distinct "data" aesthetic that feels precise and organized.

## Layout & Spacing
This design system utilizes a **fluid grid** model with significant horizontal margins to create a "widescreen" feel. 

- **Desktop:** 12-column grid. Large 64px margins ensure content doesn't feel cramped on ultra-wide displays.
- **Tablet:** 8-column grid with 32px margins.
- **Mobile:** 4-column grid with 20px margins.

Spacing follows an 8px base unit. Vertical rhythm should be generous between content categories (e.g., "Trending" vs "Recommended") to allow the movie posters to breathe and prevent the UI from feeling cluttered.

## Elevation & Depth
Depth is achieved through **Glassmorphism** and **Tonal Layering** rather than traditional shadows. 

1. **Backdrop Blurs:** Navigation bars and overlays use a 20px background blur with a 10% white tint to create a frosted glass effect that allows the colors of the underlying movie posters to bleed through.
2. **Inner Glows:** Instead of drop shadows, elevated elements like focused cards use a subtle 1px white inner-border (opacity 10%) to define their edges against the black background.
3. **Z-Index Strategy:** Content is tiered into three levels:
   - Level 0: Background (#0F0F0F).
   - Level 1: Content Cards and Grids.
   - Level 2: Floating Navigation and Modals (Glassmorphic).

## Shapes
The design system uses **Soft** geometry (4px - 8px radius) to maintain a modern, professional look without feeling overly "bubbly" or childish. 

- **Movie Posters:** Use 8px (rounded-lg) to soften the edges of the key art.
- **Buttons & Inputs:** Use 4px (base) for a sharp, precision-engineered feel.
- **Interactive Chips:** Use pill-shapes for category tags to distinguish them from actionable buttons.

## Components

### Buttons
- **Primary:** Action Red (#E50914) background with white text. High-contrast, no border.
- **Secondary:** Ghost style. Transparent background with a 1.5px white or Neon Blue border.
- **Hover States:** Increase brightness by 10% and apply a subtle glow effect (Neon Blue or Red) depending on the context.

### Cards (Movie Items)
- **Base State:** Simple poster art with 8px corner radius.
- **Focus State:** Scale up by 1.05x. Apply a 2px Neon Blue border and display a glassmorphic overlay containing metadata (Year, Rating, Duration).

### Input Fields
- Dark grey (#1A1A1A) background with a 1px border. 
- On focus, the border transitions to Neon Blue with a subtle outer glow.

### Progress Bars (Video Player)
- **Track:** Semi-transparent white (20% opacity).
- **Progress:** Neon Blue (#00D1FF) for technical precision.

### Navigation
- Top-anchored or side-rail navigation. Use glassmorphic backgrounds (20px blur) to maintain immersion as the user scrolls content underneath.