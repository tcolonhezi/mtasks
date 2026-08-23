import { jwt } from "zod";
import { env } from "../env.js";
import { SignOptions } from "jsonwebtoken";

export const authConfig = {
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: "1d" as SignOptions["expiresIn"],
  },
};
