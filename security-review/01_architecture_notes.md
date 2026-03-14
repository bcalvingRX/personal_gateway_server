# Architecture Notes
Repository: walkasins-gateway-server

## Language / Framework
Node.js backend using Express.

Major components observed:
- Express web applications
- MongoDB via Mongoose
- Redis session storage
- AWS integrations
- Azure AD authentication

Key libraries:
- express
- passport
- passport-azure-ad
- express-session
- connect-redis
- mongoose
- redis
- cors
- dotenv
- express-validator
- express-rate-limit

## Application Structure

Startup file:
`index.js`

Two Express applications are created:

- API application
- Manager application

Files:
- `apps/api-app.js`
- `apps/manager-app.js`

Both are served via HTTPS using local TLS certificates.

## Infrastructure Services

`services/database.service.js`  
MongoDB connection management.

`services/redis.service.js`  
Redis session store, cache, and internal event bus.

`services/aws.iot.service.js`  
AWS IoT device communication.

`services/aws.sqs.service.js`  
AWS SQS messaging.

`services/aws.athena.service.js`  
Analytics queries.

## Data Models

Located in:
`model/`

Includes:
- user
- permissions
- groups
- API keys
- device / firmware / fleet models (`model/w200`)

## Request Flow

Typical flow:

Client  
↓  
HTTPS endpoint  
↓  
Express route  
↓  
Middleware  
- authentication  
- validation  
- rate limiting  
↓  
Controller  
↓  
Service layer  
↓  
Database / AWS services

## Observed Security Controls

Middleware present:
- authentication token middleware
- input validation middleware
- rate limiting middleware
- error handler middleware

## Sensitive Assets

Environment variables (`.env`)

TLS certificate and private key:
- `certs/ssl-cert.pem`
- `certs/ssl-key.pem`

Redis password:
- `certs/redis_password.txt`

Instrument CA:
- `certs/instrument-ca.pem`

AWS credentials (environment)

MongoDB connection string

Session secret
