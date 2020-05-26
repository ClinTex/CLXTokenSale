pragma solidity 0.5.17;

import "../CLIToken.sol";


contract CLITokenTest is CLIToken{

    constructor(
        address _management
    )
        public
        CLIToken(_management)
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
            _amount <= CLIAllocator(
                management.contractRegistry(CONTRACT_ALLOCATOR)
            ).tokensAvailable(totalSupply()),
            ERROR_WRONG_AMOUNT
        );
        _mint(_account, _amount);
        return true;
    }
}