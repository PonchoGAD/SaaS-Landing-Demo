FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/social-monitor/package.json services/social-monitor/
COPY libs/db/package.json libs/db/
COPY libs/narrative/package.json libs/narrative/
RUN npm install --workspace=social-monitor --workspace=@lib/db --workspace=@lib/narrative
COPY tsconfig.base.json ./
COPY libs/db libs/db
COPY libs/narrative libs/narrative
COPY services/social-monitor services/social-monitor
RUN npm run build --workspace=social-monitor
CMD ["node", "services/social-monitor/dist/index.js"]
