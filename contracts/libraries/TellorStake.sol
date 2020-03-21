pragma solidity ^0.5.0;

import "./TellorStorage.sol";
import "./TellorTransfer.sol";
import "./TellorDispute.sol";
import "../interfaces/TokenInterface.sol";
/**
* itle Tellor Dispute
* @dev Contais the methods related to miners staking and unstaking. Tellor.sol
* references this library for function's logic.
*/

library TellorStake {
    event NewStake(address indexed _sender); //Emits upon new staker
    event StakeWithdrawn(address indexed _sender); //Emits when a staker is now no longer staked
    event StakeWithdrawRequested(address indexed _sender); //Emits when a staker begins the 7 day withdraw period

    /*Functions*/

    /**
    * @dev This function stakes the five initial miners, sets the supply and all the constant variables.
    * This function is called by the constructor function on TellorMaster.sol
    */
    function init(TellorStorage.TellorStorageStruct storage self) public {
        require(self.uintVars[keccak256("decimals")] == 0, "Too many decimals");
        //set Constants
        self.uintVars[keccak256("decimals")] = 18;
        self.uintVars[keccak256("targetMiners")] = 200;
        self.uintVars[keccak256("disputeFee")] = 10e18;
        self.uintVars[keccak256("minimumStake")] = 100e18;
    }

    /**
    * @dev This function allows stakers to request to withdraw their stake (no longer stake)
    * once they lock for withdraw(stakes.currentStatus = 2) they are locked for 7 days before they
    * can withdraw the deposit
    */
    function requestStakingWithdraw(TellorStorage.TellorStorageStruct storage self, uint _amount) public {
        requestStakingWithdrawInternal(self,msg.sender,_amount);
    }

    /**
    * @dev This function allows stakers to request to withdraw their stake (no longer stake)
    * once they lock for withdraw(stakes.currentStatus = 2) they are locked for 7 days before they
    * can withdraw the deposit
    */
    function requestStakingWithdrawInternal(TellorStorage.TellorStorageStruct storage self,address _party, uint _amount) internal {
        TellorStorage.StakeInfo storage stakes = self.stakerDetails[_party];
        uint minimumStake = self.uintVars[keccak256("minimumStake")];
        //Require that the miner is staked
        require(stakes.currentStatus == 1, "Miner is not staked");
        require(_amount % minimumStake == 0, "Must be divisible by minimumStake");
        require(_amount <= TellorTransfer.balanceOf(self,_party));
        for(uint i=0; i <= _amount / minimumStake; i++) {
            removeFromStakerArray(self, stakes.stakePosition[i],_party);
        }

       //Change the miner staked to locked to be withdrawStake
        if (TellorTransfer.balanceOf(self,_party) == 0){
            stakes.currentStatus = 2;
            self.uintVars[keccak256("stakerCount")] -= 1;
        }
        stakes.withdrawDate = now - (now % 86400);
        stakes.withdrawAmount = _amount;
        emit StakeWithdrawRequested(_party);
    }

    /**
    * @dev This function allows users to withdraw their stake after a 7 day waiting period from request
    */
    function withdrawStake(TellorStorage.TellorStorageStruct storage self) public {
        TellorStorage.StakeInfo storage stakes = self.stakerDetails[msg.sender];
        //Require the staker has locked for withdraw(currentStatus ==2) and that 7 days have
        //passed by since they locked for withdraw
        require(now - (now % 86400) - stakes.withdrawDate >= 7 days, "7 days didn't pass");
        require(stakes.currentStatus !=3 , "Miner was not locked for withdrawal");
        TellorTransfer.doTransfer(self,msg.sender,address(0),stakes.withdrawAmount);
        if (TellorTransfer.balanceOf(self,msg.sender) == 0){
            stakes.currentStatus =0 ;
            self.uintVars[keccak256("stakerCount")] -= 1;
            self.uintVars[keccak256("uniqueStakers")] -= 1;
        }
        self.uintVars[keccak256("totalStaked")] -= stakes.withdrawAmount;
        TokenInterface tellorToken = TokenInterface(self.addressVars[keccak256("tellorToken")]);
        tellorToken.transfer(msg.sender,stakes.withdrawAmount);
        emit StakeWithdrawn(msg.sender);
    }

    /**
    * @dev This function allows miners to deposit their stake.
    */
    function depositStake(TellorStorage.TellorStorageStruct storage self, uint _amount) public {
       TokenInterface tellorToken = TokenInterface(self.addressVars[keccak256("tellorToken")]);
            
        require(tellorToken.balanceOf(msg.sender) >= _amount + TellorTransfer.balanceOf(self,msg.sender), "Balance is lower than stake amount");
        require(tellorToken.allowance(msg.sender,address(this)) >= _amount);
        tellorToken.transferFrom(msg.sender, address(this), _amount);
        //Ensure they can only stake if they are not currrently staked or if their stake time frame has ended
        //and they are currently locked for witdhraw
        require(self.stakerDetails[msg.sender].currentStatus != 3, "Miner is in the wrong state");
        if(TellorTransfer.balanceOf(self,msg.sender) == 0){
            self.uintVars[keccak256("stakerCount")] += 1;
        }
        uint minimumStake = self.uintVars[keccak256("minimumStake")];
        require(_amount > minimumStake, "You must stake a certain amount");
        require(_amount % self.uintVars[keccak256("minimumStake")] == 0, "Must be divisible by minimumStake");
        for(uint i=0; i <= _amount / minimumStake; i++){
            self.stakerDetails[msg.sender].stakePosition.push(self.stakers.length);
            self.stakerDetails[msg.sender].stakePositionArrayIndex[self.stakers.length] = i;
            self.stakers.push(msg.sender);
        }
        self.stakerDetails[msg.sender].currentStatus = 1;
        self.stakerDetails[msg.sender].startDate = now - (now % 86400);
        TellorTransfer.doTransfer(self,address(0),msg.sender,_amount);
        //self.uniqueStakers += 1;
        self.uintVars[keccak256("uniqueStakers")] += 1;
        //self.totalStaked += _amount;
        self.uintVars[keccak256("totalStaked")]  += _amount;
        emit NewStake(msg.sender);
    }


    function removeFromStakerArray(TellorStorage.TellorStorageStruct storage self, uint _pos, address _staker) internal{
        address lastAdd;
        //uint lastIndex;
        if(_pos == self.stakers.length-1){
             self.stakers.length--;
            uint localIndex = self.stakerDetails[_staker].stakePositionArrayIndex[_pos];
            if(localIndex == self.stakerDetails[msg.sender].stakePosition.length){
                self.stakerDetails[msg.sender].stakePosition.length--;
            }
            else{
                uint lastLocal= self.stakerDetails[msg.sender].stakePosition.length-1;
                self.stakerDetails[msg.sender].stakePosition[localIndex] = lastLocal;
                self.stakerDetails[_staker].stakePositionArrayIndex[_pos] = 0; //fix so not zero
            }
        }
        else{
            lastAdd = self.stakers[self.stakers.length-1];
            self.stakers[_pos] = lastAdd;
            self.stakers.length--;
            uint localIndex = self.stakerDetails[_staker].stakePositionArrayIndex[_pos];
            if(localIndex == self.stakerDetails[msg.sender].stakePosition.length){
                self.stakerDetails[msg.sender].stakePosition.length--;
            }
            else{
                //uint lastLocal= self.stakerDetails[msg.sender]['stakePosition'][length-1];
                uint lastLocal= self.stakerDetails[msg.sender].stakePosition.length-1;
                self.stakerDetails[msg.sender].stakePosition[localIndex] = lastLocal;
                self.stakerDetails[_staker].stakePositionArrayIndex[_pos] = 0; //fix so not zero

            }
        }
    }
}
