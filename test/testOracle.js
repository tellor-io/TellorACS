/** 
* This contract tests the Tellor functions
*/ 

const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));
const helper = require("./helpers/test_helpers");
const Tellor = artifacts.require("./Tellor.sol"); // globally injected artifacts helper
var ERC20 = artifacts.require("./ERC20.sol");
var oracleAbi = Tellor.abi;

contract('Oracle Tests', function(accounts) {
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
    it("Get Symbol,Name, Decimals", async function(){
		let symbol = await oracle.symbol();
        assert.equal(symbol,"TRB","the Symbol should be TRB");
        let name = await oracle.name();
        assert.equal(name,"Tellor Tributes","the name should be Tellor Tributes");
        let decimals = await oracle.decimals()
        assert.equal(decimals,18,"the decimals should be 18");
    });
   it("getStakersInfo", async function(){
		let info = await oracle.getStakerInfo(accounts[1])
        let stake = web3.utils.hexToNumberString(info['0']);
        let startDate = web3.utils.hexToNumberString(info['1']);
        let _date = new Date();
        let d = (_date - (_date % 86400000))/1000;
        assert(d*1==startDate, "startDate is today");
        assert(stake*1 == 1, "Should be 1 for staked address");
     });
     it("Test 5 Mines", async function () {
      for(var i = 0;i<5;i++){
        let miners = await oracle.getCurrentMiners();
        for(var j = 0;j<5;j++){
          res = await oracle.submitMiningSolution(1,100 + j,{from:miners[j]});
        }
        assert(res.logs[1].args[2] > 0, "value should be positive");
        await tellorToken.approve(oracle.address,6,{from:accounts[0]});
        await oracle.addTip(1,6,{from:accounts[0],gas:4000000})
      }
    });
    it("Test Is Data", async function () {
       let miners = await oracle.getCurrentMiners();
        for(var i = 0;i<5;i++){
          res = await oracle.submitMiningSolution(1,100 + i,{from:miners[i]});
        }
        var time0 =  res.logs['1'].args['_time']
        //console.log('test0',web3.utils.hexToNumberString(time0))
        res = res.logs['1'].args['_value']
        assert(res == 102, "Should be 102");
  		  data = await oracle.getMinedBlockNum(1,time0);
        assert(data > 0, "Should be true if Data exist for that point in time");
    });
    it("Test Get Last Query", async function () {
        for(var i = 0;i<5;i++){
          await oracle.submitMiningSolution(1,100 + i,{from:accounts[i]});
        }   
		    res2 = await oracle.getLastNewValue();
        assert(res2[0] == 102, "Ensure data exist for the last mine value");
    });
    it("Test Data Read", async function () {
        for(var i = 0;i<5;i++){
          res = await oracle.submitMiningSolution(1,100 + i,{from:accounts[i]});
        } 
        var time0 =  res.logs['1'].args['_time']
        var res2 = await oracle.retrieveData(1,time0);
 		    assert(res2 == 102, "Ensure data exist for the last mine value");
        res1 = await oracle.getLastNewValue();
        assert(res1[0]*1 == res2*1, "getLastNewValue is not getting the last value")
        var res3 = await oracle.getTimestampbyRequestIDandIndex(1,0);
        assert(time0*1 == res3*1, "Getting the timestamp should be correct");
    });
    it("Test Miner Payout", async function () {
        await tellorToken.mint(accounts[0],web3.utils.toWei("500"));
        await tellorToken.approve(oracle.address,web3.utils.toWei("5", 'ether'),{from:accounts[0]});
        await oracle.addTip(1,web3.utils.toWei("5", 'ether'),{from:accounts[0],gas:2000000})
        balances = []
        for(var j = 0;j<5;j++){
            balances[j] = await tellorToken.balanceOf(accounts[j]);
        }
        for(var k = 0;k<5;k++){
          res = await oracle.submitMiningSolution(1,100 + k,{from:accounts[k]});
        }
        new_balances = []
		    for(var l = 0;l<5;l++){
            new_balances[l] = await tellorToken.balanceOf(accounts[l]);
            assert(web3.utils.fromWei(new_balances[l]) - web3.utils.fromWei(balances[l]) == 1, "difference is different than 1");
        }
    });
    it("Test didMine ", async function () {
	   vars = await oracle.getCurrentVariables();
      for(var i = 0;i<5;i++){
         res = await oracle.submitMiningSolution(1,100 + i,{from:accounts[i]});
      }
      didMine = oracle.didMine(vars[0],accounts[1]);
      assert(didMine);
    });
    it("Test Get MinersbyValue ", async function () {
      for(var i = 0;i<5;i++){
        res = await oracle.submitMiningSolution(1,100 + i,{from:accounts[i]});
      }
		  miners = await oracle.getMinersByRequestIdAndTimestamp(1,res.logs['1'].args['_time']     );
      for(var i = 0;i<5;i++){
     	 assert(miners[i] == accounts[i])
  	  }
    });
    it("Test miner, alternating api request on Q and auto select", async function () {
      for(var i = 0;i<5;i++){
        res = await oracle.submitMiningSolution(1,100 + i,{from:accounts[i]});
      }
      await tellorToken.approve(oracle.address,5,{from:accounts[0]});
        await oracle.addTip(1,5,{from:accounts[0],gas:2000000})
      for(var i = 0;i<5;i++){
        res = await oracle.submitMiningSolution(1,100 + i,{from:accounts[i]});
      }
       await tellorToken.approve(oracle.address,5,{from:accounts[0]});
        await oracle.addTip(1,5,{from:accounts[0],gas:2000000})
        data = await oracle.getVariablesOnDeck();
        assert(data[0] == 0, 'There should be no API on Q');
        var vars = await oracle.getCurrentVariables();
        assert(vars[1] == 1, "miningApiId should be 1");
        await tellorToken.approve(oracle.address,5,{from:accounts[0]});
        await oracle.addTip(2,5,{from:accounts[0],gas:2000000})
        data = await oracle.getVariablesOnDeck();
        assert(data[0] == 2, "API on q should be #2");
    });
    
    it("Test dispute", async function () {
        for(var i = 0;i<5;i++){
          res = await oracle.submitMiningSolution(1,100 + i,{from:accounts[i]});
        }  
        balance1 = web3.utils.fromWei(await oracle.balanceOf(accounts[2]))*1 +web3.utils.fromWei(await tellorToken.balanceOf(accounts[2]))*1;
	    
        blocknum = await oracle.getMinedBlockNum(1,res.logs[1].args['_time']);
        await tellorToken.mint(accounts[1],web3.utils.toWei("5000"));
        dispBal1 = web3.utils.fromWei(await oracle.balanceOf(accounts[1]))*1 +web3.utils.fromWei(await tellorToken.balanceOf(accounts[1]))*1;
        await tellorToken.approve(oracle.address,web3.utils.toWei("10"),{from:accounts[1]});
		await  oracle.beginDispute(1,res.logs[1].args['_time'],2,{from:accounts[1]});
        await oracle.vote(1,true,{from:accounts[3]});
        await helper.advanceTime(86400 * 22);
        await oracle.tallyVotes(1);
        await helper.advanceTime(86400 * 2 )
      	await oracle.unlockDisputeFee(1,{from:accounts[0],gas:2000000}) 
        dispInfo = await oracle.getAllDisputeVars(1);
        assert(dispInfo[5][0] == 1, "request ID should be correct")
        assert(dispInfo[5][1]*1 == res.logs[1].args['_time'], "time should be correct")
        assert(dispInfo[5][2] == 102, "value should be correct")
        assert(dispInfo[2] == true,"Dispute Vote passed")
        voted = await oracle.didVote(1, accounts[3]);
        assert(voted == true, "account 3 voted");
        voted = await oracle.didVote(1, accounts[5]);
        assert(voted == false, "account 5 did not vote");
        apid2valueF = await oracle.retrieveData(1,res.logs[1].args['_time']);
        assert(apid2valueF == 0 ,"value should now be zero this checks updateDisputeValue-internal fx  works");
        balance2 = web3.utils.fromWei(await oracle.balanceOf(accounts[2]))*1 +web3.utils.fromWei(await tellorToken.balanceOf(accounts[2]))*1;
        dispBal2 = web3.utils.fromWei(await oracle.balanceOf(accounts[1]))*1 +web3.utils.fromWei(await tellorToken.balanceOf(accounts[1]))*1;
        assert(balance1 - balance2 == 100,"reported miner's balance should change correctly");
        assert(dispBal2 - dispBal1 == 100, "disputing party's balance should change correctly")
        s =  await oracle.getStakerInfo(accounts[2])
        assert(s != 1, " Not staked" );
    });
    it("Test multiple dispute to one miner", async function () {
       for(var i = 0;i<5;i++){
        res = await oracle.submitMiningSolution(1,100 + i,{from:accounts[i]});
       }//or Event Mine? 
        await tellorToken.mint(accounts[0],web3.utils.toWei("5000"));
        await tellorToken.mint(accounts[1],web3.utils.toWei("5000"));
        await tellorToken.mint(accounts[4],web3.utils.toWei("5000"));
        resVars = []
        for(i=0;i<3;i++){
          await tellorToken.approve(oracle.address,5,{from:accounts[0]});
          await oracle.addTip(1,5,{from:accounts[0],gas:2000000})
           let miners = await oracle.getCurrentMiners();
           await helper.advanceTime(1000);
           await oracle.reselectNewValidators();
          for(var ii = 0;ii<5;ii++){
              resVars[i] = await oracle.submitMiningSolution(1,100 + ii,{from:accounts[ii]});
            }
            await helper.advanceTime(1000);
        }
        dispBal1 = web3.utils.fromWei(await oracle.balanceOf(accounts[1]))*1 +web3.utils.fromWei(await tellorToken.balanceOf(accounts[1]))*1;
        orig_dispBal4 = web3.utils.fromWei(await oracle.balanceOf(accounts[4]))*1 +web3.utils.fromWei(await tellorToken.balanceOf(accounts[4]))*1;
        await tellorToken.approve(oracle.address,web3.utils.toWei('10'),{from:accounts[4]});
        await tellorToken.approve(oracle.address,web3.utils.toWei('10'),{from:accounts[1]});
        await tellorToken.approve(oracle.address,web3.utils.toWei('10'),{from:accounts[0]});
        await  oracle.beginDispute(1,resVars[0].logs[1].args['_time'],2,{from:accounts[1]});
        await  oracle.beginDispute(1,resVars[1].logs[1].args['_time'],2,{from:accounts[4]});
        await oracle.beginDispute(1,resVars[2].logs[1].args['_time'],2);
        await tellorToken.mint(accounts[8],web3.utils.toWei("30000"));
        dispInfo = await oracle.getAllDisputeVars(1);
        await oracle.vote(1,true,{from:accounts[8]});
        await helper.advanceTime(86400 * 22);
        balance1 = web3.utils.fromWei(await oracle.balanceOf(dispInfo[3]))*1 +web3.utils.fromWei(await tellorToken.balanceOf(dispInfo[3]))*1;
        await oracle.tallyVotes(1)
        dispInfo = await oracle.getAllDisputeVars(1);
        await helper.advanceTime(86400 * 2 )
      	await oracle.unlockDisputeFee(1,{from:accounts[0],gas:2000000}) 
        assert(dispInfo[5][0] == 1)
        assert(dispInfo[5][1]*1 == resVars[0].logs[1].args['_time'],"time should be correct")//need to fix, was the decode parameter things
        assert(dispInfo[5][3]*1 > (resVars[0].logs[1].args['_time']*1+86400*2))
        assert(dispInfo[2] == true,"Dispute Vote passed")
        voted = await oracle.didVote(1, accounts[8]);
        assert(voted == true, "account 8 voted");
        voted = await oracle.didVote(1, accounts[5]);
        assert(voted == false, "account 5 did not vote");
        apid2valueF = await oracle.retrieveData(1,resVars[0].logs[1].args['_time']);
        assert(apid2valueF == 0 ,"value should now be zero this checks updateDisputeValue-internal fx  works");
        balance2 = web3.utils.fromWei(await oracle.balanceOf(dispInfo[3]))*1 +web3.utils.fromWei(await tellorToken.balanceOf(dispInfo[3]))*1;
        dispBal2 = web3.utils.fromWei(await oracle.balanceOf(accounts[1]))*1 +web3.utils.fromWei(await tellorToken.balanceOf(accounts[1]))*1;
        assert(balance1*1 - balance2*1 == 100,"reported miner's balance should change correctly");
        assert(dispBal2 - dispBal1 == 100, "disputing party's balance should change correctly")
        s =  await oracle.getStakerInfo(accounts[2])
        assert(s != 1, " Not staked" );
        await oracle.vote(2,true,{from:accounts[8]});
        await helper.advanceTime(86400 * 22);
        await oracle.tallyVotes(2);
        await helper.advanceTime(86400 * 2 )
      	await oracle.unlockDisputeFee(2,{from:accounts[0],gas:2000000}) 
        dispBal4 = web3.utils.fromWei(await oracle.balanceOf(accounts[4]))*1 +web3.utils.fromWei(await tellorToken.balanceOf(accounts[4]))*1;
        assert(dispBal4 - orig_dispBal4 == 0,"shouldn't change")
        });

    it("Test 50 requests, proper booting, and mining of 5", async function () {
        for(var i = 0;i<5;i++){
        	res = await oracle.submitMiningSolution(1,100 + i,{from:accounts[i]});
      	}
        await tellorToken.approve(oracle.address,5,{from:accounts[0]});
        await oracle.addTip(2,5,{from:accounts[0],gas:2000000})
         for(var i = 1;i <=10 ;i++){
            apix= ("api" + i);
            await tellorToken.approve(oracle.address,5+i,{from:accounts[2]});
        	await oracle.addTip(2+i,5+i,{from:accounts[2],gas:2000000})
        }
        await tellorToken.approve(oracle.address,16,{from:accounts[2]});
        await oracle.addTip(1,16,{from:accounts[2],gas:2000000})
        let miners = await oracle.getCurrentMiners();
		    for(var i = 0;i<5;i++){
        	res = await oracle.submitMiningSolution(2,100 + i,{from:miners[i]});
      	}
        data = await oracle.getMinedBlockNum(2,res.logs[1].args['_time']);
        assert(data>0, "Should be true if Data exist for that point in time");
        for(var i = 11;i <=20 ;i++){
            apix= ("api" + i);
            await tellorToken.approve(oracle.address,5+i,{from:accounts[0]});
        	await oracle.addTip(2+i,5+i,{from:accounts[0],gas:2000000})
            
        }
        await tellorToken.approve(oracle.address,26,{from:accounts[0]});
        await oracle.addTip(2,26,{from:accounts[0],gas:2000000})
        miners = await oracle.getCurrentMiners();
		for(var i = 0;i<5;i++){
        	res = await oracle.submitMiningSolution(1,100 + i,{from:miners[i]});
        }
        data = await oracle.getMinedBlockNum(1,res.logs[1].args['_time']);
        assert(data > 0, "Should be true if Data exist for that point in time");
         for(var i = 21;i <=30 ;i++){
            apix= ("api" + i);
            await tellorToken.approve(oracle.address,5+i,{from:accounts[2]});
        	await oracle.addTip(2+i,5+i,{from:accounts[2],gas:2000000})
        }
        await tellorToken.approve(oracle.address,36,{from:accounts[0]});
        await oracle.addTip(1,36,{from:accounts[0],gas:2000000})
        miners = await oracle.getCurrentMiners();
        for(var i = 0;i<5;i++){
        	res = await oracle.submitMiningSolution(2,100 + i,{from:miners[i]});
        }
        data = await oracle.getMinedBlockNum(2,res.logs[1].args['_time']);
        assert(data > 0, "Should be true if Data exist for that point in time");
        for(var i = 31;i <=40 ;i++){
          	apix= ("api" + i);
         	await tellorToken.approve(oracle.address,5+i,{from:accounts[2]});
        	await oracle.addTip(2+i,5+i,{from:accounts[2],gas:2000000})
        }
        await tellorToken.approve(oracle.address,46,{from:accounts[2]});
        await oracle.addTip(2,46,{from:accounts[2],gas:2000000})
        miners = await oracle.getCurrentMiners();
        for(var i = 0;i<5;i++){
        	res = await oracle.submitMiningSolution(1,100 + i,{from:miners[i]});
      	}
        data = await oracle.getMinedBlockNum(1,res.logs[1].args['_time']);
        assert(data > 0, "Should be true if Data exist for that point in time");
        for(var i =41;i <=55 ;i++){
          apix= ("api" + i);
          await tellorToken.approve(oracle.address,5+i,{from:accounts[2]});
        	await oracle.addTip(2+i,5+i,{from:accounts[2],gas:2000000})
        }
        await tellorToken.approve(oracle.address,61,{from:accounts[2]});
        await oracle.addTip(1,61,{from:accounts[2],gas:2000000})
        vars = await oracle.getVariablesOnDeck();
        let sapi = vars['2'];
         miners = await oracle.getCurrentMiners();
              for(var i = 0;i<5;i++){
        res = await oracle.submitMiningSolution(2,100 + i,{from:miners[i]});
      }
        data = await oracle.getMinedBlockNum(2,res.logs[1].args['_time']);
        assert(data > 0, "Should be true if Data exist for that point in time");
        apiVars = await oracle.getRequestVars(52)
        apiIdforpayoutPoolIndex = await oracle.getRequestIdByRequestQIndex(50);
        vars = await oracle.getVariablesOnDeck();
        let apiOnQ = web3.utils.hexToNumberString(vars['0']);
        let apiPayout = web3.utils.hexToNumberString(vars['1']);
        apiIdforpayoutPoolIndex2 = await oracle.getRequestIdByRequestQIndex(49);
        assert(apiIdforpayoutPoolIndex == 53, "position 1 should be booted"); 
        assert(apiPayout == 60 , "API on Q payout should be 60"); 
        assert(apiOnQ == 57, "API on Q should be 57"); 
        assert(apiVars[0] == 1, "value at position 52 should have correct value");
        assert(apiVars[1] == 55, "value at position 52 should have correct value"); 
        assert(apiIdforpayoutPoolIndex2 == 54, "position 2 should be in same place"); 
    });
    it("Test Throw on Multiple Disputes", async function () {
        for(var i = 0;i<5;i++){
          res = await oracle.submitMiningSolution(1,100 + i,{from:accounts[i]});
        }   
        await tellorToken.mint(accounts[1],web3.utils.toWei('5000', 'ether'));
        await tellorToken.approve(oracle.address,web3.utils.toWei('10'),{from:accounts[1]});
        await  oracle.beginDispute(1,res.logs[1].args['_time'],2,{from:accounts[1]});
        await helper.expectThrow(oracle.beginDispute(1,res.logs[1].args['_time'],2,{from:accounts[1]}));
    });
    it("Test Dispute of different miner Indexes", async function () {
      for(var i = 5;i<8;i++){
          await tellorToken.mint(accounts[i],web3.utils.toWei("5000"));
          await tellorToken.approve(oracle.address,web3.utils.toWei('100','ether'),{from:accounts[i]});
          await oracle.depositStake(web3.utils.toWei('100'),{from:accounts[i],gas:2000000,})
      }
		for(var i = 1;i<4;i++){
	        await tellorToken.approve(oracle.address,5,{from:accounts[0]});
        	await oracle.addTip(1,5,{from:accounts[0],gas:2000000})
          let miners = await oracle.getCurrentMiners();
        	for(var ii = 0;ii<5;ii++){
       			 res = await oracle.submitMiningSolution(1,100 + ii,{from:miners[ii]});
      		}//or Event Mine?
          await tellorToken.mint(miners[0],web3.utils.toWei('500', 'ether'));
          await tellorToken.approve(oracle.address,web3.utils.toWei('10'),{from:miners[0]});
	        await  oracle.beginDispute(1,res.logs[1].args['_time'],i,{from:miners[0]});
	        let disputeVars = await oracle.getAllDisputeVars(i);
	        let vals = await oracle.getSubmissionsByTimestamp(1,res.logs[1].args['_time']);
          console.log('1',web3.utils.soliditySha3({t:'address',v:miners[i]},{t:'uint256',v:1},{t:'uint256',v:res.logs[1].args['_time']}))
          console.log('2',disputeVars['0'])
	        assert(disputeVars['0'] == web3.utils.soliditySha3({t:'address',v:miners[i]},{t:'uint256',v:1},{t:'uint256',v:res.logs[1].args['_time']}),"hash Should be correct");
	        assert(disputeVars['1'] == false);
	        assert(disputeVars['2'] == false);
	        assert(disputeVars['4'] == miners[0], "reporter should be correct");
	        assert(disputeVars['5'][0] == 1)
	        assert(disputeVars['5'][1]*1 == res.logs[1].args['_time'], "timestamp should be correct")
	        assert(disputeVars['5'][2] -  vals[i] == 0, "value should be correct")
	        assert(disputeVars['5'][4] == 0)
	        assert(disputeVars['5'][6] == i, "index should be correct")
	        assert(disputeVars['5'][7] == 0)
	        assert(disputeVars['6'] == 0, "Tally should be correct")
	        balance1 = web3.utils.fromWei(await oracle.balanceOf(miners[i]))*1 +web3.utils.fromWei(await tellorToken.balanceOf(miners[i]))*1;
	        assert(disputeVars['3'] == miners[i],"miner should be correct")
	        await oracle.vote(i,true,{from:miners[i+1]});
	        await helper.advanceTime(86400 * 22);
	        await oracle.tallyVotes(i)
	        await helper.advanceTime(86400 * 2 )
          console.log(i)
      	  await oracle.unlockDisputeFee(i,{from:accounts[0],gas:2000000}) 
	        if(i==2){
	        	assert(await oracle.isInDispute(1,res.logs[1].args['_time']) == true, "should be in dispute")
	        }
	        else{
	        	assert(await oracle.isInDispute(1,res.logs[1].args['_time']) == false,"isInDispute should be correct")
	        }
	        balance2 = web3.utils.fromWei(await oracle.balanceOf(miners[i]))*1 +web3.utils.fromWei(await tellorToken.balanceOf(miners[i]))*1;
	        assert(balance1 - balance2 == 100,"reported miner's balance should change correctly");
	        s =  await oracle.getStakerInfo(miners[i])
        	assert(s[0] !=1, " Staked" );
	        }
    });
    it("Ensure Miner staked after failed dispute", async function () {
        for(var i = 0;i<5;i++){
        	res = await oracle.submitMiningSolution(1,100 + i,{from:accounts[i]});
      	}  
        balance1 = web3.utils.fromWei(await oracle.balanceOf(accounts[2]))*1 +web3.utils.fromWei(await tellorToken.balanceOf(accounts[2]))*1;
        blocknum = await oracle.getMinedBlockNum(0,res.logs[1].args['_time']);
        await tellorToken.mint(accounts[1],web3.utils.toWei('5000', 'ether'));
        dispBal1 = web3.utils.fromWei(await oracle.balanceOf(accounts[1]))*1 +web3.utils.fromWei(await tellorToken.balanceOf(accounts[1]))*1;
        await tellorToken.approve(oracle.address,web3.utils.toWei('10'),{from:accounts[1]});
        await  oracle.beginDispute(1,res.logs[1].args['_time'],2,{from:accounts[1]});
        count = await await oracle.getUintVar(web3.utils.keccak256("disputeCount"));
	      await oracle.vote(1,false,{from:accounts[3]});
        await helper.advanceTime(86400 * 22);
        await oracle.tallyVotes(1);
        await helper.advanceTime(86400 * 2 )
      	await oracle.unlockDisputeFee(1,{from:accounts[0],gas:2000000}) 
        balance2 = web3.utils.fromWei(await oracle.balanceOf(accounts[2]))*1 +web3.utils.fromWei(await tellorToken.balanceOf(accounts[2]))*1;   
        dispBal2 = web3.utils.fromWei(await oracle.balanceOf(accounts[1]))*1 +web3.utils.fromWei(await tellorToken.balanceOf(accounts[1]))*1;
        assert(balance2 - balance1 == 10,"balance1 should equal balance2")
        assert(dispBal1 - dispBal2 == 10)
        s =  await oracle.getStakerInfo(accounts[2])
        assert(s[0] ==1, " Staked" );
    });
   it("Test failed Dispute of different miner Indexes", async function () {
    await tellorToken.mint(accounts[9],web3.utils.toWei("50000"));
        for(var i = 5;i<8;i++){
          await tellorToken.mint(accounts[i],web3.utils.toWei("5000"));
          await tellorToken.approve(oracle.address,web3.utils.toWei('100','ether'),{from:accounts[i]});
          await oracle.depositStake(web3.utils.toWei('100'),{from:accounts[i],gas:2000000,})
        }
		    for(var i =1;i<4;i++){
        	await tellorToken.approve(oracle.address,5,{from:accounts[0]});
        	await oracle.addTip(1,5,{from:accounts[0],gas:2000000})
         	let miners = await oracle.getCurrentMiners();
	        for(var ii = 0;ii<5;ii++){
            	res = await oracle.submitMiningSolution(1,100 + ii,{from:miners[ii]});
          	}
	        miners =await oracle.getMinersByRequestIdAndTimestamp(1,res.logs[1].args['_time']);
	        await tellorToken.mint(miners[i-1],web3.utils.toWei('5000', 'ether'))
	        await tellorToken.approve(oracle.address,web3.utils.toWei("10"),{from:miners[i-1]});
	        await  oracle.beginDispute(1,res.logs[1].args['_time'],i,{from:miners[i-1]});
	        let disputeVars = await oracle.getAllDisputeVars(i);
	        balance1 = web3.utils.fromWei(await oracle.balanceOf(miners[i]))*1 +web3.utils.fromWei(await tellorToken.balanceOf(miners[i]))*1;
	        assert(disputeVars['3'] == miners[i],"miner should be correct")
	        await oracle.vote(i,false,{from:accounts[9]});
	        await helper.advanceTime(86400 * 22);
	        await oracle.tallyVotes(i);
	        await helper.advanceTime(86400 * 3)
      		await oracle.unlockDisputeFee(i,{from:accounts[0],gas:4000000}) 
	        assert(await oracle.isInDispute(1,res.logs[1].args['_time']) == false, "is no longer in dispute")
	     	  balance2 = web3.utils.fromWei(await oracle.balanceOf(miners[i]))*1 +web3.utils.fromWei(await tellorToken.balanceOf(miners[i]))*1;
	        assert(balance2-balance1 == '10',"reported miner's balance should change correctly");
	        s =  await oracle.getStakerInfo(miners[i])
        	assert(s[0] ==1, " Staked" );
	     }
    })
 });    