import { describe, it, expect, vi, afterEach } from 'vitest';
import { MemoryStorageAdapter } from '@adapters/secondary/memory-storage.adapter';
import { ChromeStorageAdapter, STORAGE_KEY } from '@adapters/secondary/chrome-storage.adapter';
import { DomStyleInjectorAdapter, INJECTED_STYLE_ID } from '@adapters/secondary/dom-style-injector.adapter';
import { GetEffectiveThemeUseCase } from '@ports/primary/get-effective-theme.usecase';
import { SetThemeOverrideUseCase } from '@ports/primary/set-theme-override.usecase';
import { SetGlobalModeUseCase } from '@ports/primary/set-global-mode.usecase';
import { createDefaultPreference } from '@domain/preferences/preferences';

describe('MemoryStorageAdapter', () => {
  it('should initialize with provided or default preference', async () => {
    const custom = createDefaultPreference();
    custom.globalMode = 'dark';
    const adapter = new MemoryStorageAdapter(custom);
    expect((await adapter.loadPreferences()).globalMode).toBe('dark');
  });

  it('should notify subscribers on save and allow unsubscribe', async () => {
    const adapter = new MemoryStorageAdapter();
    const subscriber = vi.fn();
    const unsubscribe = adapter.onPreferencesChanged(subscriber);

    const updated = createDefaultPreference();
    updated.globalMode = 'light';
    await adapter.savePreferences(updated);

    expect(subscriber).toHaveBeenCalledWith(updated);

    unsubscribe();
    await adapter.savePreferences(createDefaultPreference());
    expect(subscriber).toHaveBeenCalledTimes(1);
  });
});

describe('ChromeStorageAdapter', () => {
  const originalChrome = (globalThis as unknown as { chrome?: unknown }).chrome;

  afterEach(() => {
    (globalThis as unknown as { chrome?: unknown }).chrome = originalChrome;
  });

  it('should handle missing chrome.storage gracefully', async () => {
    (globalThis as unknown as { chrome?: unknown }).chrome = undefined;
    const adapter = new ChromeStorageAdapter();

    const loaded = await adapter.loadPreferences();
    expect(loaded.globalMode).toBe('system');

    await expect(adapter.savePreferences(createDefaultPreference())).resolves.toBeUndefined();

    const unsubscribe = adapter.onPreferencesChanged(vi.fn());
    expect(unsubscribe).toBeDefined();
    expect(() => unsubscribe()).not.toThrow();
  });

  it('should save and load via chrome.storage.sync when available', async () => {
    const mockStore: Record<string, unknown> = {};
    (globalThis as unknown as { chrome?: unknown }).chrome = {
      storage: {
        sync: {
          get: (keys: string[], cb: (res: Record<string, unknown>) => void) => {
            cb({ [keys[0]!]: mockStore[keys[0]!] });
          },
          set: (items: Record<string, unknown>, cb: () => void) => {
            Object.assign(mockStore, items);
            cb();
          },
        },
      },
      runtime: { lastError: null },
    };

    const adapter = new ChromeStorageAdapter();
    const pref = createDefaultPreference();
    pref.globalMode = 'dark';

    await adapter.savePreferences(pref);
    const loaded = await adapter.loadPreferences();
    expect(loaded.globalMode).toBe('dark');
  });

  it('should fallback to local storage if sync.set fails with lastError', async () => {
    const localStore: Record<string, unknown> = {};
    (globalThis as unknown as { chrome?: unknown }).chrome = {
      storage: {
        sync: {
          set: (_items: unknown, cb: () => void) => {
            cb();
          },
        },
        local: {
          set: (items: Record<string, unknown>, cb: () => void) => {
            Object.assign(localStore, items);
            cb();
          },
          get: (keys: string[], cb: (res: Record<string, unknown>) => void) => {
            cb({ [keys[0]!]: localStore[keys[0]!] });
          },
        },
      },
      runtime: { lastError: new Error('Sync quota exceeded') },
    };

    const adapter = new ChromeStorageAdapter();
    const pref = createDefaultPreference();
    pref.globalMode = 'light';

    await adapter.savePreferences(pref);
    expect(localStore[STORAGE_KEY]).toEqual(pref);
  });

  it('should fallback to local storage if sync throws synchronously', async () => {
    const localStore: Record<string, unknown> = {};
    (globalThis as unknown as { chrome?: unknown }).chrome = {
      storage: {
        sync: {
          set: () => {
            throw new Error('Sync disabled by policy');
          },
          get: () => {
            throw new Error('Sync disabled by policy');
          },
        },
        local: {
          set: (items: Record<string, unknown>, cb: () => void) => {
            Object.assign(localStore, items);
            cb();
          },
          get: (keys: string[], cb: (res: Record<string, unknown>) => void) => {
            cb({ [keys[0]!]: localStore[keys[0]!] });
          },
        },
      },
      runtime: { lastError: null },
    };

    const adapter = new ChromeStorageAdapter();
    const pref = createDefaultPreference();
    pref.globalMode = 'dark';

    await adapter.savePreferences(pref);
    expect(localStore[STORAGE_KEY]).toEqual(pref);

    const loaded = await adapter.loadPreferences();
    expect(loaded.globalMode).toBe('dark');
  });

  it('should fallback to local storage if sync.get returns lastError during read', async () => {
    const localStore: Record<string, unknown> = {
      [STORAGE_KEY]: { ...createDefaultPreference(), globalMode: 'dark' },
    };

    (globalThis as unknown as { chrome?: unknown }).chrome = {
      storage: {
        sync: {
          get: (_keys: string[], cb: () => void) => {
            cb();
          },
        },
        local: {
          get: (keys: string[], cb: (res: Record<string, unknown>) => void) => {
            cb({ [keys[0]!]: localStore[keys[0]!] });
          },
        },
      },
      runtime: { lastError: new Error('Sync fetch failed') },
    };

    const adapter = new ChromeStorageAdapter();
    const loaded = await adapter.loadPreferences();
    expect(loaded.globalMode).toBe('dark');
  });

  it('should return undefined from readRaw when local storage is also missing', async () => {
    (globalThis as unknown as { chrome?: unknown }).chrome = {
      storage: {
        sync: null,
        local: null,
      },
    };

    const adapter = new ChromeStorageAdapter();
    const loaded = await adapter.loadPreferences();
    expect(loaded.globalMode).toBe('system');
  });

  it('should subscribe and unsubscribe to chrome.storage.onChanged', () => {
    let changeListener: ((changes: Record<string, { newValue?: unknown }>, area: string) => void) | undefined;
    const removeMock = vi.fn();

    (globalThis as unknown as { chrome?: unknown }).chrome = {
      storage: {
        onChanged: {
          addListener: vi.fn((cb) => {
            changeListener = cb;
          }),
          removeListener: removeMock,
        },
      },
    };

    const adapter = new ChromeStorageAdapter();
    const cb = vi.fn();
    const unsubscribe = adapter.onPreferencesChanged(cb);

    expect(changeListener).toBeDefined();

    const updatedPref = createDefaultPreference();
    updatedPref.globalMode = 'dark';

    changeListener!({ [STORAGE_KEY]: { newValue: updatedPref } }, 'sync');
    expect(cb).toHaveBeenCalledWith(updatedPref);

    changeListener!({ otherKey: { newValue: 123 } }, 'sync');
    expect(cb).toHaveBeenCalledTimes(1);

    unsubscribe();
    expect(removeMock).toHaveBeenCalled();
  });
});

describe('DomStyleInjectorAdapter', () => {
  it('should handle undefined document safely when created without arguments', () => {
    const injector = new DomStyleInjectorAdapter();
    expect(() => injector.applyTheme('css')).not.toThrow();
    expect(() => injector.removeTheme()).not.toThrow();
    expect(injector.isThemeApplied()).toBe(false);
  });

  it('should append to documentElement if document.head is missing', () => {
    let appendedEl: unknown;
    const docMock = {
      head: null,
      documentElement: {
        appendChild: (el: unknown) => {
          appendedEl = el;
        },
      },
      getElementById: () => null,
      createElement: () => ({ id: '', textContent: '' }),
    } as unknown as Document;

    const injector = new DomStyleInjectorAdapter(docMock);
    injector.applyTheme('body { color: blue; }');
    expect((appendedEl as { id: string }).id).toBe(INJECTED_STYLE_ID);
  });

  it('should handle missing head and documentElement gracefully', () => {
    const docMock = {
      head: null,
      documentElement: null,
      getElementById: () => null,
      createElement: () => ({ id: '', textContent: '' }),
    } as unknown as Document;

    const injector = new DomStyleInjectorAdapter(docMock);
    expect(() => injector.applyTheme('body { color: blue; }')).not.toThrow();
  });

  it('should reuse existing style element on subsequent apply calls', () => {
    const existing = {
      id: INJECTED_STYLE_ID,
      textContent: 'old',
      remove: vi.fn(),
    };

    const docMock = {
      head: { appendChild: vi.fn() },
      getElementById: (id: string) => (id === INJECTED_STYLE_ID ? existing : null),
      createElement: vi.fn(),
    } as unknown as Document;

    const injector = new DomStyleInjectorAdapter(docMock);
    injector.applyTheme('new');

    expect(existing.textContent).toBe('new');
    expect(docMock.createElement).not.toHaveBeenCalled();
  });
});

describe('Use Cases: GetEffectiveTheme, SetThemeOverride, SetGlobalMode', () => {
  it('should get effective theme with custom CSS if present on domain', async () => {
    const adapter = new MemoryStorageAdapter();
    const setUseCase = new SetThemeOverrideUseCase(adapter);
    const getUseCase = new GetEffectiveThemeUseCase(adapter);

    await setUseCase.execute('github.com', 'dark', 'img { opacity: 0.9; }');
    const result = await getUseCase.execute('https://github.com/profile', false);

    expect(result.mode).toBe('dark');
    expect(result.customCss).toBe('img { opacity: 0.9; }');
    expect(result.css).toContain('img { opacity: 0.9; }');
  });

  it('should remove domain override when mode is null in SetThemeOverrideUseCase', async () => {
    const adapter = new MemoryStorageAdapter();
    const setUseCase = new SetThemeOverrideUseCase(adapter);

    await setUseCase.execute('site.com', 'dark');
    let loaded = await adapter.loadPreferences();
    expect(loaded.domainOverrides['site.com']).toBeDefined();

    await setUseCase.execute('site.com', null);
    loaded = await adapter.loadPreferences();
    expect(loaded.domainOverrides['site.com']).toBeUndefined();
  });

  it('should update globalMode in SetGlobalModeUseCase', async () => {
    const adapter = new MemoryStorageAdapter();
    const setGlobal = new SetGlobalModeUseCase(adapter);

    await setGlobal.execute('dark');
    const loaded = await adapter.loadPreferences();
    expect(loaded.globalMode).toBe('dark');
  });
});
