pragma solidity 0.5.17;

import "../CLXToken.sol";


contract CLXTokenTest is CLXToken{

    constructor(
        address _management
    )
        public
        CLXToken(_management)
    {
    }

    function mintTest(
        address _account,
        uint256 _amount
    )
        public
        requirePermission(CAN_MINT_TOKENS)

        returns (bool)
    {
        require(
            _amount <= CLXAllocator(
                management.contractRegistry(CONTRACT_ALLOCATOR)
            ).tokensAvailable(totalSupply()),
            ERROR_WRONG_AMOUNT
        );
        _mint(_account, _amount);
        return true;
    }
}