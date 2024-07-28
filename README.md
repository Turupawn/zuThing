## Deploy the NFT contract

A dummy smart contract can be found at `nft/NFT.sol`

## Run the merkle path service

```
cd merkle-path-service
npm install
PORT=8888 RPC_URL="https://sepolia-rpc.scroll.io" NFT_ADDRESS="0x67fB78F2252884DBf8489E3cc96cDEEbFD052E85" node start.js
```

Here's the API endpoint documentation for the server, including examples with `curl`.

### API Endpoints Documentation

#### 1. **Generate Merkle Paths and Root**

- **Endpoint**: `/generate`
- **Method**: `POST`
- **Description**: Generates Merkle paths and root for all addresses listed in `addresses.json`.
- **Response**: `200 OK` with a success message.

**Example Request**:
```sh
curl -X POST http://localhost:8888/generate
```

**Example Response**:
```json
"Merkle paths and root generated successfully."
```

#### 2. **Get Merkle Path for an Address**

- **Endpoint**: `/merkle-path/:address`
- **Method**: `GET`
- **Description**: Retrieves the Merkle path and index for a specified address.
- **URL Parameters**:
  - `address` (string): The address for which the Merkle path is requested.
- **Response**:
  - `200 OK` with the Merkle path and index if the address exists.
  - `404 Not Found` if the address or Merkle path is not found.
  - `500 Internal Server Error` if the Merkle root is not found.

**Example Request**:
```sh
curl -X GET http://localhost:8888/merkle-path/0xYourAddressHere
```

**Example Response**:
```json
{
  "root": "0xYourMerkleRootHere",
  "path": [
    "0xLeftHash",
    "0xRightHash"
  ],
  "index": 1
}
```

#### 3. **Fetch NFT Holders**

- **Endpoint**: `/fetch-nft-holders`
- **Method**: `POST`
- **Description**: Fetches all NFT holders from the NFT contract and stores them in `addresses.json`.
- **Response**:
  - `200 OK` with a success message if the operation was successful.
  - `500 Internal Server Error` if there is an issue fetching NFT holders or writing to `addresses.json`.

**Example Request**:
```sh
curl -X POST http://localhost:8888/fetch-nft-holders
```

**Example Response**:
```json
"NFT holders fetched and saved successfully."
```

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