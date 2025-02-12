import {
    PublicKey,
    Keypair,
    Connection,
    VersionedTransaction,
    TransactionMessage,
    LAMPORTS_PER_SOL
} from "@solana/web3.js";
import bs58 from "bs58";
import fs from "fs";
import chalk from "chalk";

const keypairs = JSON.parse(fs.readFileSync("data/keypairs.json", "utf8"));
const settings = JSON.parse(fs.readFileSync("data/settings.json", "utf8"));
const connection = new Connection(settings.rpc, "confirmed");

import { main } from "../index.js";

export async function show_balance() {

    // Keypairs
    const wallets = keypairs.map((keypair) =>
        Keypair.fromSecretKey(bs58.decode(keypair.secretKey[0]))
    );

    console.log("Generated Wallet Count = ", wallets.length)
    let msg = "";
    for (let i = 0; i < wallets.length; i++) {
        const balance = await connection.getBalance(wallets[i].publicKey);
        msg += chalk.yellowBright(`Wallet #${i} has ${balance / LAMPORTS_PER_SOL} SOL\n`)
    }

    console.log(msg)

    // RETURN TO MAIN MENU (HOME) (wait for 2 seconds)
    setTimeout(async () => {
        await main();
    }, 2000);
}