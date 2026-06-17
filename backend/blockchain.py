"""
blockchain.py — Environment-aware blockchain connector.

Local  (ENV=development) → Ganache  http://127.0.0.1:7545  (full contract)
Cloud  (ENV=production)  → Sepolia  via SEPOLIA_RPC_URL    (simple contract)
"""

import os
from dotenv import load_dotenv
from web3 import Web3

load_dotenv()

ENV = os.getenv("FLASK_ENV", "development")

# ── Full ABI for the Ganache contract (with revoke, isRevoked, etc) ──────────
GANACHE_ABI = [
    {
        "inputs": [{"internalType": "string", "name": "_degreeHash", "type": "string"}],
        "name": "revokeDegree",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "string", "name": "_studentName", "type": "string"},
            {"internalType": "string", "name": "_degreeHash",  "type": "string"},
        ],
        "name": "storeDegree",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {"inputs": [], "stateMutability": "nonpayable", "type": "constructor"},
    {
        "inputs": [{"internalType": "string", "name": "", "type": "string"}],
        "name": "degrees",
        "outputs": [
            {"internalType": "string",  "name": "studentName", "type": "string"},
            {"internalType": "string",  "name": "degreeHash",  "type": "string"},
            {"internalType": "uint256", "name": "timestamp",   "type": "uint256"},
            {"internalType": "bool",    "name": "revoked",     "type": "bool"},
            {"internalType": "bool",    "name": "exists",      "type": "bool"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "string", "name": "_degreeHash", "type": "string"}],
        "name": "isRevoked",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "string", "name": "_degreeHash", "type": "string"}],
        "name": "verifyDegree",
        "outputs": [
            {"internalType": "string",  "name": "studentName", "type": "string"},
            {"internalType": "uint256", "name": "timestamp",   "type": "uint256"},
            {"internalType": "bool",    "name": "revoked",     "type": "bool"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
]

# ── Simple ABI for the Sepolia deployed contract ──────────────────────────────
# Matches the contract source on Etherscan:
#   verifyDegree returns ONLY (string studentName, uint256 timestamp)
#   degrees mapping returns (string, string, uint256)
SEPOLIA_ABI = [
    {
        "inputs": [
            {"internalType": "string", "name": "_studentName", "type": "string"},
            {"internalType": "string", "name": "_degreeHash",  "type": "string"},
        ],
        "name": "storeDegree",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "string", "name": "_degreeHash", "type": "string"}],
        "name": "verifyDegree",
        "outputs": [
            {"internalType": "string",  "name": "", "type": "string"},
            {"internalType": "uint256", "name": "", "type": "uint256"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "string", "name": "", "type": "string"}],
        "name": "degrees",
        "outputs": [
            {"internalType": "string",  "name": "studentName", "type": "string"},
            {"internalType": "string",  "name": "degreeHash",  "type": "string"},
            {"internalType": "uint256", "name": "timestamp",   "type": "uint256"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
]


# ── Connect based on environment ──────────────────────────────────────────────

if ENV == "production":
    SEPOLIA_RPC_URL          = os.getenv("SEPOLIA_RPC_URL")
    SEPOLIA_WALLET_ADDRESS   = os.getenv("SEPOLIA_WALLET_ADDRESS")
    SEPOLIA_PRIVATE_KEY      = os.getenv("SEPOLIA_PRIVATE_KEY")
    SEPOLIA_CONTRACT_ADDRESS = os.getenv("SEPOLIA_CONTRACT_ADDRESS")

    web3 = Web3(Web3.HTTPProvider(SEPOLIA_RPC_URL))
    print(f"[Blockchain] Production mode — Sepolia connected: {web3.is_connected()}")

    contract = web3.eth.contract(
        address=Web3.to_checksum_address(SEPOLIA_CONTRACT_ADDRESS),
        abi=SEPOLIA_ABI,
    )

    def store_degree(student_name: str, degree_hash: str) -> str:
        nonce = web3.eth.get_transaction_count(SEPOLIA_WALLET_ADDRESS)
        txn = contract.functions.storeDegree(student_name, degree_hash).build_transaction({
            "from":     SEPOLIA_WALLET_ADDRESS,
            "nonce":    nonce,
            "gas":      200_000,
            "gasPrice": web3.eth.gas_price,
        })
        signed = web3.eth.account.sign_transaction(txn, private_key=SEPOLIA_PRIVATE_KEY)
        tx_hash = web3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        return receipt.transactionHash.hex()

    def revoke_degree(degree_hash: str) -> str:
        # Sepolia contract has no revoke function — just mark in Supabase
        print(f"[Sepolia] revokeDegree not supported on this contract — handled in DB only")
        return "0x" + "0" * 64

else:
    GANACHE_URL      = os.getenv("GANACHE_URL", "http://127.0.0.1:7545")
    CONTRACT_ADDRESS = os.getenv("GANACHE_CONTRACT_ADDRESS", "0x2f817aa3645E9c09004edF975d9941fc3D94F37A")

    web3 = Web3(Web3.HTTPProvider(GANACHE_URL))
    print(f"[Blockchain] Development mode — Ganache connected: {web3.is_connected()}")

    contract = web3.eth.contract(
        address=CONTRACT_ADDRESS,
        abi=GANACHE_ABI,
    )

    account = web3.eth.accounts[0]

    def store_degree(student_name: str, degree_hash: str) -> str:
        tx = contract.functions.storeDegree(student_name, degree_hash).transact({"from": account})
        receipt = web3.eth.wait_for_transaction_receipt(tx)
        return receipt.transactionHash.hex()

    def revoke_degree(degree_hash: str) -> str:
        tx = contract.functions.revokeDegree(degree_hash).transact({"from": account})
        receipt = web3.eth.wait_for_transaction_receipt(tx)
        return receipt.transactionHash.hex()


def get_etherscan_url(tx_hash: str) -> str | None:
    if ENV == "production":
        return f"https://sepolia.etherscan.io/tx/{tx_hash}"
    return None
