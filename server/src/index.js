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
  buildCostSummary,
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

let lastAdminMutation = null;

function takeStateSnapshot() {
  return {
    vms: structuredClone(state.vms),
    containers: structuredClone(state.containers),
    alerts: structuredClone(state.alerts),
    logs: structuredClone(state.logs),
    history: structuredClone(state.history),
    metrics: structuredClone(state.metrics),
    settings: structuredClone(state.settings)
  };
}

function rememberAdminMutation(actionLabel) {
  lastAdminMutation = {
    actionLabel,
    capturedAt: new Date().toISOString(),
    snapshot: takeStateSnapshot()
  };
}

async function commitAndBroadcastState() {
  sanitizeMetrics();
  recordHistoryPoint();
  await flushToMongo();
  io.emit('metrics:update', { overview: buildOverview(), history: state.history });
  io.emit('vms:update', state.vms);
  io.emit('containers:update', state.containers);
  io.emit('alerts:update', state.alerts);
  io.emit('logs:update', state.logs);
}

app.get('/api/health', async (req, res) => {
  await syncFromMongo();
  res.json({ status: 'ok', regions: sampleRegions });
});

app.get('/api/audit', authRequired, adminOnly, async (req, res) => {
  await syncFromMongo();
  const auditLogs = state.logs.filter((entry) =>
    /administrator|admin|autoscaler|incident|pod|container|vm/i.test(`${entry.serviceName} ${entry.message}`)
  );
  res.json({ auditLogs: auditLogs.slice(0, 120) });
});

app.get('/api/admin/settings', authRequired, adminOnly, async (req, res) => {
  await syncFromMongo();
  res.json({
    thresholds: state.settings?.thresholds || { cpu: 85, memory: 90 },
    autoscalingPolicy: state.settings?.autoscalingPolicy || { cpuThreshold: 70, cooldownSeconds: 20, minVmsPerRegion: 1, maxVmsPerRegion: 4 },
    notifications: state.settings?.notifications || { email: true, slack: false, teams: false, webhookUrl: '' }
  });
});

app.put('/api/admin/settings', authRequired, adminOnly, async (req, res) => {
  await syncFromMongo();
  rememberAdminMutation('Update admin settings');

  const nextCpu = Number(req.body?.thresholds?.cpu ?? state.settings?.thresholds?.cpu ?? 85);
  const nextMemory = Number(req.body?.thresholds?.memory ?? state.settings?.thresholds?.memory ?? 90);

  state.settings = {
    ...(state.settings || {}),
    thresholds: {
      cpu: Math.max(55, Math.min(98, Number.isNaN(nextCpu) ? 85 : nextCpu)),
      memory: Math.max(60, Math.min(98, Number.isNaN(nextMemory) ? 90 : nextMemory))
    },
    autoscalingPolicy: {
      cpuThreshold: Math.max(50, Math.min(95, Number(req.body?.autoscalingPolicy?.cpuThreshold ?? state.settings?.autoscalingPolicy?.cpuThreshold ?? 70))),
      cooldownSeconds: Math.max(5, Math.min(300, Number(req.body?.autoscalingPolicy?.cooldownSeconds ?? state.settings?.autoscalingPolicy?.cooldownSeconds ?? 20))),
      minVmsPerRegion: Math.max(1, Math.min(10, Number(req.body?.autoscalingPolicy?.minVmsPerRegion ?? state.settings?.autoscalingPolicy?.minVmsPerRegion ?? 1))),
      maxVmsPerRegion: Math.max(1, Math.min(20, Number(req.body?.autoscalingPolicy?.maxVmsPerRegion ?? state.settings?.autoscalingPolicy?.maxVmsPerRegion ?? 4)))
    },
    notifications: {
      ...(state.settings?.notifications || {}),
      email: Boolean(req.body?.notifications?.email),
      slack: Boolean(req.body?.notifications?.slack),
      teams: Boolean(req.body?.notifications?.teams),
      webhookUrl: String(req.body?.notifications?.webhookUrl || '')
    }
  };

  appendLog({ serviceName: 'admin-settings', level: 'INFO', message: 'Thresholds and notification channels updated by administrator.' });
  await commitAndBroadcastState();

  res.json({
    thresholds: state.settings.thresholds,
    autoscalingPolicy: state.settings.autoscalingPolicy,
    notifications: state.settings.notifications
  });
});

app.post('/api/notifications/test', authRequired, adminOnly, async (req, res) => {
  await syncFromMongo();
  const channel = String(req.body?.channel || 'email').toLowerCase();
  const allowed = ['email', 'slack', 'teams', 'webhook'];
  if (!allowed.includes(channel)) {
    return res.status(400).json({ message: 'Unsupported channel' });
  }

  const configured = channel === 'webhook'
    ? Boolean(state.settings?.notifications?.webhookUrl)
    : Boolean(state.settings?.notifications?.[channel]);

  appendLog({
    serviceName: 'notification-engine',
    level: configured ? 'INFO' : 'ERROR',
    message: configured
      ? `Test notification sent to ${channel} channel.`
      : `Notification channel ${channel} is not configured/enabled.`
  });

  await commitAndBroadcastState();
  res.json({ channel, configured, sent: configured });
});

app.post('/api/scenarios/:name/run', authRequired, adminOnly, async (req, res) => {
  await syncFromMongo();
  const name = String(req.params.name || '').toLowerCase();
  rememberAdminMutation(`Run scenario: ${name}`);

  if (name === 'ddos') {
    state.vms.forEach((vm) => {
      vm.status = 'Running';
      vm.cpu = Math.min(99, vm.cpu + 35);
      vm.memory = Math.min(98, vm.memory + 15);
      vm.spike = true;
    });
    state.metrics.network = Math.min(420, state.metrics.network + 120);
    appendLog({ serviceName: 'scenario-engine', level: 'ERROR', message: 'Scenario DDOS executed: network surge and CPU pressure injected.' });
  } else if (name === 'memory-leak') {
    state.containers.forEach((container) => {
      container.memory = Math.min(99, container.memory + 26);
      container.status = container.memory > 90 ? 'Warning' : container.status;
    });
    appendLog({ serviceName: 'scenario-engine', level: 'ERROR', message: 'Scenario MEMORY-LEAK executed: sustained container memory growth injected.' });
  } else if (name === 'region-outage') {
    state.vms.forEach((vm) => {
      if (vm.region === 'eu-west-1') {
        vm.status = 'Stopped';
        vm.cpu = 0;
        vm.memory = 0;
      }
    });
    state.containers.forEach((container) => {
      if (container.region === 'eu-west-1') {
        container.status = 'Crashed';
        container.restartCount += 1;
      }
    });
    appendLog({ serviceName: 'scenario-engine', level: 'ERROR', message: 'Scenario REGION-OUTAGE executed: eu-west-1 workloads impacted.' });
  } else if (name === 'recovery') {
    state.vms.forEach((vm) => {
      vm.status = 'Running';
      vm.cpu = Math.max(12, vm.cpu - 20);
      vm.memory = Math.max(18, vm.memory - 15);
      vm.spike = false;
    });
    state.containers.forEach((container) => {
      container.status = 'Healthy';
      container.cpu = Math.max(8, container.cpu - 18);
      container.memory = Math.max(12, container.memory - 18);
    });
    appendLog({ serviceName: 'scenario-engine', level: 'INFO', message: 'Scenario RECOVERY executed: workloads stabilized.' });
  } else {
    return res.status(400).json({ message: 'Unsupported scenario preset' });
  }

  const payload = simulateTick();
  await flushToMongo();
  io.emit('metrics:update', { overview: payload.overview, history: payload.history, scalingAction: payload.scalingAction || null });
  io.emit('vms:update', state.vms);
  io.emit('containers:update', state.containers);
  io.emit('alerts:update', payload.alerts);
  io.emit('logs:update', payload.logs);

  res.json({ name, overview: payload.overview });
});

app.post('/api/admin/undo', authRequired, adminOnly, async (req, res) => {
  await syncFromMongo();

  if (!lastAdminMutation?.snapshot) {
    return res.status(400).json({ message: 'No admin action to undo.' });
  }

  state.vms = structuredClone(lastAdminMutation.snapshot.vms);
  state.containers = structuredClone(lastAdminMutation.snapshot.containers);
  state.alerts = structuredClone(lastAdminMutation.snapshot.alerts);
  state.logs = structuredClone(lastAdminMutation.snapshot.logs);
  state.history = structuredClone(lastAdminMutation.snapshot.history);
  state.metrics = structuredClone(lastAdminMutation.snapshot.metrics);
  state.settings = structuredClone(lastAdminMutation.snapshot.settings);
  state.activeAlertKeys = new Set(state.alerts.map((alert) => `${alert.source}:${alert.metric}`));

  appendLog({ serviceName: 'admin-control', level: 'INFO', message: `Undo completed for action: ${lastAdminMutation.actionLabel}` });
  lastAdminMutation = null;
  await commitAndBroadcastState();

  res.json({ message: 'Undo completed successfully.' });
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

app.post('/api/vms', authRequired, adminOnly, async (req, res) => {
  await syncFromMongo();
  rememberAdminMutation('Create VM');

  const name = String(req.body?.name || '').trim();
  const region = sampleRegions.includes(req.body?.region) ? req.body.region : sampleRegions[0];

  if (!name) {
    return res.status(400).json({ message: 'VM name is required' });
  }

  const vm = {
    id: randomUUID(),
    name,
    region,
    status: 'Running',
    cpu: 18,
    memory: 24,
    disk: 20,
    spike: false,
    createdByAutoscaler: false
  };

  state.vms.push(vm);
  appendLog({ serviceName: vm.name, level: 'INFO', message: 'VM created manually by administrator.' });
  await commitAndBroadcastState();

  return res.status(201).json({ vm });
});

app.delete('/api/vms/:id', authRequired, adminOnly, async (req, res) => {
  await syncFromMongo();
  rememberAdminMutation('Delete VM');

  if (state.vms.length <= 1) {
    return res.status(400).json({ message: 'At least one VM must remain in the simulation.' });
  }

  const index = state.vms.findIndex((entry) => entry.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'VM not found' });
  }

  const [deletedVm] = state.vms.splice(index, 1);
  appendLog({ serviceName: deletedVm.name, level: 'INFO', message: 'VM deleted manually by administrator.' });
  await commitAndBroadcastState();

  return res.json({ deletedId: deletedVm.id });
});

app.post('/api/vms/:id/action', authRequired, adminOnly, async (req, res) => {
  await syncFromMongo();
  rememberAdminMutation(`VM action ${String(req.body?.action || '').toLowerCase()}`);
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

  if (action === 'restart') {
    vm.status = 'Running';
    vm.cpu = Math.max(12, vm.cpu);
    vm.memory = Math.max(18, vm.memory);
    vm.spike = false;
    appendLog({ serviceName: vm.name, level: 'INFO', message: 'VM restarted via dashboard control.' });
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

app.post('/api/containers', authRequired, adminOnly, async (req, res) => {
  await syncFromMongo();
  rememberAdminMutation('Create container');

  const name = String(req.body?.name || '').trim();
  const pod = String(req.body?.pod || '').trim();
  const region = sampleRegions.includes(req.body?.region) ? req.body.region : sampleRegions[0];

  if (!name || !pod) {
    return res.status(400).json({ message: 'Container name and pod are required' });
  }

  const container = {
    id: randomUUID(),
    name,
    pod,
    region,
    status: 'Healthy',
    cpu: 16,
    memory: 22,
    restartCount: 0
  };

  state.containers.push(container);
  appendLog({ serviceName: container.name, level: 'INFO', message: `Container created in ${container.pod} by administrator.` });
  await commitAndBroadcastState();

  return res.status(201).json({ container });
});

app.post('/api/containers/:id/action', authRequired, adminOnly, async (req, res) => {
  await syncFromMongo();
  rememberAdminMutation(`Container action ${String(req.body?.action || '').toLowerCase()}`);

  const container = state.containers.find((entry) => entry.id === req.params.id);
  if (!container) {
    return res.status(404).json({ message: 'Container not found' });
  }

  const action = String(req.body?.action || '').toLowerCase();

  if (action === 'stop') {
    container.status = 'Stopped';
    container.cpu = 0;
    container.memory = 0;
    appendLog({ serviceName: container.name, level: 'INFO', message: 'Container stopped manually by administrator.' });
  } else if (action === 'restart') {
    container.status = 'Healthy';
    container.cpu = Math.max(12, container.cpu || 12);
    container.memory = Math.max(16, container.memory || 16);
    container.restartCount += 1;
    appendLog({ serviceName: container.name, level: 'INFO', message: 'Container restarted manually by administrator.' });
  } else if (action === 'start') {
    container.status = 'Healthy';
    container.cpu = Math.max(10, container.cpu || 10);
    container.memory = Math.max(15, container.memory || 15);
    appendLog({ serviceName: container.name, level: 'INFO', message: 'Container started manually by administrator.' });
  } else {
    return res.status(400).json({ message: 'Unsupported container action' });
  }

  await commitAndBroadcastState();
  return res.json({ container });
});

app.delete('/api/containers/:id', authRequired, adminOnly, async (req, res) => {
  await syncFromMongo();
  rememberAdminMutation('Delete container');

  if (state.containers.length <= 1) {
    return res.status(400).json({ message: 'At least one container must remain in the simulation.' });
  }

  const index = state.containers.findIndex((entry) => entry.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'Container not found' });
  }

  const [removed] = state.containers.splice(index, 1);
  appendLog({ serviceName: removed.name, level: 'INFO', message: 'Container deleted manually by administrator.' });
  await commitAndBroadcastState();
  return res.json({ deletedId: removed.id });
});

app.post('/api/pods', authRequired, adminOnly, async (req, res) => {
  await syncFromMongo();
  rememberAdminMutation('Create pod');

  const pod = String(req.body?.pod || '').trim();
  const region = sampleRegions.includes(req.body?.region) ? req.body.region : sampleRegions[0];

  if (!pod) {
    return res.status(400).json({ message: 'Pod name is required' });
  }

  if (state.containers.some((container) => container.pod === pod)) {
    return res.status(409).json({ message: 'Pod already exists' });
  }

  const baseContainer = {
    id: randomUUID(),
    name: `${pod}-svc-1`,
    pod,
    region,
    status: 'Healthy',
    cpu: 14,
    memory: 20,
    restartCount: 0
  };

  state.containers.push(baseContainer);
  appendLog({ serviceName: pod, level: 'INFO', message: `Pod ${pod} created by administrator.` });
  await commitAndBroadcastState();

  return res.status(201).json({ pod, region });
});

app.post('/api/pods/:pod/scale', authRequired, adminOnly, async (req, res) => {
  await syncFromMongo();
  rememberAdminMutation('Scale pod');

  const podName = req.params.pod;
  const delta = Number(req.body?.delta || 0);
  const podContainers = state.containers.filter((container) => container.pod === podName);

  if (podContainers.length === 0) {
    return res.status(404).json({ message: 'Pod not found' });
  }

  if (Number.isNaN(delta) || delta === 0) {
    return res.status(400).json({ message: 'Scale delta must be a non-zero number' });
  }

  if (delta > 0) {
    const region = podContainers[0].region;
    const startingIndex = podContainers.length + 1;
    for (let index = 0; index < delta; index += 1) {
      state.containers.push({
        id: randomUUID(),
        name: `${podName}-svc-${startingIndex + index}`,
        pod: podName,
        region,
        status: 'Healthy',
        cpu: 12,
        memory: 18,
        restartCount: 0
      });
    }
    appendLog({ serviceName: podName, level: 'INFO', message: `Pod scaled out by ${delta} container(s).` });
  } else {
    const removableCount = Math.min(Math.abs(delta), Math.max(podContainers.length - 1, 0));
    if (removableCount <= 0) {
      return res.status(400).json({ message: 'Pod must keep at least one container.' });
    }

    let removed = 0;
    for (let index = state.containers.length - 1; index >= 0 && removed < removableCount; index -= 1) {
      if (state.containers[index].pod === podName) {
        state.containers.splice(index, 1);
        removed += 1;
      }
    }
    appendLog({ serviceName: podName, level: 'INFO', message: `Pod scaled in by ${removed} container(s).` });
  }

  await commitAndBroadcastState();
  return res.json({ pod: podName, containers: state.containers.filter((container) => container.pod === podName).length });
});

app.delete('/api/pods/:pod', authRequired, adminOnly, async (req, res) => {
  await syncFromMongo();
  rememberAdminMutation('Delete pod');

  const podName = req.params.pod;
  const totalPodCount = new Set(state.containers.map((container) => container.pod)).size;
  if (totalPodCount <= 1) {
    return res.status(400).json({ message: 'At least one pod must remain in the simulation.' });
  }

  const before = state.containers.length;
  state.containers = state.containers.filter((container) => container.pod !== podName);
  const removed = before - state.containers.length;

  if (removed === 0) {
    return res.status(404).json({ message: 'Pod not found' });
  }

  appendLog({ serviceName: podName, level: 'INFO', message: `Pod ${podName} deleted by administrator.` });
  await commitAndBroadcastState();
  return res.json({ pod: podName, removedContainers: removed });
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
  sanitizeMetrics();
  res.json(buildCostSummary());
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
      ? 'Scale out by adding one VM in the saturated region'
      : state.metrics.autoscalingState === 'Scaling In'
        ? 'Scale in by removing one autoscaled VM from normalized region'
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
      ? 'Scale out by adding one VM in the saturated region'
      : state.metrics.autoscalingState === 'Scaling In'
        ? 'Scale in by removing one autoscaled VM from normalized region'
        : 'No changes needed'
  };

  io.emit('logs:update', state.logs);
  io.emit('metrics:update', { overview: buildOverview(), history: state.history });
  io.emit('vms:update', state.vms);
  io.emit('containers:update', state.containers);

  res.json(payload);
});

app.get('/api/predictions', authRequired, async (req, res) => {
  await syncFromMongo();
  const limit = Number(req.query.limit || 6);
  res.json({ predictions: generatePredictedIncidents(limit) });
});

app.get('/api/settings', authRequired, async (req, res) => {
  await syncFromMongo();
  res.json({
    regions: sampleRegions,
    alertThresholds: state.settings?.thresholds || { cpu: 85, memory: 90 },
    autoscalingPolicy: state.settings?.autoscalingPolicy || { cpuThreshold: 70, cooldownSeconds: 20, minVmsPerRegion: 1, maxVmsPerRegion: 4 },
    notifications: state.settings?.notifications || { email: true, slack: false, teams: false, webhookUrl: '' }
  });
});

app.post('/api/simulate/incident', authRequired, adminOnly, async (req, res) => {
  await syncFromMongo();
  const action = req.body?.action === 'resolve' ? 'resolve' : 'start';

  if (action === 'start') {
    const regionLoad = sampleRegions.map((region) => {
      const regionVms = state.vms.filter((vm) => vm.region === region && vm.status === 'Running');
      const averageCpu = regionVms.length
        ? regionVms.reduce((sum, vm) => sum + vm.cpu, 0) / regionVms.length
        : 0;

      return { region, averageCpu, vmCount: regionVms.length };
    });
    const incidentRegion = regionLoad.sort((a, b) => b.averageCpu - a.averageCpu || b.vmCount - a.vmCount)[0]?.region || sampleRegions[0];

    state.vms.forEach((vm, index) => {
      vm.status = 'Running';
      if (vm.region === incidentRegion || index % 2 === 0) {
        vm.cpu = Math.min(98, vm.cpu + 30);
        vm.memory = Math.min(96, vm.memory + 18);
        vm.spike = true;
      }
    });

    state.containers.forEach((container, index) => {
      if (container.region === incidentRegion) {
        container.status = index % 3 === 0 ? 'Crashed' : 'Warning';
        container.cpu = Math.min(99, container.cpu + 24);
        container.memory = Math.min(99, container.memory + 16);
      }
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
      message: `Synthetic incident started in ${incidentRegion}: multi-node CPU surge detected.`
    });
    appendLog({ serviceName: 'incident-orchestrator', level: 'ERROR', message: `Incident mode started by administrator in ${incidentRegion}.` });
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
  io.emit('vms:update', state.vms);
  io.emit('containers:update', state.containers);
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
  socket.emit('vms:update', state.vms);
  socket.emit('containers:update', state.containers);
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
    io.emit('vms:update', state.vms);
    io.emit('containers:update', state.containers);
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
