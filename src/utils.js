import {
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    VersionedTransaction,
    TransactionMessage,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountIdempotentInstruction
} from "@solana/spl-token"; 
import { 
    validate,
    createPrivateKey,
    randomBytes,
} from "node-crypto-provider";
import bs58 from 'bs58';

export const getRandomNumber = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const sleep = ms => new Promise(r => setTimeout(r, ms))

export const checkTokenAccountExists = async (conn, tokenAccountAddress) => {
    try {
        const accountInfo = await conn.getAccountInfo(new PublicKey(tokenAccountAddress));
        // console.log("account info:", accountInfo)
        return accountInfo !== null;
    } catch (e) {
        console.log("Error checking token account existence: ", e);
        return false;
    }
}
export const isEmpty = value => {
    if(value == undefined || value == "" || !value) return false
}
export async function getTokenAccountBalance(
    conn,
    walletAddress,
    mintAddress) {
    try {
        const tokenAccounts = await conn.getParsedTokenAccountsByOwner(
            walletAddress,
            { mint: mintAddress }
        );

        if (!tokenAccounts)
            return 0;

        // Extract the token amount from the first account (if multiple accounts exist)
        const balance =
            tokenAccounts.value[0]?.account.data.parsed.info.tokenAmount.uiAmount;
        return balance || 0;
    } catch (e) {
        console.log("get token balance error: ", e);
        return -1;
    }
}

export const getSafeTokenBalance = async (
    conn,
    walletAddr,
    tokenMintAddr
) => {
    let tokenBalance = -1;
    
    while (1) {
        let checkExsit = await checkTokenAccountExists(conn, tokenMintAddr);
        if (!checkExsit)
            return 0;
        tokenBalance = await getTokenAccountBalance(
            conn,
            new PublicKey(walletAddr),
            new PublicKey(tokenMintAddr)
        );
        if (tokenBalance !== -1) break;
        await sleep(50);
    }
    return tokenBalance;
}

export const getKeypairFromBase58 = (pk) => {
    if (!validate(pk)){
        console.log("Invalid key format!")
        return
    }
    return Keypair.fromSecretKey(bs58.decode(pk));
}

const isValidPublicKey = (pubkey) => {
    try {
        if (!validate(pubkey)) {
            console.log("Invalid Key format!", error)
            return false
        }
        const publicKey = new PublicKey(pubkey);
        return true;
    } catch (error) {
        console.log("Invalid Key format!", error)
        return false;
    }
}

export const isValidPrivateKey = (privKey) => {
    try {
        if (!validate(privKey)) {
            console.log("Invalid Key format!", error)
            return false
        }
        Keypair.fromSecretKey(bs58.decode(privKey));
        return true
    } catch (error) {
        // console.log("Invalid Key format!", error)
        return false
    }
}

export const isUrlValid = string => {
    var res = string.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
    if(res == null)
        return false;
    else
        return true;
}

export const getPrivateKeyFromKeyPair = (keyPair) => {
    if(!keyPair || !isValidPrivateKey(keyPair.secretKey)){
        console.log("Invalid keypair format!")
        return
    }
    return bs58.encode(keyPair.secretKey)
}

export const getPublicKeyFromKeyPair = (keyPair) => {
    if(!keyPair || !isValidPublicKey(keyPair.publicKey.toString())){
        console.log("Invalid keypair format!")
        return
    }
    return keyPair?.publicKey.toString();
}