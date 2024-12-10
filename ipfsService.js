const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

class IPFSService {
  constructor(ipfsServiceUrl) {
    this.ipfsServiceUrl = ipfsServiceUrl;
  }

  async upload(diddoc) {
    fs.writeFileSync("diddoc.json", JSON.stringify(diddoc));
    const url = `${this.ipfsServiceUrl}/add`;
    const form = new FormData();
    form.append("diddoc", fs.readFileSync("diddoc.json"));
    try {
      console.log(`Uploading DID document to IPFS via ${url}...`);
      const response = await axios.post(url, form, {
        headers: { ...form.getHeaders() },
      });
      if (response.data?.Hash) return response.data.Hash;
      throw new Error("Failed to upload DID document to IPFS.");
    } catch (error) {
      console.error("Error uploading DID document to IPFS:", error.message);
      throw error;
    }
  }
}

module.exports = IPFSService;
