import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;

    let msg: string;
    if (typeof exceptionResponse === 'string') {
      msg = exceptionResponse;
    } else if (exceptionResponse && typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
      const m = (exceptionResponse as { message: unknown }).message;
      msg = Array.isArray(m) ? m.join('; ') : String(m);
    } else if (exception instanceof Error) {
      msg = exception.message;
    } else {
      msg = 'Internal server error';
    }

    const traceId: string = request?.headers?.['x-trace-id'] || request?.traceId || randomUUID();

    // 4xx 是预期内的客户端错误（如 409 素材解析中、404 未找到），不是服务异常：
    // 用 warn 且不打印堆栈，避免正常的业务校验在日志里看起来像崩溃。5xx 才是真异常，保留 error + 堆栈。
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`HTTP ${status}: ${msg} [traceId=${traceId}]`, exception instanceof Error ? exception.stack : '');
    } else {
      this.logger.warn(`HTTP ${status}: ${msg} [traceId=${traceId}]`);
    }

    response.status(status).json({
      code: status,
      msg,
      total: 0,
      data: null,
      traceId,
    });
  }
}
