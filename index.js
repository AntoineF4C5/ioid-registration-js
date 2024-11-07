require('dotenv').config();
const { JsonRpcProvider, Wallet, Contract, AbiCoder, ethers } = require('ethers'); // Direct imports for v6
const axios = require('axios');
const https = require('https');
const inquirer = require('inquirer');

// Load environment variables
const providerUrl = process.env.PROVIDER_URL;
const privateKey = process.env.PRIVATE_KEY;
const deviceServiceUrl = process.env.DEVICE_SERVICE_URL;
const ioIDRegistryAddress = process.env.IOID_REGISTRY_ADDRESS;

// Initialize provider and wallet
const provider = new JsonRpcProvider(providerUrl); // Direct use of JsonRpcProvider in v6
const wallet = new Wallet(privateKey, provider);

// Contract ABI for ioIDRegistry (simplified)
const ioIDRegistryABI = [
    "function register(address deviceContract, uint256 tokenId, address user, address device, bytes32 hash, string uri, uint8 v, bytes32 r, bytes32 s) public",
    "function nonces(address device) view returns (uint256)"
  ];

// Helper function to fetch a single device from the device service URL
async function fetchDevices() {
    try {
      console.log(`Fetching information from the device at ${deviceServiceUrl}/did...`);
      const agent = new https.Agent({ rejectUnauthorized: false });
      const response = await axios.get(`${deviceServiceUrl}/did`, { httpsAgent: agent });
  
      if (response.data && response.data.did) {
        return [response.data];
      } else {
        console.log("No device found at the provided device service URL.");
        return [];
      }
    } catch (error) {
      console.error("Error accessing the device service:", error.message);
      return [];
    }
}
  async function computeDigest(did, owner) {

// Generate EIP-712 digest manually, replacing the `did_hex` API call
// Constants matching contract definitions
const EIP712DOMAIN_TYPEHASH = ethers.keccak256(
    ethers.toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
  );
  
  const PERMIT_TYPE_HASH = ethers.keccak256(
    ethers.toUtf8Bytes("Permit(address owner,uint256 nonce)")
  );
    // Format `did` to ensure it has a single `0x` prefix
    const formattedDid = did.startsWith("did:io:") ? `0x${did.slice(7)}` : did;
  
    // Define parameters for DOMAIN_SEPARATOR calculation
    const nameHash = ethers.keccak256(ethers.toUtf8Bytes("ioIDRegistry"));
    const versionHash = ethers.keccak256(ethers.toUtf8Bytes("1"));
    const chainId = 4690; // Set to IoTeX Testnet (or 4689 for mainnet)
  
    // Assuming `ioIDRegistryAddress` is the address of the contract in your environment
    const verifyingContract = ioIDRegistryAddress;
  
    // Calculate DOMAIN_SEPARATOR
    const abiCoder = new AbiCoder();

    const DOMAIN_SEPARATOR = ethers.keccak256(
        abiCoder.encode(
        ["bytes32", "bytes32", "bytes32", "uint256", "address"],
        [EIP712DOMAIN_TYPEHASH, nameHash, versionHash, chainId, verifyingContract]
      )
    );
  
    // Retrieve the nonce for the device from the contract
    const ioIDRegistry = new ethers.Contract(ioIDRegistryAddress, ioIDRegistryABI, provider);
    const nonce = await ioIDRegistry.nonces(formattedDid);
  
    // Compute inner data hash using PERMIT_TYPE_HASH, owner, and nonce
    const dataHash = ethers.keccak256(
      abiCoder.encode(
        ["bytes32", "address", "uint256"],
        [PERMIT_TYPE_HASH, owner, nonce]
      )
    );
  
    // Compute the final digest as specified in the contract
    const digest = ethers.keccak256(
      ethers.concat([
        ethers.toUtf8Bytes("\x19\x01"),
        DOMAIN_SEPARATOR,
        dataHash
      ])
    );
  
    return digest;
  }

// Request signature from the device
async function requestSignature(device, hex) {
  try {
    const agent = new https.Agent({ rejectUnauthorized: false });

    const signResponse = await axios.post(`${deviceServiceUrl}/sign`, { hex }, { httpsAgent: agent });
    const diddocResponse = await axios.get(`${deviceServiceUrl}/diddoc`, { httpsAgent: agent });
    return {
      signature: signResponse.data.sign,
      diddoc: diddocResponse.data.diddoc,
    };
  } catch (error) {
    console.error("Error requesting signature:", error);
    return null;
  }
}

// Register device on the ioIDRegistry contract
async function registerDevice(device, owner, hex, diddocData) {
  const { r, s, v } = fetchRSVThroughPublicKey({
    signature: diddocData.signature,
    publicKey: device.puk,
    messageHash: hex,
  });

  const ioIDRegistry = new Contract(ioIDRegistryAddress, ioIDRegistryABI, wallet);

  const tokenId = 0; // Replace with actual token ID
  const uri = "ipfs://QmTzQ1N12ucF18hTP8mViqU2LPoQzZiLjipMuYYgQ6gXht"; // Replace with actual URI

  const tx = await ioIDRegistry.register(
    "0x052bee3c214a80028091aDaC86d78C8d4dfB3764",
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

// Utility function to extract r, s, v values from signature
function fetchRSVThroughPublicKey({ signature, address, messageHash }) {
    try {
      // Split the signature into r, s, and v using ethers.Signature.from
      const splitSig = ethers.Signature.from(signature);
      const { r, s, v } = splitSig;
      const v1 = v == 27 ? 28 : 27;
  
      // Recover the address from the message hash and the signature
      const recoveredAddress1 = ethers.recoverAddress(messageHash, { r, s, v: 0 });
      const recoveredAddress2 = ethers.recoverAddress(messageHash, { r, s, v: 1 });

      return { r, s, v };

    } catch (error) {
      console.error("Error in fetchRSVThroughPublicKey:", error.message);
      return { r: null, s: null, v: null };
    }
  }

// Script execution flow
(async () => {
  const devices = await fetchDevices();
  if (devices.length === 0) {
    console.log("No devices found.");
    return;
  }

  console.log("About to prompt the user...");

  const { selectedDeviceIndex } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedDeviceIndex',
      message: 'Select a device to register:',
      choices: devices.map((device, index) => ({
        name: `${device.project_name} - DID: ${device.did}`,
        value: index,
      })),
    },
  ]);

  const selectedDevice = devices[selectedDeviceIndex];
  console.log("Selected device:", selectedDevice);

  const owner = wallet.address;
  const hex = await computeDigest(selectedDevice.did.replace('did:io:', ''), owner);
  const diddocData = await requestSignature(selectedDevice, hex);

  if (!diddocData) {
    console.error("Failed to get signature data from the device.");
    return;
  }

  // const ipfsRes = await axios.post(`${ipfsServiceUrl}/upload`, { data: diddocRes.data?.diddoc, type: 'ipfs' });
  // const { cid } = ipfsRes.data;

  await registerDevice(selectedDevice, owner, hex, diddocData);
})();