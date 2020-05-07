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
        await oracle.theLazyCoon(accounts[0],web3.utils.toWei("500"));
        await tellorToken.approve(oracle.address,5,{from:accounts[0]});
        await oracle.addTip(1,5,{from:accounts[0],gas:2000000})
   });  
    it("getVariables", async function(){
		vars = await oracle.getCurrentVariables();
        let miningApiId =vars['0'];
        assert(miningApiId == 1, "miningApiId should be 1");
        assert(vars['1'] == 5, "tip should be 5")
    }); 
    //     it("test Uniquestakers, staker count, totalStaked", async function(){
    //       assert(0==1)
    // }); 

 //    it("re-Staking without withdraw ", async function(){
 //    	await helper.advanceTime(86400 * 10);
 //        let withdrawreq = await web3.eth.sendTransaction({to:oracle.address,from:accounts[1],gas:7000000,data:oracle2.methods.requestStakingWithdraw().encodeABI()})
 //        let weSender =  await web3.eth.abi.decodeParameter('address',withdrawreq.logs[0].topics[1]);
 //        assert(weSender == accounts[1], "withdraw request by account 1");
 //        await helper.advanceTime(86400 * 10);
	// 		let s =  await oracle.getStakerInfo(accounts[1])
 //        assert(s[0] !=1 , "is not Staked" );
 //        await web3.eth.sendTransaction({to:oracle.address,from:accounts[1],gas:7000000,data:oracle2.methods.depositStake().encodeABI()})
 //        s =  await oracle.getStakerInfo(accounts[1])
 //        assert(s[0] == 1, "is not Staked" );
 //    });    

 //    it("withdraw and re-stake", async function(){
 //    	await helper.advanceTime(86400 * 10);
 //        let withdrawreq = await web3.eth.sendTransaction({to:oracle.address,from:accounts[1],gas:7000000,data:oracle2.methods.requestStakingWithdraw().encodeABI()})
 //        let weSender =  await web3.eth.abi.decodeParameter('address',withdrawreq.logs[0].topics[1]);
 //        assert(weSender == accounts[1], "withdraw request by account 1");
 //        await helper.advanceTime(86400 * 10);
 //               let s =  await oracle.getStakerInfo(accounts[1])
	// 		assert(s[0] !=1, "is not Staked" );
 //        await web3.eth.sendTransaction({to:oracle.address,from:accounts[1],gas:7000000,data:oracle2.methods.withdrawStake().encodeABI()})
 //        s =  await oracle.getStakerInfo(accounts[1])
 //        assert(s[0] != 1, " not Staked" );
 //        await web3.eth.sendTransaction({to:oracle.address,from:accounts[1],gas:7000000,data:oracle2.methods.depositStake().encodeABI()}) 
 //        s =  await oracle.getStakerInfo(accounts[1])
 //        assert(s[0] ==1, " Staked" );
 //    }); 
 //    it("Check Balance that for voting", async function(){
 //    	assert(0==1)
 //    });
 //    it("Deposit Just to vote", async function(){
 //    	assert(0==1)
 //    });
 //    it("Three dispute rounds with increased deposits for voting each time", async function(){
 //    	assert(0==1)
 //    });
  //    it("Test tip current id halfway through submissions", async function(){
 //    	assert(0==1)
 //    });

 //    it("Attempt to unlockDisputeFee before time is up - stake", async function(){
	// 	assert(0==1)
	// });
 //    it("Attempt to withdraw before stake time is up", async function(){ 
 //        balance1b = await ( web3.eth.call({to:oracle.address,data:oracle3.methods.balanceOf(accounts[1]).encodeABI()}));
 //        await helper.expectThrow(web3.eth.sendTransaction({to:oracle.address,from:accounts[1],gas:7000000,data:oracle2.methods.withdrawStake().encodeABI()}) );
 //        s =  await oracle.getStakerInfo(accounts[1])
 //        assert(s[0] ==1, " Staked" );
 //        assert(web3.utils.fromWei(balance1b) == 1000, "Balance should equal transferred amt");
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