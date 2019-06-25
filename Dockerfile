FROM node:10
MAINTAINER Motion Bank

WORKDIR /app
COPY . .
RUN rm -rf node_modules
RUN npm install --production

EXPOSE 3030
CMD ["node", "src"]
