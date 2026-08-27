import { NextFunction, Request, Response } from "express";
import z from "zod";
import { AppError } from "../middlewares/error-handling.js";
import { TaskPriority, TaskStatus } from "../generated/prisma/enums.js";
import { prisma } from "../database/prisma.js";

class TasksController {
  async create(request: Request, response: Response, next: NextFunction) {
    try {
      const bodySchema = z.object({
        title: z.string().max(200),
        description: z.string(),
        status: z.enum(TaskStatus).default("PENDING"),
        priority: z.enum(TaskPriority).default("LOW"),
        assignedTo: z.number().int().positive(),
        teamId: z.number().int().positive(),
      });

      const { assignedTo, description, priority, status, teamId, title } =
        bodySchema.parse(request.body);

      const userAssignedTo = await prisma.user.findUnique({
        where: {
          id: assignedTo,
        },
        include: {
          teamMembers: true,
        },
      });

      const requestTeamMember = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            teamId,
            userId: request.user.id,
          },
        },
      });

      if (!requestTeamMember) {
        return next(
          new AppError(
            `The user of the request is not assigned to the team ${teamId}`,
            409,
          ),
        );
      }

      if (!userAssignedTo) {
        return next(new AppError(`User ${assignedTo} not found.`, 404));
      }

      if (!userAssignedTo.teamMembers.find((t) => t.teamId === teamId)) {
        return next(
          new AppError(`The user is not assigned to de team ${teamId}`, 409),
        );
      }

      const createdTask = await prisma.task.create({
        data: {
          title,
          description,
          status,
          priority,
          teamId,
          assignedTo,
        },
      });

      return response.status(201).json(createdTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(error);
      }
      return next(new AppError(`Error while creating task.`, 500));
    }
  }
}

export { TasksController };
