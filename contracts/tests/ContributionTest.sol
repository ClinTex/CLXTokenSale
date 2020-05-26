pragma solidity 0.5.17;

import "../CLIContribution.sol";


contract ContributionTest is CLIContribution {

    constructor(
        address payable _receiver,
        address _management
    )
        public
        CLIContribution(_receiver, _management)
    {}

    function testUpdateDate(uint256 _id, uint256 _time) public {
        contributions[_id].timestamp = _time;
    }

}

