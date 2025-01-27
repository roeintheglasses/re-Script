#!/usr/bin/env node
import { Agent } from "undici";
import { input } from "@inquirer/prompts";
import select, { Separator } from "@inquirer/select";
import ora from "ora";
import fs from "fs/promises";
import chalk from "chalk";
import rescript from "./lib/rescript.js";

// Configure undici agent for extended timeout
globalThis[Symbol.for("undici.globalDispatcher.1")] = new Agent({
  headersTimeout: 1000 * 60 * 60 * 24,
});

// Model choices configuration
const MODEL_CHOICES = [
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
];

// Helper functions
const displayHeader = () => {
  console.log(chalk.hex("#0d0d0d").bgWhite.bold("re-Script CLI"));
  console.log(chalk.gray("A CLI to unminify your JS code using AI models."));
};

const generateOutputFilename = (inputFile) => {
  return inputFile.replace(
    ".js",
    `_reScript${Date.now().toString().slice(0, 4)}.js`
  );
};

async function getApiKey(model) {
  if (model === "ollamaMistral") return null;

  return await input({
    type: "input",
    name: "apiKey",
    message: "Enter your model API key",
  });
}

async function processFile(fileLocation, model, apiKey) {
  const spinner = ora("Reading file...").start();

  try {
    const code = await fs.readFile(fileLocation, "utf8");

    spinner.text = "Unminifying code...";
    const result = await rescript(code, model, apiKey, spinner);

    spinner.text = "Writing output file...";
    const outFileLocation = generateOutputFilename(fileLocation);
    await fs.writeFile(outFileLocation, result);

    spinner.succeed("Code unminified successfully!");
    return true;
  } catch (error) {
    spinner.fail(chalk.red(`Error: ${error.message}`));
    return false;
  } finally {
    spinner.stop();
  }
}

async function main() {
  try {
    displayHeader();

    const fileLocation = await input({
      message: "Enter your minified JS file location",
    });

    // Verify file exists
    try {
      await fs.access(fileLocation);
    } catch {
      throw new Error("File not found at the specified location");
    }

    const model = await select({
      message: "Select the AI model to use",
      choices: MODEL_CHOICES,
    });

    const apiKey = await getApiKey(model);

    // TODO: Add Ollama server check here
    // if (model === "ollamaMistral") {
    //   await checkOllamaServer();
    // }

    const success = await processFile(fileLocation, model, apiKey);
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error(chalk.red.bold(error.message));
    process.exit(1);
  }
}

main();
