import React, { useState } from 'react';
import { fetchApi } from '../services/api';
import { Sparkles, Camera, CheckCircle2, Edit3, ArrowRight, RefreshCw, ShieldAlert } from 'lucide-react';
import type { MatchResult, Donation } from '../types';

interface Props {
  onSuccess: (matchResult: MatchResult, donation?: Donation) => void;
  onCancel: () => void;
  defaultAddress?: string;
  initialCategory?: string;
}

export const SmartDonationIntake: React.FC<Props> = ({ onSuccess, onCancel, defaultAddress = '', initialCategory }) => {
  const [mode, setMode] = useState<'AI_TEXT' | 'AI_CONFIRM' | 'MANUAL'>('AI_TEXT');
  const [rawText, setRawText] = useState(
    initialCategory
      ? `I have about 20 kg of ${initialCategory.toLowerCase()} surplus food available for pickup.`
      : "I have about 25 kg of cooked rice and dal left from today's catering. It can be picked up before 9 PM."
  );
  const [loadingAi, setLoadingAi] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Extracted AI Form State
  const [extractedData, setExtractedData] = useState<any>(null);

  // Editable Form Fields (populated by AI or manual)
  const [foodType, setFoodType] = useState(initialCategory || 'Cooked');
  const [description, setDescription] = useState(initialCategory ? `${initialCategory} Surplus` : '');
  const [quantityKg, setQuantityKg] = useState('25');
  const [pickupAddress, setPickupAddress] = useState(defaultAddress);
  const [safeUntilHours, setSafeUntilHours] = useState('4');

  // Food Photo Preset Selection State
  const foodImagePresets = [
    { label: 'Cooked Meal', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80' },
    { label: 'Bakery & Bread', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80' },
    { label: 'Fresh Produce', url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80' },
    { label: 'Packaged Grocery', url: 'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?auto=format&fit=crop&w=600&q=80' },
    { label: 'Dairy & Chilled', url: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=600&q=80' },
  ];
  const [selectedImageUrl, setSelectedImageUrl] = useState(foodImagePresets[0].url);

  // Image classification state
  const [imageClassification, setImageClassification] = useState<any>(null);
  const [classifyingImage, setClassifyingImage] = useState(false);

  const handleParseNaturalLanguage = async () => {
    if (!rawText.trim()) return;
    setLoadingAi(true);
    try {
      const res = await fetchApi<{ extracted: any }>('/ai/parse-intake', {
        method: 'POST',
        body: JSON.stringify({ rawText }),
      });

      const ext = res.extracted;
      setExtractedData(ext);

      // Populate form state from extracted JSON
      setDescription(rawText);
      if (ext.quantity_kg !== null && ext.quantity_kg !== undefined) {
        setQuantityKg(String(ext.quantity_kg));
      } else {
        setQuantityKg('20'); // fallback default for missing quantity
      }

      if (ext.category === 'grocery') setFoodType('Grocery');
      else if (ext.category === 'produce') setFoodType('Produce');
      else if (ext.category === 'bakery') setFoodType('Bakery');
      else if (ext.category === 'dairy') setFoodType('Dairy');
      else setFoodType('Cooked');

      setMode('AI_CONFIRM');
    } catch (e: any) {
      alert('AI Natural Language Intake unavailable. Switching to standard manual entry.');
      setMode('MANUAL');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setClassifyingImage(true);

    try {
      const res = await fetchApi<{ classification: any }>('/ai/classify-image', {
        method: 'POST',
        body: JSON.stringify({ imageName: file.name }),
      });
      setImageClassification(res.classification);
      if (res.classification?.suggested_food_type) {
        setFoodType(res.classification.suggested_food_type);
      }
    } catch (err) {
      console.error('Image classification error', err);
    } finally {
      setClassifyingImage(false);
    }
  };

  const handleConfirmAndPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const now = new Date();
      const safeTime = new Date(now.getTime() + parseFloat(safeUntilHours) * 60 * 60 * 1000);

      const res = await fetchApi<{ message: string; donation: Donation; matchResult: MatchResult }>(
        '/donor/donations',
        {
          method: 'POST',
          body: JSON.stringify({
            food_type: foodType,
            description: description || rawText,
            quantity_kg: parseFloat(quantityKg) || 15,
            pickup_address: pickupAddress || defaultAddress,
            safe_until: safeTime.toISOString(),
            image_url: selectedImageUrl,
          }),
        }
      );

      onSuccess(res.matchResult, res.donation);
    } catch (err: any) {
      alert(err.message || 'Failed to submit donation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-100">AI-Powered Smart Donation Intake</h3>
            <p className="text-xs text-slate-400">Describe surplus food in plain English or use manual entry</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMode('AI_TEXT')}
            className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-all ${
              mode !== 'MANUAL' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            AI Assistant
          </button>
          <button
            type="button"
            onClick={() => setMode('MANUAL')}
            className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-all ${
              mode === 'MANUAL' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Manual Entry
          </button>
        </div>
      </div>

      {/* Mode 1: AI Natural Language Input */}
      {mode === 'AI_TEXT' && (
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Describe your surplus food (Natural Language Prompt)
            </label>
            <textarea
              rows={3}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="e.g. I have 25 kg cooked rice and dal left from today's catering. Safe until 9 PM."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

          {/* Optional Image Classification */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-cyan-400" /> Optional AI Food Photo Helper
              </span>
              <label className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer">
                <span>{classifyingImage ? 'Analyzing Image...' : 'Choose Image'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              </label>
            </div>

            {imageClassification && (
              <div className="bg-emerald-950/60 border border-emerald-800 p-2.5 rounded-lg text-emerald-200 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span>AI Visual Classification Suggestion:</span>
                  <span className="text-emerald-400">{Math.round(imageClassification.confidence * 100)}% Match</span>
                </div>
                <p>Category: <strong>{imageClassification.suggested_category}</strong></p>
                <p className="text-[10px] text-emerald-300/80 flex items-center gap-1 pt-1">
                  <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>AI classification suggests food category based on visual patterns. (Not a food safety certification).</span>
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleParseNaturalLanguage}
              disabled={loadingAi}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              {loadingAi ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Understand Donation</span>
            </button>
          </div>
        </div>
      )}

      {/* Mode 2: AI Confirmation Card */}
      {mode === 'AI_CONFIRM' && extractedData && (
        <form onSubmit={handleConfirmAndPost} className="space-y-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-emerald-900/60 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <CheckCircle2 className="w-4 h-4" /> AI Extracted Donation Structured Data
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
                {Math.round(extractedData.confidence * 100)}% Confidence
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-400 block text-xs">Food / Description:</span>
                <span className="font-bold text-slate-100">{description}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-xs">Category & Type:</span>
                <span className="font-bold text-emerald-300">{foodType}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-xs">Quantity:</span>
                <span className="font-bold text-slate-100">
                  {extractedData.quantity_kg !== null ? `${quantityKg} kg` : <em className="text-amber-400">Unspecified (Defaulting to {quantityKg} kg)</em>}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-xs">Safe Window:</span>
                <span className="font-bold text-cyan-300">
                  {extractedData.safe_until ? new Date(extractedData.safe_until).toLocaleTimeString() : `${safeUntilHours} Hours from now`}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 border-t border-slate-900 pt-2">
              Pickup Address: <strong className="text-slate-200">{pickupAddress || defaultAddress}</strong>
            </div>
          </div>

          {/* Food Photo Thumbnail Selector */}
          <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <span className="font-semibold text-slate-300 block text-xs">Select Food Photo Thumbnail:</span>
            <div className="grid grid-cols-5 gap-2">
              {foodImagePresets.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedImageUrl(preset.url)}
                  className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all aspect-video ${
                    selectedImageUrl === preset.url ? 'border-orange-500 scale-105 shadow-md shadow-orange-500/30' : 'border-slate-800 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[9px] text-center font-bold text-slate-200 truncate p-0.5">
                    {preset.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setMode('MANUAL')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1.5"
            >
              <Edit3 className="w-4 h-4" /> Edit Details
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg cursor-pointer text-sm"
            >
              {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              <span>Confirm & Post Surplus Food</span>
            </button>
          </div>
        </form>
      )}

      {/* Mode 3: Manual Entry Form */}
      {mode === 'MANUAL' && (
        <form onSubmit={handleConfirmAndPost} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Food Category</label>
              <select
                value={foodType}
                onChange={(e) => setFoodType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
              >
                <option value="Cooked">Cooked Meal / Buffet</option>
                <option value="Grocery">Packaged Grocery</option>
                <option value="Produce">Fresh Fruits & Veggies</option>
                <option value="Bakery">Bakery & Bread</option>
                <option value="Dairy">Dairy & Chilled</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Quantity (kg)</label>
              <input
                type="number"
                min="1"
                max="1000"
                required
                value={quantityKg}
                onChange={(e) => setQuantityKg(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Food Description</label>
            <input
              type="text"
              required
              placeholder="e.g. 25 kg Freshly Cooked Rice & Curry"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Pickup Address</label>
            <input
              type="text"
              required
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Safe Donation Window</label>
            <select
              value={safeUntilHours}
              onChange={(e) => setSafeUntilHours(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500 text-sm"
            >
              <option value="2">2 Hours (Urgent)</option>
              <option value="4">4 Hours (Standard)</option>
              <option value="6">6 Hours</option>
              <option value="12">12 Hours</option>
              <option value="24">24 Hours</option>
            </select>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg cursor-pointer text-sm"
            >
              {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
              <span>Submit Surplus Food</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
