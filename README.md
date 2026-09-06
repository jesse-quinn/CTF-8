# NoSQL Injection CTF (Docker-in-Docker)

NoSQL Injection CTF is a Capture The Flag challenge that runs as a single
privileged Docker container. Inside it, an outer host runs its own Docker engine
and deploys a small web stack (a Node/Express portal backed by MongoDB) with
Docker Compose. The way in is a classic NoSQL operator injection that bypasses
the portal login; from there you work into the inner container, escalate to
root, and finally break back out to the outer host.

There are five flags:

| Flag file | Location | Prefix |
|---|---|---|
| admin.txt | app container, admin console | `FLAG{...}` |
| leo.txt | app container, user `leo` | `FLAG{...}` |
| app-root.txt | app container, `root` | `NOSQL_FLAG{...}` |
| user.txt | outer host, user `dev` | `MAIN_FLAG{...}` |
| root.txt | outer host, `root` | `MAIN_FLAG{...}` |

## Requirements

- Docker Engine that can run a privileged container (Docker Desktop works).
- Internet access on the first run: the inner stack pulls its base images
  (node, mongo) and a static Docker client at build time.
- Works on both amd64 and arm64 hosts.

## Running the challenge

```bash
git clone https://github.com/jesse-quinn/CTF-8.git
cd CTF-8
docker image build -t nosql-ctf:latest .
docker container run -it --rm --privileged \
  --hostname nosql-ctf --name nosql-ctf \
  -p 8080:8080 -p 22:22 -p 23:23 \
  nosql-ctf:latest
```

Run the build and run from inside the cloned `CTF-8` directory. On Docker
Desktop (macOS, Windows) do not use `sudo`; on a Linux host, prefix both
commands with `sudo` or add your user to the `docker` group.

Then wait for the inner Docker Compose stack to finish deploying. The portal is
served on port 8080, the app container SSH on port 23, and the outer host SSH on
port 22. MongoDB is not published; it is reachable only from the portal, so the
injection is the intended way to reach its data.

Note: if you use `-d`, you will not see the inner Compose deployment progress.

If some of those host ports are already in use on your machine, remap the left
side of each `-p` flag (for example `-p 18090:8080 -p 18022:22 -p 18023:23`); the
challenge itself is unaffected.

## Rules

- Do not read the flag files or the solution notes during setup. The challenge
  is finding them through gameplay.
- The intended solution path is documented, for maintainers, in
  `docs/WALKTHROUGH.md`. It is a spoiler; do not open it if you want to play.

## Credits

This is an original challenge by Jesse Quinn, inspired by the
Himanshukr000/CTF-DOCKERS collection and themed on web/database NoSQL injection
(Node/Express and MongoDB). See `CHANGELOG.md` for the release history.
