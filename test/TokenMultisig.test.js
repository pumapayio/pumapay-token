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
const GAS_PRICE = 100000000000;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ONE_ETHER = web3.toWei(1, 'ether');
const DEPOSITED_TOKENS = 2000;

contract('Token Multisig', async (accounts) => {
    const deployerAccount = accounts[0];
    const superOwner = accounts[1];
    const normalOwner = accounts[2]; 
    const ethWallet = accounts[3];
    const requiredOwners = 2;

    let token;
    let wallet;

    // describe('Deploying', async () => {
    //     beforeEach('Deploying new PumaPayToken', async () => {
    //         token = await PumaPayToken.new({
    //             from: deployerAccount
    //         });
    //     });

    //     beforeEach('Deploying new Token Multisig ', async () => {
    //         wallet = await MultiSig.new(superOwner, normalOwner, requiredOwners, token.address, {
    //             from: deployerAccount
    //         });
    //     });

    //     it('Token Multisig super owner should be the one used in deployment', async () => {
    //         const walletSuperOwner = await wallet.superOwner();

    //         assert.equal(walletSuperOwner.toString(), superOwner);
    //     });

    //     it('Token Multisig super owner should be the owner on index 0 and equal to the normal owner used in deployment', async () => {
    //         const walletSuperOwner = await wallet.owners(0);

    //         assert.equal(walletSuperOwner.toString(), superOwner);
    //     });

    //     it('Token Multisig normal owner should be the owner on index 1 and equal to the normal owner used in deployment', async () => {
    //         const walletNormalOwner = await wallet.owners(1);

    //         assert.equal(walletNormalOwner.toString(), normalOwner);
    //     });

    //     it('Token Multisig Super and Normal owners should be in the isOwner list', async () => {
    //         const walletSuperOwner = await wallet.isOwner(superOwner);
    //         const walletNormalOwner = await wallet.isOwner(normalOwner);

    //         assert.equal(walletSuperOwner, true);
    //         assert.equal(walletNormalOwner, true);
    //     });

    //     it('Token Multisig required signatures should be equal to the one used on deployment', async() => {
    //         const walletRequiredSignatures = await wallet.requiredSignatures();
            
    //         assert.equal(walletRequiredSignatures, requiredOwners);
    //     });

    //     it('Token Multisig token address should be equal with the token address used on deployment', async () => {
    //         const walletToken = await wallet.token();
            
    //         assert.equal(walletToken, token.address);
    //     });

    //     it('Token Multisig token address should be equal with the token address used on deployment', async () => {
    //         const walletToken = await wallet.token();
            
    //         assert.equal(walletToken, token.address);
    //     });

    //     it('Token Multisig owner count should be equal to 2', async () => {
    //         const walletOwnerCount = await wallet.ownerCount();
            
    //         assert.equal(walletOwnerCount, 2);
    //     });

    //     it('Should revert if the super owner address given is a ZERO address', async () => {
    //         await assertRevert(MultiSig.new(ZERO_ADDRESS, normalOwner, requiredOwners, token.address, {
    //             from: deployerAccount
    //         }));
    //     });

    //     it('Should revert if the normal owner address given is a ZERO address', async () => {
    //         await assertRevert(MultiSig.new(superOwner, ZERO_ADDRESS, requiredOwners, token.address, {
    //             from: deployerAccount
    //         }));
    //     });

    //     it('Should revert if the required owners is not 2', async () => {
    //         await assertRevert(MultiSig.new(superOwner, normalOwner, 0, token.address, {
    //             from: deployerAccount
    //         }));
    //     });

    //     it('Should revert if the token address is a ZERO address owners is not 2', async () => {
    //         await assertRevert(MultiSig.new(superOwner, normalOwner, 0, ZERO_ADDRESS, {
    //             from: deployerAccount
    //         }));
    //     });
    // });

    describe('claimAllTokensAfterTimeLock', async () => {
        beforeEach('Deploying new PumaPayToken', async () => {
            token = await PumaPayToken.new({
                from: deployerAccount
            });
        });

        beforeEach('Deploying new Token Multisig', async () => {
            wallet = await MultiSig.new(superOwner, normalOwner, requiredOwners, token.address, {
                from: deployerAccount
            });
        });

        beforeEach('Issue tokens to the Token Multisig', async () => {
            const tokens = DEPOSITED_TOKENS * ONE_ETHER; 
            await token.mint(wallet.address, tokens, {
                from: deployerAccount
            });

            await token.finishMinting({
                from: deployerAccount
            });
        });

        beforeEach('Fast forward 120 days', async () => {
            await timeTravel(120 * DAY);
        });

        it('Wallet should transfer all the tokens to an eth Wallet', async () => {
            const tokens = DEPOSITED_TOKENS * ONE_ETHER; 
            wallet.claimAllTokensAfterTimeLock(ethWallet, {
                from: superOwner
            });

            const tokenClaimed = await token.balanceOf(ethWallet);

            tokenClaimed.should.be.bignumber.equal(tokens);
        });

            it('Should revert if the token address is a ZERO address owners is not 2', async () => {
            await assertRevert(MultiSig.new(superOwner, normalOwner, 0, ZERO_ADDRESS, {
                from: deployerAccount
            }));
        });
    });
}); 