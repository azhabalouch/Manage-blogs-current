Role: You are a Senior Full-Stack Web Developer specializing in static site generation and CSS.

Task: Build a "Blog Content Manager" application. The app must be local-first but capable of syncing with GitHub. Follow the phased approach below. Do not move to the next part until I give the "PROCEED" command.
Phase 1: Core CRUD & GitHub Sync

    UI: Create a clean dashboard with a list view for blog titles.

    CRUD: Users can Add, Edit, and Delete blog names.

    GitHub Integration: > * Add a "Settings" modal to input a GitHub Personal Access Token, Repository Name, and Branch.

        Add a "Sync to GitHub" button that pushes the current list of blogs as a JSON to the specified repo.

    Example: If I add "10 Tips for SEO," clicking sync should create/update blogs.json in my repo.

Phase 2: Bulk Upload & Status Tracking

    Title Extraction: Create a "Bulk Upload" zone (drag & drop). When multiple files are dropped, the app must parse the files name as title to add to the list.

    Completion Toggle: Each blog entry needs a checkbox. When checked, the blog title should have a line-through style (strikethrough) to indicate it has been successfully uploaded to the CMS/Web.

    Example: Uploading how-to-cook.md should automatically add "How to Cook" to my list.

Phase 3: Smart Scheduler & Calendar

    Calendar View: Integrate a Daily/Weekly/Monthly calendar toggle (e.g., using react-calendar or a custom grid).

    Standard Schedule: By default, show a schedule where 2 blogs are assigned per day.

    The "Auto-Schedule 30" Button: Create a "Power Schedule" feature. When clicked, it takes the next 30 "pending" blogs from the list and automatically distributes them across the next 30 days (1 per day) or fills gaps in the current month.

For now, Use blogshave and uploaded txt file list.