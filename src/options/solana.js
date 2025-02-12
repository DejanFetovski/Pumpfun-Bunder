import {
    createTransferInstruction,
    getOrCreateAssociatedTokenAccount,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    getAccount,
    getAssociatedTokenAddress,
    getAssociatedTokenAddressSync,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export const createTransferTokenInst = async (connection, sender, toAddr, tokenMint, amount) => {
    const from = await getOrCreateAssociatedTokenAccount(
        connection,
        sender,
        tokenMint,
        sender.publicKey
    );

    const to = await getOrCreateAssociatedTokenAccount(
        connection,
        sender,
        tokenMint,
        toAddr
    );

    return createTransferInstruction(
        from.address,
        to.address,
        sender.publicKey,
        Math.floor(amount * LAMPORTS_PER_MEME)
    );
};

export async function getTokenAccountBalance(
    connection,
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
