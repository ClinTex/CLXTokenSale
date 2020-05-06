pragma solidity 0.5.17;

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "./Constants.sol";


contract Management is Ownable, Constants {

    // Contract Registry
    mapping (uint256 => address payable) public contractRegistry;

    // Permissions
    mapping (address => mapping(uint256 => bool)) public permissions;

    event PermissionsSet(
        address subject, 
        uint256 permission, 
        bool value
    );

    event ContractRegistered(
        uint256 key,
        address source,
        address target
    );

    function setPermission(
        address _address, 
        uint256 _permission, 
        bool _value
    )
        public
        onlyOwner
    {
        permissions[_address][_permission] = _value;
        emit PermissionsSet(_address, _permission, _value);
    }

    function registerContract(
        uint256 _key, 
        address payable _target
    ) 
        public 
        onlyOwner 
    {
        contractRegistry[_key] = _target;
        emit ContractRegistered(_key, address(0), _target);
    }

    function setWhitelisted(
        address _address,
        bool _value
    )
        public
    {
        require(
            permissions[msg.sender][CAN_SET_WHITELISTED] == true,
            ERROR_ACCESS_DENIED
        );

        permissions[_address][WHITELISTED] = _value;

        emit PermissionsSet(_address, WHITELISTED, _value);
    }

}