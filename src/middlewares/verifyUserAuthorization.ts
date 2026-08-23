import { NextFunction, Request, Response } from "express";
import { AppError } from "./error-handling.js";

function verifyAuthorization(requiredPermissions: string[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.user) {
      throw new AppError("User not authenticated.", 401);
    }

    const hasPermission = requiredPermissions.some((permission) =>
      request.user.role.includes(permission),
    );

    if (!hasPermission) {
      throw new AppError("User does not have the required role.", 403);
    }
    return next();
  };
}

export { verifyAuthorization };
