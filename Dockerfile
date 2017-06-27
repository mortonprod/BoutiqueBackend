FROM node:boron

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package.json /usr/src/app/
RUN npm install

USER node
CMD ["node","server.js"]
