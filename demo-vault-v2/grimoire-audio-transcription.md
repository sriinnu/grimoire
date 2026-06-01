---
type: Note
aliases:
  - "[[Audio Transcription]]"
belongs_to: "[[grimoire-learning-project]]"
related_to:
  - "[[grimoire-feature-tour]]"
  - "[[grimoire-privacy-and-memory]]"
status: Active
locality: local-first
egress-blocked: true
---

# Audio Transcription

Grimoire treats audio as capture, not as a cloud assumption.

## Supported flow

1. Import an audio file or record inside the app.
2. Run local transcription first when available.
3. Save the raw transcript as a note.
4. Save a cleaned summary as a separate note.
5. Link transcript and summary back to the project.

## Privacy rule

Cloud speech providers need explicit opt-in. This example keeps `egress-blocked: true` so the tour demonstrates the local-first default.
