# Fayyaz Travels Admin (Vite + React)

This is a Vite + React Router SPA under `/panel`, with a Fastify API.

- Frontend: `npm run dev:web` (Vite on port 5173, proxies `/api` and `/uploads`)
- API: `npm run dev:api` (Fastify on port 4000)
- Combined: `npm run dev`
- Production: `npm run build` then `npm start` (API serves `dist/` at `/panel`)
