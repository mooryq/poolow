const fs = require('fs');

// Read the existing JSON file
const pools = JSON.parse(fs.readFileSync('poolsBefore.json', 'utf8'));

// Add an id to each pool using the array index (or any other logic)
const updatedPools = pools.map((pool, index) => ({
  id: index + 1,
  ...pool
}));

// Write the updated array back to a new JSON file
fs.writeFileSync('pools-updated.json', JSON.stringify(updatedPools, null, 2));
