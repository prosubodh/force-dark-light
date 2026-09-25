import { z } from 'zod';
import { extractSiteHost, type ThemeMode, type SiteHost } from '@domain/theme-engine/theme-engine';

export const ThemeModeSchema = z.enum(['dark', 'light', 'system', 'disabled']);

export const DomainRuleSchema = z.object({
  mode: ThemeModeSchema,
  customCss: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const ThemePreferenceSchema = z.object({
  version: z.literal(1),
  globalMode: ThemeModeSchema,
  domainOverrides: z.record(z.string(), DomainRuleSchema),
});

export type DomainRule = z.infer<typeof DomainRuleSchema>;
export type ThemePreference = z.infer<typeof ThemePreferenceSchema>;

export function createDefaultPreference(): ThemePreference {
  return {
    version: 1,
    globalMode: 'system',
    domainOverrides: {},
  };
}

export function setGlobalMode(preference: ThemePreference, mode: ThemeMode): ThemePreference {
  return {
    ...preference,
    globalMode: mode,
  };
}

export function setDomainOverride(
  preference: ThemePreference,
  domain: SiteHost,
  mode: ThemeMode,
  customCss?: string,
  updatedAt: string = new Date().toISOString()
): ThemePreference {
  const rule: DomainRule = {
    mode,
    ...(customCss !== undefined ? { customCss } : {}),
    updatedAt,
  };

  return {
    ...preference,
    domainOverrides: {
      ...preference.domainOverrides,
      [domain]: rule,
    },
  };
}

export function removeDomainOverride(preference: ThemePreference, domain: SiteHost): ThemePreference {
  if (!preference.domainOverrides[domain]) {
    return preference;
  }

  const copy = { ...preference.domainOverrides };
  delete copy[domain];

  return {
    ...preference,
    domainOverrides: copy,
  };
}

export function resolveEffectiveTheme(
  preference: ThemePreference,
  url: string,
  systemPrefersDark: boolean
): ThemeMode {
  const host = extractSiteHost(url);
  const domainRule = preference.domainOverrides[host];

  if (domainRule && domainRule.mode !== 'system') {
    return domainRule.mode;
  }

  if (preference.globalMode === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }

  return preference.globalMode;
}

export function parseThemePreference(data: unknown): ThemePreference {
  const result = ThemePreferenceSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  return createDefaultPreference();
}
