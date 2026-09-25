import type { HealthCheckUseCase } from '@ports/primary/health-check.usecase';

export interface HealthResponse {
  readonly status: number;
  readonly body: {
    readonly status: string;
    readonly timestamp: string;
    readonly components?: Record<string, string>;
  };
}

export class HealthCheckController {
  constructor(private readonly useCase: HealthCheckUseCase) {}

  async getHealthz(): Promise<HealthResponse> {
    const health = await this.useCase.execute();
    return {
      status: health.status === 'down' ? 503 : 200,
      body: {
        status: health.status,
        timestamp: health.timestamp,
        components: health.components,
      },
    };
  }

  async getReadyz(): Promise<HealthResponse> {
    const health = await this.useCase.execute();
    const isReady = health.status === 'ok';
    return {
      status: isReady ? 200 : 503,
      body: {
        status: isReady ? 'ready' : 'not_ready',
        timestamp: health.timestamp,
      },
    };
  }
}
