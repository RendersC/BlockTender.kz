# BlockTender Testing Checklist

## System Summary
✅ **Completed Rewrite** - Complete unified architecture with centralized state management

### Architecture
- **shared.js** (446 lines) - Central state management for ALL pages
- **admin.js** (191 lines) - Admin panel functionality
- **tender.js** (156 lines) - Tender details page
- **4 HTML pages** - index.html, create.html, admin.html, tender.html

### Key Changes Made
1. ✅ Removed all duplicate code (deleted app.js)
2. ✅ Centralized wallet initialization in shared.js
3. ✅ Proper role checking (userRole === 1 for ADMIN)
4. ✅ Synchronized sidebars across all pages (no "My Tenders")
5. ✅ Event listener pattern for all buttons
6. ✅ Proper initialization with contract polling

---

## Testing Steps

### Phase 1: Initial Load
- [ ] Open http://localhost:8000/index.html (or your dev server)
- [ ] Check browser console for errors (F12 → Console tab)
- [ ] Verify "Connect MetaMask" button appears
- [ ] Verify sidebar shows: Tenders | Create Tender | Admin Panel

### Phase 2: Wallet Connection
- [ ] Click "Connect MetaMask" button
- [ ] Approve MetaMask connection request
- [ ] Verify account address shows in top-right corner
- [ ] Check console: should show "✓ Contract ready" message
- [ ] Verify subscription status badge appears

### Phase 3: User Role & Subscription
**For NON-ADMIN user:**
- [ ] Subscription status should show "❌ No Subscription" (red badge)
- [ ] "Create Tender" link should be active/visible
- [ ] Click Create Tender → Should see "⚠️ Access Denied" message
- [ ] Index page should show subscription prompt: "⚠ Active Subscription Required"
- [ ] Button should say "💳 Buy Subscription (0.50 ETH)"

**For ADMIN user:**
- [ ] Subscription status should show "✅ Admin" (green badge or similar)
- [ ] "Create Tender" link should be active/visible
- [ ] Click Create Tender → Should see form (no access denied)
- [ ] Index page should NOT show subscription prompt
- [ ] User can fill tender form and click "🚀 Create Tender"

### Phase 4: Subscription Purchase (Non-Admin Users)
- [ ] Click on subscription banner "💳 Buy Subscription (0.50 ETH)"
- [ ] MetaMask popup should appear asking to confirm 0.5 ETH transaction
- [ ] After confirmation, wait for transaction to complete
- [ ] Page should reload
- [ ] Subscription badge should change to "✅ Active Subscription" (green)
- [ ] "⚠ Active Subscription Required" banner should disappear
- [ ] User should now be able to participate in tenders

### Phase 5: Admin Panel Access
- [ ] Click "Admin Panel" menu item
- [ ] **Non-Admin users:** Should see "❌ Access Denied — Only administrators can access"
- [ ] **Admin users:** Should see 3 sections:
  1. 🛡️ Manage Roles
  2. 💳 Subscription Settings  
  3. (Other admin functions)

### Phase 6: Admin Functions
**Manage Roles:**
- [ ] Enter test wallet address in "User Address" field
- [ ] Select role from dropdown (User or Admin)
- [ ] Click "✓ Assign Role" button
- [ ] MetaMask should ask to confirm transaction
- [ ] After confirmation, role should be assigned

**Check Role:**
- [ ] Enter wallet address in "Check User Role" field
- [ ] Click "🔍 Check Role" button
- [ ] Should display user's current role (0 = User, 1 = Admin)

**Update Subscription Price:**
- [ ] Current price should show as loaded value
- [ ] Enter new price (e.g., 0.75 in ETH)
- [ ] Click "💰 Update Price"
- [ ] MetaMask confirms transaction
- [ ] New price should be updated

### Phase 7: Create Tender (Admin Only)
1. [ ] Click "Create Tender" menu
2. [ ] Fill form:
   - Title: "Test Road Repair"
   - Description: "Description of project..."
   - Goal: 5 (ETH)
   - Duration: 7 (days)
3. [ ] Click "🚀 Create Tender"
4. [ ] MetaMask confirms transaction
5. [ ] Check console for success message: "✓ Tender created"

### Phase 8: Tender List & Details
**Index Page:**
- [ ] Tenders should load and display
- [ ] Should show: Title, Description, Goal, Raised, Status
- [ ] Click on tender → Navigate to tender.html?id=X

**Tender Details Page:**
- [ ] Should show full tender information
- [ ] "Contribute" section should be visible
- [ ] Enter amount (e.g., 0.1 ETH) and click "Contribute"
- [ ] **If user has no subscription:** Should show error "You need an active subscription"
- [ ] **If user is admin or has subscription:** Transaction should process
- [ ] Check MetaMask confirmation
- [ ] Tender raised amount should update

### Phase 9: Tender Finalization
**As Organizer (after deadline):**
- [ ] Go to tender details page
- [ ] "Finalize Tender" button should appear if:
  - You are the organizer
  - Tender is not finalized
  - Deadline has passed
- [ ] Click "Finalize Tender"
- [ ] MetaMask confirms
- [ ] Status should change to "Finalized"

### Phase 10: Refund (After Finalized)
**As Contributor:**
- [ ] Go to finalized tender where you contributed
- [ ] "Request Refund" button should appear
- [ ] Click and confirm in MetaMask
- [ ] Refund should be processed

---

## Expected Console Messages

### On Page Load
```
✓ ABI loaded
Connecting to MetaMask...
✓ Connected to Ethereum
User role: USER (or ADMIN)
User has subscription: false (or true)
✓ Contract ready
```

### On Create Tender
```
Creating tender...
Tender created successfully
✓ Tender details loaded
```

### On Contribute
```
Contributing...
Contribution successful!
```

---

## Troubleshooting

### "Contract is not defined"
- Check that shared.js is loaded BEFORE page-specific JS
- Verify ethers.js CDN link is working
- Check console for ABI loading errors

### "Not an admin" but user is admin
- User role should be 1, not "1" (string)
- Verify contract.getRole() returns number 1
- Check that roleNum === 1 comparison in admin.js

### Sidebar shows different items on different pages
- All pages should have identical sidebar HTML
- Verify create.html, admin.html, tender.html sidebar sections match index.html

### Buttons don't respond
- Ensure contract is initialized (check console for "✓ Contract ready")
- Verify button IDs match in HTML and JS code
- Check for JavaScript errors in console (F12)

### Transaction not confirming
- Check MetaMask is connected to correct network (Sepolia/Mainnet)
- Verify you have enough ETH for gas fees
- Check contract address matches deployed contract

---

## File Structure
```
BlockTender.kz/
├── abi/
│   ├── TenderCrowdfunding.json
│   └── RewardToken.json
├── contracts/
│   ├── TenderCrowdfunding.sol
│   └── RewardToken.sol
└── frontend/
    ├── shared.js ⭐ CENTRAL STATE MANAGEMENT
    ├── admin.js
    ├── tender.js
    ├── pinata.js
    ├── index.html
    ├── create.html
    ├── admin.html
    ├── tender.html
    ├── style.css
    └── TEST_CHECKLIST.md (this file)
```

---

## Known Limitations
- Non-admins cannot view Create Tender form (access denied)
- Admins don't need subscription to participate
- Tender IDs are numbers starting from 0
- All amounts in ETH (automatically converted to wei)

---

## Success Criteria
✅ All tests in this checklist pass without errors
✅ Wallet connects properly
✅ Role-based UI works (admin sees create form, users don't)
✅ Subscription system works (purchase, check status)
✅ Tender creation, contribution, finalization work
✅ No duplicate code across pages
✅ All sidebars synchronized
✅ No JavaScript errors in console
