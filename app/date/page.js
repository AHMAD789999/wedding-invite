'use client';

import React, { useState } from 'react';

export default function Ultimate3DPopupDate() {
  const [step, setStep] = useState(1);
  
  // Runaway "No" button tracking position
  const [noPos, setNoPos] = useState({ top: '68%', left: '59%' });
  const [noCount, setNoCount] = useState(0);

  // Collected responses
  const [dateData, setDateData] = useState({
    dateTime: { date: '', time: '' },
    placeType: '',
    selectedPlaceName: '',
    food: '',
    drink: '',
    payment: ''
  });

  const [tempDateTime, setTempDateTime] = useState({ date: '', time: '' });

  // Web Audio API feedback
  const playSound = (type) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'sparkle') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      } else if (type === 'pop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(250, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (type === 'sparkle' ? 0.35 : 0.15));
    } catch (e) {
      console.log(e);
    }
  };

  // Runaway "No" button mechanism with touch & mouse support
  const moveNoButton = () => {
    const randomTop = Math.floor(Math.random() * 60) + 20;
    const randomLeft = Math.floor(Math.random() * 60) + 20;
    setNoPos({ top: `${randomTop}%`, left: `${randomLeft}%` });
    setNoCount(prev => prev + 1);
    playSound('pop');
  };

  const handleYesClick = () => {
    playSound('sparkle');
    setStep(2); // Goes to Date & Time Pop-up
  };

  // Specific items based on place type selected
  const menuOptions = {
    restaurant: {
      title: "Fancy Restaurant Menu",
      foods: [
        { name: "Truffle Mushroom Risotto 🍄", img: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=500&auto=format&fit=crop&q=60" },
        { name: "Grilled Herb Steak 🥩", img: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60" },
        { name: "Creamy Alfredo Pasta 🍝", img: "https://images.unsplash.com/photo-1645112411341-654fd01ab43a?w=500&auto=format&fit=crop&q=60" },
        { name: "Wood-Fired Margherita Pizza 🍕", img: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500&auto=format&fit=crop&q=60" }
      ],
      drinks: [
        { name: "Sparkling Red Mocktail 🍷", img: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=60" },
        { name: "Virgin Mojito Mint 🌿", img: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60" },
        { name: "Blue Lagoon Ice Drink 🧊", img: "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=500&auto=format&fit=crop&q=60" },
        { name: "Classic Lemon Iced Tea 🍋", img: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=60" }
      ]
    },
    cafe: {
      title: "Cozy Cafe Menu",
      foods: [
        { name: "Loaded Avocado Toast 🥑", img: "https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=500&auto=format&fit=crop&q=60" },
        { name: "Fluffy Chocolate Pancakes 🥞", img: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500&auto=format&fit=crop&q=60" },
        { name: "Crispy Chicken Club Sandwich 🥪", img: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=60" },
        { name: "Warm Nutella Waffle 🧇", img: "https://images.unsplash.com/photo-1562243017-4d0d8c238b7e?w=500&auto=format&fit=crop&q=60" }
      ],
      drinks: [
        { name: "Caramel Macchiato Coffee ☕", img: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=500&auto=format&fit=crop&q=60" },
        { name: "Iced Strawberry Matcha Latte 🍓", img: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=60" },
        { name: "Classic Brown Sugar Boba 🧋", img: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=500&auto=format&fit=crop&q=60" },
        { name: "Hot Chocolate with Marshmallows 🍫", img: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=500&auto=format&fit=crop&q=60" }
      ]
    }
  };

  const currentMenu = dateData.placeType ? menuOptions[dateData.placeType] : menuOptions.restaurant;

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1a0c0b] via-[#2d1412] to-[#120707] flex flex-col items-center justify-center p-4 overflow-x-hidden relative font-serif select-none">
      
      {/* Background Soft Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-center text-[22rem] select-none filter blur-2xl">
        ❤️
      </div>

      {/* STYLISH CSS FOR 3D CARD POP ANIMATION */}
      <style jsx global>{`
        @keyframes popup3D {
          0% {
            opacity: 0;
            transform: scale(0.7) translateY(40px) rotateX(15deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0) rotateX(0deg);
          }
        }
        .animate-popup-3d {
          animation: popup3D 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          transform-style: preserve-3d;
          perspective: 1000px;
        }
      `}</style>

      {/* ================= STEP 1: PROPOSAL WITH PROPERLY ALIGNED BUTTONS ================= */}
      {step === 1 && (
        <div className="relative z-10 w-full max-w-md bg-[#fffaf5] border-4 border-[#8c4e48] p-8 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] text-center flex flex-col items-center justify-center min-h-[380px] animate-popup-3d">
          <div className="text-5xl mb-3 animate-bounce">🥺</div>
          <h1 className="text-3xl text-[#5c2c2c] mb-2 font-normal">Will you go on a date with me?</h1>
          <p className="font-sans text-xs text-[#8b5a5a] italic mb-8">Please don't decline, you're my favorite! ✨</p>

          <div className="w-full relative h-20 flex items-center justify-center px-6">
            <button
              onClick={handleYesClick}
              className="absolute left-10 px-8 py-3.5 bg-gradient-to-r from-[#8b3a3a] to-[#a64444] text-[#f3e9e1] rounded-full font-sans text-sm tracking-widest uppercase shadow-[0_10px_20px_rgba(139,58,58,0.4)] hover:scale-110 active:scale-95 transition-all z-20 cursor-pointer"
            >
              Yes! ❤️
            </button>

            <button
              onMouseEnter={moveNoButton}
              onTouchStart={moveNoButton}
              style={{ top: noPos.top, left: noPos.left, transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}
              className="absolute px-6 py-3.5 bg-[#d1c2bc] text-[#5c2c2c] rounded-full font-sans text-sm tracking-widest uppercase shadow-md z-10 cursor-pointer"
            >
              {noCount > 4 ? "Can't click me! 🏃‍♂️" : "No 😢"}
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: DATE & TIME 3D POP-UP ================= */}
      {step === 2 && (
        <div className="relative z-10 w-full max-w-md bg-[#fffaf5] border-4 border-[#8c4e48] p-8 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] text-center flex flex-col items-center animate-popup-3d">
          <div className="text-4xl mb-2">⏰</div>
          <h2 className="text-2xl text-[#5c2c2c] mb-1">Pick Date & Time</h2>
          <p className="font-sans text-xs text-[#8b5a5a] mb-6">When should I pick you up? ✨</p>
          
          <form 
            onSubmit={(e) => { 
              e.preventDefault(); 
              if(tempDateTime.date && tempDateTime.time) {
                setDateData(prev => ({ ...prev, dateTime: tempDateTime }));
                playSound('sparkle');
                setStep(3);
              }
            }} 
            className="w-full flex flex-col gap-4 text-left font-sans"
          >
            <div>
              <label className="block text-xs font-bold text-[#5c2c2c] uppercase mb-1">Select Date</label>
              <input 
                type="date" 
                required
                value={tempDateTime.date}
                onChange={(e) => setTempDateTime({...tempDateTime, date: e.target.value})}
                className="w-full p-3.5 rounded-2xl border border-[#d4b5ad] bg-white text-[#5c2c2c] text-sm focus:outline-none focus:border-[#8b3a3a] shadow-inner"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5c2c2c] uppercase mb-1">Select Time</label>
              <input 
                type="time" 
                required
                value={tempDateTime.time}
                onChange={(e) => setTempDateTime({...tempDateTime, time: e.target.value})}
                className="w-full p-3.5 rounded-2xl border border-[#d4b5ad] bg-white text-[#5c2c2c] text-sm focus:outline-none focus:border-[#8b3a3a] shadow-inner"
              />
            </div>
            <button
              type="submit"
              className="mt-3 w-full py-3.5 bg-gradient-to-r from-[#8b3a3a] to-[#a64444] text-[#f3e9e1] rounded-full font-sans text-sm tracking-widest uppercase shadow-[0_10px_20px_rgba(139,58,58,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              Next: Choose Place ✨
            </button>
          </form>
        </div>
      )}

      {/* ================= STEP 3: SIMPLE PLACE SELECTION (RESTAURANT OR CAFE) ================= */}
      {step === 3 && (
        <div className="relative z-10 w-full max-w-md bg-[#fffaf5] border-4 border-[#8c4e48] p-8 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] text-center flex flex-col items-center animate-popup-3d">
          <div className="text-4xl mb-2">🏡</div>
          <h2 className="text-2xl text-[#5c2c2c] mb-1">Choose Venue Type</h2>
          <p className="font-sans text-xs text-[#8b5a5a] mb-6">Would you prefer a Restaurant or a Cafe? ✨</p>
          
          <div className="w-full flex flex-col gap-3 font-sans">
            {[
              { type: 'restaurant', name: '🍽️ Fine Restaurant (Romantic Dinner & Pasta)' },
              { type: 'cafe', name: '☕ Cozy Cafe (Coffee, Pastries & Snacks)' }
            ].map((venue, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setDateData(prev => ({ 
                    ...prev, 
                    placeType: venue.type, 
                    selectedPlaceName: venue.name 
                  }));
                  playSound('sparkle');
                  setStep(4); // Goes to the large expanded food & drink menu page
                }}
                className="w-full p-4 rounded-2xl border border-[#d4b5ad] bg-white text-[#5c2c2c] text-sm font-medium hover:bg-[#8b3a3a] hover:text-[#f3e9e1] hover:shadow-lg transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <span>{venue.name}</span>
                <span className="text-[#8b3a3a] group-hover:text-[#f3e9e1]">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ================= STEP 4: LARGE EXPANDED MENU PAGE (FOOD & DRINKS BASED ON PLACE) ================= */}
      {step === 4 && (
        <div className="relative z-10 w-full max-w-2xl bg-[#fffaf5] border-4 border-[#8c4e48] p-6 sm:p-8 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] flex flex-col items-center animate-popup-3d max-h-[90vh] overflow-y-auto">
          <div className="text-4xl mb-1">📜</div>
          <h2 className="text-2xl text-[#5c2c2c] mb-1 text-center">{currentMenu.title}</h2>
          <p className="font-sans text-xs text-[#8b5a5a] mb-6 text-center">Pick one delicious item and one refreshing drink! ✨</p>

          {/* FOOD ITEMS SECTION */}
          <div className="w-full mb-6 font-sans">
            <h3 className="text-sm font-bold text-[#5c2c2c] uppercase tracking-wider mb-3 border-b border-[#d4b5ad] pb-1">1. Select Main Dish / Snack</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentMenu.foods.map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    setDateData(prev => ({ ...prev, food: item.name }));
                    playSound('pop');
                  }}
                  className={`border-2 rounded-2xl p-3 flex items-center gap-3 cursor-pointer transition-all ${dateData.food === item.name ? 'border-[#8b3a3a] bg-[#8b3a3a]/10 shadow-md' : 'border-[#d4b5ad] bg-white hover:border-[#8b3a3a]'}`}
                >
                  <img src={item.img} alt={item.name} className="w-16 h-16 object-cover rounded-xl shadow-sm" />
                  <span className="text-xs font-semibold text-[#5c2c2c]">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* DRINKS SECTION */}
          <div className="w-full mb-6 font-sans">
            <h3 className="text-sm font-bold text-[#5c2c2c] uppercase tracking-wider mb-3 border-b border-[#d4b5ad] pb-1">2. Select Refreshing Drink</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentMenu.drinks.map((drink, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    setDateData(prev => ({ ...prev, drink: drink.name }));
                    playSound('pop');
                  }}
                  className={`border-2 rounded-2xl p-3 flex items-center gap-3 cursor-pointer transition-all ${dateData.drink === drink.name ? 'border-[#8b3a3a] bg-[#8b3a3a]/10 shadow-md' : 'border-[#d4b5ad] bg-white hover:border-[#8b3a3a]'}`}
                >
                  <img src={drink.img} alt={drink.name} className="w-16 h-16 object-cover rounded-xl shadow-sm" />
                  <span className="text-xs font-semibold text-[#5c2c2c]">{drink.name}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            disabled={!dateData.food || !dateData.drink}
            onClick={() => {
              if (dateData.food && dateData.drink) {
                playSound('sparkle');
                setStep(5);
              }
            }}
            className={`w-full py-3.5 rounded-full font-sans text-sm tracking-widest uppercase shadow-lg transition-all cursor-pointer ${dateData.food && dateData.drink ? 'bg-gradient-to-r from-[#8b3a3a] to-[#a64444] text-[#f3e9e1] hover:scale-105 active:scale-95' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
          >
            Next: Payment Details ✨
          </button>
        </div>
      )}

      {/* ================= STEP 5: PAYMENT STEP WITH 5000 AMOUNT REQUIREMENT ================= */}
      {step === 5 && (
        <div className="relative z-10 w-full max-w-md bg-[#fffaf5] border-4 border-[#8c4e48] p-8 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] text-center flex flex-col items-center animate-popup-3d">
          <div className="text-4xl mb-2">💸</div>
          <h2 className="text-2xl text-[#5c2c2c] mb-1">One Small Pay Detail</h2>
          <p className="font-sans text-xs text-[#8b5a5a] mb-6">You will need to pay <strong className="text-[#8b3a3a]">5000</strong> for this wonderful date! 😉</p>
          
          <div className="w-full flex flex-col gap-3 font-sans">
            {[
              "Okay! I will gladly pay 5000 for us! 💳",
              "You pay 5000 because you asked me out! 💅",
              "Split the bill: 2500 each! 🤝",
              "My love is free, but food costs 5000! 😂"
            ].map((payOpt, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setDateData(prev => ({ ...prev, payment: payOpt }));
                  playSound('sparkle');
                  setStep(6);
                }}
                className="w-full p-4 rounded-2xl border border-[#d4b5ad] bg-white text-[#5c2c2c] text-sm font-medium hover:bg-[#8b3a3a] hover:text-[#f3e9e1] hover:shadow-lg transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <span>{payOpt}</span>
                <span className="text-[#8b3a3a] group-hover:text-[#f3e9e1]">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ================= STEP 6: FINAL SUCCESS CONFIRMATION 3D POP-UP ================= */}
      {step === 6 && (
        <div className="relative z-10 w-full max-w-md bg-[#fffaf5] border-4 border-[#8c4e48] p-8 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] text-center flex flex-col items-center animate-popup-3d font-serif">
          <div className="text-5xl mb-2 animate-bounce">💖</div>
          <h2 className="text-3xl text-[#5c2c2c] mb-1">It's a Date!</h2>
          <p className="font-sans text-xs text-[#8b5a5a] mb-5 uppercase tracking-wider">Official Reservation Card:</p>

          <div className="w-full bg-[#fcf6f2] border border-[#e8d5cc] p-5 rounded-2xl text-left font-sans text-sm text-[#5c2c2c] space-y-2.5 mb-6 shadow-inner">
            <p><strong>📅 Date:</strong> {dateData.dateTime.date}</p>
            <p><strong>⏰ Time:</strong> {dateData.dateTime.time}</p>
            <p><strong>🏡 Venue:</strong> {dateData.selectedPlaceName}</p>
            <p><strong>🍽️ Chosen Food:</strong> {dateData.food}</p>
            <p><strong>🥤 Chosen Drink:</strong> {dateData.drink}</p>
            <p><strong>💳 Payment Detail:</strong> {dateData.payment}</p>
          </div>

          <div className="bg-[#8b3a3a]/10 border border-[#8b3a3a]/30 p-3.5 rounded-xl mb-6 w-full text-center shadow-sm">
            <p className="font-serif italic text-sm text-[#8b3a3a] font-semibold leading-relaxed">
              "Thanks for the date with me! Please remember should be arrived at time, I will wait for you! 🥰"
            </p>
          </div>

          <button
            onClick={() => {
              playSound('sparkle');
              alert("Date confirmed successfully! See you soon ❤️");
            }}
            className="w-full py-3.5 bg-gradient-to-r from-[#8b3a3a] to-[#a64444] text-[#f3e9e1] rounded-full font-sans text-sm tracking-widest uppercase shadow-[0_10px_20px_rgba(139,58,58,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            Can't Wait! ✨
          </button>
        </div>
      )}

    </main>
  );
} 