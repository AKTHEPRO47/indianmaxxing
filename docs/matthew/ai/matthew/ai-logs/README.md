# AI Usage Log: Matthew

## Scope

AI assisted with organizing the notification-system design into explicit use cases for Telegram, Discord, and email delivery.

## Summary of Work

| Phase | Prompt / Request | Reviewed Output | Decision |
|---|---|---|---|
| Channel linking | "Describe secure ways to connect Telegram, Discord, and email." | Deep-link token flow, Discord webhook validation, and account-email delivery. | Documented channel-specific validation and expiry behavior. |
| Preferences | "Define user-configurable alert routing." | Trigger toggles, selected channels, broadcast/failover modes, and per-stock overrides. | Kept per-user configuration and explicit no-channel behavior. |
| Delivery | "Model reliable alert dispatch." | Cooldown, retries, backoff, outcomes, and digest handling. | Required delivery logs and failure states rather than silent drops. |

## Evidence and Boundaries

- The detailed flows are documented in `use-cases.md`.
- AI suggestions were reviewed against the implemented notification services and tests.
- Credentials and webhook URLs are treated as secrets and are not stored in this log.