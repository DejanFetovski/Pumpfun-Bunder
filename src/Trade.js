// src/Trade.js
import { VersionedTransaction, Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import fs from "node:fs";

// Load settings
const settings_file = fs.readFileSync("data/settings.json", "utf8");
const settings = JSON.parse(settings_file);

// Connection
const web3Connection = new Connection(settings.rpc, "confirmed");

export class Trade {
  async buy(mint_ca, wallet_privkey) {
    // Reconstruct wallet keypair
    const signerKeyPair = Keypair.fromSecretKey(bs58.decode(wallet_privkey));

    // Hier: wir nutzen den Wert aus settings.wallets_sol_buy
    const buyAmountSOL = settings.wallets_sol_buy;

    // Request to pumpportal
    const response = await fetch(`https://pumpportal.fun/api/trade-local`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicKey: signerKeyPair.publicKey.toString(),
        action: "buy",
        mint: mint_ca,
        denominatedInSol: "true",
        amount: buyAmountSOL,
        slippage: 10,
        priorityFee: 0.00001,
        pool: "pump",
      }),
    });

    if (response.status === 200) {
      const data = await response.arrayBuffer();
      const tx = VersionedTransaction.deserialize(new Uint8Array(data));
      tx.sign([signerKeyPair]);

      // Sende TX
      const signature = await web3Connection.sendTransaction(tx, {
        skipPreflight: true,
      });
      return signature; // Rückgabe an den Aufrufer, damit er loggen kann
    } else {
      // Fehler
      console.log("Buy error:", response.statusText);
      return null;
    }
  }

  async sell(mint_ca, wallet_privkey, percent_to_sell) {
    const signerKeyPair = Keypair.fromSecretKey(bs58.decode(wallet_privkey));

    const response = await fetch(`https://pumpportal.fun/api/trade-local`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicKey: signerKeyPair.publicKey.toString(),
        action: "sell",
        mint: mint_ca,
        denominatedInSol: "false",   // hier 'false' heißt: wir geben Tokens/Prozent an
        amount: percent_to_sell,     // e.g. "100%", "50%"
        slippage: 10,
        priorityFee: 0.00001,
        pool: "pump",
      }),
    });

    if (response.status === 200) {
      const data = await response.arrayBuffer();
      const tx = VersionedTransaction.deserialize(new Uint8Array(data));
      tx.sign([signerKeyPair]);
      const signature = await web3Connection.sendTransaction(tx, {
        skipPreflight: true,
      });
      return signature;
    } else {
      console.log("Sell error:", response.statusText);
      return null;
    }
  }
}
