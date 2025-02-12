import { input } from "@inquirer/prompts";
import { Trade } from "../Trade_backup.js";
import { main } from "../index.js";
import fs from "node:fs";
import chalk from "chalk";

const trade = new Trade();

export async function sell_all() {
  // AWAIT USER OPTION REPLIES
  const mint = await input({
    message: "token address to sell:",
    validate: (data) => {
      return true;
    },
  });

  // read from keypairs file
  const keypairs_file = fs.readFileSync("data/keypairs.json", "utf8");
  const keypairs = JSON.parse(keypairs_file);

  // loop through each keypair with a delay
  for (const [index, keypair] of keypairs.entries()) {
    const { publicKey, secretKey } = keypair;

    await trade.sell(mint, secretKey[0], "100%");

    if (index < keypairs.length - 1) {
      // Add a delay of 0.75 seconds before the next sell
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }

  console.log(
    chalk.greenBright.bold("[*]") +
      `All wallets holding of mint: ${mint} sold successfully. Returning home...`
  );

  // RETURN TO MAIN MENU (HOME) (wait for 4 seconds)
  setTimeout(async () => {
    await main();
  }, 2000);
}
