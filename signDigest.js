const DeviceService = require("./deviceService");
const IoTDeviceRegistrar = require("./ioIDDeviceRegistrar");
const Web3 = require("web3").default;
const { DEFAULTS } = require("./constants");

require("dotenv").config();

async function signDigest(digest) {
  const deviceService = new DeviceService("http://127.0.0.1:8000");
  let did_json = await deviceService.fetchDevice();
  let signer = did_json.did.replace("did:io:", "");
  let signature = await deviceService.requestSignature(digest);
  let { v, r, s } = decodeSignature(digest, signature, signer);

  console.log(v);
  console.log(r);
  console.log(s);
}

// Decode the signature r, s, v
function decodeSignature(digest, signature, signer) {
  web3 = new Web3();

  let signerAddress1 = web3.eth.accounts.recover(
    digest,
    "0x1c",
    signature.substring(0, 66),
    "0x" + signature.substring(66, 130),
    true
  );

  let signerAddress2 = web3.eth.accounts.recover(
    digest,
    "0x1b",
    signature.substring(0, 66),
    "0x" + signature.substring(66, 130),
    true
  );

  const r = signature.substring(0, 66);
  const s = "0x" + signature.substring(66, 130);

  if (signerAddress1.toLowerCase() == signer.toLowerCase()) {
    return { r, s, v: "0x1c" };
  } else if (signerAddress2.toLowerCase() == signer.toLowerCase()) {
    return { r, s, v: "0x1b" };
  } else {
    return null;
  }
}

signDigest(process.argv[2]);
