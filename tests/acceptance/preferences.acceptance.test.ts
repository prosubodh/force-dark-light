import { describe, it, expect } from 'vitest';
import {
  createDefaultPreference,
  resolveEffectiveTheme,
  setDomainOverride,
  setGlobalMode,
  removeDomainOverride,
  parseThemePreference,
} from '../../src/domain/preferences/preferences';

describe('US-02: Preference Resolution & Invariants (Acceptance)', () => {
  it('should resolve domain override over global mode', () => {
    let pref = createDefaultPreference();
    pref = setGlobalMode(pref, 'light');
    pref = setDomainOverride(pref, 'github.com', 'dark');

    const effectiveMode = resolveEffectiveTheme(pref, 'https://github.com/features', false);
    expect(effectiveMode).toBe('dark');
  });

  it('should fallback to global mode when no domain override exists', () => {
    let pref = createDefaultPreference();
    pref = setGlobalMode(pref, 'dark');

    const effectiveMode = resolveEffectiveTheme(pref, 'https://news.ycombinator.com', false);
    expect(effectiveMode).toBe('dark');
  });

  it('should resolve system mode based on systemPrefersDark flag', () => {
    const pref = createDefaultPreference(); // globalMode: 'system'

    expect(resolveEffectiveTheme(pref, 'https://example.com', true)).toBe('dark');
    expect(resolveEffectiveTheme(pref, 'https://example.com', false)).toBe('light');
  });

  it('should remove domain override and revert to global mode', () => {
    let pref = createDefaultPreference();
    pref = setGlobalMode(pref, 'light');
    pref = setDomainOverride(pref, 'wikipedia.org', 'dark');
    pref = removeDomainOverride(pref, 'wikipedia.org');

    const effectiveMode = resolveEffectiveTheme(pref, 'https://wikipedia.org', false);
    expect(effectiveMode).toBe('light');
  });

  it('should safely parse valid and malformed payloads using Zod contract', () => {
    const valid = parseThemePreference({
      version: 1,
      globalMode: 'dark',
      domainOverrides: {
        'github.com': { mode: 'light' },
      },
    });
    expect(valid.globalMode).toBe('dark');
    expect(valid.domainOverrides['github.com']?.mode).toBe('light');

    // Corrupted input should return safe default
    const fallback = parseThemePreference({ corrupted: true });
    expect(fallback.version).toBe(1);
    expect(fallback.globalMode).toBe('system');
  });
});
