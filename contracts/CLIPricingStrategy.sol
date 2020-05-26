pragma solidity 0.5.17;

import "./pricing/PricingStrategyImpl.sol";


contract CLIPricingStrategy is PricingStrategyImpl {

    constructor(
        address _management,
        uint256 _etherPriceInCurrency,
        uint256[] memory _tiers
    ) public PricingStrategyImpl(
        _management,
        true,
        true,
        _tiers,
        _etherPriceInCurrency,
        5,  // main currency decimals - 1$ = 100000
        18, // token decimals
        100 // absolute percent amount  - 100%
    ) {
    }

}