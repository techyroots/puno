// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./TRC20.sol";
import "./Ownable.sol";

contract Puno is TRC20, Ownable{
    constructor (string memory name, string memory symbol, address rewardWallet, address maintenanceWallet, address holdWallet) TRC20(name, symbol) {
        _mint(msg.sender, 2000000 * 10 ** 6);
        _mint(rewardWallet, 250000 * 10 ** 6);
        _mint(maintenanceWallet, 51000 * 10 ** 6);
        _mint(holdWallet, 2799000 * 10 ** 6);
    }
    
    function burn(uint256 amount) external  {
        _burn(msg.sender, amount);
    }
    
    function totalSupply() public view virtual override returns (uint256) {
        return 5100000 * 10 ** 6;
    }
}
