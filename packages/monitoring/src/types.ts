export type CheckStatus = 'UP' | 'DOWN' | 'WARNING' | 'UNKNOWN';
export type Severity = 'CRITICAL' | 'WARNING' | 'NOTICE';
export type ServiceGroup =
  | 'backend-health'
  | 'feature-api'
  | 'frontend-api'
  | 'database'
  | 'redis'
  | 's3'
  | 'ec2'
  | 'dns-tls'
  | 'ai-ml';

export interface CheckResult {
  id: string;
  name: string;
  group: ServiceGroup;
  status: CheckStatus;
  responseTimeMs: number;
  message: string;
  timestamp: string;
  severity: Severity;
  details?: Record<string, any>;
}

export interface CheckState {
  id: string;
  currentStatus: CheckStatus;
  previousStatus: CheckStatus;
  lastChange: string;
  lastChecked: string;
  consecutiveFailures: number;
  lastAlertSent: string | null;
}

export interface IncidentRecord {
  id: string;
  checkId: string;
  checkName: string;
  group: ServiceGroup;
  from: CheckStatus;
  to: CheckStatus;
  timestamp: string;
  message: string;
}

export interface AlertRecord {
  id: string;
  checkId: string;
  checkName: string;
  severity: Severity;
  subject: string;
  timestamp: string;
  type: 'FAILURE' | 'RECOVERY';
  emailStatus?: 'queued' | 'sent' | 'partial' | 'failed';
}

export interface HistoryEntry {
  checkId: string;
  status: CheckStatus;
  responseTimeMs: number;
  timestamp: string;
}

export interface DashboardStatus {
  checks: CheckResult[];
  states: Record<string, CheckState>;
  summary: {
    total: number;
    up: number;
    down: number;
    warning: number;
    unknown: number;
    lastRun: string | null;
  };
}
