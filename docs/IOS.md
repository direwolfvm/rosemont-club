# Native iOS client

The Rosemont Club iOS app (bundle `com.rosemont.rosemontclub`, repo `rosemont-club-ios`)
uses this site's API unchanged. This page records what the web side provides
for it and the answers to the app's handoff questions.

## Identification

- The app sends `X-Rosemont-Client: ios/<version>` on every request. The
  header is optional; `?platform=ios` on `/api/config` is an alias.
- `GET /api/config` keeps its shape (`apiKey`, `authDomain`, `projectId`,
  `appId`, `tenantId`) and adds `iosMinimumVersion` and `platform`. iOS
  requests receive the Firebase iOS app's key and ID when they are configured
  (`FIREBASE_IOS_API_KEY`, `FIREBASE_IOS_APP_ID` in `deploy-env.yaml`),
  otherwise the web values.
- Requests without an `Origin` header are accepted for mutations; the app
  relies on this and a regression test protects it. Authorization is the
  bearer token, checked on every request.

## Firebase iOS apps

App Store Connect assigned the bundle ID `com.rosemont.rosemontclub` (it would
not accept `club.rosemont.ios`). Firebase iOS apps cannot be renamed, so a
second one was registered; both share Firebase's auto-created iOS API key.
`/api/config` and the app's built-in fallback use the App Store one.

| Value | App Store app (current) | Development app (earlier) |
|---|---|---|
| Bundle ID | `com.rosemont.rosemontclub` | `club.rosemont.ios` |
| Apple Team ID | `LAKT4757H4` | `LAKT4757H4` |
| App ID | `1:650621702399:ios:b515a4ac9849be25273cca` | `1:650621702399:ios:30fbf444d819cbf8273cca` |
| API key | `AIzaSyATF0AOZCgT6VcQsxJFV5vs7dyCSINZmSc` | same |
| Google OAuth iOS client ID | `650621702399-9jnqvhv2lq2o94m22bk70f74eebvmhoi.apps.googleusercontent.com` | `650621702399-71b77nam1lq620biotmitnr9u6ncs63p.apps.googleusercontent.com` |
| Reversed client ID | `com.googleusercontent.apps.650621702399-9jnqvhv2lq2o94m22bk70f74eebvmhoi` | `com.googleusercontent.apps.650621702399-71b77nam1lq620biotmitnr9u6ncs63p` |
| Tenant | `alex311-qfnem` | `alex311-qfnem` |

The web browser key has no HTTP-referrer restriction. If one is added later,
the iOS key above keeps native sign-in working. `scripts/provision.py`
registers the iOS app idempotently and publishes its public values.

## Auth email links and password policy

The project's action URL is Firebase's default handler
(`https://permitting-ai-helper.firebaseapp.com/__/auth/action`) and is shared
with Alex311 Reborn, so it is not changed here. The app should pass
`continueUrl: "https://rosemont.club"` in `accounts:sendOobCode` requests so
neighbors land on the site afterwards. The project has no custom password
policy (Firebase's default minimum of 6 characters); the app's 8-character
minimum is stricter and fine.

## Sign in with Apple

Enabled on tenant `alex311-qfnem` on September 22, 2026 (`defaultSupportedIdpConfigs/apple.com`, client ID `com.rosemont.rosemontclub`). The app exchanges Apple's identity token through `accounts:signInWithIdp` with `providerId=apple.com`; the token audience is the App Store bundle ID, which is a registered Firebase iOS app. No Services ID or key is configured because the website does not offer Apple sign-in. Neighbors who choose Hide My Email get an `@privaterelay.appleid.com` address; for Mailgun mail to reach them, `mg.rosemont.club` and the from-address must be registered under Sign in with Apple for Email Communication in the Apple Developer account (a portal task).

## Sign in with Apple on the website

The site shows "Continue with Apple" when `APPLE_SERVICES_ID` is set in
`deploy-env.yaml`. Done on September 22, 2026 with Services ID
`com.rosemont.rosemontclubweb`. Setup, in order:

1. Apple Developer portal, Identifiers, Services IDs: create one (for example
   `club.rosemont.web`) with the description **The Rosemont Club**; that
   description is what Apple's sign-in sheet shows. Enable Sign in with
   Apple on it, choose the Rosemont Club app as the primary App ID, and add
   domain `permitting-ai-helper.firebaseapp.com` with return URL
   `https://permitting-ai-helper.firebaseapp.com/__/auth/handler` (the
   Firebase auth handler the website's popup uses).
2. Set the tenant's Apple provider `clientId` to the Services ID (it is the
   App Store bundle ID today; native tokens keep working because
   `appleSignInConfig.bundleIds` lists both bundles). The private key already
   configured for revocation serves the web flow too.
3. Set `APPLE_SERVICES_ID` in `deploy-env.yaml` and deploy.

Accounts are one-per-email: signing in with Apple on an email that already
has a password or Google sign-in is refused with a message to use the
original method. Hide My Email relay addresses work because
`mg.rosemont.club` is registered for Sign in with Apple email communication.

## Account deletion

`POST /api/me/delete` (JSON body `{}`) or `DELETE /api/me`, bearer token required, rate limited. It deletes the member's profile, follows, RSVPs (correcting capacity counters), poll responses, and any remembered address; anonymizes their messages to the volunteers (`userId: "deleted"`); releases ownership of listings without deleting them; audits `account-delete`; and returns `{ ok, identityDeleted, releasedListings }`. The runtime service account deliberately has no Firebase account-write privilege, so `identityDeleted` is `false` and the client deletes the Firebase identity itself (`accounts:delete` in the app, `deleteUser` on the website). The last active administrator is refused with 403 and a clear message. Deleting the identity also removes the Alex311 Reborn sign-in; both clients say so before confirming. The website offers the same action on the profile page.
## Google consent screen

The OAuth brand is shared by every app in the `permitting-ai-helper` project,
so Google's sign-in sheet reads "Herbert Industries Applications" with the
homepage `jordaneccl.es`, on the web and in the app alike. It cannot be
per-app without a separate Google Cloud project. The privacy and support
pages tell neighbors to expect it.

## App Store pages

- Privacy policy: `https://rosemont.club/privacy`
- Support: `https://rosemont.club/support`

Both are site content sections editable by administrators.

## Universal links and password autofill

`/.well-known/apple-app-site-association` is generated by the API (rewrite
in `next.config.mjs`) with `Content-Type: application/json` and no redirect.
It exists only when `APPLE_TEAM_ID` is set in `deploy-env.yaml` (set to the
app's signing team, `LAKT4757H4`, on September 18, 2026). The app IDs listed
come from `APPLE_BUNDLE_IDS` (comma-separated; currently the App Store bundle
and the development bundle). Paths covered:
groups, events, resources, polls, consultations, profile, following, about,
governance. Guidelines, privacy, and support are deliberately left out so
they open in Safari; the app has no screens for them. `webcredentials` is
included for Password AutoFill.

## Smart App Banner

Set `APPLE_APP_STORE_ID` in `deploy-env.yaml` once the app is listed; the
layout then emits `<meta name="apple-itunes-app">`.

## API contract

Additive changes are safe; the app ignores unknown fields. Without a heads-up
to the iOS side, do not:

- rename or remove the entity and member fields listed in the app's handoff,
- change the `{ "error": "message" }` body or the 401/403/409/429 meanings,
- change occurrence strings from `yyyy-MM-ddTHH:mm` Eastern wall-clock time,
- return per-user data from `entities/{id}/results`.

`iosMinimumVersion` in `/api/config` is the lever for a breaking change: raise
it and the app prompts for an update.

Since September 23, 2026, unauthenticated requests receive group and event
join details redacted: every channel comes back with `locked: true` and empty
`url`, `email`, and `instructions`, and `joinInstructions` and `contactEmail`
are empty strings. Signed-in requests are unchanged. The app already renders
locked channels, so no change is required; showing a "sign in to see how to
join" prompt for signed-out users would match the website.
