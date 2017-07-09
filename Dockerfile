#FROM node:boron
FROM node:8.1.3

ENV HOME=/usr/src/app
ENV NODE_ENV=development
ENV PORT=3000
EXPOSE 3000
RUN mkdir -p $HOME

COPY package.json npm-shrinkwrap.json $HOME/

#RUN useradd --user-group --create-home --shell /bin/false alexandermorton &&\
#  npm install --global npm
#RUN chown -R alexandermorton:alexandermorton $HOME/*

#Set working directory and users for commands run in process after this point in dockerfile 
WORKDIR $HOME
#USER alexandermorton
RUN npm install  
#npm cache clean
#Move this to after install so cache used for layers before this.
#COPY ./server.js  $HOME/server.js

CMD ["node","server.js"]
#ENTRYPOINT ["node","server.js"]
