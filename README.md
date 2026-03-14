# RxFunction Gateway Server

[![AWS EKS](https://img.shields.io/badge/AWS%20EKS-Container%20Platform-orange?logo=amazon-aws)](https://aws.amazon.com/eks/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-Framework-blue?logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-DocumentDB-green?logo=mongodb)](https://aws.amazon.com/documentdb/)
[![Jest](https://img.shields.io/badge/Jest-Testing-red?logo=jest)](https://jestjs.io/)
[![ESLint](https://img.shields.io/badge/ESLint-Code%20Quality-purple?logo=eslint)](https://eslint.org/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-blue?logo=docker)](https://docker.com/)

## 🔗 Related Repositories

- **[W-200 K8S Cluster Deployment](https://github.com/RxFunction/walkasins-gateway)** - Kubernetes Helm scripts for W-200 cluster deployment
- **[Gateway Frontend](https://github.com/RxFunction/walkasins-gateway-frontend)** - Frontend application and nginx providing operator access to the server

## 🚀 Overview

The RxFunction Gateway Server is a comprehensive IoT firmware management platform designed to orchestrate over-the-air (OTA) firmware updates for W-200 devices through their associated gateway devices. The server seamlessly integrates with AWS cloud services to provide scalable, secure, and reliable firmware distribution across device fleets.

### Key Capabilities
- **Fleet-Based Firmware Management** - Organize devices into systems and fleets for targeted firmware deployments
- **Multi-Source Firmware Integration** - Pull firmware from GitHub releases and Green Light Guru (GLG)
- **IoT Core Communication** - Real-time device communication through AWS IoT Core
- **Scalable Message Processing** - SQS-based message queuing for high-throughput field communications
- **Comprehensive Permission System** - Role-based access control for web portal functionality
- **Dual-Application Architecture** - Separate manager and API applications for different use cases

## 🏗️ Architecture

### System Components
The RxFunction Gateway Server operates as a central hub managing firmware distribution across IoT device fleets. The system coordinates between W-200 devices, their gateway units, and AWS cloud services to enable secure, scalable over-the-air updates.

### Data Flow
1. **Device Registration** - W-200 Gateway devices register through AWS IoT Core
2. **Fleet Management** - Systems are assigned fleets mapping firmware targets to hardware groups
3. **Firmware Discovery** - Server pulls available firmware from GitHub and GLG repositories
4. **Update Orchestration** - Fleet manifests determine which devices receive specific firmware
5. **Field Communication** - SQS processes scalable messaging from field devices
6. **Status Tracking** - Real-time monitoring of firmware deployment progress

## 📱 Applications

### Manager Application (Port 9422)
- **Purpose**: Administrative web interface for system management
- **Features**: 
  - User authentication and session management
  - Fleet and system configuration
  - Firmware version management
  - Device status monitoring
- **Security**: CORS protection, rate limiting, Redis-based sessions

### API Application (Port 5445)
- **Purpose**: RESTful API for programmatic access and field device communication
- **Features**:
  - Device data endpoints
  - Firmware download URLs
  - System metrics and reporting
  - Automated processing endpoints
- **Security**: API rate limiting, token-based authentication

## 🛠️ Technology Stack

### Core Technologies
- **Runtime**: Node.js 18.x with Express.js framework
- **Database**: AWS DocumentDB (MongoDB-compatible) for data persistence
- **Caching**: Redis for session storage and performance optimization
- **Message Queue**: AWS SQS for scalable field device communication
- **File Storage**: AWS S3 with presigned URLs for temporary firmware hosting

### AWS Services Integration
- **AWS IoT Core**: Device communication and message routing
- **AWS EKS**: Container orchestration and deployment platform
- **AWS ECR**: Container image registry for CI/CD pipeline
- **AWS S3**: Secure firmware file storage and distribution

### External APIs
- **GitHub API**: Automated firmware release discovery and download
- **Green Light Guru (GLG)**: Medical device firmware compliance integration

## 🔧 Development Environment

### Prerequisites
- **VS Code** with the following extensions:
  - Dev Containers
  - Remote Development
  - WSL (for Windows users)
- **Docker CE** installed in your Linux development environment
- **WSL 2.0** (recommended for Windows users)
- Access to AWS services (IoT Core, DocumentDB, S3, SQS)

### Local Development Setup

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd RxFunctionGatewayServer
   ```

2. **Open in VS Code Dev Container**
   - Open the repository in VS Code
   - When prompted, click "Reopen in Container" or use `Ctrl+Shift+P` → "Dev Containers: Reopen in Container"
   - The dev container will automatically set up the complete development environment

3. **Environment Configuration**
   - Configure AWS credentials and service endpoints
   - Set up SSL certificates in `certs/` directory
   - Configure Redis password and session secrets

4. **Access Applications**
   - Manager App: `https://localhost:9422`
   - API App: `https://localhost:5445`

### VS Code Dev Container Features
The repository includes a complete VS Code development container configuration with:
- Pre-configured Node.js 18.x environment
- MongoDB and Redis services with health checks
- Automatic dependency installation
- Debug configuration and breakpoint support
- Integrated terminal with all development tools
- Extensions for optimal development experience

## 🧪 Testing & Quality Assurance

### Test Suite
- **Framework**: Jest with comprehensive test coverage
- **Coverage**: Apps, controllers, middleware, models, routes, and services
- **Mocking**: AWS SDK client mocking for reliable testing
- **Configuration**: `jest.config.js` with HTML and JSON coverage reporting

### Code Quality
- **ESLint**: Strict linting rules enforced across all JavaScript files
- **Configuration**: Custom ESLint config with Node.js-specific rules
- **Pre-commit**: Automated linting and testing in CI/CD pipeline

### Running Tests
```bash
# Run all tests with coverage
jest

# Run ESLint
npx eslint .

# Generate coverage report
jest --coverage
```

## 🚀 Deployment & CI/CD

### Jenkins Pipeline
The automated CI/CD pipeline handles:

1. **Environment Detection**
   - `main` branch → Production deployment
   - `develop` branch → Development deployment

2. **Quality Gates**
   - Fresh database initialization for testing
   - ESLint code quality checks
   - Jest test suite execution
   - Automated versioning (`1.0.BUILD_NUMBER`)

3. **Container Publishing**
   - Docker image build and optimization
   - AWS ECR registry publishing
   - Multi-environment deployment support

### Deployment Environments
- **Development**: AWS EKS dev cluster (develop branch)
- **Production**: AWS EKS production cluster (main branch)

### Container Security
- **Multi-stage Dockerfile** with minimal attack surface
- **Non-root user execution** with specific UID/GID
- **Removed package managers** and system utilities in production
- **Secure secrets management** through Kubernetes secrets

## 🔒 Security Features

### Authentication & Authorization
- **Operator Authentication** handled in upstream Kubernetes deployment
- **Role-based Permission Matrix** controlling web portal access
- **Session Management** with Redis-backed secure sessions
- **API Key Authentication** for programmatic access

### Network Security
- **HTTPS/TLS** enforced for all communications
- **CORS Configuration** with environment-specific origins
- **Rate Limiting** on authentication and API endpoints
- **Certificate-based** AWS IoT device authentication

### Data Security
- **Encrypted Database** connections to DocumentDB
- **Presigned S3 URLs** for temporary, secure firmware downloads
- **Redis Password Protection** for session storage
- **Environment-based Secrets** management in Kubernetes

## 📊 Monitoring & Operations

### Logging
- **Winston Logger** with structured logging
- **Express Winston** for HTTP request/response logging
- **Configurable Log Levels** for different environments
- **Request/Response Tracking** for debugging and monitoring

### Health Monitoring
- **Database Health Checks** for MongoDB connectivity
- **Service Dependencies** monitoring (Redis, AWS services)
- **Automated Polling** for system status verification
- **Error Handling Middleware** for graceful failure management

### Metrics & Analytics
- **System Performance Tracking** through dedicated endpoints
- **Fleet Status Monitoring** for firmware deployment progress
- **Device Metrics Collection** for operational insights

## 🏭 Fleet Management

### System Organization
- **Systems**: Logical groupings of W-200 devices
- **Fleets**: Collections of systems sharing firmware update policies
- **Hardware Groups**: Device categorization for targeted firmware deployment
- **Templates**: Reusable configurations for device management

### Firmware Distribution
- **Source Integration**: Automated discovery from GitHub releases and GLG
- **Version Management**: Tracking and deployment of firmware versions
- **Target Matching**: Hardware-specific firmware assignment
- **Progressive Rollout**: Controlled deployment across device fleets

### Device Management
- **Gateway Registration**: Automatic registration through AWS IoT Core
- **Status Tracking**: Real-time monitoring of device connectivity and firmware status
- **Metrics Collection**: Device performance and operational data gathering
- **Remote Updates**: Secure over-the-air firmware deployment