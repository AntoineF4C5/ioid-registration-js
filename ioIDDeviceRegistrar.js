const { JsonRpcProvider, Wallet, Contract, AbiCoder, ethers } = require('ethers');
const axios = require('axios');
const https = require('https');

// Constants for defaults
const DEFAULT_DEVICE_SERVICE_URL = 'https://192.168.1.1:8000';
const DEFAULT_PROVIDER_URL = 'https://babel-api.testnet.iotex.io';
const DEFAULT_IOID_REGISTRY_ADDRESS = '0x0A7e595C7889dF3652A19aF52C18377bF17e027D';
const DEFAULT_IPFS_SERVICE_URL = ''; // Replace with your actual IPFS service URL

// Contract ABI for ioIDRegistry (simplified)
const ioIDRegistryABI = [
  "function register(address deviceContract, uint256 tokenId, address user, address device, bytes32 hash, string uri, uint8 v, bytes32 r, bytes32 s) public",
  "function nonces(address device) view returns (uint256)"
];

class IoTDeviceRegistrar {
  constructor(privateKey) {
    this.deviceServiceUrl = DEFAULT_DEVICE_SERVICE_URL;
    this.providerUrl = DEFAULT_PROVIDER_URL;
    this.ioIDRegistryAddress = DEFAULT_IOID_REGISTRY_ADDRESS;
    this.ipfsServiceUrl = DEFAULT_IPFS_SERVICE_URL;
    this.privateKey = privateKey;

    // Initialize provider and wallet
    this.provider = new JsonRpcProvider(this.providerUrl);
    this.wallet = new Wallet(this.privateKey, this.provider);
  }

  // Set device service URL
  setDeviceServiceUrl(url) {
    this.deviceServiceUrl = url;
  }

  // Set provider URL
  setProviderUrl(url) {
    this.providerUrl = url;
    this.provider = new JsonRpcProvider(this.providerUrl);
    this.wallet = this.wallet.connect(this.provider);
  }

  // Set ioID registry address
  setIoIDRegistryAddress(address) {
    this.ioIDRegistryAddress = address;
  }

  // Set IPFS service URL
  setIpfsServiceUrl(url) {
    this.ipfsServiceUrl = url;
 }

  // Fetch device information from the service
  async fetchDevice() {
    try {
      console.log(`Fetching device information from ${this.deviceServiceUrl}/did...`);
      const agent = new https.Agent({ rejectUnauthorized: false });
      const response = await axios.get(`${this.deviceServiceUrl}/did`, { httpsAgent: agent, timeout: 5000 });

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

  // Compute EIP-712 digest
  async computeDigest(did, owner) {
    const EIP712DOMAIN_TYPEHASH = ethers.keccak256(
      ethers.toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
    );
    const PERMIT_TYPE_HASH = ethers.keccak256(
      ethers.toUtf8Bytes("Permit(address owner,uint256 nonce)")
    );

    const formattedDid = did.startsWith("did:io:") ? `${did.slice(7)}` : did;
    const nameHash = ethers.keccak256(ethers.toUtf8Bytes("ioIDRegistry"));
    const versionHash = ethers.keccak256(ethers.toUtf8Bytes("1"));
    const chainId = (await this.provider.getNetwork()).chainId;
    const verifyingContract = this.ioIDRegistryAddress;

    const abiCoder = new AbiCoder();
    const DOMAIN_SEPARATOR = ethers.keccak256(
      abiCoder.encode(
        ["bytes32", "bytes32", "bytes32", "uint256", "address"],
        [EIP712DOMAIN_TYPEHASH, nameHash, versionHash, chainId, verifyingContract]
      )
    );

    const ioIDRegistry = new Contract(this.ioIDRegistryAddress, ioIDRegistryABI, this.provider);
    const nonce = await ioIDRegistry.nonces(formattedDid);

    const dataHash = ethers.keccak256(
      abiCoder.encode(
        ["bytes32", "address", "uint256"],
        [PERMIT_TYPE_HASH, owner, nonce]
      )
    );

    const digest = ethers.keccak256(
      ethers.concat([
        ethers.toUtf8Bytes("\x19\x01"),
        DOMAIN_SEPARATOR,
        dataHash
      ])
    );

    return digest;
  }

  // Upload diddoc to IPFS
  async uploadDidDocToIpfs(diddoc) {
    try {
      const response = await axios.post(`${this.ipfsServiceUrl}/upload`, { data: diddoc, type: 'ipfs' });
      const { cid } = response.data;
      console.log("Uploaded to IPFS with CID:", cid);
      return cid;
    } catch (error) {
      console.error("Error uploading to IPFS:", error.message);
      throw error;
    }
  }

  // Request signature from device
  async requestSignature(hex) {
    try {
      const agent = new https.Agent({ rejectUnauthorized: false });
      console.log("Requesting signature from device...");
      const signResponse = await axios.post(`${this.deviceServiceUrl}/sign`, { hex }, { httpsAgent: agent });
      console.log(signResponse.data.sign);
      return signResponse.data.sign;
    } catch (error) {
      console.error("Error requesting signature:", error.message);
      throw error;
    }
  }

  // Request DID doc from device
  async requestDidDoc() {
    try {
      console.log("Requesting DID doc from device...");
      const agent = new https.Agent({ rejectUnauthorized: false });
      const response = await axios.get(`${this.deviceServiceUrl}/diddoc`, { httpsAgent: agent, timeout: 5000 });

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

  // Register device
  async registerDevice(device, owner, deviceNFTContractAddress, tokenId) {
    const hex = await this.computeDigest(device.did, owner);
    const signature = await this.requestSignature(hex);

    // recver the signer
    const signer = ethers.recoverAddress(hex, signature);
    // Log the signer address
    console.log("Signer address:", signer);
    
    const { r, s, v } = ethers.Signature.from(signature);

    // Upload diddoc to IPFS and get CID
    const diddoc = await this.requestDidDoc();
    const cid = await this.uploadDidDocToIpfs(diddoc);

    const ioIDRegistry = new Contract(this.ioIDRegistryAddress, ioIDRegistryABI, this.wallet);
    const uri = `ipfs://${cid}`; // IPFS URI using the CID

    const tx = await ioIDRegistry.register(
      deviceNFTContractAddress,
      tokenId,
      owner,
      device.did.replace('did:io:', ''),
      hex,
      uri,
      v,
      r,
      s
    );

    console.log("Transaction sent! Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("Transaction confirmed!");
    console.log("Transaction hash:", receipt.hash);
  }
}

module.exports = IoTDeviceRegistrar;