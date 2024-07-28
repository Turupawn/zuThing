## Deploy the NFT contract

A dummy smart contract can be found at `nft/NFT.sol`

## Run the merkle path service

```
cd merkle-path-service
npm install
PORT=8888 node start.js
```

`/fetch-addresses`
TODO

`/generate`
Generates the whole merkle tree

`/merkle-path/:address`
Gets the merkle proof path

## Run the verifier backend

```
cd verifier-backend
npm install
node start.js
PORT=8080 ULTRAPLONK_VERIFIER="0x9b6B2DA3bcb60d6a5aCe951234470842bC257636" RPC_URL="https://sepolia-rpc.scroll.io" node start.js
```

## Run the client

```
cd client
npm install
NETWORK_ID="534351" MERKLE_PATH_SERVICE_API_URL="http://localhost:8888" VERIFIER_API_URL="http://localhost:8080" NFT_ADDRESS="0x67fB78F2252884DBf8489E3cc96cDEEbFD052E85" NFT_ABI_PATH="../json_abi/NFTAbi.json" npm start
```