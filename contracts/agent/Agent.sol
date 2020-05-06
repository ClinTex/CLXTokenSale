pragma solidity 0.5.17;

import "../managment/Managed.sol";


/// @title Agent
/// @author Applicature
/// @notice Contract which takes actions on state change and contribution
/// @dev Base class
contract Agent is Managed {

    constructor(address _management) public Managed(_management) {}

    function isInitialized() public view returns (bool);
}