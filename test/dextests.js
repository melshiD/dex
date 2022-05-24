const Dex = artifacts.require("Dex");
const Link = artifacts.require("Link");
const isETH = artifacts.require("isETH");
const { default: BigNumber } = require('bignumber.js');
const truffleAssert = require('truffle-assertions');





contract.skip("Dex", accounts => {
    //TEST 1
    it("should add ethCoin as well as Link", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        let ethCoin = await isETH.deployed()
        await truffleAssert.passes(
            //dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]})
            dex.addToken("LINK", link.address, {from: accounts[0]})
        )
        await truffleAssert.passes(
            dex.addToken("ETH", ethCoin.address, {from: accounts[0]})
        )
    })

    //TEST 2
    it("dex should allow creation of a limit order", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        let ethCoin = await isETH.deployed()      
        
        await dex.addToken("ETH", ethCoin.address, {from: accounts[0]})
        await ethCoin.approve(dex.address, 300)
        await dex.deposit(100, "ETH", {from: accounts[0]})
        //await dex.depositEth({value: ether(1)})
        await truffleAssert.passes(
            dex.createLimitOrder(0, "ETH", 1, 1)
        )
        await truffleAssert.passes(
            dex.createLimitOrder(0, "ETH", 1, 1)
        )
      
    })

    //TEST 3
    it("should throw an error if token balance is too low when creating SELL limit order", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await truffleAssert.reverts(
            dex.createLimitOrder(1, "LINK", 10, 1)
        )
        await link.approve(dex.address, 500)
        await dex.deposit(10, "LINK")
        truffleAssert.passes(
            dex.createLimitOrder(1, "LINK", 10, 1)
        )
           
    })

    it("Contract should allow production of order if balance of tokens is sufficient", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()   
        await dex.deposit(100, "LINK")        
        truffleAssert.passes( 
            dex.createLimitOrder(1, "LINK", 10, 1)    
        )
    })

    //The BUY order book should be ordered on price from hightest to lowest starting at index 0
    it("The BUY order book should be ordered on price from hightest to lowest starting at index 0", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await link.approve(dex.address, 500)
        //await dex.depositEth({value: 3000})
        await dex.createLimitOrder(0, "LINK", 1, 30)
        await dex.createLimitOrder(0, "LINK", 1, 10)
        await dex.createLimitOrder(0, "LINK", 1, 20)

        let orderbook = await dex.getOrderBook("LINK", 0)
        assert(orderbook.length > 0)
        for(let i = 0; i < orderbook.length - 1; i++) {
            assert(orderbook[i].price >= orderbook[i+1].price, "not right order in the BUY book")
        }
    })
    //The SELL order book should be ordered on price from lowest to highest starting at index 0
    //TEST 5
    it("SELL order book should be ordered on price from lowest to hightest starting at index 0", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await link.approve(dex.address, 500)
        await dex.createLimitOrder(1, "LINK", 1, 300)
        await dex.createLimitOrder(1, "LINK", 1, 100)
        await dex.createLimitOrder(1, "LINK", 1, 200)

        //new Promise(() => console.log(dex.balances[msg.sender]["LINK"]))
        //await console.log(dex.orderBook["LINK"][1])

        let orderbook = await dex.getOrderBook("LINK", 1)
        console.log(orderbook)
        assert(orderbook.length > 0);
        for (let i = 0; i < orderbook.length - 1; i++){
            assert(orderbook[i].price <= orderbook[i + 1].price, "check your SELL orderbook ordering")
        }
    })
})
contract.skip("Dex", accounts => {
    it("set up new conditions for incoming market orders", async () => {
        let dex = await Dex.deployed()
        let ethCoin = await isETH.deployed()
        let link = await Link.deployed()
        await dex.addToken("LINK", link.address, {from: accounts[0]})
        await link.approve(dex.address, 1000)
        await dex.deposit(1000, "LINK", {from: accounts[0]})
        await dex.addToken("ETH", ethCoin.address, {from: accounts[0]})
        await ethCoin.approve(dex.address, 1000)
        await dex.deposit(1000, "ETH", {from: accounts[0]})
        //initialize account activity for other addresses as well (find a way to script script generation)
        //send eth and link from accounts
        for(let counter = 1; counter < accounts.length; counter ++){
            await dex.transferInDex(accounts[counter], "LINK", 100, {from: accounts[0]});
            await dex.transferInDex(accounts[counter], "ETH", 100, {from: accounts[0]});
            let thisBalance = dex.returnBalance(accounts[counter], "ETH")
            await truffleAssert.passes(thisBalance == 100)
            //console.log(thisBalance)
        }
        //at this point in the state, every account has 100 of each ERC20 "LINK" and "ETH"

    })
    //create order books.  Be deliberate for conditions of each test needed


    it("Should allow for proper initilization of the orderbook via limit order placements", async () => {
        let dex = await Dex.deployed()
        let ethCoin = await isETH.deployed()
        let link = await Link.deployed()
        await truffleAssert.passes(
            dex.createLimitOrder(1, "LINK", 10, 1, {from: accounts[2]})
        )
        let multiplier = 1;
        //side, ticker, amount, price
        for(let counter = 0; counter < accounts.length; counter++){
            await dex.createLimitOrder(1, "LINK", 10, (1 * multiplier), {from: accounts[counter]})
            await dex.createLimitOrder(0, "LINK", (5*multiplier), (1 * multiplier), {from: accounts[counter]})
            multiplier += parseInt(0.1);
        }
    })
    //every account has made a buy and a sell limit order.  The amounts have varied with the value of multiplier
    it("Should know whether a trader has enough eth to back up a buy order", async () => {
        let dex = await Dex.deployed()
        let ethCoin = await isETH.deployed()
        let link = await Link.deployed()
        truffleAssert.passes(
            await dex.createMarketOrder(0, "LINK", 1000)
        )
    })
    
})
contract.skip("Dex", accounts => {
    it("set up new conditions for market creation", async () => {
        let dex = await Dex.deployed()
        let ethCoin = await isETH.deployed()
        let link = await Link.deployed()
        await dex.addToken("LINK", link.address, {from: accounts[0]})
        await link.approve(dex.address, 1000)
        await dex.deposit(1000, "LINK", {from: accounts[0]})
        await dex.addToken("ETH", ethCoin.address, {from: accounts[0]})
        await ethCoin.approve(dex.address, 1000)
        await dex.deposit(1000, "ETH", {from: accounts[0]})
        //initialize account activity for other addresses as well (find a way to script script generation)
        //send eth and link from accounts
        for(let counter = 1; counter < accounts.length; counter ++){
            await dex.transferInDex(accounts[counter], "LINK", 100, {from: accounts[0]});
            await dex.transferInDex(accounts[counter], "ETH", 100, {from: accounts[0]});
            let thisBalance = dex.returnBalance(accounts[counter], "ETH")
            await truffleAssert.passes(thisBalance == 100)
        }
        //at this point in the state, every account has 100 of each ERC20 "LINK" and "ETH"
    })
    //it("should allow for addition of market order even if orderbook is empty", async () => {

    //IT should allow for addition of market orders even into an empty book
    it("Allow generation of multiple limit orders to set up for market orders", async () => {
        let dex = await Dex.deployed()
        let ethCoin = await isETH.deployed()
        let link = await Link.deployed()
        //side, ticker, amount, price
        await dex.createLimitOrder(0, "LINK", 10, 1, {from: accounts[0]})
        await dex.createLimitOrder(0, "LINK", 10, 1, {from: accounts[1]})
        await dex.createLimitOrder(0, "LINK", 10, 1, {from: accounts[2]})
        await dex.createLimitOrder(0, "LINK", 10, 2, {from: accounts[3]})
        await dex.createLimitOrder(0, "LINK", 10, 2, {from: accounts[4]})
        await dex.createLimitOrder(0, "LINK", 10, 2, {from: accounts[5]})
        await dex.createLimitOrder(0, "LINK", 10, 2, {from: accounts[6]})
        await dex.createLimitOrder(0, "LINK", 10, 3, {from: accounts[7]})
        await dex.createLimitOrder(0, "LINK", 10, 4, {from: accounts[8]})
        await dex.createLimitOrder(0, "LINK", 10, 4, {from: accounts[9]})
        //create sell orders
        await dex.createLimitOrder(1, "LINK", 10, 5, {from: accounts[0]})
        await dex.createLimitOrder(1, "LINK", 10, 5, {from: accounts[1]})
        await dex.createLimitOrder(1, "LINK", 10, 5, {from: accounts[2]})
        await dex.createLimitOrder(1, "LINK", 10, 3, {from: accounts[3]})
        await dex.createLimitOrder(1, "LINK", 10, 5, {from: accounts[4]})
        await dex.createLimitOrder(1, "LINK", 10, 1, {from: accounts[5]})
        await dex.createLimitOrder(1, "LINK", 10, 1, {from: accounts[6]})
        await dex.createLimitOrder(1, "LINK", 10, 5, {from: accounts[7]})
        await dex.createLimitOrder(1, "LINK", 10, 5, {from: accounts[8]})
        await dex.createLimitOrder(1, "LINK", 10, 6, {from: accounts[9]})
    })
    it("should revert if market order trader doesn't have enough funds", async () => {
        let dex = await Dex.deployed()
        let ethCoin = await isETH.deployed()
        let link = await Link.deployed()
        await truffleAssert.passes(
            dex.createMarketOrder(0, "LINK", 12)
        )
    })

})
contract("Dex", accounts => {
    it("Able to add ethCoin and Link and deposit into dex", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        let ethCoin = await isETH.deployed()
        //add tokens to the dex
        truffleAssert.passes(
            dex.addToken("LINK", link.address, {from: accounts[0]})
        )
        dex.addToken("ETH", ethCoin.address, {from: accounts[0]})
        link.approve(dex.address, 1000)
        ethCoin.approve(dex.address, 1000)
        await truffleAssert.passes(
            dex.deposit(1000, "LINK")
        )
        await truffleAssert.passes(
            dex.deposit(1000, "ETH")
        )
    })
    it("able to transfer tokens from account 0 to others to set initial conditions of market state", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        let ethCoin = await isETH.deployed()
        await dex.transferTokenInDex(accounts[1], "LINK", 333)
        await dex.transferTokenInDex(accounts[2], "LINK", 333)
        await dex.transferTokenInDex(accounts[3], "LINK", 329)
        await dex.transferTokenInDex(accounts[1], "ETH", 333)
        await dex.transferTokenInDex(accounts[2], "ETH", 333)
        await dex.transferTokenInDex(accounts[3], "ETH", 334)
         //console.log(parseInt(await dex.returnBalance(accounts[0],"LINK")))
         //console.log(await dex.returnBalance(accounts[0],"LINK"))
        let accountBalance = new BigNumber(await dex.returnBalance(accounts[0], "LINK"))
        console.log(accountBalance.toFixed())
        await truffleAssert.passes(dex.returnBalance(accounts[0],"LINK"))
            dex.transferTokenInDex(accounts[3], "LINK", 5)//account 0 should be out of LINK now
        await truffleAssert.reverts(
            dex.transferTokenInDex(accounts[3], "LINK", 1) 
        )
    })
    /*it("Should allow for the creation of Limit buy orders", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        let ethCoin = await isETH.deployed()
        await truffleAssert.passes(dex.createLimitOrder(0, "LINK", 10, 1, {from: accounts[1]}))
        await truffleAssert.passes(dex.createLimitOrder(0, "LINK", 10, 2, {from: accounts[1]}))
        await truffleAssert.passes(dex.createLimitOrder(0, "LINK", 10, 2, {from: accounts[2]}))
        await truffleAssert.passes(dex.createLimitOrder(0, "LINK", 10, 2, {from: accounts[1]}))
        await truffleAssert.passes(dex.createLimitOrder(0, "LINK", 10, 3, {from: accounts[3]}))
        await truffleAssert.passes(dex.createLimitOrder(0, "LINK", 10, 4, {from: accounts[1]}))
        await truffleAssert.passes(dex.createLimitOrder(0, "LINK", 10, 2, {from: accounts[3]}))
        await truffleAssert.passes(dex.createLimitOrder(0, "LINK", 10, 1, {from: accounts[1]}))
        await truffleAssert.reverts(dex.createLimitOrder(1, "LINK", 10, 1))//no link left in account 0 to sell
    })
    it("Should allow for the creation of limit sell orders", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        let ethCoin = await isETH.deployed()
        await truffleAssert.passes(dex.createLimitOrder(1, "LINK", 10, 1, {from: accounts[1]}))
        await truffleAssert.passes(dex.createLimitOrder(1, "LINK", 10, 2, {from: accounts[2]}))
        await truffleAssert.passes(dex.createLimitOrder(1, "LINK", 10, 2, {from: accounts[2]}))
        await truffleAssert.passes(dex.createLimitOrder(1, "LINK", 10, 3, {from: accounts[3]}))
        await truffleAssert.passes(dex.createLimitOrder(1, "LINK", 10, 4, {from: accounts[2]}))
        await truffleAssert.passes(dex.createLimitOrder(1, "LINK", 10, 4, {from: accounts[1]}))
        await truffleAssert.passes(dex.createLimitOrder(1, "LINK", 10, 4, {from: accounts[1]}))
        await truffleAssert.passes(dex.createLimitOrder(1, "LINK", 10, 5, {from: accounts[2]}))
        await truffleAssert.passes(dex.createLimitOrder(1, "LINK", 10, 1, {from: accounts[3]}))
        await truffleAssert.passes(dex.createLimitOrder(1, "LINK", 10, 2, {from: accounts[3]}))
        await truffleAssert.passes(dex.createLimitOrder(1, "LINK", 10, 2, {from: accounts[3]}))
        await truffleAssert.passes(dex.createLimitOrder(1, "LINK", 10, 3, {from: accounts[1]}))
    })*/
})




    //when creating a sell market order, the seller needs to have enough tokens for the trade
    //when creating a buy market order, the buyer needs to have enough eth
    //Market orders can be submitted even if the order book is empty
    //Market orders should be filled until the order book is empty or the market order is 100% filled
    //The eth balance of the buyer should decrease with the filled amount
    //The token balances of the limit order sellers should decrease with the appropriate amount
    //filled limit orders should be removed from the orderbook
