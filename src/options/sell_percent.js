import { input, number } from "@inquirer/prompts";
import { Trade } from "../Trade_backup.js";
import { main } from "../index.js";

const trade = new Trade();

export async function sell_percent() {
  // AWAIT USER OPTION REPLIES
  const percent_to_sell = await number({
    message:
      "percentage of token to sell across all wallet (e.g 50 for 50 percent):",
    validate: (data) => {
      if (data < 1 || data > 100) {
        return "minimum percent to sell is 1 and maximum is 100";
      }

      if (data == undefined) {
        return "Input cannot be empty";
      }

      return true;
    },
  });

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

    await trade.sell(mint, secretKey[0], `${percent_to_sell}%`);

    if (index < keypairs.length - 1) {
      // Add a delay of 0.3 seconds before the next buy
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  console.log(
    chalk.greenBright.bold("[*]") +
      `All wallets holding of mint: ${mint} sold ${percent_to_sell}% successfully. Returning home...`
  );

  // RETURN TO MAIN MENU (HOME) (wait for 4 seconds)
  setTimeout(async () => {
    await main();
  }, 2000);
}
