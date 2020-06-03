<p align="center">
  <a href='https://www.tellor.io/'>
    <img src= 'https://raw.githubusercontent.com/tellor-io/TellorBrandMaterials/master/LightBkrnd_RGB.png' width="250" height="200" alt='tellor.io' />
  </a>
</p>

<p align="center">
  <a href='https://twitter.com/WeAreTellor'>
    <img src= 'https://img.shields.io/twitter/url/http/shields.io.svg?style=social' alt='Twitter WeAreTellor' />
  </a> 
</p>


# Tellor Oracle Alternate Chain Structure (ACS)

### ACS implementation on Alternate Chains
Implemenatation of the ACS will vary by specific blockchain. This iteration can be implemented on chains that are Ethereum EVM compatible.

### Deployment steps
Step 1: Deploy Tellor.sol on alternate chain

### Quick Truffle test

```Bash
$ git clone 'https://github.com/tellor-io/TellorACS'
$ npm install
$ truffle compile
$ truffle develop
$ migrate
$ test
```

## Overview <a name="overview"> </a>  
Blockchains are closed systems that due to their consensus mechanisms cannot natively access off-chain data. If your smart contract relies on off-chain (e.g. internet or another chain) data to evaluate or execute a function, you either have to manually feed the data to your contract, incentivize users to do it, or rely on a centralized party to provide the data.

<b>The Tellor oracle</b> is a decentralized oracle. It provides an option for contracts to securely interact with and obtain data from off-chain. 

### Background <a name="background"></a>

On Ethereum, Tellor has implemented a network of staked PoW miners that compete to provide data and their stake can be slashed if they are deemed malicious. For more information about Tellor's implemetation on Ethereum check out our [documenation](https://tellor.readthedocs.io/en/latest/).

However, in order to support other chains, Tellor has developed an alternative chain structure (ACS) that works for both the security model of Tellor on Ethereum and on the alternate chain(s) as well.  In addition, the token economic model and utility of the current Tellor system is not compromised and only enhanced by the ability to support other chains.

Why not just deploy the current Tellor implementation in another chain?

1. Doing this would split PoW hashpower and decrease security.
2. Minting the "same" token in two chains is problematic since it would increase the inflation rate and keeping a healty token price relationship is difficult.
3. Tellor's current structure was specifically desinged with Ethereum's limitations and DeFi in mind. Alternate chains have different data demands and even different features (e.g. speed) that we can and should incorporate into the desing.


### Alternate Chain structure
The plan for alterate chains is to build a PoS Tellor system utilizing the Tellor Token and the current network of the Tellor community to validate and provide data on the alternate chain. The design assummes the alternate chain has:

* Functioning, Decentralized Token Bridge 
* On-chain smart contracts 


<p align="center">
<img src="./public/acsStructure.png" width="400" height="300" alt = "How it works">
</p>

The following workflow describes the steps for the ACS:
* Tellor Token holders wishing to validate or request data on the alternate chain need to transfer TRB tokens from Ethereum to the alternate chain.The TRB token is an ERC20 token.
* Validators stake Tellor Tokens in increments of 10 tokens
These ACS stakers are randomly selected to provide data for the given requests.
* There are 5 validators per data point. 
Parties pay for requests with TRB or native token and the payment is split among validating stakers
* The minimum amount of TRB for each data point is determined by the cost network cost for txn
* Stakers are only rewarded if they fulfill the task, but if they miss their turn 5 times, they will lose a small amount of stake (e.g. 1 TRB per day) and are unstaked automatically after that.
* Values can be disputed
* There is a day long voting round initially, with additional dispute rounds where the dispute fee and voting period is doubled each time. Rounds are necessary to mitigate risk of flash voting. 
* Voting is based upon the balance on the sidechain at beginning of the dispute (so you can bring over more Tellor for each subsequent dispute)


#### Maintainers <a name="maintainers"> </a> 
[@themandalore](https://github.com/themandalore)
<br>
[@brendaloya](https://github.com/brendaloya) 


#### How to Contribute<a name="how2contribute"> </a>  
Join our Discord or Telegram:
[<img src="./public/telegram.png" width="24" height="24">](https://t.me/tellor)
[<img src="./public/discord.png" width="24" height="24">](https://discord.gg/zFcM3G)

Check out or issues log here on Github or contribute to our future plans to build a better miner and more examples of data secured by Tellor. 


#### Contributors<a name="contributors"> </a>

This repository is maintained by the Tellor team - [www.tellor.io](https://www.tellor.io)


#### Copyright

Tellor Inc. 2019
