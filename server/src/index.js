import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Server } from 'socket.io';
import { randomUUID } from 'node:crypto';
import { connectMongo, loadStateFromMongo, persistState, seedFromState } from './mongo.js';
import {
  appendLog,
  buildOverview,
  clearAlerts,
  createAlert,
  findUserByEmail,
  generatePredictedIncidents,
  getPodGroups,
  recordHistoryPoint,
  sampleRegions,
  sanitizeMetrics,
  simulateTick,
  state
} from './store.js';

const configuredOrigins = String(process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (configuredOrigins.length === 0) return true;
  if (configuredOrigins.includes('*')) return true;
  if (configuredOrigins.includes(origin)) return true;
  return /^https?:\/\/localhost:(5173|5174|5175|5176)$/.test(origin);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin not allowed: ${origin}`));
    },
    methods: ['GET', 'POST', 'DELETE']
  }
});

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'unified-monitoring-secret';
const MONGODB_URI = process.env.MONGODB_URI;
const MONGO_ENABLED = Boolean(MONGODB_URI && !MONGODB_URI.includes('<db_password>'));

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin not allowed: ${origin}`));
    }
  })
);
app.use(express.json());

function createToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  return next();
}

async function syncFromMongo() {
  if (!MONGO_ENABLED) return;
  await loadStateFromMongo(state);
}

async function flushToMongo() {
  if (!MONGO_ENABLED) return;
  await persistState(state);
}

app.get('/api/health', async (req, res) => {
  await syncFromMongo();
  res.json({ status: 'ok', regions: sampleRegions });
});

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, role = 'Viewer' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  await syncFromMongo();

  if (findUserByEmail(email)) {
    return res.status(409).json({ message: 'Email already exists' });
  }

  const user = {
    id: randomUUID(),
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: role === 'Admin' ? 'Admin' : 'Viewer'
  };

  state.users.push(user);
  await flushToMongo();

  res.json({
    token: createToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  await syncFromMongo();
  const user = findUserByEmail(email || '');

  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  res.json({
    token: createToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

app.get('/api/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/dashboard/overview', authRequired, async (req, res) => {
  await syncFromMongo();
  res.json({ overview: buildOverview(), regions: sampleRegions, pods: getPodGroups() });
});

app.get('/api/vms', authRequired, async (req, res) => {
  await syncFromMongo();
  res.json({ vms: state.vms });
});

app.post('/api/vms/:id/action', authRequired, adminOnly, async (req, res) => {
  await syncFromMongo();
  const vm = state.vms.find((entry) => entry.id === req.params.id);

  if (!vm) {
    return res.status(404).json({ message: 'VM not found' });
  }

  const { action } = req.body;
  if (action === 'start') {
    vm.status = 'Running';
    vm.cpu = vm.cpu || 15;
    vm.memory = vm.memory || 20;
    appendLog({ serviceName: vm.name, level: 'INFO', message: 'VM started via dashboard control.' });
  }

  if (action === 'stop') {
    vm.status = 'Stopped';
    vm.cpu = 0;
    vm.memory = 0;
    appendLog({ serviceName: vm.name, level: 'INFO', message: 'VM stopped via dashboard control.' });
  }

  if (action === 'spike') {
    vm.status = 'Running';
    vm.cpu = Math.min(98, vm.cpu + 28);
    vm.memory = Math.min(96, vm.memory + 12);
    vm.spike = true;
    createAlert({
      source: vm.name,
      severity: vm.cpu > 95 ? 'Critical' : 'Warning',
      metric: 'CPU',
      value: vm.cpu,
      threshold: 85,
      message: `${vm.name} CPU spiked to ${vm.cpu}%`
    });
    appendLog({ serviceName: vm.name, level: 'ERROR', message: 'Synthetic CPU spike triggered.' });
  }

  const payload = simulateTick();
  await flushToMongo();

  io.emit('metrics:update', { overview: payload.overview, history: payload.history });
  io.emit('alerts:update', payload.alerts);
  io.emit('logs:update', payload.logs);

  res.json({ vm });
});

app.get('/api/containers', authRequired, async (req, res) => {
  await syncFromMongo();
  res.json({ containers: state.containers, pods: getPodGroups() });
});

app.get('/api/alerts', authRequired, async (req, res) => {
  await syncFromMongo();
  res.json({ alerts: state.alerts });
});

app.delete('/api/alerts', authRequired, adminOnly, async (req, res) => {
  await syncFromMongo();
  clearAlerts();
  appendLog({ serviceName: 'alert-engine', level: 'INFO', message: 'Alerts cleared by administrator.' });
  await flushToMongo();
  io.emit('alerts:update', state.alerts);
  res.json({ alerts: state.alerts });
});

app.get('/api/logs', authRequired, async (req, res) => {
  await syncFromMongo();
  const level = String(req.query.level || 'ALL').toUpperCase();
  const logs = level === 'ALL' ? state.logs : state.logs.filter((log) => log.level === level);
  res.json({ logs });
});

app.get('/api/history', authRequired, async (req, res) => {
  await syncFromMongo();
  res.json({ history: state.history });
});

app.get('/api/cost', authRequired, async (req, res) => {
  await syncFromMongo();
  res.json({
    regionSummary: sampleRegions.map((region) => ({
      region,
      monthlyEstimate: Number((state.metrics.costEstimate / sampleRegions.length + (region === 'us-east-1' ? 12 : 0)).toFixed(2))
    })),
    overallEstimate: state.metrics.costEstimate
  });
});

app.get('/api/autoscaling', authRequired, async (req, res) => {
  await syncFromMongo();
  sanitizeMetrics();
  res.json({
    state: state.metrics.autoscalingState,
    enabled: state.metrics.autoscalingEnabled !== false,
    lastScalingAction: state.metrics.lastScalingAction || 'No scaling action yet',
    lastScalingAt: state.metrics.lastScalingAt,
    recommendedAction: state.metrics.autoscalingState === 'Scaling Out'
      ? 'Scale out stateless pods by 2 replicas'
      : state.metrics.autoscalingState === 'Scaling In'
        ? 'Scale in by 1 replica to optimize cost'
        : 'No changes needed'
  });
});

app.post('/api/autoscaling', authRequired, adminOnly, async (req, res) => {
  await syncFromMongo();
  const enabled = Boolean(req.body?.enabled);
  state.metrics.autoscalingEnabled = enabled;
  sanitizeMetrics();
  appendLog({
    serviceName: 'autoscaler',
    level: 'INFO',
    message: `Autoscaling was ${enabled ? 'enabled' : 'disabled'} by administrator.`
  });
  await flushToMongo();

  const payload = {
    state: state.metrics.autoscalingState,
    enabled: state.metrics.autoscalingEnabled,
    lastScalingAction: state.metrics.lastScalingAction || 'No scaling action yet',
    lastScalingAt: state.metrics.lastScalingAt,
    recommendedAction: state.metrics.autoscalingState === 'Scaling Out'
      ? 'Scale out stateless pods by 2 replicas'
      : state.metrics.autoscalingState === 'Scaling In'
        ? 'Scale in by 1 replica to optimize cost'
        : 'No changes needed'
  };

  io.emit('logs:update', state.logs);
  io.emit('metrics:update', { overview: buildOverview(), history: state.history });

  res.json(payload);
});

app.get('/api/predictions', authRequired, async (req, res) => {
  await syncFromMongo();
  const limit = Number(req.query.limit || 6);
  res.json({ predictions: generatePredictedIncidents(limit) });
});

app.get('/api/settings', authRequired, (req, res) => {
  res.json({ regions: sampleRegions, alertThresholds: { cpu: 85, memory: 90 } });
});

app.post('/api/simulate/incident', authRequired, adminOnly, async (req, res) => {
  await syncFromMongo();
  const action = req.body?.action === 'resolve' ? 'resolve' : 'start';

  if (action === 'start') {
    state.vms.forEach((vm, index) => {
      vm.status = 'Running';
      if (index % 2 === 0) {
        vm.cpu = Math.min(98, vm.cpu + 30);
        vm.memory = Math.min(96, vm.memory + 18);
        vm.spike = true;
      }
    });

    state.containers.forEach((container, index) => {
      container.status = index % 3 === 0 ? 'Crashed' : 'Warning';
      container.cpu = Math.min(99, container.cpu + 24);
      container.memory = Math.min(99, container.memory + 16);
      if (container.status === 'Crashed') {
        container.restartCount += 1;
      }
    });

    createAlert({
      source: 'Incident Mode',
      severity: 'Critical',
      metric: 'CPU',
      value: 96,
      threshold: 85,
      message: 'Synthetic incident started: multi-node CPU surge detected.'
    });
    appendLog({ serviceName: 'incident-orchestrator', level: 'ERROR', message: 'Incident mode started by administrator.' });
  } else {
    state.vms.forEach((vm) => {
      vm.cpu = Math.max(12, vm.cpu - 20);
      vm.memory = Math.max(18, vm.memory - 12);
      vm.spike = false;
    });

    state.containers.forEach((container) => {
      container.status = 'Healthy';
      container.cpu = Math.max(8, container.cpu - 22);
      container.memory = Math.max(12, container.memory - 14);
    });

    appendLog({ serviceName: 'incident-orchestrator', level: 'INFO', message: 'Incident mode resolved by administrator.' });
  }

  const payload = simulateTick();
  await flushToMongo();

  io.emit('metrics:update', { overview: payload.overview, history: payload.history });
  io.emit('alerts:update', payload.alerts);
  io.emit('logs:update', payload.logs);

  res.json({
    overview: payload.overview,
    history: payload.history,
    alerts: payload.alerts,
    logs: payload.logs,
    action
  });
});

io.on('connection', async (socket) => {
  await syncFromMongo();
  socket.emit('metrics:update', { overview: buildOverview(), history: state.history });
  socket.emit('alerts:update', state.alerts);
  socket.emit('logs:update', state.logs);
});

let tickInProgress = false;
setInterval(async () => {
  if (tickInProgress) return;
  tickInProgress = true;

  try {
    await syncFromMongo();
    const payload = simulateTick();
    await flushToMongo();
    io.emit('metrics:update', { overview: payload.overview, history: payload.history, scalingAction: payload.scalingAction || null });
    io.emit('alerts:update', payload.alerts);
    io.emit('logs:update', payload.logs);
  } finally {
    tickInProgress = false;
  }
}, 2500);

async function start() {
  if (MONGO_ENABLED) {
    await connectMongo(MONGODB_URI);
    await seedFromState(state);
    await loadStateFromMongo(state);
    console.log('Connected to MongoDB Atlas');
  } else {
    console.warn('MONGODB_URI is missing or still uses the <db_password> placeholder. Starting with in-memory state only.');
  }

  if (state.history.length === 0) {
    recordHistoryPoint();
    await flushToMongo();
  }

  server.listen(PORT, () => {
    console.log(`Unified Monitoring Dashboard API running on port ${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
