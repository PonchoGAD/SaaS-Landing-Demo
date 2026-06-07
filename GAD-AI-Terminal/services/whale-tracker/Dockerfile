FROM node:20-alpine
WORKDIR /usr/src/app
COPY package.json ./
COPY tsconfig.base.json ./
COPY services/whale-tracker/package.json ./services/whale-tracker/package.json
COPY libs ./libs
COPY services/whale-tracker ./services/whale-tracker
RUN npm install
RUN npm --workspace services/whale-tracker run build
CMD ["npm", "--workspace", "services/whale-tracker", "start"]
