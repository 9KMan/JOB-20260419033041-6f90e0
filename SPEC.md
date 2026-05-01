# Specification: MDM Platform v3 — Master Data Management System

## 1. Project Overview

**Project:** MDM Platform v3 Migration
**Type:** Full-stack enterprise web application
**Core Functionality:** A Master Data Management (MDM) platform for managing golden records, source system lineage, matching workflows, and steward review — with PostgreSQL at the core and GraphQL API.
**Target Users:** Enterprise data teams, stewards, and administrators managing customer/product golden records across multiple source systems.

---

## 2. Technical Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Node.js + TypeScript + GraphQL (Apollo Server) |
| **Database** | PostgreSQL 15 with ENUM types, JSONB, pg_trgm |
| **Frontend** | React 18 + TypeScript + GraphQL Client |
| **Auth** | JWT with role-based + per-page permissions (JSONB) |
| **ORM** | Prisma or raw SQL (PostgreSQL-first) |
| **Search** | pg_trgm full-text indexes |
| **Containerization** | Docker + Docker Compose |

---

## 3. Database Architecture

### 3.1 Design Principles
- **UUID surrogate keys** via `uuid_generate_v4()` on all tables
- **Natural keys** as `UNIQUE` constraints (`customer_code`, `batch_number`, `source_code`)
- **All timestamps**: `TIMESTAMPTZ` in UTC; demographic dates: `DATE`
- **Case-insensitive text** (`CITEXT`) for username and email
- **PostgreSQL ENUM** types for: `role`, `status`, `match_type`, `audit_action`, `record_status`
- **JSONB** for: permissions, raw source records, matching parameters, dashboard metrics, AI results
- **pg_trgm indexes** on `full_name` fields for global search bar
- **Append-only audit_events** — no UPDATE/DELETE in production
- **Soft delete** — records set to `ARCHIVED`/`DELETED` status, never physically deleted

### 3.2 Eight Logical Domains

#### Domain 1: Authorization
- `roles` — role definitions with JSONB permissions
- `users` — users with CITEXT email, role FK
- `permissions` — per-page, per-action permissions

#### Domain 2: Source System Catalog
- `data_sources` — source system catalog (name, type, connection info)
- `batch_ingestions` — batch ingestion jobs (batch_number, source FK, status, stats)
- `source_records` — raw source records with lineage (never physically deleted)

#### Domain 3: Golden Records
- `golden_records` — golden records with match provenance (UUID, status, confidence)
- `golden_record_sources` — junction linking golden records to source records
- `match_provenance` — full match history and confidence scores

#### Domain 4: Relationships
- `households` — household groupings
- `organizations` — organization entities
- `relationships` — family and employment relationships (person-person, person-org)
- `identity_documents` — passports, IDs linked to persons
- `product_accounts` — product accounts linked to persons/organizations

#### Domain 5: Matching Engine
- `matching_config` — thresholds, action rules, algorithm params
- `match_tasks` — batch match tasks (status, progress)
- `match_task_records` — per-record match outcomes

#### Domain 6: Steward Workflow
- `suspect_records` — records flagged for steward review
- `steward_reviews` — steward decisions with comments
- `workflow_actions` — approve, reject, merge, split actions

#### Domain 7: Audit & Compliance
- `audit_events` — append-only field-level audit trail (TIMESTAMPTZ, user, table, field, old/new value)
- `audit_snapshots` — periodic state snapshots

#### Domain 8: Reporting & AI
- `dashboard_kpis` — KPI snapshots (JSONB metrics)
- `scheduled_reports` — report configuration (schedule, params)
- `ai_queries` — AI Assistant query log
- `ai_results` — AI Assistant result cache (JSONB)

### 3.3 Database Schema (DDL Summary)

```sql
-- ENUM types
CREATE TYPE record_status AS ENUM ('ACTIVE', 'MERGED', 'ARCHIVED', 'DELETED');
CREATE TYPE match_type AS ENUM ('EXACT', 'PROBABILISTIC', 'RULE_BASED');
CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'MERGE', 'SPLIT', 'ARCHIVE');
CREATE TYPE batch_status AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE match_task_status AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- Core tables (representative)
CREATE TABLE data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE source_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES data_sources(id),
  batch_number VARCHAR(100),
  customer_code VARCHAR(100) UNIQUE NOT NULL,
  full_name TEXT,
  email CITEXT,
  phone VARCHAR(50),
  address JSONB,
  raw_payload JSONB,
  status record_status DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_source_records_full_name_trgm ON source_records USING gin (full_name gin_trgm_ops);

CREATE TABLE golden_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_name TEXT,
  canonical_email CITEXT,
  status record_status DEFAULT 'ACTIVE',
  confidence_score DECIMAL(5,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(100),
  record_id UUID,
  field_name VARCHAR(100),
  action audit_action,
  old_value JSONB,
  new_value JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Append-only: no UPDATE/DELETE on audit_events

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email CITEXT UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role_id UUID REFERENCES roles(id),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. GraphQL API

### 4.1 Schema Overview

```graphql
type Query {
  # Golden Records
  goldenRecord(id: UUID!): GoldenRecord
  goldenRecords(filter: GoldenRecordFilter, page: Int, pageSize: Int): GoldenRecordConnection!
  searchGoldenRecords(query: String!): [GoldenRecord!]!

  # Source Records
  sourceRecord(id: UUID!): SourceRecord
  sourceRecords(sourceId: UUID, status: RecordStatus, page: Int, pageSize: Int): SourceRecordConnection!

  # Data Sources
  dataSources: [DataSource!]!
  dataSource(id: UUID!): DataSource

  # Match Tasks
  matchTasks(status: MatchTaskStatus): [MatchTask!]!
  matchTask(id: UUID!): MatchTask

  # Steward Workflow
  suspectRecords(page: Int, pageSize: Int): SuspectRecordConnection!
  stewardReview(id: UUID!): StewardReview

  # Dashboard
  dashboardKPIs: DashboardKPIs!
  scheduledReports: [ScheduledReport!]!

  # Auth
  me: User
}

type Mutation {
  # Auth
  login(email: String!, password: String!): AuthPayload!
  register(input: RegisterInput!): User!

  # Golden Records
  approveGoldenRecord(id: UUID!): GoldenRecord!
  mergeGoldenRecords(sourceIds: [UUID!]!, targetId: UUID!): GoldenRecord!
  splitGoldenRecord(id: UUID!): [GoldenRecord!]!

  # Matching
  runMatchingTask(configId: UUID!): MatchTask!

  # Steward Workflow
  submitStewardReview(input: StewardReviewInput!): StewardReview!

  # Data Sources
  createDataSource(input: DataSourceInput!): DataSource!
  ingestBatch(sourceId: UUID!, records: [SourceRecordInput!]!): BatchIngestion!

  # Reports
  triggerReport(reportId: UUID!): ScheduledReport!
}
```

### 4.2 Key Resolvers
- **Golden Records**: CRUD + merge + split + provenance lookup
- **Matching**: Trigger match task, poll status, retrieve match candidates
- **Steward Review**: List suspects, submit decisions (approve/reject/merge)
- **Audit**: Append-only event log (no update/delete)
- **Search**: pg_trgm powered fuzzy search on full_name

---

## 5. Frontend Pages

### 5.1 Authentication
- Login (email + password)
- Role-based redirect

### 5.2 Golden Records
- **List View**: Searchable table with filters (status, confidence, source)
- **Detail View**: Full record with source lineage, match provenance, relationships
- **Merge UI**: Side-by-side comparison + merge action

### 5.3 Source Records
- **Source Catalog**: List all data sources with stats
- **Batch Ingestion**: Upload CSV/JSON, map fields, trigger ingestion
- **Record Browser**: Filter by source, status, date range

### 5.4 Matching Engine
- **Config Panel**: Set thresholds, action rules
- **Task Dashboard**: Monitor running/completed tasks
- **Results Explorer**: View match candidates, approve/reject

### 5.5 Steward Workflow
- **Suspect Queue**: Records flagged for human review
- **Review Form**: View details, take action (approve/reject/merge/split)

### 5.6 Reporting & AI
- **Dashboard**: KPI cards (total records, match rate, pending reviews)
- **AI Assistant**: Query/result log panel
- **Scheduled Reports**: List + trigger

### 5.7 Admin
- **Role Management**: Define roles with per-page permissions (JSONB)
- **User Management**: Invite users, assign roles
- **Audit Log Viewer**: Immutable audit trail browser

---

## 6. Authentication & Authorization

### 6.1 JWT Auth
- Access token (15-min) + refresh token (7-day, httpOnly cookie)
- Password hashing: bcrypt

### 6.2 Roles & Permissions
- Roles stored with JSONB permissions object:
```json
{
  "golden_records": ["read", "write", "approve", "merge"],
  "source_records": ["read", "write", "ingest"],
  "matching": ["read", "write", "run"],
  "steward": ["read", "write", "approve"],
  "reports": ["read", "write", "trigger"],
  "admin": ["read", "write", "manage_users", "manage_roles"]
}
```
- Middleware checks permissions per route/action

---

## 7. Docker Deployment

```yaml
services:
  api:         # Node.js + Apollo Server
  frontend:    # React dev server / nginx prod
  postgres:    # PostgreSQL 15
    command: postgres -c 'shared_preload_libraries=pg_trgm'
  redis:       # Session/cache
```

---

## 8. Deliverables

- [x] PostgreSQL schema with all 8 domains, ENUMs, indexes, soft-delete
- [x] GraphQL API (Apollo Server) — full CRUD + workflow mutations
- [x] React frontend with all pages
- [x] JWT auth with role/permission system
- [x] pg_trgm search
- [x] Append-only audit trail
- [x] Docker + docker-compose
- [x] README

---

## 9. Acceptance Criteria

1. **Database**: PostgreSQL schema with UUID PKs, CITEXT, pg_trgm, ENUMs, JSONB, soft-delete
2. **API**: All GraphQL queries and mutations working
3. **Auth**: Login/register with JWT + role-based permissions
4. **Golden Records**: CRUD, merge, split, provenance
5. **Matching**: Config, task runner, results
6. **Steward Workflow**: Suspect queue, review actions
7. **Audit**: Append-only event log
8. **Search**: Fuzzy search on full_name
9. **Frontend**: All pages functional
10. **Docker**: `docker-compose up` starts full stack
