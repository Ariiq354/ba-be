import { db } from "#/database";
import { user } from "#/database/schema/auth";
import { files } from "#/database/schema/files";
import { kelompok, kelompokPenanggungJawab } from "#/database/schema/kelompok";
import { userProfile } from "#/database/schema/users";
import { DatabaseError, ItemNotFoundError } from "#/utils/errors";
import { deleteFiles } from "#/utils/file";
import { isPendingVerificationBanReason, PENDING_VERIFICATION_BAN_REASONS } from "#/utils/auth";
import { isUniqueViolation } from "#/utils/pgcode";
import { and, desc, eq, ilike, inArray, isNull, like, or, sql } from "drizzle-orm";
import { Effect } from "effect";
import {
  AdminCannotBePjError,
  DuplicateNikError,
  InvalidProfileImageError,
  KelompokNotFoundError,
  PenggunaAlreadyVerifiedError,
  PenggunaBannedError,
  PenggunaNotPendingVerificationError,
  PenggunaUnverifiedError,
  ProfileImageRequiredError,
} from "./errors";
import type { PenggunaModel } from "./model";

type ProfileUpdate = PenggunaModel["updateProfileSchema"];

function getMembershipPeriod(date: Date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = String(date.getUTCFullYear()).slice(-2);
  return `${month}${year}`;
}

export const PenggunaService = {
  getProfile: Effect.fn("PenggunaService.getProfile")(function* (penggunaId: number) {
    const profile = yield* Effect.tryPromise({
      try: async () => {
        const [result] = await db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            noAnggota: userProfile.noAnggota,
            noHp: userProfile.noHp,
            nik: userProfile.nik,
            namaBank: userProfile.namaBank,
            noRekening: userProfile.noRekening,
            pemilikRekening: userProfile.pemilikRekening,
            jalan: userProfile.jalan,
            idProvinsi: userProfile.idProvinsi,
            idKabupatenKota: userProfile.idKota,
            idKecamatan: userProfile.idKecamatan,
            idDesaKelurahan: userProfile.idKelurahan,
          })
          .from(user)
          .leftJoin(userProfile, eq(userProfile.idUser, user.id))
          .where(eq(user.id, penggunaId));

        return result;
      },
      catch: (error) => new DatabaseError({ error }),
    });

    if (!profile) {
      return yield* new ItemNotFoundError({ id: penggunaId });
    }

    return profile;
  }),

  updateProfile: Effect.fn("PenggunaService.updateProfile")(function* (
    penggunaId: number,
    data: ProfileUpdate,
  ) {
    const imageAction = data.imageAction ?? "keep";
    if (imageAction === "update" && !data.image) {
      return yield* new ProfileImageRequiredError();
    }

    const result = yield* Effect.tryPromise({
      try: async () => {
        return await db.transaction(async (tx) => {
          const [targetPengguna] = await tx
            .select({ image: user.image })
            .from(user)
            .where(eq(user.id, penggunaId))
            .for("update");

          if (!targetPengguna) {
            return { type: "not-found" as const };
          }

          const penggunaData: { name?: string; image?: string | null } = {};
          if (data.name !== undefined) {
            penggunaData.name = data.name;
          }

          let oldImageToDelete: string | null = null;

          if (imageAction === "remove") {
            penggunaData.image = null;
            oldImageToDelete = targetPengguna.image;
          } else if (imageAction === "update") {
            const [pendingImage] = await tx
              .select({ publicId: files.publicId })
              .from(files)
              .where(
                and(
                  eq(files.publicId, data.image!),
                  eq(files.status, "pending"),
                  like(files.publicId, "avatar/%"),
                ),
              )
              .for("update");

            if (!pendingImage) {
              return { type: "invalid-image" as const };
            }

            await tx
              .update(files)
              .set({ status: "success" })
              .where(eq(files.publicId, pendingImage.publicId));

            penggunaData.image = pendingImage.publicId;
            if (targetPengguna.image && targetPengguna.image !== pendingImage.publicId) {
              oldImageToDelete = targetPengguna.image;
            }
          }

          if (Object.keys(penggunaData).length > 0) {
            await tx.update(user).set(penggunaData).where(eq(user.id, penggunaId));
          }

          const profileData: Partial<typeof userProfile.$inferInsert> = {};
          if (data.noHp !== undefined) {
            profileData.noHp = data.noHp;
          }
          if (data.nik !== undefined) {
            profileData.nik = data.nik;
          }
          if (data.namaBank !== undefined) {
            profileData.namaBank = data.namaBank;
          }
          if (data.noRekening !== undefined) {
            profileData.noRekening = data.noRekening;
          }
          if (data.pemilikRekening !== undefined) {
            profileData.pemilikRekening = data.pemilikRekening;
          }
          if (data.jalan !== undefined) {
            profileData.jalan = data.jalan;
          }
          if (data.idProvinsi !== undefined) {
            profileData.idProvinsi = data.idProvinsi;
          }
          if (data.idKabupatenKota !== undefined) {
            profileData.idKota = data.idKabupatenKota;
          }
          if (data.idKecamatan !== undefined) {
            profileData.idKecamatan = data.idKecamatan;
          }
          if (data.idDesaKelurahan !== undefined) {
            profileData.idKelurahan = data.idDesaKelurahan;
          }

          if (Object.keys(profileData).length > 0) {
            await tx
              .insert(userProfile)
              .values({ idUser: penggunaId, ...profileData })
              .onConflictDoUpdate({
                target: userProfile.idUser,
                set: profileData,
              });
          }

          if (oldImageToDelete) {
            await tx.delete(files).where(eq(files.publicId, oldImageToDelete));
          }

          return { type: "success" as const, oldImageToDelete };
        });
      },
      catch: (error) => {
        if (typeof data.nik === "string" && isUniqueViolation(error)) {
          return new DuplicateNikError({ nik: data.nik });
        }
        return new DatabaseError({ error });
      },
    });

    if (result.type === "not-found") {
      return yield* new ItemNotFoundError({ id: penggunaId });
    }

    if (result.type === "invalid-image") {
      return yield* new InvalidProfileImageError();
    }

    if (result.oldImageToDelete) {
      yield* deleteFiles([result.oldImageToDelete]).pipe(
        Effect.catchTag("StorageError", (err) =>
          Effect.logError(`Gagal menghapus avatar lama '${result.oldImageToDelete}':`, err.error),
        ),
      );
    }
  }),

  getPaginatedPengguna: Effect.fn("PenggunaService.getPaginatedPengguna")(function* (
    query: PenggunaModel["getPenggunaQuerySchema"],
  ) {
    return yield* Effect.tryPromise({
      try: async () => {
        const conditions = [];

        if (query.status === "pending") {
          conditions.push(
            and(
              eq(user.banned, true),
              inArray(user.banReason, [...PENDING_VERIFICATION_BAN_REASONS]),
            ),
          );
        } else if (query.status === "verified") {
          conditions.push(or(eq(user.banned, false), isNull(user.banned)));
        }

        if (query.search) {
          const searchPattern = `%${query.search}%`;
          conditions.push(
            or(
              ilike(user.name, searchPattern),
              ilike(user.email, searchPattern),
              ilike(userProfile.noAnggota, searchPattern),
            ),
          );
        }

        const qb = db
          .select({
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
            banned: user.banned,
            banReason: user.banReason,
            idKelompok: user.idKelompok,
            namaKelompok: kelompok.namaKelompok,
            kodeKelompok: kelompok.kodeKelompok,
            noAnggota: userProfile.noAnggota,
            createdAt: user.createdAt,
          })
          .from(user)
          .leftJoin(userProfile, eq(userProfile.idUser, user.id))
          .innerJoin(kelompok, eq(kelompok.id, user.idKelompok))
          .where(and(...conditions))
          .orderBy(desc(user.createdAt), desc(user.id));

        const offset = (query.page - 1) * query.limit;
        const total = await db.$count(qb);
        const rows = await qb.limit(query.limit).offset(offset);
        const data = rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
        }));

        return { total, data };
      },
      catch: (error) => new DatabaseError({ error }),
    });
  }),

  verifyPengguna: Effect.fn("PenggunaService.verifyPengguna")(function* (penggunaId: number) {
    const result = yield* Effect.tryPromise({
      try: async () => {
        return await db.transaction(async (tx) => {
          const [targetPengguna] = await tx
            .select({
              banned: user.banned,
              banReason: user.banReason,
              idKelompok: user.idKelompok,
            })
            .from(user)
            .where(eq(user.id, penggunaId))
            .for("update");

          if (!targetPengguna) {
            return { type: "not-found" as const };
          }

          if (targetPengguna.banned !== true) {
            return { type: "already-verified" as const };
          }

          if (!isPendingVerificationBanReason(targetPengguna.banReason)) {
            return { type: "not-pending-verification" as const };
          }

          const period = getMembershipPeriod(new Date());
          const lockKey = `nomor-anggota:${targetPengguna.idKelompok}:${period}`;
          await tx.execute(sql`
            select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))
          `);

          const [targetKelompok] = await tx
            .select({ kodeKelompok: kelompok.kodeKelompok })
            .from(kelompok)
            .where(eq(kelompok.id, targetPengguna.idKelompok));

          if (!targetKelompok) {
            return {
              type: "kelompok-not-found" as const,
              idKelompok: targetPengguna.idKelompok,
            };
          }

          const prefix = `${targetKelompok.kodeKelompok}-${period}-`;
          const existingNumbers = await tx
            .select({ noAnggota: userProfile.noAnggota })
            .from(userProfile)
            .where(sql`left(${userProfile.noAnggota}, ${prefix.length}) = ${prefix}`);

          const maxSequence = existingNumbers.reduce((max, item) => {
            const segments = item.noAnggota?.split("-") ?? [];
            const lastSegment = segments[segments.length - 1] ?? "";
            const sequence = /^\d+$/.test(lastSegment) ? Number(lastSegment) : Number.NaN;
            return Number.isNaN(sequence) ? max : Math.max(max, sequence);
          }, 0);
          const noAnggota = `${prefix}${String(maxSequence + 1).padStart(4, "0")}`;

          await tx
            .update(user)
            .set({
              banned: false,
              banReason: null,
              banExpires: null,
            })
            .where(eq(user.id, penggunaId));

          await tx
            .insert(userProfile)
            .values({ idUser: penggunaId, noAnggota })
            .onConflictDoUpdate({
              target: userProfile.idUser,
              set: { noAnggota },
            });

          return { type: "success" as const, noAnggota };
        });
      },
      catch: (error) => new DatabaseError({ error }),
    });

    switch (result.type) {
      case "not-found":
        return yield* new ItemNotFoundError({ id: penggunaId });
      case "already-verified":
        return yield* new PenggunaAlreadyVerifiedError({ penggunaId });
      case "not-pending-verification":
        return yield* new PenggunaNotPendingVerificationError({ penggunaId });
      case "kelompok-not-found":
        return yield* new KelompokNotFoundError({ idKelompok: result.idKelompok });
      case "success":
        return { noAnggota: result.noAnggota };
    }
  }),

  setPenggunaPj: Effect.fn("PenggunaService.setPenggunaPj")(function* (
    penggunaId: number,
    isPj: boolean,
  ) {
    const result = yield* Effect.tryPromise({
      try: async () => {
        return await db.transaction(async (tx) => {
          const [targetPengguna] = await tx
            .select({
              role: user.role,
              banned: user.banned,
              banReason: user.banReason,
              idKelompok: user.idKelompok,
            })
            .from(user)
            .where(eq(user.id, penggunaId))
            .for("update");

          if (!targetPengguna) {
            return { type: "not-found" as const };
          }

          if (targetPengguna.role === "admin") {
            return { type: "admin" as const };
          }

          if (targetPengguna.banned) {
            return {
              type: isPendingVerificationBanReason(targetPengguna.banReason)
                ? ("unverified" as const)
                : ("banned" as const),
            };
          }

          const [profile] = await tx
            .select({ noAnggota: userProfile.noAnggota })
            .from(userProfile)
            .where(eq(userProfile.idUser, penggunaId));

          if (!profile?.noAnggota) {
            return { type: "unverified" as const };
          }

          if (isPj) {
            await tx.update(user).set({ role: "pj" }).where(eq(user.id, penggunaId));
            await tx
              .insert(kelompokPenanggungJawab)
              .values({
                kelompokId: targetPengguna.idKelompok,
                userId: penggunaId,
              })
              .onConflictDoNothing();
          } else {
            await tx.update(user).set({ role: "user" }).where(eq(user.id, penggunaId));
            await tx
              .delete(kelompokPenanggungJawab)
              .where(
                and(
                  eq(kelompokPenanggungJawab.kelompokId, targetPengguna.idKelompok),
                  eq(kelompokPenanggungJawab.userId, penggunaId),
                ),
              );
          }

          return { type: "success" as const };
        });
      },
      catch: (error) => new DatabaseError({ error }),
    });

    switch (result.type) {
      case "not-found":
        return yield* new ItemNotFoundError({ id: penggunaId });
      case "admin":
        return yield* new AdminCannotBePjError({ penggunaId });
      case "unverified":
        return yield* new PenggunaUnverifiedError({ penggunaId });
      case "banned":
        return yield* new PenggunaBannedError({ penggunaId });
      case "success":
        return;
    }
  }),
};
