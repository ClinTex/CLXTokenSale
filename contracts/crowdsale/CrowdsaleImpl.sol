pragma solidity 0.5.17;

import "../allocator/TokenAllocator.sol";
import "../agent/CrowdsaleAgent.sol";
import "../contribution/ContributionForwarder.sol";
import "../pricing/PricingStrategy.sol";
import "./Crowdsale.sol";
import "../managment/Managed.sol";


/// @title Crowdsale
/// @author Applicature
/// @notice Contract is responsible for collecting, refunding, allocating tokens during different stages of Crowdsale.
contract CrowdsaleImpl is Crowdsale, Managed {

    State public currentState;
    bool public finalized;
    uint256 public startDate;
    uint256 public endDate;
    bool public allowWhitelisted;
    bool public allowSigned;
    bool public allowAnonymous;

    event Contribution(
        address _contributor,
        uint256 _currencyAmount,
        uint256 _tokensExcludingBonus,
        uint256 _bonus
    );

    constructor(
        uint256 _startDate,
        uint256 _endDate,
        bool _allowWhitelisted,
        bool _allowSigned,
        bool _allowAnonymous,
        address _management
    ) 
        public 
        Managed(_management) 
    {
        startDate = _startDate;
        endDate = _endDate;

        allowWhitelisted = _allowWhitelisted;
        allowSigned = _allowSigned;
        allowAnonymous = _allowAnonymous;

        currentState = State.Unknown;
    }

    /// @notice default payable function
    function()
        external
        payable
    {
        require(allowWhitelisted || allowAnonymous, ERROR_ACCESS_DENIED);

        if (!allowAnonymous && allowWhitelisted) {
            require(hasPermission(msg.sender, WHITELISTED), ERROR_ACCESS_DENIED);
        }

        internalContribution(
            msg.sender,
            PricingStrategy(management.contractRegistry(CONTRACT_PRICING)).getCurrencyAmount(msg.value)
        );
    }

    /// @notice allows external user to do contribution
    function externalContribution(
        address payable _contributor,
        uint256 _currencyAmount
    )
        external
        payable 
        requirePermission(EXTERNAL_CONTRIBUTORS)
    {
        internalContribution(_contributor, _currencyAmount);
    }

    /// @notice allows to do signed contributions
    function contribute(
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    )
        external
        payable
    {
        address recoveredAddress = verify(
            msg.sender,
            _v,
            _r,
            _s
        );

        require(hasPermission(recoveredAddress, SIGNERS), ERROR_ACCESS_DENIED);
        internalContribution(
            msg.sender,
            PricingStrategy(management.contractRegistry(CONTRACT_PRICING)).getCurrencyAmount(msg.value)
        );
    }

    /// @notice Crowdsale state
    function updateState() public {
        State state = getState();

        if (currentState != state) {
            if (management.contractRegistry(CONTRACT_AGENT) != address(0)) {
                CrowdsaleAgent(management.contractRegistry(CONTRACT_AGENT)).onStateChange(state);
            }
            currentState = state;
        }
    }

    /// @notice check sign
    function verify(
        address _sender, 
        uint8 _v, 
        bytes32 _r, 
        bytes32 _s
    )
        public
        view
        returns (address)
    {

        bytes32 hash = keccak256(abi.encodePacked(address(this), _sender));

        bytes memory prefix = "\x19Ethereum Signed Message:\n32";

        return ecrecover(
            keccak256(abi.encodePacked(prefix, hash)),
            _v, 
            _r, 
            _s
        );
    }

    /// @return Crowdsale state
    function getState() public view returns (State) {
        if (finalized) {
            return State.Finalized;
        } else if (TokenAllocator(management.contractRegistry(CONTRACT_ALLOCATOR)).isInitialized() == false) {
            return State.Initializing;
        } else if (ContributionForwarder(management.contractRegistry(CONTRACT_FORWARDER)).isInitialized() == false) {
            return State.Initializing;
        } else if (PricingStrategy(management.contractRegistry(CONTRACT_PRICING)).isInitialized() == false) {
            return State.Initializing;
        } else if (block.timestamp < startDate) {
            return State.BeforeCrowdsale;
        } else if (block.timestamp >= startDate && block.timestamp <= endDate) {
            return State.InCrowdsale;
        } else if (block.timestamp > endDate) {
            return State.Success;
        }

        return State.Unknown;
    }

    function isInitialized() public view returns (bool) {
        return (
            management.contractRegistry(CONTRACT_TOKEN) != address(0) &&
            management.contractRegistry(CONTRACT_AGENT) != address(0) &&
            management.contractRegistry(CONTRACT_FORWARDER) != address(0) &&
            management.contractRegistry(CONTRACT_PRICING) != address(0) &&
            management.contractRegistry(CONTRACT_ALLOCATOR) != address(0)
        );
    }

    function internalContribution(
        address payable _contributor,
        uint256 _currencyAmount
    )
        internal
    {
        updateState();
        require(getState() == State.InCrowdsale, ERROR_ACCESS_DENIED);

        TokenAllocator allocator = TokenAllocator(
            management.contractRegistry(CONTRACT_ALLOCATOR)
        );

        uint256 tokensAvailable = allocator.tokensAvailable(tokensSold);

        uint256 tokens;
        uint256 tokensExcludingBonus;
        uint256 bonus;

        (tokens, tokensExcludingBonus, bonus) = PricingStrategy(
            management.contractRegistry(CONTRACT_PRICING)
        ).getTokens(
            _contributor,
            tokensAvailable,
            tokensSold,
            _currencyAmount,
            bonusProduced
        );

        preValidatePurchase(_contributor, tokens);

        allocator.allocate(_contributor, tokens, tokensSold);

        onContribution(
            _contributor,
            _currencyAmount,
            tokens,
            bonus
        );
    }

    function preValidatePurchase(
        address _beneficiary,
        uint256 _tokensAmount
    )
        internal
        view
    {
        require(_beneficiary != address(0), ERROR_WRONG_AMOUNT);
        require(_tokensAmount > 0, ERROR_WRONG_AMOUNT);
    }

    function onContribution(
        address payable _contributor,
        uint256 _currencyAmount,
        uint256 _tokens,
        uint256 _bonus
    ) internal {
        tokensSold = tokensSold.add(_tokens);
        bonusProduced = bonusProduced.add(_bonus);

        CrowdsaleAgent(
            management.contractRegistry(CONTRACT_AGENT)
        ).onContribution(
            _contributor,
            _currencyAmount,
            _tokens,
            _bonus
        );

        forwardFunds(_contributor);

        emit Contribution(
            _contributor,
            _currencyAmount,
            _tokens.sub(_bonus),
            _bonus
        );
    }

    function forwardFunds(address) internal
    requireContractExistsInRegistry(CONTRACT_FORWARDER)
    {
        if (msg.value > 0) {
            ContributionForwarder(
                management.contractRegistry(CONTRACT_FORWARDER)
            ).forward.value(msg.value)();
        }
    }
}