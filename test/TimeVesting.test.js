import assertRevert from './helpers/assertRevert';
import timeTravel from './helpers/timeHelper';
const TimeVesting = artifacts.require('TimeVesting');
const PumaPayToken = artifacts.require('PumaPayToken');
const BigNumber = web3.BigNumber;

require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const MINUTE = 60; // 60 seconds
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ONE_ETHER = web3.toWei(1, 'ether');
const MINTED_TOKENS = 2000;

contract('Time Vesting Contract', async (accounts) => {
    const deployerAccount = accounts[0];
    const owner = accounts[1];

    let token;
    let vestingContract;
    let now = 0;

    beforeEach('Deploying new PumaPayToken', async () => {
        token = await PumaPayToken.new({
            from: deployerAccount
        });
    });

    beforeEach('Deploying new Time Vesting Contract ', async () => {
        vestingContract = await TimeVesting
            .new(token.address, owner, 10, 20, {
                from: deployerAccount
            });
    });

    describe('Deploying', async () => {
        it('Time Vesting Contract owner should be the address that was set during deployment of the contract', async () => {
            const contractOwner = await vestingContract.owner();

            assert.equal(contractOwner.toString(), owner);
        });

        it('Time Vesting Contract token should be the token address that was set during deployment of the contract', async () => {
            const contractToken = await vestingContract.token();

            assert.equal(contractToken, token.address);
        });

        it('Time Vesting Contract unlock period in days should be the number of days that was set during deployment of the contract', async () => {
            const contractUnlockPeriodInDays = await vestingContract.unlockPeriodInDays();

            contractUnlockPeriodInDays.should.be.bignumber.equal(10);
        });

        it('Time Vesting Contract unlock percentage should be the number of percentage that was set during deployment of the contract', async () => {
            const contractUnlockPercetage = await vestingContract.unlockPercentage();

            contractUnlockPercetage.should.be.bignumber.equal(20);
        });

        it('Time Vesting Contract next vesting period should be NOW plus the number of unlock period in days that was set during deployment of the contract', async () => {
            now = await web3.eth.getBlock(web3.eth.blockNumber).timestamp;
            const contractNextVestingPeriod = await vestingContract.nextVestingPeriod();

            contractNextVestingPeriod.should.be.bignumber.equal(now + 10 * DAY);
        });

        it('Time Vesting Contract Vesting unlock percentage should be the number of percentage that was set during deployment of the contract', async () => {
            const contractVestingUlockedPercentage = await vestingContract.vestingUnlockedPercentage();

            contractVestingUlockedPercentage.should.be.bignumber.equal(20);
        });

        it('Time Vesting Contract withdrawn Tokens should be the set to zero', async () => {
            const contractWithdrawnTokens = await vestingContract.withdrawnTokens();

            contractWithdrawnTokens.should.be.bignumber.equal(0);
        });

        it('Time Vesting Contract initial token balance should be the set to zero', async () => {
            const contractInitialTokenBalance = await vestingContract.initialTokenBalance();

            contractInitialTokenBalance.should.be.bignumber.equal(0);
        });
    });

    describe('Failed Deployment', () => {
        it('Time Vesting Contract should fail when the token address is set to ZERO_ADDRESS', async () => {
            await assertRevert(TimeVesting
                .new(ZERO_ADDRESS, owner, 10, 20, {
                    from: deployerAccount
                }));
        });

        it('Time Vesting Contract should fail when the owner is set to ZERO_ADDRESS', async () => {
            await assertRevert(TimeVesting
                .new(token.address, ZERO_ADDRESS, 10, 20, {
                    from: deployerAccount
                }));
        });

        it('Time Vesting Contract should fail when the period is set to ZERO', async () => {
            await assertRevert(TimeVesting
                .new(token.address, owner, 0, 20, {
                    from: deployerAccount
                }));
        });

        it('Time Vesting Contract should fail when the percentage is set to ZERO', async () => {
            await assertRevert(TimeVesting
                .new(token.address, owner, 10, 0, {
                    from: deployerAccount
                }));
        });

        it('Time Vesting Contract should fail when the percentage is set to 100 or higher', async () => {
            await assertRevert(TimeVesting
                .new(token.address, owner, 10, 100, {
                    from: deployerAccount
                }));
        });

        it('Time Vesting Contract should fail when the percentage is not dividing 100 exactly', async () => {
            await assertRevert(TimeVesting
                .new(token.address, owner, 10, 30, {
                    from: deployerAccount
                }));
        });
    });

    describe('Set initial token balance', () => {
        it('should allow for setting the initial token balance', async () => {
            const tokens = MINTED_TOKENS * ONE_ETHER;
            await token.mint(vestingContract.address, tokens, {
                from: deployerAccount
            });

            await vestingContract.setInitialTokenBalance({
                from: owner
            });

            const initialBalance = await vestingContract.initialTokenBalance();

            initialBalance.should.be.bignumber.equal(tokens);
        });

        it('should fail when executed after the initial balance is set', async () => {
            const tokens = MINTED_TOKENS * ONE_ETHER;
            await token.mint(vestingContract.address, tokens, {
                from: deployerAccount
            });
            await vestingContract.setInitialTokenBalance({
                from: owner
            });

            await assertRevert(vestingContract.setInitialTokenBalance({
                from: owner
            }));
        });

        it('should fail when not executed by the onwer', async () => {
            const tokens = MINTED_TOKENS * ONE_ETHER;
            await token.mint(vestingContract.address, tokens, {
                from: deployerAccount
            });

            await assertRevert(vestingContract.setInitialTokenBalance({
                from: deployerAccount
            }));
        });

        it('should fail when contract does not hold tokens', async () => {
            await assertRevert(vestingContract.setInitialTokenBalance({
                from: owner
            }));
        });

        it('should emit a "LogInitialBalanceSet" event', async () => {
            const tokens = MINTED_TOKENS * ONE_ETHER;
            await token.mint(vestingContract.address, tokens, {
                from: deployerAccount
            });

            const setInitialTokenBalance = await vestingContract.setInitialTokenBalance({
                from: owner
            });
            const logs = setInitialTokenBalance.logs;
            assert.equal(logs.length, 1);
            assert.equal(logs[0].event, 'LogInitialBalanceSet');
            logs[0].args.amount.should.be.bignumber.equal(MINTED_TOKENS * ONE_ETHER);
        });
    });

    describe('Update Vesting Details', () => {
        beforeEach('Issue tokens to the PMA Vault', async () => {
            const tokens = MINTED_TOKENS * ONE_ETHER;
            await token.mint(vestingContract.address, tokens, {
                from: deployerAccount
            });
        });

        it('should allow the owner to update the unlocked percentage', async () => {
            await vestingContract.setInitialTokenBalance({
                from: owner
            });
            await timeTravel(10 * DAY);
            await vestingContract.updateVestingDetails({
                from: owner
            });

            const unlockedPercentage = await vestingContract.vestingUnlockedPercentage();

            unlockedPercentage.should.be.bignumber.equal(40);
        });

        it('should allow the owner to update the next vestion period', async () => {
            await vestingContract.setInitialTokenBalance({
                from: owner
            });
            await timeTravel(10 * DAY);
            await vestingContract.updateVestingDetails({
                from: owner
            });
            now = await web3.eth.getBlock(web3.eth.blockNumber).timestamp;
            const nextVestingPeriod = await vestingContract.nextVestingPeriod();

            if (now + 10 * DAY == nextVestingPeriod) {
                nextVestingPeriod.should.be.bignumber.equal(now + 10 * DAY);
            } else {
                nextVestingPeriod.should.be.bignumber.equal(now + 10 * DAY - 1);
            }
        });

        it('should allow the owner for commulative updates in case of missed update period and percentage', async () => {
            await vestingContract.setInitialTokenBalance({
                from: owner
            });
            await timeTravel(50 * DAY);
            await vestingContract.updateVestingDetails({
                from: owner
            });
            await vestingContract.updateVestingDetails({
                from: owner
            });
            await vestingContract.updateVestingDetails({
                from: owner
            });
            await vestingContract.updateVestingDetails({
                from: owner
            });
            const unlockedPercentage = await vestingContract.vestingUnlockedPercentage();

            unlockedPercentage.should.be.bignumber.equal(100);
        });

        it('should fail when the percentage is invalid i.e. above 100', async () => {
            await vestingContract.setInitialTokenBalance({
                from: owner
            });
            await timeTravel(60 * DAY);
            await vestingContract.updateVestingDetails({
                from: owner
            });
            await vestingContract.updateVestingDetails({
                from: owner
            });
            await vestingContract.updateVestingDetails({
                from: owner
            });
            await vestingContract.updateVestingDetails({
                from: owner
            });
            await assertRevert(vestingContract.updateVestingDetails({
                from: deployerAccount
            }));
        });

        it('should fail when the is executed by someone besides the owner', async () => {
            await vestingContract.setInitialTokenBalance({
                from: owner
            });
            await timeTravel(10 * DAY);
            await assertRevert(vestingContract.updateVestingDetails({
                from: deployerAccount
            }));
        });

        it('should fail when the owner to tries to update not in a valid period', async () => {
            await vestingContract.setInitialTokenBalance({
                from: owner
            });
            await timeTravel(9 * DAY);
            await assertRevert(vestingContract.updateVestingDetails({
                from: owner
            }));
        });

        it('should fail when the initial balance is not set', async () => {
            await timeTravel(10 * DAY);
            await assertRevert(vestingContract.updateVestingDetails({
                from: deployerAccount
            }));
        });

        it('should emit a "LogVestingDetails" event', async () => {
            await vestingContract.setInitialTokenBalance({
                from: owner
            });
            await timeTravel(10 * DAY);
            const updateVestingDetails = await vestingContract.updateVestingDetails({
                from: owner
            });
            now = await web3.eth.getBlock(web3.eth.blockNumber).timestamp;
            const logs = updateVestingDetails.logs;
            assert.equal(logs.length, 1);
            assert.equal(logs[0].event, 'LogVestingDetails');
            logs[0].args.vestingUnlockedPercentage.should.be.bignumber.equal(40);
        });
    });

    describe('Withdraw Sucessfully', () => {
        beforeEach('Issue tokens to the PMA Vault', async () => {
            const tokens = MINTED_TOKENS * ONE_ETHER;
            await token.mint(vestingContract.address, tokens, {
                from: deployerAccount
            });

            await token.finishMinting({
                from: deployerAccount
            });
        });

        beforeEach('Set Initial Token Balance', async () => {
            await vestingContract.setInitialTokenBalance({
                from: owner
            });
        });

        it('should allow the owner to withdraw tokens right away', async () => {
            const allowedAmount = MINTED_TOKENS * ONE_ETHER * 0.2;
            await vestingContract.withdrawAllowedAmount({
                from: owner
            });
            const ownerBalance = await token.balanceOf(owner);

            ownerBalance.should.be.bignumber.equal(allowedAmount);
        });

        it('should set the withdrawn amount', async () => {
            const allowedAmount = MINTED_TOKENS * ONE_ETHER * 0.2;
            await vestingContract.withdrawAllowedAmount({
                from: owner
            });
            const withdrawnTokens = await vestingContract.withdrawnTokens();

            withdrawnTokens.should.be.bignumber.equal(allowedAmount);
        });

        it('should allow the owner to withdraw tokens after vesting periods', async () => {
            await vestingContract.withdrawAllowedAmount({
                from: owner
            });
            let ownerBalance = await token.balanceOf(owner);
            let withdrawnTokens = await vestingContract.withdrawnTokens();
            ownerBalance.should.be.bignumber.equal(MINTED_TOKENS * ONE_ETHER * 0.2);
            withdrawnTokens.should.be.bignumber.equal(MINTED_TOKENS * ONE_ETHER * 0.2);

            await timeTravel(10 * DAY);
            await vestingContract.updateVestingDetails({
                from: owner
            });
            await vestingContract.withdrawAllowedAmount({
                from: owner
            });
            ownerBalance = await token.balanceOf(owner);
            withdrawnTokens = await vestingContract.withdrawnTokens();
            ownerBalance.should.be.bignumber.equal(MINTED_TOKENS * ONE_ETHER * 0.4);
            withdrawnTokens.should.be.bignumber.equal(MINTED_TOKENS * ONE_ETHER * 0.4);

            await timeTravel(10 * DAY);
            await vestingContract.updateVestingDetails({
                from: owner
            });
            await vestingContract.withdrawAllowedAmount({
                from: owner
            });
            ownerBalance = await token.balanceOf(owner);
            withdrawnTokens = await vestingContract.withdrawnTokens();
            ownerBalance.should.be.bignumber.equal(MINTED_TOKENS * ONE_ETHER * 0.6);
            withdrawnTokens.should.be.bignumber.equal(MINTED_TOKENS * ONE_ETHER * 0.6);
        });

        it('should allow the owner to withdraw tokens after consecutive missed withdrawals', async () => {
            await timeTravel(50 * DAY);
            await vestingContract.updateVestingDetails({
                from: owner
            });
            await vestingContract.updateVestingDetails({
                from: owner
            });
            await vestingContract.updateVestingDetails({
                from: owner
            });
            await vestingContract.updateVestingDetails({
                from: owner
            });
            await vestingContract.withdrawAllowedAmount({
                from: owner
            });

            const ownerBalance = await token.balanceOf(owner);

            ownerBalance.should.be.bignumber.equal(MINTED_TOKENS * ONE_ETHER);
        });

        it('should allow the owner to withdraw tokens after consecutive vesting periods', async () => {
            await timeTravel(20 * DAY);
            await vestingContract.updateVestingDetails({
                from: owner
            });
            await vestingContract.updateVestingDetails({
                from: owner
            });
            const allowedAmount = MINTED_TOKENS * ONE_ETHER * 0.6;
            await vestingContract.withdrawAllowedAmount({
                from: owner
            });
            const ownerBalance = await token.balanceOf(owner);

            ownerBalance.should.be.bignumber.equal(allowedAmount);
        });

        it('should fail when executed by NOT the owner', async () => {
            await assertRevert(vestingContract.withdrawAllowedAmount({
                from: deployerAccount
            }));
        });

        it('should fail after all the tokens have been withdrawn by the owner', async () => {
            await timeTravel(50 * DAY);
            await vestingContract.updateVestingDetails({
                from: owner
            });
            await vestingContract.updateVestingDetails({
                from: owner
            });
            await vestingContract.updateVestingDetails({
                from: owner
            });
            await vestingContract.updateVestingDetails({
                from: owner
            });
            await vestingContract.withdrawAllowedAmount({
                from: owner
            });

            await assertRevert(vestingContract.withdrawAllowedAmount({
                from: owner
            }));
        });

        it('should emit a "LogWithdraw" event', async () => {
            const withdrawAllowedAmount = await vestingContract.withdrawAllowedAmount({
                from: owner
            });

            const logs = withdrawAllowedAmount.logs;
            assert.equal(logs.length, 1);
            assert.equal(logs[0].event, 'LogWithdraw');
            logs[0].args.amount.should.be.bignumber.equal(MINTED_TOKENS * ONE_ETHER * 0.2);
        });
    });

    describe('Withdraw Failed', () => {
        let failedVestingContract;
        beforeEach('Deploying new Time Vesting Contract ', async () => {
            failedVestingContract = await TimeVesting
                .new(token.address, owner, 10, 20, {
                    from: deployerAccount
                });
        });
        beforeEach('Issue tokens to the PMA Vault', async () => {
            const tokens = MINTED_TOKENS * ONE_ETHER;
            await token.mint(failedVestingContract.address, tokens, {
                from: deployerAccount
            });

            await token.finishMinting({
                from: deployerAccount
            });
        });

        it('should fail when the initial token balance is not set', async () => {
            await assertRevert(failedVestingContract.withdrawAllowedAmount({
                from: owner
            }));
        });
    });
});