FROM node:18
ENV NODE_ENV build
USER node
WORKDIR /home/node
ADD . .
RUN npm ci
RUN npm run build

FROM node:18
ENV NODE_ENV production
USER node
WORKDIR /home/node
COPY --from=0 /home/node/package*.json ./
COPY --from=0 /home/node/node_modules ./node_modules/
COPY --from=0 /home/node/dist ./dist/
COPY --from=0 /home/node/static ./static/
CMD ["node", "dist/main.js"]