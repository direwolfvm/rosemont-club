# CI/CD

## Overview

| Trigger | Workflow | Secrets | What it does |
|---|---|---|---|
| Pull request (any source, including forks) | `ci.yml` | none | `npm ci`, typecheck, tests, production build, `npm audit`, dependency review, gitleaks secret scan |
| Pull request, push to `main`, weekly | `codeql.yml` | none | CodeQL security-and-quality analysis for TypeScript and Python |
| Push to `main`, manual dispatch | `deploy.yml` | none stored; keyless OIDC | Typecheck and tests, then `gcloud builds submit --config cloudbuild.yaml`, then a health check |

Pull requests never deploy. The `production` GitHub environment only allows
deployments from `main`, and `main` is protected: changes arrive through pull
requests that pass the required checks and a code-owner review.

## Keyless deployment

The deploy workflow authenticates with Workload Identity Federation. No service
account key exists in GitHub.

- Pool: `projects/650621702399/locations/global/workloadIdentityPools/github`
- Provider: `github-oidc`, issuer `https://token.actions.githubusercontent.com`,
  attribute condition `assertion.repository == 'direwolfvm/rosemont-club'`
- Service account: `rosemont-deployer@permitting-ai-helper.iam.gserviceaccount.com`

The deployer service account holds only what a submit-and-verify needs:

| Role | Scope | Why |
|---|---|---|
| `roles/cloudbuild.builds.editor` | project | submit and read builds |
| `roles/serviceusage.serviceUsageConsumer` | project | use the project as the quota project |
| `roles/storage.legacyBucketWriter` | bucket `permitting-ai-helper_cloudbuild` | upload the build source tarball (the workflow passes `--gcs-source-staging-dir` so gcloud does not need to list the project's buckets) |
| `roles/iam.serviceAccountUser` | the Compute Engine default service account | Cloud Build runs the build as that account |
| `roles/run.viewer` | project | read the serving revision after deploy |
| `roles/iam.workloadIdentityUser` | the deployer service account, granted to `principalSet://.../attribute.repository/direwolfvm/rosemont-club` | let this repository's workflows impersonate it |

The Cloud Build steps in `cloudbuild.yaml` run as the Compute Engine default
service account, which already had the Cloud Run deploy permissions used by the
manual `gcloud builds submit` flow. The runtime service account
`rosemont-runtime` is unchanged.

These were created with `gcloud` on September 17, 2026. To recreate them, the
commands are, in order: `gcloud services enable sts.googleapis.com`,
`gcloud iam workload-identity-pools create github`,
`gcloud iam workload-identity-pools providers create-oidc github-oidc`
(with the attribute mapping and condition above),
`gcloud iam service-accounts create rosemont-deployer`, the role bindings in
the table, and `gcloud iam service-accounts add-iam-policy-binding` for the
workload identity user binding.

## Repository protections

- Branch protection on `main`: pull request required, one approving review
  from a code owner, stale reviews dismissed, conversations resolved,
  required checks (`Typecheck, test, build`, `Dependency review`,
  `Secret scan`, CodeQL), no force pushes or deletions. Because there is a
  single maintainer who cannot approve their own pull requests, administrators
  may bypass the review requirement; the checks still run on every pull
  request and CodeQL and secret scanning report to the Security tab.
- Secret scanning with push protection, Dependabot alerts and security
  updates, and private vulnerability reporting are enabled.
- Default `GITHUB_TOKEN` permissions are read-only; workflows request only
  what they need.
- GitHub Actions are pinned to commit SHAs and updated by Dependabot.

## Manual deploy

A maintainer can still deploy from a workstation:

```sh
gcloud builds submit --config cloudbuild.yaml --project=permitting-ai-helper
```

Or trigger the workflow: Actions > Deploy > Run workflow (from `main`).
