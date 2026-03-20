# Incident Response Runbook (Sprint 1)

## Severity Levels

- `SEV1`: Complete outage or data integrity risk.
- `SEV2`: Major feature degraded for many users.
- `SEV3`: Partial degradation with workaround.

## Initial Response

1. Acknowledge alert within 5 minutes.
2. Assign incident commander.
3. Capture `requestId`, route, and user impact.
4. Post first status update in the incident channel.

## Triage

1. Confirm scope (`single route`, `all API`, `frontend only`).
2. Confirm blast radius (`all users`, `some users`, `specific region`).
3. Check latest deploy and logs for `error.code`.
4. Decide `rollback` vs `forward fix`.

## Mitigation

1. Roll back if error rate exceeds threshold and fix is not immediate.
2. Apply hotfix with linked incident ID in commit message.
3. Verify recovery using smoke tests and alert clearance.

## Closure

1. Publish final timeline.
2. Document root cause.
3. Add follow-up tasks and owners.
4. Close incident after stakeholder confirmation.
