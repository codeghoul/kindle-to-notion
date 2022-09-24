const { getPageByTitle, getListOfParagraphsByPageId, createPage, appendNewParagraphsByPageId } = require('./src/notion.js')
const scraper = require('./src/scraper.js')

const _ = require('lodash')

async function run() {
  const bookHighlights = await scraper.scrape()

  for (const title in bookHighlights) {
    const data = bookHighlights[title]
    const author = data['author']
    const highlights = data['highlights']
    const coverImage = data['imageSrc']
    const page = await getPageByTitle(title)

    if (!page) {
      createPage(title, author, coverImage, highlights)
    } else {
      const notes = await getListOfParagraphsByPageId(page['id'])
      const newNotes = _.differenceWith(highlights, notes, _.isEqual)
      await appendNewParagraphsByPageId(page['id'], newNotes)
    }
  }
}

run()
