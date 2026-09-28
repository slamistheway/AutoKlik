# AutoKlik — Setup Guide

This guide walks through setting up the project **after cloning the repository**. 

## Prerequisites

- Node.js and npm installed
- PostgreSQL 18 installed, with the `AutoKlik` database created
- Git

## 1. Clone the repository

```bash
git clone <https://github.com/slamistheway/AutoKlik.git>
cd AutoKlik
```

## 2. Configure environment variables

Rename the `.env.example` file into `.env` inside the `api` folder and update it with your own database credentials.

## 3. Install dependencies

From the project root (`cd AutoKlik`), install all dependencies (frontend, API, and root) with exact versions (no `^`, so no auto-updates):

```bash
npm install --save-exact
```

> If this doesn't cascade into the subfolders automatically, run it individually in `frontend/` and `api/` as well:
> ```bash
> cd autoklik && npm install --save-exact && cd ..
> cd api && npm install --save-exact && cd ..
> ```

## 4. Set up the database (Drizzle migrations)

```bash
cd api
npm run db:setup
```

This runs `drizzle-kit migrate` inside the API folder to apply the schema (`src/db/schema.ts`) to your database.

## 5. Ports & CORS

- Frontend (Next.js) runs on port **3000** by default.
- API (NestJS) is configured in `main.ts` to run on port **3001** and to accept requests from `http://localhost:3000` with credentials enabled.


## 6. Static files (images) from the API

The API serves its `public` folder statically via `ServeStaticModule`, already wired up in `app.module.ts`, so uploaded images are reachable directly from the API URL.

## 7. Run the project

From the project root, this starts both frontend and API together:

```bash
npm run dev
```

This runs:
- `npm run dev --prefix autoklik` (Next.js on port 3000)
- `npm run start:dev --prefix API` (NestJS on port 3001)

## 8. Verify

- Open `http://localhost:3000` for the frontend.
- API should be reachable at `http://localhost:3001`.

## Notes

- All new npm packages should be installed with `npm install --save-exact <package>` to avoid the `^` auto-update prefix.
- Dev-only dependencies should be installed with `npm install <package> --save-dev --save-exact`.
