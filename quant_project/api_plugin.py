#!/usr/bin/env python
# coding: utf-8

# In[ ]:


'''
Interface to fetch data from API
'''


# In[ ]:


'''Alpha Vantage API Abstraction'''
import os
import requests
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

#Load environment variables from .env file
load_dotenv()

class AlphaVantageAdapter:
    def __init__(self, ticker):
        self.ticker = ticker
        self.last_ticker = None
        self.ticker_dataframe = None
        self.cached_file = f"cached_{self.ticker}_data.csv"
        self.api_key = os.environ.get('ALPHA_VANTAGE_API_KEY')
        if not self.api_key:
            raise ValueError("DeepTradeX Could not Connect to Alpha Vantage API. Please check your API key.")

    def get_ticker_dataframe(self):
        # Check if cached file exists and matches the current ticker
        if self.ticker != self.last_ticker or not self._is_cache_valid():
            print(f"Fetching data for {self.ticker} from Alpha Vantage API...")
            url = f'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={self.ticker}&apikey={self.api_key}&outputsize=full'
            response = requests.get(url)
            if response.status_code != 200:
                raise Exception(f"API call failed with status code {response.status_code}.")

            data = response.json()
            if 'Time Series (Daily)' not in data:
                raise Exception("Invalid API response: 'Time Series (Daily)' not found.")

            self.ticker_dataframe = pd.DataFrame.from_dict(data['Time Series (Daily)'], orient='index')
            self.ticker_dataframe = self.ticker_dataframe.rename(columns={
                '1. open': 'open', 
                '2. high': 'high', 
                '3. low': 'low', 
                '4. close': 'close', 
                '5. volume': 'volume'
            })

            # Convert numeric columns
            #numeric_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
            #self.ticker_dataframe[numeric_columns] = self.ticker_dataframe[numeric_columns].apply(pd.to_numeric, errors='coerce')

            # Save to cache
            self.ticker_dataframe.to_csv(self.cached_file)
            self.last_ticker = self.ticker

        else:
            print(f"Loading cached data for {self.ticker}...")
            self.ticker_dataframe = pd.read_csv(self.cached_file, index_col=0)

        return self.ticker_dataframe

    def _is_cache_valid(self):
        # Check if the cached file exists
        return os.path.exists(self.cached_file) # If the file exists, return True