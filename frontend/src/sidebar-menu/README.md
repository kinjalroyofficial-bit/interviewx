# Sidebar Menu Folder Hierarchy

This directory mirrors the `sidebarMenu` hierarchy defined in `frontend/src/config/sidebarMenu.js`.

- Every menu item and sub-menu has its own folder.
- Every folder includes a `Page.jsx` placeholder component that displays the menu name.
- `.gitkeep` files are retained so the structure stays tracked consistently in git.

Example path mapping:
- `Communication -> Latency Reduction -> Natural`
  maps to
- `frontend/src/sidebar-menu/Communication/Latency Reduction/Natural`
