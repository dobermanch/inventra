# Inventra

[![CI](https://github.com/dobermanch/inventra/actions/workflows/ci.yml/badge.svg)](https://github.com/dobermanch/inventra/actions/workflows/build.yml) [![Release](https://github.com/dobermanch/inventra/actions/workflows/release.yml/badge.svg)](https://github.com/dobermanch/inventra/actions/workflows/release.yml) [![License: MIT](https://img.shields.io/github/license/dobermanch/inventra)](LICENSE)


A lightweight, self-hosted inventory and business management app.

## Overview

Inventra is a full-stack web application for managing a small business. It runs as a single Node.js process that serves both the REST API and the React frontend.

**Features**

- **Dashboard** — sales trends, active/shipped orders, low-stock alerts, recent expenses
- **Inventory** — products with variants (sizes), stock tracking, restock history, image uploads
- **Orders** — create and manage orders, automatic stock adjustment on status changes
- **Expenses** — log expenses with categories and attach invoice files
- **Sales** — revenue analytics and reporting
- **Settings** — language and currency preferences
- **AI assistant** — powered by the Gemini API

**Stack:** React 19 · TypeScript · MUI · Vite · Express · SQLite (`better-sqlite3`)

---

## Run Locally

**Prerequisites:** Node.js 22+

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server (Vite HMR + Express API):

   ```bash
   npm run dev
   ```

   The app is available at `http://localhost:3000`.

### Other scripts

| Command         | Description                       |
| --------------- | --------------------------------- |
| `npm run build` | Build the frontend for production |
| `npm run lint`  | Type-check with TypeScript        |
| `npm run clean` | Delete the `dist/` folder         |

### Data

All persistent data lives in the `data/` directory (SQLite database + uploaded files). It is created automatically on first run and is excluded from version control.

---

## Docker

### Build the image

```bash
docker build -t inventra .
```

To embed a specific version string in the UI (shown in the sidebar):

```bash
docker build --build-arg APP_VERSION=1.2.0 -t inventra:1.2.0 .
```

If `APP_VERSION` is omitted, the version from `package.json` is used.

### Run a container

```bash
docker run -d \
  --name inventra \
  -p 3000:3000 \
  -v inventra_data:/app/data \
  inventra
```

| Option                       | Purpose                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| `-v inventra_data:/app/data` | Persist the database and uploaded files across restarts        |
| `-p 3000:3000`               | Map host port → container port (change the left side to remap) |

### Behind a reverse proxy (nginx, Caddy, Traefik, …)

Set `TRUST_PROXY` so Express correctly reads `X-Forwarded-For` and `X-Forwarded-Proto` headers:

```bash
docker run -d \
  --name inventra \
  -p 127.0.0.1:3000:3000 \
  -v inventra_data:/app/data \
  -e TRUST_PROXY=1 \
  ghcr.io/dobermanch/inventra
```

Accepted values for `TRUST_PROXY` follow the [Express trust proxy](https://expressjs.com/en/guide/behind-proxies.html) options: `1`, `loopback`, `linklocal`, `uniquelocal`, or a specific IP/CIDR.

### Docker Compose example

```yaml
services:
  inventra:
    image: ghcr.io/dobermanch/inventra:latest
    build:
      context: .
      args:
        APP_VERSION: "1.2.0"
    ports:
      - "3000:3000"
    environment:
      TRUST_PROXY: "1"
    volumes:
      - inventra_data:/app/data
    restart: unless-stopped

volumes:
  inventra_data:
```

---

## License

[MIT](LICENSE)
