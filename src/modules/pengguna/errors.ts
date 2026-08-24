import { Data } from "effect";

export class PenggunaAlreadyVerifiedError extends Data.TaggedError("PenggunaAlreadyVerifiedError")<{
  readonly penggunaId: number;
}> {}

export class PenggunaNotPendingVerificationError extends Data.TaggedError(
  "PenggunaNotPendingVerificationError",
)<{
  readonly penggunaId: number;
}> {}

export class PenggunaUnverifiedError extends Data.TaggedError("PenggunaUnverifiedError")<{
  readonly penggunaId: number;
}> {}

export class PenggunaBannedError extends Data.TaggedError("PenggunaBannedError")<{
  readonly penggunaId: number;
}> {}

export class AdminCannotBePjError extends Data.TaggedError("AdminCannotBePjError")<{
  readonly penggunaId: number;
}> {}

export class ProfileImageRequiredError extends Data.TaggedError("ProfileImageRequiredError") {}

export class InvalidProfileImageError extends Data.TaggedError("InvalidProfileImageError") {}

export class KelompokNotFoundError extends Data.TaggedError("KelompokNotFoundError")<{
  readonly idKelompok: number;
}> {}

export class DuplicateNikError extends Data.TaggedError("DuplicateNikError")<{
  readonly nik: string;
}> {}
