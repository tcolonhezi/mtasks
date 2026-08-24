import { NextFunction, Request, Response } from "express";
import z from "zod";
import { prisma } from "../database/prisma.js";
import { AppError } from "../middlewares/error-handling.js";
import { TeamUpdateInput } from "../generated/prisma/models.js";

class TeamsController {
  async create(request: Request, response: Response, next: NextFunction) {
    try {
      const bodySchema = z.object({
        name: z.string().max(100),
        description: z.string().optional(),
      });

      const { name, description } = bodySchema.parse(request.body);

      const createdTeam = await prisma.team.create({
        data: {
          name,
          description,
        },
      });

      return response.status(201).json(createdTeam);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(error);
      }
      return next(new AppError(`Error while creating the team.`, 500));
    }
  }

  async index(request: Request, response: Response, next: NextFunction) {
    try {
      const teams = await prisma.team.findMany({
        include: {
          teamMembers: true,
        },
      });

      return response.json(teams);
    } catch (error) {
      return next(new AppError(`Error while finding team.`, 500));
    }
  }

  async update(request: Request, response: Response, next: NextFunction) {
    try {
      const bodySchema = z.object({
        name: z.string().max(100).optional(),
        description: z.string().optional(),
      });
      const paramSchema = z.object({
        id: z.coerce.number().int(),
      });

      const { id } = paramSchema.parse(request.params);

      const { name, description } = bodySchema.parse(request.body);

      const team = await prisma.team.findUnique({
        where: {
          id,
        },
      });

      if (!team) {
        return next(new AppError(`Team ${id} not found.`, 404));
      }

      if (!name && !description) {
        return next(new AppError("Nothing to update", 400));
      }

      const teamPartial: TeamUpdateInput = {
        name: name,
        description: description,
      };

      const teamUpdated = await prisma.team.update({
        where: {
          id,
        },
        data: teamPartial,
      });

      return response.status(200).json(teamUpdated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(error);
      }
      return next(new AppError(`Error while updating team.`, 500));
    }
  }

  async delete(request: Request, response: Response, next: NextFunction) {
    try {
      const paramSchema = z.object({
        id: z.coerce.number().int(),
      });

      const { id } = paramSchema.parse(request.params);

      const team = await prisma.team.findUnique({
        where: {
          id,
        },
        select: {
          _count: {
            select: {
              tasks: true,
              teamMembers: true,
            },
          },
        },
      });

      if (!team) {
        return next(new AppError(`Team ${id} not found.`, 404));
      }
      if (team._count.tasks > 0 || team._count.teamMembers > 0) {
        return next(
          new AppError("Team have Members or Tasks. Cannot be deleted.", 409),
        );
      }

      const teamDeleted = await prisma.team.delete({
        where: {
          id,
        },
      });

      return response.status(200).json(teamDeleted);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(error);
      }
      return next(new AppError(`Error while deleting team.`, 500));
    }
  }
}

export { TeamsController };
