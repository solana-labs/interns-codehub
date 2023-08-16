use {
    crate::errors::ErrorCode,
    anchor_lang::prelude::*,
    pyth_sdk_solana::state::load_price_account,
    solana_program::clock::UnixTimestamp,
    std::{convert::TryInto, ops::Deref, str::FromStr},
};

#[derive(Clone)]
pub struct PriceFeed(pyth_sdk::PriceFeed);

#[derive(Clone, Debug, PartialEq)]
pub struct OraclePrice {
    pub price: f64, // price without exponent scaled
    pub price_with_expo: u64,
    pub exponent: i32,
}

impl anchor_lang::Owner for PriceFeed {
    fn owner() -> Pubkey {
        // The mainnet Pyth program ID
        let oracle_addr = "FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH";
        return Pubkey::from_str(&oracle_addr).unwrap();
    }
}

impl AccountDeserialize for PriceFeed {
    fn try_deserialize_unchecked(data: &mut &[u8]) -> Result<Self> {
        let account = load_price_account(data)
            .map_err(|_x| error!(ErrorCode::TryToDeserializePriceAccount))?;
        let zeros: [u8; 32] = [0; 32];
        let dummy_key = Pubkey::new_from_array(zeros);
        let feed = account.to_price_feed(&dummy_key);
        return Ok(PriceFeed(feed));
    }
}

impl AccountSerialize for PriceFeed {
    fn try_serialize<W: std::io::Write>(&self, _writer: &mut W) -> std::result::Result<(), Error> {
        Err(error!(ErrorCode::TryToSerializePriceAccount))
    }
}

impl Deref for PriceFeed {
    type Target = pyth_sdk::PriceFeed;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl PriceFeed {
    // NOTE: 30 seconds for mainnet, but keep it long for localnet testing
    // pub const STALE_SECONDS: u64 = 30;
    pub const STALE_SECONDS: u64 = 100_000;

    pub fn read_price(&self, current_timestamp: UnixTimestamp) -> Result<OraclePrice> {
        // Load the price from the price feed. Here, the price can be no older than `STALE_SECONDS` seconds.
        let price: pyth_sdk::Price = self
            .get_price_no_older_than(current_timestamp, PriceFeed::STALE_SECONDS)
            .ok_or(ErrorCode::StaleOraclePrice)?;

        PriceFeed::format_price(price)
    }

    pub fn read_price_in_quote(
        &self,
        quote_price_feed: &PriceFeed,
        current_timestamp: UnixTimestamp,
    ) -> Result<OraclePrice> {
        let (price, quote) = self._read_price_in_quote(quote_price_feed, current_timestamp)?;
        // TODO: validate that we want the price_in_quote to use `quote.expo` as result_expo
        let price_in_quote = price.get_price_in_quote(&quote, quote.expo).unwrap();
        PriceFeed::format_price(price_in_quote)
    }

    pub fn read_price_in_quote_custom_expo(
        &self,
        quote_price_feed: &PriceFeed,
        current_timestamp: UnixTimestamp,
        expo: i32,
    ) -> Result<OraclePrice> {
        let (price, quote) = self._read_price_in_quote(quote_price_feed, current_timestamp)?;
        let price_in_quote = price.get_price_in_quote(&quote, expo).unwrap();
        PriceFeed::format_price(price_in_quote)
    }

    fn _read_price_in_quote(
        &self,
        quote_price_feed: &PriceFeed,
        current_timestamp: UnixTimestamp,
    ) -> Result<(pyth_sdk::Price, pyth_sdk::Price)> {
        // let pyth_price = self.get_price_unchecked();
        // msg!("pyth_price: {:?}", pyth_price);
        // msg!("diff time: {:?}", current_timestamp - pyth_price.publish_time);

        let price: pyth_sdk::Price = self
            .get_price_no_older_than(current_timestamp, PriceFeed::STALE_SECONDS)
            .ok_or(ErrorCode::StaleOraclePrice)?;
        msg!("price: {:?}", price);

        let quote: pyth_sdk::Price = quote_price_feed
            .get_price_no_older_than(current_timestamp, PriceFeed::STALE_SECONDS)
            .ok_or(ErrorCode::StaleOraclePrice)?;

        Ok((price, quote))
    }

    fn format_price(price: pyth_sdk::Price) -> Result<OraclePrice> {
        // let confidence_interval: u64 = price.conf;
        let asset_price_with_expo: u64 = price.price.try_into().unwrap(); // scaled to exponent (e.g. 10^9)
        let asset_exponent: i32 = price.expo;

        // price without decimal exponent, e.g. 10.0 USDC not 10_000_000
        let asset_price_no_expo: f64 = asset_price_with_expo as f64 * 10f64.powi(asset_exponent);

        // msg!("Price: {}", asset_price);
        // msg!("Confidence interval: {}", confidence_interval);

        Ok(OraclePrice {
            price: asset_price_no_expo,
            price_with_expo: asset_price_with_expo,
            exponent: asset_exponent,
        })
    }
}
