// Test UUID Format
// ================

// Test function to validate UUID format
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Test cases
const testCases = [
  "1760708186186", // Invalid - timestamp
  "1760708188524", // Invalid - timestamp  
  "1760708272601", // Invalid - timestamp
  "1760708277953", // Invalid - timestamp
  "550e8400-e29b-41d4-a716-446655440000", // Valid UUID
  "123e4567-e89b-12d3-a456-426614174000", // Valid UUID
  "invalid-uuid", // Invalid
  null, // Invalid
  undefined, // Invalid
  "", // Invalid
];

console.log("🧪 Testing UUID Format Validation:");
console.log("=================================");

testCases.forEach((testCase, index) => {
  const isValid = isValidUUID(testCase);
  const status = isValid ? "✅ VALID" : "❌ INVALID";
  console.log(`${index + 1}. "${testCase}" -> ${status}`);
});

console.log("\n🔧 Solution:");
console.log("===========");
console.log("1. Validate tripId before sending to database");
console.log("2. Use null if tripId is not a valid UUID");
console.log("3. Generate proper UUID for new trips");

// Example of how to fix the issue
function safeTripId(tripId) {
  if (!tripId || !isValidUUID(tripId)) {
    console.log(`⚠️  Invalid tripId: "${tripId}" - using null instead`);
    return null;
  }
  return tripId;
}

console.log("\n🧪 Testing safeTripId function:");
console.log("===============================");
testCases.forEach((testCase, index) => {
  const safeId = safeTripId(testCase);
  console.log(`${index + 1}. "${testCase}" -> "${safeId}"`);
});
