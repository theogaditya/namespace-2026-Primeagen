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
const alertLog: Array<{ id: string; checkId: string; checkName: string; severity: Severity; subject: string; timestamp: string; type: 'FAILURE' | 'RECOVERY' }> = [];

export function getCheckStates(): Record<string, CheckState> {
  return checkStates;
}

export function getAlertLog() {
  return alertLog;
}

/**
 * Process check results and send alerts on state transitions.
 */
export async function processResults(results: CheckResult[]): Promise<void> {
  for (const result of results) {
    const prevState = checkStates[result.id];
    const now = new Date().toISOString();

    if (!prevState) {
      // First time seeing this check
      checkStates[result.id] = {
        id: result.id,
        currentStatus: result.status,
        previousStatus: 'UNKNOWN',
        lastChange: now,
        lastChecked: now,
        consecutiveFailures: result.status === 'DOWN' ? 1 : 0,
        lastAlertSent: null,
      };
      // Send alert if first check is already DOWN
      if (result.status === 'DOWN') {
        await sendAlert(result, 'FAILURE');
      }
      continue;
    }

    // Update state
    prevState.previousStatus = prevState.currentStatus;
    prevState.currentStatus = result.status;
    prevState.lastChecked = now;

    if (result.status === 'DOWN') {
      prevState.consecutiveFailures++;
    } else {
      prevState.consecutiveFailures = 0;
    }

    // Check for state transition
    if (prevState.previousStatus !== result.status) {
      prevState.lastChange = now;

      // UP → DOWN: failure alert
      if (result.status === 'DOWN' && prevState.previousStatus !== 'UNKNOWN') {
        if (canSendAlert(prevState) && (result.severity === 'CRITICAL' || result.severity === 'WARNING')) {
          // Only send email for CRITICAL failures, not ordinary warnings (user request)
          if (result.severity === 'CRITICAL') {
            await sendAlert(result, 'FAILURE');
          }
          prevState.lastAlertSent = now;
        }
      }

      // DOWN → UP: recovery alert
      if (result.status === 'UP' && prevState.previousStatus === 'DOWN') {
        if (canSendAlert(prevState)) {
          // Send recovery email only if it was a CRITICAL failure
          if (result.severity === 'CRITICAL') {
            await sendAlert(result, 'RECOVERY');
          }
          prevState.lastAlertSent = now;
        }
      }
    }
  }
}

function canSendAlert(state: CheckState): boolean {
  if (!state.lastAlertSent) return true;
  const elapsed = Date.now() - new Date(state.lastAlertSent).getTime();
  return elapsed > config.alertCooldownMs;
}

async function sendAlert(result: CheckResult, type: 'FAILURE' | 'RECOVERY'): Promise<void> {
  const emoji = type === 'FAILURE' ? '🔴' : '🟢';
  const severityEmoji = { CRITICAL: '🔴', WARNING: '🟡', NOTICE: '🟠' }[result.severity];
  const subject = `${emoji} [${type}] ${result.name} — ${result.status}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px;">
      <h2>${emoji} SwarajDesk Monitor Alert</h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Check</td><td style="padding: 8px; border: 1px solid #ddd;">${result.name}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Status</td><td style="padding: 8px; border: 1px solid #ddd;">${result.status}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Type</td><td style="padding: 8px; border: 1px solid #ddd;">${type}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Severity</td><td style="padding: 8px; border: 1px solid #ddd;">${severityEmoji} ${result.severity}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Message</td><td style="padding: 8px; border: 1px solid #ddd;">${result.message}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Response Time</td><td style="padding: 8px; border: 1px solid #ddd;">${result.responseTimeMs}ms</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Group</td><td style="padding: 8px; border: 1px solid #ddd;">${result.group}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Timestamp</td><td style="padding: 8px; border: 1px solid #ddd;">${result.timestamp}</td></tr>
      </table>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"SwarajDesk Monitor" <${config.smtp.user}>`,
      to: config.alertTo,
      subject,
      html,
    });
    console.log(`📧 Alert sent: ${subject}`);
  } catch (err: any) {
    console.error(`❌ Failed to send alert: ${err.message}`);
  }

  alertLog.push({
    id: `alert-${Date.now()}`,
    checkId: result.id,
    checkName: result.name,
    severity: result.severity,
    subject,
    timestamp: result.timestamp,
    type,
  });

  // Keep only last 500 alerts
  if (alertLog.length > 500) alertLog.splice(0, alertLog.length - 500);
}
