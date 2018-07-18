pragma solidity 0.4.24;

import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

// mock class using StandardToken
contract StandardTokenMock is StandardToken {

  function StandardTokenMock(address initialAccount, uint256 initialBalance) public {
    balances[initialAccount] = initialBalance;
    totalSupply_ = initialBalance;
  }
}
