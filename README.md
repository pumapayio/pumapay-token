# PumaPay Token


## Installing
Please ensure you have the latest nodejs installed on your machine.

The package can be installed using the command:
`npm install`

There are two modes of testing.
Full testing: `npm test`
Coverage testing: `npm run coverage`


### Usage
The address from which the contract was deployed will be set as the owner address. Only the owner can call the methods `mint()` and `finishMinting()`.

Minting is cumulative. Calling this method twice for the same address (with minting value greater than zero) will result in an increase of that address balance.

The tokens are not transferable until the owner invokes `finishMinting()`.

Once `finishMinting()` was invoked, it can't be reversed, i.e. no new tokens can be minted.