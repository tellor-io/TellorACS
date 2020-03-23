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
        console.log("here 1")
        for(var i = 0;i<5;i++){
          console.log(i)
          await tellorToken.approve(oracle.address,web3.utils.toWei('100','ether'),{from:accounts[i]});
          console.log(tellorToken.allowance(accounts[i],oracle.address));
          console.log("2",i)
          await web3.eth.sendTransaction({to: oracle.address,from:accounts[i],gas:2000000,data:oracle2.methods.depositStake(web3.utils.toWei('100')).encodeABI()})
 
        }
        console.log("here 2")
        await web3.eth.sendTransaction({to: oracle.address,from:accounts[0],gas:2000000,data:oracle2.methods.addTip(1,0).encodeABI()})
   });  

   it("change Tellor Contract", async function () {
    assert(oracle.getAddressVars(web3.utils.keccak256("tellorToken")).call() == tellorToken.address)
    newToken = await ERC20.new()
    await oracle.changeTellorToken(newToken);
    assert(oracle.getAddressVars(web3.utils.keccak256("tellorToken")).call() == newToken.address)
   });
   it("test multiple staking one address", async function () {
    await oracle.depositStake(web3.utils.toWei('200'),{from:accounts[5]})
    assert(await oracle.balanceOf(accounts[5]) == web3.utils.toWei('200'))
    let vars = await oracle.getStakerInfo(accounts[5])
    assert(vars[2] == 2);
   });
   it("test multiple staking one address, removal of part", async function () {
    await oracle.depositStake(web3.utils.toWei('200'),{from:accounts[5]})
    await web3.eth.sendTransaction({to:oracle.address,from:accounts[5],gas:7000000,data:oracle2.methods.requestStakingWithdraw(web3.utils.toWei('100')).encodeABI()})
    await helper.advanceTime(86400 * 8);
    await web3.eth.sendTransaction({to:oracle.address,from:accounts[5],data:oracle2.methods.withdrawStake().encodeABI()})
    assert(await oracle.balanceOf(accounts[5]) == web3.utils.toWei('100'))
    let vars = await oracle.getStakerInfo(accounts[5])
    assert(vars[2] == 1);
   });
   it("test multiple staking one address, dispute and slashing", async function () {
      await oracle.depositStake(web3.utils.toWei('200'),{from:accounts[5]})
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
      assert(vars[2] == 1);
   });
   it("check validator selection"){
    assert(1==0)

   }
   it("check reselection of validators"){

   }
   it("check multiple reselection of validators"){
    
   }
});