# Settings → Services, delete and groups (P4 slice 2; feat/settings-services-delete)

- **Delete a service** (`useDeleteService`, `pages/settings-services/ui/delete-service.tsx`; B-Services `askDelete`,
  design §28.6, book Q-210):
  - With upcoming bookings it asks first: «Delete Hair colouring?», «It has 4 upcoming bookings. They stay as they are;
    new bookings can’t choose it.», then Cancel or Delete service. After it, the toast reads «Hair colouring deleted ·
    its 4 upcoming bookings stay as they are».
  - Without upcoming bookings it goes at once, with «Undo» in the toast (`restoreService`, «Manicure is back»).
  - Two places start it: the row's menu and the drawer's «Delete service».
- **The row's menu** («Manicure: actions», the 40 column): Edit (opens the drawer), Hide from / Open for online
  booking, Delete service.
- **Groups:**
  - «Add group» in the header opens the name box («New group name», Enter or «Add group», Escape or Cancel). The group
    goes to the end of the list: «Group added: Beard».
  - Each group's menu («Hair group: actions») has «Add a service here» and «Delete group». The delete waits («Move or
    delete its services first») while the group has services; an empty group deletes at once («Group deleted: Spa»).
- Not here: reordering by the handles with its save bar and the footer caption about it.
