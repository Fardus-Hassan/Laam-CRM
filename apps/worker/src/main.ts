const interval = Number(process.env['WORKER_HEARTBEAT_MS'] ?? 30000);

console.log('[laam-worker] started');
console.log(`[laam-worker] heartbeat every ${interval}ms`);

setInterval(() => {
  console.log(`[laam-worker] alive ${new Date().toISOString()}`);
}, interval);
