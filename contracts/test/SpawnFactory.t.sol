// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/SpawnFactory.sol";
import "../src/ChildGovernor.sol";
import "../src/ParentTreasury.sol";
import "../src/MockGovernor.sol";

contract SpawnFactoryTest is Test {
    SpawnFactory factory;
    ChildGovernor childImpl;
    ParentTreasury treasury;
    MockGovernor mockGov;
    address parentAgent = makeAddr("parentAgent");
    address owner;

    function setUp() public {
        owner = address(this);
        treasury = new ParentTreasury(10, 1 ether);
        childImpl = new ChildGovernor();
        factory = new SpawnFactory(address(treasury), address(childImpl));
        mockGov = new MockGovernor(300);

        // Wire up
        treasury.setSpawnFactory(address(factory));
        treasury.setParentAgent(parentAgent);

        // Fund factory
        treasury.deposit{value: 5 ether}();
        treasury.fundFactory(5 ether);
    }

    function test_spawnChild() public {
        vm.prank(parentAgent);
        uint256 childId = factory.spawnChild("dao1", address(mockGov), 0.1 ether, 100000);

        assertEq(childId, 1);
        assertEq(factory.getActiveChildCount(), 1);

        SpawnFactory.ChildInfo memory info = factory.getChild(1);
        assertEq(info.governance, address(mockGov));
        assertTrue(info.active);
        assertEq(info.childAddr.balance, 0.1 ether);
    }

    function test_recallChild() public {
        vm.prank(parentAgent);
        factory.spawnChild("dao1", address(mockGov), 0.1 ether, 100000);

        uint256 treasuryBefore = address(treasury).balance;

        vm.prank(parentAgent);
        factory.recallChild(1);

        assertEq(factory.getActiveChildCount(), 0);
        assertFalse(factory.getChild(1).active);
        assertEq(address(treasury).balance, treasuryBefore + 0.1 ether);
    }

    function test_onlyParentCanSpawn() public {
        vm.expectRevert("only parent agent");
        factory.spawnChild("dao1", address(mockGov), 0.1 ether, 100000);
    }

    function test_multipleChildren() public {
        vm.startPrank(parentAgent);
        factory.spawnChild("dao1", address(mockGov), 0.1 ether, 100000);
        factory.spawnChild("dao2", address(mockGov), 0.2 ether, 100000);
        factory.spawnChild("dao3", address(mockGov), 0.3 ether, 100000);
        vm.stopPrank();

        assertEq(factory.getActiveChildCount(), 3);

        SpawnFactory.ChildInfo[] memory active = factory.getActiveChildren();
        assertEq(active.length, 3);
    }

    function test_recallMiddleChild() public {
        vm.startPrank(parentAgent);
        factory.spawnChild("dao1", address(mockGov), 0.1 ether, 100000);
        factory.spawnChild("dao2", address(mockGov), 0.1 ether, 100000);
        factory.spawnChild("dao3", address(mockGov), 0.1 ether, 100000);

        factory.recallChild(2);
        vm.stopPrank();

        assertEq(factory.getActiveChildCount(), 2);
        assertFalse(factory.getChild(2).active);
    }

    receive() external payable {}
}
