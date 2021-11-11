// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IBEP20.sol";
import "./Ownable.sol";
import "./SafeMath.sol";
import "./Pausable.sol";

contract ICO is Ownable, Pausable {
    
    using SafeMath for uint256;
    
    // The token we are selling
    IBEP20 private token;

    // the UNIX timestamp start date of the crowdsale
    uint256 private startsAt;

    // the UNIX timestamp end date of the crowdsale
    uint256 private endsAt;

    // the price of token
    uint256 private tokenPerBNB;

    // the number of tokens already sold through this contract
    uint256 private tokensSold = 0;
    
    // referral paused
    bool private refPaused = false;
    
    // minimum withdraw amount
    uint256 private minWithdraw = 10000000000000000000;
    
    uint256 private lockTime  = 182 days;
    
    // invest struct
    struct Invest{
        bool    isExist;
        uint256 totalBuy;
        uint256 investAmount;
        uint256 tokenAmount;
        uint256 buyTime;
    }
    
    mapping(address => uint256) private withdraw;

    // How much BNB each address has invested to this crowdsale
    mapping (address => Invest) private investedAmount;
    
    mapping (address => mapping (uint => Invest)) private investDetails;
    
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
         token = IBEP20(_token);
    }
    
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    } 
    
    function setReferralPaused() public onlyOwner{
        refPaused = false;
    }
    
    function setReferralUnpaused() public onlyOwner{
        refPaused = true;
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
        tokenPerBNB = value;
        emit RateChanged(tokenPerBNB, value);
    }
    
    function setLockTime(uint256 time) public onlyOwner{
        lockTime = time;
        emit LockTimeChanged(time);
    }

    function invest() public payable { 
        require(!paused(), "Sale is paused");
        require(startsAt <= block.timestamp && endsAt > block.timestamp);
        uint256 tokensAmount = (msg.value).div(tokenPerBNB).mul(10 ** 18);
        if(investedAmount[msg.sender].isExist){
            investedAmount[msg.sender].totalBuy++;
            investedAmount[msg.sender].investAmount = msg.value;
            investedAmount[msg.sender].tokenAmount = tokensAmount;
            investedAmount[msg.sender].buyTime = block.timestamp;
        }else{
            Invest memory investInfo;
            investInfo = Invest({
                isExist      : true,
                totalBuy     : 1,
                investAmount : msg.value,
                tokenAmount  : tokensAmount,
                buyTime      : block.timestamp
            });
            investedAmount[msg.sender] = investInfo;
        }
        investDetails[msg.sender][investedAmount[msg.sender].totalBuy] = investedAmount[msg.sender];
        // Update totals
        tokensSold += tokensAmount;
        
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
        require(amount > minWithdraw, "Minimum Withdrawal Amount Not Met");
        for(uint i = 1 ; i <= investedAmount[msg.sender].totalBuy ; i++){
            if(block.timestamp > investDetails[msg.sender][i].buyTime + lockTime){
              uint256 locksTime = (block.timestamp - (investDetails[msg.sender][i].buyTime + lockTime)).div(30 days);
              releaseAmount += (investDetails[msg.sender][i].tokenAmount).div(5).mul(locksTime);
            }
        }
        require(releaseAmount - withdraw[msg.sender] > amount, "Not Enough Amount");
        token.transfer(msg.sender, amount);
        withdraw[msg.sender] += amount;
        emit Withdraw(amount, msg.sender, block.timestamp);
    }
    
    function price() public view returns (uint256){
        return tokenPerBNB;
    }
    
    function getToken() public view returns (IBEP20){
        return token;
    }
    
    function startTime() public view returns (uint256){
        return startsAt;
    }
    
    function endTime() public view returns (uint256){
        return endsAt;
    }
    
    function getRefPause() public view returns (bool){
        return refPaused;
    }
    
    function getInvestDetails(address account, uint256 index) public view returns(bool, uint256, uint256, uint256, uint256){
        Invest memory investInf = investDetails[account][index];  
        return (investInf.isExist, investInf.totalBuy, investInf.tokenAmount, investInf.investAmount, investInf.buyTime);
    }
    
    function getSoldTokens() public view returns (uint256) {
        return tokensSold;
    }
}
