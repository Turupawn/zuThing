import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import { Noir } from '@noir-lang/noir_js';
import circuit from '../circuit/target/circuit.json';


const NETWORK_ID = "534351";
const METADA_API_URL = "http://localhost:8080"

const NFT_ADDRESS = "0x67fB78F2252884DBf8489E3cc96cDEEbFD052E85";
const NFT_ABI_PATH = "../json_abi/NFTAbi.json"
var nftContract

var accounts
var web3

function metamaskReloadCallback() {
  window.ethereum.on('accountsChanged', (accounts) => {
    document.getElementById("web3_message").textContent="Se cambió el account, refrescando...";
    window.location.reload()
  })
  window.ethereum.on('networkChanged', (accounts) => {
    document.getElementById("web3_message").textContent="Se el network, refrescando...";
    window.location.reload()
  })
}

const getWeb3 = async () => {
  return new Promise((resolve, reject) => {
    if(document.readyState=="complete")
    {
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum)
        window.location.reload()
        resolve(web3)
      } else {
        reject("must install MetaMask")
        document.getElementById("web3_message").textContent="Error: Please connect to Metamask";
      }
    }else
    {
      window.addEventListener("load", async () => {
        if (window.ethereum) {
          const web3 = new Web3(window.ethereum)
          resolve(web3)
        } else {
          reject("must install MetaMask")
          document.getElementById("web3_message").textContent="Error: Please install Metamask";
        }
      });
    }
  });
};

const getContract = async (web3, address, abi_path) => {
  const response = await fetch(abi_path);
  const data = await response.json();
  
  const netId = await web3.eth.net.getId();
  var contract = new web3.eth.Contract(
    data,
    address
    );
  return contract
}

async function loadDapp() {
  metamaskReloadCallback()
  document.getElementById("web3_message").textContent="Please connect to Metamask"
  var awaitWeb3 = async function () {
    web3 = await getWeb3()
    web3.eth.net.getId((err, netId) => {
      if (netId == NETWORK_ID) {
        var awaitContract = async function () {
          nftContract = await getContract(web3, NFT_ADDRESS, NFT_ABI_PATH)
          document.getElementById("web3_message").textContent="You are connected to Metamask"
          onContractInitCallback()
          web3.eth.getAccounts(function(err, _accounts){
            accounts = _accounts
            if (err != null)
            {
              console.error("An error occurred: "+err)
            } else if (accounts.length > 0)
            {
              onWalletConnectedCallback()
              document.getElementById("account_address").style.display = "block"
            } else
            {
              document.getElementById("connect_button").style.display = "block"
            }
          });
        };
        awaitContract();
      } else {
        document.getElementById("web3_message").textContent="Please connect to Scroll Sepolia";
      }
    });
  };
  awaitWeb3();
}

async function connectWallet() {
  await window.ethereum.request({ method: "eth_requestAccounts" })
  accounts = await web3.eth.getAccounts()
  onWalletConnectedCallback()
}
window.connectWallet=connectWallet;

const onContractInitCallback = async () => {
}

const onWalletConnectedCallback = async () => {
  var userBalance = await nftContract.methods.balanceOf(accounts[0]).call()
  if(userBalance > 0)
  {
    document.getElementById("web3_message").textContent="You are an NFT holder, you can produce a proof ✅";
  }else
  {
    document.getElementById("web3_message").textContent="You are not an NFT holder, you can't produce a proof ❌";
  }
}

document.addEventListener('DOMContentLoaded', async () => {
    loadDapp()
});

function splitIntoPairs(str) {
  return str.match(/.{1,2}/g) || [];
}

const sendProof = async (comment) => {
  document.getElementById("web3_message").textContent="Please sign the message ✍️";

  const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
  await provider.send("eth_requestAccounts", []);
  const signer = provider.getSigner();
  const signerAddress = await signer.getAddress();

  const signature = await signer.signMessage(comment);
  var hashedMessage = ethers.utils.hashMessage(comment)
  var publicKey = ethers.utils.recoverPublicKey(
    hashedMessage,
    signature)

  publicKey = publicKey.substring(4)

  let pub_key_x = publicKey.substring(0, 64);
  let pub_key_y = publicKey.substring(64);
  
  var sSignature = Array.from(ethers.utils.arrayify(signature))
  sSignature.pop()
  
  const backend = new BarretenbergBackend(circuit);
  const noir = new Noir(circuit, backend);

  // Todo: Query merkle-path-generator API by quering signerAddress
  index = 0;
  hashPath = ["0xbef34f2FCAe62dC3404c3d01AF65a7784c9c4A19","0x065ef492771e3d5033fa8243b218244c1465be8255baef07fcf482e26d445e7c"];
  //{"root":"0x2140a6c88945958cd354cba916b9b73eaa7263d21d9c862cc4604f6db892e70f","path":["0xbef34f2FCAe62dC3404c3d01AF65a7784c9c4A19","0x065ef492771e3d5033fa8243b218244c1465be8255baef07fcf482e26d445e7c"],"index":0}

  console.log(index)
  console.log(hashPath)
  
  const input = {
    hash_path: hashPath,
    index: index,
    root: "0x2140a6c88945958cd354cba916b9b73eaa7263d21d9c862cc4604f6db892e70f",
    pub_key_x: Array.from(ethers.utils.arrayify("0x"+pub_key_x)),
    pub_key_y: Array.from(ethers.utils.arrayify("0x"+pub_key_y)),
    signature: sSignature,
    hashed_message: Array.from(ethers.utils.arrayify(hashedMessage))
  };

  document.getElementById("web3_message").textContent="Generating proof... ⌛";
  var proof = await noir.generateFinalProof(input);
  document.getElementById("web3_message").textContent="Generating proof... ✅";
  
  
  let tproof = "0x" + ethereumjs.Buffer.Buffer.from(proof.proof).toString('hex')
  const tpublicInputs = [];
  for (const [key, value] of proof.publicInputs) {
    tpublicInputs.push(value);
  }
  
  document.getElementById("web3_message").textContent="Sending proof to backend... ⌛";
  let proofResult = await verifyProof(tproof, tpublicInputs);
  if(proofResult.valid)
  {
    document.getElementById("web3_message").textContent="Proof result:... ✅";
  }
  else
  {
    document.getElementById("web3_message").textContent="Proof result:... ❌";
  }
}


const verifyProof = async (proof, publicInputs) => {
  try {
    const response = await fetch(`${METADA_API_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ proof, publicInputs }),
    });

    const result = await response.json();
    console.log(result);
  } catch (error) {
    console.error('Error:', error);
  }
}

window.sendProof=sendProof;