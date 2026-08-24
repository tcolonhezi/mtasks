import { Router } from "express";
import { usersRoutes } from "./user-routes.js";
import { sessionsRouter } from "./sessions-routes.js";
import { teamsRoutes } from "./teams-routes.js";

const router = Router();

router.use("/users", usersRoutes);
router.use("/sessions", sessionsRouter);
router.use("/teams", teamsRoutes);

export { router };
