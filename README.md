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

The `transaction_code_counter` table keeps daily simpanan and journal sequences so
deleting a transaction does not reuse its code. Counters are initialized from
existing transaction codes when first accessed.
