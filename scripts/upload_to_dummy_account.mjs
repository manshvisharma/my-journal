import fs from "fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, writeBatch, doc, getCountFromServer, collection } from "firebase/firestore";

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

const testEmail = "test-journal-dummy@gmail.com";
const testPassword = "DummyJournal2026!";

async function upload() {
  console.log("Reading 'scripts/apple_journal_export.json'...");
  const raw = fs.readFileSync("scripts/apple_journal_export.json", "utf-8");
  const data = JSON.parse(raw);
  
  const entries = data.entries || [];
  const mediaDocs = data.mediaDocs || [];
  
  console.log(`Found ${entries.length} entries and ${mediaDocs.length} media docs to upload.`);
  
  console.log(`Signing in as ${testEmail}...`);
  const cred = await signInWithEmailAndPassword(auth, testEmail, testPassword);
  const uid = cred.user.uid;
  console.log(`Signed in successfully! UID: ${uid}`);
  
  // 1. Upload Entries in Batches (max 400 operations per batch)
  console.log("\n--- Uploading Entries ---");
  const BATCH_SIZE = 400;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const chunk = entries.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    
    chunk.forEach((entry) => {
      const ref = doc(db, "users", uid, "entries", entry.id);
      batch.set(ref, entry, { merge: true });
    });
    
    await batch.commit();
    console.log(`Uploaded entries ${i + 1} - ${i + chunk.length} of ${entries.length}`);
  }
  
  // 2. Upload Media Docs in Batches
  console.log("\n--- Uploading Media Docs ---");
  for (let i = 0; i < mediaDocs.length; i += BATCH_SIZE) {
    const chunk = mediaDocs.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    
    chunk.forEach((mDoc) => {
      const ref = doc(db, "users", uid, "media", mDoc.id);
      batch.set(ref, mDoc, { merge: true });
    });
    
    await batch.commit();
    console.log(`Uploaded media docs ${i + 1} - ${i + chunk.length} of ${mediaDocs.length}`);
  }
  
  // 3. Set Settings Document
  console.log("\n--- Setting User Settings ---");
  const settingsBatch = writeBatch(db);
  const settingsRef = doc(db, "users", uid, "settings", "main");
  settingsBatch.set(settingsRef, {
    theme: "system",
    sortBy: "entryDate",
    sortDir: "desc",
    updatedAt: Date.now()
  }, { merge: true });
  await settingsBatch.commit();
  console.log("Settings updated successfully.");
  
  // 4. Verify Counts in Firestore
  console.log("\n--- Verifying Firestore Counts ---");
  const entriesCountSnap = await getCountFromServer(collection(db, "users", uid, "entries"));
  const mediaCountSnap = await getCountFromServer(collection(db, "users", uid, "media"));
  
  console.log(`Verified Firestore Entries Count: ${entriesCountSnap.data().count}`);
  console.log(`Verified Firestore Media Count: ${mediaCountSnap.data().count}`);
  
  console.log("\n========================================================");
  console.log("UPLOAD COMPLETE & VERIFIED!");
  console.log(`Account Email: ${testEmail}`);
  console.log(`Account Password: ${testPassword}`);
  console.log(`Account UID: ${uid}`);
  console.log("========================================================");
}

upload().catch((err) => {
  console.error("Upload error:", err);
  process.exit(1);
});
