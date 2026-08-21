from node:24-alpine

WORKDIR /opt/mtasks/app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3333

CMD [ "npm", "start" ]


