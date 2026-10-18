# iPraktikum adapter testing handoff

Implemented on the local branch `feat/ipraktikum-issue-sync` in this deployment repository and all three submodules. The deployment commit pins the tested submodule commits. No production repository was connected or modified, and these branches have not been pushed.

## What is ready

* `sync-ipraktikum`: repository-wide identity/enrollment, runtime component/template discovery, component labels, coarse/fine workflow states, typed assignments and directed relations, optional native assignee/generic-link projections, comments, persistent reconciliation receipts/outbox, conflict handling, and repair controls.
* Login service: `gitlab-token` account linking, current-user verification, numeric identities, encrypted PAT storage, and same-account token rotation.
* Frontend: runtime setup/status panel on the iPraktikum IMSProject General page. Defaults use discovered choices; advanced JSON supports grouped workflows, required-field defaults, primary selections, conflict resolutions, and recovery.
* Deployment: production and development Compose overlays that run the dedicated worker and exclude the GitHub/Jira workers by default.

## Checks completed locally

| Check | Result |
|---|---|
| Kotlin metadata/merge/workflow tests | 8 passed |
| Integration scenario with real isolated Neo4j/MongoDB and stateful GitLab HTTP fixture | Passed |
| GitLab credential encryption/linking/rotation tests | 2 passed |
| Runnable adapter JAR | Built |
| Login-service build and runtime module loading in credential tests | Passed |
| Frontend graph-editor build, Vue type check, production build | Passed |
| Both Compose overlay configurations | Valid |

The integration scenario exercises incoming/outgoing issue creation, unchanged-cycle idempotency, component labels, workflow moves, parallel assignment roles, explicit empty primary assignment, rich relation edits/removals, native generic-link deletion, human-owned comment corrections, and copied-identity rejection/adoption. Test containers were isolated from application data and removed after verification.

## Next: target GitLab acceptance test

Use a disposable monorepo on the actual self-hosted GitLab instance and a test cohort in Gropius. We still need its URL/version/project ID and a bot PAT with the required project access. Component IDs, issue vocabulary, and state/default mappings are supplied through runtime setup rather than deployment constants.

Follow the [adapter setup and testing guide](gropius-backend/sync-ipraktikum/README.md). Start with dry run, inspect the discovered vocabulary and proposed imports/exports, then enable writes. Check the native GitLab boards and permissions on this instance; the HTTP fixture cannot validate its UI or server-specific behavior.

Accepted constraints: shared cohort visibility, structured description editing, best-effort concurrency (students avoid concurrent edits), and one adapter per cohort. The initial worker performs complete scans suitable for a teaching cohort; it does not depend on webhook delivery. Architectural `affects` mapping, attachment mirroring, and complete historical impersonation are outside this implementation.

The production Compose overlay additionally requires the normal deployment secrets and a persistent `GROPIUS_GITLAB_TOKEN_ENCRYPTION_KEY`. Back up that key and the Neo4j integration records before using real cohort data.

### Linked user presentation

GitLab users are identified by their numeric ID within the IMS instance, and explicitly linked to a Gropius account. The frontend resolves that link when displaying authors, timeline actors, and assignees: it uses the linked Gropius name/avatar and retains the external account in the tooltip. Unlinked users keep their external profile. Historical items retain their original IMSUser reference, so later linking/unlinking takes effect without rewriting history or confusing user IDs in mutations.

Verify an existing imported GitLab comment displays the linked Gropius profile after refresh. Verify the tooltip still identifies the external account. The ordinary GitLab API attributes exported issues/comments to the configured token account; account linking does not impersonate users or rewrite GitLab's native author. Exported comments include a Gropius attribution footer.

The linked-user change passed frontend type checking and a production build.
