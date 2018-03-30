import assertRevert from './helpers/assertRevert';
const PumaPayToken = artifacts.require('PumaPayToken');

contract("PumaPayToken", async(accounts) => {

	let oneEth = web3.toWei(1, "ether");

	let owner = accounts[0];
	let notowner = accounts[9];

	let userOne = accounts[1];
	let userTwo = accounts[2];
	let userThree = accounts[3];

	let token;

	describe("Deploying", async() => {
		beforeEach("Deploying new PumaPayToken", async() => {
			token = await PumaPayToken.new();
		});
		it("Token name should be PumaPayToken", async() => {
			let tokenName = await token.name.call();

			assert.equal(tokenName.toString(), "PumaPayToken");
		});
		it("Token symbol should be PUM", async() => {
			let symbol = await token.symbol.call();

			assert.equal(symbol.toString(), "PUM");
		});
		it("Decimals is set to 18", async() => {
			let decimals = await token.decimals.call();

			assert.equal(decimals.toNumber(), 18);
		});
		it("Owner is set", async() => {
			let res = await token.owner.call();

			assert.equal(res.toString(), owner);
		});
		it("Minting is enabled uppon deployment", async() => {
			let mintingFinished = await token.mintingFinished.call();

			assert(!mintingFinished);
		});
		it("Initial total supply is empty", async() => {
			let totalSupply = await token.totalSupply.call();

			assert.equal(totalSupply.toNumber(), 0);
		});
	});

	describe("Minting functionalities", async() => {
		beforeEach("Deploying new PumaPayToken", async() => {
			token = await PumaPayToken.new();
		});
		it("Owner can mint", async() => {
			await token.mint(userOne, oneEth);
		});
		it("Rejects notowner from minting", async() => {
			await assertRevert(token.mint(userOne, oneEth, {
				"from" : notowner
			}));
		});
		it("Minting is cumulative", async() => {

			// userOne initial balance is 0
			let initialBalance =  await token.balanceOf.call(userOne);


			// Minting 10**18 PUM to userOne
			await token.mint(userOne, oneEth);
			let afterFirstMinting = await token.balanceOf.call(userOne);


			// Minting another 2*10**18 PUM to userOne
			await token.mint(userOne, 2*oneEth);
			let afterSecondMinting = await token.balanceOf.call(userOne);

			assert.equal(initialBalance.toNumber(), 0);
			assert.equal(afterFirstMinting.toNumber(), oneEth);
			assert.equal(afterSecondMinting.toNumber(), oneEth*3);
		});
		it("Owner can call finishMinting", async() => {
			await token.finishMinting();
		});
		it("Rejects notowner from calling finishMinting", async() => {
			await assertRevert(token.finishMinting({
				"from": notowner
			}));
		});
		it("Calling finishMinting changes the mintingFinished to true", async() => {
			await token.finishMinting();

			let mintingFinished = await token.mintingFinished.call();

			assert(mintingFinished);
		});
		it("Rejects minting attepts after minting finished", async() => {
			await token.finishMinting();
			await assertRevert(token.finishMinting());
		});
	});
	describe("Token functionalities during minting stage", async() => {
		beforeEach("Deploying new PumaPayToken and mint PUM", async() => {
			token = await PumaPayToken.new();
			await token.mint(userOne, 2*oneEth);
		});
		it("Can't transfer", async() => {
			await assertRevert(token.transfer(userTwo, oneEth, {
				"from": userOne
			}));
		});
	});
	describe("Token functionalities after minting stage", async() => {
		beforeEach("Deploying new PumaPayToken, mint PUM and finish minting stage", async() =>{
			token = await PumaPayToken.new();
			await token.mint(userOne, 2*oneEth);
			await token.finishMinting();
		});
		it("Can transfer", async() => {
			await token.transfer(userTwo, oneEth, {
				"from": userOne
			});
		});
		it("Can approve", async() => {
			await token.approve(userTwo, oneEth, {
				"from": userOne
			});
		});
		it("Can transfer from", async() => {
			await token.approve(userTwo, oneEth, {
				"from": userOne
			});
			await token.transferFrom(userOne, userTwo, oneEth, {
				"from": userTwo
			});
		});
		it("Can increase approve", async() => {
			await token.increaseApproval(userTwo, oneEth, {
				"from": userOne
			});
		});
		it("Can decrease approve", async() => {
			await token.decreaseApproval(userTwo, oneEth, {
				"from": userOne
			});
		});
	});
});
