#!/usr/bin/env bash

set -euo pipefail

usage() {
  echo "usage: $0 VERSION ARCH BINARY [OUTPUT_DIR]" >&2
  echo "example: $0 0.1.0 amd64 dist/linux-amd64/agentdock dist/packages" >&2
}

if [[ $# -lt 3 || $# -gt 4 ]]; then
  usage
  exit 64
fi

VERSION="$1"
ARCH="$2"
BINARY="$3"
OUTPUT_DIR="${4:-dist/packages}"

if [[ ! "$VERSION" =~ ^[0-9][0-9A-Za-z.+~-]*$ ]]; then
  echo "VERSION must start with a digit and contain package-safe characters" >&2
  exit 64
fi
case "$ARCH" in
  amd64|arm64) ;;
  *)
    echo "ARCH must be amd64 or arm64" >&2
    exit 64
    ;;
esac

if ! command -v nfpm >/dev/null 2>&1; then
  echo "nfpm is required; pin and install it in the release toolchain" >&2
  exit 69
fi

if [[ ! -x "$BINARY" ]]; then
  echo "compiled AgentDock binary is missing or not executable: $BINARY" >&2
  exit 66
fi

: "${AGENTDOCK_MAINTAINER:?set AGENTDOCK_MAINTAINER for package metadata}"
: "${AGENTDOCK_HOMEPAGE:?set AGENTDOCK_HOMEPAGE for package metadata}"
: "${AGENTDOCK_LICENSE:?set AGENTDOCK_LICENSE after choosing the project license}"

mkdir -p "$OUTPUT_DIR"
OUTPUT_DIR="$(cd "$OUTPUT_DIR" && pwd)"
BINARY="$(cd "$(dirname "$BINARY")" && pwd)/$(basename "$BINARY")"

export VERSION ARCH BINARY
export AGENTDOCK_MAINTAINER AGENTDOCK_HOMEPAGE AGENTDOCK_LICENSE

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
DASHBOARD_DIST="$repo_root/apps/dashboard/dist"
if [[ ! -f "$DASHBOARD_DIST/index.html" ]]; then
  echo "dashboard build is missing: $DASHBOARD_DIST/index.html" >&2
  exit 66
fi
export DASHBOARD_DIST
cd "$script_dir"
for packager in deb rpm archlinux; do
  nfpm package \
    --config nfpm.yaml \
    --packager "$packager" \
    --target "$OUTPUT_DIR/"
done

rm -f "$OUTPUT_DIR/SHA256SUMS"
sha256sum "$OUTPUT_DIR"/* > "$OUTPUT_DIR/SHA256SUMS"
