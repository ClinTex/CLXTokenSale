pragma solidity 0.5.17;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./managment/Managed.sol";


contract LockupContract is Managed {
    using SafeMath for uint256;

    uint256 public constant PERCENT_ABS_MAX = 100;
    bool public isPostponedStart;
    uint256 public postponedStartDate;

    mapping(address => uint256[]) public lockedAllocationData;

    mapping(address => uint256) public manuallyLockedBalances;

    event Lock(address holderAddress, uint256 amount);

    constructor(address _management) public Managed(_management) {
        isPostponedStart = true;
    }

    function isTransferAllowed(
        address _address,
        uint256 _value,
        uint256 _time,
        uint256 _holderBalance
    )
    external
    view
    returns (bool)
    {
        uint256 unlockedBalance = getUnlockedBalance(
            _address,
            _time,
            _holderBalance
        );
        if (unlockedBalance >= _value) {
            return true;
        }
        return false;
    }

    function allocationLog(
        address _address,
        uint256 _amount,
        uint256 _startingAt,
        uint256 _lockPeriodInSeconds,
        uint256 _initialUnlockInPercent,
        uint256 _releasePeriodInSeconds
    )
        public
        requirePermission(CAN_LOCK_TOKENS)
    {
        lockedAllocationData[_address].push(_startingAt);
        if (_initialUnlockInPercent > 0) {
            _amount = _amount.mul(uint256(100)
                .sub(_initialUnlockInPercent)).div(100);
        }
        lockedAllocationData[_address].push(_amount);
        lockedAllocationData[_address].push(_lockPeriodInSeconds);
        lockedAllocationData[_address].push(_releasePeriodInSeconds);
        emit Lock(_address, _amount);
    }

    function getUnlockedBalance(
        address _address,
        uint256 _time,
        uint256 _holderBalance
    )
        public
        view
        returns (uint256)
    {
        uint256 blockedAmount = manuallyLockedBalances[_address];

        if (lockedAllocationData[_address].length == 0) {
            return _holderBalance.sub(blockedAmount);
        }
        uint256[] memory  addressLockupData = lockedAllocationData[_address];
        for (uint256 i = 0; i < addressLockupData.length / 4; i++) {
            uint256 lockedAt = addressLockupData[i.mul(4)];
            uint256 lockedBalance = addressLockupData[i.mul(4).add(1)];
            uint256 lockPeriodInSeconds = addressLockupData[i.mul(4).add(2)];
            uint256 _releasePeriodInSeconds = addressLockupData[
                i.mul(4).add(3)
            ];
            if (lockedAt == 0 && true == isPostponedStart) {
                if (postponedStartDate == 0) {
                    blockedAmount = blockedAmount.add(lockedBalance);
                    continue;
                }
                lockedAt = postponedStartDate;
            }
            if (lockedAt.add(lockPeriodInSeconds) > _time) {
                if (lockedBalance == 0) {
                    blockedAmount = _holderBalance;
                    break;
                } else {
                    uint256 tokensUnlocked;
                    if (_releasePeriodInSeconds > 0) {
                        uint256 duration = (_time.sub(lockedAt))
                            .div(_releasePeriodInSeconds);
                        tokensUnlocked = lockedBalance.mul(duration)
                            .mul(_releasePeriodInSeconds)
                            .div(lockPeriodInSeconds);
                    }
                    blockedAmount = blockedAmount
                        .add(lockedBalance)
                        .sub(tokensUnlocked);
                }
            }
        }

        return _holderBalance.sub(blockedAmount);
    }

    function setManuallyLockedForAddress (
        address _holder,
        uint256 _balance
    )
        public
        requirePermission(CAN_LOCK_TOKENS)
    {
        manuallyLockedBalances[_holder] = _balance;
    }

    function setPostponedStartDate(uint256 _postponedStartDate)
        public
        requirePermission(CAN_LOCK_TOKENS)
    {
        postponedStartDate = _postponedStartDate;

    }
}