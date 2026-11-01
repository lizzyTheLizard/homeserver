# Syntax=docker/dockerfile:1
FROM node:24-bookworm-slim

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# 1. Install base utilities, SSH server, supervisor, PostgreSQL client tools, and
#    GitHub CLI repo dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
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
    && rm -rf /var/lib/apt/lists/* /usr/share/doc/* /usr/share/man/*

# 2. Install GitHub CLI (gh)
RUN mkdir -p -m 0755 /etc/apt/keyrings \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
    && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y --no-install-recommends gh \
    && rm -rf /var/lib/apt/lists/* /usr/share/doc/* /usr/share/man/*

# 3. Enable Corepack (pnpm)
RUN corepack enable \
    && corepack prepare pnpm@latest --activate

# 4. Install Playwright browser OS dependencies. The browser binaries themselves
#    are fetched at runtime (see AGENTS.md) via `pnpm exec playwright install --with-deps`.
RUN apt-get update \
    && npx -y playwright@1.63.0 install-deps chromium \
    && apt-get install -y --no-install-recommends fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/* /usr/share/doc/* /usr/share/man/*


# 5. Install wacli (WhatsApp CLI) — the WhatsApp bridge companion drives this
# binary, so it must be on PATH for `pnpm dev:bridge`.
ARG WACLI_VERSION="0.17.1"
RUN curl -fsSL "https://github.com/openclaw/wacli/releases/download/v${WACLI_VERSION}/wacli_${WACLI_VERSION}_linux_amd64.tar.gz" \
      -o /tmp/wacli.tar.gz \
 && mkdir /tmp/wacli \
 && tar -xzf /tmp/wacli.tar.gz -C /tmp/wacli \
 && mv /tmp/wacli/wacli /usr/local/bin/wacli \
 && chmod +x /usr/local/bin/wacli \
 && rm -rf /tmp/wacli.tar.gz /tmp/wacli

# 6. Install code-server, Deepsek harness and openspec
RUN curl -fsSL https://code-server.dev/install.sh | sh
RUN npm install -g @deepseek-ai/dsh
RUN npm install -g @fission-ai/openspec@latest

# 7. Create dedicated non-root user "dev"
RUN useradd -m -s /bin/bash -u 1234 dev && echo "dev ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# 8. Copy configuration files & entrypoint script
COPY dev-machine/supervisord.conf /etc/supervisor/supervisord.conf
COPY dev-machine/sshd_config /etc/ssh/sshd_config
COPY dev-machine/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p /var/run/sshd
USER dev
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

