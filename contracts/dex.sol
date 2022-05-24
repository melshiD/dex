pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "./wallet.sol";


contract Dex is Wallet{
    //needs mechanism to track balances of trader's pending trades
    using SafeMath for uint256;

    enum Side{
    BUY,
    SELL
    }
    
    struct Order{
        uint id;
        address trader;
        Side side;
        string ticker;
        uint amount;
        uint price;
        uint amountSpokenFor;
        uint isMarketOrder;
    }
        
    uint public orderIds = 0;

    mapping(string => mapping(uint => Order[])) public orderBook;
    
    receive ()external payable{
        depositEth();
    }
    function depositEth() public payable{
        balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"].add(msg.value);
    }
    function getOrderBook(string memory _ticker, Side side) public view returns(Order[] memory){
        return orderBook[_ticker][uint(side)];
    }
    function incrimentOrderIds() internal{
        orderIds ++;
    }
    function createLimitOrder(Side side, string memory ticker, uint amount, uint price) public{
        uint isMarketOrder = 0;
        _createOrder(side, ticker, amount, price, isMarketOrder);
    }
    function createMarketOrder(Side side, string memory ticker, uint amount) public{
        uint isMarketOrder = 1;
        uint dummyPrice = 0;
        _createOrder(side, ticker, amount, dummyPrice, isMarketOrder);
    }
    function _createOrder(Side side, string memory ticker, uint amount, uint price, uint isMarketOrder) private{
        Order memory newOrder = Order(orderIds, msg.sender, side, ticker, amount, price, 0, isMarketOrder);
        if(side == Side.BUY){
            require(checkOrderFillabilityAndEarmark(newOrder),"checkFillability function reverted");//unfillable MARKET orders will NOT be pushed to array
            Order[] storage orders = orderBook[ticker][uint(side)];
            orders.push(newOrder);
            sortAndExecute(ticker, side);//and fill orders while...
        }
        else if(side == Side.SELL){

        }
    }
    function checkOrderFillabilityAndEarmark(Order memory newOrder) internal returns(bool){//differences in the behavior of limit orders vice market orders are managed largely within this function
        //check that limit orders have enough eth to back up token amount times token price
        if(newOrder.isMarketOrder == 0){
            require(balances[newOrder.trader]["ETH"] >= newOrder.amount * newOrder.price, "You don't have enough ETH to validate this request");
            return true;
        } 
        Order[] storage sellOrders = orderBook[newOrder.ticker][1];
        uint tradersEthBalance = balances[msg.sender]["ETH"];
        uint amountNeedingFilled = newOrder.amount;
        uint liquidityAvailable = sellOrders[0].amount;
 
        uint runningPriceOfOrder = sellOrders[0].price * liquidityAvailable;//price of purchasing top order
        uint countOrdersUntilFilled = 1;

        while(liquidityAvailable < amountNeedingFilled){
            if(countOrdersUntilFilled == sellOrders.length){revert("Not enough liquidity to complete trade");}
            liquidityAvailable += sellOrders[countOrdersUntilFilled].amount;
            sellOrders[countOrdersUntilFilled].amountSpokenFor = sellOrders[countOrdersUntilFilled].amount;
            runningPriceOfOrder += sellOrders[countOrdersUntilFilled].amount.mul(sellOrders[countOrdersUntilFilled].price);
            if(liquidityAvailable + sellOrders[countOrdersUntilFilled].amount >= amountNeedingFilled){
                uint remainder = amountNeedingFilled - liquidityAvailable;
                sellOrders[countOrdersUntilFilled].amountSpokenFor = remainder;
                require(tradersEthBalance >= runningPriceOfOrder + (remainder * sellOrders[countOrdersUntilFilled].price), "You don't have enough ETH");
                return true;
            }
            countOrdersUntilFilled ++;
        }
        revert();
    }
    function sortAndExecute(string memory ticker, Side side) internal returns(bool){
        Order[] storage bookToSort = orderBook[ticker][uint(side)];
        //Order[] memory bookToSort = getOrderBook(ticker, side);
        uint i = bookToSort.length > 0 ? bookToSort.length -1 : 0;

        if(side == Side.BUY){
            if(bookToSort[i].isMarketOrder == 0){//this is a MARKET ORDER
                //take what is needed off opposing orderbook's top orders, and then 
                //remove the filled market order.  No more need to sort further
                uint orderBookLength = bookToSort.length;
                executeNewMarketBuyOrder(ticker, orderBookLength);
                bookToSort.pop();
                
            }
            //if isMarketOrder?
            //at this point any order to be filled will be at the end of the array
            //if the order was a limit order, the applicable filling orders will have a 
            //specified ammount of spokenFor component.  Fill the order, and remove
            //the now depleted orders.  If a remainder in the limit orders filling a market order
            //then edit the amount field of the remaining order's remaining amount
                while(i > 0){
                if(bookToSort[i - 1].price > bookToSort[i].price){break;}
                Order memory orderToSort = bookToSort[i - 1];
                bookToSort[i -1] = bookToSort[i];
                bookToSort[i] = orderToSort;
                i--;
            }
        }
        if(side == Side.SELL){
             while(i > 0){
                if(bookToSort[i - 1].price < bookToSort[i].price){break;}
                Order memory orderToSort = bookToSort[i - 1];
                bookToSort[i -1] = bookToSort[i];
                bookToSort[i] = orderToSort;
                i--;
            }
        }
        return true;
    }
    function executeNewMarketBuyOrder(string memory ticker, uint buyOrderBookLength) internal{
        Order[] storage sellOrders = orderBook[ticker][1];
        Order memory marketOrderBeingFilled = getOrderBook(ticker, Side.BUY)[buyOrderBookLength - 1];
        uint amountToExchange = marketOrderBeingFilled.amount;
        uint isPartialFill;
        uint TESTING_thisAmountExchanged = 0;
        Order memory thisSellOrder = orderBook[ticker][1][0];
        while(amountToExchange > 0){
            //Order memory thisSellOrder = orderBook[ticker][1][0];
            if(thisSellOrder.amount == thisSellOrder.amountSpokenFor){
                isPartialFill = 0;
                TESTING_thisAmountExchanged = thisSellOrder.amountSpokenFor;
                transferTokenInDex(thisSellOrder, marketOrderBeingFilled, isPartialFill);
                removeOrderFromBook(thisSellOrder);
                amountToExchange -= TESTING_thisAmountExchanged;
            }
            else{
                isPartialFill = thisSellOrder.amountSpokenFor;
                transferTokenInDex(thisSellOrder, marketOrderBeingFilled, isPartialFill);
                thisSellOrder.amount = thisSellOrder.amount.sub(isPartialFill);
                removeOrderFromBook(marketOrderBeingFilled);
                amountToExchange -= isPartialFill;
            }
        }
    }
    function transferTokenInDex(Order memory tokenSellersOrder, Order memory tokenBuyersOrder, uint isPartialFill) internal{
        uint ethTransferAmount = isPartialFill != 0 ? isPartialFill*tokenSellersOrder.price : tokenSellersOrder.amount*tokenSellersOrder.price;
        uint tokenTransferAmount = isPartialFill != 0 ? isPartialFill: tokenSellersOrder.amount;
        require(balances[tokenSellersOrder.trader][tokenSellersOrder.ticker] >= tokenSellersOrder.amount, "You don't have the funds to make this transfer");
        require(balances[tokenBuyersOrder.trader]["ETH"] >= ethTransferAmount, "you don't have enough ETH for this trade");
        
        balances[tokenSellersOrder.trader][tokenSellersOrder.ticker] = balances[tokenSellersOrder.trader][tokenSellersOrder.ticker].sub(tokenTransferAmount);
        balances[tokenBuyersOrder.trader][tokenBuyersOrder.ticker] = balances[tokenBuyersOrder.trader][tokenBuyersOrder.ticker].add(tokenTransferAmount);
        balances[tokenSellersOrder.trader]["ETH"] = balances[tokenSellersOrder.trader]["ETH"].add(ethTransferAmount);
        balances[tokenBuyersOrder.trader]["ETH"] = balances[tokenBuyersOrder.trader]["ETH"].sub(ethTransferAmount);
    }
    function removeOrderFromBook(Order memory orderToRemove) internal returns(bool){
        Order[] storage activeOrderBook = orderBook[orderToRemove.ticker][uint(orderToRemove.side)];
        if(orderToRemove.id == activeOrderBook[activeOrderBook.length - 1].id){//if order is at the end of the book, just pop 
            activeOrderBook.pop();
            return true;
        }
        else{
            for(uint i = 0; i < activeOrderBook.length; i++){
                activeOrderBook[i] = activeOrderBook[i+1];
            }
            activeOrderBook.pop();
            return true;
        }
    }
    function returnBalance(address accountAddy, string memory ticker) public view returns(uint){
        return balances[accountAddy][ticker];
    }
}  