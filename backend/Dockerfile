FROM node:20-alpine

WORKDIR /app

# Install compilation tools for sqlite3 if native build is needed
RUN apk add --no-repeat python3 make g++

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["npm", "start"]
