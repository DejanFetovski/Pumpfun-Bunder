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
import * as jito from "../jitoAPI.js"
const UNIT_INSTRUCTION_CNT = 4

const distributeKeypairs = JSON.parse(fs.readFileSync("data/distributeKeypairs.json", "utf8"));
const keypairs = JSON.parse(fs.readFileSync("data/keypairs.json", "utf8"));
const settings = JSON.parse(fs.readFileSync("data/settings.json", "utf8"));
const PAYER = Keypair.fromSecretKey(bs58.decode(settings.master_dev_wallet_pk));

const connection = new Connection(settings.rpc, "confirmed");

import { main } from "../index.js";
import { getTokenAccountBalance, pfGetTokenData } from "../utils.js";
import { number } from "@inquirer/prompts";
import { input } from "@inquirer/prompts";
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync, getAccount } from "@solana/spl-token";
import { connect } from "http2";
import { createTransferTokenInst } from "./solana.js";

export async function distribute() {
    const distributeWalletCount = await number({
        message: "how many wallets to distribute (90 max):",
        validate: (data) => {
            if (data > 80) {
                return "Maximum keypairs allowed is 80";
            }

            if (data < 1) {
                return "Wallet Count must be more than 1";
            }

            return true;
        }
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
    const distributeKeypairsToJson = [];
    let distributeWallets = [];

    for (let i = 0; i < distributeWalletCount; i++) {
        const keypair = Keypair.generate();
        distributeWallets.push(keypair)
        distributeKeypairsToJson.push({
            publicKey: keypair.publicKey.toBase58(),
            secretKey: [bs58.encode(keypair.secretKey)],
        });
    }
    console.log("Generated Wallet: ", distributeKeypairsToJson)

    // WRITE TO JSON FILE (wait for a second)
    setTimeout(() => {
        const keypairs_json = JSON.stringify(distributeKeypairsToJson, null, 4);

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

    //Distribute wallets - test
    // const distributeWallets = distributeKeypairs.map((keypair) =>
    //     Keypair.fromSecretKey(bs58.decode(keypair.secretKey[0]))
    // );

    // Sniper Wallet
    const wallets = keypairs.map((keypair) =>
        Keypair.fromSecretKey(bs58.decode(keypair.secretKey[0]))
    );

    // Create Token account
    console.log(">>>>>>>>>>> Creating Token Account....")
    do {
        await doCreateTokenAccount(distributeWallets, mint)
        distributeWallets.splice(0, 59);
    } while (distributeWallets.length > 0);
    console.log(">>>>>>>> Ending Token Account....")

    distributeWallets = distributeKeypairsToJson.map((KeypairsToJson) =>
        Keypair.fromSecretKey(bs58.decode(KeypairsToJson.secretKey[0]))
    );

    // Token Transfer
    let bundleTxns = []
    for (let i = 0; i < wallets.length; i++) {
        const sender = wallets[i];
        let vt = []
        if (distributeWallets.length >= UNIT_INSTRUCTION_CNT * i + UNIT_INSTRUCTION_CNT) {
            vt = await distributeToken(sender, [distributeWallets[UNIT_INSTRUCTION_CNT * i], distributeWallets[UNIT_INSTRUCTION_CNT * i + 1], distributeWallets[UNIT_INSTRUCTION_CNT * i + 2], distributeWallets[UNIT_INSTRUCTION_CNT * i + 3]], mint)
            bundleTxns.push(vt)
        } else if (distributeWallets.length < UNIT_INSTRUCTION_CNT * i + UNIT_INSTRUCTION_CNT) {
            let j = distributeWallets.length - UNIT_INSTRUCTION_CNT * i;
            let toAddrs = [];
            for (let i = 0; i < j; i++) {
                toAddrs.push(distributeWallets[UNIT_INSTRUCTION_CNT * i + i])
            }

            vt = await distributeToken(sender, toAddrs, mint)
            bundleTxns.push(vt)
        }

        if (i % 4 == 3 || i == wallets.length - 1) {
            // Tip 
            let instructions = []
            instructions.push(await jito.getJitoTipInstruction(PAYER));
            const jitoTipVt = new VersionedTransaction(
                new TransactionMessage({
                    payerKey: PAYER.publicKey,
                    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
                    instructions: instructions,
                }).compileToV0Message()
            )
            jitoTipVt.sign([PAYER]);

            bundleTxns.push(jitoTipVt)


            // Run Bundle
            let ret = await jito.sendBundles(bundleTxns)
            console.log("Bundle Transaction result: ", ret)

            setTimeout(async () => {
                console.log("Delay between bundle transaction...")
            }, 500);

            // clear 
            bundleTxns = [];
        }
    }

    // RETURN TO MAIN MENU (HOME) (wait for 2 seconds)
    setTimeout(async () => {
        await main();
    }, 2000);
}

async function doCreateTokenAccount(keypairs, mint) {

    let instructions = []
    let signers = [];
    let bundleTxns = []

    for (let i = 0; i < keypairs.length; i++) {
        const associatedToken = getAssociatedTokenAddressSync(
            new PublicKey(mint),
            keypairs[i].publicKey
        )
        try {
            account = await getAccount(connection)
        } catch (error) {
            instructions.push(
                createAssociatedTokenAccountInstruction(
                    PAYER.publicKey,
                    associatedToken,
                    keypairs[i].publicKey,
                    new PublicKey(mint)
                )
            );
        }

        if (instructions.length == 12 && bundleTxns.length < 4) {

            const versionedTransaction = new VersionedTransaction(
                new TransactionMessage({
                    payerKey: PAYER.publicKey,
                    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
                    instructions: instructions,
                }).compileToV0Message()
            )

            versionedTransaction.sign([PAYER]);

            // console.log(await connection.simulateTransaction(versionedTransaction))
            bundleTxns.push(versionedTransaction)
            instructions = []
        }

        if (instructions.length == 10 && bundleTxns.length == 4) {

            instructions.push(await jito.getJitoTipInstruction(PAYER));
            const versionedTransaction = new VersionedTransaction(
                new TransactionMessage({
                    payerKey: PAYER.publicKey,
                    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
                    instructions: instructions,
                }).compileToV0Message()
            )

            versionedTransaction.sign([PAYER]);

            // console.log(await connection.simulateTransaction(versionedTransaction))
            bundleTxns.push(versionedTransaction)
            instructions = []
        }
    }

    if (instructions.length >= 0 && bundleTxns.length < 5) {
        console.log("Instruction Length: ", instructions.length)
        instructions.push(await jito.getJitoTipInstruction(PAYER));
        const versionedTransaction = new VersionedTransaction(
            new TransactionMessage({
                payerKey: PAYER.publicKey,
                recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
                instructions: instructions,
            }).compileToV0Message()
        )

        versionedTransaction.sign([PAYER]);

        console.log(await connection.simulateTransaction(versionedTransaction))
        bundleTxns.push(versionedTransaction)
    }

    let ret = await jito.sendBundles(bundleTxns)
    console.log("result: ", ret)

}

function divideAmount(amount, number) {
    let rets = [];
    let remaining = amount;

    for (let i = 0; i < number - 1; i++) {
        let part = Math.floor(parseFloat((Math.random() * (remaining / 2)).toFixed(2)));
        rets.push(part);
        remaining -= part;
    }

    rets.push(Math.floor(remaining));

    return rets;
}

async function distributeToken(sender, toWallets, mintAddress) {

    const balance = await getTokenAccountBalance(connection, sender.publicKey, mintAddress)
    if (balance == 0) {
        console.log(chalk.yellowBright(`Token Balance #${sender.publicKey} = ${balance}\n`))
        return
    }
    if (balance == -1) {
        return
    }

    console.log(`Token balance of ${sender.publicKey} : ${balance}`)
    const distributeTokenAmount = divideAmount(balance, toWallets.length + 1)

    let instructions = []

    for (let i = 0; i < toWallets.length; i++) {
        console.log("toWallets[i].PublicKey = ", toWallets[i].publicKey.toBase58())
        instructions.push(await createTransferTokenInst(connection, sender, toWallets[i], mintAddress, Math.floor(distributeTokenAmount[i])))
    }

    const versionedTransaction = new VersionedTransaction(
        new TransactionMessage({
            payerKey: PAYER.publicKey,
            recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
            instructions: instructions,
        }).compileToV0Message()
    )

    console.log(await connection.simulateTransaction(versionedTransaction))
    versionedTransaction.sign([PAYER, sender]);

    return versionedTransaction;
}

function getChunks(arr, size) {
    let index = 0;
    return function () {
        if (index >= arr.length) return null; // Stop when no more items
        const chunk = arr.slice(index, index + size);
        index += size;
        return chunk;
    };
}