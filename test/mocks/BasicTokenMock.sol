pragma solidity 0.4.24;


import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/BasicToken.sol";


// mock class using BasicToken
contract BasicTokenMock is BasicToken {

  function BasicTokenMock(address initialAccount, uint256 initialBalance) public {
    balances[initialAccount] = initialBalance;
    totalSupply_ = initialBalance;
  }

}
