// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice A simple ETH bank.
/// @dev BUG: withdraw() sends ETH (an external call) BEFORE zeroing the
///      balance, so a malicious recipient can re-enter and withdraw again.
contract EtherBank {
    mapping(address => uint256) public balanceOf;

    function deposit() external payable {
        balanceOf[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint256 bal = balanceOf[msg.sender];
        require(bal > 0, "nothing to withdraw");
        (bool ok,) = msg.sender.call{value: bal}(""); // external call first
        require(ok, "send failed");
        balanceOf[msg.sender] = 0; // state update after — too late
    }
}
