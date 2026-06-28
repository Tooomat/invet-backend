# API Contract

---

# Email Verification

### 1.1 Resend LINK to email

resend email verification ke email user

**Endpoint:** `POST /api/email-verification/resend`  

**Request Header:**

- `Authorization: Bearer <accessToken>`

**Response:** `200 OK`

```json 
{
  "success": true,
  "message": "Verification link sent to email",
  "data": null
}
```

note: verifikasi email akan diarakan ke `FRONTEND_URL/login/verify-email?token=....`

**Response:** `429 Too Many Request`

```json
{
  "success": false,
  "message": "Too Many Request",
  "errors": {
    "message": 'Please wait before requesting another verification email',
    "retryAfter": xxxx//ms
  }
}
```

**Response:** `409 Conflict`

```json
{
  "success": false,
  "message": "Conflict",
  "errors": "User alredy verified"
}
```

### 1.2 Verify email

verifikasi email user menggunakan token dari send email

**Endpoint:** `GET /api/email-verification/verify`
  
**Query param:**
|   Key   |  Type  | Required | Description |
| ------- | ------ | -------- | ----------- |
| `token` | string | Yes | |

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": "OK"
}
```

**Response:** `400 Bad Request`

```json
{
  "success": false,
  "message": "Bad Request",
  "errors": "Invalid token verification"
}
```

**Response:** `400 Bad Request`

```json
{
  "success": false,
  "message": "Bad Request",
  "errors": "Verification token already used"
}
```

**Response:** `400 Bad Request`

```json
{
  "success": false,
  "message": "Bad Request",
  "errors": "Verification token has expired"
}
```

**Response:** `409 Conflict`

```json
{
  "success": false,
  "message": "Conflict",
  "errors": "User already verified"
}
```