FROM node:14
MAINTAINER Motion Bank

#COPY .docker-lib/scripts/entrypoint.sh /usr/local/bin/
#COPY .docker-lib/scripts/env_secrets_expand.sh /usr/local/bin/
#RUN chmod +x /usr/local/bin/*.sh

WORKDIR /app
COPY . .
RUN npm install --production

EXPOSE 3030
# ENTRYPOINT ["entrypoint.sh", "node", "src"]
ENTRYPOINT ["node", "src"]
