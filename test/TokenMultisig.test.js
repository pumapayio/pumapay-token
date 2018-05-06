import assertRevert from './helpers/assertRevert';
import assertJump from './helpers/assertJump';
import timeTravel from './helpers/timeHelper';
const PumaPayToken = artifacts.require('PumaPayToken');
const TokenMultiSigWallet = artifacts.require('TokenMultiSigWallet');
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
            wallet = await TokenMultiSigWallet.new(superOwner, normalOwner, token.address, {
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

        it('Token Multisig transactionCount count should be equal to 1', async () => {
            const walletTransactionCount = await wallet.transactionCount();

            assert.equal(walletTransactionCount, 1);
        });

        it('Should revert if the super owner address given is a ZERO address', async () => {
            await assertRevert(TokenMultiSigWallet.new(ZERO_ADDRESS, normalOwner, token.address, {
                from: deployerAccount
            }));
        });

        it('Should revert if the normal owner address given is a ZERO address', async () => {
            await assertRevert(TokenMultiSigWallet.new(superOwner, ZERO_ADDRESS, token.address, {
                from: deployerAccount
            }));
        });

        it('Should revert if the same address is used for both super owner and normal onwer', async () => {
            await assertRevert(TokenMultiSigWallet.new(superOwner, superOwner, token.address, {
                from: deployerAccount
            }));
        });

        it('Should revert if the token address is a ZERO address owners is not 2', async () => {
            await assertRevert(TokenMultiSigWallet.new(superOwner, normalOwner, ZERO_ADDRESS, {
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
            wallet = await TokenMultiSigWallet.new(superOwner, normalOwner, token.address, {
                from: deployerAccount
            });
        });

        beforeEach('Issue tokens to the Token Multisig', async () => {
            const tokens = ONE_ETHER;
            await token.mint(wallet.address, tokens, {
                from: deployerAccount
            });

            await token.finishMinting({
                from: deployerAccount
            });
        });

        it('should add the new transaction into the list of transactions', async () => {
            await wallet.submitTransaction(destinationAccountOne, ONE_ETHER, {
                from: superOwner
            });
            const walletTransaction = await wallet.transactions(1);
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
            await wallet.submitTransaction(destinationAccountOne, ONE_ETHER, {
                from: superOwner
            });

            await wallet.submitTransaction(destinationAccountTwo, ONE_ETHER, {
                from: normalOwner
            });

            const walletTransaction = await wallet.transactions(2);
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
            await wallet.submitTransaction(destinationAccountOne, ONE_ETHER, {
                from: superOwner
            });

            const confirmedTransactionForExecutingOwner = await wallet.confirmations(1, superOwner);
            const confrimedTransactionForOtherOwner = await wallet.confirmations(1, normalOwner);

            assert.equal(confirmedTransactionForExecutingOwner, true);
            assert.equal(confrimedTransactionForOtherOwner, false);
        });

        it('should not execute the transaction when both owners submit the same transaction', async () => {
            await wallet.submitTransaction(destinationAccountOne, ONE_ETHER, {
                from: superOwner
            });

            await wallet.submitTransaction(destinationAccountOne, ONE_ETHER, {
                from: normalOwner
            });

            const claimedTokens = await token.balanceOf(destinationAccountOne);
            claimedTokens.should.be.bignumber.equal(0);
        });

        it('Should revert if the destination address given is a ZERO address', async () => {
            await assertRevert(wallet.submitTransaction(ZERO_ADDRESS, ONE_ETHER, {
                from: superOwner
            }));
        });

        it('Should revert if account executing the transaction is not one of the two onwers', async () => {
            await assertRevert(wallet.submitTransaction(destinationAccountTwo, ONE_ETHER, {
                from: deployerAccount
            }));
        });

        it('Should revert if the amount submitted is higher than the amount held by the wallet', async () => {
            await assertRevert(wallet.submitTransaction(destinationAccountTwo, 1 + ONE_ETHER, {
                from: superOwner
            }));
        });

        it('Should revert if the amount submitted is higher than the amount held by the wallet after a confimration/execution', async () => {
            await wallet.submitTransaction(destinationAccountOne, ONE_ETHER, {
                from: superOwner
            });

            await wallet.confirmTransaction(1, {
                from: normalOwner
            });

            await assertRevert(wallet.submitTransaction(destinationAccountTwo, 1, {
                from: superOwner
            }));
        });

        it('should emit a submission event', async () => {
            const submission = await wallet.submitTransaction(destinationAccountOne, ONE_ETHER, {
                from: normalOwner
            });
            const logs = submission.logs;
            assert.equal(logs.length, 2);
            assert.equal(logs[0].event, 'Submission');
            logs[0].args.transactionId.should.be.bignumber.equal(1);
        });

        it('should emit a confirmation event', async () => {
            const submission = await wallet.submitTransaction(destinationAccountOne, ONE_ETHER, {
                from: normalOwner
            });
            const logs = submission.logs;
            assert.equal(logs.length, 2);
            assert.equal(logs[1].event, 'Confirmation');
            logs[1].args.transactionId.should.be.bignumber.equal(1);
            logs[1].args.sender.should.be.equal(normalOwner);
        });
    });

    describe('Confirm Transaction', async () => {
        beforeEach('Deploying new PumaPayToken', async () => {
            token = await PumaPayToken.new({
                from: deployerAccount
            });
        });

        beforeEach('Deploying new Token Multisig', async () => {
            wallet = await TokenMultiSigWallet.new(superOwner, normalOwner, token.address, {
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

        beforeEach('Submit Transaction for confirmation', async () => {
            await wallet.submitTransaction(destinationAccountOne, 2 * ONE_ETHER, {
                from: normalOwner
            });
        });

        it('should transfer the tokens to the destination address when the super owner confirms a transaction submitted by the normal owner', async () => {
            await wallet.confirmTransaction(1, {
                from: superOwner
            });

            const tokenTransfered = await token.balanceOf(destinationAccountOne);

            tokenTransfered.should.be.bignumber.equal(2 * ONE_ETHER);
        });

        it('should transfer the tokens to the destination address when the normal owner confirms a transaction submitted by the super owner', async () => {
            await wallet.submitTransaction(destinationAccountOne, 4 * ONE_ETHER, {
                from: normalOwner
            });
            await wallet.confirmTransaction(2, {
                from: superOwner
            });

            const tokenTransfered = await token.balanceOf(destinationAccountOne);

            tokenTransfered.should.be.bignumber.equal(4 * ONE_ETHER);
        });

        it('should set the confirmation of the confirmed transaction for both owners to true', async () => {
            await wallet.confirmTransaction(1, {
                from: superOwner
            });
            const confrimedTransactionFromSuperOwner = await wallet.confirmations(1, superOwner);
            const confrimedTransactionFromNormalOwner = await wallet.confirmations(1, superOwner);
            assert.equal(confrimedTransactionFromSuperOwner, true);
            assert.equal(confrimedTransactionFromNormalOwner, true);
        });

        it('should revert when an owner tries to confirm a transaction that was submitted by the same owner', async () => {
            await assertRevert(wallet.confirmTransaction(1, {
                from: normalOwner
            }));
        });

        it('should revert when an owner tries to confirm a confimred transaction', async () => {
            await wallet.confirmTransaction(1, {
                from: superOwner
            });
            await assertRevert(wallet.confirmTransaction(1, {
                from: superOwner
            }));
        });

        it('should revert when an owner tries to confirm a transaction that does not exists', async () => {
            await assertRevert(wallet.confirmTransaction(2, {
                from: superOwner
            }));
        });

        it('should revert when an address which is not owner tries to confirm a submitted transaction', async () => {
            await assertRevert(wallet.confirmTransaction(1, {
                from: deployerAccount
            }));
        });

        it('should revert when trying to confirm a transaction which is higher than than the wallet balance', async () => {
            await wallet.submitTransaction(destinationAccountOne, MINTED_TOKENS * ONE_ETHER, {
                from: normalOwner
            });

            await wallet.confirmTransaction(1, {
                from: superOwner
            });

            await assertRevert(wallet.confirmTransaction(2, {
                from: superOwner
            }));
        });

        it('should emit a confirmation event', async () => {
            const confirmation = await wallet.confirmTransaction(1, {
                from: superOwner
            });

            const logs = confirmation.logs;
            assert.equal(logs.length, 2);
            assert.equal(logs[0].event, 'Confirmation');
            logs[0].args.transactionId.should.be.bignumber.equal(1);
            logs[0].args.sender.should.be.equal(superOwner);
        });

        it('should emit a execution event', async () => {
            const confirmation = await wallet.confirmTransaction(1, {
                from: superOwner
            });

            const logs = confirmation.logs;
            assert.equal(logs.length, 2);
            assert.equal(logs[1].event, 'Execution');
            logs[1].args.transactionId.should.be.bignumber.equal(1);
        });
    });

    describe('Revoke Confirmation', () => {
        beforeEach('Deploying new PumaPayToken', async () => {
            token = await PumaPayToken.new({
                from: deployerAccount
            });
        });

        beforeEach('Deploying new Token Multisig', async () => {
            wallet = await TokenMultiSigWallet.new(superOwner, normalOwner, token.address, {
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

        beforeEach('Submit Transaction for confirmation', async () => {
            await wallet.submitTransaction(destinationAccountOne, 2 * ONE_ETHER, {
                from: superOwner
            });
        });

        it('should allow the owner submitted the transaction to revoke their confirmation', async () => {
            await wallet.revokeConfirmation(1, {
                from: superOwner
            });
            const walletConfirmationForOwner = await wallet.confirmations(1, superOwner);
            assert.equal(walletConfirmationForOwner, false);
        });

        it('should revert when the transaction has been confirmed by both owners, i.e. executed', async () => {
            await wallet.confirmTransaction(1, {
                from: normalOwner
            });

            await assertRevert(wallet.revokeConfirmation(1, {
                from: superOwner
            }));
        });

        it('should revert when the a non owner tries to revoke a confirmed transaction', async () => {
            await assertRevert(wallet.revokeConfirmation(1, {
                from: deployerAccount
            }));
        });

        it('should revert when an onwer tries to revoke a non-confirmed transaction by them', async () => {
            await assertRevert(wallet.revokeConfirmation(1, {
                from: normalOwner
            }));
        });

        it('should emit a revocation event', async () => {
            const revocation = await wallet.revokeConfirmation(1, {
                from: superOwner
            });

            const logs = revocation.logs;
            console.log(logs);
            assert.equal(logs.length, 1);
            assert.equal(logs[0].event, 'Revocation');
            logs[0].args.transactionId.should.be.bignumber.equal(1);
            logs[0].args.sender.should.be.equal(superOwner);
        });
    });

    describe('Is Confirmed', async () => {
        beforeEach('Deploying new PumaPayToken', async () => {
            token = await PumaPayToken.new({
                from: deployerAccount
            });
        });

        beforeEach('Deploying new Token Multisig', async () => {
            wallet = await TokenMultiSigWallet.new(superOwner, normalOwner, token.address, {
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

        beforeEach('Submit Transaction for confirmation', async () => {
            await wallet.submitTransaction(destinationAccountOne, 2 * ONE_ETHER, {
                from: superOwner
            });
        });

        it('should return true when the transaction has been confirmed by both owners', async () => {
            await wallet.confirmTransaction(1, {
                from: normalOwner
            });
            const isTransactionConfirmed = await wallet.isConfirmed(1);
            assert.equal(isTransactionConfirmed, true);
        });

        it('should return false when the transaction has been confirmed only by one owner', async () => {
            const isTransactionConfirmed = await wallet.isConfirmed(1);
            assert.equal(isTransactionConfirmed, false);
        });
    });

    describe('claimAllTokensAfterTimeLock', async () => {
        beforeEach('Deploying new PumaPayToken', async () => {
            token = await PumaPayToken.new({
                from: deployerAccount
            });
        });

        beforeEach('Deploying new Token Multisig', async () => {
            wallet = await TokenMultiSigWallet.new(superOwner, normalOwner, token.address, {
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
            await timeTravel(TIME_LOCK_PERIOD);
            const tokens = MINTED_TOKENS * ONE_ETHER;
            await wallet.claimAllTokensAfterTimeLock(ethWallet, {
                from: superOwner
            });

            const tokenClaimed = await token.balanceOf(ethWallet);

            tokenClaimed.should.be.bignumber.equal(tokens);
        });

        it('Should revert if the super owner try to claim all the tokens before 120 days', async () => {
            await timeTravel(TIME_LOCK_PERIOD - 5);
            const tokens = MINTED_TOKENS * ONE_ETHER;
            await assertRevert(wallet.claimAllTokensAfterTimeLock(ethWallet, {
                from: superOwner
            }));
        });

        it('should revert if is executed the normal owner', async () => {
            await assertRevert(wallet.claimAllTokensAfterTimeLock(ethWallet, {
                from: normalOwner
            }));
        });

        it('should revert if is executed by anyone besides the super owner', async () => {
            await assertRevert(wallet.claimAllTokensAfterTimeLock(ethWallet, {
                from: deployerAccount
            }));
        });

        it('should revert if the ETH wallet used as a param is a ZERO address', async () => {
            await assertRevert(wallet.claimAllTokensAfterTimeLock(ZERO_ADDRESS, {
                from: superOwner
            }));
        });
    });

    describe('Web 3 Functions', () => {
        beforeEach('Deploying new PumaPayToken', async () => {
            token = await PumaPayToken.new({
                from: deployerAccount
            });
        });

        beforeEach('Deploying new Token Multisig', async () => {
            wallet = await TokenMultiSigWallet.new(superOwner, normalOwner, token.address, {
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

        beforeEach('Submit Transaction', async () => {
            await wallet.submitTransaction(destinationAccountOne, 2 * ONE_ETHER, {
                from: superOwner
            });
        });

        beforeEach('Submit Transaction', async () => {
            await wallet.submitTransaction(destinationAccountTwo, 4 * ONE_ETHER, {
                from: superOwner
            });
        });

        describe('Get Confirmation Count', () => {
            it('should return "1" for a submitted transaction', async () => {
                const walletConfirmationCountForSubmittedTx = await wallet.getConfirmationCount(1);
                assert.equal(walletConfirmationCountForSubmittedTx, 1);
            });

            it('should return "2" for a confirmed transaction', async () => {
                await wallet.confirmTransaction(1, {
                    from: normalOwner
                });

                const walletConfirmationCountForConfirmedTx = await wallet.getConfirmationCount(1);
                assert.equal(walletConfirmationCountForConfirmedTx, 2);
            });

            it('should return "0" for a non-submitted transaction', async () => {
                const walletConfirmationCountForNonSubmittedTx = await wallet.getConfirmationCount(10);
                walletConfirmationCountForNonSubmittedTx.should.be.bignumber.equal(0);
            });
        });

        describe('Get Transaction Count', () => {
            it('should return the number of pending transactions', async () => {
                const walletPendingTransactions = await wallet.getTransactionCount(true, false);
                assert.equal(walletPendingTransactions, 2);
            })

            it('should return the number of executed transactions', async () => {
                await wallet.confirmTransaction(1, {
                    from: normalOwner
                });

                const walletExecutedTransactions = await wallet.getTransactionCount(false, true);
                assert.equal(walletExecutedTransactions, 1);
            })

            it('should return the number of all transactions - excuted and pending', async () => {
                await wallet.confirmTransaction(1, {
                    from: normalOwner
                });
                await wallet.submitTransaction(destinationAccountTwo, 6 * ONE_ETHER, {
                    from: superOwner
                });
                const walletAllTransactions = await wallet.getTransactionCount(true, true);
                assert.equal(walletAllTransactions, 3);
            });

            it('should return "0" when false is used as a param for pending and executed', async () => {
                await wallet.confirmTransaction(1, {
                    from: normalOwner
                });
                await wallet.submitTransaction(destinationAccountTwo, 6 * ONE_ETHER, {
                    from: superOwner
                });
                const walletNoTransactions = await wallet.getTransactionCount(false, false);
                walletNoTransactions.should.be.bignumber.equal(0);
            });
        });

        describe('Get Confirmations', () => {
            it('should return a list with the addresses of one owner for a submitted transaction', async () => {
                const confirmedOwers = await wallet.getConfirmations(1);
                assert.equal(confirmedOwers.length, 1);
                assert.equal(confirmedOwers[0], superOwner);
            });

            it('should return a list with the addresses of both owners for a confirmed transaction', async () => {
                await wallet.confirmTransaction(1, {
                    from: normalOwner
                });
                const confirmedOwers = await wallet.getConfirmations(1);
                assert.equal(confirmedOwers.length, 2);
                assert.equal(confirmedOwers[0], superOwner);
                assert.equal(confirmedOwers[1], normalOwner);
            });

            it('should return an empty array for a non-submitted transaction', async () => {
                const confirmedOwers = await wallet.getConfirmations(10);
                assert.equal(confirmedOwers.length, 0);
            });
        });

        describe('Get Transactions IDs', () => {
            beforeEach('Submit Transaction', async () => {
                await wallet.submitTransaction(destinationAccountTwo, 6 * ONE_ETHER, {
                    from: superOwner
                });
            });

            it('should return an array of pending transactions IDs when none has been executed', async () => {
                const transactionIDs = await wallet.getTransactionIds(0, 3, true, false);
                assert.equal(transactionIDs.length, 3)
                transactionIDs[0].should.be.bignumber.equal(1);
                transactionIDs[1].should.be.bignumber.equal(2);
                transactionIDs[2].should.be.bignumber.equal(3);
            });

            it('should return an array of pending transactions IDs when none has been executed within the specified limits', async () => {
                const transactionIDs = await wallet.getTransactionIds(0, 2, true, false);
                assert.equal(transactionIDs.length, 2)
                transactionIDs[0].should.be.bignumber.equal(1);
                transactionIDs[1].should.be.bignumber.equal(2);
            });

            it('should return an array of pending transactions IDs when one has been executed', async () => {
                await wallet.confirmTransaction(1, {
                    from: normalOwner
                });
                const transactionIDs = await wallet.getTransactionIds(0, 3, true, false);
                assert.equal(transactionIDs.length, 3);
                transactionIDs[0].should.be.bignumber.equal(2);
                transactionIDs[1].should.be.bignumber.equal(3);
                transactionIDs[2].should.be.bignumber.equal(0);
            });

            it('should return an array of pending transactions IDs when one has been executed within the specified limits', async () => {
                await wallet.confirmTransaction(2, {
                    from: normalOwner
                });
                const transactionIDs = await wallet.getTransactionIds(0, 1, true, false);
                assert.equal(transactionIDs.length, 1);
                transactionIDs[0].should.be.bignumber.equal(1);
            });

            it('should return an array of executed transactions IDs', async () => {
                await wallet.confirmTransaction(2, {
                    from: normalOwner
                });
                const transactionIDs = await wallet.getTransactionIds(0, 3, false, true);
                assert.equal(transactionIDs.length, 3);
                transactionIDs[0].should.be.bignumber.equal(2);
                transactionIDs[1].should.be.bignumber.equal(0);
                transactionIDs[2].should.be.bignumber.equal(0);
            });

            it('should return an array of executed transactions IDs within the specified limits', async () => {
                await wallet.confirmTransaction(2, {
                    from: normalOwner
                });
                const transactionIDs = await wallet.getTransactionIds(0, 2, false, true);
                assert.equal(transactionIDs.length, 2);
                transactionIDs[0].should.be.bignumber.equal(2);
                transactionIDs[1].should.be.bignumber.equal(0);
            });

            it('should return an array of executed transactions IDs within the specified limits when all have been executed', async () => {
                await wallet.confirmTransaction(1, {
                    from: normalOwner
                });
                await wallet.confirmTransaction(2, {
                    from: normalOwner
                });
                await wallet.confirmTransaction(3, {
                    from: normalOwner
                });
                const transactionIDs = await wallet.getTransactionIds(0, 3, false, true);
                assert.equal(transactionIDs.length, 3);
                transactionIDs[0].should.be.bignumber.equal(1);
                transactionIDs[1].should.be.bignumber.equal(2);
                transactionIDs[2].should.be.bignumber.equal(3);
            });

            it('should return an array of all transactions IDs - excuted and pending', async () => {
                await wallet.confirmTransaction(1, {
                    from: normalOwner
                });
                await wallet.submitTransaction(destinationAccountTwo, 8 * ONE_ETHER, {
                    from: superOwner
                });
                const transactionIDs = await wallet.getTransactionIds(0, 4, true, true);
                assert.equal(transactionIDs.length, 4);
                transactionIDs[0].should.be.bignumber.equal(1);
                transactionIDs[1].should.be.bignumber.equal(2);
                transactionIDs[2].should.be.bignumber.equal(3);
                transactionIDs[3].should.be.bignumber.equal(4);
            });

            it('should throw an opcode error when calling with a bigger number than the transactions', async () => {
                try {
                    await wallet.getTransactionIds(0, 10, true, false)
                    assert.fail('should have thrown before');
                } catch (error) {
                    assertJump(error);
                }
            });
        });
    });
});