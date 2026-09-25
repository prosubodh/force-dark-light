import { ChromeStorageAdapter } from '@adapters/secondary/chrome-storage.adapter';
import { DomStyleInjectorAdapter } from '@adapters/secondary/dom-style-injector.adapter';
import { ContentScriptCoordinator } from './coordinator';

export function initializeContentScript(
  currentUrl: string = typeof window !== 'undefined' ? window.location.href : '',
  doc: Document | undefined = typeof document !== 'undefined' ? document : undefined,
  systemPrefersDark: boolean = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false
): ContentScriptCoordinator {
  const storage = new ChromeStorageAdapter();
  const injector = new DomStyleInjectorAdapter(doc);

  const coordinator = new ContentScriptCoordinator({
    storage,
    injector,
    currentUrl,
    systemPrefersDark,
  });

  void coordinator.init();

  const ch = (globalThis as unknown as { chrome?: typeof chrome }).chrome;
  if (ch?.runtime?.onMessage) {
    ch.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      return coordinator.handleMessage(message, sendResponse);
    });
  }

  return coordinator;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initializeContentScript();
}
