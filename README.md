# Invet Backend

Backend service untuk **Invet** — platform undangan digital/online yang memungkinkan pengguna memesan dan mengelola undangan secara online.

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: NestJS
- **ORM**: Prisma 7
- **Database**: PostgreSQL 16
- **Cache / Session Store**: Redis 8
- **Language**: TypeScript

---

## Features

- Authentication
  - Register
  - Login — access token (Bearer) + refresh token (HttpOnly Cookie)
  - Logout — blacklist access token & hapus refresh token dari Redis
  - Refresh token — renew access token

---

## Project Structure

```
src/
├── auth/               # Auth module (register, login, logout, refresh)
├── common/             # Shared providers
│   ├── decorators/     # Custom decorators (@CurrentUser, @AccessToken)
│   ├── guards/         # Auth guard
│   ├── prisma.service.ts
│   ├── redis.service.ts
│   ├── token.service.ts
│   └── validation.service.ts
├── model/              # Request & Response types
├── generated/          # Prisma generated client
└── main.ts
test/
├── auth.spec.ts
├── test.module.ts
└── test.service.ts
prisma/
├── schema.prisma
└── migrations/
```

---

## API Documentation

Swagger UI tersedia saat aplikasi berjalan:

| URL | Keterangan |
|---|---|
| `http://localhost:3000/api/docs` | Swagger UI |
| `http://localhost:3000/api/docs-json` | Swagger JSON spec |

---

## Environment Variables

Salin `.env.example` sesuai environment yang dibutuhkan:

| File | Kegunaan |
|---|---|
| `.env` | Production |
| `.env.development.local` | Development local (tanpa Docker) |
| `.env.development.docker` | Development dengan Docker |
| `.env.test.local` | Testing |

Lihat `.env.example` untuk daftar lengkap variabel yang dibutuhkan. Variabel utama:

```env
NODE_ENV=development
APP_PORT=3000

DATABASE_URL=postgresql://user:password@localhost:5432/invet
DB_HOST=localhost
DB_USER=postgres
DB_PORT=5432
DB_PASSWORD=
DB_NAME=invet

JWT_ACCESS_SECRET=your_access_secret
JWT_ACCESS_EXPIRE=1h
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRE=7d

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

> Untuk environment Docker, ganti `DB_HOST` dan `REDIS_HOST` dengan nama service di docker compose (`postgres`, `redis`).

---

## Getting Started

### Prerequisites

- Node.js >= 20
- npm >= 10
- Docker & Docker Compose (untuk run dengan Docker)
- PostgreSQL 16 (jika run local tanpa Docker)
- Redis 8 (jika run local tanpa Docker)

### Installation

```bash
# Clone repository
git clone https://github.com/Tooomat/invet-backend.git
cd invet-backend

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate:dev
```

---

## Running Locally (tanpa Docker)

### 1. Setup environment

```bash
cp .env.example .env.development.local
# Edit .env.development.local sesuai konfigurasi local
```

### 2. Jalankan migrasi database

```bash
npm run prisma:migrate:dev
```

### 3. (Opsional) Jalankan seeder

```bash
npm run prisma:seed:dev
```

### 4. Jalankan aplikasi

```bash
npm run start:dev
```

Aplikasi berjalan di `http://localhost:3000`

---

## Running with Docker

### 1. Setup environment

```bash
cp .env.example .env.development.docker
# Edit .env.development.docker
# Pastikan DB_HOST=postgres dan REDIS_HOST=redis
```

### 2. Jalankan semua service

```bash
npm run start:dev:docker:up
```

### 3. Jalankan migrasi

```bash
npm run prisma:migrate:dev:docker
```

### 4. (Opsional) Jalankan seeder

```bash
npm run prisma:seed:dev:docker
```

### Docker Commands

| Command | Deskripsi |
|---|---|
| `npm run start:dev:docker:up` | Build & jalankan semua container |
| `npm run start:dev:docker:start` | Start container yang sudah ada |
| `npm run start:dev:docker:stop` | Stop container (data tetap ada) |
| `npm run start:dev:docker:down` | Hapus container |
| `npm run start:dev:docker:down:volume` | Hapus container + volume (data hilang) |

---

## Prisma Commands

| Command | Deskripsi |
|---|---|
| `npm run prisma:generate:dev` | Generate Prisma client (local) |
| `npm run prisma:generate:dev:docker` | Generate Prisma client (Docker) |
| `npm run prisma:migrate:dev` | Jalankan migrasi development (local) |
| `npm run prisma:migrate:dev:docker` | Jalankan migrasi development (Docker) |
| `npm run prisma:migrate:test` | Jalankan migrasi test |
| `npm run prisma:migrate:prod` | Jalankan migrasi production |
| `npm run prisma:seed:dev` | Jalankan seeder development (local) |
| `npm run prisma:seed:dev:docker` | Jalankan seeder development (Docker) |
| `npm run prisma:studio:dev` | Buka Prisma Studio (local) |
| `npm run prisma:studio:test` | Buka Prisma Studio test (port 5556) |

---

## Testing

### 1. Setup environment test

```bash
cp .env.example .env.test.local
# Edit .env.test.local
# Gunakan database dan Redis yang BERBEDA dari development
# Contoh: DB_NAME=invet_test
```

### 2. Jalankan migrasi test

```bash
npm run prisma:migrate:test
```

### 3. Jalankan test

```bash
# Run semua test
npm run test

# Run file test tertentu
npm run test -- test/auth.spec.ts

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov
```

> Pastikan PostgreSQL dan Redis untuk environment test sudah berjalan sebelum menjalankan test.

---

## Deployment (Production)

### 1. Setup environment

```bash
cp .env.example .env
# Edit .env untuk konfigurasi production
# Pastikan NODE_ENV=production
# Pastikan SECURE_COOKIES=true
```

### 2. Deploy dengan Docker

```bash
docker compose -f docker-compose.prod.yml up -d --build

# Jalankan migrasi production
npm run prisma:migrate:prod
```

### 3. Deploy script

Simpan file berikut di server sebagai `deploy.sh` untuk mempermudah proses deploy:

```bash
#!/bin/bash
set -e

echo "Pulling latest changes..."
git pull origin main

echo "Building and restarting containers..."
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build

echo "Running migrations..."
npm run prisma:migrate:prod

echo "Deploy successful!"
```

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## All Scripts

| Script | Deskripsi |
|---|---|
| `npm run build` | Build project |
| `npm run format` | Format kode dengan Prettier |
| `npm run lint` | Jalankan ESLint & auto-fix |
| `npm run start:dev` | Development mode dengan hot reload |
| `npm run start:debug` | Debug mode dengan hot reload |
| `npm run start:prod` | Jalankan production build |
| `npm run test` | Run semua test |
| `npm run test:watch` | Run test watch mode |
| `npm run test:cov` | Run test dengan coverage |

---

## License

UNLICENSED