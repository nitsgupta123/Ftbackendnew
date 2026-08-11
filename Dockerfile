# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Copy source
COPY . .

# Install deps (postinstall copies TinyMCE assets to public/tinymce)
RUN npm ci

# Build the Next.js web app
RUN npm run build

# ---- Runner stage ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy full node_modules from build stage (already compiled, incl. bcrypt)
COPY --from=build /app/node_modules ./node_modules
# Copy build output + full source (API runs via tsx)
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/server ./server
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY package.json package-lock.json ./

# Runtime deps for running the API via tsx
RUN npm i -g tsx concurrently

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3000 4000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["sh", "-c", "concurrently -n api,web -c blue,green \"npm run start:api\" \"npm run start:web\""]
