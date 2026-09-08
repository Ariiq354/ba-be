---
status: accepted
---

# Fixed Account Identifiers

Accounting flows use the numeric `AkunId` enum as the fixed mapping from accounting roles to Akun IDs. No seed or startup validation is added.

## Considered Options

Runtime configuration, seed-managed mapping, and a database role-mapping table were rejected to keep the application aligned with the externally assigned numeric IDs without adding another mapping layer.

## Consequences

Operators must manually ensure the database IDs exist and retain the semantics represented by the enum.
