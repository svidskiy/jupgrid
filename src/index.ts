import {JsonRpcProvider, Interface, Contract} from "ethers";

const CONTRACT_ADDRESS = "0x3328F7f4A1D1C57c35df56bBf0c9dCAFCA309C49";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

const RPC_PROVIDER = "https://mainnet.infura.io/v3/1ffd687403a549c290e9b8067345e351";

const CONTRACT_ABI = [
    "function swapETHForExactTokens(uint256[] memory, address[] memory, address, uint256, uint256, uint256, uint256)"
];

const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)"
];

async function getTokenDetails(token_address: string, provider: JsonRpcProvider) {
    const tokenContract = new Contract(token_address, ERC20_ABI, provider);

    try {
        const name = await tokenContract.name();
        const symbol = await tokenContract.symbol();
        const decimals = await tokenContract.decimals();

        return { name, symbol, decimals };
    } catch (error) {
        console.error(`Failed to fetch details for token ${token_address}:`, error);

        return null;
    }
}

async function getRecentTransactions() {
    const provider = new JsonRpcProvider(RPC_PROVIDER);

    const currentBlock = await provider.getBlockNumber();

    const logs = await provider.getLogs({
        address: CONTRACT_ADDRESS,
        fromBlock: currentBlock - 10,
        toBlock: currentBlock,
    });

    const contractInterface = new Interface(CONTRACT_ABI);

    const processed = new Set();

    for (const log of logs) {
        try {
            const transaction = await provider.getTransaction(log.transactionHash);

            if (!transaction) {
                continue;
            }

            const decoded = contractInterface.parseTransaction({ data: transaction.data });

            if (!decoded) {
                continue;
            }

            const path = decoded.args[1];

            if (!path.includes(WETH_ADDRESS)) {
                continue;
            }

            for (const address of new Set(path)) {

                const uniqueKey = `${transaction.hash}-${address}`;

                if (processed.has(uniqueKey)) {
                    continue;
                }
                processed.add(uniqueKey);

                const details = await getTokenDetails(address, provider);

                if (details) {
                    console.log(
                        `Hash: ${transaction.hash}, Token: ${details.name} (${details.symbol}), Decimals: ${details.decimals}`
                    );
                }
            }
        } catch (error) {
            console.error("Error processing log:", error);
        }
    }
}

getRecentTransactions();