def engineer_features():
    """Create additional predictive features."""
    df = pd.read_csv(INPUT_PATH)

    # Convert Date column
    df["Date"] = pd.to_datetime(df["Date"])
    df.sort_values("Date", inplace=True)

    # Moving averages
    df["MA_7"] = df["Close"].rolling(window=7).mean()
    df["MA_30"] = df["Close"].rolling(window=30).mean()

    # Exponential Moving Average (EMA)
    df["EMA_7"] = df["Close"].ewm(span=7, adjust=False).mean()

    # Relative Strength Index (RSI)
    delta = df["Close"].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df["RSI"] = 100 - (100 / (1 + rs))

    # Bollinger Bands
    df["Bollinger_Upper"] = df["MA_7"] + (2 * df["Close"].rolling(window=7).std())
    df["Bollinger_Lower"] = df["MA_7"] - (2 * df["Close"].rolling(window=7).std())

    # Fill NaN values
    df.fillna(0, inplace=True)

    df.to_csv(OUTPUT_PATH, index=False)
    print(f"Feature engineered data saved to {OUTPUT_PATH}")
