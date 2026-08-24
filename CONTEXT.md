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
A historical entry of a share's nominal price and sale price. Each entry applies immediately, with the most recently recorded price considered current.
_Avoid_: Saham

**Master Saham**:
The administrative menu for recording Harga Saham entries and viewing their history.
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
