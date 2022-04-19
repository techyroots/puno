// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./TRC20.sol";
import "./Ownable.sol";

contract Puno is TRC20, Ownable{

    uint256 private lockTime = 63072000;

    uint256 private lockTokensTime;

    constructor (string memory name, string memory symbol, address rewardAndTeamWallet) TRC20(name, symbol) {
        _mint(msg.sender, 5800000 * 10 ** 6);
        _mint(rewardAndTeamWallet, 300000 * 10 ** 6);
    }
    
    function burn(uint256 amount) external  {
        _burn(msg.sender, amount);
    }
    
    function totalSupply() public view virtual override returns (uint256) {
        return 6100000 * 10 ** 6;
    }

    function lockTokens() public onlyOwner {
        lockTokensTime = block.timestamp;
        _transfer(msg.sender, address(this), 3700000 * 10 ** 6);
    }

    function redeem(address to, uint256 amount) public onlyOwner {
        require(block.timestamp > lockTokensTime + lockTime, "Your tokens locked for 2 years");
        _transfer(address(this), to, amount);
    }

    function getTime() public view returns (uint256){
        return lockTokensTime;
    }
}