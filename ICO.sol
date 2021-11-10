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
    uint256 private TokenPerBNB;

    // the number of tokens already sold through this contract
    uint256 private tokensSold = 0;
    
    // referral paused
    bool private refpaused = false;
    
    // minimum withdraw amount
    uint256 private minWithdraw = 10000000000000000000;
    
    // invest struct
    struct Invest{
        bool    isExist;
        uint256 totalBuy;
        uint256 investAmount;
        uint256 tokenAmount;
        uint256 buyTime;
        uint256 lockTime;
    }
    
    mapping(address => uint256) private withdraw;

    // How much BNB each address has invested to this crowdsale
    mapping (address => Invest) private investedAmount;
    
    mapping (address => mapping (uint => Invest)) private investDetails;
    
    // A new investment was made
    event Invested(address investor, uint256 weiAmount, uint256 tokenAmount);
    
    // Crowdsale Start time has been changed
    event StartsAtChanged(uint256 startsAt);
    
    // Crowdsale end time has been changed
    event EndsAtChanged(uint256 endsAt);
    
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
        refpaused = false;
    }
    
    function setReferralUnpaused() public onlyOwner{
        refpaused = true;
    }
    
    function setStartsAt(uint256 time) onlyOwner public {
        startsAt = time;
        emit StartsAtChanged(startsAt);
    }
    
    function setEndsAt(uint256 time) onlyOwner public {
        endsAt = time;
        emit EndsAtChanged(endsAt);
    }
    
    function setRate(uint256 value) onlyOwner public {
        require(value > 0);
        emit RateChanged(TokenPerBNB, value);
        TokenPerBNB = value;
    }

    function invest(address referral) public payable { 
        uint256 amount;
        require(!paused(), "Sale is paused");
        require(startsAt <= block.timestamp && endsAt > block.timestamp);
        require(referral != msg.sender, "Invalid");
        uint256 tokensAmount = (msg.value).div(TokenPerBNB).mul(10 ** 18);
        if(!refpaused && referral != address(0)){
            uint256 referralpercent = tokensAmount.mul(10).div(100);   // 10% of tokensAmount goes to referral.
            token.transfer(referral, referralpercent);
            amount = tokensAmount.sub(referralpercent); 
        }
        else{
            amount = tokensAmount;
        }
        
        if(investedAmount[msg.sender].isExist){
            investedAmount[msg.sender].totalBuy++;
            investedAmount[msg.sender].investAmount = msg.value;
            investedAmount[msg.sender].tokenAmount = amount;
            investedAmount[msg.sender].buyTime = block.timestamp;
            investedAmount[msg.sender].lockTime = block.timestamp + 182 days;
           
        }else{
            Invest memory investInfo;
            investInfo = Invest({
                isExist      : true,
                totalBuy     : 1,
                investAmount : msg.value,
                tokenAmount  : amount,
                buyTime      : block.timestamp,
                lockTime     : block.timestamp + 182 days
            });
            investedAmount[msg.sender] = investInfo;
        }
        investDetails[msg.sender][investedAmount[msg.sender].totalBuy] = investedAmount[msg.sender];
        // Update totals
        tokensSold += tokensAmount;

        // Emit an event that shows invested successfully
        emit Invested(msg.sender, msg.value, tokensAmount);

        // Transfer Fund to owner's address
        payable(owner()).transfer(address(this).balance);
    }

    function withdrawTokens(uint256 amount) onlyOwner public {
        require(token.balanceOf(address(this)) > amount , "Not enough tokens");
        token.transfer(owner(), amount);
    } 
    
    function withdrawal(uint256 amount) public {
        uint256 releaseAmount = 0;
        require(amount > minWithdraw, "Minimum Withdrawal amount not met");
        for(uint i = 1 ; i <= investedAmount[msg.sender].totalBuy ; i++){
            if(block.timestamp > investDetails[msg.sender][i].lockTime){
              uint256 lockTime = (block.timestamp - investDetails[msg.sender][i].lockTime).div(30 days);
              releaseAmount += (investDetails[msg.sender][i].tokenAmount).div(5).mul(lockTime);
            }
        }
        require(releaseAmount - withdraw[msg.sender] > amount, "Not Enough Amount");
        token.transfer(msg.sender, amount);
        withdraw[msg.sender] += amount;
        emit Withdraw(amount, msg.sender, block.timestamp);
    }
    
    function price() public view returns (uint256){
        return TokenPerBNB;
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
        return refpaused;
    }
    
    function getInvestDetails(address account, uint256 index) public view returns(bool, uint256, uint256, uint256, uint256, uint256){
        Invest memory investInf = investDetails[account][index];  
        return (investInf.isExist, investInf.totalBuy, investInf.tokenAmount, investInf.investAmount, investInf.buyTime, investInf.lockTime);
    }
    
    function getSoldTokens() public view returns (uint256) {
        return tokensSold;
    }
}
