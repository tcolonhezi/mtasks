import { Router } from "express";
import { usersRoutes } from "./user-routes.js";
import { sessionsRouter } from "./sessions-routes.js";
import { teamsRoutes } from "./teams-routes.js";
import { teamMembersRoutes } from "./teams-members-routes.js";
import { tasksRoutes } from "./tasks-routes.js";
import { historyRoutes } from "./history-routes.js";

const router = Router();

router.use("/users", usersRoutes);
router.use("/sessions", sessionsRouter);
router.use("/teams", teamsRoutes);
router.use("/teams-members", teamMembersRoutes);
router.use("/tasks", tasksRoutes);
router.use("/task-history", historyRoutes);
export { router };
