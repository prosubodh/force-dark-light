import type { HealthStatus } from '@domain/health';

export interface StorageHealthPort {
  checkStorageHealth(): Promise<HealthStatus>;
}
