FROM node:20-alpine
WORKDIR /usr/src/app
COPY package.json ./
COPY tsconfig.base.json ./
COPY services/api/package.json ./services/api/package.json
COPY libs ./libs
COPY services/api ./services/api
RUN npm install
RUN npm --workspace services/api run build
EXPOSE 4000
CMD ["npm", "--workspace", "services/api", "start"]
