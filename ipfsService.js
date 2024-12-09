const axios = require("axios");

class IPFSService {
  constructor(ipfsServiceUrl) {
    this.ipfsServiceUrl = ipfsServiceUrl;
  }

  async upload(diddoc) {
    const url = `${this.ipfsServiceUrl}/upload`;
    try {
      console.log(`Uploading DID document to IPFS via ${url}...`);
      const response = await axios.post(url, {
        data: diddoc,
        type: "ipfs",
      });
      if (response.data?.cid) return response.data.cid;
      throw new Error("Failed to upload DID document to IPFS.");
    } catch (error) {
      console.error("Error uploading DID document to IPFS:", error.message);
      throw error;
    }
  }
}

module.exports = IPFSService;