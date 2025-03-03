import os
import pandas as pd

# Correct absolute path to the CSV file
file_path = r'C:\Users\HP\OneDrive\Desktop\Sentiment Driven Stock Price Prediction Using News Headlines\.venv\sentiment_driven_stock_price_prediction_engine\data\cleaned_data\ibm_cleaned.csv'

# Check if the file exists
if os.path.exists(file_path):
    # Read the CSV file into a DataFrame
    df = pd.read_csv(file_path)

    # Print the top row (first row)
    print("Top Row:")
    print(df.head(1))

    # Print the bottom row (last row)
    print("\nBottom Row:")
    print(df.tail(1))
else:
    print(f"Error: The file '{file_path}' does not exist.")

"""
Top Row:
                  Date    Open    High     Low   Close  Volume News
0  2008-01-02 09:30:00  62.126  62.363  60.953  61.468  120917     

Bottom Row:
                        Date    Open    High    Low   Close  Volume                                               News
1548588  2023-10-31 15:59:00  144.52  144.69  144.5  144.62  171165  Govt clears about 110 applications for imports...
"""