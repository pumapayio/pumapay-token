import assertRevert from './helpers/assertRevert';
import timeTravel from './helpers/timeHelper';
const PumaPayToken = artifacts.require('PumaPayToken');
const PumaPayVault = artifacts.require('PumaPayVault');
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

contract('PMA Vault Contract', async (accounts) => {
    const deployerAccount = accounts[0];
    const owner = accounts[1];

    let token;
    let vault;
    let now = 0;

    beforeEach('Deploying new PumaPayToken', async () => {
        token = await PumaPayToken.new({
            from: deployerAccount
        });
    });

    beforeEach('Deploying new PMA Vault ', async () => {
        vault = await PumaPayVault
            .new(owner, token.address, [10, 20, 30, 90, 180], [5, 10, 20, 50, 50], {
                from: deployerAccount
            });
    });

    describe('Deploying', async () => {
        beforeEach('Issue tokens to the PMA Vault', async () => {
            const tokens = MINTED_TOKENS * ONE_ETHER;
            await token.mint(vault.address, tokens, {
                from: deployerAccount
            });
        });

        it('PMA Vault owner should be the address that deployed the contract', async () => {
            const vaultOwner = await vault.owner();

            assert.equal(vaultOwner.toString(), owner);
        });

        it('PMA Vault owner should be the address that deployed the contract', async () => {
            const vaultOwner = await vault.owner();

            assert.equal(vaultOwner.toString(), owner);
        });

        it('PMA Vault lockedScheduleConstructed should be set to false', async () => {
            const lockedScheduleConstructed = await vault.lockedScheduleConstructed();

            assert.equal(lockedScheduleConstructed, false);
        });


        it('PMA Vault intervals should be the intervals specified during contract deployment', async () => {
            const vaultInterval1 = await vault.intervals(0);
            const vaultInterval2 = await vault.intervals(1);
            const vaultInterval3 = await vault.intervals(2);
            const vaultInterval4 = await vault.intervals(3);
            const vaultInterval5 = await vault.intervals(4);

            assert.equal(vaultInterval1, 10);
            assert.equal(vaultInterval2, 20);
            assert.equal(vaultInterval3, 30);
            assert.equal(vaultInterval4, 90);
            assert.equal(vaultInterval5, 180);
        });

        it('PMA Vault percentages should be the percentages specified during contract deployment', async () => {
            const vaultPercentage1 = await vault.percentages(0);
            const vaultPercentage2 = await vault.percentages(1);
            const vaultPercentage3 = await vault.percentages(2);
            const vaultPercentage4 = await vault.percentages(3);
            const vaultPercentage5 = await vault.percentages(4);

            assert.equal(vaultPercentage1, 5);
            assert.equal(vaultPercentage2, 10);
            assert.equal(vaultPercentage3, 20);
            assert.equal(vaultPercentage4, 50);
            assert.equal(vaultPercentage5, 50);
        });
    });

    describe('Deploying Failing', async () => {
        it('should revert when deploying a PMA Vault with ZERO owner address', async () => {
            await assertRevert(PumaPayVault
                .new(ZERO_ADDRESS, token.address, [10, 20, 30, 180], [5, 10, 20, 50], {
                    from: deployerAccount
                }));
        });

        it('should revert when deploying a PMA Vault with ZERO token address', async () => {
            await assertRevert(PumaPayVault
                .new(owner, ZERO_ADDRESS, [10, 20, 30, 180], [5, 10, 20, 50], {
                    from: deployerAccount
                }));
        });

        it('should revert when deploying a PMA Vault with ZERO interval', async () => {
            await assertRevert(PumaPayVault
                .new(owner, ZERO_ADDRESS, [10, 0, 30, 180], [5, 10, 20, 50], {
                    from: deployerAccount
                }));
        });

        it('should revert when deploying a PMA Vault with ZERO percentage', async () => {
            await assertRevert(PumaPayVault
                .new(owner, ZERO_ADDRESS, [10, 0, 30, 180], [5, 10, 0, 50], {
                    from: deployerAccount
                }));
        });

        it('should revert when deploying a PMA Vault unequal interval and percentage arrays', async () => {
            await assertRevert(PumaPayVault
                .new(owner, ZERO_ADDRESS, [10, 0, 30, 180, 200], [5, 10, 0, 50], {
                    from: deployerAccount
                }));
        });
    });

    describe('Constructing Locked Down Schedule', async () => {
        beforeEach('Issue tokens to the PMA Vault', async () => {
            const tokens = MINTED_TOKENS * ONE_ETHER;
            await token.mint(vault.address, tokens, {
                from: deployerAccount
            });

            await token.finishMinting({
                from: deployerAccount
            });
        });

        beforeEach('Call construct Locked Down Schedule function', async () => {
            await vault.constructLockedDownSchedule({
                from: owner
            });
            now = await web3.eth.getBlock(web3.eth.blockNumber).timestamp;
        });

        it('PMA Vault should have the next unlocked time set', async () => {
            const nextUnlockedTimestamp = await vault.nextUnlockedTimestamp();

            assert.equal(nextUnlockedTimestamp, now + 10 * DAY);
        });

        it('PMA Vault should have the unlocked amount of tokens for the next time set', async () => {
            const amountOfTokensAllowedForWithdrawal = await vault.amountOfTokensAllowedForWithdrawal();

            amountOfTokensAllowedForWithdrawal.should.be.bignumber.equal(MINTED_TOKENS * ONE_ETHER * 0.05);
        });

        it('PMA Vault should set the lockedScheduleConstructed to true', async () => {
            const lockedScheduleConstructed = await vault.lockedScheduleConstructed();

            assert.equal(lockedScheduleConstructed, true);
        });
    });

    describe('Constructing Locked Down Schedule will fail', async () => {
        it('when there are no tokens in the vault', async () => {
            await assertRevert(vault.constructLockedDownSchedule({
                from: owner
            }));
        });

        it('when executed from other acount than the owner', async () => {
            await assertRevert(vault.constructLockedDownSchedule({
                from: deployerAccount
            }));
        });

        it('when executed twice', async () => {
            const tokens = MINTED_TOKENS * ONE_ETHER;
            await token.mint(vault.address, tokens, {
                from: deployerAccount
            });

            await vault.constructLockedDownSchedule({
                from: owner
            });

            await assertRevert(vault.constructLockedDownSchedule({
                from: owner
            }));
        });
    });

    describe('Set Next Withdrawal Details', () => {
        beforeEach('Issue tokens to the PMA Vault', async () => {
            const tokens = MINTED_TOKENS * ONE_ETHER;
            await token.mint(vault.address, tokens, {
                from: deployerAccount
            });
        });

        beforeEach('Call construct Locked Down Schedule function', async () => {
            await vault.constructLockedDownSchedule({
                from: owner
            });
            now = await web3.eth.getBlock(web3.eth.blockNumber).timestamp;
        });

        it('should set the next withdrawal details based on the current time', async () => {
            await vault.setNextWithdrawalDetails({
                from: owner
            });
            const nextUnlockedTimestamp = await vault.nextUnlockedTimestamp();
            const amountOfTokensAllowedForWithdrawal = await vault.amountOfTokensAllowedForWithdrawal();

            nextUnlockedTimestamp.should.be.bignumber.equal(now + 10 * DAY);
            amountOfTokensAllowedForWithdrawal.should.be.bignumber.equal(MINTED_TOKENS * ONE_ETHER * 0.05);
        });

        it('should revert if executed when the vault is open 1 second before it closes', async () => {
            await timeTravel(12 * DAY - 2);
            await assertRevert(vault.setNextWithdrawalDetails({
                from: owner
            }));
        });

        it('should set the next withdrawal details based on the current time after the first interval has passed', async () => {
            await timeTravel(12 * DAY);
            await vault.setNextWithdrawalDetails({
                from: owner
            });
            const nextUnlockedTimestamp = await vault.nextUnlockedTimestamp();
            const amountOfTokensAllowedForWithdrawal = await vault.amountOfTokensAllowedForWithdrawal();

            nextUnlockedTimestamp.should.be.bignumber.equal(now + 20 * DAY);
            amountOfTokensAllowedForWithdrawal.should.be.bignumber.equal(MINTED_TOKENS * ONE_ETHER * 0.1);
        });

        it('should revert if executed when the vault is open - once it is open', async () => {
            await timeTravel(10 * DAY);
            await assertRevert(vault.setNextWithdrawalDetails({
                from: owner
            }));
        });

        it('should revert when not executed by the owner', async () => {
            await assertRevert(vault.setNextWithdrawalDetails({
                from: deployerAccount
            }));
        });

        it('should emit a "LogNextUnlockTimestamp" event', async () => {
            const setNextWithdrawalDetails = await vault.setNextWithdrawalDetails({
                from: owner
            });
            const logs = setNextWithdrawalDetails.logs;
            assert.equal(logs.length, 2);
            assert.equal(logs[0].event, 'LogNextUnlockTimestamp');
            logs[0].args.nextUnlockedTimestamp.should.be.bignumber.equal(now + 10 * DAY);
        });

        it('should emit a "LogNTokensAllowedForWithdrawal" event', async () => {
            const setNextWithdrawalDetails = await vault.setNextWithdrawalDetails({
                from: owner
            });
            const logs = setNextWithdrawalDetails.logs;
            assert.equal(logs.length, 2);
            assert.equal(logs[1].event, 'LogNTokensAllowedForWithdrawal');
            logs[1].args.tokensAllowedForWithdrawal.should.be.bignumber.equal(MINTED_TOKENS * ONE_ETHER * 0.05);
        });
    });

    describe('Withdraw Tokens', () => {
        beforeEach('Issue tokens to the PMA Vault', async () => {
            const tokens = MINTED_TOKENS * ONE_ETHER;
            await token.mint(vault.address, tokens, {
                from: deployerAccount
            });

            await token.finishMinting({
                from: deployerAccount
            });
        });

        beforeEach('Construct Locked Down Schedule', async () => {
            await vault.constructLockedDownSchedule({
                from: owner
            });
            now = await web3.eth.getBlock(web3.eth.blockNumber).timestamp;
        });

        it('should allow for the onwer to withraw tokens during unlocked period', async () => {
            await timeTravel(29 * DAY);
            await vault.setNextWithdrawalDetails({
                from: owner
            });
            await timeTravel(1 * DAY);

            const tokensToWithdraw = MINTED_TOKENS * ONE_ETHER * 0.2;

            await vault.withdrawTokens(tokensToWithdraw, {
                from: owner
            });
            const ownerBalance = await token.balanceOf(owner);

            ownerBalance.should.be.bignumber.equal(MINTED_TOKENS * ONE_ETHER * 0.2);
        });

        it('should allow for the onwer to withraw tokens during consecutive unlocked periods', async () => {
            await timeTravel(89 * DAY);
            await vault.setNextWithdrawalDetails({
                from: owner
            });
            await timeTravel(1 * DAY);

            const tokensToWithdraw = MINTED_TOKENS * ONE_ETHER * 0.5;

            await vault.withdrawTokens(tokensToWithdraw, {
                from: owner
            });
            await timeTravel(2 * DAY);
            await vault.setNextWithdrawalDetails({
                from: owner
            });
            await timeTravel(88 * DAY);
            await vault.withdrawTokens(tokensToWithdraw / 2, {
                from: owner
            });

            const ownerBalance = await token.balanceOf(owner);

            ownerBalance.should.be.bignumber.equal(tokensToWithdraw + tokensToWithdraw / 2);
        });

        it('should fail when the owner tries to withdraw higher amount than the one allowed', async () => {
            await timeTravel(29 * DAY);
            await vault.setNextWithdrawalDetails({
                from: owner
            });
            await timeTravel(1 * DAY);

            const tokensToWithdraw = MINTED_TOKENS * ONE_ETHER * 0.2 + 100000;

            await assertRevert(vault.withdrawTokens(tokensToWithdraw, {
                from: owner
            }));
        });

        it('should not allow the onwer to withraw tokens outside the unlocked period', async () => {
            await timeTravel(40 * DAY);
            await assertRevert(vault.withdrawTokens(MINTED_TOKENS * ONE_ETHER * 0.2, {
                from: owner
            }));
        });

        it('should fail when not executed by the owner', async () => {
            await timeTravel(29 * DAY);
            await vault.setNextWithdrawalDetails({
                from: owner
            });
            await timeTravel(1 * DAY);
            await assertRevert(vault.withdrawTokens(MINTED_TOKENS * ONE_ETHER * 0.2, {
                from: deployerAccount
            }));
        });
    });
});