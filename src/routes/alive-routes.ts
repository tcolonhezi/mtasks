import { Router } from "express";
import { AliveController } from "../controllers/alive-controller.js";

const aliveRoutes = Router();
const aliveController = new AliveController();

aliveRoutes.get("/", aliveController.index);

export { aliveRoutes };
