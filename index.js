const IoTDeviceRegistrar = require('./ioIDDeviceRegistrar');
const Web3 = require('web3');

require('dotenv').config();

const constants = require('./constants');
const DEVICE_NFT = require('./DEVICE_NFT');
const { DEVICE_SERVICE_URL, IPFS_SERVICE_URL, DEVICE_OWNER_PRIVATE_KEY } = process.env;

async function initializeRegistrar() {
  try {
    if (!DEVICE_OWNER_PRIVATE_KEY) {
      throw new Error("Missing PRIVATE_KEY in environment variables.");
    }

    const registrar = new IoTDeviceRegistrar(DEVICE_OWNER_PRIVATE_KEY, {
      deviceServiceUrl: DEVICE_SERVICE_URL,
      ipfsServiceUrl: IPFS_SERVICE_URL,
      deviceNFTContractAddress: process.env.DEVICE_NFT_CONTRACT_ADDRESS,
    });

    console.log("IoTDeviceRegistrar initialized successfully.");
    return registrar;
  } catch (error) {
    console.error("Error initializing IoTDeviceRegistrar:", error.message);
    process.exit(1); // Exit if initialization fails
  }
}

async function main() {
  const registrar = await initializeRegistrar();
  const { DEVICE_NFT_CONTRACT_ADDRESS, TOKEN_ID } = process.env;

  try {
    // Steo 0: ensure we own the device NFT we are trying to register
    const deviceOwner = registrar.account.address;
    const deviceNFT = new DEVICE_NFT();
    const nft_owner = await deviceNFT.ownerOf(TOKEN_ID);
    if (nft_owner.toLowerCase() !== deviceOwner.toLowerCase()) {
      throw new Error("Device NFT does not belong to the device owner");
    }
    // Step 1: Fetch device information
    const device = await registrar.deviceService.fetchDevice();
    // console.log("Device fetched successfully:", device);

    // Step 2: Register the device
    console.log("Device DID:", device.did);
    console.log("Owner address:", deviceOwner);
    console.log("Device NFT contract address:", DEVICE_NFT_CONTRACT_ADDRESS);
    console.log("Token ID:", TOKEN_ID);

    await registrar.registerDevice(device, deviceOwner, TOKEN_ID);
    console.log("Device registered successfully!");
  } catch (error) {
    console.error("Error in main process:", error);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error("Unhandled error:", error.message);
  process.exit(1);
});
