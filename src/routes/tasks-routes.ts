import { Router } from "express";
import { TasksController } from "../controllers/tasks-controller.js";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated.js";
import { verifyAuthorization } from "../middlewares/verifyUserAuthorization.js";

const tasksRoutes = Router();
const tasksController = new TasksController();

tasksRoutes.use(ensureAuthenticated);
tasksRoutes.post("/", verifyAuthorization(["ADMIN"]), tasksController.create);
tasksRoutes.get(
  "/",
  verifyAuthorization(["ADMIN", "MEMBER"]),
  tasksController.index,
);

tasksRoutes.patch(
  "/:taskId",
  verifyAuthorization(["ADMIN", "MEMBER"]),
  tasksController.update,
);

tasksRoutes.patch(
  "/:taskId/assign",
  verifyAuthorization(["ADMIN"]),
  tasksController.assignTask,
);

tasksRoutes.delete(
  "/:taskId",
  verifyAuthorization(["ADMIN", "MEMBER"]),
  tasksController.delete,
);

export { tasksRoutes };
