# Security and privacy

## Credentials

- Users supply their own API keys (BYOK).
- Do not commit `.env` with real secrets; use `.env.example` as a template only.
- Do not embed shared keys in the packaged app.
- Do not store keys in project JSON.

## Data sent to the cloud

- Only when the user explicitly requests transcription or alignment.
- Only audio required for that operation (not the background image or final MP4).
- Show which provider will receive the upload before it starts.

## Local-first

- Project files, media, preview, and export stay on the user's machine by default.
- Temporary render files should live in an app-managed temp directory and be cleaned up.
