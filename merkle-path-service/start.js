const express = require('express');
const bodyParser = require('body-parser');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
const port = process.env.PORT || 3000;
const NFT_ADDRESS = process.env.NFT_ADDRESS;

app.use(cors());
app.use(bodyParser.json());

const addressesPath = path.join(__dirname, 'addresses.json');
const merklePathsDir = path.join(__dirname, 'merkle_paths');

if (!fs.existsSync(merklePathsDir)) {
    fs.mkdirSync(merklePathsDir);
}

// Define the ABI directly in the code
const NFT_ABI = [
    "function totalSupply() view returns (uint256)",
    "function tokenByIndex(uint256 index) view returns (uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)"
];

// Set up ethers provider
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

function runNargoProve(left, right) {
    const proverTomlContent = `
index = "0"
left_leaf = "${left}"
right_path = ["${right}"]
`;
    fs.writeFileSync('Prover.toml', proverTomlContent.trim());

    const output = execSync('nargo prove', { encoding: 'utf8' });
    const lines = output.trim().split('\n');
    return lines[lines.length - 1].trim();
}

function getMerklePath(addresses, targetAddress) {
    let tree = [addresses];
    let index = addresses.indexOf(targetAddress);

    if (index === -1) {
        throw new Error('Address not found');
    }

    let path = [];

    while (tree[tree.length - 1].length > 1) {
        const currentLevel = tree[tree.length - 1];
        let nextLevel = [];

        for (let i = 0; i < currentLevel.length; i += 2) {
            const left = currentLevel[i];
            const right = currentLevel[i + 1] || left;
            const hash = runNargoProve(left, right);
            nextLevel.push(hash);

            if (i === index || i + 1 === index) {
                path.push(i === index ? right : left);
                index = Math.floor(i / 2);
            }
        }

        tree.push(nextLevel);
    }

    return {
        root: tree[tree.length - 1][0],
        path,
        index: addresses.indexOf(targetAddress)
    };
}

app.post('/generate', (req, res) => {
    let root;
    addresses.forEach((address) => {
        let merklePath;
        try {
            merklePath = getMerklePath(addresses, address);
        } catch (error) {
            console.error(`Error generating Merkle path for ${address}: ${error.message}`);
            return;
        }

        if (!root) {
            root = merklePath.root;
        }

        const merklePathFilePath = path.join(merklePathsDir, `${address}.json`);
        const data = {
            path: merklePath.path,
            index: merklePath.index
        };
        fs.writeFileSync(merklePathFilePath, JSON.stringify(data, null, 2));
    });

    if (root) {
        const rootFilePath = path.join(merklePathsDir, 'root.json');
        fs.writeFileSync(rootFilePath, JSON.stringify({ root }, null, 2));
    }

    res.send('Merkle paths and root generated successfully.');
});

app.get('/merkle-path/:address', (req, res) => {
    const address = req.params.address;

    if (!addresses.includes(address)) {
        return res.status(404).send('Address not found');
    }

    const merklePathFilePath = path.join(merklePathsDir, `${address}.json`);
    const rootFilePath = path.join(merklePathsDir, 'root.json');

    if (!fs.existsSync(merklePathFilePath)) {
        return res.status(404).send('Merkle path not found');
    }

    if (!fs.existsSync(rootFilePath)) {
        return res.status(500).send('Merkle root not found');
    }

    const merklePathData = JSON.parse(fs.readFileSync(merklePathFilePath, 'utf8'));
    const root = JSON.parse(fs.readFileSync(rootFilePath, 'utf8')).root;

    res.send({
        root,
        path: merklePathData.path,
        index: merklePathData.index
    });
});

// New endpoint to fetch NFT holders
app.post('/fetch-nft-holders', async (req, res) => {
    if (!NFT_ADDRESS) {
        return res.status(500).send('NFT contract address is not set');
    }

    try {
        const contract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, provider);

        // Fetch total supply
        const totalSupply = Number(await contract.totalSupply());
        const holders = [];

        for (let i = 0; i < totalSupply; i++) {
            const tokenId = await contract.tokenByIndex(i);
            const owner = await contract.ownerOf(tokenId);

            if (!holders.includes(owner)) {
                holders.push(owner);
            }
        }

        fs.writeFileSync(addressesPath, JSON.stringify(holders, null, 2));
        res.send('NFT holders fetched and saved successfully.');
    } catch (error) {
        console.error('Error fetching NFT holders:', error.message);
        res.status(500).send('Error fetching NFT holders');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
