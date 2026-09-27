// Commitlint configuration. Conventional Commits is enforced via the
// commitlint workflow on PR push and via the husky commit-msg hook
// locally. Type allowlist mirrors the repo's existing commit history
// (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `build`,
// `perf`, `revert`, `style`).
module.exports = {
  extends: ["@commitlint/config-conventional"],
  // 68341997 is already on develop. Its subject is lowercase, so the
  // default "Merge branch" / "Merge pull request" ignores do not match,
  // and a develop-to-main pull request lints it. The message is pinned
  // so a future non-conventional commit still fails.
  ignores: [
    (message) => message.startsWith("merge main back into develop after v2.5.1"),
  ],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "chore",
        "docs",
        "refactor",
        "test",
        "ci",
        "build",
        "perf",
        "revert",
        "style",
      ],
    ],
    "subject-case": [0],
    "header-max-length": [2, "always", 100],
    "body-max-line-length": [0],
    "footer-max-line-length": [0],
  },
};
