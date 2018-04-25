pragma solidity 0.4.19;

import "../node_modules/zeppelin-solidity/contracts/ownership/Claimable.sol";
import "./PumaPayToken.sol";

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
