# Build stage
FROM node:18.10-alpine as builder

WORKDIR /app

# Associate with github repo
LABEL org.opencontainers.image.source https://github.com/RxFunction/walkasins-gateway-server

# move dependencies to container
COPY package*.json ./

# Remove dev dependencies
RUN npm prune --production

# install dependencies
RUN npm install --production && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/cache/apk/*

# reliability for prod, use package-lock
RUN npm ci --omit=dev

# put source into container
COPY controllers ./controllers
COPY middleware ./middleware
COPY model ./model
COPY routes ./routes
COPY services ./services
COPY index.js ./
COPY logger.js ./
COPY apps ./apps

# Production stage
FROM node:18-alpine

# Create a group and user (gid and uid needs to match compose)
# secrets are only accessable by this uid and gid
RUN addgroup -g 1040 servergroup && adduser -D -u 1040 -G servergroup serveruser

WORKDIR /usr/src/app

COPY --from=builder /app .

# Remove the package manager (no need to install anything else after this)
RUN rm -rf /sbin/apk \
           /etc/apk \
           /lib/apk \
           /usr/share/apk \
           /var/lib/apk
           
# Remove su and sudo if they exist
RUN if [ -f "/bin/su" ]; then rm /bin/su; fi && \
    if [ -f "/usr/bin/sudo" ]; then apk del sudo; fi

# Change ownership of the app directory
RUN chown -R serveruser:servergroup /usr/src/app

# Switch to serveruser
USER serveruser

# Expose port for secure connections
CMD [ "node", "index.js" ]