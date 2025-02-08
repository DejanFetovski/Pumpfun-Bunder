import { 
  PublicKey, 
  Keypair, 
  Connection, 
  VersionedTransaction,
  TransactionMessage
} from "@solana/web3.js";
import bs58 from "bs58";
import fs from "fs";
import idl from "../idl.json" assert { type: 'json' };
import anchor from "@project-serum/anchor";
import * as utils from "../utils.js";
import * as pumpfun from "./pf_logic.js";
import * as jito from "../jitoAPI.js"
import chalk from "chalk";

const keypairs = JSON.parse(fs.readFileSync("data/keypairs.json", "utf8"));
const settings = JSON.parse(fs.readFileSync("data/settings.json", "utf8"));
const connection = new Connection(settings.rpc, "confirmed");

const PAYER = Keypair.fromSecretKey(bs58.decode(settings.master_dev_wallet_pk));
const PUMPFUN_PROGRAM_ID = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");

const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(PAYER),
    anchor.AnchorProvider.defaultOptions()
);
const pumpfunProgram = new anchor.Program(idl, PUMPFUN_PROGRAM_ID, provider);
const INSTRUCTION_PER_TX = 5;

export async function bundle_pool() {

  // Keypairs
  const wallets = keypairs.map((keypair) =>
    Keypair.fromSecretKey(bs58.decode(keypair.secretKey[0]))
  );

  // Mint Keypair
  const tokenMintKeypair = Keypair.generate();

  const metadataUri = await pumpfun.getMintMetaData(
    settings.token_name,
    settings.token_symbol,
    settings.token_desc,
    settings.twitter || "",
    settings.telegram || "",
    settings.website || "",
    await fs.openAsBlob("data/img/token.png"),
  );

  let instructions = [];
  let bundleTxns = [];
  let walletSolAmounts = [];

  for(let i = 0; i < wallets.length; i ++){
    walletSolAmounts.push(settings.wallets_sol_buy)
  }
  
  let [solAmounts, tokenAmounts] = pumpfun.simulateBuyPumpfunTokens(
    settings.dev_wallet_sol_buy,
    0,
    walletSolAmounts,
    [],
  );

  console.log("solAmounts:", solAmounts);
  console.log("tokenAmounts:", tokenAmounts);

  const mintInst = await pumpfun.buildMintInst(
    pumpfunProgram,
    PAYER,
    tokenMintKeypair.publicKey,
    settings.token_name,
    settings.token_symbol,
    metadataUri
  );
   
  const txBuyDev = await pumpfun.buildMintBuyTx(
    pumpfunProgram,
    PAYER,
    tokenMintKeypair.publicKey,
    solAmounts[0],
    tokenAmounts[0]
  );

  // Lookup Table
  const firstAddressLookup = new PublicKey("Ej3wFtgk3WywPnWPD3aychk38MqTdrjtqXkzbK8FpUih")
  const lookupTableAccount = (await connection.getAddressLookupTable(firstAddressLookup));
  let lookupTableAccounts = [lookupTableAccount.value];
  
  instructions = [mintInst, ...txBuyDev.instructions];
  
  instructions.push(await jito.getJitoTipInstruction(PAYER));
  let firstSigners = [PAYER, tokenMintKeypair]
  let signers = [];
  
  const versionedTransaction = new VersionedTransaction(
    new TransactionMessage({
        payerKey: PAYER.publicKey,
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
        instructions: instructions,
    }).compileToV0Message(lookupTableAccounts)
  )

  // console.log("first versioned transaction:", versionedTransaction.serialize().length)
  versionedTransaction.sign(firstSigners);
  // const signature = await connection.simulateTransaction(versionedTransaction);
  // console.log("simulate:", signature.value)
  // return;
  bundleTxns.push(versionedTransaction)

  instructions.length = 0
  for (let i = 0; i < wallets.length; i ++){
    const tokenAmount = tokenAmounts[i+1];
    const solAmount = solAmounts[i+1];
    const provider = new anchor.AnchorProvider(
      connection,
      new anchor.Wallet(wallets[i]),
      anchor.AnchorProvider.defaultOptions()
    );

    const program = new anchor.Program(idl, PUMPFUN_PROGRAM_ID, provider);
    instructions = instructions.concat(await pumpfun.buildBuyInst(
      program,
      wallets[i],
      tokenMintKeypair.publicKey,
      tokenAmount,
      solAmount,
    ))
    
    signers.push(wallets[i]);
    if (i > 0 && (i + 1) % INSTRUCTION_PER_TX == 0 || i == wallets.length - 1) {
      const versionedTransaction = new VersionedTransaction(
        new TransactionMessage({
            payerKey: wallets[i].publicKey,
            recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
            instructions: instructions,
        }).compileToV0Message(lookupTableAccounts)
      )
      versionedTransaction.sign(signers)
      // console.log("versioned transaction size", versionedTransaction.serialize().length)
      const signature = await connection.simulateTransaction(versionedTransaction);
      console.log(`simulate: ${i}`, signature.value)
      bundleTxns.push(versionedTransaction)
      instructions.length = 0
      signers.length = 0
    }
  }

  let ret = await jito.sendBundles(bundleTxns)
  if (ret) {
      console.log(`Pumpfun Launch Success! https://pump.fun/coin/${tokenMintKeypair.publicKey.toBase58()}`);
  } else {
      console.log(`Pumpfun Launch Failed`);
      console.log("reason:", ret)
  }
}
// bundle_pool().catch((err) => {
//   console.error("Error during bundle creation:", err);
// });
