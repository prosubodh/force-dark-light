import { ChromeStorageAdapter } from '@adapters/secondary/chrome-storage.adapter';
import { HealthCheckUseCase } from '@ports/primary/health-check.usecase';
import { ChromeStorageHealthAdapter } from '@adapters/secondary/chrome-storage-health.adapter';
import { BackgroundCoordinator, type ActiveTabInfo } from './coordinator';

export async function queryActiveTab(): Promise<ActiveTabInfo | undefined> {
  const ch = (globalThis as unknown as { chrome?: typeof chrome }).chrome;
  if (!ch?.tabs?.query) {
    return undefined;
  }

  return new Promise((resolve) => {
    ch.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const active = tabs[0];
      if (active) {
        resolve({ id: active.id, url: active.url });
      } else {
        resolve(undefined);
      }
    });
  });
}

export async function sendTabMessage(tabId: number, message: unknown): Promise<void> {
  const ch = (globalThis as unknown as { chrome?: typeof chrome }).chrome;
  if (!ch?.tabs?.sendMessage) {
    return;
  }

  return new Promise((resolve) => {
    ch.tabs.sendMessage(tabId, message, async () => {
      if (ch.runtime?.lastError && ch.scripting?.executeScript) {
        try {
          await ch.scripting.executeScript({
            target: { tabId, allFrames: true },
            files: ['content.js'],
          });
          ch.tabs.sendMessage(tabId, message, () => {
            void ch.runtime?.lastError;
            resolve();
          });
          return;
        } catch {
          // Ignore restricted tabs
        }
      }
      resolve();
    });
  });
}

export async function setActionBadge(tabId: number, text: string): Promise<void> {
  const ch = (globalThis as unknown as { chrome?: typeof chrome }).chrome;
  if (!ch?.action?.setBadgeText) {
    return;
  }

  return new Promise((resolve) => {
    ch.action.setBadgeText({ tabId, text }, () => {
      resolve();
    });
  });
}

export function initializeBackgroundWorker(
  getActiveTab = queryActiveTab,
  sendMessage = sendTabMessage,
  setBadge = setActionBadge
): BackgroundCoordinator {
  const storage = new ChromeStorageAdapter();
  const coordinator = new BackgroundCoordinator({
    storage,
    getActiveTab,
    sendTabMessage: sendMessage,
    systemPrefersDark: false,
    setBadge,
  });

  const ch = (globalThis as unknown as { chrome?: typeof chrome }).chrome;

  if (ch?.commands?.onCommand) {
    ch.commands.onCommand.addListener((command) => {
      if (command === 'toggle-theme') {
        void coordinator.handleToggleCommand();
      }
    });
  }

  if (ch?.runtime?.onInstalled) {
    ch.runtime.onInstalled.addListener(() => {
      const healthUseCase = new HealthCheckUseCase(new ChromeStorageHealthAdapter());
      void healthUseCase.execute().then((health) => {
        console.log('[ForceDarkLight] Extension installed. Health status:', health.status);
      });
    });
  }

  return coordinator;
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onInstalled) {
  initializeBackgroundWorker();
}
