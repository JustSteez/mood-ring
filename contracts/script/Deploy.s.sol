// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {MoodRing} from "../src/MoodRing.sol";
import {MoodRenderer} from "../src/MoodRenderer.sol";

/// @notice Deploys Mood Ring on Robinhood Chain mainnet with the Chainlink feeds of 8 Robinhood
///         Stock Tokens. No owner, no constructor money, nothing to configure afterwards.
///
///   forge script script/Deploy.s.sol --rpc-url robinhood --broadcast \
///     --account <keystore> --sender <address>
contract Deploy is Script {
    function run() external returns (MoodRing ring) {
        require(block.chainid == 4663, "Deploy is for Robinhood Chain mainnet (4663)");

        string[8] memory tickers = ["NVDA", "TSLA", "AAPL", "AMZN", "MSFT", "GOOGL", "META", "SPY"];
        address[8] memory feeds = [
            0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15, // RHNVDA / USD
            0x4A1166a659A55625345e9515b32adECea5547C38, // RHTSLA / USD
            0x6B22A786bAa607d76728168703a39Ea9C99f2cD0, // Robinhood AAPL / USD
            0xD5a1508ceD74c084eBf3cBe853e2C968fB2a651C, // Robinhood AMZN / USD
            0x45C3C877C15E6BA2EBB19eA114Ea508d14C1Af2E, // RHMSFT / USD
            0xF6f373a037c30F0e5010d854385cA89185AE638b, // Robinhood GOOGL / USD
            0x7C38C00C30BEe9378381E7B6135d7283356D71b1, // Robinhood META / USD
            0x319724394D3A0e3669269846abE664Cd621f9f6A // RHSPY / USD
        ];

        vm.startBroadcast();
        MoodRenderer renderer = new MoodRenderer();
        ring = new MoodRing(feeds, tickers, renderer);
        vm.stopBroadcast();

        string memory obj = "deployment";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeAddress(obj, "renderer", address(renderer));
        string memory out = vm.serializeAddress(obj, "moodRing", address(ring));
        vm.writeJson(out, "deployments/mainnet.json");
        console2.log("MoodRing", address(ring));
    }
}
