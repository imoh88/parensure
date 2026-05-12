/**
 * Font family constants.
 *
 * Manrope  — headings, titles, numbers/metrics, buttons, navigation labels, UI labels
 * Inter    — body copy, descriptions, subtitles, captions, form/input text, helper text
 *
 * Usage:
 *   import { F } from '@/lib/fonts';
 *   fontFamily: F.m.bold       // Manrope 700
 *   fontFamily: F.i.regular    // Inter 400
 */
export const F = {
  /** Manrope — primary display & UI font */
  m: {
    regular: 'Manrope_400Regular',
    medium: 'Manrope_500Medium',
    semiBold: 'Manrope_600SemiBold',
    bold: 'Manrope_700Bold',
    xBold: 'Manrope_800ExtraBold',
  },
  /** Inter — secondary body & functional text font */
  i: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
} as const;
