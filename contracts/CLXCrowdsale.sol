pragma solidity 0.5.17;

import "./crowdsale/CrowdsaleImpl.sol";
import "./CLXAllocator.sol";
import "./CLXPricingStrategy.sol";
import "./CLXContribution.sol";
import "./CLXReferral.sol";
import "./LockupContract.sol";


contract CLXCrowdsale is CrowdsaleImpl {

    uint256 public constant safeAgreementThreshold = 100000e5;
    uint256 public seedMaxSupply = 20000000e18;

    uint256 public collectedCurrency;

    mapping (address => uint256) public contributedByUser;
    mapping (address => bool) public userSafeAgreementExist;
    address[] public userSafeAgreementsList;

    event Contribution(
        uint256 _id,
        address _contributor,
        uint256 _currencyAmount,
        uint256 _tokensExcludingBonus,
        uint256 _bonus
    );

    constructor(
        uint256 _startTime,
        uint256 _endTime,
        address _management
    )
        public
        CrowdsaleImpl(
            _startTime,
            _endTime,
            true,
            true,
            false,
            _management
        )
    {}

    function updateState() public {
        (startDate, endDate) = CLXPricingStrategy(
            management.contractRegistry(CONTRACT_PRICING)
        ).getTierActualDates(tokensSold);

        super.updateState();
    }


    function discardUnsoldTokens() public {
        updateState();

        if (endDate < block.timestamp && false == finalized) {
            uint256 valueToSubtract = (seedMaxSupply.sub(tokensSold)).div(2);
            CLXAllocator allocatorContract = CLXAllocator(
                management.contractRegistry(CONTRACT_ALLOCATOR)
            );
            allocatorContract.decreaseCap(valueToSubtract);
            allocatorContract.increasePublicSaleCap(
                seedMaxSupply.sub(tokensSold).sub(valueToSubtract)
            );
            seedMaxSupply = tokensSold;
            finalized = true;
        }
    }

    function preValidatePurchase(
        address _beneficiary,
        uint256 _tokensAmount
    )
        internal
        view
    {
        super.preValidatePurchase(_beneficiary, _tokensAmount);
        require(
            tokensSold.add(_tokensAmount) <= seedMaxSupply,
            ERROR_WRONG_AMOUNT
        );
    }

    function onContribution(
        address payable _contributor,
        uint256 _currencyAmount,
        uint256 _tokens,
        uint256
    ) internal {
        tokensSold = tokensSold.add(_tokens);
        collectedCurrency = collectedCurrency.add(_currencyAmount);
        contributedByUser[_contributor] = contributedByUser[_contributor]
            .add(_currencyAmount);
        if (
            !userSafeAgreementExist[_contributor] &&
            _currencyAmount >= safeAgreementThreshold
        ) {
            userSafeAgreementExist[_contributor] = true;
            userSafeAgreementsList.push(_contributor);
        }

        uint256 referralTokens = CLXReferral(
            management.contractRegistry(CONTRACT_REFERRAL)
        ).allocate(_contributor, _tokens);

        lockPurchasedTokens(
            _contributor,
            _tokens
        );

        uint256 contributionId = CLXContribution(
            management.contractRegistry(CONTRACT_FORWARDER)
        ).recordContribution(
            _contributor,
            _currencyAmount,
            msg.value,
            _tokens,
            referralTokens
        );
        forwardFunds(_contributor);

        emit Contribution(
            contributionId,
            _contributor,
            _currencyAmount,
            _tokens,
            0
        );
    }

    function lockPurchasedTokens(
        address _contributor,
        uint256 _tokens
    )
    private
    {
        // unlock initial 25% tokens
        // lock 25% tokens for 6 months
        LockupContract(
            management.contractRegistry(CONTRACT_LOCKUP)
        ).allocationLog(
            _contributor,
            _tokens.div(2),
            0,
            SIX_MONTHS,
            50,
            SIX_MONTHS
        );

        // lock 25% tokens for 12 months
        // lock 25% tokens for 24 months
        LockupContract(
            management.contractRegistry(CONTRACT_LOCKUP)
        ).allocationLog(
            _contributor,
            _tokens.sub(_tokens.div(2)),
            0,
            uint256(24).mul(MONTH_IN_SECONDS),
            0,
            YEAR_IN_SECONDS
        );

    }
}