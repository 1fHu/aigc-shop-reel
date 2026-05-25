import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { randomUUID } from 'crypto';

export interface ApiResponse<T> {
  code: number;
  msg: string | null;
  total: number;
  data: T | null;
  traceId: string;
}

const RAW_RESPONSE = Symbol('raw-response');

export const RawResponse = () => Reflect.metadata(RAW_RESPONSE, true);

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const req = context.switchToHttp().getRequest();
    const traceId: string = req?.headers?.['x-trace-id'] || req?.traceId || randomUUID();
    return next.handle().pipe(
      map((payload: unknown) => {
        if (payload && typeof payload === 'object' && '__envelope__' in (payload as Record<string, unknown>)) {
          const env = payload as { code?: number; msg?: string | null; total?: number; data?: T | null };
          return {
            code: env.code ?? 200,
            msg: env.msg ?? null,
            total: env.total ?? 0,
            data: (env.data ?? null) as T | null,
            traceId,
          };
        }
        return {
          code: 200,
          msg: null,
          total: 0,
          data: (payload ?? null) as T | null,
          traceId,
        };
      }),
    );
  }
}

export function envelope<T>(data: T, opts: { total?: number; msg?: string | null; code?: number } = {}) {
  return {
    __envelope__: true as const,
    code: opts.code ?? 200,
    msg: opts.msg ?? null,
    total: opts.total ?? 0,
    data,
  };
}
