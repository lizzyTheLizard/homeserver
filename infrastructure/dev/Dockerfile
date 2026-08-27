# Syntax=docker/dockerfile:1
FROM ubuntu:24.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# 1. Install base utilities, SSH server, supervisor, PostgreSQL client tools, and
#    GitHub CLI repo dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    git \
    vim \
    openssh-server \
    postgresql-client \
    supervisor \
    sudo \
    tar \
    gzip \
    unzip \
    zip \
    procps \
    rsync \
    net-tools \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# 2. Install GitHub CLI (gh)
RUN mkdir -p -m 0755 /etc/apt/keyrings \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
    && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# 3. Install Node.js & Corepack (pnpm)
# Build Arguments
ARG NODE_VERSION="24"
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y nodejs \
    && corepack enable \
    && corepack prepare pnpm@latest --activate \
    && rm -rf /var/lib/apt/lists/*

# 4. Install Playwright browser OS dependencies. The browser binaries themselves
#    are fetched at runtime (see AGENTS.md) via `pnpm exec playwright install --with-deps`.
RUN apt-get update && npx -y playwright@1.62.1 install-deps && rm -rf /var/lib/apt/lists/*

# 5. Install Go
ARG GO_VERSION="1.23.0"
RUN curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" | tar -C /usr/local -xz
ENV PATH="/usr/local/go/bin:${PATH}"
ENV GOPATH=/home/dev/go
ENV PATH=/home/dev/go/bin:${PATH}

# Make Go available to login/PAM sessions (e.g. SSH), which read
# /etc/environment instead of the container ENV above.
RUN echo 'PATH="/usr/local/go/bin:/home/dev/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin"' > /etc/environment

# 6. Install code-server and Deepsek harness
RUN curl -fsSL https://code-server.dev/install.sh | sh
RUN npm install -g @deepseek-ai/dsh &&  \
	dsh plugin --profile web add dsh-web-startup-auth@latest && \
	dsh plugin --profile web add dsh-free-search@latest && \
	dsh plugin --profile web add dsh-cost-meter@latest
 

# 7. Create dedicated non-root user "dev"
RUN useradd -m -s /bin/bash -u 1234 dev && echo "dev ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# 8. Configure OpenSSH Server (sshd on port 2222, key-only auth, disable root)
RUN mkdir -p /var/run/sshd \
    && echo "Port 2222" >> /etc/ssh/sshd_config \
    && echo "PermitRootLogin no" >> /etc/ssh/sshd_config \
    && echo "PasswordAuthentication no" >> /etc/ssh/sshd_config \
    && echo "PubkeyAuthentication yes" >> /etc/ssh/sshd_config \
    && echo "AllowUsers dev" >> /etc/ssh/sshd_config

# 9. Copy configuration files & entrypoint script
COPY supervisord.conf /etc/supervisor/supervisord.conf
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
USER dev
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

