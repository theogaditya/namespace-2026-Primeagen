import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { getLatestResults, getLastRunTime, runAllChecks } from './scheduler';
import { getCheckStates, getAlertLog, sendManualAlert, getEmailSendStatus } from './alerter';
import { getHistory, getIncidents } from './history';
import { getCachedLogs } from './checkers/ec2LogChecker';
import { getCheckLog, getRunLogFiles, getRunLog } from './runLogger';

export function startDashboard() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // ── API Routes ──────────────────────────────────────────────────────

  // Current status of all checks
  app.get('/api/status', (_req, res) => {
    const results = getLatestResults();
    const states = getCheckStates();
    const summary = {
      total: results.length,
      up: results.filter((r) => r.status === 'UP').length,
      down: results.filter((r) => r.status === 'DOWN').length,
      warning: results.filter((r) => r.status === 'WARNING').length,
      unknown: results.filter((r) => r.status === 'UNKNOWN').length,
      lastRun: getLastRunTime(),
    };
    res.json({ checks: results, states, summary });
  });

  // Historical data
  app.get('/api/history', (req, res) => {
    const hours = parseInt(req.query.hours as string) || 24;
    res.json(getHistory(hours));
  });

  // Incidents
  app.get('/api/incidents', (_req, res) => {
    res.json(getIncidents());
  });

  // Alert log
  app.get('/api/alerts', (_req, res) => {
    res.json(getAlertLog());
  });

  // EC2 Logs
  app.get('/api/logs', (_req, res) => {
    res.json(getCachedLogs());
  });

  // Per-check log from latest run (used by dashboard modal)
  app.get('/api/check-log/:checkId', (req, res) => {
    const log = getCheckLog(req.params.checkId);
    if (!log) return res.status(404).json({ error: 'No log found for this check' });
    res.json(log);
  });

  // List all run log files
  app.get('/api/run-logs', (_req, res) => {
    res.json(getRunLogFiles());
  });

  // Fetch a specific run log by filename
  app.get('/api/run-logs/:filename', (req, res) => {
    const log = getRunLog(req.params.filename);
    if (!log) return res.status(404).json({ error: 'Log file not found' });
    res.json(log);
  });

  // Email send status (for dashboard banner)
  app.get('/api/email-status', (_req, res) => {
    res.json(getEmailSendStatus());
  });

  // Trigger manual alert email for all DOWN/WARNING checks
  app.post('/api/alert/send', async (_req, res) => {
    try {
      const results = getLatestResults();
      const { sent } = await sendManualAlert(results);
      res.json({ success: true, sent });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Trigger manual check
  app.post('/api/check/run', async (_req, res) => {
    try {
      const results = await runAllChecks();
      res.json({ success: true, count: results.length });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Export CSV
  app.get('/api/export/csv', (req, res) => {
    const hours = parseInt(req.query.hours as string) || 24;
    const history = getHistory(hours);

    const header = 'checkId,status,responseTimeMs,timestamp\n';
    const rows = history
      .map((h) => `${h.checkId},${h.status},${h.responseTimeMs},${h.timestamp}`)
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=monitoring-history.csv');
    res.send(header + rows);
  });

  // Serve dashboard
  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  app.listen(config.dashboardPort, () => {
    console.log(`📊 Dashboard running at http://localhost:${config.dashboardPort}`);
  });
}
