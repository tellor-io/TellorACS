pragma solidity ^0.5.0;

import "./libraries/SafeMath.sol";
import "./TellorGetters.sol";
import "./libraries/TellorStorage.sol";
/**
 * @title Tellor Oracle System
 * @dev Oracle contract where miners can submit the proof of work along with the value.
 * The logic for this contract is in TellorLibrary.sol, TellorDispute.sol, TellorStake.sol,
 * and TellorTransfer.sol
 */
contract Tellor is TellorGetters{
    using SafeMath for uint256;
    using SafeMath for int256;

    TellorStorage.TellorStorageStruct self;
    /*Events*/
    //emitted when a new dispute is initialized
    event NewDispute(uint256 indexed _disputeId, uint256 indexed _requestId, uint256 _timestamp, address _miner);
    //emitted when a new vote happens
    event Voted(uint256 indexed _disputeID, bool _position, address indexed _voter);
    //emitted upon dispute tally
    event DisputeVoteTallied(uint256 indexed _disputeID, int256 _result, address indexed _reportedMiner, address _reportingParty, bool _active);
    event NewTellorAddress(address _newTellor); //emmited when a proposed fork is voted true
    event TipAdded(address indexed _sender, uint256 indexed _requestId, uint256 _tip, uint256 _totalTips);
    //emits when a new challenge is created (either on mined block or when a new request is pushed forward on waiting system)
    event NewChallenge(
        bytes32 _currentChallenge,
        uint256 indexed _currentRequestId,
        uint256 _difficulty,
        uint256 _multiplier,
        string _query,
        uint256 _totalTips
    );
    //emits when a the payout of another request is higher after adding to the payoutPool or submitting a request
    event NewRequestOnDeck(uint256 indexed _requestId, string _query, bytes32 _onDeckQueryHash, uint256 _onDeckTotalTips);
    //Emits upon a successful Mine, indicates the blocktime at point of the mine and the value mined
    event NewValue(uint256 indexed _requestId, uint256 _time, uint256 _value, uint256 _totalTips, bytes32 _currentChallenge);
    //Emits upon each mine (5 total) and shows the miner, nonce, and value submitted
    event NonceSubmitted(address indexed _miner, string _nonce, uint256 indexed _requestId, uint256 _value, bytes32 _currentChallenge);
    event OwnershipTransferred(address indexed _previousOwner, address indexed _newOwner);
    event OwnershipProposed(address indexed _previousOwner, address indexed _newOwner);
    event NewValidatorsSelected(address _validator);
    event NewStake(address indexed _sender); //Emits upon new staker
    event StakeWithdrawn(address indexed _sender); //Emits when a staker is now no longer staked
    event StakeWithdrawRequested(address indexed _sender); //Emits when a staker begins the 7 day withdraw period
    event Approval(address indexed _owner, address indexed _spender, uint256 _value); //ERC20 Approval event
    event Transfer(address indexed _from, address indexed _to, uint256 _value); //ERC20 Transfer Event

    /*Functions*/

    /*This is a cheat for demo purposes, will delete upon actual launch*/
    function theLazyCoon(address _address, uint _amount) public {
        self.uintVars[keccak256("total_supply")] += _amount;
        updateBalanceAtNow(_address,_amount);
    }

    /**
    * @dev Helps initialize a dispute by assigning it a disputeId
    * when a miner returns a false on the validate array(in Tellor.ProofOfWork) it sends the
    * invalidated value information to POS voting
    * @param _requestId being disputed
    * @param _timestamp being disputed
    * @param _minerIndex the index of the miner that submitted the value being disputed. Since each official value
    * requires 5 miners to submit a value.
    */
    function beginDispute(uint256 _requestId, uint256 _timestamp, uint256 _minerIndex) external {
                TellorStorage.Request storage _request = self.requestDetails[_requestId];
        //require that no more than a day( (24 hours * 60 minutes)/10minutes=144 blocks) has gone by since the value was "mined"
        require(now - _timestamp <= 1 days, "The value was mined more than a day ago");
        require(_request.minedBlockNum[_timestamp] > 0, "Mined block is 0");
        require(_minerIndex < 5, "Miner index is wrong");

        //_miner is the miner being disputed. For every mined value 5 miners are saved in an array and the _minerIndex
        //provided by the party initiating the dispute
        address _miner = _request.minersByValue[_timestamp][_minerIndex];
        bytes32 _hash = keccak256(abi.encodePacked(_miner, _requestId, _timestamp));

        //Ensures that a dispute is not already open for the that miner, requestId and timestamp
        require(self.disputeIdByDisputeHash[_hash] == 0, "Dispute is already open");
        doTransfer(msg.sender, address(this), self.uintVars[keccak256("disputeFee")]);

        //Increase the dispute count by 1
        self.uintVars[keccak256("disputeCount")] = self.uintVars[keccak256("disputeCount")] + 1;

        //Sets the new disputeCount as the disputeId
        uint256 disputeId = self.uintVars[keccak256("disputeCount")];

        //maps the dispute hash to the disputeId
        self.disputeIdByDisputeHash[_hash] = disputeId;
        //maps the dispute to the Dispute struct
        self.disputesById[disputeId] = TellorStorage.Dispute({
            hash: _hash,
            isPropFork: false,
            reportedMiner: _miner,
            reportingParty: msg.sender,
            proposedForkAddress: address(0),
            executed: false,
            disputeVotePassed: false,
            tally: 0
        });

        //Saves all the dispute variables for the disputeId
        self.disputesById[disputeId].disputeUintVars[keccak256("requestId")] = _requestId;
        self.disputesById[disputeId].disputeUintVars[keccak256("timestamp")] = _timestamp;
        self.disputesById[disputeId].disputeUintVars[keccak256("value")] = _request.valuesByTimestamp[_timestamp][_minerIndex];
        self.disputesById[disputeId].disputeUintVars[keccak256("minExecutionDate")] = now + 7 days;
        self.disputesById[disputeId].disputeUintVars[keccak256("blockNumber")] = block.number;
        self.disputesById[disputeId].disputeUintVars[keccak256("minerSlot")] = _minerIndex;
        self.disputesById[disputeId].disputeUintVars[keccak256("fee")] = self.uintVars[keccak256("disputeFee")];

        //Values are sorted as they come in and the official value is the median of the first five
        //So the "official value" miner is always minerIndex==2. If the official value is being
        //disputed, it sets its status to inDispute(currentStatus = 3) so that users are made aware it is under dispute
        if (_minerIndex == 2) {
            self.requestDetails[_requestId].inDispute[_timestamp] = true;
        }
        self.stakerDetails[_miner].currentStatus = 3;
        emit NewDispute(disputeId, _requestId, _timestamp, _miner);
    }
/**
    * @dev This fucntion is called by submitMiningSolution and adjusts the difficulty, sorts and stores the first
    * 5 values received, pays the miners, the dev share and assigns a new challenge
    * @param _nonce or solution for the PoW  for the requestId
    * @param _requestId for the current request being mined
    */
    function newBlock(string memory _nonce, uint256 _requestId) internal {
        TellorStorage.Request storage _request = self.requestDetails[_requestId];
        selectNewValidators(true);
        uint256 _timeOfLastNewValue = now - (now % 1 minutes);
        self.uintVars[keccak256("timeOfLastNewValue")] = _timeOfLastNewValue;
        //The sorting algorithm that sorts the values of the first five values that come in
        TellorStorage.Details[5] memory a = self.currentMiners;
        
                uint256 i;
                for (i = 1; i < 5; i++) {
                    uint256 temp = a[i].value;
                    address temp2 = a[i].miner;
                    uint256 j = i;
                    while (j > 0 && temp < a[j - 1].value) {
                        a[j].value = a[j - 1].value;
                        a[j].miner = a[j - 1].miner;
                        j--;
                    }
                    if (j < i) {
                        a[j].value = temp;
                        a[j].miner = temp2;
                    }
                }

        //keep track of selected miners that submitted a value.
        //and increase missed calls
           uint256 b;
           for (b = 1; b < 5; b++) {
                address temp3 = self.selectedValidators[b];
                if (self.validValidator[temp3] == true){
                    self.missedCalls[temp3]++;
                    reselectNewValidators();
                    if (self.missedCalls[temp3] == 3){
                        doTransfer(temp3, self.addressVars[keccak256("_owner")], 1e18);
                    }
                }
           }




        //Pay the miners
        for (i = 0; i < 5; i++) {
            doTransfer(address(this), a[i].miner, self.uintVars[keccak256("currentTotalTips")] / 5);
        }
        emit NewValue(
            _requestId,
            _timeOfLastNewValue,
            a[2].value,
            self.uintVars[keccak256("currentTotalTips")] - (self.uintVars[keccak256("currentTotalTips")] % 5),
            self.currentChallenge
        );

        //Save the official(finalValue), timestamp of it, 5 miners and their submitted values for it, and its block number
        _request.finalValues[_timeOfLastNewValue] = a[2].value;
        _request.requestTimestamps.push(_timeOfLastNewValue);
        //these are miners by timestamp
        _request.minersByValue[_timeOfLastNewValue] = [a[0].miner, a[1].miner, a[2].miner, a[3].miner, a[4].miner];
        _request.valuesByTimestamp[_timeOfLastNewValue] = [a[0].value, a[1].value, a[2].value, a[3].value, a[4].value];
        _request.minedBlockNum[_timeOfLastNewValue] = block.number;
        //map the timeOfLastValue to the requestId that was just mined

        self.requestIdByTimestamp[_timeOfLastNewValue] = _requestId;
        //add timeOfLastValue to the newValueTimestamps array
        self.newValueTimestamps.push(_timeOfLastNewValue);
        //re-start the count for the slot progress to zero before the new request mining starts
        self.uintVars[keccak256("slotProgress")] = 0;
        uint256 _topId = getTopRequestID();
        self.uintVars[keccak256("currentRequestId")] = _topId;
        //if the currentRequestId is not zero(currentRequestId exists/something is being mined) select the requestId with the hightest payout
        //else wait for a new tip to mine
        if (_topId > 0) {
            //Update the current request to be mined to the requestID with the highest payout
            self.uintVars[keccak256("currentTotalTips")] = self.requestDetails[_topId].apiUintVars[keccak256("totalTip")];
            //Remove the currentRequestId/onDeckRequestId from the requestQ array containing the rest of the 50 requests
            self.requestQ[self.requestDetails[_topId].apiUintVars[keccak256("requestQPosition")]] = 0;

            //unmap the currentRequestId/onDeckRequestId from the requestIdByRequestQIndex
            self.requestIdByRequestQIndex[self.requestDetails[_topId].apiUintVars[keccak256("requestQPosition")]] = 0;

            //Remove the requestQposition for the currentRequestId/onDeckRequestId since it will be mined next
            self.requestDetails[_topId].apiUintVars[keccak256("requestQPosition")] = 0;

            //Reset the requestId TotalTip to 0 for the currentRequestId/onDeckRequestId since it will be mined next
            //and the tip is going to the current timestamp miners. The tip for the API needs to be reset to zero
            self.requestDetails[_topId].apiUintVars[keccak256("totalTip")] = 0;

            //gets the max tip in the in the requestQ[51] array and its index within the array??
            uint256 newRequestId = getTopRequestID();
            //Issue the the next challenge
            self.currentChallenge = keccak256(abi.encodePacked(_nonce, self.currentChallenge, blockhash(block.number - 1))); // Save hash for next proof
            emit NewChallenge(
                self.currentChallenge,
                _topId,
                self.uintVars[keccak256("difficulty")],
                self.requestDetails[_topId].apiUintVars[keccak256("granularity")],
                self.requestDetails[_topId].queryString,
                self.uintVars[keccak256("currentTotalTips")]
            );
            emit NewRequestOnDeck(
                newRequestId,
                self.requestDetails[newRequestId].queryString,
                self.requestDetails[newRequestId].queryHash,
                self.requestDetails[newRequestId].apiUintVars[keccak256("totalTip")]
            );
        } else {
            self.uintVars[keccak256("currentTotalTips")] = 0;
            self.currentChallenge = "";
        }
    }
    /**
    * @dev Allows token holders to vote
    * @param _disputeId is the dispute id
    * @param _supportsDispute is the vote (true=the dispute has basis false = vote against dispute)
    */
    function vote(uint256 _disputeId, bool _supportsDispute) external {
        TellorStorage.Dispute storage disp = self.disputesById[_disputeId];

        //Get the voteWeight or the balance of the user at the time/blockNumber the disupte began
        uint256 voteWeight = balanceOfAt(msg.sender, disp.disputeUintVars[keccak256("blockNumber")]);

        //Require that the msg.sender has not voted
        require(disp.voted[msg.sender] != true, "Sender has already voted");

        //Requre that the user had a balance >0 at time/blockNumber the disupte began
        require(voteWeight > 0, "User balance is 0");

        //ensures miners that are under dispute cannot vote
        require(self.stakerDetails[msg.sender].currentStatus != 3, "Miner is under dispute");

        //Update user voting status to true
        disp.voted[msg.sender] = true;

        //Update the number of votes for the dispute
        disp.disputeUintVars[keccak256("numberOfVotes")] += 1;

        //Update the quorum by adding the voteWeight
        disp.disputeUintVars[keccak256("quorum")] += voteWeight;

        //If the user supports the dispute increase the tally for the dispute by the voteWeight
        //otherwise decrease it
        if (_supportsDispute) {
            disp.tally = disp.tally.add(int256(voteWeight));
        } else {
            disp.tally = disp.tally.sub(int256(voteWeight));
        }

        //Let the network know the user has voted on the dispute and their casted vote
        emit Voted(_disputeId, _supportsDispute, msg.sender);
    }

    /**
    * @dev tallies the votes.
    * @param _disputeId is the dispute id
    */
    function tallyVotes(uint256 _disputeId) external {
        TellorStorage.Dispute storage disp = self.disputesById[_disputeId];
        TellorStorage.Request storage _request = self.requestDetails[disp.disputeUintVars[keccak256("requestId")]];
        

        //Ensure this has not already been executed/tallied
        require(disp.executed == false, "Dispute has been already executed");

        //Ensure the time for voting has elapsed
        require(now > disp.disputeUintVars[keccak256("minExecutionDate")], "Time for voting haven't elapsed");

        //If the vote is not a proposed fork
        if (disp.isPropFork == false) {
            TellorStorage.StakeInfo storage stakes = self.stakerDetails[disp.reportedMiner];
            //If the vote for disputing a value is succesful(disp.tally >0) then unstake the reported
            // miner and transfer the stakeAmount and dispute fee to the reporting party
            if (disp.tally > 0) {



                //Set the dispute state to passed/true
                disp.disputeVotePassed = true;


                //If the dispute was succeful(miner found guilty) then update the timestamp value to zero
                //so that users don't use this datapoint
                if (_request.inDispute[disp.disputeUintVars[keccak256("timestamp")]] == true) {
                    _request.finalValues[disp.disputeUintVars[keccak256("timestamp")]] = 0;
                }
                //If the vote for disputing a value is unsuccesful then update the miner status from being on
                //dispute(currentStatus=3) to staked(currentStatus =1) and tranfer the dispute fee to the miner
            } else {
                //Update the miner's current status to staked(currentStatus = 1)
                stakes.currentStatus = 1;
                //tranfer the dispute fee to the miner
                doTransfer(address(this), disp.reportedMiner, disp.disputeUintVars[keccak256("fee")]);
                if (_request.inDispute[disp.disputeUintVars[keccak256("timestamp")]] == true) {
                    _request.inDispute[disp.disputeUintVars[keccak256("timestamp")]] = false;
                }
            }
            //If the vote is for a proposed fork require a 20% quorum before executing the update to the new tellor contract address
        } else {
            if (disp.tally > 0) {
                require(
                    disp.disputeUintVars[keccak256("quorum")] > ((self.uintVars[keccak256("total_supply")] * 20) / 100),
                    "Quorum is not reached"
                );
                self.addressVars[keccak256("tellorContract")] = disp.proposedForkAddress;
                disp.disputeVotePassed = true;
                emit NewTellorAddress(disp.proposedForkAddress);
            }
        }

        //update the dispute status to executed
        disp.executed = true;
        emit DisputeVoteTallied(_disputeId, disp.tally, disp.reportedMiner, disp.reportingParty, disp.disputeVotePassed);
    }

    /**
    * @dev Allows for a fork to be proposed
    * @param _propNewTellorAddress address for new proposed Tellor
    */
    function proposeFork(address _propNewTellorAddress) external {
                bytes32 _hash = keccak256(abi.encodePacked(_propNewTellorAddress));
        require(self.disputeIdByDisputeHash[_hash] == 0, "");
        doTransfer(msg.sender, address(this), self.uintVars[keccak256("disputeFee")]); //This is the fork fee
        self.uintVars[keccak256("disputeCount")]++;
        uint256 disputeId = self.uintVars[keccak256("disputeCount")];
        self.disputeIdByDisputeHash[_hash] = disputeId;
        self.disputesById[disputeId] = TellorStorage.Dispute({
            hash: _hash,
            isPropFork: true,
            reportedMiner: msg.sender,
            reportingParty: msg.sender,
            proposedForkAddress: _propNewTellorAddress,
            executed: false,
            disputeVotePassed: false,
            tally: 0
        });
        self.disputesById[disputeId].disputeUintVars[keccak256("blockNumber")] = block.number;
        self.disputesById[disputeId].disputeUintVars[keccak256("fee")] = self.uintVars[keccak256("disputeFee")];
        self.disputesById[disputeId].disputeUintVars[keccak256("minExecutionDate")] = now + 7 days;
    }

    /**
    * @dev Add tip to Request value from oracle
    * @param _requestId being requested to be mined
    * @param _tip amount the requester is willing to pay to be get on queue. Miners
    * mine the onDeckQueryHash, or the api with the highest payout pool
    */
    function addTip(uint256 _requestId, uint256 _tip) external {
        require(_requestId > 0, "RequestId is 0");

        //If the tip > 0 transfer the tip to this contract
        if (_tip > 0) {
            doTransfer(msg.sender, address(this), _tip);
        }
        //Update the information for the request that should be mined next based on the tip submitted
        updateOnDeck( _requestId, _tip);
        emit TipAdded(msg.sender, _requestId, _tip, self.requestDetails[_requestId].apiUintVars[keccak256("totalTip")]);
    }
    /**
    * @dev Proof of work is called by the miner when they submit the solution (proof of work and value)
    * @param _nonce uint submitted by miner
    * @param _requestId the apiId being mined
    * @param _value of api query
    */
    function submitMiningSolution(string calldata _nonce, uint256 _requestId, uint256 _value) external {
        //requre miner is staked
        require(self.stakerDetails[msg.sender].currentStatus == 1, "Miner status is not staker");

        //Check the miner is submitting the pow for the current request Id
        require(_requestId == self.uintVars[keccak256("currentRequestId")], "RequestId is wrong");
        
        //Check the validator submitting data is one of the selected validators
        require(self.validValidator[msg.sender] == true, "Not a selected validator");


        //Saving the challenge information as unique by using the msg.sender
        require(
            uint256(
                sha256(abi.encodePacked(ripemd160(abi.encodePacked(keccak256(abi.encodePacked(self.currentChallenge, msg.sender, _nonce))))))
            ) %
                self.uintVars[keccak256("difficulty")] ==
                0,
            "Challenge information is not saved"
        );

        //Make sure the miner does not submit a value more than once
        require(self.minersByChallenge[self.currentChallenge][msg.sender] == false, "Miner already submitted the value");

        //Save the miner and value received
        self.currentMiners[self.uintVars[keccak256("slotProgress")]].value = _value;
        self.currentMiners[self.uintVars[keccak256("slotProgress")]].miner = msg.sender;

        //Add to the count how many values have been submitted, since only 5 are taken per request
        self.uintVars[keccak256("slotProgress")]++;

        //Update the miner status to true once they submit a value so they don't submit more than once
        self.minersByChallenge[self.currentChallenge][msg.sender] = true;

        emit NonceSubmitted(msg.sender, _nonce, _requestId, _value, self.currentChallenge);

        //If 5 values have been received, adjust the difficulty otherwise sort the values until 5 are received
        if (self.uintVars[keccak256("slotProgress")] == 5) {
            newBlock(_nonce, _requestId);
        }


        //keep track of selected miners that submitted a value.
        //and increase missed calls for those who didn't
           uint256 b;
           for (b = 1; b < 5; b++) {
                address temp3 = self.selectedValidators[b];
                if (self.validValidator[temp3] == true){
                    reselectNewValidators();
                    self.missedCalls[temp3]++;
                    self.validValidator[temp3] == false;
                }
           }

        //Once a validator submits data set their status back to false
        self.validValidator[msg.sender] == false;
    }

    function unlockDisputeFee(uint _disputeId) public {
        TellorStorage.Dispute storage disp = self.disputesById[_disputeId];
        require(now > disp.disputeUintVars[keccak256("DisputeLock")], "Time for voting haven't elapsed");
        if (disp.disputeVotePassed == true){
                TellorStorage.StakeInfo storage stakes = self.stakerDetails[disp.reportedMiner];
                //if reported miner stake has not been slashed yet, slash them and return the fee to reporting party
                if (stakes.currentStatus == 3) {
                    //Changing the currentStatus and startDate unstakes the reported miner and allows for the
                    //transfer of the stakeAmount
                    stakes.currentStatus = 0;
                    stakes.startDate = now - (now % 86400);
     
                    //Decreases the stakerCount since the miner's stake is being slashed
                    self.uintVars[keccak256("stakerCount")]--;
                    updateDisputeFee(_disputeId);
     
                    //Transfers the StakeAmount from the reporded miner to the reporting party
                    doTransfer(disp.reportedMiner, disp.reportingParty, self.uintVars[keccak256("stakeAmount")]);
     
                    //Returns the dispute fee to the reportingParty
                    doTransfer(address(this), disp.reportingParty, disp.disputeUintVars[keccak256("fee")]);
                    
                //if reported miner stake was already slashed, return the fee to other reporting paties
                } else{
                    doTransfer(address(this), disp.reportingParty, disp.disputeUintVars[keccak256("fee")]);
                }
            }
    }
    /**
    * @dev Allows the current owner to propose transfer control of the contract to a
    * newOwner and the ownership is pending until the new owner calls the claimOwnership
    * function
    * @param _pendingOwner The address to transfer ownership to.
    */
    function proposeOwnership(address payable _pendingOwner) external {
        require(msg.sender == self.addressVars[keccak256("_owner")], "Sender is not owner");
        emit OwnershipProposed(self.addressVars[keccak256("_owner")], _pendingOwner);
        self.addressVars[keccak256("pending_owner")] = _pendingOwner;
    }

    /**
    * @dev Allows the new owner to claim control of the contract
    */
    function claimOwnership() external {
        require(msg.sender == self.addressVars[keccak256("pending_owner")], "Sender is not pending owner");
        emit OwnershipTransferred(self.addressVars[keccak256("_owner")], self.addressVars[keccak256("pending_owner")]);
        self.addressVars[keccak256("_owner")] = self.addressVars[keccak256("pending_owner")];
    }

    /**
    * @dev This function allows miners to deposit their stake.
    */
    function depositStake(uint _amount) external {
        require(balanceOf(msg.sender) >= _amount + self.stakerDetails[msg.sender].amountStaked , "Balance is lower than stake amount");
        //Ensure they can only stake if they are not currrently staked or if their stake time frame has ended
        //and they are currently locked for witdhraw
        require(self.stakerDetails[msg.sender].currentStatus != 3, "Miner is in the wrong state");
        if(self.stakerDetails[msg.sender].amountStaked == 0){
            self.uintVars[keccak256("stakerCount")] += 1;
        }
        uint minimumStake = self.uintVars[keccak256("minimumStake")];
        require(_amount > minimumStake, "You must stake a certain amount");
        require(_amount % minimumStake == 0, "Must be divisible by minimumStake");
        for(uint i=0; i <= _amount / minimumStake; i++){
            self.stakerDetails[msg.sender].stakePosition.push(self.stakers.length);
            self.stakerDetails[msg.sender].stakePositionArrayIndex[self.stakers.length] = i;
            self.stakers.push(msg.sender);
        }
        self.stakerDetails[msg.sender].currentStatus = 1;
        self.stakerDetails[msg.sender].startDate = now - (now % 86400);
        self.stakerDetails[msg.sender].amountStaked += _amount;

        //self.uniqueStakers += 1;
        self.uintVars[keccak256("uniqueStakers")] += 1;
        //self.totalStaked += _amount;
        self.uintVars[keccak256("totalStaked")]  += _amount;
        emit NewStake(msg.sender);
    }

    /**
    * @dev This function allows stakers to request to withdraw their stake (no longer stake)
    * once they lock for withdraw(stakes.currentStatus = 2) they are locked for 7 days before they
    * can withdraw the stake
    */
    function requestStakingWithdraw(uint _amount) external {
                TellorStorage.StakeInfo storage stakes = self.stakerDetails[msg.sender];
        uint minimumStake = self.uintVars[keccak256("minimumStake")];
        //Require that the miner is staked
        require(stakes.currentStatus == 1, "Miner is not staked");
        require(_amount % minimumStake == 0, "Must be divisible by minimumStake");
        require(_amount < stakes.amountStaked);
        
        
        for(uint i=0; i <= _amount / minimumStake; i++) {
            removeFromStakerArray(stakes.stakePosition[i],msg.sender);
        }

       //Change the miner staked to locked to be withdrawStake
        if (stakes.amountStaked == 0){
            stakes.currentStatus = 2;
            self.uintVars[keccak256("stakerCount")] -= 1;
        }

        stakes.withdrawDate = now - (now % 86400);
        stakes.withdrawAmount = _amount;
        emit StakeWithdrawRequested(msg.sender);
    }

    /**
    * @dev This function allows users to withdraw their stake after a 7 day waiting period from request
    */
    function withdrawStake() external {
               TellorStorage.StakeInfo storage stakes = self.stakerDetails[msg.sender];
        //Require the staker has locked for withdraw(currentStatus ==2) and that 7 days have
        //passed by since they locked for withdraw
        require(now - (now % 86400) - stakes.withdrawDate >= 7 days, "7 days didn't pass");
        require(stakes.currentStatus !=3 , "Miner was not locked for withdrawal");
        stakes.amountStaked -= stakes.withdrawAmount;
        if (stakes.amountStaked == 0){
            stakes.currentStatus =0 ;
            self.uintVars[keccak256("stakerCount")] -= 1;
            self.uintVars[keccak256("uniqueStakers")] -= 1;
        }
        //totalStaked -= _amount;?????????????????????? see line below, is that what you meant?
        self.uintVars[keccak256("totalStaked")] -= stakes.amountStaked;
        emit StakeWithdrawn(msg.sender);
    }

    /**
    * @dev This function approves a _spender an _amount of tokens to use
    * @param _spender address
    * @param _amount amount the spender is being approved for
    * @return true if spender appproved successfully
    */
    function approve(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Spender is 0-address");
        self.allowed[msg.sender][_spender] = _amount;
        emit Approval(msg.sender, _spender, _amount);
        return true;
    }

    /**
    * @dev Allows for a transfer of tokens to _to
    * @param _to The address to send tokens to
    * @param _amount The amount of tokens to send
    * @return true if transfer is successful
    */
    function transfer(address _to, uint256 _amount) external returns (bool) {
        doTransfer(msg.sender, _to, _amount);
        return true;
    }

    /**
    * @dev Sends _amount tokens to _to from _from on the condition it
    * is approved by _from
    * @param _from The address holding the tokens being transferred
    * @param _to The address of the recipient
    * @param _amount The amount of tokens to be transferred
    * @return True if the transfer was successful
    */
    function transferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(self.allowed[_from][msg.sender] >= _amount, "Allowance is wrong");
        self.allowed[_from][msg.sender] -= _amount;
        doTransfer(_from, _to, _amount);
        return true;
    }

    /**
    * @dev Allows users to access the token's name
    */
    function name() external pure returns (string memory) {
        return "Tellor Tributes";
    }

    /**
    * @dev Allows users to access the token's symbol
    */
    function symbol() external pure returns (string memory) {
        return "TRB";
    }

    /**
    * @dev Allows users to access the number of decimals
    */
    function decimals() external pure returns (uint8) {
        return 18;
    }

        /**
    * @dev This function updates APIonQ and the requestQ when requestData or addTip are ran
    * @param _requestId being requested
    * @param _tip is the tip to add
    */
    function updateOnDeck(uint256 _requestId, uint256 _tip) internal {
        TellorStorage.Request storage _request = self.requestDetails[_requestId];
        uint256 onDeckRequestId = getTopRequestID();
        //If the tip >0 update the tip for the requestId
        if (_tip > 0) {
            _request.apiUintVars[keccak256("totalTip")] = _request.apiUintVars[keccak256("totalTip")].add(_tip);
        }
        //Set _payout for the submitted request
        uint256 _payout = _request.apiUintVars[keccak256("totalTip")];

        //If there is no current request being mined
        //then set the currentRequestId to the requestid of the requestData or addtip requestId submitted,
        // the totalTips to the payout/tip submitted, and issue a new mining challenge
        if (self.uintVars[keccak256("currentRequestId")] == 0) {
            _request.apiUintVars[keccak256("totalTip")] = 0;
            self.uintVars[keccak256("currentRequestId")] = _requestId;
            self.uintVars[keccak256("currentTotalTips")] = _payout;
            self.currentChallenge = keccak256(abi.encodePacked(_payout, self.currentChallenge, blockhash(block.number - 1))); // Save hash for next proof
            emit NewChallenge(
                self.currentChallenge,
                self.uintVars[keccak256("currentRequestId")],
                self.uintVars[keccak256("difficulty")],
                self.requestDetails[self.uintVars[keccak256("currentRequestId")]].apiUintVars[keccak256("granularity")],
                self.requestDetails[self.uintVars[keccak256("currentRequestId")]].queryString,
                self.uintVars[keccak256("currentTotalTips")]
            );
        } else {
            //If there is no OnDeckRequestId
            //then replace/add the requestId to be the OnDeckRequestId, queryHash and OnDeckTotalTips(current highest payout, aside from what
            //is being currently mined)
            if (_payout > self.requestDetails[onDeckRequestId].apiUintVars[keccak256("totalTip")] || (onDeckRequestId == 0)) {
                //let everyone know the next on queue has been replaced
                emit NewRequestOnDeck(_requestId, _request.queryString, _request.queryHash, _payout);
            }

            //if the request is not part of the requestQ[51] array
            //then add to the requestQ[51] only if the _payout/tip is greater than the minimum(tip) in the requestQ[51] array
            if (_request.apiUintVars[keccak256("requestQPosition")] == 0) {
                uint256 _min;
                uint256 _index;
                (_min, _index) = Utilities.getMin(self.requestQ);
                //we have to zero out the oldOne
                //if the _payout is greater than the current minimum payout in the requestQ[51] or if the minimum is zero
                //then add it to the requestQ array aand map its index information to the requestId and the apiUintvars
                if (_payout > _min || _min == 0) {
                    self.requestQ[_index] = _payout;
                    self.requestDetails[self.requestIdByRequestQIndex[_index]].apiUintVars[keccak256("requestQPosition")] = 0;
                    self.requestIdByRequestQIndex[_index] = _requestId;
                    _request.apiUintVars[keccak256("requestQPosition")] = _index;
                }
                // else if the requestid is part of the requestQ[51] then update the tip for it
            } else if (_tip > 0) {
                self.requestQ[_request.apiUintVars[keccak256("requestQPosition")]] += _tip;
            }
        }
    }
    

        /**
    * @dev Reselects validators if any of the first five fail to submit data
    */
    function reselectNewValidators() public{
        require( self.uintVars[keccak256("lastSelection")] < now - 30, "has not been long enough reselect");
        selectNewValidators(false);
    }

        /**
    * @dev Generates a random number to select validators
    */
    function randomnumber(uint _max, uint _nonce) internal view returns (uint){
        return  uint(keccak256(abi.encodePacked(_nonce,now,self.uintVars[keccak256("totalTip")],msg.sender,block.difficulty,self.stakers.length))) % _max +1;
    }


    /**
    * @dev Selects validators
    * @param _reset true if validators need to be selected
    */
    function selectNewValidators(bool _reset) internal{
        // if(_reset):
        //     selectedValidators.length = 0
        require(_reset==true);
        self.selectedValidators.length = 0;
        uint j=0;
        uint i=0;
        address potentialValidator;
        while(j < 5){
            potentialValidator = self.stakers[randomnumber(self.stakers.length,i)];
            for(uint k=0;k<self.selectedValidators.length;k++){
                if(potentialValidator != self.selectedValidators[k]){
                    self.selectedValidators.push(potentialValidator);
                    emit NewValidatorsSelected(potentialValidator);
                    self.validValidator[potentialValidator] = true;//used to check if they are a selectedvalidator (better than looping through array)
                    j++;
               }
            }
        }
        self.uintVars[keccak256("lastSelected")] = now;
    }


    /**
    * @dev this function allows the dispute fee to fluctuate based on the number of miners on the system.
    * The floor for the fee is 15e18.
    */
    function updateDisputeFee(uint disputeId) public {
        self.disputesById[disputeId].disputeUintVars[keccak256("DisputeRound")]++;
        //if the number of staked miners divided by the target count of staked miners is less than 1
        if ((self.uintVars[keccak256("stakerCount")] * 1000) / self.uintVars[keccak256("targetMiners")] < 1000) {
            //Set the dispute fee at stakeAmt * (1- stakerCount/targetMiners)
            //or at the its minimum of 15e18
            self.uintVars[keccak256("disputeFee")] = SafeMath.max(
                15e18,
                self.uintVars[keccak256("stakeAmount")].mul(
                    1000 - (self.uintVars[keccak256("stakerCount")] * 1000) / self.uintVars[keccak256("targetMiners")]
                ) /
                    1000
            );
        } else {
            //otherwise set the dispute fee at 15e18 (the floor/minimum fee allowed)
            self.uintVars[keccak256("disputeFee")] = 15e18;
        }

        if (self.disputesById[disputeId].disputeUintVars[keccak256("DisputeRound")]  == 0 ) {
            self.disputesById[disputeId].disputeUintVars[keccak256("fee")] = self.uintVars[keccak256("disputeFee")];
        
        } else {
           self.disputesById[disputeId].disputeUintVars[keccak256("fee")] * self.disputesById[disputeId].disputeUintVars[keccak256("DisputeRound")] * 2;
        }

TellorStorage.Dispute storage disp = self.disputesById[disputeId];
//If the vote is not a proposed fork
        if (disp.isPropFork == false) {
        self.disputesById[disputeId].disputeUintVars[keccak256("DisputeLock")] == now + 1 days;
        }else {
        self.disputesById[disputeId].disputeUintVars[keccak256("DisputeLock")] == now + 7 days;
        }
        
    }


    function removeFromStakerArray(uint _pos, address _staker) internal{
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

        /**
    * @dev Completes POWO transfers by updating the balances on the current block number
    * @param _from address to transfer from
    * @param _to addres to transfer to
    * @param _amount to transfer
    */
    function doTransfer(address _from, address _to, uint256 _amount) internal {
        require(_amount > 0, "Tried to send non-positive amount");
        require(_to != address(0), "Receiver is 0 address");
        //allowedToTrade checks the stakeAmount is removed from balance if the _user is staked
        require(allowedToTrade( _from, _amount), "Stake amount was not removed from balance");
        uint256 previousBalance = balanceOfAt(_from, block.number);
        updateBalanceAtNow(_from, previousBalance - _amount);
        previousBalance = balanceOfAt(_to, block.number);
        require(previousBalance + _amount >= previousBalance, "Overflow happened"); // Check for overflow
        updateBalanceAtNow(_to, previousBalance + _amount);
        emit Transfer(_from, _to, _amount);
    }

        /**
    * @dev Updates balance for from and to on the current block number via doTransfer
    * @param _party gets the mapping for the balances[owner]
    * @param _value is the new balance
    */
    function updateBalanceAtNow(address _party, uint256 _value) internal {
        TellorStorage.Checkpoint[] storage checkpoints = self.balances[_party];
        if ((checkpoints.length == 0) || (checkpoints[checkpoints.length - 1].fromBlock < block.number)) {
            TellorStorage.Checkpoint storage newCheckPoint = checkpoints[checkpoints.length++];
            newCheckPoint.fromBlock = uint128(block.number);
            newCheckPoint.value = uint128(_value);
        } else {
            TellorStorage.Checkpoint storage oldCheckPoint = checkpoints[checkpoints.length - 1];
            oldCheckPoint.value = uint128(_value);
        }
    }
}
