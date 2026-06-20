// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice An ETH bank that guards withdraw() with a reentrancy lock.
/// @dev BUG: the lock protects withdraw(), but transfer() is left unguarded.
///      During withdraw()'s external call you cannot re-enter withdraw — but
///      you CAN call transfer() to move your not-yet-zeroed balance elsewhere.
///      This is cross-function reentrancy.
contract VaultBank {
    mapping(address => uint256) public balanceOf;
    bool private locked;

    modifier noReentrant() {
        require(!locked, "reentrant");
        locked = true;
        _;
        locked = false;
    }

    function deposit() external payable {
        balanceOf[msg.sender] += msg.value;
    }

    function withdraw() external noReentrant {
        uint256 bal = balanceOf[msg.sender];
        require(bal > 0, "nothing");
        (bool ok,) = msg.sender.call{value: bal}("");
        require(ok, "send failed");
        balanceOf[msg.sender] = 0;
    }

    /// @dev BUG: no reentrancy guard. Reachable during withdraw()'s callback.
    function transfer(address to, uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
    }
}
