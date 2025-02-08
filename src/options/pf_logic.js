import {
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountInstruction
} from "@solana/spl-token"
import {
    PublicKey,
    Transaction,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js"

import * as utils from "../utils.js";
import anchor from "@project-serum/anchor";
const BUY_SELL_SLIPPAGE = 5;

const EVENT_AUTH = new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");
const feeRecipient = new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM");

export async function getMintMetaData(
    name,
    symbol,
    description,
    twitter,
    telegram,
    website,
    fileBlob
) {
    if (utils.isEmpty(name) || utils.isEmpty(symbol)) return false;
    // Token Metadata
    const tokenMetadata = {
        name,
        symbol,
        description: description || "",
        twitter: twitter || "",
        telegram: telegram || "",
        website: website || "",
        file: fileBlob,
    };

    // Step 1: Upload image to IPFS
    const formData = new FormData();
    formData.append("file", tokenMetadata.file);
    formData.append("name", tokenMetadata.name);
    formData.append("symbol", tokenMetadata.symbol);
    formData.append("description", tokenMetadata.description);
    formData.append("twitter", tokenMetadata.twitter);
    formData.append("telegram", tokenMetadata.telegram);
    formData.append("website", tokenMetadata.website);
    formData.append("showName", "true");

    const metadataResponse = await fetch("https://pump.fun/api/ipfs", {
        method: "POST",
        body: formData,
    });

    if (!metadataResponse.ok) {
        console.error("Failed to upload metadata:", await metadataResponse.text());
        return;
    }

    const metadataResponseJSON = await metadataResponse.json();
    const metadataUri = metadataResponseJSON.metadataUri;
    return metadataUri;
}

export async function buildMintInst(
    program, // pumpfun contract program
    signerKeypair, // KeyPair
    tokenMint, // PublicKey
    tokenName, // string
    tokenSymbol, // string
    tokenUri // string (Metadata URL)
) {
    const mint = tokenMint;
    // console.log("New Mint Address: ", mint.toString());
    const mintAuthority = getMintAuthority(program.programId);
    const bondingCurve = getBondingCurve(mint, program.programId);
    const bondingCurveAta = await getAssociatedTokenAddress(
        mint,
        bondingCurve,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const metadataAccount = getMetadataAccount(mint, program.programId);

    const globalState = new PublicKey(
        "4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"
    );
    const user = signerKeypair.publicKey;
    const mplTokenMetadata = new PublicKey(
        "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );

    //creating tx;

    const mintIx = await program.methods
        .create(tokenName, tokenSymbol, tokenUri)
        .accounts({
            mint: mint,
            mintAuthority: mintAuthority,
            bondingCurve: bondingCurve,
            associatedBondingCurve: bondingCurveAta,
            global: globalState,
            mplTokenMetadata: mplTokenMetadata,
            metadata: metadataAccount,
            user: user,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
            eventAuthority: EVENT_AUTH,
            program: program.programId,
        })
        .instruction();
    return mintIx;
}

export async function buildMintBuyTx(
    program, // pumpfun contract Program
    signerKeypair, // KeyPair
    tokenMint, // PublicKey
    maxSolCost, // number
    tokenAmount, // number
) {
    const mint = tokenMint;
    const bondingCurve = getBondingCurve(mint, program.programId);
    const bondingCurveAta = await getAssociatedTokenAddress(
        mint,
        bondingCurve,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const globalState = new PublicKey(
        "4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"
    ); // fixed
    const user = signerKeypair.publicKey;
    const userAta = getAssociatedTokenAddressSync(mint, user, true);
    const signerTokenAccount = getAssociatedTokenAddressSync(
        mint,
        user,
        true,
        TOKEN_PROGRAM_ID
    );

    const decimals = 6;
    let finalAmount = tokenAmount;
    
    //creating tx;
    const tx = new Transaction();

    tx.add(
        createAssociatedTokenAccountInstruction(
            user,
            signerTokenAccount,
            user,
            mint
        )
    );

    const snipeIx = await program.methods.buy(
        new anchor.BN(finalAmount * 10 ** decimals),
        new anchor.BN(maxSolCost * LAMPORTS_PER_SOL)
    ).accounts({
        global: globalState,
        feeRecipient: feeRecipient,
        mint: mint,
        bondingCurve: bondingCurve,
        associatedBondingCurve: bondingCurveAta,
        associatedUser: userAta,
        user: user,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        eventAuthority: EVENT_AUTH,
        program: program.programId,
    }).instruction();

    tx.add(snipeIx);

    return tx;
}

export async function buildBuyInst(
    program, // pumpfun contract program
    signerKeypair, // Keypair: wallet
    tokenMint, // PublicKey: token mint
    tokenAmount, // number
    solAmount // number
) {
    const mint = tokenMint;

    const bondingCurve = getBondingCurve(mint, program.programId);
    const bondingCurveAta = await getAssociatedTokenAddress(
        mint,
        bondingCurve,
        true
    );

    const globalState = new PublicKey(
        "4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"
    ); // fixed
    const user = signerKeypair.publicKey;
    const userAta = getAssociatedTokenAddressSync(mint, user, true);
    const signerTokenAccount = getAssociatedTokenAddressSync(mint, user, true);

    //@ts-ignore
    const decimals = 6;
    
    //creating instructions;
    const instructions = []

    instructions.push(
        createAssociatedTokenAccountInstruction(
            user,
            signerTokenAccount,
            user,
            mint
        )
    );

    const snipeIx = await program.methods.buy(
        new anchor.BN(tokenAmount * 10 ** decimals),
        new anchor.BN(solAmount * LAMPORTS_PER_SOL)
    ).accounts({
        global: globalState,
        feeRecipient: feeRecipient,
        mint: mint,
        bondingCurve: bondingCurve,
        associatedBondingCurve: bondingCurveAta,
        associatedUser: userAta,
        user: user,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        eventAuthority: EVENT_AUTH,
        program: program.programId,
    }).instruction();

    instructions.push(snipeIx);

    return instructions;
}
/**
 * @function: buildSellTx()
 * @description: build sell transaction
 * @param program
 * @param connection
 * @param signerKeypair
 * @param tokenMint
 * @param percentage
 * @param tokenAmount
 * @returns
 */
export async function buildSellTx(
    program,
    connection,
    signerKeypair,
    tokenMint,
    percentage,
    tokenAmount
) {
    try {
        const mint = new PublicKey(tokenMint);
        const mintAuth = getMintAuthority(program.programId);
        const bondingCurve = getBondingCurve(mint, program.programId);
        const bondingCurveAta = await getAssociatedTokenAddress(
          mint,
          bondingCurve,
          true,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
      
        const globalState = new PublicKey(
          "4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"
        ); // fixed
        const user = signerKeypair.publicKey;
        const userAta = getAssociatedTokenAddressSync(mint, user, true);
        const signerTokenAccount = getAssociatedTokenAddressSync(
          mint,
          user,
          true,
          TOKEN_PROGRAM_ID
        );
      
        const [bondingCurveData, mintData, account] = await Promise.all([
          program.account.bondingCurve.fetch(bondingCurve),
          connection.getParsedAccountInfo(mint),
          connection.getAccountInfo(signerTokenAccount, "processed"),
        ]);
      
        //@ts-ignore
        const decimals = mintData.value?.data.parsed.info.decimals;
      
        let finalAmount = 0;
        if (tokenAmount == 0) {
          let tokenBalance = 0;
          while(1) {
            tokenBalance = await utils.getSafeTokenBalance(
                connection,
                signerKeypair.publicKey.toBase58(),
                mint.toBase58()
            );
            if (tokenBalance > 0)
              break;
          }
          finalAmount = (tokenBalance * percentage) / 100;
        } else finalAmount = tokenAmount;
      
        // logger.log(`${chalk.redBright(chalk.bold("S"))} token(${chalk.magenta(mint.toString())}) ${chalk.yellow(finalAmount.toFixed(2))}`);
      
        //creating tx;
        const tx = new Transaction();
      
        const snipeIx = await program.methods
        .sell(new anchor.BN(finalAmount * 10 ** decimals), new anchor.BN(0 * LAMPORTS_PER_SOL))
        .accounts({
            global: globalState,
            feeRecipient: feeRecipient,
            mint: mint,
            bondingCurve: bondingCurve,
            associatedBondingCurve: bondingCurveAta,
            associatedUser: userAta,
            user: user,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            eventAuthority: EVENT_AUTH,
            program: program.programId,
        }).instruction();

        tx.add(snipeIx);
      
        return tx;
    } catch (error) {
        logger.error('Error', error);
        return null;
    }
    
}

export function simulateBuyPumpfunTokens(
    devSolAmount, // number
    devTokenAmount = 0, // mumber
    walletSolAmounts, // 
    walletTokenAmounts = [],
    denominatedInSol = true,
){
    try {
        const virtualInitSolReserve = 30;
        const virtualInitTokenReserve = 1073000000;
        const slippage = BUY_SELL_SLIPPAGE; // slippage 10%
        let maxSolAmounts = [];
        let solAmounts = [];
        let tokenAmounts = [];
        if (denominatedInSol){
            maxSolAmounts = [devSolAmount].concat(walletSolAmounts);
            for(let i = 0; i < maxSolAmounts.length; i ++) {
                const unitSlippage = (slippage + i) / 100;
                const numberAmount = maxSolAmounts[i] / (1 + unitSlippage);
                solAmounts.push(numberAmount)
            }
            
            tokenAmounts = getTokenAmounts(solAmounts, virtualInitSolReserve, virtualInitTokenReserve);

        } else {
            tokenAmounts = [devTokenAmount].concat(calculateTokenAmountsMinMax(virtualInitTokenReserve, WALLET_COUNT))
            solAmounts = getSolAmounts(
                tokenAmounts,
                virtualInitSolReserve,
                virtualInitTokenReserve,
            );
        }
        
        // solAmounts[0] += 0.2;
        // let totalSol = 0
        // solAmounts.forEach(amount => {
        //     totalSol += amount;
        // })
        // // totalSol -= solAmounts[0];
        // totalSol += 0.1 // Pumpfun Mint Token
        // let simulateInfo = [];
        // simulateInfo.push({ Wallet: "Minter", TokenAmount: devTokenAmount, SolAmount: solAmounts[0] })
        // for (let i = 1; i < tokenAmounts.length; i++) {
        //     simulateInfo.push({ Wallet: "Zombie" + i, TokenAmount: tokenAmounts[i], SolAmount: solAmounts[i] })
        // }
        // console.table(simulateInfo);
        // console.log("TotalSol =", totalSol);
        return [maxSolAmounts, tokenAmounts];
    } catch (error) {
        console.error('Error', error)
    }
}

export const calculateWithSlippageBuy = (
    amount, // bigint
    basisPoints = 500n // bigint
  ) => {
    return amount + (amount * basisPoints) / 10000n;
};

function getBondingCurve(tokenMint, programId) {
    const seedString = "bonding-curve";

    const [PDA, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from(seedString), tokenMint.toBuffer()],
        programId
    );

    return new PublicKey(PDA);
}

function getMintAuthority(programId) {
    const seedString = "mint-authority";

    const [PDA, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from(seedString)],
        programId
    );

    return new PublicKey(PDA);
}

function getMetadataAccount(
    tokenMint, 
    programId
) {
    const seedString = "metadata";

    const [PDA, bump] = PublicKey.findProgramAddressSync(
        [
            Buffer.from(seedString),
            new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
            tokenMint.toBuffer(),
        ],
        new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    );

    return new PublicKey(PDA);
}

// given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
function getAmountOut(amountIn, reserveIn, reserveOut) {
    let amountInWithFee = amountIn * 997;
    let numerator = amountInWithFee * reserveOut;
    let denominator = reserveIn * 1000 + amountInWithFee;
    let amountOut = numerator / denominator;
  
    return amountOut;
}
  
function getAmountIn(amountOut, reserveIn, reserveOut) {
    let numerator = reserveIn * amountOut * 1000;
    let denominator = (reserveOut - amountOut) * 997;
    let amountIn = numerator / denominator;
  
    return amountIn;
}

function getTokenAmounts(
    solAmounts,
    initSolReserve=30.000000002,
    initTokenReserve=1073000000,
) {
    // const initTokenReserve = 1073000000;
    // const initSolReserve = 30.000000002;
    let tokenAmount = 0;
    let tokenReserve = initTokenReserve;
    let solReserve = initSolReserve;
    let tokenPrice = 0;
    let tokenAmounts = [];
  
    for (let i = 0; i < solAmounts.length; i++) {
      let solAmount = solAmounts[i];
      tokenPrice = solReserve / tokenReserve;
  
      tokenAmount = getAmountOut(solAmount, solReserve, tokenReserve);
  
      tokenAmounts.push(Math.floor(tokenAmount));
  
      tokenReserve -= tokenAmount;
      solReserve += solAmount;
    }
  
    // console.log(`token Amounts: ${tokenAmounts}`);
  
    return tokenAmounts;
}

function getSolAmounts (
    tokenAmounts,
    initSolReserve=30.000000002,
    initTokenReserve=1073000000,
) {
    let tokenReserve = initTokenReserve;
    let solReserve = initSolReserve;
  
    let solAmounts = [];
    let solAmount = 0;
  
    for (let i = 0; i < tokenAmounts.length; i++) {
        let tokenAmount = tokenAmounts[i];
  
        solAmount = getAmountIn(tokenAmount, solReserve, tokenReserve)
        solAmounts.push(solAmount + 0.03);
  
        tokenReserve -= tokenAmount;
        solReserve += solAmount;
    }
  
    return solAmounts;
}

const calculateTokenAmountsMinMax = (totalAmount, count) => {
    const tokenAmouns = [];
    const spaceVal = MAX_PERCENT - MIN_PERCENT;
    for (let i = 0; i < count; i++) {
        const percent = MIN_PERCENT + (Math.random() * spaceVal);
        const tokenAmount = totalAmount * (percent / 100);
        tokenAmouns.push(tokenAmount);
    }
    return tokenAmouns;
}