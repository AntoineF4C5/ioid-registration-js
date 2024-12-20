# ioID Device Registration Client example

Ref:

## How to use

Make sure you have followed these steps:

- Register a project on IoTeX chain and apply for devices: https://docs.iotex.io/builders/depin/ioid-step-by-step-tutorial
- Start the ioID SDK on the device: (for a linux device) https://github.com/iotexproject/ioID-SDK/tree/main/example/linux/deviceregister/doc

Also install [IPFS-desktop](https://docs.ipfs.tech/install/ipfs-desktop/#ubuntu) to run a node, and allow you to store device's diddoc on IPFS.

Optionally you can also modify `ioIDDeviceRegistrar.js` at lines 39-40 to remove the IPFS api call, and fill a dummy string for the `uri`.

create a .env file and add your config into it (comments inside):

```sh
cp .env.example .env
```

- Make sure you minted a Device NFT to your **device owner** account and set token ID in .env
- Make sure the firmware is running on your device and the TCP/IP port is accessible from the registration client

```sh
npm install
node index.js
```
