# Copyright (c) 2026 Datalayer, Inc.
# Distributed under the terms of the Modified BSD License.

SHELL=/bin/bash

.DEFAULT_GOAL := help

# Where `make setup` puts the Android SDK; exported so the targets below find adb and the emulator without a shell profile change.
export ANDROID_HOME ?= $(HOME)/Android/Sdk
export PATH := $(ANDROID_HOME)/platform-tools:$(ANDROID_HOME)/emulator:$(ANDROID_HOME)/cmdline-tools/latest/bin:$(PATH)

# The simulator/emulator to launch; override with `make dev-ios SIMULATOR="iPhone 16 Pro"`.
SIMULATOR ?= iPhone 16
AVD ?= $(shell command -v emulator >/dev/null 2>&1 && emulator -list-avds 2>/dev/null | head -1)

# Xcode builds and runs iOS apps on macOS only; elsewhere, an EAS build installs on an iPhone.
MACOS_ONLY = [[ "$$(uname -s)" == "Darwin" ]] || { echo "iOS builds need macOS and Xcode. From here: make build-dev-ios (EAS) installs on a registered iPhone, or make dev-web."; exit 1; }

help: ## display this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Setup

setup: ## install JDK 17, Android command-line tools, platform-tools, SDK 36, emulator + one virtual device, EAS CLI (and Xcode tools, CocoaPods on macOS)
	bash scripts/setup.sh

tools: ## show which tools are found and their versions
	@v() { command -v "$$1" >/dev/null 2>&1 && "$$@" 2>&1 | head -1 || echo missing; }; \
	printf 'node         %s\n' "$$(v node --version)"; \
	printf 'java         %s\n' "$$(v java -version)"; \
	printf 'adb          %s\n' "$$(v adb --version)"; \
	printf 'emulator     %s\n' "$$(v emulator -version)"; \
	printf 'avds         %s\n' "$$(command -v emulator >/dev/null 2>&1 && emulator -list-avds 2>/dev/null | tr '\n' ' ' || echo none)"; \
	printf 'sdkmanager   %s\n' "$$(v sdkmanager --version)"; \
	printf 'eas          %s\n' "$$(v eas --version)"; \
	printf 'xcodebuild   %s\n' "$$(v xcodebuild -version)"; \
	printf 'pod          %s\n' "$$(v pod --version)"; \
	printf 'ANDROID_HOME %s\n' "$(ANDROID_HOME)"

##@ Checks

check: ## typecheck, lint, forbidden imports, tests
	npm run check

doctor: ## expo-doctor
	npm run doctor

export: ## bundle both platforms into dist/ to prove the Metro graph resolves
	npm run export

clean: ## remove bundles, Metro cache and the generated native folders
	rm -rf dist .expo ios android

##@ Dev, with an emulator or simulator

dev-android: ## boot the first Android emulator (or AVD=<name>), build the dev app on it, start Metro
	@command -v adb >/dev/null || { echo "adb not found: run 'make setup' first."; exit 1; }
	@if [[ "$$(uname -s)" == "Linux" && ! -w /dev/kvm ]]; then \
	  if [[ ! -e /dev/kvm ]]; then \
	    echo "No /dev/kvm: the x86_64 emulator needs hardware virtualization."; \
	    journalctl -k -b --no-pager 2>/dev/null | grep -qi "disabled (by BIOS)" && \
	      echo "The kernel says it is disabled in the BIOS: enable SVM (AMD) or VT-x (Intel) in the firmware setup, reboot."; \
	    echo "Or use a phone: make dev-device-android"; \
	  else \
	    echo "/dev/kvm is not writable: sudo usermod -aG kvm $$USER, then log out and in."; \
	  fi; \
	  exit 1; \
	fi
	@if ! adb devices | grep -q "emulator-.*device"; then \
	  [[ -n "$(AVD)" ]] || { echo "No Android emulator: run 'make setup' or set AVD=<name>"; exit 1; }; \
	  echo "Booting $(AVD)"; nohup emulator -avd "$(AVD)" -no-metrics >/dev/null 2>&1 & \
	  adb wait-for-device; \
	  until [[ "$$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; do sleep 2; done; \
	fi
	npm run dev:android

dev-ios: ## boot the iOS Simulator (SIMULATOR="iPhone 16"), build the dev app on it, start Metro (macOS)
	@$(MACOS_ONLY)
	xcrun simctl boot "$(SIMULATOR)" 2>/dev/null || true
	open -a Simulator
	npm run dev:ios -- --device "$(SIMULATOR)"

##@ Dev, without an emulator

dev-web: ## the app in a browser at http://localhost:8081: screens and logic only, no push, no live updates, token kept for the tab
	@node -e "require.resolve('react-native-web/package.json')" 2>/dev/null || { echo "react-native-web is not installed: run 'npm install' at the monorepo root, then make dev-web."; exit 1; }
	npm run dev:web

dev-device-android: ## build the dev app on the plugged Android phone (USB debugging on), start Metro
	@command -v adb >/dev/null || { echo "adb not found: run 'make setup' first."; exit 1; }
	@adb start-server >/dev/null 2>&1; \
	phones="$$(adb devices | awk 'NR>1 && $$1 !~ /^emulator-/ && $$2 == "device" {print $$1}')"; \
	if [[ -z "$$phones" ]]; then \
	  if adb devices | awk 'NR>1' | grep -q unauthorized; then \
	    echo "The phone is connected but not authorized: unlock it and accept 'Allow USB debugging'."; \
	  elif adb devices | awk 'NR>1' | grep -q 'no permissions'; then \
	    echo "No permission on the USB device: install udev rules (sudo apt-get install -y android-sdk-platform-tools-common), replug."; \
	  else \
	    echo "No Android phone found. On the phone: Settings > About phone > tap Build number 7 times;"; \
	    echo "then Settings > System > Developer options > USB debugging on. Plug it with a data cable, accept the prompt."; \
	  fi; \
	  exit 1; \
	fi; \
	serial="$$(echo "$$phones" | head -1)"; \
	echo "Using $$serial ($$(adb -s $$serial shell getprop ro.product.model | tr -d '\r'))"; \
	npm run dev:android -- --device "$$serial"

dev-device-ios: ## build the dev app on the plugged iPhone (Developer Mode on), start Metro (macOS)
	@$(MACOS_ONLY)
	npm run dev:ios:device

start: ## Metro only, for a development build already installed on a device or simulator
	npm start

start-tunnel: ## Metro over a tunnel, for a phone that cannot reach this machine
	npm run start:tunnel

build-dev-android: ## EAS development build for Android, installed from the link
	npm run build:dev:android

build-dev-ios: ## EAS development build for registered iPhones (eas device:create first)
	npm run build:dev:ios

build-dev-simulator: ## EAS development build for the iOS Simulator
	npm run build:dev:simulator

##@ Preview and staging

build-preview: ## internal release builds for both platforms
	eas build --platform all --profile preview

build-staging: ## store builds pointed at staging services, for TestFlight and Play internal testing
	eas build --platform all --profile staging

submit-staging: ## upload the latest staging builds to TestFlight and the Play internal track
	eas submit --platform ios --profile staging --latest
	eas submit --platform android --profile staging --latest

##@ Publish (README, Publish; MOBILE.md §5.2) — from a clean, pushed commit only

publish-check: ## refuse to publish from a dirty or unpushed tree
	@git diff --quiet && git diff --cached --quiet || { echo "Commit or stash your changes first."; exit 1; }
	@[[ -z "$$(git log @{u}.. 2>/dev/null)" ]] || { echo "Push your commits first."; exit 1; }
	@echo "Clean at $$(git rev-parse --short HEAD)."

publish-ios: publish-check check ## production .ipa with EAS, submitted to App Store Connect (TestFlight first, then App Review from the console)
	eas build --platform ios --profile production --auto-submit
	@echo "Next: TestFlight testers, then select the build for App Review in App Store Connect."

publish-android: publish-check check ## production .aab with EAS, submitted as a draft to the Play internal track
	eas build --platform android --profile production --auto-submit
	@echo "Next: promote from the internal track to production with a staged rollout in the Play Console."

publish: publish-ios publish-android ## both stores

.PHONY: help setup tools check doctor export clean dev-android dev-ios dev-device-android dev-device-ios dev-web start start-tunnel \
	build-dev-android build-dev-ios build-dev-simulator build-preview build-staging submit-staging \
	publish-check publish-ios publish-android publish
