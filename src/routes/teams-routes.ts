import { Router } from "express";
import { TeamsController } from "../controllers/teams-controller.js";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated.js";
import { verifyAuthorization } from "../middlewares/verifyUserAuthorization.js";

const teamsRoutes = Router();
const teamsController = new TeamsController();

teamsRoutes.use(ensureAuthenticated);
teamsRoutes.post("/", verifyAuthorization(["ADMIN"]), teamsController.create);
teamsRoutes.get("/", verifyAuthorization(["ADMIN"]), teamsController.index);
teamsRoutes.patch(
  "/:id",
  verifyAuthorization(["ADMIN"]),
  teamsController.update,
);
teamsRoutes.delete(
  "/:id",
  verifyAuthorization(["ADMIN"]),
  teamsController.delete,
);

export { teamsRoutes };
