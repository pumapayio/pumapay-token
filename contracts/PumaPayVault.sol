pragma solidity 0.4.24;

import "./PumaPayToken.sol";
import "../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/// @title PumaPayVault - Contract that will hold PMA locked for a specific period of time with predefined withdrawal windows for a certain percentage of tokens.
/// @author Giorgos Kourtellos - <giorgos@pumapay.io>
contract PumaPayVault is Ownable {
    using SafeMath for uint256;

    /// =================================================================================================================
    ///                                      Events
    /// =================================================================================================================
    event LogWithdraw(uint256 amount);
    event LogNextUnlockTimestamp(uint256 nextUnlockedTimestamp);
    event LogTokensAllowedForWithdrawal(uint256 tokensAllowedForWithdrawal);

    /// =================================================================================================================
    ///                                      Constants
    /// =================================================================================================================
    uint256 constant public UNLOCKED_PERIOD = 2 days;

    /// =================================================================================================================
    ///                                      Members
    /// =================================================================================================================
    uint256 public nextUnlockedTimestamp;
    uint256 public amountOfTokensAllowedForWithdrawal;
    uint256 public amountOfTokensWithdrawn;
    bool public lockedScheduleConstructed;
    uint256[] public intervals;
    uint256[] public percentages;

    PumaPayToken public token;

    struct LockScheduleDetails {
        uint256 unlockStartTime;
        uint256 unlockedAmount;
    }

    LockScheduleDetails[] public lockSchedule;

    /// =================================================================================================================
    ///                                      Modifiers
    /// =================================================================================================================
    modifier hasTokens() {
        require(token.balanceOf(this) > 0);
        _;
    }

    modifier lockedScheduleNOTConstructed() {
        require(!lockedScheduleConstructed);
        _;
    }

    modifier lockedScheduleISConstructed() {
        require(lockedScheduleConstructed);
        _;
    }

    modifier isUnlocked() {
        require(vaultIsUnlocked());
        _;
    }

    modifier isLocked() {
        require(!vaultIsUnlocked());
        _;
    }

    modifier validAmountOfTokens(uint256 amount) {
        require(amountOfTokensAllowedForWithdrawal >= amount);
        _;
    }

    modifier lastValueOfArrayIs100(uint256[] arrayOfNumbers) {
        require(arrayOfNumbers[arrayOfNumbers.length - 1] == 100);
        _;
    }

    modifier validRequirements(address _owner, PumaPayToken _token, uint256[] _intervals, uint256[] _percentages) {
        require(
            _owner != address(0)
            && _token != address(0)
            && _intervals.length == _percentages.length
            && validIntervals(_intervals)
            && validPercentages(_percentages)
            );
        _;
    }

    /// =================================================================================================================
    ///                                      Constructor
    /// =================================================================================================================

    /// @dev Contract constructor sets owner of the vault, the intervals on which the vault will be unlocked
    /// and the percentages of the vault that will be unlocked for the certain intervals
    /// @param _owner Owner of the Vault.
    /// @param _tokenAddress Token Address.
    /// @param _intervals Intervals in days on which the vault will be unlocked.
    /// @param _percentages Percentage of the tokens held by the vault that are unlocked over the specified intervals.
    constructor(address _owner, PumaPayToken _tokenAddress, uint256[] _intervals, uint256[] _percentages)
    public
    validRequirements(_owner, _tokenAddress, _intervals, _percentages) {
        lockedScheduleConstructed = false;
        token = _tokenAddress;
        owner = _owner;
        intervals = _intervals;
        percentages = _percentages;
    }

    // =================================================================================================================
    //                                      Public Functions
    // =================================================================================================================

    /// @dev Allows for withdrawing tokens from the vault - it can be executed only by the owner and only when the locked schedule is constructed
    /// the vault must be ulocked, to hold the amount of tokens the owner requests and to be within the allowed token amount
    /// The tokens are transfered to the owner account
    /// @param _amountOfTokens - number of tokens to be withrawn
    function withdrawTokens(uint256 _amountOfTokens)
        public
        onlyOwner()
        lockedScheduleISConstructed()
        isUnlocked()
        validAmountOfTokens(_amountOfTokens) {
        token.transfer(owner, _amountOfTokens);
        amountOfTokensWithdrawn = amountOfTokensWithdrawn + _amountOfTokens;
        amountOfTokensAllowedForWithdrawal = amountOfTokensAllowedForWithdrawal.sub(_amountOfTokens);

        emit LogWithdraw(_amountOfTokens);
        emit LogTokensAllowedForWithdrawal(amountOfTokensAllowedForWithdrawal);
    }

    /// @dev Sets the next withrawal details i.e. unclocked timestamp and amount of tokens can be executed only by the owner of the vault
    /// and only after the lock schedule has been constructed and the vault is not locked
    function setNextWithdrawalDetails()
    public
    onlyOwner()
    isLocked()
    lockedScheduleISConstructed() {
        for (uint i = 0; i < lockSchedule.length; i++) {
            if (lockSchedule[i].unlockStartTime > now) {
                nextUnlockedTimestamp = lockSchedule[i].unlockStartTime;
                amountOfTokensAllowedForWithdrawal = lockSchedule[i].unlockedAmount - amountOfTokensWithdrawn;

                emit LogNextUnlockTimestamp(nextUnlockedTimestamp);
                emit LogTokensAllowedForWithdrawal(amountOfTokensAllowedForWithdrawal);

                return;
            }
        }
    }

    /// @dev Constructs the LockDownSchedule mapping only once and only if the vault holds tokens
    /// can be executed only by the owner of the vault
    function constructLockedDownSchedule()
    public
    onlyOwner()
    hasTokens()
    lockedScheduleNOTConstructed() {
        for (uint i = 0; i < intervals.length; i++) {
            lockSchedule.push(
                LockScheduleDetails({
                    unlockStartTime: now + (intervals[i] * 24 * 60 * 60),
                    unlockedAmount: token.balanceOf(this) * percentages[i] / 100
                })
            );
        }
        amountOfTokensWithdrawn = 0;
        nextUnlockedTimestamp = lockSchedule[0].unlockStartTime;
        amountOfTokensAllowedForWithdrawal = lockSchedule[0].unlockedAmount;
        lockedScheduleConstructed = true;

        emit LogNextUnlockTimestamp(nextUnlockedTimestamp);
        emit LogTokensAllowedForWithdrawal(amountOfTokensAllowedForWithdrawal);
    }

    function vaultIsUnlocked()
    public
    view
    returns (bool) {
        return (now > nextUnlockedTimestamp  && now < nextUnlockedTimestamp + UNLOCKED_PERIOD);
    }

    // =================================================================================================================
    //                                      Internal Functions
    // =================================================================================================================

    /// Checks if the intervals specified in contract creation are valid
    /// Valid means that each interval should be higher than the previous one and none should be zero
    /// @param _intervals - array of intervals initiating the contract
    function validIntervals(uint256[] _intervals)
    internal
    pure
    returns(bool) {
        uint256 previousInterval = 0;
        for (uint i = 0; i < _intervals.length; i++) {
            if (_intervals[i] <= 0 || _intervals[i] < previousInterval) {
                return false;
            }
            previousInterval = _intervals[i];
        }
        return true;
    }

    /// Checks if the percentages specified in contract creation are valid
    /// Valid means that each percentages should be higher than the previous one and none should be zero
    /// Also the last value of the array should be 100, otherwise there will be locked tokens with no way of retrieving them
    /// @param _percentages - array of percentages initiating the contract
    function validPercentages(uint256[] _percentages)
    internal
    pure
    lastValueOfArrayIs100(_percentages)
    returns(bool) {
        uint256 previousPercentage = 0;
        for (uint i = 0; i < _percentages.length; i++) {
            if (_percentages[i] <= 0 || _percentages[i] < previousPercentage) {
                return false;
            }
            previousPercentage = _percentages[i];
        }
        return true;
    }
}
