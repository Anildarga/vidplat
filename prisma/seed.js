// Compatibility wrapper. The canonical seed is prisma/seed.ts.
const { spawnSync } = require('child_process');

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['tsx', 'prisma/seed.ts'],
  { stdio: 'inherit' }
);

process.exit(result.status ?? 1);
