import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

const userSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Viewer'], default: 'Viewer' }
  },
  { timestamps: true }
);

const vmSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), index: true },
    name: String,
    region: String,
    status: String,
    cpu: Number,
    memory: Number,
    disk: Number,
    spike: Boolean,
    createdByAutoscaler: Boolean
  },
  { timestamps: true }
);

const containerSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), index: true },
    name: String,
    pod: String,
    region: String,
    status: String,
    cpu: Number,
    memory: Number,
    restartCount: Number,
    createdByAutoscaler: Boolean
  },
  { timestamps: true }
);

const alertSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), index: true },
    source: String,
    metric: String,
    severity: String,
    value: Number,
    threshold: Number,
    message: String,
    acknowledged: Boolean
  },
  { timestamps: true }
);

const logSchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), index: true },
    serviceName: String,
    level: String,
    message: String,
    timestamp: String
  },
  { timestamps: true }
);

const historySchema = new mongoose.Schema(
  {
    id: { type: String, default: () => randomUUID(), index: true },
    timestamp: String,
    cpu: Number,
    memory: Number,
    network: Number
  },
  { timestamps: true }
);

const controlPlaneSchema = new mongoose.Schema(
  {
    id: { type: String, default: 'default', index: true },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
    timeline: { type: Array, default: [] }
  },
  { timestamps: true, minimize: false }
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Vm = mongoose.models.Vm || mongoose.model('Vm', vmSchema);
export const Container = mongoose.models.Container || mongoose.model('Container', containerSchema);
export const Alert = mongoose.models.Alert || mongoose.model('Alert', alertSchema);
export const LogEntry = mongoose.models.LogEntry || mongoose.model('LogEntry', logSchema);
export const HistoryPoint = mongoose.models.HistoryPoint || mongoose.model('HistoryPoint', historySchema);
export const ControlPlane = mongoose.models.ControlPlane || mongoose.model('ControlPlane', controlPlaneSchema);

export async function connectMongo(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is required to start the server with MongoDB Atlas.');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(uri);
  return mongoose.connection;
}

export async function disconnectMongo() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export async function seedFromState(state) {
  const counts = await Promise.all([
    User.estimatedDocumentCount(),
    Vm.estimatedDocumentCount(),
    Container.estimatedDocumentCount(),
    Alert.estimatedDocumentCount(),
    LogEntry.estimatedDocumentCount(),
    HistoryPoint.estimatedDocumentCount(),
    ControlPlane.estimatedDocumentCount()
  ]);

  if (counts[0] === 0 && state.users.length > 0) await User.insertMany(state.users);
  if (counts[1] === 0 && state.vms.length > 0) await Vm.insertMany(state.vms);
  if (counts[2] === 0 && state.containers.length > 0) await Container.insertMany(state.containers);
  if (counts[3] === 0 && state.alerts.length > 0) await Alert.insertMany(state.alerts);
  if (counts[4] === 0 && state.logs.length > 0) await LogEntry.insertMany(state.logs);
  if (counts[5] === 0 && state.history.length > 0) await HistoryPoint.insertMany(state.history);
  if (counts[6] === 0) await ControlPlane.create({ id: 'default', settings: state.settings, timeline: state.timeline || [] });
}

export async function replaceAllData(state) {
  await Promise.all([
    User.deleteMany({}),
    Vm.deleteMany({}),
    Container.deleteMany({}),
    Alert.deleteMany({}),
    LogEntry.deleteMany({}),
    HistoryPoint.deleteMany({}),
    ControlPlane.deleteMany({})
  ]);

  if (state.users.length > 0) await User.insertMany(state.users);
  if (state.vms.length > 0) await Vm.insertMany(state.vms);
  if (state.containers.length > 0) await Container.insertMany(state.containers);
  if (state.alerts.length > 0) await Alert.insertMany(state.alerts);
  if (state.logs.length > 0) await LogEntry.insertMany(state.logs);
  if (state.history.length > 0) await HistoryPoint.insertMany(state.history);
  await ControlPlane.create({ id: 'default', settings: state.settings, timeline: state.timeline || [] });
}

export async function loadStateFromMongo(state) {
  const [users, vms, containers, alerts, logs, history, controlPlane] = await Promise.all([
    User.find().lean(),
    Vm.find().lean(),
    Container.find().lean(),
    Alert.find().sort({ createdAt: -1 }).lean(),
    LogEntry.find().sort({ createdAt: -1 }).lean(),
    HistoryPoint.find().sort({ createdAt: 1 }).lean(),
    ControlPlane.findOne({ id: 'default' }).lean()
  ]);

  if (users.length > 0) state.users = users;
  if (vms.length > 0) state.vms = vms;
  if (containers.length > 0) state.containers = containers;
  state.alerts = alerts;
  state.logs = logs;
  state.history = history;
  if (controlPlane?.settings) state.settings = controlPlane.settings;
  if (Array.isArray(controlPlane?.timeline)) state.timeline = controlPlane.timeline;
  state.activeAlertKeys = new Set(state.alerts.map((alert) => `${alert.source}:${alert.metric}`));
}

export async function saveUser(user) {
  await User.updateOne({ id: user.id }, { $set: user }, { upsert: true });
}

export async function saveVm(vm) {
  await Vm.updateOne({ id: vm.id }, { $set: vm }, { upsert: true });
}

export async function saveContainer(container) {
  await Container.updateOne({ id: container.id }, { $set: container }, { upsert: true });
}

export async function saveAlert(alert) {
  await Alert.updateOne({ id: alert.id }, { $set: alert }, { upsert: true });
}

export async function clearAlertCollection() {
  await Alert.deleteMany({});
}

export async function saveLog(log) {
  await LogEntry.updateOne({ id: log.id }, { $set: log }, { upsert: true });
}

export async function saveHistoryPoint(point) {
  await HistoryPoint.updateOne({ id: point.id }, { $set: point }, { upsert: true });
}

export async function saveControlPlaneState(state) {
  await ControlPlane.updateOne(
    { id: 'default' },
    { $set: { id: 'default', settings: state.settings, timeline: state.timeline || [] } },
    { upsert: true }
  );
}

export async function persistState(state) {
  await Promise.all(state.users.map((item) => saveUser(item)));
  await Promise.all(state.vms.map((item) => saveVm(item)));
  await Promise.all(state.containers.map((item) => saveContainer(item)));
  await Promise.all(state.alerts.map((item) => saveAlert(item)));
  await Promise.all(state.logs.map((item) => saveLog(item)));
  await Promise.all(state.history.map((item) => saveHistoryPoint(item)));
  await saveControlPlaneState(state);
}
