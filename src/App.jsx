import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  Calendar, MapPin, Search, ChevronRight, Activity, TrendingUp, Info, 
  ExternalLink, ArrowUpRight, Filter, X, Hash, Trophy, Star, Target, Flag, RefreshCw, Link as LinkIcon, Settings,
  Zap, Sparkles, ChevronDown, ChevronUp, Wind, Coffee, Route, Clock
} from 'lucide-react';

/**
 * GOOGLE SHEETS SETUP:
 * 1. File > Share > Publish to web.
 * 2. Select 'Link', choose your sheet, and set format to 'Comma-separated values (.csv)'.
 * 3. Copy that link and paste it into the Settings in the dashboard.
 */
const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRg1rSihcL1ivA8OZMcRuJ__LoU46zaIm8CHfUyZmdAI42mRl_3zijL1jpWYWsd7KjtCQCD2x8FMwIe/pub?gid=0&single=true&output=csv"; 

const App = () => {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [showSettings, setShowSettings] = useState(false);
  
  // State for expanded sections
  const [showAllDemanding, setShowAllDemanding] = useState(false);
  const [showAllBeautiful, setShowAllBeautiful] = useState(false);
  const [showAllWindy, setShowAllWindy] = useState(false);
  const [showAllBreakfast, setShowAllBreakfast] = useState(false);

  // Robust CSV Parser handling quotes and multiline comments
  const parseCSV = (csvText) => {
    const lines = [];
    let currentLine = [];
    let currentField = "";
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"' && inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        currentLine.push(currentField.trim());
        currentField = "";
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        currentLine.push(currentField.trim());
        if (currentLine.length > 0) lines.push(currentLine);
        currentLine = [];
        currentField = "";
        if (char === '\r' && nextChar === '\n') i++;
      } else {
        currentField += char;
      }
    }
    
    if (currentField || currentLine.length > 0) {
      currentLine.push(currentField.trim());
      lines.push(currentLine);
    }

    return lines.slice(1) 
      .map(parts => {
        const rawHikeNum = parts[0];
        const id = rawHikeNum && rawHikeNum.trim() !== "" ? parseInt(rawHikeNum) : null;
        
        // Year Sanitizer Logic
        let year = 'Unknown';
        const dateParts = parts[1]?.split('/');
        if (dateParts && dateParts.length === 3) {
          let rawYear = dateParts[2].trim();
          if (rawYear.length === 2) rawYear = "20" + rawYear;
          if (rawYear.length > 4) rawYear = rawYear.slice(-4);
          if (rawYear.length === 4) year = rawYear;
        }
        
        return {
          id: id,
          date: parts[1] || '',
          year: year,
          comments: parts[2] || '',
          direction: parts[3] || '',
          location: parts[4] || 'Unknown',
        };
      })
      .filter(h => h.id !== null && !isNaN(h.id) && h.id > 0)
      .sort((a, b) => b.id - a.id);
  };

  const fetchData = useCallback(async (url) => {
    if (!url) {
      setLoading(false);
      return;
    }
    
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Could not reach Google Sheets. Check link permissions.');
      const csvText = await response.text();
      const parsed = parseCSV(csvText);
      setData(parsed);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(sheetUrl);
  }, [sheetUrl, fetchData]);

  const milestones = useMemo(() => {
    const targets = [350, 300, 250, 200, 150, 100, 50, 25, 1];
    return data.filter(h => targets.includes(h.id)).sort((a, b) => b.id - a.id);
  }, [data]);

  // Year frequency statistics
  const yearStats = useMemo(() => {
    const stats = {};
    data.forEach(hike => {
      if (hike.year && hike.year !== 'Unknown') {
        stats[hike.year] = (stats[hike.year] || 0) + 1;
      }
    });
    return Object.keys(stats).sort().map(year => ({ year, count: stats[year] }));
  }, [data]);

  // Aggregate stats including start year, active year, and average
  const aggregateStats = useMemo(() => {
    let startYear = null;
    const yearSet = new Set();

    data.forEach(hike => {
      const y = parseInt(hike.year);
      if (!isNaN(y)) {
        if (!startYear || y < startYear) startYear = y;
        yearSet.add(y);
      }
    });

    const mostActive = [...yearStats].sort((a, b) => b.count - a.count)[0];
    const totalYears = yearSet.size || 1;
    const averageHikes = (data.length / totalYears).toFixed(1);

    return {
      hikeCount: data.length,
      since: startYear,
      activeYear: mostActive?.year || 'N/A',
      activeCount: mostActive?.count || 0,
      averageHikesPerYear: averageHikes
    };
  }, [data, yearStats]);

  // CATEGORY LOGIC: Demanding vs Beautiful
  const demandingHikes = useMemo(() => {
    const priorityNames = [
      'white mountain', 'everest', 'base camp', 'nepal', 'mount dana', 'shiva murugan', 
      'ohlone wilderness', 'del valle', 'sunol peak', 'taylor ranch'
    ];
    
    const demandKeywords = [
      'strenuous', 'tough', 'difficult', 'elevation', 'gain', 'climb', 'uphill', 'steep'
    ];

    return data.map(h => {
      const loc = h.location.toLowerCase();
      const comm = h.comments.toLowerCase();
      
      // Extraction logic for miles and feet
      const milesMatch = comm.match(/(\d+(\.\d+)?)\s*(miles?|mi)\b/);
      const feetMatch = comm.match(/(\d{1,2},?\d{3})\s*(ft|feet|elevation|gain)\b/);
      
      const miles = milesMatch ? parseFloat(milesMatch[1]) : 0;
      const feetRaw = feetMatch ? feetMatch[1].replace(',', '') : "0";
      const feet = parseInt(feetRaw);

      // Scoring system for sorting
      let score = 0;
      if (priorityNames.some(name => loc.includes(name) || comm.includes(name))) score += 1000;
      if (demandKeywords.some(kw => loc.includes(kw) || comm.includes(kw))) score += 100;
      score += (miles * 10); // Every mile adds significantly to weight
      score += (feet / 100); // Higher elevation adds weight

      return { ...h, miles, feet, score };
    })
    .filter(h => h.score > 0) // Only keep hikes that meet some criteria
    .sort((a, b) => b.score - a.score) // Sort by our calculated "demand" score
    .slice(0, 10);
  }, [data]);

  const beautifulHikes = useMemo(() => {
    const keywords = ['beautiful', 'stunning', 'gorgeous', 'picturesque', 'sunrise', 'scenic', 'serene', 'view', 'lush', 'amazing'];
    return data.filter(h => keywords.some(k => h.comments.toLowerCase().includes(k))).slice(0, 10);
  }, [data]);

  const windyRainyHikes = useMemo(() => {
    const keywords = ['windy', 'rainy', 'rain', 'storm', 'wind', 'wet', 'soaked', 'chilly', 'cold', 'weather'];
    return data.filter(h => keywords.some(k => h.comments.toLowerCase().includes(k))).slice(0, 10);
  }, [data]);

  const breakfastHikes = useMemo(() => {
    const keywords = ['breakfast', 'pancakes', 'eggs', 'coffee', 'diner', 'eating', 'meal', 'food', 'brunch', 'bakery'];
    return data.filter(h => keywords.some(k => h.comments.toLowerCase().includes(k))).slice(0, 10);
  }, [data]);

  const filteredData = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    return data.filter(hike => {
      const matchesYear = selectedYear === 'All' || hike.year === selectedYear;
      if (!matchesYear) return false;
      if (!s) return true;
      return (
        hike.location.toLowerCase().includes(s) ||
        hike.comments.toLowerCase().includes(s) ||
        hike.id.toString().includes(s) ||
        hike.date.toLowerCase().includes(s)
      );
    });
  }, [data, searchTerm, selectedYear]);

  const topLocations = useMemo(() => {
    const locations = {};
    data.forEach(hike => {
      const loc = hike.location.split(',')[0].trim().toUpperCase();
      if (loc && loc !== 'UNKNOWN' && loc !== '') {
        locations[loc] = (locations[loc] || 0) + 1;
      }
    });
    return Object.entries(locations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [data]);

  const years = ['All', ...new Set(data.map(h => h.year).filter(y => y && y !== 'Unknown'))].sort((a, b) => b - a);

  if (loading && !data.length) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-6">
        <RefreshCw className="mb-4 h-12 w-12 animate-spin text-emerald-600" />
        <h2 className="text-xl font-bold text-gray-700">Loading your adventure...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black">Dashboard Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-emerald-800 text-sm font-medium">
                  Paste your Google Sheets CSV URL here to sync live data.
                </p>
              </div>
              <input 
                type="text" 
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none"
              />
              <button 
                onClick={() => { setShowSettings(false); fetchData(sheetUrl); }}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl"
              >
                Save Connection
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-xl text-white">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase text-gray-900">Challenger Hiking Group</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => fetchData(sheetUrl)} 
              className={`p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
              title="Refresh Data"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
              <Settings className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
              <Filter className="h-4 w-4 ml-2 text-gray-400" />
              <select 
                className="bg-transparent border-none rounded-xl text-xs font-black uppercase pr-8 py-0 focus:ring-0"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {years.map(y => <option key={y} value={y}>{y === 'All' ? 'ALL YEARS' : y}</option>)}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Search Bar */}
        <div className="mb-8 relative flex items-center group">
          <input 
            type="text" 
            placeholder="Search peaks, dates, or keywords..." 
            className="w-full pl-6 pr-24 py-5 text-lg bg-white border border-gray-200 rounded-3xl shadow-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute inset-y-0 right-6 flex items-center gap-3">
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
            <Search className={`h-6 w-6 transition-colors ${searchTerm ? 'text-emerald-500' : 'text-gray-400'}`} />
          </div>
        </div>

        {/* SUMMARY CARDS SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Total Hikes */}
          <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-xl hover:border-emerald-200 transition-all duration-500">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-1">Legacy Count</span>
              <div className="text-4xl font-black text-gray-900 mb-1">{aggregateStats.hikeCount}</div>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-widest">
                Since {aggregateStats.since || '2016'}
              </span>
            </div>
            <Trophy className="h-10 w-10 text-emerald-600 opacity-20 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Average Hikes Per Year */}
          <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-xl hover:border-emerald-200 transition-all duration-500">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-1">Yearly Average</span>
              <div className="text-4xl font-black text-gray-900 mb-1">{aggregateStats.averageHikesPerYear}</div>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-widest">
                Hikes / Season
              </span>
            </div>
            <Activity className="h-10 w-10 text-emerald-600 opacity-20 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Most Active Year */}
          <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-xl hover:border-emerald-200 transition-all duration-500">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-1">Most Active Year</span>
              <div className="text-4xl font-black text-gray-900 mb-1">{aggregateStats.activeYear}</div>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-widest">
                {aggregateStats.activeCount} Summits
              </span>
            </div>
            <Clock className="h-10 w-10 text-emerald-600 opacity-20 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Milestones (Hide when searching) */}
        {!searchTerm && milestones.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-black mb-8 px-2 flex items-center gap-3">
              <Flag className="text-emerald-600" /> Major Milestones
            </h2>
            <div className="flex overflow-x-auto gap-6 pb-4 no-scrollbar">
              {milestones.map((m) => (
                <div key={m.id} className="min-w-[280px] bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full uppercase mb-4 inline-block group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    Hike #{m.id}
                  </span>
                  <h3 className="text-xl font-black mb-2 line-clamp-1">{m.location}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 italic">"{m.comments}"</p>
                  <div className="mt-4 pt-4 border-t border-gray-50 text-xs font-bold text-gray-400 flex justify-between items-center">
                    <span>{m.date}</span>
                    <Target className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HIGHLIGHT SECTIONS (Hide when searching) */}
        {!searchTerm && (
          <div className="space-y-16 mb-16">
            {/* ROW 1: Demanding & Beautiful */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg"><Zap className="h-5 w-5" /></div>
                  <h2 className="text-2xl font-black tracking-tight uppercase">Most Demanding</h2>
                </div>
                <div className="space-y-4">
                  {(showAllDemanding ? demandingHikes : demandingHikes.slice(0, 3)).map(h => (
                    <div key={h.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-red-200 transition-all flex justify-between items-start group">
                      <div className="flex-grow">
                        <span className="text-[9px] font-black text-red-500 uppercase tracking-widest block mb-1">High Intensity</span>
                        <h4 className="font-bold text-gray-900 line-clamp-1">{h.location}</h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{h.comments}</p>
                        <div className="mt-2 flex gap-2">
                          {h.miles > 0 && <span className="text-[9px] font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md uppercase tracking-widest">{h.miles} mi</span>}
                          {h.feet > 0 && <span className="text-[9px] font-black bg-red-50 text-red-600 px-2 py-0.5 rounded-md uppercase tracking-widest">{h.feet} ft gain</span>}
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-gray-300 group-hover:text-red-400 transition-colors ml-4 whitespace-nowrap">#{h.id}</span>
                    </div>
                  ))}
                  {demandingHikes.length > 3 && (
                    <button onClick={() => setShowAllDemanding(!showAllDemanding)} className="w-full py-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-red-600 transition-colors group">
                      {showAllDemanding ? 'Show Less' : `More Hikes (${demandingHikes.length - 3} available)`}
                      {showAllDemanding ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Sparkles className="h-5 w-5" /></div>
                  <h2 className="text-2xl font-black tracking-tight uppercase">Most Stunning</h2>
                </div>
                <div className="space-y-4">
                  {(showAllBeautiful ? beautifulHikes : beautifulHikes.slice(0, 3)).map(h => (
                    <div key={h.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-blue-200 transition-all flex justify-between items-start group">
                      <div>
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-1">Highly Scenic</span>
                        <h4 className="font-bold text-gray-900 line-clamp-1">{h.location}</h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{h.comments}</p>
                      </div>
                      <span className="text-[10px] font-black text-gray-300 group-hover:text-blue-400 transition-colors">#{h.id}</span>
                    </div>
                  ))}
                  {beautifulHikes.length > 3 && (
                    <button onClick={() => setShowAllBeautiful(!showAllBeautiful)} className="w-full py-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors group">
                      {showAllBeautiful ? 'Show Less' : `More Hikes (${beautifulHikes.length - 3} available)`}
                      {showAllBeautiful ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ROW 2: Windy/Rainy & Breakfast */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Wind className="h-5 w-5" /></div>
                  <h2 className="text-2xl font-black tracking-tight uppercase">Windy & Rainy Hikes</h2>
                </div>
                <div className="space-y-4">
                  {(showAllWindy ? windyRainyHikes : windyRainyHikes.slice(0, 3)).map(h => (
                    <div key={h.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-200 transition-all flex justify-between items-start group">
                      <div>
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-1">Wild Weather</span>
                        <h4 className="font-bold text-gray-900 line-clamp-1">{h.location}</h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{h.comments}</p>
                      </div>
                      <span className="text-[10px] font-black text-gray-300 group-hover:text-indigo-400 transition-colors">#{h.id}</span>
                    </div>
                  ))}
                  {windyRainyHikes.length > 3 && (
                    <button onClick={() => setShowAllWindy(!showAllWindy)} className="w-full py-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 transition-colors group">
                      {showAllWindy ? 'Show Less' : `More Hikes (${windyRainyHikes.length - 3} available)`}
                      {showAllWindy ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Coffee className="h-5 w-5" /></div>
                  <h2 className="text-2xl font-black tracking-tight uppercase">Post-Hike Breakfast</h2>
                </div>
                <div className="space-y-4">
                  {(showAllBreakfast ? breakfastHikes : breakfastHikes.slice(0, 3)).map(h => (
                    <div key={h.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-amber-200 transition-all flex justify-between items-start group">
                      <div>
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-1">Group Fuel</span>
                        <h4 className="font-bold text-gray-900 line-clamp-1">{h.location}</h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{h.comments}</p>
                      </div>
                      <span className="text-[10px] font-black text-gray-300 group-hover:text-amber-400 transition-colors">#{h.id}</span>
                    </div>
                  ))}
                  {breakfastHikes.length > 3 && (
                    <button onClick={() => setShowAllBreakfast(!showAllBreakfast)} className="w-full py-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-amber-600 transition-colors group">
                      {showAllBreakfast ? 'Show Less' : `More Hikes (${breakfastHikes.length - 3} available)`}
                      {showAllBreakfast ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-600" />
                  {searchTerm ? 'Search Results' : 'Adventure History'}
                </h3>
                <span className="text-xs font-bold text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100">
                  {filteredData.length} entries
                </span>
              </div>
              <div className="divide-y divide-gray-50 max-h-[800px] overflow-y-auto">
                {filteredData.length > 0 ? (
                  filteredData.map((hike) => (
                    <div key={hike.id} className="p-8 hover:bg-emerald-50/10 transition-colors group">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-grow">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black bg-gray-900 text-white px-3 py-1 rounded-full group-hover:bg-emerald-600 transition-colors">#{hike.id}</span>
                            <span className="text-xs font-bold text-gray-400">{hike.date}</span>
                          </div>
                          <h4 className="text-2xl font-black mb-3 group-hover:text-emerald-700 transition-colors">{hike.location}</h4>
                          <p className="text-gray-600 text-sm md:text-base leading-relaxed">{hike.comments}</p>
                        </div>
                        {hike.direction && (
                          <a 
                            href={hike.direction} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                            title="Open Map"
                          >
                            <ArrowUpRight className="h-5 w-5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-20 text-center text-gray-400 flex flex-col items-center gap-4">
                    <Info className="h-10 w-10 opacity-20" />
                    <p className="font-medium italic">No matches found for "{searchTerm}"</p>
                    <button onClick={() => setSearchTerm('')} className="text-emerald-600 font-bold text-sm hover:underline">Clear search</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Frequency by Year
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearStats}>
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {yearStats.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.year === selectedYear ? '#064e3b' : '#059669'} 
                          className="transition-all duration-300"
                        />
                      ))}
                    </Bar>
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#6b7280'}} />
                    <Tooltip 
                      cursor={{fill: '#f0fdf4'}} 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {topLocations.length > 0 && (
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8">Popular Peaks</h3>
                <div className="space-y-6">
                  {topLocations.map((loc, idx) => (
                    <div key={idx} className="flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center text-sm font-black group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">{idx + 1}</div>
                        <span className="text-sm font-bold text-gray-700">{loc.name}</span>
                      </div>
                      <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-black">{loc.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-900 rounded-3xl p-10 text-white relative overflow-hidden group shadow-2xl">
              <div className="relative z-10">
                <Star className="text-yellow-400 mb-6 group-hover:rotate-45 transition-transform duration-500 h-8 w-8" />
                <h3 className="text-3xl font-black mb-2">Road to 400</h3>
                <p className="text-gray-400 text-sm mb-8 italic">Next big milestone ahead!</p>
                <div className="w-full h-2.5 bg-white/10 rounded-full mb-3">
                  <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000" style={{ width: `${Math.min((data[0]?.id / 400) * 100, 100)}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] font-black text-emerald-400 tracking-widest">
                  <span>CURRENT: {data[0]?.id || 0}</span>
                  <span>GOAL: 400</span>
                </div>
              </div>
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-emerald-500 opacity-10 rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;