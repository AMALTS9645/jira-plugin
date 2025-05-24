import Resolver from "@forge/resolver";
import api from "@forge/api";
import FormData from "form-data";

const resolver = new Resolver();

resolver.define("getGraphData", async (req) => {
  try {
    const data = req.payload;
    console.log("Request payload:", data);

    const requestBody = JSON.stringify(data);
    console.log("Sending request body:", requestBody);

    const response = await api.fetch(
      "https://genai-playground.uksouth.cloudapp.azure.com/api/graphrag/query",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: requestBody,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Error from graph playground:",
        response.status,
        response.statusText
      );
      console.error("Error details:", errorText);
      throw new Error(
        `Graph API responded with status: ${response.status} - ${errorText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error in graph resolver:", error);
    return {
      error: true,
      message: error.message,
      stack: error.stack,
    };
  }
});
resolver.define("getAudioData", async (req) => {
  try {
    const { audioData, fileName, mimeType } = req.payload;

    if (!audioData) throw new Error("No audio data received");

    // Create a multipart/form-data request manually
    const boundary = `----WebKitFormBoundary${Math.random()
      .toString(16)
      .substring(2)}`;

    // Create form data manually
    let body = "";

    // Add the file field
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="audio"; filename="${fileName}"\r\n`;
    body += `Content-Type: ${mimeType}\r\n\r\n`;

    // Create a body by concatenating the headers, the binary data, and the closing boundary
    const requestBody = Buffer.concat([
      Buffer.from(body, "utf8"),
      Buffer.from(audioData, "base64"),
      Buffer.from(`\r\n--${boundary}--\r\n`, "utf8"),
    ]);

    // Send the request with the manually constructed multipart/form-data
    const response = await api.fetch(
      "https://genai-playground.uksouth.cloudapp.azure.com/api/graphrag/transcribe-file",
      {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: requestBody,
      }
    );

    if (!response.ok) {
      throw new Error(
        `API responded with ${response.status}: ${await response.text()}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error in audio resolver:", error);
    return { error: true, message: error.message };
  }
});

export const handler = resolver.getDefinitions();
