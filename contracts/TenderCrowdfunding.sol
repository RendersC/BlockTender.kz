// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RewardToken.sol";

contract TenderCrowdfunding {

    /*//////////////////////////////////////////////////////////////
                               ENUMS
    //////////////////////////////////////////////////////////////*/
    enum Role { USER, ADMIN }

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
    uint256 public subscriptionPrice = 0.5 ether;
    address public owner;
    RewardToken public rewardToken;

    mapping(uint256 => Tender) public tenders;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(uint256 => address[]) public participants;
    mapping(address => Role) public roles;
    mapping(address => uint256) public subscriptionExpiry;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/
    event TenderCreated(uint256 indexed tenderId, address indexed organizer);
    event Contributed(uint256 indexed tenderId, address indexed contributor, uint256 amount);
    event TenderFinalized(uint256 indexed tenderId);
    event Refunded(uint256 indexed tenderId, address indexed user, uint256 amount);
    event RoleAssigned(address indexed user, Role role);
    event SubscriptionPurchased(address indexed user, uint256 expiry);
    event SubscriptionPriceUpdated(uint256 newPrice);

    /*//////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    constructor(address _rewardToken) {
        rewardToken = RewardToken(_rewardToken);
        owner = msg.sender;
        roles[msg.sender] = Role.ADMIN;  // Set deployer as admin
    }

    /*//////////////////////////////////////////////////////////////
                            MODIFIERS
    //////////////////////////////////////////////////////////////*/
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAdmin() {
        require(roles[msg.sender] == Role.ADMIN, "Only admin");
        _;
    }

    modifier onlySubscribed() {
        require(subscriptionExpiry[msg.sender] > block.timestamp, "Subscription expired");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                        CREATE TENDER (CAMPAIGN)
    //////////////////////////////////////////////////////////////*/
    function createTender(
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _duration
    ) external onlyAdmin {
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
        
        // Check subscription: admins don't need subscription, users do
        if (roles[msg.sender] != Role.ADMIN) {
            require(subscriptionExpiry[msg.sender] > block.timestamp, "Subscription expired");
        }

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
                        SUBSCRIPTION MANAGEMENT
    //////////////////////////////////////////////////////////////*/
    function buySubscription() external payable {
        require(msg.value == subscriptionPrice, "Incorrect amount");
        subscriptionExpiry[msg.sender] = block.timestamp + 365 days;
        emit SubscriptionPurchased(msg.sender, subscriptionExpiry[msg.sender]);
    }

    function hasActiveSubscription(address user) external view returns (bool) {
        return subscriptionExpiry[user] > block.timestamp;
    }

    function getSubscriptionExpiry(address user) external view returns (uint256) {
        return subscriptionExpiry[user];
    }

    /*//////////////////////////////////////////////////////////////
                            ROLE MANAGEMENT
    //////////////////////////////////////////////////////////////*/
    function assignRole(address user, Role role) external onlyOwner {
        roles[user] = role;
        emit RoleAssigned(user, role);
    }

    function getRole(address user) external view returns (uint8) {
        return uint8(roles[user]);  // 0 = USER, 1 = ADMIN
    }

    function isAdmin(address user) external view returns (bool) {
        return roles[user] == Role.ADMIN;
    }

    /*//////////////////////////////////////////////////////////////
                            OWNER FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function setSubscriptionPrice(uint256 newPrice) external onlyOwner {
        subscriptionPrice = newPrice;
        emit SubscriptionPriceUpdated(newPrice);
    }

    function withdrawFunds() external onlyOwner {
        (bool success, ) = payable(owner).call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
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