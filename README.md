# Blog Content Manager - Data Flow

## 📊 Complete Data Flow Architecture

### Data Source: `blogs.json`
The single source of truth for all blog data. Structure:
```json
{
  "blogs": [
    {
      "id": 1770146531534,
      "title": "Blog Title",
      "completed": true,
      "scheduledDate": "2026-02-10",
      "createdAt": "2026-02-03T19:22:11.534Z"
    }
  ],
  "lastSync": "2026-02-03T20:05:39.549Z",
  "totalBlogs": 25
}
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Initial Page Load                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  Check localStorage  │
                   └─────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
         Has Data?                     No Data?
                │                           │
                ▼                           ▼
    ┌────────────────────┐      ┌──────────────────┐
    │ Load from          │      │ Load from        │
    │ localStorage       │      │ blogs.json       │
    └────────────────────┘      └──────────────────┘
                │                           │
                │                           ▼
                │                ┌──────────────────┐
                │                │ Save to          │
                │                │ localStorage     │
                └────────────────┴──────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │   Render UI          │
                   │   - Blog List        │
                   │   - Calendar         │
                   └─────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    User Makes Changes                        │
│  (Add, Edit, Delete, Complete, Schedule blogs)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  Update this.blogs   │
                   └─────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  Save to             │
                   │  localStorage        │
                   └─────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  Re-render UI        │
                   │  - Blog List         │
                   │  - Calendar          │
                   └─────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  Sync to GitHub (Manual)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  Read from           │
                   │  localStorage        │
                   └─────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  Create backup in    │
                   │  blogs_backup        │
                   └─────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  Push to GitHub      │
                   │  repos/.../blogs.json│
                   └─────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Import from JSON (Manual)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  Read blogs.json     │
                   └─────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  Replace all data    │
                   │  in this.blogs       │
                   └─────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  Save to localStorage│
                   └─────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  Re-render UI        │
                   └─────────────────────┘
```

## 🔄 Operations & Data Persistence

### All operations that save to localStorage:

1. **Add Blog** → `saveBlogs()` → localStorage
2. **Edit Blog** → `saveBlogs()` → localStorage
3. **Delete Blog** → `saveBlogs()` → localStorage
4. **Toggle Complete** → `saveBlogs()` → localStorage
5. **Schedule Blog** (Auto-Schedule 30) → `saveBlogs()` → localStorage
6. **Unschedule Blog** → `saveBlogs()` → localStorage
7. **Import from JSON** → `saveBlogs()` → localStorage
8. **Bulk Upload** → `saveBlogs()` → localStorage

### Calendar Integration

The calendar reads from `this.blogs` array and displays:
- **scheduledDate**: Shows blogs on specific dates
- **completed**: Shows strikethrough style for completed blogs
- All calendar operations modify the same `this.blogs` array
- All changes are saved to localStorage immediately

## 🎯 Key Points

1. **localStorage** = Working copy (always up to date)
2. **blogs.json** = Initial data source & GitHub sync target
3. **All edits** save to localStorage immediately
4. **GitHub sync** reads from localStorage and pushes to GitHub
5. **Import** overwrites localStorage with blogs.json data
6. **Calendar scheduling** is part of the blog object (`scheduledDate` property)

## 🛠️ Manual Operations

### Clear All Data
```javascript
localStorage.clear();
location.reload();
```

### Force Reload from blogs.json
Click "🔄 Import from JSON" button

### Backup Data
Automatically created before each GitHub sync in `blogs_backup`

### Export Data
Use browser console:
```javascript
console.log(localStorage.getItem('blogs'));
```
