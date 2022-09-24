const dotenv = require('dotenv').config()
const { Client } = require('@notionhq/client')

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
})

module.exports.getPageByTitle = async (title) => {
  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_BOOKS_DATABASE_ID,
      page_size: 100,
      filter: {
        property: 'Title',
        rich_text: {
          equals: title,
        },
      },
    })
    return response['results'][0]
  } catch (error) {
    console.log('Error occurred while fetching page by title ', error)
    return null
  }
}

module.exports.createPage = async (title, author, coverImage, paragraphList) => {

  const childrenList = []

  for (let index = 0; index < paragraphList.length; index++) {
    const para = paragraphList[index]
    if (para['type'] === 'highlight') {
      childrenList.push({
        type: 'quote',
        quote: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: para['text'],
              },
            },
          ],
          color: para['color'],
        },
      })
    } else if (para['type'] === 'note') {
      childrenList.push({
        type: 'callout',
        callout: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: para['text'],
              },
            },
          ],
          icon: {
            emoji: '💡',
          },
          color: 'default',
        },
      })
    }
  }

  const payload = {
    children: childrenList,
    cover: {
      type: 'external',
      external: {
        url: coverImage,
      },
    },
    icon: {
      type: 'emoji',
      emoji: '🔖',
    },
    parent: {
      type: 'database_id',
      database_id: process.env.NOTION_BOOKS_DATABASE_ID,
    },
    properties: {
      Title: {
        title: [
          {
            type: 'text',
            text: {
              content: title,
            },
          },
        ],
      },
      Author: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: author,
            },
          },
        ],
      },
    },
  }

  await notion.pages.create(payload)
}

module.exports.getListOfParagraphsByPageId = async (pageId) => {
  try {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100, // TODO: Use pagination to iterate over all children.
    })
    const paragraphList = []
    for (let index = 0; index < response['results'].length; index++) {
      const item = response['results'][index]
      if (item['type'] === 'quote') {
        paragraphList.push({
          color: item['quote']['color'],
          text: item['quote']['rich_text'][0]['text']['content'],
          type: 'highlight',
        })
      } else if (item['type'] === 'callout') {
        paragraphList.push({
          text: item['callout']['rich_text'][0]['text']['content'],
          type: 'note',
        })
      }
    }
    return paragraphList
  } catch (error) {
    console.log('Error occurred while fetching page details by id', error)
  }
}

module.exports.appendNewParagraphsByPageId = async (pageId, paragraphList) => {
  try {
    const childrenList = []

    for (let index = 0; index < paragraphList.length; index++) {
      const para = paragraphList[index]
      if (para['type'] === 'highlight') {
        childrenList.push({
          type: 'quote',
          quote: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: para['text'],
                },
              },
            ],
            color: para['color'],
          },
        })
      } else if (para['type'] === 'note') {
        childrenList.push({
          type: 'callout',
          callout: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: para['text'],
                },
              },
            ],
            icon: {
              emoji: '💡',
            },
            color: 'default',
          },
        })
      }
    }

    const response = await notion.blocks.children.append({
      block_id: pageId,
      children: childrenList,
    })
  } catch (error) {
    console.log('Error occurred while appending page details by id', error)
  }
}