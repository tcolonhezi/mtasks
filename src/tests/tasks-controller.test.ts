import request from "supertest";
import { randomUUID } from "node:crypto";
import { app } from "../app.js";
import { prisma } from "../database/prisma.js";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { hash } from "bcrypt";

const uniqueEmail = () => `user-${randomUUID()}@test.com`;

describe("TasksController (Integration)", () => {
  const createdTaskIds: number[] = [];
  const createdTeamIds: number[] = [];
  const createdUserIds: number[] = [];

  let adminToken = "";
  let memberToken = "";
  let outsiderToken = ""; // member de outro time, sem vínculo com a task
  let memberUserId = 0;
  let outsiderUserId = 0;
  let teamId = 0;

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: {
        name: "Admin Fixture",
        email: uniqueEmail(),
        password: await hash("p123456", 12),
        role: "ADMIN",
      },
    });
    createdUserIds.push(admin.id);

    const member = await prisma.user.create({
      data: {
        name: "Member Fixture",
        email: uniqueEmail(),
        password: await hash("p123456", 12),
        role: "MEMBER",
      },
    });
    createdUserIds.push(member.id);
    memberUserId = member.id;

    const outsider = await prisma.user.create({
      data: {
        name: "Outsider Fixture",
        email: uniqueEmail(),
        password: await hash("p123456", 12),
        role: "MEMBER",
      },
    });
    createdUserIds.push(outsider.id);
    outsiderUserId = outsider.id;

    const team = await prisma.team.create({
      data: { name: `Time Tasks ${randomUUID()}`, description: "Fixture" },
    });
    createdTeamIds.push(team.id);
    teamId = team.id;

    // só o member entra no time; outsider fica de fora de propósito,
    // pra testar o escopo de visualização por time
    await prisma.teamMember.create({ data: { teamId, userId: memberUserId } });

    const adminSession = await request(app)
      .post("/sessions")
      .send({ email: admin.email, password: "p123456" });
    expect(adminSession.status).toBe(200);
    adminToken = adminSession.body.token;

    const memberSession = await request(app)
      .post("/sessions")
      .send({ email: member.email, password: "p123456" });
    expect(memberSession.status).toBe(200);
    memberToken = memberSession.body.token;

    const outsiderSession = await request(app)
      .post("/sessions")
      .send({ email: outsider.email, password: "p123456" });
    expect(outsiderSession.status).toBe(200);
    outsiderToken = outsiderSession.body.token;
  });

  afterAll(async () => {
    // deletar em ordem: history -> task -> teamMember -> team -> user
    await prisma.taskHistory.deleteMany({
      where: { taskId: { in: createdTaskIds } },
    });
    await prisma.task.deleteMany({ where: { id: { in: createdTaskIds } } });
    await prisma.teamMember.deleteMany({
      where: { teamId: { in: createdTeamIds } },
    });
    await prisma.team.deleteMany({ where: { id: { in: createdTeamIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  describe("POST /tasks (create)", () => {
    it("deve retornar 401 sem token", async () => {
      const response = await request(app).post("/tasks").send({
        title: "Tarefa sem auth",
        teamId,
        assignedTo: memberUserId,
      });

      expect(response.status).toBe(401);
    });

    it("deve retornar 403 se quem chama não é ADMIN", async () => {
      const response = await request(app)
        .post("/tasks")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({
          title: "Tarefa criada por member",
          teamId,
          assignedTo: memberUserId,
        });
      console.log(response.body);
      expect(response.status).toBe(403);
    });

    it("deve criar a tarefa quando quem chama é ADMIN", async () => {
      const response = await request(app)
        .post("/tasks")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Configurar CI",
          description: "Pipeline de deploy",
          priority: "HIGH",
          teamId,
          assignedTo: memberUserId,
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe("PENDING");
      createdTaskIds.push(response.body.id);
    });

    it("deve retornar 400 se title ultrapassar 200 caracteres", async () => {
      const response = await request(app)
        .post("/tasks")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "a".repeat(201),
          teamId,
          assignedTo: memberUserId,
        });

      expect(response.status).toBe(400);
    });

    it("deve retornar 400 se priority não for um valor válido do enum", async () => {
      const response = await request(app)
        .post("/tasks")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Prioridade inválida",
          priority: "URGENT", // não existe no enum (high/medium/low)
          teamId,
          assignedTo: memberUserId,
        });

      expect(response.status).toBe(400);
    });
  });

  describe("PATCH /tasks/:taskId (update / mudança de status)", () => {
    let taskId = 0;

    beforeAll(async () => {
      const task = await prisma.task.create({
        data: {
          title: "Task Editável",
          status: "PENDING",
          priority: "MEDIUM",
          teamId,
          assignedTo: memberUserId,
        },
      });
      createdTaskIds.push(task.id);
      taskId = task.id;
    });

    it("deve retornar 401 sem token", async () => {
      const response = await request(app)
        .patch(`/tasks/${taskId}`)
        .send({ status: "IN_PROGRESS" });

      expect(response.status).toBe(401);
    });

    it("deve retornar 403 se o member não é o assignedTo da tarefa", async () => {
      const response = await request(app)
        .patch(`/tasks/${taskId}`)
        .set("Authorization", `Bearer ${outsiderToken}`)
        .send({ status: "IN_PROGRESS" });

      expect(response.status).toBe(403);
    });

    it("deve permitir que o member assignedTo edite a própria tarefa", async () => {
      const response = await request(app)
        .patch(`/tasks/${taskId}`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ status: "IN_PROGRESS" });

      expect(response.status).toBe(200);

      const taskInDb = await prisma.task.findUnique({ where: { id: taskId } });
      expect(taskInDb?.status).toBe("IN_PROGRESS");
    });

    it("deve registrar a mudança em tasks_history com old_status/new_status corretos", async () => {
      const response = await request(app)
        .patch(`/tasks/${taskId}`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ status: "COMPLETED" });

      expect(response.status).toBe(200);

      const history = await prisma.taskHistory.findFirst({
        where: { taskId, newStatus: "COMPLETED" },
        orderBy: { changedAt: "desc" },
      });

      expect(history).not.toBeNull();
      expect(history?.oldStatus).toBe("IN_PROGRESS");
      expect(history?.changedBy).toBe(memberUserId);
    });

    it("deve retornar 400 se status não for um valor válido do enum", async () => {
      const response = await request(app)
        .patch(`/tasks/${taskId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "done" }); // não existe no enum

      expect(response.status).toBe(400);
    });

    it("ADMIN deve poder editar tarefa mesmo não sendo o assignedTo", async () => {
      const response = await request(app)
        .patch(`/tasks/${taskId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ priority: "LOW" });

      expect(response.status).toBe(200);

      const taskInDb = await prisma.task.findUnique({ where: { id: taskId } });
      expect(taskInDb?.priority).toBe("LOW");
    });
  });

  describe("GET /tasks (listagem escopada por time)", () => {
    let teamTaskId = 0;

    beforeAll(async () => {
      const task = await prisma.task.create({
        data: {
          title: "Task do Time",
          status: "PENDING",
          priority: "MEDIUM",
          teamId,
          assignedTo: memberUserId,
        },
      });
      createdTaskIds.push(task.id);
      teamTaskId = task.id;
    });

    it("deve retornar 401 sem token", async () => {
      const response = await request(app).get("/tasks");
      expect(response.status).toBe(401);
    });

    it("ADMIN deve ver todas as tarefas, inclusive de times que não é membro", async () => {
      const response = await request(app)
        .get("/tasks")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const ids = response.body.map((t: { id: number }) => t.id);
      expect(ids).toContain(teamTaskId);
    });

    it("MEMBER do time deve ver a tarefa do próprio time", async () => {
      const response = await request(app)
        .get("/tasks")
        .set("Authorization", `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      const ids = response.body.map((t: { id: number }) => t.id);
      expect(ids).toContain(teamTaskId);
    });

    it("MEMBER de outro time NÃO deve ver a tarefa deste time", async () => {
      const response = await request(app)
        .get("/tasks")
        .set("Authorization", `Bearer ${outsiderToken}`);

      expect(response.status).toBe(200);
      const ids = response.body.map((t: { id: number }) => t.id);
      expect(ids).not.toContain(teamTaskId);
    });
  });
});
