pragma solidity 0.5.17;

import "./contribution/ContributionForwarder.sol";
import "./CLXToken.sol";


contract CLXContribution is ContributionForwarder {

    address payable public receiver;

    Contribution[] public contributions;

    struct Contribution {
        address payable contributor;
        uint256 weiAmount;
        uint256 currencyAmount;
        uint256 tokensAmount;
        uint256 timestamp;
        uint256 referralTokensSent;
    }

    constructor(
        address payable _receiver,
        address _management
    )
        public
        ContributionForwarder(_management)
    {
        receiver = _receiver;
    }

    function recordContribution(
        address payable _contributor,
        uint256 _currencyAmount,
        uint256 _etherAmount,
        uint256 _tokens,
        uint256 _referralTokens
    )
        external
        payable
        canCallOnlyRegisteredContract(CONTRACT_CROWDSALE)
        returns (uint256 id)
    {
        id = contributions.push(Contribution(
            _contributor,
            _etherAmount,
            _currencyAmount,
            _tokens,
            block.timestamp,
            _referralTokens
        )).sub(1);

    }

    function internalForward() internal {
        weiForwarded = weiForwarded.add(address(this).balance);
        receiver.transfer(address(this).balance);
    }

}

