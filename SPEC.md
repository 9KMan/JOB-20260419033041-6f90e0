# Specification: AI-Powered DTC Subscription Platform

## 1. Project Overview

**Project:** AI-Powered DTC Subscription Platform
**Type:** Full-stack subscription SaaS (B2C / DTC)
**Core Functionality:** End-to-end subscription management platform with customer portal, Stripe billing, admin dashboard, and AI-driven voice/SMS automation
**Target Users:** Direct-to-Consumer brands selling subscription products; internal admin/stewards managing orders, customers, and fulfillment

---

## 2. Technical Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React 18 + Next.js (App Router), TypeScript, Tailwind CSS |
| **Backend** | Node.js + TypeScript, Express or Fastify |
| **Database** | PostgreSQL 15 with ENUMs, JSONB, CITEXT |
| **ORM** | Prisma (PostgreSQL-first) |
| **Auth** | JWT with role-based access (admin, customer) |
| **Billing** | Stripe Subscriptions API (Checkout, Customer Portal, Webhooks) |
| **SMS/Voice** | Twilio SMS + Voice AI API |
| **Email** | SendGrid (transactional + marketing) |
| **Fulfillment** | Fulfillment API integrations (ShipBob / ShipMonk / custom) |
| **CRM** | CRM API integration (HubSpot / generic) |
| **Infrastructure** | AWS (EC2 or ECS, RDS PostgreSQL, S3, SES) |
| **Encryption** | AES-256 at rest for sensitive data; TLS in transit |

---

## 3. Functionality Specification

### 3.1 Customer-Facing Features

#### Multi-Step Onboarding
- Step 1: Account creation (email/password + email verification)
- Step 2: Subscription plan selection (monthly/annual, tiered)
- Step 3: Shipping & billing address
- Step 4: Payment (Stripe Checkout — embedded or redirect)
- Step 5: Welcome/confirmation screen
- Progress indicator, save-and-resume support

#### Customer Dashboard
- **Subscription Management:** View active plan, upgrade/downgrade/cancel, pause subscription, change payment method
- **Order Tracking:** List of past orders with status (processing → shipped → delivered), tracking numbers, fulfillment partner
- **Messaging Center:** In-app messaging to support; SMS/email notification preferences (Twilio + SendGrid)
- **Invoice History:** Download invoices, view billing history from Stripe
- **Profile Management:** Address book, notification settings, password change

#### AI Voice Agent (Twilio Voice AI)
- IVR-style phone tree for order status queries
- Natural language understanding for order tracking, subscription changes
- Fallback to human agent / support ticket creation
- Call logging and sentiment analysis

### 3.2 Admin Dashboard

#### Analytics Dashboard
- MRR/ARR metrics (from Stripe data)
- Subscriber churn rate, LTV, CAC
- Order volume over time
- Revenue by plan tier
- Dashboard charts: line/bar charts (Recharts or similar)

#### Customer Management
- Search customers by email/name/phone
- View full customer profile: subscription status, order history, notes
- Manually adjust subscription (credit, pause, cancel)
- Override fulfillment decisions

#### Order & Fulfillment Management
- Order list with filters (status, date, customer)
- Trigger fulfillment manually (if API integration fails)
- View/troubleshoot webhook events
- Bulk actions: mark shipped, issue refund

#### CRM Sync
- Push customer events (new sub, churn, upgrade) to CRM
- Two-way sync: CRM notes → customer profile in platform

### 3.3 Integrations

#### Stripe
- Products & Prices API (plans/tiers)
- Checkout Sessions (new subscriptions)
- Customer Portal (self-service management)
- Webhooks: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated/deleted`
- Idempotency on all webhook handlers
-grace period handling for failed payments

#### Twilio
- SMS: Order confirmations, shipping notifications, renewal reminders
- Voice AI: Inbound IVR for order status, account changes
- Call recording storage (S3)
- Opt-out handling

#### SendGrid
- Transactional: welcome email, order receipts, subscription renewal notices
- Marketing: (Phase 2) newsletter, promotional campaigns
- Template management via SendGrid Dynamic Templates

#### Fulfillment APIs
- Create fulfillment orders when subscription renews
- Receive tracking updates (webhook or polling)
- Handle out-of-stock / backorder scenarios
- Retry logic with exponential backoff

### 3.4 Security

- All passwords hashed with bcrypt (cost factor 12)
- JWT access tokens (15 min TTL) + refresh tokens (7 days, httpOnly cookie)
- Rate limiting on all API endpoints (express-rate-limit)
- Input validation with Zod on all API inputs
- SQL injection prevention via Prisma parameterized queries
- XSS prevention: CSP headers, sanitized outputs
- CORS: strict origin whitelist
- AWS: RDS in private subnet, S3 buckets private, IAM roles least privilege

---

## 4. Data Model (PostgreSQL)

```
users             — id, email, password_hash, phone, role (ENUM: admin, customer), mfa_enabled, created_at, updated_at
subscriptions     — id, user_id, stripe_subscription_id, stripe_customer_id, plan_tier, status (ENUM: active, paused, cancelled, past_due), current_period_start, current_period_end, created_at, updated_at
orders            — id, user_id, subscription_id, fulfillment_order_id, status (ENUM: pending, processing, shipped, delivered, cancelled), tracking_number, fulfillment_partner, total_amount, currency, created_at, updated_at
addresses         — id, user_id, type (ENUM: billing, shipping), line1, line2, city, state, postal_code, country, is_default
payment_methods   — id, user_id, stripe_payment_method_id, brand, last4, exp_month, exp_year, is_default
messages          — id, user_id, direction (ENUM: inbound, outbound), channel (ENUM: sms, email, in_app), body, status, sent_at
subscription_plans— id, stripe_price_id, name, tier, monthly_price, annual_price, features (JSONB), active
webhook_events    — id, stripe_event_id, type, payload (JSONB), processed (BOOLEAN), processed_at
audit_logs        — id, user_id, action, entity_type, entity_id, old_value (JSONB), new_value (JSONB), ip_address, created_at
crm_sync_events   — id, user_id, event_type, crm_record_id, synced (BOOLEAN), created_at, synced_at
voice_call_logs   — id, user_id, twilio_call_sid, direction, duration_sec, recording_url, transcription, sentiment_score, created_at
```

---

## 5. API Design

### REST Endpoints (Express/Fastify)

```
POST   /api/auth/register         — multi-step onboarding (Steps 1-3)
POST   /api/auth/login            — email/password login
POST   /api/auth/refresh          — refresh access token
POST   /api/auth/logout           — invalidate refresh token

GET    /api/customers/me          — current user profile
PATCH  /api/customers/me          — update profile
GET    /api/customers/me/address  — saved addresses
POST   /api/customers/me/address  — add address
DELETE /api/customers/me/address/:id

GET    /api/subscriptions/me      — current subscription
POST   /api/subscriptions/pause
POST   /api/subscriptions/resume
POST   /api/subscriptions/cancel
POST   /api/subscriptions/change-plan

GET    /api/orders                — order history
GET    /api/orders/:id            — order detail with tracking

POST   /api/stripe/checkout       — create Stripe Checkout Session
POST   /api/stripe/portal         — create Customer Portal session
POST   /api/stripe/webhook        — Stripe webhook handler (raw body)

GET    /api/admin/analytics       — dashboard metrics
GET    /api/admin/customers        — customer list with search/pagination
GET    /api/admin/customers/:id    — customer detail
PATCH  /api/admin/customers/:id   — admin update customer
GET    /api/admin/orders          — all orders with filters
PATCH  /api/admin/orders/:id      — admin update order/trigger fulfillment

POST   /api/webhooks/twilio       — Twilio webhook handler
POST   /api/webhooks/fulfillment  — fulfillment partner webhook

POST   /api/crm/sync              — trigger CRM sync for customer
GET    /api/crm/status            — CRM sync queue status
```

---

## 6. File Structure

```
dtc-subscription-platform/
├── SPEC.md
├── README.md
├── package.json
├── tsconfig.json
├── .env.example
├── docker-compose.yml           # local dev
├── prisma/
│   └── schema.prisma
├── src/
│   ├── index.ts                 # Express/Fastify entry
│   ├── config/
│   │   ├── stripe.ts
│   │   ├── twilio.ts
│   │   ├── sendgrid.ts
│   │   └── aws.ts
│   ├── middleware/
│   │   ├── auth.ts              # JWT verification
│   │   ├── rateLimit.ts
│   │   └── validate.ts          # Zod schemas
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── customers.ts
│   │   ├── subscriptions.ts
│   │   ├── orders.ts
│   │   ├── admin.ts
│   │   └── webhooks.ts
│   ├── services/
│   │   ├── stripeService.ts
│   │   ├── twilioService.ts
│   │   ├── sendGridService.ts
│   │   ├── fulfillmentService.ts
│   │   └── crmService.ts
│   └── utils/
│       ├── encryption.ts
│       └── logger.ts
└── tests/
    ├── auth.test.ts
    ├── subscription.test.ts
    └── stripeWebhook.test.ts
```

---

## 7. Out of Scope (Phase 1)

- Marketing email campaigns (SendGrid marketing API)
- Multi-tenant architecture (single brand for Phase 1)
- Mobile app (web only)
- Loyalty/rewards program
- Inventory management beyond fulfillment webhook status

---

## 8. Delivery Checklist

- [ ] GitHub repo created with full project structure
- [ ] Prisma schema applied to PostgreSQL
- [ ] Stripe webhook endpoint verified with test events
- [ ] Twilio SMS outbound confirmed working
- [ ] Customer dashboard loads subscription + orders
- [ ] Admin dashboard shows Stripe MRR data
- [ ] All ENV variables documented in .env.example
- [ ] README with setup instructions
- [ ] No hardcoded secrets (all in .env)
