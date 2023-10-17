# bloss

Web library for OpenPGP smart card signing.

Browser-sandboxed code cannot communicate with smart card readers because
the WebUSB API blocks the standard CCID connections required to do so. Bloss
is a two-component middleware solution that works around this using the
`chrome` native messaging API provided to browser and browser extension code.

## bloss-native

The Chrome native messaging host that runs as a native executable on the local
machine that the smart cards are connected to. It interacts with the cards over
CCID and communicates with clients using JSON over standard input/output
streams, as per the Chrome native messaging protocol.

## bloss-js

A lightweight library that browser extension code can use to communicate with
`bloss-native` using the native messaging protocol.
