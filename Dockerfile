FROM node
MAINTAINER Motion Bank

WORKDIR /app
COPY . .
RUN npm install --production

EXPOSE 3030
CMD ["node", "src"]
