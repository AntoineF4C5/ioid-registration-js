const Web3 = require("web3").default;
const { DEFAULTS, IOID_REGISTRY_ABI } = require("./constants");
const DeviceService = require("./deviceService");
const IPFSService = require("./ipfsService");

class IoTDeviceRegistrar {
  constructor(privateKey, config = {}) {
    this.config = {
      deviceServiceUrl: config.deviceServiceUrl || DEFAULTS.DEVICE_SERVICE_URL,
      providerUrl: config.providerUrl || DEFAULTS.PROVIDER_URL,
      ioIDRegistryAddress:
        config.ioIDRegistryAddress || DEFAULTS.IOID_REGISTRY_ADDRESS,
      ipfsServiceUrl: config.ipfsServiceUrl || DEFAULTS.IPFS_SERVICE_URL,
      deviceNFTContractAddress: config.deviceNFTContractAddress || DEFAULTS.DEVICE_NFT_CONTRACT_ADDRESS,
    };

    this.privateKey = privateKey;

    this.web3 = new Web3(this.config.providerUrl);
    this.account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
    this.web3.eth.accounts.wallet.add(this.account);

    this.deviceService = new DeviceService(this.config.deviceServiceUrl);
    this.ipfsService = new IPFSService(this.config.ipfsServiceUrl);
  }

  async registerDevice(device, owner, tokenId) {
    console.log("Registering device...");
    const { digest } = await this.computeDigest(device.did, owner);
    const signature = await this.deviceService.requestSignature(digest);

    const { r, s, v } = this.decodeSignature(
      digest,
      signature,
      device.did.replace("did:io:", "")
    );

    const diddoc = await this.deviceService.fetchDidDoc();
    const cid = await this.ipfsService.upload(diddoc);
    const uri = `ipfs://${cid}`;

    const ioIDRegistry = new this.web3.eth.Contract(
      IOID_REGISTRY_ABI,
      this.config.ioIDRegistryAddress
    );

    const tx = ioIDRegistry.methods.register(
      this.config.deviceNFTContractAddress,
      tokenId,
      owner,
      device.did.replace("did:io:", ""),
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

    console.log("Device registered successfully!");
    console.log("Transaction hash:", receipt.transactionHash);
    return receipt.transactionHash;
  }

// Fetch device information
  async fetchDevice() {
    const url = `${this.config.deviceServiceUrl}/did`;
    console.log(`Fetching device information from ${url}...`);
    try {
      const response = await axios.get(url, {
        httpsAgent: this.createHttpsAgent(),
        timeout: 5000,
      });
      if (response.data?.did) return response.data;
      throw new Error("No device found at the device service URL.");
    } catch (error) {
      console.error("Error fetching device information:", error.message);
      throw error;
    }
  }

  // Compute digest for signing
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
          this.config.ioIDRegistryAddress,
        ]
      )
    );

    const ioIDRegistry = new this.web3.eth.Contract(
      IOID_REGISTRY_ABI,
      this.config.ioIDRegistryAddress
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

    const digest = this.web3.utils.keccak256(
      this.web3.utils.encodePacked("\x19\x01", domainSeparator, dataHash)
    );

    return { digest };
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
}

module.exports = IoTDeviceRegistrar;