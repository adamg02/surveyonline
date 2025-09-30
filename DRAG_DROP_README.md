# Drag and Drop Reordering Implementation

## Overview
The survey builder now supports drag and drop reordering for questions using the `@dnd-kit` library, which is a modern, lightweight, and accessible drag and drop library for React.

## Features Implemented

### 1. Question Reordering
- **Drag Handle**: Each question has a visual drag handle (⋮⋮) on the left side
- **Visual Feedback**: Questions show opacity changes and cursor changes during drag
- **Smooth Animations**: Questions animate smoothly when reordered
- **Keyboard Support**: Full keyboard navigation support for accessibility

### 2. Library Choice
- **@dnd-kit/core**: Core drag and drop functionality
- **@dnd-kit/sortable**: Sortable list utilities
- **@dnd-kit/utilities**: CSS transform utilities

Replaced the deprecated `react-beautiful-dnd` with the modern `@dnd-kit` ecosystem.

### 3. Accessibility Features
- Keyboard navigation support
- Screen reader compatible
- Focus management
- ARIA attributes maintained

### 4. Visual Design
- Consistent with existing UI design
- CSS classes instead of inline styles
- Responsive drag handle
- Visual feedback during dragging

## How It Works

### 1. DndContext
Wraps the entire sortable list and handles:
- Collision detection using `closestCenter`
- Sensor configuration for mouse/pointer and keyboard
- Drag end event handling

### 2. SortableContext
Provides the sortable behavior:
- Vertical list sorting strategy
- Item identification using unique IDs
- Order management

### 3. SortableQuestion Component
Each question is wrapped in a sortable component that:
- Provides drag handle with `useSortable` hook
- Applies CSS transforms for smooth animations
- Maintains question state during reordering

### 4. State Management
- Questions have unique IDs for tracking
- Order is maintained in the `order` property
- Array reordering uses `arrayMove` utility
- State updates are immutable

## Usage

1. **Add Questions**: Click "Add Question" to create new questions
2. **Drag to Reorder**: Click and drag the ⋮⋮ handle to reorder questions
3. **Keyboard Navigation**: Use keyboard shortcuts for accessibility
4. **Visual Feedback**: Questions show opacity and cursor changes during drag

## Code Structure

```typescript
// Main drag and drop context
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
>
  <SortableContext 
    items={questions.map(q => q.id)} 
    strategy={verticalListSortingStrategy}
  >
    {questions.map((q, idx) => (
      <SortableQuestion key={q.id} ... />
    ))}
  </SortableContext>
</DndContext>
```

## CSS Classes

- `.drag-handle`: Styling for the drag handle
- `.drag-handle.dragging`: Active dragging state
- `.question-content`: Main question content area
- `.delete-question-btn`: Delete button positioning

## Testing

1. Open the survey builder
2. Add multiple questions
3. Drag questions up and down using the handle
4. Verify order is maintained when saving
5. Test keyboard navigation
6. Verify accessibility with screen readers

## Benefits

- **Modern**: Uses current best practices and maintained libraries
- **Accessible**: Full keyboard and screen reader support
- **Performant**: Lightweight with smooth animations
- **Maintainable**: Clean code structure with proper TypeScript types
- **Consistent**: Follows existing UI patterns and styling