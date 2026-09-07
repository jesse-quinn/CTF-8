FROM node:22-bookworm

ARG DOCKER_CLI_VERSION=27.5.1

# Runtime tooling: sshd for the inner-host pivot, sudo for the privilege
# escalation, and a static Docker CLI used for the final socket breakout.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        openssh-server sudo curl ca-certificates \
    && echo "Installing a static Docker CLI (used for the final socket breakout)" \
    && arch="$(uname -m)" \
    && curl -fsSL "https://download.docker.com/linux/static/stable/${arch}/docker-${DOCKER_CLI_VERSION}.tgz" -o /tmp/docker.tgz \
    && tar -xzf /tmp/docker.tgz -C /usr/local/bin --strip-components=1 docker/docker \
    && rm -f /tmp/docker.tgz \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Shared maintenance account reachable over the inner SSH service. The password
# is disclosed only to an admin of the portal (via the seeded ops note).
RUN useradd -m -s /bin/bash leo \
    && echo "leo:IgHxliQsdTloKHhpNTC1QA" | chpasswd \
    && mkdir -p /run/sshd \
    && sed -i 's/#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config \
    && sed -i 's/#\?PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config \
    && ssh-keygen -A \
    && ln -sf /dev/null /root/.bash_history \
    && ln -sf /dev/null /home/leo/.bash_history

# GTFOBins-style misconfiguration: leo may run env as root without a password,
# which yields a trivial root shell (sudo env /bin/sh).
COPY --chmod=440 ./sudoers /etc/sudoers.d/leo

WORKDIR /app
# Install from the committed lockfile so transitive deps are pinned and the
# build is reproducible.
COPY ./app/package.json ./app/package-lock.json ./
RUN npm ci --omit=dev

COPY ./app/server.js ./server.js

# Flags. admin.txt is served only through the authenticated admin console.
RUN mkdir -p /app/secret
COPY --chown=root:root --chmod=400 ./flags/admin.txt /app/secret/admin.txt
COPY --chown=leo:leo --chmod=400 ./flags/leo.txt /home/leo/leo.txt
COPY --chown=root:root --chmod=400 ./flags/app-root.txt /root/app-root.txt

EXPOSE 8080 22

CMD service ssh start && node /app/server.js
