pragma solidity 0.5.17;

import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./managment/Managed.sol";
import "./LockupContract.sol";


contract CLXToken is ERC20, ERC20Detailed, Managed {

    modifier requireUnlockedBalance(
        address _address,
        uint256 _value,
        uint256 _time,
        uint256 _holderBalance
    ) {

        require(
            LockupContract(
                management.contractRegistry(CONTRACT_LOCKUP)
            ).isTransferAllowed(
                _address,
                _value,
                _time,
                _holderBalance
            ),
            ERROR_NOT_AVAILABLE
        );
        _;
    }

    constructor(
        address _management
    )
        public
        ERC20Detailed("ClinTex", "CLX", 18)
        Managed(_management)
    {
    }

    function mint(
        address _account,
        uint256 _amount
    )
        public
        requirePermission(CAN_MINT_TOKENS)
        returns (bool)
    {
        _mint(_account, _amount);
        return true;
    }

    function transfer(
        address _to,
        uint256 _tokens
    )
        public
        requireUnlockedBalance(
            msg.sender,
            _tokens,
            block.timestamp,
            balanceOf(msg.sender)
        )
        returns (bool)
    {
        super.transfer(_to, _tokens);

        return true;
    }

    function transferFrom(
        address _holder,
        address _to,
        uint256 _tokens
    )
        public
        requireUnlockedBalance(
            _holder,
            _tokens,
            block.timestamp,
            balanceOf(_holder)
        )
        returns (bool)
    {
        super.transferFrom(_holder, _to, _tokens);

        return true;
    }

    function burn(uint256 value)
        public
        requirePermission(CAN_BURN_TOKENS)
    {
        require(balanceOf(msg.sender) >= value, ERROR_WRONG_AMOUNT);
        super._burn(msg.sender, value);
    }
}