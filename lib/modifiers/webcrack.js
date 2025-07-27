import { webcrack as wc } from "webcrack";

export default async function webcrack(code, options = {}) {
  try {
    const cracked = await wc(code, options);
    return cracked;
  } catch (error) {
    console.error("Webcrack processing failed:", error);
    throw error;
  }
}
