import { Router } from "express";
import { TeamsMembersController } from "../controllers/teams-members-controller.js";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated.js";
import { verifyAuthorization } from "../middlewares/verifyUserAuthorization.js";

const teamMembersRoutes = Router();
const teamMembersController = new TeamsMembersController();

teamMembersRoutes.use(ensureAuthenticated);
teamMembersRoutes.post(
  "/:teamId",
  verifyAuthorization(["ADMIN"]),
  teamMembersController.addMember,
);
teamMembersRoutes.delete(
  "/:teamId/members/:userId",
  verifyAuthorization(["ADMIN"]),
  teamMembersController.delete,
);
teamMembersRoutes.get(
  "/:teamId",
  verifyAuthorization(["ADMIN", "MEMBER"]),
  teamMembersController.show,
);
export { teamMembersRoutes };
