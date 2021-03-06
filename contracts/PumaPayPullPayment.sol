pragma solidity 0.4.24;

import "./PumaPayToken.sol";
import "../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";


/// @title PumaPay Pull Payment - Contract that facilitates our pull payment protocol
/// @author PumaPay Dev Team - <developers@pumapay.io>
contract PumaPayPullPayment is Ownable {

    using SafeMath for uint256;

    /// ===============================================================================================================
    ///                                      Events
    /// ===============================================================================================================

    event LogExecutorAdded(address executor);
    event LogExecutorRemoved(address executor);
    event LogPaymentRegistered(address clientAddress, address beneficiaryAddress, string paymentID);
    event LogPaymentCancelled(address clientAddress, address beneficiaryAddress, string paymentID);
    event LogPullPaymentExecuted(address clientAddress, address beneficiaryAddress, string paymentID);
    event LogSetExchangeRate(string currency, uint256 exchangeRate);

    /// ===============================================================================================================
    ///                                      Constants
    /// ===============================================================================================================

    uint256 constant private DECIMAL_FIXER = 10000000000; /// 1e^10 - This transforms the Rate from decimals to uint256
    uint256 constant private FIAT_TO_CENT_FIXER = 100;    /// Fiat currencies have 100 cents in 1 basic monetary unit.
    uint256 constant private ONE_ETHER = 1 ether;         /// PumaPay token has 18 decimals - same as one ETHER
    uint256 constant private MINIMUM_AMOUNT_OF_ETH_FOR_OPARATORS = 0.01 ether; /// minimum amount of ETHER the owner/executor should have
    uint256 constant private OVERFLOW_LIMITER_NUMBER = 10 ** 20; /// 1e^20 - This number is used to prevent numeric overflows

    /// ===============================================================================================================
    ///                                      Members
    /// ===============================================================================================================

    PumaPayToken public token;

    mapping(string => uint256) private exchangeRates;
    mapping(address => bool) public executors;
    mapping(address => mapping(address => PullPayment)) public pullPayments;

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

    /// ===============================================================================================================
    ///                                      Modifiers
    /// ===============================================================================================================
    modifier isExecutor() {
        require(executors[msg.sender]);
        _;
    }

    modifier executorExists(address _executor) {
        require(executors[_executor]);
        _;
    }

    modifier executorDoesNotExists(address _executor) {
        require(!executors[_executor]);
        _;
    }

    modifier paymentExists(address _client, address _beneficiary) {
        require(doesPaymentExist(_client, _beneficiary));
        _;
    }

    modifier paymentNotCancelled(address _client, address _beneficiary) {
        require(pullPayments[_client][_beneficiary].cancelTimestamp == 0);
        _;
    }

    modifier isValidPullPaymentRequest(address _client, address _beneficiary, string _paymentID) {
        require(
            (pullPayments[_client][_beneficiary].initialPaymentAmountInCents > 0 ||
            (now >= pullPayments[_client][_beneficiary].startTimestamp &&
            now >= pullPayments[_client][_beneficiary].nextPaymentTimestamp)
            )
            &&
            pullPayments[_client][_beneficiary].numberOfPayments > 0 &&
        (pullPayments[_client][_beneficiary].cancelTimestamp == 0 ||
        pullPayments[_client][_beneficiary].cancelTimestamp > pullPayments[_client][_beneficiary].nextPaymentTimestamp) &&
        keccak256(
            abi.encodePacked(pullPayments[_client][_beneficiary].paymentID)
        ) == keccak256(abi.encodePacked(_paymentID))
        );
        _;
    }

    modifier isValidDeletionRequest(string paymentID, address client, address beneficiary) {
        require(
            beneficiary != address(0) &&
            client != address(0) &&
            bytes(paymentID).length != 0
        );
        _;
    }

    modifier isValidAddress(address _address) {
        require(_address != address(0));
        _;
    }

    /// ===============================================================================================================
    ///                                      Constructor
    /// ===============================================================================================================

    /// @dev Contract constructor - sets the token address that the contract facilitates.
    /// @param _token Token Address.
    constructor (PumaPayToken _token)
    public
    {
        require(_token != address(0));
        token = _token;
    }

    // @notice Will receive any eth sent to the contract
    function() external payable {
    }

    /// ===============================================================================================================
    ///                                      Public Functions - Owner Only
    /// ===============================================================================================================

    /// @dev Adds a new executor. - can be executed only by the owner.
    /// When adding a new executor 1 ETH is transferred to allow the executor to pay for gas.
    /// The balance of the owner is also checked and if funding is needed 1 ETH is transferred.
    /// @param _executor - address of the executor which cannot be zero address.
    function addExecutor(address _executor)
    public
    onlyOwner
    isValidAddress(_executor)
    executorDoesNotExists(_executor)
    {
        _executor.transfer(1 ether);
        executors[_executor] = true;

        if (isFundingNeeded(owner)) {
            owner.transfer(1 ether);
        }

        emit LogExecutorAdded(_executor);
    }

    /// @dev Removes a new executor. - can be executed only by the owner.
    /// The balance of the owner is checked and if funding is needed 1 ETH is transferred.
    /// @param _executor - address of the executor which cannot be zero address.
    function removeExecutor(address _executor)
    public
    onlyOwner
    isValidAddress(_executor)
    executorExists(_executor)
    {
        executors[_executor] = false;
        if (isFundingNeeded(owner)) {
            owner.transfer(1 ether);
        }
        emit LogExecutorRemoved(_executor);
    }

    /// @dev Sets the exchange rate for a currency. - can be executed only by the owner.
    /// Emits 'LogSetExchangeRate' with the currency and the updated rate.
    /// The balance of the owner is checked and if funding is needed 1 ETH is transferred.
    /// @param _currency - address of the executor which cannot be zero address
    /// @param _rate - address of the executor which cannot be zero address
    function setRate(string _currency, uint256 _rate)
    public
    onlyOwner
    returns (bool) {
        exchangeRates[_currency] = _rate;
        emit LogSetExchangeRate(_currency, _rate);

        if (isFundingNeeded(owner)) {
            owner.transfer(1 ether);
        }

        return true;
    }

    /// ===============================================================================================================
    ///                                      Public Functions - Executors Only
    /// ===============================================================================================================

    /// @dev Registers a new pull payment to the PumaPay Pull Payment Contract - The registration can be executed only by one of the executors of the PumaPay Pull Payment Contract
    /// and the PumaPay Pull Payment Contract checks that the pull payment has been singed by the client of the account.
    /// The balance of the executor (msg.sender) is checked and if funding is needed 1 ETH is transferred.
    /// Emits 'LogPaymentRegistered' with client address, beneficiary address and paymentID.
    /// @param v - recovery ID of the ETH signature. - https://github.com/ethereum/EIPs/issues/155
    /// @param r - R output of ECDSA signature.
    /// @param s - S output of ECDSA signature.
    /// @param _merchantID - ID of the merchant.
    /// @param _paymentID - ID of the payment.
    /// @param _client - client address that is linked to this pull payment.
    /// @param _beneficiary - address that is allowed to execute this pull payment.
    /// @param _currency - currency of the payment / 3-letter abbr i.e. 'EUR'.
    /// @param _fiatAmountInCents - payment amount in fiat in cents.
    /// @param _frequency - how often merchant can pull - in seconds.
    /// @param _numberOfPayments - amount of pull payments merchant can make
    /// @param _startTimestamp - when subscription starts - in seconds.
    function registerPullPayment(
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
    public
    isExecutor()
    {
        require(
            bytes(_paymentID).length > 0 &&
            bytes(_currency).length > 0 &&
            _client != address(0) &&
            _beneficiary != address(0) &&
            _fiatAmountInCents > 0 &&
            _frequency > 0 &&
            _frequency < OVERFLOW_LIMITER_NUMBER &&
            _numberOfPayments > 0 &&
            _startTimestamp > 0 &&
            _startTimestamp < OVERFLOW_LIMITER_NUMBER
        );

        pullPayments[_client][_beneficiary].currency = _currency;
        pullPayments[_client][_beneficiary].initialPaymentAmountInCents = _initialPaymentAmountInCents;
        pullPayments[_client][_beneficiary].fiatAmountInCents = _fiatAmountInCents;
        pullPayments[_client][_beneficiary].frequency = _frequency;
        pullPayments[_client][_beneficiary].startTimestamp = _startTimestamp;
        pullPayments[_client][_beneficiary].numberOfPayments = _numberOfPayments;

        require(isValidRegistration(v, r, s, _client, _beneficiary, pullPayments[_client][_beneficiary]));

        pullPayments[_client][_beneficiary].merchantID = _merchantID;
        pullPayments[_client][_beneficiary].paymentID = _paymentID;
        pullPayments[_client][_beneficiary].nextPaymentTimestamp = _startTimestamp;
        pullPayments[_client][_beneficiary].lastPaymentTimestamp = 0;
        pullPayments[_client][_beneficiary].cancelTimestamp = 0;

        if (isFundingNeeded(msg.sender)) {
            msg.sender.transfer(1 ether);
        }

        emit LogPaymentRegistered(_client, _beneficiary, _paymentID);
    }

    /// @dev Deletes a pull payment for a beneficiary - The deletion needs can be executed only by one of the executors of the PumaPay Pull Payment Contract
    /// and the PumaPay Pull Payment Contract checks that the beneficiary and the paymentID have been singed by the client of the account.
    /// This method sets the cancellation of the pull payment in the pull payments array for this beneficiary specified.
    /// The balance of the executor (msg.sender) is checked and if funding is needed 1 ETH is transferred.
    /// Emits 'LogPaymentCancelled' with beneficiary address and paymentID.
    /// @param v - recovery ID of the ETH signature. - https://github.com/ethereum/EIPs/issues/155
    /// @param r - R output of ECDSA signature.
    /// @param s - S output of ECDSA signature.
    /// @param _paymentID - ID of the payment.
    /// @param _client - client address that is linked to this pull payment.
    /// @param _beneficiary - address that is allowed to execute this pull payment.
    function deletePullPayment(
        uint8 v,
        bytes32 r,
        bytes32 s,
        string _paymentID,
        address _client,
        address _beneficiary
    )
    public
    isExecutor()
    paymentExists(_client, _beneficiary)
    paymentNotCancelled(_client, _beneficiary)
    isValidDeletionRequest(_paymentID, _client, _beneficiary)
    {
        require(isValidDeletion(v, r, s, _paymentID, _client, _beneficiary));

        pullPayments[_client][_beneficiary].cancelTimestamp = now;

        if (isFundingNeeded(msg.sender)) {
            msg.sender.transfer(1 ether);
        }

        emit LogPaymentCancelled(_client, _beneficiary, _paymentID);
    }

    /// ===============================================================================================================
    ///                                      Public Functions
    /// ===============================================================================================================

    /// @dev Executes a pull payment for the msg.sender - The pull payment should exist and the payment request
    /// should be valid in terms of when it can be executed.
    /// Emits 'LogPullPaymentExecuted' with client address, msg.sender as the beneficiary address and the paymentID.
    /// Use Case 1: Single/Recurring Fixed Pull Payment (initialPaymentAmountInCents == 0 )
    /// ------------------------------------------------
    /// We calculate the amount in PMA using the rate for the currency specified in the pull payment
    /// and the 'fiatAmountInCents' and we transfer from the client account the amount in PMA.
    /// After execution we set the last payment timestamp to NOW, the next payment timestamp is incremented by
    /// the frequency and the number of payments is decresed by 1.
    /// Use Case 2: Recurring Fixed Pull Payment with initial fee (initialPaymentAmountInCents > 0)
    /// ------------------------------------------------------------------------------------------------
    /// We calculate the amount in PMA using the rate for the currency specified in the pull payment
    /// and the 'initialPaymentAmountInCents' and we transfer from the client account the amount in PMA.
    /// After execution we set the last payment timestamp to NOW and the 'initialPaymentAmountInCents to ZERO.
    /// @param _client - address of the client from which the msg.sender requires to pull funds.
    function executePullPayment(address _client, string _paymentID)
    public
    paymentExists(_client, msg.sender)
    isValidPullPaymentRequest(_client, msg.sender, _paymentID)
    {
        uint256 amountInPMA;
        if (pullPayments[_client][msg.sender].initialPaymentAmountInCents > 0) {
            amountInPMA = calculatePMAFromFiat(pullPayments[_client][msg.sender].initialPaymentAmountInCents, pullPayments[_client][msg.sender].currency);
            pullPayments[_client][msg.sender].initialPaymentAmountInCents = 0;
        } else {
            amountInPMA = calculatePMAFromFiat(pullPayments[_client][msg.sender].fiatAmountInCents, pullPayments[_client][msg.sender].currency);

            pullPayments[_client][msg.sender].nextPaymentTimestamp = pullPayments[_client][msg.sender].nextPaymentTimestamp + pullPayments[_client][msg.sender].frequency;
            pullPayments[_client][msg.sender].numberOfPayments = pullPayments[_client][msg.sender].numberOfPayments - 1;
        }
        pullPayments[_client][msg.sender].lastPaymentTimestamp = now;
        token.transferFrom(_client, msg.sender, amountInPMA);

        emit LogPullPaymentExecuted(_client, msg.sender, pullPayments[_client][msg.sender].paymentID);
    }

    function getRate(string _currency) public view returns (uint256) {
        return exchangeRates[_currency];
    }

    /// ===============================================================================================================
    ///                                      Internal Functions
    /// ===============================================================================================================

    /// @dev Calculates the PMA Rate for the fiat currency specified - The rate is set every 10 minutes by our PMA server
    /// for the currencies specified in the smart contract.
    /// @param _fiatAmountInCents - payment amount in fiat CENTS so that is always integer
    /// @param _currency - currency in which the payment needs to take place
    /// RATE CALCULATION EXAMPLE
    /// ------------------------
    /// RATE ==> 1 PMA = 0.01 USD$
    /// 1 USD$ = 1/0.01 PMA = 100 PMA
    /// Start the calculation from one ether - PMA Token has 18 decimals
    /// Multiply by the DECIMAL_FIXER (1e+10) to fix the multiplication of the rate
    /// Multiply with the fiat amount in cents
    /// Divide by the Rate of PMA to Fiat in cents
    /// Divide by the FIAT_TO_CENT_FIXER to fix the _fiatAmountInCents
    function calculatePMAFromFiat(uint256 _fiatAmountInCents, string _currency)
    internal
    view
    returns (uint256) {
        return ONE_ETHER.mul(DECIMAL_FIXER).mul(_fiatAmountInCents).div(exchangeRates[_currency]).div(FIAT_TO_CENT_FIXER);
    }

    /// @dev Checks if a registration request is valid by comparing the v, r, s params
    /// and the hashed params with the client address.
    /// @param v - recovery ID of the ETH signature. - https://github.com/ethereum/EIPs/issues/155
    /// @param r - R output of ECDSA signature.
    /// @param s - S output of ECDSA signature.
    /// @param _client - client address that is linked to this pull payment.
    /// @param _beneficiary - address that is allowed to execute this pull payment.
    /// @param _pullPayment - pull payment to be validated.
    /// @return bool - if the v, r, s params with the hashed params match the client address
    function isValidRegistration(
        uint8 v,
        bytes32 r,
        bytes32 s,
        address _client,
        address _beneficiary,
        PullPayment _pullPayment
    )
    internal
    pure
    returns (bool)
    {
        return ecrecover(
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
    }

    /// @dev Checks if a deletion request is valid by comparing the v, r, s params
    /// and the hashed params with the client address.
    /// @param v - recovery ID of the ETH signature. - https://github.com/ethereum/EIPs/issues/155
    /// @param r - R output of ECDSA signature.
    /// @param s - S output of ECDSA signature.
    /// @param _paymentID - ID of the payment.
    /// @param _client - client address that is linked to this pull payment.
    /// @param _beneficiary - address that is allowed to execute this pull payment.
    /// @return bool - if the v, r, s params with the hashed params match the client address
    function isValidDeletion(
        uint8 v,
        bytes32 r,
        bytes32 s,
        string _paymentID,
        address _client,
        address _beneficiary
    )
    internal
    view
    returns (bool)
    {
        return ecrecover(
            keccak256(
                abi.encodePacked(
                    _paymentID,
                    _beneficiary
                )
            ), v, r, s) == _client
        && keccak256(
            abi.encodePacked(pullPayments[_client][_beneficiary].paymentID)
        ) == keccak256(abi.encodePacked(_paymentID));
    }

    /// @dev Checks if a payment for a beneficiary of a client exists.
    /// @param _client - client address that is linked to this pull payment.
    /// @param _beneficiary - address to execute a pull payment.
    /// @return bool - whether the beneficiary for this client has a pull payment to execute.
    function doesPaymentExist(address _client, address _beneficiary)
    internal
    view
    returns (bool) {
        return (
        bytes(pullPayments[_client][_beneficiary].currency).length > 0 &&
        pullPayments[_client][_beneficiary].fiatAmountInCents > 0 &&
        pullPayments[_client][_beneficiary].frequency > 0 &&
        pullPayments[_client][_beneficiary].startTimestamp > 0 &&
        pullPayments[_client][_beneficiary].numberOfPayments > 0 &&
        pullPayments[_client][_beneficiary].nextPaymentTimestamp > 0
        );
    }

    /// @dev Checks if the address of an owner/executor needs to be funded.
    /// The minimum amount the owner/executors should always have is 0.001 ETH
    /// @param _address - address of owner/executors that the balance is checked against.
    /// @return bool - whether the address needs more ETH.
    function isFundingNeeded(address _address)
    private
    view
    returns (bool) {
        return address(_address).balance <= MINIMUM_AMOUNT_OF_ETH_FOR_OPARATORS;
    }
}
