module.exports = {
  branches: ["main"],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        'releaseRules': [
          // This rule allow to force a release by adding "force-release" in scope.
          // Example: `chore(force-release): migrate widgets to new format`
          // Source: https://github.com/semantic-release/commit-analyzer#releaserules
          { scope: 'force-release', release: 'patch' },
        ],
      },
    ],
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/git',
    '@semantic-release/github',
  ],
}
