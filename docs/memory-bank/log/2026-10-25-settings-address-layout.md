# Business profile's address as B-Settings draws it (P4 slice 2 leftover; feat/settings-address-layout)

- Changed: `AddressFields` (`features/edit-address`) takes `layout`: `steps` (the wizard's step 3, as before) or
  `settings` (B-Settings «Address», `.gad`): the city (220) beside «Street and building», the floor beside «Where is the
  entrance?» (no hint, as drawn), the map 260 high (220 on phones, r12) with the board's words under it («Drag the pin
  onto your entrance — clients follow it to your door», or the area's), and «I work from home» as a `SettingsRow` (its
  help now the switch's description), 20 apart. Business profile's Address uses `settings`; #190 had reused the
  wizard's layout as the nearest pattern. The words are `setup.address.inSettings.*`.
- Stories: `Business/Settings/BusinessProfile` › Address checks the field's name, the city beside the street and the
  switch's description; the wizard's stories pass unchanged.
