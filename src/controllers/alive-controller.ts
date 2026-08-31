import { Request, Response } from "express";
import { prisma } from "../database/prisma.js";

class AliveController {
  async index(request: Request, response: Response) {
    return response.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: (await prisma.$queryRaw`SELECT 1`) ? true : false,
    });
  }
}

export { AliveController };
