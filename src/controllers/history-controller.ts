import { NextFunction, Request, Response } from "express";
import z from "zod";
import { AppError } from "../middlewares/error-handling.js";
import { prisma } from "../database/prisma.js";

class HistoryController {
  async index(request: Request, response: Response, next: NextFunction) {
    try {
      const paramsSchema = z.object({
        taskId: z.coerce.number().int(),
      });
      const { taskId } = paramsSchema.parse(request.params);

      const taskToFindHistory = await prisma.task.findUnique({
        where: {
          id: taskId,
        },
      });

      if (!taskToFindHistory) {
        return next(new AppError("Task not found.", 404));
      }

      const userRequest = await prisma.user.findUnique({
        where: {
          id: request.user.id,
        },
        include: {
          teamMembers: true,
        },
      });

      const isUserRequestMember = userRequest?.teamMembers.find(
        (t) => t.teamId === taskToFindHistory.teamId,
      );
      if (!isUserRequestMember && request.user.role !== "ADMIN") {
        return next(
          new AppError(
            `The requesting user is not a member of team ${taskToFindHistory.teamId}.`,
            403,
          ),
        );
      }

      const taskHistories = await prisma.taskHistory.findMany({
        where: {
          taskId,
        },
      });

      return response.status(200).json(taskHistories);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(error);
      }
      return next(new AppError(`Error while searching tasks.`, 500));
    }
  }
}

export { HistoryController };
