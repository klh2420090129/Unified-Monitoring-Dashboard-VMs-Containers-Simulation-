import { useState } from 'react';

export function AdminOpsPanel({
  canManage,
  settings,
  onSaveSettings,
  onUndo,
  onRunScenario,
  onSendTestNotification
}) {
  const [thresholds, setThresholds] = useState(() => ({
    cpu: settings?.thresholds?.cpu ?? 85,
    memory: settings?.thresholds?.memory ?? 90
  }));
  const [notifications, setNotifications] = useState(() => ({
    email: settings?.notifications?.email ?? true,
    slack: settings?.notifications?.slack ?? false,
    teams: settings?.notifications?.teams ?? false,
    webhookUrl: settings?.notifications?.webhookUrl ?? ''
  }));

  function submitSettings() {
    onSaveSettings?.({ thresholds, notifications });
  }

  return (
    <div className="space-y-6">
      <div className="panel p-5">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Admin controls</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Thresholds and notification channels</h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <NumberField
            label="CPU alert threshold"
            value={thresholds.cpu}
            onChange={(value) => setThresholds((current) => ({ ...current, cpu: value }))}
          />
          <NumberField
            label="Memory alert threshold"
            value={thresholds.memory}
            onChange={(value) => setThresholds((current) => ({ ...current, memory: value }))}
          />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Toggle label="Email" checked={notifications.email} onChange={(checked) => setNotifications((current) => ({ ...current, email: checked }))} />
          <Toggle label="Slack" checked={notifications.slack} onChange={(checked) => setNotifications((current) => ({ ...current, slack: checked }))} />
          <Toggle label="Teams" checked={notifications.teams} onChange={(checked) => setNotifications((current) => ({ ...current, teams: checked }))} />
        </div>

        <input
          value={notifications.webhookUrl}
          onChange={(event) => setNotifications((current) => ({ ...current, webhookUrl: event.target.value }))}
          placeholder="Webhook URL (optional)"
          className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            disabled={!canManage}
            onClick={submitSettings}
            className="rounded-2xl bg-cloud-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Save Settings
          </button>
          <button
            disabled={!canManage}
            onClick={onUndo}
            className="rounded-2xl bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-700 disabled:opacity-40 dark:text-amber-200"
          >
            Undo Last Admin Action
          </button>
        </div>
      </div>

      <div className="panel p-5">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Scenario presets</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">One-click simulation drills</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          <ScenarioButton label="Run DDoS Scenario" action={() => onRunScenario?.('ddos')} canManage={canManage} />
          <ScenarioButton label="Run Memory Leak" action={() => onRunScenario?.('memory-leak')} canManage={canManage} />
          <ScenarioButton label="Run Region Outage" action={() => onRunScenario?.('region-outage')} canManage={canManage} />
          <ScenarioButton label="Run Recovery" action={() => onRunScenario?.('recovery')} canManage={canManage} />
        </div>
      </div>

      <div className="panel p-5">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Notification tests</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Send sample alerts to channels</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          <ScenarioButton label="Test Email" action={() => onSendTestNotification?.('email')} canManage={canManage} />
          <ScenarioButton label="Test Slack" action={() => onSendTestNotification?.('slack')} canManage={canManage} />
          <ScenarioButton label="Test Teams" action={() => onSendTestNotification?.('teams')} canManage={canManage} />
          <ScenarioButton label="Test Webhook" action={() => onSendTestNotification?.('webhook')} canManage={canManage} />
        </div>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="block rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950/60">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full bg-transparent font-semibold text-slate-950 outline-none dark:text-white"
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${checked ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200' : 'border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
    >
      {label}: {checked ? 'On' : 'Off'}
    </button>
  );
}

function ScenarioButton({ label, action, canManage }) {
  return (
    <button
      disabled={!canManage}
      onClick={action}
      className="rounded-2xl bg-slate-200/80 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200"
    >
      {label}
    </button>
  );
}
