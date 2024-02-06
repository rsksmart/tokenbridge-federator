FROM node:16.13.0-alpine3.13
RUN apk add --no-cache python3 build-base curl
COPY . /app/federator
RUN chown -R node:node /app/federator
USER node
WORKDIR /app/federator
RUN npm ci
ENTRYPOINT [ "npm", "start" ]
