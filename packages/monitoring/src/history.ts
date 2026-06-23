import * as fs from 'fs';
import * as path from 'path';
import type { CheckResult, HistoryEntry, IncidentRecord } from './types';

const DATA_DIR = path.join(__dirname, '..', 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const INCIDENTS_FILE = path.join(DATA_DIR, 'incidents.json');

// In-memory buffers
let historyBuffer: HistoryEntry[] = [];
let incidentBuffer: IncidentRecord[] = [];

// Previous statuses for incident detection
const previousStatuses: Record<string, string> = {};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function initHistory() {
  ensureDataDir();
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      historyBuffer = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    }
  } catch { historyBuffer = []; }
  try {
    if (fs.existsSync(INCIDENTS_FILE)) {
      incidentBuffer = JSON.parse(fs.readFileSync(INCIDENTS_FILE, 'utf-8'));
    }
  } catch { incidentBuffer = []; }
}

export function recordResults(results: CheckResult[]) {
  const now = new Date().toISOString();

  for (const r of results) {
    // History
    historyBuffer.push({
      checkId: r.id,
      status: r.status,
      responseTimeMs: r.responseTimeMs,
      timestamp: r.timestamp,
    });

    // Incidents (state transitions)
    const prev = previousStatuses[r.id];
    if (prev && prev !== r.status) {
      incidentBuffer.push({
        id: `inc-${Date.now()}-${r.id}`,
        checkId: r.id,
        checkName: r.name,
        group: r.group,
        from: prev as any,
        to: r.status,
        timestamp: now,
        message: r.message,
      });
    }
    previousStatuses[r.id] = r.status;
  }

  // Trim history to last 24h
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  historyBuffer = historyBuffer.filter(
    (h) => new Date(h.timestamp).getTime() > cutoff
  );

  // Trim incidents to last 1000
  if (incidentBuffer.length > 1000) {
    incidentBuffer = incidentBuffer.slice(-1000);
  }

  // Persist
  ensureDataDir();
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyBuffer));
    fs.writeFileSync(INCIDENTS_FILE, JSON.stringify(incidentBuffer));
  } catch (err) {
    console.error('Failed to persist history:', err);
  }
}

export function getHistory(hours: number = 24): HistoryEntry[] {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return historyBuffer.filter(
    (h) => new Date(h.timestamp).getTime() > cutoff
  );
}

export function getIncidents(): IncidentRecord[] {
  return incidentBuffer;
}
