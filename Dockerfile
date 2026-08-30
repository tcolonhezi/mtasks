# ==========================================
# 1. ESTÁGIO DE BUILD (Compilação do código)
# ==========================================
FROM node:24-alpine AS builder

WORKDIR /opt/mtasks/app

COPY package*.json ./
COPY prisma ./prisma/

# Instala todas as dependências (dev + prod)
RUN npm ci

COPY . .

# 1. Gera o Prisma Client antes do build
RUN npx prisma generate

# 2. Compila a aplicação via tsup
RUN npm run build

# Remove arquivos de dev para economizar espaço no próximo estágio
RUN npm prune --production

# ==========================================
# 2. ESTÁGIO DE PRODUÇÃO (Imagem leve e segura)
# ==========================================
FROM node:24-alpine AS runner

WORKDIR /opt/mtasks/app

# Define ambiente para produção
ENV NODE_ENV=production

# Copia apenas as dependências de produção e artefatos compilados
COPY package*.json ./
COPY --from=builder /opt/mtasks/app/node_modules ./node_modules
COPY --from=builder /opt/mtasks/app/dist ./dist
COPY --from=builder /opt/mtasks/app/prisma ./prisma
COPY --from=builder /opt/mtasks/app/prisma.config.ts ./prisma.config.ts

# Executa o container com usuário sem privilégios de root por segurança
USER node

EXPOSE 3333

# Executa diretamente o node no ponto de entrada compilado
CMD [ "node", "dist/server.js" ]