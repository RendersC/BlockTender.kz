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
    struct Bid {
        address bidder;
        uint256 price;      // in wei
        uint256 quality;    // 0-100
        uint256 daysRequired;
        uint256 timestamp;
    }

    struct Tender {
        uint256 id;
        string title;
        string description;
        uint256 goal;          // not used in bidding, but kept for history
        uint256 deadline;      // timestamp
        address organizer;     // creator
        bool finalized;        // finalized or not
        address winner;        // selected winner after finalization
        uint256 winningBidIndex;  // index of winning bid
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    uint256 public tenderCount;
    uint256 public subscriptionPrice = 0.5 ether;
    address public owner;
    RewardToken public rewardToken;

    mapping(uint256 => Tender) public tenders;
    mapping(uint256 => Bid[]) public bids;  // tenderId => array of bids
    mapping(address => Role) public roles;
    mapping(address => uint256) public subscriptionExpiry;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/
    event TenderCreated(uint256 indexed tenderId, address indexed organizer);
    event BidSubmitted(uint256 indexed tenderId, address indexed bidder, uint256 price, uint256 quality, uint256 daysRequired);
    event TenderFinalized(uint256 indexed tenderId, address indexed winner, uint256 winningPrice);
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
            winner: address(0),
            winningBidIndex: 0
        });

        emit TenderCreated(tenderCount, msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                            SUBMIT BID
    //////////////////////////////////////////////////////////////*/
    function submitBid(
        uint256 tenderId,
        uint256 price,
        uint256 quality,
        uint256 daysRequired
    ) external {
        Tender storage t = tenders[tenderId];

        require(block.timestamp < t.deadline, "Tender ended");
        require(!t.finalized, "Tender finalized");
        require(price > 0, "Price must be > 0");
        require(quality >= 0 && quality <= 100, "Quality must be 0-100");
        require(daysRequired > 0 && daysRequired <= 365, "Days must be 1-365");
        
        // Check subscription: admins don't need subscription, users do
        if (roles[msg.sender] != Role.ADMIN) {
            require(subscriptionExpiry[msg.sender] > block.timestamp, "Subscription expired");
        }

        // Submit bid (no payment required)
        bids[tenderId].push(Bid({
            bidder: msg.sender,
            price: price,
            quality: quality,
            daysRequired: daysRequired,
            timestamp: block.timestamp
        }));

        emit BidSubmitted(tenderId, msg.sender, price, quality, daysRequired);
    }

    /*//////////////////////////////////////////////////////////////
                            FINALIZE & SELECT WINNER
    //////////////////////////////////////////////////////////////*/
    function calculateScore(uint256 price, uint256 quality, uint256 daysRequired) 
        internal pure returns (uint256) 
    {
        // score = (1000 ether - price) * 50 + quality * 30 + (365 - daysRequired) * 20
        uint256 maxPrice = 1000 ether;
        
        uint256 priceScore = 0;
        if (price < maxPrice) {
            priceScore = (maxPrice - price) / 1e16 * 50;  // normalize price to basis points
        }
        
        uint256 qualityScore = quality * 30;
        uint256 timeScore = (365 - daysRequired) * 20;
        
        return priceScore + qualityScore + timeScore;
    }

    function finalizeTender(uint256 tenderId) external {
        Tender storage t = tenders[tenderId];

        require(msg.sender == t.organizer, "Only organizer");
        require(block.timestamp >= t.deadline, "Too early");
        require(!t.finalized, "Already finalized");
        require(bids[tenderId].length > 0, "No bids received");

        // Find winner with highest score
        uint256 maxScore = 0;
        uint256 winnerIndex = 0;

        for (uint256 i = 0; i < bids[tenderId].length; i++) {
            Bid storage b = bids[tenderId][i];
            uint256 score = calculateScore(b.price, b.quality, b.daysRequired);
            
            if (score > maxScore) {
                maxScore = score;
                winnerIndex = i;
            }
        }

        Bid storage winningBid = bids[tenderId][winnerIndex];
        t.winner = winningBid.bidder;
        t.winningBidIndex = winnerIndex;
        t.finalized = true;

        // Mint reward tokens to winner
        uint256 rewardAmount = 1000 * 10 ** 18;  // 1000 RWT to winner
        rewardToken.mint(t.winner, rewardAmount);

        emit TenderFinalized(tenderId, t.winner, winningBid.price);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW HELPERS
    //////////////////////////////////////////////////////////////*/
    function getBids(uint256 tenderId) external view returns (Bid[] memory) {
        return bids[tenderId];
    }

    function getBidCount(uint256 tenderId) external view returns (uint256) {
        return bids[tenderId].length;
    }

    function getWinner(uint256 tenderId) external view returns (address) {
        return tenders[tenderId].winner;
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

}