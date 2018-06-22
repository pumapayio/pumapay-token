pragma solidity ^0.4.23;

import "./PumaPayToken.sol";
import "../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/// @title PumaPayVault - Contract that will hold PMA locked for a specific period of time with predefined withdawal windows for a certain percentage of tokens.
/// @author Giorgos Kourtellos - <giorgos@pumapay.io>
contract PumaPayVault is Ownable {
    using SafeMath for uint256;

    /// =================================================================================================================
    ///                                      Events
    /// =================================================================================================================
    event LogWithdraw(uint256 amount);
    event LogNextUnlockTimestamp(uint256 nextUnlockedTimestamp);
    event LogNTokensAllowedForWithdrawal(uint256 tokensAllowedForWithdrawal);

    /// =================================================================================================================
    ///                                      Constants
    /// =================================================================================================================
    uint256 constant public UNLOCKED_PERIOD = 2 days;

    /// =================================================================================================================
    ///                                      Members
    /// =================================================================================================================
    
    address public owner;
    uint256 public nextUnlockedTimestamp;
    uint256 public amountOfTokensAllowedForWithdrawal;
    bool public lockedScheduleConstructed;
    uint256[] public intervals;
    uint256[] public percentages;
    
    PumaPayToken token;

    struct LockScheduleDetails {
        uint256 unlockStartTime;
        uint256 unlockedAmount;
    }

    LockScheduleDetails[] public lockSchedule;
    /// =================================================================================================================
    ///                                      Modifiers
    /// =================================================================================================================
    modifier isOwner() {
        require(msg.sender == owner);
        _;
    }

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
        require(token.balanceOf(this) >= amount && amountOfTokensAllowedForWithdrawal >= amount);
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
    /// IMPORTANT: percentages should always have at the end of the array 100, otherwise the tokens will be locked for ever.
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
        isOwner()
        lockedScheduleISConstructed()
        isUnlocked()
        validAmountOfTokens(_amountOfTokens) { 
        token.transfer(owner, _amountOfTokens);

        emit LogWithdraw(_amountOfTokens);
    }

    /// @dev Sets the next withrawal details i.e. unclocked timestamp and amount of tokens can be executed only by the owner of the vault
    /// and only after the lock schedule has been constructed and the vault is not locked
    function setNextWithdrawalDetails() 
    public
    isOwner()
    isLocked()
    lockedScheduleISConstructed() {
        for (uint i = 0; i < lockSchedule.length; i++) {
            if (lockSchedule[i].unlockStartTime > now) {
                nextUnlockedTimestamp = lockSchedule[i].unlockStartTime;
                amountOfTokensAllowedForWithdrawal = lockSchedule[i].unlockedAmount;
                emit LogNextUnlockTimestamp(nextUnlockedTimestamp);
                emit LogNTokensAllowedForWithdrawal(amountOfTokensAllowedForWithdrawal);
                return;
            }
        }
    }

    /// @dev Constructs the LockDownSchedule mapping only once and only if the vault holds tokens
    /// can be executed only by the owner of the vault
    function constructLockedDownSchedule() 
    public 
    isOwner()
    hasTokens() 
    lockedScheduleNOTConstructed() {
        for (uint i = 0; i < intervals.length; i++) {
            lockSchedule.push(
                LockScheduleDetails({
                    unlockStartTime: now.add(intervals[i].mul(24).mul(60).mul(60)),
                    unlockedAmount: token.balanceOf(this).mul(percentages[i]).div(100)
                })
            );
        }
        nextUnlockedTimestamp = lockSchedule[0].unlockStartTime;
        amountOfTokensAllowedForWithdrawal = lockSchedule[0].unlockedAmount;
        lockedScheduleConstructed = true;
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
    function validIntervals(uint256[] _intervals) 
    internal 
    pure 
    returns(bool) {
        for (uint i = 0; i < _intervals.length; i++) {
            if (_intervals[i] <= 0) {
                return false;
            }
        }
        return true;
    }

    /// Checks if the percentages specified in contract creation are valid
    /// Valid means that each percentages should be higher than the previous one and none should be zero
    function validPercentages(uint256[] _percentages) 
    internal 
    pure 
    returns(bool) {
        for (uint i = 0; i < _percentages.length; i++) {
            if (_percentages[i] <= 0) {
                return false;
            }
        }
        return true;
    }
}