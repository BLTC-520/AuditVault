// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice A Chainlink-style price feed: an answer plus the time it was set.
/// @dev A real feed only updates within a "heartbeat"; if the updater stalls,
///      `updatedAt` ages while `answer` stays frozen at an old value.
contract PriceFeed {
    int256 public answer;     // 8 decimals, like Chainlink USD feeds
    uint256 public updatedAt;

    function set(int256 _answer, uint256 _updatedAt) external {
        answer = _answer;
        updatedAt = _updatedAt;
    }

    function latestRoundData() external view returns (int256, uint256) {
        return (answer, updatedAt);
    }
}
