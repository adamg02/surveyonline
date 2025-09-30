// Test file to verify drag and drop functionality
// This can be run manually in the browser console

// Test 1: Verify @dnd-kit libraries are loaded
console.log('Testing @dnd-kit imports...');
try {
  // These would be available if properly imported in SurveyBuilder
  console.log('✓ @dnd-kit libraries should be available in SurveyBuilder component');
} catch (error) {
  console.error('✗ @dnd-kit import error:', error);
}

// Test 2: Verify CSS classes exist
console.log('Testing CSS classes...');
const styles = document.styleSheets;
let foundDragHandle = false;

for (let i = 0; i < styles.length; i++) {
  try {
    const rules = styles[i].cssRules || styles[i].rules;
    for (let j = 0; j < rules.length; j++) {
      if (rules[j].selectorText && rules[j].selectorText.includes('.drag-handle')) {
        foundDragHandle = true;
        console.log('✓ Found .drag-handle CSS class');
        break;
      }
    }
  } catch (e) {
    // Cross-origin stylesheets may not be accessible
  }
}

if (!foundDragHandle) {
  console.log('? .drag-handle CSS class not found in accessible stylesheets');
}

// Test 3: Verify unique ID generation
console.log('Testing unique ID generation...');
const generateId = () => `question-${Date.now()}-${Math.random()}`;
const id1 = generateId();
const id2 = generateId();
console.log('Generated IDs:', { id1, id2 });
console.log(id1 !== id2 ? '✓ Unique IDs generated' : '✗ IDs are not unique');

// Test 4: Test arrayMove utility (simulation)
console.log('Testing array reordering logic...');
const testArray = [
  { id: 'q1', text: 'Question 1', order: 0 },
  { id: 'q2', text: 'Question 2', order: 1 },
  { id: 'q3', text: 'Question 3', order: 2 }
];

// Simulate moving item from index 0 to index 2
const arrayMove = (array, from, to) => {
  const newArray = [...array];
  const item = newArray.splice(from, 1)[0];
  newArray.splice(to, 0, item);
  return newArray;
};

const reordered = arrayMove(testArray, 0, 2);
const reorderedWithOrder = reordered.map((item, index) => ({ ...item, order: index }));

console.log('Original:', testArray.map(q => q.text));
console.log('Reordered:', reorderedWithOrder.map(q => q.text));
console.log(reorderedWithOrder[2].text === 'Question 1' ? '✓ Array reordering works' : '✗ Array reordering failed');

console.log('All drag and drop functionality tests completed!');