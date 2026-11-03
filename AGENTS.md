# Agent Instructions

## Route Services

- Keep route operations inside the exported service object in `src/routes/**/service.ts`.
- Put reusable helper functions in the route's `utils.ts`, rather than declaring standalone helpers in `service.ts`.
- Inline logic used at only one call site in its service method instead of extracting a helper function.

## Testing

- Don't create test files (no `*.test.*`, `*.spec.*`, `test_*.py`, `tests/` directories, etc.) and don't add them to the repo.
- You may still verify your own work: run existing tests, execute the code, use one-off commands or inline scripts in the shell, and check results manually.
- If you need a throwaway script to check something, run it inline or delete it immediately afterward. Never leave it behind.

## Documentation

- Don't create `README.md` or any other documentation files (`*.md`, `docs/`, etc.) on your own initiative.
- This applies everywhere: backend modules, frontend features, folders, and sub-packages. Don't add a README to a module or feature to describe or document it.
- Only create or edit documentation files when explicitly asked.
- Explain your work in your reply instead of writing it into a file.
