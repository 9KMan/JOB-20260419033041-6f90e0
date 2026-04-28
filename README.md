# AI-Powered DTC Subscription Platform

A comprehensive subscription SaaS platform for Direct-to-Consumer brands, featuring AI-driven insights, multi-step onboarding, customer dashboard, and seamless integrations with Stripe, Twilio, SendGrid, and more.

## Features

- **Multi-step Onboarding**: Guided customer onboarding flow
- **Customer Dashboard**: Subscription management, order tracking, messaging
- **Admin Dashboard**: Analytics, user management, content moderation
- **Stripe Integration**: Subscription billing, one-time payments
- **Twilio SMS**: Automated notifications and alerts
- **SendGrid Email**: Marketing campaigns and transactional emails
- **Voice AI**: Voice-powered customer support
- **Fulfillment APIs**: Integration with ShipBob, ShipMonk, and custom providers
- **Multi-tenant SaaS**: Support for multiple brands/vendors
- **AWS Infrastructure**: Scalable cloud deployment ready
- **Encrypted Data**: End-to-end encryption for sensitive information

## Tech Stack

- **Backend**: Node.js, Express, Sequelize ORM
- **Frontend**: React, Next.js 14, Tailwind CSS
- **Database**: PostgreSQL
- **Cache/Session**: Redis (optional)
- **Payments**: Stripe
- **SMS**: Twilio
- **Email**: SendGrid
- **Cloud**: AWS (EC2, S3, RDS)
- **Container**: Docker, Docker Compose

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose (optional)
- Stripe account
- Twilio account (optional)
- SendGrid account (optional)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/9KMan/JOB-20260419033041-6f90e0.git
cd JOB-20260419033041-6f90e0
```

2. Backend Setup:
```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
npm install
npm run dev
```

3. Frontend Setup:
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your credentials
npm install
npm run dev
```

4. Using Docker:
```bash
docker-compose up -d
```

## Environment Variables

### Backend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| JWT_SECRET | Secret for JWT tokens | Yes |
| STRIPE_SECRET_KEY | Stripe API secret key | Yes |
| TWILIO_ACCOUNT_SID | Twilio account SID | No |
| TWILIO_AUTH_TOKEN | Twilio auth token | No |
| SENDGRID_API_KEY | SendGrid API key | No |
| AWS_ACCESS_KEY_ID | AWS access key | No |
| AWS_SECRET_ACCESS_KEY | AWS secret key | No |

### Frontend (.env.local)

| Variable | Description | Required |
|----------|-------------|----------|
| NEXT_PUBLIC_API_URL | Backend API URL | Yes |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Stripe publishable key | Yes |

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/forgot-password` - Password reset

### Users
- `GET /api/v1/users/profile/me` - Get current user profile
- `PUT /api/v1/users/profile/me` - Update profile

### Subscriptions
- `POST /api/v1/subscriptions` - Create subscription
- `GET /api/v1/subscriptions` - List subscriptions
- `POST /api/v1/subscriptions/:id/cancel` - Cancel subscription

### Orders
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders` - List orders
- `GET /api/v1/orders/:id/tracking` - Get tracking info

### Messages
- `POST /api/v1/messages` - Send message
- `GET /api/v1/messages/rooms` - List conversation rooms

### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard data
- `GET /api/v1/analytics/revenue` - Revenue metrics

## Webhooks

### Stripe Webhooks
- `POST /api/v1/webhooks/stripe` - Stripe event handler

### Twilio Webhooks
- `POST /api/v1/webhooks/twilio` - Twilio SMS handler

## Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests (Cypress)
npm run cypress
```

## Deployment

### AWS (EC2)

1. Launch an EC2 instance with Ubuntu 22.04
2. Install Docker and Docker Compose
3. Clone the repository
4. Configure environment variables
5. Run `docker-compose up -d`

### Railway

1. Connect your GitHub repository
2. Add environment variables
3. Deploy

### Render

1. Create Web Services for backend and frontend
2. Configure environment variables
3. Set up PostgreSQL add-on

## License

MIT License - See LICENSE file for details

## Support

For support, email support@dtcplatform.com or join our Slack channel.