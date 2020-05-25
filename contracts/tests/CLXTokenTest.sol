pragma solidity 0.5.17;

import "../XCLToken.sol";


contract XCLTokenTest is XCLToken{

    constructor(
        address _management
    )
        public
        XCLToken(_management)
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
            _amount <= XCLAllocator(
                management.contractRegistry(CONTRACT_ALLOCATOR)
            ).tokensAvailable(totalSupply()),
            ERROR_WRONG_AMOUNT
        );
        _mint(_account, _amount);
        return true;
    }
}