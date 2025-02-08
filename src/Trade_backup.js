import { VersionedTransaction, Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import fs from "node:fs";

// READ FROM SETTINGS FILE
const settings_file = fs.readFileSync("data/settings.json", "utf8");
const settings = JSON.parse(settings_file);

const web3Connection = new Connection(settings.rpc, "confirmed");

export class Trade {
  async buy(mint_ca, wallet_privkey) {
    const signerKeyPair = Keypair.fromSecretKey(bs58.decode(wallet_privkey));

    const response = await fetch(`https://pumpportal.fun/api/trade-local`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        publicKey: signerKeyPair.publicKey.toString(),
        action: "buy",
        mint: mint_ca,
        denominatedInSol: "true",
        amount: settings.wallets_sol_buy,
        slippage: 10,
        priorityFee: 0.00001,
        pool: "pump",
      }),
    });

    if (response.status === 200) {
      // successfully generated transaction
      const data = await response.arrayBuffer();
      const tx = VersionedTransaction.deserialize(new Uint8Array(data));
      tx.sign([signerKeyPair]);
      const signature = await web3Connection.sendTransaction(tx, {
        skipPreflight: true,
      });
      console.log("Transaction: https://solscan.io/tx/" + signature);
    } else {
      console.log(response.statusText); // log error
    }
  }

  async sell(mint_ca, wallet_privkey, percent_to_sell) {
    const signerKeyPair = Keypair.fromSecretKey(bs58.decode(wallet_privkey));

    const response = await fetch(`https://pumpportal.fun/api/trade-local`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        publicKey: signerKeyPair.publicKey.toString(),
        action: "sell",
        mint: mint_ca,
        denominatedInSol: "false",
        amount: percent_to_sell,
        slippage: 10,
        priorityFee: 0.00001,
        pool: "pump",
      }),
    });

    if (response.status === 200) {
      // successfully generated transaction
      const data = await response.arrayBuffer();
      const tx = VersionedTransaction.deserialize(new Uint8Array(data));
      tx.sign([signerKeyPair]);
      const signature = await web3Connection.sendTransaction(tx, {
        skipPreflight: true,
      });
      console.log("Transaction: https://solscan.io/tx/" + signature);
    } else {
      console.log(response.statusText); // log error
    }
  }
}
