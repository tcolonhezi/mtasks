import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "@jest/globals";
import { app } from "../app.js";

import request from "supertest";
import { prisma } from "../database/prisma.js";

describe("Sessions Controller", () => {
  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: "auth@example.com" } });
  });

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: "auth@example.com" } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Should authenticate and get access token", async () => {
    const userResponse = await request(app).post("/users").send({
      name: "Test User",
      email: "auth@example.com",
      password: "p123456",
    });

    const sessionResponse = await request(app).post("/sessions").send({
      email: "auth@example.com",
      password: "p123456",
    });
    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.body.token).toEqual(expect.any(String));
    expect(userResponse.body).not.toHaveProperty("password");
    expect(userResponse.body.role).toEqual("MEMBER");
  });

  it("Should not authenticate and get error 401", async () => {
    const sessionResponse = await request(app).post("/sessions").send({
      email: "auth@example.com",
      password: "p123456",
    });
    expect(sessionResponse.status).toBe(401);
  });
});
