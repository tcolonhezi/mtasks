import { Role } from "./../generated/prisma/enums.js";
import { Response, Request, NextFunction } from "express";
import z from "zod";
import { prisma } from "../database/prisma.js";
import { AppError } from "../middlewares/error-handling.js";
import { hash } from "bcrypt";
import { Prisma } from "../generated/prisma/client.js";

class UserController {
  async create(request: Request, response: Response, next: NextFunction) {
    try {
      const bodySchema = z.object({
        name: z.string().min(3).max(100),
        email: z.email().min(6),
        password: z.string().min(6),
      });

      const { name, email, password } = bodySchema.parse(request.body);

      const isAlreadyRegistered = await prisma.user.findFirst({
        where: {
          email: email,
        },
      });

      if (isAlreadyRegistered && isAlreadyRegistered.inactivatedOn) {
        return next(
          new AppError(
            "This email address is already registered. Please request authorization from the admin.",
            403,
          ),
        );
      }

      const hashedPassword = await hash(password, 12);

      const insertedUser = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: "MEMBER",
        },
      });

      const { password: _, ...insertedUserWithoutPassowrd } = insertedUser;

      return response.status(201).json(insertedUserWithoutPassowrd);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(error);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          return next(new AppError("Email already exists", 409));
        }
        return next(new AppError("Database error", 500));
      }
      return next(new AppError("Internal server error", 500));
    }
  }
}

export { UserController };
