import nodemailer from 'nodemailer';
import { config } from './config';
import type { CheckResult, CheckState, Severity } from './types';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: false,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

// State tracking for each check
const checkStates: Record<string, CheckState> = {};
const alertLog: Array<{ id: string; checkId: string; checkName: string; severity: Severity; subject: string; timestamp: string; type: 'FAILURE' | 'RECOVERY'; emailStatus: 'queued' | 'sent' | 'partial' | 'failed' }> = [];

export function getCheckStates(): Record<string, CheckState> {
  return checkStates;
}

export function getAlertLog() {
  return alertLog;
}

type EmailSendStatus = {
  status: 'idle' | 'queued' | 'sent' | 'partial' | 'failed';
  accepted: string[];
  rejected: string[];
  subject: string;
  sentAt: string | null;
};

let lastEmailStatus: EmailSendStatus = {
  status: 'idle', accepted: [], rejected: [], subject: '', sentAt: null,
};

export function getEmailSendStatus(): EmailSendStatus {
  return lastEmailStatus;
}

// Alert only after this many consecutive confirmed failures (each already survived HTTP retries)
// Set to 1 to alert on the first confirmed failure.
const FAILURE_THRESHOLD_BEFORE_ALERT = 1;

/**
 * Process check results and send alerts on state transitions.
 * Strategy:
 *  - 1st failure  → show WARNING on dashboard, no email (could be transient)
 *  - 2nd+ failure → escalate to DOWN, send email
 *  - Recovery     → send email only if it was previously alerted (was truly DOWN)
 */
export async function processResults(results: CheckResult[]): Promise<void> {
  const combinedAlerts: Array<{ result: CheckResult; type: 'FAILURE' | 'RECOVERY' }> = [];

  for (const result of results) {
    const prevState = checkStates[result.id];
    const now = new Date().toISOString();

    if (!prevState) {
      // First time seeing this check -initialize state
      const newState: CheckState = {
        id: result.id,
        currentStatus: result.status,
        previousStatus: 'UNKNOWN',
        lastChange: now,
        lastChecked: now,
        consecutiveFailures: result.status === 'DOWN' ? 1 : 0,
        lastAlertSent: null,
      };
      checkStates[result.id] = newState;

      // BUG FIX: Don't just `continue` -alert immediately if DOWN on first sight
      if (result.status === 'DOWN') {
        if (FAILURE_THRESHOLD_BEFORE_ALERT > 1) {
          // Dampen to WARNING, hold off alerting
          result.status = 'WARNING';
          result.message = `[1st failure -watching] ${result.message}`;
          newState.currentStatus = 'WARNING';
        } else if (result.severity === 'CRITICAL') {
          // Threshold = 1: alert right away on first confirmed DOWN
          combinedAlerts.push({ result, type: 'FAILURE' });
          newState.lastAlertSent = now;
        }
      }
      continue;
    }

    // Update state
    prevState.previousStatus = prevState.currentStatus;
    prevState.lastChecked = now;

    if (result.status === 'DOWN') {
      prevState.consecutiveFailures++;
    } else {
      prevState.consecutiveFailures = 0;
    }

    // ── Status Dampening ──────────────────────────────────────
    if (result.status === 'DOWN' && prevState.consecutiveFailures < FAILURE_THRESHOLD_BEFORE_ALERT) {
      result.status = 'WARNING';
      result.message = `[Failure ${prevState.consecutiveFailures}/${FAILURE_THRESHOLD_BEFORE_ALERT} -watching] ${result.message}`;
    }

    prevState.currentStatus = result.status;

    // ── State Transition: UP→DOWN or WARNING→DOWN ─────────────
    if (prevState.previousStatus !== result.status) {
      prevState.lastChange = now;

      if (result.status === 'DOWN') {
        if (canSendAlert(prevState) && result.severity === 'CRITICAL') {
          combinedAlerts.push({ result, type: 'FAILURE' });
          prevState.lastAlertSent = now;
        }
      }

      if (result.status === 'UP' && prevState.previousStatus === 'DOWN') {
        if (canSendAlert(prevState) && result.severity === 'CRITICAL') {
          combinedAlerts.push({ result, type: 'RECOVERY' });
          prevState.lastAlertSent = now;
        }
      }
    }

    // ── BUG FIX: Persistent DOWN that was never alerted ───────
    // Catches: service was DOWN in cycle 1 (init, no alert), still DOWN in cycle 2+.
    // Since there's no transition, the block above is skipped -so we catch it here.
    if (
      result.status === 'DOWN' &&
      result.severity === 'CRITICAL' &&
      prevState.lastAlertSent === null &&
      canSendAlert(prevState)
    ) {
      combinedAlerts.push({ result, type: 'FAILURE' });
      prevState.lastAlertSent = now;
    }
  }

  if (combinedAlerts.length > 0) {
    await sendCombinedAlerts(combinedAlerts);
  }
}

function canSendAlert(state: CheckState): boolean {
  if (!state.lastAlertSent) return true;
  const elapsed = Date.now() - new Date(state.lastAlertSent).getTime();
  return elapsed > config.alertCooldownMs;
}

async function sendAlert(result: CheckResult, type: 'FAILURE' | 'RECOVERY'): Promise<void> {
  // Legacy method. Not strictly used for emails now, but we keep the alertLog logic in the new sendCombinedAlerts.
}

async function sendCombinedAlerts(alerts: Array<{ result: CheckResult; type: 'FAILURE' | 'RECOVERY' }>): Promise<void> {
  const failureCount = alerts.filter(a => a.type === 'FAILURE').length;
  const recoveryCount = alerts.filter(a => a.type === 'RECOVERY').length;

  let mainEmoji = '🔴';
  if (failureCount === 0 && recoveryCount > 0) mainEmoji = '🟢';
  else if (failureCount > 0 && recoveryCount > 0) mainEmoji = '🟡';

  const subject = `${mainEmoji} SwarajDesk Monitor: ${failureCount} Failures, ${recoveryCount} Recoveries`;

  let rowsHtml = alerts.map(({ result, type }) => {
    const emoji = type === 'FAILURE' ? '🔴' : '🟢';
    const severityEmoji = { CRITICAL: '🔴', WARNING: '🟡', NOTICE: '🟠' }[result.severity] || '⚪';
    return `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 8px;">${emoji} ${type}</td>
        <td style="padding: 8px;"><b>${result.name}</b></td>
        <td style="padding: 8px;">${result.status}</td>
        <td style="padding: 8px;">${severityEmoji} ${result.severity}</td>
        <td style="padding: 8px;">${result.message}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <div style="font-family: sans-serif; max-width: 800px;">
      <h2>${mainEmoji} SwarajDesk Monitor Alert</h2>
      <p>There have been <b>${alerts.length}</b> total state change(s) in the latest health check cycle.</p>
      <table style="border-collapse: collapse; width: 100%; text-align: left;">
        <thead>
          <tr style="background-color: #f7f7f7; border-bottom: 2px solid #ddd;">
            <th style="padding: 8px;">Type</th>
            <th style="padding: 8px;">Check</th>
            <th style="padding: 8px;">Status</th>
            <th style="padding: 8px;">Severity</th>
            <th style="padding: 8px;">Message</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;

  lastEmailStatus = { status: 'queued', accepted: [], rejected: [], subject, sentAt: null };
  let emailStatus: 'sent' | 'partial' | 'failed' = 'failed';
  try {
    const info = await transporter.sendMail({
      from: `"SwarajDesk Monitor" <${config.smtp.user}>`,
      to: config.alertTo,
      subject,
      html,
    });
    const accepted: string[] = Array.isArray(info.accepted)
      ? (info.accepted as string[])
      : config.alertTo.split(',').map(s => s.trim());
    const rejected: string[] = Array.isArray(info.rejected) ? (info.rejected as string[]) : [];
    emailStatus = accepted.length === 0 ? 'failed' : rejected.length > 0 ? 'partial' : 'sent';
    lastEmailStatus = { status: emailStatus, accepted, rejected, subject, sentAt: new Date().toISOString() };
    console.log(`📧 Combined Alert sent: ${subject} (✅ ${accepted.length} accepted, ❌ ${rejected.length} rejected)`);
  } catch (err: any) {
    lastEmailStatus = { status: 'failed', accepted: [], rejected: [], subject, sentAt: new Date().toISOString() };
    console.error(`❌ Failed to send combined alert: ${err.message}`);
  }

  // Update alert log
  for (const { result, type } of alerts) {
    alertLog.push({
      id: `alert-${Date.now()}-${result.id}`,
      checkId: result.id,
      checkName: result.name,
      severity: result.severity,
      subject: `${type === 'FAILURE' ? '🔴' : '🟢'} [${type}] ${result.name} -${result.status}`,
      timestamp: result.timestamp,
      type,
      emailStatus,
    });
  }

  // Keep only last 500 alerts (rough limit because we insert multiple at once)
  if (alertLog.length > 500) alertLog.splice(0, alertLog.length - 500);
}

/**
 * Manually trigger an alert email for all currently DOWN/WARNING checks.
 * Called from the dashboard "Send Alert" button.
 */
export async function sendManualAlert(results: CheckResult[]): Promise<{ sent: number }> {
  const targets = results.filter(r => r.status === 'DOWN' || r.status === 'WARNING');
  if (targets.length === 0) return { sent: 0 };
  const alerts = targets.map(result => ({ result, type: 'FAILURE' as const }));
  await sendCombinedAlerts(alerts);
  return { sent: targets.length };
}
