// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RewardToken.sol";

contract TenderCrowdfunding {

    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/
    struct Tender {
        uint256 id;
        string title;
        string description;
        uint256 goal;          // funding goal (ETH)
        uint256 deadline;      // timestamp
        address organizer;     // creator
        bool finalized;        // finalized or not
        uint256 totalRaised;   // total ETH raised
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    uint256 public tenderCount;
    RewardToken public rewardToken;

    mapping(uint256 => Tender) public tenders;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(uint256 => address[]) public participants;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/
    event TenderCreated(uint256 indexed tenderId, address indexed organizer);
    event Contributed(uint256 indexed tenderId, address indexed contributor, uint256 amount);
    event TenderFinalized(uint256 indexed tenderId);
    event Refunded(uint256 indexed tenderId, address indexed user, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    constructor(address _rewardToken) {
        rewardToken = RewardToken(_rewardToken);
    }

    /*//////////////////////////////////////////////////////////////
                        CREATE TENDER (CAMPAIGN)
    //////////////////////////////////////////////////////////////*/
    function createTender(
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _duration
    ) external {
        require(_goal > 0, "Goal must be > 0");
        require(_duration > 0, "Duration must be > 0");

        tenderCount++;

        tenders[tenderCount] = Tender({
            id: tenderCount,
            title: _title,
            description: _description,
            goal: _goal,
            deadline: block.timestamp + _duration,
            organizer: msg.sender,
            finalized: false,
            totalRaised: 0
        });

        emit TenderCreated(tenderCount, msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                            CONTRIBUTE (CROWDFUND)
    //////////////////////////////////////////////////////////////*/
    function contribute(uint256 tenderId) external payable {
        Tender storage t = tenders[tenderId];

        require(block.timestamp < t.deadline, "Tender ended");
        require(!t.finalized, "Tender finalized");
        require(msg.value > 0, "Contribution must be > 0");

        // first-time contributor
        if (contributions[tenderId][msg.sender] == 0) {
            participants[tenderId].push(msg.sender);
        }

        contributions[tenderId][msg.sender] += msg.value;
        t.totalRaised += msg.value;

        // Reward tokens: example rate 100 RWT per ETH (wei-based)
        uint256 rewardAmount = msg.value * 100;
        rewardToken.mint(msg.sender, rewardAmount);

        emit Contributed(tenderId, msg.sender, msg.value);
    }

    /*//////////////////////////////////////////////////////////////
                            FINALIZE
    //////////////////////////////////////////////////////////////*/
    function finalizeTender(uint256 tenderId) external {
        Tender storage t = tenders[tenderId];

        require(msg.sender == t.organizer, "Only organizer");
        require(block.timestamp >= t.deadline, "Too early");
        require(!t.finalized, "Already finalized");

        t.finalized = true;

        emit TenderFinalized(tenderId);
    }

    /*//////////////////////////////////////////////////////////////
                            REFUND
    //////////////////////////////////////////////////////////////*/
    function refund(uint256 tenderId) external {
        Tender storage t = tenders[tenderId];

        require(t.finalized, "Not finalized");

        uint256 amount = contributions[tenderId][msg.sender];
        require(amount > 0, "Nothing to refund");

        contributions[tenderId][msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit Refunded(tenderId, msg.sender, amount);
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW HELPERS
    //////////////////////////////////////////////////////////////*/
    function getParticipants(uint256 tenderId) external view returns (address[] memory) {
        return participants[tenderId];
    }

    function getContribution(uint256 tenderId, address user) external view returns (uint256) {
        return contributions[tenderId][user];
    }
}