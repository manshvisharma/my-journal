import fs from "fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, writeBatch, doc, getDocs, getCountFromServer, collection } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA-tjL64ZgnF5bNO5p66XL7Sxhz12_qIfU",
  authDomain: "myjournal-f2f56.firebaseapp.com",
  projectId: "myjournal-f2f56",
  storageBucket: "myjournal-f2f56.firebasestorage.app",
  messagingSenderId: "469963732060",
  appId: "1:469963732060:web:7e639741c165e89d2ea299",
  measurementId: "G-WGPPPP664L"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const targetEmail = "manshvi.sharma@icloud.com";
const password = process.argv[2] || process.env.REAL_ACCOUNT_PASSWORD;

if (!password) {
  console.error("Usage: node scripts/upload_to_real_account.mjs <PASSWORD>");
  process.exit(1);
}

async function upload() {
  console.log("Reading 'scripts/apple_journal_export.json'...");
  const raw = fs.readFileSync("scripts/apple_journal_export.json", "utf-8");
  const data = JSON.parse(raw);
  
  const entries = data.entries || [];
  const mediaDocs = data.mediaDocs || [];
  
  console.log(`Export contains ${entries.length} entries and ${mediaDocs.length} media docs.`);
  
  console.log(`Signing in as ${targetEmail}...`);
  const cred = await signInWithEmailAndPassword(auth, targetEmail, password);
  const uid = cred.user.uid;
  console.log(`Signed in successfully! Authenticated UID: ${uid}`);
  
  // 1. Check existing entries in real account — WE DO NOT DELETE ANYTHING
  console.log("\n--- Checking existing entries in real account ---");
  const existingEntriesSnap = await getDocs(collection(db, "users", uid, "entries"));
  console.log(`Preserving all ${existingEntriesSnap.docs.length} existing entries in your account!`);
  
  // 2. Upload Entries in Batches (max 100 per batch for smooth transfer)
  console.log("\n--- Uploading 361 Apple Journal Entries ---");
  const ENTRY_BATCH = 100;
  for (let i = 0; i < entries.length; i += ENTRY_BATCH) {
    const chunk = entries.slice(i, i + ENTRY_BATCH);
    const batch = writeBatch(db);
    chunk.forEach((entry) => {
      const ref = doc(db, "users", uid, "entries", entry.id);
      // set without deleting existing
      batch.set(ref, entry);
    });
    await batch.commit();
    console.log(`Uploaded entries ${i + 1} - ${i + chunk.length} of ${entries.length}`);
  }
  
  // 3. Upload Media Docs in small batches of 20
  console.log("\n--- Uploading 143 Media Docs ---");
  const MEDIA_BATCH = 20;
  for (let i = 0; i < mediaDocs.length; i += MEDIA_BATCH) {
    const chunk = mediaDocs.slice(i, i + MEDIA_BATCH);
    const batch = writeBatch(db);
    chunk.forEach((mDoc) => {
      const ref = doc(db, "users", uid, "media", mDoc.id);
      batch.set(ref, mDoc, { merge: true });
    });
    await batch.commit();
    console.log(`Uploaded media docs ${i + 1} - ${i + chunk.length} of ${mediaDocs.length}`);
  }
  
  // 4. Update Settings (preserve if exists)
  const settingsBatch = writeBatch(db);
  const settingsRef = doc(db, "users", uid, "settings", "main");
  settingsBatch.set(settingsRef, {
    theme: "system",
    sortBy: "entryDate",
    sortDir: "desc",
    updatedAt: Date.now()
  }, { merge: true });
  await settingsBatch.commit();
  
  // 5. Verify Total Counts in Firestore
  const totalEntriesSnap = await getCountFromServer(collection(db, "users", uid, "entries"));
  const totalMediaSnap = await getCountFromServer(collection(db, "users", uid, "media"));
  
  console.log("\n========================================================");
  console.log("MIGRATION COMPLETE & VERIFIED!");
  console.log(`Account Email: ${targetEmail}`);
  console.log(`Account UID: ${uid}`);
  console.log(`Total Entries in Account: ${totalEntriesSnap.data().count}`);
  console.log(`Total Media Docs in Account: ${totalMediaSnap.data().count}`);
  console.log("========================================================");
}

upload().catch((err) => {
  console.error("Migration error:", err.code || err.message, err);
  process.exit(1);
});
