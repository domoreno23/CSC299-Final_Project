#!/usr/bin/env python
# coding: utf-8

'''This is where we create the gym environment'''

'''Obtaining and preprocessing Data from API'''
from api_plugin import AlphaVantageAdapter
from sklearn.preprocessing import MinMaxScaler
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import gymnasium as gym
import asyncio
import gym_trading_env  # Ensure this is imported
import numpy as np
#from stable_baselines3 import DQN

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Trading Environment API", version="1.0.0")

app.add_middleware(CORSMiddleware, 
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"])

class TickerRequest(BaseModel):
    ticker: str
    
class TradingResponse(BaseModel):
    ticker: str
    market_return: float
    portfolio_return: float
    initial_balance: float
    final_balance: float
    total_episodes: int
    data_points: int
    start_date: str
    end_date: str
    performance_metrics: dict

# Helper function to safely get environment attributes
def get_env_balance(env):
    """Safely get balance from environment"""
    if hasattr(env, 'get_final_balance'):
        return env.get_final_balance()
    elif hasattr(env, 'portfolio_value'):
        return env.portfolio_value
    elif hasattr(env, 'balance'):
        return env.balance
    elif hasattr(env, 'unwrapped') and hasattr(env.unwrapped, 'portfolio_value'):
        return env.unwrapped.portfolio_value
    else:
        # Fallback: try to access through info or return default
        return 10000  # Default initial balance

def get_env_initial_balance(env):
    """Safely get initial balance from environment"""
    if hasattr(env, 'initial_balance'):
        return env.initial_balance
    elif hasattr(env, 'unwrapped') and hasattr(env.unwrapped, 'initial_balance'):
        return env.unwrapped.initial_balance
    else:
        return 10000  # Default initial balance

'''Running trading pipeline'''
# Fixed route - using POST method and correct path syntax
@app.post("/api/get_ticker_data")
async def get_ticker_data(request: TickerRequest):
    try:
        ticker = request.ticker.upper().strip()
        
        # 1. Get data using AlphaVantageAdapter
        logger.info(f"Starting simulation for {ticker}")
        adapter = AlphaVantageAdapter(ticker=ticker)
        stock_df = adapter.get_ticker_dataframe()
        
        if stock_df.empty:
            raise ValueError(f"No data available for ticker {ticker}")
        
        # 2. Preprocess data
        columns = [item for item in stock_df.columns]
        scaler = MinMaxScaler()
        scaled_data = scaler.fit_transform(stock_df)
        scaled_stock_df = pd.DataFrame(scaled_data, columns=columns, index=stock_df.index)
        scaled_stock_df.fillna(0, inplace=True)
        
        logger.info(f"Preprocessed data shape: {scaled_stock_df.shape}")
        
        # 3. Run trading environment
        try:
            env = gym.make('TradingEnv-v0', df=scaled_stock_df, positions=[-1, 0, 1])
            logger.info("Environment created successfully")
        except Exception as env_error:
            logger.error(f"Error creating environment: {str(env_error)}")
            raise ValueError(f"Failed to create trading environment: {str(env_error)}")
        
        total_episodes = 1
        total_reward = 0
        episode_rewards = []
        
        for episode in range(total_episodes):
            try:
                obs, info = env.reset()  # Updated for newer gym versions
                done = False
                episode_reward = 0
                steps = 0
                max_steps = len(scaled_stock_df) - 1
                
                logger.info(f"Starting episode {episode + 1}")
                
                while not done and steps < max_steps:
                    # Simple random action for demo (replace with your trained agent)
                    action = env.action_space.sample()  # Use proper action sampling
                    
                    # Handle both old and new gym API
                    try:
                        result = env.step(action)
                        if len(result) == 5:  # New gym API
                            obs, reward, terminated, truncated, info = result
                            done = terminated or truncated
                        else:  # Old gym API
                            obs, reward, done, info = result
                    except Exception as step_error:
                        logger.error(f"Error during step: {str(step_error)}")
                        break
                    
                    episode_reward += reward
                    steps += 1
                    
                    # Add small delay to simulate processing
                    if steps % 100 == 0:  # Only delay every 100 steps
                        await asyncio.sleep(0.001)
                
                episode_rewards.append(episode_reward)
                total_reward += episode_reward
                logger.info(f"Episode {episode + 1} completed with reward: {episode_reward}")
                
            except Exception as episode_error:
                logger.error(f"Error in episode {episode + 1}: {str(episode_error)}")
                continue
        
        # 4. Calculate results
        try:
            final_balance = get_env_balance(env)
            initial_balance = get_env_initial_balance(env)
            
            portfolio_return = (final_balance - initial_balance) / initial_balance
            
            # Calculate market return
            start_price = float(stock_df['close'].iloc[0])
            end_price = float(stock_df['close'].iloc[-1])
            market_return = (end_price - start_price) / start_price
            
            # Performance metrics
            episode_rewards_array = np.array(episode_rewards) if episode_rewards else np.array([0])
            performance_metrics = {
                "sharpe_ratio": round(np.mean(episode_rewards_array) / max(0.01, np.std(episode_rewards_array)), 4),
                "volatility": round(float(scaled_stock_df['close'].std()), 4),
                "max_drawdown": round(float(min(0, (scaled_stock_df['close'].min() - scaled_stock_df['close'].max()) / scaled_stock_df['close'].max())), 4),
                "average_reward": round(float(np.mean(episode_rewards_array)), 4),
                "total_steps": steps if 'steps' in locals() else 0
            }
            
            response = TradingResponse(
                ticker=ticker,
                market_return=round(float(market_return), 6),
                portfolio_return=round(float(portfolio_return), 6),
                initial_balance=float(initial_balance),
                final_balance=round(float(final_balance), 2),
                total_episodes=total_episodes,
                data_points=len(stock_df),
                start_date=stock_df.index[0],
                end_date=stock_df.index[-1],
                performance_metrics=performance_metrics
            )
            
            logger.info(f"Simulation completed successfully for {ticker}")
            return response
            
        except Exception as calc_error:
            logger.error(f"Error calculating results: {str(calc_error)}")
            raise ValueError(f"Failed to calculate results: {str(calc_error)}")
        
    except Exception as e:
        logger.error(f"Error in trading simulation: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Trading API is running"}

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Trading Environment API", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)