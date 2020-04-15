/** 
* This contract tests the Tellor functions
*/ 

const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));
const helper = require("./helpers/test_helpers");
const Tellor = artifacts.require("./Tellor.sol"); // globally injected artifacts helper
var ERC20 = artifacts.require("./ERC20.sol");
var oracleAbi = Tellor.abi;

contract('ACS specific Tests', function(accounts) {
  let oracle;
  let tellorToken;

    beforeEach('Setup contract for each test', async function () {
        tellorToken = await ERC20.new();
        for(var i = 0;i<10;i++){
          await tellorToken.mint(accounts[i],web3.utils.toWei('200','ether'));
        }
        oracle = await Tellor.new(tellorToken.address);
        for(var i = 0;i<5;i++){
          await tellorToken.approve(oracle.address,web3.utils.toWei('100','ether'),{from:accounts[i]});
          await oracle.depositStake(web3.utils.toWei('100'),{from:accounts[i],gas:2000000,})
        }
        await oracle.addTip(1,0,{from:accounts[0],gas:2000000})
   });  

   it("change Tellor Contract", async function () {
    assert(await oracle.getAddressVars(web3.utils.keccak256("_deity")) == accounts[0])
    assert(await oracle.getAddressVars(web3.utils.keccak256("tellorToken")) == tellorToken.address, "token address should be correct")
    let newToken = await ERC20.new()
    await oracle.changeTellorToken(newToken.address);
    assert(await oracle.getAddressVars(web3.utils.keccak256("tellorToken")) == newToken.address, "new token should be correct")
   });
   it("test multiple staking one address", async function () {
     await tellorToken.approve(oracle.address,web3.utils.toWei('200','ether'),{from:accounts[5]});
    await oracle.depositStake(web3.utils.toWei('200'),{from:accounts[5],gas:2000000})
    assert(await oracle.balanceOf(accounts[5]) == web3.utils.toWei('200'))
    let vars = await oracle.getStakerInfo(accounts[5])
    assert(vars[2] == 2, "should be staked twice");
   });
   it("test multiple staking one address, removal of part", async function () {
    await tellorToken.approve(oracle.address,web3.utils.toWei('200','ether'),{from:accounts[5]});
    console.log('aproval')
    await oracle.depositStake(web3.utils.toWei('200'),{from:accounts[5],gas:2000000})
    console.log('deposit')
    await oracle.requestStakingWithdraw(web3.utils.toWei('100'),{from:accounts[5],gas:2000000})
    console.log('requestWithdraw')
    await helper.advanceTime(86400 * 8);
    console.log('advanceTime')
    await oracle.withdrawStake({from:accounts[5],gas:2000000})
    assert(await oracle.balanceOf(accounts[5]) == web3.utils.toWei('100'))
    let vars = await oracle.getStakerInfo(accounts[5])
    assert(vars[2] == 1);
   });

   /* where do we select initial validators--currently only in NewBlock...??*/
    it("check validator selection", async function () {
      let miners = await oracle.getCurrentMiners();
      assert(miners.length == 5, "miner selection should work")
   });
   it("test multiple staking one address, dispute and slashing", async function () {
     await tellorToken.approve(oracle.address,web3.utils.toWei('200','ether'),{from:accounts[5]});
      await oracle.depositStake(web3.utils.toWei('200'),{from:accounts[5],gas:2000000})
      await oracle.requestStakingWithdraw(web3.utils.toWei('100'),{from:accounts[5],gas:2000000})
      await helper.advanceTime(86400 * 8);
      await oracle.withdrawStake({from:accounts[5]})
      await  oracle.beginDispute(1,res[0],2,{from:accounts[1],gas:2000000});
      count = await oracle.getUintVar(web3.utils.keccak256("disputeCount"));
      await oracle.vote(1,true,{from:accounts[3],gas:2000000})
      await helper.advanceTime(86400 * 22);
      await oracle.tallyVotes(1,{from:accounts[0],gas:2000000})
      dispInfo = await oracle.getAllDisputeVars(1);
      assert(dispInfo[2] == true,"Dispute Vote passed")
      balance2 = await oracle.balanceOf(accounts[2]);
      dispBal2 = await oracle.balanceOf(accounts[1])
      assert(balance1 - balance2 == await oracle.getUintVar(web3.utils.keccak256("stakeAmount")),"reported miner's balance should change correctly");
      assert(dispBal2 - dispBal1 == await oracle.getUintVar(web3.utils.keccak256("stakeAmount")), "disputing party's balance should change correctly")
      assert(await oracle.balanceOf(accounts[5]) == web3.utils.toWei('100'))
      let vars = await oracle.getStakerInfo(accounts[5])
      assert(vars[2] == 1, "should only be staked once now");
   });

   it("check reselection of validators", async function (){
       for(var i = 5;i<10;i++){
          await tellorToken.approve(oracle.address,web3.utils.toWei('100','ether'),{from:accounts[i]});
          await oracle.depositStake(web3.utils.toWei('100'),{from:accounts[i],gas:2000000})
        }
      let miners = await oracle.getCurrentMiners();
      console.log('Miners',miners)
      await helper.advanceTime(8640);
      await oracle.reselectNewValidators({from:accounts[0],gas:2000000}) 
      let newMiners = await oracle.getCurrentMiners();
      console.log(newMiners)
      assert(miners.length  < newMiners.length, "newMiners should be longer")
   });
   it("check multiple reselection of validators", async function (){
      for(var i = 5;i<10;i++){
        console.log(i)
          await tellorToken.approve(oracle.address,web3.utils.toWei('100','ether'),{from:accounts[i]});
          await oracle.depositStake(web3.utils.toWei('100'),{from:accounts[i],gas:2000000})
      }
      let miners = await oracle.getCurrentMiners();
      console.log(miners)
      await helper.advanceTime(8640);
      await oracle.reselectNewValidators({from:accounts[0],gas:2000000})
      let newMiners = await oracle.getCurrentMiners();
      console.log(newMiners)
      assert(miners != newMiners, "newMiners should be different") 
      assert(newMiners.length == 10, "new miner length should be 10")
   });
      it("check reselection if not enough validators for reselection (only 7)", async function (){
      for(var i = 5;i<7;i++){
          await tellorToken.approve(oracle.address,web3.utils.toWei('100','ether'),{from:accounts[i]});
          await oracle.depositStake(web3.utils.toWei('100'),{from:accounts[i],gas:2000000})
      }
      let miners = await oracle.getCurrentMiners();
      console.log(miners)
      await helper.advanceTime(8640);
      await oracle.reselectNewValidators({from:accounts[0],gas:2000000})
      let newMiners = await oracle.getCurrentMiners();
      console.log(newMiners)
      assert(miners != newMiners, "newMiners should be different") 
      assert(newMiners.length == 7, "new miner length should be 7")
   });
});