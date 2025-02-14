import {
    PublicKey,
    Keypair,
    Connection,
    Transaction,
    VersionedTransaction,
    TransactionMessage,
    LAMPORTS_PER_SOL
} from "@solana/web3.js";
import bs58 from "bs58";
import fs from "fs";
import chalk from "chalk";
import * as jito from "../jitoAPI.js"
import {
    createTransferInstruction,
    getOrCreateAssociatedTokenAccount,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    getAccount,
    getAssociatedTokenAddress,
    getAssociatedTokenAddressSync,
    TOKEN_PROGRAM_ID
} from "@solana/spl-token";

const UNIT_INSTRUCTION_CNT = 4

import { getTokenAccountBalance, pfGetTokenData } from "../utils.js";
import { input } from "@inquirer/prompts";
import { createTransferTokenInst } from "./solana.js";


const distributeKeypairs = JSON.parse(fs.readFileSync("data/distributeKeypairs.json", "utf8"));
const keypairs = JSON.parse(fs.readFileSync("data/keypairs.json", "utf8"));
const settings = JSON.parse(fs.readFileSync("data/settings.json", "utf8"));

const connection = new Connection(settings.rpc, "confirmed");
const PAYER = Keypair.fromSecretKey(bs58.decode(settings.master_dev_wallet_pk));

const distributedWallets = distributeKeypairs.map((keypair) =>
    Keypair.fromSecretKey(bs58.decode(keypair.secretKey[0]))
);

export async function gatherToken() {

    // Input Token Address
    const mint = await input({
        message: "Specify Token address to gather:",
        validate: (data) => {
            // check token is pumpfun token in pumpfun period
            if (data == '' || data == undefined)
                return false

            if (pfGetTokenData(data) !== undefined)
                return true;
        },
    });

    const gatherAddress = await input({
        message: "Specify wallet address where tokens will be gahtered:",
        validate: (val) => {
            // Minimale Validierung
            if (!val || val.length < 32) {
                return "Please enter a valid Solana address (Base58).";
            }
            return true;
        },
    });

    console.log(`Token Address : ${mint}`)
    for (let i = 0; i < distributedWallets.length; i++) {
        //Get Token Balance
        const balance = await getTokenAccountBalance(connection, distributedWallets[i].publicKey, mint)

        console.log(chalk.greenBright.bold("[*]") +
            ` Balance of wallet ${distributedWallets[i].publicKey} - Wallet #${i}: ${balance}`
        );

        let transaction = new Transaction().add(
            await createTransferTokenInst(connection, distributedWallets[i], new PublicKey(gatherAddress), new PublicKey(mint), balance * 1000000)
        )

        console.log(transaction);
        // const senderTokenAccount = await getAssociatedTokenAddress(
        //     TOKEN_PROGRAM_ID,
        //     new PublicKey(mint),
        //     distributedWallets[i].publicKey
        // )

        // const receiverTokenAccount = await getAssociatedTokenAddress(
        //     TOKEN_PROGRAM_ID,
        //     new PublicKey(mint),
        //     new PublicKey(gatherAddress)
        // )

        // let transaction = new Transaction().add(
        //     createTransferInstruction(
        //         senderTokenAccount.address,
        //         receiverTokenAccount.address,
        //         distributedWallets[i].publicKey,
        //         Math.floor(balance * 1000000)
        //     )
        // )
        // const latestBlockhash = await connection.getLatestBlockhash();
        // transaction.recentBlockhash = latestBlockhash.blockhash;
        // transaction.feePayer = distributedWallets[i].publicKey;

        // console.log(transaction)
        // const signature = await connection.sendTransaction(transaction, [distributedWallets[i]]);
        // return

        // console.log(await connection.simulateTransaction(transaction))

        // return
        // // const signature = await connection.sendTransaction(transaction, [PAYER, distributedWallets[i]]);
        // console.log(chalk.greenBright.bold("[*]") + 
        //   ` Sent transaction: https://solscan.io/tx/${signature} (funding #${index})`
        // );

        // if (i < distributedWallets.length - 1) {
        //     await new Promise((resolve) => setTimeout(resolve, 3000));
        //   }
    }


    // for (const [index, kp] of keypairs.entries()) {
    //     const pubKeyString = kp.publicKey;
    //     const lamportsToSend = (solAmount + min_buy_sol) * LAMPORTS_PER_SOL;

    //     console.log(`Funding wallet #${index} (pubkey: ${pubKeyString}) with ${lamportsToSend / LAMPORTS_PER_SOL} SOL ...`);

    //     let transaction = new Transaction().add(
    //       SystemProgram.transfer({
    //         fromPubkey: fundingKeypair.publicKey,
    //         toPubkey: pubKeyString,
    //         lamports: Math.floor(lamportsToSend),
    //       })
    //     );

    //     const latestBlockhash = await connection.getLatestBlockhash();
    //     transaction.recentBlockhash = latestBlockhash.blockhash;
    //     transaction.feePayer = fundingKeypair.publicKey;

    //     const signature = await connection.sendTransaction(transaction, [fundingKeypair]);
    //     console.log(chalk.greenBright.bold("[*]") + 
    //       ` Sent transaction: https://solscan.io/tx/${signature} (funding #${index})`
    //     );

    //     if (index < keypairs.length - 1) {
    //       await new Promise((resolve) => setTimeout(resolve, 3000));
    //     }
    //   }
}