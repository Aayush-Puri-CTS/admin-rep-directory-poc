/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-domain-to-infrastructure',
      severity: 'error',
      comment: 'domain must not import from infrastructure (hexagonal boundary)',
      from: { path: '^src/domain' },
      to: { path: '^src/infrastructure' },
    },
    {
      name: 'no-domain-to-adapters',
      severity: 'error',
      comment: 'domain must not import from adapters (hexagonal boundary)',
      from: { path: '^src/domain' },
      to: { path: '^src/adapters' },
    },
    {
      name: 'no-application-to-infrastructure',
      severity: 'error',
      comment: 'application must not import from infrastructure (hexagonal boundary)',
      from: { path: '^src/application' },
      to: { path: '^src/infrastructure' },
    },
    {
      name: 'no-application-to-adapters',
      severity: 'error',
      comment: 'application must not import from adapters (hexagonal boundary)',
      from: { path: '^src/application' },
      to: { path: '^src/adapters' },
    },
    {
      name: 'no-infrastructure-to-adapters',
      severity: 'error',
      comment: 'infrastructure must not import from adapters',
      from: { path: '^src/infrastructure' },
      to: { path: '^src/adapters' },
    },
    {
      name: 'no-circular',
      severity: 'warn',
      comment: 'circular dependencies make the dependency graph harder to reason about',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: ['node_modules', 'dist'] },
    exclude: { path: ['node_modules', 'dist', 'prisma/generated', 'prisma/migrations'] },
    tsConfig: { fileName: './tsconfig.json' },
    baseDir: '.',
  },
};
