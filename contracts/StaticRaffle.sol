// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// All of the SmartCon ticket holders are eligible
// We only know hashes of their ticket confirmation numbers
// We need to run a raffle with seven winners

// Array of all participants
// Array of winners
// Remove winner from participants array, and add it to winners array

import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract StaticRaffle is VRFConsumerBaseV2, Ownable {
    // bytes32 - data type for keccak256 hashes
    using EnumerableSet for EnumerableSet.Bytes32Set;

    VRFCoordinatorV2Interface internal immutable i_vrfCoordinator; //i_ for immutable vars, s_ for storage vars
    uint64 internal immutable i_subscriptionId;
    bytes32 internal immutable i_keyHash;
    uint32 internal immutable i_callbackGasLimit;
    uint16 internal immutable i_requestConfirmations;

    uint32 internal s_numWords; // number of random values we want (7)
    bool internal s_isRaffleStarted; // bool vars are false by default
    EnumerableSet.Bytes32Set internal s_participants; // participants array
    EnumerableSet.Bytes32Set internal s_winners; // winners array

    event RaffleStarted(uint256 indexed requestId);
    event RaffleWinner(bytes32 indexed raffleWinner);
    event RaffleEnded(uint256 indexed requestId);

    error RaffleCanBeRunOnlyOnce();

    modifier onlyOnce() {
        if (s_isRaffleStarted) revert RaffleCanBeRunOnlyOnce();
        _;
    }

    constructor(
        bytes32[] memory participants,
        uint64 subscriptionId,
        address vrfCoordinator,
        bytes32 keyHash,
        uint32 callbackGasLimit,
        uint16 requestConfirmations,
        uint32 numWords
    ) VRFConsumerBaseV2(vrfCoordinator) {
        i_subscriptionId = subscriptionId;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinator);
        i_keyHash = keyHash;
        i_callbackGasLimit = callbackGasLimit;
        i_requestConfirmations = requestConfirmations;
        s_numWords = numWords;

        // loop through participants array and allocate s_participants
        uint256 length = participants.length;
        for (uint i = 0; i < length; ) {
            s_participants.add(participants[i]);
            unchecked {
                ++i;
            }
        }
    }

    function runRaffle() external onlyOwner onlyOnce {
        // We don't want anyone to be able to run a raffle
        // We want this raffle to be run only once
        s_isRaffleStarted = true;
        requestRandomWords();
    }

    function getWinners() external view returns (bytes32[] memory) {
        return s_winners.values();
    }

    function requestRandomWords() internal {
        // Requesting s_numWords of random values from Chainlink VRF
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            i_requestConfirmations,
            i_callbackGasLimit,
            s_numWords
        );

        emit RaffleStarted(requestId);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal
        virtual
        override
    {
        // Catching random values provided by Chainlink VRF as a callback
        // Decide winners
        uint256 length = s_numWords;
        for (uint i = 0; i < length; ) {
            bytes32 raffleWinner = s_participants.at(
                randomWords[i] % s_participants.length()
            );

            // add to winners array
            s_winners.add(raffleWinner);
            // remove from participants array
            s_participants.remove(raffleWinner);

            emit RaffleWinner(raffleWinner);

            unchecked {
                ++i;
            }
        }

        emit RaffleEnded(requestId);
    }
}
