pragma solidity ^0.4.19;

import "./PumaPayToken.sol";

contract MultiSigWallet {

    /// =================================================================================================================
    ///                                      Events
    /// =================================================================================================================
    event Confirmation(address indexed sender, uint indexed transactionId);
    event Revocation(address indexed sender, uint indexed transactionId);
    event Submission(uint indexed transactionId);
    event Execution(uint indexed transactionId);
    event ExecutionFailure(uint indexed transactionId);
    event Deposit(address indexed sender, uint value);
    event OwnerAddition(address indexed owner);
    event OwnerRemoval(address indexed owner);
    event RequirementChange(uint required);

     /// =================================================================================================================
    ///                                      Constants
    /// =================================================================================================================
    uint constant public MAX_OWNER_COUNT = 2;
    uint constant public REQUIRED_SIGNATURES = 2;
    uint constant public OPTION_TIME_FRAME = 120 days;

    /// =================================================================================================================
    ///                                      Members
    /// =================================================================================================================
    mapping (uint => Transaction) public transactions;
    mapping (uint => mapping (address => bool)) public confirmations;
    mapping (address => bool) public isOwner;
    address[] public owners;
    uint public transactionCount;
    uint256 public optionStartTime;
    PumaPayToken public token;
    address public superOwner;
    uint public ownerCount;

    struct Transaction {
        address destination;
        uint value;
        bool executed;
    }

    /// =================================================================================================================
    ///                                      Modifiers
    /// =================================================================================================================
    modifier onlyWallet() {
        require(msg.sender == address(this));
        _;
    }

    modifier isSuperOwner() {
        require(msg.sender == superOwner);
        _;
    }

    modifier afterOptionTimeFramePassed() {
        require(optionStartTime + OPTION_TIME_FRAME < now);
        _;
    }

    modifier ownerDoesNotExist(address owner) {
        require(!isOwner[owner]);
        _;
    }

    modifier ownerExists(address owner) {
        require(isOwner[owner]);
        _;
    }

    modifier transactionExists(uint transactionId) {
        require(transactions[transactionId].destination != 0);
        _;
    }

    modifier confirmed(uint transactionId, address owner) {
        require(confirmations[transactionId][owner]);
        _;
    }

    modifier notConfirmed(uint transactionId, address owner) {
        require(!confirmations[transactionId][owner]);
        _;
    }

    modifier notExecuted(uint transactionId) {
        require(!transactions[transactionId].executed);
        _;
    }

    modifier notNull(address _address) {
        require(_address != 0);
        _;
    }

    modifier validRequirement(address _superOwner, address _normalOwner, PumaPayToken _token) {
        require(
            _superOwner != address(0)
            && _normalOwner != address(0)
            && _token != address(0)
            );
        _;
    }

    /// =================================================================================================================
    ///                                      Constructor
    /// =================================================================================================================

    /// @dev Contract constructor sets initial owners and required number of confirmations.
    /// @param _superOwner Super Owner.
    /// @param _normalOwner Normal Owner.
    /// @param _token Token Address 
    function MultiSigWallet(address _superOwner, address _normalOwner, PumaPayToken _token)
        public
        validRequirement(_superOwner, _normalOwner, _token) 
        {
        owners.push(_superOwner);
        owners.push(_normalOwner);

        for (uint i = 0; i < owners.length; i++) {
            require(!isOwner[owners[i]] && owners[i] != 0);
            isOwner[owners[i]] = true;
            ownerCount = ownerCount + 1;
        }
        optionStartTime = now;
        superOwner = _superOwner;
        token = _token; 
    }

    // =================================================================================================================
    //                                      Public Functions
    // =================================================================================================================

    /// @dev Allows an owner to submit and confirm a transaction.
    /// @param destination Transaction target address.
    /// @param value Transaction ether value.
    /// @return Returns transaction ID.
    function submitTransaction(address destination, uint value)
        public
        returns (uint transactionId)
    {
        transactionId = addTransaction(destination, value);
        confirmTransaction(transactionId);
    }

    /// @dev Allows an owner to confirm a transaction.
    /// @param transactionId Transaction ID.
    function confirmTransaction(uint transactionId)
        public
        ownerExists(msg.sender)
        transactionExists(transactionId)
        notConfirmed(transactionId, msg.sender)
    {
        confirmations[transactionId][msg.sender] = true;
        Confirmation(msg.sender, transactionId);
        executeTransaction(transactionId);
    }

    /// @dev Allows an owner to revoke a confirmation for a transaction.
    /// @param transactionId Transaction ID.
    function revokeConfirmation(uint transactionId)
        public
        ownerExists(msg.sender)
        confirmed(transactionId, msg.sender)
        notExecuted(transactionId)
    {
        confirmations[transactionId][msg.sender] = false;
        Revocation(msg.sender, transactionId);
    }

    /// @dev Returns the confirmation status of a transaction.
    /// @param transactionId Transaction ID.
    /// @return Confirmation status.
    function isConfirmed(uint transactionId)
        public
        constant
        returns (bool)
    {
        uint count = 0;
        for (uint i = 0; i < owners.length; i++) {
            if (confirmations[transactionId][owners[i]])
                count += 1;
            if (count == REQUIRED_SIGNATURES)
                return true;
        }
    }

    function claimAllTokensAfterTimeLock(address ethWallet) 
        public 
        isSuperOwner() 
        afterOptionTimeFramePassed() 
    {
        token.transfer(ethWallet, token.balanceOf(this)); 
    }

    // =================================================================================================================
    //                                      Internal Functions
    // =================================================================================================================

    /// @dev Adds a new transaction to the transaction mapping, if transaction does not exist yet.
    /// @param destination Transaction target address.
    /// @param value Transaction ether value.
    /// @return Returns transaction ID.
    function addTransaction(address destination, uint value)
        internal
        notNull(destination)
        returns (uint transactionId)
    {
        transactionId = transactionCount;
        transactions[transactionId] = Transaction({
            destination: destination,
            value: value,
            executed: false
        });
        transactionCount += 1;
        Submission(transactionId);
    }

    /// @dev Allows anyone to execute a confirmed transaction.
    /// @param transactionId Transaction ID.
    function executeTransaction(uint transactionId)
        internal
        ownerExists(msg.sender)
        confirmed(transactionId, msg.sender)
        notExecuted(transactionId)
    {
        if (isConfirmed(transactionId)) {
            Transaction storage txn = transactions[transactionId];
            if (token.transfer(txn.destination, txn.value)) {
                txn.executed = true;
                Execution(transactionId);
            } else {
                ExecutionFailure(transactionId);
            }
        }
    }

    /*
     * Web3 call functions
     */
    /// @dev Returns number of confirmations of a transaction.
    /// @param transactionId Transaction ID.
    /// @return Number of confirmations.
    function getConfirmationCount(uint transactionId)
        public
        constant
        returns (uint count)
    {
        for (uint i = 0; i < owners.length; i++) {
            if (confirmations[transactionId][owners[i]]) {
                count += 1;
            }
        }
    }

    /// @dev Returns total number of transactions after filers are applied.
    /// @param pending Include pending transactions.
    /// @param executed Include executed transactions.
    /// @return Total number of transactions after filters are applied.
    function getTransactionCount(bool pending, bool executed)
        public
        constant
        returns (uint count)
    {
        for (uint i = 0; i < transactionCount; i++) {
            if (pending && !transactions[i].executed || executed && transactions[i].executed) {
                count += 1;
            }
        }
    }

    /// @dev Returns list of owners.
    /// @return List of owner addresses.
    function getOwners()
        public
        constant
        returns (address[])
    {
        return owners;
    }

    /// @dev Returns array with owner addresses, which confirmed transaction.
    /// @param transactionId Transaction ID.
    /// @return Returns array of owner addresses.
    function getConfirmations(uint transactionId)
        public
        constant
        returns (address[] _confirmations)
    {
        address[] memory confirmationsTemp = new address[](owners.length);
        uint count = 0;
        uint i;
        for (i = 0; i < owners.length; i++) {
            if (confirmations[transactionId][owners[i]]) {
                confirmationsTemp[count] = owners[i];
                count += 1;
            }
        }
        _confirmations = new address[](count);
        for (i = 0; i < count; i++) {
            _confirmations[i] = confirmationsTemp[i];
        }
    }

    /// @dev Returns list of transaction IDs in defined range.
    /// @param from Index start position of transaction array.
    /// @param to Index end position of transaction array.
    /// @param pending Include pending transactions.
    /// @param executed Include executed transactions.
    /// @return Returns array of transaction IDs.
    function getTransactionIds(uint from, uint to, bool pending, bool executed)
        public
        constant
        returns (uint[] _transactionIds)
    {
        uint[] memory transactionIdsTemp = new uint[](transactionCount);
        uint count = 0;
        uint i;
        for (i = 0; i < transactionCount; i++) {
            if (   pending && !transactions[i].executed || executed && transactions[i].executed) {
                transactionIdsTemp[count] = i;
                count += 1;
            }
        }
        _transactionIds = new uint[](to - from);
        for (i = from; i < to; i++) {
            _transactionIds[i - from] = transactionIdsTemp[i];
        }
    }
}
