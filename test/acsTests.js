/** 
* This contract tests the Tellor functions
*/ 

const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));
const BN = require('bn.js');
const helper = require("./helpers/test_helpers");
//const ethers = require('ethers');
const Utilities = artifacts.require("./libraries/Utilities.sol");
const UtilitiesTests = artifacts.require("./UtilitiesTests.sol");
const TellorMaster = artifacts.require("./TellorMaster.sol");
const Tellor = artifacts.require("./Tellor.sol"); // globally injected artifacts helper

var oracleAbi = Tellor.abi;
var masterAbi = TellorMaster.abi;
var oracleByte = Tellor.bytecode;

var api = 'json(https://api.gdax.com/products/BTC-USD/ticker).price';
var api2 = 'json(https://api.gdax.com/products/ETH-USD/ticker).price';

contract('ACS specific Tests', function(accounts) {
  let oracle;
  let oracle2;
  let oracleBase;
  let logNewValueWatcher;
  let master;
  let utilities;
  let newOracle;

    beforeEach('Setup contract for each test', async function () {
        oracleBase = await OldTellor.new();
        oracle = await TellorMaster.new(oracleBase.address);
        master = await new web3.eth.Contract(masterAbi,oracle.address);
        oracle2 = await new web3.eth.Contract(oracleAbi,oracleBase.address);///will this instance work for logWatch? hopefully...
        //await web3.eth.sendTransaction({to: oracle.address,from:accounts[0],gas:7000000,data:oracle2.methods.init().encodeABI()})
        await web3.eth.sendTransaction({to: oracle.address,from:accounts[0],gas:7000000,data:oracle2.methods.requestData(api,"BTC/USD",1000,0).encodeABI()})
        await helper.advanceTime(86400 * 8);
        await web3.eth.sendTransaction({to:oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestStakingWithdraw().encodeABI()})
        await helper.advanceTime(86400 * 8);
        await web3.eth.sendTransaction({to:oracle.address,from:accounts[2],data:oracle2.methods.withdrawStake().encodeABI()})
        utilities = await UtilitiesTests.new();
        await utilities.setTellorMaster(oracle.address);

   });  

   it("change Tellor Contract", async function () {
    assert(1 == 0)
   });
   it("test multiple staking one address", async function () {
  assert(1 == 0)
   });
   it("test multiple staking one address, removal of part", async function () {
  assert(1 == 0)
   });
   it("test multiple staking one address, dispute and slashing", async function () {
  assert(1 == 0)
   });

});