import {
    PublicKey,
    Keypair,
    Connection,
    VersionedTransaction,
    TransactionMessage
} from "@solana/web3.js";
import bs58 from "bs58";
import fs from "fs";
import chalk from "chalk";
import * as jito from "../jitoAPI.js"


const settings = JSON.parse(fs.readFileSync("data/settings.json", "utf8"));
const PAYER = Keypair.fromSecretKey(bs58.decode(settings.master_dev_wallet_pk));

const connection = new Connection(settings.rpc, "confirmed");
 

import { main } from "../index.js";
import { pfGetTokenData } from "../utils.js";
import { number } from "@inquirer/prompts";
import { input } from "@inquirer/prompts";
import {createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync, getAccount } from "@solana/spl-token";
import { connect } from "http2";

export async function distribute() {

    const answer = await number({
        message: "how many wallets to distribute (90 max):",
        validate: (data) => {
            if (data > 80) {
                return "Maximum keypairs allowed is 80";
            }

            if (data < 1) {
                return "Wallet Count must be more than 1";
            }

            return true;
        },
    });

    // Input Token Address
    const mint = await input({
        message: "Specify Token address to distribute:",
        validate: (data) => {
            // check token is pumpfun token in pumpfun period
            if (pfGetTokenData(data) !== undefined)
                return true;
        },
    });

    // Create keypairs and save
    const keypairsToJson = [];
    const keypairs = [];

    for (let i = 0; i < answer; i++) {
        const keypair = Keypair.generate();
        keypairsToJson.push({
            publicKey: keypair.publicKey.toBase58(),
            secretKey: [bs58.encode(keypair.secretKey)],
        });
    }

    // WRITE TO JSON FILE (wait for a second)
    setTimeout(() => {
        const keypairs_json = JSON.stringify(keypairsToJson, null, 4);

        fs.writeFile("data/distributeKeypairs.json", keypairs_json, "utf8", (err) => {
            if (err) {
                console.error("An error occurred while writing the file:", err);
            } else {
                console.log(
                    "Keypairs have been written to keypairs.json. Returning home..."
                );
            }
        });
    }, 1000);


    // Create Token account and send token
    const instructions = []
    let signers = [];
    let bundleTxns = []

    for (let i = 0; i < keypairs.length; i++) {
        const associatedToken = getAssociatedTokenAddressSync(
            new PublicKey (mint),
            keypairs[i].publicKey
        )

        try {
            account = await getAccount(connection)
        } catch (error) {
            instructions.push(
                createAssociatedTokenAccountInstruction(
                    PAYER,
                    associatedToken,
                    keypairs[i].publicKey,
                    new PublicKey(mint)
                )
            );
        }
    }

    instructions.push(await jito.getJitoTipInstruction(PAYER));

    const versionedTransaction = new VersionedTransaction(
        new TransactionMessage({
            payerKey: PAYER.publicKey,
            recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
            instructions: instructions,
        }).compileToV0Message()
      )

    versionedTransaction.sign([PAYER]);

    bundleTxns.push(versionedTransaction)

    console.log(await connection.simulateTransaction(versionedTransaction))

    
    let ret = await jito.sendBundles(bundleTxns)
    console.log("result: ", ret)


    if(ret == true) {

    }
    // RETURN TO MAIN MENU (HOME) (wait for 2 seconds)
    setTimeout(async () => {
        await main();
    }, 2000);
}