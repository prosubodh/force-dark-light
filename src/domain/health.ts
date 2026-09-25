export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface SystemHealth {
  readonly status: HealthStatus;
  readonly timestamp: string;
  readonly components: {
    readonly storage: HealthStatus;
    readonly runtime: HealthStatus;
  };
}

export function createSystemHealth(
  storageStatus: HealthStatus,
  runtimeStatus: HealthStatus,
  timestamp: string = new Date().toISOString()
): SystemHealth {
  const isOk = storageStatus === 'ok' && runtimeStatus === 'ok';
  const isDown = storageStatus === 'down' || runtimeStatus === 'down';

  return {
    status: isDown ? 'down' : isOk ? 'ok' : 'degraded',
    timestamp,
    components: {
      storage: storageStatus,
      runtime: runtimeStatus,
    },
  };
}
