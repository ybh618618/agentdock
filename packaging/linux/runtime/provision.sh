#!/usr/bin/env bash

set -euo pipefail

readonly container_name="agentdock-ubuntu"
readonly image="docker.io/library/ubuntu:26.04"

emit() {
  local stage="$1"
  local status="$2"
  local message="$3"
  printf '{"stage":"%s","status":"%s","message":"%s"}\n' \
    "$stage" "$status" "$message"
}

fail() {
  emit "$1" "failed" "$2"
  exit 1
}

for executable in podman distrobox distrobox-assemble; do
  if ! command -v "$executable" >/dev/null 2>&1; then
    fail "preflight" "Missing required executable: $executable"
  fi
done

emit "preflight" "running" "Checking rootless Podman"
if [[ "$(id -u)" -eq 0 ]]; then
  fail "preflight" "AgentDock runtime provisioning must run as the desktop user, not root"
fi
if ! podman info >/dev/null 2>&1; then
  fail "preflight" "Rootless Podman is not ready; check subuid/subgid and Podman storage"
fi
emit "preflight" "succeeded" "Rootless Podman is ready"

emit "image" "running" "Pulling Ubuntu 26.04 when missing"
if ! podman pull --policy missing "$image" >&2; then
  fail "image" "Unable to pull the Ubuntu 26.04 runtime image"
fi
emit "image" "succeeded" "Runtime image is available"

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bootstrap_root="$(cd "$script_dir/.." && pwd)"
if [[ -n "${AGENTDOCK_BINARY:-}" ]]; then
  agentdock_binary="$AGENTDOCK_BINARY"
elif command -v agentdock >/dev/null 2>&1; then
  agentdock_binary="$(command -v agentdock)"
elif command -v bun >/dev/null 2>&1; then
  agentdock_binary="$(command -v bun)"
else
  fail "configuration" "AgentDock/Bun executable is unavailable for the container bunx bridge"
fi
config_root="${XDG_CONFIG_HOME:-$HOME/.config}/agentdock"
data_root="${XDG_DATA_HOME:-$HOME/.local/share}/agentdock"
runtime_home="$data_root/runtime-home"
runtime_config="$config_root/runtime"
manifest="$config_root/distrobox.ini"

mkdir -p "$config_root" "$runtime_config" "$runtime_home"
chmod 0700 \
  "$config_root" "$runtime_config" "$data_root" "$runtime_home" \
  2>/dev/null || true

if [[ -v AGENTDOCK_APT_MIRROR ]]; then
  if [[ -n "$AGENTDOCK_APT_MIRROR" ]]; then
    if [[ ! "$AGENTDOCK_APT_MIRROR" =~ ^https?://[A-Za-z0-9._~:/-]+$ ]]; then
      fail "configuration" "APT mirror must be a simple HTTP or HTTPS URL"
    fi
    printf '%s\n' "${AGENTDOCK_APT_MIRROR%/}" > "$runtime_config/apt-mirror.tmp"
    chmod 0600 "$runtime_config/apt-mirror.tmp"
    mv -f "$runtime_config/apt-mirror.tmp" "$runtime_config/apt-mirror"
  else
    : > "$runtime_config/apt-mirror.tmp"
    chmod 0600 "$runtime_config/apt-mirror.tmp"
    mv -f "$runtime_config/apt-mirror.tmp" "$runtime_config/apt-mirror"
  fi
fi

escaped_runtime_home="${runtime_home//&/\\&}"
escaped_runtime_home="${escaped_runtime_home//|/\\|}"
escaped_runtime_config="${runtime_config//&/\\&}"
escaped_runtime_config="${escaped_runtime_config//|/\\|}"
escaped_image="${image//&/\\&}"
escaped_image="${escaped_image//|/\\|}"
escaped_bootstrap_root="${bootstrap_root//&/\\&}"
escaped_bootstrap_root="${escaped_bootstrap_root//|/\\|}"
escaped_agentdock_binary="${agentdock_binary//&/\\&}"
escaped_agentdock_binary="${escaped_agentdock_binary//|/\\|}"
sed -e "s|@RUNTIME_HOME@|$escaped_runtime_home|g" \
  -e "s|@RUNTIME_CONFIG@|$escaped_runtime_config|g" \
  -e "s|@IMAGE@|$escaped_image|g" \
  -e "s|@BOOTSTRAP_ROOT@|$escaped_bootstrap_root|g" \
  -e "s|@AGENTDOCK_BINARY@|$escaped_agentdock_binary|g" \
  "$script_dir/distrobox.ini.in" > "$manifest.tmp"
chmod 0600 "$manifest.tmp"
mv -f "$manifest.tmp" "$manifest"

emit "container" "running" "Creating the AgentDock Distrobox"
if ! DBX_NON_INTERACTIVE=1 distrobox-assemble create \
  --file "$manifest" --name "$container_name" >&2; then
  fail "container" "Distrobox creation failed"
fi

# The first enter finishes Distrobox user integration. The apt hook backgrounds
# its work, so this does not wait for a full package upgrade.
if ! DBX_NON_INTERACTIVE=1 distrobox-enter \
  --no-tty --name "$container_name" -- true >&2; then
  fail "container" "Distrobox initialization failed"
fi
emit "container" "succeeded" "AgentDock runtime is ready"
