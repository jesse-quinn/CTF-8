# challenge-integrity

## ADDED Requirements

### Requirement: Documented solution path is reproducible

The challenge SHALL provide a WALKTHROUGH whose every documented stage succeeds against
the files as built, with no stage that dead-ends, pulls an unavailable resource, or
contradicts the files.

#### Scenario: Every documented stage succeeds against the built files

- **WHEN** a maintainer follows `docs/WALKTHROUGH.md` end to end against a deployed
  instance
- **THEN** each stage completes against the files as built, and no stage depends on a
  resource that is not present after deploy.

### Requirement: Offline-reproducible climax

The socket-breakout step SHALL reuse a container image already present in the outer
engine from the inner build, rather than pulling a new image (for example `alpine`)
that requires network access at solve time.

#### Scenario: Breakout runs on a network-isolated host

- **WHEN** a player reaches app-container root and runs the documented breakout on a
  host with no outbound network after deploy
- **THEN** the breakout container uses an image already cached from the inner build
  (`node:22-bookworm`) and reads the outer flag without pulling a new image.

### Requirement: Walkthrough honesty about the socket primitive

Where a mounted `docker.sock` yields outer root directly, the WALKTHROUGH SHALL state
that plainly and SHALL NOT claim a downstream credential/SSH stage is required when it
is a realism flourish.

#### Scenario: Walkthrough describes the socket as a full outer-root primitive

- **WHEN** a maintainer reads the stage that mounts the outer host filesystem through
  the socket
- **THEN** the walkthrough states that the socket mount reads every outer flag as root
  and that the `dev` SSH stage is a realism flourish, not a gate.

### Requirement: Robust service startup

Service startup SHALL be resilient: any wait for the inner Docker engine SHALL be
bounded and MUST emit a diagnostic on failure rather than hanging silently.

#### Scenario: Inner Docker engine fails to start

- **WHEN** the container is run such that `dockerd` never becomes ready (for example
  without `--privileged`)
- **THEN** `entrypoint.sh` stops waiting after a bounded timeout, prints a diagnostic
  hint and a `dockerd` log tail, and exits non-zero instead of looping silently.

### Requirement: Reproducible build pins

Base images, language packages, and generated host keys the documented exploit depends
on SHALL be pinned or generated deterministically so the challenge builds reproducibly.

#### Scenario: Inner app builds from a committed lockfile

- **WHEN** the inner app image is built
- **THEN** the build installs from a committed `package-lock.json` via `npm ci`, and
  the sshd host keys are generated explicitly with `ssh-keygen -A` rather than relying
  on package postinst behavior.
