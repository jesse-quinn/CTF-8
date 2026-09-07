# Changelog

## 2026-09-06 - Challenge integrity fixes

Robustness and reproducibility fixes from an adversarial review (2026-09-06). No
scoring or flag change: every flag keeps its value, path, prefix, and intended
reader, and no credential value changed.

### Changed

- `entrypoint.sh` now bounds the wait for the inner Docker engine
  (`DOCKERD_READY_TIMEOUT`, default 60s). On timeout it prints a diagnostic (a
  `--privileged` hint and a `dockerd` log tail) and exits non-zero, instead of
  spinning silently forever when `dockerd` cannot start. `set -e` did not catch
  this because `dockerd` runs backgrounded.
- The documented socket breakout in `docs/WALKTHROUGH.md` now uses
  `node:22-bookworm` (already pulled by the inner build) instead of `alpine`, so
  the winning step needs no network at solve time and works on a network-isolated
  host.
- `docs/WALKTHROUGH.md` states plainly that the mounted socket is a full
  outer-root read primitive: it reads the `dev` user flag directly, so the Stage 5
  `dev` SSH login is a realism flourish, not a gate.
- The inner app image (`docker-app/app.Dockerfile`) installs from a committed
  `docker-app/app/package-lock.json` via `npm ci --omit=dev`, freezing transitive
  dependencies, and generates sshd host keys explicitly with `ssh-keygen -A`
  rather than relying on the openssh-server postinst.
- The outer image (`Dockerfile`) sets the login shell to bash only for `root` and
  `dev` (`useradd -s`, `usermod -s`) instead of rewriting every account's shell
  with a global `passwd` sed.

### Note

- This repository intentionally ships disposable challenge secrets (the `dev` and
  `leo` passwords, the session secret). They are part of the challenge design, not
  a leak, and do not need rotation.

## Initial release

Original Docker-in-Docker CTF themed on NoSQL injection, built to the same
architecture as the reference Docker-in-Docker CTF (one privileged outer host
running its own Docker engine, an inner Compose stack, and a final Docker socket
breakout back to the outer host).

### Added

- Outer host image (`ubuntu:24.04`) that runs `dockerd` plus `sshd` and deploys
  the inner stack with Docker Compose on start.
- Inner stack: a Node/Express portal (`node:22-bookworm`) backed by MongoDB
  (`mongo:7.0`). The login endpoint builds a Mongo filter directly from the
  parsed JSON request body with no operator stripping, so a NoSQL operator
  injection (for example `{"username":"admin","password":{"$ne":"x"}}`) bypasses
  authentication.
- MongoDB is kept internal to the inner network (not published), so the
  injection, not a direct database dump, is the intended path to its data.
- Five flags across three trust boundaries: the admin console, the app
  container user `leo`, the app container root, the outer host user `dev`, and
  the outer host root.
- Privilege escalation inside the app container through a NOPASSWD `sudo env`
  misconfiguration (GTFOBins).
- Final breakout: the outer host Docker socket is mounted into the app
  container, and a static Docker client is baked into the app image, so app root
  can mount the outer host filesystem and read the outer flags.
- `docs/WALKTHROUGH.md` documenting the intended solution for maintainers.

### Build hygiene

- `VOLUME /var/lib/docker` in the outer image so the nested engine does not run
  overlay-on-overlay (inner builds otherwise fail where `/var/lib/docker` is
  itself an overlay filesystem, for example Docker Desktop).
- Base images and the static Docker client are pulled or fetched by
  architecture at build time (no pre-baked image tarballs), so the challenge
  runs on both amd64 and arm64.
- `.dockerignore` keeps git history, docs, license, and runtime state out of the
  build context; `.gitignore` excludes the runtime MongoDB data directory and
  installed node modules.
