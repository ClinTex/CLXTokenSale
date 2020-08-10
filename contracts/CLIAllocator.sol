pragma solidity 0.5.17;

import "./allocator/MintableTokenAllocator.sol";
import "./CLIToken.sol";
import "./LockupContract.sol";


contract CLIAllocator is MintableTokenAllocator {

    /* solium-disable */
    address public constant strategicPartners = 0xd5249aB86Ef7cE0651DF1b111E607f59950514c3;
    address public constant promotionsBounty = 0x38069DD2C6D385a7dE7dbB90eF74E23B12D124e3;
    address public constant shareholders = 0xA210F19b4C1c52dB213f88fdCA76fD83859052FA;
    address public constant advisors = 0x5d6019C130158FC00bc4Dc1edc949Fa84b8ad098;
    address public constant pharmaIndustrialTrials = 0x880574A5b701e017C254840063DFBd1f59dF9a15;
    address public constant managementTeam = 0x1e2Ce74Bc0a9A9fB2D6b3f630d585E0c00FF66B0;
    address public constant teamIncentive = 0xD4184B19170af014c595EF0b0321760d89918B95;
    address public constant publicSaleTokensHolder = 0x9ED362b5A8aF29CBC06548ba5C2f40978ca48Ec1;
    address public constant applicature = 0x63e638d15462037161003a6083A9c4AeD50f8F73;

    uint256 public constant strategicPartnersTokensAmount = 20000000e18;
    uint256 public constant promotionsBountyTokensAmount = 5200000e18;
    uint256 public constant shareholdersTokensAmount = 25000000e18;
    uint256 public constant advisorsTokensAmount = 8000000e18;
    uint256 public constant applicatureTokensAmount = 2000000e18;
    uint256 public constant pharmaIndustrialTrialsTokensAmount = 10000000e18;
    uint256 public constant managementTeamTokensAmount = 25000000e18;
    uint256 public constant teamIncentiveTokensAmount = 24000000e18;
    uint256 public constant publicSaleTokensAmount = 60000000e18;
    /* solium-enable */

    bool public isAllocated;

    constructor(uint256 _maxSupply, address _management)
        public
        MintableTokenAllocator(_maxSupply, _management)
    {

    }

    function increasePublicSaleCap(uint256 valueToAdd)
        external
        canCallOnlyRegisteredContract(CONTRACT_CROWDSALE)
    {
        internalAllocate(publicSaleTokensHolder, valueToAdd);
    }

    function unlockManuallyLockedBalances(address _holder)
        public
        requirePermission(CAN_LOCK_TOKENS)
    {
        LockupContract lockupContract = LockupContract(
            management.contractRegistry(CONTRACT_LOCKUP)
        );
        lockupContract.setManuallyLockedForAddress(
            _holder,
            0
        );
    }

    function allocateRequiredTokensToHolders() public {
        require(isAllocated == false, ERROR_NOT_AVAILABLE);
        isAllocated = true;
        allocateTokensWithSimpleLockUp();
        allocateTokensWithComplicatedLockup();
        allocateTokensWithManualUnlock();
        allocatePublicSale();
    }

    function allocatePublicSale() private {
        internalAllocate(publicSaleTokensHolder, publicSaleTokensAmount);
    }

    function allocateTokensWithSimpleLockUp() private {
        LockupContract lockupContract = LockupContract(
            management.contractRegistry(CONTRACT_LOCKUP)
        );
        internalAllocate(strategicPartners, strategicPartnersTokensAmount);

        internalAllocate(promotionsBounty, promotionsBountyTokensAmount);
        lockupContract.allocationLog(
            promotionsBounty,
            promotionsBountyTokensAmount,
            0,
            SIX_MONTHS,
            0,
            SIX_MONTHS
        );
        internalAllocate(advisors, advisorsTokensAmount);
        lockupContract.allocationLog(
            advisors,
            advisorsTokensAmount,
            0,
            SIX_MONTHS,
            0,
            SIX_MONTHS
        );
        internalAllocate(applicature, applicatureTokensAmount);
//        unlock tokens 25% tokens initially
//        next 25% each  6 months
        lockupContract.allocationLog(
            applicature,
            applicatureTokensAmount,
            0,
            SIX_MONTHS.mul(3),
            25,
            SIX_MONTHS
        );
    }

    function allocateTokensWithComplicatedLockup() private {
        LockupContract lockupContract = LockupContract(
            management.contractRegistry(CONTRACT_LOCKUP)
        );

        internalAllocate(shareholders, shareholdersTokensAmount);
        lockupContract.allocationLog(
            shareholders,
            shareholdersTokensAmount.div(5),
            0,
            SIX_MONTHS,
            0,
            SIX_MONTHS
        );
        lockupContract.allocationLog(
            shareholders,
            shareholdersTokensAmount.sub(shareholdersTokensAmount.div(5)),
            0,
            uint256(48).mul(MONTH_IN_SECONDS),
            0,
            YEAR_IN_SECONDS
        );

        internalAllocate(managementTeam, managementTeamTokensAmount);
        lockupContract.allocationLog(
            managementTeam,
            managementTeamTokensAmount.mul(2).div(5),
            0,
            SIX_MONTHS,
            50,
            SIX_MONTHS
        );
        lockupContract.allocationLog(
            managementTeam,
            managementTeamTokensAmount.sub(
                managementTeamTokensAmount.mul(2).div(5)
            ),
            0,
            uint256(36).mul(MONTH_IN_SECONDS),
            0,
            YEAR_IN_SECONDS
        );
    }

    function allocateTokensWithManualUnlock() private {
        LockupContract lockupContract = LockupContract(
            management.contractRegistry(CONTRACT_LOCKUP)
        );

        internalAllocate(
            pharmaIndustrialTrials,
            pharmaIndustrialTrialsTokensAmount
        );
        lockupContract.setManuallyLockedForAddress(
            pharmaIndustrialTrials,
            pharmaIndustrialTrialsTokensAmount
        );
        internalAllocate(teamIncentive, teamIncentiveTokensAmount);
        lockupContract.setManuallyLockedForAddress(
            teamIncentive,
            teamIncentiveTokensAmount
        );
    }
}

