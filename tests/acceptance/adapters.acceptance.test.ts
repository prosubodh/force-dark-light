import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorageAdapter } from '../../src/adapters/secondary/memory-storage.adapter';
import { DomStyleInjectorAdapter, INJECTED_STYLE_ID } from '../../src/adapters/secondary/dom-style-injector.adapter';
import { GetEffectiveThemeUseCase } from '../../src/ports/primary/get-effective-theme.usecase';
import { SetThemeOverrideUseCase } from '../../src/ports/primary/set-theme-override.usecase';

describe('US-03: Storage & DOM Adapters (Acceptance)', () => {
  let storageAdapter: MemoryStorageAdapter;

  beforeEach(() => {
    storageAdapter = new MemoryStorageAdapter();
  });

  it('should load default preferences when storage is empty', async () => {
    const getUseCase = new GetEffectiveThemeUseCase(storageAdapter);
    const result = await getUseCase.execute('https://example.com', false);

    expect(result.mode).toBe('light');
  });

  it('should persist domain override and resolve updated theme', async () => {
    const setUseCase = new SetThemeOverrideUseCase(storageAdapter);
    const getUseCase = new GetEffectiveThemeUseCase(storageAdapter);

    await setUseCase.execute('github.com', 'dark');

    const result = await getUseCase.execute('https://github.com/explore', false);
    expect(result.mode).toBe('dark');
  });

  it('should inject and remove theme styles in DOM head', () => {
    const head = {
      appendChild: (el: unknown) => el,
      removeChild: (el: unknown) => el,
    };
    const elements = new Map<string, { id: string; textContent: string; remove: () => void }>();

    const docMock = {
      head,
      getElementById: (id: string) => elements.get(id) ?? null,
      createElement: (_tag: string) => {
        const el = {
          id: '',
          textContent: '',
          remove: () => {
            elements.delete(el.id);
          },
        };
        return el;
      },
    } as unknown as Document;

    // Custom append implementation
    (head as { appendChild: (el: { id: string; textContent: string; remove: () => void }) => void }).appendChild = (el) => {
      elements.set(el.id, el);
    };

    const injector = new DomStyleInjectorAdapter(docMock);
    expect(injector.isThemeApplied()).toBe(false);

    injector.applyTheme('html { filter: invert(1); }');
    expect(injector.isThemeApplied()).toBe(true);
    expect(elements.get(INJECTED_STYLE_ID)?.textContent).toBe('html { filter: invert(1); }');

    injector.removeTheme();
    expect(injector.isThemeApplied()).toBe(false);
    expect(elements.get(INJECTED_STYLE_ID)).toBeUndefined();
  });
});
