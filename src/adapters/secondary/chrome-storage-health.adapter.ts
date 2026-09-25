import type { HealthStatus } from '@domain/health';
import type { StorageHealthPort } from '@ports/secondary/storage-health.port';

export class ChromeStorageHealthAdapter implements StorageHealthPort {
  async checkStorageHealth(): Promise<HealthStatus> {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      return 'degraded';
    }

    return new Promise((resolve) => {
      try {
        const storage = chrome.storage.sync ?? chrome.storage.local;
        storage.get(['__healthcheck__'], () => {
          if (chrome.runtime.lastError) {
            resolve('down');
          } else {
            resolve('ok');
          }
        });
      } catch {
        resolve('down');
      }
    });
  }
}
