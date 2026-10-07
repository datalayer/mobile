#!/usr/bin/env bash
# Copyright (c) 2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

# Installs what `make dev-*` needs and nothing the repository already brings:
# a JDK 17, the Android command-line tools, platform-tools (adb), the SDK
# platform Expo SDK 57 compiles against, the emulator with one system image
# and one virtual device, EAS CLI, and on macOS the Xcode tools and CocoaPods.
# Idempotent: everything already present is kept.

set -euo pipefail

ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
# What Expo SDK 57 / React Native 0.86 build against (react-native/gradle/libs.versions.toml).
PLATFORM="android-36"
BUILD_TOOLS="36.0.0"
NDK="27.1.12297006"
SYSTEM_IMAGE="system-images;${PLATFORM};google_apis;${ARCH_IMAGE:-x86_64}"
AVD_NAME="${AVD:-Pixel_8_API_36}"
# From https://developer.android.com/studio#command-line-tools-only
CMDLINE_TOOLS_BUILD="${CMDLINE_TOOLS_BUILD:-15859902}"
JDK_MAJOR=17

say() { printf '\033[36m%s\033[0m\n' "$*"; }
have() { command -v "$1" >/dev/null 2>&1; }

os="$(uname -s)"
arch="$(uname -m)"

# ── JDK ─────────────────────────────────────────────────────────────────────

java_major() {
  have java || { echo 0; return; }
  java -version 2>&1 | head -1 | sed -E 's/.*"([0-9]+)(\.[0-9]+)*.*/\1/'
}

if [[ "$(java_major)" -lt "$JDK_MAJOR" ]]; then
  say "Installing a JDK ${JDK_MAJOR}"
  if [[ -n "${CONDA_PREFIX:-}" ]] && have conda; then
    conda install -y -c conda-forge "openjdk=${JDK_MAJOR}"
  elif have brew; then
    brew install "openjdk@${JDK_MAJOR}"
    sudo ln -sfn "$(brew --prefix)/opt/openjdk@${JDK_MAJOR}/libexec/openjdk.jdk" /Library/Java/JavaVirtualMachines/openjdk-${JDK_MAJOR}.jdk
  elif have apt-get; then
    sudo apt-get update && sudo apt-get install -y "openjdk-${JDK_MAJOR}-jdk"
  else
    echo "Install a JDK ${JDK_MAJOR} (Temurin or OpenJDK) and run this again." >&2
    exit 1
  fi
else
  say "JDK $(java_major) present"
fi

# ── Android command-line tools ──────────────────────────────────────────────

case "$os" in
  Linux) tools_os="linux" ;;
  Darwin) tools_os=$([[ "$arch" == "arm64" ]] && echo "mac_arm64" || echo "mac_x86_64") ;;
  *) echo "Unsupported OS: $os" >&2; exit 1 ;;
esac

SDKMANAGER="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
if [[ ! -x "$SDKMANAGER" ]]; then
  say "Installing the Android command-line tools into $ANDROID_HOME"
  mkdir -p "$ANDROID_HOME/cmdline-tools"
  tmp="$(mktemp -d)"
  curl -fsSL "https://dl.google.com/android/repository/commandlinetools-${tools_os}-${CMDLINE_TOOLS_BUILD}_latest.zip" -o "$tmp/tools.zip"
  unzip -q "$tmp/tools.zip" -d "$tmp"
  rm -rf "$ANDROID_HOME/cmdline-tools/latest"
  mv "$tmp/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
  rm -rf "$tmp"
else
  say "Android command-line tools present"
fi

say "Accepting the SDK licenses and installing platform-tools, ${PLATFORM}, build-tools ${BUILD_TOOLS}, NDK ${NDK}, the emulator and ${SYSTEM_IMAGE}"
yes | "$SDKMANAGER" --licenses >/dev/null || true
"$SDKMANAGER" "platform-tools" "platforms;${PLATFORM}" "build-tools;${BUILD_TOOLS}" "ndk;${NDK}" "emulator" "$SYSTEM_IMAGE"

AVDMANAGER="$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager"
if ! "$AVDMANAGER" list avd -c 2>/dev/null | grep -qx "$AVD_NAME"; then
  say "Creating the virtual device $AVD_NAME"
  echo no | "$AVDMANAGER" create avd -n "$AVD_NAME" -k "$SYSTEM_IMAGE" -d "pixel_8" >/dev/null
else
  say "Virtual device $AVD_NAME present"
fi

# ── macOS: Xcode tools and CocoaPods ─────────────────────────────────────────

if [[ "$os" == "Darwin" ]]; then
  if ! xcode-select -p >/dev/null 2>&1; then
    say "Installing the Xcode Command Line Tools (a dialog opens; run this again when it is done)"
    xcode-select --install
    exit 1
  fi
  if ! have xcodebuild; then
    echo "Install Xcode from the App Store, open it once, then run this again." >&2
    exit 1
  fi
  if ! have pod; then
    say "Installing CocoaPods"
    if have brew; then brew install cocoapods; else sudo gem install cocoapods; fi
  else
    say "CocoaPods present"
  fi
fi

# ── EAS CLI and Watchman ─────────────────────────────────────────────────────

if ! have eas; then
  say "Installing eas-cli"
  npm install -g eas-cli
else
  say "eas-cli present"
fi

if ! have watchman && have brew; then
  say "Installing watchman"
  brew install watchman
fi

# ── Shell environment ────────────────────────────────────────────────────────

cat <<EOF

Add to your shell profile (~/.bashrc, ~/.zshrc), then open a new shell:

  export ANDROID_HOME="$ANDROID_HOME"
  export PATH="\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/emulator:\$ANDROID_HOME/cmdline-tools/latest/bin:\$PATH"

The Makefile exports them for its own targets, so \`make dev-android\` works right away.
Then: \`eas login\`, and \`make dev-android\` or \`make dev-device-android\`.
EOF
