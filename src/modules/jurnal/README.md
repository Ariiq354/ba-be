# Jurnal

Base URL: `/api/v1/jurnal`. Semua endpoint memerlukan admin.

## Pengguna pada detail

`jurnal_detail.user_id` wajib (NOT NULL), merujuk pengguna yang bersangkutan pada baris tersebut. Header jurnal menyimpan kode, tanggal, keterangan, dan waktu pembuatan.

| Asal jurnal | Pengguna pada detail |
| --- | --- |
| Setoran/penarikan tabungan | Semua baris kas/bank dan simpanan memakai anggota pemilik simpanan |
| Setoran saham | Kas/bank, modal saham, dan agio memakai anggota pemilik saham |
| Tabungan ke tabungan | Debit memakai sumber; kredit memakai tujuan |
| Saham ke saham | Debit memakai sumber; kredit memakai tujuan |
| Tabungan ke saham | Tabungan, modal saham, dan agio memakai anggota yang sama |
| Jurnal manual | Semua detail memakai pengguna yang login |

PJ/admin yang mengajukan simpanan untuk anggota lain tidak menjadi pemilik baris jurnal. Pembuat dan pemroses transaksi simpanan/pemindahbukuan tersedia melalui `createdBy` dan `approvedBy` pada transaksi terkait.

## Respons

`GET /` mengembalikan `total` jumlah header jurnal dan `data` berbentuk baris detail. Pagination dilakukan pada header; satu jurnal menghasilkan beberapa baris. Setiap baris menyertakan `userId` dan `userName` dari detailnya.

`GET /:id` mengembalikan satu header dengan `details`. `userId` dan `userName` berada pada tiap detail, bukan pada header:

```json
{
  "id": 10,
  "kodeTransaksi": "TRX-20261001-001",
  "tanggalTransaksi": "2026-10-01",
  "keterangan": "Pemindahbukuan tabungan",
  "createdAt": "2026-10-01T03:00:00.000Z",
  "details": [
    {
      "id": 20,
      "jurnalId": 10,
      "akunId": 12,
      "kodeAkun": "TAB",
      "namaAkun": "Simpanan Berjangka",
      "userId": 2,
      "userName": "Budi",
      "debit": 100000,
      "kredit": 0
    },
    {
      "id": 21,
      "jurnalId": 10,
      "akunId": 12,
      "kodeAkun": "TAB",
      "namaAkun": "Simpanan Berjangka",
      "userId": 3,
      "userName": "Siti",
      "debit": 0,
      "kredit": 100000
    }
  ]
}
```

## Jurnal manual

`POST /` menerima tanggal, keterangan opsional, dan detail akun/debit/kredit. Backend mengisi `userId` pengguna login pada semua detail. Contoh:

```json
{
  "tanggalTransaksi": "2026-10-01",
  "keterangan": "Pencatatan manual",
  "details": [
    { "akunId": 1, "debit": 100000, "kredit": 0 },
    { "akunId": 12, "debit": 0, "kredit": 100000 }
  ]
}
```

`DELETE /` menerima `{"ids":[1,2]}`. Jurnal otomatis yang terhubung dengan simpanan atau pemindahbukuan tidak dapat dihapus melalui endpoint ini.

## Migrasi database lama

Dengan `DATABASE_URL` terisi, jalankan sebelum memakai schema baru:

```sh
bun run db:migrate:jurnal-user
bun run db:push
```

Script migrasi membaca `src/database/migrations/20261001_move_jurnal_user_to_detail.sql` dan menjalankannya dalam satu transaksi. Detail jurnal biasa diisi dari pengguna header lama. Detail pemindahbukuan dipetakan ke sumber/tujuan, termasuk transaksi historis konversi antaranggota. Setelah pengisian, migrasi menerapkan NOT NULL, foreign key, dan index, lalu menghapus `user_id` dari header. Script dapat dijalankan ulang.

Untuk database baru tanpa tabel jurnal, langsung gunakan `bun run db:push`.
