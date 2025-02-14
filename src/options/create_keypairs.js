import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import fs from "node:fs";
import { number } from "@inquirer/prompts";
// MAIN MENU
import { main } from "../index.js";

export async function keypairs() {
  const answer = await number({
    message: "how many wallets to generate (20 max):",
    validate: (data) => {
      if (data > 20) {
        return "Maximum keypairs allowed is 20";
      }

      if (data < 1) {
        return "Minimum keypairs allowed is 1";
      }

      return true;
    },
  });

  // GENERATE KEYPAIRs ACCORDING TO ANSWER
  const keypairs = [];

  for (let i = 0; i < answer; i++) {
    const keypair = Keypair.generate();

    keypairs.push({
      publicKey: keypair.publicKey.toBase58(),
      secretKey: [bs58.encode(keypair.secretKey)],
    });
  }

  // WRITE TO JSON FILE (wait for a second)
  setTimeout(() => {
    const keypairs_json = JSON.stringify(keypairs, null, 4);

    fs.writeFile("data/keypairs.json", keypairs_json, "utf8", (err) => {
      if (err) {
        console.error("An error occurred while writing the file:", err);
      } else {
        console.log(
          "Keypairs have been written to keypairs.json. Returning home..."
        );
      }
    });
  }, 1000);

  // RETURN TO MAIN MENU (HOME) (wait for 2 seconds)
  setTimeout(async () => {
    await main();
  }, 2000);
}
