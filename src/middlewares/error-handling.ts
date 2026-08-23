import { NextFunction, Request, Response } from "express";
import z, { ZodError } from "zod";

class AppError {
  message: String;
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    this.message = message;
    this.statusCode = statusCode;
  }
}

function errorHandling(
  error: Error,
  request: Request,
  response: Response,
  next: NextFunction,
) {
  if (error instanceof AppError) {
    return response.status(error.statusCode).json({
      message: error.message,
    });
  }

  if (error instanceof ZodError) {
    return response.status(400).json({
      message: "Validation failed.",
      errors: z.treeifyError(error),
    });
  }

  return response.status(500).json({
    message: `Erro interno. ${error.message}`,
  });
}

export { errorHandling, AppError };
