const key = process.env.KRAKEN_API_KEY // API Key
const secret = process.env.KRAKEN_SECRET_KEY // API Private Key
const KrakenClient = require('kraken-api')
const kraken = new KrakenClient(key, secret)
// e.g. PAIRS="XXBTZEUR=15,XETHZEUR=15,ADAEUR=15,DOTEUR=15" node src/index.js

async function wait() {
  return new Promise(resolve => setTimeout(resolve, 2000))
}

function getDecimals(coinPrice) {
  const priceTPow = parseInt(coinPrice).toString().length
  const priceDecimals = Math.max(6 - priceTPow, 0)
  const volumeDecimals = 10 - priceDecimals

  return {
    priceDecimals: Math.max(priceDecimals, 1),
    volumeDecimals,
  }
}

function getPairs() {
  return process.env.PAIRS
    ? process.env.PAIRS.split(',').map(pairDefinition => {
        const [ticker, amount] = pairDefinition.split('=')

        return { ticker, amount: parseFloat(amount) }
      })
    : []
}

;(async () => {
  // Display user's balance
  let eurBalance = (await kraken.api('Balance')).result.ZEUR
  console.log('EUR Balance', eurBalance)

  const pairs = getPairs()
  if (!pairs.length)
    return console.warn(
      'No pair definitions passed. Please specify process.env.PAIRS, e.g. PAIRS="XXBTZEUR=15,XETHZEUR=15"'
    )

  // Get Ticker Info
  const tickerInfo = await kraken.api('Ticker', { pair: pairs.map(pair => pair.ticker).join(',') })

  pairs.forEach(pair => {
    pair.currentPrice = parseFloat(tickerInfo.result[pair.ticker].a[0])
    const decimals = getDecimals(pair.currentPrice)
    Object.assign(pair, decimals)
  })

  for (const pair of pairs) {
    const volume = (pair.amount / pair.currentPrice).toFixed(pair.volumeDecimals)
    const price = pair.currentPrice.toFixed(pair.priceDecimals)
    console.log(`Trying to place order. ${volume} ${pair.ticker} @ ${price}€ (= ${pair.amount} €)`)
    if (eurBalance - pair.amount < 0) {
      console.log('Insufficient funds, abort.')
      break
    }
    try {
      const result = await kraken.api('AddOrder', {
        pair: pair.ticker,
        type: 'buy',
        ordertype: 'limit',
        price,
        volume,
        expiretm: `+${60 * 60 * 24}`,
      })
      eurBalance -= pair.amount
      console.log(result.result.descr)
    } catch (err) {
      console.error(err)
    }
    await wait()
  }
})()
