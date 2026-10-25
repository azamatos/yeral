/** Saves a file the page made (an `.ics` for «Add to calendar») in the browser, under `filename`. */
export function downloadFile(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // some browsers (Safari) read the file after the click returns: the address goes on the next turn
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
