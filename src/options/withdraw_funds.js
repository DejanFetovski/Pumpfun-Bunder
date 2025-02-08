// withdraw_funds.js

import { main } from "../index.js";
import {
  Keypair,
  SystemProgram,
  Transaction,
  Connection,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import bs58 from "bs58";
import { input } from "@inquirer/prompts";
import fs from "node:fs";
import chalk from "chalk";

// Lies deine Einstellungen (RPC etc.)
const settings_file = fs.readFileSync("data/settings.json", "utf8");
const settings = JSON.parse(settings_file);

// Erstelle eine Connection
const connection = new Connection(settings.rpc, "confirmed");

export async function withdraw_funds() {
  try {
    // 1) Nutzer fragt: Welche Adresse soll das Geld bekommen?
    const withdrawAddress = await input({
      message: "Paste the SOL address to which you want to withdraw all funds:",
      validate: (val) => {
        // Minimale Validierung
        if (!val || val.length < 32) {
          return "Please enter a valid Solana address (Base58).";
        }
        return true;
      },
    });

    // 2) keypairs.json laden
    const keypairsFile = fs.readFileSync("data/keypairs.json", "utf8");
    const keypairs = JSON.parse(keypairsFile);

    // 3) Schleife über alle Keypairs
    for (const [index, kp] of keypairs.entries()) {
      const pubKeyString = kp.publicKey;
      const secretKeyString = kp.secretKey[0]; // in deinem Format: Array mit 1 Element

      // Keypair rekonstruieren
      const thisKeypair = Keypair.fromSecretKey(bs58.decode(secretKeyString));

      // Aktuelles Guthaben
      const balance = await connection.getBalance(thisKeypair.publicKey);
      if (balance === 0) {
        console.log(
          chalk.yellowBright(`Keypair #${index} has 0 SOL, skipping...`)
        );
        continue;
      }

      // Wir lassen ein paar Lamports für Fee-Reserven
      // Z.B. 5000 Lamports = 0.000005 SOL
      const FEE_BUFFER = 5000;
      // Wenn das Guthaben kleiner ist als dieser Buffer, überspringen wir:
      if (balance <= FEE_BUFFER) {
        console.log(
          chalk.yellowBright(
            `Keypair #${index} has insufficient SOL (${balance} lamports), skipping...`
          )
        );
        continue;
      }

      // Transfer amount
      const lamportsToSend = balance - FEE_BUFFER;

      console.log(
        chalk.blueBright(
          `Withdrawing ~${(lamportsToSend / LAMPORTS_PER_SOL).toFixed(
            6
          )} SOL from keypair #${index} to -> ${withdrawAddress}`
        )
      );

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: thisKeypair.publicKey,
          toPubkey: withdrawAddress,
          lamports: lamportsToSend,
        })
      );

      const latestBlockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = thisKeypair.publicKey;

      // Sign mit dem jeweiligen Keypair
      const signature = await connection.sendTransaction(transaction, [thisKeypair], {
        skipPreflight: false,
      });

      console.log(
        chalk.greenBright.bold("[*]") +
          ` Sent transaction: https://solscan.io/tx/${signature} (withdraw #${index})`
      );

      // Kurze Pause (3s), damit wir nicht spammen
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    console.log(
      chalk.greenBright.bold("[*]") +
        " All possible funds have been withdrawn! Returning home..."
    );
  } catch (error) {
    console.error(chalk.redBright.bold("[ERROR]"), error);
  }

  // Zurück zum Hauptmenü
  setTimeout(async () => {
    await main();
  }, 2000);
}
