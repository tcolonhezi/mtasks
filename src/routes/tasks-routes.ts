import { Router } from "express";
import { TasksController } from "../controllers/tasks-controller.js";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated.js";
import { verifyAuthorization } from "../middlewares/verifyUserAuthorization.js";

const tasksRoutes = Router();
const tasksController = new TasksController();

tasksRoutes.use(ensureAuthenticated);
tasksRoutes.post(
  "/",
  verifyAuthorization(["ADMIN", "MEMBER"]),
  tasksController.create,
);

export { tasksRoutes };
