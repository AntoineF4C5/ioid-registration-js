// Default configurations
const DEFAULTS = {
    PROVIDER_URL: "https://babel-api.testnet.iotex.io",
    IOID_REGISTRY_ADDRESS: "0x0A7e595C7889dF3652A19aF52C18377bF17e027D",
  };
  
  // Contract ABI for ioIDRegistry
  const IOID_REGISTRY_ABI = [
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
  
  module.exports = { DEFAULTS, IOID_REGISTRY_ABI };