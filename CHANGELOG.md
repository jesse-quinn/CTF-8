# Changelog

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
