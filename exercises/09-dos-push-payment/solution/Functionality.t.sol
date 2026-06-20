// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Distributor} from "../src/Distributor.sol";

contract Receiver {
    receive() external payable {}
}

/// Legitimate behaviour any valid fix must preserve: when every participant can
/// receive ETH, they all get paid their equal share.
contract DosFunctionality is Test {
    Distributor dist;

    function setUp() public {
        dist = new Distributor();
        vm.deal(address(dist), 2 ether);
    }

    function test_honestParticipantsAllGetPaid() public {
        Receiver a = new Receiver();
        Receiver b = new Receiver();
        vm.prank(address(a));
        dist.register();
        vm.prank(address(b));
        dist.register();

        dist.distribute();

        assertEq(address(a).balance, 1 ether, "participant A is paid");
        assertEq(address(b).balance, 1 ether, "participant B is paid");
    }
}
