import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import z, { email } from "zod";
import { prisma } from "../database/prisma.js";
import { AppError } from "../middlewares/error-handling.js";
import { compare } from "bcrypt";
import { authConfig } from "../configs/auth.js";

class SessionController {
  async create(request: Request, response: Response, next: NextFunction) {
    try {
      const bodySchema = z.object({
        email: z.email(),
        password: z.string().min(6),
      });

      const { email, password } = bodySchema.parse(request.body);

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return next(new AppError("Invalid email or password.", 401));
      }

      const isPasswordCorrect = await compare(password, user.password);

      if (!isPasswordCorrect) {
        return next(new AppError("Invalid email or password.", 401));
      }

      const { secret, expiresIn } = authConfig.jwt;

      const token = jwt.sign({ role: user.role ?? "MEMBER" }, secret, {
        expiresIn,
        subject: String(user.id),
      });

      const { password: _, ...userWithoutPassword } = user;

      return response
        .status(200)
        .json({ token: token, user: userWithoutPassword });
    } catch (error) {
      return next(new AppError("Error generating token.", 500));
    }
  }
}

export { SessionController };
