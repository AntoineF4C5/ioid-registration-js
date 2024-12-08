const IoTDeviceRegistrar = require('./ioIDDeviceRegistrar');
require('dotenv').config();

async function main() {
  const registrar = new IoTDeviceRegistrar(process.env.PRIVATE_KEY);

  // Cutsomize the device service URL
  registrar.setDeviceServiceUrl("https://192.168.1.119:8000");
  registrar.setIpfsServiceUrl(process.env.IPFS_SERVICE_URL);

  // Fetch device information
  // TODO: Implement code to detect devices in ioIDDeviceRegistrar.js
  const device = await registrar.fetchDevice();
  const owner = registrar.account.address;

  // TODO: Implement code to list Device NFT Tokens owned by an address in ioIDDeviceRegistrar.js
  const deviceNFTContractAddress = '0x052bee3c214a80028091aDaC86d78C8d4dfB3764'; 
  const tokenId = 6; // Example token ID
  
  // Register the device

  // This will sign both the NFT transfer approval and the device registration
  // Optionally, the Device NT contract owner can call approveForAll 
  // to approve the ioID registry to transfer the NFT without requiring the device owner to approve
  await registrar.registerDevice(device, owner, deviceNFTContractAddress, tokenId);
}



main().catch(console.error);