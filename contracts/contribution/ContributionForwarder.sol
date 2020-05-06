pragma solidity 0.5.17;

import "../managment/Managed.sol";


/// @title ContributionForwarder
/// @author Applicature
/// @notice Contract is responsible for distributing collected ethers, that are received from CrowdSale.
/// @dev Base class
contract ContributionForwarder is Managed {

    uint256 public weiCollected;
    uint256 public weiForwarded;

    event ContributionForwarded(
        address receiver,
        uint256 weiAmount
    );

    constructor(address _management) 
        public 
        Managed(_management) 
    {}

    /// @notice transfer wei to receiver
    function forward() 
        public 
        payable 
    {
        require(msg.value > 0, ERROR_WRONG_AMOUNT);

        weiCollected = weiCollected.add(msg.value);
        internalForward();
    }

    function isInitialized()
        public
        view
        returns (bool)
    {
        return (
            address(management) != address(0) &&
            management.contractRegistry(
                CONTRACT_FORWARDER
            ) != address(0)
        );
    }

    function internalForward() internal;
}

