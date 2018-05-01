pragma solidity ^0.4.19;

import "../node_modules/zeppelin-solidity/contracts/token/ERC20/MintableToken.sol";


/// PumaPayToken inherits from MintableToken, which in turn inherits from StandardToken.
/// Super is used to bypass the original function signature and include the whenNotMinting modifier.
contract PumaPayToken is MintableToken {

    string public name = "PumaPayToken"; 
    string public symbol = "PMA";
    uint8 public decimals = 18;

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