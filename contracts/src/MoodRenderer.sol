// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {MoodArt} from "./MoodArt.sol";

/// @title MoodRenderer
/// @notice Stateless SVG renderer for Mood Ring, deployed separately to keep both contracts under
///         the 24 KB contract size limit.
contract MoodRenderer {
    function svg(MoodArt.Data calldata d) external pure returns (string memory) {
        return MoodArt.svg(d);
    }
}
