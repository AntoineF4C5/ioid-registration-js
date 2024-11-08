const IoTDeviceRegistrar = require('./ioIDDeviceRegistrar');
require('dotenv').config();

async function main() {
  const registrar = new IoTDeviceRegistrar(process.env.PRIVATE_KEY);

  registrar.setDeviceServiceUrl("https://192.168.1.23:8000");
  registrar.setIpfsServiceUrl(process.env.IPFS_SERVICE_URL);

  // Fetch device information
  // TODO: Implement code to detect devices in ioIDDeviceRegistrar.js
  const device = await registrar.fetchDevice();
  const owner = registrar.wallet.address;

  // TODO: Implement code to list Device NFT Tokens owned by an address in ioIDDeviceRegistrar.js
  const deviceNFTContractAddress = '0x052bee3c214a80028091aDaC86d78C8d4dfB3764'; 
  const tokenId = 0; // Example token ID

  // Register the device
  await registrar.registerDevice(device, owner, deviceNFTContractAddress, tokenId);
}

main().catch(console.error);