const key = process.env.KRAKEN_API_KEY // API Key
const secret = process.env.KRAKEN_SECRET_KEY // API Private Key
const KrakenClient = require('kraken-api')
const kraken = new KrakenClient(key, secret)

async function wait() {
  return new Promise(resolve => setTimeout(resolve, 2000))
}

const configs = [
  {
    ticker: 'XXBTZEUR',
    amount: 15,
    priceDecimals: 1,
    volumeDecimals: 8,
  },
  {
    ticker: 'XETHZEUR',
    amount: 15,
    priceDecimals: 1,
    volumeDecimals: 8,
  },
  {
    ticker: 'ADAEUR',
    amount: 30,
    priceDecimals: 6,
    volumeDecimals: 6,
  },
  {
    ticker: 'DOTEUR',
    amount: 15,
    priceDecimals: 4,
    volumeDecimals: 6,
  },
]

;(async () => {
  // Display user's balance
  let eurBalance = (await kraken.api('Balance')).result.ZEUR
  console.log('eurBalance', eurBalance)

  // Get Ticker Info
  const tickerInfo = await kraken.api('Ticker', { pair: configs.map(pair => pair.ticker).join(',') })

  configs.forEach(pair => {
    pair.currentPrice = parseFloat(tickerInfo.result[pair.ticker].a[0])
  })

  for (const pair of configs) {
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
