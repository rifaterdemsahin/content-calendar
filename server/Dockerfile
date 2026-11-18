FROM node:22-alpine
WORKDIR /app
COPY server/session.js server/server.js ./
COPY . /site
RUN rm -rf /site/api /site/server /site/.git /site/.github /site/node_modules
USER node
ENV PORT=8080
CMD ["node", "server.js"]
