# BA Domain

Domain language used across the application.

## Language

**Akun**:
An accounting record identified by a kode Akun and classified by kategori and normal balance.
_Avoid_: User, login account

**Master Akun**:
The administrative menu for managing Akun records.
_Avoid_: Akun

**Harga Saham**:
A historical entry of a share's sale price. Each share has a fixed nominal price of Rp50,000, and the most recently recorded sale price is current.
_Avoid_: Saham

**Master Saham**:
The administrative menu for recording share sale prices and viewing their history.
_Avoid_: Harga Saham

**Margin**:
A financing term for a nominal range, consisting of an annual margin percentage, collateral status, and contract fee.

**Master Margin**:
The administrative menu for managing Margin records across nominal ranges.
_Avoid_: Margin

**Wilayah**:
Hierarchical administrative reference data consisting of Provinsi, Kabupaten/Kota, Kecamatan, and Desa/Kelurahan.
_Avoid_: Region

**Provinsi**:
The top-level administrative area in the Wilayah hierarchy.
_Avoid_: Province

**Kabupaten/Kota**:
The administrative level below a Provinsi and above a Kecamatan.
_Avoid_: Kota, when referring to both kabupaten and kota

**Kecamatan**:
The administrative level below a Kabupaten/Kota and above a Desa/Kelurahan.
_Avoid_: District

**Desa/Kelurahan**:
The administrative level below a Kecamatan.
_Avoid_: Kelurahan, when referring to both desa and kelurahan

**Pengguna**:
An identity that can access the application.
_Avoid_: User, Akun

**Anggota**:
A verified Pengguna identified by a membership number.
_Avoid_: Pengguna, when referring specifically to a verified member

**Simpanan**:
The holdings of an Anggota, represented by a Saldo Tabungan and a Jumlah Saham.
_Avoid_: Savings

**Saldo Tabungan**:
The stored monetary value of an Anggota's Tabungan.
_Avoid_: Saldo Efektif

**Saldo Efektif**:
The portion of an Anggota's Saldo Tabungan available after reserving all pending Penarikan, without changing the stored Saldo Tabungan.
_Avoid_: Saldo Tabungan

**Jumlah Saham**:
The number of share units currently held by an Anggota, independent of changes to Harga Saham.
_Avoid_: Saldo Saham, nilai saham

**Mutasi Simpanan**:
A proposed change to an Anggota's Saldo Tabungan or Jumlah Saham, recorded together with its approval outcome.
_Avoid_: Mutasi, when referring to other kinds of change

**Setoran**:
A Mutasi Simpanan that increases Saldo Tabungan or Jumlah Saham after approval.

**Penarikan**:
A Mutasi Simpanan that decreases Saldo Tabungan after approval and reserves that amount while pending.

**Jurnal**:
A balanced accounting record associated with an initiating Pengguna and composed of debit and credit entries.
_Avoid_: Journal

**Pemrakarsa Jurnal**:
The Pengguna whose action initiates the flow that produces a Jurnal: the Anggota for a member-initiated flow, or the admin for a manual Jurnal.
_Avoid_: Pencatat Jurnal

**Pencatat Jurnal**:
The Pengguna who finalizes the recording of a Jurnal, independently of its Pemrakarsa Jurnal.
_Avoid_: Pemrakarsa Jurnal

**Agio Saham**:
The absolute difference between the nominal and sale value of Saham in a transaction. It is credited when sale value exceeds nominal value and debited when sale value is lower.

**Nomor Anggota**:
The unique identifier assigned to an Anggota, formatted as `{kodeKelompok}-{MMYY}-{nomor}` with a monthly sequence per Kelompok.
_Avoid_: User ID

**Profil Pengguna**:
The personal details associated with a Pengguna.
_Avoid_: Profil Anggota

**Penanggung Jawab (PJ)**:
An Anggota responsible for a Kelompok.

**Kelompok**:
The organizational unit to which each Pengguna belongs and which scopes Nomor Anggota and PJ assignments.
_Avoid_: Grup
