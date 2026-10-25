# Business profile's address as B-Settings draws it (P4 slice 2 leftover; feat/settings-address-layout)

- Changed: `AddressFields` (`features/edit-address`) takes `layout`: `steps` (the wizard's step 3, as before, 48 fields)
  or `settings` (B-Settings «Address», `.gad`): 44 fields as the rest of the page, the city (220) beside «Street and
  building» (no placeholder, as drawn) with the address suggestions full width under both, the floor beside «Where is
  the entrance?» (no hint), the map 260 high (220 on phones) with the board's words under it («Drag the pin onto your
  entrance — clients follow it to your door», or the area's), «I work from home» as a `SettingsRow` (its help the
  switch's description), 20 apart, without the wizard's note (not drawn there). «Pick the address from the list.» now
  shows at the street (its error, `aria-invalid`) rather than under the whole block. Business profile's Address uses
  `settings`; #190 had reused the wizard's layout as the nearest pattern. The settings' words are
  `settings.profile.address.{street,dragPin,dragArea}`. The wizard's switch gets its help as a description too.
- Stories: `Business/Settings/BusinessProfile` › Address (the field's name, 44 high, the city beside the street, the
  switch's description), AddressUnpicked (the street's error), Phone (the city above the street); the wizard's pass.
- Review (one round, 11 findings, 10 fixed): the above. Not taken: splitting the feature into pieces each page arranges
  (one form, two drawn layouts behind one `layout` prop is simpler, rule 10a).
