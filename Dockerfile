FROM node:16

WORKDIR /home/node
USER node

COPY --chown=node:node . .
RUN npm ci
EXPOSE 3000
CMD ["npm","run","start"]
