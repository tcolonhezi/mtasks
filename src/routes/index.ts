import { Router } from "express";
import { usersRoutes } from "./user-routes.js";
import { sessionsRouter } from "./sessions-routes.js";

const router = Router();

router.use("/users", usersRoutes);
router.use("/sessions", sessionsRouter);

export { router };
