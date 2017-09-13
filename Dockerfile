FROM node:8.1.3

ENV HOME=/usr/src/app
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
RUN mkdir -p $HOME

COPY package.json npm-shrinkwrap.json $HOME/

WORKDIR $HOME

RUN npm install  

USER node
CMD ["node","server.js"]

