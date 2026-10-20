// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {MoodRing} from "../src/MoodRing.sol";
import {MoodArt} from "../src/MoodArt.sol";
import {MoodRenderer} from "../src/MoodRenderer.sol";

/// @dev Chainlink-style feed we can move, freeze or break.
contract MockFeed {
    int256 public answer;
    uint256 public updatedAt;
    bool public broken;

    constructor(int256 a) {
        set(a);
    }

    function set(int256 a) public {
        answer = a;
        updatedAt = block.timestamp;
    }

    function setBroken(bool b) external {
        broken = b;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        require(!broken, "feed down");
        return (1, answer, updatedAt, updatedAt, 1);
    }
}

/// @dev Exposes the library's pure helpers for testing.
contract ArtHarness {
    function percent(int256 bps) external pure returns (string memory) {
        return MoodArt.percent(bps);
    }

    function date(uint256 day) external pure returns (string memory) {
        return MoodArt.date(day);
    }

    function mood(int256 avg) external pure returns (string memory name) {
        (name,,) = MoodArt.mood(avg, false);
    }
}

contract MoodRingTest is Test {
    MoodRing ring;
    MockFeed[8] feeds;
    ArtHarness art;
    address alice = makeAddr("alice");
    string[8] TICKERS = ["NVDA", "TSLA", "AAPL", "AMZN", "MSFT", "GOOGL", "META", "SPY"];

    function setUp() public {
        vm.warp(20746 days + 15 hours); // Tue Oct 20 2026, 15:00 UTC
        address[8] memory addrs;
        for (uint256 i; i < 8; ++i) {
            feeds[i] = new MockFeed(int256(100e8 + i * 10e8));
            addrs[i] = address(feeds[i]);
        }
        ring = new MoodRing(addrs, TICKERS, new MoodRenderer());
        art = new ArtHarness();
    }

    function _setAll(int256 pctBps) internal {
        for (uint256 i; i < 8; ++i) {
            int256 base = int256(100e8 + i * 10e8);
            feeds[i].set(base + base * pctBps / 10_000);
        }
    }

    // ------------------------------------------------------------ config

    function test_constructor_rejectsMissingFeedOrTicker() public {
        address[8] memory addrs;
        vm.expectRevert(MoodRing.BadConfig.selector);
        new MoodRing(addrs, TICKERS, new MoodRenderer());
    }

    function test_config_readable() public view {
        assertEq(ring.tickers()[0], "NVDA");
        assertEq(ring.feeds()[7], address(feeds[7]));
        assertEq(ring.name(), "Mood Ring");
        assertEq(ring.symbol(), "MOOD");
    }

    // ------------------------------------------------------------ snapping

    function test_snap_recordsPricesOncePerDay() public {
        vm.prank(alice);
        uint256 n = ring.snap();
        assertEq(n, 1);
        assertEq(ring.snapshotCount(), 1);
        assertEq(ring.snapshotOfDay(20746), 1);
        MoodRing.Snapshot memory s = ring.getSnapshot(1);
        assertEq(s.day, 20746);
        assertEq(s.prices[0], 100e8);
        assertEq(s.prices[7], 170e8);

        vm.expectRevert(abi.encodeWithSelector(MoodRing.AlreadySnappedToday.selector, 1));
        ring.snap();

        vm.warp(block.timestamp + 1 days);
        assertEq(ring.snap(), 2);
    }

    function test_moves_vsPreviousSnapshot() public {
        ring.snap();
        (int256[8] memory first, int256 firstAvg) = ring.moves(1);
        assertEq(first[0], 0);
        assertEq(firstAvg, 0);

        vm.warp(block.timestamp + 1 days);
        feeds[0].set(110e8); // NVDA +10%
        feeds[1].set(99e8); // TSLA 110 -> 99 = -10%
        ring.snap();
        (int256[8] memory bps, int256 avg) = ring.moves(2);
        assertEq(bps[0], 1000);
        assertEq(bps[1], -1000);
        assertEq(bps[2], 0);
        assertEq(avg, 0);
    }

    function test_brokenFeed_fallsBackToLastPrice() public {
        ring.snap();
        vm.warp(block.timestamp + 1 days);
        feeds[3].setBroken(true);
        feeds[0].set(105e8);
        ring.snap();
        MoodRing.Snapshot memory s = ring.getSnapshot(2);
        assertEq(s.prices[3], 130e8); // carried over
        assertEq(s.prices[0], 105e8);
    }

    function test_brokenFeed_onFirstSnapIsZeroAndMoveIsZero() public {
        feeds[2].setBroken(true);
        ring.snap();
        assertEq(ring.getSnapshot(1).prices[2], 0);
        vm.warp(block.timestamp + 1 days);
        feeds[2].setBroken(false);
        ring.snap();
        (int256[8] memory bps,) = ring.moves(2);
        assertEq(bps[2], 0); // no previous price, no move
    }

    function test_nonsenseAnswers_ignored() public {
        ring.snap();
        vm.warp(block.timestamp + 1 days);
        feeds[0].set(-5);
        feeds[1].set(0);
        ring.snap();
        MoodRing.Snapshot memory s = ring.getSnapshot(2);
        assertEq(s.prices[0], 100e8);
        assertEq(s.prices[1], 110e8);
    }

    function test_liveMoves_vsLatestSnapshot() public {
        ring.snap();
        _setAll(250); // +2.5% everywhere
        (, int256 avg) = ring.liveMoves();
        assertEq(avg, 250);
    }

    // ------------------------------------------------------------ minting

    function test_mint_freeAndUnlimited() public {
        ring.snap();
        vm.startPrank(alice);
        assertEq(ring.mint(1), 1);
        assertEq(ring.mint(1), 2);
        vm.stopPrank();
        assertEq(ring.ownerOf(2), alice);
        assertEq(ring.mintedPerSnapshot(1), 2);
        assertEq(ring.snapshotOfToken(2), 1);
        assertEq(address(ring).balance, 0);
    }

    function test_mint_rejectsUnknownSnapshot() public {
        vm.expectRevert(abi.encodeWithSelector(MoodRing.NoSuchSnapshot.selector, 1));
        ring.mint(1);
        ring.snap();
        vm.expectRevert(abi.encodeWithSelector(MoodRing.NoSuchSnapshot.selector, 0));
        ring.mint(0);
    }

    function test_snapAndMint_snapsOnlyIfNeeded() public {
        vm.prank(alice);
        ring.snapAndMint();
        assertEq(ring.snapshotCount(), 1);
        vm.prank(alice);
        ring.snapAndMint(); // same day: mints existing snapshot
        assertEq(ring.snapshotCount(), 1);
        assertEq(ring.mintedPerSnapshot(1), 2);
    }

    // ------------------------------------------------------------ art + metadata

    function test_art_bullOnGreenBearOnRed() public {
        ring.snap();
        vm.warp(block.timestamp + 1 days);
        _setAll(300);
        ring.snap();
        vm.warp(block.timestamp + 1 days);
        _setAll(-400); // big drop vs +3%
        ring.snap();
        assertTrue(_contains(ring.svg(2), "#3DDC84")); // bull body green
        assertTrue(_contains(ring.svg(2), "EUPHORIC"));
        assertTrue(_contains(ring.svg(3), "#8B5A2B")); // bear fur
        assertTrue(_contains(ring.svg(3), "PANIC"));
    }

    function test_tokenURI_onChainJson() public {
        ring.snap();
        vm.warp(block.timestamp + 1 days);
        feeds[0].set(112e8);
        ring.snap();
        vm.prank(alice);
        ring.mint(2);
        string memory uri = ring.tokenURI(1);
        assertTrue(_startsWith(uri, "data:application/json;base64,"));
        string memory json = string(_b64decode(_slice(uri, 29)));
        assertTrue(_contains(json, '"name":"Mood Ring #2 - WED OCT 21 2026"'));
        assertTrue(_contains(json, '"Top mover","value":"NVDA +12.00%"'));
        assertTrue(_contains(json, '"Weekday","value":"Wednesday"'));
        assertTrue(_contains(json, "data:image/svg+xml;base64,"));
    }

    function test_gas_viewsFitRpcLimits() public {
        ring.snap();
        vm.warp(block.timestamp + 1 days);
        _setAll(-150);
        ring.snap();
        vm.prank(alice);
        ring.mint(2);
        uint256 g = gasleft();
        ring.tokenURI(1);
        uint256 used = g - gasleft();
        emit log_named_uint("tokenURI gas", used);
        assertLt(used, 15_000_000);
    }

    function test_genesis_firstSnapshotLabelled() public {
        ring.snap();
        assertTrue(_contains(ring.svg(1), "GENESIS"));
        vm.prank(alice);
        ring.mint(1);
        string memory json = string(_b64decode(_slice(ring.tokenURI(1), 29)));
        assertTrue(_contains(json, '"Mood","value":"GENESIS"'));
    }

    function test_mint_toSmartWalletWithoutReceiver() public {
        ring.snap();
        address wallet = address(new ArtHarness()); // a contract with no onERC721Received
        vm.prank(wallet);
        ring.mint(1);
        assertEq(ring.ownerOf(1), wallet);
    }

    function test_previewSvg_isLive() public {
        ring.snap();
        assertTrue(_contains(ring.previewSvg(), "MOOD RING - LIVE"));
    }

    function test_helpers_formatting() public view {
        assertEq(art.percent(142), "+1.42%");
        assertEq(art.percent(-8), "-0.08%");
        assertEq(art.percent(0), "+0.00%");
        assertEq(art.percent(-1250), "-12.50%");
        assertEq(art.date(0), "THU JAN 1 1970");
        assertEq(art.date(20746), "TUE OCT 20 2026");
        assertEq(art.date(19782), "THU FEB 29 2024");
        assertEq(art.date(11017), "WED MAR 1 2000");
        assertEq(art.mood(200), "EUPHORIC");
        assertEq(art.mood(30), "BULLISH");
        assertEq(art.mood(0), "FLAT");
        assertEq(art.mood(-30), "BEARISH");
        assertEq(art.mood(-200), "PANIC");
    }

    /// @dev Writes sample artwork to ./art so it can be eyeballed (not an assertion).
    function test_writeSampleArt() public {
        ring.snap();
        int256[4] memory days_ = [int256(250), 60, -90, -320];
        for (uint256 i; i < 4; ++i) {
            vm.warp(block.timestamp + 1 days);
            for (uint256 j; j < 8; ++j) {
                int256 base = int256(100e8 + j * 10e8);
                int256 wobble = int256(j * 37 % 9) * 20 - 80;
                feeds[j].set(base + base * (days_[i] + wobble) / 10_000);
            }
            ring.snap();
            _setAll(0);
        }
        for (uint256 n = 2; n <= 5; ++n) {
            vm.writeFile(string.concat("art/sample-", vm.toString(n), ".svg"), ring.svg(n));
        }
    }

    // ------------------------------------------------------------ helpers

    function _contains(string memory h, string memory n) internal pure returns (bool) {
        bytes memory hb = bytes(h);
        bytes memory nb = bytes(n);
        if (nb.length > hb.length) return false;
        for (uint256 i; i <= hb.length - nb.length; ++i) {
            bool ok = true;
            for (uint256 j; j < nb.length; ++j) {
                if (hb[i + j] != nb[j]) {
                    ok = false;
                    break;
                }
            }
            if (ok) return true;
        }
        return false;
    }

    function _startsWith(string memory s, string memory p) internal pure returns (bool) {
        bytes memory sb = bytes(s);
        bytes memory pb = bytes(p);
        if (pb.length > sb.length) return false;
        for (uint256 i; i < pb.length; ++i) {
            if (sb[i] != pb[i]) return false;
        }
        return true;
    }

    function _slice(string memory s, uint256 start) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        bytes memory out = new bytes(b.length - start);
        for (uint256 i; i < out.length; ++i) {
            out[i] = b[start + i];
        }
        return string(out);
    }

    function _b64decode(string memory s) internal pure returns (bytes memory out) {
        bytes memory b = bytes(s);
        uint256 pad;
        if (b.length > 0 && b[b.length - 1] == "=") ++pad;
        if (b.length > 1 && b[b.length - 2] == "=") ++pad;
        out = new bytes((b.length / 4) * 3 - pad);
        uint256 o;
        for (uint256 i; i < b.length; i += 4) {
            uint256 n = (_b64(b[i]) << 18) | (_b64(b[i + 1]) << 12) | (_b64(b[i + 2]) << 6) | _b64(b[i + 3]);
            for (uint256 k; k < 3 && o < out.length; ++k) {
                out[o++] = bytes1(uint8(n >> (16 - 8 * k)));
            }
        }
    }

    function _b64(bytes1 c) internal pure returns (uint256) {
        uint8 v = uint8(c);
        if (v >= 65 && v <= 90) return v - 65;
        if (v >= 97 && v <= 122) return v - 71;
        if (v >= 48 && v <= 57) return v + 4;
        if (v == 43) return 62;
        if (v == 47) return 63;
        return 0;
    }
}
