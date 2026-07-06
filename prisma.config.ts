import { defineConfig } from 'prisma/config';

// Prisma 7 moves the datasource URL out of schema.prisma and into this file.
// The pg adapter is passed to PrismaClient at construction time (infrastructure layer).
// process.env is used directly so that `prisma validate` works without DATABASE_URL set
// (validate checks schema syntax only — it never opens a connection).
// See: https://pris.ly/d/config-datasource
export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
