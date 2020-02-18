pragma solidity ^0.6.1;

library SafeMath {
  function mul(uint256 a, uint256 b) internal pure returns (uint256) {
    if (a == 0) {
      return 0;
    }
    uint256 c = a * b;
    require(c / a == b);
    return c;
  }
  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    // Solidity only automatically asserts when dividing by 0
    require(b > 0);
    uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return c;
  }
  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    require(b <= a);
    uint256 c = a - b;
    return c;
  }
  function add(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    require(c >= a && c >= b);
    return c;
  }

}

contract owned {
  address public owner;

  constructor() public {
    owner = msg.sender;
  }

  modifier onlyOwner {
    require(msg.sender == owner);
    _;
  }

  function transferOwnership(address newOwner) public onlyOwner {
    owner = newOwner;
  }
}

contract Pausable is owned {
  event Pause();
  event Unpause();

  bool public paused = false;


  /**
   * @dev Modifier to make a function callable only when the contract is not paused.
   */
  modifier whenNotPaused() {
    require(!paused);
    _;
  }

  /**
   * @dev Modifier to make a function callable only when the contract is paused.
   */
  modifier whenPaused() {
    require(paused);
    _;
  }

  /**
   * @dev called by the owner to pause, triggers stopped state
   */
  function pause() public onlyOwner whenNotPaused {
    paused = true;
    emit Pause();
  }

  /**
   * @dev called by the owner to unpause, returns to normal state
   */
  function unpause() public onlyOwner whenPaused {
    paused = false;
    emit Unpause();
  }
}

contract ERC20 {
  using SafeMath for uint256;
  // Public variables of the token
  string public name;
  string public symbol;
  uint8 public decimals;
  uint256 public totalSupply;

  // This creates an array with all balances
  mapping (address => uint256) public balanceOf;
  mapping (address => mapping (address => uint256)) public allowance;

  // This generates a public event on the blockchain that will notify clients
  event Transfer(address indexed from, address indexed to, uint256 value);

  // This generates a public event on the blockchain that will notify clients
  event Approval(address indexed _owner, address indexed _spender, uint256 _value);

  // This notifies clients about the amount burnt
  event Burn(address indexed from, uint256 value);

  constructor(string memory tokenName, string memory tokenSymbol, uint8 dec) public {
    decimals = dec;
    totalSupply = 0 * 10 ** uint256(decimals);  // Update total supply with the decimal amount
    name = tokenName;                                   // Set the name for display purposes
    symbol = tokenSymbol;
  }

  function _transfer(address _from, address _to, uint _value) internal virtual {
    // Prevent transfer to 0x0 address. Use burn() instead
    require(_to != address(0x0));
    // Subtract from the sender
    balanceOf[_from] = balanceOf[_from].sub(_value);
    // Add the same to the recipient
    balanceOf[_to] = balanceOf[_to].add(_value);
    emit Transfer(_from, _to, _value);
  }

  function transfer(address _to, uint256 _value) public returns (bool success) {
    _transfer(msg.sender, _to, _value);
    return true;
  }

  function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
    allowance[_from][msg.sender] = allowance[_from][msg.sender].sub(_value);
		_transfer(_from, _to, _value);
		return true;
  }

  function approve(address _spender, uint256 _value) public returns (bool success) {
    allowance[msg.sender][_spender] = _value;
    emit Approval(msg.sender, _spender, _value);
    return true;
  }
}

contract ClintexToken is Pausable, ERC20  {

  string _tokenName = "Clintex";
  string _tokenSymbol = "CLX";
  uint8 _decimals = 18;
  
  uint256 public startTime;
  bool public isTokenFrozen;

  address[] public frozenAddresses;
  struct FrozenWallet {
    address wallet;
    bool isScheduled; //true or false
    uint256 rewardedAmount; //amount
    uint8[4] schedulePercent;
    uint256 releasedAmount;
  }

  FrozenWallet[] public listFrozenWallets;
  mapping (address => FrozenWallet) public mapFrozenWallets;


  mapping (address => bool) public frozenAccount;

  event FrozenFunds(address target, bool frozen);

  constructor() ERC20(_tokenName, _tokenSymbol, 18) public {
    startTime = now;

    addFrozenWallet(address(0x70d4161961104b17a83f3E65da8c24AF670cCC3f), false, 17142857143000000000000000, [0, 0, 0, 0]);

    addFrozenWallet(address(0x3CD0b233B0150b354eCdF0036B1B822fe6dd5A95), false, 60000000000500000000000000, [0, 0, 0, 0]);

    addFrozenWallet(address(0x2d44AE97a0e98c8E583ed0E477bC0337b464A1C5), true, 17142857143000000000000000, [0, 25, 50, 75]);

    addFrozenWallet(address(0x98fD25BD0D9DdCC1C8cae5E97Ba421A500D2D654), true, 5142857142900000000000000, [0, 25, 50, 75]);

    addFrozenWallet(address(0x832BbF6c7C7D140De716196Bc16c12DB0396e2a7), true, 20571428571600000000000000, [25, 50, 75, 100]);

    addFrozenWallet(address(0xa9dB81fe72dF937C870902C8899ae85B9227021B), true, 5142857142900000000000000, [25, 50, 75, 100]);

    addFrozenWallet(address(0x6510D170Ea69663BaDB5f4730F58fBb402945C14), true, 8571428571500000000000000, [0, 0, 0, 0]);

    addFrozenWallet(address(0xE260c3e731379EF497DaC456EAE07D4f2e355A7D), true, 17142857143000000000000000, [25, 25, 50, 75]);

    addFrozenWallet(address(0x9183Efc9F5C068F73E0195B31Ea1056DF8A984C2), true, 20571428571600000000000000, [0, 0, 0, 0]);


    for (uint256 i = 0; i < listFrozenWallets.length; i++) {
      uint256 rewardedAmount = listFrozenWallets[i].rewardedAmount;
      balanceOf[listFrozenWallets[i].wallet] = rewardedAmount;
      totalSupply = totalSupply.add(rewardedAmount);
    }

  }

  function addFrozenWallet(address wallet, bool isScheduled, uint256 rewardedAmount, uint8[4] memory schedulePercent) internal {
    FrozenWallet memory frozenWallet = FrozenWallet(wallet, isScheduled, rewardedAmount, schedulePercent, 0);
    listFrozenWallets.push(frozenWallet);
    mapFrozenWallets[frozenWallet.wallet] = frozenWallet;
  }


  function _transfer(address _from, address _to, uint _value) internal whenNotPaused override {
    require(_to != address(0x0));
    require(canBeTransfered(_from, _value));
    balanceOf[_from] = balanceOf[_from].sub(_value);
    balanceOf[_to] = balanceOf[_to].add(_value);
    emit Transfer(_from, _to, _value);
  }


  function canBeTransfered(address _from, uint _value) public view returns (bool) {
    if(isTokenFrozen) return false;
    if(!mapFrozenWallets[_from].isScheduled) return true;
    if(mapFrozenWallets[_from].releasedAmount > 0 && 
      balanceOf[_from].sub(_value) >= mapFrozenWallets[_from].rewardedAmount.sub(mapFrozenWallets[_from].releasedAmount)
    ) return true;

    if(now < startTime + 6*30 days) { // 0-6 month
      return balanceOf[_from].sub(_value) >= mapFrozenWallets[_from].rewardedAmount.mul(uint256(100).sub(mapFrozenWallets[_from].schedulePercent[0])).div(100);

    } else if(now >= (startTime + 6*30 days) && now < (startTime + 12*30 days)) { // 6-12 month
      return balanceOf[_from].sub(_value) >= mapFrozenWallets[_from].rewardedAmount.mul(uint256(100).sub(mapFrozenWallets[_from].schedulePercent[1])).div(100);

    } else if(now >= (startTime + 12*30 days) && now < (startTime + 18*30 days)) { // 12-18 month
      return balanceOf[_from].sub(_value) >= mapFrozenWallets[_from].rewardedAmount.mul(uint256(100).sub(mapFrozenWallets[_from].schedulePercent[2])).div(100);

    } else if(now >= (startTime + 18*30 days) && now < startTime + 24*30 days) { //18-24 month
      return balanceOf[_from].sub(_value) >= mapFrozenWallets[_from].rewardedAmount.mul(uint256(100).sub(mapFrozenWallets[_from].schedulePercent[3])).div(100);

    } else { // 24-infinite months
      return true;
    }
  }

  function manualRelease(address _from, uint _value) public whenNotPaused onlyOwner {
    mapFrozenWallets[_from].releasedAmount = mapFrozenWallets[_from].releasedAmount.add(_value);
    require(mapFrozenWallets[_from].releasedAmount <= mapFrozenWallets[_from].rewardedAmount);
  }

  function freezeToken(bool freeze) public whenNotPaused onlyOwner {
    isTokenFrozen = freeze;
  }

  function burn(uint256 _value) public whenNotPaused onlyOwner returns (bool success) {
    balanceOf[msg.sender] = balanceOf[msg.sender].sub(_value);   // Subtract from the sender
    totalSupply = totalSupply.sub(_value);                      // Updates totalSupply
    emit Burn(msg.sender, _value);
    return true;
  }

  function burnFrom(address _from, uint256 _value) public whenNotPaused onlyOwner returns (bool success) {
    balanceOf[_from] = balanceOf[_from].sub(_value);                          // Subtract from the targeted balance
    allowance[_from][msg.sender] = allowance[_from][msg.sender].sub(_value);   // Subtract from the sender's allowance
    totalSupply = totalSupply.sub(_value);                              // Update totalSupply
    emit Burn(_from, _value);
    return true;
  }
}