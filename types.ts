# Next.js App Router Backend Solution ⚙️
### legal SaaS Platform for "الأستاذ إبراهيم منصوري" (NikLinx LLC)

This directory contains a complete, production-grade Next.js App Router backend written in high-quality TypeScript. It covers user registration, 6-digit email OTP generation & verification using the **Resend SDK**, and administrative controls for Super Admin **الأستاذ إبراهيم منصوري**.

---

## 📁 Directory Structure

```
/backend-nextjs
├── prisma/
│   └── schema.prisma        # Database Schema for Lawyers and OTP Codes
├── lib/
│   └── prisma.ts            # Prisma Client Singleton helper
├── app/
│   └── api/
│       ├── auth/
│       │   ├── register/    # POST /api/auth/register (Hashing, OTP, Resend Mail)
│       │   └── verify-otp/  # POST /api/auth/verify-otp (Validate & Unlock status)
│       └── admin/
│           └── lawyers/     # GET & PATCH /api/admin/lawyers (Super Admin Control Panel)
└── .env.example             # Configuration templates for Database and API keys
```

---

## 🛠️ Step-by-Step Setup Guide

### 1. Install Necessary Dependencies
Ensure your Next.js project has the following packages installed:
```bash
# Install database client and email dispatch SDKs
npm install @prisma/client resend bcrypt
npm install -D prisma @types/bcrypt
```

### 2. Database Provisioning & Schema Migration
Configure your PostgreSQL database connection string inside your `.env` file (see `.env.example`). Once ready, initialize and sync your Prisma schema with the database:

```bash
# Push schema structure directly to database
npx prisma db push

# Generate the typesafe Prisma client
npx prisma generate
```

### 3. API Key Setup
To connect with the database and Resend Email service, make sure the following variables are defined in your `.env`:
* **`DATABASE_URL`**: Your PostgreSQL/MongoDB connection string.
* **`RESEND_API_KEY`**: Your active Resend API token from [resend.com](https://resend.com) to allow sending the professional Arabic HTML OTP emails.
* **`ADMIN_SECRET_KEY`**: Your administrative secure token for authentication.

---

## 📡 API Endpoints Specification

### 1. User Registration (`POST /api/auth/register`)
* **Purpose**: Registers a new lawyer, hashes the password using `bcrypt`, generates a 6-digit verification code, and dispatches it via email.
* **Payload**:
  ```json
  {
    "name": "الأستاذ أحمد بن علي",
    "email": "ahmed@law.dz",
    "password": "SecurePassword123",
    "phone": "0555123456",
    "region": "الجزائر العاصمة"
  }
  ```
* **Success Response (201)**:
  ```json
  {
    "success": true,
    "message": "تم إنشاء الحساب بنجاح وإرسال كود التحقق.",
    "userId": "uuid-string-here"
  }
  ```

### 2. OTP Verification (`POST /api/auth/verify-otp`)
* **Purpose**: Validates the 6-digit OTP code submitted by the user. If valid and not expired (within 5 minutes), transitions the user status to `PENDING_PAYMENT` so they can choose a subscription plan.
* **Payload**:
  ```json
  {
    "email": "ahmed@law.dz",
    "code": "829401"
  }
  ```
* **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "تم التحقق من البريد الإلكتروني بنجاح! يمكنك الآن اختيار باقة الاشتراك الخاصة بك."
  }
  ```

### 3. Super Admin Lawyers Manager (`GET` & `PATCH` `/api/admin/lawyers`)
* **Purpose**: Used by Super Admin **الأستاذ إبراهيم منصوري** to view register logs, audit payments, approve lawyer tiers, or freeze accounts.
* **Headers**:
  * `X-Admin-Email`: `ibrahim@law.dz` (Identifies administrative role)
  * `Authorization`: `Bearer your-admin-secret-key-here` (Secures the transaction)

* **GET Action**: Returns a feed of all lawyers ordered by registration date descending.
* **PATCH Action**: Approves or suspends user licenses.
  * **Payload to Approve Paid License**:
    ```json
    {
      "lawyerId": "uuid-string-here",
      "action": "APPROVE_PAYMENT",
      "planType": "ANNUAL"
    }
    ```
  * **Payload to Suspend Account**:
    ```json
    {
      "lawyerId": "uuid-string-here",
      "action": "SUSPEND"
    }
    ```

---

## 🔒 Security Best Practices Implemented
1. **Password Encryption**: No raw passwords touch the database; they are encrypted using cryptographically strong `bcrypt` salts.
2. **OTP Lifespan Enforcement**: Verification keys are set to expire in exactly 5 minutes, mitigating brute force attempts.
3. **Double Use Protection**: The database record of the OTP is immediately deleted upon a single successful validation.
4. **Administrative Guardrails**: All administrative controls verify secure API keys to protect sensitive lawyer client databases.
