#!/bin/sh

set -eu

if [ "$(id -u)" -ne 0 ]; then
  exec /usr/bin/sudo -n "$0" "$@"
fi

install -d -m 0755 /etc/apt/apt.conf.d /usr/local/bin
install -d -m 0755 /var/lib/agentdock /var/log/agentdock /run/agentdock

cat > /etc/apt/apt.conf.d/99agentdock <<'EOF'
APT::Get::Assume-Yes "true";
Acquire::Retries "3";
Acquire::http::Timeout "30";
Acquire::https::Timeout "30";
Dpkg::Options {
  "--force-confdef";
  "--force-confold";
};
EOF
chmod 0644 /etc/apt/apt.conf.d/99agentdock

if [ -e /opt/agentdock-user-config/apt-mirror ]; then
  if [ -s /opt/agentdock-user-config/apt-mirror ]; then
    apt_mirror="$(sed -n '1p' /opt/agentdock-user-config/apt-mirror)"
    /opt/agentdock-bootstrap/runtime/configure-apt-mirror "$apt_mirror"
  else
    /opt/agentdock-bootstrap/runtime/configure-apt-mirror --restore
  fi
fi

install -m 0755 \
  /opt/agentdock-bootstrap/runtime/apt-wrapper \
  /usr/local/bin/apt
install -m 0755 \
  /opt/agentdock-bootstrap/runtime/bun-wrapper \
  /usr/local/bin/bun
install -m 0755 \
  /opt/agentdock-bootstrap/runtime/bunx-wrapper \
  /usr/local/bin/bunx

state_file=/var/lib/agentdock/apt-update.json
log_file=/var/log/agentdock/apt-update.log
pid_file=/run/agentdock/apt-update.pid

# init_hooks run on a stopped -> running transition, so any previous PID is stale.
rm -f "$pid_file"
touch "$state_file" "$log_file"
chmod 0644 "$state_file" "$log_file"

(
  if ! /usr/bin/flock -n 8; then
    exit 0
  fi
  started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '{"state":"running","startedAt":"%s"}\n' "$started_at" > "$state_file"

  if /usr/bin/flock -w 1800 /run/lock/agentdock-apt.lock \
      /usr/bin/env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a \
      /usr/bin/apt-get --error-on=any update && \
    /usr/bin/flock -w 1800 /run/lock/agentdock-apt.lock \
      /usr/bin/env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a \
      /usr/bin/apt-get --with-new-pkgs -y upgrade; then
    finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf '{"state":"succeeded","startedAt":"%s","finishedAt":"%s"}\n' \
      "$started_at" "$finished_at" > "$state_file"
  else
    exit_code="$?"
    finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf '{"state":"failed","startedAt":"%s","finishedAt":"%s","exitCode":%s}\n' \
      "$started_at" "$finished_at" "$exit_code" > "$state_file"
  fi

  rm -f "$pid_file"
) 8>/run/lock/agentdock-maintenance-worker.lock </dev/null >> "$log_file" 2>&1 &

printf '%s\n' "$!" > "$pid_file"
chmod 0644 "$pid_file"

exit 0
