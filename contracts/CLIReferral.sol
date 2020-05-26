pragma solidity 0.5.17;

import "./managment/Managed.sol";
import "./allocator/TokenAllocator.sol";
import "./CLIToken.sol";
import "./LockupContract.sol";


contract CLIReferral is Managed {

    uint256 public referralMaxSupply = 800000e18;
    uint256 public referralPercent = 4;
    uint256 public absPercentValue = 100;
    uint256 public referralTotalSupply;
    mapping (address => address) public referralToRefererRegistry;

    constructor(address _management) public Managed(_management) {}

    function registerRefererForAddress(
        address _referral,
        address _referrer
    )
        public
        requirePermission(CAN_SET_WHITELISTED)
    {
        require(
            referralToRefererRegistry[_referral] == address(0),
            ERROR_NOT_AVAILABLE
        );
        referralToRefererRegistry[_referral] = _referrer;
    }

    function allocate(
        address _referralAddress,
        uint256 _tokensPurchased
    )
        public
        requirePermission(CAN_ALLOCATE_REFERRAL_TOKENS)
        returns (uint256 allocatedTokens)
    {
        address referrer = referralToRefererRegistry[_referralAddress];

        allocatedTokens = getReferrerTokens(
            _referralAddress, _tokensPurchased
        );

        if (allocatedTokens == 0){
            return allocatedTokens;
        }
        require(
            referralTotalSupply.add(allocatedTokens) <= referralMaxSupply,
            ERROR_WRONG_AMOUNT
        );

        referralTotalSupply = referralTotalSupply.add(allocatedTokens);

        TokenAllocator(
            management.contractRegistry(CONTRACT_ALLOCATOR)
        ).allocate(
            referrer,
            allocatedTokens,
            CLIToken(management.contractRegistry(CONTRACT_TOKEN)).totalSupply()
        );
        // unlock initial 25% tokens
        // lock 25% tokens for 6 months
        LockupContract(
            management.contractRegistry(CONTRACT_LOCKUP)
        ).allocationLog(
            referrer,
            allocatedTokens.div(2),
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
            referrer,
            allocatedTokens.sub(allocatedTokens.div(2)),
            0,
            uint256(24).mul(MONTH_IN_SECONDS),
            0,
            YEAR_IN_SECONDS
        );

    }

    function getReferrerTokens(
        address _referralAddress,
        uint256 _tokensPurchased
    )
        public
        view
        returns (uint256)
    {
        address referrer = referralToRefererRegistry[_referralAddress];
        if (referrer == address(0)) {
            return 0;
        }
        return _tokensPurchased.mul(referralPercent).div(absPercentValue);
    }
}
