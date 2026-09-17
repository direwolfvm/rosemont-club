# Contributing

Thanks for helping with the neighborhood site. Contributions of all sizes are
welcome: copy fixes, accessibility improvements, bug fixes, and new features.

## Before you start

- For anything larger than a small fix, open an issue first so we can agree
  on the approach.
- Site copy (the About page, homepage introduction, seeded groups, events,
  and resources) lives in Firestore. Change it in `data/seed.ts`; after a
  merge, a maintainer applies it with `scripts/update-welcome.ts`.
- Keep the voice plain and practical. The Club is a civil association of
  civic-minded neighbors, not an advocacy organization, and the site should
  not speak on residents' behalf.

## Working locally

You need Node 22 or newer.

```sh
npm ci
npm run typecheck
npm test
npm run build
```

Those commands need no credentials and are exactly what CI runs. Running the
site itself (`npx next dev -p 3107`) requires Google application-default
credentials with access to the Club's Firestore database, which only
maintainers have. If your change needs a running site to verify, say so in the
pull request and a maintainer will check it.

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Make your change with a clear commit message.
3. Open a pull request. The template asks how you checked the change.
4. CI runs automatically: typecheck, tests, build, dependency audit and
   review, a secret scan, and CodeQL. These run without secrets, so they work
   for pull requests from forks.
5. A maintainer reviews. Merges to `main` deploy to https://rosemont.club
   automatically.

Please do not include real neighbors' personal information in issues, pull
requests, test fixtures, or screenshots.

## Security

See [SECURITY.md](SECURITY.md) for how to report a vulnerability privately.
