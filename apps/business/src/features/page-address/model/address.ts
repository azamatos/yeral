/**
 * What's typed in the page address field, as an address (chapter 9, 25.10.2026): lower case, a space or an underscore a
 * hyphen. Anything else stays as typed, for the check to name.
 */
export const typedAddress = (raw: string) => raw.toLowerCase().replace(/[\s_]+/g, '-')
