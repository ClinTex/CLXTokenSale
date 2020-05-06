pragma solidity 0.5.17;

import "./allocator/MintableTokenAllocator.sol";
import "./CLXToken.sol";
import "./LockupContract.sol";


contract CLXAllocator is MintableTokenAllocator {

    /* solium-disable */
    address public constant strategicPartners = 0xcbE219cbF4A389079F35F75717E8F37FC0674BC3;
    address public constant promotionsBounty = 0xbA680318Dcff9d1A14994E51AdC281aef3505f55;
    address public constant shareholders = 0x3414f8c862eD8C931aA5E8f0D43A534057E931a7;
    address public constant advisors = 0x868608bB49e3FCbEE36397eEf655983Ac53A1DA4;
    address public constant pharmaIndustrialTrials = 0x592F71525076C7a09E953b578034dE6AfFeb98eE;
    address public constant managementTeam = 0x3b7E6021A5f3E7BF98b45857dBC14328b76623b8;
    address public constant teamIncentive = 0x5eCAb5e32987D96D2c6007682fBa3639f8F8070f;
    address public constant publicSaleTokensHolder = 0x6c2Cda925236Aab635e0Dbf73D11564403b50c35;

    uint256 public constant strategicPartnersTokensAmount = 20000000e18;
    uint256 public constant promotionsBountyTokensAmount = 5200000e18;
    uint256 public constant shareholdersTokensAmount = 25000000e18;
    uint256 public constant advisorsTokensAmount = 10000000e18;
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

