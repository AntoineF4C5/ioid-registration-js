const { ethers } = require('ethers');


class ERC721 {
  constructor(address, signerOrProvider) {
    this.address = address;
    this.abi = [
      "function balanceOf(address owner) view returns (uint256)",
      "function ownerOf(uint256 tokenId) view returns (address)",
      "function approve(address to, uint256 tokenId) public",
      "function getApproved(uint256 tokenId) view returns (address)",
      "function transferFrom(address from, address to, uint256 tokenId) public",
      "function safeTransferFrom(address from, address to, uint256 tokenId, bytes data) public",
      "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
    ];
    this.contract = new ethers.Contract(address, this.abi, signerOrProvider);
  }

  async balanceOf(ownerAddress) {
    return await this.contract.balanceOf(ownerAddress);
  }

  async ownerOf(tokenId) {
    return await this.contract.ownerOf(tokenId);
  }

  async approve(spender, tokenId) {
    const tx = await this.contract.approve(spender, tokenId);
    return await tx.wait();
  }

  async transferFrom(from, to, tokenId) {
    const tx = await this.contract.transferFrom(from, to, tokenId);
    return await tx.wait();
  }

  async safeTransferFrom(from, to, tokenId, data = "0x") {
    const tx = await this.contract.safeTransferFrom(from, to, tokenId, data);
    return await tx.wait();
  }
}

module.exports = ERC721;
