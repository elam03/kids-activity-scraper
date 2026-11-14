import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTheme,
  listThemes,
  registerTheme,
  resolveThemeName,
  DEFAULT_THEME_NAME,
  type ThemeTokens,
  type ThemeName,
} from './themes';
import {
  calculateLuminance,
  getContrastRatio,
  isWcagAaCompliant,
} from './themes/contrast';

test('Theme Registry - default themes are registered and streamlined to Cosmo Dark and Daylight', () => {
  const themes = listThemes();
  const themeNames = themes.map((t) => t.name);

  assert.deepEqual(themeNames, ['cosmo', 'daylight'], 'Themes should be streamlined to cosmo and daylight');
  assert.equal(DEFAULT_THEME_NAME, 'cosmo', 'Default theme must be cosmo dark');

  const cosmo = getTheme('cosmo');
  assert.equal(cosmo.mode, 'dark');
  assert.ok(cosmo.bg.includes('slate-950') || cosmo.bg.includes('slate-900'));
  assert.ok(cosmo.btnMore, 'btnMore token must be defined');
  assert.ok(cosmo.todayText, 'todayText token must be defined');
  assert.ok(cosmo.todayBg, 'todayBg token must be defined');
  assert.ok(cosmo.todayBorder, 'todayBorder token must be defined');
  // Title must NOT use text-transparent
  assert.ok(!cosmo.headerText.includes('text-transparent'), 'Cosmo headerText must be solid and readable');

  const daylight = getTheme('daylight');
  assert.equal(daylight.mode, 'light');
  assert.ok(daylight.bg.includes('edece8') || daylight.bg.includes('slate-50') || daylight.bg.includes('white'));
  assert.ok(daylight.btnMore, 'btnMore token must be defined');
  assert.ok(daylight.todayText, 'todayText token must be defined');
  assert.ok(daylight.todayBg, 'todayBg token must be defined');
  assert.ok(daylight.todayBorder, 'todayBorder token must be defined');
  // Title must NOT use text-transparent or gradients that vanish
  assert.ok(!daylight.headerText.includes('text-transparent'), 'Daylight headerText must be solid text-slate-900');
  assert.ok(daylight.headerText.includes('slate-900') || daylight.headerText.includes('slate-950'));
});

test('Theme Registry - dynamic registration of custom themes', () => {
  const customTheme: ThemeTokens = {
    name: 'cyberpunk',
    displayName: 'Cyberpunk Neon',
    mode: 'dark',
    palette: {
      bgBase: '#0d0f18',
      cardBg: '#151926',
      textPrimary: '#f8fafc',
      textMuted: '#94a3b8',
      accent: '#f43f5e',
      border: '#334155',
    },
    bodyBg: 'bg-black text-rose-100',
    bg: 'bg-black text-rose-100',
    text: 'text-rose-100',
    textHeading: 'text-rose-400 font-bold',
    textMuted: 'text-slate-400',
    card: 'bg-zinc-900 border-rose-900',
    cardAlt: 'bg-zinc-950 border-rose-900/60',
    cardBorder: 'border-rose-900',
    cardText: 'text-zinc-200',
    headerText: 'text-rose-400 font-black',
    navBtn: 'bg-zinc-900 text-rose-300 border-rose-800',
    badge: 'bg-rose-950 text-rose-300 border-rose-800',
    btnMore: 'bg-rose-950/80 text-rose-300 hover:bg-rose-900',
    activeTab: 'bg-rose-600 text-white',
    inactiveTab: 'text-rose-300/70 hover:text-rose-200',
    border: 'border-rose-900',
    modal: 'bg-zinc-900 text-zinc-100 border-rose-800',
    modalTitle: 'text-rose-400 font-bold',
    modalInner: 'bg-zinc-950 border-rose-900 text-zinc-300',
    closeBtn: 'text-rose-400 hover:text-rose-200 hover:bg-rose-950',
    accentText: 'text-rose-400 font-bold',
    input: 'bg-zinc-950 text-rose-100 border-rose-800 placeholder:text-zinc-500',
    themePicker: 'bg-zinc-900 border-rose-900',
    themePickerInactive: 'text-rose-400 hover:text-rose-200',
    viewSelectBg: 'bg-zinc-900 border-rose-900',
    chevron: 'border-rose-800 bg-zinc-900 text-rose-300',
    dayHeader: 'text-rose-300 font-bold',
    timelineHour: 'text-rose-400',
    hourBorder: 'border-rose-900/50',
    weekdayHeader: 'text-rose-300 bg-zinc-900',
    monthGridBg: 'bg-zinc-950/60',
    dayNumber: 'text-rose-300 font-bold',
    todayText: 'text-rose-400 font-bold',
    todayBg: 'bg-rose-950/40',
    todayBorder: 'border-rose-500',
    todayBadge: 'bg-rose-900 text-rose-200 border-rose-700',
    categoryColors: {
      sports: 'bg-emerald-950 text-emerald-300 border-emerald-800',
      arts: 'bg-pink-950 text-pink-300 border-pink-800',
      nature: 'bg-teal-950 text-teal-300 border-teal-800',
      music: 'bg-cyan-950 text-cyan-300 border-cyan-800',
      education: 'bg-blue-950 text-blue-300 border-blue-800',
      festival: 'bg-amber-950 text-amber-300 border-amber-800',
      other: 'bg-zinc-950 text-zinc-300 border-zinc-800',
    },
    admin: {
      activeSubTab: 'border-rose-500 text-rose-400',
      inactiveSubTab: 'text-zinc-400',
      deepScrapeBtn: 'bg-zinc-900 text-rose-300',
      tableHeader: 'bg-zinc-950 text-rose-300',
      tableDivide: 'divide-zinc-800',
      tableRowHover: 'hover:bg-zinc-900/60',
      tableText: 'text-zinc-200',
      tableMuted: 'text-zinc-400',
    },
  };

  registerTheme(customTheme);

  const registered = getTheme('cyberpunk');
  assert.equal(registered.displayName, 'Cyberpunk Neon');
  assert.equal(registered.name, 'cyberpunk');
});

test('Theme Resolution - handles URL queries, storage, and fallback safely', () => {
  assert.equal(resolveThemeName('cosmo'), 'cosmo');
  assert.equal(resolveThemeName('daylight'), 'daylight');
  assert.equal(resolveThemeName('unknown-theme'), DEFAULT_THEME_NAME);
  assert.equal(resolveThemeName(undefined), DEFAULT_THEME_NAME);
  assert.equal(resolveThemeName(null), DEFAULT_THEME_NAME);
});

test('WCAG AA Contrast Calculator - accurately computes relative luminance and contrast', () => {
  // Pure black on pure white is 21:1
  const blackOnWhite = getContrastRatio('#000000', '#ffffff');
  assert.ok(Math.abs(blackOnWhite - 21) < 0.1, `Expected ~21:1, got ${blackOnWhite}`);

  // Pure white on pure black is 21:1
  const whiteOnBlack = getContrastRatio('#ffffff', '#000000');
  assert.ok(Math.abs(whiteOnBlack - 21) < 0.1, `Expected ~21:1, got ${whiteOnBlack}`);

  // Same color on same color is 1:1
  const sameColor = getContrastRatio('#ffffff', '#ffffff');
  assert.equal(sameColor, 1);

  // Check WCAG threshold helper
  assert.equal(isWcagAaCompliant(4.5, 'normal'), true);
  assert.equal(isWcagAaCompliant(4.49, 'normal'), false);
  assert.equal(isWcagAaCompliant(3.0, 'large'), true);
  assert.equal(isWcagAaCompliant(2.99, 'large'), false);
});

test('Theme Verification - All registered themes have WCAG AA compliant palette contrast', () => {
  const themes = listThemes();

  for (const theme of themes) {
    const { palette } = theme;
    // 1. Text Primary against Card Background (body text: must be >= 4.5:1)
    const cardTextRatio = getContrastRatio(palette.textPrimary, palette.cardBg);
    assert.ok(
      cardTextRatio >= 4.5,
      `Theme ${theme.name}: card text primary (${palette.textPrimary}) on card bg (${palette.cardBg}) has ratio ${cardTextRatio.toFixed(2)}, must be >= 4.5`
    );

    // 2. Text Primary against Root Background (must be >= 4.5:1)
    const rootTextRatio = getContrastRatio(palette.textPrimary, palette.bgBase);
    assert.ok(
      rootTextRatio >= 4.5,
      `Theme ${theme.name}: root text primary (${palette.textPrimary}) on root bg (${palette.bgBase}) has ratio ${rootTextRatio.toFixed(2)}, must be >= 4.5`
    );

    // 3. Text Muted against Card Background (secondary text: must be >= 4.5:1 for accessibility)
    const mutedCardRatio = getContrastRatio(palette.textMuted, palette.cardBg);
    assert.ok(
      mutedCardRatio >= 4.5,
      `Theme ${theme.name}: card text muted (${palette.textMuted}) on card bg (${palette.cardBg}) has ratio ${mutedCardRatio.toFixed(2)}, must be >= 4.5`
    );

    // 4. Accent against Card Background (UI elements/headings: must be >= 3.0:1)
    const accentRatio = getContrastRatio(palette.accent, palette.cardBg);
    assert.ok(
      accentRatio >= 3.0,
      `Theme ${theme.name}: accent (${palette.accent}) on card bg (${palette.cardBg}) has ratio ${accentRatio.toFixed(2)}, must be >= 3.0`
    );
  }
});

test('Theme Verification - Daylight theme category badges must not use faint text on light badges', () => {
  const daylight = getTheme('daylight');

  for (const [cat, classes] of Object.entries(daylight.categoryColors)) {
    // In light themes, text must NOT be faint 400 shades like text-emerald-400 or text-pink-400
    assert.ok(
      !classes.includes('-400'),
      `Daylight category ${cat} classes (${classes}) should not use -400 low-contrast text on light cards`
    );
  }
});
