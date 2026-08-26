import { NextFunction, Request, Response } from "express";
import z from "zod";
import { AppError } from "../middlewares/error-handling.js";
import { prisma } from "../database/prisma.js";

class TeamsMembersController {
  async create(request: Request, response: Response, next: NextFunction) {
    try {
      const bodySchema = z.object({
        team_id: z.coerce.number().int().positive(),
        user_id: z.coerce.number().int().positive(),
      });

      const { team_id, user_id } = bodySchema.parse(request.body);

      const user = await prisma.user.findUnique({
        where: {
          id: user_id,
        },
      });

      const team = await prisma.team.findUnique({
        where: {
          id: team_id,
        },
        include: {
          teamMembers: true,
        },
      });

      if (!user) {
        return next(new AppError("User not found.", 404));
      }

      if (!team) {
        return next(new AppError("Team not found.", 404));
      }

      if (
        team.teamMembers.find((t) => {
          return t.userId === user_id;
        })
      ) {
        return next(new AppError("User is already on the team.", 409));
      }

      const teamMember = await prisma.teamMember.create({
        data: {
          teamId: team_id,
          userId: user_id,
        },
      });

      return response.status(201).json(teamMember);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(error);
      }
      return next(new AppError(`Error while adding user to the team.`, 500));
    }
  }

  async delete(request: Request, response: Response, next: NextFunction) {
    try {
      const bodySchema = z.object({
        team_id: z.coerce.number().int().positive(),
        user_id: z.coerce.number().int().positive(),
      });

      const { team_id, user_id } = bodySchema.parse(request.body);

      const teamMember = await prisma.teamMember.findFirst({
        where: {
          teamId: team_id,
          userId: user_id,
        },
      });

      if (!teamMember) {
        return next(
          new AppError("There isn't a member on a selected team.", 404),
        );
      }

      await prisma.teamMember.delete({
        where: {
          id: teamMember.id,
        },
      });

      return response.status(200).json(teamMember);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(error);
      }
      return next(new AppError(`Error while deleting team.`, 500));
    }
  }

  async show(request: Request, response: Response, next: NextFunction) {
    const paramSchema = z.object({
      teamId: z.coerce.number().int(),
    });
    try {
      const { teamId } = paramSchema.parse(request.params);

      const team = await prisma.team.findUnique({
        where: {
          id: teamId,
        },
        select: {
          teamMembers: {
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                  inactivatedOn: true,
                },
              },
            },
          },
        },
      });

      if (!team) {
        return next(new AppError(`Team ${teamId} not found.`, 404));
      }

      return response.json(team.teamMembers);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(error);
      }
      return next(new AppError(`Error while show members team.`, 500));
    }
  }
}

export { TeamsMembersController };
