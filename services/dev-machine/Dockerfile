FROM ubuntu:26.04

ENV LANG=C.UTF-8

# renovate: datasource=github-releases depName=cli/cli extractVersion=^v(?<version>.+)$
ARG GH_VERSION=2.105.0
# renovate: datasource=github-releases depName=coder/code-server extractVersion=^v(?<version>.+)$
ARG CODE_SERVER_VERSION=4.146.0
# renovate: datasource=npm depName=@anthropic-ai/claude-code
ARG CLAUDE_CODE_VERSION=2.1.332
# renovate: datasource=npm depName=@fission-ai/openspec
ARG OPENSPEC_VERSION=2.1.1

# 1. System packages
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    libatomic1 \
    openssh-client \
    openssh-server \
    postgresql-client \
    procps \
    sudo \
    supervisor \
    vim \
    xz-utils \
    && rm -rf /var/lib/apt/lists/* /usr/share/doc/* /usr/share/man/*

# 2. Node.js in the version of .nvmrc
COPY .nvmrc /tmp/.nvmrc
RUN NODE_VERSION="$(cat /tmp/.nvmrc)" && curl -fsSL "https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.xz" \
    | tar -xJ -C /usr/local --strip-components=1 --no-same-owner --exclude='*.md' --exclude='*/LICENSE'

# 3. GitHub CLI (gh)
RUN curl -fsSL "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_amd64.tar.gz" \
    | tar -xz -C /usr/local --strip-components=1 --no-same-owner --exclude='*/LICENSE'

# 4. code-server (browser-based VS Code)
RUN curl -fsSL https://code-server.dev/install.sh | sh -s -- --method=standalone --prefix=/usr/local --version="${CODE_SERVER_VERSION}"

# 5. Playwright browser OS dependencies.
RUN npx -y playwright install-deps chromium

# 6. pnpm in the version range of package.json, Claude Code and OpenSpec
COPY package.json /tmp/package.json
RUN PNPM_VERSION="$(node -p "require('/tmp/package.json').devEngines.packageManager.version")" \
    && npm install -g "pnpm@${PNPM_VERSION}" "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}" "@fission-ai/openspec@${OPENSPEC_VERSION}"

# 7. Copy configuration files & entrypoint script
COPY services/dev-machine/supervisord.conf /etc/supervisor/supervisord.conf
COPY services/dev-machine/sshd_config /etc/ssh/sshd_config
COPY services/dev-machine/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh && mkdir -p /var/run/sshd

# 8. Run as non-root user "dev" (uid 1234) with passwordless sudo
RUN useradd -m -s /bin/bash -u 1234 dev && echo "dev ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
USER dev
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
