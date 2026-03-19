// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/MockGovernor.sol";
import "../src/SpawnFactory.sol";
import "../src/ChildGovernor.sol";
import "../src/ParentTreasury.sol";
import "../src/TimeLock.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // 1. Deploy MockGovernor with 5 min voting period
        MockGovernor mockGov = new MockGovernor(300);
        console.log("MockGovernor:", address(mockGov));

        // 2. Deploy ParentTreasury
        ParentTreasury treasury = new ParentTreasury(10, 1 ether);
        console.log("ParentTreasury:", address(treasury));

        // 3. Deploy ChildGovernor implementation (for cloning)
        ChildGovernor childImpl = new ChildGovernor();
        console.log("ChildGovernor (impl):", address(childImpl));

        // 4. Deploy SpawnFactory
        SpawnFactory factory = new SpawnFactory(address(treasury), address(childImpl));
        console.log("SpawnFactory:", address(factory));

        // 5. Deploy TimeLock
        TimeLock timeLock = new TimeLock();
        console.log("TimeLock:", address(timeLock));

        // 6. Wire up treasury -> factory
        treasury.setSpawnFactory(address(factory));
        console.log("Factory linked to treasury");

        // 7. Set governance values
        treasury.setGovernanceValues(
            "Prioritize decentralization, oppose token inflation, support public goods funding, favor progressive decentralization"
        );
        console.log("Governance values set");

        // Note: parentAgent address will be set after agent runtime is configured
        // treasury.setParentAgent(agentAddress);

        vm.stopBroadcast();

        // Output deployment summary
        console.log("\n=== Deployment Summary ===");
        console.log("Deployer:", deployer);
        console.log("MockGovernor:", address(mockGov));
        console.log("ParentTreasury:", address(treasury));
        console.log("ChildGovernor (impl):", address(childImpl));
        console.log("SpawnFactory:", address(factory));
        console.log("TimeLock:", address(timeLock));
    }
}
