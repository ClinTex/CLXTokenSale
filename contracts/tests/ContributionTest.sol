pragma solidity 0.5.17;

import "../CLXContribution.sol";


contract ContributionTest is CLXContribution {

    constructor(
        address payable _receiver,
        address _management
    )
        public
        CLXContribution(_receiver, _management)
    {}

    function testUpdateDate(uint256 _id, uint256 _time) public {
        contributions[_id].timestamp = _time;
    }

}

