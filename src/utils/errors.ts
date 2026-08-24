import { Data } from "effect";

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly error: unknown;
}> {}

export class ItemNotFoundError extends Data.TaggedError("ItemNotFoundError")<{
  readonly id: number;
}> {}

export class ItemsNotFoundError extends Data.TaggedError("ItemsNotFoundError")<{
  readonly ids: number[];
}> {}

export class StorageError extends Data.TaggedError("StorageError")<{
  readonly error: unknown;
}> {}
