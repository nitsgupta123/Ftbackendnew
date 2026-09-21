# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .
# Build Vite SPA (output: dist/), TinyMCE is copied via postinstall into public/
RUN npm run build

# ---- Runner stage ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV API_PORT=4000
ENV API_HOST=0.0.0.0

# Runtime modules (incl. native bcrypt) from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json

RUN npm i -g tsx

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
# Fastify serves API + Vite dist at /panel
CMD ["npm", "start"]
