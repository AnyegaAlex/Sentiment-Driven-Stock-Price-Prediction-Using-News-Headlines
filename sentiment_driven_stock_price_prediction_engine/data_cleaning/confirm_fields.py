import csv

def print_csv_head_tail_no_pandas(file_path, head_rows=5, tail_rows=5):
    """
    Prints the first `head_rows` and last `tail_rows` of a CSV file without using pandas.
    
    Parameters:
        file_path (str): Path to the CSV file.
        head_rows (int): Number of rows to display from the start of the file.
        tail_rows (int): Number of rows to display from the end of the file.
    """
    try:
        with open(file_path, mode='r', newline='', encoding='utf-8') as file:
            reader = csv.reader(file)
            rows = list(reader)  # Read all rows into a list
            
            # Print the header and head rows
            print(f"First {head_rows} rows (Head):")
            for row in rows[:head_rows + 1]:  # Include header
                print(row)
            
            # Print the tail rows
            print(f"\nLast {tail_rows} rows (Tail):")
            for row in rows[-tail_rows:]:
                print(row)
    
    except FileNotFoundError:
        print(f"Error: The file '{file_path}' was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")

# Example usage
csv_file_path = r"C:\Users\HP\OneDrive\Desktop\Sentiment Driven Stock Price Prediction Using News Headlines\.venv\sentiment_driven_stock_price_prediction_engine\data\cleaned_data\ibm_cleaned.csv"  # Replace with your CSV file path
print_csv_head_tail_no_pandas(csv_file_path)