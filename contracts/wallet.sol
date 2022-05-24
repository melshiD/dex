pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/token/erc20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";
contract Wallet is Ownable{

    using SafeMath for uint256;

    
    //constructor to ensure ETH has a native place on the mapping for my DEX   
  //constructor (){ 
  //    tokenMapping["ETH"] = Token("ETH", address(this));
  //}

    struct Token{
            string ticker;
            address tokenAddress;
    }

    modifier tokenExists(string memory ticker){
        require(tokenMapping[ticker].tokenAddress != address(0), "token does not exist");
        _;
    }

    mapping(string => Token) public tokenMapping;
    
    string[] public tokenList;

    mapping(address => mapping(string => uint256)) public balances;

    event deposit_successful(address toAccount, string ticker, uint amount);

    function addToken(string memory ticker, address tokenAddress) onlyOwner external{
        tokenMapping[ticker] = Token(ticker, tokenAddress);
        tokenList.push(ticker);
    }
    
    function deposit(uint amount, string memory ticker) tokenExists(ticker) external{
        IERC20(tokenMapping[ticker].tokenAddress).transferFrom(msg.sender, address(this), amount);
        balances[msg.sender][ticker] = balances[msg.sender][ticker].add(amount);
    }
    
    function withdraw(uint amount, string memory ticker) tokenExists(ticker) external{
        require(balances[msg.sender][ticker] >= amount, "balance not sufficient");
        balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(amount);
        IERC20(tokenMapping[ticker].tokenAddress).transfer(msg.sender, amount);
        //calls the .transfer() function of the contract at the address 
        //given by TokenMapping...
    }

}


