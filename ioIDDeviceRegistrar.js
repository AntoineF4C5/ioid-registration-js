const Web3 = require("web3").default;
const axios = require("axios");
const https = require("https");

// Constants for defaults
const DEFAULT_DEVICE_SERVICE_URL = "https://192.168.1.1:8000";
const DEFAULT_PROVIDER_URL = "https://babel-api.testnet.iotex.io";
const DEFAULT_IOID_REGISTRY_ADDRESS = "0x0A7e595C7889dF3652A19aF52C18377bF17e027D";
const DEFAULT_IPFS_SERVICE_URL = ""; // Replace with your actual IPFS service URL

// Contract ABI for ioIDRegistry (simplified)
const ioIDRegistryABI = [
  {
    inputs: [
      { name: "deviceContract", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "user", type: "address" },
      { name: "device", type: "address" },
      { name: "hash", type: "bytes32" },
      { name: "uri", type: "string" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    name: "register",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "device", type: "address" }],
    name: "nonces",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

class IoTDeviceRegistrar {
  constructor(privateKey) {
    this.deviceServiceUrl = DEFAULT_DEVICE_SERVICE_URL;
    this.providerUrl = DEFAULT_PROVIDER_URL;
    this.ioIDRegistryAddress = DEFAULT_IOID_REGISTRY_ADDRESS;
    this.ipfsServiceUrl = DEFAULT_IPFS_SERVICE_URL;
    this.privateKey = privateKey;

    // Initialize Web3
    this.web3 = new Web3(this.providerUrl);
    this.account = this.web3.eth.accounts.privateKeyToAccount(this.privateKey);
    this.web3.eth.accounts.wallet.add(this.account);
  }

  setDeviceServiceUrl(url) {
    this.deviceServiceUrl = url;
  }

  setProviderUrl(url) {
    this.providerUrl = url;
    this.web3.setProvider(new Web3.providers.HttpProvider(this.providerUrl));
  }

  setIoIDRegistryAddress(address) {
    this.ioIDRegistryAddress = address;
  }

  setIpfsServiceUrl(url) {
    this.ipfsServiceUrl = url;
  }

  async fetchDevice() {
    try {
      console.log(
        `Fetching device information from ${this.deviceServiceUrl}/did...`
      );
      const agent = new https.Agent({ rejectUnauthorized: false });
      const response = await axios.get(`${this.deviceServiceUrl}/did`, {
        httpsAgent: agent,
        timeout: 5000,
      });

      if (response.data && response.data.did) {
        console.log(response.data);
        return response.data;
      } else {
        throw new Error("No device found at the provided device service URL.");
      }
    } catch (error) {
      console.error("Error accessing the device service:", error.message);
      throw error;
    }
  }

  async computeDigest(did, owner) {
    const domainSeparator = this.web3.utils.keccak256(
      this.web3.eth.abi.encodeParameters(
        ["bytes32", "bytes32", "bytes32", "uint256", "address"],
        [
          this.web3.utils.keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
          ),
          this.web3.utils.keccak256("ioIDRegistry"),
          this.web3.utils.keccak256("1"),
          await this.web3.eth.getChainId(),
          this.ioIDRegistryAddress,
        ]
      )
    );

    const ioIDRegistry = new this.web3.eth.Contract(
      ioIDRegistryABI,
      this.ioIDRegistryAddress
    );
    const nonce = await ioIDRegistry.methods
      .nonces(did.replace("did:io:", ""))
      .call();

    const dataHash = this.web3.utils.keccak256(
      this.web3.eth.abi.encodeParameters(
        ["bytes32", "address", "uint256"],
        [
          this.web3.utils.keccak256("Permit(address owner,uint256 nonce)"),
          owner,
          nonce,
        ]
      )
    );

    const data = this.web3.utils.encodePacked(
      "\x19\x01",
      domainSeparator,
      dataHash
    );
    const digest = this.web3.utils.keccak256(data);
    console.log("Computed digest:", digest);
    console.log("Data:", data);
    return { data, digest };
  }

  async uploadDidDocToIpfs(diddoc) {
    try {
      const response = await axios.post(`${this.ipfsServiceUrl}/upload`, {
        data: diddoc,
        type: "ipfs",
      });
      const { cid } = response.data;
      console.log("Uploaded to IPFS with CID:", cid);
      return cid;
    } catch (error) {
      console.error("Error uploading to IPFS:", error.message);
      throw error;
    }
  }

  async requestSignature(digest) {
    try {
      const agent = new https.Agent({ rejectUnauthorized: false });
      console.log("Requesting signature from device...");
      const signResponse = await axios.post(
        `${this.deviceServiceUrl}/sign`,
        { hex: digest },
        { httpsAgent: agent }
      );
      console.log("Signature:", signResponse.data.sign);
      return signResponse.data.sign;
    } catch (error) {
      console.error("Error requesting signature:", error.message);
      throw error;
    }
  }

  async requestDidDoc() {
    try {
      console.log("Requesting DID doc from device...");
      const agent = new https.Agent({ rejectUnauthorized: false });
      const response = await axios.get(`${this.deviceServiceUrl}/diddoc`, {
        httpsAgent: agent,
        timeout: 5000,
      });

      if (response.data && response.data.diddoc) {
        console.log(response.data.diddoc);
        return response.data.diddoc;
      } else {
        throw new Error("No DID doc found at the provided device service URL.");
      }
    } catch (error) {
      console.error("Error accessing the device service:", error.message);
      throw error;
    }
  }

  // Decode the signature r, s, v
  decodeSignature(digest, signature, signer) {
    let signerAddress1 = this.web3.eth.accounts.recover(
      digest, '0x1c', 
      signature.substring(0, 66), 
      '0x' + signature.substring(66, 130), true);

    let signerAddress2 = this.web3.eth.accounts.recover(
      digest, '0x1b', 
      signature.substring(0, 66), 
      '0x' + signature.substring(66, 130), true)

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

  async registerDevice(device, owner, deviceNFTContractAddress, tokenId) {

    const { _, digest } = await this.computeDigest(device.did, owner);
    const signature = await this.requestSignature(digest);
    const deviceAddress = device.did.replace("did:io:", "");

    const didAddress = device.did.replace("did:io:", "");
    const { r, s, v } = this.decodeSignature(digest, signature, didAddress);

    if (!r || !s || !v) {
      throw new Error("Invalid signature");
    }

    const diddoc = await this.requestDidDoc();
    const cid = await this.uploadDidDocToIpfs(diddoc);
    const uri = `ipfs://${cid}`;

    const ioIDRegistry = new this.web3.eth.Contract(
      ioIDRegistryABI,
      this.ioIDRegistryAddress
    );
    const tx = ioIDRegistry.methods.register(
      deviceNFTContractAddress,
      tokenId,
      owner,
      didAddress,
      digest,
      uri,
      v,
      r,
      s
    );

    const gas = await tx.estimateGas({ from: this.account.address });
    const gasPrice = await this.web3.eth.getGasPrice();

    const receipt = await tx.send({
      from: this.account.address,
      gas,
      gasPrice,
    });

    console.log("Transaction confirmed!");
    console.log("Transaction hash:", receipt.transactionHash);
  }
}

module.exports = IoTDeviceRegistrar;