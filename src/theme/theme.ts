
/**
 * Rumiland Academy — Theme Configuration
 * Centralized theme object for programmatic access to design tokens.
 */

export const theme = {
    colors: {
      primary: {
        50: '#f2f0ff', 100: '#e6e2ff', 200: '#cec7ff', 300: '#b3a5ff',
        400: '#9d86fa', 500: '#8667f2', 600: '#7550e8', 700: '#643fce',
        800: '#51339f', 900: '#3e2a78', 950: '#271a4d',
        main: '#8667f2',
        hover: '#9d86fa',
        active: '#7550e8',
        light: '#e6e2ff',
        glow: 'rgba(134, 103, 242, 0.22)',
      },
      accent: {
        50: '#eefbff', 100: '#d8f4ff', 200: '#b6eaff', 300: '#83daf8',
        400: '#4cc2ef', 500: '#23a8e0', 600: '#1687bd', 700: '#136c99',
        800: '#15577c', 900: '#164864',
        main: '#4cc2ef',
      },
      success: '#34d399',
      successLight: 'rgba(52, 211, 153, 0.16)',
      warning: '#fbbf24',
      warningLight: 'rgba(251, 191, 36, 0.16)',
      danger: '#fb7185',
      dangerLight: 'rgba(251, 113, 133, 0.16)',
      info: '#60a5fa',
      infoLight: 'rgba(96, 165, 250, 0.16)',
  
      bg: {
        root: '#12141d',
        primary: '#14161f',
        secondary: '#171a24',
        tertiary: '#1b1e2a',
      },
      surface: '#1e2230',
      surfaceHover: '#242938',
      surfaceActive: '#2b3144',
      surfaceRaised: '#272d3e',
      card: '#1a1e2b',
      cardHover: '#202534',
      cardBorder: 'rgba(255,255,255,0.07)',
      sidebar: '#10121b',
      sidebarHover: 'rgba(255,255,255,0.05)',
      sidebarActive: 'rgba(134,103,242,0.18)',
      toolbar: 'rgba(20,22,31,0.8)',
      toolbarBorder: 'rgba(255,255,255,0.06)',
      input: '#1a1e2b',
      inputBorder: 'rgba(255,255,255,0.1)',
      inputFocus: '#8667f2',
      inputPlaceholder: 'rgba(255,255,255,0.28)',
  
      text: {
        primary: '#eef0f6',
        secondary: 'rgba(238,240,246,0.78)',
        tertiary: 'rgba(238,240,246,0.54)',
        muted: 'rgba(238,240,246,0.38)',
        inverse: '#12141d',
        link: '#9d86fa',
      },
  
      chart: [
        '#8667f2', '#7550e8', '#4cc2ef', '#34d399', '#fbbf24',
        '#fb7185', '#ec4899', '#23a8e0', '#f97316', '#9d86fa',
        '#a855f7', '#34d399',
      ],
    },
  
    typography: {
      fontFamily: "'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontFamilyMono: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: {
        xs: '0.6875rem', sm: '0.75rem', base: '0.8125rem', md: '0.875rem',
        lg: '1rem', xl: '1.125rem', '2xl': '1.25rem', '3xl': '1.5rem', '4xl': '1.875rem',
      },
      fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
      lineHeight: { tight: 1.25, normal: 1.6, relaxed: 1.75 },
    },
  
    spacing: {
      0: 0, '0-5': '0.125rem', 1: '0.25rem', '1-5': '0.375rem', 2: '0.5rem',
      '2-5': '0.625rem', 3: '0.75rem', '3-5': '0.875rem', 4: '1rem', 5: '1.25rem',
      6: '1.5rem', 7: '1.75rem', 8: '2rem', 10: '2.5rem', 12: '3rem',
      14: '3.5rem', 16: '4rem', 20: '5rem', 24: '6rem',
    },
  
    radius: {
      none: 0, xs: '0.25rem', sm: '0.375rem', md: '0.5rem',
      lg: '0.75rem', xl: '1rem', '2xl': '1.25rem', '3xl': '1.5rem', full: '9999px',
    },
  
    shadow: {
      xs: '0 1px 2px rgba(0,0,0,0.3)',
      sm: '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.2)',
      md: '0 4px 6px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
      lg: '0 10px 15px rgba(0,0,0,0.4), 0 4px 6px rgba(0,0,0,0.2)',
      xl: '0 20px 25px rgba(0,0,0,0.5), 0 8px 10px rgba(0,0,0,0.3)',
      card: '0 2px 8px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)',
      cardHover: '0 4px 16px rgba(0,0,0,0.4), 0 2px 6px rgba(99,102,241,0.08)',
    },
  
    transitions: {
      fast: '120ms cubic-bezier(0.4, 0, 0.2, 1)',
      base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
      slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
      spring: '350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  
    layout: {
      sidebarWidth: 240,
      sidebarCollapsedWidth: 64,
      toolbarHeight: 56,
      contentMaxWidth: 1440,
    },
  
    zIndex: {
      base: 0, dropdown: 100, sticky: 200, sidebar: 300,
      toolbar: 400, modalBackdrop: 500, modal: 600, toast: 700, tooltip: 800,
    },
  } as const;
  
  export type Theme = typeof theme;
  export default theme;