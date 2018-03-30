1. Deploy the contract using Ledger hardware wallet to the Ethereum main net
2. Verify and publish the contract code on Etherscan.io
3. Verify that the owner of the deployed contract is indeed the account managed by the Ledger hardware wallet
4. Mint presale allocation* - execute the mint function of the contract to mint tokens to the presale allocation address
5. Mint reserve allocation* - execute the mint function of the contract to mint tokens to the reserve allocation address
6. Finish minting - execute the finishMinting function of the contract to prevent further minting

* IMPORTANT - note that the minting function does not multiply by the decimals factor, thus to mint 5 tokens the command should be mint(5*10^18)