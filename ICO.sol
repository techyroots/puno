// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IERC20.sol";
import "./Ownable.sol";
import "./SafeMath.sol";
import "./Pausable.sol";

contract ICO is Ownable, Pausable {
    
    using SafeMath for uint256;
    
    // The token we are selling
    IERC20 private token;

    // the UNIX timestamp start date of the crowdsale
    uint256 private startsAt;

    // the UNIX timestamp end date of the crowdsale
    uint256 private endsAt;

    // the price of token
    uint256 private TokenPerBNB;

    // the number of tokens already sold through this contract
    uint256 private tokensSold = 0;

    // the number of ETH raised through this contract
    uint256 private weiRaised = 0;
    
    struct Invest{
        bool    isExist;
        uint256 totalBuy;
        uint256 investAmount;
        uint256 tokenAmount;
        uint256 buyTime;
        uint256 lockTime;
    }

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
    
    struct Referral{
        bool isExist;
        address referral;
        uint256 reward;
    }
    mapping(address => Referral) private user;
    
    function initialize(address _token) public onlyOwner{
         token = IERC20(_token);
    }
    
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    } 

    function investInternal(address receiver) private { 
        uint256 amount;
        require(!paused(), "Sale is paused");
        require(startsAt <= block.timestamp && endsAt > block.timestamp);
        uint256 tokensAmount = (msg.value).div(TokenPerBNB).mul(10 ** 18);
        if(user[receiver].referral != address(0)){
            uint256 referralreward = tokensAmount.mul(10).div(100);   // 10% of tokensAmount goes to referral.
            user[user[receiver].referral].reward += referralreward;   
            amount = tokensAmount.sub(referralreward); 
        }else{
            amount = tokensAmount;
        }
        
        if(investedAmount[receiver].isExist){
            investedAmount[receiver].totalBuy++;
            investedAmount[receiver].investAmount = msg.value;
            investedAmount[receiver].tokenAmount = amount;
            investedAmount[receiver].buyTime = block.timestamp;
            investedAmount[receiver].lockTime = block.timestamp + 182 days;
           
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
            investedAmount[receiver] = investInfo;
        }
        investDetails[receiver][investedAmount[receiver].totalBuy] = investedAmount[receiver];
        // Update totals
        tokensSold += tokensAmount;
        weiRaised += msg.value;

        // Emit an event that shows invested successfully
        emit Invested(receiver, msg.value, tokensAmount);

        // Transfer Fund to owner's address
        payable(owner()).transfer(address(this).balance);
    }

    function invest() public payable {
        investInternal(msg.sender);
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

    function withdrawTokens(uint256 amount) onlyOwner public {
        require(token.balanceOf(address(this)) > amount , "Not enough tokens");
        token.transfer(owner(), amount);
    } 
    
    function price() public view returns (uint256){
        return TokenPerBNB;
    }
    
    function getToken() public view returns (IERC20){
        return token;
    }
    
    function startTime() public view returns (uint256){
        return startsAt;
    }
    
    function endTime() public view returns (uint256){
        return endsAt;
    }
    
    function signup(address referral) public {
       require(referral != msg.sender, "INVALID :("); // User address and Referral must be different
       require(!user[msg.sender].isExist, "You already a member");
       Referral memory referralInfo;
       referralInfo = Referral({
            isExist: true,
            referral: referral,
            reward  : 0
        });
        user[msg.sender] = referralInfo;
    }
    
    function getRewardDetails(address account) public view returns (address, uint256){
        return (user[account].referral, user[account].reward);
    }
    
    function getInvestDetails(address account, uint256 index) public view returns(bool, uint256, uint256, uint256, uint256, uint256){
        Invest memory investInf = investDetails[account][index];  
        return (investInf.isExist, investInf.totalBuy, investInf.tokenAmount, investInf.investAmount, investInf.buyTime, investInf.lockTime);
    }
}
