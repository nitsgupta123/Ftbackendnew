# Fayyaz Travels Admin (`ftadmin`)

Private admin panel + Fastify API. Not for public search indexing.

```bash
npm install --legacy-peer-deps
npm run dev
```

- Web (dev): `http://localhost:5173/panel`
- API: `http://localhost:4000`
- Production: `npm run build && npm start` (API serves `dist/` at `/panel`)

## Docker

Local (MySQL + app):

```bash
docker compose up --build
```

Open `http://localhost:4000/panel`

Production (VPS, external DB via `.env.production`):

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Apache should proxy `/panel/`, `/api/`, and `/uploads/` to `127.0.0.1:4000` (see `apache-ftpadmin.conf`).
