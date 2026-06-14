from blockchain import web3, contract

print("Connected:", web3.is_connected())
print("Address:", contract.address)

code = web3.eth.get_code(contract.address)

print("Contract Code Length:", len(code))
print(code.hex()[:100])