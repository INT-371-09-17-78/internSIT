ARG NODE_IMAGE=node:16.13.1-alpine

FROM $NODE_IMAGE AS base
RUN apk --no-cache add dumb-init
RUN mkdir -p /home/node/app && chown node:node /home/node/app
WORKDIR /home/node/app
USER node
RUN mkdir tmp

FROM base AS dependencies
COPY --chown=node:node ./package*.json ./
RUN yarn install
COPY --chown=node:node . .

FROM dependencies AS build
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
RUN node ace build --production
COPY --chown=node:node ./.env ./build/
COPY --chown=node:node ./init.sh ./build/
WORKDIR ./build
RUN chmod +x ./init.sh
EXPOSE 3333
CMD [ "dumb-init", "yarn", "start" ]
#CMD dumb-init node server.js ; node ace migration:run
#CMD dumb-init node ace serve --watch --node-args="--inspect=0.0.0.0"
