# Elysia with Bun runtime

## Getting Started

To get started with this template, simply paste this command into your terminal:

```bash
bun create elysia ./elysia-example
```

## Development

To start the development server run:

```bash
bun run dev
```

Open http://localhost:3000/ with your browser to see the result.

## Database

Set `DATABASE_URL`, then apply schema changes before starting the application:

```bash
bun run db:push
```

For an existing database with journal tables, migrate journal ownership from the
header to each detail before pushing the new schema:

```bash
bun run db:migrate:jurnal-user
bun run db:push
```

The migration runs in one transaction and preserves each detail's member using
the old journal header and linked pemindahbukuan source/destination. Every journal
detail requires `userId`; journal headers no longer contain it. See
[`src/modules/jurnal/README.md`](src/modules/jurnal/README.md) for the API shape.

The `transaction_code_counter` table keeps daily simpanan and journal sequences so
deleting a transaction does not reuse its code. Counters are initialized from
existing transaction codes when first accessed.
