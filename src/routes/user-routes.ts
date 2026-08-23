import { Router } from "express";
import { UserController } from "../controllers/users-controller.js";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated.js";
import { verifyAuthorization } from "../middlewares/verifyUserAuthorization.js";

const usersRoutes = Router();
const userController = new UserController();

usersRoutes.post("/", userController.create);

export { usersRoutes };
