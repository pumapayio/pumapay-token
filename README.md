
# PumaPay Smart Contracts
## PumaPay Token
The [PumaPay token](./contracts/PumaPayToken.sol) is based on the [ERC-20 Token standard](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md) developed in Solidity and deployed on the Ethereum network on our TGE which occured on May 7th 2018.

#### Usage
The address from which the contract is deployed will be set as the owner address. Only the owner can call the methods `mint()` and `finishMinting()`.  
Minting is cumulative. Calling this method twice for the same address (with minting value greater than zero) will result in an increase of that address balance.  
The tokens are not transferable until the owner invokes `finishMinting()`.  
Once `finishMinting()` was invoked, it can't be reversed, i.e. no new tokens can be minted.  
ETH Address: [0x846c66cf71c43f80403b51fe3906b3599d63336f](https://etherscan.io/token/0x846c66cf71c43f80403b51fe3906b3599d63336f)  
Total Amount of Tokens: 78,042,956,829 PMA

## PumaPay Pull Payment Protocol
The PumaPay Pull Payment Protocol supports an advanced "pull" mechanism, which allows users to not only push tokens from one wallet to another but to also pull funds from other wallets after prior authorization has been given.
Our Pull Payment Protocol currently supports a variaty of payments models such as:
* Single Pull Payment
* Recurring Pull Payment (Fixed amount)
* Recurring Pull Payment with initial payment
* Recurring Pull Payment with trial period
* Recurring Pull Payment with initial payment and trial period  
The first version of our protocol has a semi-decentralized approach in order to reduced the gas fees that are involved with setting the PMA/Fiat rates on the blockchain and eliminate the customer costs for registering and cancelling pull payments, which are currently taken care of by PumaPay through the smart contract.  
In order for the smart contract to operate correctly, it requires that the smart contract holds ETH which are used for funding the owner address and the executors. 
The smart contract will be monitored and once its balance drops below 2 ETH it will be funded with more ETH.
### PullPayment Contract 
##### Contract constructor
Sets the token address that the contract facilitates.
```solidity
constructor (PumaPayToken _token)
```
##### Payable
Allows the `PumaPayPullPayment` contract to receive ETH to facilitate the funding of owner/executors.
```solidity
function () external payable
```
#### Members
##### Owner
Our `PumaPayPullPayment` contract is `ownable`. 
```solidity
contract PumaPayPullPayment is Ownable
```
The owner (only one) of the smart contract is responsible for:
1. Setting the PMA/Fiat rates `function setRate(string _currency, uint256 _rate)`
2. Add executors `function addExecutor(address _executor)`
3. Remove executor `function removeExecutor(address _executor)`  
On each function related with setting the rate or adding/removing executors the balance of the owner is checked and if the balance is lower than 0.01 ETH then 1 more ETH are sent to the owner address in order to pay for the gas fees related with those transactions.  
The owner is an address owned by the association governing the smart contract.
```
if (isFundingNeeded(owner)) {
    owner.transfer(1 ether);
}
```
##### Executors
The `PumaPayPullPayment` contract can have multiple executors. Each executor is allowed to register or cancel a pull payment on behalf of a customer. The curstomer should sign the pull payment details using `keccak256` through the wallet and on registration/cancellation the signature parameters `(v, r, s)` of the signed pull payment are used to verify that the customer address was indeed the one which requested the registration/cancellation. Similarily to the owner, on registration/cancellation function the balance of the executor is checked and if is lower than 0.01 ETH 1 more ETH is sent from the smart contract to the executor to allow for registration/cancellation of pull payments.  
The executor(s) is an address owned by the association governing the smart contract.
```solidity
mapping (address => bool) public executors;
```
##### PullPayment
The `PumaPayPullPayment` contract consists of a for the `PullPayments`. 
The first address is the customer address and the second one is the merchant address.
```solidity
mapping (address => mapping (address => PullPayment)) public pullPayments;
```
The `PullPayment` struct is the following:
```solidity
struct PullPayment {
    string merchantID;                      /// ID of the merchant
    string paymentID;                       /// ID of the payment
    string currency;                        /// 3-letter abbr i.e. 'EUR' / 'USD' etc.
    uint256 initialPaymentAmountInCents;    /// initial payment amount in fiat in cents
    uint256 fiatAmountInCents;              /// payment amount in fiat in cents
    uint256 frequency;                      /// how often merchant can pull - in seconds
    uint256 numberOfPayments;               /// amount of pull payments merchant can make
    uint256 startTimestamp;                 /// when subscription starts - in seconds
    uint256 nextPaymentTimestamp;           /// timestamp of next payment
    uint256 lastPaymentTimestamp;           /// timestamp of last payment
    uint256 cancelTimestamp;                /// timestamp the payment was cancelled
}
```
#### Constants
```solidity
uint256 constant private DECIMAL_FIXER = 10000000000; // 1e^10 - This transforms the Rate from decimals to uint256
uint256 constant private FIAT_TO_CENT_FIXER = 100;    // Fiat currencies have 100 cents in 1 basic monetary unit.
uint256 constant private ONE_ETHER = 1 ether;         // PumaPay token has 18 decimals - same as one ETHER
uint256 constant private MINIMUM_AMOUN_OF_ETH_FOR_OPARATORS = 0.01 ether; // minimum amount of ETHER the owner/executor should have 
```
#### Public Functions - Owner
##### addExecutor()
Adds an existing executor. It can be executed only by the owner.
The balance of the owner is checked and if funding is needed 1 ETH is transferred.
```solididty
function addExecutor(address _executor)
```
##### removeExecutor()
Removes an existing executor. It can be executed only by the onwer.  
The balance of the owner is checked and if funding is needed 1 ETH is transferred.
```solididty
function removeExecutor(address _executor)
```
##### setRate()
Sets the exchange rate for a currency. It can be executed only by the onwer.  
The balance of the owner is checked and if funding is needed 1 ETH is transferred.
```solididty
function setRate(string _currency, uint256 _rate)
```

#### Public Functions - Executor
##### registerPullPayment()
Registers a new pull payment to the PumaPay Pull Payment Contract. The registration can be executed only by one of the `executors` of the PumaPay Pull Payment Contract and the PumaPay Pull Payment Contract checks that the pull payment has been singed by the client of the account.
The balance of the executor (msg.sender) is checked and if funding is needed 1 ETH is transferred.
```solididty
function registerPullPayment (
        uint8 v,
        bytes32 r,
        bytes32 s,
        string _merchantID,
        string _paymentID,
        address _client,
        address _beneficiary,
        string _currency,
        uint256 _initialPaymentAmountInCents,
        uint256 _fiatAmountInCents,
        uint256 _frequency,
        uint256 _numberOfPayments,
        uint256 _startTimestamp
    )
```
##### deletePullPayment()
Deletes a pull payment for a beneficiary. The deletion needs can be executed only by one of the `executors` of the PumaPay Pull Payment Contract and the PumaPay Pull Payment Contract checks that the beneficiary and the paymentID have been singed by the client of the account. This method sets the cancellation of the pull payment in the pull payments array for this beneficiary specified.
The balance of the executor (msg.sender) is checked and if funding is needed, 1 ETH is transferred.
```solididty
function deletePullPayment (
        uint8 v,
        bytes32 r,
        bytes32 s,
        string _paymentID,
        address _client,
        address _beneficiary
    )
```

#### Public Functions
##### executePullPayment()
Executes a pull payment for the address that is calling the function `msg.sender`. The pull payment should exist and the payment request should be valid in terms of when it can be executed.
* Use Case 1: Single/Recurring Fixed Pull Payment (`initialPaymentAmountInCents == 0`)
We calculate the amount in PMA using the rate for the currency specified in the pull payment and the `fiatAmountInCents` and we transfer from the client account the amount in PMA.
After execution we set the last payment timestamp to NOW, the next payment timestamp is incremented by the frequency and the number of payments is decresed by 1.
* Use Case 2: Recurring Fixed Pull Payment with initial fee (`initialPaymentAmountInCents > 0`)
We calculate the amount in PMA using the rate for the currency specified in the pull payment
and the 'initialPaymentAmountInCents' and we transfer from the client account the amount in PMA.
After execution we set the last payment timestamp to NOW and the `initialPaymentAmountInCents` to ZERO.

#### Internal Functions
##### isValidRegistration()
Checks if a registration request is valid by comparing the `v, r, s` params and the hashed params with the client. address. The hashed parameters is the `beneficiary` (merchant) address, the `currency`, the `initialPaymentAmountInCents`, `fiatAmountInCents`, `frequency`, `numberOfPayments` and `startTimestamp`.
```
ecrecover(
    keccak256(
        abi.encodePacked(
            _beneficiary,
            _pullPayment.currency,
            _pullPayment.initialPaymentAmountInCents,
            _pullPayment.fiatAmountInCents,
            _pullPayment.frequency,
            _pullPayment.numberOfPayments,
            _pullPayment.startTimestamp
        )
),
v, r, s) == _client;
```   
More about recovery ID of an ETH signature and ECDSA signatures can be found [here](https://github.com/ethereum/EIPs/issues/155).
##### isValidDeletion()
Checks if a deletion request is valid by comparing the `v, r, s` params and the hashed params with the client. address and the `paymentID` itself as well. The hashed parameters is the `paymentID` and the `beneficiary` (merchant) address.
```
ecrecover(
    keccak256(
        abi.encodePacked(
            _paymentID,
            _beneficiary
        )
    ), v, r, s) == _client
    && keccak256(
        abi.encodePacked(pullPayments[_client][_beneficiary].paymentID)
        ) == keccak256(abi.encodePacked(_paymentID));
``` 
##### calculatePMAFromFiat()
Calculates the PMA Rate for the fiat currency specified. The rate is set every 10 minutes by our PMA server for the currencies specified in the smart contract. Two helpers/fixers are used for this calculation:
1. `ONE_ETHER` - 
2. `DECIMAL_FIXER` - Transforms the Rate from `decimals` to `uint256` and is the same value that is being used for setting the rate
3. `FIAT_TO_CENT_FIXER` - The payment amounts that are being used in the smart contract are noted in CENTS since `decimals` are not supported in `solidity` yet.
Calculation: 
```
```
##### doesPaymentExist()
Checks if a payment for a beneficiary (merchant) of a client exists.
##### isFundingNeeded()
Checks if the address of the `owner` or an `executor` needs to be funded. 
The minimum amount the owner/executors should always have is 0.01 ETH 

#### Events
```
event LogExecutorAdded(address executor);       // When adding a new executor
event LogExecutorRemoved(address executor);     // When removing an existing executor
event LogPaymentRegistered(address clientAddress, address beneficiaryAddress, string paymentID);    // When registering a new pull payment
event LogPaymentCancelled(address clientAddress, address beneficiaryAddress, string paymentID);     // When removing a new pull payment
event LogPullPaymentExecuted(address clientAddress, address beneficiaryAddress, string paymentID);  // When executing a pull payment
event LogSetExchangeRate(string currency, uint256 exchangeRate);        // When updating the PMA/FIAT rates
```
## Development
* Contracts are written in [Solidity](https://solidity.readthedocs.io/en/develop/) and tested using [Truffle](http://truffleframework.com/) and [Ganache-cli](https://github.com/trufflesuite/ganache-cli).
* All the smart contracts have been developed based on modules developed by [Open Zepellin](https://openzeppelin.org/).

## Audits
Our smart contracts have been audited by several auditing companies and blockchain experts.
#### PumaPay Token
Our token was audited by [SmartDec](https://smartdec.net/) and the audit report can be found [here](./audits/PumaPay%20Token%20Security%20Audit%20-%20SmartDec.pdf).
#### PumaPay PullPayment
Our PullPayment Protocol has been audited by three separete auditing companies - [SmartDec](https://smartdec.net/) and [Hacken](https://hacken.io/) -  to ensure that the desired functionality
and the relevant security is in place on top of the elimination of any bugs and vulnerabilities.
* [Hacken Audit Report](./audits/PullPayment%20Smart%20Contract%20-%20Hacken.pdf)
* [SmartDec Audit Report](./audits/PullPayment%20Smart%20Contract%20-%SmartDec.pdf)