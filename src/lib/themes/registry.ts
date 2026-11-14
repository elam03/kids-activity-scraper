import type { ThemeTokens, ThemeName } from './types';
import {
  cosmoTheme,
  bubblegumTheme,
  jungleTheme,
  sunshineTheme,
  oceanTheme,
} from './definitions';

export const DEFAULT_THEME_NAME: ThemeName = 'jungle';

const registry = new Map<string, ThemeTokens>();

// Register core default themes
function initDefaults() {
  registry.set(cosmoTheme.name, cosmoTheme);
  registry.set(bubblegumTheme.name, bubblegumTheme);
  registry.set(jungleTheme.name, jungleTheme);
  registry.set(sunshineTheme.name, sunshineTheme);
  registry.set(oceanTheme.name, oceanTheme);
}

initDefaults();

/**
 * Register or override a theme token definition.
 */
export function registerTheme(theme: ThemeTokens): void {
  registry.set(theme.name, theme);
}

/**
 * Retrieves theme tokens by name. Falls back to DEFAULT_THEME_NAME if not found.
 */
export function getTheme(name?: string | null): ThemeTokens {
  const base = name && registry.has(name)
    ? registry.get(name)!
    : registry.get(DEFAULT_THEME_NAME) || cosmoTheme;
  return {
    ...base,
    ...(base.admin || {}),
  };
}

/**
 * Lists all registered themes in registration order.
 */
export function listThemes(): ThemeTokens[] {
  return Array.from(registry.values());
}

/**
 * Resolves a given raw theme name safely, falling back to DEFAULT_THEME_NAME if missing/invalid.
 */
export function resolveThemeName(raw?: string | null): ThemeName {
  if (raw && registry.has(raw)) {
    return raw as ThemeName;
  }
  return DEFAULT_THEME_NAME;
}

/**
 * Checks whether a theme name is registered.
 */
export function isRegisteredTheme(name: string): boolean {
  return registry.has(name);
}
