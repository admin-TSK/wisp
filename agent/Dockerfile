# Wisp agent image. Ships the pinned, unmodified Headroom engine + Apache 2.0 NOTICE.
#
# Build from the repo root (not agent/):
#   docker build -f agent/Dockerfile -t wisp-agent .
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /opt/wisp

# Apache 2.0 attribution travels with every artifact (prime directive #5).
COPY licenses/headroom-NOTICE /opt/wisp/licenses/headroom-NOTICE

COPY agent/pyproject.toml ./
COPY agent/wisp_agent ./wisp_agent

# Installs wisp-agent and the pinned headroom-ai dependency.
RUN pip install --no-cache-dir .

# Local Headroom proxy + read-only device stats feed.
EXPOSE 8787 8788

ENTRYPOINT ["wisp-agent"]
