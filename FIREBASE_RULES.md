# Firebase Realtime Database — Suggested Security Rules

Your database currently has NO rules restricting access beyond the default,
which means anyone with your `databaseURL` (visible in your public GitHub repo)
can read AND write to every path — including your Mafia game data.

This isn't specific to this survey project — it's already true today. Since
you're adding new paths, this is a good moment to lock things down.

## Paste this into Firebase Console → Realtime Database → Rules

```json
{
  "rules": {
    "survey_results": {
      ".read": true,
      ".write": true,
      "$entryId": {
        ".validate": "newData.hasChildren(['timestamp', 'date', 'time', 'answers'])"
      }
    },
    "survey_metadata": {
      ".read": true,
      ".write": true
    },
    "mafia_rooms": {
      ".read": true,
      ".write": true
    },
    "mafia_logs": {
      ".read": true,
      ".write": true
    },
    "$other": {
      ".read": false,
      ".write": false
    }
  }
}
```

## What this does

- Explicitly scopes access to only the paths you actually use:
  `survey_results`, `survey_metadata`, `mafia_rooms`, `mafia_logs`.
- Blocks every other path by default (`$other`), so nothing new can be
  created at the database root by a stranger poking at your API key.
- Validates that survey entries always include the expected fields.

## Worth knowing

- `.read: true` / `.write: true` here means anyone with your database URL
  can still read and write within these specific paths — there's no login
  system in either of your projects, so this is "open by path" rather than
  "open to everyone everywhere." That matches how both apps currently work
  (no auth, just a shared link).
- If you ever want real privacy (e.g. only you can read survey results),
  the next step would be adding Firebase Authentication and rules based on
  `auth.uid` — a bigger change, not needed for this to work today.
