FROM node:20-alpine
WORKDIR /usr/src/app
COPY package.json ./
COPY tsconfig.base.json ./
COPY services/autobuy/package.json ./services/autobuy/package.json
COPY libs ./libs
COPY services/autobuy ./services/autobuy
RUN npm install
RUN npm --workspace services/autobuy run build
CMD ["npm", "--workspace", "services/autobuy", "start"]
