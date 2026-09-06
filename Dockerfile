FROM ubuntu:24.04

# Base packages for the outer CTF host: its own Docker engine plus sshd.
RUN apt-get update \
    && apt-get install -y docker.io docker-compose-v2 openssh-server nano \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && echo "Setup docker env + ssh env" \
    && mkdir -p /var/lib/docker /run/sshd \
    && sed -i "s/#PermitRootLogin.*/PermitRootLogin no/" /etc/ssh/sshd_config \
    && sed -i "s/#PasswordAuthentication.*/PasswordAuthentication yes/" /etc/ssh/sshd_config \
    && ssh-keygen -A \
    && echo "Adding user dev" \
    && useradd -m dev \
    && echo -n "dev:QvQSG5cQbPyoWdFVN0VO1a" | chpasswd \
    && chmod 0700 /home/dev \
    && userdel ubuntu \
    && echo "Bash configuring" \
    && sed -i 's#/bin/sh#/bin/bash#' /etc/passwd \
    && echo "Linking .bash_history to /dev/null" \
    && ln -sf /dev/null /root/.bash_history \
    && ln -sf /dev/null /home/dev/.bash_history

# Flags, the outer host credential note (reachable only after the socket
# breakout), and the inner stack build files copied in for recon flavor.
COPY ./main_flags/root.txt /root/root.txt
COPY ./main_flags/user.txt /home/dev/user.txt
COPY ./docker-app /home/dev/docker-app

RUN echo "Permissions for flags" \
    && chown root:root /root/root.txt && chmod 0400 /root/root.txt \
    && chown dev:dev /home/dev/user.txt && chmod 0400 /home/dev/user.txt \
    && echo "Outer host credential note, root only" \
    && printf '%s\n' 'dev:QvQSG5cQbPyoWdFVN0VO1a' > /root/dev_credentials.txt \
    && chown root:root /root/dev_credentials.txt && chmod 0400 /root/dev_credentials.txt \
    && echo "Permissions for build files" \
    && chmod 0755 /home/dev/docker-app && chown -R root:root /home/dev/docker-app \
    && chmod 0400 -R /home/dev/docker-app/flags

# Store the inner Docker engine's data on a volume so the nested engine does not
# run overlay-on-overlay (matches the official docker:dind image). Without this,
# inner image builds fail on hosts whose /var/lib/docker is itself an overlay
# filesystem (for example Docker Desktop).
VOLUME /var/lib/docker

EXPOSE 22 23 8080

COPY ./entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/bin/bash", "/entrypoint.sh"]
CMD ["docker", "compose", "-f", "/home/dev/docker-app/docker-compose.yaml", "up"]
