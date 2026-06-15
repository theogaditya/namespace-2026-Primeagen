# SwarajDesk - Citizen Grievance Redressal Platform

<div align="center">

![SwarajDesk](https://img.shields.io/badge/SwarajDesk-Grievance%20System-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?style=flat-square&logo=node.js)
![Bun](https://img.shields.io/badge/Bun-1.3%2B-black?style=flat-square&logo=bun)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?style=flat-square&logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7-red?style=flat-square&logo=redis)

</div>

---

## 📋 Overview

**SwarajDesk** is a comprehensive, AI-powered citizen grievance redressal system designed to streamline the process of lodging, tracking, and resolving public complaints. Built with modern technologies, it provides separate interfaces for citizens and administrators with real-time updates, intelligent routing, and powerful analytics.

## 🎯 About the Product

SwarajDesk addresses the need for efficient public grievance management by providing:

### For Citizens (User Frontend)
- **Easy Complaint Registration**: Submit complaints with images, location, and detailed descriptions
- **AI-Powered Auto-Fill**: Automatically categorize and fill complaint details using image analysis
- **Real-time Tracking**: Track complaint status with live updates via WebSocket
- **Voice Chat Support**: Interact with AI chatbot using voice
- **Gamification**: Earn badges for civic participation
- **Mobile-First Design**: Fully responsive with Capacitor support for Android

### For Administrators (Admin Frontend)
- **Multi-tier Admin System**: Super Admin → State Admin → Municipal Admin → Agent hierarchy
- **Intelligent Complaint Routing**: Auto-assign complaints to appropriate departments
- **Analytics Dashboard**: Visual insights with charts and heatmaps
- **Chat System**: Direct communication with citizens
- **Complaint Processing**: AI-assisted complaint standardization and moderation

### Core Features
- 🔐 **Secure Authentication**: JWT-based auth with role-based access control
- 🤖 **AI Integration**: GCP Vertex AI for complaint classification
- 📍 **Geolocation**: Google Maps integration for location-based services
- 📊 **Real-time Analytics**: Live dashboards with comprehensive metrics
- 🔔 **WebSocket Support**: Real-time notifications and updates
- 📱 **Cross-Platform**: Web + Android (via Capacitor)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SwarajDesk                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│   │   user-fe    │    │   admin-fe   │    │   self       │      │
│   │  (Next.js)   │    │  (Next.js)   │    │  (Express)   │      │
│   │  Port: 3002  │    │  Port: 3003  │    │  Port: 3030  │      │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│          │                   │                   │               │
│          ▼                   ▼                   ▼               │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│   │   user-be    │    │   admin-be   │    │  compQueue   │      │
│   │  (Express)   │    │  (Express)   │    │  (Express)   │      │
│   │  Port: 3000  │    │  Port: 3002  │    │  Port: 3005  │      │
│   │  WS: 3001    │    │              │    │              │      │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│          │                   │                   │               │
│          └───────────────────┼───────────────────┘               │
│                              ▼                                   │
│   ┌──────────────────────────────────────────────────────┐      │
│   │                   PostgreSQL + Redis                  │      │
│   │            (Database + Queue + Caching)               │      │
│   └──────────────────────────────────────────────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Package Structure

| Package | Description | Port |
|---------|-------------|------|
| `user-fe` | Citizen-facing Next.js frontend | 3002 |
| `user-be` | Citizen backend API + WebSocket | 3000, 3001 |
| `admin-fe` | Admin dashboard Next.js frontend | 3003 |
| `admin-be` | Admin backend API | 3002 |
| `compQueue` | Complaint processing microservice | 3005 |
| `self` | AI/Image analysis service | 3030 |

---

## 📦 Prerequisites

Before running SwarajDesk locally, ensure you have the following installed:

### Required

| Software | Version | Installation |
|----------|---------|--------------|
| **Node.js** | 18.x or higher | [Download](https://nodejs.org/) |
| **Bun** | 1.3.x or higher | `curl -fsSL https://bun.sh/install \| bash` |
| **PostgreSQL** | 15.x or higher | [Download](https://www.postgresql.org/download/) |
| **Redis** | 7.x or higher | [Download](https://redis.io/download/) |

### Optional (for full features)

| Service | Purpose |
|---------|---------|
| **Docker & Docker Compose** | Containerized deployment |
| **AWS Account** | S3 (file uploads), Secrets Manager |
| **GCP Account** | Vertex AI (complaint classification) |
| **Google Maps API Key** | Location services |
| **OpenAI API Key** | Image analysis (self service) |

---

## 🚀 How to Run Locally

### 1. Clone the Repository

```bash
git clone https://github.com/theogaditya/sih-swarajdesk-2025.git
cd sih-swarajdesk-2025
```

### 2. Install Dependencies

```bash
# Install root dependencies
bun install

# This will install dependencies for all packages in the workspace
```

### 3. Set Up Environment Variables

Copy example environment files for each package:

```bash
# Backend services
cp packages/admin-be/example.env packages/admin-be/.env
cp packages/user-be/example.env packages/user-be/.env
cp packages/compQueue/example.env packages/compQueue/.env
cp packages/self/example.env packages/self/.env

# Frontend services
cp packages/admin-fe/example.env packages/admin-fe/.env.local
cp packages/user-fe/example.env packages/user-fe/.env.local
```

Edit each `.env` file with your actual credentials. At minimum, you need:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret key for JWT tokens

### 4. Set Up Database

```bash
# Navigate to a backend package (they share the same schema)
cd packages/user-be

# Generate Prisma client
bunx prisma generate

# Run migrations
bunx prisma migrate deploy

# (Optional) Seed the database
bunx prisma db seed
```

### 5. Start Services

You can start services individually or all at once:

#### Option A: Start All Services (Recommended for Development)

Open multiple terminal windows/tabs:

**Terminal 1 - User Backend:**
```bash
cd packages/user-be
bun run dev
```

**Terminal 2 - Admin Backend:**
```bash
cd packages/admin-be
bun run dev
```

**Terminal 3 - Complaint Queue (Optional):**
```bash
cd packages/compQueue
bun run dev
```

**Terminal 4 - Self/AI Service (Optional):**
```bash
cd packages/self
bun run dev
```

**Terminal 5 - User Frontend:**
```bash
cd packages/user-fe
bun run dev
```

**Terminal 6 - Admin Frontend:**
```bash
cd packages/admin-fe
bun run dev
```

#### Option B: Using Docker Compose

```bash
# Start all services with Docker
docker-compose up -d

# Or for specific packages:
cd packages/admin-be
docker-compose up -d
```

### 6. Access the Application

| Service | URL |
|---------|-----|
| User Frontend | http://localhost:3002 |
| Admin Frontend | http://localhost:3003 |
| User Backend API | http://localhost:3000 |
| Admin Backend API | http://localhost:3002 |
| WebSocket Server | ws://localhost:3001 |
| Complaint Queue API | http://localhost:3005 |
| AI/Image Service | http://localhost:3030 |

---

## 🧪 Running Tests

```bash
# Run tests for a specific package
cd packages/user-be
bun run test:unit

cd packages/admin-be
bun run test:unit
```

---

## 📚 Documentation

- [API Documentation](./packages/admin-be/doc/curl.md) - API endpoints and examples
- [Workflow Guide](./packages/admin-be/doc/workflow.md) - System workflow documentation
- [K8s Deployment](./packages/k8s/k8sREADME.md) - Kubernetes deployment guide
- [Redis Queue Setup](./packages/user-be/doc/REDIS_QUEUE_SETUP.md) - Redis queue configuration

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on how to get started.

---

## 📄 License

This project is licensed under the terms specified in the [LICENSE](./LICENSE) file.

---

## 🙏 Acknowledgments

Built with ❤️ for **Smart India Hackathon 2025**

<div align="center">

**SwarajDesk** - Empowering Citizens, Enabling Governance

</div>
