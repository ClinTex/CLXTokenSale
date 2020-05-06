pragma solidity 0.5.17;

import "../pricing/ExchangeContract.sol";


contract ExchangeContractTest is ExchangeContract {

    constructor(
        address _management,
        uint256 _etherPriceInCurrency,
        uint256 _currencyDecimals
    )
    public
    ExchangeContract(
        _management,
        _etherPriceInCurrency,
        _currencyDecimals
    )
    {

    }

    function parseIntTest(
        string memory _a,
        uint _b
    )
    public
    pure
    returns (uint)
    {
        return parseInt(_a, _b);
    }
}