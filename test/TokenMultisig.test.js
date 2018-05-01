import assertRevert from './helpers/assertRevert';
import timeTravel from './helpers/timeHelper';
const PumaPayToken = artifacts.require('PumaPayToken');
const MultiSig = artifacts.require('MultiSigWallet');
const truffleAssert = require('truffle-assertions');
const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const MINUTE = 60; // 60 seconds
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const TIME_LOCK_PERIOD = 120 * DAY;
const GAS_PRICE = 100000000000;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ONE_ETHER = web3.toWei(1, 'ether');
const MINTED_TOKENS = 2000;

contract('Token Multisig', async (accounts) => {
    const deployerAccount = accounts[0];
    const superOwner = accounts[1];
    const normalOwner = accounts[2];
    const destinationAccountOne = accounts[3];
    const destinationAccountTwo = accounts[4];
    const ethWallet = accounts[9];

    let token;
    let wallet;

    describe('Deploying', async () => {
        beforeEach('Deploying new PumaPayToken', async () => {
            token = await PumaPayToken.new({
                from: deployerAccount
            });
        });

        beforeEach('Deploying new Token Multisig ', async () => {
            wallet = await MultiSig.new(superOwner, normalOwner, token.address, {
                from: deployerAccount
            });
        });

        it('Token Multisig super owner should be the one used in deployment', async () => {
            const walletSuperOwner = await wallet.superOwner();

            assert.equal(walletSuperOwner.toString(), superOwner);
        });

        it('Token Multisig super owner should be the owner on index 0 and equal to the normal owner used in deployment', async () => {
            const walletSuperOwner = await wallet.owners(0);

            assert.equal(walletSuperOwner.toString(), superOwner);
        });

        it('Token Multisig normal owner should be the owner on index 1 and equal to the normal owner used in deployment', async () => {
            const walletNormalOwner = await wallet.owners(1);

            assert.equal(walletNormalOwner.toString(), normalOwner);
        });

        it('Token Multisig Super and Normal owners should be in the isOwner list', async () => {
            const walletSuperOwner = await wallet.isOwner(superOwner);
            const walletNormalOwner = await wallet.isOwner(normalOwner);

            assert.equal(walletSuperOwner, true);
            assert.equal(walletNormalOwner, true);
        });

        it('Token Multisig token address should be equal with the token address used on deployment', async () => {
            const walletToken = await wallet.token();

            assert.equal(walletToken, token.address);
        });

        it('Token Multisig token address should be equal with the token address used on deployment', async () => {
            const walletToken = await wallet.token();

            assert.equal(walletToken, token.address);
        });

        it('Token Multisig owner count should be equal to 2', async () => {
            const walletOwnerCount = await wallet.ownerCount();

            assert.equal(walletOwnerCount, 2);
        });

        it('Should revert if the super owner address given is a ZERO address', async () => {
            await assertRevert(MultiSig.new(ZERO_ADDRESS, normalOwner, token.address, {
                from: deployerAccount
            }));
        });

        it('Should revert if the normal owner address given is a ZERO address', async () => {
            await assertRevert(MultiSig.new(superOwner, ZERO_ADDRESS, token.address, {
                from: deployerAccount
            }));
        });

        it('Should revert if the token address is a ZERO address owners is not 2', async () => {
            await assertRevert(MultiSig.new(superOwner, normalOwner, ZERO_ADDRESS, {
                from: deployerAccount
            }));
        });
    });

    describe('Submit Transaction', async () => {
        beforeEach('Deploying new PumaPayToken', async () => {
            token = await PumaPayToken.new({
                from: deployerAccount
            });
        });

        beforeEach('Deploying new Token Multisig', async () => {
            wallet = await MultiSig.new(superOwner, normalOwner, token.address, {
                from: deployerAccount
            });
        });

        it('should add the new transaction into the list of transactions', async () => {
            await wallet.submitTransaction(destinationAccountOne, 1 * ONE_ETHER, {
                from: superOwner
            });
            const walletTransaction = await wallet.transactions(0);
            const expectedTransaction = {
                destination: destinationAccountOne,
                value: 1 * ONE_ETHER,
                executed: false
            };

            assert.equal(walletTransaction[0], expectedTransaction.destination);
            walletTransaction[1].should.be.bignumber.equal(1 * ONE_ETHER);
            assert.equal(walletTransaction[2], expectedTransaction.executed);
        });

        it('should add the new transaction into the list of transactions and increase the transaction ID', async () => {
            await wallet.submitTransaction(destinationAccountOne, 2 * ONE_ETHER, {
                from: superOwner
            });

            await wallet.submitTransaction(destinationAccountTwo, 1 * ONE_ETHER, {
                from: normalOwner
            });

            const walletTransaction = await wallet.transactions(1);
            const expectedTransaction = {
                destination: destinationAccountTwo,
                value: 1 * ONE_ETHER,
                executed: false
            };

            assert.equal(walletTransaction[0], expectedTransaction.destination);
            walletTransaction[1].should.be.bignumber.equal(1 * ONE_ETHER);
            assert.equal(walletTransaction[2], expectedTransaction.executed);
        });

        it('should confirm the submitted transaction from the onwer submitted it', async () => {
            await wallet.submitTransaction(destinationAccountOne, 2 * ONE_ETHER, {
                from: superOwner
            });

            const confirmedTransactionForExecutingOwner = await wallet.confirmations(0, superOwner);
            const confrimedTransactionForOtherOwner = await wallet.confirmations(0, normalOwner);

            assert.equal(confirmedTransactionForExecutingOwner, true);
            assert.equal(confrimedTransactionForOtherOwner, false);
        });

        it('should not execute the transaction when both owners submit the same transaction', async () => {
            await wallet.submitTransaction(destinationAccountOne, 2 * ONE_ETHER, {
                from: superOwner
            });

            await wallet.submitTransaction(destinationAccountOne, 2 * ONE_ETHER, {
                from: normalOwner
            });

            const claimedTokens = await token.balanceOf(destinationAccountOne);
            claimedTokens.should.be.bignumber.equal(0);
        });

        it('Should revert if the destination address given is a ZERO address', async () => {
            await assertRevert(wallet.submitTransaction(ZERO_ADDRESS, 1 * ONE_ETHER, {
                from: superOwner
            }));
        });

        it('Should revert if account executing the transaction is not one of the two onwers', async () => {
            await assertRevert(wallet.submitTransaction(destinationAccountTwo, 1 * ONE_ETHER, {
                from: deployerAccount
            }));
        });
    });

    describe('claimAllTokensAfterTimeLock', async () => {
        beforeEach('Deploying new PumaPayToken', async () => {
            token = await PumaPayToken.new({
                from: deployerAccount
            });
        });

        beforeEach('Deploying new Token Multisig', async () => {
            wallet = await MultiSig.new(superOwner, normalOwner, token.address, {
                from: deployerAccount
            });
        });

        beforeEach('Issue tokens to the Token Multisig', async () => {
            const tokens = MINTED_TOKENS * ONE_ETHER;
            await token.mint(wallet.address, tokens, {
                from: deployerAccount
            });

            await token.finishMinting({
                from: deployerAccount
            });
        });

        it('Wallet should transfer all the tokens to an eth Wallet after 120 days', async () => {
            await timeTravel(TIME_LOCK_PERIOD + 1);
            const tokens = MINTED_TOKENS * ONE_ETHER;
            await wallet.claimAllTokensAfterTimeLock(ethWallet, {
                from: superOwner
            });

            const tokenClaimed = await token.balanceOf(ethWallet);

            tokenClaimed.should.be.bignumber.equal(tokens);
        });

        it('Should revert if the super owner try to claim all the tokens before 120 days', async () => {
            await timeTravel(TIME_LOCK_PERIOD - 1);
            const tokens = MINTED_TOKENS * ONE_ETHER;
            await assertRevert(wallet.claimAllTokensAfterTimeLock(ethWallet, {
                from: superOwner
            }));
        });

        // it('Should revert if the super owner try to claim all the tokens before 120 days', async () => {
        //     await timeTravel(TIME_LOCK_PERIOD - 1);
        //     const tokens = MINTED_TOKENS * ONE_ETHER;
        //     await assertRevert(wallet.claimAllTokensAfterTimeLock(ethWallet, {
        //         from: superOwner
        //     }));
        // });
    });
});