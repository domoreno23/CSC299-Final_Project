import React, { useState } from 'react';
import { Home, Users, BarChart3, Settings, Search, Menu, X, PlayCircleIcon, InfoIcon } from 'lucide-react';
import jsonData from './data/us_stocks.json';

// Header Component
function Header({ onMenuToggle, isSidebarOpen }) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center space-x-3 ">
            {/* ✅ Correct path - starts from public folder */}
            
              <img 
              src="/DeepTradeX_Logo.png" 
              alt="DeepTradeX Logo"
              className="rounded-lg w-14 h-14"
              />
            <h1 className="text-xl font-bold text-gray-800">DeepTradeX</h1>
          </div>
        </div>
      </div>
    </header>
  );
}

// Sidebar Component
function Sidebar({ isOpen, activeScreen, onNavigate }) {
  const menuItems = [
    { icon: Home, label: 'My Dashboard', screen: 'dashboard' },
    { icon: Users, label: 'My Account', screen: 'account' },
    { icon: InfoIcon, label: 'About', screen: 'about' },
  ];

  return (
    <aside className={`bg-gray-900 text-white w-64 min-h-screen transition-transform duration-300 ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    } lg:translate-x-0 fixed lg:relative z-30`}>
      <div className="p-4">
        <h2 className="text-xl font-bold mb-6">DeepTradeX</h2>
        <nav>
          <ul className="space-y-2">
            {menuItems.map((item, index) => (
              <li key={index}>
                <button 
                  onClick={() => onNavigate(item.screen)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeScreen === item.screen
                      ? 'bg-purple-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}

// Main Content Component for the Dashboard Screen
function Dashboard() {
  // Step 1: Create state for search input
  const [searchTerm, setSearchTerm] = useState('');
  //Set dynamically in case stock data changes to diff file
  const stockData = jsonData;
// Loading state for fetching ticker data
//Selected summary state contains the fetched financial summary
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  // Step 2: Create filtered data with better error handling
  const filteredStocks = React.useMemo(() => {
    // Check if jsonData exists and is an array
    if (!stockData || !Array.isArray(stockData)) {
      console.error('jsonData is not available or not an array:', stockData);
      return [];
    }

    // If no search term, return all stocks
    if (!searchTerm.trim()) {
      return stockData;
    }

    // Filter based on search term
    return stockData.filter(item => {
      // Check if item has required properties
      if (!item || typeof item !== 'object') {
        console.warn('Invalid item in jsonData:', item);
        return false;
      }

      const search = searchTerm.toLowerCase().trim();
      
      // Safely check symbol and name
      const symbol = (item.symbol || '').toLowerCase();
      const name = (item.name || '').toLowerCase();
      
      return symbol.includes(search) || name.includes(search);
    });
  }, [stockData, searchTerm]);

  // Step 3: Handle search input changes
  const handleSearchChange = (event) => {
    const value = event.target.value;
    console.log('Search changed to:', value); // Debug: Check if handler works
    setSearchTerm(value);
  };

  //This function will be used to fetch stock data from the AI
  async function fetchTickerData(ticker) {
  setLoadingSummary(true); // Set loading state if needed
  setSelectedSummary(null); // Reset previous summary
  
  try {
    // Fixed URL - removed incorrect template literal syntax and corrected path
    const response = await fetch('http://localhost:8000/api/get_ticker_data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticker: ticker.toUpperCase() }),
    });

    if (!response.ok) {
      // Handle HTTP errors
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received data:', data); // For debugging
    setSelectedSummary(data); // Set the fetched summary
    
  } catch (error) {
    console.error('Error fetching ticker data:', error);
    setSelectedSummary({ error: error.message }); // Set error message
  } finally {
    setLoadingSummary(false); // Reset loading state
  }
}


  return (
    <main className="flex-1 p-6 bg-gray-50">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back!</h2>
        <p className="text-gray-600">Select a stock to get started</p>
      </div>

      {/* Content Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          
          {/* Header with title and search bar*/}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Select a Stock</h3>
            <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input 
                type="text" 
                placeholder="Search for stock" 
                className="bg-transparent outline-none text-sm w-40"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          {/* Stock list container */}
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
              
              {/* Show loading if no data */}
              {!stockData || stockData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No stock data available</p>
                  <p className="text-sm">Check if jsonData is loaded properly</p>
                </div>
              ) : filteredStocks.length === 0 && searchTerm ? (
                /* Show message if no search results */
                <div className="text-center py-8 text-gray-500">
                  <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No stocks found matching "{searchTerm}"</p>
                  <p className="text-sm">Try searching by symbol or company name</p>
                </div>
              ) : (
                /* Show filtered results */
                filteredStocks.map((item, index) => (
                  <div key={item.symbol || index} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-md transition-colors cursor-pointer">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.symbol || 'Unknown Symbol'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {item.name || 'Unknown Name'}
                      </p>
                    </div>
                    <button onClick={() => fetchTickerData(item.symbol)} className="text-purple-600 hover:text-purple-800 transition-colors">
                      {/* Use this button for the functionality*/}
                      <PlayCircleIcon></PlayCircleIcon>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Show count of results */}
            {searchTerm && stockData && (
              <div className="text-xs text-gray-500 text-center">
                Showing {filteredStocks.length} of {stockData.length} stocks
              </div>
            )}
          </div>
        </div>

        {/*View Financial Summary Card*/}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary:</h3>
          <div className="space-y-3">
            {loadingSummary && <p className="text-gray-500">Loading...</p>}
            {!loadingSummary && !selectedSummary && (
              <p className="text-gray-500">Select a stock to view financial summary</p>
            )}
            {!loadingSummary && selectedSummary && selectedSummary.error && (
              <p className="text-red-500">Error: {selectedSummary.error}</p>
            )}
            {!loadingSummary && selectedSummary && !selectedSummary.error && (
              <div>
                <p><strong>Ticker:</strong> {selectedSummary.ticker}</p>
                <p><strong>Market Return:</strong> {selectedSummary.market_return}</p>
                <p><strong>Portfolio Return:</strong> {selectedSummary.portfolio_return}</p>
                <p><strong>Initial Balance:</strong> {selectedSummary.initial_balance}</p>
                <p><strong>Final Balance:</strong> {selectedSummary.final_balance}</p>
                <p><strong>Episodes:</strong> {selectedSummary.total_episodes}</p>
                <p><strong>Data Points:</strong> {selectedSummary.data_points}</p>
                <p><strong>Date Range:</strong> {selectedSummary.start_date} to {selectedSummary.end_date}</p>
                <div>
                  <strong>Performance Metrics:</strong>
                  <ul className="ml-4 list-disc">
                    {selectedSummary.performance_metrics &&
                      Object.entries(selectedSummary.performance_metrics).map(([k, v]) => (
                        <li key={k}>{k}: {v}</li>
                      ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* End of grid that contains content cards*/}
    </main>
  );
}

//Main content component of the Account screen
function AccountScreen() {
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">My Account</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" defaultValue="John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2" defaultValue="john@example.com" />
          </div>
          <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
//Main content component of the Settings screen
function AboutScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  // Replace with your actual Murf API key
  const MURF_API_KEY = process.env.REACT_APP_MURF_API;

  const textToSpeak = `
    DeepTradeX is an innovative stock trading platform that leverages advanced AI algorithms to provide real-time insights and predictions. Our mission is to empower traders with the tools they need to make informed decisions and maximize their trading potential.
    
    With DeepTradeX, you can access a wide range of features including personalized stock recommendations, market analysis, and portfolio management tools. Whether you're a seasoned trader or just starting out, DeepTradeX is designed to help you succeed in the stock market.
    
    Join our community of traders and experience the future of stock trading today!
  `.trim();

  const handleTextToSpeech = async (voiceId = 'en-US-natalie') => {
    try {
      // Check if API key exists
    if (!MURF_API_KEY) {
      throw new Error('Murf API key is not configured. Please check your environment variables.');
    }
      setIsLoading(true);
      
      console.log('Making request to Murf API...');
      console.log('API Key (first 10 chars):', MURF_API_KEY.substring(0, 10) + '...');
      
      const response = await fetch('https://api.murf.ai/v1/speech/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': MURF_API_KEY
        },
        body: JSON.stringify({
          voiceId: voiceId,
          text: textToSpeak,
          format: 'wav', // wav, mp3, flac, alaw, ulaw
          sampleRate: 24000, // 8000, 24000, 44100, 48000
          channelType: 'stereo', // mono, stereo
          base64: false // Set to true if you want base64 encoded audio
        })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', [...response.headers.entries()]);
      
      // Get the raw response text first
      const responseText = await response.text();
      console.log('Raw response:', responseText.substring(0, 200) + '...');

      if (!response.ok) {
        // Try to parse as JSON, if it fails, show the raw response
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage += `, message: ${errorData.message || errorData.error || 'Unknown error'}`;
        } catch (jsonError) {
          errorMessage += `, response: ${responseText}`;
        }
        throw new Error(errorMessage);
      }

      // Try to parse the response as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }
      
      // The response should contain a link to the audio file
      if (data.audioFile) {
        // Clean up previous audio URL if it exists
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        
        setAudioUrl(data.audioFile);
        
        // Auto-play the audio
        const audio = new Audio(data.audioFile);
        audio.play().catch(error => {
          console.error('Error playing audio:', error);
          alert('Audio generated successfully, but autoplay was blocked. Please use the audio controls to play.');
        });
      } else {
        throw new Error('No audio file returned from Murf API');
      }
      
    } catch (error) {
      console.error('Error with Murf TTS:', error);
      alert(`Failed to convert text to speech: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">About DeepTradeX</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        
        <h2 className="text-lg font-semibold mb-4">Why use DeepTradeX?</h2>
        <video
    src='/invideo-ai-1080 Unlock the Future of Trading with DeepTr 2025-04-19.mp4'
    width='900'
    height='700'
    controls
/>   
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-4">About DeepTradeX</h2>
        <button onClick={() => handleTextToSpeech('en-US-natalie')} >
          <p className="text-purple-700">Text to Speech</p>
        </button>
        <p className="text-gray-700 mt-4">
          DeepTradeX is an innovative stock trading platform that leverages advanced AI algorithms to provide real-time insights and predictions. Our mission is to empower traders with the tools they need to make informed decisions and maximize their trading potential.
        </p>
        <p className="text-gray-700 mt-2">
          With DeepTradeX, you can access a wide range of features including personalized stock recommendations, market analysis, and portfolio management tools. Whether you're a seasoned trader or just starting out, DeepTradeX is designed to help you succeed in the stock market.
        </p>
        <p className="text-gray-700 mt-2">
          Join our community of traders and experience the future of stock trading today!
        </p>
        </div>
      </div>
    </div>
  );
}

// Main App Component
export default function App() {
  // State for sidebar visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // State for current active screen
  const [activeScreen, setActiveScreen] = useState('dashboard');

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Function to handle navigation
  const handleNavigate = (screen) => {
    setActiveScreen(screen);
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  // Function to render the current screen
  const renderCurrentScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <Dashboard/>;
      case 'account':
        return <AccountScreen />;
      case 'about':
        return <AboutScreen />;
      default:
        return <Dashboard/>;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
      />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <Header onMenuToggle={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        
        {/* Dynamic content based on active screen */}
        <main className="flex-1">
          {renderCurrentScreen()}
        </main>
      </div>
    </div>
  );
}