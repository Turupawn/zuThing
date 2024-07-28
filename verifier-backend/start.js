const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const ethers = require('ethers');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const port = process.env.PORT;
const contractAddress = process.env.ULTRAPLONK_VERIFIER;
const providerUrl = process.env.RPC_URL;
const contractABI = [
    "function verify(bytes calldata _proof, bytes32[] calldata _publicInputs) view returns (bool)"
];

const db = new sqlite3.Database('proofs.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        db.run('CREATE TABLE IF NOT EXISTS proofs (hash TEXT PRIMARY KEY, proof TEXT)', (err) => {
            if (err) {
                console.error('Error creating table:', err.message);
            }
        });
    }
});

const provider = new ethers.JsonRpcProvider(providerUrl);
const contract = new ethers.Contract(contractAddress, contractABI, provider);

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Helper function to hash proof
const hashProof = (proof) => {
    return crypto.createHash('sha256').update(proof).digest('hex');
};

// Verify proof and store it if valid
app.post('/verify', async (req, res) => {
    const { proof, publicInputs } = req.body;
    console.log(req.body);
    try {
        const isValid = await contract.verify(proof, publicInputs);
        if (isValid) {
            const proofHash = hashProof(proof);
            db.run('INSERT OR REPLACE INTO proofs (hash, proof) VALUES (?, ?)', [proofHash, proof], (err) => {
                if (err) {
                    console.error('Error inserting proof:', err.message);
                }
            });
            res.json({ valid: isValid, hash: proofHash });
        } else {
            res.json({ valid: isValid });
        }
    } catch (error) {
        res.status(500).json({ error: 'Proof verification failed', details: error.message });
    }
});

// Check if proof hash exists
app.get('/proof/:hash', (req, res) => {
    const { hash } = req.params;
    db.get('SELECT 1 FROM proofs WHERE hash = ?', [hash], (err, row) => {
        if (err) {
            res.status(500).json({ error: 'Database query failed', details: err.message });
        } else if (row) {
            res.json({ exists: true });
        } else {
            res.json({ exists: false });
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});