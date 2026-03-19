// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/ChildGovernor.sol";

contract ChildGovernorTest is Test {
    ChildGovernor child;
    address parent = makeAddr("parent");
    address factory = makeAddr("factory");
    address governance = makeAddr("governance");

    function setUp() public {
        child = new ChildGovernor();
        child.initialize(parent, factory, governance, 100000);
    }

    function test_initialization() public view {
        assertEq(child.parent(), parent);
        assertEq(child.factory(), factory);
        assertEq(child.governance(), governance);
        assertEq(child.maxGasPerVote(), 100000);
        assertEq(child.alignmentScore(), 100);
        assertTrue(child.active());
    }

    function test_cannotReinitialize() public {
        vm.expectRevert();
        child.initialize(parent, factory, governance, 100000);
    }

    function test_castVote() public {
        vm.prank(parent);
        child.castVote(1, 1, bytes("encrypted_rationale"));

        assertEq(child.getVoteCount(), 1);

        ChildGovernor.VoteRecord[] memory history = child.getVotingHistory();
        assertEq(history[0].proposalId, 1);
        assertEq(history[0].support, 1);
        assertFalse(history[0].revealed);
    }

    function test_cannotVoteTwice() public {
        vm.startPrank(parent);
        child.castVote(1, 1, bytes("rationale"));

        vm.expectRevert("already voted");
        child.castVote(1, 0, bytes("different"));
        vm.stopPrank();
    }

    function test_revealRationale() public {
        vm.startPrank(parent);
        child.castVote(1, 1, bytes("encrypted"));
        child.revealRationale(1, bytes("decrypted rationale"));
        vm.stopPrank();

        ChildGovernor.VoteRecord[] memory history = child.getVotingHistory();
        assertTrue(history[0].revealed);
        assertEq(string(history[0].decryptedRationale), "decrypted rationale");
    }

    function test_updateAlignmentScore() public {
        vm.prank(parent);
        child.updateAlignmentScore(75);
        assertEq(child.alignmentScore(), 75);
    }

    function test_onlyParentUpdatesAlignment() public {
        vm.prank(factory);
        vm.expectRevert("only parent");
        child.updateAlignmentScore(50);
    }

    function test_deactivate() public {
        vm.prank(parent);
        child.deactivate();
        assertFalse(child.active());

        vm.prank(parent);
        vm.expectRevert("child deactivated");
        child.castVote(2, 1, bytes("should fail"));
    }

    function test_unauthorizedCannotVote() public {
        vm.prank(makeAddr("random"));
        vm.expectRevert("unauthorized");
        child.castVote(1, 1, bytes("nope"));
    }
}
