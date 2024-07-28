const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const ethers = require('ethers');

const contractAddress = '0x9b6B2DA3bcb60d6a5aCe951234470842bC257636';
const contractABI = [
    "function verify(bytes calldata _proof, bytes32[] calldata _publicInputs) view returns (bool)"
];

const providerUrl = 'https://sepolia-rpc.scroll.io';

const provider = new ethers.JsonRpcProvider(providerUrl);
const contract = new ethers.Contract(contractAddress, contractABI, provider);

const app = express();
const port = 8080;

app.use(cors())
app.use(bodyParser.json());

app.post('/verify', async (req, res) => {
    const { proof, publicInputs } = req.body;
    console.log(req.body)
    try {
        const result = await contract.verify(proof, publicInputs);
        res.json({ valid: result });
    } catch (error) {
        res.status(500).json({ error: 'Proof verification failed', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});