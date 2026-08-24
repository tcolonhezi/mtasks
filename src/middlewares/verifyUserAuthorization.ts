import { NextFunction, Request, Response } from "express";
import { AppError } from "./error-handling.js";
import { Role } from "../generated/prisma/enums.js";

function verifyAuthorization(requiredPermissions: Role[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.user) {
      throw new AppError("User not authenticated.", 401);
    }

    const hasPermission = requiredPermissions.includes(request.user.role);

    if (!hasPermission) {
      throw new AppError("User does not have the required role.", 403);
    }
    return next();
  };
}

export { verifyAuthorization };
