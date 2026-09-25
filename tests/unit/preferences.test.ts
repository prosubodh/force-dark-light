import { describe, it, expect } from 'vitest';
import {
  createDefaultPreference,
  resolveEffectiveTheme,
  setGlobalMode,
  setDomainOverride,
  removeDomainOverride,
  parseThemePreference,
  ThemePreferenceSchema,
} from '@domain/preferences/preferences';

describe('Preferences Domain Unit Tests', () => {
  it('should initialize default preferences with version 1 and system mode', () => {
    const pref = createDefaultPreference();
    expect(pref.version).toBe(1);
    expect(pref.globalMode).toBe('system');
    expect(pref.domainOverrides).toEqual({});
  });

  describe('setGlobalMode', () => {
    it('should update globalMode immutably', () => {
      const initial = createDefaultPreference();
      const updated = setGlobalMode(initial, 'dark');

      expect(initial.globalMode).toBe('system');
      expect(updated.globalMode).toBe('dark');
      expect(updated.domainOverrides).toBe(initial.domainOverrides);
    });
  });

  describe('setDomainOverride', () => {
    it('should add or update domain override with optional customCss and timestamp', () => {
      const initial = createDefaultPreference();
      const now = '2026-09-25T12:00:00.000Z';
      const updated = setDomainOverride(initial, 'github.com', 'dark', 'body { color: red; }', now);

      expect(updated.domainOverrides['github.com']).toEqual({
        mode: 'dark',
        customCss: 'body { color: red; }',
        updatedAt: now,
      });
      expect(initial.domainOverrides['github.com']).toBeUndefined();
    });

    it('should set default updatedAt when omitted', () => {
      const initial = createDefaultPreference();
      const updated = setDomainOverride(initial, 'example.com', 'light');

      expect(updated.domainOverrides['example.com']?.mode).toBe('light');
      expect(typeof updated.domainOverrides['example.com']?.updatedAt).toBe('string');
    });
  });

  describe('removeDomainOverride', () => {
    it('should remove existing domain override without mutating original', () => {
      const initial = createDefaultPreference();
      const withDomain = setDomainOverride(initial, 'test.com', 'dark');
      const removed = removeDomainOverride(withDomain, 'test.com');

      expect(withDomain.domainOverrides['test.com']).toBeDefined();
      expect(removed.domainOverrides['test.com']).toBeUndefined();
    });

    it('should return identical copy if domain does not exist in overrides', () => {
      const initial = createDefaultPreference();
      const removed = removeDomainOverride(initial, 'non-existent.com');

      expect(removed.domainOverrides).toEqual({});
    });
  });

  describe('resolveEffectiveTheme', () => {
    it('should return domain override if mode is dark or light', () => {
      let pref = createDefaultPreference();
      pref = setDomainOverride(pref, 'github.com', 'dark');
      expect(resolveEffectiveTheme(pref, 'https://github.com', false)).toBe('dark');

      pref = setDomainOverride(pref, 'github.com', 'light');
      expect(resolveEffectiveTheme(pref, 'https://github.com', true)).toBe('light');
    });

    it('should return disabled if domain override is disabled', () => {
      let pref = createDefaultPreference();
      pref = setDomainOverride(pref, 'bank.com', 'disabled');
      expect(resolveEffectiveTheme(pref, 'https://bank.com/login', true)).toBe('disabled');
    });

    it('should fallback to global mode if domain override is system', () => {
      let pref = createDefaultPreference();
      pref = setGlobalMode(pref, 'dark');
      pref = setDomainOverride(pref, 'docs.com', 'system');

      expect(resolveEffectiveTheme(pref, 'https://docs.com', false)).toBe('dark');
    });

    it('should evaluate system mode according to systemPrefersDark boolean', () => {
      const pref = createDefaultPreference(); // globalMode = system

      expect(resolveEffectiveTheme(pref, 'https://any.com', true)).toBe('dark');
      expect(resolveEffectiveTheme(pref, 'https://any.com', false)).toBe('light');
    });
  });

  describe('Zod Schema & parseThemePreference', () => {
    it('should validate complete valid preference object', () => {
      const valid = {
        version: 1,
        globalMode: 'dark',
        domainOverrides: {
          'example.com': {
            mode: 'light',
            customCss: '/* test */',
            updatedAt: '2026-09-25T00:00:00.000Z',
          },
        },
      };

      const parsed = ThemePreferenceSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('should return parsed result when valid in parseThemePreference', () => {
      const valid = {
        version: 1,
        globalMode: 'light',
        domainOverrides: {},
      };

      const result = parseThemePreference(valid);
      expect(result.globalMode).toBe('light');
    });

    it('should fallback to default preference on invalid payload', () => {
      expect(parseThemePreference(null)).toEqual(createDefaultPreference());
      expect(parseThemePreference('not-an-object')).toEqual(createDefaultPreference());
      expect(parseThemePreference({ version: -1 })).toEqual(createDefaultPreference());
    });
  });
});
