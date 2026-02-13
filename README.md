<h1 align="center"><img src="icon.svg" alt="" width="32" height="32" style="vertical-align: text-top;"> ThisIsMe</h1>

A care coordination and pupil advocacy platform for children with Special Educational Needs and Disabilities (SEND) to share information to help co-ordinate care. 
Inspired by Pupil Passports, and the need to harmonise often fragmented care.

## Features

- **Pupil Passports** -- Profile sections for loves, difficulties, strengths, and needs
- **Timeline** -- Track incidents, milestones, successes, medical events, and observations
- **Email Correspondence** -- Inbound email capture via webhooks, manual email logging, attachment storage
- **Document Storage** -- Upload and manage medical records, assessments, and reports
- **Secure Sharing** -- Password-protected, expiring links with granular section visibility
- **Collaboration** -- Comments and reactions on timeline entries, multi-user access with role-based permissions
- **OCR Processing** -- Automatic text extraction and classification from uploaded documents
- **Data Export** -- JSON, CSV, HTML, and Markdown export - complete data ownership at all times
- **GDPR Compliance** -- Consent tracking, data deletion, privacy controls

## Architecture

| Component | Tech | Port |
|-----------|------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 | 3000 |
| Backend | Spring Boot 3.4, Java 17, Spring Security, JPA/Hibernate | 8080 |
| OCR Service | FastAPI, PaddleOCR, sentence-transformers | 8081 |
| Database | PostgreSQL 16 | 5432 |
| Object Storage | MinIO (dev) / AWS S3 (prod) | 9000 |
| CDN / Reverse Proxy | AWS CloudFront | 443 |

## Prerequisites

- Docker and Docker Compose
- Or for local development:
  - Node.js 20+
  - Java 17+
  - Maven
  - Python 3.12+ (for OCR service)
  - PostgreSQL 16

## Quick Start (Docker)

```bash
git clone <repo-url>
cd thisisme
docker-compose up -d
```

Services will be available at:

- **UI**: http://localhost:3000
- **API**: http://localhost:8080
- **OCR**: http://localhost:8081
- **MinIO Console**: http://localhost:9001 (minioadmin / minioadmin123)

## Local Development Setup

### Database & Services

Start PostgreSQL and MinIO with Docker:

```bash
docker-compose up -d db minio
```

### Backend

```bash
cd server
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Runs on http://localhost:8080. The dev profile uses:
- PostgreSQL at `localhost:5432/thisisme_dev` (postgres/postgres)
- Local file storage in `./dev-uploads`
- 60-minute access tokens for easier development

Database migrations run automatically via Flyway on startup.

### Frontend

```bash
cd ui
npm install
npm run dev
```

Runs on http://localhost:3000. The API URL defaults to `http://localhost:8080` via `NEXT_PUBLIC_API_URL`.

### OCR Service

```bash
cd ocr
pip install -r requirements.txt
python main.py
```

Runs on http://localhost:8081. Requires approximately 4 GB of memory for the ML models.

## Email Correspondence System

Inbound emails are captured as CORRESPONDENCE timeline entries via a webhook endpoint. Emails can also be logged manually through the frontend.

### Inbound Email Flow

```
Cloudflare Email Routing
  → Cloudflare Worker (parses email, base64-encodes attachments)
    → CloudFront (HTTPS termination, custom domain)
      → POST /api/v2/passports/{id}/correspondence/inbound
        → TimelineEntry (type=CORRESPONDENCE) + Document attachments
```

### Webhook Endpoint

`POST /api/v2/passports/{passportId}/correspondence/inbound`

- **Auth:** `X-Webhook-Secret` header (no JWT required, endpoint is permit-all in Spring Security)
- **Payload:**
  ```json
  {
    "from": "sender@example.com",
    "to": "recipient@example.com",
    "subject": "Email subject",
    "body": "Email body text",
    "date": "2025-01-15",
    "attachments": [
      {
        "filename": "report.pdf",
        "contentType": "application/pdf",
        "content": "<base64-encoded>"
      }
    ]
  }
  ```
- **Response:** `CorrespondenceResponse` with `entryId`, source `"WEBHOOK"`, attachment count

### CloudFront Setup

CloudFront sits in front of the backend to provide HTTPS on a custom domain, required for external webhook sources (Cloudflare workers) to reach the API.

- **ACM Certificate** (free, in `us-east-1`) for the custom domain
- **CloudFront Distribution** with the backend server as origin
- **DNS** CNAME or alias record pointing the domain to the CloudFront distribution
- **Behavior:** Forward all headers, allow POST methods, no caching for API routes

### Manual Email Entry

The frontend provides a correspondence form (`ui/src/components/timeline/CorrespondenceForm.tsx`) with:
- Smart email paste parser that extracts From/To/Subject/Date headers automatically
- Visibility controls (Owners Only, Professionals, All, Custom)
- Tag support (school, medical, therapy, iep, referral)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PASSWORD` | `localdev123` | PostgreSQL password |
| `JWT_SECRET` | dev key | JWT signing secret (change in production) |
| `SPRING_PROFILE` | `dev` | Spring Boot profile |
| `STORAGE_TYPE` | `local` | `local` or `s3` |
| `S3_ENDPOINT` | MinIO URL | S3-compatible endpoint |
| `S3_ACCESS_KEY` | `minioadmin` | S3 access key |
| `S3_SECRET_KEY` | `minioadmin123` | S3 secret key |
| `S3_BUCKET` | `thisisme-documents` | S3 bucket name |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Backend URL for frontend |
| `WEBHOOK_SECRET` | dev secret | Shared secret for email webhook auth |
| `APP_EMAIL_FROM` | `noreply@thisisme.app` | Outbound email from address |
| `APP_EMAIL_FROM_NAME` | `ThisIsMe` | Outbound email display name |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |
| `APP_FRONTEND_URL` | `http://localhost:3000` | Frontend URL (used in invitation emails) |

## Project Structure

```
thisisme/
├── ui/                     # Next.js frontend
│   ├── src/
│   │   ├── app/            # Pages and routes
│   │   ├── components/     # React components
│   │   ├── context/        # Auth, Passport, Notification contexts
│   │   └── lib/            # API client and utilities
│   └── Dockerfile
├── server/                 # Spring Boot backend
│   ├── src/main/java/com/thisisme/
│   │   ├── controller/     # REST API controllers
│   │   ├── service/        # Business logic
│   │   ├── model/          # Entities, DTOs, enums
│   │   ├── repository/     # Data access
│   │   ├── security/       # JWT authentication
│   │   └── config/         # App configuration
│   ├── src/main/resources/
│   │   ├── db/migration/   # Flyway SQL migrations
│   │   └── application.yml # Configuration
│   └── Dockerfile
├── ocr/                    # Python OCR microservice
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
└── docker-compose.yml
```

## API Endpoints

### Authentication
- `POST /api/auth/register` -- Create account
- `POST /api/auth/login` -- Login (returns JWT)
- `POST /api/auth/refresh` -- Refresh access token
- `POST /api/auth/logout` -- Logout

### Passports
- `GET /api/passports` -- List user's passports
- `POST /api/passports` -- Create passport
- `GET /api/passports/:id` -- Get passport details
- `PUT /api/passports/:id` -- Update passport
- `POST /api/passports/:id/sections` -- Add section
- `PUT /api/passports/:id/sections/:sectionId` -- Update section

### Timeline
- `GET /api/passports/:id/timeline` -- List entries (paginated)
- `POST /api/passports/:id/timeline` -- Create entry
- `PUT /api/passports/:id/timeline/:entryId` -- Update entry
- `DELETE /api/passports/:id/timeline/:entryId` -- Delete entry

### Documents
- `GET /api/passports/:id/documents` -- List documents
- `POST /api/passports/:id/documents` -- Upload document
- `GET /api/passports/:id/documents/:docId/download` -- Download
- `DELETE /api/passports/:id/documents/:docId` -- Delete

### Sharing
- `POST /api/passports/:id/share` -- Create share link
- `GET /api/passports/:id/share` -- List share links
- `DELETE /api/passports/:id/share/:linkId` -- Revoke link
- `GET /share/:token/check` -- Check link status (public)
- `POST /share/:token/verify` -- Verify password (public)
- `GET /share/:token` -- Access shared passport (public)

### Correspondence (Webhook)
- `POST /api/v2/passports/:id/correspondence/inbound` -- Inbound email webhook (auth: `X-Webhook-Secret` header)

### Export
- `GET /api/passports/:id/export/json`
- `GET /api/passports/:id/export/csv`
- `GET /api/passports/:id/export/html`
- `GET /api/passports/:id/export/markdown`

## Testing

```bash
# Frontend
cd ui && npm test

# Backend
cd server && ./mvnw test
```

## Health Checks

- Backend: `GET http://localhost:8080/actuator/health`
- OCR: `GET http://localhost:8081/health`
