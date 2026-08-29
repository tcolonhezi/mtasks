import { Router } from "express";
import { HistoryController } from "../controllers/history-controller.js";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated.js";
import { verifyAuthorization } from "../middlewares/verifyUserAuthorization.js";

const historyRoutes = Router();
const historyController = new HistoryController();

historyRoutes.use(ensureAuthenticated);

historyRoutes.get(
  "/:taskId",
  verifyAuthorization(["ADMIN", "MEMBER"]),
  historyController.index,
);

export { historyRoutes };
