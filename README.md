# Unified Monitoring Dashboard

A full-stack cloud monitoring simulation for VMs and container workloads, built with React, Vite, Tailwind CSS, Node.js, Express, Socket.io, and JWT auth.

## Features

- JWT-based signup and login
- Admin and Viewer roles
- CloudWatch/Datadog-style responsive dashboard
- VM controls for start, stop, and CPU spike simulation
- Container monitoring with pod grouping and health statuses
- Realtime CPU, memory, and network charts
- Alerts for CPU > 85% and memory > 90%
- Simulated logs with filtering by log level
- Dark mode toggle
- Cost estimation and autoscaling simulation panels
- Docker and Docker Compose support

## Project Structure

- `client` - React + Vite frontend
- `server` - Express + Socket.io backend
- `docker` - Dockerfiles for both services

## Local Development

### Backend

```bash
cd server
npm install
npm run seed
npm run dev
```

Backend runs on `http://localhost:4000`.

### MongoDB Atlas Setup

1. Copy `server/.env.example` to `server/.env`.
2. Replace `<db_password>` in `MONGODB_URI` with your real Atlas database password.
3. Keep `CLIENT_ORIGIN=http://localhost:5173` for local development.
4. Restart the backend after saving the file.
5. Run `npm run seed` once to initialize all MongoDB collections.

### Frontend

```bash
cd client
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

### Demo Credentials

- Admin: `admin@example.com`
- Password: `admin123!`

You can also create a Viewer account from the signup screen.

## Docker

```bash
docker compose up --build
```

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:4000`

## Deployment Notes

### AWS EC2

1. Launch an EC2 instance with Docker and Docker Compose installed.
2. Copy the repo to the instance.
3. Run `docker compose up --build -d`.
4. Open security group ports for `8080` and `4000`, or place an Nginx reverse proxy in front of the stack.

### Azure

1. Deploy the server container to Azure Container Apps, Azure App Service for Containers, or an Azure VM.
2. Serve the React client through a container or static hosting layer.
3. Set `CLIENT_ORIGIN` and `VITE_API_URL` to match the deployed endpoints.

## API Overview

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/dashboard/overview`
- `GET /api/vms`
- `POST /api/vms/:id/action`
- `GET /api/containers`
- `GET /api/alerts`
- `DELETE /api/alerts`
- `GET /api/logs`
- `GET /api/history`
- `GET /api/cost`
- `GET /api/autoscaling`
- `GET /api/settings`

## Notes

- The backend persists users, VMs, containers, alerts, logs, and history in MongoDB Atlas.
- The simulation updates are written back to MongoDB every cycle, and APIs read from synced Mongo-backed state.
- Socket.io pushes metrics, alerts, and logs every 2.5 seconds.
- Use `npm run seed` from `server` to reset and initialize all collections in one command.