// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {AggregatorV3Interface} from "./interfaces/AggregatorV3Interface.sol";
import {MoodArt} from "./MoodArt.sol";
import {MoodRenderer} from "./MoodRenderer.sol";

/// @title Mood Ring
/// @notice Once per UTC day anyone can snap the stock market: the contract reads the Chainlink
///         prices of 8 Robinhood Stock Tokens and records them. Each snapshot is rendered fully
///         on-chain as art (mood colour, bull or bear, a ring of the 8 moves vs the previous
///         snapshot) and can be minted for free by anyone, any number of times.
/// @dev No owner, no funds, no upgrades: feeds and tickers are fixed at deployment.
contract MoodRing is ERC721 {
    using Strings for uint256;

    uint256 public constant STOCKS = 8;
    uint256 private constant MAX_PRICE = uint256(uint64(type(int64).max));

    struct Snapshot {
        uint64 takenAt;
        uint32 day;
        int64[8] prices; // feed answers (8 decimals); 0 if a feed has never answered
    }

    MoodRenderer public immutable renderer;
    address[8] private _feeds;
    string[8] private _tickers;

    Snapshot[] private _snapshots; // index 0 is snapshot #1
    mapping(uint256 day => uint256 number) public snapshotOfDay;

    uint256 public totalMinted;
    mapping(uint256 tokenId => uint256 number) public snapshotOfToken;
    mapping(uint256 number => uint256) public mintedPerSnapshot;

    event Snapped(uint256 indexed number, uint256 indexed day, address indexed by, int64[8] prices);
    event Minted(uint256 indexed tokenId, uint256 indexed number, address indexed to);

    error AlreadySnappedToday(uint256 number);
    error NoSuchSnapshot(uint256 number);
    error BadConfig();

    constructor(address[8] memory feeds_, string[8] memory tickers_, MoodRenderer renderer_)
        ERC721("Mood Ring", "MOOD")
    {
        if (address(renderer_) == address(0)) revert BadConfig();
        renderer = renderer_;
        for (uint256 i; i < STOCKS; ++i) {
            if (feeds_[i] == address(0) || bytes(tickers_[i]).length == 0) revert BadConfig();
        }
        _feeds = feeds_;
        _tickers = tickers_;
    }

    // ---------------------------------------------------------------- actions

    /// @notice Record today's prices. Callable once per UTC day, by anyone.
    function snap() public returns (uint256 number) {
        uint256 day = currentDay();
        uint256 existing = snapshotOfDay[day];
        if (existing != 0) revert AlreadySnappedToday(existing);

        // Read prices before pushing, so a broken feed falls back to the previous snapshot.
        int64[8] memory prices = livePrices();
        Snapshot storage s = _snapshots.push();
        s.takenAt = uint64(block.timestamp);
        s.day = uint32(day);
        s.prices = prices;
        number = _snapshots.length;
        snapshotOfDay[day] = number;
        emit Snapped(number, day, msg.sender, s.prices);
    }

    /// @notice Mint an edition of a snapshot. Free (gas only), unlimited.
    function mint(uint256 number) public returns (uint256 tokenId) {
        if (number == 0 || number > _snapshots.length) revert NoSuchSnapshot(number);
        tokenId = ++totalMinted;
        snapshotOfToken[tokenId] = number;
        ++mintedPerSnapshot[number];
        emit Minted(tokenId, number, msg.sender);
        // Plain _mint: the caller is the recipient, and _safeMint would reject EIP-7702 smart
        // wallets whose delegate doesn't implement onERC721Received.
        _mint(msg.sender, tokenId);
    }

    /// @notice Snap today (if nobody has yet) and mint it in one transaction.
    function snapAndMint() external returns (uint256 tokenId) {
        uint256 number = snapshotOfDay[currentDay()];
        if (number == 0) number = snap();
        tokenId = mint(number);
    }

    // ---------------------------------------------------------------- views

    function currentDay() public view returns (uint256) {
        return block.timestamp / 1 days;
    }

    function snapshotCount() external view returns (uint256) {
        return _snapshots.length;
    }

    function feeds() external view returns (address[8] memory) {
        return _feeds;
    }

    function tickers() external view returns (string[8] memory) {
        return _tickers;
    }

    function getSnapshot(uint256 number) public view returns (Snapshot memory) {
        if (number == 0 || number > _snapshots.length) revert NoSuchSnapshot(number);
        return _snapshots[number - 1];
    }

    /// @notice Current feed prices. A feed that reverts or answers nonsense falls back to the
    ///         last snapshot's price, so one broken feed can never block snapping.
    function livePrices() public view returns (int64[8] memory prices) {
        int64[8] memory last;
        if (_snapshots.length != 0) last = _snapshots[_snapshots.length - 1].prices;
        for (uint256 i; i < STOCKS; ++i) {
            prices[i] = last[i];
            try AggregatorV3Interface(_feeds[i]).latestRoundData() returns (
                uint80, int256 answer, uint256, uint256 updatedAt, uint80
            ) {
                if (answer > 0 && uint256(answer) <= MAX_PRICE && updatedAt != 0) prices[i] = int64(answer);
            } catch {}
        }
    }

    /// @notice Per-stock moves (basis points) of a snapshot vs the one before it, plus the average.
    function moves(uint256 number) public view returns (int256[8] memory bps, int256 avgBps) {
        Snapshot memory s = getSnapshot(number);
        int64[8] memory prev = number > 1 ? _snapshots[number - 2].prices : s.prices;
        return _moves(s.prices, prev);
    }

    /// @notice Today's mood so far: live prices vs the latest snapshot.
    function liveMoves() public view returns (int256[8] memory bps, int256 avgBps) {
        int64[8] memory live = livePrices();
        int64[8] memory prev = _snapshots.length != 0 ? _snapshots[_snapshots.length - 1].prices : live;
        return _moves(live, prev);
    }

    function svg(uint256 number) public view returns (string memory) {
        return renderer.svg(_art(number));
    }

    /// @notice The live preview, rendered by the same code as minted art.
    function previewSvg() external view returns (string memory) {
        (int256[8] memory bps, int256 avg) = liveMoves();
        return renderer.svg(
            MoodArt.Data({
                number: 0, day: currentDay(), bps: bps, avgBps: avg, tickers: _tickers, genesis: _snapshots.length == 0
            })
        );
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        uint256 number = snapshotOfToken[tokenId];
        MoodArt.Data memory d = _art(number);
        (string memory moodName,,) = MoodArt.mood(d.avgBps, d.genesis);
        bytes memory json = abi.encodePacked(
            '{"name":"Mood Ring #',
            number.toString(),
            " - ",
            MoodArt.date(d.day),
            '","description":"The stock market on ',
            MoodArt.date(d.day),
            ', snapped from Chainlink prices of 8 Robinhood Stock Tokens and drawn fully on-chain on Robinhood Chain.",',
            '"image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(renderer.svg(d))),
            '","attributes":',
            _attributes(number, d, moodName),
            "}"
        );
        return string.concat("data:application/json;base64,", Base64.encode(json));
    }

    // ---------------------------------------------------------------- internals

    function _art(uint256 number) private view returns (MoodArt.Data memory d) {
        (int256[8] memory bps, int256 avg) = moves(number);
        d = MoodArt.Data({
            number: number,
            day: _snapshots[number - 1].day,
            bps: bps,
            avgBps: avg,
            tickers: _tickers,
            genesis: number == 1
        });
    }

    function _moves(int64[8] memory cur, int64[8] memory prev)
        private
        pure
        returns (int256[8] memory bps, int256 avgBps)
    {
        int256 sum;
        for (uint256 i; i < STOCKS; ++i) {
            if (prev[i] > 0 && cur[i] > 0) bps[i] = (int256(cur[i]) - int256(prev[i])) * 10_000 / int256(prev[i]);
            sum += bps[i];
        }
        avgBps = sum / int256(STOCKS);
    }

    function _attributes(uint256 number, MoodArt.Data memory d, string memory moodName)
        private
        view
        returns (string memory)
    {
        uint256 top;
        uint256 bottom;
        for (uint256 i = 1; i < STOCKS; ++i) {
            if (d.bps[i] > d.bps[top]) top = i;
            if (d.bps[i] < d.bps[bottom]) bottom = i;
        }
        return string.concat(
            '[{"trait_type":"Mood","value":"',
            moodName,
            '"},{"trait_type":"Average move","value":"',
            MoodArt.percent(d.avgBps),
            '"},{"trait_type":"Top mover","value":"',
            _tickers[top],
            " ",
            MoodArt.percent(d.bps[top]),
            '"},{"trait_type":"Worst mover","value":"',
            _tickers[bottom],
            " ",
            MoodArt.percent(d.bps[bottom]),
            '"},{"trait_type":"Weekday","value":"',
            MoodArt.weekday(d.day),
            '"},{"display_type":"number","trait_type":"Snapshot","value":',
            number.toString(),
            "}]"
        );
    }
}
