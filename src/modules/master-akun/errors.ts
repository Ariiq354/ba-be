import { Data } from "effect";

export class DuplicateKodeAkunError extends Data.TaggedError("DuplicateKodeAkunError")<{
  readonly kodeAkun: string;
}> {}
