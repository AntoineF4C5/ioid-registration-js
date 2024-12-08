const axios = require("axios");
const { createHttpsAgent, handleError } = require("./utils");

class DeviceService {
  constructor(deviceServiceUrl) {
    this.deviceServiceUrl = deviceServiceUrl;
  }

  async fetchDevice() {
    const url = `${this.deviceServiceUrl}/did`;
    console.log(`Fetching device information from ${url}...`);
    try {
      const response = await axios.get(url, {
        httpsAgent: createHttpsAgent(),
        timeout: 5000,
      });
      if (response.data?.did) return response.data;
      throw new Error("No device found at the device service URL.");
    } catch (error) {
      handleError("fetchDevice", error);
    }
  }

  async requestSignature(digest) {
    const url = `${this.deviceServiceUrl}/sign`;
    try {
      console.log("Requesting signature from device...");
      const response = await axios.post(
        url,
        { hex: digest },
        { httpsAgent: createHttpsAgent() }
      );
      if (response.data?.sign) return response.data.sign;
      throw new Error("Failed to obtain signature from the device.");
    } catch (error) {
      handleError("requestSignature", error);
    }
  }

  async fetchDidDoc() {
    const url = `${this.deviceServiceUrl}/diddoc`;
    try {
      console.log("Fetching DID document from device...");
      const response = await axios.get(url, {
        httpsAgent: createHttpsAgent(),
        timeout: 5000,
      });
      if (response.data?.diddoc) return response.data.diddoc;
      throw new Error("No DID document found at the device service URL.");
    } catch (error) {
      handleError("fetchDidDoc", error);
    }
  }
}

module.exports = DeviceService;