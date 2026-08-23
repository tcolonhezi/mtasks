import express from "express";
import { errorHandling } from "./middlewares/error-handling.js";
import { router } from "./routes/index.js";

const app = express();

app.use(express.json());

app.use(router);

app.use(errorHandling);

export { app };
