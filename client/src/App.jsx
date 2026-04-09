import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { request } from './api';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { MetricCard } from './components/MetricCard';
import { ChartsPanel } from './components/ChartsPanel';
import { VmTable } from './components/VmTable';
import { ContainersPanel } from './components/ContainersPanel';
import { AlertsPanel } from './components/AlertsPanel';
import { LogsPanel } from './components/LogsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { AboutPanel } from './components/AboutPanel';
import { PredictionsPanel } from './components/PredictionsPanel';
import { CostAnalysisPanel } from './components/CostAnalysisPanel';
import { DependencyGraphPanel } from './components/DependencyGraphPanel';
import { AdminOpsPanel } from './components/AdminOpsPanel';
import { AuditTrailPanel } from './components/AuditTrailPanel';

const runtimeSocketBase =
  import.meta.env.VITE_API_URL?.trim() || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');

const socket = io(runtimeSocketBase, {
  autoConnect: false,
  path: '/socket.io'
});

const defaultOverview = {
  totalVmRunning: 0,
  totalContainersRunning: 0,
  averageCpuUsage: 0,
  averageMemoryUsage: 0,
  networkThroughput: 0,
  activeAlerts: 0,
  costEstimate: 0,
  autoscalingState: 'Stable'
};

const navItems = ['Dashboard', 'VMs', 'Containers', 'Alerts', 'Logs', 'Settings', 'Admin Ops', 'Audit', 'Cost Analysis', 'Architecture', 'About'];

export default function App() {
  const auth = useAuth();
  const [activeView, setActiveView] = useState('Dashboard');
  const [search, setSearch] = useState('');
  const [overview, setOverview] = useState(defaultOverview);
  const [history, setHistory] = useState([]);
  const [vms, setVms] = useState([]);
  const [containers, setContainers] = useState([]);
  const [pods, setPods] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [regions, setRegions] = useState([]);
  const [cost, setCost] = useState(null);
  const [autoscaling, setAutoscaling] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [adminSettings, setAdminSettings] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logLevel, setLogLevel] = useState('ALL');
  const [authMode, setAuthMode] = useState('login');
  const [message, setMessage] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(new Date());
  const [metricDeltas, setMetricDeltas] = useState({ cpu: 0, memory: 0, network: 0, alerts: 0 });
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Viewer' });
  const previousOverviewRef = useRef(defaultOverview);

  const canManage = auth.user?.role === 'Admin';
  const notifications = alerts.length + logs.filter((log) => log.level === 'ERROR').length;
  const systemStatus = getSystemStatus(overview, alerts.length);

  useEffect(() => {
    if (!auth.token) {
      setLoading(false);
      return;
    }

    let mounted = true;

    Promise.all([
      request('/api/dashboard/overview', { token: auth.token }),
      request('/api/vms', { token: auth.token }),
      request('/api/containers', { token: auth.token }),
      request('/api/alerts', { token: auth.token }),
      request('/api/history', { token: auth.token }),
      request('/api/logs', { token: auth.token }),
      request('/api/settings', { token: auth.token }),
      request('/api/cost', { token: auth.token }),
      request('/api/autoscaling', { token: auth.token }),
      request('/api/predictions', { token: auth.token }),
      canManage ? request('/api/admin/settings', { token: auth.token }) : Promise.resolve(null),
      canManage ? request('/api/audit', { token: auth.token }) : Promise.resolve({ auditLogs: [] })
    ])
      .then(([overviewPayload, vmsPayload, containersPayload, alertsPayload, historyPayload, logsPayload, settingsPayload, costPayload, autoscalingPayload, predictionsPayload, adminSettingsPayload, auditPayload]) => {
        if (!mounted) return;
        setOverview(overviewPayload.overview);
        setRegions(settingsPayload.regions);
        setPods(overviewPayload.pods || containersPayload.pods || []);
        setVms(vmsPayload.vms);
        setContainers(containersPayload.containers);
        setAlerts(alertsPayload.alerts);
        setHistory(historyPayload.history);
        setLogs(logsPayload.logs);
        setCost(costPayload);
        setAutoscaling(autoscalingPayload);
        setPredictions(predictionsPayload.predictions || []);
        setAdminSettings(adminSettingsPayload);
        setAuditLogs(auditPayload.auditLogs || []);
        setLastUpdatedAt(new Date());
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));

    socket.connect();
    socket.on('connect', () => setConnectionStatus('connected'));
    socket.on('disconnect', () => setConnectionStatus('disconnected'));
    socket.on('metrics:update', (payload) => {
      if (payload.overview) {
        setOverview(payload.overview);
        setLastUpdatedAt(new Date());
      }
      if (payload.history) {
        setHistory(payload.history);
        setLastUpdatedAt(new Date());
      }
      if (payload.scalingAction?.message) {
        setAutoscaling((current) => ({
          ...(current || {}),
          lastScalingAction: `${payload.scalingAction.message} just now`
        }));
        setMessage(`Autoscaler action: ${payload.scalingAction.message}`);
      }
    });
    socket.on('alerts:update', (incoming) => {
      setAlerts(incoming);
      setLastUpdatedAt(new Date());
    });
    socket.on('logs:update', (incoming) => {
      setLogs(incoming);
      setLastUpdatedAt(new Date());
    });

    const refreshTimer = setInterval(() => {
      Promise.all([
        request('/api/predictions', { token: auth.token }),
        request('/api/autoscaling', { token: auth.token }),
        request('/api/cost', { token: auth.token })
      ])
        .then(([predictionPayload, autoscalingPayload, costPayload]) => {
          if (mounted) {
            setPredictions(predictionPayload.predictions || []);
            setAutoscaling(autoscalingPayload);
            setCost(costPayload);
          }
        })
        .catch(() => {});
    }, 10000);

    return () => {
      mounted = false;
      socket.off('connect');
      socket.off('disconnect');
      socket.off('metrics:update');
      socket.off('alerts:update');
      socket.off('logs:update');
      clearInterval(refreshTimer);
      socket.disconnect();
    };
  }, [auth.token, canManage]);

  useEffect(() => {
    const previous = previousOverviewRef.current;
    setMetricDeltas({
      cpu: Number(((overview.averageCpuUsage ?? 0) - (previous.averageCpuUsage ?? 0)).toFixed(1)),
      memory: Number(((overview.averageMemoryUsage ?? 0) - (previous.averageMemoryUsage ?? 0)).toFixed(1)),
      network: Number(((overview.networkThroughput ?? 0) - (previous.networkThroughput ?? 0)).toFixed(1)),
      alerts: Number((alerts.length - (previous.activeAlerts ?? 0)).toFixed(0))
    });
    previousOverviewRef.current = { ...overview, activeAlerts: alerts.length };
  }, [overview, alerts.length]);

  const regionScopedVms = useMemo(
    () => (selectedRegion === 'ALL' ? vms : vms.filter((vm) => vm.region === selectedRegion)),
    [selectedRegion, vms]
  );

  const regionScopedContainers = useMemo(
    () => (selectedRegion === 'ALL' ? containers : containers.filter((container) => container.region === selectedRegion)),
    [selectedRegion, containers]
  );

  const scopedOverview = useMemo(() => {
    if (selectedRegion === 'ALL') {
      return overview;
    }

    const runningVms = regionScopedVms.filter((vm) => vm.status === 'Running');
    const vmCpu = runningVms.reduce((sum, vm) => sum + vm.cpu, 0);
    const vmMemory = runningVms.reduce((sum, vm) => sum + vm.memory, 0);
    const count = Math.max(runningVms.length, 1);

    return {
      ...overview,
      totalVmRunning: runningVms.length,
      totalContainersRunning: regionScopedContainers.filter((container) => container.status !== 'Crashed').length,
      averageCpuUsage: Number((vmCpu / count).toFixed(1)),
      averageMemoryUsage: Number((vmMemory / count).toFixed(1)),
      networkThroughput: Number((overview.networkThroughput * 0.55).toFixed(1)),
      activeAlerts: alerts.filter((alert) => `${alert.source} ${alert.message}`.toLowerCase().includes(selectedRegion.toLowerCase())).length
    };
  }, [selectedRegion, regionScopedVms, regionScopedContainers, overview, alerts]);

  const filteredVms = useMemo(
    () => regionScopedVms.filter((vm) => `${vm.name} ${vm.region} ${vm.status}`.toLowerCase().includes(search.toLowerCase())),
    [search, regionScopedVms]
  );
  const filteredContainers = useMemo(
    () => regionScopedContainers.filter((container) => `${container.name} ${container.pod} ${container.region} ${container.status}`.toLowerCase().includes(search.toLowerCase())),
    [search, regionScopedContainers]
  );
  const filteredLogs = useMemo(
    () => logs.filter((log) => (logLevel === 'ALL' ? true : log.level === logLevel)).filter((log) => `${log.serviceName} ${log.message}`.toLowerCase().includes(search.toLowerCase())),
    [search, logs, logLevel]
  );

  async function refreshCoreData() {
    const [overviewPayload, vmsPayload, containersPayload, alertsPayload, historyPayload, logsPayload, auditPayload, costPayload, autoscalingPayload] = await Promise.all([
      request('/api/dashboard/overview', { token: auth.token }),
      request('/api/vms', { token: auth.token }),
      request('/api/containers', { token: auth.token }),
      request('/api/alerts', { token: auth.token }),
      request('/api/history', { token: auth.token }),
      request('/api/logs', { token: auth.token }),
      canManage ? request('/api/audit', { token: auth.token }) : Promise.resolve({ auditLogs: [] }),
      request('/api/cost', { token: auth.token }),
      request('/api/autoscaling', { token: auth.token })
    ]);

    setOverview(overviewPayload.overview);
    setPods(overviewPayload.pods || containersPayload.pods || []);
    setVms(vmsPayload.vms);
    setContainers(containersPayload.containers);
    setAlerts(alertsPayload.alerts);
    setHistory(historyPayload.history);
    setLogs(logsPayload.logs);
    setAuditLogs(auditPayload.auditLogs || []);
    setCost(costPayload);
    setAutoscaling(autoscalingPayload);
    setLastUpdatedAt(new Date());
  }

  async function handleVmAction(id, action) {
    try {
      await request(`/api/vms/${id}/action`, {
        token: auth.token,
        method: 'POST',
        body: { action }
      });
      await refreshCoreData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleCreateVm(data) {
    try {
      await request('/api/vms', { token: auth.token, method: 'POST', body: data });
      await refreshCoreData();
      setMessage(`VM ${data.name} created.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleDeleteVm(id) {
    try {
      await request(`/api/vms/${id}`, { token: auth.token, method: 'DELETE' });
      await refreshCoreData();
      setMessage('VM deleted.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleCreateContainer(data) {
    try {
      await request('/api/containers', { token: auth.token, method: 'POST', body: data });
      await refreshCoreData();
      setMessage(`Container ${data.name} created.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleContainerAction(id, action) {
    try {
      await request(`/api/containers/${id}/action`, {
        token: auth.token,
        method: 'POST',
        body: { action }
      });
      await refreshCoreData();
      setMessage(`Container ${action} action completed.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleDeleteContainer(id) {
    try {
      await request(`/api/containers/${id}`, { token: auth.token, method: 'DELETE' });
      await refreshCoreData();
      setMessage('Container deleted.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleCreatePod(data) {
    try {
      await request('/api/pods', { token: auth.token, method: 'POST', body: data });
      await refreshCoreData();
      setMessage(`Pod ${data.pod} created.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleScalePod(pod, delta) {
    try {
      await request(`/api/pods/${encodeURIComponent(pod)}/scale`, {
        token: auth.token,
        method: 'POST',
        body: { delta }
      });
      await refreshCoreData();
      setMessage(`Pod ${pod} scaled ${delta > 0 ? 'out' : 'in'}.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleDeletePod(pod) {
    try {
      await request(`/api/pods/${encodeURIComponent(pod)}`, { token: auth.token, method: 'DELETE' });
      await refreshCoreData();
      setMessage(`Pod ${pod} deleted.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleSaveAdminSettings(payload) {
    try {
      const updated = await request('/api/admin/settings', {
        token: auth.token,
        method: 'PUT',
        body: payload
      });
      setAdminSettings(updated);
      await refreshCoreData();
      setMessage('Admin settings updated.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleUndoAdminAction() {
    try {
      const payload = await request('/api/admin/undo', { token: auth.token, method: 'POST' });
      await refreshCoreData();
      setMessage(payload.message || 'Undo completed.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleRunScenario(name) {
    try {
      await request(`/api/scenarios/${name}/run`, {
        token: auth.token,
        method: 'POST'
      });
      await refreshCoreData();
      setMessage(`Scenario ${name} executed.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleSendTestNotification(channel) {
    try {
      const payload = await request('/api/notifications/test', {
        token: auth.token,
        method: 'POST',
        body: { channel }
      });
      await refreshCoreData();
      setMessage(payload.sent ? `Test ${channel} notification sent.` : `${channel} channel is not configured.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleClearAlerts() {
    try {
      const payload = await request('/api/alerts', { token: auth.token, method: 'DELETE' });
      setAlerts(payload.alerts);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleIncident(action) {
    try {
      const payload = await request('/api/simulate/incident', {
        token: auth.token,
        method: 'POST',
        body: { action }
      });
      setOverview(payload.overview || overview);
      setAlerts(payload.alerts || alerts);
      setHistory(payload.history || history);
      setLogs(payload.logs || logs);
      const predictionPayload = await request('/api/predictions', { token: auth.token });
      setPredictions(predictionPayload.predictions || []);
      setLastUpdatedAt(new Date());
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleAutoscalingToggle(nextEnabled) {
    try {
      const payload = await request('/api/autoscaling', {
        token: auth.token,
        method: 'POST',
        body: { enabled: nextEnabled }
      });
      setAutoscaling(payload);
      setMessage(`Autoscaling ${payload.enabled ? 'enabled' : 'disabled'} successfully.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleRunDemoSimulation() {
    if (!canManage) return;

    try {
      setMessage('Running incident simulation: spike, scale, recover...');
      await request('/api/autoscaling', {
        token: auth.token,
        method: 'POST',
        body: { enabled: true }
      });

      const spikePayload = await request('/api/simulate/incident', {
        token: auth.token,
        method: 'POST',
        body: { action: 'start' }
      });
      setOverview(spikePayload.overview || overview);
      setAlerts(spikePayload.alerts || alerts);
      setHistory(spikePayload.history || history);
      setLogs(spikePayload.logs || logs);

      await sleep(2500);

      const livePredictions = await request('/api/predictions', { token: auth.token });
      setPredictions(livePredictions.predictions || []);

      await sleep(2500);

      const recoveryPayload = await request('/api/simulate/incident', {
        token: auth.token,
        method: 'POST',
        body: { action: 'resolve' }
      });
      setOverview(recoveryPayload.overview || overview);
      setAlerts(recoveryPayload.alerts || alerts);
      setHistory(recoveryPayload.history || history);
      setLogs(recoveryPayload.logs || logs);

      const refreshedPredictionPayload = await request('/api/predictions', { token: auth.token });
      setPredictions(refreshedPredictionPayload.predictions || []);
      setMessage('Demo simulation completed: spike, alerting, scaling, and recovery are now visible.');
      setLastUpdatedAt(new Date());
    } catch (error) {
      setMessage(error.message);
    }
  }

  function exportCsv(kind) {
    const rows = kind === 'alerts'
      ? alerts.map((item) => ({
        timestamp: item.timestamp,
        source: item.source,
        severity: item.severity,
        metric: item.metric,
        value: item.value,
        threshold: item.threshold,
        message: item.message
      }))
      : logs.map((item) => ({
        timestamp: item.timestamp,
        service: item.serviceName,
        level: item.level,
        message: item.message
      }));

    if (rows.length === 0) {
      setMessage(`No ${kind} data to export.`);
      return;
    }

    const headers = Object.keys(rows[0]);
    const csvBody = rows
      .map((row) => headers.map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const csv = `${headers.join(',')}\n${csvBody}`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${kind}-${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setMessage('');

    try {
      if (authMode === 'login') {
        await auth.signIn({ email: form.email, password: form.password });
      } else {
        await auth.signUp(form);
      }
    } catch (error) {
      setMessage(error.message);
    }
  }

  if (!auth.token || !auth.user) {
    return (
      <AuthScreen
        authMode={authMode}
        setAuthMode={setAuthMode}
        form={form}
        setForm={setForm}
        onSubmit={handleAuthSubmit}
        message={message}
      />
    );
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Layout
      sidebar={
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          overview={overview}
          user={auth.user}
          pods={pods}
          regions={regions}
          onSignOut={auth.signOut}
        />
      }
      topbar={
        <Topbar
          search={search}
          setSearch={setSearch}
          overview={scopedOverview}
          alertsCount={alerts.length}
          notifications={notifications}
          user={auth.user}
          selectedRegion={selectedRegion}
          setSelectedRegion={setSelectedRegion}
          regions={regions}
          connectionStatus={connectionStatus}
          lastUpdatedAt={lastUpdatedAt}
          canManage={canManage}
          onIncident={handleIncident}
          onRunDemo={handleRunDemoSimulation}
          systemStatus={systemStatus}
        />
      }
    >
      {message && <div className="mb-4 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">{message}</div>}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {navItems.map((item) => (
          <button
            key={item}
            onClick={() => setActiveView(item)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap ${activeView === item ? 'bg-cloud-600 text-white' : 'bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            {item}
          </button>
        ))}
      </div>

      {(activeView === 'Dashboard' || activeView === 'VMs' || activeView === 'Containers') && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Average CPU" value={`${scopedOverview.averageCpuUsage ?? 0}%`} detail={`${trend(metricDeltas.cpu)} from last sample`} status={scopedOverview.averageCpuUsage > 85 ? 'critical' : scopedOverview.averageCpuUsage > 65 ? 'warning' : 'healthy'} />
          <MetricCard label="Average Memory" value={`${scopedOverview.averageMemoryUsage ?? 0}%`} detail={`${trend(metricDeltas.memory)} from last sample`} status={scopedOverview.averageMemoryUsage > 90 ? 'critical' : scopedOverview.averageMemoryUsage > 70 ? 'warning' : 'healthy'} />
          <MetricCard label="Network Throughput" value={`${scopedOverview.networkThroughput ?? 0} Mbps`} detail={`${trend(metricDeltas.network)} from last sample`} status="healthy" />
          <MetricCard label="Alerts Summary" value={alerts.length} detail={`${trend(metricDeltas.alerts)} | ${scopedOverview.autoscalingState}`} status={alerts.length > 0 ? 'warning' : 'healthy'} />
        </div>
      )}

      {activeView === 'Dashboard' && (
        <div className="mt-4 space-y-4">
          <ChartsPanel history={history} />
          <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
            <VmTable
              vms={filteredVms}
              onAction={handleVmAction}
              onCreateVm={handleCreateVm}
              onDeleteVm={handleDeleteVm}
              canManage={canManage}
            />
            <div className="space-y-4">
              <AlertsPanel alerts={alerts} onClear={handleClearAlerts} canManage={canManage} />
              <PredictionsPanel predictions={predictions} />
              <div className="panel p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Cloud summary</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <SummaryTile label="Cost estimate" value={`$${cost?.overallEstimate ?? scopedOverview.costEstimate ?? 0}/mo`} />
                  <SummaryTile label="Scaling" value={autoscaling?.state ?? scopedOverview.autoscalingState} />
                  <SummaryTile label="Regions" value={regions.length} />
                  <SummaryTile label="Pods" value={pods.length} />
                </div>
                <div className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm">
                  <p className="text-xs uppercase tracking-[0.3em] text-sky-700 dark:text-sky-300">Prediction (next 5 min)</p>
                  <p className="mt-2 text-slate-900 dark:text-slate-100">CPU forecast: <span className="font-semibold">{predict(history, 'cpu')}%</span></p>
                  <p className="text-slate-900 dark:text-slate-100">Memory forecast: <span className="font-semibold">{predict(history, 'memory')}%</span></p>
                </div>
              </div>
            </div>
          </div>
          <DependencyGraphPanel />
        </div>
      )}

      {activeView === 'VMs' && (
        <div className="mt-4">
          <VmTable
            vms={filteredVms}
            onAction={handleVmAction}
            onCreateVm={handleCreateVm}
            onDeleteVm={handleDeleteVm}
            canManage={canManage}
          />
        </div>
      )}
      {activeView === 'Containers' && (
        <ContainersPanel
          containers={filteredContainers}
          pods={pods}
          canManage={canManage}
          onCreateContainer={handleCreateContainer}
          onContainerAction={handleContainerAction}
          onDeleteContainer={handleDeleteContainer}
          onCreatePod={handleCreatePod}
          onScalePod={handleScalePod}
          onDeletePod={handleDeletePod}
        />
      )}
      {activeView === 'Alerts' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => exportCsv('alerts')} className="rounded-2xl bg-slate-200/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Export Alerts CSV
            </button>
          </div>
          <AlertsPanel alerts={alerts} onClear={handleClearAlerts} canManage={canManage} />
        </div>
      )}
      {activeView === 'Logs' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => exportCsv('logs')} className="rounded-2xl bg-slate-200/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Export Logs CSV
            </button>
          </div>
          <LogsPanel logs={filteredLogs} level={logLevel} setLevel={setLogLevel} />
        </div>
      )}
      {activeView === 'Settings' && (
        <SettingsPanel
          overview={overview}
          pods={pods}
          regions={regions}
          cost={cost}
          autoscaling={autoscaling}
          canManage={canManage}
          onToggleAutoscaling={handleAutoscalingToggle}
        />
      )}
      {activeView === 'Cost Analysis' && <CostAnalysisPanel cost={cost} vms={vms} containers={containers} />}
      {activeView === 'Admin Ops' && (
        <AdminOpsPanel
          canManage={canManage}
          settings={adminSettings}
          onSaveSettings={handleSaveAdminSettings}
          onUndo={handleUndoAdminAction}
          onRunScenario={handleRunScenario}
          onSendTestNotification={handleSendTestNotification}
        />
      )}
      {activeView === 'Audit' && <AuditTrailPanel logs={auditLogs} />}
      {activeView === 'Architecture' && <DependencyGraphPanel />}
      {activeView === 'About' && <AboutPanel />}
    </Layout>
  );
}

function trend(value) {
  if (value > 0) return `Up ${value}`;
  if (value < 0) return `Down ${Math.abs(value)}`;
  return 'No change';
}

function predict(history, metric) {
  if (!history || history.length < 3) return 0;
  const recent = history.slice(-6);
  const first = Number(recent[0]?.[metric] ?? 0);
  const last = Number(recent[recent.length - 1]?.[metric] ?? 0);
  const slope = (last - first) / Math.max(recent.length - 1, 1);
  return Math.max(0, Math.min(100, Number((last + slope * 5).toFixed(1))));
}

function SummaryTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="panel max-w-md p-8 text-center">
        <div className="mx-auto mb-5 h-12 w-12 animate-pulse rounded-2xl bg-cloud-500/20" />
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Loading telemetry dashboard</h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Connecting to the simulation stream and fetching infrastructure data.</p>
      </div>
    </div>
  );
}

function AuthScreen({ authMode, setAuthMode, form, setForm, onSubmit, message }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex flex-col justify-between p-6 sm:p-10">
        <div className="max-w-2xl">
          <div className="inline-flex items-center rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
            Unified Monitoring Dashboard
          </div>
          <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-tight text-slate-950 dark:text-white sm:text-5xl">
            Professional cloud observability for VMs and container fleets.
          </h1>
          <p className="mt-5 max-w-xl text-base text-slate-600 dark:text-slate-400">
            Monitor infrastructure health, watch real-time metrics, clear alerts, inspect logs, and simulate deployments in a UI styled for cloud operations teams.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ['Realtime streams', 'Socket.io updates every 2-3 seconds'],
              ['Role support', 'Admin and Viewer access control'],
              ['Deployment ready', 'Docker Compose plus container images']
            ].map(([title, text]) => (
              <div key={title} className="panel p-4">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="panel p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Demo admin</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">admin@example.com / admin123!</p>
          </div>
          <div className="panel p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Viewer mode</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Create a viewer account to explore read-only mode.</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="panel w-full max-w-md p-6 sm:p-8">
          <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
            <button onClick={() => setAuthMode('login')} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold ${authMode === 'login' ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
              Login
            </button>
            <button onClick={() => setAuthMode('signup')} className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold ${authMode === 'signup' ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
              Sign up
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {authMode === 'signup' && (
              <Input label="Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
            )}
            <Input label="Email" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
            <Input label="Password" type="password" value={form.password} onChange={(value) => setForm((current) => ({ ...current, password: value }))} />
            {authMode === 'signup' && (
              <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-cloud-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                <option value="Viewer">Viewer</option>
                <option value="Admin">Admin</option>
              </select>
            )}
            {message && <div className="rounded-2xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{message}</div>}
            <button type="submit" className="w-full rounded-2xl bg-cloud-600 px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-cloud-700">
              {authMode === 'login' ? 'Enter dashboard' : 'Create account'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-cloud-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </label>
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSystemStatus(overview, alertCount) {
  if (alertCount > 6 || (overview.averageCpuUsage ?? 0) > 90 || (overview.averageMemoryUsage ?? 0) > 92) {
    return { label: 'Critical', tone: 'critical' };
  }

  if (alertCount > 0 || (overview.averageCpuUsage ?? 0) > 70 || (overview.averageMemoryUsage ?? 0) > 75) {
    return { label: 'Under Load', tone: 'warning' };
  }

  return { label: 'System Healthy', tone: 'healthy' };
}