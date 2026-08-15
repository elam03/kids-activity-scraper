import { GET as checkHealth } from '../src/app/api/health/route';

async function runTests() {
  console.log("Running health check API test...");
  
  const res = await checkHealth();
  const data = await res.json();

  if (res.status !== 200 || data.status !== 'ok' || data.database !== 'connected') {
    throw new Error(`Health check failed: ${JSON.stringify(data)}`);
  }

  console.log("✅ Health Check Integration Test Passed!");
}

runTests().catch(err => {
  console.error("❌ Test Suite Failed:", err);
  process.exit(1);
});
