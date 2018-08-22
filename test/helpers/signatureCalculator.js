import EthCrypto from 'eth-crypto';
const Web3 = require('web3');
const web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://localhost:7545'));

// This process happens on wallet side
const calcSignedMessage = async (message, privateKey) => {
    // create message keccak256 hash 
    const messageHash = EthCrypto.hash.keccak256(message);
    // sign the message with the private key
    const signedMessage = EthCrypto.sign(
        privateKey, messageHash
    );

    return signedMessage;
};

const calcSignedMessageForRegistration = async (pullPayment, privateKey) => {
    const messageHash = web3.utils.soliditySha3(
    {
        type: 'address',
        value: pullPayment.beneficiary
    }, {
        type: 'string',
        value: pullPayment.currency
    }, {
        type: 'uint256',
        value: pullPayment.initialPaymentAmountInCents
    }, {
        type: 'uint256',
        value: pullPayment.fiatAmountInCents
    }, {
        type: 'uint256',
        value: pullPayment.frequency
    }, {
        type: 'uint256',
        value: pullPayment.numberOfPayments
    }, {
        type: 'uint256',
        value: pullPayment.startTimestamp
    });

    const signedMessage = EthCrypto.sign(
        privateKey, messageHash
    );

    return signedMessage;
}

const calcSignedMessageForDeletion = async (paymentID, beneficiary, privateKey) => {
    const messageHash = web3.utils.soliditySha3({
        type: 'string',
        value: paymentID
    }, {
        type: 'address',
        value: beneficiary
    });

    const signedMessage = EthCrypto.sign(
        privateKey, messageHash
    );

    return signedMessage;
}

// Retrieveng the VRS from the signature - happens on the server side
const getVRS = async (singature) => {
    const sig = singature.slice(2);
    const r = `0x${sig.slice(0, 64)}`;
    const s = `0x${sig.slice(64, 128)}`;
    const v = await web3.utils.toDecimal(sig.slice(128, 130));

    return {
        v,
        r,
        s
    }
};

module.exports = {
    calcSignedMessageForRegistration,
    calcSignedMessageForDeletion,
    getVRS
};