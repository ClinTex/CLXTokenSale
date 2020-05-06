pragma solidity 0.5.17;

import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "./TokenAllocator.sol";


/// @title MintableTokenAllocator
/// @author Applicature
/// @notice Contract responsible for defining distribution logic of tokens.
/// @dev implementation
contract MintableTokenAllocator is TokenAllocator {

    constructor(uint256 _maxSupply, address _management)
        public
        TokenAllocator(_maxSupply, _management)
    {}

    /// @notice Check whether contract is initialised
    /// @return true if initialized
    function isInitialized() public view returns (bool) {
        return (
            super.isInitialized() &&
            hasPermission(address(this), CAN_MINT_TOKENS)
        );
    }


    function decreaseCap(uint256 _valueToSubtract)
        public
        requirePermission(CAN_INTERACT_WITH_ALLOCATOR)
        requireContractExistsInRegistry(CONTRACT_TOKEN)
    {
        require(
            maxSupply.sub(_valueToSubtract) >= ERC20Mintable(
                management.contractRegistry(CONTRACT_TOKEN)
            ).totalSupply(),
            ERROR_WRONG_AMOUNT
        );
        updateMaxSupply(maxSupply.sub(_valueToSubtract));
    }

    function internalAllocate(
        address _holder,
        uint256 _tokens
    )
        internal
        requireContractExistsInRegistry(CONTRACT_TOKEN)
        requirePermission(CAN_INTERACT_WITH_ALLOCATOR)
    {
        ERC20Mintable(management.contractRegistry(CONTRACT_TOKEN))
            .mint(_holder, _tokens);
    }

}

