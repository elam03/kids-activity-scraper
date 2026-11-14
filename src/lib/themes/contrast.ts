/**
 * WCAG 2.1 Relative Luminance and Contrast Ratio Calculator
 * Reference: https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */

function parseHex(hex: string): [number, number, number] {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) {
    return [0, 0, 0];
  }
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return [r, g, b];
}

function srgbToLinear(c: number): number {
  const norm = c / 255;
  return norm <= 0.03928 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

/**
 * Calculates relative luminance for a given hex color code.
 * Output is in range [0, 1] where 0 is pure black and 1 is pure white.
 */
export function calculateLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  const rLin = srgbToLinear(r);
  const gLin = srgbToLinear(g);
  const bLin = srgbToLinear(b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Calculates WCAG 2.1 contrast ratio between two hex colors.
 * Output is in range [1, 21].
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = calculateLuminance(hex1);
  const l2 = calculateLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Number(ratio.toFixed(2));
}

/**
 * Checks whether a contrast ratio meets WCAG AA standards:
 * - Normal text (< 18pt or < 14pt bold): minimum 4.5:1
 * - Large text (>= 18pt or >= 14pt bold) or UI components: minimum 3.0:1
 */
export function isWcagAaCompliant(
  ratio: number,
  size: 'normal' | 'large' = 'normal'
): boolean {
  return size === 'large' ? ratio >= 3.0 : ratio >= 4.5;
}
