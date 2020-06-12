pragma solidity 0.5.17;

import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./managment/Managed.sol";
import "./LockupContract.sol";
import "./CLIAllocator.sol";


contract CLIToken is ERC20, ERC20Detailed, Managed {

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
        ERC20Detailed("ClinTex", "CTI", 18)
        Managed(_management)
    {
        _mint(0x8FAE27b50457C10556C45798c34f73AE263282a6, 151000000000000000);
    }

    function mint(
        address _account,
        uint256 _amount
    )
        public
        requirePermission(CAN_MINT_TOKENS)
        canCallOnlyRegisteredContract(CONTRACT_ALLOCATOR)
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
        requireUnlockedBalance(
            msg.sender,
            value,
            block.timestamp,
            balanceOf(msg.sender)
        )
    {
        require(balanceOf(msg.sender) >= value, ERROR_WRONG_AMOUNT);
        super._burn(msg.sender, value);
    }
}