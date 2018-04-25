import assertRevert from './helpers/assertRevert';
import timeTravel from './helpers/timeHelper';
const RefundVault = artifacts.require('RefundVault');
const PumaPayToken = artifacts.require('PumaPayToken');
const truffleAssert = require('truffle-assertions');
const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const MINUTE = 60; // 60 seconds
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const GAS_PRICE = 100000000000;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

contract('RefundVault', async (accounts) => {
    const oneEther = web3.toWei(1, 'ether');

    const owner = accounts[0];
    const ethWallet = accounts[1];
    const contributorOne = accounts[2];
    const contributorTwo = accounts[3];
    const contributorThree = accounts[4];

    const notContributor = accounts[8];
    const notOwner = accounts[9];

    const exchangeRateOne = 2;
    const exchangeRateTwo = 5;
    const exchangeRateThree = 10;

    let token;
    let vault;

    describe('Deploying', async () => {
        beforeEach('Deploying new PumaPayToken', async () => {
            token = await PumaPayToken.new({
                from: owner
            });
        });

        beforeEach('Deploying new RefundVault', async () => {
            vault = await RefundVault.new(ethWallet, token.address, {
                from: owner
            });
        });

        it('Refund Vault ETH Wallet should be the address used on creation', async () => {
            const vaultEthWallet = await vault.etherWallet();

            assert.equal(vaultEthWallet.toString(), ethWallet);
        });

        it('Refund Vault token should be the contract address of the token used on creation', async () => {
            const vaultToken = await vault.token();

            assert.equal(vaultToken.toString(), token.address);
        });

        it('Refund Vault state should be set to "Active" on creation', async () => {
            const state = await vault.state();

            assert.equal(state.toString(), 0);
        });

        it('Owner is set', async () => {
            const vaultOnwer = await vault.owner();

            assert.equal(vaultOnwer, owner);
        });

        it('Unrefunded amount is set to zero', async () => {
            const vaultUnrefundedETHAmount = await vault.unrefundedETHAmount();

            assert.equal(vaultUnrefundedETHAmount, 0);
        });

        it('Refund time frame should be 60 days', async () => {
            const vaultRefundTimeFrame = await vault.REFUND_TIME_FRAME();
            const refundTimeFrame = 60 * DAY;

            assert.equal(vaultRefundTimeFrame.toNumber(), refundTimeFrame);
        });

        // it('Refund Vault emits an 'Active' event on creation', async function () {
        //     let eventResult = {};
        //     const allEvents = vault.allEvents({
        //         fromBlock: 0,
        //         toBlock: 'latest'
        //     });

        //     allEvents.watch((err, res) => {
        //         assert.equal(res.event, 'Active');
        //         allEvents.stopWatching();
        //     });
        // });

        it('Should revert when deploying new RefundVault with zero ETH Wallet address', async () => {
            await assertRevert(RefundVault.new(ZERO_ADDRESS, token.address));
        });

        it('Should revert when deploying new RefundVault with zero token contract address', async () => {
            await assertRevert(RefundVault.new(ethWallet, ZERO_ADDRESS));
        });
    });

    describe('Deposit', () => {
        beforeEach('Deploying new PumaPayToken', async () => {
            token = await PumaPayToken.new({
                from: owner
            });
        });

        beforeEach('Deploying new RefundVault', async () => {
            vault = await RefundVault.new(ethWallet, token.address, {
                from: owner
            });
        });

        it('should allow the owner to deposit ETH for a specific contributor with the PMA/ETH exchange rate', async () => {
            const pre = await web3.eth.getBalance(owner);
            const deposit = await vault.deposit(contributorOne, exchangeRateOne, {
                from: owner,
                value: 100 * oneEther
            });
            const post = await web3.eth.getBalance(owner);
            const depositedETH = await vault.depositedETH(contributorOne);
            const depositedToken = await vault.depositedToken(contributorOne);
            const vaultUnrefundedETHAmount = await vault.unrefundedETHAmount();
            const vaultETHBalance = await web3.eth.getBalance(vault.address);
            //const vaultTokenBalance = await token.getBalance(vault.address);

            assert.equal(depositedETH.toNumber(), (100 * oneEther));
            assert.equal(depositedToken.toNumber(), (100 * oneEther * exchangeRateOne));
            assert.equal(depositedETH.toNumber(), vaultUnrefundedETHAmount);
            vaultETHBalance.should.be.bignumber.equal((100 * oneEther));
            //vaultTokenBalance.should.be.bignumber.equal((100 * oneEther * exchangeRateOne));
            pre.minus(post).minus(deposit.receipt.gasUsed * GAS_PRICE).toNumber().should.be.bignumber.equal((100 * oneEther));
        });

        it('Should revert if executed from an account which is not the owner of the RefundVault', async () => {
            await assertRevert(vault.deposit(contributorOne, exchangeRateOne, {
                from: notOwner,
                value: 100 * oneEther
            }));
        });

        it('Should revert if the contributor address given is a ZERO address', async () => {
            await assertRevert(vault.deposit(ZERO_ADDRESS, exchangeRateOne, {
                from: owner,
                value: 100 * oneEther
            }));
        });

        it('Should revert if the amount of ETH transfered is zero', async () => {
            await assertRevert(vault.deposit(contributorOne, exchangeRateOne, {
                from: owner,
                value: 0
            }));
        });

        it('Should revert if the exchange rate of PMA to ETH is zero', async () => {
            await assertRevert(vault.deposit(contributorOne, 0, {
                from: owner,
                value: 100 * oneEther
            }));
        });


        it('Should revert if executed when the RefundVault is at "Refunding" state', async () => {
            await vault.enableRefunds({
                from: owner
            });

            await assertRevert(vault.deposit(contributorOne, exchangeRateOne, {
                from: owner,
                value: 100 * oneEther
            }));
        });

        it('Should revert if executed when the RefundVault is at "Closed" state', async () => {
            await vault.enableRefunds({
                from: owner
            });

            await timeTravel(60 * DAY + 1);

            await vault.close({
                from: owner
            });

            await assertRevert(vault.deposit(contributorOne, exchangeRateOne, {
                from: owner,
                value: 100 * oneEther
            }));
        });

        describe('Commulative Deposits', () => {
            it('for different contributors should increase the unrefunded ETH Amount', async () => {
                await vault.deposit(contributorOne, exchangeRateOne, {
                    from: owner,
                    value: 100 * oneEther
                });

                await vault.deposit(contributorTwo, exchangeRateTwo, {
                    from: owner,
                    value: 100 * oneEther
                });

                await vault.deposit(contributorThree, exchangeRateThree, {
                    from: owner,
                    value: 100 * oneEther
                });

                const vaultUnrefundedETHAmount = await vault.unrefundedETHAmount();

                vaultUnrefundedETHAmount.should.be.bignumber.equal((300 * oneEther));
            });

            it('should allow commulative refund amount for contibutors', async () => {
                await vault.deposit(contributorTwo, exchangeRateTwo, {
                    from: owner,
                    value: 100 * oneEther
                });

                await vault.deposit(contributorTwo, exchangeRateTwo, {
                    from: owner,
                    value: 100 * oneEther
                });

                const depositedETH = await vault.depositedETH(contributorTwo);
                const depositedToken = await vault.depositedToken(contributorTwo);
                const vaultUnrefundedETHAmount = await vault.unrefundedETHAmount();
                const vaultBalance = await web3.eth.getBalance(vault.address);

                depositedETH.should.be.bignumber.equal((200 * oneEther));
                depositedToken.should.be.bignumber.equal((200 * oneEther * exchangeRateTwo));
                depositedETH.should.be.bignumber.equal(vaultUnrefundedETHAmount);
                vaultBalance.should.be.bignumber.equal((200 * oneEther));
            });
        });
    });

    describe('Enable Refunds', () => {
        beforeEach('Deploying new PumaPayToken', async () => {
            token = await PumaPayToken.new({
                from: owner
            });
        });

        beforeEach('Deploying new RefundVault', async () => {
            vault = await RefundVault.new(ethWallet, token.address, {
                from: owner
            });
        });

        it('should set the refund start time and change the state of the vault to "Refunding"', async () => {
            await vault.enableRefunds({
                from: owner
            });
            // const vaultRefundStartTime = await vault.refundStartTime();
            // const expectedRefundStartTime = Math.floor(Date.now() / 1000);
            const vaultState = await vault.state();

            // vaultRefundStartTime.should.be.bignumber.equal(expectedRefundStartTime);
            // assert.equal(vaultRefundStartTime, expectedRefundStartTime);
            assert.equal(vaultState, 1);
        });

        it('should revert if executed from an account which is not the owner of the "RefundVault"', async () => {
            await assertRevert(vault.enableRefunds({
                from: notOwner
            }));
        });

        it('should revert if executed when the state of the vault is "Refunding"', async () => {
            await vault.enableRefunds({
                from: owner
            });

            await assertRevert(vault.enableRefunds({
                from: owner
            }));
        });

        it('should revert if executed when the state of the vault is "Closed"', async () => {
            await vault.enableRefunds({
                from: owner
            });

            await timeTravel(60 * DAY);

            await vault.close({
                from: owner
            });

            await assertRevert(vault.enableRefunds({
                from: owner
            }));
        });
    });

    describe('Close', () => {
        beforeEach('Deploying new PumaPayToken', async () => {
            token = await PumaPayToken.new({
                from: owner
            });
        });

        beforeEach('Deploying new RefundVault', async () => {
            vault = await RefundVault.new(ethWallet, token.address, {
                from: owner
            });
        });

        beforeEach('Deposit contributions', async () => {
            await vault.deposit(contributorOne, exchangeRateOne, {
                from: owner,
                value: 1000
            });

            await vault.deposit(contributorTwo, exchangeRateTwo, {
                from: owner,
                value: 1000
            });
        })

        it('should move the unrefunded ETH to the ETH wallet', async () => {
            await vault.enableRefunds({
                from: owner
            });
            await timeTravel(60 * DAY + 1);

            const walletBalancePre = await web3.eth.getBalance(ethWallet);
            await vault.close({
                from: owner
            });
            const walletBalancePost = await web3.eth.getBalance(ethWallet);

            walletBalancePost.minus(walletBalancePre).should.be.bignumber.equal(2000);
        });

        it('should change the state of the vault to "Closed"', async () => {
            await vault.enableRefunds({
                from: owner
            });
            await timeTravel(60 * DAY + 1);
            await vault.close({
                from: owner
            });

            const vaultState = await vault.state();

            assert.equal(vaultState, 2);
        });

        it('should set the balance of the refund vault to zero', async () => {
            await vault.enableRefunds({
                from: owner
            });
            await timeTravel(60 * DAY + 1);
            await vault.close({
                from: owner
            });

            const vaultBalance = await web3.eth.getBalance(vault.address);

            vaultBalance.should.be.bignumber.equal(0);
        });

        it('should set the unrefunded ETH amount to zero', async () => {
            await vault.enableRefunds({
                from: owner
            });
            await timeTravel(60 * DAY + 1);
            await vault.close({
                from: owner
            });

            const vaultUnrefundedETHAmount = await vault.unrefundedETHAmount();

            vaultUnrefundedETHAmount.should.be.bignumber.equal(0);
        });

        it('shoud revert if executed from an account which is not the owner of the RefundVault', async () => {
            await assertRevert(vault.close({
                from: notOwner
            }));
        });

        it('shoud revert if executed with refund vault state is "Active"', async () => {
            await assertRevert(vault.close({
                from: owner
            }));
        });

        it('should revert if executed when the state of the vault to "Closed"', async () => {
            await vault.enableRefunds({
                from: owner
            });

            await timeTravel(60 * DAY + 1);

            await vault.close({
                from: owner
            });

            await assertRevert(vault.close({
                from: owner
            }));
        });

        it('shoud revert if executed before the refund time frame has passed', async () => {
            await vault.enableRefunds({
                from: owner
            });

            await timeTravel(30 * DAY);

            await assertRevert(vault.close({
                from: owner
            }));
        });
    });

    describe('Claim Tokens', () => {
        describe('during "Active" state', () => {
            beforeEach('Deploying new PumaPayToken', async () => {
                token = await PumaPayToken.new({
                    from: owner
                });
            });

            beforeEach('Deploying new RefundVault', async () => {
                vault = await RefundVault.new(ethWallet, token.address, {
                    from: owner
                });
            });

            beforeEach('Deposit ETH for contributors', async () => {
                await vault.deposit(contributorOne, exchangeRateOne, {
                    from: owner,
                    value: 1000
                });

                await vault.deposit(contributorTwo, exchangeRateTwo, {
                    from: owner,
                    value: 1000
                });

                await vault.deposit(contributorThree, exchangeRateThree, {
                    from: owner,
                    value: 1000
                });
            });

            it('should revert when contributors try to claim their tokens', async () => {
                const tokensToClaim = 1000 * exchangeRateOne;
                await assertRevert(vault.claimTokens(tokensToClaim, {
                    from: contributorOne
                }));
            });
        });

        describe('during "Refunding" state', () => {
            beforeEach('Deploying new PumaPayToken', async () => {
                token = await PumaPayToken.new({
                    from: owner
                });
            });

            beforeEach('Deploying new RefundVault', async () => {
                vault = await RefundVault.new(ethWallet, token.address, {
                    from: owner
                });
            });

            beforeEach('Issue tokens to the RefundVault', async () => {
                await token.mint(vault.address, 100000 * oneEther * exchangeRateThree, {
                    from: owner
                });

                await token.finishMinting({
                    from: owner
                });
            });

            beforeEach('Deposit ETH for contributors', async () => {
                await vault.deposit(contributorOne, exchangeRateOne, {
                    from: owner,
                    value: 1000
                });

                await vault.deposit(contributorTwo, exchangeRateTwo, {
                    from: owner,
                    value: 1000
                });
                await vault.deposit(contributorThree, exchangeRateThree, {
                    from: owner,
                    value: 1000
                });
            });

            beforeEach('Change to "Refunding" state', async () => {
                await vault.enableRefunds({
                    from: owner
                });
            });

            it('should allow contributors to retrieve tokens in their account', async () => {
                const tokensToClaim = 100;
                await vault.claimTokens(tokensToClaim, {
                    from: contributorOne
                });
                const tokenClaimed = await token.balanceOf(contributorOne);

                tokenClaimed.should.be.bignumber.equal(tokensToClaim);
            });

            it('should allow contributors to retrieve tokens in their account commulatively', async () => {
                const tokensToClaim = 100;
                await vault.claimTokens(tokensToClaim, {
                    from: contributorOne
                });

                await vault.claimTokens(tokensToClaim, {
                    from: contributorOne
                });

                const tokenClaimed = await token.balanceOf(contributorOne);

                tokenClaimed.should.be.bignumber.equal(2 * tokensToClaim);
            });

            it('should transfer the corresponding ETH to the ether Wallet', async () => {
                const tokensToClaim = 100;
                const ethDepositedByContributor = await vault.depositedETH(contributorOne);
                const tokenDepositedByContributor = await vault.depositedToken(contributorOne);
                const walletBalancePre = await web3.eth.getBalance(ethWallet);
                await vault.claimTokens(tokensToClaim, {
                    from: contributorOne
                });
                const walletBalancePost = await web3.eth.getBalance(ethWallet);

                walletBalancePost.minus(walletBalancePre).should.be.bignumber.equal(tokensToClaim * ethDepositedByContributor / tokenDepositedByContributor);
            });

            it('should substract the amount of tokens claimed by the contributor', async () => {
                const tokensToClaim = 100;
                const ethDepositedByContributor = await vault.depositedETH(contributorOne);
                const tokenDepositedByContributor = await vault.depositedToken(contributorOne);
                const tokenDepositedByContributorPre = await vault.depositedToken(contributorOne);
                await vault.claimTokens(tokensToClaim, {
                    from: contributorOne
                });
                const tokenDepositedByContributorPost = await vault.depositedToken(contributorOne);

                tokenDepositedByContributorPre.minus(tokenDepositedByContributorPost).should.be.bignumber.equal(tokensToClaim);
            });

            it('should substract the corresponding amount of ETH that the contributor can refund', async () => {
                const tokensToClaim = 100;
                const ethDepositedByContributor = await vault.depositedETH(contributorOne);
                const tokenDepositedByContributor = await vault.depositedToken(contributorOne);
                const ethDepositedByContributorPre = await vault.depositedETH(contributorOne);
                await vault.claimTokens(tokensToClaim, {
                    from: contributorOne
                });
                const ethDepositedByContributorPost = await vault.depositedETH(contributorOne);

                ethDepositedByContributorPre.minus(ethDepositedByContributorPost).should.be.bignumber.equal(tokensToClaim * ethDepositedByContributor / tokenDepositedByContributor);
            });

            it('should substract the corrensponding amount of ETH claimed from the unrefunded ETH ', async () => {
                const tokensToClaim = 100;
                const ethDepositedByContributor = await vault.depositedETH(contributorOne);
                const tokenDepositedByContributor = await vault.depositedToken(contributorOne);
                const unrefundedETHAmountPre = await vault.unrefundedETHAmount();
                await vault.claimTokens(tokensToClaim, {
                    from: contributorOne
                });
                const unrefundedETHAmountPost = await vault.unrefundedETHAmount();

                unrefundedETHAmountPre.minus(unrefundedETHAmountPost).should.be.bignumber.equal(tokensToClaim * ethDepositedByContributor / tokenDepositedByContributor);
            });

            it('shoud revert when the tokens to claim is zero', async () => {
                await assertRevert(vault.claimTokens(0, {
                    from: contributorOne
                }));
            });

            it('shoud revert when there are no tokens to claim ', async () => {
                const allTokens = 1000 * exchangeRateOne;
                await vault.claimTokens(allTokens, {
                    from: contributorOne
                });

                await assertRevert(vault.claimTokens(allTokens, {
                    from: contributorOne
                }));
            });

            it('shoud revert when the contributor request to claim more tokens than what he can', async () => {
                const moreThanAllTokens = (1000 * exchangeRateOne) + 1;
                await assertRevert(vault.claimTokens(moreThanAllTokens, {
                    from: contributorOne
                }));
            });

            it('shoud revert when the contributor is not in the list of contributors that can claim tokens', async () => {
                await assertRevert(vault.claimTokens(100, {
                    from: notContributor
                }));
            });
        });

        describe('during "Closed" state', () => {
            beforeEach('Deploying new PumaPayToken', async () => {
                token = await PumaPayToken.new({
                    from: owner
                });
            });

            beforeEach('Deploying new RefundVault', async () => {
                vault = await RefundVault.new(ethWallet, token.address, {
                    from: owner
                });
            });

            beforeEach('Issue tokens to the RefundVault', async () => {
                await token.mint(vault.address, 100000 * oneEther * exchangeRateThree, {
                    from: owner
                });

                await token.finishMinting({
                    from: owner
                });
            });

            beforeEach('Deposit ETH for contributors', async () => {
                await vault.deposit(contributorOne, exchangeRateOne, {
                    from: owner,
                    value: 1000
                });

                await vault.deposit(contributorTwo, exchangeRateTwo, {
                    from: owner,
                    value: 1000
                });
                await vault.deposit(contributorThree, exchangeRateThree, {
                    from: owner,
                    value: 1000
                });
            });

            beforeEach('Change to "Refunding" state', async () => {
                await vault.enableRefunds({
                    from: owner
                });
            });

            beforeEach('Fast forward 60 days', async () => {
                await timeTravel(60 * DAY);
            });

            beforeEach('Change to "ClosedState"', async () => {
                await vault.close({
                    from: owner
                });
            });

            it('should allow contributors to retrieve tokens in their account', async () => {
                const tokensToClaim = 10;
                await vault.claimTokens(tokensToClaim, {
                    from: contributorOne
                });
                const tokensClaimed = await token.balanceOf(contributorOne);

                tokensClaimed.should.be.bignumber.equal(tokensToClaim);
            });

            it('should allow contributors to retrieve tokens in their account commulatively', async () => {
                const tokensToClaim = 100;
                await vault.claimTokens(tokensToClaim, {
                    from: contributorOne
                });

                await vault.claimTokens(tokensToClaim, {
                    from: contributorOne
                });

                const tokenClaimed = await token.balanceOf(contributorOne);

                tokenClaimed.should.be.bignumber.equal(2 * tokensToClaim);
            });

            it('should substract the amount of tokens claimed by the contributor', async () => {
                const tokensToClaim = 100;
                const ethDepositedByContributor = await vault.depositedETH(contributorOne);
                const tokenDepositedByContributor = await vault.depositedToken(contributorOne);
                const tokenDepositedByContributorPre = await vault.depositedToken(contributorOne);
                await vault.claimTokens(tokensToClaim, {
                    from: contributorOne
                });
                const tokenDepositedByContributorPost = await vault.depositedToken(contributorOne);

                tokenDepositedByContributorPre.minus(tokenDepositedByContributorPost).should.be.bignumber.equal(tokensToClaim);
            });

            it('shoud revert when the tokens to claim is zero', async () => {
                await assertRevert(vault.claimTokens(0, {
                    from: contributorOne
                }));
            });

            it('shoud revert when there are no tokens to claim ', async () => {
                const allTokens = 1000 * exchangeRateOne;
                await vault.claimTokens(allTokens, {
                    from: contributorOne
                });

                await assertRevert(vault.claimTokens(allTokens, {
                    from: contributorOne
                }));
            });

            it('shoud revert when the contributor request to claim more tokens than what he can', async () => {
                const moreThanAllTokens = (1000 * exchangeRateOne) + 1;
                await assertRevert(vault.claimTokens(moreThanAllTokens, {
                    from: contributorOne
                }));
            });

            it('shoud revert when the contributor is not in the list of contributors that can claim tokens', async () => {
                await assertRevert(vault.claimTokens(100, {
                    from: notContributor
                }));
            });
        });
    });

    describe('Claim All Tokens', () => {
        describe('during "Active" state', () => {
            beforeEach('Deploying new PumaPayToken', async () => {
                token = await PumaPayToken.new({
                    from: owner
                });
            });

            beforeEach('Deploying new RefundVault', async () => {
                vault = await RefundVault.new(ethWallet, token.address, {
                    from: owner
                });
            });

            beforeEach('Deposit ETH for contributors', async () => {
                await vault.deposit(contributorOne, exchangeRateOne, {
                    from: owner,
                    value: 100 * oneEther
                });

                await vault.deposit(contributorTwo, exchangeRateTwo, {
                    from: owner,
                    value: 100 * oneEther
                });
                await vault.deposit(contributorThree, exchangeRateThree, {
                    from: owner,
                    value: 100 * oneEther
                });
            });

            it('should revert when contributors try to claim their tokens', async () => {
                await assertRevert(vault.claimAllTokens({
                    from: contributorOne
                }));
            });
        });

        describe('during "Refunding" state', () => {
            beforeEach('Deploying new PumaPayToken', async () => {
                token = await PumaPayToken.new({
                    from: owner
                });
            });

            beforeEach('Deploying new RefundVault', async () => {
                vault = await RefundVault.new(ethWallet, token.address, {
                    from: owner
                });
            });

            beforeEach('Issue tokens to the RefundVault', async () => {
                await token.mint(vault.address, 100000 * oneEther * exchangeRateThree, {
                    from: owner
                });

                await token.finishMinting({
                    from: owner
                });
            });

            beforeEach('Deposit ETH for contributors', async () => {
                await vault.deposit(contributorOne, exchangeRateOne, {
                    from: owner,
                    value: 1000
                });

                await vault.deposit(contributorTwo, exchangeRateTwo, {
                    from: owner,
                    value: 1000
                });
                await vault.deposit(contributorThree, exchangeRateThree, {
                    from: owner,
                    value: 1000
                });
            });

            beforeEach('Change to "Refunding" state', async () => {
                await vault.enableRefunds({
                    from: owner
                });
            });

            it('should allow contributors to retrieve tokens in their account', async () => {
                await vault.claimAllTokens({
                    from: contributorOne
                });
                const tokenClaimed = await token.balanceOf(contributorOne);

                tokenClaimed.should.be.bignumber.equal(1000 * exchangeRateOne);
            });

            it('should revert when contributors try to retrieve tokens commulatively', async () => {
                await vault.claimAllTokens({
                    from: contributorOne
                });

                await assertRevert(vault.claimAllTokens({
                    from: contributorOne
                }));
            });

            it('should transfer the corresponding ETH to the ether Wallet', async () => {
                const ethDepositedByContributor = await vault.depositedETH(contributorOne);
                const tokenDepositedByContributor = await vault.depositedToken(contributorOne);
                const walletBalancePre = await web3.eth.getBalance(ethWallet);
                await vault.claimAllTokens({
                    from: contributorOne
                });
                const walletBalancePost = await web3.eth.getBalance(ethWallet);

                walletBalancePost.minus(walletBalancePre).should.be.bignumber.equal((1000 * exchangeRateOne) * ethDepositedByContributor / tokenDepositedByContributor);
            });

            it('should substract the amount of tokens claimed by the contributor', async () => {
                const ethDepositedByContributor = await vault.depositedETH(contributorOne);
                const tokenDepositedByContributor = await vault.depositedToken(contributorOne);
                const tokenDepositedByContributorPre = await vault.depositedToken(contributorOne);
                await vault.claimAllTokens({
                    from: contributorOne
                });
                const expectedTokensClaimed = 1000 * exchangeRateOne;
                const tokenDepositedByContributorPost = await vault.depositedToken(contributorOne);

                tokenDepositedByContributorPre.minus(tokenDepositedByContributorPost).should.be.bignumber.equal(expectedTokensClaimed);
            });

            it('should substract the corresponding amount of ETH that the contributor can refund', async () => {
                const ethDepositedByContributor = await vault.depositedETH(contributorOne);
                const tokenDepositedByContributor = await vault.depositedToken(contributorOne);
                const ethDepositedByContributorPre = await vault.depositedETH(contributorOne);
                await vault.claimAllTokens({
                    from: contributorOne
                });
                const expectedTokensClaimed = 1000 * exchangeRateOne;
                const ethDepositedByContributorPost = await vault.depositedETH(contributorOne);

                ethDepositedByContributorPre.minus(ethDepositedByContributorPost).should.be.bignumber.equal(expectedTokensClaimed * ethDepositedByContributor / tokenDepositedByContributor);
            });

            it('should substract the corrensponding amount of ETH claimed from the unrefunded ETH ', async () => {
                const ethDepositedByContributor = await vault.depositedETH(contributorOne);
                const tokenDepositedByContributor = await vault.depositedToken(contributorOne);
                const unrefundedETHAmountPre = await vault.unrefundedETHAmount();
                await vault.claimAllTokens({
                    from: contributorOne
                });
                const expectedTokensClaimed = 1000 * exchangeRateOne;
                const unrefundedETHAmountPost = await vault.unrefundedETHAmount();

                unrefundedETHAmountPre.minus(unrefundedETHAmountPost).should.be.bignumber.equal(expectedTokensClaimed * ethDepositedByContributor / tokenDepositedByContributor);
            });

            it('shoud revert when the contributor is not in the list of contributors that can claim tokens', async () => {
                await assertRevert(vault.claimAllTokens({
                    from: notContributor
                }));
            });
        });

        describe('during "Closed" state', () => {
            beforeEach('Deploying new PumaPayToken', async () => {
                token = await PumaPayToken.new({
                    from: owner
                });
            });

            beforeEach('Deploying new RefundVault', async () => {
                vault = await RefundVault.new(ethWallet, token.address, {
                    from: owner
                });
            });

            beforeEach('Issue tokens to the RefundVault', async () => {
                await token.mint(vault.address, 100000 * oneEther * exchangeRateThree, {
                    from: owner
                });

                await token.finishMinting({
                    from: owner
                });
            });

            beforeEach('Deposit ETH for contributors', async () => {
                await vault.deposit(contributorOne, exchangeRateOne, {
                    from: owner,
                    value: 1000
                });

                await vault.deposit(contributorTwo, exchangeRateTwo, {
                    from: owner,
                    value: 1000
                });
                await vault.deposit(contributorThree, exchangeRateThree, {
                    from: owner,
                    value: 1000
                });
            });

            beforeEach('Change to "Refunding" state', async () => {
                await vault.enableRefunds({
                    from: owner
                });
            });

            beforeEach('Fast forward 60 days', async () => {
                await timeTravel(60 * DAY);
            });

            beforeEach('Change to "ClosedState"', async () => {
                await vault.close({
                    from: owner
                });
            })

            it('should allow contributors to retrieve tokens in their account', async () => {
                await vault.claimAllTokens({
                    from: contributorOne
                });
                const expectedTokensClaimed = 1000 * exchangeRateOne;
                const tokenClaimed = await token.balanceOf(contributorOne);

                tokenClaimed.should.be.bignumber.equal(expectedTokensClaimed);
            });

            it('should revert when contributors try to retrieve all tokens in their account commulatively', async () => {
                await vault.claimAllTokens({
                    from: contributorOne
                });

                await assertRevert(vault.claimAllTokens({
                    from: contributorOne
                }));
            });

            it('should substract the amount of tokens claimed by the contributor', async () => {
                await vault.claimAllTokens({
                    from: contributorOne
                });
                const tokenDepositedByContributor = await vault.depositedToken(contributorOne);

                tokenDepositedByContributor.should.be.bignumber.equal(0);
            });

            it('should revert when the contributor is not in the list of contributors that can claim tokens', async () => {
                await assertRevert(vault.claimAllTokens({
                    from: notContributor
                }));
            });
        });
    });

    describe('Refund ETH', () => {
        describe('during "Active" state', () => {
            beforeEach('Deploying new PumaPayToken', async () => {
                token = await PumaPayToken.new({
                    from: owner
                });
            });

            beforeEach('Deploying new RefundVault', async () => {
                vault = await RefundVault.new(ethWallet, token.address, {
                    from: owner
                });
            });

            it('should revert when a contributor try to refund when state is "Active"', async () => {
                await assertRevert(vault.refundETH(1, {
                    from: contributorOne
                }));
            });
        });

        describe('during "Refunding" state', () => {
            beforeEach('Deploying new PumaPayToken', async () => {
                token = await PumaPayToken.new({
                    from: owner
                });
            });

            beforeEach('Deploying new RefundVault', async () => {
                vault = await RefundVault.new(ethWallet, token.address, {
                    from: owner
                });
            });

            beforeEach('Issue tokens to the RefundVault', async () => {
                await token.mint(vault.address, 100000 * oneEther * exchangeRateThree, {
                    from: owner
                });

                await token.finishMinting({
                    from: owner
                });
            });

            beforeEach('Deposit ETH for contributors', async () => {
                await vault.deposit(contributorOne, exchangeRateOne, {
                    from: owner,
                    value: 1000
                });

                await vault.deposit(contributorTwo, exchangeRateTwo, {
                    from: owner,
                    value: 1000
                });
                await vault.deposit(contributorThree, exchangeRateThree, {
                    from: owner,
                    value: 1000
                });
            });

            beforeEach('Change to "Refunding" state', async () => {
                await vault.enableRefunds({
                    from: owner
                });
            });

            it('should allow contributors to refund all their contribution in Ether to their wallet', async () => {
                const ethToClaim = 1000;
                const contributorEtherPre = web3.eth.getBalance(contributorOne);
                const refund = await vault.refundETH(ethToClaim, {
                    from: contributorOne
                });
                const contributorEtherPost = web3.eth.getBalance(contributorOne);

                contributorEtherPost.minus(contributorEtherPre)
                    .plus(refund.receipt.gasUsed * GAS_PRICE)
                    .should.be.bignumber.equal(ethToClaim);
            });

            it('should allow contributors to refund all their contribution in Ether to their wallet', async () => {
                const ethToClaim = 1000;
                const contributorEtherPre = web3.eth.getBalance(contributorOne);
                const refund = await vault.refundETH(ethToClaim, {
                    from: contributorOne
                });
                const contributorEtherPost = web3.eth.getBalance(contributorOne);

                contributorEtherPost.minus(contributorEtherPre)
                    .plus(refund.receipt.gasUsed * GAS_PRICE)
                    .should.be.bignumber.equal(ethToClaim);
            });

            it('should allow contributors to refund part of their contribution in Ether', async () => {
                const ethToClaim = 100;
                const contributorEtherPre = web3.eth.getBalance(contributorOne);
                const refund = await vault.refundETH(ethToClaim, {
                    from: contributorOne
                });
                const contributorEtherPost = web3.eth.getBalance(contributorOne);

                contributorEtherPost.minus(contributorEtherPre)
                    .plus(refund.receipt.gasUsed * GAS_PRICE)
                    .should.be.bignumber.equal(ethToClaim);
            });

            it('should allow contributors to refund their contribution in Ether commulatively', async () => {
                const ethToClaim = 100;
                const contributorEtherPre = web3.eth.getBalance(contributorOne);
                const firstRefund = await vault.refundETH(ethToClaim, {
                    from: contributorOne
                });

                const secondRefund = await vault.refundETH(ethToClaim, {
                    from: contributorOne
                });
                const contributorEtherPost = web3.eth.getBalance(contributorOne);

                contributorEtherPost.minus(contributorEtherPre)
                    .plus(firstRefund.receipt.gasUsed * GAS_PRICE)
                    .plus(secondRefund.receipt.gasUsed * GAS_PRICE)
                    .should.be.bignumber.equal(2 * ethToClaim);
            });

            it('should reduce the deposited ETH amount of the contributor', async () => {
                const ethToClaim = 100;
                const vaultDepositedEtherPre = await vault.depositedETH(contributorOne);
                await vault.refundETH(ethToClaim, {
                    from: contributorOne
                });
                const vaultDepositedEtherPost = await vault.depositedETH(contributorOne);

                vaultDepositedEtherPre.minus(vaultDepositedEtherPost)
                    .should.be.bignumber.equal(ethToClaim);
            });

            it('should transfer the corresponding tokens to the ether Wallet', async () => {
                const ethToClaim = 100;
                const walletTokenPre = await token.balanceOf(ethWallet);
                await vault.refundETH(ethToClaim, {
                    from: contributorOne
                });
                const walletTokenPost = await token.balanceOf(ethWallet);
                const expectedTokenAmountTransferred = ethToClaim * exchangeRateOne;

                walletTokenPost.minus(walletTokenPre)
                    .should.be.bignumber.equal(expectedTokenAmountTransferred);
            });

            it('should reduce the amount of tokens held by the refund vault', async () => {
                const ethToClaim = 100;
                const vaultTokenPre = await token.balanceOf(vault.address);
                await vault.refundETH(ethToClaim, {
                    from: contributorOne
                });
                const vaultTokenPost = await token.balanceOf(vault.address);
                const expectedTokenAmountTransferred = ethToClaim * exchangeRateOne;

                vaultTokenPre.minus(vaultTokenPost)
                    .should.be.bignumber.equal(expectedTokenAmountTransferred);
            });

            it('should reduce the amount of tokens corresponding to the refunded ethers', async () => {
                const ethToClaim = 100;
                const vaultDepositedTokensPre = await vault.depositedToken(contributorOne);
                await vault.refundETH(ethToClaim, {
                    from: contributorOne
                });
                const vaultDepositedTokensPost = await vault.depositedToken(contributorOne);
                const expectedTokenAmountTransferred = ethToClaim * exchangeRateOne;

                vaultDepositedTokensPre.minus(vaultDepositedTokensPost)
                    .should.be.bignumber.equal(expectedTokenAmountTransferred);
            });

            it('should reduce the amount of ethers that can be refunded from the vault', async () => {
                const ethToClaim = 100;
                const vaultUnrefuncedEthPre = await vault.unrefundedETHAmount();
                await vault.refundETH(ethToClaim, {
                    from: contributorOne
                });
                const vaultUnrefuncedEthPost = await vault.unrefundedETHAmount();

                vaultUnrefuncedEthPre.minus(vaultUnrefuncedEthPost)
                    .should.be.bignumber.equal(ethToClaim);
            });

            it('should reduce the amount of ethers that can be refunded from the vault to 2000 when acontributor refunds', async () => {
                const ethToClaim = 1000;

                await vault.refundETH(ethToClaim, {
                    from: contributorOne
                });
                const vaultUnrefuncedEth = await vault.unrefundedETHAmount();

                vaultUnrefuncedEth.should.be.bignumber.equal(2000);
            });

            it('should reduce the amount of ethers that can be refunded to zero when all ethers are refunded', async () => {
                const ethToClaim = 1000;

                await vault.refundETH(ethToClaim, {
                    from: contributorOne
                });
                await vault.refundETH(ethToClaim, {
                    from: contributorTwo
                });
                await vault.refundETH(ethToClaim, {
                    from: contributorThree
                });
                const vaultUnrefuncedEth = await vault.unrefundedETHAmount();

                vaultUnrefuncedEth.should.be.bignumber.equal(0);
            });

            it('shoud revert when there are no ETH to refund ', async () => {
                const ethToClaim = 1000;

                await vault.refundETH(ethToClaim, {
                    from: contributorOne
                });
                await vault.refundETH(ethToClaim, {
                    from: contributorTwo
                });
                await vault.refundETH(ethToClaim, {
                    from: contributorThree
                });

                await assertRevert(vault.refundETH(1, {
                    from: contributorOne
                }));
            });

            it('shoud revert when the ETH to refund is zero', async () => {
                await assertRevert(vault.refundETH(0, {
                    from: contributorOne
                }));
            });

            it('shoud revert when the ETH to refund is negative', async () => {
                await assertRevert(vault.refundETH(-10, {
                    from: contributorOne
                }));
            });

            it('should revert when contributors try to refund more than the contribution in Ether', async () => {
                await assertRevert(vault.refundETH(1001, {
                    from: notContributor
                }));
            });

            it('should revert when the contributor is not in the list of contributors that can refund', async () => {
                await assertRevert(vault.refundETH(1, {
                    from: notContributor
                }));
            });
        });

        describe('during "Closed" state', () => {
            beforeEach('Deploying new PumaPayToken', async () => {
                token = await PumaPayToken.new({
                    from: owner
                });
            });

            beforeEach('Deploying new RefundVault', async () => {
                vault = await RefundVault.new(ethWallet, token.address, {
                    from: owner
                });
            });

            beforeEach('Deposit ETH for contributors', async () => {
                await vault.deposit(contributorOne, exchangeRateOne, {
                    from: owner,
                    value: 1000
                });

                await vault.deposit(contributorTwo, exchangeRateTwo, {
                    from: owner,
                    value: 1000
                });
                await vault.deposit(contributorThree, exchangeRateThree, {
                    from: owner,
                    value: 1000
                });
            });

            beforeEach('Change to "Refunding" state', async () => {
                await vault.enableRefunds({
                    from: owner
                });
            });

            beforeEach('Fast forward 60 days', async () => {
                await timeTravel(60 * DAY);
            });

            beforeEach('Close Refund Period', async () => {
                await vault.close();
            });

            it('should revert when a contributor try to refund when state is "Closed"', async () => {
                await assertRevert(vault.refundETH(1, {
                    from: contributorOne
                }));
            });
        });
    });
});