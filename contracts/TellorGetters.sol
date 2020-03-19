pragma solidity ^0.5.0;

import "./libraries/SafeMath.sol";
import "./libraries/TellorStorage.sol";
import "./libraries/Utilities.sol";
/**
* @title Tellor Getters
* @dev Oracle contract with all tellor getter functions. The logic for the functions on this contract
* is saved on the TellorGettersLibrary, TellorTransfer, TellorGettersLibrary, and TellorStake
*/
contract TellorGetters {
    using SafeMath for uint256;

    TellorStorage.TellorStorageStruct self;

    /**
    * @param _user address
    * @param _spender address
    * @return Returns the remaining allowance of tokens granted to the _spender from the _user
    */
    function allowance(address _user, address _spender) external view returns (uint256) {
        return self.allowed[_user][_spender];
    }

    /**
    * @dev This function returns whether or not a given user is allowed to trade a given amount
    * @param _user address
    * @param _amount uint of amount
    * @return true if the user is alloed to trade the amount specified
    */
    function allowedToTrade(address _user, uint256 _amount) public view returns (bool) {
                if (self.stakerDetails[_user].currentStatus > 0) {
            //Removes the stakeAmount from balance if the _user is staked
            if (balanceOf(_user).sub(self.uintVars[keccak256("stakeAmount")]).sub(_amount) >= 0) {
                return true;
            }
        } else if (balanceOf(_user).sub(_amount) >= 0) {
            return true;
        }
        return false;
    }

    /**
    * @dev Gets balance of owner specified
    * @param _user is the owner address used to look up the balance
    * @return Returns the balance associated with the passed in _user
    */
    function balanceOf(address _user) public view returns (uint256) {
        return balanceOfAt(_user, block.number);
    }

    /**
    * @dev Queries the balance of _user at a specific _blockNumber
    * @param _user The address from which the balance will be retrieved
    * @param _blockNumber The block number when the balance is queried
    * @return The balance at _blockNumber
    */
    function balanceOfAt(address _user, uint256 _blockNumber) public view returns (uint256) {
                if ((self.balances[_user].length == 0) || (self.balances[_user][0].fromBlock > _blockNumber)) {
            return 0;
        } else {
            return getBalanceAt(_user, _blockNumber);
        }
    }


    /**
    * @dev Getter for balance for owner on the specified _block number
    * @param _party gets the mapping for the balances[owner]
    * @param _block is the block number to search the balance on
    * @return the balance at the checkpoint
    */
    function getBalanceAt(address _party, uint256 _block) public view returns (uint256) {
        TellorStorage.Checkpoint[] storage checkpoints = self.balances[_party];
        if (checkpoints.length == 0) return 0;
        if (_block >= checkpoints[checkpoints.length - 1].fromBlock) return checkpoints[checkpoints.length - 1].value;
        if (_block < checkpoints[0].fromBlock) return 0;
        // Binary search of the value in the array
        uint256 min = 0;
        uint256 max = checkpoints.length - 1;
        while (max > min) {
            uint256 mid = (max + min + 1) / 2;
            if (checkpoints[mid].fromBlock <= _block) {
                min = mid;
            } else {
                max = mid - 1;
            }
        }
        return checkpoints[min].value;
    }
    /**
    * @dev This function tells you if a given challenge has been completed by a given miner
    * @param _challenge the challenge to search for
    * @param _miner address that you want to know if they solved the challenge
    * @return true if the _miner address provided solved the
    */
    function didMine(bytes32 _challenge, address _miner) external view returns (bool) {
        return self.minersByChallenge[_challenge][_miner];
    }

    /**
    * @dev Checks if an address voted in a given dispute
    * @param _disputeId to look up
    * @param _address to look up
    * @return bool of whether or not party voted
    */
    function didVote(uint256 _disputeId, address _address) external view returns (bool) {
        return self.disputesById[_disputeId].voted[_address];
    }

    /**
    * @dev allows Tellor to read data from the addressVars mapping
    * @param _data is the keccak256("variable_name") of the variable that is being accessed.
    * These are examples of how the variables are saved within other functions:
    * addressVars[keccak256("_owner")]
    * addressVars[keccak256("tellorContract")]
    */
    function getAddressVars(bytes32 _data) external view returns (address) {
                return self.addressVars[_data];
    }

    /**
    * @dev Gets all dispute variables
    * @param _disputeId to look up
    * @return bytes32 hash of dispute
    * @return bool executed where true if it has been voted on
    * @return bool disputeVotePassed
    * @return bool isPropFork true if the dispute is a proposed fork
    * @return address of reportedMiner
    * @return address of reportingParty
    * @return address of proposedForkAddress
    * @return uint of requestId
    * @return uint of timestamp
    * @return uint of value
    * @return uint of minExecutionDate
    * @return uint of numberOfVotes
    * @return uint of blocknumber
    * @return uint of minerSlot
    * @return uint of quorum
    * @return uint of fee
    * @return int count of the current tally
    */
    function getAllDisputeVars(uint256 _disputeId)
        public
        view
        returns (bytes32, bool, bool, bool, address, address, address, uint256[9] memory, int256)
    {
        TellorStorage.Dispute storage disp = self.disputesById[_disputeId];
        return (
            disp.hash,
            disp.executed,
            disp.disputeVotePassed,
            disp.isPropFork,
            disp.reportedMiner,
            disp.reportingParty,
            disp.proposedForkAddress,
            [
                disp.disputeUintVars[keccak256("requestId")],
                disp.disputeUintVars[keccak256("timestamp")],
                disp.disputeUintVars[keccak256("value")],
                disp.disputeUintVars[keccak256("minExecutionDate")],
                disp.disputeUintVars[keccak256("numberOfVotes")],
                disp.disputeUintVars[keccak256("blockNumber")],
                disp.disputeUintVars[keccak256("minerSlot")],
                disp.disputeUintVars[keccak256("quorum")],
                disp.disputeUintVars[keccak256("fee")]
            ],
            disp.tally
        );
    }

    /**
    * @dev Getter function for variables for the requestId being currently mined(currentRequestId)
    * @return current challenge, curretnRequestId, level of difficulty, api/query string, and granularity(number of decimals requested), total tip for the request
    */
    function getCurrentVariables() external view returns (bytes32, uint256, uint256, uint256) {
               return (
            self.currentChallenge,
            self.uintVars[keccak256("currentRequestId")],
            self.uintVars[keccak256("difficulty")],
            self.requestDetails[self.uintVars[keccak256("currentRequestId")]].apiUintVars[keccak256("totalTip")]
        );
    }

    /**
    * @dev Checks if a given hash of miner,requestId has been disputed
    * @param _hash is the sha256(abi.encodePacked(_miners[2],_requestId));
    * @return uint disputeId
    */
    function getDisputeIdByDisputeHash(bytes32 _hash) external view returns (uint256) {
        return self.disputeIdByDisputeHash[_hash];
    }

    /**
    * @dev Checks for uint variables in the disputeUintVars mapping based on the disuputeId
    * @param _disputeId is the dispute id;
    * @param _data the variable to pull from the mapping. _data = keccak256("variable_name") where variable_name is
    * the variables/strings used to save the data in the mapping. The variables names are
    * commented out under the disputeUintVars under the Dispute struct
    * @return uint value for the bytes32 data submitted
    */
    function getDisputeUintVars(uint256 _disputeId, bytes32 _data) external view returns (uint256) {
        return self.disputesById[_disputeId].disputeUintVars[_data];
    }

    /**
    * @dev Gets the a value for the latest timestamp available
    * @param _requestId being requested
    * @return value for timestamp of last proof of work submited and if true if it exist or 0 and false if it doesn't
    */
    function getLastNewValueById(uint256 _requestId) external view returns (uint256, bool) {
        TellorStorage.Request storage _request = self.requestDetails[_requestId];
        if (_request.requestTimestamps.length > 0) {
            return (retrieveData(_requestId, _request.requestTimestamps[_request.requestTimestamps.length - 1]), true);
        } else {
            return (0, false);
        }
    }

    /**
    * @dev Gets blocknumber for mined timestamp
    * @param _requestId to look up
    * @param _timestamp is the timestamp to look up blocknumber
    * @return uint of the blocknumber which the dispute was mined
    */
    function getMinedBlockNum(uint256 _requestId, uint256 _timestamp) external view returns (uint256) {
        return self.requestDetails[_requestId].minedBlockNum[_timestamp];
    }

    /**
    * @dev Gets the 5 miners who mined the value for the specified requestId/_timestamp
    * @param _requestId to look up
    * @param _timestamp is the timestamp to look up miners for
    * @return the 5 miners' addresses
    */
    function getMinersByRequestIdAndTimestamp(uint256 _requestId, uint256 _timestamp) external view returns (address[5] memory) {
        return self.requestDetails[_requestId].minersByValue[_timestamp];
    }


    /**
    * @dev Counts the number of values that have been submited for the request
    * if called for the currentRequest being mined it can tell you how many miners have submitted a value for that
    * request so far
    * @param _requestId the requestId to look up
    * @return uint count of the number of values received for the requestId
    */
    function getNewValueCountbyRequestId(uint256 _requestId) external view returns (uint256) {
         return self.requestDetails[_requestId].requestTimestamps.length;
    }

    /**
    * @dev Getter function for the specified requestQ index
    * @param _index to look up in the requestQ array
    * @return uint of reqeuestId
    */
    function getRequestIdByRequestQIndex(uint256 _index) external view returns (uint256) {
        require(_index <= 50, "RequestQ index is above 50");
        return self.requestIdByRequestQIndex[_index];
    }

    /**
    * @dev Getter function for requestId based on timestamp
    * @param _timestamp to check requestId
    * @return uint of reqeuestId
    */
    function getRequestIdByTimestamp(uint256 _timestamp) external view returns (uint256) {
         return self.requestIdByTimestamp[_timestamp];
    }

    /**
    * @dev Getter function for the requestQ array
    * @return the requestQ arrray
    */
    function getRequestQ() public view returns (uint256[51] memory) {
        return self.requestQ;
    }

    /**
    * @dev Allowes access to the uint variables saved in the apiUintVars under the requestDetails struct
    * for the requestId specified
    * @param _requestId to look up
    * @param _data the variable to pull from the mapping. _data = keccak256("variable_name") where variable_name is
    * the variables/strings used to save the data in the mapping. The variables names are
    * commented out under the apiUintVars under the requestDetails struct
    * @return uint value of the apiUintVars specified in _data for the requestId specified
    */
    function getRequestUintVars(uint256 _requestId, bytes32 _data) external view returns (uint256) {
        return self.requestDetails[_requestId].apiUintVars[_data];
    }

    /**
    * @dev Gets the API struct variables that are not mappings
    * @param _requestId to look up
    * @return string of api to query
    * @return string of symbol of api to query
    * @return bytes32 hash of string
    * @return bytes32 of the granularity(decimal places) requested
    * @return uint of index in requestQ array
    * @return uint of current payout/tip for this requestId
    */
    function getRequestVars(uint256 _requestId) external view returns (uint256, uint256) {
        TellorStorage.Request storage _request = self.requestDetails[_requestId];
        return (
            _request.apiUintVars[keccak256("requestQPosition")],
            _request.apiUintVars[keccak256("totalTip")]
        );
    }

    /**
    * @dev This function allows users to retireve all information about a staker
    * @param _staker address of staker inquiring about
    * @return uint current state of staker
    * @return uint startDate of staking
    */
    function getStakerInfo(address _staker) external view returns (uint256, uint256) {
        return (self.stakerDetails[_staker].currentStatus, self.stakerDetails[_staker].startDate);
    }

    /**
    * @dev Gets the 5 miners who mined the value for the specified requestId/_timestamp
    * @param _requestId to look up
    * @param _timestamp is the timestampt to look up miners for
    * @return address[5] array of 5 addresses ofminers that mined the requestId
    */
    function getSubmissionsByTimestamp(uint256 _requestId, uint256 _timestamp) external view returns (uint256[5] memory) {
        return self.requestDetails[_requestId].valuesByTimestamp[_timestamp];
    }

    /**
    * @dev Gets the timestamp for the value based on their index
    * @param _requestID is the requestId to look up
    * @param _index is the value index to look up
    * @return uint timestamp
    */
    function getTimestampbyRequestIDandIndex(uint256 _requestID, uint256 _index) external view returns (uint256) {
        return self.requestDetails[_requestID].requestTimestamps[_index];
    }

    /**
    * @dev Getter for the variables saved under the TellorStorageStruct uintVars variable
    * @param _data the variable to pull from the mapping. _data = keccak256("variable_name") where variable_name is
    * the variables/strings used to save the data in the mapping. The variables names are
    * commented out under the uintVars under the TellorStorageStruct struct
    * This is an example of how data is saved into the mapping within other functions:
    * self.uintVars[keccak256("stakerCount")]
    * @return uint of specified variable
    */
    function getUintVar(bytes32 _data) public view returns (uint256) {
        return self.uintVars[_data];
    }

   /**
    * @dev Getter function for the request with highest payout. This function is used within the getVariablesOnDeck function
    * @return uint _requestId of request with highest payout at the time the function is called
    */
    function getTopRequestID() public view returns (uint256 _requestId) {
        uint256 _max;
        uint256 _index;
        (_max, _index) = Utilities.getMax(self.requestQ);
        _requestId = self.requestIdByRequestQIndex[_index];
    }

    /**
    * @dev Gets the 5 miners who mined the value for the specified requestId/_timestamp
    * @param _requestId to look up
    * @param _timestamp is the timestamp to look up miners for
    * @return bool true if requestId/timestamp is under dispute
    */
    function isInDispute(uint256 _requestId, uint256 _timestamp) external view returns (bool) {
        return self.requestDetails[_requestId].inDispute[_timestamp];
    }

    /**
    * @dev Retreive value from oracle based on timestamp
    * @param _requestId being requested
    * @param _timestamp to retreive data/value from
    * @return value for timestamp submitted
    */
    function retrieveData(uint256 _requestId, uint256 _timestamp) public view returns (uint256) {
        return self.requestDetails[_requestId].finalValues[_timestamp];
    }

    /**
    * @dev Getter for the total_supply of oracle tokens
    * @return uint total supply
    */
    function totalSupply() external view returns (uint256) {
        return self.uintVars[keccak256("total_supply")];
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

}
