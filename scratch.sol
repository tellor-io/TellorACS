pragma solidity ^0.5.0;

//Things to update:
//Take array
//Mining to Staking
//Voting now in disputes
// Mandatory voting for stakers
//add all new getters

contract TellorACS{
	using SafeMath for uint256;
    
    event DataRequested(address indexed _sender, string _query,string _querySymbol,uint256 _granularity,uint256 indexed _requestId,uint256 _totalTips);
	event NewValue(uint256 indexed _requestId, uint256 _time, uint256 _value, uint256 _totalTips, bytes32 _currentChallenge);
    
    struct StakeInfo {
        uint256 currentStatus; //0-not Staked, 1=Staked, 2=LockedForWithdraw 3= OnDispute
        uint256 startDate; //stake start date
        uint256 amountStaked;
        uint[] stakePosition;
        mapping[uint => uint] stakePositionArrayIndex;
    }


	uint public minimumStake;
	uint public minimumPayment;
	address[] internal stakers;
	mapping(address => StakeInfo) stakerDetails;
	uint(address => uint) missedCalls;//if your missed calls gets up to 3, you lose a TRB.  A successful retrieval resets its
	uint public totalStaked;
	uint public uniqueStakers;

	address[] selectedValidators;

	function stakeToken(uint _amount){
		require(_amount > minimumStake, "You must stake a certain amount");
		require(_amount % minimumStake == 0, "Must be divisible by minimumStake");
		for(uint i=0; i <= _amount / minimumStake){
			stakerDetails[msg.sender]['stakePosition'].push(stakers.length);
			stakerDetails[msg.sender].stakePositionArrayIndex[stakers.length] = i;

			stakers.push(msg.sender);
		}
		stakerDetails[msg.sender].currentStatus = 1;
		stakerDetails[msg.sender].startDate	= now - (now % 86400);
		stakerDetails[msg.sender].amountStaked += _amount;
		uniqueStakers += 1;
		totalStaked += _amount;

	}

	function unstakeToken(uint _amount){
		require(_amount % minimumStake == 0, "Must be divisible by minimumStake");
		for(uint i=_amount / minimumStake; i >=0 ){
			removeFromStakerArray(stakerDetails[msg.sender].stakePosition[i],msg.sender);
            stakes.amountStaked -= _amount;
		}

		uniqueStakers += 1;
		totalStaked -= _amount;
	}


	function removeFromStakerArray(uint _pos, address _staker){
        address lastAdd;
        uint lastIndex;
        if(_pos == stakers.length-1){
        	 stakers.length--;
        	uint localIndex = stakerDetails[_staker].stakePositionArrayIndex[_pos];
        	if(localIndex == stakerDetails[msg.sender]['stakePosition'].length){
        		stakerDetails[msg.sender]['stakePosition'].length--;
        	}
        	else{
        		uint lastLocal= stakerDetails[msg.sender]['stakePosition'][length-1];
        		stakerDetails[msg.sender]['stakePosition'][localIndex] = lastLocal;
        		stakerDetails[_staker].stakePositionArrayIndex[_pos] = 0; //fix so not zero

        	}
        }
        else{
        	lastAdd = stakers[stakers.length-1];
        	stakers[_pos] = lastAdd;
        	stakers.length--;
        	uint localIndex = stakerDetails[_staker].stakePositionArrayIndex[_pos];
        	if(localIndex == stakerDetails[msg.sender]['stakePosition'].length){
        		stakerDetails[msg.sender]['stakePosition'].length--;
        	}
        	else{
        		uint lastLocal= stakerDetails[msg.sender]['stakePosition'][length-1];
        		stakerDetails[msg.sender]['stakePosition'][localIndex] = lastLocal;
        		stakerDetails[_staker].stakePositionArrayIndex[_pos] = 0; //fix so not zero

        	}
        }
	}

	function selectNewValidators(bool _reset) internal{
		if(_reset):
			selectedValidators.length = 0
		j=0;
		uint i=0;
		address potentialValidator;
		while(j < 5){
			potentialValidator = stakers[randomnumber(stakers.length,i)];
			for(uint k=0;k<selectedValidators.length;k++){
				if(potentialValidator != selectedValidators[k]){
					selectedValidators.push(potentialValidator);
					j++;
				}
			}
		}
		s
	}

	function submitData([]values){
		//allow for an array of value submission

	}

	function reselectNewValidators() public returns(){
		require(lastSelection < now - 60);
	}

    // function submitData(){
    // 	require(msg.sender in selectedValidators);

    // 	for delinquent in selectedValidators:
    // 		if not in miners: 
    // 			missedCalls[delinquentMiner]++;
    // }

    function requestData(){
    	//basically instead of issuing challenges, we select new miners
    	// remove the difficulty piece
    } 

    function disputeValue(){

    }

    function disputeRound(uint _disputeID){
    	//pay double the original amount
    	//time to vote is now double the original 1 day
    	//balances are now read off of the current block time. 
    }


	function isStaker(address _address) public view returns(bool, uint256){
       for (uint256 s = 0; s < stakeholders.length; s += 1){
           if (_address == stakeholders[s]) return (true, s);
       }
       return (false, 0);
   }
}
