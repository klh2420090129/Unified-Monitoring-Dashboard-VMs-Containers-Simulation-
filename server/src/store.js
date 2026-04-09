import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

const now = () => new Date().toISOString();
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const regions = ['us-east-1', 'us-west-2', 'eu-west-1'];

function createSeedUsers() {
  return [
    {
      id: randomUUID(),
      name: 'Platform Admin',
      email: 'admin@example.com',
      passwordHash: bcrypt.hashSync('admin123!', 10),
      role: 'Admin'
    }
  ];
}

function createSeedVMs() {
  return [
    { id: randomUUID(), name: 'vm-prod-01', region: 'us-east-1', status: 'Running', cpu: 34, memory: 41, disk: 56, spike: false },
    { id: randomUUID(), name: 'vm-prod-02', region: 'us-east-1', status: 'Running', cpu: 52, memory: 63, disk: 72, spike: false },
    { id: randomUUID(), name: 'vm-stage-01', region: 'eu-west-1', status: 'Stopped', cpu: 0, memory: 0, disk: 29, spike: false },
    { id: randomUUID(), name: 'vm-tools-01', region: 'us-west-2', status: 'Running', cpu: 21, memory: 27, disk: 33, spike: false },
    { id: randomUUID(), name: 'vm-batch-01', region: 'us-west-2', status: 'Running', cpu: 67, memory: 58, disk: 69, spike: false }
  ];
}

function createSeedContainers() {
  return [
    { id: randomUUID(), name: 'api-gateway', pod: 'pod-a', region: 'us-east-1', status: 'Healthy', cpu: 24, memory: 35, restartCount: 1 },
    { id: randomUUID(), name: 'billing-worker', pod: 'pod-a', region: 'us-east-1', status: 'Healthy', cpu: 39, memory: 48, restartCount: 0 },
    { id: randomUUID(), name: 'log-collector', pod: 'pod-b', region: 'eu-west-1', status: 'Warning', cpu: 74, memory: 66, restartCount: 2 },
    { id: randomUUID(), name: 'metrics-exporter', pod: 'pod-b', region: 'us-west-2', status: 'Healthy', cpu: 19, memory: 23, restartCount: 0 },
    { id: randomUUID(), name: 'session-cache', pod: 'pod-c', region: 'us-east-1', status: 'Healthy', cpu: 33, memory: 42, restartCount: 0 },
    { id: randomUUID(), name: 'notification-svc', pod: 'pod-c', region: 'eu-west-1', status: 'Warning', cpu: 81, memory: 77, restartCount: 3 }
  ];
}

function createSeedHistory() {
  return Array.from({ length: 20 }, (_, index) => ({
    id: randomUUID(),
    timestamp: new Date(Date.now() - (19 - index) * 3000).toISOString(),
    cpu: 30 + index * 1.4,
    memory: 42 + index * 1.1,
    network: 90 + index * 6
  }));
}

function createSeedLogs() {
  return Array.from({ length: 8 }, (_, index) => ({
    id: randomUUID(),
    timestamp: new Date(Date.now() - index * 60000).toISOString(),
    serviceName: index % 2 === 0 ? 'api-gateway' : 'billing-worker',
    level: index % 3 === 0 ? 'ERROR' : 'INFO',
    message: index % 3 === 0 ? 'Retry budget exceeded on upstream request.' : 'Background job completed successfully.'
  }));
}

export function createInitialState() {
  const seededUsers = createSeedUsers();
  const seededVMs = createSeedVMs();
  const seededContainers = createSeedContainers();
  const historySeed = createSeedHistory();
  const logsSeed = createSeedLogs();

  return {
    users: seededUsers,
    vms: seededVMs,
    containers: seededContainers,
    alerts: [],
    logs: logsSeed,
    history: historySeed,
    activeAlertKeys: new Set(),
    settings: {
      thresholds: {
        cpu: 85,
        memory: 90
      },
      notifications: {
        email: true,
        slack: false,
        teams: false,
        webhookUrl: ''
      }
    },
    metrics: {
      cpu: 42,
      memory: 51,
      network: 128,
      totalVmRunning: seededVMs.filter((vm) => vm.status === 'Running').length,
      totalContainersRunning: seededContainers.length,
      costEstimate: 246.5,
      autoscalingState: 'Stable',
      autoscalingEnabled: true,
      lastScalingAction: 'No scaling action yet',
      lastScalingAt: null
    }
  };
}

export const state = createInitialState();

export const sampleRegions = regions;

export function appendLog({ serviceName, level, message }) {
  state.logs.unshift({
    id: randomUUID(),
    timestamp: now(),
    serviceName,
    level,
    message
  });

  state.logs = state.logs.slice(0, 100);
}

export function createAlert({ source, severity, metric, value, threshold, message }) {
  const dedupeKey = `${source}:${metric}`;
  if (state.activeAlertKeys.has(dedupeKey)) {
    return null;
  }

  state.activeAlertKeys.add(dedupeKey);
  const alert = {
    id: randomUUID(),
    timestamp: now(),
    source,
    metric,
    severity,
    value,
    threshold,
    message,
    acknowledged: false
  };

  state.alerts.unshift(alert);
  state.alerts = state.alerts.slice(0, 50);
  return alert;
}

export function clearAlerts() {
  state.alerts = [];
  state.activeAlertKeys.clear();
}

export function findUserByEmail(email) {
  return state.users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function sanitizeMetrics() {
  const runningVMs = state.vms.filter((vm) => vm.status === 'Running');
  const runningContainers = state.containers.filter((container) => container.status !== 'Crashed');
  const cpu = runningVMs.length
    ? runningVMs.reduce((total, vm) => total + vm.cpu, 0) / runningVMs.length
    : 0;
  const memory = runningVMs.length
    ? runningVMs.reduce((total, vm) => total + vm.memory, 0) / runningVMs.length
    : 0;
  const network = 90 + runningContainers.length * 14 + runningVMs.length * 10;

  const shouldScaleOut = cpu > 80 || memory > 85;
  const shouldScaleIn = cpu < 30 && memory < 35;

  state.metrics = {
    ...state.metrics,
    cpu: Number(cpu.toFixed(1)),
    memory: Number(memory.toFixed(1)),
    network: Number(network.toFixed(1)),
    totalVmRunning: runningVMs.length,
    totalContainersRunning: runningContainers.length,
    costEstimate: Number((180 + runningVMs.length * 12.4 + runningContainers.length * 4.8).toFixed(2)),
    autoscalingState: state.metrics.autoscalingEnabled ? (shouldScaleOut ? 'Scaling Out' : shouldScaleIn ? 'Scaling In' : 'Stable') : 'Disabled'
  };

  return state.metrics;
}

function addAutoscaledContainers(count) {
  const basePod = state.containers[0]?.pod || 'pod-autoscale';
  const baseRegion = state.containers[0]?.region || regions[0];

  for (let index = 0; index < count; index += 1) {
    state.containers.push({
      id: randomUUID(),
      name: `autoscale-${Math.floor(Math.random() * 9000) + 1000}`,
      pod: basePod,
      region: baseRegion,
      status: 'Healthy',
      cpu: 18,
      memory: 24,
      restartCount: 0
    });
  }
}

function removeAutoscaledContainers(count) {
  let removed = 0;
  while (removed < count && state.containers.length > 4) {
    const candidateIndex = state.containers.findIndex((container) => container.name.startsWith('autoscale-') || container.cpu < 25);
    if (candidateIndex === -1) break;
    state.containers.splice(candidateIndex, 1);
    removed += 1;
  }
  return removed;
}

export function evaluateAutoscaling() {
  if (!state.metrics.autoscalingEnabled) {
    state.metrics.autoscalingState = 'Disabled';
    return null;
  }

  const lastActionAt = state.metrics.lastScalingAt ? new Date(state.metrics.lastScalingAt).getTime() : 0;
  const inCooldown = Date.now() - lastActionAt < 20000;
  if (inCooldown) {
    return null;
  }

  if (state.metrics.cpu > 80 || state.metrics.memory > 85) {
    addAutoscaledContainers(2);
    const action = '+2 containers added';
    state.metrics.lastScalingAction = `${action} at ${now()}`;
    state.metrics.lastScalingAt = now();
    state.metrics.autoscalingState = 'Scaling Out';
    appendLog({ serviceName: 'autoscaler', level: 'INFO', message: `${action} due to high load.` });
    return { type: 'out', message: action };
  }

  if (state.metrics.cpu < 30 && state.metrics.memory < 35) {
    const removed = removeAutoscaledContainers(1);
    if (removed > 0) {
      const action = `-${removed} container removed`;
      state.metrics.lastScalingAction = `${action} at ${now()}`;
      state.metrics.lastScalingAt = now();
      state.metrics.autoscalingState = 'Scaling In';
      appendLog({ serviceName: 'autoscaler', level: 'INFO', message: `${action} during low demand.` });
      return { type: 'in', message: action };
    }
  }

  return null;
}

export function recordHistoryPoint() {
  state.history.push({
    id: randomUUID(),
    timestamp: now(),
    cpu: state.metrics.cpu,
    memory: state.metrics.memory,
    network: state.metrics.network
  });

  state.history = state.history.slice(-40);
}

export function simulateTick() {
  state.vms.forEach((vm) => {
    if (vm.status === 'Stopped') {
      vm.cpu = 0;
      vm.memory = 0;
      return;
    }

    const cpuDelta = (Math.random() - 0.5) * 12 + (vm.spike ? 24 : 0);
    const memoryDelta = (Math.random() - 0.5) * 8;
    const diskDelta = Math.random() * 1.4;

    vm.cpu = clamp(Number((vm.cpu + cpuDelta).toFixed(1)), 5, 98);
    vm.memory = clamp(Number((vm.memory + memoryDelta).toFixed(1)), 10, 96);
    vm.disk = clamp(Number((vm.disk + diskDelta).toFixed(1)), 15, 99);
    vm.spike = false;
  });

  state.containers.forEach((container) => {
    const cpuDelta = (Math.random() - 0.5) * 10;
    const memoryDelta = (Math.random() - 0.5) * 7;
    const restartChance = Math.random();

    container.cpu = clamp(Number((container.cpu + cpuDelta).toFixed(1)), 3, 99);
    container.memory = clamp(Number((container.memory + memoryDelta).toFixed(1)), 5, 99);

    if (container.cpu > 88 || container.memory > 92) {
      container.status = 'Warning';
    } else if (restartChance < 0.04) {
      container.status = 'Crashed';
      container.restartCount += 1;
      appendLog({ serviceName: container.name, level: 'ERROR', message: 'Container crash detected, restarting workload.' });
    } else {
      container.status = 'Healthy';
    }

    if (container.status === 'Crashed' && restartChance > 0.5) {
      container.status = 'Warning';
    }
  });

  sanitizeMetrics();
  const scalingAction = evaluateAutoscaling();
  if (scalingAction) {
    sanitizeMetrics();
  }

  const cpuThreshold = Number(state.settings?.thresholds?.cpu ?? 85);
  const memoryThreshold = Number(state.settings?.thresholds?.memory ?? 90);
  const cpuCriticalThreshold = cpuThreshold + 10;
  const memoryCriticalThreshold = memoryThreshold + 8;

  const cpuSeverity = state.metrics.cpu > cpuCriticalThreshold ? 'Critical' : state.metrics.cpu > cpuThreshold ? 'Warning' : null;
  const memorySeverity = state.metrics.memory > memoryCriticalThreshold ? 'Critical' : state.metrics.memory > memoryThreshold ? 'Warning' : null;

  if (cpuSeverity) {
    createAlert({
      source: 'Global Infrastructure',
      severity: cpuSeverity,
      metric: 'CPU',
      value: state.metrics.cpu,
      threshold: cpuThreshold,
      message: `CPU utilization is at ${state.metrics.cpu}%`
    });
    appendLog({ serviceName: 'monitoring-agent', level: 'ERROR', message: `CPU threshold breached at ${state.metrics.cpu}%` });
  }

  if (memorySeverity) {
    createAlert({
      source: 'Global Infrastructure',
      severity: memorySeverity,
      metric: 'Memory',
      value: state.metrics.memory,
      threshold: memoryThreshold,
      message: `Memory utilization is at ${state.metrics.memory}%`
    });
    appendLog({ serviceName: 'monitoring-agent', level: 'ERROR', message: `Memory threshold breached at ${state.metrics.memory}%` });
  }

  if (Math.random() > 0.72) {
    appendLog({
      serviceName: 'event-stream',
      level: 'INFO',
      message: `Cluster heartbeat recorded from ${regions[Math.floor(Math.random() * regions.length)]}.`
    });
  }

  state.metrics.network = Number((state.metrics.network + (Math.random() - 0.3) * 24).toFixed(1));
  state.metrics.network = clamp(state.metrics.network, 80, 420);

  recordHistoryPoint();

  return {
    overview: buildOverview(),
    history: state.history,
    alerts: state.alerts,
    logs: state.logs,
    scalingAction
  };
}

export function buildOverview() {
  const vmCpu = state.vms.filter((vm) => vm.status === 'Running').reduce((total, vm) => total + vm.cpu, 0);
  const vmMemory = state.vms.filter((vm) => vm.status === 'Running').reduce((total, vm) => total + vm.memory, 0);
  const count = Math.max(state.vms.filter((vm) => vm.status === 'Running').length, 1);

  return {
    totalVmRunning: state.metrics.totalVmRunning,
    totalContainersRunning: state.metrics.totalContainersRunning,
    averageCpuUsage: Number((vmCpu / count).toFixed(1)),
    averageMemoryUsage: Number((vmMemory / count).toFixed(1)),
    networkThroughput: state.metrics.network,
    activeAlerts: state.alerts.length,
    costEstimate: state.metrics.costEstimate,
    autoscalingState: state.metrics.autoscalingState
  };
}

export function getPodGroups() {
  return state.containers.reduce((groups, container) => {
    const existing = groups.find((group) => group.pod === container.pod);
    const entry = {
      id: container.id,
      name: container.name,
      status: container.status,
      cpu: container.cpu,
      memory: container.memory
    };

    if (existing) {
      existing.containers.push(entry);
      return groups;
    }

    groups.push({
      pod: container.pod,
      region: container.region,
      containers: [entry]
    });

    return groups;
  }, []);
}

export function generatePredictedIncidents(limit = 5) {
  const predictions = [];
  const recent = state.history.slice(-8);

  if (recent.length >= 4) {
    const first = recent[0];
    const last = recent[recent.length - 1];
    const cpuSlope = (last.cpu - first.cpu) / Math.max(recent.length - 1, 1);
    const memorySlope = (last.memory - first.memory) / Math.max(recent.length - 1, 1);
    const projectedCpu = Number((last.cpu + cpuSlope * 5).toFixed(1));
    const projectedMemory = Number((last.memory + memorySlope * 5).toFixed(1));
    const cpuVolatility = Number(
      (
        recent.reduce((total, point, index) => {
          if (index === 0) return total;
          return total + Math.abs(point.cpu - recent[index - 1].cpu);
        }, 0) / Math.max(recent.length - 1, 1)
      ).toFixed(2)
    );
    const memoryVolatility = Number(
      (
        recent.reduce((total, point, index) => {
          if (index === 0) return total;
          return total + Math.abs(point.memory - recent[index - 1].memory);
        }, 0) / Math.max(recent.length - 1, 1)
      ).toFixed(2)
    );

    const cpuRisingFast = cpuSlope > 1.1;
    const memoryRisingFast = memorySlope > 0.9;

    const cpuEta = cpuSlope > 0.1 ? Math.max(1, Math.min(10, Math.round((85 - last.cpu) / cpuSlope))) : null;
    const memoryEta = memorySlope > 0.1 ? Math.max(1, Math.min(10, Math.round((90 - last.memory) / memorySlope))) : null;

    if (projectedCpu > 85 && cpuRisingFast) {
      const confidence = Math.max(62, Math.min(95, Math.round(70 + (projectedCpu - 85) * 2.2 - cpuVolatility * 1.8)));
      predictions.push({
        id: `pred-cpu-${last.id}`,
        source: 'Global Infrastructure',
        severity: projectedCpu > 92 ? 'Critical' : 'Warning',
        confidence,
        etaMinutes: cpuEta ?? 3,
        message: `CPU trend is rising (${cpuSlope.toFixed(1)}% per sample) and is projected to reach ${projectedCpu}%.`,
        recommendation: 'Shift burst traffic, pre-scale stateless services, and investigate noisy workloads.'
      });
    }

    if (projectedMemory > 88 && memoryRisingFast) {
      const confidence = Math.max(60, Math.min(94, Math.round(68 + (projectedMemory - 88) * 2 - memoryVolatility * 1.6)));
      predictions.push({
        id: `pred-memory-${last.id}`,
        source: 'Global Infrastructure',
        severity: projectedMemory > 94 ? 'Critical' : 'Warning',
        confidence,
        etaMinutes: memoryEta ?? 4,
        message: `Memory trend is rising (${memorySlope.toFixed(1)}% per sample) with a projected peak near ${projectedMemory}%.`,
        recommendation: 'Drain high-memory pods and scale out stateless services.'
      });
    }
  }

  state.vms
    .filter((vm) => vm.status === 'Running')
    .forEach((vm) => {
      const riskScore = vm.cpu * 0.62 + vm.memory * 0.32 + (vm.spike ? 10 : 0);
      if (riskScore < 78) return;
      predictions.push({
        id: `pred-vm-${vm.id}`,
        source: vm.name,
        severity: riskScore > 88 ? 'Critical' : 'Warning',
        confidence: Math.max(65, Math.min(96, Math.round(riskScore + (vm.cpu > 90 ? 6 : 0)))),
        etaMinutes: riskScore > 92 ? 1 : riskScore > 84 ? 3 : 5,
        message: `${vm.name} shows sustained stress (CPU ${vm.cpu}%, memory ${vm.memory}%, risk ${Math.round(riskScore)}).`,
        recommendation: 'Throttle background jobs and move burst traffic to healthier nodes.'
      });
    });

  state.containers
    .filter((container) => container.status === 'Warning' || container.status === 'Crashed' || container.cpu > 85)
    .forEach((container) => {
      const confidence = container.status === 'Crashed'
        ? 92
        : Math.max(62, Math.min(88, Math.round(62 + (container.cpu - 78) * 1.4 + (container.restartCount > 1 ? 6 : 0))));
      predictions.push({
        id: `pred-container-${container.id}`,
        source: container.name,
        severity: container.status === 'Crashed' ? 'Critical' : 'Warning',
        confidence,
        etaMinutes: container.status === 'Crashed' ? 0 : 3,
        message: `${container.name} may trigger cascading pod instability in ${container.pod}.`,
        recommendation: 'Restart unhealthy instances and verify dependency readiness probes.'
      });
    });

  const deduped = Array.from(new Map(predictions.map((item) => [item.id, item])).values());

  return deduped
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}