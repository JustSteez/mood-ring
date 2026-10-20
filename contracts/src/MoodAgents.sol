// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title Mood Agents
/// @notice Every Mood Ring piece comes with a personal agent. The holder of a piece can give its
///         agent a name; the name is stored here and travels with the piece when it changes hands.
///         The agent itself runs in the holder's browser and only reads public chain data.
/// @dev No owner, no funds, no upgrades. Names are 1-24 characters of A-Z a-z 0-9 space - _ .
///      with no leading, trailing or double spaces, so they are safe to show anywhere.
contract MoodAgents {
    uint256 public constant MAX_NAME_BYTES = 24;

    IERC721 public immutable moodRing;
    mapping(uint256 tokenId => string) private _names;

    event AgentNamed(uint256 indexed tokenId, address indexed owner, string name);

    error NotTokenOwner();
    error BadName();
    error BadConfig();

    constructor(IERC721 moodRing_) {
        if (address(moodRing_) == address(0)) revert BadConfig();
        moodRing = moodRing_;
    }

    /// @notice Name (or rename) the agent of a piece you hold.
    function setName(uint256 tokenId, string calldata name) external {
        if (moodRing.ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (!isValidName(name)) revert BadName();
        _names[tokenId] = name;
        emit AgentNamed(tokenId, msg.sender, name);
    }

    /// @notice The agent's name, or "" if its holder hasn't named it yet.
    function nameOf(uint256 tokenId) external view returns (string memory) {
        return _names[tokenId];
    }

    function namesOf(uint256[] calldata tokenIds) external view returns (string[] memory names) {
        names = new string[](tokenIds.length);
        for (uint256 i; i < tokenIds.length; ++i) {
            names[i] = _names[tokenIds[i]];
        }
    }

    function isValidName(string calldata name) public pure returns (bool) {
        bytes calldata b = bytes(name);
        uint256 len = b.length;
        if (len == 0 || len > MAX_NAME_BYTES) return false;
        if (b[0] == " " || b[len - 1] == " ") return false;
        for (uint256 i; i < len; ++i) {
            bytes1 c = b[i];
            bool ok = (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c >= "0" && c <= "9") || c == " "
                || c == "-" || c == "_" || c == ".";
            if (!ok) return false;
            if (c == " " && b[i - 1] == " ") return false;
        }
        return true;
    }
}
