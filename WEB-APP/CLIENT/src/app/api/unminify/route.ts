/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { type NextRequest } from "next/server";

export const config = {
  runtime: "edge",
};

export async function POST(req: Request) {
  try {
    const requestData = await req.json();

    const response = await fetch("http://localhost:4000/unminify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, s-maxage=1200, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    console.log("====================================");
    console.log(err);
    console.log("====================================");
    return new Response(JSON.stringify({ error: "Server Error" }), {
      status: 500,
    });
  }
}
