# Setu for Android

Three clickable design directions for the native Android companion to Setu. A device owner can prepare the device, see who is requesting remote access, manage an ongoing session, and share screenshots or recordings with a developer.

## Open the prototype

Open `index.html` in a browser. The review panel shows all three design options and a scenario selector on a desktop-sized viewport. On a phone-sized viewport, open the three-dot **Prototype options** menu for the same controls. The prototype uses fictional data and runs locally without a build step.

| Direction | Layout | Preview |
| --- | --- | --- |
| Relay | Light, cobalt-accented navigation and a progress-based device checklist. | [Screenshot](docs/previews/relay.png) |
| Signal | Dark, mint-accented control panel that puts phone readiness and connection status first. | [Screenshot](docs/previews/signal.png) |
| Field | Warm, plum-accented guidance focused on the next action and evidence review. | [Screenshot](docs/previews/field.png) |

## Review the critical paths

1. Start with email onboarding, then use device setup. Follow the Android Settings handoff for Developer options and Wireless debugging. USB debugging is a separate option for USB workflows.
2. Start hosting, approve or decline a request, and inspect the background notification. Try both reconnecting and ending a session.
3. Preview the screenshot or recording flow, add context, and review the sharing destination. Load the managed scenario to see enrollment, the Solo lock, and managed restrictions.

The [journey map](docs/JOURNEYS.md) describes the platform constraints, research references, and the proposed Setu integration. Android Settings, foreground services, capture consent, authentication, and corporate access use simulated states in this design round.
