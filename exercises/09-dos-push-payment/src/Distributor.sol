// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Splits its ETH balance equally among registered participants by
///         PUSHING funds to each in a loop.
/// @dev BUG: distribute() requires every send to succeed. A single participant
///      whose receive() reverts makes the whole loop revert — so nobody can be
///      paid and the funds are frozen (a griefing denial-of-service).
contract Distributor {
    address[] public participants;

    function register() external {
        participants.push(msg.sender);
    }

    function participantCount() external view returns (uint256) {
        return participants.length;
    }

    receive() external payable {}

    function distribute() external {
        uint256 share = address(this).balance / participants.length;
        for (uint256 i = 0; i < participants.length; i++) {
            (bool ok,) = participants[i].call{value: share}("");
            require(ok, "send failed"); // one failing recipient bricks everyone
        }
    }
}
