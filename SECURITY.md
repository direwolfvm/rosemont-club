# Security

The Rosemont Club is a small volunteer-run neighborhood site. We take reports
seriously and will respond as quickly as volunteers can.

## Reporting a vulnerability

Please report security problems privately through
[GitHub private vulnerability reporting](https://github.com/direwolfvm/rosemont-club/security/advisories/new).
Do not open a public issue for security problems.

Include what you found, how to reproduce it, and what impact you think it has.
You will get an acknowledgement, and we will let you know when it is fixed.

## Please avoid

- Testing against real neighbors' accounts or data. Create your own test
  account if you need one.
- Anything that degrades the service for others, such as load or denial of
  service testing.
- Submitting other people's addresses to the residency check.

## What is in scope

- The application in this repository as deployed at https://rosemont.club
- The API under `/api/`
- The deployment and CI configuration in this repository

Third-party services the site links to (the City of Alexandria, NeighborVote,
Alex311 Reborn, and others) are not in scope; please report issues with
those services to their operators.

## What we do

- Every pull request runs typechecking, tests, a production build,
  `npm audit`, GitHub dependency review, a secret scan, and CodeQL analysis.
- Dependabot opens updates for dependencies and GitHub Actions weekly, and
  security updates are enabled.
- GitHub Actions are pinned to commit SHAs.
- Deployment is keyless (Workload Identity Federation) and only runs from the
  `main` branch, which is protected and requires review.
- Firestore denies all direct client access; every read and write goes through
  the server, which validates schemas and authorization on each request.
- Residency addresses and coordinates are never stored. See
  [docs/BOUNDARY.md](docs/BOUNDARY.md).
