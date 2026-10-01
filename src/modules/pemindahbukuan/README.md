# Pemindahbukuan

Base URL: `/api/v1/pemindahbukuan`. Semua endpoint memerlukan login.

| Method | Path | Fungsi |
| --- | --- | --- |
| GET | `/` | Daftar transaksi dalam cakupan akses pengguna |
| POST | `/` | Membuat pengajuan pending |
| DELETE | `/` | Membatalkan batch pengajuan pending |
| PATCH | `/:id/approve` | Admin menyetujui dan membukukan transaksi |
| PATCH | `/:id/reject` | Admin menolak pengajuan |

## Pengajuan

Tabungan ke tabungan:

```json
{
  "tipePemindahbukuan": "tabungan_ke_tabungan",
  "idUserTujuan": 123,
  "nominal": 100000,
  "keterangan": "Pemindahan tabungan"
}
```

Saham ke saham memakai `jumlahSaham`. Konversi tabungan ke saham juga memakai jumlah lembar, tetapi sumber dan tujuan harus anggota yang sama:

```json
{
  "tipePemindahbukuan": "tabungan_ke_saham",
  "idUserSumber": 123,
  "idUserTujuan": 123,
  "jumlahSaham": 2
}
```

- `idUserSumber` opsional, default pengguna login. PJ dapat mengajukan untuk anggota dalam cakupan akses kelompoknya; admin dapat mengajukan untuk anggota mana pun.
- Sumber dan tujuan wajib memiliki nomor anggota. Untuk transfer sejenis, tujuan boleh dari kelompok lain.
- Transfer sejenis harus ke anggota berbeda. Konversi tabungan ke saham hanya untuk anggota yang sama, termasuk pengajuan oleh PJ/admin atas nama anggota.
- Nominal dan jumlah lembar harus bilangan bulat positif dalam batas integer PostgreSQL.
- Akun ditentukan backend: tabungan memakai akun 12, saham memakai akun 19. Akun kas/bank tidak terlibat.
- Konversi menggunakan harga jual master saham saat pengajuan; harga disimpan untuk approval. Nilai nominal saham adalah Rp50.000/lembar, dengan selisih dibukukan ke agio (akun 50).
- Transfer saham memindahkan lembar tanpa jual/beli; nilai referensinya Rp50.000/lembar.
- Tanggal otomatis hari pengajuan di Asia/Jakarta. Kode transaksi `PBK-YYYYMMDD-001` memakai urutan harian yang tidak dipakai ulang setelah pembatalan.

POST mengembalikan HTTP 201 dengan `{"message":"Success"}`.

## Saldo dan approval

Pengajuan selalu pending, termasuk pengajuan admin. Pending mencadangkan saldo tabungan atau lembar sumber. Penarikan pending dan pemindahbukuan pending menggunakan cadangan tabungan yang sama. Reject atau pembatalan melepas cadangan.

`GET /api/v1/simpanan/saldo` menyertakan:

- `totalPenarikanPending`: nominal penarikan tabungan pending.
- `totalPemindahbukuanPending`: nominal pemindahbukuan yang menggunakan tabungan sumber.
- `saldoEfektif`: saldo tabungan dikurangi kedua cadangan di atas.
- `totalSahamPending`: lembar saham yang dicadangkan transfer saham pending.
- `jumlahSahamEfektif`: jumlah saham dikurangi cadangan tersebut.

Approval memindahkan saldo/lembar dan membuat satu jurnal dalam transaksi database yang sama. Saldo sumber dan tujuan dikunci berurutan untuk menangani permintaan bersamaan. Admin boleh menyetujui pengajuannya sendiri. Jurnal otomatis dilindungi dari penghapusan lewat modul jurnal.

Transfer sejenis mendebit akun sumber dan mengkredit akun tujuan, meskipun akun buku besarnya sama. `userId` wajib pada setiap detail jurnal: baris debit memakai anggota sumber dan baris kredit memakai anggota tujuan. Konversi mendebit tabungan, mengkredit nilai nominal saham, dan mencatat selisih ke agio; semua detail memakai anggota yang sama. `jurnalId` tersedia pada riwayat pemindahbukuan. Riwayat transaksi ada di modul ini.

Endpoint daftar dan detail jurnal menampilkan `userId` dan `userName` sesuai masing-masing baris detail. Identitas pembuat/pemroses pemindahbukuan tetap dicatat melalui `createdBy` dan `approvedBy` pada transaksi.

## Daftar dan pembatalan

GET menerima `page` (default 1), `limit` (default 10, maksimum 100), `search` (kode transaksi), `userId`, `status` (`all`, `pending`, `approved`, `rejected`), dan `tipePemindahbukuan` (`all` atau salah satu tipe).

Respons berbentuk `{"total":0,"data":[]}`. Admin melihat semua transaksi. PJ dan anggota melihat transaksi bila sumber atau tujuan berada dalam cakupan akses mereka. `userId` memfilter sumber atau tujuan dan harus berada dalam cakupan akses pengguna. Data menyertakan nama anggota, akun, pembuat, dan pemroses.

DELETE menerima `{"ids":[1,2]}`. Hanya pemilik sumber atau pembuat yang masih punya akses ke sumber dapat membatalkan pending. Jika satu ID tidak valid, seluruh batch dibatalkan.

Reject menerima `{"alasanPenolakan":"Alasan penolakan"}`; alasan tidak boleh kosong. Approved dan rejected tidak dapat diedit, dihapus, atau diproses ulang.

## Schema dan pengujian

Schema menambahkan `hargaNominalPerSaham`, `agioSaham`, dan `jurnalId` pada tabel `pemindahbukuan`, serta memindahkan `userId` dari header jurnal ke detail. Untuk database yang sudah memiliki tabel jurnal, jalankan migrasi data terlebih dahulu:

```sh
bun run db:migrate:jurnal-user
bun run db:push
```

Database baru cukup menjalankan `bun run db:push`. Migrasi mengisi pemilik detail dari header lama dan relasi pemindahbukuan sebelum menerapkan NOT NULL dan menghapus kolom pengguna di header.

Pengujian integrasi memakai PostgreSQL, membuat schema terisolasi dari definisi Drizzle, lalu menghapus schema tersebut setelah selesai:

```sh
TEST_DATABASE_URL=postgres://user:password@localhost:5432/test_db bun test tests/pemindahbukuan.integration.test.ts
```

Tanpa `TEST_DATABASE_URL`, pengujian integrasi dilewati. Jalankan type-check dengan `bun run check` dan lint dengan `bunx eslint .`.
