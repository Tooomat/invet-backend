# Authentication

### 1.1 Register

Membuat akun pengguna baru.

- **Endpoint:** `POST /api/auth/register`
- **Request Body (multipart/form-data):**

| Key           | Type | Required | Description |
| ------------- | ---- | -------- | ----------- |
| `email`       | Text | Yes      |             |
| `password`    | Text | Yes      | Min 8 characters, minimal one uppercase, minimal one lowercase, minimal one number, minimal one special character (!@#$% etc.) |
| `firstName`   | Text | Yes      |
| `lastName`    | Text | No       |

**Response:** `201 Created`

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": YYYY-MM-DD HH:MI:SS,
  }
}
```

**Response:** `400 Bad Request`

```json
{
  "success": false,
  "message": "Bad Request",
  "errors": "Email already exists"
}
```

### 1.2 Login

Login untuk mendapatkan JWT token.  
**Endpoint:** `POST /api/auth/login`

**Request Body (application/json):**

```json
{
  "email": "...",
  "password": "securepassword"
}
```

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "isEmailVerified": false or undifined,
  }
}
```

**Response:** `401 Unauthorized`

```json
{
  "success": false,
  "message": "Unauthorized",
  "errors": "Invalid email or password"
}
```

**Response:** `403 Forbidden`

```json
{
  "success": false,
  "message": "Forbidden",
  "errors": "Account has been blocked"
}
```

### 1.3 Renew access token

Renew access token yang sudah EXP untuk generate token baru, selama refresh token masih berlaku  

**Endpoint:** `POST /api/auth/refresh`

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Successful generate new token",
  "data": {
    "newAccessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response:** `401 Unauthorized`

```json
{
  "success": false,
  "message": "Unauthorized",
  "errors": "Missing refresh token"
}
```

**Response:** `401 Unauthorized`

```json
{
  "success": false,
  "message": "Unauthorized",
  "errors": "Refresh token revoke"
}
```

**Response:** `401 Unauthorized`

```json
{
  "success": false,
  "message": "Unauthorized",
  "errors": "Invalid refresh token"
}
```
**Response:** `401 Unauthorized`

```json
{
  "success": false,
  "message": "Unauthorized",
  "errors": "User not found"
}
```
**Response:** `403 Conflict`

```json
{
  "success": false,
  "message": "Conflict",
  "errors": "Account has been blocked"
}
```

### 1.4 Logout

Logout untuk keluar aplikasi.

**Endpoint:** `POST /api/auth/logout`

**Request Header:**

- **Authorization: Bearer <token> (accessToken)**

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Logout successful",
  "data": "OK"
}
```

---
