import { Response } from 'express';

// Response type definitions
interface SuccessResponse<T = any> {
  message: string;
  data: T | null;
}

interface ErrorResponse {
  message: string;
  reason?: string;
}

// HTTP Status codes
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatusCode = typeof HttpStatus[keyof typeof HttpStatus];

/**
 * Standardized HTTP Response utility class
 */
export class ApiResponse {
  /**
   * Send a success response (2xx status codes)
   */
  static success<T = any>(
    res: Response,
    message: string,
    data: T | null = null,
    statusCode: HttpStatusCode = HttpStatus.OK
  ): Response {
    const response: SuccessResponse<T> = {
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Send an error response (4xx, 5xx status codes)
   */
  static error(
    res: Response,
    message: string,
    statusCode: HttpStatusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    reason?: string
  ): Response {
    const response: ErrorResponse = {
      message,
      ...(reason && { reason }),
    };
    return res.status(statusCode).json(response);
  }

  /**
   * Send a 200 OK response
   */
  static ok<T = any>(res: Response, message: string, data: T | null = null): Response {
    return ApiResponse.success(res, message, data, HttpStatus.OK);
  }

  /**
   * Send a 201 Created response
   */
  static created<T = any>(res: Response, message: string, data: T | null = null): Response {
    return ApiResponse.success(res, message, data, HttpStatus.CREATED);
  }

  /**
   * Send a 202 Accepted response
   */
  static accepted<T = any>(res: Response, message: string, data: T | null = null): Response {
    return ApiResponse.success(res, message, data, HttpStatus.ACCEPTED);
  }

  /**
   * Send a 400 Bad Request response
   */
  static badRequest(res: Response, message: string, reason?: string): Response {
    return ApiResponse.error(res, message, HttpStatus.BAD_REQUEST, reason);
  }

  /**
   * Send a 401 Unauthorized response
   */
  static unauthorized(res: Response, message: string = 'Unauthorized', reason?: string): Response {
    return ApiResponse.error(res, message, HttpStatus.UNAUTHORIZED, reason);
  }

  /**
   * Send a 403 Forbidden response
   */
  static forbidden(res: Response, message: string = 'Forbidden', reason?: string): Response {
    return ApiResponse.error(res, message, HttpStatus.FORBIDDEN, reason);
  }

  /**
   * Send a 404 Not Found response
   */
  static notFound(res: Response, message: string = 'Resource not found', reason?: string): Response {
    return ApiResponse.error(res, message, HttpStatus.NOT_FOUND, reason);
  }

  /**
   * Send a 409 Conflict response
   */
  static conflict(res: Response, message: string, reason?: string): Response {
    return ApiResponse.error(res, message, HttpStatus.CONFLICT, reason);
  }

  /**
   * Send a 422 Unprocessable Entity response
   */
  static unprocessableEntity(res: Response, message: string, reason?: string): Response {
    return ApiResponse.error(res, message, HttpStatus.UNPROCESSABLE_ENTITY, reason);
  }

  /**
   * Send a 500 Internal Server Error response
   */
  static internalError(res: Response, message: string = 'Internal server error', reason?: string): Response {
    return ApiResponse.error(res, message, HttpStatus.INTERNAL_SERVER_ERROR, reason);
  }

  /**
   * Send a 503 Service Unavailable response
   */
  static serviceUnavailable(res: Response, message: string = 'Service unavailable', reason?: string): Response {
    return ApiResponse.error(res, message, HttpStatus.SERVICE_UNAVAILABLE, reason);
  }
}

// Export types for use in other files
export type { SuccessResponse, ErrorResponse };