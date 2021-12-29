// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ITRC20.sol";
import "./Ownable.sol";
import "./SafeMath.sol";
import "./Pausable.sol";

contract ICO is Ownable, Pausable {
    
    using SafeMath for uint256;
    
    // The token we are selling
    ITRC20 private token;

    // the UNIX timestamp start date of the crowdsale
    uint256 private startsAt;

    // the UNIX timestamp end date of the crowdsale
    uint256 private endsAt;

    // the price of token
    uint256 private tokenPrice;

    // the number of tokens already sold through this contract
    uint256 private tokensSold = 0;
    
    uint256 private lockTime  = 15724800;
    
    struct User{
        bool isExist;
        uint256 totalBuy;
        uint256 withdrawAmount;
    }
    
    struct Buy{
        uint256 investAmount;
        uint256 tokenAmount;
        uint256 buyTime;
    }

    mapping(address => uint256) private withdraw;

    // How much BNB each address has invested to this crowdsale
    mapping(address => User) private userDetails;
    
    mapping (address => mapping (uint => Buy)) private buyDetails;
    
    // A new investment was made
    event Invested(address indexed investor, uint256 investAmount, uint256 tokenAmount);
    
    // Crowdsale Start time has been changed
    event StartsAtChanged(uint256 startsAt);
    
    // Crowdsale end time has been changed
    event EndsAtChanged(uint256 endsAt);
    
    // Lock time has been changed
    event LockTimeChanged(uint256 lockTime);
    
    // Calculated new price
    event RateChanged(uint256 oldValue, uint256 newValue);
    
    // Withdraw Event
    event Withdraw(uint256 amount, address indexed user, uint256 withdrawTime);
    
    function initialize(address _token) public onlyOwner{
        require(_token != address(0), "Invalid Address");
        token = ITRC20(_token);
    }
    
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    } 
    
    function setStartsAt(uint256 time) public onlyOwner{
        startsAt = time;
        emit StartsAtChanged(startsAt);
    }
    
    function setEndsAt(uint256 time) public onlyOwner {
        endsAt = time;
        emit EndsAtChanged(endsAt);
    }
    
    function setRate(uint256 value) public onlyOwner{
        require(value > 0);
        tokenPrice = value;
        emit RateChanged(tokenPrice, value);
    }
    
    function setLockTime(uint256 time) public onlyOwner{
        lockTime = time;
        emit LockTimeChanged(time);
    }
    
    function invest() public payable whenNotPaused{ 
        require(startsAt <= block.timestamp && endsAt > block.timestamp);
        uint256 tokensAmount = (msg.value).mul(10**6).div(tokenPrice);  // check
        if(userDetails[msg.sender].isExist){
            userDetails[msg.sender].totalBuy++;
        }else{
            User memory userInfo;
            userInfo = User({
                isExist : true,
                totalBuy: 1,
                withdrawAmount: 0
            });
            userDetails[msg.sender] = userInfo;
        }
        tokensSold += tokensAmount;
        Buy memory buyInfo;
        buyInfo = Buy({
            investAmount : msg.value,
            tokenAmount  : tokensAmount,
            buyTime      : block.timestamp
        });
        buyDetails[msg.sender][userDetails[msg.sender].totalBuy] = buyInfo;
         // Transfer Fund to owner's address
        payable(owner()).transfer(address(this).balance);
        // Emit an event that shows invested successfully
        emit Invested(msg.sender, msg.value, tokensAmount);
    }

    function transferTokens(uint256 amount) public onlyOwner{
        require(token.balanceOf(address(this)) > amount , "Not Enough Tokens");
        token.transfer(owner(), amount);
    } 
    
    function withdrawal(uint256 amount) public {
        uint256 releaseAmount = 0;
        require(amount > 0, "Amount Not be zero");
        for(uint i = 1 ; i <= userDetails[msg.sender].totalBuy ; i++){
            if(block.timestamp > buyDetails[msg.sender][i].buyTime + lockTime){
              uint256 time = (block.timestamp - (buyDetails[msg.sender][i].buyTime + lockTime)).div(30 days);
              releaseAmount = releaseAmount + (buyDetails[msg.sender][i].tokenAmount).div(5).mul(time);
            }
        }
        require(releaseAmount - userDetails[msg.sender].withdrawAmount >= amount, "Not Enough Amount");
        token.transfer(msg.sender, amount);
        userDetails[msg.sender].withdrawAmount += amount;
        emit Withdraw(amount, msg.sender, block.timestamp);
    }
    
    function price() public view returns (uint256){
        return tokenPrice;
    }
    
    function getToken() public view returns (ITRC20){
        return token;
    }
    
    function startTime() public view returns (uint256){
        return startsAt;
    }
    
    function endTime() public view returns (uint256){
        return endsAt;
    }
    
    function getInvestDetails(address account, uint256 index) public view returns(uint256, uint256, uint256){
        Buy memory buyInf = buyDetails[account][index];  
        return (buyInf.tokenAmount, buyInf.investAmount, buyInf.buyTime);
    }
    
    function getSoldTokens() public view returns (uint256) {
        return tokensSold;
    }
    
    function getLockTime() public view returns (uint256){
        return lockTime;
    }
    
    function getUserDetails(address account) public view returns (bool, uint256, uint256){
        User memory userInf = userDetails[account];
        return (userInf.isExist, userInf.totalBuy, userInf.withdrawAmount);
    }
}
