import axios from "axios";
import { invoke } from "@forge/bridge";

export const getData = async (data) => {
  try {
    const result = await invoke("getGraphData", data);
    return result;
  } catch (error) {
    throw error;
  }
};

export const getAudio = async (formData) => {
  try {
    const result = await invoke("getAudioData", formData);
    return result;
  } catch (error) {
    throw error;
  }
};

export const getD3Graph = (data) => {
  return new Promise((resolve, reject) => {
    axios
      .get(
        "http://genai-playground.uksouth.cloudapp.azure.com/api/graphrag/graph",
        {
          headers: {
            "Content-Type": "application/json", // Set the Content-Type header
          },
        }
      )
      .then((response) => {
        resolve(response.data); // Resolve the promise with the response data
      })
      .catch((error) => {
        if (error.response) {
          reject(error.response.data); // Reject with the server's response data if available
        } else {
          reject(error.message); // Reject with the error message if there's no response
        }
      });
  });
};
