# Tasks

1. [x] Bound the `dockerd` wait in `entrypoint.sh`: log `dockerd` to a file, loop with
   a timeout, and on timeout print a diagnostic (with a `--privileged` hint and a log
   tail) and `exit 1`.
2. [x] Add `ssh-keygen -A` to the sshd RUN block in `docker-app/app.Dockerfile` so the
   inner app image generates host keys deterministically.
3. [x] Commit `docker-app/app/package-lock.json` and switch the inner app build to copy
   the lockfile and run `npm ci --omit=dev` in `docker-app/app.Dockerfile`.
4. [x] Target the outer image's login-shell change at `root` and `dev` in `Dockerfile`,
   dropping the global `passwd` sed.
5. [x] Switch the socket-breakout command in `docs/WALKTHROUGH.md` from `alpine` to the
   already-cached `node:22-bookworm`.
6. [x] Add walkthrough honesty note: the mounted socket is a full outer-root primitive
   and the `dev` SSH stage is a realism flourish, not a gate.
7. [x] Add a `CHANGELOG.md` entry dated 2026-09-06 summarizing the integrity fixes.
8. [x] Run `bash -n entrypoint.sh` and `openspec validate improve-challenge-integrity
   --strict`.
