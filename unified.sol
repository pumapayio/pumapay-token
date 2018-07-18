pragma solidity 0.4.24;

// File: node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol

/**
 * @title SafeMath
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath {

  /**
  * @dev Multiplies two numbers, throws on overflow.
  */
  function mul(uint256 a, uint256 b) internal pure returns (uint256 c) {
    // Gas optimization: this is cheaper than asserting 'a' not being zero, but the
    // benefit is lost if 'b' is also tested.
    // See: https://github.com/OpenZeppelin/openzeppelin-solidity/pull/522
    if (a == 0) {
      return 0;
    }

    c = a * b;
    assert(c / a == b);
    return c;
  }

  /**
  * @dev Integer division of two numbers, truncating the quotient.
  */
  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    // uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return a / b;
  }

  /**
  * @dev Subtracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
  */
  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  /**
  * @dev Adds two numbers, throws on overflow.
  */
  function add(uint256 a, uint256 b) internal pure returns (uint256 c) {
    c = a + b;
    assert(c >= a);
    return c;
  }
}

// File: node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol

/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
  address public owner;


  event OwnershipRenounced(address indexed previousOwner);
  event OwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner
  );


  /**
   * @dev The Ownable constructor sets the original `owner` of the contract to the sender
   * account.
   */
  constructor() public {
    owner = msg.sender;
  }

  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  /**
   * @dev Allows the current owner to relinquish control of the contract.
   */
  function renounceOwnership() public onlyOwner {
    emit OwnershipRenounced(owner);
    owner = address(0);
  }

  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param _newOwner The address to transfer ownership to.
   */
  function transferOwnership(address _newOwner) public onlyOwner {
    _transferOwnership(_newOwner);
  }

  /**
   * @dev Transfers control of the contract to a newOwner.
   * @param _newOwner The address to transfer ownership to.
   */
  function _transferOwnership(address _newOwner) internal {
    require(_newOwner != address(0));
    emit OwnershipTransferred(owner, _newOwner);
    owner = _newOwner;
  }
}

// File: node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol

/**
 * @title ERC20Basic
 * @dev Simpler version of ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/179
 */
contract ERC20Basic {
  function totalSupply() public view returns (uint256);
  function balanceOf(address who) public view returns (uint256);
  function transfer(address to, uint256 value) public returns (bool);
  event Transfer(address indexed from, address indexed to, uint256 value);
}

// File: node_modules/openzeppelin-solidity/contracts/token/ERC20/BasicToken.sol

/**
 * @title Basic token
 * @dev Basic version of StandardToken, with no allowances.
 */
contract BasicToken is ERC20Basic {
  using SafeMath for uint256;

  mapping(address => uint256) balances;

  uint256 totalSupply_;

  /**
  * @dev total number of tokens in existence
  */
  function totalSupply() public view returns (uint256) {
    return totalSupply_;
  }

  /**
  * @dev transfer token for a specified address
  * @param _to The address to transfer to.
  * @param _value The amount to be transferred.
  */
  function transfer(address _to, uint256 _value) public returns (bool) {
    require(_to != address(0));
    require(_value <= balances[msg.sender]);

    balances[msg.sender] = balances[msg.sender].sub(_value);
    balances[_to] = balances[_to].add(_value);
    emit Transfer(msg.sender, _to, _value);
    return true;
  }

  /**
  * @dev Gets the balance of the specified address.
  * @param _owner The address to query the the balance of.
  * @return An uint256 representing the amount owned by the passed address.
  */
  function balanceOf(address _owner) public view returns (uint256) {
    return balances[_owner];
  }

}

// File: node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol

/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 is ERC20Basic {
  function allowance(address owner, address spender)
    public view returns (uint256);

  function transferFrom(address from, address to, uint256 value)
    public returns (bool);

  function approve(address spender, uint256 value) public returns (bool);
  event Approval(
    address indexed owner,
    address indexed spender,
    uint256 value
  );
}

// File: node_modules/openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol

/**
 * @title Standard ERC20 token
 *
 * @dev Implementation of the basic standard token.
 * @dev https://github.com/ethereum/EIPs/issues/20
 * @dev Based on code by FirstBlood: https://github.com/Firstbloodio/token/blob/master/smart_contract/FirstBloodToken.sol
 */
contract StandardToken is ERC20, BasicToken {

  mapping (address => mapping (address => uint256)) internal allowed;


  /**
   * @dev Transfer tokens from one address to another
   * @param _from address The address which you want to send tokens from
   * @param _to address The address which you want to transfer to
   * @param _value uint256 the amount of tokens to be transferred
   */
  function transferFrom(
    address _from,
    address _to,
    uint256 _value
  )
    public
    returns (bool)
  {
    require(_to != address(0));
    require(_value <= balances[_from]);
    require(_value <= allowed[_from][msg.sender]);

    balances[_from] = balances[_from].sub(_value);
    balances[_to] = balances[_to].add(_value);
    allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
    emit Transfer(_from, _to, _value);
    return true;
  }

  /**
   * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
   *
   * Beware that changing an allowance with this method brings the risk that someone may use both the old
   * and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
   * race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
   * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
   * @param _spender The address which will spend the funds.
   * @param _value The amount of tokens to be spent.
   */
  function approve(address _spender, uint256 _value) public returns (bool) {
    allowed[msg.sender][_spender] = _value;
    emit Approval(msg.sender, _spender, _value);
    return true;
  }

  /**
   * @dev Function to check the amount of tokens that an owner allowed to a spender.
   * @param _owner address The address which owns the funds.
   * @param _spender address The address which will spend the funds.
   * @return A uint256 specifying the amount of tokens still available for the spender.
   */
  function allowance(
    address _owner,
    address _spender
   )
    public
    view
    returns (uint256)
  {
    return allowed[_owner][_spender];
  }

  /**
   * @dev Increase the amount of tokens that an owner allowed to a spender.
   *
   * approve should be called when allowed[_spender] == 0. To increment
   * allowed value is better to use this function to avoid 2 calls (and wait until
   * the first transaction is mined)
   * From MonolithDAO Token.sol
   * @param _spender The address which will spend the funds.
   * @param _addedValue The amount of tokens to increase the allowance by.
   */
  function increaseApproval(
    address _spender,
    uint _addedValue
  )
    public
    returns (bool)
  {
    allowed[msg.sender][_spender] = (
      allowed[msg.sender][_spender].add(_addedValue));
    emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }

  /**
   * @dev Decrease the amount of tokens that an owner allowed to a spender.
   *
   * approve should be called when allowed[_spender] == 0. To decrement
   * allowed value is better to use this function to avoid 2 calls (and wait until
   * the first transaction is mined)
   * From MonolithDAO Token.sol
   * @param _spender The address which will spend the funds.
   * @param _subtractedValue The amount of tokens to decrease the allowance by.
   */
  function decreaseApproval(
    address _spender,
    uint _subtractedValue
  )
    public
    returns (bool)
  {
    uint oldValue = allowed[msg.sender][_spender];
    if (_subtractedValue > oldValue) {
      allowed[msg.sender][_spender] = 0;
    } else {
      allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
    }
    emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }

}

// File: node_modules/openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol

/**
 * @title Mintable token
 * @dev Simple ERC20 Token example, with mintable token creation
 * @dev Issue: * https://github.com/OpenZeppelin/openzeppelin-solidity/issues/120
 * Based on code by TokenMarketNet: https://github.com/TokenMarketNet/ico/blob/master/contracts/MintableToken.sol
 */
contract MintableToken is StandardToken, Ownable {
  event Mint(address indexed to, uint256 amount);
  event MintFinished();

  bool public mintingFinished = false;


  modifier canMint() {
    require(!mintingFinished);
    _;
  }

  modifier hasMintPermission() {
    require(msg.sender == owner);
    _;
  }

  /**
   * @dev Function to mint tokens
   * @param _to The address that will receive the minted tokens.
   * @param _amount The amount of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mint(
    address _to,
    uint256 _amount
  )
    hasMintPermission
    canMint
    public
    returns (bool)
  {
    totalSupply_ = totalSupply_.add(_amount);
    balances[_to] = balances[_to].add(_amount);
    emit Mint(_to, _amount);
    emit Transfer(address(0), _to, _amount);
    return true;
  }

  /**
   * @dev Function to stop minting new tokens.
   * @return True if the operation was successful.
   */
  function finishMinting() onlyOwner canMint public returns (bool) {
    mintingFinished = true;
    emit MintFinished();
    return true;
  }
}

// File: contracts/PumaPayToken.sol

/// PumaPayToken inherits from MintableToken, which in turn inherits from StandardToken.
/// Super is used to bypass the original function signature and include the whenNotMinting modifier.
contract PumaPayToken is MintableToken {

    string public name = "PumaPay"; 
    string public symbol = "PMA";
    uint8 public decimals = 18;

    constructor() public {
    }

    /// This modifier will be used to disable all ERC20 functionalities during the minting process.
    modifier whenNotMinting() {
        require(mintingFinished);
        _;
    }

    /// @dev transfer token for a specified address
    /// @param _to address The address to transfer to.
    /// @param _value uint256 The amount to be transferred.
    /// @return success bool Calling super.transfer and returns true if successful.
    function transfer(address _to, uint256 _value) public whenNotMinting returns (bool) {
        return super.transfer(_to, _value);
    }

    /// @dev Transfer tokens from one address to another.
    /// @param _from address The address which you want to send tokens from.
    /// @param _to address The address which you want to transfer to.
    /// @param _value uint256 the amount of tokens to be transferred.
    /// @return success bool Calling super.transferFrom and returns true if successful.
    function transferFrom(address _from, address _to, uint256 _value) public whenNotMinting returns (bool) {
        return super.transferFrom(_from, _to, _value);
    }
}

// File: contracts/PumaPayVault.sol

/// @title PumaPayVault - Contract that will hold PMA locked for a specific period of time with predefined withdawal windows for a certain percentage of tokens.
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

// File: contracts/TimeVesting.sol

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