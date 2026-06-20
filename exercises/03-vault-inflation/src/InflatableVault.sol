// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {MockERC20} from "../../shared/MockERC20.sol";

/// @notice A minimal ERC4626-style vault with a first-deposit inflation bug.
/// @dev Share accounting trusts the live token balance (`totalAssets()`), and
///      the first deposit mints shares 1:1. Together these let an attacker who
///      deposits 1 wei and then *donates* tokens make a later depositor's shares
///      round down to zero — capturing their funds.
contract InflatableVault {
    MockERC20 public immutable asset;
    uint256 public totalShares;
    mapping(address => uint256) public shares;

    constructor(MockERC20 _asset) {
        asset = _asset;
    }

    /// @dev Live balance — can be inflated by a direct token transfer (donation).
    function totalAssets() public view returns (uint256) {
        return asset.balanceOf(address(this));
    }

    /// @notice Deposit `assets`, receive shares pro-rata to current holdings.
    function deposit(uint256 assets) external returns (uint256 minted) {
        require(assets > 0, "zero assets");
        uint256 supply = totalShares;
        if (supply == 0) {
            minted = assets; // 1:1 bootstrap
        } else {
            minted = assets * supply / totalAssets(); // rounds down — can be 0
        }
        asset.transferFrom(msg.sender, address(this), assets);
        totalShares += minted;
        shares[msg.sender] += minted;
    }

    /// @notice Burn `shareAmount` shares, withdraw proportional assets.
    function redeem(uint256 shareAmount) external returns (uint256 assets) {
        assets = shareAmount * totalAssets() / totalShares;
        totalShares -= shareAmount;
        shares[msg.sender] -= shareAmount;
        asset.transfer(msg.sender, assets);
    }
}
