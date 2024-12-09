const Web3 = require("web3").default;
const defaults = require("./constants").DEFAULTS;
require("dotenv").config();

class ERC721 {
  constructor() {
    this.address = process.env.DEVICE_NFT_CONTRACT_ADDRESS;
    this.web3 = new Web3(defaults.PROVIDER_URL);
    this.signer = this.web3.eth.accounts.privateKeyToAccount(process.env.NFT_MINTER_PRIVATE_KEY);
    this.contract = new this.web3.eth.Contract(this.getAbi(), this.address);
  }

  // ABI definition
  getAbi() {
    return [
      {
        constant: true,
        inputs: [{ name: "owner", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        type: "function",
      },
      {
        constant: true,
        inputs: [{ name: "tokenId", type: "uint256" }],
        name: "ownerOf",
        outputs: [{ name: "", type: "address" }],
        type: "function",
      },
      {
        constant: false,
        inputs: [
          { name: "to", type: "address" },
          { name: "tokenId", type: "uint256" },
        ],
        name: "approve",
        outputs: [],
        type: "function",
      },
      {
        constant: true,
        inputs: [{ name: "tokenId", type: "uint256" }],
        name: "getApproved",
        outputs: [{ name: "", type: "address" }],
        type: "function",
      },
      {
        constant: false,
        inputs: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "tokenId", type: "uint256" },
        ],
        name: "transferFrom",
        outputs: [],
        type: "function",
      },
      {
        constant: false,
        inputs: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "tokenId", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
        name: "safeTransferFrom",
        outputs: [],
        type: "function",
      },
      {
        constant: false,
        inputs: [{ name: "_to", type: "address" }],
        name: "mint",
        outputs: [{ name: "tokenId", type: "uint256" }], // Updated to match Solidity return type
        type: "function",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "from", type: "address" },
          { indexed: true, name: "to", type: "address" },
          { indexed: true, name: "tokenId", type: "uint256" },
        ],
        name: "Transfer",
        type: "event",
      },
    ];
  }

  // Read operations
  async balanceOf(ownerAddress) {
    return await this.contract.methods.balanceOf(ownerAddress).call();
  }

  async ownerOf(tokenId) {
    return await this.contract.methods.ownerOf(tokenId).call();
  }


  // Write operations
  async approve(spender, tokenId) {
    const tx = this.contract.methods.approve(spender, tokenId);
    return await this.sendTransaction(tx);
  }

  async transferFrom(from, to, tokenId) {
    const tx = this.contract.methods.transferFrom(from, to, tokenId);
    return await this.sendTransaction(tx);
  }

  async safeTransferFrom(from, to, tokenId, data = "0x") {
    const tx = this.contract.methods.safeTransferFrom(from, to, tokenId, data);
    return await this.sendTransaction(tx);
  }

  // Utility: Send transactions using the signer
  async sendTransaction(tx) {
    const gas = await tx.estimateGas({ from: this.signer.address });
    const gasPrice = await this.web3.eth.getGasPrice();

    return await tx
      .send({
        from: this.signer.address,
        gas,
        gasPrice,
      })
      .once("transactionHash", (hash) => {
        console.log(`Transaction sent: ${hash}`);
      })
      .once("receipt", (receipt) => {
        console.log(`Transaction confirmed: ${receipt.transactionHash}`);
        return receipt;
      });
  }
}

module.exports = ERC721;