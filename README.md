Privacy ticketing system: Show a QR code linked to a zk proof to verify NFT ownership for event entry without revealing your identity.

![zuThing demo](https://github.com/user-attachments/assets/85cbd9e9-b3e3-47a1-a366-9acd14cc7fe7)

---

# Table of Contents

- [ZK Ticketing System](#zk-ticketing-system)
- [✅ Features](#-features)
- [❌ Caveats](#-caveats)
- [🚀 Deploy Guide](#-deploy-guide)
- [👮 What is needed to launch in production](#-what-is-needed-to-launch-in-production)
- [📂 Directory Structure](#-directory-structure)
- [📐 Architecture](#-architecture)
- [📖 API Endpoint Documentation](#-api-endpoint-documentation)
  - [Merkle Path Service API](#merkle-path-service-api)
  - [Verifier API](#verifier-api)
- [🌊 My unfiltered brain dump](#-my-unfiltered-brain-dump)

---

## ✅ Features

| Feature | Supported |
|----------|------------ |
| Noir Circuits | ✅ |
| Ultra Plunk backend | ✅ |
| Pedersen merkle inclusion proofs | ✅ |
| Colin's ecrecover lib | ✅ |
| Very vanilla express, sqlite, ethersjs combo | ✅ |
| Compatible with most NFTs contracts | ✅ |

## ❌ Caveats

* **Long proving time:** In web and mobile browser it takes about 1 mintute to produce a proof.
* **Offloading computation:** Ofloading computation to a zk cloud server might speed up the proving time but it will reveal the identity to the cloud service provider.
* **Lack of nullifiable signatures:** All mayor Ethereum wallets don't support a signatures that prevent "double spending" so tickets can be used many times.
* **Bad UX for nullifiable signatures:** If a nullifiable scheme is used, users will have to store notes in local files or local storage.
* **ZK moves fast:** This projects contains the best tool choices today in my opinion. This is in termos of ZK Backend, hashing methods and general flow. ZK moves fast so this will need to be revised when new implementations are released.
* **This demo works but...:** Needs to implement a production ready database and server. Also the sistem has not been audited. This work is to be refered at fully working project that demonstrates the architecture, not executation especifics which can be chosen by the implementing team (db, server, libraries choices).

## 🚀 Deploy guide

### 1. Deploy the NFT contract

A dummy smart contract can be found at `nft/NFT.sol`. Also deploy the verifier contract at `circuit/contract/circuit/plonk_vk.sol`.

## Run the merkle path service

```
cd merkle-path-service
npm install
PORT=8888 RPC_URL="https://sepolia-rpc.scroll.io" NFT_ADDRESS="0x67fB78F2252884DBf8489E3cc96cDEEbFD052E85" node start.js
```

### 2. Run the verifier backend

```
cd verifier-backend
npm install
node start.js
PORT=8080 ULTRAPLONK_VERIFIER="0x9b6B2DA3bcb60d6a5aCe951234470842bC257636" RPC_URL="https://sepolia-rpc.scroll.io" node start.js
```

### 3. Run the client

```
cd client
npm install
NETWORK_ID="534351" MERKLE_PATH_SERVICE_API_URL="http://localhost:8888" VERIFIER_API_URL="http://localhost:8080" NFT_ADDRESS="0x67fB78F2252884DBf8489E3cc96cDEEbFD052E85" NFT_ABI_PATH="../json_abi/NFTAbi.json" npm start
```

## 👮 What is needed to launch in production

* **Efficient Merkle tree generation:** Currently noir proofs are being used to generate the tree. A javascript implementation should be used instead. The problem is that there is currently no JS implementation of Noir's Pedersen. So this should be implmented (hard) or look for an alternative (haven't found one yet). Also, once this is optimized, should be removed from the merkle tree generation api and put into the client.
* **Production ready stack:** Should use something more reliable than express and sqlite. This would depend on the amount of users.
* **QR Scanner mobile app:** The code for the QR code checker should be grabed from the client app and put into a mobile app that is able to scan QR codes.
* **JS Verification:** A JS ZK proof should be used instead of using a call to a verifier contract on chain. This was made this way for simplicity and testing purposes but a JS verification makes more sense in this case.
* **Nullification:** A separate on-chain tree should be generated with nullifiable actions (only enter event once, only eat dinner once, etc..). However to make this happen today it will require users to store notes or install an alternative wallet with proper signature schemes.
* **Benchmarking:** Different backend benchmarking should be done to make sure we're using the most adequate one for our case. Also this should be done constantly to check if a new backend optimizations are available.
* **QA:** Proper testing should be done. Test in different devices. Stress testing. Test with more users according to the event.

## 📂 Directory Structure

* `circuit/` Contains a circuit that proves that a user is an NFT holder by performing an ecrecover combined with a merkle inclusion proof.
* `client/` Vite.js webapp with a WASM prover that connects to metamask to produce a private proof of NFT ownership.
* `merkle-path-service/` Backend API service that builds the merkle tree and produces paths to perform merkle inclusion proofs.
* `nft/` Dummy Enumerable NFT contract demo.
* `verifier-backend/` Backend API service that verifies proofs and keeps track of proofs previously submitted.

## 📐 Architecture

![diagram](https://github.com/user-attachments/assets/085c5183-4d07-4f86-acae-4a91525daa95)

```uml
@startuml
actor MobileApp
entity NFTContract
entity MerklePathService
actor Client
entity CloudZKProver
entity VerifierBackend

NFTContract -> MerklePathService: Provides Holder Information
MerklePathService -> Client: Provides Merkle Path
Client -> CloudZKProver: Send private data (optional)
CloudZKProver -> Client: Sends Proof
Client -> VerifierBackend: Sends Proof
VerifierBackend -> Client: Sends Hash
MobileApp -> Client: Scans QR Code

@enduml
# https://www.planttext.com/
```

## 📖 API Endpoint Documentation

### Merkle Path Service API

#### `/generate` `POST`
Generates Merkle paths and root for all addresses listed in `addresses.json`.

- **Response**: `200 OK` with a success message.

**Example Request**:
```sh
curl -X POST http://localhost:8888/generate
```

**Example Response**:
```json
"Merkle paths and root generated successfully."
```

#### `/merkle-path/:address` `GET`

Retrieves the Merkle path and index for a specified address.

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

#### `/fetch-nft-holders` `POST`

Fetches all NFT holders from the NFT contract and stores them in `addresses.json`.

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

### Verifier API

#### `/verify` `POST`

Verifies a proof using the contract’s `verify` function and stores it in the SQLite database if valid.

- **Request Body**:
  - `proof` (string): The proof to be verified.
  - `publicInputs` (array of strings): The public inputs for the proof verification.
- **Response**:
  - `200 OK` with the verification result and the proof hash if the proof is valid.
  - `500 Internal Server Error` if the proof verification fails or an error occurs.

**Example Request**:
```sh
curl -X POST http://localhost:8080/verify \
     -H "Content-Type: application/json" \
     -d '{
           "proof": "0xYourProofHere",
           "publicInputs": ["0xYourPublicInput1", "0xYourPublicInput2"]
         }'
```

**Example Response**:
```json
{
  "valid": true,
  "hash": "your-proof-hash"
}
```

**Example Response for Invalid Proof**:
```json
{
  "valid": false
}
```

**Example Error Response**:
```json
{
  "error": "Proof verification failed",
  "details": "Detailed error message here"
}
```

#### `/proof/:hash` `GET`

Checks if a proof with the given hash exists in the SQLite database.

- **URL Parameters**:
  - `hash` (string): The hash of the proof to check.
- **Response**:
  - `200 OK` with the existence status of the proof.
  - `500 Internal Server Error` if a database query fails.

**Example Request**:
```sh
curl -X GET http://localhost:8080/proof/your-proof-hash
```

**Example Response**:
```json
{
  "exists": true
}
```

**Example Response if Proof Does Not Exist**:
```json
{
  "exists": false
}
```

**Example Error Response**:
```json
{
  "error": "Database query failed",
  "details": "Detailed error message here"
}
```

## 🌊 My unfiltered brain dump

A normal Enumerable `NFT contract` is deployed on Scroll. The event organizer can decide how to distribute them (whitelist, sale, merkle drop,...).

`The merkle path service` runs `/fetch-nft-holders` to keep track of all the holders. This can be done through a cron job or on-chain event listener. Currently, it stores all the data in a JSON file, but should be done in a proper database to be able to query and store faster. Once it has all the new NFT holders, it calls `/generate` to generate the whole merkle tree. Again, the whole merkle tree is stored in JSON files but should be stored in a database. Something very important to mention is that currently the generate endpoint will generate the merkle tree by using the noir circuit itself, this means that a huge computation overhead will go into this. Instead this should use a js implementation of the pedersen hashing compatible with Noir, however this hasn't been released so we're producing the whole proof just to get the hash. While a workaround is found for this, we could potentially use a cloud ZK computing service such as Sindri to offload the computation from our backend.

`The client` is a webapp that will check if the user has the NFT or not, if he has it it will be able to generate a ZK Proof that he is one of the owners without revealing which one he is. In order to query the merkle data needed to generate the proof, it consults `/merkle-path/:address` from the merkle service that will return the root and the merkle inclusion path. Consulting an endpoint just before entering the event could make it easy to figure out his identity. So the best way to do this would be to download the merkle data (either the leaves or the whole tree depending on the size and efficiency) and generate the path on the client.

To generate a proof, the user uses the merkle data combined with a signature that will be sent to the `circuit` that first makes an ecrecover to prove that the signature was done by one of the leaves and then perform a merkle inclusion proof to prove that he is one of the holders. Then the proof is sent to the verifier backend `verify` endpoint. Currently Aztec noir is being used with the UltraPlonk backend and Pedersen hash. I would have prefered using Poseidon to check the performance difference, I ended up choosing Pedersen because it's the default on teir standard library. That being said, by far, the biggest limitation is ecrecover, I decided to use Aztec because the proving time is a little bit less than a minute (tested on a phone and had a similar wait time) and building the circuit and verifier takes also about a minute or two. My first choice for this project was Groth16 where suposedly proofs are cheaper to cheaper to verify on-chain, however, usining 0xParc implementation requires a 64 gb of ram to generate the trusted setup and about 4 minutes to prove. Also tried other libraries but all with it's own caveats. I think in the not so distant future the DSL and libraries should be revised.

If users don't mind revealing their identities, they can produce proofs faster by calling a `cloud prover` such as Sindri. This project hasn't integrated with such services but looks like a good way to offer users a better user experience but of course this will reveal their identity to Sindri at the time of the entrance which makes it awkward to be trusting Sindri more than the event organizers because the users might not be aware of it. Also cloud computing vs local hasn't been benchmarked so there's a need to benchmark to see how much wait time can be reduced. 

`The verifier backend` receives a proof and checks if it's valid. Currently this is done by consulting a verifier contract deployed on-chain, but this should be done directly using a JS library provided from the circuit DSL libraries, it was done that way because such verifying funcion is hard to integrate with an external server. That being said, a great thing is that this workaround works thanks to Scroll being able to verfy ZK proofs from all DSLs, Noir included. The proof is stored in a local database and returns a proof hash to the client. Currently SQLite is being used but a more robust database should be implemented.

The client receives the hash and generates a QR code. At the entrance of the event, the event crew can scan the QR and check if it's valid by calling the verifier backend `/proof/:hash` endpoint. This setup whas made this way because the proof is too big to fit a QR code. Currently this is done on the client by copy pasting the hash, but this should be done a native mobile application that has access to the camera.

The biggest caveat for this project is that the signatures cannot be nullified. This means that there is no way for a user to "spend" or "use only once" his NFT ticket. This is beacuse the signatures implemented by all wallets are not nullifiable. Alternatives like Plume already exists and has PR on all mayor wallets such as metamask, rabbi, etc.. but the wallets haven't accpeted it. Users can generate many entry QRs a single address. This can be solved in the future by having the NFTs to act as whitelist to the real merkle tree. So a secondary merkle tree could be generated where NFTs holders can append only one ticket by hashing a secret note. These tickets could be the entrance but also the ticket for the food or specific activities. Instead of using keccak256 to hash, pedersen or poseidon could be used and so proving time could go to good UX levels, however the problem is that the user would have to keep the note on an inconvinient but safe place such as a local file or local storage.

Additionally to being a fast and cheap chain to hold the NFTs, another good thing about implementing this on Scroll is that if the smart contract automatically generates the merkle root, that could be queried using a L1 RPC through the L2 storage proofs, this with fast zk finality times. This means that, depending on the implementation, the verifer backend would only need an ethereum RPC, not a Scroll one, to verify the zkProofs.
