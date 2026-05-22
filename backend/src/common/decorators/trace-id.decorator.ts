import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const TraceId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().headers?.['x-trace-id'] || '';
});
