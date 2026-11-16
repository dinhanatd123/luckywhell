import { ThemeMode } from '../types/luckyWheel';

export interface WheelThemePalette {
  label: string;
  sliceColors: string[];
  rimOuter: string;
  rimInner: string;
  rimBorder: string;
  ledOn: string;
  ledAlt: string;
  ledOff: string;
  pegColor: string;
  pointerFill: string;
  pointerStroke: string;
  hubOuter: string;
  hubInner: string;
  sliceBorder: string;
  sliceText: string;
  sliceTextStroke: string;
}

export const WHEEL_THEME_PALETTES: Record<ThemeMode, WheelThemePalette> = {
  cyber: {
    label: 'Cyber Dark',
    sliceColors: [
      '#0E7490', // Deep Cyan
      '#1E293B', // Slate 800
      '#B45309', // Rich Amber
      '#1D4ED8', // Cobalt Blue
      '#0F766E', // Deep Teal
      '#4338CA', // Indigo
    ],
    rimOuter: '#0F172A',
    rimInner: '#1E293B',
    rimBorder: '#06B6D4',
    ledOn: '#22D3EE',
    ledAlt: '#FBBF24',
    ledOff: 'rgba(148, 163, 184, 0.28)',
    pegColor: '#E2E8F0',
    pointerFill: '#F59E0B',
    pointerStroke: '#FEF3C7',
    hubOuter: '#06B6D4',
    hubInner: '#0F172A',
    sliceBorder: 'rgba(248, 250, 252, 0.22)',
    sliceText: '#F8FAFC',
    sliceTextStroke: 'rgba(2, 6, 23, 0.72)',
  },
  gala: {
    label: 'Festival Gala',
    sliceColors: [
      '#991B1B', // Royal Crimson
      '#B45309', // Imperial Amber
      '#7F1D1D', // Deep Wine
      '#CA8A04', // Burnished Gold
      '#881337', // Burgundy Rose
      '#92400E', // Bronze Gold
    ],
    rimOuter: '#2A080E',
    rimInner: '#4A1019',
    rimBorder: '#EAB308',
    ledOn: '#FDE047',
    ledAlt: '#FB7185',
    ledOff: 'rgba(253, 224, 71, 0.22)',
    pegColor: '#FEF08A',
    pointerFill: '#FACC15',
    pointerStroke: '#450A0A',
    hubOuter: '#EAB308',
    hubInner: '#3B0A11',
    sliceBorder: 'rgba(254, 240, 138, 0.28)',
    sliceText: '#FEFCE8',
    sliceTextStroke: 'rgba(42, 8, 14, 0.8)',
  },
  light: {
    label: 'Clean Light',
    sliceColors: [
      '#2563EB', // Cobalt
      '#0D9488', // Teal
      '#D97706', // Warm Amber
      '#4F46E5', // Indigo
      '#0284C7', // Sky
      '#059669', // Emerald
    ],
    rimOuter: '#E2E8F0',
    rimInner: '#F8FAFC',
    rimBorder: '#94A3B8',
    ledOn: '#2563EB',
    ledAlt: '#F59E0B',
    ledOff: 'rgba(100, 116, 139, 0.25)',
    pegColor: '#FFFFFF',
    pointerFill: '#DC2626',
    pointerStroke: '#FFFFFF',
    hubOuter: '#1E293B',
    hubInner: '#FFFFFF',
    sliceBorder: 'rgba(255, 255, 255, 0.65)',
    sliceText: '#FFFFFF',
    sliceTextStroke: 'rgba(15, 23, 42, 0.5)',
  },
};
