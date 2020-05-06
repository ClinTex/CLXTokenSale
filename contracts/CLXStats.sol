pragma solidity 0.5.17;

import "./managment/Managed.sol";
import "./allocator/TokenAllocator.sol";
import "./CLXPricingStrategy.sol";
import "./CLXCrowdsale.sol";
import "./CLXToken.sol";


contract CLXStats is Managed {

    uint256 public constant STATS_DATA_LENGTH = 8;
    uint256 public constant CURRENCY_CONTR_DATA_LENGTH = 3;
    uint256 public constant TIER_DATA_LENGTH = 13;

    constructor(address _management) public Managed(_management) {}

    function getTokens(
        uint256 _currencyAmount
    )
        public
        view
        returns (uint256 tokens, uint256 tokensExcludingBonus, uint256 bonus)
    {
        uint256 tokensSold = CLXCrowdsale(
            address(management.contractRegistry(CONTRACT_CROWDSALE))
        ).tokensSold();

        return CLXPricingStrategy(
            management.contractRegistry(CONTRACT_PRICING)
        ).getTokensWithoutRestrictions(_currencyAmount, tokensSold);
    }

    function getWeis(
        uint256 _tokenAmount
    )
        public
        view
        returns (uint256 totalWeiAmount, uint256)
    {
        uint256 tokensSold = CLXCrowdsale(
            management.contractRegistry(CONTRACT_CROWDSALE)
        ).tokensSold();

        return CLXPricingStrategy(
            management.contractRegistry(CONTRACT_PRICING)
        ).getWeis(0, tokensSold, _tokenAmount);
    }

    function getStats(
        uint256[7] memory _ethPerCurrency
    )
        public
        view
        returns (
            uint256[] memory stats,
            uint256[] memory tiersData,
            uint256[] memory currencyContr //tokensPerEachCurrency
        )
    {
        stats = getStatsData();
        tiersData = getTiersData();
        currencyContr = getCurrencyContrData(_ethPerCurrency, stats[3]);
    }

    function getTiersData()
        public
        view
        returns (uint256[] memory)
    {
        CLXPricingStrategy pricing = CLXPricingStrategy(
            management.contractRegistry(CONTRACT_PRICING)
        );

        uint256 tiersAmount = pricing.getTiersAmount();
        uint256 tierElements = pricing.TIER_ELEMENTS_AMOUNT();

        uint256[] memory tiers = pricing.getArrayOfTiers();
        uint256[] memory tiersData = new uint256[](
            tiersAmount.mul(TIER_DATA_LENGTH)
        );

        uint256 j = 0;
        for (uint256 i = 0; i < tiers.length; i += tierElements) {
            tiersData[j++] = tiers[i] > 0 ? uint256(1e23)
                .div(tiers[i]) : 0;// tokenInUSD;
            tiersData[j++] = 0;// tokenInWei;
            tiersData[j++] = uint256(tiers[i.add(1)]);// maxTokensCollected;
            tiersData[j++] = CLXCrowdsale(
                management.contractRegistry(CONTRACT_CROWDSALE)
            ).tokensSold();// soldTierTokens;
            tiersData[j++] = uint256(tiers[i.add(3)]);// discountPercents;
            tiersData[j++] = uint256(tiers[i.add(4)]);// bonusPercents;
            tiersData[j++] = uint256(tiers[i.add(5)]);// minInvestInCurrency;
            tiersData[j++] = 0;// minInvestInWei;
            tiersData[j++] = uint256(tiers[i.add(6)]);// maxInvestInCurrency;
            tiersData[j++] = 0;// maxInvestInWei;
            tiersData[j++] = uint256(tiers[i.add(7)]);// startDate;
            tiersData[j++] = uint256(tiers[i.add(8)]);// endDate;
            tiersData[j++] = uint256(1);// tierType;
        }

        return tiersData;
    }

    function getStatsData()
        public
        view
        returns (uint256[] memory)
    {
        TokenAllocator allocator = TokenAllocator(
            management.contractRegistry(CONTRACT_ALLOCATOR)
        );
        CLXCrowdsale crowdsale = CLXCrowdsale(
            management.contractRegistry(CONTRACT_CROWDSALE)
        );
        CLXPricingStrategy pricing = CLXPricingStrategy(
            management.contractRegistry(CONTRACT_PRICING)
        );

        uint256[] memory stats = new uint256[](STATS_DATA_LENGTH);
        stats[0] = allocator.maxSupply();
        stats[1] = CLXToken(
            management.contractRegistry(CONTRACT_TOKEN)
        ).totalSupply();
        stats[2] = allocator.tokensAvailable(stats[1]);
        stats[3] = crowdsale.tokensSold();
        stats[4] = uint256(crowdsale.currentState());
        stats[5] = pricing.getActualTierIndex(stats[3]);
        stats[6] = pricing.getTierUnsoldTokens(stats[5]);
        stats[7] = pricing.getMinEtherInvest(stats[5]);

        return stats;
    }

    function getCurrencyContrData(
        uint256[7] memory _ethPerCurrency,
        uint256 _tokensSold
    )
        public
        view
        returns (uint256[] memory)
    {
        uint256[] memory currencyContr = new uint256[](
            _ethPerCurrency.length.mul(CURRENCY_CONTR_DATA_LENGTH)
        );

        CLXPricingStrategy pricing = CLXPricingStrategy(
            management.contractRegistry(CONTRACT_PRICING)
        );

        uint256 j = 0;
        for (uint256 i = 0; i < _ethPerCurrency.length; i++) {
            (
                currencyContr[j++],
                currencyContr[j++],
                currencyContr[j++]
            ) = pricing.getTokensWithoutRestrictions(
                _ethPerCurrency[i], _tokensSold
            );
        }

        return currencyContr;
    }

}