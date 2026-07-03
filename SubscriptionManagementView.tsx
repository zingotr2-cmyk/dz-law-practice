# =========================================================================
# PRODUCTION BACKEND ENVIRONMENT VARIABLES (NikLinx LLC SaaS Legal Platform)
# =========================================================================

# 1. PostgreSQL Database Connection URL (Prisma ORM)
# Replace placeholders with your actual production PostgreSQL host, port, username, password, and database name.
DATABASE_URL="postgresql://postgres:YOUR_SECURE_PASSWORD@localhost:5412/niklinx_saas?schema=public"

# 2. Resend SDK API Key (For automated transactional email dispatch)
# Get your API key from the Resend Dashboard (https://resend.com)
RESEND_API_KEY="re_1234567890abcdefghijklmnopqrstuvwxyz"

# 2.5. Fallback Mail Server Configuration (NodeMailer SMTP)
# Used automatically as a backup if Resend fails or experiences rate limits
SMTP_HOST="mail.yourdomain.dz"
SMTP_PORT="587"
SMTP_USER="noreply@yourdomain.dz"
SMTP_PASS="your_secure_smtp_password"

# 3. Super Admin Administrative Secrets
# Key used to authorize admin actions from local backoffice clients or custom web requests
ADMIN_SECRET_KEY="ibrahim_mansouri_secret_2026"

# 4. Next.js App URL (For CORS or absolute callback links)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
