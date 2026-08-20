import { ping } from "../calls/ping.ts";

const result = await ping();
console.log(JSON.stringify(result, null, 2));
