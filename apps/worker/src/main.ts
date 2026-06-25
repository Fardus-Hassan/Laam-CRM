const interval = Number(process.env['WORKER_HEARTBEAT_MS'] ?? 30000);

console.log('[fardus-worker] started');
console.log(`[fardus-worker] heartbeat every ${interval}ms`);

setInterval(() => {
  console.log(`[fardus-worker] alive ${new Date().toISOString()}`);
}, interval);
