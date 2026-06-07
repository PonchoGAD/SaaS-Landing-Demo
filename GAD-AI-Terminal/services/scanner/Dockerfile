FROM node:20-alpine
WORKDIR /usr/src/app
COPY package.json ./
COPY tsconfig.base.json ./
COPY services/scanner/package.json ./services/scanner/package.json
COPY libs ./libs
COPY services/scanner ./services/scanner
RUN npm install
RUN npx tsc -p libs/lifecycle/tsconfig.build.json
RUN npx tsc -p libs/regime/tsconfig.build.json
RUN npx tsc -p libs/reputation/tsconfig.build.json
RUN npx tsc -p libs/memory/tsconfig.build.json
RUN npx tsc -p libs/opportunity/tsconfig.build.json
RUN npm --workspace services/scanner run build
CMD ["npm", "--workspace", "services/scanner", "start"]
