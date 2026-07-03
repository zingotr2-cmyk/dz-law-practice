// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // Or "mongodb" depending on your production database preference
  url      = env("DATABASE_URL")
}

enum LawyerStatus {
  PENDING_EMAIL
  PENDING_PAYMENT
  ACTIVE
  SUSPENDED
}

enum SubscriptionPlan {
  FREE
  MONTHLY
  ANNUAL
}

model Lawyer {
  id                 String           @id @default(uuid())
  name               String
  email              String           @unique
  phone              String
  passwordHash       String           // Hashed using bcrypt
  region             String           // e.g. "الجزائر العاصمة", "باتنة", etc.
  status             LawyerStatus     @default(PENDING_EMAIL)
  currentPlan        SubscriptionPlan @default(FREE)
  remainingFreeCases Int              @default(3)
  ccpProofUrl        String?          // URL to the uploaded receipt image (e.g. on S3 / Cloud Storage)
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  @@index([email])
  @@index([status])
}

model OTP {
  id        String   @id @default(uuid())
  email     String
  code      String   // 6-digit verification code
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([email])
}
