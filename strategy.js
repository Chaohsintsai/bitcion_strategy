class EMACross {
    // must have
    // function for trading strategy
    // return order object for trading or null for not trading
    trade(information) {
      // define your own trading strategy here
  
      // exchange may offline
      if (!information.candles) return [];
  
      const exchange = Object.keys(information.candles)[0];
      const pair = Object.keys(information.candles[exchange])[0];
      const baseCurrency = pair.split('-')[1]; // pair must in format '{TARGET}-{BASE}', eg. BTC-USDT, ETH-BTC
      const currency = pair.split('-')[0]; // pair must in format '{TARGET}-{BASE}', eg. BTC-USDT, ETH-BTC
  
      if (!information.candles[exchange][pair]) return [];
  
      // information like
      const candleData = information.candles[exchange][pair][0];
  
      // keep track history data
      this.history.push({
        Time: candleData.time,
        Open: candleData.open,
        Close: candleData.close,
        High: candleData.high,
        Low: candleData.low,
        Volumn: candleData.volumn,
      });
  
      let lastPrice = (information.candles[exchange][pair][0]['close']);
      if (!lastPrice) return [];
  
      // release old data
      if (this.history.length > this.long) {
        this.history.shift();
      } else {
        return [];
      }
  
      const marketData = this.history;
      // Calculate EMA with TA-LIB, return type is [double], get last MA value by pop()
      const MAShort = TA.EMA(marketData, 'Close', this.short).pop();
      const MALong = TA.EMA(marketData, 'Close', this.long).pop();
  
      // Track cross
      const curSide = (MAShort > MALong) ? ('UP') : ('DOWN');
      Log("MA side: " + curSide);
      if(!this.preSide) {
        this.preSide = curSide;
        return [];
      }
  
      // When up cross happend
      if (this.phase == this.PHASES.waitBuy && this.preSide == 'DOWN' && curSide == 'UP') {
        // Not enough assets, we can't buy
        if (this.assets[exchange][baseCurrency] < lastPrice) {
          return [];
        }
        this.preSide = curSide;
        this.phase = this.PHASES.waitSell;
        // Buy 1 coin
        return [
          {
            exchange: exchange,
            pair: pair,
            type: 'LIMIT',
            amount: 3, // [CHANGE THIS] Buying Amount
            price: lastPrice
          }
        ];
      }
      if (this.phase == this.PHASES.waitSell && this.preSide == 'UP' && curSide == 'DOWN') {
        this.preSide = curSide;
        this.phase = this.PHASES.waitBuy;
        // Sell all remaining coin
        return [
          {
            exchange: exchange,
            pair: pair,
            type: 'LIMIT',
            amount: -this.assets[exchange][currency], // All Out
            price: lastPrice
          }
        ];
      }
  
      this.preSide = curSide;
      return [];
    }
  
    // must have
    onOrderStateChanged(state) {
      Log('order change' + JSON.stringify(state));
    }
  
    constructor() {
      // must have for developer
      this.subscribedBooks = {
        'Binance': {
          pairs: ['BTC-USDT']
        },
      };
  
      // seconds for broker to call trade()
      // do not set the frequency below 60 sec.
      this.period = 60 * 60; // [CHANGE THIS] Set time period for MA lines
      // must have
      // assets should be set by broker
      this.assets = undefined;
  
      // customizable properties
      this.long =9; // [CHANGE THIS] Set MA Cross period for long line
      this.short =3; // [CHANGE THIS] Set MA Cross period for short line
      this.PHASES = {
        init: 0,
        waitBuy: 2,
        waitSell: 4
      };
  
      this.preSide = undefined;
  
      this.phase = this.PHASES.waitBuy;
  
      this.history = [];
    }
  }
