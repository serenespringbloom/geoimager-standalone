FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

EXPOSE 8787

CMD ["sh", "-c", "npm run migrate && npm start"]
