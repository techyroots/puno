// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;


import "./BEP20.sol";
import "./Ownable.sol";


contract Puno is BEP20, Ownable{
    uint256  _totalSupply = 5100000 * 10 ** 18;
    constructor (string memory name, string memory symbol) BEP20(name, symbol) {
        _mint(msg.sender, _totalSupply);
    }
    
    function burn(uint256 amount) external  {
        _burn(msg.sender, amount);
    }
    
    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }
    
}