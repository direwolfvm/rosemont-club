# The Rosemont Club

A friendly neighborhood homepage, directory, calendar, and resource finder for Rosemont, Alexandria. Blue visual identity, mobile layout, shared Firebase sign-in, and server-enforced audience controls.

Primary domain: https://rosemont.club

Temporary live URL: https://rosemont-club-650621702399.us-east4.run.app

Repository: https://github.com/direwolfvm/rosemont-club

Changes arrive through pull requests to `main`, which deploy automatically on merge. See [docs/CI-CD.md](docs/CI-CD.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [SECURITY.md](SECURITY.md).

Deployment verified September 17, 2026: revision `rosemont-club-00006-x7q`, Cloud Build `eeabd2cc-5e80-46ad-a563-cbf89047ca4a`, serving 100% of traffic.

## Welcome and neighborhood images

The public name is **The Rosemont Club**. The homepage welcomes every Rosemont neighbor, with a carousel of the present-day map and historic maps dated 1911, 1921, and 1963. Originals and credits are documented in `public/images/history/SOURCES.md` and linked from each slide. Next.js serves optimized images; the blue shading is CSS, leaving the source files unchanged. Historical map extents are decorative, while residency checks continue to use the separately supplied GeoJSON boundary.

The carousel supports previous/next buttons, direct slide selection, keyboard arrows, and pause/play. It stops on manual navigation or keyboard focus, pauses on hover, and defaults to paused for reduced-motion preferences. The current slide's caption is announced only while paused. Desktop/mobile checks covered 360, 390, 768, 980, and 1440-pixel widths.

Site copy lives in Firestore and is seeded from `data/seed.ts`. `scripts/update-welcome.ts` reapplies the seeded copy to existing records and creates any missing About sections, without touching permissions or unrelated content. Run it after changing copy in the seed file; ordinary seeding still preserves existing records.

## Design and voice

The homepage uses a white background with darker text for contrast, and leads with four color-coded pillars that match the site's four main uses: Groups (green), Events (orange), Resources (blue), and Community questions (purple). Each homepage section carries its pillar color so the sections read as distinct rather than blending together. The `Community questions` page lives at `/governance` and leads with quick polls and NeighborVote consultations, followed by how the Club runs and the volunteer feedback form.

Copy is plain and practical. The About page describes the Club as a civil association of civic-minded neighbors in Rosemont and includes a "What the Club is not" section: the Club is not an advocacy organization, is not affiliated with the City, and will not represent residents unless there is a compelling reason and significant participation in its online voting tools.

## Existing infrastructure and architecture

Inspection confirmed `permitting-ai-helper` as the active Google Cloud project and `us-east4` as the Cloud Run region. The existing `alex311-dashboard` uses Firebase project `permitting-ai-helper`, Identity Platform tenant `alex311-qfnem`, and the shared Firebase auth domain. Both Google and email/password providers were already enabled. The local `alex311-visibility` checkout held only its README and ignored configuration; the deployed service provided the authoritative runtime configuration.

The local NeighborVote repository (`direwolfvm/neighborvote`) uses Next.js 15, React 19, PostgreSQL/Drizzle, Mailgun, Cloud Build, and a dedicated Cloud Run service account. It has no public consultation-listing API; Rosemont uses administrator-maintained consultation links without copying its election platform or sharing application authorization. The project's only pre-existing Firestore database was `spinup`.

Rosemont follows the existing Next.js/React and Cloud Build pattern. It has a separate named Firestore database, `rosemont-club`, and a separate Cloud Run service of the same name. This avoids coupling neighborhood directory operations to either existing SQL database. No new GCP project was created. Existing services, databases, secret versions, and auth providers were not replaced. Firebase authorized domains were extended while preserving all existing entries.

The Alex311 project is now named Alex311 Reborn and lives at `https://alex311visibility.me/`; the seeded resource uses that name and address (the page slug `alex311-visibility` is unchanged so existing links keep working).

## Local development

Use Node 22 or newer and Google application-default credentials with access to this project:

```sh
npm ci
cp .env.example .env.local
# Fill public Firebase identifiers from deploy-env.yaml.
gcloud auth application-default login
npx next dev -p 3107
```

`.env.local` is ignored. Production obtains private credentials exclusively from Secret Manager. `deploy-env.yaml` contains public Firebase client configuration and nonsecret service configuration.

```sh
npm test
npm run typecheck
npm run build
node --env-file=.env.local --import tsx scripts/seed.ts
SMOKE_ORIGIN=http://localhost:3107 node --env-file=.env.local --import tsx scripts/smoke.ts
```

The seed is idempotent: it creates missing records, preserves edits, and does not restore revoked admin privileges. It resolves Jordan's actual shared Firebase UID, seeds the corresponding Club user as admin only if absent, and gives that UID initial ownership. The integration smoke script creates temporary `rosemont-test-*` identities and records and removes only its own fixtures in `finally`. It never prints tokens or passwords.

## Main implementation files

| File | Responsibility |
|---|---|
| `components/Club.tsx` | Public routes, sign-in, profiles, residency, group following, RSVP, polls, feedback, admin views |
| `components/Editor.tsx` | Volunteer-friendly content forms, communication channels, tags, recurrence, overrides, ownership |
| `app/api/[...path]/route.ts` | Trusted API, CRUD, permission checks, transactions, rate limits, calendars, administrative actions |
| `lib/schema.ts` | Validated entity schemas, audience policy, ownership, explicit protected-content projection |
| `lib/auth.ts`, `lib/firebase.ts` | Tenant-aware Firebase token verification and named Firestore access |
| `lib/events.ts` | Weekly/monthly/nth-weekday recurrence, Eastern time, date exceptions, ICS and Google Calendar |
| `lib/residency.ts`, `data/rosemont-boundary.json` | Address geocoding and community-supplied boundary |
| `lib/mail.ts` | Server-only Mailgun adapter; tracking disabled |
| `data/seed.ts`, `scripts/seed.ts` | Initial records and idempotent administrator setup |
| `cloudbuild.yaml`, `Dockerfile`, `deploy-env.yaml` | Build and Cloud Run deployment |
| `firestore.rules`, `scripts/deploy-rules.py` | Deny-all browser rules for this database only |
| `scripts/provision.py` | Idempotent public app/domain registration and scoped runtime permissions/secrets |

## Native iOS client

A SwiftUI app uses the same API and accounts. See [docs/IOS.md](docs/IOS.md) for the Firebase iOS app values, how `/api/config` serves them, the association file for universal links, the privacy and support pages, and the API-contract commitments the app depends on.

## Data model

The Zod schema defines all records rather than accepting arbitrary objects. `entities` contains discriminated `groups`, `events`, `resources`, `polls`, `content`, `tags`, and `consultations` documents. Each has a stable human-readable slug, status, audience, owner UID array, timestamps, and type-specific fields. An array of owners supports shared ownership without requiring a global owner role.

- `users`: private Club profiles, email, display name, bio, admin/disabled flags, residency result/date/method, optional review-request flag. There is no public member directory.
- `memberships`: one group-follow/request record per user and group. Owners can approve requests and see display names, not member emails.
- `rsvps` and `rsvpCounts`: one attendance record per user and occurrence; transactions enforce capacity and idempotency.
- `responses`: one poll response per user and poll; changing a response replaces the prior selection. APIs return aggregates and the viewer's own choice, never other individual votes.
- `feedback`: private suggestions and ownership requests for administrators.
- `audit`: actor UID, action, target, timestamp for administrative/content changes; no address or content-body logging.
- `rateLimits`: hashed per-account operation counters, no address input. Public reads additionally use bounded, per-instance counters keyed by a hashed proxy IP.

Groups can carry three optional extras. A **published calendar** (`calendarUrl`, a public https `.ics` feed such as a Google Calendar's public iCal address) is fetched server-side with a 15-minute cache, size and host checks, and shown on the group page as upcoming events with Google, webcal, and download links; the Brooks PTA group uses this. **Contact relay** (`contactRelay`) hides the contact email and instead offers a signed-in form whose message is sent through Mailgun to the contact email or, if none is set, to the owners, with the sender's account email as Reply-To. A **custom eligibility rule** (`eligibility`, groups only, residents-only visibility) restricts a group to addresses on listed streets, in an owner-maintained address list, or inside an area drawn on a map in the editor; the W Oak Street group uses a street rule. Eligibility is evaluated during the residency check while the geocoded address is in memory, and only the resulting group IDs are stored on the user (`eligibleGroupIds`). Owners can approve a join request instead (`approvedGroupIds`), and can test how the geocoder reads an address from the editor without storing it. Street and address lists are returned only to owners and administrators. Because eligibility is otherwise a one-time check, members may opt in to **remember their address**: the geocoded result is stored encrypted (`ADDRESS_KEY` from Secret Manager) in a private collection and re-checked automatically whenever a block group is created or its rule changes; members who don't opt in see a prompt to re-check when rules have changed. See [docs/BOUNDARY.md](docs/BOUNDARY.md). Administrators assign owners in the editor with a name-or-email picker.

Recurring events are one record with structured recurrence and date overrides, not a database record per occurrence. Calendar exports preserve recurrence and exceptions. Public calendar feeds contain only public events; authenticated downloads can include events the requester may see. Site feed: `/api/calendar`; group feed: `/api/calendar/{group-id}`; event export: `/api/calendar/{event-id}`. Subscribe only to the public URL: private calendar access requires a bearer token and is offered as an authenticated download, not a secret subscription URL.

## Authentication, authorization, and privacy

The new Rosemont Firebase web app reuses the Alex311 tenant. The client gets public Firebase settings from `/api/config`, signs in through Firebase, and sends an ID token in the Authorization header. The server validates the token's signature, project, tenant, expiry, revocation, and Firebase user status. It reloads Club roles from Firestore on every request, so revocation or disabling takes effect independently of a stale UI.

Admins manage users, all content, tags, site copy, featured flags, ownership, and residency. Owners edit only their objects and create events for groups they own. The backend prevents ordinary owners from granting themselves ownership of another object or changing featured status/host group. New events cannot have a broader audience than their host group. Important access, archival, and ownership changes require confirmation in the interface. Community content is archived, not deleted; account disabling is Club-specific and does not disable the shared Alex311 identity.

Public/member/resident audiences apply on the server. Inaccessible records serialize only ID, kind, slug, title, visibility, and a locked flag. Protected descriptions, contact records, communication invitations, and locations never reach the unprivileged browser. Communication channels also have their own audience gate. Draft/archived records are visible only to their owners/admins. Every mutation validates schema and authorization. React renders content as text; no HTML injection renderer is used. External URLs must use HTTPS. Same-origin JSON mutation checks and bearer-token authentication protect against ambient-cookie CSRF.

Firestore denies all client reads/writes, including signed-in clients. The runtime service account has database access conditioned on `projects/permitting-ai-helper/databases/rosemont-club`, read-only access on the existing identity tenant, and access only to the three Rosemont Mailgun secrets. It has no Firebase account-write privileges.

See [boundary provenance and privacy details](docs/BOUNDARY.md). Residency addresses and geocoded coordinates are never stored, including in audit records. This is geographic self-verification, not proof of occupancy.

## Seeded content and editable administration

- **Rosemont Neighbors**: public neighborhood-wide group, open membership, Jordan as owner; resident-only WhatsApp channel with explanatory instructions and no invented invitation link.
- **Rosemont Happy Hour**: second Wednesday, April–October, 5 PM Eastern, Rosemont Cellar; sponsor left unspecified and editable by occurrence or series. No end time or street address was invented.
- **Brooks Bike Bus**: public group with Instagram and WhatsApp channels and a weekly Friday-morning event during the school year (September through June). The 7:30 a.m. start is a placeholder; routes leave at staggered times and arrive at Brooks by 7:55 a.m.
- **Brooks PTA**: public "follow" group linking to the PTA's join page and showing its published calendar.
- **Friday Pizza at Blue Park**: residents-only group and weekly Friday event, April through October, with a placeholder 5:30 p.m. time and contact relay for the WhatsApp invitation.
- **W Oak Street Neighbors**: residents-only block email list with a custom street eligibility rule and contact relay.
- **Quick poll**: whether advocacy groups should be listed in the Groups directory (residents only, closes December 31, 2026).
- About thirty resources drawn from the Rosemont Citizens Association's contacts page: utilities, schools, parks, City departments, elected-official lookups, and local news.
- **Alex311 Reborn** (formerly Alex311 Visibility): clearly labeled unofficial and not City-endorsed.
- Official City homepage, City neighborhood map, and Rosemont history archive resources.
- Editable About/history/principles/participation/governance/homepage introduction and audience/topic tags, plus two community-guidelines sections (website and the Rosemont Neighbors WhatsApp group) shown at `/guidelines` and linked from the footer, the About page, and every group page.

No fictional groups, polls, consultations, sponsors, or attendees are presented as real. Admins create real polls and active NeighborVote consultations when ready. Substantive decisions link out to NeighborVote; quick polls are explicitly low-stakes. Historical copy links to the [RCA history archive](https://www.rosemontcitizens.org/history), [City community history initiative](https://www.alexandriava.gov/cultural-history/the-colored-rosemont-community-history-initiative), and [historic nomination](https://www.dhr.virginia.gov/VLR_to_transfer/PDFNoms/100-0137_Rosemont_HD_1992_Final_Nomination.pdf).

## Deployment and operations

```sh
python3 scripts/provision.py
python3 scripts/deploy-rules.py
node --env-file=.env.local --import tsx scripts/seed.ts
gcloud builds submit --config cloudbuild.yaml --project=permitting-ai-helper
```

Merges to `main` run the `Deploy` GitHub Actions workflow, which authenticates to Google Cloud without stored keys (Workload Identity Federation as `rosemont-deployer`) and runs the same Cloud Build pipeline; pull requests run typecheck, tests, build, audit, dependency review, secret scanning, and CodeQL without secrets. Cloud Build publishes to the existing `us-east4-docker.pkg.dev/permitting-ai-helper/cloud-run-source-deploy` registry and deploys only `rosemont-club`. The non-root Node 22 container uses Next's standalone output. Runtime: `rosemont-runtime@permitting-ai-helper.iam.gserviceaccount.com`; 0 minimum/3 maximum instances, 512 MiB, 1 CPU, concurrency 40, 60-second timeout. Health check: `/api/health`. IAM permits public HTTP entry, while app permissions govern records and actions.

The named Firestore database has deletion protection. The project's free-tier database allocation is already used by `spinup`, so Rosemont incurs normal low-volume operation/storage charges. No backup schedule or point-in-time recovery has been enabled; decide retention and recovery policy before substantial adoption.

### Custom domain

`rosemont.club` maps to the `rosemont-club` Cloud Run service in `us-east4`. DreamHost contains all four Google A records and all four AAAA records requested by the mapping. The original Google ownership-verification TXT record remains intact. Website DNS is appearing publicly; Google reports the managed certificate provisioned and domain mapping ready as of September 17, 2026. HTTPS is now verified end to end: `https://rosemont.club/api/health` returns HTTP 200. The temporary Cloud Run URL remains available.

`APP_BASE_URL=https://rosemont.club` is configured in Cloud Run and deployment files. Firebase authorized domains include `rosemont.club` and both Cloud Run hostnames, preserving existing entries. `APP_ADDITIONAL_ORIGINS` explicitly permits the two temporary Cloud Run origins so authenticated actions remain usable during certificate provisioning. Google sign-in continues to use the shared Firebase authentication domain and provider branding.

Check readiness with:

```sh
gcloud beta run domain-mappings describe --domain=rosemont.club --region=us-east4 --project=permitting-ai-helper --format='json(status.conditions)'
curl --fail https://rosemont.club/api/health
```

### Mailgun

The production sending domain `mg.rosemont.club` has been created in Mailgun's US region. Its SPF TXT, 2048-bit DKIM TXT, and tracking CNAME records have been added through DreamHost's API. Mailgun reports the domain active and all three sending records valid. The Rosemont secrets now contain the dedicated production configuration.

Runtime bindings are `ROSEMONT_MAILGUN_API_KEY`, `ROSEMONT_MAILGUN_DOMAIN`, and `ROSEMONT_MAIL_FROM`, exposed as `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, and `MAIL_FROM`, plus `ROSEMONT_ADDRESS_KEY` exposed as `ADDRESS_KEY` for remembered addresses. The production configuration uses a domain-scoped sending key and `The Rosemont Club <no-reply@mg.rosemont.club>`. Credentials from the existing alex311 local configuration are used only for setup; account-level Mailgun and DreamHost keys are never copied into this application's runtime or source. The provisioning script preserves existing Rosemont secrets instead of discovering and copying another application's key.

The admin People tab can compose an individual operational message with a confirmation step. Click/open tracking is disabled. Firebase sends its own password-reset and email-verification messages through the shared auth service. There are no automatic announcements or newsletter jobs.

This configures outbound application email. No inbound mailbox or forwarding route is configured. DreamHost's DNS API rejects MX records; its control panel is required if inbound Mailgun reception is later desired. No root-domain mail records were changed. See [Mailgun DNS requirements](https://documentation.mailgun.com/docs/mailgun/user-manual/domains/domains-verify) and [DreamHost DNS API](https://help.dreamhost.com/hc/en-us/articles/217555707-DNS-API-commands).

## Verification and remaining limits

- TypeScript typecheck and optimized production build.
- Thirteen automated tests cover custom-domain/fallback origins, audience/owner policy, protected projections and channels, recurrence and cancellations, weekly/monthly rules, calendar escaping/time zones, user boundary, input validation.
- Forty-four live authenticated integration assertions exercise actual Firebase email/password login, anonymous/regular/resident/owner/admin access, privilege escalation denial, RSVP capacity, one-response polls, archived content, disabled users, calendar privacy, and Firestore client denial, plus a real Census geocoder request and verification that no submitted address is persisted. Temporary test fixtures are removed.
- Playwright desktop/mobile visual checks, resource search and intersecting filters, sign-in dialog, navigation and detail routes. Semantic forms, native dialogs, focus outlines, skip link, image descriptions, and reduced-motion support are implemented; this is not a formal WCAG certification.
- Mailgun returned HTTP 200 for a non-delivery test-mode request using the production domain and its dedicated sending key. No live email was sent; actual inbox delivery remains untested.
- Dependency audit reports zero known vulnerabilities after pinned transitive updates.

Limitations: address geocoding cannot prove occupancy; events hosted by a custom-eligibility group follow the event's own audience, not the group's rule; no automatic email campaigns; no cross-app NeighborVote SSO/API sync; no recurring-event time changes (per-date cancellation/location/sponsor overrides are supported); no image uploads (HTTPS image URLs are supported); no hard-delete user flow; no full membership directory; collection lists are capped at 500 records and admin lists at 250, so add pagination as the neighborhood grows. Public read rate limiting is per instance, with durable per-account limits for mutations and residency attempts; use Cloud Armor if abuse warrants an edge layer. Contact information explicitly entered into a public listing is public by design. Authenticated Google popup completion and actual Mailgun inbox delivery require the account owner's interaction.
