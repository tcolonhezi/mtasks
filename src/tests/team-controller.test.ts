import request from "supertest";
import { randomUUID } from "node:crypto";
import { app } from "../app.js";
import { prisma } from "../database/prisma.js";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { hash } from "bcrypt";

const uniqueEmail = () => `user-${randomUUID()}@test.com`;

describe("TeamsController (Integration)", () => {
  // Rastreia o que a própria suíte criou — cleanup por ID, não por nome
  // fixo nem por "apagar tudo", pra não depender de estado do banco.
  const createdTeamIds: number[] = [];
  const createdUserIds: number[] = [];

  let adminToken = "";
  let memberToken = "";
  let memberUserId = 0;

  beforeAll(async () => {
    const adminEmail = uniqueEmail();
    const admin = await prisma.user.create({
      data: {
        name: "Usuário admin para teste",
        email: adminEmail,
        password: await hash("p123456", 12),
        role: "ADMIN",
      },
    });
    createdUserIds.push(admin.id);

    const memberEmail = uniqueEmail();
    const member = await prisma.user.create({
      data: {
        name: "Usuário member para teste",
        email: memberEmail,
        password: await hash("p123456", 12),
        role: "MEMBER",
      },
    });
    createdUserIds.push(member.id);
    memberUserId = member.id;

    const adminSession = await request(app)
      .post("/sessions")
      .send({ email: adminEmail, password: "p123456" });
    expect(adminSession.status).toBe(200); // se isso falhar, o problema é login, não o teste abaixo
    adminToken = adminSession.body.token;

    const memberSession = await request(app)
      .post("/sessions")
      .send({ email: memberEmail, password: "p123456" });
    expect(memberSession.status).toBe(200);
    memberToken = memberSession.body.token;
  });

  afterAll(async () => {
    // apaga na ordem certa: membros de time antes do time, time antes do usuário
    await prisma.teamMember.deleteMany({
      where: { teamId: { in: createdTeamIds } },
    });
    await prisma.team.deleteMany({ where: { id: { in: createdTeamIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  describe("POST /teams (create)", () => {
    it("deve retornar 401 sem token", async () => {
      const response = await request(app).post("/teams").send({
        name: "Core Team",
        description: "Responsável pela infraestrutura",
      });
      expect(response.status).toBe(401);
    });

    it("deve retornar 403 se quem chama não é ADMIN", async () => {
      const response = await request(app)
        .post("/teams")
        .set("Authorization", `Bearer ${memberToken}`)
        .send({
          name: "Time Criado por Member",
          description: "Não deveria existir",
        });

      expect(response.status).toBe(403);
    });

    it("deve criar um time e retornar 201 quando quem chama é ADMIN", async () => {
      const response = await request(app)
        .post("/teams")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: `Core Team ${randomUUID()}`,
          description: "Responsável pela infraestrutura",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      createdTeamIds.push(response.body.id);

      const teamInDb = await prisma.team.findUnique({
        where: { id: response.body.id },
      });
      expect(teamInDb).not.toBeNull();
    });

    it("deve retornar 400 se o nome ultrapassar 100 caracteres", async () => {
      const response = await request(app)
        .post("/teams")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "a".repeat(101) });

      expect(response.status).toBe(400);
    });
  });

  describe("PATCH /teams/:id (edit)", () => {
    let teamId = 0;

    beforeAll(async () => {
      const team = await prisma.team.create({
        data: {
          name: `Time Editável ${randomUUID()}`,
          description: "Original",
        },
      });
      createdTeamIds.push(team.id);
      teamId = team.id;
    });

    it("deve retornar 401 sem token", async () => {
      const response = await request(app)
        .patch(`/teams/${teamId}`)
        .send({ description: "Tentativa sem auth" });

      expect(response.status).toBe(401);
    });

    it("deve retornar 403 se quem chama não é ADMIN", async () => {
      const response = await request(app)
        .patch(`/teams/${teamId}`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ description: "Tentativa por member" });

      expect(response.status).toBe(403);
    });

    it("deve editar o time quando quem chama é ADMIN", async () => {
      const response = await request(app)
        .patch(`/teams/${teamId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ description: "Descrição atualizada" });

      expect(response.status).toBe(200);

      const teamInDb = await prisma.team.findUnique({ where: { id: teamId } });
      expect(teamInDb?.description).toBe("Descrição atualizada");
    });
  });

  describe("POST /teams-members/:id (adicionar membro)", () => {
    let teamId = 0;

    beforeAll(async () => {
      const team = await prisma.team.create({
        data: { name: `Time Membros ${randomUUID()}`, description: "Fixture" },
      });
      createdTeamIds.push(team.id);
      teamId = team.id;
    });

    it("deve retornar 401 sem token", async () => {
      const response = await request(app)
        .post(`/teams/${teamId}/members`)
        .send({ userId: memberUserId });

      expect(response.status).toBe(401);
    });

    it("deve retornar 403 se quem chama não é ADMIN", async () => {
      const response = await request(app)
        .post(`/teams-members/${teamId}`)
        .set("Authorization", `Bearer ${memberToken}`)
        .send({ userId: memberUserId });

      expect(response.status).toBe(403);
    });

    it("deve adicionar o membro quando quem chama é ADMIN", async () => {
      const response = await request(app)
        .post(`/teams-members/${teamId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: memberUserId });

      expect(response.status).toBe(201);

      const membership = await prisma.teamMember.findFirst({
        where: { teamId, userId: memberUserId },
      });
      expect(membership).not.toBeNull();
    });
  });

  describe("GET /teams-members/:id (listar membros)", () => {
    let teamId = 0;

    beforeAll(async () => {
      const team = await prisma.team.create({
        data: { name: `Time Listagem ${randomUUID()}`, description: "Fixture" },
      });
      createdTeamIds.push(team.id);
      teamId = team.id;

      await prisma.teamMember.create({
        data: { teamId, userId: memberUserId },
      });
    });

    it("deve retornar 401 sem token", async () => {
      const response = await request(app).get(`/teams-members/${teamId}`);
      expect(response.status).toBe(401);
    });

    // Regra explícita da doc: listagem de membros NÃO tem restrição de role.
    // Esse teste existe justamente pra pegar quem adicionar
    // verifyAuthorization(["ADMIN"]) aqui achando que é "óbvio".
    it("deve permitir que um MEMBER (não-admin) liste os membros do time", async () => {
      const response = await request(app)
        .get(`/teams-members/${teamId}`)
        .set("Authorization", `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("DELETE /teams-members/:id/members/:userId (remover membro)", () => {
    let teamId = 0;

    beforeAll(async () => {
      const team = await prisma.team.create({
        data: { name: `Time Remocao ${randomUUID()}`, description: "Fixture" },
      });
      createdTeamIds.push(team.id);
      teamId = team.id;

      await prisma.teamMember.create({
        data: { teamId, userId: memberUserId },
      });
    });

    it("deve retornar 401 sem token", async () => {
      const response = await request(app).delete(
        `/teams-members/${teamId}/members/${memberUserId}`,
      );
      expect(response.status).toBe(401);
    });

    it("deve retornar 403 se quem chama não é ADMIN", async () => {
      const response = await request(app)
        .delete(`/teams-members/${teamId}/members/${memberUserId}`)
        .set("Authorization", `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
    });

    it("deve remover o membro quando quem chama é ADMIN", async () => {
      const response = await request(app)
        .delete(`/teams-members/${teamId}/members/${memberUserId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      const membership = await prisma.teamMember.findFirst({
        where: { teamId, userId: memberUserId },
      });
      expect(membership).toBeNull();
    });
  });
});
