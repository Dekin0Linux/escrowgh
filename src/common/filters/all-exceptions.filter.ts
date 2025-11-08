import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message || 'Internal server error';

    // Log detailed info
    this.logger.error(
      `❌ ${request.method} ${request.url} [${status}]`,
      JSON.stringify(exceptionResponse),
    );

    // Send original structure to frontend
    response.status(status).json({
      statusCode: status,
      message,
      error:
        (exceptionResponse as any).error ||
        (exception instanceof Error ? exception.name : 'Error'),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
