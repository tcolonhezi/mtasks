import { Router } from "express";
import { SessionController } from "../controllers/sessions-controller.js";

const sessionsRouter = Router();
const sessionsController = new SessionController();

sessionsRouter.post("/", sessionsController.create);

export { sessionsRouter };
