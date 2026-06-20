// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {MockERC20} from "../../shared/MockERC20.sol";

/// @notice A vault that releases tokens when shown a withdrawal authorized
///         (signed) by a trusted off-chain signer — the shape of a bridge /
///         cross-chain message claim.
/// @dev BUG: the signed message is `(to, amount)` with no nonce and no record of
///      which signatures have been used, so the SAME authorization can be
///      submitted repeatedly to withdraw again and again (a replay attack).
contract SignedVault {
    MockERC20 public immutable token;
    address public immutable signer;

    constructor(MockERC20 _token, address _signer) {
        token = _token;
        signer = _signer;
    }

    function withdraw(address to, uint256 amount, uint8 v, bytes32 r, bytes32 s) external {
        bytes32 hash = keccak256(abi.encodePacked(to, amount));
        require(ecrecover(hash, v, r, s) == signer, "bad signature");
        token.transfer(to, amount);
    }
}
