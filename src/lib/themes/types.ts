export type ThemeName =
  | 'cosmo'
  | 'bubblegum'
  | 'jungle'
  | 'sunshine'
  | 'ocean'
  | (string & {});

export type ThemeMode = 'light' | 'dark';

export interface ThemePalette {
  bgBase: string; // hex
  cardBg: string; // hex
  textPrimary: string; // hex
  textMuted: string; // hex
  accent: string; // hex
  border: string; // hex
}

export interface AdminThemeTokens {
  activeSubTab: string;
  inactiveSubTab: string;
  deepScrapeBtn: string;
  tableHeader: string;
  tableDivide: string;
  tableRowHover: string;
  tableText: string;
  tableMuted: string;
}

export interface ThemeTokens extends Partial<AdminThemeTokens> {
  name: ThemeName;
  displayName: string;
  mode: ThemeMode;
  palette: ThemePalette;

  // Layout & Container tokens
  bg: string;
  text: string;
  textHeading: string;
  textMuted: string;
  card: string;
  cardAlt: string;
  cardBorder: string;
  cardText: string;
  headerText: string;
  navBtn: string;
  badge: string;
  btnMore: string;
  activeTab: string;
  inactiveTab: string;
  border: string;

  // Modal tokens
  modal: string;
  modalTitle: string;
  modalInner: string;
  closeBtn: string;
  accentText: string;

  // Controls & Pickers
  input: string;
  themePicker: string;
  themePickerInactive: string;
  viewSelectBg: string;
  chevron: string;

  // Calendar Views
  dayHeader: string;
  timelineHour: string;
  hourBorder: string;
  weekdayHeader: string;
  monthGridBg: string;
  dayNumber: string;

  // Category Badge Colors (theme-aware, high-contrast)
  categoryColors: Record<string, string>;

  // Admin Portal specific tokens
  admin: AdminThemeTokens;
}
