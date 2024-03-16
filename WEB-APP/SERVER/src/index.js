// Import the framework and instantiate it
import Fastify from "fastify";
import fs from "fs";

import rescript from "../lib/rescript.js";

const fastify = Fastify({
  logger: true,
});

// Declare a route
fastify.get("/", async function handler(request, reply) {
  return { hello: "world" };
});

fastify.post("/unminify", async function handler(request, reply) {
  const data = await request.body;

  if (!data.code) {
    reply.code(400).send({ error: "No code provided" });
  }
  if (!data.model) {
    reply.code(400).send({ error: "No model provided" });
  }
  if (!data.apiKey) {
    reply.code(400).send({ error: "No apiKey provided" });
  }

  const { code, model, apiKey } = data;

  const result = await rescript(code, model, apiKey);
  reply.code(200).send({ data: result });
});

fastify.post("/unminifyFile", async function handler(request, reply) {
  const data = await request.body;

  if (!data.codeFile) {
    reply.code(400).send({ error: "No code provided" });
  }
  if (!data.model) {
    reply.code(400).send({ error: "No model provided" });
  }
  if (!data.apiKey) {
    reply.code(400).send({ error: "No apiKey provided" });
  }

  const { code, model, apiKey } = data;

  const result = await rescript(code, model, apiKey);
  reply.code(200).send({ data: result });
});

// Run the server!
try {
  await fastify.listen({ port: 4000 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
