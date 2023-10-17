#!/bin/sh

EXTENSION_ID="$1"
if [ -z "$EXTENSION_ID" ]; then
    echo "Usage: ./install.sh <your Chrome extension ID>"
    exit 1
fi

# Download and install bloss-native
cargo install bloss-native --force
HOST_PATH="$( which bloss-native )"
if [ -z "$HOST_PATH" ]; then
    echo "Error: Could not find bloss-native executable after install. " \
         "Please add your custom cargo installation root to PATH."
    exit 1
fi
ESCAPED_HOST_PATH="${HOST_PATH////\\/}"
echo "Installed bloss-native at $HOST_PATH"

set -e

# Get paths
HOST_NAME=com.harrisluo.bloss_native
PROJECT_DIR="$( cd "$( dirname "$0" )" && pwd )"
MANIFEST_SOURCE_PATH="$PROJECT_DIR/$HOST_NAME.json"
if [ "$(uname -s)" == "Darwin" ]; then
  if [ "$(whoami)" == "root" ]; then
    CHROME_NATIVE_HOST_DIR="/Library/Google/Chrome/NativeMessagingHosts"
    CHROMIUM_NATIVE_HOST_DIR="/Library/Application Support/Chromium/NativeMessagingHosts"
  else
    CHROME_NATIVE_HOST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
    CHROMIUM_NATIVE_HOST_DIR="$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
  fi
else
  if [ "$(whoami)" == "root" ]; then
    CHROME_NATIVE_HOST_DIR="/etc/opt/chrome/native-messaging-hosts"
    CHROMIUM_NATIVE_HOST_DIR="/etc/chromium/native-messaging-hosts"
  else
    CHROME_NATIVE_HOST_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
    CHROMIUM_NATIVE_HOST_DIR="$HOME/.config/chromium/NativeMessagingHosts"
  fi
fi

# Create native messaging host manifest
mkdir -p "$CHROME_NATIVE_HOST_DIR"
cp "$MANIFEST_SOURCE_PATH" "$CHROME_NATIVE_HOST_DIR"
sed -i "" -e "s/HOST_PATH/$ESCAPED_HOST_PATH/" -e "s/EXTENSION_ID/$EXTENSION_ID/" "$CHROME_NATIVE_HOST_DIR/$HOST_NAME.json"
chmod a+r "$CHROME_NATIVE_HOST_DIR/$HOST_NAME.json"

mkdir -p "$CHROMIUM_NATIVE_HOST_DIR"
cp "$MANIFEST_SOURCE_PATH" "$CHROMIUM_NATIVE_HOST_DIR"
sed -i "" -e "s/HOST_PATH/$ESCAPED_HOST_PATH/" -e "s/EXTENSION_ID/$EXTENSION_ID/" "$CHROMIUM_NATIVE_HOST_DIR/$HOST_NAME.json"
chmod a+r "$CHROMIUM_NATIVE_HOST_DIR/$HOST_NAME.json"

# Done
echo "Registered bloss-native as native messaging host"
echo "Chrome manifest: $CHROME_NATIVE_HOST_DIR/$HOST_NAME.json"
echo "Chromium manifest: $CHROMIUM_NATIVE_HOST_DIR/$HOST_NAME.json"
