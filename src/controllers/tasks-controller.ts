import {
  TaskUpdateInput,
  TaskWhereInput,
} from "./../generated/prisma/models/Task.js";
import { NextFunction, Request, Response } from "express";
import z from "zod";
import { AppError } from "../middlewares/error-handling.js";
import { TaskPriority, TaskStatus } from "../generated/prisma/enums.js";
import { prisma } from "../database/prisma.js";
import { TaskHistoryCreateInput } from "../generated/prisma/models.js";

class TasksController {
  async create(request: Request, response: Response, next: NextFunction) {
    try {
      const bodySchema = z.object({
        title: z.string().max(200),
        description: z.string().optional(),
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

      if (!requestTeamMember && request.user.role != "ADMIN") {
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

  async index(request: Request, response: Response, next: NextFunction) {
    try {
      const querySchema = z.object({
        status: z.enum(TaskStatus).optional(),
        priority: z.enum(TaskPriority).optional(),
      });
      const { status: statusQuery, priority: priorityQuery } =
        querySchema.parse(request.query);
      const { id: userRequestId, role } = request.user;

      let where: TaskWhereInput = {};
      if (role !== "ADMIN") {
        where.team = {
          teamMembers: {
            some: {
              userId: userRequestId,
            },
          },
        };
      }

      if (statusQuery) {
        where.status = statusQuery;
      }

      if (priorityQuery) {
        where.priority = priorityQuery;
      }

      const tasks = await prisma.task.findMany({
        where: where,
        include: {
          team: {
            select: {
              name: true,
            },
          },
        },
      });

      return response.json(tasks);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(error);
      }
      return next(new AppError(`Error while searching tasks.`, 500));
    }
  }

  async update(request: Request, response: Response, next: NextFunction) {
    try {
      const bodySchema = z.object({
        title: z.string().max(200).optional(),
        description: z.string().optional(),
        status: z.enum(TaskStatus).optional(),
        priority: z.enum(TaskPriority).optional(),
        assignedTo: z.number().int().positive().optional(),
      });

      const paramsSchema = z.object({
        taskId: z.coerce.number().int(),
      });
      const { taskId } = paramsSchema.parse(request.params);

      const { assignedTo, description, priority, status, title } =
        bodySchema.parse(request.body);

      const taskToUpdate = await prisma.task.findUnique({
        where: {
          id: taskId,
        },
      });

      if (!taskToUpdate) {
        return next(new AppError("Task not found.", 404));
      }

      if (
        taskToUpdate.assignedTo !== request.user.id &&
        request.user.role !== "ADMIN"
      ) {
        return next(
          new AppError("The task is not assigned to the requesting user.", 403),
        );
      }

      const teamIdTask = taskToUpdate.teamId;

      let userAssignedTo = undefined;
      if (assignedTo) {
        userAssignedTo = await prisma.user.findUnique({
          where: {
            id: assignedTo,
          },
          include: {
            teamMembers: true,
          },
        });
        if (!userAssignedTo) {
          return next(new AppError(`User ${assignedTo} not found.`, 404));
        }

        if (!userAssignedTo.teamMembers.find((t) => t.teamId === teamIdTask)) {
          return next(
            new AppError(
              `The assigned user is not a member of team ${teamIdTask}.`,
              409,
            ),
          );
        }
      }

      const taskInput: TaskUpdateInput = {
        description,
        title,
        status,
        priority,
        assignedUser: assignedTo
          ? {
              connect: {
                id: userAssignedTo?.id,
              },
            }
          : undefined,
      };

      const tasksHistoryInput: TaskHistoryCreateInput = {
        oldStatus: taskToUpdate.status,
        newStatus: status ?? taskToUpdate.status,
        changedUser: {
          connect: {
            id: request.user.id,
          },
        },
        task: {
          connect: {
            id: taskToUpdate.id,
          },
        },
      };

      const [taskUpdated, taskHistory] = await prisma.$transaction(
        async (tx) => {
          const taskUpdated = await tx.task.update({
            where: {
              id: taskToUpdate.id,
            },
            data: taskInput,
          });
          const taskHistory =
            status && status !== taskToUpdate.status
              ? await tx.taskHistory.create({
                  data: tasksHistoryInput,
                })
              : null;

          return [taskUpdated, taskHistory];
        },
      );

      return response.json(
        status && status !== taskToUpdate.status
          ? { taskUpdated, taskHistory }
          : taskUpdated,
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(error);
      }
      return next(new AppError(`Error while update task.`, 500));
    }
  }

  async delete(request: Request, response: Response, next: NextFunction) {
    try {
      const paramsSchema = z.object({
        taskId: z.coerce.number().int(),
      });

      const { taskId } = paramsSchema.parse(request.params);

      const taskToDelete = await prisma.task.findUnique({
        where: {
          id: taskId,
        },
        select: {
          assignedTo: true,
          _count: {
            select: {
              tasksHistories: true,
            },
          },
        },
      });

      if (!taskToDelete) {
        return next(new AppError("Task not found.", 404));
      }

      if (
        taskToDelete.assignedTo !== request.user.id &&
        request.user.role !== "ADMIN"
      ) {
        return next(
          new AppError("The task is not assigned to the requesting user.", 403),
        );
      }

      if (taskToDelete._count.tasksHistories > 0) {
        return next(
          new AppError(
            "Cannot delete a task that contains history records.",
            409,
          ),
        );
      }

      await prisma.task.delete({
        where: {
          id: taskId,
        },
      });

      return response.status(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(error);
      }
      return next(new AppError(`Error while deleting task.`, 500));
    }
  }

  async assignTask(request: Request, response: Response, next: NextFunction) {
    try {
      const paramsSchema = z.object({
        taskId: z.coerce.number().int(),
      });
      const bodySchema = z.object({
        assignedTo: z.number().int().positive(),
      });

      const { taskId } = paramsSchema.parse(request.params);
      const { assignedTo } = bodySchema.parse(request.body);

      const taskToUpdate = await prisma.task.findUnique({
        where: {
          id: taskId,
        },
      });

      if (!taskToUpdate) {
        return next(new AppError("Task not found.", 404));
      }

      const userAssigned = await prisma.user.findUnique({
        where: {
          id: assignedTo,
        },
        include: {
          teamMembers: true,
        },
      });

      if (!userAssigned) {
        return next(new AppError("Target user to assign task not found.", 404));
      }

      if (
        !userAssigned.teamMembers.find((t) => t.teamId === taskToUpdate.teamId)
      ) {
        return next(
          new AppError(
            `The assigned user is not a member of team ${taskToUpdate.teamId}.`,
            409,
          ),
        );
      }

      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          assignedToId: userAssigned.id,
        },
      });

      return response.status(200).json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(error);
      }
      return next(new AppError(`Error while assign task.`, 500));
    }
  }
}

export { TasksController };
