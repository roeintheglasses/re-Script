import { webcrack as wc } from "webcrack";
export default async function webcrack(code) {
  const cracked = await wc(code);
  return cracked;
}
