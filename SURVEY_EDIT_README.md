# Survey Editing Feature

This document describes the survey editing functionality added to SurveyOnline.

## Overview

Administrators can now edit DRAFT surveys to modify questions, options, settings, and structure before activating them for responses.

## Features

### ✅ What Can Be Edited
- Survey title and description
- Question text and types
- Question order (via drag & drop)
- Question required/optional settings
- Question options and open items
- Option order (via drag & drop)
- Exclusive settings for multi-open-end questions

### ✅ Edit Interface
- **Drag & Drop Reordering**: Questions and options can be reordered using intuitive drag handles
- **Add/Remove Elements**: Dynamically add or remove questions, options, and open items
- **Real-time Validation**: Immediate feedback on required fields and constraints
- **Consistent UI**: Same interface as survey creation for familiar experience

### ✅ Safety & Constraints
- **Draft-Only Editing**: Only DRAFT surveys can be edited (ACTIVE/CLOSED are read-only)
- **Complete Replacement**: Editing replaces all questions to ensure data consistency
- **Transaction Safety**: Database operations are wrapped in transactions
- **Validation**: Full validation on both client and server side

## User Interface

### Edit Button Location
- Appears next to "Activate" button for DRAFT surveys
- Only visible to ADMIN users
- Positioned prominently in the survey list

### Edit Flow
1. **Access**: Click "Edit" button on any DRAFT survey
2. **Load**: Survey data loads automatically into the editor
3. **Modify**: Make changes using the full-featured editor interface
4. **Save**: Click "Update Survey" to save changes
5. **Return**: Automatically returns to survey list on completion

### Visual Indicators
- Loading state while fetching survey data
- Clear distinction between "Create" and "Edit" modes
- Progress feedback during save operations
- Error messages for validation issues

## Technical Implementation

### Backend API
- **Endpoint**: `PUT /api/surveys/:id`
- **Authentication**: Requires ADMIN role
- **Validation**: Full survey schema validation
- **Status Check**: Ensures survey is in DRAFT status
- **Transaction**: Atomic update with complete question replacement

### Frontend Components
- **SurveyEditor**: New component supporting both create and edit modes
- **Shared Logic**: Reuses SurveyBuilder drag & drop functionality
- **State Management**: Loads existing survey data for editing
- **Error Handling**: Comprehensive error states and user feedback

### Database Operations
```sql
-- Transaction ensures atomicity
BEGIN;
  DELETE FROM options WHERE questionId IN (survey_questions);
  DELETE FROM openItems WHERE questionId IN (survey_questions);
  DELETE FROM questions WHERE surveyId = survey_id;
  UPDATE survey SET title, description WHERE id = survey_id;
  INSERT INTO questions (survey_data);
COMMIT;
```

## Usage Examples

### Editing a Survey
1. Navigate to survey list
2. Find a DRAFT survey
3. Click "Edit" button
4. Make desired changes:
   - Modify question text
   - Add/remove options
   - Reorder questions by dragging
   - Change question types
5. Click "Update Survey"
6. Survey updates and returns to list

### Common Edit Operations
- **Add Question**: Click "Add Question" button
- **Delete Question**: Click "Delete" button on question card
- **Reorder Questions**: Drag question using the ⋮⋮ handle
- **Edit Options**: Modify text in option inputs
- **Add Options**: Click "Add Option" in options section
- **Reorder Options**: Drag options using their ⋮⋮ handles

## Validation Rules

### Survey Level
- Title is required and non-empty
- At least one question is required

### Question Level
- Question text is required and non-empty
- Choice questions (Single, Multi, Ranking) need at least one option
- Multi Open End questions need at least one open item

### Option Level
- Option text is required and non-empty
- Order is automatically managed during drag operations

## Error Handling

### Client-Side Validation
- Real-time validation feedback
- Required field highlighting
- Comprehensive error messages
- Prevention of invalid submissions

### Server-Side Protection
- Status verification (DRAFT only)
- Complete schema validation
- Transaction rollback on errors
- Detailed error responses

### User Experience
- Loading states during operations
- Clear error messaging
- Recovery suggestions
- Consistent feedback patterns

## Accessibility

### Keyboard Navigation
- Tab order follows logical flow
- All interactive elements are keyboard accessible
- Drag operations support keyboard alternatives

### Screen Reader Support
- Proper ARIA labels and roles
- Descriptive error messages
- Logical heading structure
- Form field associations

## Future Enhancements

### Potential Improvements
- **Partial Updates**: Allow editing individual questions without full replacement
- **Version History**: Track and show edit history
- **Collaborative Editing**: Multiple admin users editing simultaneously
- **Autosave**: Periodic saving of draft changes
- **Undo/Redo**: Operation history with rollback capability
- **Templates**: Save common question patterns as reusable templates

### Performance Optimizations
- **Optimistic Updates**: Update UI before server confirmation
- **Delta Updates**: Send only changed data to server
- **Caching**: Cache survey data for faster editing
- **Lazy Loading**: Load large surveys progressively