pragma solidity 0.5.17;

import "../XCLContribution.sol";


contract ContributionTest is XCLContribution {

    constructor(
        address payable _receiver,
        address _management
    )
        public
        XCLContribution(_receiver, _management)
    {}

    function testUpdateDate(uint256 _id, uint256 _time) public {
        contributions[_id].timestamp = _time;
    }

}

