/** 
* This contract tests the Tellor functions
*/ 
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));
const helper = require("./helpers/test_helpers");
const Tellor = artifacts.require("./Tellor.sol"); // globally injected artifacts helper
var ERC20 = artifacts.require("./ERC20.sol");
var oracleAbi = Tellor.abi;

contract('Further Tests', function(accounts) {
  let oracle;
  let tellorToken;

    beforeEach('setting up further tests', async function () {
        tellorToken = await ERC20.new();
        for(var i = 0;i<10;i++){
          await tellorToken.mint(accounts[i],web3.utils.toWei('200','ether'));
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
	it("Request data", async function () {
        await tellorToken.approve(oracle.address,20,{from:accounts[0]});
        let res2 = await oracle.addTip(2,20,{from:accounts[0],gas:2000000})
        assert(res2.logs[1].args['_tip'] - 0 == 20, "tip should be 20")
        apiVars = await oracle.getRequestVars(2);
        assert( apiVars[1] == 20, "value pool should be 20");
        let apiIdonQ = res2.logs[1].args['_requestId'] - 0
        let apiOnQPayout = res2.logs[1].args['_tip'] - 0;
        assert(web3.utils.hexToNumberString(apiOnQPayout) == 20, "Current payout on Q should be 20");
        assert(web3.utils.hexToNumberString(apiIdonQ) == 2, "timestamp on Q should be apiID");
    });
    it("Add Tip to current ID", async function () {
        await oracle.theLazyCoon(accounts[0],web3.utils.toWei("500"));
        await tellorToken.approve(oracle.address,20,{from:accounts[0]});
        let res2 = await oracle.addTip(1,20,{from:accounts[0],gas:2000000})
        let vars = await oracle.getCurrentVariables();
        assert(vars['2'] ==  25)
    });
        
    it("several request data", async function () {
        await oracle.theLazyCoon(accounts[0],web3.utils.toWei("500"));
        await tellorToken.approve(oracle.address,20,{from:accounts[0]});
        let res2 = await oracle.addTip(2,20,{from:accounts[0],gas:2000000})
        let vars = await oracle.getVariablesOnDeck();
        assert(vars['1'] ==  20, "should be 20")
        await tellorToken.approve(oracle.address,20,{from:accounts[0]});
        res2 = await oracle.addTip(2,20,{from:accounts[0],gas:2000000})
        vars = await oracle.getVariablesOnDeck();
        assert(vars['1'] ==  40, "should be 40")
        await tellorToken.approve(oracle.address,20,{from:accounts[0]});
        res2 = await oracle.addTip(2,20,{from:accounts[0],gas:2000000})
        vars = await oracle.getVariablesOnDeck();
        assert(vars['1'] ==  60, "should be 60")
        await tellorToken.approve(oracle.address,20,{from:accounts[0]});
        res2 = await oracle.addTip(2,20,{from:accounts[0],gas:2000000})
        vars = await oracle.getVariablesOnDeck();
        assert(vars['1'] ==  80, "should be 80")
        await tellorToken.approve(oracle.address,20,{from:accounts[0]});
        res2 = await oracle.addTip(2,20,{from:accounts[0],gas:2000000})
        vars = await oracle.getVariablesOnDeck();
        assert(vars['0'] ==  2, "should be 2")
        await tellorToken.approve(oracle.address,110,{from:accounts[0]});
        res2 = await oracle.addTip(3,110,{from:accounts[0],gas:2000000})
        vars = await oracle.getVariablesOnDeck();
        assert(vars['0'] ==  3, "should be 3 first time")
        await tellorToken.approve(oracle.address,31,{from:accounts[0]});
        res2 = await oracle.addTip(2,31,{from:accounts[0],gas:2000000})
        vars = await oracle.getVariablesOnDeck();
        assert(vars['0'] ==  2, "should be 2")
        await tellorToken.approve(oracle.address,60,{from:accounts[0]});
        res2 = await oracle.addTip(3,60,{from:accounts[0],gas:2000000})
        vars = await oracle.getVariablesOnDeck();
        assert(vars['0'] ==  3, "should be 2 for second time")
    });

  it("Test Add Value to Pool and change on queue", async function () {
        await oracle.theLazyCoon(accounts[2],web3.utils.toWei("500"));
        balance1 = await (oracle.balanceOf(accounts[2],{from:accounts[1]}));
        await tellorToken.approve(oracle.address,20,{from:accounts[2]});
        await oracle.addTip(2,20,{from:accounts[2],gas:2000000})
        apiVars = await oracle.getRequestVars(2)
        console.log(apiVars)
        assert(apiVars['1'] == 20, "value pool should be 20");
        vars = await oracle.getVariablesOnDeck();
        assert(vars['1'] == 20, "Current payout on Q should be 20");
        assert(vars['0'] == 2, "apiOnQ on Q should be apiID");
        await tellorToken.approve(oracle.address,30,{from:accounts[2]});
        await oracle.addTip(3,30,{from:accounts[2],gas:2000000})
        vars = await oracle.getVariablesOnDeck();
        assert(vars['0'] ==  3, "should be 3 for second time")
        assert(vars['1'] == 30, "2Current payout on Q should be 30");
        balance2 = await (oracle.balanceOf(accounts[2],{from:accounts[1]}));
        assert(web3.utils.fromWei(balance1) - web3.utils.fromWei(balance2) == 50, "balance should be down by 50")
        await tellorToken.approve(oracle.address,20,{from:accounts[2]});
        await oracle.addTip(2,20,{from:accounts[2],gas:2000000})
        balance3 = await (oracle.balanceOf(accounts[2],{from:accounts[0]}));
        assert(web3.utils.fromWei(balance1) - web3.utils.fromWei(balance3) == 70, "balance should be down by 70")
        vars = await oracle.getVariablesOnDeck();
        assert(vars['0'] ==  2, "should be 2 for second time")
        assert(vars['1'] == 40, "2Current payout on Q should be 40");      
    }); 
    it("Test getMax payout and index 51 req with overlapping tips and requests", async function () {
        apiIdforpayoutPoolIndex = await oracle.getRequestIdByRequestQIndex(0);
        apiIdforpayoutPoolIndex2 = await oracle.getRequestIdByRequestQIndex(0);
        console.log(apiIdforpayoutPoolIndex,apiIdforpayoutPoolIndex2)
        assert(apiIdforpayoutPoolIndex ==1, "apiPool Index should be correct")
         for(var i = 1;i <=21 ;i++){
        	apix= ("api" + i);
            await tellorToken.approve(oracle.address,i,{from:accounts[2]});
            await oracle.addTip(i+1,i,{from:accounts[2],gas:2000000})
        }
        for(var j = 15;j <= 45 ;j++){
        	apix= ("api" + j);
            await tellorToken.approve(oracle.address,j,{from:accounts[2]});
            await oracle.addTip(j+1,i,{from:accounts[2],gas:2000000})
        } 
        req = await oracle.getRequestQ();
        max = await utilities.testgetMax();
        assert(web3.utils.hexToNumberString(max[0])== 45, "Max should be 45")
        assert(web3.utils.hexToNumberString(max[1])== 6, "Max should be 6")
    });

//     it("Test getMax payout and index 55 requests", async function () {
//         console.log("55 requests....");
//          for(var i = 1;i <=55 ;i++){
//         	apix= ("api" + i);
//         	await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(apix,"",1000,i).encodeABI()})
//         }

//         req = await oracle.getRequestQ();
//         max = await utilities.testgetMax();
//         assert(web3.utils.hexToNumberString(max[0])== 55, "Max should be 55")
//         assert(web3.utils.hexToNumberString(max[1])== 46, "Max should be 46")    
//     });

//     it("Test getMax payout and index 100 requests", async function () {
//         console.log("55 requests....");
//          for(var i = 1;i <=55 ;i++){
//         	apix= ("api" + i);
//         	await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(apix,"",1000,i).encodeABI()})
//         }
//         for(var j = 50;j <= 95 ;j++){
//         	apix= ("api" + j);
//         	await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(apix,"",1000,j).encodeABI()})
//         } 

//         req = await oracle.getRequestQ();
//         max = await utilities.testgetMax();
//         assert(web3.utils.hexToNumberString(max[0])== 110, "Max should be 110")
//         assert(web3.utils.hexToNumberString(max[1])== 46, "Max should be 46") 
//     });


//     it("utilities Test getMin payout and index 10 req with overlapping tips and requests", async function () {
//    	    apiVars= await oracle.getRequestVars(1);
//    	    apiIdforpayoutPoolIndex = await oracle.getRequestIdByRequestQIndex(0);
//         apiId = await oracle.getRequestIdByQueryHash(apiVars[2]);
//         assert(web3.utils.hexToNumberString(apiId) == 1, "timestamp on Q should be 1");
//         console.log("10 equests....");
//          for(var i = 10;i >=1 ;i--){
//         	apix= ("api" + i);
//         	await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(apix,"",1000,i).encodeABI()})
//         }

//         req = await oracle.getRequestQ();
//         min = await utilities.testgetMin();
//         assert(web3.utils.hexToNumberString(min[0])== 0, "Min should be 0")
//         assert(web3.utils.hexToNumberString(min[1])== 40, "Min should be 40")
//     });


//     it("Test getMin payout and index 51 req count down with overlapping tips and requests", async function () {
//    	    apiVars= await oracle.getRequestVars(1);
//         apiIdforpayoutPoolIndex = await oracle.getRequestIdByRequestQIndex(0);
//         apiId = await oracle.getRequestIdByQueryHash(apiVars[2]);
//         assert(web3.utils.hexToNumberString(apiId) == 1, "timestamp on Q should be 1");
//         console.log("51 requests....");
//          for(var i = 21;i >=1 ;i--){
//         	apix= ("api" + i);
//         	await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(apix,"",1000,i).encodeABI()})
//         }

//         for(var j = 45;j >= 15 ;j--){
//         	apix= ("api" + j);
//         	await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(apix,"",1000,j).encodeABI()})
//         } 

//         req = await oracle.getRequestQ();
//         min = await utilities.testgetMin();
//         assert(web3.utils.hexToNumberString(min[0])== 0, "Min should be 0")
//         assert(web3.utils.hexToNumberString(min[1])== 5, "Min should be 5")
//         assert(web3.utils.hexToNumberString(req[44])==30, "request 15 is submitted twice this should be 30")
//         assert(web3.utils.hexToNumberString(req[50])==42, "request 21 is submitted twice this should be 42")
      
//     });

//     it("Test getMin payout and index 56 req with overlapping tips and requests", async function () {
//    	    apiVars= await oracle.getRequestVars(1);
//         apiIdforpayoutPoolIndex = await oracle.getRequestIdByRequestQIndex(0);
//         apiId = await oracle.getRequestIdByQueryHash(apiVars[2]);
//         assert(web3.utils.hexToNumberString(apiId) == 1, "timestamp on Q should be 1");
//         console.log("56 requests....");
//          for(var i = 21;i >=1 ;i--){
//         	apix= ("api" + i);
//         	await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(apix,"",1000,i).encodeABI()})
//         }
//         for(var j = 50;j >= 15 ;j--){
//         	apix= ("api" + j);
//         	await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(apix,"",1000,j).encodeABI()})
//         } 

//         req = await oracle.getRequestQ();
//         min = await utilities.testgetMin();
//         assert(web3.utils.hexToNumberString(min[0])== 1, "Min should be 1")
//         assert(web3.utils.hexToNumberString(min[1])== 30, "Min should be 30")
//     });

//     it("Test getMin payout and index 55 requests", async function () {
//         console.log("55 requests....");
//          for(var i = 1;i <=55 ;i++){
//         	apix= ("api" + i);
//         	await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(apix,"",1000,i).encodeABI()})
//         }
//         req = await oracle.getRequestQ();
//         min = await utilities.testgetMin();
//         assert(web3.utils.hexToNumberString(min[0])== 6, "Min should be 6")
//         assert(web3.utils.hexToNumberString(min[1])== 45, "Min should be 45")    
//     });



//    it("Test 51 request and lowest is kicked out", async function () {
//    	       apiVars= await oracle.getRequestVars(1)
//         apiIdforpayoutPoolIndex = await oracle.getRequestIdByRequestQIndex(0);
//         apiId = await oracle.getRequestIdByQueryHash(apiVars[2]);
//         assert(web3.utils.hexToNumberString(apiId) == 1, "timestamp on Q should be 1");
//         console.log("51 requests....");
//          for(var i = 1;i <=51 ;i++){
//         	apix= ("api" + i);
//         	await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(apix,"",1000,i).encodeABI()})
//         }
//         let payoutPool = await oracle.getRequestQ();
//         for(var i = 2;i <=49 ;i++){
//         	assert(payoutPool[i] == 51-i)

//         }
//         apiVars= await oracle.getRequestVars(52)
//         apiIdforpayoutPoolIndex = await oracle.getRequestIdByRequestQIndex(50);
//         vars = await oracle.getVariablesOnDeck();
//         let apiOnQ = web3.utils.hexToNumberString(vars['0']);
//         let apiPayout = web3.utils.hexToNumberString(vars['1']);
//         let sapi = vars['2'];
//         apiIdforpayoutPoolIndex2 = await oracle.getRequestIdByRequestQIndex(49);
//         assert(apiIdforpayoutPoolIndex == 52, "position 1 should be booted"); 
//         assert(sapi == "api51", "API on Q string should be correct"); 
//         assert(apiPayout == 51, "API on Q payout should be 51"); 
//         assert(apiOnQ == 52, "API on Q should be 51"); 
//         assert(apiVars[5] == 51, "position 1 should have correct value"); 
//         assert(apiIdforpayoutPoolIndex2 == 3, "position 2 should be in same place"); 
//    });


//     it("Test Throw on wrong apiId", async function () {
//     	await helper.expectThrow(web3.eth.sendTransaction({to: oracle.address,from:accounts[1],gas:7000000,data:oracle2.methods.submitMiningSolution("2",4,3000).encodeABI()}) );
//         await web3.eth.sendTransaction({to: oracle.address,from:accounts[1],gas:7000000,data:oracle2.methods.submitMiningSolution("2",1,3000).encodeABI()})
//     });
//     it("Test competing API requests - multiple switches in API on Queue", async function () {
//     	 await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(api,"BTC/USD",1000,0).encodeABI()})
// 		await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(api2,"ETH/USD",1000,0).encodeABI()})
//          await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData("api3","",1000,1).encodeABI()})
//          await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(api2,"ETH/USD",1000,2).encodeABI()})
//          await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData("api3","",1000,3).encodeABI()})
//          await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(api2,"ETH/USD",1000,4).encodeABI()})
//         vars = await oracle.getVariablesOnDeck();
//         let apiOnQ = web3.utils.hexToNumberString(vars['0']);
//         let apiPayout = web3.utils.hexToNumberString(vars['1']);
//         let sapi = vars['2'];
//         assert(apiOnQ == 2, "API on Q should be 2"); 
//         assert(sapi == api2, "API on Q string should be correct"); 
//         assert(apiPayout == 6, "API on Q payout should be 6"); 
//     });
	
 });