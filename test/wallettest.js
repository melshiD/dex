const Dex = artifacts.require("Dex");
const Link = artifacts.require("Link");
const truffleAssert = require('truffle-assertions');





//user must have enough ETH deposited such that eth >= buy order value
//user must have enough tokens deposited such that the token balance >= sell order
//the buy order book must be ordered from highest to lowest starting at index 0
contract.skip("Dex", accounts => {
    it("should only be possible for owner to add tokens", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await truffleAssert.passes(
            //dex.addToken(web3.utils.fromUtf8("LINK"), link.address, {from: accounts[0]})
            dex.addToken("LINK", link.address, {from: accounts[0]})
        )
      //await truffleAssert.reverts(
      //    dex.addToken("AAVE", link.address, {from: accounts[1]})
      //)
    })//
    it("should handle deposits correctly", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await link.approve(dex.address, 500)
        await dex.deposit(100, "LINK");
        let balance = await dex.balances(accounts[0], "LINK")
        assert.equal(balance.toNumber(), 100)
    })

    it("should only be possible for owner to add MORE tokens!", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await truffleAssert.passes(
            dex.addToken("TRIQ", link.address, {from: accounts[0]})
        )
        await truffleAssert.reverts(
            dex.addToken("DRZL", link.address, {from: accounts[1]})
        )
     })

     it("should handle faulty withdrawls correctly", async () => {
         let dex = await Dex.deployed()
         let link = await Link.deployed()
         await truffleAssert.reverts(dex.withdraw(500, "LINK"))
         await truffleAssert.reverts(dex.withdraw(500, "TRIQ"))  
     })
     it("should handle correct withdrawls correctly", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await truffleAssert.passes(dex.withdraw(100, "LINK"))
    })
})
