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
[`src/modules/jurnal/README.md`](src/modules/jurnal/README.md) for the API shape.

The `transaction_code_counter` table keeps daily simpanan and journal sequences so
deleting a transaction does not reuse its code. Counters are initialized from
existing transaction codes when first accessed.
