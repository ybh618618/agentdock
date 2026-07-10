#!/usr/bin/env bash

set -euo pipefail

readonly container_name="agentdock-ubuntu"
factory_reset=false
confirmed=false

for argument in "$@"; do
  case "$argument" in
    --factory)
      factory_reset=true
      ;;
    --confirm)
      confirmed=true
      ;;
    *)
      echo "unknown argument: $argument" >&2
      exit 64
      ;;
  esac
done

if [[ "$confirmed" != true ]]; then
  echo "refusing to reset without --confirm" >&2
  exit 64
fi

if ! command -v distrobox >/dev/null 2>&1; then
  echo "distrobox is not installed" >&2
  exit 69
fi

DBX_NON_INTERACTIVE=1 distrobox stop --yes "$container_name" >/dev/null 2>&1 || true

if [[ "$factory_reset" == true ]]; then
  DBX_NON_INTERACTIVE=1 distrobox rm --force --rm-home "$container_name"
else
  DBX_NON_INTERACTIVE=1 distrobox rm --force "$container_name"
fi

printf '{"stage":"reset","status":"succeeded","factoryReset":%s}\n' \
  "$factory_reset"
