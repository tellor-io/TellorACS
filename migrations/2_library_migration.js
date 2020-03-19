/****Uncomment the body below to run this with Truffle migrate for truffle testing*/
var Tellor = artifacts.require("./Tellor.sol");
var TellorMaster = artifacts.require("./TellorMaster.sol");
/****Uncomment the body to run this with Truffle migrate for truffle testing*/

/**
*@dev Use this for setting up contracts for testing 
*this will link the Factory and Tellor Library

*These commands that need to be ran:
*truffle migrate --network rinkeby
*truffle exec scripts/Migrate_1.js --network rinkeby
*truffle exec scripts/Migrate_2.js --network rinkeby
*/
// function sleep_s(secs) {
//   secs = (+new Date) + secs * 1000;
//   while ((+new Date) < secs);
// }

module.exports = async function (deployer) {


  //sleep_s(60);

  //deploy tellor master
  await deployer.deploy(Tellor).then(async function() {
    await deployer.deploy(TellorMaster, Tellor.address)
  });



};
/****Uncomment the body to run this with Truffle migrate for truffle testing*/
