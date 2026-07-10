#!/bin/sh

set -eu

# Package scripts intentionally do not pull images or touch a user's Podman
# storage. Onboarding performs all user-scoped provisioning.
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database /usr/share/applications >/dev/null 2>&1 || true
fi

exit 0
