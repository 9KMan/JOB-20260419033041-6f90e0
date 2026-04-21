# AWS Infrastructure

## Architecture

```
┌─────────────────┐
│   CloudFront    │
│     (CDN)       │
└────────┬────────┘
         │
    ┌────▼────┐
    │   S3    │
    │ (Assets)│
    └────────┘
         │
┌────────▼────────┐
│  Load Balancer  │
└────────┬────────┘
         │
    ┌────▼────┐
    │   ECS   │
    │(Fargate)│
    │ Backend │
    └────────┘
         │
┌────────▼────────┐
│  RDS Postgres   │
│   (Multi-AZ)    │
└─────────────────┘
```

## Services Used

- **ECS Fargate**: Containerized backend service
- **RDS PostgreSQL**: Primary database with Multi-AZ
- **S3**: Static assets and file uploads
- **CloudFront**: CDN for frontend
- **ElastiCache**: Redis for sessions (optional)
- **SES**: Transactional emails
- **CloudWatch**: Monitoring and logging

## Deployment

### Backend (ECS Fargate)

1. Build and push Docker image:
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REGISTRY
docker build -t dtc-backend ./backend
docker tag dtc-backend:latest $ECR_REGISTRY/dtc-backend:latest
docker push $ECR_REGISTRY/dtc-backend:latest
```

2. Update ECS service with new task definition

### Frontend (S3 + CloudFront)

1. Build static export:
```bash
cd frontend
npm run build
aws s3 sync out/ s3://$S3_BUCKET --delete
```

2. Invalidate CloudFront cache:
```bash
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

## Environment Variables

Set these in ECS Task Definition or Systems Manager Parameter Store:

| Name | Description |
|------|-------------|
| DATABASE_URL | RDS connection string |
| JWT_SECRET | JWT signing secret |
| STRIPE_SECRET_KEY | Stripe API key |
| AWS_ACCESS_KEY_ID | IAM access key |
| AWS_SECRET_ACCESS_KEY | IAM secret key |

## Monitoring

- CloudWatch Logs for application logs
- CloudWatch Metrics for custom metrics
- SNS alerts for errors