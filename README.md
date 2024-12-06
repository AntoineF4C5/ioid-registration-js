# ioID Device Registration Client example

Ref: 

## How to use
- Follow this tutorial: https://docs.iotex.io/builders/depin/ioid-step-by-step-tutorial/a-fully-decentralized-approach

export your **device owner** account private key (or use a .env file) and an IPFT gateway url:
```sh
export PRIVATE_KEY=0x123...
export IPFS_SERVICE_URL=...
```

- Make sure you minted a Device NFT to your **device owner** account
- Customize the Device NFT contract address [in the code](https://github.com/simonerom/ioid-registration-js/blob/e7108e0c1ccaeb22a3c02884317493a5f676e45d/index.js#L16).
- Also set your NFT token ID if not 0: https://github.com/simonerom/ioid-registration-js/blob/e7108e0c1ccaeb22a3c02884317493a5f676e45d/index.js#L17
- Make sure the firmware is running on your device and the TCP/IP port is accessible from the registration client

```sh
npm install
node index.js
```



  
