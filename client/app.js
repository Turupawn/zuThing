import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { Noir } from '@noir-lang/noir_js';
import circuit from '../circuit/target/circuit.json';
import QRCode from 'qrcode';

const NETWORK_ID = "534351";
const MERKLE_PATH_SERVICE_API_URL = "http://localhost:8888";
const VERIFIER_API_URL = "http://localhost:8080";

const NFT_ADDRESS = "0x67fB78F2252884DBf8489E3cc96cDEEbFD052E85";
const NFT_ABI_PATH = "../json_abi/NFTAbi.json";
let nftContract;

let accounts;
let web3;

function metamaskReloadCallback() {
    window.ethereum.on('accountsChanged', (accounts) => {
        document.getElementById("web3_message").textContent = "Se cambió el account, refrescando...";
        window.location.reload();
    });
    window.ethereum.on('networkChanged', (accounts) => {
        document.getElementById("web3_message").textContent = "Se el network, refrescando...";
        window.location.reload();
    });
}

const getWeb3 = async () => {
    return new Promise((resolve, reject) => {
        if (document.readyState == "complete") {
            if (window.ethereum) {
                const web3 = new Web3(window.ethereum);
                resolve(web3);
            } else {
                reject("must install MetaMask");
                document.getElementById("web3_message").textContent = "Error: Please connect to Metamask";
            }
        } else {
            window.addEventListener("load", async () => {
                if (window.ethereum) {
                    const web3 = new Web3(window.ethereum);
                    resolve(web3);
                } else {
                    reject("must install MetaMask");
                    document.getElementById("web3_message").textContent = "Error: Please install Metamask";
                }
            });
        }
    });
};

const getContract = async (web3, address, abi_path) => {
    const response = await fetch(abi_path);
    const data = await response.json();
    
    const netId = await web3.eth.net.getId();
    return new web3.eth.Contract(data, address);
};

async function loadDapp() {
    metamaskReloadCallback();
    document.getElementById("web3_message").textContent = "Please connect to Metamask";
    const web3Instance = await getWeb3();
    web3 = web3Instance;
    web3.eth.net.getId((err, netId) => {
        if (netId == NETWORK_ID) {
            getContract(web3, NFT_ADDRESS, NFT_ABI_PATH).then(contract => {
                nftContract = contract;
                document.getElementById("web3_message").textContent = "You are connected to Metamask";
                onContractInitCallback();
                web3.eth.getAccounts((err, _accounts) => {
                    accounts = _accounts;
                    if (err != null) {
                        console.error("An error occurred: " + err);
                    } else if (accounts.length > 0) {
                        onWalletConnectedCallback();
                        document.getElementById("account_address").style.display = "block";
                    } else {
                        document.getElementById("connect_button").style.display = "block";
                    }
                });
            });
        } else {
            document.getElementById("web3_message").textContent = "Please connect to Scroll Sepolia";
        }
    });
}

async function connectWallet() {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    accounts = await web3.eth.getAccounts();
    onWalletConnectedCallback();
}
window.connectWallet = connectWallet;

const onContractInitCallback = async () => { /* Callback logic here */ };

const onWalletConnectedCallback = async () => {
    const userBalance = await nftContract.methods.balanceOf(accounts[0]).call();
    if (userBalance > 0) {
        document.getElementById("web3_message").textContent = "You are an NFT holder, you can produce a proof ✅";
    } else {
        document.getElementById("web3_message").textContent = "You are not an NFT holder, you can't produce a proof ❌";
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    loadDapp();
});

const sendProof = async () => {
    let message = "Generate zuThing ticket";
    document.getElementById("web3_message").textContent = "Please sign the message ✍️";

    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const signerAddress = await signer.getAddress();

    const signature = await signer.signMessage(message);
    const hashedMessage = ethers.utils.hashMessage(message);
    let publicKey = ethers.utils.recoverPublicKey(hashedMessage, signature);
    publicKey = publicKey.substring(4);

    let pub_key_x = publicKey.substring(0, 64);
    let pub_key_y = publicKey.substring(64);
    
    const sSignature = Array.from(ethers.utils.arrayify(signature));
    sSignature.pop();
    
    const backend = new BarretenbergBackend(circuit);
    const noir = new Noir(circuit, backend);

    let merklePathServiceData = await getMerklePath(accounts[0]);

    const input = {
        hash_path: merklePathServiceData.path,
        index: merklePathServiceData.index,
        root: merklePathServiceData.root,
        pub_key_x: Array.from(ethers.utils.arrayify("0x" + pub_key_x)),
        pub_key_y: Array.from(ethers.utils.arrayify("0x" + pub_key_y)),
        signature: sSignature,
        hashed_message: Array.from(ethers.utils.arrayify(hashedMessage))
    };

    document.getElementById("web3_message").textContent = "Generating proof... ⌛";
    const proof = await noir.generateFinalProof(input);
    document.getElementById("web3_message").textContent = "Generating proof... ✅";

    let tproof = "0x" + ethereumjs.Buffer.Buffer.from(proof.proof).toString('hex');
    const tpublicInputs = [];
    for (const [key, value] of proof.publicInputs) {
        tpublicInputs.push(value);
    }
    
    document.getElementById("web3_message").textContent = "Sending proof to backend... ⌛";
    const proofResult = await verifyProof(tproof, tpublicInputs);
    
    if (proofResult.valid) {
        document.getElementById("web3_message").textContent = "Valid proof ✅ Your hash is: " + proofResult.hash;

        const qrCodeContainer = document.getElementById("hashQr");
        qrCodeContainer.innerHTML = "";
        QRCode.toCanvas(qrCodeContainer, proofResult.hash, { width: 200 }, function (error) {
            if (error) console.error(error);
            console.log('QR code generated!');
        });
    } else {
        document.getElementById("web3_message").textContent = "Invalid proof ❌";
    }
};

const verifyProof = async (proof, publicInputs) => {
    try {
        const response = await fetch(`${VERIFIER_API_URL}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ proof, publicInputs }),
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error:', error);
        return { error: error.message };
    }
};

const checkProofHash = async (hash) => {
    try {
        const response = await fetch(`${VERIFIER_API_URL}/proof/${hash}`);
        const result = await response.json();
        if (result.exists) {
            document.getElementById("web3_message").textContent = "Proof hash exists in the database ✅";
        } else {
            document.getElementById("web3_message").textContent = "Proof hash does not exist in the database ❌";
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById("web3_message").textContent = "Error checking proof hash";
    }
};

const getMerklePath = async (address) => {
  try {
      document.getElementById("web3_message").textContent = "Retrieving Merkle path... ⌛";
      const response = await fetch(`${MERKLE_PATH_SERVICE_API_URL}/merkle-path/${address}`);
      
      if (!response.ok) {
          throw new Error('Address not found or error retrieving path');
      }

      const result = await response.json();
      return result;
      // Process result as needed
  } catch (error) {
      console.error('Error:', error);
      document.getElementById("web3_message").textContent = "Error retrieving Merkle path";
  }
};

window.checkProofHash = checkProofHash;
window.sendProof = sendProof;