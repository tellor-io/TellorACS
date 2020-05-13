/** 
* This contract tests the Tellor functions
*/ 

const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));
const helper = require("./helpers/test_helpers");
const Tellor = artifacts.require("./Tellor.sol"); // globally injected artifacts helper
var ERC20 = artifacts.require("./ERC20.sol");
var oracleAbi = Tellor.abi;

contract('Token and Staking Function Tests', function(accounts) {
  let oracle;
  let tellorToken;
  let res; 
    beforeEach('Setup contract for each test', async function () {
        tellorToken = await ERC20.new();
        for(var i = 0;i<10;i++){
          await tellorToken.mint(accounts[i],web3.utils.toWei('300','ether'));
        }
        oracle = await Tellor.new(tellorToken.address);
        for(var i = 0;i<5;i++){
          await tellorToken.approve(oracle.address,web3.utils.toWei('100','ether'),{from:accounts[i]});
          await oracle.depositStake(web3.utils.toWei('100'),{from:accounts[i],gas:2000000,})
        }
        await tellorToken.mint(accounts[0],web3.utils.toWei("500"));
        await tellorToken.approve(oracle.address,5,{from:accounts[0]});
        await oracle.addTip(1,5,{from:accounts[0],gas:2000000})
   });  
    it("getVariables", async function(){
		vars = await oracle.getCurrentVariables();
        assert(vars['1'] == 1, "miningApiId should be 1");
        assert(vars['2'] == 5, "tip should be 5")
    }); 
    it("No re-Staking without withdraw ", async function(){
    	  await helper.advanceTime(86400 * 10);
        await oracle.requestStakingWithdraw(web3.utils.toWei('100'),{from:accounts[1],gas:2000000})
        let s =  await oracle.getStakerInfo(accounts[1])
        assert(s[0] ==2 , "is in withdrawal period" );
        await helper.advanceTime(86400 * 10);
        await tellorToken.approve(oracle.address,web3.utils.toWei('100','ether'),{from:accounts[1]});
        await helper.expectThrow(oracle.depositStake(web3.utils.toWei('100'),{from:accounts[1],gas:2000000}))
    });    
    it("withdraw and re-stake", async function(){
        await helper.advanceTime(86400 * 10);
        await oracle.requestStakingWithdraw(web3.utils.toWei('100'),{from:accounts[1],gas:2000000})
        let s =  await oracle.getStakerInfo(accounts[1])
        console.log(s)
        assert(s[0] ==2 , "is in withdrawal period" );
        await helper.advanceTime(86400 * 10);
        balance1 = await (tellorToken.balanceOf(accounts[1]));
        await oracle.withdrawStake({from:accounts[1],gas:2000000})
        s =  await oracle.getStakerInfo(accounts[1])
        assert(s[0] == 0 , "is Not Staked" );
        balance2 = await (tellorToken.balanceOf(accounts[1]));
        assert(balance2 - balance1 == web3.utils.toWei("100"), "user should be able to withdraw 1")
        await tellorToken.approve(oracle.address,web3.utils.toWei('100','ether'),{from:accounts[1]});
        await oracle.depositStake(web3.utils.toWei('100'),{from:accounts[1],gas:2000000})
        s =  await oracle.getStakerInfo(accounts[1])
        assert(s[0] == 1, "is Staked" );
    }); 
    it("Three dispute rounds with increased deposits (minting) for voting each time", async function(){
    	await tellorToken.approve(oracle.address,web3.utils.toWei('100','ether'),{from:accounts[2]});
      await oracle.depositStake(web3.utils.toWei('100'),{from:accounts[2],gas:2000000})
      let vars = await oracle.getStakerInfo(accounts[2])
      assert(vars[2] == 2, "should only be staked once now");
      let miners = await oracle.getCurrentMiners();
      for(var i = 0;i<5;i++){
        res = await oracle.submitMiningSolution(1,100 + i,{from:miners[i]});
      }
      await tellorToken.mint(accounts[1],web3.utils.toWei("500"));
      balance1 = await oracle.balanceOf(accounts[2]);
      dispBal1 = await tellorToken.balanceOf(accounts[1])
      await tellorToken.approve(oracle.address,web3.utils.toWei('200','ether'),{from:accounts[1]});
      await  oracle.beginDispute(1,res.logs[1].args['_time'],2,{from:accounts[1],gas:2000000});
      count = await oracle.getUintVar(web3.utils.keccak256("disputeCount"));
      //vote 1 passes
      await oracle.vote(1,true,{from:accounts[3],gas:2000000})
      await helper.advanceTime(86400 * 22);
      await oracle.tallyVotes(1,{from:accounts[0],gas:2000000})
      await helper.expectThrow(oracle.unlockDisputeFee(1,{from:accounts[0],gas:2000000})) //try to withdraw
        dispInfo = await oracle.getAllDisputeVars(1);
      	assert(dispInfo[2] == true,"Dispute Vote passed")
      //vote 2 - fails
      await tellorToken.mint(accounts[6],web3.utils.toWei("500"));
      await tellorToken.approve(oracle.address,web3.utils.toWei('200','ether'),{from:accounts[6]});
      await  oracle.beginDispute(1,res.logs[1].args['_time'],2,{from:accounts[6],gas:2000000});
      count = await oracle.getUintVar(web3.utils.keccak256("disputeCount"));
      await oracle.vote(1,false,{from:accounts[6],gas:2000000})
      await oracle.vote(1,true,{from:accounts[4],gas:2000000})
      await helper.advanceTime(86400 * 22);
      await oracle.tallyVotes(1,{from:accounts[0],gas:2000000})
       dispInfo = await oracle.getAllDisputeVars(1);
      assert(dispInfo[2] == false,"Dispute Vote failed")
      // vote 3 - passes
      await tellorToken.mint(accounts[1],web3.utils.toWei("500"));
      await tellorToken.approve(oracle.address,web3.utils.toWei('200','ether'),{from:accounts[1]});
      await  oracle.beginDispute(1,res.logs[1].args['_time'],2,{from:accounts[1],gas:2000000});
      count = await oracle.getUintVar(web3.utils.keccak256("disputeCount"));
      await oracle.vote(1,false,{from:accounts[6],gas:2000000})
      await oracle.vote(1,true,{from:accounts[1],gas:2000000})
      await oracle.vote(1,true,{from:accounts[5],gas:2000000})
      await helper.advanceTime(86400 * 22);
      await oracle.tallyVotes(1,{from:accounts[0],gas:2000000})
      dispInfo = await oracle.getAllDisputeVars(1);
      assert(dispInfo[2] == true,"Dispute Vote passed")

      await oracle.unlockDisputeFee(1,{from:accounts[0],gas:2000000})
      dispInfo = await oracle.getAllDisputeVars(1);
      assert(dispInfo[2] == true,"Dispute Vote passed")
      balance2 = await oracle.balanceOf(accounts[2]);
      dispBal2 = await tellorToken.balanceOf(accounts[1])
      dispBal6 = await tellorToken.balanceOf(accounts[6])
      assert(balance1 - balance2 == await oracle.getUintVar(web3.utils.keccak256("minimumStake")),"reported miner's balance should change correctly");
      assert(dispBal2 - dispBal1 == await oracle.getUintVar(web3.utils.keccak256("minimumStake")), "disputing party's balance should change correctly")
      assert(await oracle.balanceOf(accounts[2]) == web3.utils.toWei('100'),"Account 2 balance should be correct")
      vars = await oracle.getStakerInfo(accounts[2])
      assert(vars[2] == 1, "should only be staked once now");
    });
 //  //    it("Test tip current id halfway through submissions", async function(){
 // //    	assert(0==1)
 // //    });

 //    it("Attempt to unlockDisputeFee before time is up - stake", async function(){
	// 	      await tellorToken.approve(oracle.address,web3.utils.toWei('100','ether'),{from:accounts[2]});
 //      await oracle.depositStake(web3.utils.toWei('100'),{from:accounts[2],gas:2000000})
 //      let vars = await oracle.getStakerInfo(accounts[2])
 //      assert(vars[2] == 2, "should only be staked once now");
 //      let miners = await oracle.getCurrentMiners();
 //      for(var i = 0;i<5;i++){
 //        res = await oracle.submitMiningSolution(1,100 + i,{from:accounts[i]});
 //      }
 //      await tellorToken.mint(accounts[1],web3.utils.toWei("500"));
 //      balance1 = await oracle.balanceOf(accounts[2]);
 //      dispBal1 = await tellorToken.balanceOf(accounts[1])
 //      await tellorToken.approve(oracle.address,web3.utils.toWei('200','ether'),{from:accounts[1]});
 //      await  oracle.beginDispute(1,res.logs[1].args['_time'],2,{from:accounts[1],gas:2000000});
 //      count = await oracle.getUintVar(web3.utils.keccak256("disputeCount"));
 //      await oracle.vote(1,true,{from:accounts[3],gas:2000000})
 //      await helper.advanceTime(86400 * 22);
 //      await oracle.tallyVotes(1,{from:accounts[0],gas:2000000})
 //      await helper.expectThrow(oracle.withdrawStake({from:accounts[0],gas:2000000}));
	// });
 //    it("Try to read a disputed value", async function(){ 
 //            await tellorToken.approve(oracle.address,web3.utils.toWei('100','ether'),{from:accounts[2]});
 //      await oracle.depositStake(web3.utils.toWei('100'),{from:accounts[2],gas:2000000})
 //      let vars = await oracle.getStakerInfo(accounts[2])
 //      assert(vars[2] == 2, "should only be staked once now");
 //      let miners = await oracle.getCurrentMiners();
 //      for(var i = 0;i<5;i++){
 //        res = await oracle.submitMiningSolution(1,100 + i,{from:accounts[i]});
 //      }
 //      await tellorToken.mint(accounts[1],web3.utils.toWei("500"));
 //      balance1 = await oracle.balanceOf(accounts[2]);
 //      dispBal1 = await tellorToken.balanceOf(accounts[1])
 //      await tellorToken.approve(oracle.address,web3.utils.toWei('200','ether'),{from:accounts[1]});
 //      await  oracle.beginDispute(1,res.logs[1].args['_time'],2,{from:accounts[1],gas:2000000});
 //      assert(await oracle.await oracle.retrieveData(1,res[0]) == 0, "data should be 0, it's under dispute")
 //    });
 //    it("Staking, requestStakingWithdraw, withdraw stake", async function(){
	// 	let withdrawreq = await web3.eth.sendTransaction({to:oracle.address,from:accounts[1],gas:7000000,data:oracle2.methods.requestStakingWithdraw().encodeABI()})
 //        let weSender =  await web3.eth.abi.decodeParameter('address',withdrawreq.logs[0].topics[1])
 //        assert(weSender == accounts[1], "withdraw request by account 1");
 //        await helper.advanceTime(86400 * 8);
 //                s =  await oracle.getStakerInfo(accounts[1])
 //        assert(s !=1, " Staked" );
 //        await web3.eth.sendTransaction({to:oracle.address,from:accounts[1],gas:7000000,data:oracle2.methods.withdrawStake().encodeABI()})
 //                s =  await oracle.getStakerInfo(accounts[1])
 //        assert(s !=1, "not Staked" );
 //    });
 //    it("Get apiId", async function () {
 //        balance1 = await web3.eth.call({to:oracle.address,data:oracle3.methods.balanceOf(accounts[2]).encodeABI()})
 //        let res = await web3.eth.sendTransaction({to:oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(api,"BTC/USD",1000,20).encodeABI()}) 
	// 	 apiVars= await oracle.getRequestVars(1)
 //        apiId = await oracle.getRequestIdByQueryHash(apiVars[2]) 
 //        assert(apiId == 1, "apiId should be 1");
 //    });
 //    it("Get apiHash", async function () {
	// 	apiVars= await oracle.getRequestVars(1)
 //        assert(apiVars[2] == web3.utils.soliditySha3({t:'string',v:api},{t:'uint256',v:1000}), "api on Q should be apiId");
 //    });
 //    it("Test Changing Dispute Fee", async function () {
 //        await web3.eth.sendTransaction({to:oracle.address,from:accounts[0],gas:7000000,data:oracle2.methods.theLazyCoon(accounts[6],web3.utils.toWei('5000', 'ether')).encodeABI()})
 //        await web3.eth.sendTransaction({to:oracle.address,from:accounts[0],gas:7000000,data:oracle2.methods.theLazyCoon(accounts[7],web3.utils.toWei('5000', 'ether')).encodeABI()})
 //        var disputeFee1 = await oracle.getUintVar(web3.utils.keccak256("disputeFee"))
	// 	await web3.eth.sendTransaction({to:oracle.address,from:accounts[6],gas:7000000,data:oracle2.methods.depositStake().encodeABI()})
 //        await web3.eth.sendTransaction({to:oracle.address,from:accounts[7],gas:7000000,data:oracle2.methods.depositStake().encodeABI()})
 //        assert(await oracle.getUintVar(web3.utils.keccak256("disputeFee")) < disputeFee1,"disputeFee should change");

 //    });
 });