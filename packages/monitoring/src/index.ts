import cron from 'node-cron';
import { config } from './config';
import { runAllChecks, runAiMlCheckCycle } from './scheduler';
import { initHistory } from './history';
import { startDashboard } from './dashboard';

const isOnce = process.argv.includes('--once');

async function main() {
  console.log('🚀 SwarajDesk Monitoring Service starting...');
  console.log(`   Check interval: ${config.checkIntervalSeconds}s`);
  console.log(`   AI/ML check interval: ${config.aiml.checkIntervalHours}h`);
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

  // Schedule periodic checks for any interval
  setInterval(async () => {
    await runAllChecks();
  }, config.checkIntervalSeconds * 1000);

  // Schedule AI/ML checks on separate 6h cron
  const aiHours = config.aiml.checkIntervalHours;
  console.log(`\n🤖 Running initial AI/ML health checks...`);
  await runAiMlCheckCycle();
  cron.schedule(`0 */${aiHours} * * *`, async () => {
    await runAiMlCheckCycle();
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
