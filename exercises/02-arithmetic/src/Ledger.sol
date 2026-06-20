// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice An ETH ledger. Solidity 0.8 reverts on overflow by default —
///         but this contract opts out with `unchecked` in the wrong place.
contract Ledger {
    mapping(address => uint256) public balanceOf;

    function deposit() external payable {
        balanceOf[msg.sender] += msg.value;
    }

    /// @dev BUG: no balance check, and the subtraction is `unchecked`, so a
    ///      sender with too little balance wraps around to a huge number.
    function transfer(address to, uint256 amount) external {
        unchecked {
            balanceOf[msg.sender] -= amount;
            balanceOf[to] += amount;
        }
    }

    function withdraw(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "insufficient");
        balanceOf[msg.sender] -= amount; // checked
        payable(msg.sender).transfer(amount);
    }
}
