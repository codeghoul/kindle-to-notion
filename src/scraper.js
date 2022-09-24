const chrome = require('selenium-webdriver/chrome')
const webdriver = require('selenium-webdriver')
const dotenv = require('dotenv').config()

const chromeOptions = new chrome.Options()
chromeOptions.addArguments('--headless')
chromeOptions.addArguments('--disable-dev-shm-usage')
chromeOptions.addArguments('--disable-blink-features=AutomationControlled')
chromeOptions.addArguments(
  'user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36'
)

chromeOptions.addArguments('--no-sandbox')

module.exports.scrape = async function scrape() {
  let driver = new webdriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build()

  await driver.get('https://read.amazon.com/kp/notebook')

  const emailInput = await driver.findElement(
    webdriver.By.xpath('//*[@id="ap_email"]')
  )
  const passInput = await driver.findElement(
    webdriver.By.xpath('//*[@id="ap_password"]')
  )

  await emailInput.sendKeys(process.env.AMAZON_EMAIL)
  await passInput.sendKeys(process.env.AMAZON_PASSWORD)
  await passInput.sendKeys(webdriver.Key.ENTER)

  let elem = await driver.findElement(webdriver.By.id('library-section'))
  await driver.wait(webdriver.until.elementIsVisible(elem), 120)

  const books = await driver.findElements(
    webdriver.By.xpath(
      "//div[contains(@class, 'kp-notebook-library-each-book')]"
    )
  )

  const bookHighlights = {}

  for (let i = 0; i < books.length; i++) {
    let book = books[i]
    let text = await (await book.getText()).split('\n')
    let title = text[0]
    let author = text[1].substring(4)
    await book.click()

    await driver.wait(function (driver) {
      return driver
        .findElement(webdriver.By.id('kp-notebook-spinner'))
        .getCssValue('display')
        .then(function (css) {
          return css === 'none'
        })
    }, 12000)

    let imageSrc = await driver
      .findElement(webdriver.By.id('annotation-scroller'))
      .findElement(webdriver.By.className('kp-notebook-cover-image-border'))
      .getAttribute('src')

    let highlights = await driver.findElements(
      webdriver.By.xpath("//span[@id='highlight' or @id='note']")
    )
    let highLightTexts = []

    for (let j = 0; j < highlights.length; j++) {
      let highlight = highlights[j]
      let highlightText = await highlight.getText()

      if (highlightText !== '') {
        let highLightAttribute = await highlight.getAttribute('id')
        if (highLightAttribute === 'highlight') {
          let div = await highlight.findElement(webdriver.By.xpath('..'))
          let color = await div.getCssValue('border-left-color')
          highLightTexts.push({
            color: toColor(color),
            text: highlightText,
            type: 'highlight',
          })
        } else {
          highLightTexts.push({ text: highlightText.toString(), type: 'note' })
        }
      }
    }

    bookHighlights[title] = {
      imageSrc: imageSrc,
      highlights: highLightTexts,
      author: author,
    }
  }
  return bookHighlights
}


const toColor = function(color) {
  switch (color) {
    case "rgba(242, 227, 102, 1)":
      return 'yellow'
    case "rgba(163, 196, 255, 1)":
      return 'blue'
    case "rgba(255, 194, 245, 1)":
      return 'pink'
    case "rgba(252, 184, 94, 1)":
      return 'orange'
    default:
      return 'default'
  }
}