# ioID Device Registration Client example

Ref: 

## How to use
- Follow this tutorial: https://docs.iotex.io/builders/depin/ioid-step-by-step-tutorial/a-fully-decentralized-approach

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



  
