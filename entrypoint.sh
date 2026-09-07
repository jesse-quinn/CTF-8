#!/bin/bash

set -e

# Bound the wait for the inner Docker engine. Without a timeout a failed dockerd
# (missing --privileged, cgroup/seccomp restriction, corrupt /var/lib/docker)
# makes this container spin forever with no output, indistinguishable from
# "still starting". set -e does not catch it because dockerd runs backgrounded.
DOCKERD_READY_TIMEOUT="${DOCKERD_READY_TIMEOUT:-60}"
DOCKERD_LOG=/var/log/dockerd.log

# Starting docker daemon + starting ssh daemon
dockerd > "$DOCKERD_LOG" 2>&1 &
/usr/sbin/sshd -D > /dev/null 2>&1 &

# Waiting for docker engine to start, bounded, with a diagnostic on timeout.
waited=0
until docker info >/dev/null 2>&1; do
    if [ "$waited" -ge "$DOCKERD_READY_TIMEOUT" ]; then
        echo "ERROR: dockerd did not become ready within ${DOCKERD_READY_TIMEOUT}s." >&2
        echo "Hint: run this container with --privileged (docker run --privileged ...)." >&2
        echo "----- dockerd log tail -----" >&2
        tail -n 40 "$DOCKERD_LOG" >&2 2>/dev/null || true
        exit 1
    fi
    sleep 1
    waited=$((waited + 1))
done

# Executing CMD statement (docker compose builds the inner stack and pulls base images)
exec "$@"
