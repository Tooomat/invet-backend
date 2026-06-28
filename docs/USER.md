# API Contract

---

# User

## 1.1.1 Current User

Mendapatkan data user yang sedang login.

**Endpoint:** `GET /api/users`

**Request Header:**
- `Authorization: Bearer <accessToken>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-06-01T00:00:00.000Z"
  }
}
```

**Response:** `401 Unauthorized`
```json
{
  "success": false,
  "message": "Unauthorized",
  "errors": "Missing or invalid authorization header"
}
```

---

## 1.1.2 Update User

Update nama user yang sedang login. Minimal satu field harus diisi.

**Endpoint:** `PATCH /api/users`

**Request Header:**
- `Authorization: Bearer <accessToken>`

**Request Body (application/json):**
| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `firstName` | string | No | |
| `lastName` | string | No | |

```json
{
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Response:** `400 Bad Request`
```json
{
  "success": false,
  "message": "Validation errors",
  "errors": [
    {
      "path": "firstName",
      "message": "firstName must be at least 1 character"
    }
  ]
}
```

**Response:** `401 Unauthorized`
```json
{
  "success": false,
  "message": "Unauthorized",
  "errors": "Missing or invalid authorization header"
}
```

---

## 1.1.3 Profile

*(BELUM)*

---

## 1.1.4 Change Email

Request pergantian email. Sistem akan mengirim link verifikasi ke email baru. Membutuhkan konfirmasi password.

**Endpoint:** `POST /api/users/change-email`

**Request Header:**
- `Authorization: Bearer <accessToken>`

**Request Body (application/json):**
| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `newEmail` | string | Yes | Email baru yang ingin digunakan |
| `password` | string | Yes | Password saat ini untuk konfirmasi |

```json
{
  "newEmail": "newemail@example.com",
  "password": "Password123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Verification email sent to your new email address",
  "data": "OK"
}
```

note: link verifikasi akan diarahkan ke `FRONTEND_URL/settings/verify-newEmail?token=....`

**Response:** `400 Bad Request` — password salah
```json
{
  "success": false,
  "message": "Bad Request",
  "errors": "Password is incorrect"
}
```

**Response:** `400 Bad Request` — email sudah dipakai
```json
{
  "success": false,
  "message": "Bad Request",
  "errors": "Email already exists"
}
```

**Response:** `401 Unauthorized`
```json
{
  "success": false,
  "message": "Unauthorized",
  "errors": "Missing or invalid authorization header"
}
```

**Response:** `429 Too Many Requests`
```json
{
  "success": false,
  "message": "Too Many Requests",
  "errors": {
    "message": "Please wait before requesting another email change",
    "retryAfter": 243
  }
}
```

---

## 1.1.5 Verify Change Email

Verifikasi email baru menggunakan token dari link di email. Tidak membutuhkan access token. Setelah berhasil, semua session user akan diinvalidasi dan cookie `refreshToken` akan dihapus.

**Endpoint:** `GET /api/users/verify/change-email`

**Query Param:**
| Key | Type | Required | Description |
| --- | --- | --- | --- |
| `token` | string | Yes | Token dari link di email |

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Email changed successfully. Please log in again with your new email.",
  "data": "OK"
}
```

**Response:** `400 Bad Request` — token tidak valid
```json
{
  "success": false,
  "message": "Bad Request",
  "errors": "Invalid token verification"
}
```

**Response:** `400 Bad Request` — token sudah dipakai
```json
{
  "success": false,
  "message": "Bad Request",
  "errors": "Verification token already used"
}
```

**Response:** `400 Bad Request` — token expired
```json
{
  "success": false,
  "message": "Bad Request",
  "errors": "Verification token has expired"
}
```

---

## 1.1.6 Change Password

Ganti password user yang sedang login. Setelah berhasil, semua session akan diinvalidasi dan user dipaksa login ulang.

**Endpoint:** `PUT /api/users/change-password`

**Request Header:**
- `Authorization: Bearer <accessToken>`

**Request Body (application/json):**
| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `currentPassword` | string | Yes | Password saat ini dan (min 8 karakter, huruf besar, kecil, angka, simbol) |
| `newPassword` | string | Yes | Password baru (min 8 karakter, huruf besar, kecil, angka, simbol) |

```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Flow:**
```
User sudah login
    ↓
PATCH /api/users/change-password
    ↓
Validasi currentPassword cocok dengan yang di DB
    ↓
Hash newPassword → update di DB
    ↓
Blacklist access token + hapus refresh token dari Redis
    ↓
Clear cookie refreshToken
    ↓
User dipaksa login ulang dengan password baru
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Password changed successfully. Please log in again.",
  "data": null
}
```

**Response:** `400 Bad Request` — password saat ini salah
```json
{
  "success": false,
  "message": "Bad Request",
  "errors": "Current password is incorrect"
}
```

**Response:** `400 Bad Request` — password baru sama dengan yang lama
```json
{
  "success": false,
  "message": "Bad Request",
  "errors": "New password must be different from current password"
}
```

**Response:** `400 Bad Request` — validasi password baru gagal
```json
{
  "success": false,
  "message": "Validation errors",
  "errors": [
    {
      "path": "newPassword",
      "message": "Password must contain at least one uppercase letter"
    }
  ]
}
```

**Response:** `401 Unauthorized`
```json
{
  "success": false,
  "message": "Unauthorized",
  "errors": "Missing or invalid authorization header"
}
```

---
