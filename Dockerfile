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
RUN node ace build --production
COPY --chown=node:node .env ./build/

FROM base AS production
ENV NODE_ENV=production
ENV PORT=3333
ENV HOST=0.0.0.0
ENV APP_KEY=X-cc9k_44wR4om-fLA996c4uWl3CWnNV
ENV DRIVE_DISK=local
ENV SESSION_DRIVER=cookie
ENV CACHE_VIEWS=false
COPY --chown=node:node ./package*.json ./
RUN yarn install --production
COPY --chown=node:node --from=build /home/node/app/build .
EXPOSE 3333
CMD [ "dumb-init", "node", "server.js" ]
#CMD dumb-init node ace serve --watch --node-args="--inspect=0.0.0.0"
