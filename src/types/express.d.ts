import { Role } from "./../generated/prisma/enums.js";
declare global {
  declare namespace Express {
    export interface Request {
      user: {
        id: int;
        role: Role;
      };
    }
  }
}
