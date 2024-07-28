## Deploy the NFT contract

A dummy smart contract can be found at `nft/NFT.sol`

## Run the merkle path service

```
cd merkle-path-service
npm install
node start.js
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
```

## Run the client

```
cd client
npm install
npm start
```