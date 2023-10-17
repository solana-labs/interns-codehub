# bloss-js

Bloss (Web Library for Openpgp Smartcard Signing) enables Chrome extensions to
produce digital signatures for arbitrary messages using locally connected
OpenPGP smart cards.

It uses the `chrome` native messaging API to communicate with `bloss-native`,
the corresponding native messaging host (download and install
[here](https://github.com/harrisluo/bloss/tree/main/native)). `bloss-native`
interacts with locally connected smart cards over CCID connections which are
not directly accessible by browser code.

`bloss-js` is a tiny library that Chrome extensions can use to interact with
`bloss-native`. It abstracts away the Chrome message passing logic and exposes
a minimal interface.

## Install

```
npm i bloss-js
```

## API

* `listCards(): Promise<PgpCardInfo[]>`

  List the OpenPGP smart cards currently connected to the local machine.

* `signMessage(aid: string, message: Uint8Array, pin: Uint8Array, touch_callback: () => void): Promise<Uint8Array>`

  Use the smart card with the specified OpenPGP application identifier (AID)
  to sign a message. The card's PGP signing key (and the key's pre-configured
  signing algorithm) will be used to sign the message.

  Unlock PIN-protected cards by passing in the PIN. Additionally, provide a
  callback to prompt the user in case the card requires touch confirmation.
