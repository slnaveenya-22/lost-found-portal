require('dotenv').config();
const db = require('./db');

(async () => {
  console.log("🚀 Starting Claim Approval Simulation...\n");

  try {
    // 1. FIND A CLAIM
    const [claims] = await db.query(`
      SELECT c.id, c.match_id, c.found_item_id, c.claimant_id, 
             fi.status AS found_status, 
             l.id AS lost_id, l.status AS lost_status
      FROM claims c
      LEFT JOIN found_items fi ON fi.id = c.found_item_id
      LEFT JOIN matches m ON m.id = c.match_id
      LEFT JOIN lost_items l ON l.id = m.lost_item_id
      WHERE c.status = 'Pending'
      LIMIT 1
    `);

    if (claims.length === 0) {
      console.log("⚠️ No Pending claims found in the database.");
      console.log("Please create a claim via the UI first, then run this script.");
      process.exit(0);
    }

    const claim = claims[0];
    console.log("📋 Found Pending Claim:");
    console.log(`   Claim ID: ${claim.id}`);
    console.log(`   Match ID: ${claim.match_id || 'NULL (Direct Claim)'}`);
    console.log(`   Found Item ID: ${claim.found_item_id} (Status: ${claim.found_status})`);
    console.log(`   Lost Item ID: ${claim.lost_id || 'N/A'} (Status: ${claim.lost_status || 'N/A'})`);

    if (!claim.match_id) {
      console.log("\n❌ CRITICAL BUG IDENTIFIED:");
      console.log("   This claim has NO match_id. It was created as a 'Direct Claim'.");
      console.log("   Because it has no match_id, the backend CANNOT find the Lost Item to update it.");
    }

    // 2. SIMULATE APPROVAL (The exact logic from adminRoutes.js)
    console.log("\n⏳ Simulating Admin Approval...");
    
    // A. Update Claim
    await db.query(`UPDATE claims SET status = 'Approved', reviewed_by = 1 WHERE id = ?`, [claim.id]);
    console.log("   ✅ Claim updated to Approved");

    // B. Update Found Item
    await db.query(`UPDATE found_items SET status = 'Returned' WHERE id = ?`, [claim.found_item_id]);
    console.log("   ✅ Found Item updated to Returned");

    // C. Update Lost Item (IF matched)
    if (claim.match_id && claim.lost_id) {
      await db.query(`UPDATE matches SET status = 'Claimed' WHERE id = ?`, [claim.match_id]);
      await db.query(`UPDATE lost_items SET status = 'Returned' WHERE id = ?`, [claim.lost_id]);
      console.log("   ✅ Match updated to Claimed");
      console.log("   ✅ Lost Item updated to Returned");
    } else {
      console.log("   ⚠️ Skipped Lost Item update because match_id or lost_id is missing.");
    }

    // 3. VERIFY RESULTS
    console.log("\n🔍 Verifying Final Database State...");
    const [finalFound] = await db.query(`SELECT status FROM found_items WHERE id = ?`, [claim.found_item_id]);
    console.log(`   Found Item Status: ${finalFound[0].status}`);

    if (claim.lost_id) {
      const [finalLost] = await db.query(`SELECT status FROM lost_items WHERE id = ?`, [claim.lost_id]);
      console.log(`   Lost Item Status:  ${finalLost[0].status}`);
      
      if (finalLost[0].status !== 'Returned') {
        console.log("   ❌ BUG CONFIRMED: The lost item did not update.");
      }
    } else {
      console.log(`   ❌ BUG CONFIRMED: We don't know which lost item to update.`);
    }

  } catch (err) {
    console.error("❌ Error during simulation:", err);
  } finally {
    process.exit(0);
  }
})();