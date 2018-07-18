pragma solidity 0.4.24;

import "./PumaPayToken.sol";
import "../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/// @title TimeVesting - Contract that will hold PMA tokens locked for a specific period in a vesting manner. 
/// Over time the owner will be able to withraw certain percentage of the tokens held by the contract. 
/// @author Giorgos Kourtellos - <giorgos@pumapay.io>
contract TimeVesting is Ownable {
    using SafeMath for uint256;

    /// =================================================================================================================
    ///                                      Events
    /// =================================================================================================================

    event LogWithdraw(uint256 amount);
    event LogInitialBalanceSet(uint256 amount);
    event LogVestingDetails(uint256 nextVestingPeriod, uint256 vestingUnlockedPercentage);

    /// =================================================================================================================
    ///                                      Members
    /// =================================================================================================================
    
    uint256 public unlockPeriodInDays;
    uint256 public unlockPercentage;
    uint256 public vestingUnlockedPercentage;
    uint256 public nextVestingPeriod;
    uint256 public withdrawnTokens;
    uint256 public initialTokenBalance;
    
    PumaPayToken public token;

    /// =================================================================================================================
    ///                                      Modifiers
    /// =================================================================================================================

    modifier hasTokens() {
        require(token.balanceOf(this) > 0);
        _;
    }

    modifier initialTokenBalanceNotSet() {
        require(initialTokenBalance == 0);
        _;
    }

    modifier initialTokenBalanceSet() {
        require(initialTokenBalance > 0);
        _;
    }

    modifier validUpdateTime() {
        require(now >= nextVestingPeriod);
        _;
    }

    modifier validvestingUnlockedPercentage() {
        require(100 > vestingUnlockedPercentage);
        _;
    }

    modifier validRequirements(PumaPayToken _token, address _owner, uint256 _unlockPeriodInDays, uint256 _unlockPercentage) {
        require(
            _token != address(0)
            && _owner != address(0)
            && _unlockPeriodInDays > 0
            && validPercentage(_unlockPercentage)
            );
        _;
    }

    /// =================================================================================================================
    ///                                      Constructor
    /// =================================================================================================================
    
    /// @dev Contract constructor sets owner of the vault, the intervals on which the vault will be unlocked.
    ///      and the percentages of the vault that will be unlocked for the certain intervals.
    /// @param _token Token Address.
    /// @param _owner Address which can withdraw tokens from the contract.
    /// @param _unlockPeriodInDays How often (in days) the amount of tokens that the owner can withrdaw will increase.
    /// @param _unlockPercentage Percentge of the tokens that will be released every unlock period.
    constructor(PumaPayToken _token, address _owner, uint256 _unlockPeriodInDays, uint256 _unlockPercentage) 
    public 
    validRequirements(_token, _owner, _unlockPeriodInDays, _unlockPercentage) {
        token = _token;
        owner = _owner;
        unlockPeriodInDays = _unlockPeriodInDays;
        unlockPercentage = _unlockPercentage; 
        nextVestingPeriod = now + _unlockPeriodInDays * 24 * 60 * 60;
        vestingUnlockedPercentage = _unlockPercentage;
        withdrawnTokens = 0;
        initialTokenBalance = 0;
    }

    // =================================================================================================================
    //                                      Public Functions
    // =================================================================================================================

    /// @dev Allows for withdrawing all allowed tokens from the vesting contract.
    /// It can be executed only by the owner and only after the initial balance is set.
    /// the amount of tokens the owner requests should be held by the wallet.
    /// The tokens are transfered to the owner account.
    /// It emmits an event with the the amount of tokens withdrawn.
    function withdrawAllowedAmount()
    public 
    onlyOwner()
    hasTokens()
    initialTokenBalanceSet() {
        uint256 tokensToBeWithdrawn = (initialTokenBalance * vestingUnlockedPercentage / 100) - withdrawnTokens;
        withdrawnTokens = withdrawnTokens + tokensToBeWithdrawn;
        token.transfer(owner, tokensToBeWithdrawn);

        emit LogWithdraw(tokensToBeWithdrawn);
    }

    /// @dev Allows the owner to update the vesting details.
    /// It can be executed only by the owner, only after the initial balance is set and if the next vesting period has passed.
    /// It incrementes the unlocked vesting percentage and sets the next vesting period.
    /// It emmits an event with the new vesting details - next vesting period and unlocked percentage.
    function updateVestingDetails()
    public 
    onlyOwner()
    hasTokens()
    validUpdateTime()
    initialTokenBalanceSet()
    validvestingUnlockedPercentage() {
        vestingUnlockedPercentage = vestingUnlockedPercentage.add(unlockPercentage);
        nextVestingPeriod = nextVestingPeriod + unlockPeriodInDays * 24 * 60 * 60;
        
        emit LogVestingDetails(nextVestingPeriod, vestingUnlockedPercentage);
    }

    /// @dev Sets the initial token balance.
    /// It can be executed only by the owner, after the contract holds tokens and can be executed only once.
    /// It sets the initial balance of the vesting contract.
    /// It emmits an event with the initial balance.
    function setInitialTokenBalance() 
    onlyOwner()
    hasTokens()
    initialTokenBalanceNotSet()
    public {
        initialTokenBalance = token.balanceOf(this);

        emit LogInitialBalanceSet(initialTokenBalance);
    }

    // =================================================================================================================
    //                                      Internal Functions
    // =================================================================================================================

    /// @dev Validates the percentage on contract construction.
    /// @param _unlockPercentage Percentge of the tokens that will be released every unlock period.
    /// Perentage must be higher than zero and lower than 100 and it must be dividing 100 exactly.
    function validPercentage(uint256 _unlockPercentage) 
    internal 
    pure 
    returns(bool) {
        return (_unlockPercentage > 0
            && _unlockPercentage < 100
            && 100%_unlockPercentage == 0);
    }
}