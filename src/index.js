import figlet from "figlet";
import chalk from "chalk";
import Table from "cli-table";
import { number } from "@inquirer/prompts";

// BOT OPTIONs IMPORT
import { keypairs } from "./options/create_keypairs.js";
import { bundle_pool } from "./options/bundle_pool.js";
import { sell_all } from "./options/sell_all.js";
import { sell_percent } from "./options/sell_percent.js";
import { fund_keypairs } from "./options/fund_keypairs.js";
import { withdraw_funds } from "./options/withdraw_funds.js";
import fs from "node:fs";
import * as utils from "./utils.js";

const settings = JSON.parse(fs.readFileSync("data/settings.json", "utf8"));

export async function main() {
  // console.clear();
  if(!checkSettings()) return;
  // LOG FIGLET
  const fig_text = figlet.textSync("Pumpfun Bundler Rug Pull Bot", {
    font: "Star Wars",
    horizontalLayout: "default",
    verticalLayout: "default",
    width: 150,
    whitespaceBreak: true,
  });
  console.log(chalk.cyanBright.bold(fig_text));
  // LOG COPYRIGHT
  console.log(chalk.magentaBright("Developed by: wwww.crypto-bots.io"));

  // PRINT OPTION MENUs
  var table = new Table({
    head: ["Command", "Label", "Description"],
  });

  table.push(
    [
      "1",
      chalk.greenBright.bold("Create Keypairs"),
      "Generate 20 wallets used for token snipings",
    ],
    [
      "2",
      chalk.blueBright.bold("Create Bundle Pool"),
      "Bundle token to pump.fun via the UI",
    ],
    [
      "3",
      chalk.cyanBright.bold("Sell All Supply"),
      "Sell all token supply across all wallets",
    ],
    [
      "4",
      chalk.yellowBright.bold("Sell % of Supply"),
      "Sell desired percentage of supply across all wallets",
    ],
    ["5", chalk.magentaBright.bold("Fund Keypairs"), "Send SOL from Funding Wallet"],
    ["6", chalk.gray.bold("Withdraw Keypairs"), "Withdraw leftover SOL to a target address"],
    ["7", chalk.redBright.bold("Quit"), "Quit the bot interface"]
  );
  console.log(table.toString());

  // AWAIT USER OPTION REPLIES
  const option = await number({
    message: "reply with option:",
    validate: (data) => {
      if (data < 1 || data > 7) {
        return "Provided option invalid, choose from the menu number available";
      }

      if (data == undefined) {
        return "Input cannot be empty";
      }

      return true;
    },
  });

  switch (option) {
    case 1:
      keypairs();
      break;

    case 2:
      bundle_pool();
      break;

    case 3:
      sell_all();
      break;

    case 4:
      sell_percent();
      break;

    case 5:
      fund_keypairs();
      break;

    case 6:
      withdraw_funds();
      break;

    case 7:
      process.exit(0);
      break;
  }
}

function checkSettings() {
  if(!settings?.rpc || !utils.isUrlValid(settings.rpc)) {
    console.error(chalk.redBright.bold("[SETTINGS ERROR]"), "Invalid 'rpc' in " + chalk.greenBright.bold("settings.json"));
    return false;
  }
  if(!settings?.master_dev_wallet_pk || !utils.isValidPrivateKey(settings.master_dev_wallet_pk)){
    console.error(chalk.redBright.bold("[SETTINGS ERROR]"), "Invalid 'master_dev_wallet_pk' in " + chalk.greenBright.bold("settings.json"));
    return false;
  } 
  if(!settings?.master_funding_wallet_pk || !utils.isValidPrivateKey(settings.master_funding_wallet_pk)){
    console.error(chalk.redBright.bold("[SETTINGS ERROR]"), "Invalid 'master_funding_wallet_pk' in " + chalk.greenBright.bold("settings.json"));
    return false;
  }
  if(!settings?.dev_wallet_sol_buy || !isFinite(settings?.dev_wallet_sol_buy)){
    console.error(chalk.redBright.bold("[SETTINGS ERROR]"), "Invalid 'dev_wallet_sol_buy' in " + chalk.greenBright.bold("settings.json"));
    return false;
  }
  if(!settings?.wallets_sol_buy || !isFinite(settings?.wallets_sol_buy)){
    console.error(chalk.redBright.bold("[SETTINGS ERROR]"), "Invalid 'wallets_sol_buy' in " + chalk.greenBright.bold("settings.json"));
    return false;
  }
  if(!settings?.token_name || utils.isEmpty(settings.token_name)){
    console.error(chalk.redBright.bold("[SETTINGS ERROR]"), "Invalid 'token_name' in " + chalk.greenBright.bold("settings.json"));
    return false;
  }
  if(!settings?.token_symbol || utils.isEmpty(settings.token_symbol)){
    console.error(chalk.redBright.bold("[SETTINGS ERROR]"), "Invalid 'token_symbol' in " + chalk.greenBright.bold("settings.json"));
    return false;
  }
  return true;
}

main();
