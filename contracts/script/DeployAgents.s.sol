// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {MoodAgents} from "../src/MoodAgents.sol";

/// @notice Deploys Mood Agents next to the live Mood Ring and records it in deployments/mainnet.json.
///
///   forge script script/DeployAgents.s.sol --rpc-url robinhood --broadcast \
///     --account <keystore> --sender <address>
contract DeployAgents is Script {
    string constant FILE = "deployments/mainnet.json";

    function run() external returns (MoodAgents agents) {
        require(block.chainid == 4663, "DeployAgents is for Robinhood Chain mainnet (4663)");
        string memory json = vm.readFile(FILE);
        address ring = vm.parseJsonAddress(json, ".moodRing");
        address renderer = vm.parseJsonAddress(json, ".renderer");
        require(ring.code.length > 0, "Mood Ring not found at the recorded address");

        vm.startBroadcast();
        agents = new MoodAgents(IERC721(ring));
        vm.stopBroadcast();

        string memory obj = "deployment";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeAddress(obj, "renderer", renderer);
        vm.serializeAddress(obj, "moodRing", ring);
        string memory out = vm.serializeAddress(obj, "agents", address(agents));
        vm.writeJson(out, FILE);
        console2.log("MoodAgents", address(agents));
    }
}
