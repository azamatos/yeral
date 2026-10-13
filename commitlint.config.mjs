/** Conventional Commits, scope = app or package (`feat(client): …`). See docs/decisions/0009. */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // bodies and trailers (Co-Authored-By, links) may be long
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
}
