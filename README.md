# mtasks

Gerenciador de tarefas por times, com autenticação JWT e controle de acesso por papel (`ADMIN` / `MEMBER`).

**Deploy:** https://mtasks.onrender.com/

## Stack

- Node.js + Express + TypeScript
- PostgreSQL + Prisma
- JWT para autenticação
- Zod para validação
- Jest + Supertest para testes

## Rodando localmente

### Pré-requisitos

- Node.js
- PostgreSQL (local ou via Docker)

### Passo a passo

1. Clone o repositório e instale as dependências:
    
    ```bash
    npm install
    ```
    
2. Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
    
    ```env
    DATABASE_URL="postgresql://usuario:senha@localhost:5432/mtasks"
    PORT=3333
    NODE_ENV=development
    JWT_SECRET="sua_chave_secreta"
    ```
    
1. Rode as migrations do Prisma:
    
    ```bash
    npx prisma migrate dev
    ```
    
2. Inicie o servidor:
    
    ```bash
    npm run dev
    ```
    
    A API sobe em `http://localhost:3333` (ou na porta definida em `PORT`).
    

## Rodando os testes

Os testes de integração usam Jest + Supertest contra a instância do Express (sem `.listen()`), validando comportamento real de rota + banco.

```bash
npm test
```

> Os testes de integração escrevem e limpam dados no banco configurado em `DATABASE_URL`. Recomenda-se usar um banco de teste separado do banco de desenvolvimento.

## Documentação dos endpoints

Todas as rotas abaixo, exceto `POST /users` e `POST /sessions`, exigem o header:

```
Authorization: Bearer <token>
```

### Autenticação

|Método|Rota|Acesso|Descrição|
|---|---|---|---|
|POST|`/sessions`|Público|Login. Recebe `{ email, password }` e retorna `{ token }`.|

### Usuários

|Método|Rota|Acesso|Descrição|
|---|---|---|---|
|POST|`/users`|Público|Cadastro de usuário. Recebe `{ name, email, password }`. Todo usuário criado por aqui nasce como `MEMBER` — `role` não é aceito no body.|

> Não há, no momento, endpoint de promoção de usuário a `ADMIN`. Promoção precisa ser feita diretamente no banco até que essa rota seja implementada.

### Times

|Método|Rota|Acesso|Descrição|
|---|---|---|---|
|POST|`/teams`|ADMIN|Cria um time. Recebe `{ name, description }`. `name` até 100 caracteres.|
|GET|`/teams`|ADMIN|Lista todos os times.|
|PATCH|`/teams/:id`|ADMIN|Edita um time.|
|DELETE|`/teams/:id`|ADMIN|Remove um time.|

### Membros de time

|Método|Rota|Acesso|Descrição|
|---|---|---|---|
|POST|`/teams-members/:teamId`|ADMIN|Adiciona um membro ao time. <!-- confirmar: nome do campo no body, ex. { userId } -->|
|GET|`/teams-members/:teamId`|ADMIN, MEMBER|Lista os membros do time. Sem restrição adicional de role além de estar autenticado.|
|DELETE|`/teams-members/:teamId/members/:userId`|ADMIN|Remove um membro do time.|

### Tarefas

|Método|Rota|Acesso|Descrição|
|---|---|---|---|
|POST|`/tasks`|ADMIN|Cria uma tarefa. Recebe `{ title, description, priority, teamId, assignedTo }`.|
|GET|`/tasks`|ADMIN, MEMBER|Lista tarefas. ADMIN vê todas; MEMBER vê as do próprio time.|
|PATCH|`/tasks/:taskId`|ADMIN, MEMBER|Atualiza uma tarefa (`title`, `description`, `status`, `priority`, `assignedTo` — todos opcionais). MEMBER só pode editar tarefa atribuída a si. Mudança de `status` gera registro em `task-history`.|
|PATCH|`/tasks/:taskId/assign`|ADMIN|Reatribui a tarefa a outro membro. <!-- confirmar: nome do campo no body, ex. { assignedTo } -->|
|DELETE|`/tasks/:taskId`|ADMIN, MEMBER|Remove uma tarefa.|

### Histórico de tarefas

|Método|Rota|Acesso|Descrição|
|---|---|---|---|
|GET|`/task-history/:taskId`|ADMIN, MEMBER|Lista o histórico de mudanças de status de uma tarefa.|

## Papéis (roles)

- **ADMIN**: gerencia usuários, times, membros e todas as tarefas.
- **MEMBER**: visualiza tarefas do próprio time e edita apenas as tarefas atribuídas a si.