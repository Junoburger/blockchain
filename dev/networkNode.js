const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const port = process.argv[2];
const Blockchain = require('./blockchain');
const uuid = require('uuid/v1');
const realcoin = new Blockchain();
const rp = require('request-promise');

const nodeAddress = uuid().split('-').join('');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

// fetch entire blockchain
app.get('/blockchain', function (req, res) {
    res.send(realcoin);
});

// create a new transaction 
app.post('/transaction', function (req, res) {
    const blockIndex = realcoin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient);
    res.json({
        note: `Transaction will be added in block ${blockIndex}.`
    })
});

//mine a new block 
app.get('/mine', function (req, res) {
    const lastBlock = realcoin.getLastBlock();
    const previousBlockHash = lastBlock['hash'];
    const currentBlockData = {
        transactions: realcoin.pendingTransactions,
        index: lastBlock['index'] + 1
    };
    const nonce = realcoin.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = realcoin.hashBlock(previousBlockHash, currentBlockData, nonce);

    realcoin.createNewTransaction(4.2, "101", nodeAddress);

    const newBlock = realcoin.createNewBlock(nonce, previousBlockHash, blockHash);

    res.json({
        note: "New block mined succesfully",
        block: newBlock
    });

});

// register a node and broadcast it to the network
app.post('/register-and-broadcast-node', function (req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    if (realcoin.networkNodes.indexOf(newNodeUrl) == -1) realcoin.networkNodes.push(newNodeUrl);

    const regNodesPromises = [];
    realcoin.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/register-node',
            method: 'POST',
            body: {
                newNodeUrl: newNodeUrl
            },
            json: true
        };
        regNodesPromises.push(rp(requestOptions));
    });
    Promise.all(regNodesPromises)
        .then(data => {
            const bulkRegisterOptions = {
                uri: newNodeUrl + '/register-nodes-bulk',
                method: 'POST',
                body: {
                    allNetworkNodes: [...realcoin.networkNodes, realcoin.currentNodeUrl],
                    json: true
                }
            };
            return rp(bulkRegisterOptions)
        })
        .then(data => {
            res.json({
                note: 'Network: New Node Registered Succesfully.'
            })
        });
});
//register a node with the network
app.post('/register-node', function (req, res) {
    const newNodeUrl = req.body.newNodeUrl;
    const nodeNotAlreadyPresent = realcoin.networkNodes.indexOf(newNodeUrl) == -1;
    const notCurrentNode = realcoin.currentNodeUrl !== newNodeUrl;
    if (nodeNotAlreadyPresent && notCurrentNode) realcoin.networkNodes.push(newNodeUrl);
    res.json({
        note: 'Network: New Node Registered Succesfully'
    });
});
// register multiple nodes at once
app.post('/register-nodes-bulk', function (req, res) {

});

app.listen(port, () => {
    console.log(`listening on port ${port}`);
});