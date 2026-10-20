// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title MoodArt
/// @notice Renders a day of the stock market as an SVG: a mood-coloured background, a pixel
///         bull (green days) or bear (red days) in the middle, and a ring of 8 bars, one per
///         stock, sized and coloured by how far it moved. Pure function of the numbers it gets.
library MoodArt {
    using Strings for uint256;

    struct Data {
        uint256 number; // snapshot number (0 = live preview)
        uint256 day; // days since 1970-01-01 (UTC)
        int256[8] bps; // per-stock move vs the previous snapshot, in basis points
        int256 avgBps;
        string[8] tickers;
        bool genesis; // first snapshot: nothing to compare against yet
    }

    // Ring segment geometry (centre 500,500; radius 300; 8 × 45° with 5° gaps; labels at r=415).
    function _geometry()
        private
        pure
        returns (
            uint16[8] memory x0,
            uint16[8] memory y0,
            uint16[8] memory x1,
            uint16[8] memory y1,
            uint16[8] memory lx,
            uint16[8] memory ly
        )
    {
        x0 = [uint16(526), 730, 799, 693, 474, 270, 201, 307];
        y0 = [uint16(201), 307, 526, 730, 799, 693, 474, 270];
        x1 = [uint16(693), 799, 730, 526, 307, 201, 270, 474];
        y1 = [uint16(270), 474, 693, 799, 730, 526, 307, 201];
        lx = [uint16(659), 883, 883, 659, 341, 117, 117, 341];
        ly = [uint16(117), 341, 659, 883, 883, 659, 341, 117];
    }

    string internal constant INK = "#0E0E10";
    string internal constant UP = "#0B8F4D";
    string internal constant DOWN = "#9E0B1E";
    string internal constant FLAT = "#C7C7CC";

    // Pre-rendered 18×15 bull and 16×14 bear (same pixel maps as the site mascot), run-length merged.
    string internal constant BULL_SVG =
        '<g shape-rendering="crispEdges"><rect x="320" y="350" width="40" height="20" fill="#FFD23F"/><rect x="640" y="350" width="40" height="20" fill="#FFD23F"/><rect x="320" y="370" width="60" height="20" fill="#FFD23F"/><rect x="620" y="370" width="60" height="20" fill="#FFD23F"/><rect x="340" y="390" width="60" height="20" fill="#FFD23F"/><rect x="600" y="390" width="60" height="20" fill="#FFD23F"/><rect x="360" y="410" width="40" height="20" fill="#FFD23F"/><rect x="400" y="410" width="200" height="20" fill="#0E0E10"/><rect x="600" y="410" width="40" height="20" fill="#FFD23F"/><rect x="360" y="430" width="20" height="20" fill="#2BAA5C"/><rect x="380" y="430" width="20" height="20" fill="#0E0E10"/><rect x="400" y="430" width="200" height="20" fill="#3DDC84"/><rect x="600" y="430" width="20" height="20" fill="#0E0E10"/><rect x="620" y="430" width="20" height="20" fill="#2BAA5C"/><rect x="340" y="450" width="20" height="20" fill="#2BAA5C"/><rect x="360" y="450" width="20" height="20" fill="#0E0E10"/><rect x="380" y="450" width="240" height="20" fill="#3DDC84"/><rect x="620" y="450" width="20" height="20" fill="#0E0E10"/><rect x="640" y="450" width="20" height="20" fill="#2BAA5C"/><rect x="340" y="470" width="20" height="20" fill="#0E0E10"/><rect x="360" y="470" width="40" height="20" fill="#3DDC84"/><rect x="400" y="470" width="40" height="20" fill="#FFFFFF"/><rect x="440" y="470" width="120" height="20" fill="#3DDC84"/><rect x="560" y="470" width="40" height="20" fill="#FFFFFF"/><rect x="600" y="470" width="40" height="20" fill="#3DDC84"/><rect x="640" y="470" width="20" height="20" fill="#0E0E10"/><rect x="340" y="490" width="20" height="20" fill="#0E0E10"/><rect x="360" y="490" width="40" height="20" fill="#3DDC84"/><rect x="400" y="490" width="20" height="20" fill="#FFFFFF"/><rect x="420" y="490" width="20" height="20" fill="#0E0E10"/><rect x="440" y="490" width="120" height="20" fill="#3DDC84"/><rect x="560" y="490" width="20" height="20" fill="#FFFFFF"/><rect x="580" y="490" width="20" height="20" fill="#0E0E10"/><rect x="600" y="490" width="40" height="20" fill="#3DDC84"/><rect x="640" y="490" width="20" height="20" fill="#0E0E10"/><rect x="340" y="510" width="20" height="20" fill="#0E0E10"/><rect x="360" y="510" width="280" height="20" fill="#3DDC84"/><rect x="640" y="510" width="20" height="20" fill="#0E0E10"/><rect x="360" y="530" width="20" height="20" fill="#0E0E10"/><rect x="380" y="530" width="240" height="20" fill="#3DDC84"/><rect x="620" y="530" width="20" height="20" fill="#0E0E10"/><rect x="380" y="550" width="20" height="20" fill="#0E0E10"/><rect x="400" y="550" width="40" height="20" fill="#3DDC84"/><rect x="440" y="550" width="120" height="20" fill="#FF9EB5"/><rect x="560" y="550" width="40" height="20" fill="#3DDC84"/><rect x="600" y="550" width="20" height="20" fill="#0E0E10"/><rect x="380" y="570" width="20" height="20" fill="#0E0E10"/><rect x="400" y="570" width="20" height="20" fill="#3DDC84"/><rect x="420" y="570" width="40" height="20" fill="#FF9EB5"/><rect x="460" y="570" width="20" height="20" fill="#0E0E10"/><rect x="480" y="570" width="40" height="20" fill="#FF9EB5"/><rect x="520" y="570" width="20" height="20" fill="#0E0E10"/><rect x="540" y="570" width="40" height="20" fill="#FF9EB5"/><rect x="580" y="570" width="20" height="20" fill="#3DDC84"/><rect x="600" y="570" width="20" height="20" fill="#0E0E10"/><rect x="380" y="590" width="20" height="20" fill="#0E0E10"/><rect x="400" y="590" width="20" height="20" fill="#3DDC84"/><rect x="420" y="590" width="60" height="20" fill="#FF9EB5"/><rect x="480" y="590" width="40" height="20" fill="#FFD23F"/><rect x="520" y="590" width="60" height="20" fill="#FF9EB5"/><rect x="580" y="590" width="20" height="20" fill="#3DDC84"/><rect x="600" y="590" width="20" height="20" fill="#0E0E10"/><rect x="400" y="610" width="20" height="20" fill="#0E0E10"/><rect x="420" y="610" width="60" height="20" fill="#FF9EB5"/><rect x="480" y="610" width="40" height="20" fill="#FFD23F"/><rect x="520" y="610" width="60" height="20" fill="#FF9EB5"/><rect x="580" y="610" width="20" height="20" fill="#0E0E10"/><rect x="420" y="630" width="160" height="20" fill="#0E0E10"/></g>';
    string internal constant BEAR_SVG =
        '<g shape-rendering="crispEdges"><rect x="346" y="346" width="66" height="22" fill="#0E0E10"/><rect x="588" y="346" width="66" height="22" fill="#0E0E10"/><rect x="324" y="368" width="22" height="22" fill="#0E0E10"/><rect x="346" y="368" width="66" height="22" fill="#8B5A2B"/><rect x="412" y="368" width="22" height="22" fill="#0E0E10"/><rect x="566" y="368" width="22" height="22" fill="#0E0E10"/><rect x="588" y="368" width="66" height="22" fill="#8B5A2B"/><rect x="654" y="368" width="22" height="22" fill="#0E0E10"/><rect x="324" y="390" width="22" height="22" fill="#0E0E10"/><rect x="346" y="390" width="22" height="22" fill="#8B5A2B"/><rect x="368" y="390" width="22" height="22" fill="#FF9EB5"/><rect x="390" y="390" width="22" height="22" fill="#8B5A2B"/><rect x="412" y="390" width="176" height="22" fill="#0E0E10"/><rect x="588" y="390" width="22" height="22" fill="#8B5A2B"/><rect x="610" y="390" width="22" height="22" fill="#FF9EB5"/><rect x="632" y="390" width="22" height="22" fill="#8B5A2B"/><rect x="654" y="390" width="22" height="22" fill="#0E0E10"/><rect x="346" y="412" width="22" height="22" fill="#0E0E10"/><rect x="368" y="412" width="264" height="22" fill="#8B5A2B"/><rect x="632" y="412" width="22" height="22" fill="#0E0E10"/><rect x="324" y="434" width="22" height="22" fill="#0E0E10"/><rect x="346" y="434" width="308" height="22" fill="#8B5A2B"/><rect x="654" y="434" width="22" height="22" fill="#0E0E10"/><rect x="324" y="456" width="22" height="22" fill="#0E0E10"/><rect x="346" y="456" width="44" height="22" fill="#8B5A2B"/><rect x="390" y="456" width="44" height="22" fill="#FFFFFF"/><rect x="434" y="456" width="132" height="22" fill="#8B5A2B"/><rect x="566" y="456" width="44" height="22" fill="#FFFFFF"/><rect x="610" y="456" width="44" height="22" fill="#8B5A2B"/><rect x="654" y="456" width="22" height="22" fill="#0E0E10"/><rect x="324" y="478" width="22" height="22" fill="#0E0E10"/><rect x="346" y="478" width="44" height="22" fill="#8B5A2B"/><rect x="390" y="478" width="22" height="22" fill="#FFFFFF"/><rect x="412" y="478" width="22" height="22" fill="#0E0E10"/><rect x="434" y="478" width="132" height="22" fill="#8B5A2B"/><rect x="566" y="478" width="22" height="22" fill="#FFFFFF"/><rect x="588" y="478" width="22" height="22" fill="#0E0E10"/><rect x="610" y="478" width="44" height="22" fill="#8B5A2B"/><rect x="654" y="478" width="22" height="22" fill="#0E0E10"/><rect x="324" y="500" width="22" height="22" fill="#0E0E10"/><rect x="346" y="500" width="308" height="22" fill="#8B5A2B"/><rect x="654" y="500" width="22" height="22" fill="#0E0E10"/><rect x="324" y="522" width="22" height="22" fill="#0E0E10"/><rect x="346" y="522" width="88" height="22" fill="#8B5A2B"/><rect x="434" y="522" width="132" height="22" fill="#D4A373"/><rect x="566" y="522" width="88" height="22" fill="#8B5A2B"/><rect x="654" y="522" width="22" height="22" fill="#0E0E10"/><rect x="324" y="544" width="22" height="22" fill="#0E0E10"/><rect x="346" y="544" width="66" height="22" fill="#8B5A2B"/><rect x="412" y="544" width="66" height="22" fill="#D4A373"/><rect x="478" y="544" width="44" height="22" fill="#0E0E10"/><rect x="522" y="544" width="66" height="22" fill="#D4A373"/><rect x="588" y="544" width="66" height="22" fill="#8B5A2B"/><rect x="654" y="544" width="22" height="22" fill="#0E0E10"/><rect x="346" y="566" width="22" height="22" fill="#0E0E10"/><rect x="368" y="566" width="44" height="22" fill="#8B5A2B"/><rect x="412" y="566" width="176" height="22" fill="#D4A373"/><rect x="588" y="566" width="44" height="22" fill="#8B5A2B"/><rect x="632" y="566" width="22" height="22" fill="#0E0E10"/><rect x="346" y="588" width="22" height="22" fill="#0E0E10"/><rect x="368" y="588" width="66" height="22" fill="#8B5A2B"/><rect x="434" y="588" width="22" height="22" fill="#D4A373"/><rect x="456" y="588" width="88" height="22" fill="#0E0E10"/><rect x="544" y="588" width="22" height="22" fill="#D4A373"/><rect x="566" y="588" width="66" height="22" fill="#8B5A2B"/><rect x="632" y="588" width="22" height="22" fill="#0E0E10"/><rect x="368" y="610" width="22" height="22" fill="#0E0E10"/><rect x="390" y="610" width="220" height="22" fill="#8B5A2B"/><rect x="610" y="610" width="22" height="22" fill="#0E0E10"/><rect x="390" y="632" width="220" height="22" fill="#0E0E10"/></g>';

    // ---------------------------------------------------------------- mood

    function mood(int256 avgBps, bool genesis)
        internal
        pure
        returns (string memory name, string memory bg, string memory fg)
    {
        if (genesis) return ("GENESIS", "#5B2EFF", "#FFFFFF");
        if (avgBps >= 200) return ("EUPHORIC", "#D4FF3A", INK);
        if (avgBps >= 30) return ("BULLISH", "#B8F5D2", INK);
        if (avgBps > -30) return ("FLAT", "#5B2EFF", "#FFFFFF");
        if (avgBps > -200) return ("BEARISH", "#FF8A3D", INK);
        return ("PANIC", "#FF3B30", "#FFFFFF");
    }

    // ---------------------------------------------------------------- svg

    function svg(Data memory d) internal pure returns (string memory) {
        (string memory moodName, string memory bg, string memory fg) = mood(d.avgBps, d.genesis);
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000" font-family="monospace" font-weight="700">',
            '<rect width="1000" height="1000" fill="',
            bg,
            '"/><rect x="12" y="12" width="976" height="976" rx="36" fill="none" stroke="',
            INK,
            '" stroke-width="24"/>',
            _ring(d),
            d.avgBps < -30 ? BEAR_SVG : BULL_SVG,
            _labels(d, fg),
            _header(d, moodName, fg),
            "</svg>"
        );
    }

    function _ring(Data memory d) private pure returns (string memory out) {
        (uint16[8] memory X0, uint16[8] memory Y0, uint16[8] memory X1, uint16[8] memory Y1,,) = _geometry();
        for (uint256 i; i < 8; ++i) {
            uint256 mag = _abs(d.bps[i]);
            uint256 width = 18 + (mag > 800 ? 800 : mag) * 70 / 800;
            string memory arc = string.concat(
                'd="M',
                uint256(X0[i]).toString(),
                " ",
                uint256(Y0[i]).toString(),
                " A300 300 0 0 1 ",
                uint256(X1[i]).toString(),
                " ",
                uint256(Y1[i]).toString(),
                '" fill="none" stroke-linecap="round"'
            );
            string memory color = mag < 5 ? FLAT : (d.bps[i] > 0 ? UP : DOWN);
            out = string.concat(
                out,
                "<path ",
                arc,
                ' stroke="',
                INK,
                '" stroke-width="',
                (width + 10).toString(),
                '"/><path ',
                arc,
                ' stroke="',
                color,
                '" stroke-width="',
                width.toString(),
                '"/>'
            );
        }
    }

    function _labels(Data memory d, string memory fg) private pure returns (string memory out) {
        (,,,, uint16[8] memory LX, uint16[8] memory LY) = _geometry();
        for (uint256 i; i < 8; ++i) {
            string memory x = uint256(LX[i]).toString();
            out = string.concat(
                out,
                '<text x="',
                x,
                '" y="',
                uint256(LY[i]).toString(),
                '" text-anchor="middle" font-size="30" fill="',
                fg,
                '">',
                d.tickers[i],
                '<tspan x="',
                x,
                '" dy="32" font-size="24">',
                percent(d.bps[i]),
                "</tspan></text>"
            );
        }
    }

    function _header(Data memory d, string memory moodName, string memory fg) private pure returns (string memory) {
        string memory title = d.number == 0 ? "MOOD RING - LIVE" : string.concat("MOOD RING #", d.number.toString());
        return string.concat(
            '<text x="60" y="78" font-size="30" fill="',
            fg,
            '">',
            title,
            '</text><text x="940" y="78" font-size="30" text-anchor="end" fill="',
            fg,
            '">',
            date(d.day),
            '</text><text x="500" y="955" font-size="40" text-anchor="middle" fill="',
            fg,
            '">',
            moodName,
            d.genesis ? "" : string.concat(" ", percent(d.avgBps)),
            "</text>"
        );
    }

    // ---------------------------------------------------------------- formatting

    /// @notice Basis points as a signed percentage with two decimals, e.g. "+1.42%" or "-0.08%".
    function percent(int256 bps) internal pure returns (string memory) {
        uint256 a = _abs(bps);
        string memory frac = (a % 100).toString();
        if (a % 100 < 10) frac = string.concat("0", frac);
        return string.concat(bps < 0 ? "-" : "+", (a / 100).toString(), ".", frac, "%");
    }

    /// @notice "TUE OCT 20 2026" for a day count since the Unix epoch (UTC).
    function date(uint256 day) internal pure returns (string memory) {
        (uint256 y, uint256 m, uint256 dd) = civil(day);
        string[7] memory wd = ["THU", "FRI", "SAT", "SUN", "MON", "TUE", "WED"];
        string[12] memory mn = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        return string.concat(wd[day % 7], " ", mn[m - 1], " ", dd.toString(), " ", y.toString());
    }

    function weekday(uint256 day) internal pure returns (string memory) {
        string[7] memory wd = ["Thursday", "Friday", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"];
        return wd[day % 7];
    }

    /// @dev Howard Hinnant's days-to-civil algorithm (proleptic Gregorian, UTC).
    function civil(uint256 day) internal pure returns (uint256 y, uint256 m, uint256 d) {
        uint256 z = day + 719468;
        uint256 era = z / 146097;
        uint256 doe = z - era * 146097;
        uint256 yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
        y = yoe + era * 400;
        uint256 doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        uint256 mp = (5 * doy + 2) / 153;
        d = doy - (153 * mp + 2) / 5 + 1;
        m = mp < 10 ? mp + 3 : mp - 9;
        if (m <= 2) y += 1;
    }

    function _abs(int256 v) private pure returns (uint256) {
        return v < 0 ? uint256(-v) : uint256(v);
    }
}
