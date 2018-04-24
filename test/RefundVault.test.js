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

    const exchangeRateOne = 50000; /// 50,000 PMA / ETH
    const exchangeRateTwo = 75000; /// 75,000 PMA / ETH
    const exchangeRateThree = 100000; /// 100,000 PMA / ETH

    let token;
    let vault;

    // describe('Deploying', async () => {
    //     beforeEach('Deploying new PumaPayToken', async () => {
    //         token = await PumaPayToken.new({
    //             from: owner
    //         });
    //     });

    //     beforeEach('Deploying new RefundVault', async () => {
    //         vault = await RefundVault.new(ethWallet, token.address, {
    //             from: owner
    //         });
    //     });

    //     it('Refund Vault ETH Wallet should be the address used on creation', async () => {
    //         const vaultEthWallet = await vault.etherWallet();

    //         assert.equal(vaultEthWallet.toString(), ethWallet);
    //     });

    //     it('Refund Vault token should be the contract address of the token used on creation', async () => {
    //         const vaultToken = await vault.token();

    //         assert.equal(vaultToken.toString(), token.address);
    //     });

    //     it('Refund Vault state should be set to "Active" on creation', async () => {
    //         const state = await vault.state();

    //         assert.equal(state.toString(), 0);
    //     });

    //     it('Owner is set', async () => {
    //         const vaultOnwer = await vault.owner();

    //         assert.equal(vaultOnwer, owner);
    //     });

    //     it('Unrefunded amount is set to zero', async () => {
    //         const vaultUnrefundedETHAmount = await vault.unrefundedETHAmount();

    //         assert.equal(vaultUnrefundedETHAmount, 0);
    //     });

    //     it('Refund time frame should be 60 days', async () => {
    //         const vaultRefundTimeFrame = await vault.REFUND_TIME_FRAME();
    //         const refundTimeFrame = 60 * DAY;

    //         assert.equal(vaultRefundTimeFrame.toNumber(), refundTimeFrame);
    //     });

    //     // it('Refund Vault emits an 'Active' event on creation', async function () {
    //     //     let eventResult = {};
    //     //     const allEvents = vault.allEvents({
    //     //         fromBlock: 0,
    //     //         toBlock: 'latest'
    //     //     });

    //     //     allEvents.watch((err, res) => {
    //     //         assert.equal(res.event, 'Active');
    //     //         allEvents.stopWatching();
    //     //     });
    //     // });

    //     it('Should revert when deploying new RefundVault with zero ETH Wallet address', async () => {
    //         await assertRevert(RefundVault.new(ZERO_ADDRESS, token.address));
    //     });

    //     it('Should revert when deploying new RefundVault with zero token contract address', async () => {
    //         await assertRevert(RefundVault.new(ethWallet, ZERO_ADDRESS));
    //     });
    // });

    // describe('Deposit', () => {
    //     beforeEach('Deploying new PumaPayToken', async () => {
    //         token = await PumaPayToken.new({
    //             from: owner
    //         });
    //     });

    //     beforeEach('Deploying new RefundVault', async () => {
    //         vault = await RefundVault.new(ethWallet, token.address, {
    //             from: owner
    //         });
    //     });

    //     it('should allow the owner to deposit ETH for a specific contributor with the PMA/ETH exchange rate', async () => {
    //         const pre = await web3.eth.getBalance(owner);
    //         const deposit = await vault.deposit(contributorOne, exchangeRateOne, {
    //             from: owner,
    //             value: 100 * oneEther
    //         });
    //         const post = await web3.eth.getBalance(owner);
    //         const depositedETH = await vault.depositedETH(contributorOne);
    //         const depositedToken = await vault.depositedToken(contributorOne);
    //         const vaultUnrefundedETHAmount = await vault.unrefundedETHAmount();
    //         const vaultETHBalance = await web3.eth.getBalance(vault.address);
    //         //const vaultTokenBalance = await token.getBalance(vault.address);

    //         assert.equal(depositedETH.toNumber(), (100 * oneEther));
    //         assert.equal(depositedToken.toNumber(), (100 * oneEther * exchangeRateOne));
    //         assert.equal(depositedETH.toNumber(), vaultUnrefundedETHAmount);
    //         vaultETHBalance.should.be.bignumber.equal((100 * oneEther));
    //         //vaultTokenBalance.should.be.bignumber.equal((100 * oneEther * exchangeRateOne));
    //         pre.minus(post).minus(deposit.receipt.gasUsed * GAS_PRICE).toNumber().should.be.bignumber.equal((100 * oneEther));
    //     });

    //     it('Should revert if executed from an account which is not the owner of the RefundVault', async () => {
    //         await assertRevert(vault.deposit(contributorOne, exchangeRateOne, {
    //             from: notOwner,
    //             value: 100 * oneEther
    //         }));
    //     });

    //     it('Should revert if the contributor address given is a ZERO address', async () => {
    //         await assertRevert(vault.deposit(ZERO_ADDRESS, exchangeRateOne, {
    //             from: owner,
    //             value: 100 * oneEther
    //         }));
    //     });

    //     it('Should revert if the amount of ETH transfered is zero', async () => {
    //         await assertRevert(vault.deposit(contributorOne, exchangeRateOne, {
    //             from: owner,
    //             value: 0
    //         }));
    //     });

    //     it('Should revert if the exchange rate of PMA to ETH is zero', async () => {
    //         await assertRevert(vault.deposit(contributorOne, 0, {
    //             from: owner,
    //             value: 100 * oneEther
    //         }));
    //     });


    //     it('Should revert if executed when the RefundVault is at "Refunding" state', async () => {
    //         await vault.enableRefunds({
    //             from: owner
    //         });

    //         await assertRevert(vault.deposit(contributorOne, exchangeRateOne, {
    //             from: owner,
    //             value: 100 * oneEther
    //         }));
    //     });

    //     it('Should revert if executed when the RefundVault is at "Closed" state', async () => {
    //         await vault.enableRefunds({
    //             from: owner
    //         });

    //         await timeTravel(60 * DAY + 1);

    //         await vault.close({
    //             from: owner
    //         });

    //         await assertRevert(vault.deposit(contributorOne, exchangeRateOne, {
    //             from: owner,
    //             value: 100 * oneEther
    //         }));
    //     });

    //     describe('Commulative Deposits', () => {
    //         it('for different contributors should increase the unrefunded ETH Amount', async () => {
    //             await vault.deposit(contributorOne, exchangeRateOne, {
    //                 from: owner,
    //                 value: 100 * oneEther
    //             });

    //             await vault.deposit(contributorTwo, exchangeRateTwo, {
    //                 from: owner,
    //                 value: 100 * oneEther
    //             });

    //             await vault.deposit(contributorThree, exchangeRateThree, {
    //                 from: owner,
    //                 value: 100 * oneEther
    //             });

    //             const vaultUnrefundedETHAmount = await vault.unrefundedETHAmount();

    //             vaultUnrefundedETHAmount.should.be.bignumber.equal((300 * oneEther));
    //         });

    //         it('should allow commulative refund amount for contibutors', async () => {
    //             await vault.deposit(contributorTwo, exchangeRateTwo, {
    //                 from: owner,
    //                 value: 100 * oneEther
    //             });

    //             await vault.deposit(contributorTwo, exchangeRateTwo, {
    //                 from: owner,
    //                 value: 100 * oneEther
    //             });

    //             const depositedETH = await vault.depositedETH(contributorTwo);
    //             const depositedToken = await vault.depositedToken(contributorTwo);
    //             const vaultUnrefundedETHAmount = await vault.unrefundedETHAmount();
    //             const vaultBalance = await web3.eth.getBalance(vault.address);

    //             depositedETH.should.be.bignumber.equal((200 * oneEther));
    //             depositedToken.should.be.bignumber.equal((200 * oneEther * exchangeRateTwo));
    //             depositedETH.should.be.bignumber.equal(vaultUnrefundedETHAmount);
    //             vaultBalance.should.be.bignumber.equal((200 * oneEther));
    //         });
    //     });
    // });

    // describe('Enable Refunds', () => {
    //     beforeEach('Deploying new PumaPayToken', async () => {
    //         token = await PumaPayToken.new({
    //             from: owner
    //         });
    //     });

    //     beforeEach('Deploying new RefundVault', async () => {
    //         vault = await RefundVault.new(ethWallet, token.address, {
    //             from: owner
    //         });
    //     });

    //     it('should set the refund start time and change the state of the vault to "Refunding"', async () => {
    //         await vault.enableRefunds({
    //             from: owner
    //         });
    //         // const vaultRefundStartTime = await vault.refundStartTime();
    //         // const expectedRefundStartTime = Math.floor(Date.now() / 1000);
    //         const vaultState = await vault.state();

    //         // vaultRefundStartTime.should.be.bignumber.equal(expectedRefundStartTime);
    //         // assert.equal(vaultRefundStartTime, expectedRefundStartTime);
    //         assert.equal(vaultState, 1);
    //     });

    //     it('should revert if executed from an account which is not the owner of the "RefundVault"', async () => {
    //         await assertRevert(vault.enableRefunds({
    //             from: notOwner
    //         }));
    //     });

    //     it('should revert if executed when the state of the vault is "Refunding"', async () => {
    //         await vault.enableRefunds({
    //             from: owner
    //         });

    //         await assertRevert(vault.enableRefunds({
    //             from: owner
    //         }));
    //     });

    //     it('should revert if executed when the state of the vault is "Closed"', async () => {
    //         await vault.enableRefunds({
    //             from: owner
    //         });

    //         await timeTravel(60 * DAY);

    //         await vault.close({
    //             from: owner
    //         });

    //         await assertRevert(vault.enableRefunds({
    //             from: owner
    //         }));
    //     });
    // });

    // describe('Close', () => {
    //     beforeEach('Deploying new PumaPayToken', async () => {
    //         token = await PumaPayToken.new({
    //             from: owner
    //         });
    //     });

    //     beforeEach('Deploying new RefundVault', async () => {
    //         vault = await RefundVault.new(ethWallet, token.address, {
    //             from: owner
    //         });
    //     });

    //     it('should move the unrefunded ETH to the ETH wallet and change the state of the vault to "Closed"', async () => {
    //         await vault.deposit(contributorOne, exchangeRateOne, {
    //             from: owner,
    //             value: 100 * oneEther
    //         });

    //         await vault.deposit(contributorTwo, exchangeRateTwo, {
    //             from: owner,
    //             value: 100 * oneEther
    //         });

    //         await vault.enableRefunds({
    //             from: owner
    //         });

    //         await timeTravel(60 * DAY + 1);

    //         const walletBalancePre = await web3.eth.getBalance(ethWallet);

    //         await vault.close({
    //             from: owner
    //         });

    //         const vaultState = await vault.state();
    //         const walletBalancePost = await web3.eth.getBalance(ethWallet);
    //         const vaultBalance = await web3.eth.getBalance(vault.address);

    //         assert.equal(vaultState, 2);
    //         vaultBalance.should.be.bignumber.equal(0);
    //         walletBalancePost.minus(walletBalancePre).should.be.bignumber.equal(200 * oneEther);
    //     });

    //     it('shoud revert if executed from an account which is not the owner of the RefundVault', async () => {
    //         await assertRevert(vault.close({
    //             from: notOwner
    //         }));
    //     });

    //     it('shoud revert if executed with refund vault state is "Active"', async () => {
    //         await assertRevert(vault.close({
    //             from: owner
    //         }));
    //     });

    //     it('should revert if executed when the state of the vault to "Closed"', async () => {
    //         await vault.enableRefunds({
    //             from: owner
    //         });

    //         await timeTravel(60 * DAY + 1);

    //         await vault.close({
    //             from: owner
    //         });

    //         await assertRevert(vault.close({
    //             from: owner
    //         }));
    //     });

    //     it('shoud revert if executed before the refund time frame has passed', async () => {
    //         await vault.enableRefunds({
    //             from: owner
    //         });

    //         await timeTravel(30 * DAY);

    //         await assertRevert(vault.close({
    //             from: owner
    //         }));
    //     });
    // });


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
                const tokensToClaim = 100 * oneEther * exchangeRateOne;
                await assertRevert(vault.claimTokens(tokensToClaim, {
                    from: contributorOne
                }));
            });
        });
    });



    /* ------------------------------------------------------------------------------- */
    // describe('Claim Tokens', () => {
    //     describe('during "Active" state', () => {
    //         beforeEach('Deploying new PumaPayToken', async () => {
    //             token = await PumaPayToken.new({
    //                 from: owner
    //             });
    //         });

    //         beforeEach('Deploying new RefundVault', async () => {
    //             vault = await RefundVault.new(ethWallet, token.address, {
    //                 from: owner
    //             });
    //         });

    //         beforeEach('Deposit ETH for contributors', async () => {
    //             await vault.deposit(contributorOne, exchangeRateOne, {
    //                 from: owner,
    //                 value: 100 * oneEther
    //             });

    //             await vault.deposit(contributorTwo, exchangeRateTwo, {
    //                 from: owner,
    //                 value: 100 * oneEther
    //             });
    //             await vault.deposit(contributorThree, exchangeRateThree, {
    //                 from: owner,
    //                 value: 100 * oneEther
    //             });
    //         });

    //         it('should revert when contributors try to claim their tokens', async () => {
    //             const tokensToClaim = 100 * oneEther * exchangeRateOne;
    //             await assertRevert(vault.claimTokens(tokensToClaim, {
    //                 from: contributorOne
    //             }));
    //         });
    //     });

    //     describe('during "Refunding" state', () => {
    //         beforeEach('Deploying new PumaPayToken', async () => {
    //             token = await PumaPayToken.new({
    //                 from: owner
    //             });
    //         });

    //         beforeEach('Deploying new RefundVault', async () => {
    //             vault = await RefundVault.new(ethWallet, token.address, {
    //                 from: owner
    //             });
    //         });

    //         // beforeEach('Issue tokens to the RefundVault', async () => {
    //         //     await token.mint(vault.address, 100000 * oneEther * exchangeRateThree, {
    //         //         from: owner
    //         //     });
    //         //     console.log(await token.balanceOf(vault.address));
    //         // });

    //         beforeEach('Deposit ETH for contributors', async () => {
    //             await vault.deposit(contributorOne, exchangeRateOne, {
    //                 from: owner,
    //                 value: 10 * oneEther
    //             });

    //             await vault.deposit(contributorTwo, exchangeRateTwo, {
    //                 from: owner,
    //                 value: 10 * oneEther
    //             });
    //             await vault.deposit(contributorThree, exchangeRateThree, {
    //                 from: owner,
    //                 value: 10 * oneEther
    //             });
    //         });

    //         beforeEach('Change to "Refunding" state', async () => {
    //             await vault.enableRefunds({
    //                 from: owner
    //             });
    //         });

    //         it('should allow contributors to retrieve all their tokens', async () => {
    //             // await timeTravel(10);
    //             // const tokensToClaim = 100 * oneEther * exchangeRateOne;
    //             // await vault.claimTokens(tokensToClaim, {
    //             //     from: contributorOne
    //             // });
    //         });
    //     })
    //     // describe('during "Closed" state', () => {

    //     // });
    // });

    // describe('Refund ETH', () => {
    //     beforeEach('Deploying new PumaPayToken', async () => {
    //         token = await PumaPayToken.new({
    //             from: owner
    //         });
    //     });

    //     beforeEach('Deploying new RefundVault', async () => {
    //         vault = await RefundVault.new(ethWallet, token.address, {
    //             from: owner
    //         });
    //     });

    //     beforeEach('Deposit ETH for contributors', async () => {
    //         await vault.deposit(contributorOne, exchangeRateOne, {
    //             from: owner,
    //             value: 100 * oneEther
    //         });

    //         await vault.deposit(contributorTwo, exchangeRateTwo, {
    //             from: owner,
    //             value: 100 * oneEther
    //         });
    //         await vault.deposit(contributorThree, exchangeRateThree, {
    //             from: owner,
    //             value: 100 * oneEther
    //         });
    //     });

    //     beforeEach('Enable Refunds', async () => {
    //         await vault.enableRefunds({
    //             from: owner
    //         });
    //     });

    //     it('should subsctract the refunded ETH from the depositedETH for the contributor', async () => {
    //         await timeTravel(10000);
    //         console.log('contributorOne', await vault.depositedETH(contributorOne));
    //         const ethToRefund = 10 * oneEther;
    //         console.log('refund', ethToRefund);
    //         await vault.refundETH(ethToRefund, {
    //             from: contributorOne
    //         });

    //         // const depositedETH = await vault.depositedETH(contributorOne);
    //         // depositedETH.should.be.bignumber.equal(0);
    //     });
    // });
});