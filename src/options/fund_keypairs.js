// fund_keypairs.js
import { main } from "../index.js";
import { Keypair, SystemProgram, Transaction, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";
import { input } from "@inquirer/prompts";
import fs from "node:fs";
import chalk from "chalk";

const settings_file = fs.readFileSync("data/settings.json", "utf8");
const settings = JSON.parse(settings_file);

const connection = new Connection(settings.rpc, "confirmed");

export async function fund_keypairs(
  min_buy_sol = 0.003
) {
  try {
    const fundingKeypair = Keypair.fromSecretKey(
        bs58.decode(settings.master_funding_wallet_pk)
      );      

    // Verwenden wir "input" statt "number"
    const solAnswer = await input({
      message: "How much SOL transfer to each wallet?",
      validate: (val) => {
        const parsed = parseFloat(val);
        if (isNaN(parsed) || parsed <= 0) {
          return "Please enter a number greater than 0!";
        }
        return true;
      },
    });
    const solAmount = parseFloat(solAnswer);

    const keypairsFile = fs.readFileSync("data/keypairs.json", "utf8");
    const keypairs = JSON.parse(keypairsFile);

    for (const [index, kp] of keypairs.entries()) {
      const pubKeyString = kp.publicKey;
      const lamportsToSend = (solAmount + min_buy_sol) * LAMPORTS_PER_SOL;

      console.log(`Funding wallet #${index} (pubkey: ${pubKeyString}) with ${lamportsToSend / LAMPORTS_PER_SOL} SOL ...`);

      let transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fundingKeypair.publicKey,
          toPubkey: pubKeyString,
          lamports: Math.floor(lamportsToSend),
        })
      );

      const latestBlockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = fundingKeypair.publicKey;

      const signature = await connection.sendTransaction(transaction, [fundingKeypair]);
      console.log(chalk.greenBright.bold("[*]") + 
        ` Sent transaction: https://solscan.io/tx/${signature} (funding #${index})`
      );

      if (index < keypairs.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    console.log(chalk.greenBright.bold("[*]") + 
      " All keypairs funded successfully! Returning home..."
    );

  } catch (error) {
    console.error(chalk.redBright.bold("[ERROR]"), error);
  }

  setTimeout(async () => {
    await main();
  }, 2000);
}
