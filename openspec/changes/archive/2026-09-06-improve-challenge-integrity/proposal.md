# Improve challenge integrity

## Why

An adversarial review of this Docker-in-Docker challenge (2026-09-06) confirmed the
intended solution path traces correctly against the files, but found robustness and
reproducibility defects that can make the challenge look broken at deploy or at its
climax:

- `entrypoint.sh` waits for the inner Docker engine with an unbounded, silent loop.
  If `dockerd` fails to start (missing `--privileged`, cgroup/seccomp restriction, a
  corrupt `/var/lib/docker`), the container neither exits nor logs anything; a runner
  cannot tell "still starting" from "permanently broken." `set -e` does not help
  because the failure is inside a backgrounded subshell.
- The documented final breakout pulls `alpine` at solve time, a hidden mid-game
  network dependency; on a network-isolated host the winning step fails even though
  the challenge is fully up.
- The inner app image relies on the openssh-server postinst for host keys instead of
  generating them explicitly as the outer image does.
- The inner app has no committed lockfile, so transitive npm dependencies resolve
  fresh on every build; the build is not reproducible.
- The walkthrough presents the outer-host `dev` SSH stage as required, when the
  mounted socket already yields full outer-root read of every flag.

## What Changes

- **ADDED** Robust service startup: bound the `dockerd` wait in `entrypoint.sh` and
  emit a diagnostic (with a `--privileged` hint and a `dockerd` log tail) on timeout,
  then `exit 1`, instead of hanging silently.
- **ADDED** Offline-reproducible climax: point the socket-breakout command at an
  image the outer engine already has from the inner build (`node:22-bookworm`)
  instead of pulling `alpine` at solve time.
- **ADDED** Walkthrough honesty about the socket primitive: state plainly that the
  mounted `docker.sock` is a full outer-root read primitive and the `dev` SSH stage
  is a realism flourish, not a gate.
- **ADDED** Reproducible build pins: commit a `package-lock.json` and switch the
  inner app build to `npm ci`; add an explicit `ssh-keygen -A` to the inner app image
  so host keys exist deterministically.
- Hygiene (nit, same review): target the outer image's login-shell change at `root`
  and `dev` instead of rewriting every account's shell with a global `passwd` sed.

## Impact

- Affected: `entrypoint.sh`, `Dockerfile`, `docker-app/app.Dockerfile`,
  `docker-app/app/package.json` (new committed `docker-app/app/package-lock.json`),
  `docs/WALKTHROUGH.md`, `CHANGELOG.md`.
- Challenge content and docs only. **No scoring or flag-value change**: every flag
  keeps its value, path, prefix, and intended reader; no credential value changes.
- No git commit is made; all edits are left uncommitted in the working tree.
