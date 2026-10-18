# Local iPraktikum acceptance environment

Provisioned on this machine on 2026-10-18. The stack uses the implementation branches in this checkout and the official ARM64 GitLab CE 19.5.0 image, pinned by digest. All published ports bind to 127.0.0.1. Its Docker Compose project, network, and named volumes are named `ipraktikum-local-test`; existing `gropius-production` containers and volumes are independent.

## Open and sign in

- Gropius: http://localhost:14200 (username `admin`).
- GitLab: http://localhost:18929 (username `root`).
- Monorepo: http://localhost:18929/root/ipraktikum-monorepo.
- GitLab board: http://localhost:18929/root/ipraktikum-monorepo/-/boards/1.
- Gropius project: http://localhost:14200/projects/bc6f6fcb-0055-494c-99dd-a08dfd6a2581.
- Gropius board: http://localhost:14200/projects/bc6f6fcb-0055-494c-99dd-a08dfd6a2581/boards/61118772-2c5e-4730-9f59-32eaa0e7c9b1.

Passwords are in `.local/ipraktikum/credentials.json`, readable only by the local file owner. This ignored directory also contains the Compose configuration, encrypted-token key, private development configuration, and disposable GitLab API token. Keep these local. The GitLab token expires 90 days after provisioning; it can be rotated using the GitLab token strategy's update action in Gropius.

This is a local development stack using the testing configuration's development keys and internal database credentials. The GitLab `root` account is linked to Gropius `admin` as the test sync identity. GitLab sign-ups are disabled. SMTP is not configured, HTTPS and Git-over-SSH are not provisioned, and no services are exposed to the LAN.

## Prepared cohort

Project **iPraktikum Local Test** has **Frontend** and **Backend** components and an **iPraktikum Issue** template:

- Types: Task, Bug.
- States: Ready, In Progress, Review, Testing, Done.
- Assignment roles: Implementer, Reviewer.
- Directed relation: Depends on / Required by; symmetric relation: Related / Related.
- Native assignee projects the Implementer role. Native generic relation projection is disabled.

Component labels use the configured aliases `component/frontend` and `component/backend`; internal component keys remain stable. Frontend uses a rectangular template and Backend a hexagonal template.

Ordinary labels (such as `UI`) synchronize additions and removals in both directions by exact name. New counterpart labels copy color and description; later changes to those attributes are not mirrored automatically.

Automatic bidirectional sync is enabled and polls every 15 seconds. GitHub/Jira adapters are absent from this stack. The GitLab board has `workflow/ready`, `workflow/doing`, and `workflow/review` lists, plus its built-in Open/Closed lists. Review and Testing share the review bucket; exact Gropius state survives unchanged labels. Done closes the GitLab issue. The Gropius board has all five individual states. New issues can be added to Gropius boards through the normal board UI; board membership itself is not synchronized.

Two sample issues demonstrate import/export, identity metadata, multi-component labels, typed assignments/relations and comment attribution. The generated YAML section in GitLab descriptions is editable. Component/vocabulary keys come from runtime discovery in the IMSProject setup panel. To inspect or change sync configuration, open **IMSs → Local GitLab → iPraktikum Monorepo → General**.

## Control the stack

From this repository:

```sh
./ipraktikum-local.sh                 # status
./ipraktikum-local.sh stop            # stop, retaining all test data
./ipraktikum-local.sh up -d           # start again
./ipraktikum-local.sh logs --tail 100 sync-ipraktikum
```

Docker Desktop must be running. Initial GitLab startup can take several minutes. Data persists in the stack's named volumes. Do not use `down --volumes` unless you intend to erase the entire disposable cohort and GitLab instance.

The local runtime images contain jars copied from this checkout's backend builds into `.local/ipraktikum/runtime/`. After Kotlin changes, rebuild the affected `:module:bootJar`, replace the corresponding `runtime/module.jar`, then run `./ipraktikum-local.sh up -d --build module`. For frontend/login changes use `./ipraktikum-local.sh up -d --build frontend login-service`. Building frontend/login services uses their normal repository Dockerfiles. The local Compose configuration and provisioning helpers are retained under `.local/ipraktikum/`; they contain machine-specific paths and are intentionally untracked.

Additional localhost debugging endpoints: public GraphQL 18080, internal GraphQL 18081, login service 13000, Neo4j HTTP 17474 and Bolt 17688. The internal GraphQL API uses the testing configuration's internal token. MongoDB/PostgreSQL have no published host ports.
