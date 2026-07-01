# Privacy Policy for Shift6

**Last Updated: June 16, 2026**

## Introduction

Shift6 (formerly "Shift6") is committed to protecting your privacy. This Privacy Policy explains how the Shift6 fitness application handles your information. The app is developed by Cameron Ashley ("we", "our", or "the developer") and is distributed under the brand name Shift6 across iOS, Android, and the web at getshift6.com.

## Summary

**Shift6 is local-first by default.** All your workout data lives on your device. The app functions fully without an account, without internet access, and without sending any data to external servers.

**Optional cloud sync is opt-in.** If you create an Shift6 account, the data you choose to sync (workout history, 1RM estimates, preferences) is transmitted to our hosted sync API. You can delete your account and synced data at any time from the Account tab in the app. We do not collect, sell, or share any data with third parties.

## Data Storage

### What Data is Stored Locally (always, on your device)

Shift6 stores the following information in your device's local storage (browser localStorage for web, device storage for iOS/Android):

- **Workout History**: Records of completed exercises, dates, performance metrics
- **Progress Data**: Your advancement through the 6-week program, current cycle/week/day
- **Estimated 1RMs**: Your one-rep-max estimates for the exercises you track
- **Personal Records**: Your best performances for each exercise
- **App Preferences**: Settings like theme, unit (lbs/kg), equipment track, and reminder schedule
- **Daily Habits**: Markers for the four daily longevity habits (balance drill, lunch walk, dinner walk, evening floor work)
- **Streak Data**: Workout streak counts, minimum-viable-day (MVD) days, freeze allowance

This data:

- Lives entirely on your device by default
- Is never uploaded to any server unless you opt in to cloud sync (see below)
- Is not shared with any third parties
- Is not used for advertising

### What Data is Stored in the Cloud (only if you opt in)

If you create an Shift6 account and choose to sync, we store:

- The same data listed above, transmitted over HTTPS to our sync API at `sync.getshift6.com`
- An account email address (for login — never shared or used for marketing)
- A password hash (bcrypt, never stored or transmitted in plain text)
- An authentication token (JWT, stored in your device's local storage, not in cookies)
- A monotonically increasing revision number used for conflict resolution
- The IP address of login events, retained for 30 days for security (brute-force detection)

We do **not** store:

- Real name, physical address, phone number, or date of birth
- Payment information (Shift6 has no paid tier; there is nothing to bill)
- Device identifiers, advertising IDs, or third-party tracking IDs
- Crash reports sent to external services
- Location data, contacts, photos, or microphone input

### Migration From Shift6

If you used the previous version (Shift6) and open Shift6, the app detects the old local-storage keys and offers to migrate your existing data. Migration reads the old `shift6_settings` and `shift6_onboarding_done` keys from your local storage and writes them to the new `armor_*` keys. No data is sent off-device during migration. The old keys remain on your device (you can clear them via the browser's storage tools); we do not delete them.

## Account and Authentication

### Account Creation Is Optional

Shift6 does **not** require an account. You can use every feature — onboarding, workouts, progress, settings, the full 6-week periodization — without creating one. The "Account" tab in the app's bottom navigation only appears after you have created an account.

If you do create an account:

- We store your email address and a bcrypt hash of your password
- We issue a JWT (JSON Web Token) that your device uses to authenticate subsequent sync requests
- You can sign out from any device at any time, which invalidates the token server-side

### What Happens If You Delete Your Account

If you choose to delete your account from the Account tab:

- All cloud-stored data (workouts, 1RMs, preferences, streak) is permanently deleted
- Your local data on the device remains intact — the app continues to work fully offline
- The deletion is irreversible; we do not retain backups of deleted accounts

## Analytics

**Analytics are off by default.** The app ships with a stub Google Analytics 4 integration. The integration is a no-op until you build the app with a `VITE_GA_MEASUREMENT_ID` environment variable set. Without that variable:

- No analytics events are sent
- No cookies are set by the app for analytics purposes
- The `react-ga4` package is included in the bundle but never initialized

If a future build includes analytics, the only events tracked are anonymous usage counters (e.g. "workout started", "set completed"). They do not include your 1RMs, workout history, or any content of your data.

## Third-Party Services

The app bundles (does not fetch at runtime) the following libraries:

- React, React DOM (UI framework)
- lucide-react (icon set, no network calls)
- vite-plugin-pwa (service worker for offline caching)
- react-ga4 (analytics SDK; only initialized if you set the env var above)

The marketing landing page at `getshift6.com` may use Google Fonts. The PWA does not.

## Children's Privacy

Shift6 does not knowingly collect any information from children under 13 years of age. The app does not require any personal information to function.

## Data Deletion

### Delete Local Data

Open Settings → Factory Reset. This clears all `armor_*` keys from local storage on the current device.

### Delete Cloud Data

Sign in, then go to Account → Delete Account. This removes all data we hold for your account, including the account record itself.

### Uninstall the App

Removing the app deletes all associated data from your device. Cloud-stored data, if any, is retained until you delete your account.

## Changes to This Policy

We may update this Privacy Policy from time to time. Any changes will be reflected in the "Last Updated" date at the top of this policy. Material changes (e.g. adding a new data collection category) will be announced in the app on next launch and require you to re-acknowledge before continued use.

## Contact

If you have questions about this Privacy Policy, please contact us through:

- GitHub Issues: https://github.com/camster91/Shift6/issues
- Email: hi@getshift6.com

## Your Rights

If you have a cloud account, you have the right to:

- **Access**: Export all your data via Account → Export
- **Correction**: Edit any field via the app's Settings or Account tabs
- **Deletion**: Delete the account and all cloud data, as described above
- **Portability**: Export is in JSON format, readable by humans and machines

If you do not have a cloud account, your data rights are inherently satisfied: all data is on your device, in your control, deletable at any time via the app or by clearing site data in your browser.

---

## App Store Compliance

### Apple App Store

This app complies with Apple's App Store Review Guidelines regarding privacy:

- We do not collect personal data without explicit opt-in (cloud sync requires account creation)
- We do not require account creation
- We do not use advertising identifiers
- We declare accurate data safety information in App Store Connect

### Google Play Store

This app complies with Google Play's User Data policy:

- All data is local-first; cloud sync is opt-in
- We do not share data with third parties
- Account data can be deleted at any time from inside the app
- We declare accurate data safety information in Google Play Console

---

*This privacy policy is effective as of the date stated above.*
