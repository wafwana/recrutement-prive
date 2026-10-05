# Visioconférence sécurisée RP

## Security contract

The trusted video room is available only to the two authenticated users bound to a MissionPresentation whose anonymous channel is enabled and whose mission is not unlocked or completed.

The browser uses WebRTC with `iceTransportPolicy: "relay"`. The API refuses to create or join a room unless TURN configuration is present:

- `RP_TURN_URLS`: comma-separated TURN URLs.
- `RP_TURN_USERNAME`: TURN username.
- `RP_TURN_CREDENTIAL`: TURN credential.

No TURN secret is stored in the repository.

Sessions expire after 45 minutes. Signaling is authenticated server-side and limited to the presentation participants. Offer/answer and ICE candidates are stored only for the lifetime of the session. The media itself is not persisted by the RP application.

Creation, start and end events are written to `AuditLog`.

The video room must never be described as end-to-end encrypted because the signaling server participates in session establishment. The intended security wording is: **visioconférence sécurisée et anonymisée, transport média WebRTC relayé par TURN, accès authentifié, durée limitée et auditée**.

## Production requirement

Do not enable the feature in production until a TURN service is configured in Vercel production with the three variables above. Values are secrets and must never be committed or pasted into source control.
