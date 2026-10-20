// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {MoodAgents} from "../src/MoodAgents.sol";

contract MockPieces is ERC721("Pieces", "P") {
    function mint(address to, uint256 id) external {
        _mint(to, id);
    }
}

contract MoodAgentsTest is Test {
    MockPieces pieces;
    MoodAgents agents;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    event AgentNamed(uint256 indexed tokenId, address indexed owner, string name);

    function setUp() public {
        pieces = new MockPieces();
        agents = new MoodAgents(IERC721(address(pieces)));
        pieces.mint(alice, 1);
        pieces.mint(alice, 2);
    }

    function test_ownerCanNameAgent() public {
        vm.expectEmit(true, true, false, true);
        emit AgentNamed(1, alice, "Nova");
        vm.prank(alice);
        agents.setName(1, "Nova");
        assertEq(agents.nameOf(1), "Nova");
    }

    function test_unnamedAgentIsEmpty() public view {
        assertEq(agents.nameOf(2), "");
    }

    function test_ownerCanRename() public {
        vm.startPrank(alice);
        agents.setName(1, "Nova");
        agents.setName(1, "Bull Whisperer");
        vm.stopPrank();
        assertEq(agents.nameOf(1), "Bull Whisperer");
    }

    function test_nonOwnerCannotName() public {
        vm.prank(bob);
        vm.expectRevert(MoodAgents.NotTokenOwner.selector);
        agents.setName(1, "Hijack");
    }

    function test_nameFollowsTheToken() public {
        vm.prank(alice);
        agents.setName(1, "Nova");
        vm.prank(alice);
        pieces.transferFrom(alice, bob, 1);

        assertEq(agents.nameOf(1), "Nova");
        vm.prank(alice);
        vm.expectRevert(MoodAgents.NotTokenOwner.selector);
        agents.setName(1, "Mine");
        vm.prank(bob);
        agents.setName(1, "Bobby");
        assertEq(agents.nameOf(1), "Bobby");
    }

    function test_nonexistentTokenReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        agents.setName(99, "Ghost");
    }

    function test_acceptsAllowedCharacters() public {
        vm.prank(alice);
        agents.setName(1, "Agent_007 Mk-2.0");
        assertEq(agents.nameOf(1), "Agent_007 Mk-2.0");
    }

    function test_rejectsBadNames() public {
        string[7] memory bad = [
            "", // empty
            "abcdefghijklmnopqrstuvwxy", // 25 bytes, over the limit
            " Nova", // leading space
            "Nova ", // trailing space
            "No  va", // double space
            "<script>", // markup
            unicode"Növa" // non-ASCII
        ];
        for (uint256 i; i < bad.length; ++i) {
            vm.prank(alice);
            vm.expectRevert(MoodAgents.BadName.selector);
            agents.setName(1, bad[i]);
        }
    }

    function test_maxLengthNameAccepted() public {
        vm.prank(alice);
        agents.setName(1, "abcdefghijklmnopqrstuvwx"); // 24 bytes
        assertEq(agents.nameOf(1), "abcdefghijklmnopqrstuvwx");
    }

    function test_namesOfBatch() public {
        vm.prank(alice);
        agents.setName(2, "Bear Hunter");
        uint256[] memory ids = new uint256[](2);
        ids[0] = 1;
        ids[1] = 2;
        string[] memory names = agents.namesOf(ids);
        assertEq(names[0], "");
        assertEq(names[1], "Bear Hunter");
    }

    function test_rejectsZeroCollection() public {
        vm.expectRevert(MoodAgents.BadConfig.selector);
        new MoodAgents(IERC721(address(0)));
    }

    function test_holdsNoEth() public {
        (bool ok,) = address(agents).call{value: 1 wei}("");
        assertFalse(ok);
    }
}
