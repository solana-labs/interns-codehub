# bloss-native

Bloss (Web Library for Openpgp Smartcard Signing) enables Chrome extensions to
produce digital signatures for arbitrary messages using locally connected
OpenPGP smart cards.

`bloss-native` is the native messaging host that serves as the middleware
between the browser code and smart cards. It communicates with the smart
cards using CCID connections (which are inaccessible by browser code) and
communicates with browser code by passing JSON messages through standard
input/output streams, as per the `chrome` native messaging API.

## Install

The provided `install.sh` works for macOS and Linux systems.
```
./install.sh <your Chrome extension ID>
```
It will download and install `bloss-native` from crates.io and register it as a
Chrome native messaging host. Your extension will be listed as an allowed
origin in the host's manifest.

Alternatively, you can do the same thing manually by following the steps below.

### Download and install `bloss-native` executable

Run the following to download and install from crates.io:
```
cargo install bloss-native
```
This will install the `bloss-native` executable in your preconfigured Cargo
installation root ([details](https://doc.rust-lang.org/cargo/commands/cargo-install.html)).
If you don't have one configured, the default installation location is
`$HOME/.cargo/bin/bloss-native`.

### Register `bloss-native` as native messaging host

Copy the provided `com.harrisluo.bloss_native.json` manifest into the native
messaging hosts directory. See the
[Chrome docs](https://developer.chrome.com/docs/extensions/mv3/nativeMessaging/#native-messaging-host-location)
to find out where this is for your browser and operating system.

In the manifest, replace `HOST_NAME` with the absolute path to the newly
installed `bloss-native` executable. Replace `EXTENSION_ID` with the ID of
the Chrome extension that will use the native messaging host.

## API

Browser extensions communicate with `bloss-native` using the Chrome native
messaging protocol ([details](https://developer.chrome.com/docs/extensions/mv3/nativeMessaging/)).
Messages are JSON-encoded.

### `{"command":"ListCards"}`

Return the list of OpenPGP smart cards connected to the local machine.

### `{"command":{"SignMessage":{"aid":"<AID>","message":[<message>],"pin":[<pin>]}}}`

Sign a message with the signing key of the OpenPGP smart card specified by the
application identifier `<AID>`. The message is a JSON-encoded list of integers
in the range [0, 255] (the bytes of the message). For PIN-protected cards, the
PIN must be provided as a list of integers in the range [0, 255] (the ASCII
encoding of the PIN string).
