pragma solidity 0.5.17;

import "../XCLCrowdsale.sol";


contract CrowdsaleTest is XCLCrowdsale {

    constructor(
        uint256 _startTime,
        uint256 _endTime,
        address _management
    ) public XCLCrowdsale(
        _startTime,
        _endTime,
        _management
    ) {

    }

    function updateStartDate(uint256 _startDate) public {
        startDate = _startDate;
    }

    function setFinalized(bool _value) public {
        finalized = _value;
    }

    function internalContributionTest(
        address payable _contributor, uint256 _wei
    )
        public
        payable
    {
        internalContribution(_contributor, _wei);
    }
}