import cron from 'node-cron';
import { config } from './config';
import { runAllChecks } from './scheduler';
import { initHistory } from './history';
import { startDashboard } from './dashboard';

const isOnce = process.argv.includes('--once');

async function main() {
  console.log('🚀 SwarajDesk Monitoring Service starting...');
  console.log(`   Check interval: ${config.checkIntervalSeconds}s`);
  console.log(`   Dashboard: http://localhost:${config.dashboardPort}`);
  console.log(`   Alerts to: ${config.alertTo}`);

  // Init history from disk
  initHistory();

  // Run first check
  await runAllChecks();

  // Single-run mode — exit after first check
  if (isOnce) {
    console.log('\n📋 Single run complete. Exiting.');
    process.exit(0);
  }

  // Start dashboard
  startDashboard();

  // Schedule periodic checks
  if (config.checkIntervalSeconds < 60) {
    setInterval(async () => {
      await runAllChecks();
    }, config.checkIntervalSeconds * 1000);
  } else {
    const minutes = Math.max(1, Math.floor(config.checkIntervalSeconds / 60));
    cron.schedule(`*/${minutes} * * * *`, async () => {
      await runAllChecks();
    });
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
