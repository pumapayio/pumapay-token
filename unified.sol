pragma solidity 0.4.19;

// File: ../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol

/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
  address public owner;


  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);


  /**
   * @dev The Ownable constructor sets the original `owner` of the contract to the sender
   * account.
   */
  function Ownable() public {
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
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param newOwner The address to transfer ownership to.
   */
  function transferOwnership(address newOwner) public onlyOwner {
    require(newOwner != address(0));
    OwnershipTransferred(owner, newOwner);
    owner = newOwner;
  }

}

// File: ../node_modules/zeppelin-solidity/contracts/ownership/Claimable.sol

/**
 * @title Claimable
 * @dev Extension for the Ownable contract, where the ownership needs to be claimed.
 * This allows the new owner to accept the transfer.
 */
contract Claimable is Ownable {
  address public pendingOwner;

  /**
   * @dev Modifier throws if called by any account other than the pendingOwner.
   */
  modifier onlyPendingOwner() {
    require(msg.sender == pendingOwner);
    _;
  }

  /**
   * @dev Allows the current owner to set the pendingOwner address.
   * @param newOwner The address to transfer ownership to.
   */
  function transferOwnership(address newOwner) onlyOwner public {
    pendingOwner = newOwner;
  }

  /**
   * @dev Allows the pendingOwner address to finalize the transfer.
   */
  function claimOwnership() onlyPendingOwner public {
    OwnershipTransferred(owner, pendingOwner);
    owner = pendingOwner;
    pendingOwner = address(0);
  }
}

// File: ../node_modules/zeppelin-solidity/contracts/math/SafeMath.sol

/**
 * @title SafeMath
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath {

  /**
  * @dev Multiplies two numbers, throws on overflow.
  */
  function mul(uint256 a, uint256 b) internal pure returns (uint256) {
    if (a == 0) {
      return 0;
    }
    uint256 c = a * b;
    assert(c / a == b);
    return c;
  }

  /**
  * @dev Integer division of two numbers, truncating the quotient.
  */
  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return c;
  }

  /**
  * @dev Substracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
  */
  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  /**
  * @dev Adds two numbers, throws on overflow.
  */
  function add(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    assert(c >= a);
    return c;
  }
}

// File: ../node_modules/zeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol

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

// File: ../node_modules/zeppelin-solidity/contracts/token/ERC20/BasicToken.sol

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

    // SafeMath.sub will throw if there is not enough balance.
    balances[msg.sender] = balances[msg.sender].sub(_value);
    balances[_to] = balances[_to].add(_value);
    Transfer(msg.sender, _to, _value);
    return true;
  }

  /**
  * @dev Gets the balance of the specified address.
  * @param _owner The address to query the the balance of.
  * @return An uint256 representing the amount owned by the passed address.
  */
  function balanceOf(address _owner) public view returns (uint256 balance) {
    return balances[_owner];
  }

}

// File: ../node_modules/zeppelin-solidity/contracts/token/ERC20/ERC20.sol

/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 is ERC20Basic {
  function allowance(address owner, address spender) public view returns (uint256);
  function transferFrom(address from, address to, uint256 value) public returns (bool);
  function approve(address spender, uint256 value) public returns (bool);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

// File: ../node_modules/zeppelin-solidity/contracts/token/ERC20/StandardToken.sol

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
  function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
    require(_to != address(0));
    require(_value <= balances[_from]);
    require(_value <= allowed[_from][msg.sender]);

    balances[_from] = balances[_from].sub(_value);
    balances[_to] = balances[_to].add(_value);
    allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
    Transfer(_from, _to, _value);
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
    Approval(msg.sender, _spender, _value);
    return true;
  }

  /**
   * @dev Function to check the amount of tokens that an owner allowed to a spender.
   * @param _owner address The address which owns the funds.
   * @param _spender address The address which will spend the funds.
   * @return A uint256 specifying the amount of tokens still available for the spender.
   */
  function allowance(address _owner, address _spender) public view returns (uint256) {
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
  function increaseApproval(address _spender, uint _addedValue) public returns (bool) {
    allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(_addedValue);
    Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
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
  function decreaseApproval(address _spender, uint _subtractedValue) public returns (bool) {
    uint oldValue = allowed[msg.sender][_spender];
    if (_subtractedValue > oldValue) {
      allowed[msg.sender][_spender] = 0;
    } else {
      allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
    }
    Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }

}

// File: ../node_modules/zeppelin-solidity/contracts/token/ERC20/MintableToken.sol

/**
 * @title Mintable token
 * @dev Simple ERC20 Token example, with mintable token creation
 * @dev Issue: * https://github.com/OpenZeppelin/zeppelin-solidity/issues/120
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

  /**
   * @dev Function to mint tokens
   * @param _to The address that will receive the minted tokens.
   * @param _amount The amount of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mint(address _to, uint256 _amount) onlyOwner canMint public returns (bool) {
    totalSupply_ = totalSupply_.add(_amount);
    balances[_to] = balances[_to].add(_amount);
    Mint(_to, _amount);
    Transfer(address(0), _to, _amount);
    return true;
  }

  /**
   * @dev Function to stop minting new tokens.
   * @return True if the operation was successful.
   */
  function finishMinting() onlyOwner canMint public returns (bool) {
    mintingFinished = true;
    MintFinished();
    return true;
  }
}

// File: ../contracts/PumaPayToken.sol

/// PumaPayToken inherits from MintableToken, which in turn inherits from StandardToken.
/// Super is used to bypass the original function signature and include the whenNotMinting modifier.
contract PumaPayToken is MintableToken {

    string public name = "PumaPayToken"; 
    string public symbol = "PUM";
    uint public decimals = 18;

    function PumaPayToken() public {
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

// File: ../contracts/RefundVault.sol

/// @title RefundVault
/// @dev This contract is used for storing PUMAPAY TOKENS AND ETHER for a period of 60 DAYS after .
/// A contributor can ask for a full/part refund for his ether against token. Once tokens are Claimed by the contributor, they cannot be refunded.
/// After 60 days, all ether will be withdrawn from the vault`s wallet, leaving all tokens to be claimed by the their owners.
contract RefundVault is Claimable {
    using SafeMath for uint256;

    /// =================================================================================================================
    ///                                      Enums
    /// =================================================================================================================

    enum State { Active, Refunding, Closed }

    /// =================================================================================================================
    ///                                      Members
    /// =================================================================================================================

    /// Refund time frame
    uint256 public constant REFUND_TIME_FRAME = 60 days;

    mapping (address => uint256) public depositedETH;
    mapping (address => uint256) public depositedToken;
    address[] public contributorsList;

    address public etherWallet;
    PumaPayToken public token;
    State public state;
    uint256 public refundStartTime;
    uint256 public unrefundedETHAmount;

    /// =================================================================================================================
    ///                                      Events
    /// =================================================================================================================

    event Active();
    event Closed();
    event RefundsEnabled();
    event Deposit(address indexed beneficiary, uint256 etherWeiAmount, uint256 tokenWeiAmount);
    event UnrefundedETHAmount(uint256 etherWeiAmount);
    event RefundedETH(address beneficiary, uint256 weiAmount);
    event TokensClaimed(address indexed beneficiary, uint256 weiAmount);
    
    /// =================================================================================================================
    ///                                      Modifiers
    /// =================================================================================================================

    modifier isActiveState() {
        require(state == State.Active);
        _;
    }

    modifier isRefundingState() {
        require(state == State.Refunding);
        _;
    }
    
    modifier isCloseState() {
        require(state == State.Closed);
        _;
    }

    modifier isRefundingOrCloseState() {
        require(state == State.Refunding || state == State.Closed);
        _;
    }

    modifier  isInRefundTimeFrame() {
        require(refundStartTime <= now && refundStartTime + REFUND_TIME_FRAME > now);
        _;
    }

    modifier isRefundTimeFrameExceeded() {
        require(refundStartTime + REFUND_TIME_FRAME < now);
        _;
    }

    /// =================================================================================================================
    ///                                      Constructor
    /// =================================================================================================================

    /// @dev The contruct constructor assigns the etherWallet and the token for which the vault was created. It also sets the state of the vault to 'Active'.
    /// @param _etherWallet address - The ether wallet which will be used for transferring the total amount of ETH contributed
    /// @param _token PumaPayToken - The token that the vault can accept for deposit i.e. PUMAPAY TOKEN
    function RefundVault(address _etherWallet, PumaPayToken _token) public {
        require(_etherWallet != address(0));
        require(_token != address(0));

        etherWallet = _etherWallet;
        token = _token;
        state = State.Active;
        unrefundedETHAmount = 0;
        Active();
    }

    // =================================================================================================================
    //                                      Public Functions
    // =================================================================================================================

    /// @dev Deposits ETH and PUMAPAY TOKENS to the vault and keeps track of the total ETH amount that has been contributed
    /// @param contributor address - The address of the contributor.
    /// @param PmaToEthRate uint256 - The PUMAPAY TOKEN per ETH exchange rate. 
    function deposit(address contributor, uint256 PmaToEthRate) isActiveState onlyOwner public payable {
        require(contributor != address(0));
        require(msg.value > 0);
        require(PmaToEthRate > 0);
        
        uint256 tokensAmount = msg.value.mul(PmaToEthRate);

        unrefundedETHAmount = unrefundedETHAmount.add(msg.value);
        depositedETH[contributor] = depositedETH[contributor].add(msg.value);
        depositedToken[contributor] = depositedToken[contributor].add(tokensAmount);
        contributorsList.push(contributor);

        Deposit(contributor, msg.value, tokensAmount);
        UnrefundedETHAmount(unrefundedETHAmount);
    }

    /// @dev Closes the refunding period and transfers the total ETH amount that has been contributed 
    /// to PUMAPAY's ether wallet specified on contract creation
    function close() isRefundingState onlyOwner isRefundTimeFrameExceeded public {
        etherWallet.transfer(unrefundedETHAmount);
        unrefundedETHAmount = 0;
        state = State.Closed;
        Closed();
    }

    /// @dev Enables the vault to accept refund requests. Sets the state to 'Refunding' and sets the refund time to now 
    function enableRefunds() isActiveState onlyOwner public {
        state = State.Refunding;
        refundStartTime = now;

        RefundsEnabled();
    }

    /// @dev Refunds ETH back to the contributor in return of the proportional amount of PUMAPAY TOKEN
    /// @param ETHAmountToRefundInWei uint256 - Number of ETH in Wei that the sender requests for refund 
    /// Subsctracts the PUMAPAY TOKENS and ETH from the respective deposited arrays 
    /// Sends the ETH back to the sender
    /// Sends the PUMAPAY TOKENS to Ether Wallet 
    /// Can be triggerd by the contributor only
    function refundETH(uint256 ETHAmountToRefundInWei) isInRefundTimeFrame isRefundingState public {
        require(ETHAmountToRefundInWei > 0);

        uint256 depositedTokenAmount = depositedToken[msg.sender];
        uint256 depositedETHAmount = depositedETH[msg.sender];

        require(ETHAmountToRefundInWei <= depositedETHAmount);

        uint256 refundTokens = ETHAmountToRefundInWei.mul(depositedTokenAmount).div(depositedETHAmount);

        assert(refundTokens > 0);

        depositedETH[msg.sender] = depositedETHAmount.sub(ETHAmountToRefundInWei);
        depositedToken[msg.sender] = depositedTokenAmount.sub(refundTokens);

        unrefundedETHAmount = unrefundedETHAmount.sub(ETHAmountToRefundInWei);
        msg.sender.transfer(ETHAmountToRefundInWei);
        token.transfer(etherWallet, refundTokens);

        RefundedETH(msg.sender, ETHAmountToRefundInWei);
    }

    /// @dev Transfer tokens from the vault to the contributor while releasing proportional amount of ether to PUMAPAY's ether wallet
    /// @param tokensToClaim uint256 - Number of PUMAPAY TOKENS the contributor wants to claim
    /// Subsctracts the PUMAPAY TOKENS and ETH from the respective deposited arrays 
    function claimTokens(uint256 tokensToClaim) isRefundingOrCloseState public {
        require(tokensToClaim > 0);
        
        address contributor = msg.sender;

        require(depositedToken[contributor] > 0);

        uint256 depositedTokenAmount = depositedToken[contributor];
        uint256 depositedETHAmount = depositedETH[contributor];

        require(tokensToClaim <= depositedTokenAmount);

        uint256 claimedETH = tokensToClaim.mul(depositedETHAmount).div(depositedTokenAmount);

        require(claimedETH > 0);
        
        depositedETH[contributor] = depositedETHAmount.sub(claimedETH);
        depositedToken[contributor] = depositedTokenAmount.sub(tokensToClaim);

        token.transfer(contributor, tokensToClaim);
        if(state != State.Closed) {
            unrefundedETHAmount = unrefundedETHAmount.sub(claimedETH);

            etherWallet.transfer(claimedETH);
        }

        TokensClaimed(contributor, tokensToClaim);
    }
    
    /// @dev contributors can claim all the PUMAPAY TOKENS by calling this function
    function claimAllTokens() isRefundingOrCloseState public  {
        uint256 depositedTokenAmount = depositedToken[msg.sender];
        claimTokens(depositedTokenAmount);
    }
}
