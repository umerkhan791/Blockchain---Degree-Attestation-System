from web3 import Web3
from eth_account import Account
import os
from dotenv import load_dotenv
from audit_logger import log_event

load_dotenv()

SEPOLIA_RPC_URL         = os.getenv("SEPOLIA_RPC_URL")
SEPOLIA_WALLET_ADDRESS  = os.getenv("SEPOLIA_WALLET_ADDRESS")
SEPOLIA_PRIVATE_KEY     = os.getenv("SEPOLIA_PRIVATE_KEY")
SEPOLIA_CONTRACT_ADDRESS = os.getenv("SEPOLIA_CONTRACT_ADDRESS")

# Connect to Sepolia
web3_sepolia = Web3(Web3.HTTPProvider(SEPOLIA_RPC_URL))

print("Sepolia connected:", web3_sepolia.is_connected())

# Minimal ABI — only storeDegree and verifyDegree
SEPOLIA_ABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "_studentName", "type": "string"},
            {"internalType": "string", "name": "_degreeHash",  "type": "string"}
        ],
        "name": "storeDegree",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "_degreeHash", "type": "string"}
        ],
        "name": "verifyDegree",
        "outputs": [
            {"internalType": "string",  "name": "", "type": "string"},
            {"internalType": "uint256", "name": "", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

sepolia_contract = web3_sepolia.eth.contract(
    address=Web3.to_checksum_address(SEPOLIA_CONTRACT_ADDRESS),
    abi=SEPOLIA_ABI
)


def store_degree_public(student_name: str, degree_hash: str) -> str:
    """
    Store the degree hash on Sepolia public blockchain.
    Returns the Sepolia transaction hash.
    """
    try:
        nonce = web3_sepolia.eth.get_transaction_count(SEPOLIA_WALLET_ADDRESS)

        txn = sepolia_contract.functions.storeDegree(
            student_name,
            degree_hash
        ).build_transaction({
            "from":     SEPOLIA_WALLET_ADDRESS,
            "nonce":    nonce,
            "gas":      200000,
            "gasPrice": web3_sepolia.eth.gas_price,
        })

        signed_txn = web3_sepolia.eth.account.sign_transaction(
            txn, private_key=SEPOLIA_PRIVATE_KEY
        )

        tx_hash = web3_sepolia.eth.send_raw_transaction(
            signed_txn.raw_transaction
        )

        receipt = web3_sepolia.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

        tx_hex = receipt.transactionHash.hex()

        log_event(
            "SEPOLIA_TX",
            f"student={student_name} degree_hash={degree_hash} "
            f"tx={tx_hex} "
            f"etherscan=https://sepolia.etherscan.io/tx/{tx_hex}"
        )

        return tx_hex

    except Exception as e:
        log_event("SEPOLIA_ERROR", f"degree_hash={degree_hash} error={e}")
        print(f"[Sepolia] Error: {e}")
        return None


def get_sepolia_etherscan_url(tx_hash: str) -> str:
    """Returns the Etherscan Sepolia URL for a transaction."""
    return f"https://sepolia.etherscan.io/tx/{tx_hash}"
