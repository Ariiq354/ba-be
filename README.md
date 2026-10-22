# Berkah Amanah Backend

## Getting Started

Install dependencies:

```bash
bun install
```

## Development

To start the development server run:

```bash
bun run dev
```

Open http://localhost:3000/ with your browser to see the result.

## Structure

The application uses Bun and Elysia 2 RC, with matching CORS, cron, and OpenAPI plugins.

- `src/app.ts`: application composition and exported `App` type, without opening a port.
- `src/index.ts`: HTTP server entry point.
- `src/routes/`: API routes, request/response models, and business services.
- `src/libs/`: shared helpers, authentication, configuration, and database schema.
- `src/plugins/`: authentication macros, CORS, and OpenAPI documentation.

Business endpoints remain under `/api/v1`, Better Auth under `/api/auth`, and
documentation under `/api/docs`. Database tables are unchanged by this migration.

```bash
bun test              # Routing, auth, validation, CORS, and documentation regression tests
```

## Code quality

```bash
bun run lint          # Check code with Oxlint
bun run format        # Format with Oxfmt
bun run check         # Type-check with TypeScript 7
```

Oxlint keeps the native rules supported from the previous Antfu ESLint preset.
Unsupported plugin rules are omitted; formatting and import sorting are handled
by Oxfmt. Native equivalents also cover supported `e18e` preferences such as
`Object.hasOwn`, `Date.now`, array `some`, and regex `test`. Unused variables,
console usage, and type-definition style are warnings.
Explicit `any` and non-null assertions remain allowed, as in the previous preset.
Type-aware linting is not enabled; `bun run check` handles type checking separately.

Install the **Oxc** extension in VS Code or Zed for formatting and lint fixes on
save. VS Code recommends the extension through `.vscode/extensions.json`.

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
[`src/routes/jurnal/README.md`](src/routes/jurnal/README.md) for the API shape.

The `transaction_code_counter` table keeps daily simpanan and journal sequences so
deleting a transaction does not reuse its code. Counters are initialized from
existing transaction codes when first accessed.
