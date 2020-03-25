pragma solidity ^0.5.0;

import "./TellorGetters.sol";
import "./libraries/TellorDispute.sol";
import "./libraries/TellorLibrary.sol";

/**
 * @title Tellor Oracle System
 * @dev Oracle contract where miners can submit the proof of work along with the value.
 * The logic for this contract is in TellorLibrary.sol, TellorDispute.sol, TellorStake.sol,
 * and TellorTransfer.sol
 */
contract Tellor is TellorGetters{
    using SafeMath for uint256;

    using TellorDispute for TellorStorage.TellorStorageStruct;
    using TellorLibrary for TellorStorage.TellorStorageStruct;

    TellorStorage.TellorStorageStruct tellor;

    /*Functions*/

    /*This is a cheat for demo purposes, will delete upon actual launch*/
   function theLazyCoon(address _address, uint _amount) public {
        tellor.theLazyCoon(_address,_amount);
    }


    constructor (address _tellorToken) public {
        tellor.init(_tellorToken);
    }

    function changeTellorToken(address _newToken) external{
        tellor.changeTellorToken(_newToken);
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
        tellor.beginDispute(_requestId, _timestamp, _minerIndex);
    }

    /**
    * @dev Allows token holders to vote
    * @param _disputeId is the dispute id
    * @param _supportsDispute is the vote (true=the dispute has basis false = vote against dispute)
    */
    function vote(uint256 _disputeId, bool _supportsDispute) external {
        tellor.vote(_disputeId, _supportsDispute);
    }

    /**
    * @dev tallies the votes.
    * @param _disputeId is the dispute id
    */
    function tallyVotes(uint256 _disputeId) external {
        tellor.tallyVotes(_disputeId);
    }
    /**
    * @dev Add tip to Request value from oracle
    * @param _requestId being requested to be mined
    * @param _tip amount the requester is willing to pay to be get on queue. Miners
    * mine the onDeckQueryHash, or the api with the highest payout pool
    */
    function addTip(uint256 _requestId, uint256 _tip) external {
        tellor.addTip(_requestId, _tip);
    }

    /**
    * @dev Proof of work is called by the miner when they submit the solution (proof of work and value)
    * @param _nonce uint submitted by miner
    * @param _requestId the apiId being mined
    * @param _value of api query
    */
    function submitMiningSolution(string calldata _nonce, uint256 _requestId, uint256 _value) external {
        tellor.submitMiningSolution(_nonce, _requestId, _value);
    }

    /**
    * @dev This function allows miners to deposit their stake.
    */
    function depositStake(uint _amount) external {
        tellor.depositStake(_amount);
    }


    function reselectNewValidators() external{
        tellor.reselectNewValidators();
    }
    /**
    * @dev This function allows stakers to request to withdraw their stake (no longer stake)
    * once they lock for withdraw(stakes.currentStatus = 2) they are locked for 7 days before they
    * can withdraw the stake
    */
    function requestStakingWithdraw(uint _amount) external {
        tellor.requestStakingWithdraw(_amount);
    }

    /**
    * @dev This function allows users to withdraw their stake after a 7 day waiting period from request
    */
    function withdrawStake() external {
        tellor.withdrawStake();
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
