/** 
* This contract tests the Tellor functions
*/ 

const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));
const BN = require('bn.js');
const helper = require("./helpers/test_helpers");
const TellorMaster = artifacts.require("./TellorMaster.sol");
const Tellor = artifacts.require("./Tellor.sol"); // globally injected artifacts helper
var ERC20 = artifacts.require("./ERC20.sol");
var oracleAbi = Tellor.abi;
var masterAbi = TellorMaster.abi;

contract('ACS specific Tests', function(accounts) {
  let oracle;
  let oracle2;
  let oracleBase;
  let master;
  let tellorToken;

    beforeEach('Setup contract for each test', async function () {
        tellorToken = await ERC20.new();
        for(var i = 0;i<10;i++){
          await tellorToken.mint(accounts[i],web3.utils.toWei('200','ether'));
        }
        oracleBase = await Tellor.new();
        oracle = await TellorMaster.new(oracleBase.address,tellorToken.address);
        master = await new web3.eth.Contract(masterAbi,oracle.address);
        oracle2 = await new web3.eth.Contract(oracleAbi,oracleBase.address);
        for(var i = 0;i<5;i++){
          console.log(i)
          await tellorToken.approve(oracle.address,web3.utils.toWei('100','ether'),{from:accounts[i]});
          await web3.eth.sendTransaction({to: oracle.address,from:accounts[i],gas:2000000,data:oracle2.methods.depositStake(web3.utils.toWei('100')).encodeABI()})
 
        }
        await web3.eth.sendTransaction({to: oracle.address,from:accounts[0],gas:2000000,data:oracle2.methods.addTip(1,0).encodeABI()})
   });  

   it("change Tellor Contract", async function () {
    assert(await oracle.getAddressVars(web3.utils.keccak256("tellorToken")) == tellorToken.address, "token address should be correct")
    newToken = await ERC20.new()
    await oracle.changeTellorToken(newToken.address);
    assert(await oracle.getAddressVars(web3.utils.keccak256("tellorToken")) == newToken.address, "new token should be correct")
   });
   it("test multiple staking one address", async function () {
    await web3.eth.sendTransaction({to: oracle.address,from:accounts[5],gas:2000000,data:oracle2.methods.depositStake(web3.utils.toWei('200')).encodeABI()})
    assert(await oracle.balanceOf(accounts[5]) == web3.utils.toWei('200'))
    let vars = await oracle.getStakerInfo(accounts[5])
    assert(vars[2] == 2, "should be staked twice");
   });
   it("test multiple staking one address, removal of part", async function () {
    await web3.eth.sendTransaction({to: oracle.address,from:accounts[5],gas:2000000,data:oracle2.methods.depositStake(web3.utils.toWei('200')).encodeABI()})
    await web3.eth.sendTransaction({to:oracle.address,from:accounts[5],gas:7000000,data:oracle2.methods.requestStakingWithdraw(web3.utils.toWei('100')).encodeABI()})
    await helper.advanceTime(86400 * 8);
    await web3.eth.sendTransaction({to:oracle.address,from:accounts[5],data:oracle2.methods.withdrawStake().encodeABI()})
    assert(await oracle.balanceOf(accounts[5]) == web3.utils.toWei('100'))
    let vars = await oracle.getStakerInfo(accounts[5])
    assert(vars[2] == 1);
   });
    it("check validator selection", async function () {
      let miners = await oracle.getCurrentMiners();
      console.log(miners)
      assert(miners.length == 5, "miner selection should work")
   });
   it("test multiple staking one address, dispute and slashing", async function () {
      await web3.eth.sendTransaction({to: oracle.address,from:accounts[5],gas:2000000,data:oracle2.methods.depositStake(web3.utils.toWei('200')).encodeABI()})
      await web3.eth.sendTransaction({to:oracle.address,from:accounts[5],gas:7000000,data:oracle2.methods.requestStakingWithdraw(web3.utils.toWei('100')).encodeABI()})
      await helper.advanceTime(86400 * 8);
      await web3.eth.sendTransaction({to:oracle.address,from:accounts[5],data:oracle2.methods.withdrawStake().encodeABI()})

      await  web3.eth.sendTransaction({to: oracle.address,from:accounts[1],gas:7000000,data:oracle2.methods.beginDispute(1,res[0],2).encodeABI()});
      count = await oracle.getUintVar(web3.utils.keccak256("disputeCount"));
      await web3.eth.sendTransaction({to: oracle.address,from:accounts[3],gas:7000000,data:oracle2.methods.vote(1,true).encodeABI()});
      await helper.advanceTime(86400 * 22);
      await web3.eth.sendTransaction({to: oracle.address,from:accounts[0],gas:7000000,data:oracle2.methods.tallyVotes(1).encodeABI()});
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
          await web3.eth.sendTransaction({to: oracle.address,from:accounts[0],gas:2000000,data:oracle2.methods.depositStake(web3.utils.toWei('100')).encodeABI()})
        }
      let miners = await oracle.getCurrentMiners();
      console.log(miners)
      await helper.advanceTime(8640);
      await web3.eth.sendTransaction({to: oracle.address,from:accounts[0],gas:2000000,data:oracle2.methods.reselectNewValidators().encodeABI()})
      let newMiners = await oracle.getCurrentMiners();
      console.log(newMiners)
      assert(miners != newMiners, "newMiners should be different") 
   });
   it("check multiple reselection of validators", async function (){
      for(var i = 5;i<10;i++){
        console.log(i)
          await tellorToken.approve(oracle.address,web3.utils.toWei('100','ether'),{from:accounts[i]});
          await web3.eth.sendTransaction({to: oracle.address,from:accounts[0],gas:2000000,data:oracle2.methods.depositStake(web3.utils.toWei('100')).encodeABI()})
      }
      let miners = await oracle.getCurrentMiners();
      console.log(miners)
      await helper.advanceTime(8640);
      await web3.eth.sendTransaction({to: oracle.address,from:accounts[0],gas:2000000,data:oracle2.methods.reselectNewValidators().encodeABI()})
      let newMiners = await oracle.getCurrentMiners();
      console.log(newMiners)
      assert(miners != newMiners, "newMiners should be different") 
      assert(newMiners.length == 10, "new miner length should be 10")
   });
      it("check reselection if not enough validators for reselection (only 7)", async function (){
      for(var i = 5;i<7;i++){
          await tellorToken.approve(oracle.address,web3.utils.toWei('100','ether'),{from:accounts[i]});
          await web3.eth.sendTransaction({to: oracle.address,from:accounts[0],gas:2000000,data:oracle2.methods.depositStake(web3.utils.toWei('100')).encodeABI()})
      }
      let miners = await oracle.getCurrentMiners();
      console.log(miners)
      await helper.advanceTime(8640);
      await web3.eth.sendTransaction({to: oracle.address,from:accounts[0],gas:2000000,data:oracle2.methods.reselectNewValidators().encodeABI()})
      let newMiners = await oracle.getCurrentMiners();
      console.log(newMiners)
      assert(miners != newMiners, "newMiners should be different") 
      assert(newMiners.length == 7, "new miner length should be 7")
   });
});