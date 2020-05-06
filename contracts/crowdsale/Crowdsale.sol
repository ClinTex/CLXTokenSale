pragma solidity 0.5.17;


contract Crowdsale {

    uint256 public tokensSold;
    uint256 public bonusProduced;

    enum State {
        Unknown,
        Initializing,
        BeforeCrowdsale,
        InCrowdsale,
        Success,
        Finalized,
        Refunding
    }

    function externalContribution(
        address payable _contributor,
        uint256 _currencyAmount
    )
        external
        payable;

    function contribute(uint8 _v, bytes32 _r, bytes32 _s) external payable;

    function updateState() public;

    function getState() public view returns (State);

    function isInitialized() public view returns (bool);

    function internalContribution(
        address payable _contributor,
        uint256 _currencyAmount
    )
        internal;
}
