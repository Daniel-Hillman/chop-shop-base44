import React, { useState } from 'react';
import SamplerBankNavigation from './SamplerBankNavigation';

/**
 * Demo component for SamplerBankNavigation
 * Shows bank navigation functionality with different configurations
 */
const SamplerBankNavigationDemo = () => {
  const [currentBank, setCurrentBank] = useState(0);
  const [currentBank4, setCurrentBank4] = useState(0);
  
  // Mock chop counts for different scenarios
  const chopsPerBank2 = [8, 12]; // 2-bank scenario
  const chopsPerBank4 = [16, 8, 4, 0]; // 4-bank scenario

  const handleBankChange = (newBank) => {
    setCurrentBank(newBank);
    console.log('Bank changed to:', newBank);
  };

  const handleBank4Change = (newBank) => {
    setCurrentBank4(newBank);
    console.log('4-Bank changed to:', newBank);
  };

  return (
    <div className="p-8 bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-white mb-8">
          SamplerBankNavigation Demo
        </h1>

        {/* 2-Bank Configuration */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">
            2-Bank Configuration (Initial Implementation)
          </h2>
          <div className="p-6 bg-gray-800 rounded-lg">
            <SamplerBankNavigation
              currentBank={currentBank}
              totalBanks={2}
              onBankChange={handleBankChange}
              chopsPerBank={chopsPerBank2}
            />
            <div className="mt-4 text-sm text-gray-400">
              Current Bank: {currentBank === 0 ? 'A' : 'B'} | 
              Chops: {chopsPerBank2[currentBank] || 0}/16
            </div>
          </div>
        </div>

        {/* 4-Bank Configuration */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">
            4-Bank Configuration (Future Expansion)
          </h2>
          <div className="p-6 bg-gray-800 rounded-lg">
            <SamplerBankNavigation
              currentBank={currentBank4}
              totalBanks={4}
              onBankChange={handleBank4Change}
              chopsPerBank={chopsPerBank4}
            />
            <div className="mt-4 text-sm text-gray-400">
              Current Bank: {['A', 'B', 'C', 'D'][currentBank4]} | 
              Chops: {chopsPerBank4[currentBank4] || 0}/16
            </div>
          </div>
        </div>

        {/* Edge Cases */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">
            Edge Cases
          </h2>
          
          {/* Empty Banks */}
          <div className="p-6 bg-gray-800 rounded-lg">
            <h3 className="text-lg font-medium text-white mb-3">Empty Banks</h3>
            <SamplerBankNavigation
              currentBank={0}
              totalBanks={2}
              onBankChange={() => {}}
              chopsPerBank={[0, 0]}
            />
          </div>

          {/* Single Bank (Disabled Navigation) */}
          <div className="p-6 bg-gray-800 rounded-lg">
            <h3 className="text-lg font-medium text-white mb-3">Single Bank</h3>
            <SamplerBankNavigation
              currentBank={0}
              totalBanks={1}
              onBankChange={() => {}}
              chopsPerBank={[16]}
            />
          </div>

          {/* Full Banks */}
          <div className="p-6 bg-gray-800 rounded-lg">
            <h3 className="text-lg font-medium text-white mb-3">Full Banks</h3>
            <SamplerBankNavigation
              currentBank={0}
              totalBanks={2}
              onBankChange={() => {}}
              chopsPerBank={[16, 16]}
            />
          </div>
        </div>

        {/* Interactive Controls */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">
            Interactive Controls
          </h2>
          <div className="p-6 bg-gray-800 rounded-lg space-y-4">
            <div className="flex gap-4">
              <button
                onClick={() => setCurrentBank(0)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Go to Bank A
              </button>
              <button
                onClick={() => setCurrentBank(1)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Go to Bank B
              </button>
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => setCurrentBank4(0)}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                4-Bank: A
              </button>
              <button
                onClick={() => setCurrentBank4(1)}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                4-Bank: B
              </button>
              <button
                onClick={() => setCurrentBank4(2)}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                4-Bank: C
              </button>
              <button
                onClick={() => setCurrentBank4(3)}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                4-Bank: D
              </button>
            </div>
          </div>
        </div>

        {/* Requirements Coverage */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">
            Requirements Coverage
          </h2>
          <div className="p-6 bg-gray-800 rounded-lg">
            <ul className="text-sm text-gray-300 space-y-2">
              <li>✅ 4.1: Navigation controls for switching banks</li>
              <li>✅ 4.2: Bank switching displays corresponding 16 chops</li>
              <li>✅ 4.3: Organizes 64 chops into 4 banks of 16 each</li>
              <li>✅ 4.4: Initial support for 2 banks with expansion capability</li>
              <li>✅ 4.5: Preserves pattern data across bank switches</li>
              <li>✅ 4.6: Displays empty tracks for banks with no chops</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SamplerBankNavigationDemo;