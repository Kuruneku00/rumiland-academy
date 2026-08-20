
/**
 * Rumiland Academy — Theme Configuration
 * Centralized theme object for programmatic access to design tokens.
 */

export const theme = {
    colors: {
      primary: {
        50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc',
        400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
        800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
        main: '#2563eb',
        hover: '#1d4ed8',
        active: '#1e40af',
        light: '#dbeafe',
        glow: 'rgba(59, 130, 246, 0.25)',
      },
      accent: {
        50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4',
        400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1',
        800: '#075985', 900: '#0c4a6e',
        main: '#0ea5e9',
      },
      success: '#22c55e',
      successLight: 'rgba(34, 197, 94, 0.15)',
      warning: '#f59e0b',
      warningLight: 'rgba(245, 158, 11, 0.15)',
      danger: '#ef4444',
      dangerLight: 'rgba(239, 68, 68, 0.15)',
      info: '#3b82f6',
      infoLight: 'rgba(59, 130, 246, 0.15)',
  
      bg: {
        root: '#07090f',
        primary: '#0b0d15',
        secondary: '#111420',
        tertiary: '#171b2a',
      },
      surface: '#1a1f30',
      surfaceHover: '#202638',
      surfaceActive: '#282f46',
      surfaceRaised: '#222941',
      card: '#171c2c',
      cardHover: '#1d2336',
      cardBorder: 'rgba(255,255,255,0.06)',
      sidebar: '#0a0c14',
      sidebarHover: '#161a29',
      sidebarActive: 'rgba(59,130,246,0.16)',
      toolbar: '#0e111c',
      toolbarBorder: 'rgba(255,255,255,0.05)',
      input: '#171c2c',
      inputBorder: 'rgba(255,255,255,0.08)',
      inputFocus: '#2563eb',
      inputPlaceholder: 'rgba(255,255,255,0.25)',
  
      text: {
        primary: '#ffffff',
        secondary: 'rgba(255,255,255,0.75)',
        tertiary: 'rgba(255,255,255,0.5)',
        muted: 'rgba(255,255,255,0.35)',
        inverse: '#0b0d15',
        link: '#60a5fa',
      },
  
      chart: [
        '#2563eb', '#3b82f6', '#06b6d4', '#22c55e', '#f59e0b',
        '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#3b82f6',
        '#a855f7', '#10b981',
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