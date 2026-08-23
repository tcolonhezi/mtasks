import { NextFunction, Response, Request } from "express";
import z from "zod";
import { AppError } from "./error-handling.js";
import jwt from "jsonwebtoken";
import { env } from "../env.js";
import { Role } from "../generated/prisma/enums.js";

interface CustomJwtPayload {
  role: Role;
  sub: string;
}

function ensureAuthenticated(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const authorizationSchema = z.string();
    const authHeader = authorizationSchema.parse(request.headers.authorization);

    const [, token] = authHeader.split(" ");

    const { role, sub } = jwt.verify(token, env.JWT_SECRET) as CustomJwtPayload;

    request.user = {
      id: sub,
      role: role,
    };

    return next();
  } catch (error) {
    return next(new AppError("Invalid JWT token", 401));
  }
}

export { ensureAuthenticated };
