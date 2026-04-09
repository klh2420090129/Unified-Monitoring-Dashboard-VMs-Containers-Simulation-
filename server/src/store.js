import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

const now = () => new Date().toISOString();
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const regions = ['us-east-1', 'us-west-2', 'eu-west-1'];
const VM_SCALE_OUT_THRESHOLD = 70;
const VM_SCALE_IN_AVERAGE_THRESHOLD = 52;

const AUTOSCALING_POLICY_DEFAULTS = {
  cpuThreshold: 70,
  cooldownSeconds: 20,
  minVmsPerRegion: 1,
  maxVmsPerRegion: 4
};

const COST_RATES = {
  vmBase: 47,
  vmPerRunning: 58,
  containerPerActive: 12.5,
  podPerGroup: 10,
  storagePerRunningVm: 8.5,
  networkPerRunningUnit: 4.1,
  autoscaledVmPremium: 16
};

function createSeedTimeline() {
  const createdAt = Date.now();
  return [
    {
      id: randomUUID(),
      timestamp: new Date(createdAt - 180000).toISOString(),
      type: 'bootstrap',
      region: 'global',
      severity: 'Info',
      title: 'Monitoring dashboard initialized',
      details: 'Baseline VMs, containers, and alerts loaded into the simulation.'
    },
    {
      id: randomUUID(),
      timestamp: new Date(createdAt - 120000).toISOString(),
      type: 'traffic',
      region: 'us-east-1',
      severity: 'Info',
      title: 'Regional traffic baseline established',
      details: 'Traffic generator is ready to shift load across regions automatically.'
    },
    {
      id: randomUUID(),
      timestamp: new Date(createdAt - 60000).toISOString(),
      type: 'policy',
      region: 'global',
      severity: 'Info',
      title: 'Autoscaling policy loaded',
      details: 'Region-based VM automation is enabled with hysteresis and cost-aware limits.'
    }
  ];
}

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
    { id: randomUUID(), name: 'vm-prod-01', region: 'us-east-1', status: 'Running', cpu: 34, memory: 41, disk: 56, spike: false, createdByAutoscaler: false },
    { id: randomUUID(), name: 'vm-prod-02', region: 'us-east-1', status: 'Running', cpu: 52, memory: 63, disk: 72, spike: false, createdByAutoscaler: false },
    { id: randomUUID(), name: 'vm-stage-01', region: 'eu-west-1', status: 'Stopped', cpu: 0, memory: 0, disk: 29, spike: false, createdByAutoscaler: false },
    { id: randomUUID(), name: 'vm-tools-01', region: 'us-west-2', status: 'Running', cpu: 21, memory: 27, disk: 33, spike: false, createdByAutoscaler: false },
    { id: randomUUID(), name: 'vm-batch-01', region: 'us-west-2', status: 'Running', cpu: 67, memory: 58, disk: 69, spike: false, createdByAutoscaler: false }
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
  const timelineSeed = createSeedTimeline();

  const autoscaledVmCount = seededVMs.filter((vm) => vm.createdByAutoscaler).length;

  return {
    users: seededUsers,
    vms: seededVMs,
    containers: seededContainers,
    alerts: [],
    logs: logsSeed,
    timeline: timelineSeed,
    history: historySeed,
    activeAlertKeys: new Set(),
    settings: {
      thresholds: {
        cpu: 85,
        memory: 90
      },
      autoscalingPolicy: { ...AUTOSCALING_POLICY_DEFAULTS },
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
      costEstimate: 0,
      autoscalingState: 'Stable',
      autoscalingEnabled: true,
      lastScalingAction: 'No scaling action yet',
      lastScalingAt: null,
      autoscaledVmCount,
      regionTraffic: {
        'us-east-1': 46,
        'us-west-2': 52,
        'eu-west-1': 41
      },
      autoscalingSignals: {
        'us-east-1': { highStreak: 0, lowStreak: 0 },
        'us-west-2': { highStreak: 0, lowStreak: 0 },
        'eu-west-1': { highStreak: 0, lowStreak: 0 }
      },
      lastTrafficHotspot: 'us-west-2'
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

export function recordTimelineEvent({ type, region = 'global', severity = 'Info', title, details, vmName }) {
  state.timeline.unshift({
    id: randomUUID(),
    timestamp: now(),
    type,
    region,
    severity,
    title,
    details,
    vmName
  });

  state.timeline = state.timeline.slice(0, 60);
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
  const costSummary = buildCostSummary();

  state.metrics = {
    ...state.metrics,
    cpu: Number(cpu.toFixed(1)),
    memory: Number(memory.toFixed(1)),
    network: Number(network.toFixed(1)),
    totalVmRunning: runningVMs.length,
    totalContainersRunning: runningContainers.length,
    costEstimate: costSummary.overallEstimate,
    autoscaledVmCount: state.vms.filter((vm) => vm.createdByAutoscaler && vm.status === 'Running').length,
    autoscalingState: state.metrics.autoscalingEnabled ? (shouldScaleOut ? 'Scaling Out' : shouldScaleIn ? 'Scaling In' : 'Stable') : 'Disabled'
  };

  return state.metrics;
}

function addAutoscaledVm(region) {
  const existingRegional = state.vms.filter((vm) => vm.region === region).length;
  const vm = {
    id: randomUUID(),
    name: `vm-autoscale-${region}-${existingRegional + 1}`,
    region,
    status: 'Running',
    cpu: 26,
    memory: 30,
    disk: 25,
    spike: false,
    createdByAutoscaler: true
  };

  state.vms.push(vm);
  return vm;
}

function removeAutoscaledVm(region) {
  const runningInRegion = state.vms.filter((vm) => vm.region === region && vm.status === 'Running');
  const autoscaledCandidate = runningInRegion.find((vm) => vm.createdByAutoscaler);

  if (!autoscaledCandidate || runningInRegion.length <= 1) {
    return null;
  }

  state.vms = state.vms.filter((vm) => vm.id !== autoscaledCandidate.id);
  return autoscaledCandidate;
}

function getRegionalRunningVmStats(region) {
  const running = state.vms.filter((vm) => vm.region === region && vm.status === 'Running');
  const autoscaledRunning = running.filter((vm) => vm.createdByAutoscaler).length;
  const averageCpu = running.length
    ? running.reduce((sum, vm) => sum + vm.cpu, 0) / running.length
    : 0;

  return {
    running,
    autoscaledRunning,
    averageCpu
  };
}

function getAutoscalingPolicy() {
  const policy = state.settings?.autoscalingPolicy || {};

  return {
    cpuThreshold: clamp(Number(policy.cpuThreshold ?? AUTOSCALING_POLICY_DEFAULTS.cpuThreshold), 50, 95),
    cooldownSeconds: clamp(Number(policy.cooldownSeconds ?? AUTOSCALING_POLICY_DEFAULTS.cooldownSeconds), 5, 300),
    minVmsPerRegion: clamp(Number(policy.minVmsPerRegion ?? AUTOSCALING_POLICY_DEFAULTS.minVmsPerRegion), 1, 10),
    maxVmsPerRegion: clamp(Number(policy.maxVmsPerRegion ?? AUTOSCALING_POLICY_DEFAULTS.maxVmsPerRegion), 1, 20)
  };
}

function generateRegionalTrafficPressure(region) {
  const regionIndex = regions.indexOf(region);
  const cycle = Math.sin((Date.now() / 240000) + regionIndex * 1.25) * 17;
  const pulse = Math.sin(Date.now() / 55000 + regionIndex * 0.7) * 8;
  const hotspotIndex = Math.floor(Date.now() / 30000) % regions.length;
  const hotspotBonus = hotspotIndex === regionIndex ? 18 : 0;
  const jitter = (Math.random() - 0.5) * 6;
  return clamp(Number((48 + cycle + pulse + hotspotBonus + jitter).toFixed(1)), 18, 96);
}

function getRegionSnapshot(region) {
  const runningVms = state.vms.filter((vm) => vm.region === region && vm.status === 'Running');
  const activeContainers = state.containers.filter((container) => container.region === region && container.status !== 'Crashed');
  const averageCpu = runningVms.length ? runningVms.reduce((sum, vm) => sum + vm.cpu, 0) / runningVms.length : 0;
  const averageMemory = runningVms.length ? runningVms.reduce((sum, vm) => sum + vm.memory, 0) / runningVms.length : 0;
  const trafficPressure = Number(state.metrics?.regionTraffic?.[region] ?? averageCpu);
  const autoscaledVms = runningVms.filter((vm) => vm.createdByAutoscaler).length;

  return {
    region,
    trafficPressure,
    runningVms: runningVms.length,
    autoscaledVms,
    activeContainers: activeContainers.length,
    averageCpu: Number(averageCpu.toFixed(1)),
    averageMemory: Number(averageMemory.toFixed(1))
  };
}

function buildCostForecast(overallEstimate, autoscalingPremium) {
  const recent = state.history.slice(-6);
  const first = recent[0] || recent[recent.length - 1];
  const last = recent[recent.length - 1] || recent[0];
  const cpuTrend = recent.length > 1 ? (last.cpu - first.cpu) / Math.max(recent.length - 1, 1) : 0;
  const memoryTrend = recent.length > 1 ? (last.memory - first.memory) / Math.max(recent.length - 1, 1) : 0;
  const trafficTrend = recent.length > 1 ? (last.network - first.network) / Math.max(recent.length - 1, 1) : 0;
  const autoscaledRunning = state.vms.filter((vm) => vm.status === 'Running' && vm.createdByAutoscaler).length;
  const growthMultiplier = clamp(1 + (cpuTrend / 130) + (memoryTrend / 170) + (trafficTrend / 220) + (autoscaledRunning * 0.03), 0.85, 1.35);
  const hourlyRate = overallEstimate / 730;

  return {
    hourlyRate: Number(hourlyRate.toFixed(2)),
    nextHourEstimate: Number((hourlyRate * growthMultiplier).toFixed(2)),
    nextDayEstimate: Number((hourlyRate * 24 * growthMultiplier * 1.04).toFixed(2)),
    normalizedHourlyEstimate: Number(((overallEstimate - autoscalingPremium) / 730).toFixed(2)),
    growthMultiplier: Number(growthMultiplier.toFixed(2)),
    trendSummary: cpuTrend > 1 || memoryTrend > 1 ? 'Rising demand' : cpuTrend < -1 && memoryTrend < -1 ? 'Falling demand' : 'Stable demand'
  };
}

export function buildOperationsInsights() {
  const cost = buildCostSummary();
  const forecast = buildCostForecast(cost.overallEstimate, cost.breakdown.autoscalingPremium);
  const alertsCount = state.alerts.length;
  const healthPressure = Number(((buildOverview().averageCpuUsage + buildOverview().averageMemoryUsage) / 2).toFixed(1));
  const autoscaledCount = state.vms.filter((vm) => vm.status === 'Running' && vm.createdByAutoscaler).length;
  const healthScore = clamp(
    Math.round(
      100
      - alertsCount * 5
      - Math.max(0, buildOverview().averageCpuUsage - 60) * 0.7
      - Math.max(0, buildOverview().averageMemoryUsage - 65) * 0.5
      - autoscaledCount * 4
      - Math.max(0, forecast.growthMultiplier - 1) * 18
    ),
    0,
    100
  );

  return {
    health: {
      score: healthScore,
      label: healthScore >= 82 ? 'Healthy' : healthScore >= 65 ? 'Watch' : 'At Risk',
      pressure: healthPressure,
      alertsCount,
      autoscaledCount,
      summary: healthScore >= 82
        ? 'Traffic is stable and regional load is balanced.'
        : healthScore >= 65
          ? 'One or more regions need monitoring before the next scale event.'
          : 'Regional pressure is elevated and autoscaling is actively compensating.'
    },
    forecast: {
      ...forecast,
      monthlyEstimate: cost.overallEstimate,
      autoscalingPremium: cost.breakdown.autoscalingPremium,
      savingsPotential: Number((cost.breakdown.autoscalingPremium * 1.08).toFixed(2))
    },
    regions: cost.regionSummary.map((region) => ({
      ...region,
      status: region.trafficPressure > 78 ? 'Hot' : region.trafficPressure > 60 ? 'Warm' : 'Balanced'
    })),
    timeline: state.timeline.slice(0, 12)
  };
}

export function evaluateAutoscaling() {
  if (!state.metrics.autoscalingEnabled) {
    state.metrics.autoscalingState = 'Disabled';
    return null;
  }

  const policy = getAutoscalingPolicy();
  const lastActionAt = state.metrics.lastScalingAt ? new Date(state.metrics.lastScalingAt).getTime() : 0;
  const inCooldown = Date.now() - lastActionAt < policy.cooldownSeconds * 1000;
  if (inCooldown) {
    return null;
  }

  const signals = { ...(state.metrics.autoscalingSignals || {}) };

  for (const region of regions) {
    const regional = getRegionalRunningVmStats(region);
    const regionTraffic = Number(state.metrics.regionTraffic?.[region] ?? regional.averageCpu);
    const hasCapacityPressure =
      regional.running.length > 0 && regional.running.every((vm) => vm.cpu >= policy.cpuThreshold) && regionTraffic >= policy.cpuThreshold - 2;
    const currentSignal = signals[region] || { highStreak: 0, lowStreak: 0 };

    if (hasCapacityPressure) {
      currentSignal.highStreak += 1;
      currentSignal.lowStreak = 0;
    } else {
      currentSignal.highStreak = 0;
    }

    signals[region] = currentSignal;

    if (currentSignal.highStreak >= 2 && regional.running.length < policy.maxVmsPerRegion) {
      const created = addAutoscaledVm(region);
      const action = `+1 VM added in ${region}`;
      state.metrics.lastScalingAction = `${action} at ${now()}`;
      state.metrics.lastScalingAt = now();
      state.metrics.autoscalingState = 'Scaling Out';
      appendLog({ serviceName: 'autoscaler', level: 'INFO', message: `${action} because all regional VMs are above ${policy.cpuThreshold}% CPU.` });
      recordTimelineEvent({
        type: 'scale-out',
        region,
        severity: 'Warning',
        title: `Autoscaler added VM in ${region}`,
        details: `All running VMs crossed ${policy.cpuThreshold}% CPU and regional traffic stayed elevated.`,
        vmName: created.name
      });
      state.metrics.autoscalingSignals = signals;
      return { type: 'out', message: action, region, vmName: created.name };
    }
  }

  for (const region of regions) {
    const regional = getRegionalRunningVmStats(region);
    const regionTraffic = Number(state.metrics.regionTraffic?.[region] ?? regional.averageCpu);
    const currentSignal = signals[region] || { highStreak: 0, lowStreak: 0 };
    const canScaleIn = regional.autoscaledRunning > 0 && regional.running.length > policy.minVmsPerRegion && regional.averageCpu < policy.cpuThreshold - 12 && regionTraffic < policy.cpuThreshold - 8;

    if (canScaleIn) {
      currentSignal.lowStreak += 1;
      currentSignal.highStreak = 0;
    } else {
      currentSignal.lowStreak = 0;
    }

    signals[region] = currentSignal;

    if (currentSignal.lowStreak >= 2) {
      const removed = removeAutoscaledVm(region);
      if (!removed) {
        continue;
      }

      const action = `-1 autoscaled VM removed from ${region}`;
      state.metrics.lastScalingAction = `${action} at ${now()}`;
      state.metrics.lastScalingAt = now();
      state.metrics.autoscalingState = 'Scaling In';
      appendLog({ serviceName: 'autoscaler', level: 'INFO', message: `${action} after load normalized in region.` });
      recordTimelineEvent({
        type: 'scale-in',
        region,
        severity: 'Info',
        title: `Autoscaler removed VM from ${region}`,
        details: `Regional traffic normalized and the autoscaler removed the temporary VM.`,
        vmName: removed.name
      });
      state.metrics.autoscalingSignals = signals;
      return { type: 'in', message: action, region, vmName: removed.name };
    }
  }

  state.metrics.autoscalingSignals = signals;

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
  const previousHotspot = state.metrics.lastTrafficHotspot;
  const regionTraffic = {};

  regions.forEach((region) => {
    regionTraffic[region] = generateRegionalTrafficPressure(region);
  });

  const nextHotspot = Object.entries(regionTraffic).sort((a, b) => b[1] - a[1])[0]?.[0] || regions[0];
  state.metrics.regionTraffic = regionTraffic;
  state.metrics.lastTrafficHotspot = nextHotspot;

  if (nextHotspot && nextHotspot !== previousHotspot) {
    recordTimelineEvent({
      type: 'traffic',
      region: nextHotspot,
      severity: 'Info',
      title: `Traffic hotspot shifted to ${nextHotspot}`,
      details: `Automated traffic generator raised regional demand to ${regionTraffic[nextHotspot]}% pressure.`
    });
  }

  state.vms.forEach((vm) => {
    if (vm.status === 'Stopped') {
      vm.cpu = 0;
      vm.memory = 0;
      return;
    }

    const regionTarget = Number(regionTraffic[vm.region] ?? 50);
    const cpuDelta = (regionTarget - vm.cpu) * 0.18 + (Math.random() - 0.5) * 5 + (vm.spike ? 14 : 0);
    const memoryDelta = (regionTarget - vm.memory) * 0.12 + (Math.random() - 0.5) * 4;
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
    scalingAction,
    timeline: state.timeline
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
    autoscalingState: state.metrics.autoscalingState,
    autoscaledVmCount: state.metrics.autoscaledVmCount || 0
  };
}

export function buildCostSummary() {
  const runningVms = state.vms.filter((vm) => vm.status === 'Running');
  const activeContainers = state.containers.filter((container) => container.status !== 'Crashed');
  const autoscaledRunning = runningVms.filter((vm) => vm.createdByAutoscaler).length;

  const podCount = new Set(
    activeContainers
      .filter((container) => container.pod)
      .map((container) => container.pod)
  ).size;

  const vmCompute = COST_RATES.vmBase + runningVms.length * COST_RATES.vmPerRunning;
  const containerCompute = activeContainers.length * COST_RATES.containerPerActive;
  const storage = runningVms.length * COST_RATES.storagePerRunningVm;
  const network = (runningVms.length + activeContainers.length) * COST_RATES.networkPerRunningUnit;
  const orchestration = podCount * COST_RATES.podPerGroup;
  const autoscalingPremium = autoscaledRunning * COST_RATES.autoscaledVmPremium;

  const overallEstimate = Number(
    (vmCompute + containerCompute + storage + network + orchestration + autoscalingPremium).toFixed(2)
  );

  const regionSummary = regions.map((region) => {
    const regionalVms = runningVms.filter((vm) => vm.region === region);
    const regionalContainers = activeContainers.filter((container) => container.region === region);
    const regionalPods = new Set(regionalContainers.map((container) => container.pod)).size;
    const regionalAutoscaled = regionalVms.filter((vm) => vm.createdByAutoscaler).length;
    const regionSnapshot = getRegionSnapshot(region);
    const monthlyEstimate = Number(
      (
        regionalVms.length * COST_RATES.vmPerRunning +
        regionalContainers.length * COST_RATES.containerPerActive +
        regionalVms.length * COST_RATES.storagePerRunningVm +
        (regionalVms.length + regionalContainers.length) * COST_RATES.networkPerRunningUnit +
        regionalPods * COST_RATES.podPerGroup +
        regionalAutoscaled * COST_RATES.autoscaledVmPremium +
        regionSnapshot.trafficPressure * 0.9
      ).toFixed(2)
    );

    return {
      region,
      monthlyEstimate,
      runningVms: regionalVms.length,
      autoscaledVms: regionalAutoscaled,
      activeContainers: regionalContainers.length,
      pods: regionalPods,
      trafficPressure: regionSnapshot.trafficPressure,
      averageCpu: regionSnapshot.averageCpu,
      averageMemory: regionSnapshot.averageMemory,
      status: regionSnapshot.trafficPressure > 78 ? 'Hot' : regionSnapshot.trafficPressure > 60 ? 'Warm' : 'Balanced'
    };
  });

  const baselineWithoutAutoscaled = Number((overallEstimate - autoscalingPremium).toFixed(2));
  const optimizationNote = autoscaledRunning > 0
    ? `Autoscaler currently runs ${autoscaledRunning} extra VM(s); cost should drop after scale-in.`
    : 'No temporary autoscaled VM cost right now.';

  return {
    regionSummary,
    overallEstimate,
    breakdown: {
      vmCompute: Number(vmCompute.toFixed(2)),
      containerCompute: Number(containerCompute.toFixed(2)),
      storage: Number(storage.toFixed(2)),
      network: Number(network.toFixed(2)),
      orchestration: Number(orchestration.toFixed(2)),
      autoscalingPremium: Number(autoscalingPremium.toFixed(2))
    },
    optimization: {
      baselineWithoutAutoscaled,
      autoscaledVmCount: autoscaledRunning,
      optimizationNote
    },
    autoscalingPolicy: getAutoscalingPolicy(),
    forecast: buildCostForecast(overallEstimate, autoscalingPremium)
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