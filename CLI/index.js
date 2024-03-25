#!/usr/bin/env node
import { Agent } from "undici";

// This is a hack increase the fetch timeout for local ollama instances
// https://github.com/langchain-ai/langchainjs/issues/1856
globalThis[Symbol.for("undici.globalDispatcher.1")] = new Agent({
  headersTimeout: 1000 * 60 * 60 * 24,
});
import { input, password } from "@inquirer/prompts";
import select, { Separator } from "@inquirer/select";
import ora from "ora";
import fs from "fs";
import chalk from "chalk";
import rescript from "./lib/rescript.js";

const log = console.log;

async function main() {
  log(chalk.hex("#0d0d0d").bgWhite.bold("re-Script CLI"));
  log(chalk.gray("A CLI to unminify your JS code using AI models."));

  const fileLocation = await input({
    type: "input",
    name: "file location",
    message: "Enter your minified JS file location",
  });

  const model = await select({
    type: "select",
    name: "model",
    message: "Select the AI model to use",
    choices: [
      {
        name: "Claude-3",
        value: "claude",
        description: "Anthropic's latest Claude-3 model",
      },

      {
        name: "GPT-4",
        value: "openAI",
        description: "OpenAI's latest GPT-4 model",
      },
      {
        name: "Ollama - Mistral",
        value: "ollamaMistral",
        description: "Mistral LLM, Served locally using Ollama",
      },
      new Separator(),
      {
        name: "More Local LLMs",
        value: "local",
        disabled: "(Support for more local LLMs is coming soon!)",
      },
    ],
  });

  let apiKey = null;

  //TODO: Add a check to validate first if ollama server is running locally or not

  if (model !== "ollamaMistral") {
    apiKey = await input({
      type: "input",
      name: "apiKey",
      message: "Enter your model API key",
    });
  }

  if (!fs.existsSync(fileLocation)) {
    log(chalk.red.bold("File not found at the specified location"));
    return;
  }

  const spinner = ora().start("Reading file...");

  const code = fs.readFileSync(fileLocation, "utf8");

  spinner.text = "Re-minifying code...";

  const result = await rescript(code, model, apiKey, spinner);

  spinner.text = "Writing output file...";
  const outFileLocation = fileLocation.replace(
    ".js",
    `_reScript${Date.now().toString().slice(0, 4)}.js`
  );
  fs.writeFileSync(outFileLocation, result);

  spinner.color = "cyan";
  spinner.text = "Code unminified successfully!";
  spinner.succeed();
  spinner.stop();

  process.exit(0);
}

main();
