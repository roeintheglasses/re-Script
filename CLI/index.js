#!/usr/bin/env node
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
      new Separator(),
      {
        name: "Local LLMs",
        value: "local",
        disabled: "(Support for local LLMs is coming soon!)",
      },
    ],
  });

  const apiKey = await input({
    type: "input",
    name: "apiKey",
    message: "Enter your model API key",
  });

  if (!fs.existsSync(fileLocation)) {
    log(chalk.red.bold("File not found at the specified location"));
    return;
  }

  ora("Re-minifying code...").start();
  const code = fs.readFileSync(fileLocation, "utf8");
  const result = await rescript(code, model, apiKey);
  const outFileLocation = fileLocation.replace(
    ".js",
    `_reScript${Date.now().toString().slice(0, 4)}.js`
  );
  fs.writeFileSync(outFileLocation, result);
  ora("Code unminified successfully!").succeed().stop();
  process.exit(0);
}

main();
