import { randomUUID } from 'crypto';

export type ApiResponse<T> = {
  code: number;
  msg: string | null;
  total: number;
  data: T;
  traceId: string;
};

export function ok<T>(data: T, total = 0, traceId = randomUUID()): ApiResponse<T> {
  return {
    code: 200,
    msg: null,
    total,
    data,
    traceId,
  };
}