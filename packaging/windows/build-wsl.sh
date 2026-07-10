#!/usr/bin/env bash

set -euo pipefail

usage() {
  echo "usage: $0 VERSION [amd64|arm64] [OUTPUT_DIR]" >&2
}

if [[ $# -lt 1 || $# -gt 3 ]]; then
  usage
  exit 64
fi

VERSION="$1"
ARCH="${2:-amd64}"
OUTPUT_DIR="${3:-dist/wsl}"

if [[ ! "$VERSION" =~ ^[0-9][0-9A-Za-z.+-]*$ ]]; then
  echo "VERSION must start with a digit and contain artifact-safe characters" >&2
  exit 64
fi

case "$ARCH" in
  amd64|arm64) ;;
  *)
    usage
    exit 64
    ;;
esac

if ! command -v podman >/dev/null 2>&1; then
  echo "podman is required to build the WSL root filesystem" >&2
  exit 69
fi

binary="dist/linux-${ARCH}/agentdock"
if [[ ! -x "$binary" ]]; then
  echo "compiled AgentDock binary is missing or not executable: $binary" >&2
  exit 66
fi

mkdir -p "$OUTPUT_DIR"
OUTPUT_DIR="$(cd "$OUTPUT_DIR" && pwd)"
artifact="$OUTPUT_DIR/AgentDock-${VERSION}-${ARCH}.wsl"
image_version="${VERSION//+/-}"
image="localhost/agentdock-wsl-build:${image_version}-${ARCH}"
container="agentdock-wsl-export-${ARCH}-$$"

cleanup() {
  podman rm -f "$container" >/dev/null 2>&1 || true
}
trap cleanup EXIT

podman build \
  --arch "$ARCH" \
  --build-arg "TARGETARCH=$ARCH" \
  --file packaging/windows/Containerfile \
  --tag "$image" \
  .

podman create --name "$container" "$image" /bin/true >/dev/null
podman export "$container" | gzip -9 > "$artifact.tmp"
mv -f "$artifact.tmp" "$artifact"

for required_path in \
  etc/wsl-distribution.conf \
  etc/wsl.conf \
  usr/lib/agentdock/agentdock \
  usr/lib/systemd/system/agentdock.service; do
  if ! tar -tzf "$artifact" "$required_path" >/dev/null 2>&1; then
    echo "WSL artifact is missing $required_path" >&2
    exit 65
  fi
done

sha256sum "$artifact" > "$artifact.sha256"
echo "$artifact"
