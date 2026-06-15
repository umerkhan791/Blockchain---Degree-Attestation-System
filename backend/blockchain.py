from web3 import Web3

# Connect to Ganache
# ganache_url = "http://127.0.0.1:7545"
# web3 = Web3(Web3.HTTPProvider(ganache_url))

# print("Connected:", web3.is_connected())

try:
    ganache_url = "http://127.0.0.1:7545"
    web3 = Web3(Web3.HTTPProvider(ganache_url))
    print("Connected:", web3.is_connected())
except:
    web3 = None
    print("Ganache disabled")

# Contract Address
contract_address = "0x2f817aa3645E9c09004edF975d9941fc3D94F37A"

# Contract ABI
contract_abi = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_degreeHash",
        "type": "string"
      }
    ],
    "name": "revokeDegree",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_studentName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_degreeHash",
        "type": "string"
      }
    ],
    "name": "storeDegree",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "name": "degrees",
    "outputs": [
      {
        "internalType": "string",
        "name": "studentName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "degreeHash",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "revoked",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_degreeHash",
        "type": "string"
      }
    ],
    "name": "isRevoked",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_degreeHash",
        "type": "string"
      }
    ],
    "name": "verifyDegree",
    "outputs": [
      {
        "internalType": "string",
        "name": "studentName",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "revoked",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

# Create contract object
contract = web3.eth.contract(
    address=contract_address,
    abi=contract_abi
)

# Ganache account
account = web3.eth.accounts[0]

# Function to store degree
def store_degree(student_name, degree_hash):

    tx = contract.functions.storeDegree(
        student_name,
        degree_hash
    ).transact({
        "from": account
    })

    receipt = web3.eth.wait_for_transaction_receipt(tx)

    return receipt.transactionHash.hex()

def revoke_degree(degree_hash):
    tx = contract.functions.revokeDegree(
        degree_hash
    ).transact({
        "from": account
    })

    receipt = web3.eth.wait_for_transaction_receipt(tx)
    return receipt.transactionHash.hex()


# Run only if file executed directly
if __name__ == "__main__":

    tx_hash = store_degree(
        "Muhammad Umer",
        "90787af95e1f650adba73d48541e8182d61c40bc103efc4fb52492dd88cece59"
    )

    print("Stored on blockchain!")
    print("Transaction Hash:", tx_hash)